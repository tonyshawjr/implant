/**
 * Stores Index
 * Re-exports all store modules for convenient imports
 */

// User store
export {
  userStore,
  currentUser,
  isAuthenticated,
  isUserLoading,
  userFullName,
  userInitials,
  userRole,
  hasRole,
  isInternalUser,
  isClientUser,
  isAdmin,
  isSuperAdmin,
  canManageOrganization,
  canViewBilling,
  canManageLeads,
  roleDisplayNames,
  getRoleDisplayName,
  type UserRole,
  type CurrentUser
} from './user';

// Organization store
export {
  organizationStore,
  currentOrganization,
  organizationId,
  organizationName,
  isOrganizationLoading,
  organizationStatus,
  healthScore,
  isOrganizationActive,
  isOrganizationSuspended,
  organizationTerritories,
  primaryTerritory,
  organizationAddress,
  organizationLocation,
  healthScoreLevel,
  hasHealthConcerns,
  daysSinceClientStarted,
  statusDisplayNames,
  getStatusDisplayName,
  type OrgStatus,
  type CurrentOrganization,
  type OrgTerritory,
  type HealthLevel
} from './organization';

// Notifications store
export {
  notifications,
  allNotifications,
  visibleNotifications,
  notificationCount,
  notificationPosition,
  hasNotifications,
  hasErrors,
  getNotificationClasses,
  getPositionClasses,
  toast,
  toastPromise,
  type NotificationType,
  type NotificationPosition,
  type Notification
} from './notifications';

// Theme store
export {
  themeStore,
  themeMode,
  resolvedTheme,
  isDarkMode,
  isLightMode,
  isSystemMode,
  systemPrefersDark,
  modeDisplayNames,
  getModeDisplayName,
  getModeIcon,
  getThemeModes,
  type ThemeMode,
  type ResolvedTheme
} from './theme';
