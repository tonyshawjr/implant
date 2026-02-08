import { json, error, type RequestHandler } from '@sveltejs/kit';
import { prisma } from '$lib/server/db';
import { isStripeConfigured, stripe } from '$lib/server/stripe';
import { getOrCreateCustomer } from '$lib/server/billing/customers';
import {
  listPaymentMethods,
  attachPaymentMethod,
  detachPaymentMethod,
  setDefaultPaymentMethod,
  createSetupIntent,
  syncPaymentMethodToDatabase,
  getOrganizationPaymentMethods
} from '$lib/server/billing/payment-methods';

/**
 * GET /api/billing/payment-methods - List payment methods
 */
export const GET: RequestHandler = async ({ locals }) => {
  const user = locals.user;

  if (!user) {
    throw error(401, 'Unauthorized');
  }

  if (!user.organizationId) {
    throw error(400, 'No organization associated with user');
  }

  // Get payment methods from database
  const paymentMethods = await getOrganizationPaymentMethods(user.organizationId);

  return json({
    paymentMethods: paymentMethods.map((pm) => ({
      id: pm.id,
      stripeId: pm.providerPaymentMethodId,
      type: pm.type,
      brand: pm.brand,
      lastFour: pm.lastFour,
      expMonth: pm.expMonth,
      expYear: pm.expYear,
      isDefault: pm.isDefault,
      createdAt: pm.createdAt.toISOString()
    }))
  });
};

/**
 * POST /api/billing/payment-methods - Add or manage payment methods
 */
export const POST: RequestHandler = async ({ request, locals }) => {
  const user = locals.user;

  if (!user) {
    throw error(401, 'Unauthorized');
  }

  if (!user.organizationId) {
    throw error(400, 'No organization associated with user');
  }

  // Check if user has permission
  if (!['client_owner', 'client_admin'].includes(user.role)) {
    throw error(403, 'Insufficient permissions');
  }

  if (!isStripeConfigured()) {
    throw error(500, 'Stripe is not configured');
  }

  const body = await request.json();
  const { action, paymentMethodId, setAsDefault } = body;

  // Get organization details
  const organization = await prisma.organization.findUnique({
    where: { id: user.organizationId },
    include: {
      users: {
        where: { role: 'client_owner' },
        take: 1
      }
    }
  });

  if (!organization) {
    throw error(404, 'Organization not found');
  }

  // Get or create Stripe customer
  const ownerEmail = organization.users[0]?.email || organization.email || user.email;
  const customer = await getOrCreateCustomer(user.organizationId, ownerEmail, organization.name);

  switch (action) {
    case 'create_setup_intent': {
      // Create a SetupIntent for adding a new payment method
      const setupIntent = await createSetupIntent({
        stripeCustomerId: customer.id
      });

      return json({
        clientSecret: setupIntent.client_secret,
        setupIntentId: setupIntent.id
      });
    }

    case 'attach': {
      if (!paymentMethodId) {
        throw error(400, 'Payment method ID is required');
      }

      // Attach payment method to customer
      const paymentMethod = await attachPaymentMethod({
        paymentMethodId,
        stripeCustomerId: customer.id,
        setAsDefault: setAsDefault !== false
      });

      // Sync to database
      await syncPaymentMethodToDatabase(
        paymentMethod,
        user.organizationId,
        setAsDefault !== false
      );

      // Log audit event
      await prisma.auditLog.create({
        data: {
          userId: user.id,
          organizationId: user.organizationId,
          action: 'payment_method.added',
          entityType: 'payment_method',
          entityId: paymentMethod.id,
          newValues: {
            brand: paymentMethod.card?.brand,
            lastFour: paymentMethod.card?.last4
          }
        }
      });

      return json({
        success: true,
        paymentMethod: {
          id: paymentMethod.id,
          brand: paymentMethod.card?.brand,
          lastFour: paymentMethod.card?.last4,
          expMonth: paymentMethod.card?.exp_month,
          expYear: paymentMethod.card?.exp_year
        }
      });
    }

    case 'set_default': {
      if (!paymentMethodId) {
        throw error(400, 'Payment method ID is required');
      }

      // Get the database payment method to find Stripe ID
      const dbPaymentMethod = await prisma.paymentMethod.findUnique({
        where: { id: paymentMethodId }
      });

      if (!dbPaymentMethod) {
        throw error(404, 'Payment method not found');
      }

      // Set as default in Stripe
      await setDefaultPaymentMethod(customer.id, dbPaymentMethod.providerPaymentMethodId);

      // Update database
      await prisma.paymentMethod.updateMany({
        where: {
          organizationId: user.organizationId,
          isDefault: true
        },
        data: { isDefault: false }
      });

      await prisma.paymentMethod.update({
        where: { id: paymentMethodId },
        data: { isDefault: true }
      });

      // Log audit event
      await prisma.auditLog.create({
        data: {
          userId: user.id,
          organizationId: user.organizationId,
          action: 'payment_method.set_default',
          entityType: 'payment_method',
          entityId: paymentMethodId
        }
      });

      return json({ success: true });
    }

    default:
      throw error(400, `Unknown action: ${action}`);
  }
};

/**
 * DELETE /api/billing/payment-methods - Remove a payment method
 */
export const DELETE: RequestHandler = async ({ request, locals }) => {
  const user = locals.user;

  if (!user) {
    throw error(401, 'Unauthorized');
  }

  if (!user.organizationId) {
    throw error(400, 'No organization associated with user');
  }

  // Check if user has permission
  if (!['client_owner', 'client_admin'].includes(user.role)) {
    throw error(403, 'Insufficient permissions');
  }

  if (!isStripeConfigured()) {
    throw error(500, 'Stripe is not configured');
  }

  const body = await request.json();
  const { paymentMethodId } = body;

  if (!paymentMethodId) {
    throw error(400, 'Payment method ID is required');
  }

  // Get the database payment method
  const dbPaymentMethod = await prisma.paymentMethod.findFirst({
    where: {
      id: paymentMethodId,
      organizationId: user.organizationId
    }
  });

  if (!dbPaymentMethod) {
    throw error(404, 'Payment method not found');
  }

  // Check if this is the only payment method and there's an active subscription
  const paymentMethodCount = await prisma.paymentMethod.count({
    where: { organizationId: user.organizationId }
  });

  const activeContract = await prisma.contract.findFirst({
    where: {
      organizationId: user.organizationId,
      status: 'active'
    }
  });

  if (paymentMethodCount === 1 && activeContract) {
    throw error(400, 'Cannot remove the only payment method while you have an active subscription');
  }

  // Detach from Stripe
  await detachPaymentMethod(dbPaymentMethod.providerPaymentMethodId);

  // Delete from database
  await prisma.paymentMethod.delete({
    where: { id: paymentMethodId }
  });

  // If this was the default, set another one as default
  if (dbPaymentMethod.isDefault) {
    const anotherMethod = await prisma.paymentMethod.findFirst({
      where: { organizationId: user.organizationId }
    });

    if (anotherMethod) {
      await prisma.paymentMethod.update({
        where: { id: anotherMethod.id },
        data: { isDefault: true }
      });

      // Update in Stripe too
      const customer = await stripe.customers.search({
        query: `metadata['organizationId']:'${user.organizationId}'`
      });

      if (customer.data.length > 0) {
        await stripe.customers.update(customer.data[0].id, {
          invoice_settings: {
            default_payment_method: anotherMethod.providerPaymentMethodId
          }
        });
      }
    }
  }

  // Log audit event
  await prisma.auditLog.create({
    data: {
      userId: user.id,
      organizationId: user.organizationId,
      action: 'payment_method.removed',
      entityType: 'payment_method',
      entityId: paymentMethodId,
      oldValues: {
        brand: dbPaymentMethod.brand,
        lastFour: dbPaymentMethod.lastFour
      }
    }
  });

  return json({ success: true });
};
