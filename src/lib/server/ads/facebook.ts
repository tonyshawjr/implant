/**
 * Facebook/Meta Marketing API Client
 *
 * Handles all interactions with the Facebook Marketing API including:
 * - Fetching campaign, ad set, and ad metrics
 * - Campaign status management (pause/resume)
 * - Budget updates
 *
 * Note: This implementation includes mock data for development.
 * Real API calls are commented and marked where they would occur.
 */

import type {
	CampaignMetrics,
	AdSetMetrics,
	AdMetrics,
	DateRange,
	ApiResponse,
	BudgetUpdateResult,
	CampaignStatusInfo,
	FacebookApiConfig,
	FacebookCampaign,
	FacebookInsights,
	FacebookAdSet,
	FacebookAd,
	MockDataOptions,
	CampaignApiStatus,
	AggregatedMetrics,
	DailyMetric
} from './types';

// =============================================================================
// Configuration
// =============================================================================

const API_VERSION = 'v18.0';
const BASE_URL = 'https://graph.facebook.com';

function getConfig(): FacebookApiConfig | null {
	const appId = process.env.FACEBOOK_APP_ID;
	const appSecret = process.env.FACEBOOK_APP_SECRET;
	const accessToken = process.env.FACEBOOK_ACCESS_TOKEN;

	if (!appId || !appSecret || !accessToken) {
		return null;
	}

	return {
		appId,
		appSecret,
		accessToken,
		apiVersion: API_VERSION
	};
}

function isConfigured(): boolean {
	return getConfig() !== null;
}

// =============================================================================
// Helper Functions
// =============================================================================

function formatDateForApi(date: Date): string {
	return date.toISOString().split('T')[0];
}

function parseNumeric(value: string | undefined | null): number {
	if (!value) return 0;
	return parseFloat(value) || 0;
}

function calculateCtr(clicks: number, impressions: number): number {
	if (impressions === 0) return 0;
	return clicks / impressions;
}

function calculateCpl(spend: number, leads: number): number {
	if (leads === 0) return 0;
	return spend / leads;
}

function calculateCpa(spend: number, conversions: number): number {
	if (conversions === 0) return 0;
	return spend / conversions;
}

function calculateRoas(revenue: number, spend: number): number {
	if (spend === 0) return 0;
	return revenue / spend;
}

async function simulateLatency(options?: MockDataOptions): Promise<void> {
	if (options?.simulateLatency !== false) {
		const latency = options?.latencyMs ?? Math.random() * 300 + 100;
		await new Promise((resolve) => setTimeout(resolve, latency));
	}
}

// =============================================================================
// Mock Data Generation
// =============================================================================

function generateMockCampaignMetrics(
	campaignId: string,
	dateRange: DateRange
): CampaignMetrics {
	const baseImpressions = Math.floor(Math.random() * 50000) + 10000;
	const baseCtr = Math.random() * 0.05 + 0.01;
	const clicks = Math.floor(baseImpressions * baseCtr);
	const spend = Math.random() * 500 + 100;
	const leads = Math.floor(clicks * (Math.random() * 0.1 + 0.02));
	const conversions = Math.floor(leads * (Math.random() * 0.3 + 0.1));
	const caseValue = 4000;

	return {
		campaignId,
		campaignName: `Campaign ${campaignId.slice(0, 8)}`,
		platform: 'facebook',
		status: 'ACTIVE',
		date: dateRange.endDate,
		impressions: baseImpressions,
		clicks,
		ctr: baseCtr,
		spend,
		leads,
		cpl: calculateCpl(spend, leads),
		conversions,
		cpa: calculateCpa(spend, conversions),
		roas: calculateRoas(conversions * caseValue, spend),
		dailyBudget: 100,
		reach: Math.floor(baseImpressions * 0.7),
		frequency: 1.4,
		uniqueClicks: Math.floor(clicks * 0.85),
		videoViews: Math.floor(baseImpressions * 0.15),
		videoViewsP25: Math.floor(baseImpressions * 0.12),
		videoViewsP50: Math.floor(baseImpressions * 0.08),
		videoViewsP75: Math.floor(baseImpressions * 0.05),
		videoViewsP100: Math.floor(baseImpressions * 0.03)
	};
}

function generateMockAdSetMetrics(
	adSetId: string,
	campaignId: string,
	dateRange: DateRange
): AdSetMetrics {
	const baseImpressions = Math.floor(Math.random() * 15000) + 3000;
	const baseCtr = Math.random() * 0.04 + 0.015;
	const clicks = Math.floor(baseImpressions * baseCtr);
	const spend = Math.random() * 150 + 30;
	const leads = Math.floor(clicks * (Math.random() * 0.12 + 0.03));
	const conversions = Math.floor(leads * (Math.random() * 0.25 + 0.1));
	const caseValue = 4000;

	return {
		adSetId,
		adSetName: `Ad Set ${adSetId.slice(0, 8)}`,
		campaignId,
		platform: 'facebook',
		status: 'ACTIVE',
		date: dateRange.endDate,
		impressions: baseImpressions,
		clicks,
		ctr: baseCtr,
		spend,
		leads,
		cpl: calculateCpl(spend, leads),
		conversions,
		cpa: calculateCpa(spend, conversions),
		roas: calculateRoas(conversions * caseValue, spend),
		dailyBudget: 50,
		bidStrategy: 'LOWEST_COST_WITHOUT_CAP',
		targetingSpec: {
			ageMin: 35,
			ageMax: 65,
			genders: ['all'],
			geoLocations: [
				{
					type: 'radius',
					key: 'loc_123',
					name: 'Local Area',
					radius: 25,
					radiusUnit: 'mile'
				}
			],
			interests: [
				{ id: 'int_1', name: 'Dental Health', audienceSize: 500000 },
				{ id: 'int_2', name: 'Health & Wellness', audienceSize: 2000000 }
			]
		}
	};
}

function generateMockAdMetrics(
	adId: string,
	adSetId: string,
	campaignId: string,
	dateRange: DateRange
): AdMetrics {
	const baseImpressions = Math.floor(Math.random() * 5000) + 1000;
	const baseCtr = Math.random() * 0.045 + 0.01;
	const clicks = Math.floor(baseImpressions * baseCtr);
	const spend = Math.random() * 50 + 10;
	const leads = Math.floor(clicks * (Math.random() * 0.1 + 0.02));
	const conversions = Math.floor(leads * (Math.random() * 0.3 + 0.1));
	const caseValue = 4000;

	return {
		adId,
		adName: `Ad ${adId.slice(0, 8)}`,
		adSetId,
		campaignId,
		platform: 'facebook',
		status: 'ACTIVE',
		date: dateRange.endDate,
		impressions: baseImpressions,
		clicks,
		ctr: baseCtr,
		spend,
		leads,
		cpl: calculateCpl(spend, leads),
		conversions,
		cpa: calculateCpa(spend, conversions),
		roas: calculateRoas(conversions * caseValue, spend),
		creativeId: `creative_${adId}`,
		headline: 'Transform Your Smile Today',
		body: 'Experience the confidence of a complete, beautiful smile with our expert dental implant services.',
		callToAction: 'Learn More',
		imageUrl: 'https://example.com/ad-image.jpg'
	};
}

function generateMockAggregatedMetrics(
	campaignId: string,
	dateRange: DateRange
): AggregatedMetrics {
	const daysDiff = Math.ceil(
		(dateRange.endDate.getTime() - dateRange.startDate.getTime()) / (1000 * 60 * 60 * 24)
	);
	const days = Math.max(1, daysDiff);

	const dailyMetrics: DailyMetric[] = [];
	let totalImpressions = 0;
	let totalClicks = 0;
	let totalSpend = 0;
	let totalLeads = 0;
	let totalConversions = 0;

	for (let i = 0; i < days; i++) {
		const date = new Date(dateRange.startDate);
		date.setDate(date.getDate() + i);

		const dayImpressions = Math.floor(Math.random() * 5000) + 1000;
		const dayClicks = Math.floor(dayImpressions * (Math.random() * 0.04 + 0.01));
		const daySpend = Math.random() * 100 + 20;
		const dayLeads = Math.floor(dayClicks * (Math.random() * 0.1 + 0.02));
		const dayConversions = Math.floor(dayLeads * (Math.random() * 0.25 + 0.1));

		dailyMetrics.push({
			date,
			impressions: dayImpressions,
			clicks: dayClicks,
			spend: daySpend,
			leads: dayLeads,
			conversions: dayConversions
		});

		totalImpressions += dayImpressions;
		totalClicks += dayClicks;
		totalSpend += daySpend;
		totalLeads += dayLeads;
		totalConversions += dayConversions;
	}

	const caseValue = 4000;

	return {
		dateRange,
		dataPoints: days,
		dailyMetrics,
		impressions: totalImpressions,
		clicks: totalClicks,
		ctr: calculateCtr(totalClicks, totalImpressions),
		spend: totalSpend,
		leads: totalLeads,
		cpl: calculateCpl(totalSpend, totalLeads),
		conversions: totalConversions,
		cpa: calculateCpa(totalSpend, totalConversions),
		roas: calculateRoas(totalConversions * caseValue, totalSpend)
	};
}

// =============================================================================
// Real API Functions (Commented - For Reference)
// =============================================================================

/*
async function makeApiRequest<T>(
	endpoint: string,
	params: Record<string, string> = {}
): Promise<T> {
	const config = getConfig();
	if (!config) {
		throw new Error('Facebook API not configured');
	}

	const url = new URL(`${BASE_URL}/${config.apiVersion}/${endpoint}`);
	url.searchParams.set('access_token', config.accessToken);

	for (const [key, value] of Object.entries(params)) {
		url.searchParams.set(key, value);
	}

	const response = await fetch(url.toString());

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error?.message || 'Facebook API request failed');
	}

	return response.json();
}

async function fetchCampaignInsights(
	campaignId: string,
	dateRange: DateRange
): Promise<FacebookInsights[]> {
	return makeApiRequest<{ data: FacebookInsights[] }>(
		`${campaignId}/insights`,
		{
			time_range: JSON.stringify({
				since: formatDateForApi(dateRange.startDate),
				until: formatDateForApi(dateRange.endDate)
			}),
			fields: [
				'impressions',
				'clicks',
				'ctr',
				'spend',
				'reach',
				'frequency',
				'unique_clicks',
				'actions',
				'cost_per_action_type',
				'video_p25_watched_actions',
				'video_p50_watched_actions',
				'video_p75_watched_actions',
				'video_p100_watched_actions'
			].join(','),
			level: 'campaign'
		}
	).then(res => res.data);
}

function transformInsightsToMetrics(
	campaignId: string,
	campaignName: string,
	insights: FacebookInsights
): CampaignMetrics {
	const impressions = parseNumeric(insights.impressions);
	const clicks = parseNumeric(insights.clicks);
	const spend = parseNumeric(insights.spend);

	const leadAction = insights.actions?.find(a => a.action_type === 'lead');
	const leads = parseNumeric(leadAction?.value);

	const purchaseAction = insights.actions?.find(a => a.action_type === 'purchase');
	const conversions = parseNumeric(purchaseAction?.value);

	const revenue = conversions * 4000; // Average case value

	return {
		campaignId,
		campaignName,
		platform: 'facebook',
		status: 'ACTIVE',
		date: new Date(insights.date_stop),
		impressions,
		clicks,
		ctr: calculateCtr(clicks, impressions),
		spend,
		leads,
		cpl: calculateCpl(spend, leads),
		conversions,
		cpa: calculateCpa(spend, conversions),
		roas: calculateRoas(revenue, spend),
		reach: parseNumeric(insights.reach),
		frequency: parseNumeric(insights.frequency),
		uniqueClicks: parseNumeric(insights.unique_clicks),
		videoViews: parseNumeric(insights.video_p25_watched_actions?.[0]?.value),
		videoViewsP25: parseNumeric(insights.video_p25_watched_actions?.[0]?.value),
		videoViewsP50: parseNumeric(insights.video_p50_watched_actions?.[0]?.value),
		videoViewsP75: parseNumeric(insights.video_p75_watched_actions?.[0]?.value),
		videoViewsP100: parseNumeric(insights.video_p100_watched_actions?.[0]?.value)
	};
}
*/

// =============================================================================
// Public API Functions
// =============================================================================

/**
 * Get metrics for a specific campaign over a date range
 */
export async function getCampaignMetrics(
	campaignId: string,
	dateRange: DateRange,
	options?: MockDataOptions
): Promise<ApiResponse<CampaignMetrics>> {
	await simulateLatency(options);

	try {
		// When real API is configured:
		// const config = getConfig();
		// if (config) {
		//   const insights = await fetchCampaignInsights(campaignId, dateRange);
		//   const campaign = await makeApiRequest<FacebookCampaign>(campaignId, { fields: 'name,status' });
		//   if (insights.length > 0) {
		//     return {
		//       success: true,
		//       data: transformInsightsToMetrics(campaignId, campaign.name, insights[0])
		//     };
		//   }
		// }

		// Mock implementation
		const metrics = generateMockCampaignMetrics(campaignId, dateRange);

		return {
			success: true,
			data: metrics,
			requestId: `fb_${Date.now()}`
		};
	} catch (error) {
		return {
			success: false,
			error: {
				code: 'FACEBOOK_API_ERROR',
				message: error instanceof Error ? error.message : 'Unknown error occurred',
				platform: 'facebook',
				timestamp: new Date()
			}
		};
	}
}

/**
 * Get aggregated metrics for a campaign over a date range with daily breakdown
 */
export async function getCampaignAggregatedMetrics(
	campaignId: string,
	dateRange: DateRange,
	options?: MockDataOptions
): Promise<ApiResponse<AggregatedMetrics>> {
	await simulateLatency(options);

	try {
		// When real API is configured:
		// Fetch insights with time_increment: 1 to get daily data

		// Mock implementation
		const metrics = generateMockAggregatedMetrics(campaignId, dateRange);

		return {
			success: true,
			data: metrics,
			requestId: `fb_agg_${Date.now()}`
		};
	} catch (error) {
		return {
			success: false,
			error: {
				code: 'FACEBOOK_API_ERROR',
				message: error instanceof Error ? error.message : 'Unknown error occurred',
				platform: 'facebook',
				timestamp: new Date()
			}
		};
	}
}

/**
 * Get metrics for a specific ad set
 */
export async function getAdSetMetrics(
	adSetId: string,
	dateRange: DateRange,
	options?: MockDataOptions
): Promise<ApiResponse<AdSetMetrics>> {
	await simulateLatency(options);

	try {
		// Mock implementation
		const campaignId = `campaign_${adSetId.slice(0, 8)}`;
		const metrics = generateMockAdSetMetrics(adSetId, campaignId, dateRange);

		return {
			success: true,
			data: metrics,
			requestId: `fb_adset_${Date.now()}`
		};
	} catch (error) {
		return {
			success: false,
			error: {
				code: 'FACEBOOK_API_ERROR',
				message: error instanceof Error ? error.message : 'Unknown error occurred',
				platform: 'facebook',
				timestamp: new Date()
			}
		};
	}
}

/**
 * Get metrics for a specific ad
 */
export async function getAdMetrics(
	adId: string,
	dateRange: DateRange,
	options?: MockDataOptions
): Promise<ApiResponse<AdMetrics>> {
	await simulateLatency(options);

	try {
		// Mock implementation
		const adSetId = `adset_${adId.slice(0, 8)}`;
		const campaignId = `campaign_${adId.slice(0, 8)}`;
		const metrics = generateMockAdMetrics(adId, adSetId, campaignId, dateRange);

		return {
			success: true,
			data: metrics,
			requestId: `fb_ad_${Date.now()}`
		};
	} catch (error) {
		return {
			success: false,
			error: {
				code: 'FACEBOOK_API_ERROR',
				message: error instanceof Error ? error.message : 'Unknown error occurred',
				platform: 'facebook',
				timestamp: new Date()
			}
		};
	}
}

/**
 * Pause a campaign
 */
export async function pauseCampaign(
	campaignId: string,
	options?: MockDataOptions
): Promise<ApiResponse<CampaignStatusInfo>> {
	await simulateLatency(options);

	try {
		// When real API is configured:
		// await makeApiRequest(
		//   campaignId,
		//   { status: 'PAUSED' },
		//   'POST'
		// );

		// Mock implementation
		return {
			success: true,
			data: {
				effectiveStatus: 'PAUSED',
				configuredStatus: 'PAUSED',
				deliveryStatus: 'Campaign has been paused'
			},
			requestId: `fb_pause_${Date.now()}`
		};
	} catch (error) {
		return {
			success: false,
			error: {
				code: 'FACEBOOK_PAUSE_ERROR',
				message: error instanceof Error ? error.message : 'Failed to pause campaign',
				platform: 'facebook',
				timestamp: new Date()
			}
		};
	}
}

/**
 * Resume a paused campaign
 */
export async function resumeCampaign(
	campaignId: string,
	options?: MockDataOptions
): Promise<ApiResponse<CampaignStatusInfo>> {
	await simulateLatency(options);

	try {
		// When real API is configured:
		// await makeApiRequest(
		//   campaignId,
		//   { status: 'ACTIVE' },
		//   'POST'
		// );

		// Mock implementation
		return {
			success: true,
			data: {
				effectiveStatus: 'ACTIVE',
				configuredStatus: 'ACTIVE',
				deliveryStatus: 'Campaign is now active and delivering'
			},
			requestId: `fb_resume_${Date.now()}`
		};
	} catch (error) {
		return {
			success: false,
			error: {
				code: 'FACEBOOK_RESUME_ERROR',
				message: error instanceof Error ? error.message : 'Failed to resume campaign',
				platform: 'facebook',
				timestamp: new Date()
			}
		};
	}
}

/**
 * Update campaign daily or lifetime budget
 */
export async function updateBudget(
	campaignId: string,
	newBudget: number,
	budgetType: 'daily' | 'lifetime' = 'daily',
	options?: MockDataOptions
): Promise<ApiResponse<BudgetUpdateResult>> {
	await simulateLatency(options);

	try {
		// Validate budget
		if (newBudget < 1) {
			throw new Error('Budget must be at least $1');
		}

		if (newBudget > 100000) {
			throw new Error('Budget cannot exceed $100,000');
		}

		// When real API is configured:
		// const budgetCents = Math.round(newBudget * 100);
		// const budgetField = budgetType === 'daily' ? 'daily_budget' : 'lifetime_budget';
		// await makeApiRequest(
		//   campaignId,
		//   { [budgetField]: budgetCents.toString() },
		//   'POST'
		// );

		// Mock implementation - simulate previous budget
		const previousBudget = Math.random() * 200 + 50;

		return {
			success: true,
			data: {
				success: true,
				previousBudget,
				newBudget,
				effectiveFrom: new Date(),
				message: `${budgetType === 'daily' ? 'Daily' : 'Lifetime'} budget updated successfully`
			},
			requestId: `fb_budget_${Date.now()}`
		};
	} catch (error) {
		return {
			success: false,
			error: {
				code: 'FACEBOOK_BUDGET_ERROR',
				message: error instanceof Error ? error.message : 'Failed to update budget',
				platform: 'facebook',
				timestamp: new Date()
			}
		};
	}
}

/**
 * Get campaign status information
 */
export async function getCampaignStatus(
	campaignId: string,
	options?: MockDataOptions
): Promise<ApiResponse<CampaignStatusInfo>> {
	await simulateLatency(options);

	try {
		// Mock implementation
		const statuses: CampaignApiStatus[] = ['ACTIVE', 'PAUSED', 'PENDING_REVIEW'];
		const randomStatus = statuses[Math.floor(Math.random() * statuses.length)];

		return {
			success: true,
			data: {
				effectiveStatus: randomStatus,
				configuredStatus: randomStatus,
				deliveryStatus:
					randomStatus === 'ACTIVE'
						? 'Campaign is delivering normally'
						: randomStatus === 'PAUSED'
							? 'Campaign is paused by user'
							: 'Campaign is pending review'
			},
			requestId: `fb_status_${Date.now()}`
		};
	} catch (error) {
		return {
			success: false,
			error: {
				code: 'FACEBOOK_STATUS_ERROR',
				message: error instanceof Error ? error.message : 'Failed to get campaign status',
				platform: 'facebook',
				timestamp: new Date()
			}
		};
	}
}

/**
 * Get all campaigns for an ad account
 */
export async function getAccountCampaigns(
	accountId: string,
	options?: MockDataOptions
): Promise<ApiResponse<FacebookCampaign[]>> {
	await simulateLatency(options);

	try {
		// Mock implementation - return a few sample campaigns
		const campaigns: FacebookCampaign[] = [
			{
				id: `${accountId}_campaign_1`,
				name: 'Implant Lead Gen - Metro Area',
				account_id: accountId,
				objective: 'OUTCOME_LEADS',
				status: 'ACTIVE',
				effective_status: 'ACTIVE',
				daily_budget: '10000',
				created_time: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
				updated_time: new Date().toISOString()
			},
			{
				id: `${accountId}_campaign_2`,
				name: 'Implant Awareness - Retargeting',
				account_id: accountId,
				objective: 'OUTCOME_AWARENESS',
				status: 'ACTIVE',
				effective_status: 'ACTIVE',
				daily_budget: '5000',
				created_time: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
				updated_time: new Date().toISOString()
			},
			{
				id: `${accountId}_campaign_3`,
				name: 'Implant Traffic - Website Visitors',
				account_id: accountId,
				objective: 'OUTCOME_TRAFFIC',
				status: 'PAUSED',
				effective_status: 'PAUSED',
				daily_budget: '3000',
				created_time: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
				updated_time: new Date().toISOString()
			}
		];

		return {
			success: true,
			data: campaigns,
			requestId: `fb_campaigns_${Date.now()}`
		};
	} catch (error) {
		return {
			success: false,
			error: {
				code: 'FACEBOOK_CAMPAIGNS_ERROR',
				message: error instanceof Error ? error.message : 'Failed to fetch campaigns',
				platform: 'facebook',
				timestamp: new Date()
			}
		};
	}
}

/**
 * Check if Facebook API is configured and ready to use
 */
export function isFacebookConfigured(): boolean {
	return isConfigured();
}

/**
 * Get Facebook API version being used
 */
export function getApiVersion(): string {
	return API_VERSION;
}
