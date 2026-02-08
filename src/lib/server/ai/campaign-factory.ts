/**
 * Campaign Factory
 * Automated end-to-end campaign creation pipeline
 */

import type {
  CampaignFactoryRequest,
  CampaignFactoryResult,
  CampaignBlueprint,
  AdSetConfig,
  GeneratedAdVariant,
  LandingPageContent,
  BrandVoiceProfile,
  TargetAudience,
  TerritoryInfo,
  AdPlatform,
  CampaignObjective,
  AIModelConfig
} from './types';
import { DEFAULT_AI_CONFIG } from './types';

import { AdCopyGenerator } from './ad-generator';
import { LandingPageGenerator } from './landing-generator';

// ============================================================================
// Constants
// ============================================================================

const PLATFORM_RECOMMENDATIONS = {
  google: {
    minDailyBudget: 30,
    recommendedAdSets: 2,
    adsPerAdSet: 3,
    defaultPlacements: ['search', 'display']
  },
  facebook: {
    minDailyBudget: 20,
    recommendedAdSets: 3,
    adsPerAdSet: 4,
    defaultPlacements: ['feed', 'stories', 'audience_network']
  },
  instagram: {
    minDailyBudget: 20,
    recommendedAdSets: 2,
    adsPerAdSet: 4,
    defaultPlacements: ['feed', 'stories', 'reels']
  },
  meta: {
    minDailyBudget: 40,
    recommendedAdSets: 3,
    adsPerAdSet: 5,
    defaultPlacements: ['facebook_feed', 'instagram_feed', 'stories', 'reels']
  }
};

const AUDIENCE_TEMPLATES = {
  lead_gen: {
    primary: {
      name: 'High-Intent Dental Implant Seekers',
      ageMin: 45,
      ageMax: 70,
      interests: ['dental health', 'dental care', 'health and wellness'],
      behaviors: ['engaged shoppers', 'health conscious'],
      incomeLevel: 'high' as const
    },
    secondary: {
      name: 'Caregivers & Family Decision Makers',
      ageMin: 35,
      ageMax: 60,
      interests: ['family', 'healthcare', 'senior care'],
      behaviors: ['frequent online purchasers'],
      incomeLevel: 'medium' as const
    },
    broad: {
      name: 'General Dental Interest',
      ageMin: 35,
      ageMax: 65,
      interests: ['dentist', 'oral health'],
      incomeLevel: 'medium' as const
    }
  },
  awareness: {
    primary: {
      name: 'Local Community Reach',
      ageMin: 30,
      ageMax: 65,
      interests: ['local events', 'community', 'health'],
      incomeLevel: 'medium' as const
    },
    broad: {
      name: 'Health-Conscious Adults',
      ageMin: 25,
      ageMax: 65,
      interests: ['health and wellness', 'self-improvement'],
      incomeLevel: 'medium' as const
    }
  },
  retargeting: {
    primary: {
      name: 'Website Visitors',
      customAudiences: ['website_visitors_30d'],
      excludeAudiences: ['converted_leads']
    },
    secondary: {
      name: 'Engaged Users',
      customAudiences: ['video_viewers_50', 'page_engagers'],
      excludeAudiences: ['website_visitors_30d', 'converted_leads']
    }
  }
};

// ============================================================================
// Campaign Factory Class
// ============================================================================

export class CampaignFactory {
  private config: AIModelConfig;
  private adGenerator: AdCopyGenerator;
  private landingGenerator: LandingPageGenerator;

  constructor(config: Partial<AIModelConfig> = {}) {
    this.config = { ...DEFAULT_AI_CONFIG, ...config };
    this.adGenerator = new AdCopyGenerator(config);
    this.landingGenerator = new LandingPageGenerator(config);
  }

  /**
   * Create a complete campaign blueprint
   */
  async createCampaign(request: CampaignFactoryRequest): Promise<CampaignFactoryResult> {
    const startTime = Date.now();

    // Validate request
    const validation = this.validateRequest(request);
    if (validation.errors.length > 0) {
      return this.createErrorResult(validation.errors, startTime);
    }

    // Generate campaign structure
    const campaignConfig = this.generateCampaignConfig(request);
    const adSets = this.generateAdSets(request);
    const ads = await this.generateAds(request, adSets);
    const landingPage = request.createLandingPage
      ? await this.generateLandingPage(request)
      : undefined;
    const trackingSetup = this.generateTrackingSetup(request);
    const launchChecklist = this.generateLaunchChecklist(request, !!landingPage);

    const blueprint: CampaignBlueprint = {
      campaign: campaignConfig,
      adSets,
      ads,
      landingPage,
      trackingSetup,
      launchChecklist
    };

    // Calculate estimated performance
    const estimatedPerformance = this.estimatePerformance(request, blueprint);

    // Calculate readiness score
    const { readinessScore, blockers, warnings } = this.assessReadiness(blueprint, request);

    const processingTimeMs = Date.now() - startTime;

    return {
      blueprint,
      estimatedPerformance,
      readinessScore,
      blockers,
      warnings,
      metadata: {
        generatedAt: new Date(),
        processingTimeMs,
        modelVersion: this.config.model
      }
    };
  }

  /**
   * Create multiple campaign variants for testing
   */
  async createCampaignVariants(
    request: CampaignFactoryRequest,
    variantCount: number = 3
  ): Promise<CampaignFactoryResult[]> {
    const variants: CampaignFactoryResult[] = [];

    // Vary the campaign approach for each variant
    const approaches = ['aggressive', 'balanced', 'conservative'];

    for (let i = 0; i < Math.min(variantCount, 3); i++) {
      const adjustedRequest = this.adjustRequestForVariant(request, approaches[i]);
      const result = await this.createCampaign(adjustedRequest);
      variants.push(result);
    }

    return variants;
  }

  // ============================================================================
  // Campaign Structure Generation
  // ============================================================================

  private generateCampaignConfig(request: CampaignFactoryRequest) {
    const { platform, campaignType, territory, monthlyBudget, startDate } = request;
    const platformConfig = PLATFORM_RECOMMENDATIONS[platform];

    const dailyBudget = Math.max(
      platformConfig.minDailyBudget,
      Math.round(monthlyBudget / 30)
    );

    return {
      name: this.generateCampaignName(platform, campaignType, territory),
      platform,
      campaignType,
      objective: this.getObjectiveString(campaignType),
      dailyBudget,
      monthlyBudget,
      startDate: startDate || new Date(),
      targetAudience: this.getPrimaryAudience(campaignType, territory)
    };
  }

  private generateCampaignName(
    platform: AdPlatform,
    type: CampaignObjective,
    territory: TerritoryInfo
  ): string {
    const typeLabel = {
      lead_gen: 'Lead Gen',
      awareness: 'Awareness',
      retargeting: 'Retarget'
    };

    const platformLabel = {
      google: 'GGL',
      facebook: 'FB',
      instagram: 'IG',
      meta: 'META'
    };

    const date = new Date().toISOString().slice(0, 7); // YYYY-MM

    return `${platformLabel[platform]} | ${typeLabel[type]} | ${territory.city} ${territory.state} | ${date}`;
  }

  private getObjectiveString(type: CampaignObjective): string {
    const objectives = {
      lead_gen: 'Generate qualified leads for dental implant consultations',
      awareness: 'Increase brand awareness and reach in target territory',
      retargeting: 'Re-engage website visitors and drive conversions'
    };
    return objectives[type];
  }

  private getPrimaryAudience(type: CampaignObjective, territory: TerritoryInfo): TargetAudience {
    const template = AUDIENCE_TEMPLATES[type].primary;
    return {
      ...template,
      // Add territory-specific targeting would go here
    };
  }

  // ============================================================================
  // Ad Set Generation
  // ============================================================================

  private generateAdSets(request: CampaignFactoryRequest): AdSetConfig[] {
    const { platform, campaignType, monthlyBudget, territory } = request;
    const platformConfig = PLATFORM_RECOMMENDATIONS[platform];

    const adSets: AdSetConfig[] = [];
    const templates = AUDIENCE_TEMPLATES[campaignType];

    // Primary audience ad set
    if (templates.primary) {
      adSets.push({
        name: `${territory.city} - ${(templates.primary as TargetAudience & { name: string }).name || 'Primary'}`,
        targetAudience: templates.primary,
        budgetPercent: 50,
        objective: campaignType === 'lead_gen' ? 'Conversions' : 'Reach',
        placement: platformConfig.defaultPlacements
      });
    }

    // Secondary audience ad set
    if ('secondary' in templates && templates.secondary) {
      adSets.push({
        name: `${territory.city} - ${(templates.secondary as TargetAudience & { name: string }).name || 'Secondary'}`,
        targetAudience: templates.secondary as TargetAudience,
        budgetPercent: 30,
        objective: campaignType === 'lead_gen' ? 'Conversions' : 'Reach',
        placement: platformConfig.defaultPlacements
      });
    }

    // Broad audience for awareness/testing
    if ('broad' in templates && templates.broad && campaignType !== 'retargeting') {
      adSets.push({
        name: `${territory.city} - ${(templates.broad as TargetAudience & { name: string }).name || 'Broad'}`,
        targetAudience: templates.broad as TargetAudience,
        budgetPercent: 20,
        objective: 'Traffic',
        placement: platformConfig.defaultPlacements
      });
    }

    return adSets;
  }

  // ============================================================================
  // Ad Generation
  // ============================================================================

  private async generateAds(
    request: CampaignFactoryRequest,
    adSets: AdSetConfig[]
  ): Promise<GeneratedAdVariant[]> {
    const { voiceProfile, territory, platform, campaignType } = request;
    const variantCount = request.adVariantCount || 5;

    const result = await this.adGenerator.generateAdCopy({
      platform,
      campaignType,
      voiceProfile,
      territory,
      targetAudience: adSets[0]?.targetAudience || {},
      variantCount
    });

    return result.variants;
  }

  // ============================================================================
  // Landing Page Generation
  // ============================================================================

  private async generateLandingPage(
    request: CampaignFactoryRequest
  ): Promise<LandingPageContent | undefined> {
    const { voiceProfile, territory, campaignType, organizationId } = request;

    const result = await this.landingGenerator.generateLandingPage({
      voiceProfile,
      campaignType,
      territory,
      organizationName: 'Our Practice', // Would be fetched from DB
      serviceFocus: 'dental implants',
      includeFaq: true,
      includeUrgency: campaignType === 'lead_gen',
      testimonialGuidance: true
    });

    return result.content;
  }

  // ============================================================================
  // Tracking Setup
  // ============================================================================

  private generateTrackingSetup(request: CampaignFactoryRequest) {
    const { platform, territory } = request;

    const utmParams = {
      utm_source: platform,
      utm_medium: 'paid',
      utm_campaign: `implants_${territory.city.toLowerCase().replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 7)}`,
      utm_content: '{{ad.name}}'
    };

    const pixels = [];
    if (platform === 'facebook' || platform === 'instagram' || platform === 'meta') {
      pixels.push('Facebook Pixel');
    }
    if (platform === 'google') {
      pixels.push('Google Ads Conversion Tag', 'Google Analytics 4');
    }

    const conversionEvents = [
      'Lead Form Submission',
      'Phone Call Click',
      'Appointment Scheduled',
      'Thank You Page View'
    ];

    return {
      pixels,
      utmParams,
      conversionEvents
    };
  }

  // ============================================================================
  // Launch Checklist
  // ============================================================================

  private generateLaunchChecklist(
    request: CampaignFactoryRequest,
    hasLandingPage: boolean
  ): string[] {
    const checklist: string[] = [];

    // Voice profile check
    checklist.push('Verify brand voice profile is approved');

    // Ad copy review
    checklist.push('Review and approve all ad copy variants');
    checklist.push('Ensure ad copy follows platform policies');

    // Creative assets
    checklist.push('Upload required images/videos for ads');
    checklist.push('Verify image dimensions meet platform requirements');

    // Landing page
    if (hasLandingPage) {
      checklist.push('Review and approve landing page content');
      checklist.push('Test landing page form submission');
      checklist.push('Verify thank you page and confirmation email');
    } else {
      checklist.push('Configure destination URL for ads');
    }

    // Tracking
    checklist.push('Install and verify tracking pixels');
    checklist.push('Set up conversion events');
    checklist.push('Test UTM parameter tracking');

    // Platform specific
    if (request.platform === 'google') {
      checklist.push('Set up Google Ads conversion actions');
      checklist.push('Configure bid strategy');
      checklist.push('Review keyword targeting');
    } else {
      checklist.push('Configure Facebook/Meta pixel events');
      checklist.push('Set up Conversions API if available');
      checklist.push('Verify audience targeting');
    }

    // Final review
    checklist.push('Verify budget and schedule settings');
    checklist.push('Set up automated rules for monitoring');
    checklist.push('Configure notification alerts for campaign issues');

    return checklist;
  }

  // ============================================================================
  // Performance Estimation
  // ============================================================================

  private estimatePerformance(
    request: CampaignFactoryRequest,
    blueprint: CampaignBlueprint
  ) {
    const { monthlyBudget, platform, campaignType, targetCpl } = request;

    // Industry benchmarks for dental implants
    const benchmarks = {
      ctr: platform === 'google' ? 3.5 : 1.2,
      conversionRate: 0.04,
      cpl: targetCpl || 120
    };

    // Estimate based on budget and benchmarks
    const projectedLeads = Math.round(monthlyBudget / benchmarks.cpl);
    const projectedConversions = Math.round(projectedLeads * benchmarks.conversionRate);
    const avgCaseValue = 4000; // Dental implant case value

    return {
      projectedLeads,
      projectedCpl: benchmarks.cpl,
      projectedConversions,
      projectedRoas: (projectedConversions * avgCaseValue) / monthlyBudget
    };
  }

  // ============================================================================
  // Readiness Assessment
  // ============================================================================

  private assessReadiness(
    blueprint: CampaignBlueprint,
    request: CampaignFactoryRequest
  ): { readinessScore: number; blockers: string[]; warnings: string[] } {
    let score = 100;
    const blockers: string[] = [];
    const warnings: string[] = [];

    // Voice profile check
    if (request.voiceProfile.status !== 'approved') {
      score -= 30;
      blockers.push('Brand voice profile must be approved before launch');
    }

    // Budget check
    const minBudget = PLATFORM_RECOMMENDATIONS[request.platform].minDailyBudget * 30;
    if (request.monthlyBudget < minBudget) {
      score -= 10;
      warnings.push(`Monthly budget below recommended minimum ($${minBudget})`);
    }

    // Ad variants check
    if (blueprint.ads.length < 3) {
      score -= 10;
      warnings.push('Recommend at least 3 ad variants for effective A/B testing');
    }

    // Landing page check
    if (request.createLandingPage && !blueprint.landingPage) {
      score -= 20;
      blockers.push('Landing page generation failed');
    }

    // Territory data check
    if (!request.territory.population) {
      score -= 5;
      warnings.push('Territory population data missing - targeting may be less precise');
    }

    // Ad set balance check
    const totalBudgetPercent = blueprint.adSets.reduce((sum, as) => sum + as.budgetPercent, 0);
    if (totalBudgetPercent !== 100) {
      score -= 5;
      warnings.push(`Ad set budgets total ${totalBudgetPercent}% - should be 100%`);
    }

    return {
      readinessScore: Math.max(0, score),
      blockers,
      warnings
    };
  }

  // ============================================================================
  // Validation
  // ============================================================================

  private validateRequest(request: CampaignFactoryRequest): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (!request.organizationId) {
      errors.push('Organization ID is required');
    }

    if (!request.voiceProfile) {
      errors.push('Voice profile is required');
    }

    if (!request.territory || !request.territory.city) {
      errors.push('Territory information is required');
    }

    if (!request.platform) {
      errors.push('Platform is required');
    }

    if (!request.monthlyBudget || request.monthlyBudget < 100) {
      errors.push('Monthly budget must be at least $100');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  private createErrorResult(errors: string[], startTime: number): CampaignFactoryResult {
    return {
      blueprint: {
        campaign: {
          name: '',
          platform: 'facebook',
          campaignType: 'lead_gen',
          objective: '',
          dailyBudget: 0,
          monthlyBudget: 0,
          startDate: new Date(),
          targetAudience: {}
        },
        adSets: [],
        ads: [],
        trackingSetup: {
          pixels: [],
          utmParams: {},
          conversionEvents: []
        },
        launchChecklist: []
      },
      estimatedPerformance: {
        projectedLeads: 0,
        projectedCpl: 0,
        projectedConversions: 0
      },
      readinessScore: 0,
      blockers: errors,
      warnings: [],
      metadata: {
        generatedAt: new Date(),
        processingTimeMs: Date.now() - startTime,
        modelVersion: this.config.model
      }
    };
  }

  // ============================================================================
  // Variant Adjustment
  // ============================================================================

  private adjustRequestForVariant(
    request: CampaignFactoryRequest,
    approach: string
  ): CampaignFactoryRequest {
    const adjusted = { ...request };

    switch (approach) {
      case 'aggressive':
        adjusted.adVariantCount = 8;
        adjusted.monthlyBudget = request.monthlyBudget * 1.2;
        break;
      case 'conservative':
        adjusted.adVariantCount = 3;
        adjusted.monthlyBudget = request.monthlyBudget * 0.8;
        break;
      default:
        // balanced - keep as is
        break;
    }

    return adjusted;
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Create a new campaign factory instance
 */
export function createCampaignFactory(config?: Partial<AIModelConfig>): CampaignFactory {
  return new CampaignFactory(config);
}

/**
 * Quick helper to generate a full campaign
 */
export async function generateCampaign(
  request: CampaignFactoryRequest
): Promise<CampaignFactoryResult> {
  const factory = new CampaignFactory();
  return factory.createCampaign(request);
}

export default CampaignFactory;
