import { stripe, isStripeConfigured, type Stripe } from '$lib/server/stripe';
import { prisma } from '$lib/server/db';

export interface CreateCustomerInput {
  organizationId: string;
  email: string;
  name: string;
  metadata?: Record<string, string>;
}

export interface UpdateCustomerInput {
  stripeCustomerId: string;
  email?: string;
  name?: string;
  metadata?: Record<string, string>;
}

/**
 * Creates a new Stripe customer for an organization
 */
export async function createCustomer(input: CreateCustomerInput): Promise<Stripe.Customer> {
  if (!isStripeConfigured()) {
    throw new Error('Stripe is not configured');
  }

  const customer = await stripe.customers.create({
    email: input.email,
    name: input.name,
    metadata: {
      organizationId: input.organizationId,
      ...input.metadata
    }
  });

  // Update organization with Stripe customer ID
  await prisma.organization.update({
    where: { id: input.organizationId },
    data: {
      // Note: You may need to add stripeCustomerId field to Organization model
      // For now, we'll store it in metadata or a separate table
    }
  });

  console.log(`Created Stripe customer ${customer.id} for organization ${input.organizationId}`);

  return customer;
}

/**
 * Retrieves a Stripe customer by ID
 */
export async function getCustomer(stripeCustomerId: string): Promise<Stripe.Customer | null> {
  if (!isStripeConfigured()) {
    throw new Error('Stripe is not configured');
  }

  try {
    const customer = await stripe.customers.retrieve(stripeCustomerId);
    if (customer.deleted) {
      return null;
    }
    return customer as Stripe.Customer;
  } catch (error) {
    if ((error as Stripe.errors.StripeError).code === 'resource_missing') {
      return null;
    }
    throw error;
  }
}

/**
 * Updates a Stripe customer
 */
export async function updateCustomer(input: UpdateCustomerInput): Promise<Stripe.Customer> {
  if (!isStripeConfigured()) {
    throw new Error('Stripe is not configured');
  }

  const updateData: Stripe.CustomerUpdateParams = {};

  if (input.email) {
    updateData.email = input.email;
  }
  if (input.name) {
    updateData.name = input.name;
  }
  if (input.metadata) {
    updateData.metadata = input.metadata;
  }

  const customer = await stripe.customers.update(input.stripeCustomerId, updateData);

  console.log(`Updated Stripe customer ${customer.id}`);

  return customer;
}

/**
 * Deletes a Stripe customer
 */
export async function deleteCustomer(stripeCustomerId: string): Promise<void> {
  if (!isStripeConfigured()) {
    throw new Error('Stripe is not configured');
  }

  await stripe.customers.del(stripeCustomerId);

  console.log(`Deleted Stripe customer ${stripeCustomerId}`);
}

/**
 * Gets or creates a Stripe customer for an organization
 */
export async function getOrCreateCustomer(
  organizationId: string,
  email: string,
  name: string
): Promise<Stripe.Customer> {
  if (!isStripeConfigured()) {
    throw new Error('Stripe is not configured');
  }

  // First, search for existing customer with this organization ID
  const existingCustomers = await stripe.customers.search({
    query: `metadata['organizationId']:'${organizationId}'`
  });

  if (existingCustomers.data.length > 0) {
    return existingCustomers.data[0];
  }

  // Create new customer if not found
  return createCustomer({
    organizationId,
    email,
    name
  });
}

/**
 * Lists all customers with pagination
 */
export async function listCustomers(options?: {
  limit?: number;
  startingAfter?: string;
}): Promise<Stripe.ApiList<Stripe.Customer>> {
  if (!isStripeConfigured()) {
    throw new Error('Stripe is not configured');
  }

  return stripe.customers.list({
    limit: options?.limit || 10,
    starting_after: options?.startingAfter
  });
}

/**
 * Creates a billing portal session for a customer
 */
export async function createBillingPortalSession(
  stripeCustomerId: string,
  returnUrl: string
): Promise<Stripe.BillingPortal.Session> {
  if (!isStripeConfigured()) {
    throw new Error('Stripe is not configured');
  }

  return stripe.billingPortal.sessions.create({
    customer: stripeCustomerId,
    return_url: returnUrl
  });
}
