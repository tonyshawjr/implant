import type { PageServerLoad, Actions } from './$types';
import { prisma } from '$lib/server/db';
import { error, fail, redirect } from '@sveltejs/kit';
import { isStripeConfigured, stripe } from '$lib/server/stripe';
import { env } from '$env/dynamic/private';
import { getOrCreateCustomer, createBillingPortalSession } from '$lib/server/billing/customers';
import {
  createSetupIntent,
  attachPaymentMethod,
  setDefaultPaymentMethod,
  detachPaymentMethod,
  syncPaymentMethodToDatabase
} from '$lib/server/billing/payment-methods';
import {
  cancelSubscription,
  resumeSubscription,
  listSubscriptions
} from '$lib/server/billing/subscriptions';
import { getInvoicePdfUrl } from '$lib/server/billing/invoices';
import { getSubscriptionPeriodEnd } from '$lib/server/billing/stripe-helpers';

export const load: PageServerLoad = async ({ parent, url }) => {
  const { user, organization } = await parent();

  if (!organization) {
    throw error(404, 'Organization not found');
  }

  // Check for success/error messages from Stripe checkout
  const success = url.searchParams.get('success');
  const cancelled = url.searchParams.get('cancelled');

  // Get active contract with plan details
  const contract = await prisma.contract.findFirst({
    where: {
      organizationId: organization.id,
      status: 'active'
    },
    include: {
      plan: true
    },
    orderBy: {
      startDate: 'desc'
    }
  });

  // Get recent invoices
  const invoices = await prisma.invoice.findMany({
    where: {
      organizationId: organization.id
    },
    orderBy: {
      issueDate: 'desc'
    },
    take: 10,
    include: {
      lineItems: true
    }
  });

  // Get all payment methods for organization
  const paymentMethods = await prisma.paymentMethod.findMany({
    where: {
      organizationId: organization.id
    },
    orderBy: [
      { isDefault: 'desc' },
      { createdAt: 'desc' }
    ]
  });

  // Get default payment method
  const paymentMethod = paymentMethods.find((pm) => pm.isDefault) || paymentMethods[0] || null;

  // Get all available add-ons
  const availableAddons = await prisma.addOn.findMany({
    where: {
      isActive: true
    },
    orderBy: {
      sortOrder: 'asc'
    }
  });

  // Get organization's active add-ons
  const organizationAddons = await prisma.organizationAddon.findMany({
    where: {
      organizationId: organization.id,
      status: 'active'
    },
    include: {
      addon: true
    }
  });

  // Calculate current month ad spend from campaign metrics
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  const campaignMetrics = await prisma.campaignMetric.aggregate({
    where: {
      campaign: {
        organizationId: organization.id
      },
      date: {
        gte: startOfMonth,
        lte: endOfMonth
      }
    },
    _sum: {
      spend: true
    }
  });

  // Get active campaigns for ad spend breakdown
  const activeCampaigns = await prisma.campaign.findMany({
    where: {
      organizationId: organization.id,
      status: 'active'
    },
    include: {
      metrics: {
        where: {
          date: {
            gte: startOfMonth,
            lte: endOfMonth
          }
        }
      }
    }
  });

  // Get Stripe subscription info if configured
  let stripeSubscription = null;
  let setupIntentClientSecret = null;

  if (isStripeConfigured()) {
    try {
      const customers = await stripe.customers.search({
        query: `metadata['organizationId']:'${organization.id}'`
      });

      if (customers.data.length > 0) {
        const subscriptions = await listSubscriptions(customers.data[0].id);
        if (subscriptions.data.length > 0) {
          const sub = subscriptions.data[0];
          stripeSubscription = {
            id: sub.id,
            status: sub.status,
            currentPeriodEnd: new Date(getSubscriptionPeriodEnd(sub) * 1000).toISOString(),
            cancelAtPeriodEnd: sub.cancel_at_period_end,
            trialEnd: sub.trial_end ? new Date(sub.trial_end * 1000).toISOString() : null
          };
        }
      }
    } catch (err) {
      console.error('Failed to fetch Stripe subscription:', err);
    }
  }

  // Format contract data
  const contractData = contract
    ? {
        id: contract.id,
        contractNumber: contract.contractNumber,
        status: contract.status,
        termMonths: contract.termMonths,
        startDate: contract.startDate.toISOString(),
        endDate: contract.endDate.toISOString(),
        monthlyCommitment: Number(contract.monthlyCommitment),
        annualValue: contract.annualValue ? Number(contract.annualValue) : null,
        autoRenew: contract.autoRenew,
        plan: {
          id: contract.plan.id,
          name: contract.plan.name,
          basePrice: Number(contract.plan.basePrice),
          territoryLimit: contract.plan.territoryLimit,
          userLimit: contract.plan.userLimit,
          features: contract.plan.features
        }
      }
    : null;

  // Format invoices
  const invoicesData = invoices.map((inv) => ({
    id: inv.id,
    invoiceNumber: inv.invoiceNumber,
    status: inv.status,
    issueDate: inv.issueDate.toISOString(),
    dueDate: inv.dueDate.toISOString(),
    subtotal: Number(inv.subtotal),
    taxAmount: Number(inv.taxAmount),
    totalAmount: Number(inv.totalAmount),
    paidAmount: Number(inv.paidAmount),
    paidAt: inv.paidAt?.toISOString() ?? null
  }));

  // Format payment methods
  const paymentMethodsData = paymentMethods.map((pm) => ({
    id: pm.id,
    stripeId: pm.providerPaymentMethodId,
    type: pm.type,
    brand: pm.brand,
    lastFour: pm.lastFour,
    expMonth: pm.expMonth,
    expYear: pm.expYear,
    isDefault: pm.isDefault
  }));

  // Format default payment method for backward compatibility
  const paymentMethodData = paymentMethod
    ? {
        id: paymentMethod.id,
        type: paymentMethod.type,
        brand: paymentMethod.brand,
        lastFour: paymentMethod.lastFour,
        expMonth: paymentMethod.expMonth,
        expYear: paymentMethod.expYear,
        isDefault: paymentMethod.isDefault
      }
    : null;

  // Format add-ons
  const addonsData = availableAddons.map((addon) => {
    const orgAddon = organizationAddons.find((oa) => oa.addonId === addon.id);
    return {
      id: addon.id,
      name: addon.name,
      slug: addon.slug,
      description: addon.description,
      addonType: addon.addonType,
      price: Number(addon.price),
      features: addon.features,
      isActive: !!orgAddon,
      organizationAddonId: orgAddon?.id ?? null,
      startedAt: orgAddon?.startedAt?.toISOString() ?? null
    };
  });

  // Calculate campaign ad spend
  const campaignSpend = activeCampaigns.map((c) => ({
    id: c.id,
    name: c.name,
    platform: c.platform,
    spend: c.metrics.reduce((sum, m) => sum + Number(m.spend), 0)
  }));

  return {
    contract: contractData,
    invoices: invoicesData,
    paymentMethod: paymentMethodData,
    paymentMethods: paymentMethodsData,
    addons: addonsData,
    adSpend: {
      total: Number(campaignMetrics._sum.spend ?? 0),
      byPlatform: campaignSpend,
      month: now.toLocaleString('en-US', { month: 'long', year: 'numeric' })
    },
    stripeSubscription,
    stripePublishableKey: env.STRIPE_PUBLISHABLE_KEY || null,
    isStripeConfigured: isStripeConfigured(),
    checkoutSuccess: success === 'true',
    checkoutCancelled: cancelled === 'true'
  };
};

export const actions: Actions = {
  subscribeAddon: async ({ request, locals }) => {
    const user = locals.user;
    if (!user || !user.organizationId) {
      return fail(401, { error: 'Unauthorized' });
    }

    const formData = await request.formData();
    const addonId = formData.get('addonId') as string;

    if (!addonId) {
      return fail(400, { error: 'Add-on ID is required' });
    }

    // Check if addon exists
    const addon = await prisma.addOn.findUnique({
      where: { id: addonId }
    });

    if (!addon || !addon.isActive) {
      return fail(404, { error: 'Add-on not found' });
    }

    // Check if already subscribed
    const existing = await prisma.organizationAddon.findFirst({
      where: {
        organizationId: user.organizationId,
        addonId: addonId,
        status: 'active'
      }
    });

    if (existing) {
      return fail(400, { error: 'Already subscribed to this add-on' });
    }

    // Create subscription
    await prisma.organizationAddon.create({
      data: {
        organizationId: user.organizationId,
        addonId: addonId,
        status: 'active',
        startedAt: new Date()
      }
    });

    // Log audit event
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        organizationId: user.organizationId,
        action: 'addon.subscribed',
        entityType: 'addon',
        entityId: addonId,
        newValues: { addonName: addon.name }
      }
    });

    return { success: true, message: `Subscribed to ${addon.name}` };
  },

  cancelAddon: async ({ request, locals }) => {
    const user = locals.user;
    if (!user || !user.organizationId) {
      return fail(401, { error: 'Unauthorized' });
    }

    const formData = await request.formData();
    const organizationAddonId = formData.get('organizationAddonId') as string;

    if (!organizationAddonId) {
      return fail(400, { error: 'Subscription ID is required' });
    }

    // Find the subscription
    const subscription = await prisma.organizationAddon.findFirst({
      where: {
        id: organizationAddonId,
        organizationId: user.organizationId,
        status: 'active'
      },
      include: {
        addon: true
      }
    });

    if (!subscription) {
      return fail(404, { error: 'Subscription not found' });
    }

    // Cancel subscription
    await prisma.organizationAddon.update({
      where: { id: organizationAddonId },
      data: {
        status: 'cancelled',
        cancelledAt: new Date()
      }
    });

    // Log audit event
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        organizationId: user.organizationId,
        action: 'addon.cancelled',
        entityType: 'addon',
        entityId: subscription.addonId,
        oldValues: { addonName: subscription.addon.name }
      }
    });

    return { success: true, message: 'Add-on cancelled successfully' };
  },

  createSetupIntent: async ({ locals }) => {
    const user = locals.user;
    if (!user || !user.organizationId) {
      return fail(401, { error: 'Unauthorized' });
    }

    if (!['client_owner', 'client_admin'].includes(user.role)) {
      return fail(403, { error: 'Insufficient permissions' });
    }

    if (!isStripeConfigured()) {
      return fail(500, { error: 'Payment processing is not configured' });
    }

    try {
      // Get organization
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
        return fail(404, { error: 'Organization not found' });
      }

      // Get or create Stripe customer
      const ownerEmail = organization.users[0]?.email || organization.email || user.email;
      const customer = await getOrCreateCustomer(
        user.organizationId,
        ownerEmail,
        organization.name
      );

      // Create setup intent
      const setupIntent = await createSetupIntent({
        stripeCustomerId: customer.id
      });

      return {
        success: true,
        clientSecret: setupIntent.client_secret
      };
    } catch (err) {
      console.error('Failed to create setup intent:', err);
      return fail(500, { error: 'Failed to initialize payment method setup' });
    }
  },

  addPaymentMethod: async ({ request, locals }) => {
    const user = locals.user;
    if (!user || !user.organizationId) {
      return fail(401, { error: 'Unauthorized' });
    }

    if (!['client_owner', 'client_admin'].includes(user.role)) {
      return fail(403, { error: 'Insufficient permissions' });
    }

    if (!isStripeConfigured()) {
      return fail(500, { error: 'Payment processing is not configured' });
    }

    const formData = await request.formData();
    const paymentMethodId = formData.get('paymentMethodId') as string;
    const setAsDefault = formData.get('setAsDefault') !== 'false';

    if (!paymentMethodId) {
      return fail(400, { error: 'Payment method ID is required' });
    }

    try {
      // Get organization
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
        return fail(404, { error: 'Organization not found' });
      }

      // Get or create Stripe customer
      const ownerEmail = organization.users[0]?.email || organization.email || user.email;
      const customer = await getOrCreateCustomer(
        user.organizationId,
        ownerEmail,
        organization.name
      );

      // Attach payment method
      const paymentMethod = await attachPaymentMethod({
        paymentMethodId,
        stripeCustomerId: customer.id,
        setAsDefault
      });

      // Sync to database
      await syncPaymentMethodToDatabase(paymentMethod, user.organizationId, setAsDefault);

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

      return {
        success: true,
        message: 'Payment method added successfully'
      };
    } catch (err) {
      console.error('Failed to add payment method:', err);
      return fail(500, { error: 'Failed to add payment method' });
    }
  },

  setDefaultPaymentMethod: async ({ request, locals }) => {
    const user = locals.user;
    if (!user || !user.organizationId) {
      return fail(401, { error: 'Unauthorized' });
    }

    if (!['client_owner', 'client_admin'].includes(user.role)) {
      return fail(403, { error: 'Insufficient permissions' });
    }

    if (!isStripeConfigured()) {
      return fail(500, { error: 'Payment processing is not configured' });
    }

    const formData = await request.formData();
    const paymentMethodId = formData.get('paymentMethodId') as string;

    if (!paymentMethodId) {
      return fail(400, { error: 'Payment method ID is required' });
    }

    try {
      // Get the payment method from database
      const dbPaymentMethod = await prisma.paymentMethod.findFirst({
        where: {
          id: paymentMethodId,
          organizationId: user.organizationId
        }
      });

      if (!dbPaymentMethod) {
        return fail(404, { error: 'Payment method not found' });
      }

      // Get Stripe customer
      const customers = await stripe.customers.search({
        query: `metadata['organizationId']:'${user.organizationId}'`
      });

      if (customers.data.length === 0) {
        return fail(400, { error: 'No billing account found' });
      }

      // Set as default in Stripe
      await setDefaultPaymentMethod(customers.data[0].id, dbPaymentMethod.providerPaymentMethodId);

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

      return { success: true, message: 'Default payment method updated' };
    } catch (err) {
      console.error('Failed to set default payment method:', err);
      return fail(500, { error: 'Failed to update default payment method' });
    }
  },

  removePaymentMethod: async ({ request, locals }) => {
    const user = locals.user;
    if (!user || !user.organizationId) {
      return fail(401, { error: 'Unauthorized' });
    }

    if (!['client_owner', 'client_admin'].includes(user.role)) {
      return fail(403, { error: 'Insufficient permissions' });
    }

    if (!isStripeConfigured()) {
      return fail(500, { error: 'Payment processing is not configured' });
    }

    const formData = await request.formData();
    const paymentMethodId = formData.get('paymentMethodId') as string;

    if (!paymentMethodId) {
      return fail(400, { error: 'Payment method ID is required' });
    }

    try {
      // Get the payment method from database
      const dbPaymentMethod = await prisma.paymentMethod.findFirst({
        where: {
          id: paymentMethodId,
          organizationId: user.organizationId
        }
      });

      if (!dbPaymentMethod) {
        return fail(404, { error: 'Payment method not found' });
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
        return fail(400, {
          error: 'Cannot remove the only payment method while you have an active subscription'
        });
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
          const customers = await stripe.customers.search({
            query: `metadata['organizationId']:'${user.organizationId}'`
          });

          if (customers.data.length > 0) {
            await stripe.customers.update(customers.data[0].id, {
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

      return { success: true, message: 'Payment method removed' };
    } catch (err) {
      console.error('Failed to remove payment method:', err);
      return fail(500, { error: 'Failed to remove payment method' });
    }
  },

  cancelSubscription: async ({ request, locals }) => {
    const user = locals.user;
    if (!user || !user.organizationId) {
      return fail(401, { error: 'Unauthorized' });
    }

    if (!['client_owner', 'client_admin'].includes(user.role)) {
      return fail(403, { error: 'Insufficient permissions' });
    }

    if (!isStripeConfigured()) {
      return fail(500, { error: 'Payment processing is not configured' });
    }

    const formData = await request.formData();
    const reason = formData.get('reason') as string;
    const cancelAtPeriodEnd = formData.get('cancelAtPeriodEnd') !== 'false';

    try {
      // Get Stripe customer and subscription
      const customers = await stripe.customers.search({
        query: `metadata['organizationId']:'${user.organizationId}'`
      });

      if (customers.data.length === 0) {
        return fail(400, { error: 'No billing account found' });
      }

      const subscriptions = await listSubscriptions(customers.data[0].id);

      if (subscriptions.data.length === 0) {
        return fail(400, { error: 'No active subscription found' });
      }

      const subscription = subscriptions.data[0];

      // Cancel subscription
      await cancelSubscription(subscription.id, {
        cancelAtPeriodEnd,
        cancellationDetails: {
          comment: reason
        }
      });

      // Log audit event
      await prisma.auditLog.create({
        data: {
          userId: user.id,
          organizationId: user.organizationId,
          action: 'subscription.cancelled',
          entityType: 'subscription',
          entityId: subscription.id,
          newValues: { reason, cancelAtPeriodEnd }
        }
      });

      return {
        success: true,
        message: cancelAtPeriodEnd
          ? 'Subscription will be cancelled at the end of the billing period'
          : 'Subscription cancelled'
      };
    } catch (err) {
      console.error('Failed to cancel subscription:', err);
      return fail(500, { error: 'Failed to cancel subscription' });
    }
  },

  resumeSubscription: async ({ locals }) => {
    const user = locals.user;
    if (!user || !user.organizationId) {
      return fail(401, { error: 'Unauthorized' });
    }

    if (!['client_owner', 'client_admin'].includes(user.role)) {
      return fail(403, { error: 'Insufficient permissions' });
    }

    if (!isStripeConfigured()) {
      return fail(500, { error: 'Payment processing is not configured' });
    }

    try {
      // Get Stripe customer and subscription
      const customers = await stripe.customers.search({
        query: `metadata['organizationId']:'${user.organizationId}'`
      });

      if (customers.data.length === 0) {
        return fail(400, { error: 'No billing account found' });
      }

      const subscriptions = await listSubscriptions(customers.data[0].id);

      if (subscriptions.data.length === 0) {
        return fail(400, { error: 'No subscription found' });
      }

      const subscription = subscriptions.data[0];

      if (!subscription.cancel_at_period_end) {
        return fail(400, { error: 'Subscription is not scheduled for cancellation' });
      }

      // Resume subscription
      await resumeSubscription(subscription.id);

      // Update contract
      await prisma.contract.updateMany({
        where: {
          organizationId: user.organizationId,
          status: { in: ['active', 'pending'] }
        },
        data: {
          status: 'active',
          cancelledAt: null,
          cancellationReason: null
        }
      });

      // Log audit event
      await prisma.auditLog.create({
        data: {
          userId: user.id,
          organizationId: user.organizationId,
          action: 'subscription.resumed',
          entityType: 'subscription',
          entityId: subscription.id
        }
      });

      return { success: true, message: 'Subscription resumed' };
    } catch (err) {
      console.error('Failed to resume subscription:', err);
      return fail(500, { error: 'Failed to resume subscription' });
    }
  },

  openBillingPortal: async ({ locals, url }) => {
    const user = locals.user;
    if (!user || !user.organizationId) {
      return fail(401, { error: 'Unauthorized' });
    }

    if (!['client_owner', 'client_admin'].includes(user.role)) {
      return fail(403, { error: 'Insufficient permissions' });
    }

    if (!isStripeConfigured()) {
      return fail(500, { error: 'Payment processing is not configured' });
    }

    try {
      // Get Stripe customer
      const customers = await stripe.customers.search({
        query: `metadata['organizationId']:'${user.organizationId}'`
      });

      if (customers.data.length === 0) {
        return fail(400, { error: 'No billing account found' });
      }

      // Create billing portal session
      const returnUrl = `${url.origin}/billing`;
      const session = await createBillingPortalSession(customers.data[0].id, returnUrl);

      throw redirect(303, session.url);
    } catch (err) {
      if ((err as { status?: number }).status === 303) {
        throw err;
      }
      console.error('Failed to open billing portal:', err);
      return fail(500, { error: 'Failed to open billing portal' });
    }
  },

  downloadInvoice: async ({ request, locals }) => {
    const user = locals.user;
    if (!user || !user.organizationId) {
      return fail(401, { error: 'Unauthorized' });
    }

    const formData = await request.formData();
    const invoiceId = formData.get('invoiceId') as string;

    if (!invoiceId) {
      return fail(400, { error: 'Invoice ID is required' });
    }

    // Verify the invoice belongs to the user's organization
    const invoice = await prisma.invoice.findFirst({
      where: {
        id: invoiceId,
        organizationId: user.organizationId
      }
    });

    if (!invoice) {
      return fail(404, { error: 'Invoice not found' });
    }

    if (!isStripeConfigured()) {
      return fail(500, { error: 'PDF download not available' });
    }

    try {
      // Find Stripe invoice
      const stripeInvoices = await stripe.invoices.search({
        query: `number:'${invoice.invoiceNumber}'`
      });

      if (stripeInvoices.data.length === 0) {
        return fail(404, { error: 'Invoice PDF not available' });
      }

      const pdfUrl = await getInvoicePdfUrl(stripeInvoices.data[0].id);

      if (!pdfUrl) {
        return fail(404, { error: 'Invoice PDF not available' });
      }

      return { success: true, pdfUrl };
    } catch (err) {
      console.error('Failed to get invoice PDF:', err);
      return fail(500, { error: 'Failed to download invoice' });
    }
  }
};
