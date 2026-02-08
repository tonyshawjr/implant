import { json, type RequestHandler } from '@sveltejs/kit';
import { prisma } from '$lib/server/db';
import {
  sendLeadNotification,
  sendLeadEmail,
  getNotifiableUsers,
  type LeadInfo,
  type LeadEmailInfo
} from '$lib/server/notifications';

// Simple in-memory rate limiting
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX = 10; // Max 10 notifications per minute per organization

/**
 * Check rate limit for an organization
 */
function checkRateLimit(organizationId: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(organizationId);

  if (!entry || entry.resetAt < now) {
    rateLimitMap.set(organizationId, { count: 1, resetAt: now + RATE_LIMIT_WINDOW });
    return true;
  }

  if (entry.count >= RATE_LIMIT_MAX) {
    return false;
  }

  entry.count++;
  return true;
}

/**
 * Validate webhook secret
 */
function validateWebhookSecret(request: Request): boolean {
  const webhookSecret = process.env.WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.warn('WEBHOOK_SECRET not configured, skipping validation');
    return true;
  }

  const providedSecret = request.headers.get('x-webhook-secret');
  return providedSecret === webhookSecret;
}

export const POST: RequestHandler = async ({ request }) => {
  try {
    // Validate webhook secret
    if (!validateWebhookSecret(request)) {
      return json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    // Validate required fields
    if (!body.leadId) {
      return json({ error: 'Missing leadId' }, { status: 400 });
    }

    // Get the lead with organization details
    const lead = await prisma.lead.findUnique({
      where: { id: body.leadId },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            slug: true
          }
        },
        campaign: {
          select: {
            name: true
          }
        }
      }
    });

    if (!lead) {
      return json({ error: 'Lead not found' }, { status: 404 });
    }

    // Check rate limit
    if (!checkRateLimit(lead.organizationId)) {
      return json(
        { error: 'Rate limit exceeded. Please try again later.' },
        { status: 429 }
      );
    }

    // Build lead info
    const leadInfo: LeadInfo = {
      id: lead.id,
      firstName: lead.firstName,
      lastName: lead.lastName,
      phone: lead.phone,
      email: lead.email,
      source: lead.source,
      temperature: lead.temperature,
      organizationName: lead.organization.name
    };

    const dashboardUrl = process.env.PUBLIC_APP_URL || 'https://app.squeezmedia.com';
    const leadEmailInfo: LeadEmailInfo = {
      ...leadInfo,
      procedureInterest: lead.procedureInterest,
      notes: lead.notes,
      dashboardUrl: `${dashboardUrl}/leads/${lead.id}`
    };

    // Get users who should receive SMS notifications
    const smsUsers = await getNotifiableUsers(lead.organizationId, 'new_lead', 'sms');
    const emailUsers = await getNotifiableUsers(lead.organizationId, 'new_lead', 'email');

    const results = {
      sms: { sent: 0, failed: 0, errors: [] as string[] },
      email: { sent: 0, failed: 0, errors: [] as string[] }
    };

    // Send SMS notifications
    for (const user of smsUsers) {
      if (user.phone) {
        try {
          const result = await sendLeadNotification(user.phone, leadInfo);
          if (result.success) {
            results.sms.sent++;
          } else {
            results.sms.failed++;
            if (result.error) {
              results.sms.errors.push(`${user.email}: ${result.error}`);
            }
          }
        } catch (error) {
          results.sms.failed++;
          results.sms.errors.push(
            `${user.email}: ${error instanceof Error ? error.message : 'Unknown error'}`
          );
        }
      }
    }

    // Send email notifications
    for (const user of emailUsers) {
      try {
        const result = await sendLeadEmail(user.email, leadEmailInfo);
        if (result.success) {
          results.email.sent++;
        } else {
          results.email.failed++;
          if (result.error) {
            results.email.errors.push(`${user.email}: ${result.error}`);
          }
        }
      } catch (error) {
        results.email.failed++;
        results.email.errors.push(
          `${user.email}: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    }

    // Log the notification results
    await prisma.auditLog.create({
      data: {
        action: 'lead_notifications_sent',
        entityType: 'lead',
        entityId: lead.id,
        organizationId: lead.organizationId,
        newValues: {
          sms: {
            recipients: smsUsers.length,
            sent: results.sms.sent,
            failed: results.sms.failed
          },
          email: {
            recipients: emailUsers.length,
            sent: results.email.sent,
            failed: results.email.failed
          }
        }
      }
    });

    return json({
      success: true,
      leadId: lead.id,
      results: {
        sms: {
          recipients: smsUsers.length,
          sent: results.sms.sent,
          failed: results.sms.failed
        },
        email: {
          recipients: emailUsers.length,
          sent: results.email.sent,
          failed: results.email.failed
        }
      }
    });
  } catch (error) {
    console.error('Lead notification webhook error:', error);
    return json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
};

/**
 * GET handler for health check
 */
export const GET: RequestHandler = async () => {
  return json({
    status: 'ok',
    endpoint: 'lead-notification',
    timestamp: new Date().toISOString()
  });
};
