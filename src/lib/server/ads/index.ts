/**
 * Ad Platform API Module
 *
 * Centralized exports for all ad platform integrations.
 */

// Types
export * from './types';

// Facebook/Meta API
export * as facebook from './facebook';

// Google Ads API
export * as google from './google';

// Sync Service
export {
	syncCampaignMetrics,
	syncAllMetrics,
	syncSingleCampaign,
	forceRefreshOrganization,
	getSyncStatus,
	getSyncState
} from './sync';

// Scheduler
export {
	executeScheduledSync,
	getSchedulerConfig,
	updateSchedulerConfig,
	getSchedulerState,
	resetFailureCount,
	enableScheduler,
	disableScheduler,
	shouldRunNow,
	getNextSyncTime,
	getSchedulerHealth,
	triggerFullSync
} from './scheduler';
