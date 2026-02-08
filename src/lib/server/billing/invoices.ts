import { stripe, isStripeConfigured, type Stripe } from '$lib/server/stripe';
import { prisma } from '$lib/server/db';
import type { InvoiceStatus } from '@prisma/client';

export interface SyncInvoiceInput {
  stripeInvoiceId: string;
  stripeInvoice?: Stripe.Invoice;
}

/**
 * Retrieves a Stripe invoice by ID
 */
export async function getStripeInvoice(invoiceId: string): Promise<Stripe.Invoice | null> {
  if (!isStripeConfigured()) {
    throw new Error('Stripe is not configured');
  }

  try {
    return await stripe.invoices.retrieve(invoiceId, {
      expand: ['payment_intent', 'subscription']
    });
  } catch (error) {
    if ((error as Stripe.errors.StripeError).code === 'resource_missing') {
      return null;
    }
    throw error;
  }
}

/**
 * Lists invoices for a customer
 */
export async function listStripeInvoices(
  stripeCustomerId: string,
  options?: {
    status?: 'draft' | 'open' | 'paid' | 'uncollectible' | 'void';
    limit?: number;
    startingAfter?: string;
  }
): Promise<Stripe.ApiList<Stripe.Invoice>> {
  if (!isStripeConfigured()) {
    throw new Error('Stripe is not configured');
  }

  return stripe.invoices.list({
    customer: stripeCustomerId,
    status: options?.status,
    limit: options?.limit || 10,
    starting_after: options?.startingAfter,
    expand: ['data.payment_intent']
  });
}

/**
 * Gets the PDF URL for an invoice
 */
export async function getInvoicePdfUrl(invoiceId: string): Promise<string | null> {
  if (!isStripeConfigured()) {
    throw new Error('Stripe is not configured');
  }

  const invoice = await stripe.invoices.retrieve(invoiceId);
  return invoice.invoice_pdf ?? null;
}

/**
 * Gets the hosted invoice URL (for payment)
 */
export async function getInvoiceHostedUrl(invoiceId: string): Promise<string | null> {
  if (!isStripeConfigured()) {
    throw new Error('Stripe is not configured');
  }

  const invoice = await stripe.invoices.retrieve(invoiceId);
  return invoice.hosted_invoice_url ?? null;
}

/**
 * Voids a Stripe invoice
 */
export async function voidStripeInvoice(invoiceId: string): Promise<Stripe.Invoice> {
  if (!isStripeConfigured()) {
    throw new Error('Stripe is not configured');
  }

  const invoice = await stripe.invoices.voidInvoice(invoiceId);

  console.log(`Voided Stripe invoice ${invoiceId}`);

  return invoice;
}

/**
 * Marks a Stripe invoice as uncollectible
 */
export async function markInvoiceUncollectible(invoiceId: string): Promise<Stripe.Invoice> {
  if (!isStripeConfigured()) {
    throw new Error('Stripe is not configured');
  }

  const invoice = await stripe.invoices.markUncollectible(invoiceId);

  console.log(`Marked Stripe invoice ${invoiceId} as uncollectible`);

  return invoice;
}

/**
 * Sends an invoice to the customer
 */
export async function sendInvoice(invoiceId: string): Promise<Stripe.Invoice> {
  if (!isStripeConfigured()) {
    throw new Error('Stripe is not configured');
  }

  const invoice = await stripe.invoices.sendInvoice(invoiceId);

  console.log(`Sent Stripe invoice ${invoiceId}`);

  return invoice;
}

/**
 * Finalizes a draft invoice
 */
export async function finalizeInvoice(invoiceId: string): Promise<Stripe.Invoice> {
  if (!isStripeConfigured()) {
    throw new Error('Stripe is not configured');
  }

  const invoice = await stripe.invoices.finalizeInvoice(invoiceId);

  console.log(`Finalized Stripe invoice ${invoiceId}`);

  return invoice;
}

/**
 * Pays an invoice immediately
 */
export async function payInvoice(
  invoiceId: string,
  options?: {
    paymentMethod?: string;
    source?: string;
  }
): Promise<Stripe.Invoice> {
  if (!isStripeConfigured()) {
    throw new Error('Stripe is not configured');
  }

  const invoice = await stripe.invoices.pay(invoiceId, {
    payment_method: options?.paymentMethod,
    source: options?.source
  });

  console.log(`Paid Stripe invoice ${invoiceId}`);

  return invoice;
}

/**
 * Creates a new invoice for a customer
 */
export async function createStripeInvoice(
  stripeCustomerId: string,
  items: Array<{
    description: string;
    amount: number;
    quantity?: number;
  }>,
  options?: {
    daysUntilDue?: number;
    autoAdvance?: boolean;
    metadata?: Record<string, string>;
  }
): Promise<Stripe.Invoice> {
  if (!isStripeConfigured()) {
    throw new Error('Stripe is not configured');
  }

  // Create invoice items first
  for (const item of items) {
    await stripe.invoiceItems.create({
      customer: stripeCustomerId,
      amount: Math.round(item.amount * 100), // Convert to cents
      currency: 'usd',
      description: item.description,
      quantity: item.quantity || 1
    });
  }

  // Create the invoice
  const invoice = await stripe.invoices.create({
    customer: stripeCustomerId,
    auto_advance: options?.autoAdvance ?? true,
    days_until_due: options?.daysUntilDue || 30,
    metadata: options?.metadata
  });

  console.log(`Created Stripe invoice ${invoice.id}`);

  return invoice;
}

/**
 * Syncs a Stripe invoice to the database
 */
export async function syncInvoiceToDatabase(input: SyncInvoiceInput): Promise<void> {
  const stripeInvoice = input.stripeInvoice || await getStripeInvoice(input.stripeInvoiceId);

  if (!stripeInvoice) {
    console.warn(`Invoice ${input.stripeInvoiceId} not found in Stripe`);
    return;
  }

  // Get organization from customer metadata
  const customer = typeof stripeInvoice.customer === 'string'
    ? await stripe.customers.retrieve(stripeInvoice.customer)
    : stripeInvoice.customer;

  if (!customer || (customer as Stripe.DeletedCustomer).deleted) {
    console.warn('Customer not found or deleted');
    return;
  }

  const organizationId = (customer as Stripe.Customer).metadata?.organizationId;
  if (!organizationId) {
    console.warn('Invoice customer has no organizationId in metadata');
    return;
  }

  // Map Stripe status to our status
  const statusMap: Record<string, InvoiceStatus> = {
    draft: 'draft',
    open: 'pending',
    paid: 'paid',
    uncollectible: 'cancelled',
    void: 'cancelled'
  };

  const invoiceStatus = statusMap[stripeInvoice.status || 'draft'] || 'pending';

  // Check if invoice is overdue
  const isOverdue =
    stripeInvoice.status === 'open' &&
    stripeInvoice.due_date &&
    stripeInvoice.due_date * 1000 < Date.now();

  const finalStatus: InvoiceStatus = isOverdue ? 'overdue' : invoiceStatus;

  // Upsert invoice in database
  const existingInvoice = await prisma.invoice.findFirst({
    where: {
      invoiceNumber: stripeInvoice.number || stripeInvoice.id
    }
  });

  // Calculate tax from total_taxes
  const taxAmount = stripeInvoice.total_taxes?.reduce((sum: number, t: { amount: number }) => sum + t.amount, 0) || 0;

  const invoiceData = {
    organizationId,
    invoiceNumber: stripeInvoice.number || stripeInvoice.id,
    status: finalStatus,
    issueDate: new Date((stripeInvoice.created || Date.now() / 1000) * 1000),
    dueDate: new Date((stripeInvoice.due_date || stripeInvoice.created || Date.now() / 1000) * 1000),
    subtotal: (stripeInvoice.subtotal || 0) / 100,
    taxAmount: taxAmount / 100,
    totalAmount: (stripeInvoice.total || 0) / 100,
    paidAmount: (stripeInvoice.amount_paid || 0) / 100,
    paidAt: stripeInvoice.status === 'paid' ? new Date() : null,
    notes: stripeInvoice.description
  };

  if (existingInvoice) {
    await prisma.invoice.update({
      where: { id: existingInvoice.id },
      data: invoiceData
    });
    console.log(`Updated invoice ${existingInvoice.id} from Stripe`);
  } else {
    const newInvoice = await prisma.invoice.create({
      data: invoiceData
    });

    // Create line items
    if (stripeInvoice.lines?.data) {
      for (const line of stripeInvoice.lines.data) {
        // Calculate unit price (use amount / quantity as fallback)
        const unitPrice = line.amount / (line.quantity || 1);

        await prisma.invoiceLineItem.create({
          data: {
            invoiceId: newInvoice.id,
            description: line.description || 'Subscription',
            quantity: line.quantity || 1,
            unitPrice: unitPrice / 100,
            amount: line.amount / 100,
            itemType: 'subscription'
          }
        });
      }
    }

    console.log(`Created invoice ${newInvoice.id} from Stripe`);
  }
}

/**
 * Gets invoices for an organization from the database
 */
export async function getOrganizationInvoices(
  organizationId: string,
  options?: {
    status?: InvoiceStatus;
    limit?: number;
    offset?: number;
  }
) {
  return prisma.invoice.findMany({
    where: {
      organizationId,
      ...(options?.status ? { status: options.status } : {})
    },
    include: {
      lineItems: true,
      paymentMethod: true
    },
    orderBy: {
      issueDate: 'desc'
    },
    take: options?.limit || 10,
    skip: options?.offset || 0
  });
}

/**
 * Creates a credit note for a Stripe invoice
 */
export async function createCreditNote(
  invoiceId: string,
  options: {
    amount?: number;
    reason?: 'duplicate' | 'fraudulent' | 'order_change' | 'product_unsatisfactory';
    memo?: string;
  }
): Promise<Stripe.CreditNote> {
  if (!isStripeConfigured()) {
    throw new Error('Stripe is not configured');
  }

  const creditNote = await stripe.creditNotes.create({
    invoice: invoiceId,
    amount: options.amount ? Math.round(options.amount * 100) : undefined,
    reason: options.reason,
    memo: options.memo
  });

  console.log(`Created credit note ${creditNote.id} for invoice ${invoiceId}`);

  return creditNote;
}
