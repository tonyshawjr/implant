/**
 * AI Module Index
 *
 * Exports all AI-related services for the Brand Voice Engine (Phase 8A)
 */

// AI Client
export {
  ai,
  complete,
  prompt,
  parseJSONResponse,
  estimateTokens,
  estimateMessagesTokens,
  type AIProvider,
  type AIMessage,
  type AICompletionOptions,
  type AICompletionResponse,
  type TokenCount
} from './client';

// Web Scraper
export {
  scraper,
  scrapeWebsite,
  scrapeFacebook,
  scrapeInstagram,
  scrapeGoogleBusiness,
  scrapeMultipleSources,
  stripHtml,
  sanitizeContent,
  extractSentences,
  type ScrapedContent,
  type WebsiteContent,
  type SocialMediaContent,
  type GoogleBusinessContent,
  type MultiSourceResult
} from './scraper';

// Voice Analyzer
export {
  voiceAnalyzer,
  analyzeVoice,
  analyzeMultipleSources,
  prepareContentForAnalysis,
  extractKeyContent,
  compareAnalyses,
  type ToneType,
  type FormalityLevel,
  type VoiceCharacteristics,
  type VoiceAnalysis,
  type AnalysisResult
} from './voice-analyzer';

// Voice Generator
export {
  voiceGenerator,
  generateVoiceProfile,
  generateWritingGuidelines,
  generateInitialContent,
  applyVoiceAdjustment,
  generateGuidelinesDocument,
  type VoiceProfile,
  type WritingGuidelines,
  type VoiceAdjustment,
  type GeneratedContent
} from './voice-generator';

// Content Generator
export {
  contentGenerator,
  generateContent,
  generateHeadlines,
  generateAdCopy,
  generateCTAs,
  generateEmailTemplate,
  generateSocialPosts,
  generateLandingPageContent,
  generateBlogOutline,
  generateSMSMessages,
  generateReviewResponse,
  generateBatchContent,
  type ContentType,
  type ContentRequest,
  type GeneratedContentItem,
  type ContentGenerationResult,
  type EmailTemplate,
  type LandingPageContent,
  type BlogOutline,
  type BatchContentRequest,
  type BatchContentResult
} from './content-generator';

// Voice Learner
export {
  voiceLearner,
  recordApproval,
  recordRejection,
  recordEdit,
  getFeedbackHistory,
  getFeedbackStats,
  analyzeFeedbackPatterns,
  suggestProfileRefinements,
  applyProfileRefinements,
  getLearningData,
  updateLearningData,
  clearLearningData,
  type ContentFeedback,
  type LearningPattern,
  type VoiceLearningData,
  type LearningAnalysisResult,
  type ProfileRefinementResult
} from './voice-learner';

// Ad Copy Generator
export { AdCopyGenerator } from './ad-generator';

// Landing Page Generator
export { LandingPageGenerator } from './landing-generator';

// Campaign Factory
export { CampaignFactory } from './campaign-factory';

// A/B Test Variant Generator
export { ABTestVariantGenerator } from './ab-generator';

// Performance Optimizer
export { PerformanceOptimizer } from './optimizer';

// Re-export types from types.ts
export type {
  AdPlatform,
  CampaignObjective,
  BrandVoiceProfile,
  AdCopyRequest,
  AdGenerationResult,
  GeneratedAdVariant,
  LandingPageRequest,
  LandingPageGenerationResult,
  CampaignFactoryRequest,
  CampaignFactoryResult,
  ABTestVariantRequest,
  ABTestResult,
  ABTestVariant,
  TargetAudience,
  TerritoryInfo,
  CampaignPerformanceData,
  PerformanceAnalysis,
  OptimizationRecommendation
} from './types';
