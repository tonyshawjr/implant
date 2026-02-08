/**
 * Campaign Budget API Endpoint
 *
 * GET /api/campaigns/[id]/budget - Get current campaign budget
 * POST /api/campaigns/[id]/budget - Update campaign budget
 *
 * POST Body:
 * - amount: number (new budget amount)
 * - type: 'daily' | 'monthly' (optional, defaults to 'daily')
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

function validateBudget(amount: number, type: string): { valid: boolean; error?: string } {
	if (typeof amount !== 'number' || isNaN(amount)) {
		return { valid: false, error: 'amount must be a valid number' };
	}

	if (amount < 1) {
		return { valid: false, error: 'Budget must be at least $1' };
	}

	if (type === 'daily' && amount > 10000) {
		return { valid: false, error: 'Daily budget cannot exceed $10,000' };
	}

	if (type === 'monthly' && amount > 100000) {
		return { valid: false, error: 'Monthly budget cannot exceed $100,000' };
	}

	return { valid: true };
}

// =============================================================================
// GET Handler - Get Campaign Budget
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
				dailyBudget: true,
				monthlyBudget: true,
				totalBudget: true,
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

		// Calculate spend to date from metrics
		const metrics = await db.campaignMetric.aggregate({
			where: { campaignId },
			_sum: { spend: true }
		});

		const spentToDate = Number(metrics._sum.spend) || 0;

		// Calculate remaining budget
		const dailyBudget = Number(campaign.dailyBudget) || 0;
		const monthlyBudget = Number(campaign.monthlyBudget) || 0;
		const totalBudget = Number(campaign.totalBudget) || 0;

		return json({
			success: true,
			data: {
				campaignId: campaign.id,
				name: campaign.name,
				platform: campaign.platform,
				status: campaign.status,
				budget: {
					daily: dailyBudget,
					monthly: monthlyBudget,
					total: totalBudget,
					currency: 'USD'
				},
				spending: {
					toDate: spentToDate,
					remaining: totalBudget > 0 ? totalBudget - spentToDate : null,
					percentUsed: totalBudget > 0 ? (spentToDate / totalBudget) * 100 : null
				},
				externalCampaignId: campaign.externalCampaignId
			}
		});
	} catch (error) {
		console.error('Error fetching campaign budget:', error);

		return json(
			{
				success: false,
				error: {
					code: 'INTERNAL_ERROR',
					message: error instanceof Error ? error.message : 'Failed to fetch campaign budget'
				}
			},
			{ status: 500 }
		);
	}
};

// =============================================================================
// POST Handler - Update Campaign Budget
// =============================================================================

interface BudgetUpdateBody {
	amount: number;
	type?: 'daily' | 'monthly';
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
		let body: BudgetUpdateBody;
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

		// Validate amount
		if (body.amount === undefined || body.amount === null) {
			return json(
				{
					success: false,
					error: {
						code: 'BAD_REQUEST',
						message: 'amount is required'
					}
				},
				{ status: 400 }
			);
		}

		const budgetType = body.type || 'daily';

		// Validate budget type
		if (!['daily', 'monthly'].includes(budgetType)) {
			return json(
				{
					success: false,
					error: {
						code: 'BAD_REQUEST',
						message: 'type must be "daily" or "monthly"'
					}
				},
				{ status: 400 }
			);
		}

		// Validate budget amount
		const validation = validateBudget(body.amount, budgetType);
		if (!validation.valid) {
			return json(
				{
					success: false,
					error: {
						code: 'BAD_REQUEST',
						message: validation.error
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
				dailyBudget: true,
				monthlyBudget: true,
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

		// Check if campaign can have budget updated
		if (campaign.status === 'draft' || campaign.status === 'completed') {
			return json(
				{
					success: false,
					error: {
						code: 'INVALID_STATE',
						message: `Cannot update budget for a campaign with status: ${campaign.status}`
					}
				},
				{ status: 400 }
			);
		}

		const previousBudget =
			budgetType === 'daily'
				? Number(campaign.dailyBudget) || 0
				: Number(campaign.monthlyBudget) || 0;

		// Update on ad platform if external ID exists
		let platformResult = null;
		if (campaign.externalCampaignId) {
			const platform = mapPlatform(campaign.platform);

			if (platform === 'google') {
				// Google Ads only supports daily budget
				platformResult = await google.updateBudget(campaign.externalCampaignId, body.amount);
			} else {
				// Map monthly to lifetime for Facebook API
				const fbBudgetType = budgetType === 'monthly' ? 'lifetime' : 'daily';
				platformResult = await facebook.updateBudget(
					campaign.externalCampaignId,
					body.amount,
					fbBudgetType
				);
			}

			if (!platformResult.success) {
				return json(
					{
						success: false,
						error: {
							code: 'PLATFORM_ERROR',
							message: platformResult.error?.message || 'Failed to update budget on ad platform'
						}
					},
					{ status: 502 }
				);
			}
		}

		// Update in database
		const updateData =
			budgetType === 'daily' ? { dailyBudget: body.amount } : { monthlyBudget: body.amount };

		const updatedCampaign = await db.campaign.update({
			where: { id: campaignId },
			data: updateData,
			select: {
				id: true,
				dailyBudget: true,
				monthlyBudget: true,
				updatedAt: true
			}
		});

		// Log the action
		await db.auditLog.create({
			data: {
				userId: null, // Would be set from session
				organizationId: campaign.organizationId,
				action: 'campaign_budget_update',
				entityType: 'campaign',
				entityId: campaignId,
				oldValues: { [budgetType === 'daily' ? 'dailyBudget' : 'monthlyBudget']: previousBudget },
				newValues: { [budgetType === 'daily' ? 'dailyBudget' : 'monthlyBudget']: body.amount },
				ipAddress: null,
				userAgent: null
			}
		});

		// Log optimization if this is a significant change
		const changePercentage =
			previousBudget > 0 ? ((body.amount - previousBudget) / previousBudget) * 100 : 100;

		if (Math.abs(changePercentage) >= 10) {
			await db.campaignOptimizationLog.create({
				data: {
					campaignId,
					optimizationType: 'budget_change',
					title: `${budgetType.charAt(0).toUpperCase() + budgetType.slice(1)} budget ${changePercentage > 0 ? 'increased' : 'decreased'}`,
					description: `Budget changed from $${previousBudget.toFixed(2)} to $${body.amount.toFixed(2)} (${changePercentage > 0 ? '+' : ''}${changePercentage.toFixed(1)}%)`,
					previousValue: { budget: previousBudget, type: budgetType },
					newValue: { budget: body.amount, type: budgetType },
					impact: null,
					aiConfidence: null,
					appliedAt: new Date()
				}
			});
		}

		return json({
			success: true,
			data: {
				campaignId: campaign.id,
				name: campaign.name,
				budgetType,
				previousBudget,
				newBudget: body.amount,
				changePercentage,
				budget: {
					daily: Number(updatedCampaign.dailyBudget) || 0,
					monthly: Number(updatedCampaign.monthlyBudget) || 0,
					currency: 'USD'
				},
				platformResponse: platformResult?.data || null,
				updatedAt: updatedCampaign.updatedAt
			}
		});
	} catch (error) {
		console.error('Error updating campaign budget:', error);

		return json(
			{
				success: false,
				error: {
					code: 'INTERNAL_ERROR',
					message: error instanceof Error ? error.message : 'Failed to update campaign budget'
				}
			},
			{ status: 500 }
		);
	}
};
