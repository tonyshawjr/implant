import { stripe, isStripeConfigured, type Stripe } from '$lib/server/stripe';
import { prisma } from '$lib/server/db';
import { getOrCreateCustomer } from './customers';
import { ROLE_CLIENT_OWNER } from '$lib/constants/roles';

export interface CreateSubscriptionInput {
  organizationId: string;
  priceId: string;
  paymentMethodId?: string;
  trialPeriodDays?: number;
  metadata?: Record<string, string>;
}

export interface UpdateSubscriptionInput {
  subscriptionId: string;
  priceId?: string;
  quantity?: number;
  prorationBehavior?: Stripe.SubscriptionUpdateParams.ProrationBehavior;
  cancelAtPeriodEnd?: boolean;
  metadata?: Record<string, string>;
}

/**
 * Creates a new subscription for an organization
 */
export async function createSubscription(input: CreateSubscriptionInput): Promise<Stripe.Subscription> {
  if (!isStripeConfigured()) {
    throw new Error('Stripe is not configured');
  }

  // Get organization details
  const organization = await prisma.organization.findUnique({
    where: { id: input.organizationId },
    include: {
      users: {
        where: {
          role: ROLE_CLIENT_OWNER
        },
        take: 1
      }
    }
  });

  if (!organization) {
    throw new Error('Organization not found');
  }

  // Get or create Stripe customer
  const ownerEmail = organization.users[0]?.email || organization.email || '';
  const customer = await getOrCreateCustomer(
    input.organizationId,
    ownerEmail,
    organization.name
  );

  // Set default payment method if provided
  if (input.paymentMethodId) {
    await stripe.paymentMethods.attach(input.paymentMethodId, {
      customer: customer.id
    });
    await stripe.customers.update(customer.id, {
      invoice_settings: {
        default_payment_method: input.paymentMethodId
      }
    });
  }

  // Create the subscription
  const subscriptionParams: Stripe.SubscriptionCreateParams = {
    customer: customer.id,
    items: [{ price: input.priceId }],
    payment_behavior: 'default_incomplete',
    payment_settings: {
      save_default_payment_method: 'on_subscription'
    },
    expand: ['latest_invoice.payment_intent'],
    metadata: {
      organizationId: input.organizationId,
      ...input.metadata
    }
  };

  if (input.trialPeriodDays) {
    subscriptionParams.trial_period_days = input.trialPeriodDays;
  }

  const subscription = await stripe.subscriptions.create(subscriptionParams);

  console.log(`Created Stripe subscription ${subscription.id} for organization ${input.organizationId}`);

  return subscription;
}

/**
 * Retrieves a subscription by ID
 */
export async function getSubscription(subscriptionId: string): Promise<Stripe.Subscription | null> {
  if (!isStripeConfigured()) {
    throw new Error('Stripe is not configured');
  }

  try {
    return await stripe.subscriptions.retrieve(subscriptionId, {
      expand: ['latest_invoice', 'default_payment_method']
    });
  } catch (error) {
    if ((error as Stripe.errors.StripeError).code === 'resource_missing') {
      return null;
    }
    throw error;
  }
}

/**
 * Lists subscriptions for a customer
 */
export async function listSubscriptions(
  stripeCustomerId: string,
  options?: {
    status?: Stripe.SubscriptionListParams.Status;
    limit?: number;
  }
): Promise<Stripe.ApiList<Stripe.Subscription>> {
  if (!isStripeConfigured()) {
    throw new Error('Stripe is not configured');
  }

  return stripe.subscriptions.list({
    customer: stripeCustomerId,
    status: options?.status || 'active',
    limit: options?.limit || 10,
    expand: ['data.latest_invoice', 'data.default_payment_method']
  });
}

/**
 * Updates a subscription (e.g., change plan, quantity)
 */
export async function updateSubscription(input: UpdateSubscriptionInput): Promise<Stripe.Subscription> {
  if (!isStripeConfigured()) {
    throw new Error('Stripe is not configured');
  }

  const updateParams: Stripe.SubscriptionUpdateParams = {};

  if (input.priceId) {
    // Get current subscription to find existing item
    const subscription = await stripe.subscriptions.retrieve(input.subscriptionId);
    if (subscription.items.data.length > 0) {
      updateParams.items = [
        {
          id: subscription.items.data[0].id,
          price: input.priceId
        }
      ];
    }
  }

  if (input.quantity !== undefined) {
    const subscription = await stripe.subscriptions.retrieve(input.subscriptionId);
    if (subscription.items.data.length > 0) {
      updateParams.items = updateParams.items || [{ id: subscription.items.data[0].id }];
      updateParams.items[0].quantity = input.quantity;
    }
  }

  if (input.prorationBehavior) {
    updateParams.proration_behavior = input.prorationBehavior;
  }

  if (input.cancelAtPeriodEnd !== undefined) {
    updateParams.cancel_at_period_end = input.cancelAtPeriodEnd;
  }

  if (input.metadata) {
    updateParams.metadata = input.metadata;
  }

  const subscription = await stripe.subscriptions.update(input.subscriptionId, updateParams);

  console.log(`Updated Stripe subscription ${subscription.id}`);

  return subscription;
}

/**
 * Cancels a subscription
 */
export async function cancelSubscription(
  subscriptionId: string,
  options?: {
    cancelAtPeriodEnd?: boolean;
    cancellationDetails?: {
      comment?: string;
      feedback?: Stripe.SubscriptionCancelParams.CancellationDetails.Feedback;
    };
  }
): Promise<Stripe.Subscription> {
  if (!isStripeConfigured()) {
    throw new Error('Stripe is not configured');
  }

  if (options?.cancelAtPeriodEnd) {
    // Schedule cancellation at end of billing period
    return stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: true,
      cancellation_details: options.cancellationDetails
    });
  }

  // Cancel immediately
  const subscription = await stripe.subscriptions.cancel(subscriptionId, {
    cancellation_details: options?.cancellationDetails
  });

  console.log(`Cancelled Stripe subscription ${subscriptionId}`);

  // Update contract in database
  const organizationId = subscription.metadata.organizationId;
  if (organizationId) {
    await prisma.contract.updateMany({
      where: {
        organizationId,
        status: 'active'
      },
      data: {
        status: 'cancelled',
        cancelledAt: new Date(),
        cancellationReason: options?.cancellationDetails?.comment
      }
    });
  }

  return subscription;
}

/**
 * Resumes a subscription that was set to cancel at period end
 */
export async function resumeSubscription(subscriptionId: string): Promise<Stripe.Subscription> {
  if (!isStripeConfigured()) {
    throw new Error('Stripe is not configured');
  }

  const subscription = await stripe.subscriptions.update(subscriptionId, {
    cancel_at_period_end: false
  });

  console.log(`Resumed Stripe subscription ${subscriptionId}`);

  return subscription;
}

/**
 * Creates a checkout session for a new subscription
 */
export async function createCheckoutSession(
  organizationId: string,
  priceId: string,
  successUrl: string,
  cancelUrl: string
): Promise<Stripe.Checkout.Session> {
  if (!isStripeConfigured()) {
    throw new Error('Stripe is not configured');
  }

  // Get organization details
  const organization = await prisma.organization.findUnique({
    where: { id: organizationId },
    include: {
      users: {
        where: {
          role: ROLE_CLIENT_OWNER
        },
        take: 1
      }
    }
  });

  if (!organization) {
    throw new Error('Organization not found');
  }

  // Get or create Stripe customer
  const ownerEmail = organization.users[0]?.email || organization.email || '';
  const customer = await getOrCreateCustomer(
    organizationId,
    ownerEmail,
    organization.name
  );

  return stripe.checkout.sessions.create({
    customer: customer.id,
    mode: 'subscription',
    line_items: [
      {
        price: priceId,
        quantity: 1
      }
    ],
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: {
      organizationId
    }
  });
}

/**
 * Retrieves upcoming invoice preview
 */
export async function getUpcomingInvoice(
  stripeCustomerId: string,
  options?: {
    subscriptionId?: string;
    priceId?: string;
  }
): Promise<Stripe.Invoice> {
  if (!isStripeConfigured()) {
    throw new Error('Stripe is not configured');
  }

  const params: Stripe.InvoiceCreatePreviewParams = {
    customer: stripeCustomerId
  };

  if (options?.subscriptionId) {
    params.subscription = options.subscriptionId;
  }

  if (options?.priceId && options?.subscriptionId) {
    // Preview what invoice would look like with new price
    const subscription = await stripe.subscriptions.retrieve(options.subscriptionId);
    params.subscription_details = {
      items: [
        {
          id: subscription.items.data[0].id,
          price: options.priceId
        }
      ],
      proration_behavior: 'create_prorations'
    };
  }

  return stripe.invoices.createPreview(params);
}

/**
 * Syncs subscription status to database
 */
export async function syncSubscriptionStatus(subscription: Stripe.Subscription): Promise<void> {
  const organizationId = subscription.metadata.organizationId;
  if (!organizationId) {
    console.warn('Subscription has no organizationId in metadata');
    return;
  }

  // Map Stripe status to our contract status
  const statusMap: Record<string, 'active' | 'pending' | 'expired' | 'cancelled'> = {
    active: 'active',
    trialing: 'active',
    past_due: 'active',
    incomplete: 'pending',
    incomplete_expired: 'expired',
    canceled: 'cancelled',
    unpaid: 'cancelled',
    paused: 'pending'
  };

  const contractStatus = statusMap[subscription.status] || 'pending';

  await prisma.contract.updateMany({
    where: {
      organizationId,
      status: { in: ['active', 'pending'] }
    },
    data: {
      status: contractStatus,
      updatedAt: new Date()
    }
  });

  console.log(`Synced subscription ${subscription.id} status to ${contractStatus} for org ${organizationId}`);
}
