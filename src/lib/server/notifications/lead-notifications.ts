import { prisma } from '../db';
import { sendLeadNotification as sendLeadSMS, type LeadInfo } from './sms';
import { sendLeadEmail, type LeadEmailInfo } from './email';
import { getNotifiableUsers } from './preferences';

/**
 * Lead data structure for notifications
 */
export interface LeadNotificationData {
  id: string;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  email: string | null;
  source: string;
  temperature: string;
  score: number | null;
  procedureInterest?: string | null;
  notes?: string | null;
}

/**
 * Organization data for notifications
 */
export interface OrganizationNotificationData {
  id: string;
  name: string;
  slug: string;
}

/**
 * Result of notification dispatch
 */
export interface NotificationDispatchResult {
  smsCount: number;
  emailCount: number;
  smsFailed: number;
  emailFailed: number;
}

/**
 * Rate limiting configuration to prevent notification spam
 */
const RATE_LIMIT_WINDOW_MS = 60000; // 1 minute
const MAX_NOTIFICATIONS_PER_WINDOW = 10;

// Simple in-memory rate limiter (per organization)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

/**
 * Check if we should rate limit notifications for an organization
 */
function checkRateLimit(organizationId: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(organizationId);

  if (!entry || now > entry.resetTime) {
    // Reset or create new entry
    rateLimitMap.set(organizationId, {
      count: 1,
      resetTime: now + RATE_LIMIT_WINDOW_MS
    });
    return false; // Not rate limited
  }

  if (entry.count >= MAX_NOTIFICATIONS_PER_WINDOW) {
    return true; // Rate limited
  }

  entry.count++;
  return false;
}

/**
 * Send notifications to all eligible users in an organization when a new lead is captured
 * This function fires and forgets - it should never block the API response
 */
export async function sendLeadNotifications(
  lead: LeadNotificationData,
  organization: OrganizationNotificationData
): Promise<NotificationDispatchResult> {
  const result: NotificationDispatchResult = {
    smsCount: 0,
    emailCount: 0,
    smsFailed: 0,
    emailFailed: 0
  };

  try {
    // Check rate limiting to prevent notification spam
    if (checkRateLimit(organization.id)) {
      console.warn(`Rate limited notifications for organization ${organization.id}`);
      return result;
    }

    // Build the dashboard URL for the lead
    const dashboardBaseUrl = process.env.PUBLIC_APP_URL || 'https://app.squeezmedia.com';
    const dashboardUrl = `${dashboardBaseUrl}/leads/${lead.id}`;

    // Get users who should receive SMS notifications
    const smsUsers = await getNotifiableUsers(organization.id, 'new_lead', 'sms');

    // Get users who should receive email notifications
    const emailUsers = await getNotifiableUsers(organization.id, 'new_lead', 'email');

    // Prepare lead info for SMS
    const smsLeadInfo: LeadInfo = {
      id: lead.id,
      firstName: lead.firstName,
      lastName: lead.lastName,
      phone: lead.phone,
      email: lead.email,
      source: lead.source,
      temperature: lead.temperature,
      organizationName: organization.name
    };

    // Prepare lead info for email
    const emailLeadInfo: LeadEmailInfo = {
      id: lead.id,
      firstName: lead.firstName,
      lastName: lead.lastName,
      phone: lead.phone,
      email: lead.email,
      source: lead.source,
      temperature: lead.temperature,
      procedureInterest: lead.procedureInterest || null,
      notes: lead.notes || null,
      organizationName: organization.name,
      dashboardUrl
    };

    // Send SMS notifications (fire and forget for each)
    const smsPromises = smsUsers
      .filter(user => user.phone) // Only users with phone numbers
      .map(async (user) => {
        try {
          const smsResult = await sendLeadSMS(user.phone!, smsLeadInfo);
          if (smsResult.success) {
            result.smsCount++;
          } else {
            result.smsFailed++;
            console.error(`SMS notification failed for user ${user.userId}: ${smsResult.error}`);
          }
        } catch (error) {
          result.smsFailed++;
          console.error(`SMS notification error for user ${user.userId}:`, error);
        }
      });

    // Send email notifications (fire and forget for each)
    const emailPromises = emailUsers
      .filter(user => user.email) // Only users with emails
      .map(async (user) => {
        try {
          const emailResult = await sendLeadEmail(user.email, emailLeadInfo);
          if (emailResult.success) {
            result.emailCount++;
          } else {
            result.emailFailed++;
            console.error(`Email notification failed for user ${user.userId}: ${emailResult.error}`);
          }
        } catch (error) {
          result.emailFailed++;
          console.error(`Email notification error for user ${user.userId}:`, error);
        }
      });

    // Wait for all notifications to be sent
    await Promise.all([...smsPromises, ...emailPromises]);

    // Log notification summary to audit trail
    try {
      await prisma.auditLog.create({
        data: {
          action: 'lead_notifications_sent',
          entityType: 'lead',
          entityId: lead.id,
          organizationId: organization.id,
          newValues: {
            smsCount: result.smsCount,
            emailCount: result.emailCount,
            smsFailed: result.smsFailed,
            emailFailed: result.emailFailed,
            temperature: lead.temperature,
            score: lead.score
          }
        }
      });
    } catch (auditError) {
      console.error('Failed to log notification audit:', auditError);
    }

  } catch (error) {
    console.error('Error sending lead notifications:', error);
    // Don't throw - we don't want to break the lead capture flow
  }

  return result;
}

/**
 * Dispatch lead notifications asynchronously without blocking
 * This is the preferred method to call from API endpoints
 */
export function dispatchLeadNotifications(
  lead: LeadNotificationData,
  organization: OrganizationNotificationData
): void {
  // Fire and forget - don't await, don't block
  sendLeadNotifications(lead, organization).catch((error) => {
    console.error('Lead notification dispatch failed:', error);
  });
}
