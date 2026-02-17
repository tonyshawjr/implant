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
  sendTeamInviteEmail,
  isEmailConfigured,
  getActiveEmailProvider,
  type LeadEmailInfo,
  type InvoiceEmailInfo,
  type EmailResult,
  type EmailProvider
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

// Lead Notifications (new lead capture alerts)
export {
  sendLeadNotifications,
  dispatchLeadNotifications,
  type LeadNotificationData,
  type OrganizationNotificationData,
  type NotificationDispatchResult
} from './lead-notifications';

// Stale Lead Reminders
export {
  findStaleLeads,
  sendStaleLeadReminders,
  getStaleLeadsSummary,
  type ReminderJobResult
} from './reminders';
