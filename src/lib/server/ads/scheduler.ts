/**
 * Metrics Sync Scheduler
 *
 * Provides scheduling functionality for metrics synchronization.
 * Designed to be called by external cron services (e.g., Vercel Cron, AWS Lambda).
 *
 * Features:
 * - Scheduled sync execution
 * - Rate limiting and throttling
 * - Health monitoring
 * - Error notification
 */

import { syncAllMetrics, getSyncStatus, getSyncState } from './sync';
import type { SyncResult, DateRange } from './types';

// =============================================================================
// Configuration
// =============================================================================

const DEFAULT_SYNC_INTERVAL_MINUTES = 15;
const MAX_CONCURRENT_SYNCS = 1;
const SYNC_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes

// =============================================================================
// Types
// =============================================================================

interface SchedulerConfig {
	intervalMinutes: number;
	enabled: boolean;
	retryOnError: boolean;
	maxRetries: number;
	notifyOnError: boolean;
}

interface SchedulerState {
	lastRunAt: Date | null;
	lastRunSuccess: boolean;
	consecutiveFailures: number;
	totalRuns: number;
	totalErrors: number;
	isScheduled: boolean;
}

interface ScheduledSyncResult {
	success: boolean;
	results: SyncResult[];
	duration: number;
	timestamp: Date;
	error?: string;
}

// Module-level state
let schedulerConfig: SchedulerConfig = {
	intervalMinutes: DEFAULT_SYNC_INTERVAL_MINUTES,
	enabled: true,
	retryOnError: true,
	maxRetries: 3,
	notifyOnError: true
};

let schedulerState: SchedulerState = {
	lastRunAt: null,
	lastRunSuccess: true,
	consecutiveFailures: 0,
	totalRuns: 0,
	totalErrors: 0,
	isScheduled: false
};

// =============================================================================
// Helper Functions
// =============================================================================

function getDateRangeForSync(): DateRange {
	const endDate = new Date();
	const startDate = new Date();

	// For regular syncs, only fetch the last 2 days to be efficient
	// Full historical syncs can be triggered manually
	startDate.setDate(startDate.getDate() - 2);

	return { startDate, endDate };
}

function shouldSkipSync(): boolean {
	// Skip if sync is already running
	const status = getSyncStatus();
	if (status.isRunning) {
		console.log('[Scheduler] Skipping sync - already in progress');
		return true;
	}

	// Skip if disabled
	if (!schedulerConfig.enabled) {
		console.log('[Scheduler] Skipping sync - scheduler disabled');
		return true;
	}

	// Skip if too many consecutive failures (circuit breaker)
	if (schedulerState.consecutiveFailures >= schedulerConfig.maxRetries) {
		console.log('[Scheduler] Skipping sync - too many consecutive failures');
		return true;
	}

	return false;
}

async function notifyError(error: string, results?: SyncResult[]): Promise<void> {
	if (!schedulerConfig.notifyOnError) {
		return;
	}

	// Log error for monitoring systems to pick up
	console.error('[Scheduler] Sync Error:', {
		error,
		timestamp: new Date().toISOString(),
		consecutiveFailures: schedulerState.consecutiveFailures,
		results: results?.map((r) => ({
			organizationId: r.organizationId,
			errors: r.errors.length
		}))
	});

	// In production, you would send notifications via:
	// - Email (SendGrid, SES)
	// - Slack webhook
	// - PagerDuty
	// - Custom alerting system
}

function logSyncResult(result: ScheduledSyncResult): void {
	const totalOrgs = result.results.length;
	const successfulOrgs = result.results.filter((r) => r.errors.length === 0).length;
	const totalCampaigns = result.results.reduce((sum, r) => sum + r.campaignsProcessed, 0);
	const totalMetrics = result.results.reduce((sum, r) => sum + r.metricsInserted, 0);
	const totalErrors = result.results.reduce((sum, r) => sum + r.errors.length, 0);

	console.log('[Scheduler] Sync Complete:', {
		success: result.success,
		duration: `${result.duration}ms`,
		organizations: `${successfulOrgs}/${totalOrgs}`,
		campaigns: totalCampaigns,
		metrics: totalMetrics,
		errors: totalErrors,
		timestamp: result.timestamp.toISOString()
	});
}

// =============================================================================
// Public API
// =============================================================================

/**
 * Execute scheduled sync
 *
 * This function is designed to be called by external cron services.
 * It handles all pre-sync checks, execution, and post-sync logging.
 *
 * Example cron setup (Vercel):
 * ```
 * // vercel.json
 * {
 *   "crons": [{
 *     "path": "/api/sync/metrics",
 *     "schedule": "*​/15 * * * *"
 *   }]
 * }
 * ```
 */
export async function executeScheduledSync(): Promise<ScheduledSyncResult> {
	const startTime = Date.now();

	// Check if we should skip this sync
	if (shouldSkipSync()) {
		return {
			success: true,
			results: [],
			duration: 0,
			timestamp: new Date(),
			error: 'Sync skipped'
		};
	}

	schedulerState.totalRuns++;

	try {
		console.log('[Scheduler] Starting scheduled sync...');

		// Execute sync with timeout
		const syncPromise = syncAllMetrics({
			dateRange: getDateRangeForSync()
		});

		const timeoutPromise = new Promise<never>((_, reject) => {
			setTimeout(() => reject(new Error('Sync timeout exceeded')), SYNC_TIMEOUT_MS);
		});

		const results = await Promise.race([syncPromise, timeoutPromise]);

		// Check for errors in results
		const hasErrors = results.some((r) => r.errors.length > 0);
		const result: ScheduledSyncResult = {
			success: !hasErrors,
			results,
			duration: Date.now() - startTime,
			timestamp: new Date()
		};

		// Update state
		schedulerState.lastRunAt = new Date();
		schedulerState.lastRunSuccess = result.success;

		if (result.success) {
			schedulerState.consecutiveFailures = 0;
		} else {
			schedulerState.consecutiveFailures++;
			schedulerState.totalErrors++;

			if (schedulerState.consecutiveFailures >= schedulerConfig.maxRetries) {
				await notifyError('Max consecutive failures reached', results);
			}
		}

		logSyncResult(result);
		return result;
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : 'Unknown error';

		schedulerState.lastRunAt = new Date();
		schedulerState.lastRunSuccess = false;
		schedulerState.consecutiveFailures++;
		schedulerState.totalErrors++;

		const result: ScheduledSyncResult = {
			success: false,
			results: [],
			duration: Date.now() - startTime,
			timestamp: new Date(),
			error: errorMessage
		};

		await notifyError(errorMessage);
		logSyncResult(result);

		return result;
	}
}

/**
 * Get scheduler configuration
 */
export function getSchedulerConfig(): SchedulerConfig {
	return { ...schedulerConfig };
}

/**
 * Update scheduler configuration
 */
export function updateSchedulerConfig(updates: Partial<SchedulerConfig>): SchedulerConfig {
	schedulerConfig = {
		...schedulerConfig,
		...updates
	};
	return { ...schedulerConfig };
}

/**
 * Get scheduler state
 */
export function getSchedulerState(): SchedulerState {
	return { ...schedulerState };
}

/**
 * Reset consecutive failures counter
 * Use this after fixing issues that caused failures
 */
export function resetFailureCount(): void {
	schedulerState.consecutiveFailures = 0;
}

/**
 * Enable the scheduler
 */
export function enableScheduler(): void {
	schedulerConfig.enabled = true;
	console.log('[Scheduler] Scheduler enabled');
}

/**
 * Disable the scheduler
 */
export function disableScheduler(): void {
	schedulerConfig.enabled = false;
	console.log('[Scheduler] Scheduler disabled');
}

/**
 * Check if a sync should run now based on last run time
 */
export function shouldRunNow(): boolean {
	if (!schedulerState.lastRunAt) {
		return true;
	}

	const minutesSinceLastRun =
		(Date.now() - schedulerState.lastRunAt.getTime()) / (1000 * 60);

	return minutesSinceLastRun >= schedulerConfig.intervalMinutes;
}

/**
 * Get next scheduled sync time
 */
export function getNextSyncTime(): Date | null {
	if (!schedulerConfig.enabled) {
		return null;
	}

	if (!schedulerState.lastRunAt) {
		return new Date();
	}

	const nextSync = new Date(schedulerState.lastRunAt);
	nextSync.setMinutes(nextSync.getMinutes() + schedulerConfig.intervalMinutes);

	return nextSync;
}

/**
 * Get scheduler health status
 */
export function getSchedulerHealth(): {
	healthy: boolean;
	status: string;
	details: Record<string, unknown>;
} {
	const syncStatus = getSyncStatus();
	const syncState = getSyncState();

	const isHealthy =
		schedulerConfig.enabled &&
		schedulerState.consecutiveFailures < schedulerConfig.maxRetries &&
		!syncStatus.isRunning;

	let status = 'healthy';
	if (!schedulerConfig.enabled) {
		status = 'disabled';
	} else if (schedulerState.consecutiveFailures >= schedulerConfig.maxRetries) {
		status = 'circuit_open';
	} else if (syncStatus.isRunning) {
		status = 'syncing';
	} else if (schedulerState.consecutiveFailures > 0) {
		status = 'degraded';
	}

	return {
		healthy: isHealthy,
		status,
		details: {
			enabled: schedulerConfig.enabled,
			lastRunAt: schedulerState.lastRunAt?.toISOString() || null,
			lastRunSuccess: schedulerState.lastRunSuccess,
			consecutiveFailures: schedulerState.consecutiveFailures,
			totalRuns: schedulerState.totalRuns,
			totalErrors: schedulerState.totalErrors,
			nextSync: getNextSyncTime()?.toISOString() || null,
			currentSyncProgress: syncStatus.isRunning
				? {
						currentOrg: syncState.currentOrgId,
						processed: syncState.processedOrgs,
						total: syncState.totalOrgs
					}
				: null
		}
	};
}

/**
 * Manually trigger a full sync (all organizations, extended date range)
 */
export async function triggerFullSync(days: number = 30): Promise<ScheduledSyncResult> {
	const startTime = Date.now();

	const endDate = new Date();
	const startDate = new Date();
	startDate.setDate(startDate.getDate() - days);

	console.log(`[Scheduler] Starting full sync (${days} days)...`);

	try {
		const results = await syncAllMetrics({
			dateRange: { startDate, endDate },
			forceSync: true
		});

		const result: ScheduledSyncResult = {
			success: results.every((r) => r.errors.length === 0),
			results,
			duration: Date.now() - startTime,
			timestamp: new Date()
		};

		logSyncResult(result);
		return result;
	} catch (error) {
		return {
			success: false,
			results: [],
			duration: Date.now() - startTime,
			timestamp: new Date(),
			error: error instanceof Error ? error.message : 'Unknown error'
		};
	}
}
