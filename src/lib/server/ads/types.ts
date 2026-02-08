/**
 * Ad Platform API Types
 *
 * TypeScript interfaces for Facebook/Meta and Google Ads API responses
 * and internal platform data structures.
 */

// =============================================================================
// Common Types
// =============================================================================

export type AdPlatform = 'facebook' | 'google' | 'meta' | 'instagram';

export interface DateRange {
	startDate: Date;
	endDate: Date;
}

export interface ApiError {
	code: string;
	message: string;
	platform: AdPlatform;
	timestamp: Date;
	details?: Record<string, unknown>;
}

export interface ApiResponse<T> {
	success: boolean;
	data?: T;
	error?: ApiError;
	requestId?: string;
}

// =============================================================================
// Metrics Types
// =============================================================================

export interface BaseMetrics {
	impressions: number;
	clicks: number;
	ctr: number; // Click-through rate as decimal (0.05 = 5%)
	spend: number;
	leads: number;
	cpl: number; // Cost per lead
	conversions: number;
	cpa: number; // Cost per acquisition
	roas: number; // Return on ad spend
}

export interface CampaignMetrics extends BaseMetrics {
	campaignId: string;
	campaignName: string;
	platform: AdPlatform;
	status: CampaignApiStatus;
	date: Date;
	dailyBudget?: number;
	lifetimeBudget?: number;
	reach?: number;
	frequency?: number;
	uniqueClicks?: number;
	videoViews?: number;
	videoViewsP25?: number;
	videoViewsP50?: number;
	videoViewsP75?: number;
	videoViewsP100?: number;
}

export interface AdSetMetrics extends BaseMetrics {
	adSetId: string;
	adSetName: string;
	campaignId: string;
	platform: AdPlatform;
	status: CampaignApiStatus;
	date: Date;
	dailyBudget?: number;
	lifetimeBudget?: number;
	bidStrategy?: string;
	targetingSpec?: TargetingSpec;
}

export interface AdMetrics extends BaseMetrics {
	adId: string;
	adName: string;
	adSetId: string;
	campaignId: string;
	platform: AdPlatform;
	status: CampaignApiStatus;
	date: Date;
	creativeId?: string;
	headline?: string;
	body?: string;
	callToAction?: string;
	imageUrl?: string;
	videoUrl?: string;
}

export interface AggregatedMetrics extends BaseMetrics {
	dateRange: DateRange;
	dataPoints: number;
	dailyMetrics: DailyMetric[];
}

export interface DailyMetric {
	date: Date;
	impressions: number;
	clicks: number;
	spend: number;
	leads: number;
	conversions: number;
}

// =============================================================================
// Campaign Status Types
// =============================================================================

export type CampaignApiStatus =
	| 'ACTIVE'
	| 'PAUSED'
	| 'DELETED'
	| 'ARCHIVED'
	| 'PENDING_REVIEW'
	| 'DISAPPROVED'
	| 'IN_PROCESS'
	| 'WITH_ISSUES'
	| 'CAMPAIGN_PAUSED'
	| 'ADSET_PAUSED'
	| 'PREAPPROVED';

export interface CampaignStatusInfo {
	effectiveStatus: CampaignApiStatus;
	configuredStatus: CampaignApiStatus;
	deliveryStatus?: string;
	reviewFeedback?: ReviewFeedback;
}

export interface ReviewFeedback {
	rejectionReasons?: string[];
	suggestedActions?: string[];
	policyViolations?: PolicyViolation[];
}

export interface PolicyViolation {
	policyId: string;
	policyName: string;
	description: string;
}

// =============================================================================
// Targeting Types
// =============================================================================

export interface TargetingSpec {
	ageMin?: number;
	ageMax?: number;
	genders?: ('male' | 'female' | 'all')[];
	geoLocations?: GeoLocation[];
	interests?: Interest[];
	behaviors?: Behavior[];
	customAudiences?: CustomAudience[];
	lookalikes?: LookalikeAudience[];
	deviceTypes?: string[];
	publisherPlatforms?: string[];
}

export interface GeoLocation {
	type: 'country' | 'region' | 'city' | 'zip' | 'geo_market' | 'electoral_district' | 'radius';
	key: string;
	name: string;
	radius?: number;
	radiusUnit?: 'mile' | 'kilometer';
	latitude?: number;
	longitude?: number;
}

export interface Interest {
	id: string;
	name: string;
	audienceSize?: number;
}

export interface Behavior {
	id: string;
	name: string;
	category: string;
}

export interface CustomAudience {
	id: string;
	name: string;
	approximateCount?: number;
	subtype?: string;
}

export interface LookalikeAudience {
	id: string;
	name: string;
	originAudienceId: string;
	lookalikeSSpec?: {
		country: string;
		ratio: number;
		startingRatio?: number;
	};
}

// =============================================================================
// Budget Types
// =============================================================================

export interface BudgetInfo {
	dailyBudget?: number;
	lifetimeBudget?: number;
	remainingBudget?: number;
	spentToday?: number;
	currency: string;
	budgetType: 'daily' | 'lifetime';
}

export interface BudgetUpdateRequest {
	campaignId: string;
	newBudget: number;
	budgetType: 'daily' | 'lifetime';
}

export interface BudgetUpdateResult {
	success: boolean;
	previousBudget: number;
	newBudget: number;
	effectiveFrom: Date;
	message?: string;
}

// =============================================================================
// Sync Types
// =============================================================================

export interface SyncResult {
	organizationId: string;
	platform: AdPlatform;
	campaignsProcessed: number;
	metricsInserted: number;
	errors: SyncError[];
	syncedAt: Date;
	duration: number; // milliseconds
}

export interface SyncError {
	campaignId?: string;
	error: string;
	code?: string;
	recoverable: boolean;
}

export interface SyncStatus {
	isRunning: boolean;
	lastSyncAt?: Date;
	lastSyncResult?: SyncResult;
	nextScheduledSync?: Date;
}

export interface OrganizationSyncConfig {
	organizationId: string;
	facebookAccountId?: string;
	googleAccountId?: string;
	syncEnabled: boolean;
	syncIntervalMinutes: number;
	lastSuccessfulSync?: Date;
}

// =============================================================================
// Facebook/Meta Specific Types
// =============================================================================

export interface FacebookCampaign {
	id: string;
	name: string;
	account_id: string;
	objective: FacebookObjective;
	status: CampaignApiStatus;
	effective_status: CampaignApiStatus;
	daily_budget?: string;
	lifetime_budget?: string;
	budget_remaining?: string;
	created_time: string;
	updated_time: string;
	start_time?: string;
	stop_time?: string;
}

export type FacebookObjective =
	| 'AWARENESS'
	| 'TRAFFIC'
	| 'ENGAGEMENT'
	| 'LEADS'
	| 'APP_PROMOTION'
	| 'SALES'
	| 'OUTCOME_AWARENESS'
	| 'OUTCOME_ENGAGEMENT'
	| 'OUTCOME_LEADS'
	| 'OUTCOME_SALES'
	| 'OUTCOME_TRAFFIC';

export interface FacebookInsights {
	date_start: string;
	date_stop: string;
	impressions: string;
	clicks: string;
	ctr: string;
	spend: string;
	reach?: string;
	frequency?: string;
	unique_clicks?: string;
	actions?: FacebookAction[];
	cost_per_action_type?: FacebookCostPerAction[];
	video_p25_watched_actions?: FacebookVideoAction[];
	video_p50_watched_actions?: FacebookVideoAction[];
	video_p75_watched_actions?: FacebookVideoAction[];
	video_p100_watched_actions?: FacebookVideoAction[];
}

export interface FacebookAction {
	action_type: string;
	value: string;
}

export interface FacebookCostPerAction {
	action_type: string;
	value: string;
}

export interface FacebookVideoAction {
	action_type: string;
	value: string;
}

export interface FacebookAdSet {
	id: string;
	name: string;
	campaign_id: string;
	status: CampaignApiStatus;
	effective_status: CampaignApiStatus;
	daily_budget?: string;
	lifetime_budget?: string;
	bid_strategy?: string;
	targeting?: Record<string, unknown>;
	optimization_goal?: string;
	billing_event?: string;
}

export interface FacebookAd {
	id: string;
	name: string;
	adset_id: string;
	campaign_id: string;
	status: CampaignApiStatus;
	effective_status: CampaignApiStatus;
	creative?: FacebookCreative;
}

export interface FacebookCreative {
	id: string;
	name?: string;
	title?: string;
	body?: string;
	call_to_action_type?: string;
	image_url?: string;
	video_id?: string;
	thumbnail_url?: string;
}

// =============================================================================
// Google Ads Specific Types
// =============================================================================

export interface GoogleCampaign {
	resourceName: string;
	id: string;
	name: string;
	status: GoogleCampaignStatus;
	advertisingChannelType: GoogleChannelType;
	advertisingChannelSubType?: string;
	startDate?: string;
	endDate?: string;
	campaignBudget?: string;
	biddingStrategyType?: GoogleBiddingStrategy;
}

export type GoogleCampaignStatus =
	| 'ENABLED'
	| 'PAUSED'
	| 'REMOVED'
	| 'UNKNOWN'
	| 'UNSPECIFIED';

export type GoogleChannelType =
	| 'SEARCH'
	| 'DISPLAY'
	| 'SHOPPING'
	| 'VIDEO'
	| 'MULTI_CHANNEL'
	| 'LOCAL'
	| 'SMART'
	| 'PERFORMANCE_MAX'
	| 'LOCAL_SERVICES'
	| 'DISCOVERY'
	| 'TRAVEL';

export type GoogleBiddingStrategy =
	| 'MANUAL_CPC'
	| 'MANUAL_CPM'
	| 'MANUAL_CPV'
	| 'MAXIMIZE_CONVERSIONS'
	| 'MAXIMIZE_CONVERSION_VALUE'
	| 'TARGET_CPA'
	| 'TARGET_ROAS'
	| 'TARGET_SPEND'
	| 'TARGET_IMPRESSION_SHARE';

export interface GoogleAdGroup {
	resourceName: string;
	id: string;
	name: string;
	campaignId: string;
	status: GoogleCampaignStatus;
	type: GoogleAdGroupType;
	cpcBidMicros?: string;
	cpmBidMicros?: string;
}

export type GoogleAdGroupType =
	| 'SEARCH_STANDARD'
	| 'SEARCH_DYNAMIC_ADS'
	| 'DISPLAY_STANDARD'
	| 'SHOPPING_PRODUCT_ADS'
	| 'VIDEO_STANDARD'
	| 'VIDEO_NON_SKIPPABLE'
	| 'VIDEO_TRUE_VIEW_IN_STREAM'
	| 'VIDEO_TRUE_VIEW_IN_DISPLAY'
	| 'VIDEO_BUMPER';

export interface GoogleMetrics {
	date: string;
	impressions: string;
	clicks: string;
	ctr: string;
	costMicros: string;
	conversions: string;
	conversionsValue: string;
	costPerConversion?: string;
	averageCpc?: string;
	averageCpm?: string;
	videoViews?: string;
	videoViewRate?: string;
}

export interface GoogleBudget {
	resourceName: string;
	id: string;
	name?: string;
	amountMicros: string;
	deliveryMethod: 'STANDARD' | 'ACCELERATED';
	status: 'ENABLED' | 'REMOVED';
}

// =============================================================================
// API Client Configuration Types
// =============================================================================

export interface FacebookApiConfig {
	appId: string;
	appSecret: string;
	accessToken: string;
	apiVersion: string;
}

export interface GoogleAdsApiConfig {
	developerToken: string;
	clientId: string;
	clientSecret: string;
	refreshToken: string;
	loginCustomerId?: string;
}

export interface AdPlatformConfig {
	facebook?: FacebookApiConfig;
	google?: GoogleAdsApiConfig;
}

// =============================================================================
// Mock Data Helpers
// =============================================================================

export interface MockDataOptions {
	campaignId?: string;
	dateRange?: DateRange;
	platform?: AdPlatform;
	simulateLatency?: boolean;
	latencyMs?: number;
}
