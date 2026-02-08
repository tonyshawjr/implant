import { json, error, type RequestHandler } from '@sveltejs/kit';
import { prisma } from '$lib/server/db';
import { isStripeConfigured, stripe } from '$lib/server/stripe';
import { getOrCreateCustomer } from '$lib/server/billing/customers';
import {
  createSubscription,
  cancelSubscription,
  updateSubscription,
  listSubscriptions
} from '$lib/server/billing/subscriptions';
import { getSubscriptionPeriodEnd } from '$lib/server/billing/stripe-helpers';
import {
  createStripeInvoice,
  syncInvoiceToDatabase,
  voidStripeInvoice
} from '$lib/server/billing/invoices';

// Admin roles that can access billing management
const ADMIN_ROLES = ['super_admin', 'admin'];

/**
 * GET /api/admin/billing - Get billing overview for all organizations
 */
export const GET: RequestHandler = async ({ locals, url }) => {
  const user = locals.user;

  if (!user) {
    throw error(401, 'Unauthorized');
  }

  if (!ADMIN_ROLES.includes(user.role)) {
    throw error(403, 'Insufficient permissions');
  }

  const organizationId = url.searchParams.get('organizationId');

  // If specific organization requested, get their details
  if (organizationId) {
    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
      include: {
        contracts: {
          include: { plan: true },
          orderBy: { startDate: 'desc' },
          take: 5
        },
        invoices: {
          orderBy: { issueDate: 'desc' },
          take: 10
        },
        paymentMethods: {
          orderBy: { isDefault: 'desc' }
        },
        organizationAddons: {
          where: { status: 'active' },
          include: { addon: true }
        }
      }
    });

    if (!organization) {
      throw error(404, 'Organization not found');
    }

    // Get Stripe subscription if configured
    let stripeSubscription = null;
    if (isStripeConfigured()) {
      try {
        const customers = await stripe.customers.search({
          query: `metadata['organizationId']:'${organizationId}'`
        });

        if (customers.data.length > 0) {
          const subscriptions = await listSubscriptions(customers.data[0].id);
          if (subscriptions.data.length > 0) {
            const sub = subscriptions.data[0];
            stripeSubscription = {
              id: sub.id,
              status: sub.status,
              currentPeriodEnd: new Date(getSubscriptionPeriodEnd(sub) * 1000).toISOString(),
              cancelAtPeriodEnd: sub.cancel_at_period_end
            };
          }
        }
      } catch (err) {
        console.error('Failed to fetch Stripe subscription:', err);
      }
    }

    return json({
      organization: {
        id: organization.id,
        name: organization.name,
        status: organization.status,
        healthScore: organization.healthScore ? Number(organization.healthScore) : null
      },
      contracts: organization.contracts.map((c) => ({
        id: c.id,
        contractNumber: c.contractNumber,
        status: c.status,
        planName: c.plan.name,
        monthlyCommitment: Number(c.monthlyCommitment),
        startDate: c.startDate.toISOString(),
        endDate: c.endDate.toISOString(),
        autoRenew: c.autoRenew
      })),
      invoices: organization.invoices.map((i) => ({
        id: i.id,
        invoiceNumber: i.invoiceNumber,
        status: i.status,
        totalAmount: Number(i.totalAmount),
        issueDate: i.issueDate.toISOString(),
        dueDate: i.dueDate.toISOString()
      })),
      paymentMethods: organization.paymentMethods.map((pm) => ({
        id: pm.id,
        type: pm.type,
        brand: pm.brand,
        lastFour: pm.lastFour,
        isDefault: pm.isDefault
      })),
      addons: organization.organizationAddons.map((oa) => ({
        id: oa.id,
        name: oa.addon.name,
        price: Number(oa.addon.price)
      })),
      stripeSubscription
    });
  }

  // Get billing overview for all organizations
  const organizations = await prisma.organization.findMany({
    where: {
      deletedAt: null
    },
    include: {
      contracts: {
        where: { status: 'active' },
        include: { plan: true },
        take: 1
      },
      invoices: {
        where: { status: { in: ['pending', 'overdue'] } }
      }
    },
    orderBy: { name: 'asc' }
  });

  // Calculate MRR
  const activeContracts = await prisma.contract.findMany({
    where: { status: 'active' }
  });

  const mrr = activeContracts.reduce((sum, c) => sum + Number(c.monthlyCommitment), 0);

  // Get invoices summary
  const invoiceSummary = await prisma.invoice.groupBy({
    by: ['status'],
    _sum: {
      totalAmount: true
    },
    _count: true
  });

  return json({
    overview: {
      mrr,
      totalOrganizations: organizations.length,
      activeSubscriptions: activeContracts.length,
      invoiceSummary: invoiceSummary.map((s) => ({
        status: s.status,
        count: s._count,
        totalAmount: Number(s._sum.totalAmount || 0)
      }))
    },
    organizations: organizations.map((org) => ({
      id: org.id,
      name: org.name,
      status: org.status,
      currentPlan: org.contracts[0]?.plan.name || null,
      monthlyValue: org.contracts[0] ? Number(org.contracts[0].monthlyCommitment) : 0,
      pendingInvoices: org.invoices.length,
      pendingAmount: org.invoices.reduce((sum, i) => sum + Number(i.totalAmount), 0)
    }))
  });
};

/**
 * POST /api/admin/billing - Admin billing operations
 */
export const POST: RequestHandler = async ({ request, locals }) => {
  const user = locals.user;

  if (!user) {
    throw error(401, 'Unauthorized');
  }

  if (!ADMIN_ROLES.includes(user.role)) {
    throw error(403, 'Insufficient permissions');
  }

  const body = await request.json();
  const { action, organizationId, ...params } = body;

  if (!organizationId) {
    throw error(400, 'Organization ID is required');
  }

  // Verify organization exists
  const organization = await prisma.organization.findUnique({
    where: { id: organizationId },
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

  switch (action) {
    case 'create_subscription': {
      if (!isStripeConfigured()) {
        throw error(500, 'Stripe is not configured');
      }

      const { priceId, trialDays } = params;

      if (!priceId) {
        throw error(400, 'Price ID is required');
      }

      const subscription = await createSubscription({
        organizationId,
        priceId,
        trialPeriodDays: trialDays
      });

      // Log audit event
      await prisma.auditLog.create({
        data: {
          userId: user.id,
          organizationId,
          action: 'admin.subscription.created',
          entityType: 'subscription',
          entityId: subscription.id,
          newValues: { priceId, trialDays }
        }
      });

      return json({
        success: true,
        subscription: {
          id: subscription.id,
          status: subscription.status
        }
      });
    }

    case 'cancel_subscription': {
      if (!isStripeConfigured()) {
        throw error(500, 'Stripe is not configured');
      }

      const { subscriptionId, cancelAtPeriodEnd, reason } = params;

      if (!subscriptionId) {
        throw error(400, 'Subscription ID is required');
      }

      const subscription = await cancelSubscription(subscriptionId, {
        cancelAtPeriodEnd: cancelAtPeriodEnd !== false,
        cancellationDetails: { comment: reason }
      });

      // Log audit event
      await prisma.auditLog.create({
        data: {
          userId: user.id,
          organizationId,
          action: 'admin.subscription.cancelled',
          entityType: 'subscription',
          entityId: subscriptionId,
          newValues: { reason, cancelAtPeriodEnd }
        }
      });

      return json({
        success: true,
        subscription: {
          id: subscription.id,
          status: subscription.status,
          cancelAtPeriodEnd: subscription.cancel_at_period_end
        }
      });
    }

    case 'update_subscription': {
      if (!isStripeConfigured()) {
        throw error(500, 'Stripe is not configured');
      }

      const { subscriptionId, priceId, prorationBehavior } = params;

      if (!subscriptionId) {
        throw error(400, 'Subscription ID is required');
      }

      const subscription = await updateSubscription({
        subscriptionId,
        priceId,
        prorationBehavior: prorationBehavior || 'create_prorations'
      });

      // Log audit event
      await prisma.auditLog.create({
        data: {
          userId: user.id,
          organizationId,
          action: 'admin.subscription.updated',
          entityType: 'subscription',
          entityId: subscriptionId,
          newValues: { priceId }
        }
      });

      return json({
        success: true,
        subscription: {
          id: subscription.id,
          status: subscription.status
        }
      });
    }

    case 'create_invoice': {
      if (!isStripeConfigured()) {
        throw error(500, 'Stripe is not configured');
      }

      const { items, daysUntilDue } = params;

      if (!items || !Array.isArray(items) || items.length === 0) {
        throw error(400, 'Invoice items are required');
      }

      // Get or create Stripe customer
      const ownerEmail = organization.users[0]?.email || organization.email || '';
      const customer = await getOrCreateCustomer(organizationId, ownerEmail, organization.name);

      const invoice = await createStripeInvoice(customer.id, items, {
        daysUntilDue: daysUntilDue || 30,
        metadata: { organizationId }
      });

      // Sync to database
      await syncInvoiceToDatabase({ stripeInvoiceId: invoice.id, stripeInvoice: invoice });

      // Log audit event
      await prisma.auditLog.create({
        data: {
          userId: user.id,
          organizationId,
          action: 'admin.invoice.created',
          entityType: 'invoice',
          entityId: invoice.id,
          newValues: { items, daysUntilDue }
        }
      });

      return json({
        success: true,
        invoice: {
          id: invoice.id,
          status: invoice.status,
          total: (invoice.total || 0) / 100
        }
      });
    }

    case 'void_invoice': {
      if (!isStripeConfigured()) {
        throw error(500, 'Stripe is not configured');
      }

      const { invoiceId } = params;

      if (!invoiceId) {
        throw error(400, 'Invoice ID is required');
      }

      // Get DB invoice to find Stripe invoice
      const dbInvoice = await prisma.invoice.findFirst({
        where: {
          id: invoiceId,
          organizationId
        }
      });

      if (!dbInvoice) {
        throw error(404, 'Invoice not found');
      }

      // Find Stripe invoice
      const stripeInvoices = await stripe.invoices.search({
        query: `number:'${dbInvoice.invoiceNumber}'`
      });

      if (stripeInvoices.data.length === 0) {
        throw error(404, 'Stripe invoice not found');
      }

      await voidStripeInvoice(stripeInvoices.data[0].id);

      // Update database
      await prisma.invoice.update({
        where: { id: invoiceId },
        data: { status: 'cancelled' }
      });

      // Log audit event
      await prisma.auditLog.create({
        data: {
          userId: user.id,
          organizationId,
          action: 'admin.invoice.voided',
          entityType: 'invoice',
          entityId: invoiceId
        }
      });

      return json({ success: true });
    }

    case 'create_contract': {
      const { planId, termMonths, monthlyCommitment, startDate, autoRenew } = params;

      if (!planId || !monthlyCommitment) {
        throw error(400, 'Plan ID and monthly commitment are required');
      }

      // Verify plan exists
      const plan = await prisma.plan.findUnique({
        where: { id: planId }
      });

      if (!plan) {
        throw error(404, 'Plan not found');
      }

      // Calculate dates
      const start = startDate ? new Date(startDate) : new Date();
      const end = new Date(start);
      end.setMonth(end.getMonth() + (termMonths || 12));

      // Generate contract number
      const contractCount = await prisma.contract.count();
      const contractNumber = `CON-${String(contractCount + 1).padStart(6, '0')}`;

      const contract = await prisma.contract.create({
        data: {
          organizationId,
          planId,
          contractNumber,
          status: 'active',
          termMonths: termMonths || 12,
          startDate: start,
          endDate: end,
          monthlyCommitment,
          annualValue: monthlyCommitment * (termMonths || 12),
          autoRenew: autoRenew !== false
        }
      });

      // Update organization status
      await prisma.organization.update({
        where: { id: organizationId },
        data: {
          status: 'active',
          clientSince: organization.clientSince || new Date()
        }
      });

      // Log audit event
      await prisma.auditLog.create({
        data: {
          userId: user.id,
          organizationId,
          action: 'admin.contract.created',
          entityType: 'contract',
          entityId: contract.id,
          newValues: { planId, monthlyCommitment, termMonths }
        }
      });

      return json({
        success: true,
        contract: {
          id: contract.id,
          contractNumber: contract.contractNumber
        }
      });
    }

    case 'update_contract': {
      const { contractId, monthlyCommitment, autoRenew, status } = params;

      if (!contractId) {
        throw error(400, 'Contract ID is required');
      }

      const contract = await prisma.contract.findFirst({
        where: {
          id: contractId,
          organizationId
        }
      });

      if (!contract) {
        throw error(404, 'Contract not found');
      }

      const updateData: {
        monthlyCommitment?: number;
        autoRenew?: boolean;
        status?: 'active' | 'pending' | 'expired' | 'cancelled';
        cancelledAt?: Date | null;
      } = {};

      if (monthlyCommitment !== undefined) {
        updateData.monthlyCommitment = monthlyCommitment;
      }
      if (autoRenew !== undefined) {
        updateData.autoRenew = autoRenew;
      }
      if (status !== undefined) {
        updateData.status = status;
        if (status === 'cancelled') {
          updateData.cancelledAt = new Date();
        }
      }

      const updatedContract = await prisma.contract.update({
        where: { id: contractId },
        data: updateData
      });

      // Log audit event
      await prisma.auditLog.create({
        data: {
          userId: user.id,
          organizationId,
          action: 'admin.contract.updated',
          entityType: 'contract',
          entityId: contractId,
          oldValues: {
            monthlyCommitment: Number(contract.monthlyCommitment),
            autoRenew: contract.autoRenew,
            status: contract.status
          },
          newValues: updateData
        }
      });

      return json({
        success: true,
        contract: {
          id: updatedContract.id,
          status: updatedContract.status
        }
      });
    }

    case 'add_addon': {
      const { addonId, priceOverride } = params;

      if (!addonId) {
        throw error(400, 'Add-on ID is required');
      }

      // Check if already subscribed
      const existing = await prisma.organizationAddon.findFirst({
        where: {
          organizationId,
          addonId,
          status: 'active'
        }
      });

      if (existing) {
        throw error(400, 'Organization already has this add-on');
      }

      const addon = await prisma.addOn.findUnique({
        where: { id: addonId }
      });

      if (!addon) {
        throw error(404, 'Add-on not found');
      }

      const orgAddon = await prisma.organizationAddon.create({
        data: {
          organizationId,
          addonId,
          status: 'active',
          priceOverride: priceOverride || null,
          startedAt: new Date()
        }
      });

      // Log audit event
      await prisma.auditLog.create({
        data: {
          userId: user.id,
          organizationId,
          action: 'admin.addon.added',
          entityType: 'addon',
          entityId: addonId,
          newValues: { addonName: addon.name, priceOverride }
        }
      });

      return json({
        success: true,
        organizationAddon: {
          id: orgAddon.id
        }
      });
    }

    case 'remove_addon': {
      const { organizationAddonId } = params;

      if (!organizationAddonId) {
        throw error(400, 'Organization add-on ID is required');
      }

      const orgAddon = await prisma.organizationAddon.findFirst({
        where: {
          id: organizationAddonId,
          organizationId,
          status: 'active'
        },
        include: { addon: true }
      });

      if (!orgAddon) {
        throw error(404, 'Add-on subscription not found');
      }

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
          organizationId,
          action: 'admin.addon.removed',
          entityType: 'addon',
          entityId: orgAddon.addonId,
          oldValues: { addonName: orgAddon.addon.name }
        }
      });

      return json({ success: true });
    }

    default:
      throw error(400, `Unknown action: ${action}`);
  }
};
