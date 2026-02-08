/**
 * A/B Test Variant Generator
 * Generates alternative content versions for A/B testing with predicted performance
 */

import type {
  ABTestVariantRequest,
  ABTestVariant,
  ABTestResult,
  BrandVoiceProfile,
  AIModelConfig
} from './types';
import { DEFAULT_AI_CONFIG } from './types';

// ============================================================================
// Constants
// ============================================================================

const FOCUS_AREA_STRATEGIES: Record<string, string[]> = {
  urgency: [
    'Add time-limited language',
    'Emphasize scarcity',
    'Create fear of missing out',
    'Use countdown-style phrasing'
  ],
  social_proof: [
    'Add patient count or statistics',
    'Reference ratings or reviews',
    'Mention awards or recognition',
    'Include trust signals'
  ],
  benefit: [
    'Lead with outcome',
    'Focus on transformation',
    'Highlight specific advantages',
    'Quantify the benefit'
  ],
  emotional: [
    'Appeal to confidence',
    'Address pain points',
    'Use aspirational language',
    'Create emotional connection'
  ],
  logical: [
    'Present facts and data',
    'Use comparison',
    'Highlight process clarity',
    'Emphasize expertise'
  ]
};

// ============================================================================
// A/B Test Variant Generator Class
// ============================================================================

export class ABTestVariantGenerator {
  private config: AIModelConfig;

  constructor(config: Partial<AIModelConfig> = {}) {
    this.config = { ...DEFAULT_AI_CONFIG, ...config };
  }

  /**
   * Generate A/B test variants for content
   */
  async generateVariants(request: ABTestVariantRequest): Promise<ABTestResult> {
    const startTime = Date.now();
    const variantCount = Math.min(request.variantCount, 10);

    const variants =
      this.config.provider === 'mock'
        ? this.generateMockVariants(request, variantCount)
        : await this.generateWithAI(request, variantCount);

    const processingTimeMs = Date.now() - startTime;

    // Sort by predicted lift to find recommended winner
    const sortedVariants = [...variants].sort(
      (a, b) => b.predictedLiftPercent - a.predictedLiftPercent
    );

    return {
      variants,
      recommendedWinner: sortedVariants[0]?.id || '',
      statisticalSignificanceRequired: 0.95,
      estimatedSampleSize: this.calculateSampleSize(variants),
      metadata: {
        generatedAt: new Date(),
        processingTimeMs
      }
    };
  }

  /**
   * Generate headline variants
   */
  async generateHeadlineVariants(
    originalHeadline: string,
    voiceProfile: BrandVoiceProfile,
    count: number = 5
  ): Promise<ABTestResult> {
    return this.generateVariants({
      originalContent: originalHeadline,
      contentType: 'headline',
      voiceProfile,
      variantCount: count
    });
  }

  /**
   * Generate CTA variants
   */
  async generateCtaVariants(
    originalCta: string,
    voiceProfile: BrandVoiceProfile,
    count: number = 5
  ): Promise<ABTestResult> {
    return this.generateVariants({
      originalContent: originalCta,
      contentType: 'cta',
      voiceProfile,
      variantCount: count
    });
  }

  /**
   * Generate body copy variants
   */
  async generateBodyVariants(
    originalBody: string,
    voiceProfile: BrandVoiceProfile,
    count: number = 3
  ): Promise<ABTestResult> {
    return this.generateVariants({
      originalContent: originalBody,
      contentType: 'body',
      voiceProfile,
      variantCount: count
    });
  }

  // ============================================================================
  // Mock Variant Generation
  // ============================================================================

  private generateMockVariants(
    request: ABTestVariantRequest,
    count: number
  ): ABTestVariant[] {
    const { originalContent, contentType, voiceProfile, focusAreas } = request;
    const variants: ABTestVariant[] = [];

    // First variant is always the control (original)
    variants.push({
      id: `variant-control-${Date.now()}`,
      content: originalContent,
      hypothesis: 'Control - original content',
      predictedLiftPercent: 0,
      confidence: 1,
      rationale: 'This is the baseline control variant for comparison.',
      testApproach: 'A/B split test',
      tags: ['control', contentType]
    });

    // Generate test variants based on content type
    const testVariants =
      contentType === 'headline'
        ? this.generateHeadlineTestVariants(originalContent, voiceProfile, focusAreas)
        : contentType === 'cta'
          ? this.generateCtaTestVariants(originalContent, voiceProfile, focusAreas)
          : contentType === 'body'
            ? this.generateBodyTestVariants(originalContent, voiceProfile, focusAreas)
            : this.generateDescriptionTestVariants(originalContent, voiceProfile, focusAreas);

    // Add variants up to count
    for (let i = 0; i < Math.min(count - 1, testVariants.length); i++) {
      variants.push({
        id: `variant-${i + 1}-${Date.now()}`,
        ...testVariants[i],
        tags: [contentType, ...testVariants[i].tags]
      });
    }

    return variants;
  }

  private generateHeadlineTestVariants(
    original: string,
    voiceProfile: BrandVoiceProfile,
    focusAreas?: string[]
  ): Omit<ABTestVariant, 'id'>[] {
    const tone = voiceProfile.tone || 'professional';

    const variants: Omit<ABTestVariant, 'id'>[] = [
      {
        content: 'Get Your Smile Back in Just One Visit',
        hypothesis: 'Speed/convenience messaging will increase click-through rate',
        predictedLiftPercent: 12,
        confidence: 0.75,
        rationale: 'Emphasizing quick results appeals to busy professionals.',
        testApproach: 'Test against control for 2 weeks minimum',
        tags: ['urgency', 'benefit']
      },
      {
        content: '500+ Patients Trust Us With Their Smiles',
        hypothesis: 'Social proof will build trust and increase conversions',
        predictedLiftPercent: 18,
        confidence: 0.82,
        rationale: 'Patient count creates credibility and reduces perceived risk.',
        testApproach: 'Segment by new vs returning visitors',
        tags: ['social_proof']
      },
      {
        content: 'Stop Hiding Your Smile - We Can Help',
        hypothesis: 'Emotional appeal will resonate with pain points',
        predictedLiftPercent: 15,
        confidence: 0.70,
        rationale: 'Addresses the emotional impact of missing teeth directly.',
        testApproach: 'Monitor bounce rate alongside CTR',
        tags: ['emotional']
      },
      {
        content: 'Free Consultation - Limited Spots Available',
        hypothesis: 'Scarcity + free offer will drive immediate action',
        predictedLiftPercent: 22,
        confidence: 0.68,
        rationale: 'Combines value proposition with urgency trigger.',
        testApproach: 'Track time-on-page and scroll depth',
        tags: ['urgency', 'offer']
      },
      {
        content: 'Dental Implants Starting at $X/month',
        hypothesis: 'Price transparency will reduce friction for cost-conscious visitors',
        predictedLiftPercent: 8,
        confidence: 0.65,
        rationale: 'Many visitors leave due to cost uncertainty.',
        testApproach: 'Segment by income demographics if available',
        tags: ['logical', 'pricing']
      },
      {
        content: 'The Smile You Deserve Is Closer Than You Think',
        hypothesis: 'Aspirational messaging will increase emotional engagement',
        predictedLiftPercent: 10,
        confidence: 0.72,
        rationale: 'Positions implants as achievable goal, not distant dream.',
        testApproach: 'A/B test with image variations',
        tags: ['emotional', 'benefit']
      }
    ];

    return variants;
  }

  private generateCtaTestVariants(
    original: string,
    voiceProfile: BrandVoiceProfile,
    focusAreas?: string[]
  ): Omit<ABTestVariant, 'id'>[] {
    return [
      {
        content: 'Get My Free Consultation',
        hypothesis: 'First-person possessive will increase personal connection',
        predictedLiftPercent: 15,
        confidence: 0.78,
        rationale: 'First-person CTAs often outperform second-person in healthcare.',
        testApproach: 'Simple A/B test',
        tags: ['personalization']
      },
      {
        content: 'Yes, I Want to Smile Again',
        hypothesis: 'Affirmative + emotional will increase click motivation',
        predictedLiftPercent: 20,
        confidence: 0.72,
        rationale: 'Combines commitment language with desired outcome.',
        testApproach: 'Track button clicks and form completion rate',
        tags: ['emotional', 'commitment']
      },
      {
        content: 'Book Now - Only 3 Spots Left This Week',
        hypothesis: 'Urgency + scarcity will drive immediate action',
        predictedLiftPercent: 25,
        confidence: 0.65,
        rationale: 'Creates time pressure to act now rather than later.',
        testApproach: 'Monitor bounce rate for negative signals',
        tags: ['urgency', 'scarcity']
      },
      {
        content: 'See My Options',
        hypothesis: 'Lower commitment language will increase initial clicks',
        predictedLiftPercent: 8,
        confidence: 0.80,
        rationale: 'Less intimidating for visitors not ready to commit.',
        testApproach: 'Track full funnel from click to consultation',
        tags: ['low_commitment']
      },
      {
        content: 'Start My Smile Transformation',
        hypothesis: 'Transformation language will appeal to desired outcome',
        predictedLiftPercent: 12,
        confidence: 0.74,
        rationale: 'Focuses on the journey and end result.',
        testApproach: 'A/B test with matching headline variations',
        tags: ['benefit', 'transformation']
      }
    ];
  }

  private generateBodyTestVariants(
    original: string,
    voiceProfile: BrandVoiceProfile,
    focusAreas?: string[]
  ): Omit<ABTestVariant, 'id'>[] {
    return [
      {
        content: 'Imagine biting into an apple with confidence. Laughing without covering your mouth. That\'s what dental implants can give you. Our specialists have helped 500+ patients just like you rediscover their smiles. Ready to be next?',
        hypothesis: 'Sensory language + social proof will increase engagement',
        predictedLiftPercent: 18,
        confidence: 0.75,
        rationale: 'Concrete imagery makes benefits tangible and relatable.',
        testApproach: 'Track scroll depth and time on page',
        tags: ['emotional', 'social_proof', 'sensory']
      },
      {
        content: 'Missing teeth affect more than your smile. They can lead to bone loss, difficulty eating, and lost confidence. Dental implants are the only solution that actually prevents these problems while giving you teeth that look and feel natural. Schedule your free consultation to learn more.',
        hypothesis: 'Problem-agitation-solution framework will drive action',
        predictedLiftPercent: 14,
        confidence: 0.70,
        rationale: 'Educating about risks creates urgency to solve the problem.',
        testApproach: 'Monitor form submission rate',
        tags: ['logical', 'educational', 'benefit']
      },
      {
        content: 'Quick, comfortable, lasting. That\'s our approach to dental implants. Most of our patients are back to their normal routine within days, not weeks. With financing options starting at $99/month, getting your smile back has never been more accessible.',
        hypothesis: 'Brevity + price transparency will reduce friction',
        predictedLiftPercent: 16,
        confidence: 0.72,
        rationale: 'Addresses common objections about time and cost upfront.',
        testApproach: 'Segment by device type for mobile optimization',
        tags: ['benefit', 'pricing', 'convenience']
      }
    ];
  }

  private generateDescriptionTestVariants(
    original: string,
    voiceProfile: BrandVoiceProfile,
    focusAreas?: string[]
  ): Omit<ABTestVariant, 'id'>[] {
    return [
      {
        content: 'Natural-looking results. Experienced specialists. Free consultations available.',
        hypothesis: 'Concise benefit list will increase scannability',
        predictedLiftPercent: 10,
        confidence: 0.78,
        rationale: 'Short descriptions perform better on mobile devices.',
        testApproach: 'A/B test across device types',
        tags: ['benefit', 'concise']
      },
      {
        content: 'Join 500+ happy patients. Book your free consultation today.',
        hypothesis: 'Social proof + CTA will drive immediate action',
        predictedLiftPercent: 15,
        confidence: 0.74,
        rationale: 'Combines trust building with clear next step.',
        testApproach: 'Track click-through to booking page',
        tags: ['social_proof', 'cta']
      }
    ];
  }

  // ============================================================================
  // Utility Methods
  // ============================================================================

  private calculateSampleSize(variants: ABTestVariant[]): number {
    // Simplified sample size calculation
    // In reality, this would use statistical formulas based on:
    // - Current conversion rate
    // - Minimum detectable effect (MDE)
    // - Statistical power (typically 80%)
    // - Significance level (typically 95%)

    const numVariants = variants.length;
    const baseConversionRate = 0.05; // 5% assumed baseline
    const minDetectableEffect = 0.10; // 10% relative improvement

    // Rule of thumb: ~400 conversions per variant for 80% power
    const conversionsPerVariant = 400;
    const samplesPerVariant = Math.ceil(conversionsPerVariant / baseConversionRate);

    return samplesPerVariant * numVariants;
  }

  /**
   * Analyze existing test results and recommend winner
   */
  analyzeTestResults(
    variants: { id: string; impressions: number; conversions: number }[]
  ): {
    winnerId: string;
    confidence: number;
    recommendation: string;
    continueTest: boolean;
  } {
    if (variants.length < 2) {
      return {
        winnerId: variants[0]?.id || '',
        confidence: 0,
        recommendation: 'Insufficient variants for comparison',
        continueTest: false
      };
    }

    // Calculate conversion rates
    const variantStats = variants.map((v) => ({
      ...v,
      conversionRate: v.impressions > 0 ? v.conversions / v.impressions : 0
    }));

    // Sort by conversion rate
    variantStats.sort((a, b) => b.conversionRate - a.conversionRate);

    const winner = variantStats[0];
    const runnerUp = variantStats[1];

    // Simplified significance calculation
    const totalConversions = variants.reduce((sum, v) => sum + v.conversions, 0);
    const hasEnoughData = totalConversions >= 100;

    const lift =
      runnerUp.conversionRate > 0
        ? (winner.conversionRate - runnerUp.conversionRate) / runnerUp.conversionRate
        : 0;

    // Estimate confidence based on sample size and lift
    const confidence = hasEnoughData ? Math.min(0.99, 0.5 + totalConversions / 1000) : 0.5;

    return {
      winnerId: winner.id,
      confidence,
      recommendation:
        confidence >= 0.95
          ? `${winner.id} is the clear winner with ${(lift * 100).toFixed(1)}% lift`
          : confidence >= 0.8
            ? `${winner.id} is leading but continue testing for statistical significance`
            : 'Continue testing - not enough data for confident decision',
      continueTest: confidence < 0.95
    };
  }

  // ============================================================================
  // AI Integration (placeholder)
  // ============================================================================

  private async generateWithAI(
    request: ABTestVariantRequest,
    variantCount: number
  ): Promise<ABTestVariant[]> {
    console.log(`AI generation not yet implemented for ${this.config.provider}`);
    return this.generateMockVariants(request, variantCount);
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Create a new A/B test variant generator instance
 */
export function createABTestGenerator(config?: Partial<AIModelConfig>): ABTestVariantGenerator {
  return new ABTestVariantGenerator(config);
}

/**
 * Quick generation helper for headline variants
 */
export async function generateHeadlineVariants(
  originalHeadline: string,
  voiceProfile: BrandVoiceProfile,
  count: number = 5
): Promise<ABTestResult> {
  const generator = new ABTestVariantGenerator();
  return generator.generateHeadlineVariants(originalHeadline, voiceProfile, count);
}

/**
 * Quick generation helper for CTA variants
 */
export async function generateCtaVariants(
  originalCta: string,
  voiceProfile: BrandVoiceProfile,
  count: number = 5
): Promise<ABTestResult> {
  const generator = new ABTestVariantGenerator();
  return generator.generateCtaVariants(originalCta, voiceProfile, count);
}

export default ABTestVariantGenerator;
