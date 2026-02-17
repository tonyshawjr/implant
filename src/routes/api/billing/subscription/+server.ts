import { json, error, type RequestHandler } from '@sveltejs/kit';
import type Stripe from 'stripe';
import { prisma } from '$lib/server/db';
import { isStripeConfigured, stripe } from '$lib/server/stripe';
import {
  updateSubscription,
  cancelSubscription,
  resumeSubscription,
  createCheckoutSession,
  getUpcomingInvoice,
  listSubscriptions
} from '$lib/server/billing/subscriptions';
import {
  getSubscriptionPeriodStart,
  getSubscriptionPeriodEnd,
  getInvoiceTax,
  isProration
} from '$lib/server/billing/stripe-helpers';
import { ROLE_CLIENT_OWNER, ROLE_CLIENT_ADMIN } from '$lib/constants/roles';

/**
 * POST /api/billing/subscription - Change subscription plan or create checkout
 */
export const POST: RequestHandler = async ({ request, locals, url }) => {
  const user = locals.user;

  if (!user) {
    throw error(401, 'Unauthorized');
  }

  if (!user.organizationId) {
    throw error(400, 'No organization associated with user');
  }

  // Check if user has permission
  if (user.role !== ROLE_CLIENT_OWNER && user.role !== ROLE_CLIENT_ADMIN) {
    throw error(403, 'Insufficient permissions');
  }

  if (!isStripeConfigured()) {
    throw error(500, 'Stripe is not configured');
  }

  const body = await request.json();
  const { action, priceId, prorationBehavior } = body;

  // Get organization's Stripe customer
  const customers = await stripe.customers.search({
    query: `metadata['organizationId']:'${user.organizationId}'`
  });

  if (action === 'create_checkout') {
    // Create a checkout session for new subscription
    const successUrl = `${url.origin}/billing?success=true`;
    const cancelUrl = `${url.origin}/billing?cancelled=true`;

    const session = await createCheckoutSession(
      user.organizationId,
      priceId,
      successUrl,
      cancelUrl
    );

    return json({ checkoutUrl: session.url });
  }

  if (customers.data.length === 0) {
    throw error(400, 'No billing account found. Please contact support.');
  }

  const customerId = customers.data[0].id;

  // Get active subscription
  const subscriptions = await listSubscriptions(customerId);

  if (subscriptions.data.length === 0) {
    throw error(400, 'No active subscription found');
  }

  const subscription = subscriptions.data[0];

  switch (action) {
    case 'change_plan': {
      if (!priceId) {
        throw error(400, 'Price ID is required');
      }

      // Get preview of upcoming invoice
      const preview = await getUpcomingInvoice(customerId, {
        subscriptionId: subscription.id,
        priceId
      });

      // Update subscription
      const updated = await updateSubscription({
        subscriptionId: subscription.id,
        priceId,
        prorationBehavior: prorationBehavior || 'create_prorations'
      });

      // Update contract in database
      const price = await stripe.prices.retrieve(priceId);
      await prisma.contract.updateMany({
        where: {
          organizationId: user.organizationId,
          status: 'active'
        },
        data: {
          monthlyCommitment: (price.unit_amount || 0) / 100,
          updatedAt: new Date()
        }
      });

      // Log audit event
      await prisma.auditLog.create({
        data: {
          userId: user.id,
          organizationId: user.organizationId,
          action: 'subscription.plan_changed',
          entityType: 'subscription',
          entityId: subscription.id,
          newValues: { priceId }
        }
      });

      return json({
        success: true,
        subscription: {
          id: updated.id,
          status: updated.status
        },
        prorationAmount: (preview.total - preview.subtotal) / 100
      });
    }

    case 'cancel': {
      const { cancelAtPeriodEnd, reason } = body;

      const cancelled = await cancelSubscription(subscription.id, {
        cancelAtPeriodEnd: cancelAtPeriodEnd !== false,
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

      return json({
        success: true,
        subscription: {
          id: cancelled.id,
          status: cancelled.status,
          cancelAtPeriodEnd: cancelled.cancel_at_period_end,
          currentPeriodEnd: new Date(getSubscriptionPeriodEnd(cancelled) * 1000).toISOString()
        }
      });
    }

    case 'resume': {
      const resumed = await resumeSubscription(subscription.id);

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

      return json({
        success: true,
        subscription: {
          id: resumed.id,
          status: resumed.status,
          cancelAtPeriodEnd: resumed.cancel_at_period_end
        }
      });
    }

    default:
      throw error(400, `Unknown action: ${action}`);
  }
};

/**
 * GET /api/billing/subscription - Get subscription details and preview
 */
export const GET: RequestHandler = async ({ locals, url }) => {
  const user = locals.user;

  if (!user) {
    throw error(401, 'Unauthorized');
  }

  if (!user.organizationId) {
    throw error(400, 'No organization associated with user');
  }

  if (!isStripeConfigured()) {
    throw error(500, 'Stripe is not configured');
  }

  // Get organization's Stripe customer
  const customers = await stripe.customers.search({
    query: `metadata['organizationId']:'${user.organizationId}'`
  });

  if (customers.data.length === 0) {
    return json({ subscription: null, upcomingInvoice: null });
  }

  const customerId = customers.data[0].id;

  // Get active subscription
  const subscriptions = await listSubscriptions(customerId);

  if (subscriptions.data.length === 0) {
    return json({ subscription: null, upcomingInvoice: null });
  }

  const subscription = subscriptions.data[0];

  // Get upcoming invoice preview
  const priceId = url.searchParams.get('previewPriceId');
  let upcomingInvoice = null;

  try {
    upcomingInvoice = await getUpcomingInvoice(customerId, {
      subscriptionId: subscription.id,
      priceId: priceId || undefined
    });
  } catch (err) {
    console.error('Failed to get upcoming invoice:', err);
  }

  return json({
    subscription: {
      id: subscription.id,
      status: subscription.status,
      currentPeriodStart: new Date(getSubscriptionPeriodStart(subscription) * 1000).toISOString(),
      currentPeriodEnd: new Date(getSubscriptionPeriodEnd(subscription) * 1000).toISOString(),
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      cancelAt: subscription.cancel_at
        ? new Date(subscription.cancel_at * 1000).toISOString()
        : null,
      trialEnd: subscription.trial_end
        ? new Date(subscription.trial_end * 1000).toISOString()
        : null,
      items: subscription.items.data.map((item: Stripe.SubscriptionItem) => ({
        id: item.id,
        priceId: item.price.id,
        productId:
          typeof item.price.product === 'string'
            ? item.price.product
            : (item.price.product as Stripe.Product | null)?.id,
        quantity: item.quantity,
        unitAmount: (item.price.unit_amount || 0) / 100
      }))
    },
    upcomingInvoice: upcomingInvoice
      ? {
          amountDue: upcomingInvoice.amount_due / 100,
          subtotal: upcomingInvoice.subtotal / 100,
          total: upcomingInvoice.total / 100,
          tax: getInvoiceTax(upcomingInvoice) / 100,
          periodStart: new Date((upcomingInvoice.period_start || 0) * 1000).toISOString(),
          periodEnd: new Date((upcomingInvoice.period_end || 0) * 1000).toISOString(),
          lines: upcomingInvoice.lines.data.map((line: Stripe.InvoiceLineItem) => ({
            description: line.description,
            amount: line.amount / 100,
            proration: isProration(line)
          }))
        }
      : null
  });
};
