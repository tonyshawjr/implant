/**
 * Campaign Status API Endpoint
 *
 * GET /api/campaigns/[id]/status - Get campaign status from ad platform
 * POST /api/campaigns/[id]/status - Update campaign status (pause/resume)
 *
 * POST Body:
 * - action: 'pause' | 'resume'
 */

import { json, type RequestHandler } from '@sveltejs/kit';
import { prisma as db } from '$lib/server/db';
import { facebook, google, type AdPlatform } from '$lib/server/ads';

// =============================================================================
// Helper Functions
// =============================================================================

function mapPlatform(platform: string): AdPlatform {
	switch (platform.toLowerCase()) {
		case 'google':
			return 'google';
		case 'facebook':
		case 'meta':
		case 'instagram':
		default:
			return 'facebook';
	}
}

function mapExternalStatus(status: string): 'active' | 'paused' {
	switch (status) {
		case 'ACTIVE':
		case 'ENABLED':
			return 'active';
		case 'PAUSED':
		case 'CAMPAIGN_PAUSED':
		case 'ADSET_PAUSED':
		default:
			return 'paused';
	}
}

// =============================================================================
// GET Handler - Get Campaign Status
// =============================================================================

export const GET: RequestHandler = async ({ params }) => {
	const campaignId = params.id;

	if (!campaignId) {
		return json(
			{
				success: false,
				error: {
					code: 'BAD_REQUEST',
					message: 'Campaign ID is required'
				}
			},
			{ status: 400 }
		);
	}

	try {
		// Get campaign from database
		const campaign = await db.campaign.findUnique({
			where: { id: campaignId },
			select: {
				id: true,
				name: true,
				platform: true,
				status: true,
				externalCampaignId: true,
				organizationId: true
			}
		});

		if (!campaign) {
			return json(
				{
					success: false,
					error: {
						code: 'NOT_FOUND',
						message: 'Campaign not found'
					}
				},
				{ status: 404 }
			);
		}

		// If no external campaign ID, return database status only
		if (!campaign.externalCampaignId) {
			return json({
				success: true,
				data: {
					campaignId: campaign.id,
					name: campaign.name,
					platform: campaign.platform,
					databaseStatus: campaign.status,
					platformStatus: null,
					message: 'No external campaign ID linked'
				}
			});
		}

		// Fetch status from ad platform
		const platform = mapPlatform(campaign.platform);
		let statusResponse;

		if (platform === 'google') {
			statusResponse = await google.getCampaignStatus(campaign.externalCampaignId);
		} else {
			statusResponse = await facebook.getCampaignStatus(campaign.externalCampaignId);
		}

		if (!statusResponse.success) {
			return json(
				{
					success: false,
					error: {
						code: 'PLATFORM_ERROR',
						message: statusResponse.error?.message || 'Failed to fetch platform status'
					}
				},
				{ status: 502 }
			);
		}

		return json({
			success: true,
			data: {
				campaignId: campaign.id,
				name: campaign.name,
				platform: campaign.platform,
				databaseStatus: campaign.status,
				platformStatus: statusResponse.data,
				synced:
					campaign.status === mapExternalStatus(statusResponse.data?.effectiveStatus || '')
			}
		});
	} catch (error) {
		console.error('Error fetching campaign status:', error);

		return json(
			{
				success: false,
				error: {
					code: 'INTERNAL_ERROR',
					message: error instanceof Error ? error.message : 'Failed to fetch campaign status'
				}
			},
			{ status: 500 }
		);
	}
};

// =============================================================================
// POST Handler - Update Campaign Status
// =============================================================================

interface StatusUpdateBody {
	action: 'pause' | 'resume';
}

export const POST: RequestHandler = async ({ params, request }) => {
	const campaignId = params.id;

	if (!campaignId) {
		return json(
			{
				success: false,
				error: {
					code: 'BAD_REQUEST',
					message: 'Campaign ID is required'
				}
			},
			{ status: 400 }
		);
	}

	try {
		// Parse request body
		let body: StatusUpdateBody;
		try {
			body = await request.json();
		} catch {
			return json(
				{
					success: false,
					error: {
						code: 'BAD_REQUEST',
						message: 'Invalid request body'
					}
				},
				{ status: 400 }
			);
		}

		// Validate action
		if (!body.action || !['pause', 'resume'].includes(body.action)) {
			return json(
				{
					success: false,
					error: {
						code: 'BAD_REQUEST',
						message: 'action must be "pause" or "resume"'
					}
				},
				{ status: 400 }
			);
		}

		// Get campaign from database
		const campaign = await db.campaign.findUnique({
			where: { id: campaignId },
			select: {
				id: true,
				name: true,
				platform: true,
				status: true,
				externalCampaignId: true,
				organizationId: true
			}
		});

		if (!campaign) {
			return json(
				{
					success: false,
					error: {
						code: 'NOT_FOUND',
						message: 'Campaign not found'
					}
				},
				{ status: 404 }
			);
		}

		// Check if campaign can be updated
		if (campaign.status === 'draft' || campaign.status === 'completed') {
			return json(
				{
					success: false,
					error: {
						code: 'INVALID_STATE',
						message: `Cannot ${body.action} a campaign with status: ${campaign.status}`
					}
				},
				{ status: 400 }
			);
		}

		// Check if action is already the current state
		const currentlyActive = campaign.status === 'active';
		if (
			(body.action === 'pause' && !currentlyActive) ||
			(body.action === 'resume' && currentlyActive)
		) {
			return json({
				success: true,
				data: {
					campaignId: campaign.id,
					action: body.action,
					previousStatus: campaign.status,
					newStatus: campaign.status,
					message: `Campaign is already ${currentlyActive ? 'active' : 'paused'}`
				}
			});
		}

		const previousStatus = campaign.status;
		const newStatus = body.action === 'pause' ? 'paused' : 'active';

		// Update on ad platform if external ID exists
		let platformResult = null;
		if (campaign.externalCampaignId) {
			const platform = mapPlatform(campaign.platform);

			if (body.action === 'pause') {
				if (platform === 'google') {
					platformResult = await google.pauseCampaign(campaign.externalCampaignId);
				} else {
					platformResult = await facebook.pauseCampaign(campaign.externalCampaignId);
				}
			} else {
				if (platform === 'google') {
					platformResult = await google.resumeCampaign(campaign.externalCampaignId);
				} else {
					platformResult = await facebook.resumeCampaign(campaign.externalCampaignId);
				}
			}

			if (!platformResult.success) {
				return json(
					{
						success: false,
						error: {
							code: 'PLATFORM_ERROR',
							message:
								platformResult.error?.message ||
								`Failed to ${body.action} campaign on ad platform`
						}
					},
					{ status: 502 }
				);
			}
		}

		// Update in database
		const updatedCampaign = await db.campaign.update({
			where: { id: campaignId },
			data: {
				status: newStatus as 'active' | 'paused'
			},
			select: {
				id: true,
				status: true,
				updatedAt: true
			}
		});

		// Log the action
		await db.auditLog.create({
			data: {
				userId: null, // Would be set from session
				organizationId: campaign.organizationId,
				action: `campaign_${body.action}`,
				entityType: 'campaign',
				entityId: campaignId,
				oldValues: { status: previousStatus },
				newValues: { status: newStatus },
				ipAddress: null,
				userAgent: null
			}
		});

		return json({
			success: true,
			data: {
				campaignId: campaign.id,
				name: campaign.name,
				action: body.action,
				previousStatus,
				newStatus: updatedCampaign.status,
				platformResponse: platformResult?.data || null,
				updatedAt: updatedCampaign.updatedAt
			}
		});
	} catch (error) {
		console.error('Error updating campaign status:', error);

		return json(
			{
				success: false,
				error: {
					code: 'INTERNAL_ERROR',
					message: error instanceof Error ? error.message : 'Failed to update campaign status'
				}
			},
			{ status: 500 }
		);
	}
};
