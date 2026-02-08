import { prisma } from '../db';

/**
 * Notification preference types
 */
export type NotificationType =
  | 'new_lead'
  | 'lead_status_change'
  | 'appointment_reminder'
  | 'campaign_alert'
  | 'billing'
  | 'weekly_summary'
  | 'follow_up_reminder';

export type NotificationChannel = 'email' | 'sms' | 'push';

export interface NotificationPreference {
  type: NotificationType;
  email: boolean;
  sms: boolean;
  push: boolean;
}

export interface UserNotificationPreferences {
  userId: string;
  phoneNumber: string | null;
  phoneVerified: boolean;
  preferences: NotificationPreference[];
  quietHoursEnabled: boolean;
  quietHoursStart: string | null; // HH:MM format
  quietHoursEnd: string | null; // HH:MM format
  timezone: string;
}

/**
 * Default notification preferences for new users
 */
export const DEFAULT_PREFERENCES: NotificationPreference[] = [
  { type: 'new_lead', email: true, sms: true, push: true },
  { type: 'lead_status_change', email: false, sms: false, push: true },
  { type: 'appointment_reminder', email: true, sms: true, push: true },
  { type: 'campaign_alert', email: true, sms: false, push: true },
  { type: 'billing', email: true, sms: false, push: false },
  { type: 'weekly_summary', email: true, sms: false, push: false },
  { type: 'follow_up_reminder', email: true, sms: false, push: true }
];

/**
 * Notification type display information
 */
export const NOTIFICATION_TYPE_INFO: Record<
  NotificationType,
  { label: string; description: string }
> = {
  new_lead: {
    label: 'New Lead Alerts',
    description: 'Get notified when a new lead is captured'
  },
  lead_status_change: {
    label: 'Lead Status Changes',
    description: 'Get notified when a lead status is updated'
  },
  appointment_reminder: {
    label: 'Appointment Reminders',
    description: 'Reminders for upcoming appointments'
  },
  campaign_alert: {
    label: 'Campaign Alerts',
    description: 'Performance alerts and budget notifications'
  },
  billing: {
    label: 'Billing Notifications',
    description: 'Invoice and payment reminders'
  },
  weekly_summary: {
    label: 'Weekly Summary',
    description: 'Weekly performance report emails'
  },
  follow_up_reminder: {
    label: 'Follow-up Reminders',
    description: 'Reminders to follow up with leads'
  }
};

/**
 * Get notification preferences for a user
 */
export async function getUserNotificationPreferences(
  userId: string
): Promise<UserNotificationPreferences> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      phone: true,
      organization: {
        select: {
          timezone: true
        }
      }
    }
  });

  if (!user) {
    throw new Error('User not found');
  }

  // Get preferences from system settings (stored as JSON in user metadata or settings table)
  const settingKey = `notification_preferences_${userId}`;
  const savedPreferences = await prisma.systemSetting.findUnique({
    where: { key: settingKey }
  });

  let preferences: NotificationPreference[] = DEFAULT_PREFERENCES;
  let phoneVerified = false;
  let quietHoursEnabled = false;
  let quietHoursStart: string | null = null;
  let quietHoursEnd: string | null = null;

  if (savedPreferences?.value) {
    const value = savedPreferences.value as Record<string, unknown>;
    if (Array.isArray(value.preferences)) {
      preferences = value.preferences as NotificationPreference[];
    }
    phoneVerified = value.phoneVerified === true;
    quietHoursEnabled = value.quietHoursEnabled === true;
    quietHoursStart = (value.quietHoursStart as string) || null;
    quietHoursEnd = (value.quietHoursEnd as string) || null;
  }

  return {
    userId: user.id,
    phoneNumber: user.phone,
    phoneVerified,
    preferences,
    quietHoursEnabled,
    quietHoursStart,
    quietHoursEnd,
    timezone: user.organization?.timezone || 'America/New_York'
  };
}

/**
 * Update notification preferences for a user
 */
export async function updateUserNotificationPreferences(
  userId: string,
  updates: Partial<{
    preferences: NotificationPreference[];
    quietHoursEnabled: boolean;
    quietHoursStart: string | null;
    quietHoursEnd: string | null;
    phoneVerified: boolean;
  }>
): Promise<UserNotificationPreferences> {
  const settingKey = `notification_preferences_${userId}`;

  // Get existing preferences
  const existing = await getUserNotificationPreferences(userId);

  // Merge updates
  const newValue = {
    preferences: updates.preferences ?? existing.preferences,
    phoneVerified: updates.phoneVerified ?? existing.phoneVerified,
    quietHoursEnabled: updates.quietHoursEnabled ?? existing.quietHoursEnabled,
    quietHoursStart: updates.quietHoursStart ?? existing.quietHoursStart,
    quietHoursEnd: updates.quietHoursEnd ?? existing.quietHoursEnd
  };

  // Upsert the preferences - convert to JSON-safe format
  const jsonValue = JSON.parse(JSON.stringify(newValue));

  await prisma.systemSetting.upsert({
    where: { key: settingKey },
    create: {
      key: settingKey,
      value: jsonValue,
      description: `Notification preferences for user ${userId}`,
      updatedBy: userId
    },
    update: {
      value: jsonValue,
      updatedBy: userId
    }
  });

  return {
    ...existing,
    ...newValue
  };
}

/**
 * Update a single preference type
 */
export async function updateSinglePreference(
  userId: string,
  type: NotificationType,
  channel: NotificationChannel,
  enabled: boolean
): Promise<UserNotificationPreferences> {
  const existing = await getUserNotificationPreferences(userId);

  const newPreferences = existing.preferences.map((pref) => {
    if (pref.type === type) {
      return { ...pref, [channel]: enabled };
    }
    return pref;
  });

  return updateUserNotificationPreferences(userId, { preferences: newPreferences });
}

/**
 * Update user's phone number
 */
export async function updateNotificationPhone(
  userId: string,
  phone: string | null
): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: { phone }
  });

  // Reset phone verification when phone number changes
  if (phone) {
    await updateUserNotificationPreferences(userId, { phoneVerified: false });
  }
}

/**
 * Mark phone as verified
 */
export async function markPhoneVerified(userId: string): Promise<void> {
  await updateUserNotificationPreferences(userId, { phoneVerified: true });
}

/**
 * Check if user should receive notification via specific channel
 */
export async function shouldNotify(
  userId: string,
  type: NotificationType,
  channel: NotificationChannel
): Promise<boolean> {
  try {
    const prefs = await getUserNotificationPreferences(userId);

    // Check if within quiet hours
    if (channel !== 'email' && prefs.quietHoursEnabled) {
      if (isInQuietHours(prefs.quietHoursStart, prefs.quietHoursEnd, prefs.timezone)) {
        return false;
      }
    }

    // Check if SMS but phone not verified
    if (channel === 'sms' && !prefs.phoneVerified) {
      return false;
    }

    // Check if SMS but no phone number
    if (channel === 'sms' && !prefs.phoneNumber) {
      return false;
    }

    // Find the preference for this type
    const pref = prefs.preferences.find((p) => p.type === type);
    if (!pref) {
      // Default to true for email, false for others
      return channel === 'email';
    }

    return pref[channel];
  } catch (error) {
    console.error('Error checking notification preferences:', error);
    // Default to email only if there's an error
    return channel === 'email';
  }
}

/**
 * Check if current time is within quiet hours
 */
function isInQuietHours(
  startTime: string | null,
  endTime: string | null,
  timezone: string
): boolean {
  if (!startTime || !endTime) {
    return false;
  }

  try {
    const now = new Date();

    // Get current time in the user's timezone
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });

    const parts = formatter.formatToParts(now);
    const currentHour = parseInt(parts.find((p) => p.type === 'hour')?.value || '0', 10);
    const currentMinute = parseInt(parts.find((p) => p.type === 'minute')?.value || '0', 10);
    const currentMinutes = currentHour * 60 + currentMinute;

    const [startHour, startMinute] = startTime.split(':').map(Number);
    const [endHour, endMinute] = endTime.split(':').map(Number);
    const startMinutes = startHour * 60 + startMinute;
    const endMinutes = endHour * 60 + endMinute;

    // Handle overnight quiet hours (e.g., 22:00 - 07:00)
    if (startMinutes > endMinutes) {
      return currentMinutes >= startMinutes || currentMinutes < endMinutes;
    }

    return currentMinutes >= startMinutes && currentMinutes < endMinutes;
  } catch (error) {
    console.error('Error checking quiet hours:', error);
    return false;
  }
}

/**
 * Get all users who should receive a notification for an organization
 */
export async function getNotifiableUsers(
  organizationId: string,
  type: NotificationType,
  channel: NotificationChannel
): Promise<
  Array<{
    userId: string;
    email: string;
    phone: string | null;
    firstName: string;
    lastName: string;
  }>
> {
  // Get all active users in the organization
  const users = await prisma.user.findMany({
    where: {
      organizationId,
      isActive: true,
      deletedAt: null
    },
    select: {
      id: true,
      email: true,
      phone: true,
      firstName: true,
      lastName: true
    }
  });

  // Filter to users who have this notification enabled
  const notifiableUsers: Array<{
    userId: string;
    email: string;
    phone: string | null;
    firstName: string;
    lastName: string;
  }> = [];

  for (const user of users) {
    const shouldSend = await shouldNotify(user.id, type, channel);
    if (shouldSend) {
      notifiableUsers.push({
        userId: user.id,
        email: user.email,
        phone: user.phone,
        firstName: user.firstName,
        lastName: user.lastName
      });
    }
  }

  return notifiableUsers;
}

/**
 * Store a phone verification code
 */
export async function storeVerificationCode(
  userId: string,
  code: string
): Promise<void> {
  const settingKey = `phone_verification_${userId}`;
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

  await prisma.systemSetting.upsert({
    where: { key: settingKey },
    create: {
      key: settingKey,
      value: { code, expiresAt: expiresAt.toISOString() },
      description: `Phone verification code for user ${userId}`
    },
    update: {
      value: { code, expiresAt: expiresAt.toISOString() }
    }
  });
}

/**
 * Verify a phone verification code
 */
export async function verifyCode(userId: string, code: string): Promise<boolean> {
  const settingKey = `phone_verification_${userId}`;

  const setting = await prisma.systemSetting.findUnique({
    where: { key: settingKey }
  });

  if (!setting) {
    return false;
  }

  const value = setting.value as { code: string; expiresAt: string };

  // Check if expired
  if (new Date(value.expiresAt) < new Date()) {
    // Clean up expired code
    await prisma.systemSetting.delete({ where: { key: settingKey } });
    return false;
  }

  // Check if code matches
  if (value.code !== code) {
    return false;
  }

  // Mark phone as verified and clean up
  await markPhoneVerified(userId);
  await prisma.systemSetting.delete({ where: { key: settingKey } });

  return true;
}

/**
 * Generate a 6-digit verification code
 */
export function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}
