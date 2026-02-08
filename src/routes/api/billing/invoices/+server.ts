import { json, error, type RequestHandler } from '@sveltejs/kit';
import { prisma } from '$lib/server/db';
import { isStripeConfigured, stripe } from '$lib/server/stripe';
import {
  getStripeInvoice,
  listStripeInvoices,
  getInvoicePdfUrl,
  getInvoiceHostedUrl,
  getOrganizationInvoices
} from '$lib/server/billing/invoices';

/**
 * GET /api/billing/invoices - List invoices
 */
export const GET: RequestHandler = async ({ locals, url }) => {
  const user = locals.user;

  if (!user) {
    throw error(401, 'Unauthorized');
  }

  if (!user.organizationId) {
    throw error(400, 'No organization associated with user');
  }

  const limit = parseInt(url.searchParams.get('limit') || '10', 10);
  const offset = parseInt(url.searchParams.get('offset') || '0', 10);
  const status = url.searchParams.get('status') as
    | 'draft'
    | 'pending'
    | 'paid'
    | 'overdue'
    | 'cancelled'
    | null;

  // Get invoices from database
  const invoices = await getOrganizationInvoices(user.organizationId, {
    status: status || undefined,
    limit,
    offset
  });

  // Get total count for pagination
  const totalCount = await prisma.invoice.count({
    where: {
      organizationId: user.organizationId,
      ...(status ? { status } : {})
    }
  });

  return json({
    invoices: invoices.map((inv) => ({
      id: inv.id,
      invoiceNumber: inv.invoiceNumber,
      status: inv.status,
      issueDate: inv.issueDate.toISOString(),
      dueDate: inv.dueDate.toISOString(),
      subtotal: Number(inv.subtotal),
      taxAmount: Number(inv.taxAmount),
      totalAmount: Number(inv.totalAmount),
      paidAmount: Number(inv.paidAmount),
      paidAt: inv.paidAt?.toISOString() || null,
      lineItems: inv.lineItems.map((li) => ({
        id: li.id,
        description: li.description,
        quantity: Number(li.quantity),
        unitPrice: Number(li.unitPrice),
        amount: Number(li.amount),
        itemType: li.itemType
      }))
    })),
    pagination: {
      total: totalCount,
      limit,
      offset,
      hasMore: offset + invoices.length < totalCount
    }
  });
};

/**
 * POST /api/billing/invoices - Get invoice PDF or pay invoice
 */
export const POST: RequestHandler = async ({ request, locals }) => {
  const user = locals.user;

  if (!user) {
    throw error(401, 'Unauthorized');
  }

  if (!user.organizationId) {
    throw error(400, 'No organization associated with user');
  }

  const body = await request.json();
  const { action, invoiceId } = body;

  if (!invoiceId) {
    throw error(400, 'Invoice ID is required');
  }

  // Verify the invoice belongs to the user's organization
  const dbInvoice = await prisma.invoice.findFirst({
    where: {
      id: invoiceId,
      organizationId: user.organizationId
    }
  });

  if (!dbInvoice) {
    throw error(404, 'Invoice not found');
  }

  switch (action) {
    case 'get_pdf': {
      if (!isStripeConfigured()) {
        throw error(500, 'Stripe is not configured');
      }

      // Try to get from Stripe using invoice number
      try {
        const stripeInvoices = await stripe.invoices.search({
          query: `number:'${dbInvoice.invoiceNumber}'`
        });

        if (stripeInvoices.data.length > 0) {
          const pdfUrl = await getInvoicePdfUrl(stripeInvoices.data[0].id);
          return json({ pdfUrl });
        }
      } catch (err) {
        console.error('Failed to get Stripe invoice PDF:', err);
      }

      // Generate PDF URL for local invoice (would need separate PDF generation)
      return json({
        pdfUrl: null,
        message: 'PDF generation not available for this invoice'
      });
    }

    case 'get_payment_link': {
      if (!isStripeConfigured()) {
        throw error(500, 'Stripe is not configured');
      }

      if (dbInvoice.status !== 'pending' && dbInvoice.status !== 'overdue') {
        throw error(400, 'Invoice is not payable');
      }

      try {
        const stripeInvoices = await stripe.invoices.search({
          query: `number:'${dbInvoice.invoiceNumber}'`
        });

        if (stripeInvoices.data.length > 0) {
          const hostedUrl = await getInvoiceHostedUrl(stripeInvoices.data[0].id);
          return json({ paymentUrl: hostedUrl });
        }
      } catch (err) {
        console.error('Failed to get Stripe invoice payment link:', err);
      }

      throw error(400, 'Payment link not available for this invoice');
    }

    case 'download_summary': {
      // Return invoice data for client-side PDF generation
      const lineItems = await prisma.invoiceLineItem.findMany({
        where: { invoiceId }
      });

      return json({
        invoice: {
          invoiceNumber: dbInvoice.invoiceNumber,
          status: dbInvoice.status,
          issueDate: dbInvoice.issueDate.toISOString(),
          dueDate: dbInvoice.dueDate.toISOString(),
          subtotal: Number(dbInvoice.subtotal),
          taxAmount: Number(dbInvoice.taxAmount),
          totalAmount: Number(dbInvoice.totalAmount),
          paidAmount: Number(dbInvoice.paidAmount),
          paidAt: dbInvoice.paidAt?.toISOString() || null,
          notes: dbInvoice.notes
        },
        lineItems: lineItems.map((li) => ({
          description: li.description,
          quantity: Number(li.quantity),
          unitPrice: Number(li.unitPrice),
          amount: Number(li.amount),
          itemType: li.itemType
        }))
      });
    }

    default:
      throw error(400, `Unknown action: ${action}`);
  }
};
