/**
 * Campaign Metrics API Endpoint
 *
 * GET /api/campaigns/[id]/metrics - Get campaign metrics from ad platform
 *
 * Query Parameters:
 * - startDate: Start date for metrics (YYYY-MM-DD), defaults to 7 days ago
 * - endDate: End date for metrics (YYYY-MM-DD), defaults to today
 * - source: 'platform' (live from API) or 'database' (cached), defaults to 'database'
 * - refresh: 'true' to force refresh from platform
 */

import { json, type RequestHandler } from '@sveltejs/kit';
import { prisma as db } from '$lib/server/db';
import { facebook, google, syncSingleCampaign, type DateRange, type AdPlatform } from '$lib/server/ads';

// =============================================================================
// Helper Functions
// =============================================================================

function parseDate(dateStr: string | null): Date | null {
	if (!dateStr) return null;
	const date = new Date(dateStr);
	return isNaN(date.getTime()) ? null : date;
}

function getDefaultDateRange(): DateRange {
	const endDate = new Date();
	const startDate = new Date();
	startDate.setDate(startDate.getDate() - 7);
	return { startDate, endDate };
}

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

// =============================================================================
// GET Handler - Get Campaign Metrics
// =============================================================================

export const GET: RequestHandler = async ({ params, url }) => {
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
				organizationId: true,
				dailyBudget: true,
				monthlyBudget: true
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

		// Parse query parameters
		const startDateParam = url.searchParams.get('startDate');
		const endDateParam = url.searchParams.get('endDate');
		const source = url.searchParams.get('source') || 'database';
		const refresh = url.searchParams.get('refresh') === 'true';

		// Build date range
		const defaultRange = getDefaultDateRange();
		const startDate = parseDate(startDateParam) || defaultRange.startDate;
		const endDate = parseDate(endDateParam) || defaultRange.endDate;

		// Validate date range
		if (startDate > endDate) {
			return json(
				{
					success: false,
					error: {
						code: 'BAD_REQUEST',
						message: 'startDate must be before endDate'
					}
				},
				{ status: 400 }
			);
		}

		const dateRange = { startDate, endDate };

		// If refresh is requested, sync first
		if (refresh && campaign.externalCampaignId) {
			await syncSingleCampaign(campaignId, { dateRange });
		}

		// Determine data source
		if (source === 'platform' && campaign.externalCampaignId) {
			// Fetch live data from ad platform
			const platform = mapPlatform(campaign.platform);
			let metricsResponse;

			if (platform === 'google') {
				metricsResponse = await google.getCampaignAggregatedMetrics(
					campaign.externalCampaignId,
					dateRange
				);
			} else {
				metricsResponse = await facebook.getCampaignAggregatedMetrics(
					campaign.externalCampaignId,
					dateRange
				);
			}

			if (!metricsResponse.success) {
				return json(
					{
						success: false,
						error: {
							code: 'PLATFORM_ERROR',
							message: metricsResponse.error?.message || 'Failed to fetch platform metrics'
						}
					},
					{ status: 502 }
				);
			}

			return json({
				success: true,
				data: {
					campaign: {
						id: campaign.id,
						name: campaign.name,
						platform: campaign.platform,
						status: campaign.status
					},
					source: 'platform',
					dateRange: {
						startDate: startDate.toISOString().split('T')[0],
						endDate: endDate.toISOString().split('T')[0]
					},
					metrics: metricsResponse.data
				}
			});
		} else {
			// Fetch from database (cached metrics)
			const metrics = await db.campaignMetric.findMany({
				where: {
					campaignId,
					date: {
						gte: startDate,
						lte: endDate
					}
				},
				orderBy: { date: 'asc' }
			});

			// Calculate aggregated metrics
			const aggregated = {
				impressions: 0,
				clicks: 0,
				spend: 0,
				leads: 0,
				conversions: 0,
				ctr: 0,
				cpl: 0,
				cpa: 0,
				roas: 0
			};

			for (const metric of metrics) {
				aggregated.impressions += metric.impressions;
				aggregated.clicks += metric.clicks;
				aggregated.spend += Number(metric.spend);
				aggregated.leads += metric.leads;
				aggregated.conversions += metric.conversions;
			}

			// Calculate derived metrics
			if (aggregated.impressions > 0) {
				aggregated.ctr = aggregated.clicks / aggregated.impressions;
			}
			if (aggregated.leads > 0) {
				aggregated.cpl = aggregated.spend / aggregated.leads;
			}
			if (aggregated.conversions > 0) {
				aggregated.cpa = aggregated.spend / aggregated.conversions;
				aggregated.roas = (aggregated.conversions * 4000) / aggregated.spend;
			}

			// Format daily metrics
			const dailyMetrics = metrics.map((m) => ({
				date: m.date,
				impressions: m.impressions,
				clicks: m.clicks,
				ctr: Number(m.ctr),
				spend: Number(m.spend),
				leads: m.leads,
				cpl: Number(m.cpl),
				conversions: m.conversions,
				cpa: Number(m.cpa),
				roas: Number(m.roas)
			}));

			return json({
				success: true,
				data: {
					campaign: {
						id: campaign.id,
						name: campaign.name,
						platform: campaign.platform,
						status: campaign.status,
						externalCampaignId: campaign.externalCampaignId
					},
					source: 'database',
					dateRange: {
						startDate: startDate.toISOString().split('T')[0],
						endDate: endDate.toISOString().split('T')[0]
					},
					metrics: {
						aggregated,
						daily: dailyMetrics,
						dataPoints: dailyMetrics.length
					}
				}
			});
		}
	} catch (error) {
		console.error('Error fetching campaign metrics:', error);

		return json(
			{
				success: false,
				error: {
					code: 'INTERNAL_ERROR',
					message: error instanceof Error ? error.message : 'Failed to fetch campaign metrics'
				}
			},
			{ status: 500 }
		);
	}
};
