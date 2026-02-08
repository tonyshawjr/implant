import { stripe, isStripeConfigured, type Stripe } from '$lib/server/stripe';
import { prisma } from '$lib/server/db';
import type { PaymentMethodType } from '@prisma/client';

export interface AttachPaymentMethodInput {
  paymentMethodId: string;
  stripeCustomerId: string;
  setAsDefault?: boolean;
}

export interface CreateSetupIntentInput {
  stripeCustomerId: string;
  paymentMethodTypes?: string[];
}

/**
 * Attaches a payment method to a customer
 */
export async function attachPaymentMethod(input: AttachPaymentMethodInput): Promise<Stripe.PaymentMethod> {
  if (!isStripeConfigured()) {
    throw new Error('Stripe is not configured');
  }

  // Attach payment method to customer
  const paymentMethod = await stripe.paymentMethods.attach(input.paymentMethodId, {
    customer: input.stripeCustomerId
  });

  // Set as default if requested
  if (input.setAsDefault) {
    await stripe.customers.update(input.stripeCustomerId, {
      invoice_settings: {
        default_payment_method: input.paymentMethodId
      }
    });
  }

  console.log(`Attached payment method ${input.paymentMethodId} to customer ${input.stripeCustomerId}`);

  return paymentMethod;
}

/**
 * Detaches a payment method from a customer
 */
export async function detachPaymentMethod(paymentMethodId: string): Promise<Stripe.PaymentMethod> {
  if (!isStripeConfigured()) {
    throw new Error('Stripe is not configured');
  }

  const paymentMethod = await stripe.paymentMethods.detach(paymentMethodId);

  console.log(`Detached payment method ${paymentMethodId}`);

  return paymentMethod;
}

/**
 * Lists payment methods for a customer
 */
export async function listPaymentMethods(
  stripeCustomerId: string,
  type?: Stripe.PaymentMethodListParams.Type
): Promise<Stripe.ApiList<Stripe.PaymentMethod>> {
  if (!isStripeConfigured()) {
    throw new Error('Stripe is not configured');
  }

  return stripe.paymentMethods.list({
    customer: stripeCustomerId,
    type: type || 'card'
  });
}

/**
 * Gets the default payment method for a customer
 */
export async function getDefaultPaymentMethod(
  stripeCustomerId: string
): Promise<Stripe.PaymentMethod | null> {
  if (!isStripeConfigured()) {
    throw new Error('Stripe is not configured');
  }

  const customer = await stripe.customers.retrieve(stripeCustomerId) as Stripe.Customer;

  if (customer.deleted) {
    return null;
  }

  const defaultPaymentMethodId = customer.invoice_settings?.default_payment_method;

  if (!defaultPaymentMethodId) {
    return null;
  }

  if (typeof defaultPaymentMethodId === 'string') {
    return stripe.paymentMethods.retrieve(defaultPaymentMethodId);
  }

  return defaultPaymentMethodId;
}

/**
 * Sets a payment method as default for a customer
 */
export async function setDefaultPaymentMethod(
  stripeCustomerId: string,
  paymentMethodId: string
): Promise<void> {
  if (!isStripeConfigured()) {
    throw new Error('Stripe is not configured');
  }

  await stripe.customers.update(stripeCustomerId, {
    invoice_settings: {
      default_payment_method: paymentMethodId
    }
  });

  console.log(`Set payment method ${paymentMethodId} as default for customer ${stripeCustomerId}`);
}

/**
 * Creates a SetupIntent for adding a new payment method
 */
export async function createSetupIntent(input: CreateSetupIntentInput): Promise<Stripe.SetupIntent> {
  if (!isStripeConfigured()) {
    throw new Error('Stripe is not configured');
  }

  const setupIntent = await stripe.setupIntents.create({
    customer: input.stripeCustomerId,
    payment_method_types: input.paymentMethodTypes || ['card'],
    usage: 'off_session'
  });

  console.log(`Created SetupIntent ${setupIntent.id} for customer ${input.stripeCustomerId}`);

  return setupIntent;
}

/**
 * Confirms a SetupIntent (server-side)
 */
export async function confirmSetupIntent(
  setupIntentId: string,
  paymentMethodId: string
): Promise<Stripe.SetupIntent> {
  if (!isStripeConfigured()) {
    throw new Error('Stripe is not configured');
  }

  const setupIntent = await stripe.setupIntents.confirm(setupIntentId, {
    payment_method: paymentMethodId
  });

  console.log(`Confirmed SetupIntent ${setupIntentId}`);

  return setupIntent;
}

/**
 * Retrieves a SetupIntent
 */
export async function getSetupIntent(setupIntentId: string): Promise<Stripe.SetupIntent | null> {
  if (!isStripeConfigured()) {
    throw new Error('Stripe is not configured');
  }

  try {
    return await stripe.setupIntents.retrieve(setupIntentId);
  } catch (error) {
    if ((error as Stripe.errors.StripeError).code === 'resource_missing') {
      return null;
    }
    throw error;
  }
}

/**
 * Syncs a Stripe payment method to the database
 */
export async function syncPaymentMethodToDatabase(
  paymentMethod: Stripe.PaymentMethod,
  organizationId: string,
  isDefault: boolean = false
): Promise<void> {
  // Determine payment method type
  let type: PaymentMethodType = 'credit_card';
  if (paymentMethod.type === 'us_bank_account') {
    type = 'ach';
  }

  // Get card details if available
  const card = paymentMethod.card;

  // Find existing payment method
  const existingMethod = await prisma.paymentMethod.findFirst({
    where: {
      organizationId,
      providerPaymentMethodId: paymentMethod.id
    }
  });

  const paymentMethodData = {
    organizationId,
    type,
    provider: 'stripe',
    providerPaymentMethodId: paymentMethod.id,
    lastFour: card?.last4 || null,
    brand: card?.brand || null,
    expMonth: card?.exp_month || null,
    expYear: card?.exp_year || null,
    isDefault,
    billingEmail: paymentMethod.billing_details?.email || null
  };

  if (existingMethod) {
    await prisma.paymentMethod.update({
      where: { id: existingMethod.id },
      data: paymentMethodData
    });
    console.log(`Updated payment method ${existingMethod.id} from Stripe`);
  } else {
    // If setting as default, unset other defaults first
    if (isDefault) {
      await prisma.paymentMethod.updateMany({
        where: {
          organizationId,
          isDefault: true
        },
        data: {
          isDefault: false
        }
      });
    }

    const newMethod = await prisma.paymentMethod.create({
      data: paymentMethodData
    });
    console.log(`Created payment method ${newMethod.id} from Stripe`);
  }
}

/**
 * Removes a payment method from the database
 */
export async function removePaymentMethodFromDatabase(
  stripePaymentMethodId: string
): Promise<void> {
  const paymentMethod = await prisma.paymentMethod.findFirst({
    where: {
      providerPaymentMethodId: stripePaymentMethodId
    }
  });

  if (paymentMethod) {
    await prisma.paymentMethod.delete({
      where: { id: paymentMethod.id }
    });
    console.log(`Removed payment method ${paymentMethod.id} from database`);
  }
}

/**
 * Gets payment methods for an organization from the database
 */
export async function getOrganizationPaymentMethods(organizationId: string) {
  return prisma.paymentMethod.findMany({
    where: {
      organizationId
    },
    orderBy: [
      { isDefault: 'desc' },
      { createdAt: 'desc' }
    ]
  });
}

/**
 * Updates an existing payment method's expiration date
 */
export async function updatePaymentMethodExpiration(
  paymentMethodId: string
): Promise<Stripe.PaymentMethod | null> {
  if (!isStripeConfigured()) {
    throw new Error('Stripe is not configured');
  }

  try {
    // Retrieve the latest payment method data from Stripe
    const paymentMethod = await stripe.paymentMethods.retrieve(paymentMethodId);

    // Update in database
    const dbMethod = await prisma.paymentMethod.findFirst({
      where: {
        providerPaymentMethodId: paymentMethodId
      }
    });

    if (dbMethod && paymentMethod.card) {
      await prisma.paymentMethod.update({
        where: { id: dbMethod.id },
        data: {
          expMonth: paymentMethod.card.exp_month,
          expYear: paymentMethod.card.exp_year
        }
      });
    }

    return paymentMethod;
  } catch (error) {
    console.error(`Failed to update payment method ${paymentMethodId}:`, error);
    return null;
  }
}
