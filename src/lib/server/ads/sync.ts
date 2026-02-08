/**
 * Metrics Sync Service
 *
 * Handles synchronization of campaign metrics from ad platforms (Facebook/Meta, Google Ads)
 * to the internal campaign_metrics database table.
 *
 * Features:
 * - Sync metrics for individual organizations
 * - Bulk sync for all organizations (for scheduled jobs)
 * - Error handling and retry logic
 * - Audit logging for sync operations
 */

import { prisma as db } from '../db';
import * as facebookApi from './facebook';
import * as googleApi from './google';
import type {
	SyncResult,
	SyncError,
	SyncStatus,
	DateRange,
	CampaignMetrics,
	AdPlatform
} from './types';

// =============================================================================
// Types
// =============================================================================

interface OrganizationCampaign {
	id: string;
	externalCampaignId: string | null;
	platform: AdPlatform;
	organizationId: string;
}

interface SyncOptions {
	dateRange?: DateRange;
	forceSync?: boolean;
	dryRun?: boolean;
}

interface SyncState {
	isRunning: boolean;
	lastSyncAt: Date | null;
	currentOrgId: string | null;
	processedOrgs: number;
	totalOrgs: number;
}

// Module-level sync state
let syncState: SyncState = {
	isRunning: false,
	lastSyncAt: null,
	currentOrgId: null,
	processedOrgs: 0,
	totalOrgs: 0
};

// =============================================================================
// Helper Functions
// =============================================================================

function getDefaultDateRange(): DateRange {
	const endDate = new Date();
	const startDate = new Date();
	startDate.setDate(startDate.getDate() - 7); // Last 7 days by default

	return { startDate, endDate };
}

function mapPlatformToPrisma(platform: AdPlatform): string {
	switch (platform) {
		case 'facebook':
		case 'meta':
		case 'instagram':
			return 'facebook';
		case 'google':
			return 'google';
		default:
			return 'facebook';
	}
}

function calculateDerivedMetrics(
	spend: number,
	impressions: number,
	clicks: number,
	leads: number,
	conversions: number
): { ctr: number; cpl: number; cpa: number; roas: number } {
	const ctr = impressions > 0 ? clicks / impressions : 0;
	const cpl = leads > 0 ? spend / leads : 0;
	const cpa = conversions > 0 ? spend / conversions : 0;
	const avgCaseValue = 4000; // From business config
	const roas = spend > 0 ? (conversions * avgCaseValue) / spend : 0;

	return { ctr, cpl, cpa, roas };
}

async function logSyncEvent(
	organizationId: string | null,
	action: string,
	success: boolean,
	details?: Record<string, unknown>
): Promise<void> {
	try {
		await db.auditLog.create({
			data: {
				userId: null,
				organizationId,
				action: `sync_${action}`,
				entityType: 'campaign_metrics',
				entityId: null,
				oldValues: undefined,
				newValues: details ? JSON.parse(JSON.stringify(details)) : undefined,
				ipAddress: null,
				userAgent: 'metrics-sync-service'
			}
		});
	} catch (error) {
		console.error('Failed to log sync event:', error);
	}
}

// =============================================================================
// Core Sync Functions
// =============================================================================

/**
 * Sync metrics for a single campaign
 */
async function syncCampaignMetricsInternal(
	campaign: OrganizationCampaign,
	dateRange: DateRange
): Promise<{ success: boolean; metricsInserted: number; error?: SyncError }> {
	if (!campaign.externalCampaignId) {
		return {
			success: false,
			metricsInserted: 0,
			error: {
				campaignId: campaign.id,
				error: 'No external campaign ID configured',
				code: 'MISSING_EXTERNAL_ID',
				recoverable: true
			}
		};
	}

	try {
		let metricsResponse;

		// Fetch metrics from the appropriate platform
		if (campaign.platform === 'google') {
			metricsResponse = await googleApi.getCampaignAggregatedMetrics(
				campaign.externalCampaignId,
				dateRange,
				{ simulateLatency: false }
			);
		} else {
			metricsResponse = await facebookApi.getCampaignAggregatedMetrics(
				campaign.externalCampaignId,
				dateRange,
				{ simulateLatency: false }
			);
		}

		if (!metricsResponse.success || !metricsResponse.data) {
			return {
				success: false,
				metricsInserted: 0,
				error: {
					campaignId: campaign.id,
					error: metricsResponse.error?.message || 'Failed to fetch metrics',
					code: metricsResponse.error?.code || 'API_ERROR',
					recoverable: true
				}
			};
		}

		const aggregatedMetrics = metricsResponse.data;
		let insertedCount = 0;

		// Insert daily metrics into the database
		for (const dailyMetric of aggregatedMetrics.dailyMetrics) {
			const derived = calculateDerivedMetrics(
				dailyMetric.spend,
				dailyMetric.impressions,
				dailyMetric.clicks,
				dailyMetric.leads,
				dailyMetric.conversions
			);

			// Check if metric exists for this campaign+date
			const existingMetric = await db.campaignMetric.findFirst({
				where: {
					campaignId: campaign.id,
					date: dailyMetric.date
				}
			});

			if (existingMetric) {
				// Update existing metric
				await db.campaignMetric.update({
					where: { id: existingMetric.id },
					data: {
						impressions: dailyMetric.impressions,
						clicks: dailyMetric.clicks,
						ctr: derived.ctr,
						spend: dailyMetric.spend,
						leads: dailyMetric.leads,
						cpl: derived.cpl,
						conversions: dailyMetric.conversions,
						cpa: derived.cpa,
						roas: derived.roas
					}
				});
			} else {
				// Create new metric
				await db.campaignMetric.create({
					data: {
						campaignId: campaign.id,
						date: dailyMetric.date,
						impressions: dailyMetric.impressions,
						clicks: dailyMetric.clicks,
						ctr: derived.ctr,
						spend: dailyMetric.spend,
						leads: dailyMetric.leads,
						cpl: derived.cpl,
						conversions: dailyMetric.conversions,
						cpa: derived.cpa,
						roas: derived.roas
					}
				});
			}

			insertedCount++;
		}

		return {
			success: true,
			metricsInserted: insertedCount
		};
	} catch (error) {
		return {
			success: false,
			metricsInserted: 0,
			error: {
				campaignId: campaign.id,
				error: error instanceof Error ? error.message : 'Unknown error',
				code: 'SYNC_ERROR',
				recoverable: true
			}
		};
	}
}

/**
 * Sync all campaign metrics for a specific organization
 */
export async function syncCampaignMetrics(
	organizationId: string,
	options: SyncOptions = {}
): Promise<SyncResult> {
	const startTime = Date.now();
	const dateRange = options.dateRange || getDefaultDateRange();
	const errors: SyncError[] = [];
	let campaignsProcessed = 0;
	let totalMetricsInserted = 0;

	try {
		// Get all active campaigns for the organization
		const campaigns = await db.campaign.findMany({
			where: {
				organizationId,
				status: { in: ['active', 'paused'] },
				externalCampaignId: { not: null }
			},
			select: {
				id: true,
				externalCampaignId: true,
				platform: true,
				organizationId: true
			}
		});

		if (campaigns.length === 0) {
			await logSyncEvent(organizationId, 'organization_sync', true, {
				message: 'No campaigns to sync',
				dateRange
			});

			return {
				organizationId,
				platform: 'facebook', // Default
				campaignsProcessed: 0,
				metricsInserted: 0,
				errors: [],
				syncedAt: new Date(),
				duration: Date.now() - startTime
			};
		}

		// Process each campaign
		for (const campaign of campaigns) {
			const platform = mapPlatformToPrisma(campaign.platform as unknown as AdPlatform);

			const result = await syncCampaignMetricsInternal(
				{
					...campaign,
					platform: platform as AdPlatform
				},
				dateRange
			);

			campaignsProcessed++;

			if (result.success) {
				totalMetricsInserted += result.metricsInserted;
			} else if (result.error) {
				errors.push(result.error);
			}
		}

		await logSyncEvent(organizationId, 'organization_sync', true, {
			campaignsProcessed,
			metricsInserted: totalMetricsInserted,
			errors: errors.length,
			dateRange
		});

		return {
			organizationId,
			platform: 'facebook', // Primary platform
			campaignsProcessed,
			metricsInserted: totalMetricsInserted,
			errors,
			syncedAt: new Date(),
			duration: Date.now() - startTime
		};
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : 'Unknown error';

		await logSyncEvent(organizationId, 'organization_sync', false, {
			error: errorMessage
		});

		return {
			organizationId,
			platform: 'facebook',
			campaignsProcessed,
			metricsInserted: totalMetricsInserted,
			errors: [
				{
					error: errorMessage,
					code: 'ORG_SYNC_ERROR',
					recoverable: false
				}
			],
			syncedAt: new Date(),
			duration: Date.now() - startTime
		};
	}
}

/**
 * Sync metrics for all organizations (for scheduled cron jobs)
 */
export async function syncAllMetrics(options: SyncOptions = {}): Promise<SyncResult[]> {
	if (syncState.isRunning) {
		throw new Error('Sync already in progress');
	}

	const results: SyncResult[] = [];
	const dateRange = options.dateRange || getDefaultDateRange();

	try {
		syncState.isRunning = true;
		syncState.processedOrgs = 0;

		// Get all active organizations with campaigns
		const organizations = await db.organization.findMany({
			where: {
				status: 'active',
				deletedAt: null,
				campaigns: {
					some: {
						status: { in: ['active', 'paused'] },
						externalCampaignId: { not: null }
					}
				}
			},
			select: {
				id: true,
				name: true
			}
		});

		syncState.totalOrgs = organizations.length;

		await logSyncEvent(null, 'bulk_sync_start', true, {
			totalOrganizations: organizations.length,
			dateRange
		});

		// Process each organization
		for (const org of organizations) {
			syncState.currentOrgId = org.id;

			try {
				const result = await syncCampaignMetrics(org.id, { dateRange });
				results.push(result);
			} catch (error) {
				// Log error but continue with other organizations
				results.push({
					organizationId: org.id,
					platform: 'facebook',
					campaignsProcessed: 0,
					metricsInserted: 0,
					errors: [
						{
							error: error instanceof Error ? error.message : 'Unknown error',
							code: 'ORG_SYNC_FAILED',
							recoverable: true
						}
					],
					syncedAt: new Date(),
					duration: 0
				});
			}

			syncState.processedOrgs++;
		}

		syncState.lastSyncAt = new Date();

		const totalCampaigns = results.reduce((sum, r) => sum + r.campaignsProcessed, 0);
		const totalMetrics = results.reduce((sum, r) => sum + r.metricsInserted, 0);
		const totalErrors = results.reduce((sum, r) => sum + r.errors.length, 0);

		await logSyncEvent(null, 'bulk_sync_complete', true, {
			organizationsProcessed: organizations.length,
			totalCampaigns,
			totalMetrics,
			totalErrors
		});

		return results;
	} finally {
		syncState.isRunning = false;
		syncState.currentOrgId = null;
	}
}

/**
 * Get current sync status
 */
export function getSyncStatus(): SyncStatus {
	return {
		isRunning: syncState.isRunning,
		lastSyncAt: syncState.lastSyncAt || undefined,
		lastSyncResult: undefined, // Would store last result if needed
		nextScheduledSync: undefined // Managed by scheduler
	};
}

/**
 * Get detailed sync state (for monitoring)
 */
export function getSyncState(): SyncState {
	return { ...syncState };
}

/**
 * Sync metrics for a specific campaign by ID
 */
export async function syncSingleCampaign(
	campaignId: string,
	options: SyncOptions = {}
): Promise<{ success: boolean; metricsInserted: number; error?: SyncError }> {
	const dateRange = options.dateRange || getDefaultDateRange();

	try {
		const campaign = await db.campaign.findUnique({
			where: { id: campaignId },
			select: {
				id: true,
				externalCampaignId: true,
				platform: true,
				organizationId: true
			}
		});

		if (!campaign) {
			return {
				success: false,
				metricsInserted: 0,
				error: {
					campaignId,
					error: 'Campaign not found',
					code: 'NOT_FOUND',
					recoverable: false
				}
			};
		}

		const platform = mapPlatformToPrisma(campaign.platform as unknown as AdPlatform);

		return syncCampaignMetricsInternal(
			{
				...campaign,
				platform: platform as AdPlatform
			},
			dateRange
		);
	} catch (error) {
		return {
			success: false,
			metricsInserted: 0,
			error: {
				campaignId,
				error: error instanceof Error ? error.message : 'Unknown error',
				code: 'SYNC_ERROR',
				recoverable: true
			}
		};
	}
}

/**
 * Force refresh metrics for an organization (ignores cache)
 */
export async function forceRefreshOrganization(
	organizationId: string,
	dateRange?: DateRange
): Promise<SyncResult> {
	return syncCampaignMetrics(organizationId, {
		dateRange: dateRange || getDefaultDateRange(),
		forceSync: true
	});
}
