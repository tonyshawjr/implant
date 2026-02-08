import type Stripe from 'stripe';

/**
 * Gets the current period start from a subscription (from first item)
 */
export function getSubscriptionPeriodStart(subscription: Stripe.Subscription): number {
  if (subscription.items.data.length > 0) {
    return subscription.items.data[0].current_period_start;
  }
  return subscription.start_date;
}

/**
 * Gets the current period end from a subscription (from first item)
 */
export function getSubscriptionPeriodEnd(subscription: Stripe.Subscription): number {
  if (subscription.items.data.length > 0) {
    return subscription.items.data[0].current_period_end;
  }
  // Fallback: estimate based on billing cycle
  const start = getSubscriptionPeriodStart(subscription);
  const thirtyDaysInSeconds = 30 * 24 * 60 * 60;
  return start + thirtyDaysInSeconds;
}

/**
 * Safely gets payment intent from an invoice's payments
 */
export function getInvoicePaymentIntent(invoice: Stripe.Invoice): string | null {
  // In newer API, payments are in the payments list
  if (invoice.payments?.data?.[0]?.payment) {
    const payment = invoice.payments.data[0].payment;
    if (typeof payment === 'string') {
      return payment;
    }
    if (payment && typeof payment === 'object' && 'id' in payment) {
      return (payment as { id: string }).id;
    }
  }
  return null;
}

/**
 * Safely gets tax from an invoice
 */
export function getInvoiceTax(invoice: Stripe.Invoice): number {
  // Use total_taxes in newer API
  if (invoice.total_taxes?.length) {
    return invoice.total_taxes.reduce((sum, t) => sum + t.amount, 0);
  }
  return 0;
}

/**
 * Gets proration status from invoice line item
 * In newer API, proration info is in pricing or type
 */
export function isProration(line: Stripe.InvoiceLineItem): boolean {
  // Check if description contains proration
  if (line.description?.toLowerCase().includes('proration')) {
    return true;
  }
  // Check pricing for proration behavior (check amount is negative as a fallback)
  if (line.amount < 0) {
    return true;
  }
  return false;
}
