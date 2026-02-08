// SMS Notifications
export {
  sendLeadNotification,
  sendAppointmentReminder,
  sendStatusUpdate,
  sendLeadFollowUpReminder,
  sendCampaignAlert,
  type LeadInfo,
  type AppointmentInfo
} from './sms';

// Email Notifications
export {
  sendLeadEmail,
  sendInvoiceEmail,
  sendPasswordResetEmail,
  sendWelcomeEmail,
  isSendGridConfigured,
  type LeadEmailInfo,
  type InvoiceEmailInfo,
  type EmailResult
} from './email';

// Notification Preferences
export {
  getUserNotificationPreferences,
  updateUserNotificationPreferences,
  updateSinglePreference,
  updateNotificationPhone,
  markPhoneVerified,
  shouldNotify,
  getNotifiableUsers,
  storeVerificationCode,
  verifyCode,
  generateVerificationCode,
  DEFAULT_PREFERENCES,
  NOTIFICATION_TYPE_INFO,
  type NotificationType,
  type NotificationChannel,
  type NotificationPreference,
  type UserNotificationPreferences
} from './preferences';
