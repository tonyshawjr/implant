/**
 * AI Campaign & Content Generation Types
 * Phase 8B - Campaign & Ad Generation AI System
 */

// ============================================================================
// Brand Voice Types (from Phase 8A integration)
// ============================================================================

export interface BrandVoiceProfile {
  id: string;
  organizationId: string;
  name: string;
  status: 'pending' | 'analyzing' | 'in_review' | 'approved' | 'rejected';
  tone: string | null;
  personality: string | null;
  formalityLevel: 'formal' | 'professional' | 'casual' | 'friendly' | null;
  targetAudience: string | null;
  keyDifferentiators: string[] | null;
  avoidTerms: string[] | null;
  preferredTerms: string[] | null;
  sampleHeadlines: string[] | null;
  sampleAdCopy: string[] | null;
  sampleCtas: string[] | null;
  qualityScore: number | null;
}

// ============================================================================
// Ad Generation Types
// ============================================================================

export type AdPlatform = 'google' | 'facebook' | 'instagram' | 'meta';
export type AdFormat = 'text' | 'image' | 'video' | 'carousel';
export type CampaignObjective = 'lead_gen' | 'awareness' | 'retargeting';

export interface AdCopyRequest {
  platform: AdPlatform;
  campaignType: CampaignObjective;
  voiceProfile: BrandVoiceProfile;
  targetAudience: TargetAudience;
  territory: TerritoryInfo;
  variantCount?: number;
  includeEmoji?: boolean;
  maxHeadlineLength?: number;
  maxDescriptionLength?: number;
  customPrompt?: string;
}

export interface FacebookAdCopy {
  primaryText: string;
  headline: string;
  description: string;
  linkDescription?: string;
  callToAction: string;
}

export interface GoogleAdCopy {
  headlines: string[]; // Up to 15, each max 30 chars
  descriptions: string[]; // Up to 4, each max 90 chars
  paths?: string[]; // Display URL paths
}

export interface GeneratedAdVariant {
  id: string;
  platform: AdPlatform;
  format: AdFormat;
  content: FacebookAdCopy | GoogleAdCopy;
  predictedScore: number;
  reasoning: string;
  tags: string[];
  createdAt: Date;
}

export interface AdGenerationResult {
  variants: GeneratedAdVariant[];
  voiceConsistencyScore: number;
  recommendations: string[];
  metadata: {
    generatedAt: Date;
    processingTimeMs: number;
    modelVersion: string;
  };
}

// ============================================================================
// Landing Page Generation Types
// ============================================================================

export interface LandingPageRequest {
  voiceProfile: BrandVoiceProfile;
  campaignType: CampaignObjective;
  territory: TerritoryInfo;
  organizationName: string;
  serviceFocus: string; // e.g., "dental implants"
  uniqueSellingPoints?: string[];
  testimonialGuidance?: boolean;
  includeFaq?: boolean;
  includeUrgency?: boolean;
}

export interface LandingPageHeadline {
  main: string;
  sub: string;
  supportingText?: string;
}

export interface LandingPageSection {
  type: 'hero' | 'benefits' | 'process' | 'testimonial' | 'cta' | 'faq' | 'trust';
  headline: string;
  body: string;
  bulletPoints?: string[];
  ctaText?: string;
}

export interface FaqItem {
  question: string;
  answer: string;
}

export interface LandingPageContent {
  metaTitle: string;
  metaDescription: string;
  headline: LandingPageHeadline;
  sections: LandingPageSection[];
  faqs: FaqItem[];
  socialProofText: string[];
  urgencyElements: string[];
  trustBadgeText: string[];
  formHeadline: string;
  formSubheadline: string;
  formButtonText: string;
  thankYouMessage: string;
}

export interface LandingPageGenerationResult {
  content: LandingPageContent;
  alternativeHeadlines: LandingPageHeadline[];
  alternativeCtas: string[];
  voiceConsistencyScore: number;
  metadata: {
    generatedAt: Date;
    processingTimeMs: number;
    modelVersion: string;
  };
}

// ============================================================================
// A/B Testing Types
// ============================================================================

export interface ABTestVariantRequest {
  originalContent: string;
  contentType: 'headline' | 'body' | 'cta' | 'description';
  voiceProfile: BrandVoiceProfile;
  variantCount: number;
  testHypothesis?: string;
  focusAreas?: ('urgency' | 'social_proof' | 'benefit' | 'emotional' | 'logical')[];
}

export interface ABTestVariant {
  id: string;
  content: string;
  hypothesis: string;
  predictedLiftPercent: number;
  confidence: number; // 0-1
  rationale: string;
  testApproach: string;
  tags: string[];
}

export interface ABTestResult {
  variants: ABTestVariant[];
  recommendedWinner: string;
  statisticalSignificanceRequired: number;
  estimatedSampleSize: number;
  metadata: {
    generatedAt: Date;
    processingTimeMs: number;
  };
}

// ============================================================================
// Performance Optimization Types
// ============================================================================

export interface CampaignPerformanceData {
  campaignId: string;
  platform: AdPlatform;
  metrics: {
    impressions: number;
    clicks: number;
    ctr: number;
    spend: number;
    leads: number;
    cpl: number;
    conversions: number;
    cpa: number;
    roas?: number;
  };
  historicalTrend: {
    date: string;
    impressions: number;
    clicks: number;
    spend: number;
    leads: number;
  }[];
  creatives: {
    id: string;
    headline: string;
    impressions: number;
    clicks: number;
    ctr: number;
    leads: number;
  }[];
  audienceBreakdown?: {
    segment: string;
    performance: number;
    spend: number;
  }[];
}

export type OptimizationType =
  | 'bid_adjustment'
  | 'audience_change'
  | 'budget_change'
  | 'creative_swap'
  | 'pause_ad'
  | 'scale_ad';

export type OptimizationPriority = 'high' | 'medium' | 'low';

export interface OptimizationRecommendation {
  id: string;
  type: OptimizationType;
  priority: OptimizationPriority;
  title: string;
  description: string;
  reasoning: string;
  expectedImpact: {
    metric: string;
    currentValue: number;
    projectedValue: number;
    improvementPercent: number;
  };
  actionSteps: string[];
  confidence: number; // 0-1
  autoApplicable: boolean;
  previousValue?: unknown;
  suggestedValue?: unknown;
}

export interface PerformanceAnalysis {
  summary: string;
  healthScore: number; // 0-100
  topIssues: string[];
  topOpportunities: string[];
  recommendations: OptimizationRecommendation[];
  budgetAllocation: {
    current: { campaignId: string; budget: number; performance: number }[];
    recommended: { campaignId: string; budget: number; reasoning: string }[];
  };
  creativeInsights: {
    topPerformers: string[];
    underperformers: string[];
    fatigueAlerts: string[];
  };
  metadata: {
    analyzedAt: Date;
    dataRangeStart: Date;
    dataRangeEnd: Date;
    processingTimeMs: number;
  };
}

// ============================================================================
// Campaign Factory Types
// ============================================================================

export interface CampaignFactoryRequest {
  organizationId: string;
  voiceProfile: BrandVoiceProfile;
  territory: TerritoryInfo;
  platform: AdPlatform;
  campaignType: CampaignObjective;
  monthlyBudget: number;
  startDate?: Date;
  targetCpl?: number;
  adVariantCount?: number;
  createLandingPage?: boolean;
}

export interface AdSetConfig {
  name: string;
  targetAudience: TargetAudience;
  budgetPercent: number;
  objective: string;
  placement?: string[];
}

export interface CampaignBlueprint {
  campaign: {
    name: string;
    platform: AdPlatform;
    campaignType: CampaignObjective;
    objective: string;
    dailyBudget: number;
    monthlyBudget: number;
    startDate: Date;
    targetAudience: TargetAudience;
  };
  adSets: AdSetConfig[];
  ads: GeneratedAdVariant[];
  landingPage?: LandingPageContent;
  trackingSetup: {
    pixels: string[];
    utmParams: Record<string, string>;
    conversionEvents: string[];
  };
  launchChecklist: string[];
}

export interface CampaignFactoryResult {
  blueprint: CampaignBlueprint;
  estimatedPerformance: {
    projectedLeads: number;
    projectedCpl: number;
    projectedConversions: number;
    projectedRoas?: number;
  };
  readinessScore: number;
  blockers: string[];
  warnings: string[];
  metadata: {
    generatedAt: Date;
    processingTimeMs: number;
    modelVersion: string;
  };
}

// ============================================================================
// Creative Asset Types
// ============================================================================

export interface CreativeAnalysisRequest {
  assetUrl?: string;
  assetType: 'image' | 'video';
  campaignType: CampaignObjective;
  platform: AdPlatform;
  voiceProfile: BrandVoiceProfile;
}

export interface CreativeRecommendation {
  id: string;
  type: 'image' | 'video' | 'carousel';
  concept: string;
  description: string;
  styleGuide: string[];
  colorPalette: string[];
  textOverlay?: string;
  predictedPerformance: number;
  reasoning: string;
  examplePrompt?: string;
}

export interface CreativeAnalysisResult {
  recommendations: CreativeRecommendation[];
  topPerformingStyles: string[];
  avoidStyles: string[];
  imageAltText: string[];
  videoConceptStoryboard?: {
    scene: number;
    description: string;
    duration: string;
    textOverlay?: string;
  }[];
  metadata: {
    analyzedAt: Date;
    processingTimeMs: number;
  };
}

// ============================================================================
// Supporting Types
// ============================================================================

export interface TerritoryInfo {
  id: string;
  name: string;
  city: string;
  state: string;
  radiusMiles: number;
  population?: number;
  medianIncome?: number;
  medianAge?: number;
}

export interface TargetAudience {
  ageMin?: number;
  ageMax?: number;
  genders?: ('male' | 'female' | 'all')[];
  interests?: string[];
  behaviors?: string[];
  incomeLevel?: 'low' | 'medium' | 'high' | 'affluent';
  excludeAudiences?: string[];
  customAudiences?: string[];
  lookalikes?: string[];
}

// ============================================================================
// AI Model Configuration
// ============================================================================

export interface AIModelConfig {
  provider: 'openai' | 'anthropic' | 'mock';
  model: string;
  temperature: number;
  maxTokens: number;
  systemPrompt?: string;
}

export const DEFAULT_AI_CONFIG: AIModelConfig = {
  provider: 'mock',
  model: 'gpt-4',
  temperature: 0.7,
  maxTokens: 2000
};

// ============================================================================
// API Response Types
// ============================================================================

export interface AIGenerationResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}
