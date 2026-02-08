/**
 * Utils Index
 * Re-exports all utility modules for convenient imports
 */

// Formatters
export {
  formatCurrency,
  formatCompactCurrency,
  formatDate,
  formatPhone,
  formatPercent,
  formatNumber,
  formatCompactNumber,
  formatFileSize,
  formatDuration,
  truncate,
  formatName,
  getInitials,
  formatFullName
} from './formatters';

// Status helpers
export {
  getHealthScoreLevel,
  getHealthScoreColor,
  getHealthScoreLabel,
  getLeadTemperatureFromScore,
  getLeadTemperatureColor,
  getLeadStatusColor,
  getLeadStatusLabel,
  getCampaignStatusColor,
  getTicketStatusColor,
  getTicketPriorityColor,
  getInvoiceStatusColor,
  getProspectStageColor,
  getOrgStatusColor,
  getStatusBadgeColor,
  getTrendColor,
  type HealthScoreLevel,
  type LeadTemperature,
  type LeadStatus,
  type CampaignStatus,
  type TicketStatus,
  type TicketPriority,
  type InvoiceStatus,
  type ProspectStage,
  type OrgStatus,
  type TrendDirection
} from './status-helpers';

// Date helpers
export {
  getRelativeTime,
  getFriendlyRelativeTime,
  getDateRange,
  getDateRangeLabel,
  isWithinDays,
  isToday,
  isYesterday,
  isPast,
  isFuture,
  getDaysBetween,
  getDaysUntil,
  getDaysSince,
  addDays,
  addMonths,
  startOfDay,
  endOfDay,
  startOfMonth,
  endOfMonth,
  formatDateRange,
  getDatesBetween,
  parseDate,
  type DateRangePreset
} from './date-helpers';
