import { json, error, type RequestHandler } from '@sveltejs/kit';
import { prisma } from '$lib/server/db';
import { stripe, isStripeConfigured } from '$lib/server/stripe';
import { listSubscriptions } from '$lib/server/billing/subscriptions';
import { getSubscriptionPeriodEnd } from '$lib/server/billing/stripe-helpers';

/**
 * GET /api/billing - Get current subscription and billing info
 */
export const GET: RequestHandler = async ({ locals }) => {
  const user = locals.user;

  if (!user) {
    throw error(401, 'Unauthorized');
  }

  if (!user.organizationId) {
    throw error(400, 'No organization associated with user');
  }

  // Get active contract
  const contract = await prisma.contract.findFirst({
    where: {
      organizationId: user.organizationId,
      status: 'active'
    },
    include: {
      plan: true
    },
    orderBy: {
      startDate: 'desc'
    }
  });

  // Get payment methods
  const paymentMethods = await prisma.paymentMethod.findMany({
    where: {
      organizationId: user.organizationId
    },
    orderBy: [
      { isDefault: 'desc' },
      { createdAt: 'desc' }
    ]
  });

  // Get recent invoices
  const invoices = await prisma.invoice.findMany({
    where: {
      organizationId: user.organizationId
    },
    orderBy: {
      issueDate: 'desc'
    },
    take: 10
  });

  // Get organization add-ons
  const addons = await prisma.organizationAddon.findMany({
    where: {
      organizationId: user.organizationId,
      status: 'active'
    },
    include: {
      addon: true
    }
  });

  // Get Stripe subscription details if configured
  let stripeSubscription = null;
  if (isStripeConfigured()) {
    try {
      // Search for customer
      const customers = await stripe.customers.search({
        query: `metadata['organizationId']:'${user.organizationId}'`
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

  return json({
    contract: contract
      ? {
          id: contract.id,
          contractNumber: contract.contractNumber,
          status: contract.status,
          termMonths: contract.termMonths,
          startDate: contract.startDate.toISOString(),
          endDate: contract.endDate.toISOString(),
          monthlyCommitment: Number(contract.monthlyCommitment),
          autoRenew: contract.autoRenew,
          plan: {
            id: contract.plan.id,
            name: contract.plan.name,
            basePrice: Number(contract.plan.basePrice)
          }
        }
      : null,
    paymentMethods: paymentMethods.map((pm) => ({
      id: pm.id,
      type: pm.type,
      brand: pm.brand,
      lastFour: pm.lastFour,
      expMonth: pm.expMonth,
      expYear: pm.expYear,
      isDefault: pm.isDefault
    })),
    invoices: invoices.map((inv) => ({
      id: inv.id,
      invoiceNumber: inv.invoiceNumber,
      status: inv.status,
      issueDate: inv.issueDate.toISOString(),
      dueDate: inv.dueDate.toISOString(),
      totalAmount: Number(inv.totalAmount),
      paidAmount: Number(inv.paidAmount)
    })),
    addons: addons.map((oa) => ({
      id: oa.id,
      name: oa.addon.name,
      price: Number(oa.addon.price),
      startedAt: oa.startedAt.toISOString()
    })),
    stripeSubscription
  });
};
