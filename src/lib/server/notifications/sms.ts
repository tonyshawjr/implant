import { sendSMS, type TwilioMessageResult } from '../twilio';
import { prisma } from '../db';

export interface LeadInfo {
  id: string;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  email: string | null;
  source: string;
  temperature: string;
  organizationName: string;
}

export interface AppointmentInfo {
  leadName: string;
  appointmentDate: Date;
  appointmentTime: string;
  location?: string;
  providerName?: string;
}

/**
 * Send a new lead notification SMS
 */
export async function sendLeadNotification(
  phone: string,
  leadInfo: LeadInfo
): Promise<TwilioMessageResult> {
  const leadName = leadInfo.firstName
    ? `${leadInfo.firstName}${leadInfo.lastName ? ' ' + leadInfo.lastName : ''}`
    : 'New Lead';

  const temperatureEmoji = {
    hot: '(HOT)',
    warm: '(Warm)',
    cold: '(Cold)'
  }[leadInfo.temperature.toLowerCase()] || '';

  const message = `New Lead Alert ${temperatureEmoji}

Name: ${leadName}
${leadInfo.phone ? `Phone: ${leadInfo.phone}` : ''}
${leadInfo.email ? `Email: ${leadInfo.email}` : ''}
Source: ${leadInfo.source}

Log in to ${leadInfo.organizationName} dashboard to view details.`;

  const result = await sendSMS(phone, message.trim());

  // Log the notification attempt
  try {
    await logNotification({
      type: 'sms',
      category: 'new_lead',
      recipient: phone,
      success: result.success,
      messageId: result.messageId,
      error: result.error,
      metadata: { leadId: leadInfo.id }
    });
  } catch (err) {
    console.error('Failed to log SMS notification:', err);
  }

  return result;
}

/**
 * Send an appointment reminder SMS
 */
export async function sendAppointmentReminder(
  phone: string,
  appointmentInfo: AppointmentInfo
): Promise<TwilioMessageResult> {
  const dateStr = appointmentInfo.appointmentDate.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric'
  });

  let message = `Appointment Reminder

Your appointment is scheduled for:
Date: ${dateStr}
Time: ${appointmentInfo.appointmentTime}`;

  if (appointmentInfo.location) {
    message += `\nLocation: ${appointmentInfo.location}`;
  }

  if (appointmentInfo.providerName) {
    message += `\nWith: ${appointmentInfo.providerName}`;
  }

  message += '\n\nReply YES to confirm or call us to reschedule.';

  const result = await sendSMS(phone, message);

  // Log the notification attempt
  try {
    await logNotification({
      type: 'sms',
      category: 'appointment_reminder',
      recipient: phone,
      success: result.success,
      messageId: result.messageId,
      error: result.error,
      metadata: { appointmentInfo }
    });
  } catch (err) {
    console.error('Failed to log SMS notification:', err);
  }

  return result;
}

/**
 * Send a status update SMS
 */
export async function sendStatusUpdate(
  phone: string,
  message: string
): Promise<TwilioMessageResult> {
  const result = await sendSMS(phone, message);

  // Log the notification attempt
  try {
    await logNotification({
      type: 'sms',
      category: 'status_update',
      recipient: phone,
      success: result.success,
      messageId: result.messageId,
      error: result.error
    });
  } catch (err) {
    console.error('Failed to log SMS notification:', err);
  }

  return result;
}

/**
 * Send a lead follow-up reminder to staff
 */
export async function sendLeadFollowUpReminder(
  phone: string,
  leadName: string,
  daysSinceContact: number
): Promise<TwilioMessageResult> {
  const message = `Follow-up Reminder

Lead: ${leadName}
Last Contact: ${daysSinceContact} day${daysSinceContact === 1 ? '' : 's'} ago

Time for a follow-up! Log in to your dashboard to update the lead status.`;

  const result = await sendSMS(phone, message);

  // Log the notification attempt
  try {
    await logNotification({
      type: 'sms',
      category: 'follow_up_reminder',
      recipient: phone,
      success: result.success,
      messageId: result.messageId,
      error: result.error,
      metadata: { leadName, daysSinceContact }
    });
  } catch (err) {
    console.error('Failed to log SMS notification:', err);
  }

  return result;
}

/**
 * Send campaign alert SMS (performance issues, budget alerts, etc.)
 */
export async function sendCampaignAlert(
  phone: string,
  campaignName: string,
  alertType: 'performance' | 'budget' | 'paused',
  details: string
): Promise<TwilioMessageResult> {
  const alertTitles = {
    performance: 'Performance Alert',
    budget: 'Budget Alert',
    paused: 'Campaign Paused'
  };

  const message = `${alertTitles[alertType]}

Campaign: ${campaignName}
${details}

Log in to your dashboard for more details.`;

  const result = await sendSMS(phone, message);

  // Log the notification attempt
  try {
    await logNotification({
      type: 'sms',
      category: 'campaign_alert',
      recipient: phone,
      success: result.success,
      messageId: result.messageId,
      error: result.error,
      metadata: { campaignName, alertType, details }
    });
  } catch (err) {
    console.error('Failed to log SMS notification:', err);
  }

  return result;
}

interface NotificationLogEntry {
  type: 'sms' | 'email';
  category: string;
  recipient: string;
  success: boolean;
  messageId?: string;
  error?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Log notification to audit trail
 */
async function logNotification(entry: NotificationLogEntry): Promise<void> {
  await prisma.auditLog.create({
    data: {
      action: 'notification_sent',
      entityType: 'notification',
      entityId: entry.messageId || null,
      newValues: {
        type: entry.type,
        category: entry.category,
        recipient: entry.recipient,
        success: entry.success,
        error: entry.error || undefined,
        metadata: entry.metadata ? JSON.parse(JSON.stringify(entry.metadata)) : undefined
      }
    }
  });
}
