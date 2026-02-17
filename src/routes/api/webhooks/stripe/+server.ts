import { json, error, type RequestHandler } from '@sveltejs/kit';
import { stripe, isStripeConfigured, type Stripe } from '$lib/server/stripe';
import { env } from '$env/dynamic/private';
import { prisma } from '$lib/server/db';
import { syncInvoiceToDatabase } from '$lib/server/billing/invoices';
import { syncSubscriptionStatus } from '$lib/server/billing/subscriptions';
import {
  syncPaymentMethodToDatabase,
  removePaymentMethodFromDatabase
} from '$lib/server/billing/payment-methods';
import {
  getSubscriptionPeriodStart,
  getSubscriptionPeriodEnd,
  getInvoicePaymentIntent
} from '$lib/server/billing/stripe-helpers';
import { ROLE_SUPER_ADMIN, ROLE_ADMIN, ROLE_CLIENT_OWNER, ROLE_CLIENT_ADMIN } from '$lib/constants/roles';

const STRIPE_WEBHOOK_SECRET = env.STRIPE_WEBHOOK_SECRET || '';

/**
 * Handle Stripe webhook events
 */
export const POST: RequestHandler = async ({ request }) => {
  if (!isStripeConfigured()) {
    throw error(500, 'Stripe is not configured');
  }

  if (!STRIPE_WEBHOOK_SECRET) {
    console.error('STRIPE_WEBHOOK_SECRET is not set');
    throw error(500, 'Webhook secret not configured');
  }

  // Get the raw body for signature verification
  const body = await request.text();
  const signature = request.headers.get('stripe-signature');

  if (!signature) {
    throw error(400, 'Missing stripe-signature header');
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    throw error(400, 'Webhook signature verification failed');
  }

  console.log(`Received Stripe webhook: ${event.type} (${event.id})`);

  try {
    switch (event.type) {
      // Invoice events
      case 'invoice.paid':
        await handleInvoicePaid(event.data.object as Stripe.Invoice);
        break;

      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
        break;

      case 'invoice.created':
        await handleInvoiceCreated(event.data.object as Stripe.Invoice);
        break;

      case 'invoice.finalized':
        await handleInvoiceFinalized(event.data.object as Stripe.Invoice);
        break;

      case 'invoice.marked_uncollectible':
        await handleInvoiceUncollectible(event.data.object as Stripe.Invoice);
        break;

      // Subscription events
      case 'customer.subscription.created':
        await handleSubscriptionCreated(event.data.object as Stripe.Subscription);
        break;

      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;

      case 'customer.subscription.trial_will_end':
        await handleTrialWillEnd(event.data.object as Stripe.Subscription);
        break;

      // Payment method events
      case 'payment_method.attached':
        await handlePaymentMethodAttached(event.data.object as Stripe.PaymentMethod);
        break;

      case 'payment_method.detached':
        await handlePaymentMethodDetached(event.data.object as Stripe.PaymentMethod);
        break;

      case 'payment_method.updated':
        await handlePaymentMethodUpdated(event.data.object as Stripe.PaymentMethod);
        break;

      // Customer events
      case 'customer.updated':
        await handleCustomerUpdated(event.data.object as Stripe.Customer);
        break;

      // Checkout session completed
      case 'checkout.session.completed':
        await handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session);
        break;

      // Payment intent events
      case 'payment_intent.succeeded':
        await handlePaymentIntentSucceeded(event.data.object as Stripe.PaymentIntent);
        break;

      case 'payment_intent.payment_failed':
        await handlePaymentIntentFailed(event.data.object as Stripe.PaymentIntent);
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return json({ received: true });
  } catch (err) {
    console.error(`Error handling webhook ${event.type}:`, err);
    // Return 200 to acknowledge receipt even on error
    // This prevents Stripe from retrying
    return json({ received: true, error: 'Handler failed' });
  }
};

/**
 * Handle invoice.paid event
 */
async function handleInvoicePaid(invoice: Stripe.Invoice): Promise<void> {
  console.log(`Invoice ${invoice.id} paid`);

  // Sync invoice to database
  await syncInvoiceToDatabase({
    stripeInvoiceId: invoice.id,
    stripeInvoice: invoice
  });

  // Create payment record
  const organizationId = await getOrganizationIdFromCustomer(invoice.customer as string);

  if (organizationId) {
    // Find the invoice in our database
    const dbInvoice = await prisma.invoice.findFirst({
      where: {
        invoiceNumber: invoice.number || invoice.id
      }
    });

    if (dbInvoice) {
      // Create a payment record
      await prisma.payment.create({
        data: {
          invoiceId: dbInvoice.id,
          amount: invoice.amount_paid / 100,
          status: 'completed',
          providerTransactionId: getInvoicePaymentIntent(invoice),
          processedAt: new Date()
        }
      });

      // Update invoice status
      await prisma.invoice.update({
        where: { id: dbInvoice.id },
        data: {
          status: 'paid',
          paidAmount: invoice.amount_paid / 100,
          paidAt: new Date()
        }
      });
    }

    // Log audit event
    await prisma.auditLog.create({
      data: {
        organizationId,
        action: 'invoice.paid',
        entityType: 'invoice',
        entityId: invoice.id,
        newValues: {
          amount: invoice.amount_paid / 100,
          invoiceNumber: invoice.number
        }
      }
    });
  }
}

/**
 * Handle invoice.payment_failed event
 */
async function handleInvoicePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
  console.log(`Invoice ${invoice.id} payment failed`);

  const organizationId = await getOrganizationIdFromCustomer(invoice.customer as string);

  if (organizationId) {
    // Update invoice status in database
    const dbInvoice = await prisma.invoice.findFirst({
      where: {
        invoiceNumber: invoice.number || invoice.id
      }
    });

    if (dbInvoice) {
      // Create failed payment record
      await prisma.payment.create({
        data: {
          invoiceId: dbInvoice.id,
          amount: invoice.amount_due / 100,
          status: 'failed',
          providerTransactionId: getInvoicePaymentIntent(invoice),
          failureReason: 'Payment failed',
          processedAt: new Date()
        }
      });
    }

    // Create health alert
    await prisma.clientHealthAlert.create({
      data: {
        organizationId,
        alertType: 'payment_issue',
        severity: 'warning',
        title: 'Payment Failed',
        description: `Payment for invoice ${invoice.number || invoice.id} failed. Please update your payment method.`,
        metricValue: invoice.amount_due / 100
      }
    });

    // Create notification
    const users = await prisma.user.findMany({
      where: {
        organizationId,
        role: { in: [ROLE_CLIENT_OWNER, ROLE_CLIENT_ADMIN] }
      }
    });

    for (const user of users) {
      await prisma.notification.create({
        data: {
          userId: user.id,
          organizationId,
          type: 'payment_failed',
          title: 'Payment Failed',
          message: `Your payment for invoice ${invoice.number} could not be processed. Please update your payment method.`,
          link: '/billing'
        }
      });
    }

    // Log audit event
    await prisma.auditLog.create({
      data: {
        organizationId,
        action: 'invoice.payment_failed',
        entityType: 'invoice',
        entityId: invoice.id,
        newValues: {
          amount: invoice.amount_due / 100,
          invoiceNumber: invoice.number
        }
      }
    });
  }
}

/**
 * Handle invoice.created event
 */
async function handleInvoiceCreated(invoice: Stripe.Invoice): Promise<void> {
  console.log(`Invoice ${invoice.id} created`);

  await syncInvoiceToDatabase({
    stripeInvoiceId: invoice.id,
    stripeInvoice: invoice
  });
}

/**
 * Handle invoice.finalized event
 */
async function handleInvoiceFinalized(invoice: Stripe.Invoice): Promise<void> {
  console.log(`Invoice ${invoice.id} finalized`);

  await syncInvoiceToDatabase({
    stripeInvoiceId: invoice.id,
    stripeInvoice: invoice
  });
}

/**
 * Handle invoice.marked_uncollectible event
 */
async function handleInvoiceUncollectible(invoice: Stripe.Invoice): Promise<void> {
  console.log(`Invoice ${invoice.id} marked uncollectible`);

  const dbInvoice = await prisma.invoice.findFirst({
    where: {
      invoiceNumber: invoice.number || invoice.id
    }
  });

  if (dbInvoice) {
    await prisma.invoice.update({
      where: { id: dbInvoice.id },
      data: {
        status: 'cancelled',
        notes: 'Marked as uncollectible by Stripe'
      }
    });
  }
}

/**
 * Handle customer.subscription.created event
 */
async function handleSubscriptionCreated(subscription: Stripe.Subscription): Promise<void> {
  console.log(`Subscription ${subscription.id} created`);

  await syncSubscriptionStatus(subscription);
}

/**
 * Handle customer.subscription.updated event
 */
async function handleSubscriptionUpdated(subscription: Stripe.Subscription): Promise<void> {
  console.log(`Subscription ${subscription.id} updated (status: ${subscription.status})`);

  await syncSubscriptionStatus(subscription);

  const organizationId = subscription.metadata.organizationId;

  if (organizationId) {
    // Log audit event
    await prisma.auditLog.create({
      data: {
        organizationId,
        action: 'subscription.updated',
        entityType: 'subscription',
        entityId: subscription.id,
        newValues: {
          status: subscription.status,
          cancelAtPeriodEnd: subscription.cancel_at_period_end
        }
      }
    });
  }
}

/**
 * Handle customer.subscription.deleted event
 */
async function handleSubscriptionDeleted(subscription: Stripe.Subscription): Promise<void> {
  console.log(`Subscription ${subscription.id} deleted/cancelled`);

  const organizationId = subscription.metadata.organizationId;

  if (organizationId) {
    // Update contract status
    await prisma.contract.updateMany({
      where: {
        organizationId,
        status: 'active'
      },
      data: {
        status: 'cancelled',
        cancelledAt: new Date()
      }
    });

    // Update organization status if needed
    await prisma.organization.update({
      where: { id: organizationId },
      data: {
        status: 'churned'
      }
    });

    // Log audit event
    await prisma.auditLog.create({
      data: {
        organizationId,
        action: 'subscription.cancelled',
        entityType: 'subscription',
        entityId: subscription.id
      }
    });

    // Create notification for internal team
    const admins = await prisma.user.findMany({
      where: {
        role: { in: [ROLE_SUPER_ADMIN, ROLE_ADMIN] }
      }
    });

    const org = await prisma.organization.findUnique({
      where: { id: organizationId }
    });

    for (const admin of admins) {
      await prisma.notification.create({
        data: {
          userId: admin.id,
          type: 'subscription_cancelled',
          title: 'Subscription Cancelled',
          message: `${org?.name || 'Organization'} has cancelled their subscription.`,
          link: `/internal/clients/${organizationId}`
        }
      });
    }
  }
}

/**
 * Handle customer.subscription.trial_will_end event
 */
async function handleTrialWillEnd(subscription: Stripe.Subscription): Promise<void> {
  console.log(`Subscription ${subscription.id} trial ending soon`);

  const organizationId = subscription.metadata.organizationId;

  if (organizationId) {
    // Create notification for client
    const users = await prisma.user.findMany({
      where: {
        organizationId,
        role: { in: [ROLE_CLIENT_OWNER, ROLE_CLIENT_ADMIN] }
      }
    });

    for (const user of users) {
      await prisma.notification.create({
        data: {
          userId: user.id,
          organizationId,
          type: 'trial_ending',
          title: 'Trial Ending Soon',
          message: 'Your trial period will end in 3 days. Please add a payment method to continue your subscription.',
          link: '/billing'
        }
      });
    }
  }
}

/**
 * Handle payment_method.attached event
 */
async function handlePaymentMethodAttached(paymentMethod: Stripe.PaymentMethod): Promise<void> {
  console.log(`Payment method ${paymentMethod.id} attached`);

  const customerId = paymentMethod.customer as string;
  if (!customerId) return;

  const organizationId = await getOrganizationIdFromCustomer(customerId);

  if (organizationId) {
    // Check if this is the default
    const customer = await stripe.customers.retrieve(customerId) as Stripe.Customer;
    const isDefault = customer.invoice_settings?.default_payment_method === paymentMethod.id;

    await syncPaymentMethodToDatabase(paymentMethod, organizationId, isDefault);
  }
}

/**
 * Handle payment_method.detached event
 */
async function handlePaymentMethodDetached(paymentMethod: Stripe.PaymentMethod): Promise<void> {
  console.log(`Payment method ${paymentMethod.id} detached`);

  await removePaymentMethodFromDatabase(paymentMethod.id);
}

/**
 * Handle payment_method.updated event
 */
async function handlePaymentMethodUpdated(paymentMethod: Stripe.PaymentMethod): Promise<void> {
  console.log(`Payment method ${paymentMethod.id} updated`);

  const customerId = paymentMethod.customer as string;
  if (!customerId) return;

  const organizationId = await getOrganizationIdFromCustomer(customerId);

  if (organizationId) {
    const customer = await stripe.customers.retrieve(customerId) as Stripe.Customer;
    const isDefault = customer.invoice_settings?.default_payment_method === paymentMethod.id;

    await syncPaymentMethodToDatabase(paymentMethod, organizationId, isDefault);
  }
}

/**
 * Handle customer.updated event
 */
async function handleCustomerUpdated(customer: Stripe.Customer): Promise<void> {
  console.log(`Customer ${customer.id} updated`);

  const organizationId = customer.metadata?.organizationId;

  if (organizationId) {
    // Check if default payment method changed
    const defaultPaymentMethodId = customer.invoice_settings?.default_payment_method;

    if (defaultPaymentMethodId && typeof defaultPaymentMethodId === 'string') {
      // Update all payment methods in database
      await prisma.paymentMethod.updateMany({
        where: {
          organizationId,
          isDefault: true
        },
        data: {
          isDefault: false
        }
      });

      await prisma.paymentMethod.updateMany({
        where: {
          organizationId,
          providerPaymentMethodId: defaultPaymentMethodId
        },
        data: {
          isDefault: true
        }
      });
    }
  }
}

/**
 * Handle checkout.session.completed event
 */
async function handleCheckoutSessionCompleted(
  session: Stripe.Checkout.Session
): Promise<void> {
  console.log(`Checkout session ${session.id} completed`);

  const organizationId = session.metadata?.organizationId;

  if (organizationId && session.subscription) {
    // Get the subscription details
    const subscription = await stripe.subscriptions.retrieve(
      session.subscription as string
    );

    // Create contract in database
    const price = subscription.items.data[0]?.price;

    if (price) {
      // Get or create plan
      let plan = await prisma.plan.findFirst({
        where: {
          slug: price.id
        }
      });

      if (!plan) {
        plan = await prisma.plan.create({
          data: {
            name: price.nickname || 'Subscription',
            slug: price.id,
            basePrice: (price.unit_amount || 0) / 100
          }
        });
      }

      // Create contract
      await prisma.contract.create({
        data: {
          organizationId,
          planId: plan.id,
          contractNumber: `CON-${Date.now()}`,
          status: 'active',
          termMonths: 12,
          startDate: new Date(getSubscriptionPeriodStart(subscription) * 1000),
          endDate: new Date(getSubscriptionPeriodEnd(subscription) * 1000),
          monthlyCommitment: (price.unit_amount || 0) / 100,
          autoRenew: !subscription.cancel_at_period_end
        }
      });

      // Update organization
      await prisma.organization.update({
        where: { id: organizationId },
        data: {
          status: 'active',
          clientSince: new Date()
        }
      });
    }
  }
}

/**
 * Handle payment_intent.succeeded event
 */
async function handlePaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent): Promise<void> {
  console.log(`Payment intent ${paymentIntent.id} succeeded`);

  // This is handled by invoice.paid for subscription payments
  // Add custom handling here for one-time payments if needed
}

/**
 * Handle payment_intent.payment_failed event
 */
async function handlePaymentIntentFailed(paymentIntent: Stripe.PaymentIntent): Promise<void> {
  console.log(`Payment intent ${paymentIntent.id} failed`);

  // This is handled by invoice.payment_failed for subscription payments
  // Add custom handling here for one-time payments if needed
}

/**
 * Helper to get organization ID from a Stripe customer
 */
async function getOrganizationIdFromCustomer(customerId: string): Promise<string | null> {
  try {
    const customer = await stripe.customers.retrieve(customerId) as Stripe.Customer;

    if (customer.deleted) {
      return null;
    }

    return customer.metadata?.organizationId || null;
  } catch (error) {
    console.error(`Failed to retrieve customer ${customerId}:`, error);
    return null;
  }
}
