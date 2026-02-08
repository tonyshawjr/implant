/**
 * Metrics Sync API Endpoint
 *
 * POST /api/sync/metrics - Trigger metrics synchronization
 * GET /api/sync/metrics - Get sync status
 *
 * This endpoint is designed to be called by:
 * 1. Vercel Cron jobs for scheduled syncs
 * 2. Admin users for manual sync triggers
 * 3. Webhooks for real-time sync triggers
 */

import { json, type RequestHandler } from '@sveltejs/kit';
import {
	executeScheduledSync,
	syncCampaignMetrics,
	triggerFullSync,
	getSyncStatus,
	getSchedulerHealth,
	getSchedulerState
} from '$lib/server/ads';

// =============================================================================
// Authentication Helper
// =============================================================================

async function isAuthorized(request: Request): Promise<{ authorized: boolean; isAdmin: boolean; isCron: boolean }> {
	// Check for Vercel Cron authorization header
	const cronSecret = request.headers.get('x-vercel-cron-secret');
	const expectedCronSecret = process.env.CRON_SECRET;

	if (cronSecret && expectedCronSecret && cronSecret === expectedCronSecret) {
		return { authorized: true, isAdmin: false, isCron: true };
	}

	// Check for admin authorization via session
	// In a real implementation, you would validate the session here
	const authHeader = request.headers.get('authorization');

	if (authHeader?.startsWith('Bearer ')) {
		// Validate the token/session
		// For now, accept any bearer token in development
		const token = authHeader.slice(7);
		if (token && token.length > 0) {
			return { authorized: true, isAdmin: true, isCron: false };
		}
	}

	// Check for API key authorization
	const apiKey = request.headers.get('x-api-key');
	const expectedApiKey = process.env.SYNC_API_KEY;

	if (apiKey && expectedApiKey && apiKey === expectedApiKey) {
		return { authorized: true, isAdmin: true, isCron: false };
	}

	// For development, allow requests without auth
	if (process.env.NODE_ENV === 'development') {
		return { authorized: true, isAdmin: true, isCron: false };
	}

	return { authorized: false, isAdmin: false, isCron: false };
}

// =============================================================================
// GET Handler - Get Sync Status
// =============================================================================

export const GET: RequestHandler = async ({ request }) => {
	const auth = await isAuthorized(request);

	if (!auth.authorized) {
		return json(
			{
				success: false,
				error: {
					code: 'UNAUTHORIZED',
					message: 'Authentication required'
				}
			},
			{ status: 401 }
		);
	}

	try {
		const syncStatus = getSyncStatus();
		const schedulerHealth = getSchedulerHealth();
		const schedulerState = getSchedulerState();

		return json({
			success: true,
			data: {
				sync: syncStatus,
				scheduler: {
					health: schedulerHealth,
					state: schedulerState
				}
			}
		});
	} catch (error) {
		return json(
			{
				success: false,
				error: {
					code: 'STATUS_ERROR',
					message: error instanceof Error ? error.message : 'Failed to get sync status'
				}
			},
			{ status: 500 }
		);
	}
};

// =============================================================================
// POST Handler - Trigger Sync
// =============================================================================

interface SyncRequestBody {
	type?: 'scheduled' | 'organization' | 'full';
	organizationId?: string;
	days?: number;
}

export const POST: RequestHandler = async ({ request }) => {
	const auth = await isAuthorized(request);

	if (!auth.authorized) {
		return json(
			{
				success: false,
				error: {
					code: 'UNAUTHORIZED',
					message: 'Authentication required'
				}
			},
			{ status: 401 }
		);
	}

	try {
		let body: SyncRequestBody = {};

		// Parse request body if present
		const contentType = request.headers.get('content-type');
		if (contentType?.includes('application/json')) {
			try {
				body = await request.json();
			} catch {
				// Empty body is fine for cron jobs
			}
		}

		const syncType = body.type || 'scheduled';

		// Validate sync type permissions
		if (syncType === 'full' && !auth.isAdmin) {
			return json(
				{
					success: false,
					error: {
						code: 'FORBIDDEN',
						message: 'Full sync requires admin privileges'
					}
				},
				{ status: 403 }
			);
		}

		let result;

		switch (syncType) {
			case 'scheduled':
				// Regular scheduled sync (for cron jobs)
				result = await executeScheduledSync();
				break;

			case 'organization':
				// Sync specific organization
				if (!body.organizationId) {
					return json(
						{
							success: false,
							error: {
								code: 'BAD_REQUEST',
								message: 'organizationId is required for organization sync'
							}
						},
						{ status: 400 }
					);
				}
				const orgResult = await syncCampaignMetrics(body.organizationId);
				result = {
					success: orgResult.errors.length === 0,
					results: [orgResult],
					duration: orgResult.duration,
					timestamp: orgResult.syncedAt
				};
				break;

			case 'full':
				// Full historical sync
				const days = body.days || 30;
				if (days < 1 || days > 365) {
					return json(
						{
							success: false,
							error: {
								code: 'BAD_REQUEST',
								message: 'days must be between 1 and 365'
							}
						},
						{ status: 400 }
					);
				}
				result = await triggerFullSync(days);
				break;

			default:
				return json(
					{
						success: false,
						error: {
							code: 'BAD_REQUEST',
							message: `Invalid sync type: ${syncType}`
						}
					},
					{ status: 400 }
				);
		}

		// Calculate summary stats
		const totalOrgs = result.results.length;
		const successfulOrgs = result.results.filter((r) => r.errors.length === 0).length;
		const totalCampaigns = result.results.reduce((sum, r) => sum + r.campaignsProcessed, 0);
		const totalMetrics = result.results.reduce((sum, r) => sum + r.metricsInserted, 0);
		const totalErrors = result.results.reduce((sum, r) => sum + r.errors.length, 0);

		return json({
			success: result.success,
			data: {
				syncType,
				summary: {
					organizations: {
						total: totalOrgs,
						successful: successfulOrgs,
						failed: totalOrgs - successfulOrgs
					},
					campaigns: totalCampaigns,
					metrics: totalMetrics,
					errors: totalErrors
				},
				duration: result.duration,
				timestamp: result.timestamp
			},
			// Include detailed results for admin requests
			...(auth.isAdmin && {
				details: result.results.map((r) => ({
					organizationId: r.organizationId,
					campaignsProcessed: r.campaignsProcessed,
					metricsInserted: r.metricsInserted,
					errors: r.errors,
					duration: r.duration
				}))
			})
		});
	} catch (error) {
		// Check if sync is already running
		if (error instanceof Error && error.message === 'Sync already in progress') {
			return json(
				{
					success: false,
					error: {
						code: 'SYNC_IN_PROGRESS',
						message: 'A sync operation is already in progress'
					}
				},
				{ status: 409 }
			);
		}

		return json(
			{
				success: false,
				error: {
					code: 'SYNC_ERROR',
					message: error instanceof Error ? error.message : 'Failed to execute sync'
				}
			},
			{ status: 500 }
		);
	}
};
