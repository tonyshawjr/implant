/**
 * Creative Asset Recommender
 * Analyzes and recommends creative assets for campaigns
 */

import type {
  CreativeAnalysisRequest,
  CreativeAnalysisResult,
  CreativeRecommendation,
  BrandVoiceProfile,
  AdPlatform,
  CampaignObjective,
  AIModelConfig
} from './types';
import { DEFAULT_AI_CONFIG } from './types';

// ============================================================================
// Constants
// ============================================================================

const IMAGE_STYLES = {
  dental_implants: {
    highPerforming: [
      'Before/after smile transformations',
      'Professional dentist with patient interaction',
      'Close-up of natural-looking teeth/smile',
      'Lifestyle images of confident smiling adults',
      'Clean clinical environment shots',
      'Technology and modern equipment'
    ],
    avoid: [
      'Stock photos with obvious watermarks',
      'Overly clinical or scary imagery',
      'Images showing dental procedures in progress',
      'Low-quality or pixelated images',
      'Generic stock photos without authenticity'
    ]
  }
};

const COLOR_PALETTES = {
  professional: {
    primary: ['#2563EB', '#1E40AF', '#1E3A8A'], // Blues
    secondary: ['#10B981', '#059669', '#047857'], // Greens (trust/health)
    accent: ['#F59E0B', '#D97706', '#B45309'], // Warm accents
    neutral: ['#F9FAFB', '#F3F4F6', '#E5E7EB']
  },
  friendly: {
    primary: ['#3B82F6', '#60A5FA', '#93C5FD'], // Lighter blues
    secondary: ['#34D399', '#6EE7B7', '#A7F3D0'], // Lighter greens
    accent: ['#FBBF24', '#FCD34D', '#FDE68A'], // Warm yellows
    neutral: ['#FFFFFF', '#F9FAFB', '#F3F4F6']
  },
  casual: {
    primary: ['#6366F1', '#818CF8', '#A5B4FC'], // Purples/indigos
    secondary: ['#14B8A6', '#2DD4BF', '#5EEAD4'], // Teals
    accent: ['#F97316', '#FB923C', '#FDBA74'], // Oranges
    neutral: ['#FAFAFA', '#F4F4F5', '#E4E4E7']
  },
  formal: {
    primary: ['#1F2937', '#374151', '#4B5563'], // Dark grays
    secondary: ['#047857', '#059669', '#10B981'], // Sophisticated greens
    accent: ['#B45309', '#D97706', '#F59E0B'], // Gold tones
    neutral: ['#FFFFFF', '#F9FAFB', '#F3F4F6']
  }
};

const VIDEO_CONCEPTS = {
  lead_gen: [
    {
      concept: 'Patient Testimonial',
      description: 'Real patient sharing their implant journey and results',
      duration: '30-60 seconds',
      estimatedPerformance: 92
    },
    {
      concept: 'Before/After Transformation',
      description: 'Visual journey showing smile transformation',
      duration: '15-30 seconds',
      estimatedPerformance: 88
    },
    {
      concept: 'Doctor Introduction',
      description: 'Warm introduction from lead dentist building trust',
      duration: '30-45 seconds',
      estimatedPerformance: 85
    },
    {
      concept: 'Office Tour',
      description: 'Quick tour of modern, comfortable facility',
      duration: '30-45 seconds',
      estimatedPerformance: 78
    },
    {
      concept: 'FAQ Explainer',
      description: 'Addressing common concerns and questions',
      duration: '45-90 seconds',
      estimatedPerformance: 75
    }
  ],
  awareness: [
    {
      concept: 'Brand Story',
      description: 'Why we do what we do - practice mission and values',
      duration: '60-90 seconds',
      estimatedPerformance: 80
    },
    {
      concept: 'Community Involvement',
      description: 'Showcase local community engagement',
      duration: '30-45 seconds',
      estimatedPerformance: 72
    },
    {
      concept: 'Team Introduction',
      description: 'Meet the friendly team members',
      duration: '30-60 seconds',
      estimatedPerformance: 75
    }
  ],
  retargeting: [
    {
      concept: 'Limited Time Offer',
      description: 'Urgency-focused promotion for consultation',
      duration: '15-30 seconds',
      estimatedPerformance: 85
    },
    {
      concept: 'Social Proof Compilation',
      description: 'Multiple quick testimonial clips',
      duration: '30-45 seconds',
      estimatedPerformance: 82
    },
    {
      concept: 'Final Push CTA',
      description: 'Direct, action-oriented video ad',
      duration: '15 seconds',
      estimatedPerformance: 78
    }
  ]
};

// ============================================================================
// Creative Recommender Class
// ============================================================================

export class CreativeRecommender {
  private config: AIModelConfig;

  constructor(config: Partial<AIModelConfig> = {}) {
    this.config = { ...DEFAULT_AI_CONFIG, ...config };
  }

  /**
   * Analyze creative needs and generate recommendations
   */
  async analyzeAndRecommend(request: CreativeAnalysisRequest): Promise<CreativeAnalysisResult> {
    const startTime = Date.now();

    const recommendations = this.generateRecommendations(request);
    const topStyles = this.getTopPerformingStyles(request.campaignType);
    const avoidStyles = this.getStylesToAvoid();
    const altText = this.generateAltText(request);
    const storyboard =
      request.assetType === 'video'
        ? this.generateVideoStoryboard(request)
        : undefined;

    const processingTimeMs = Date.now() - startTime;

    return {
      recommendations,
      topPerformingStyles: topStyles,
      avoidStyles,
      imageAltText: altText,
      videoConceptStoryboard: storyboard,
      metadata: {
        analyzedAt: new Date(),
        processingTimeMs
      }
    };
  }

  /**
   * Get recommendations for image creatives
   */
  async recommendImages(
    voiceProfile: BrandVoiceProfile,
    platform: AdPlatform,
    campaignType: CampaignObjective
  ): Promise<CreativeRecommendation[]> {
    const result = await this.analyzeAndRecommend({
      assetType: 'image',
      campaignType,
      platform,
      voiceProfile
    });

    return result.recommendations.filter((r) => r.type === 'image');
  }

  /**
   * Get recommendations for video creatives
   */
  async recommendVideos(
    voiceProfile: BrandVoiceProfile,
    platform: AdPlatform,
    campaignType: CampaignObjective
  ): Promise<CreativeRecommendation[]> {
    const result = await this.analyzeAndRecommend({
      assetType: 'video',
      campaignType,
      platform,
      voiceProfile
    });

    return result.recommendations.filter((r) => r.type === 'video');
  }

  /**
   * Generate alt text for accessibility
   */
  generateImageAltText(
    imageDescription: string,
    voiceProfile: BrandVoiceProfile
  ): string[] {
    const tone = voiceProfile.tone || 'professional';

    const templates = {
      professional: [
        `Dental implant specialist providing personalized care`,
        `Patient showcasing natural-looking dental implant results`,
        `State-of-the-art dental implant technology`,
        `Expert dental team in modern clinical setting`
      ],
      friendly: [
        `Friendly dentist helping patient achieve their dream smile`,
        `Happy patient showing off their new dental implants`,
        `Welcoming dental office ready to help you smile`,
        `Caring dental team ready to restore your confidence`
      ],
      casual: [
        `Real results from real dental implant patients`,
        `Your new smile starts here`,
        `Modern dental care that puts you first`,
        `The team that makes smiles happen`
      ],
      formal: [
        `Distinguished dental implant specialist`,
        `Excellence in restorative dental care`,
        `Advanced dental implant procedure results`,
        `Premium dental facility and equipment`
      ]
    };

    return templates[tone as keyof typeof templates] || templates.professional;
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private generateRecommendations(request: CreativeAnalysisRequest): CreativeRecommendation[] {
    const { assetType, campaignType, platform, voiceProfile } = request;
    const recommendations: CreativeRecommendation[] = [];
    const tone = voiceProfile.tone || 'professional';
    const colorPalette = COLOR_PALETTES[tone as keyof typeof COLOR_PALETTES] || COLOR_PALETTES.professional;

    if (assetType === 'image') {
      recommendations.push(...this.generateImageRecommendations(campaignType, platform, colorPalette, tone));
    } else if (assetType === 'video') {
      recommendations.push(...this.generateVideoRecommendations(campaignType, platform, colorPalette, tone));
    }

    // Add carousel recommendations for Facebook/Instagram
    if (platform !== 'google') {
      recommendations.push(
        this.generateCarouselRecommendation(campaignType, colorPalette, tone)
      );
    }

    // Sort by predicted performance
    return recommendations.sort((a, b) => b.predictedPerformance - a.predictedPerformance);
  }

  private generateImageRecommendations(
    campaignType: CampaignObjective,
    platform: AdPlatform,
    colorPalette: typeof COLOR_PALETTES.professional,
    tone: string
  ): CreativeRecommendation[] {
    const recommendations: CreativeRecommendation[] = [];

    // Before/After Image
    recommendations.push({
      id: `img-before-after-${Date.now()}`,
      type: 'image',
      concept: 'Before/After Transformation',
      description: 'Split image showing dental transformation with clear, professional results.',
      styleGuide: [
        'Use consistent lighting across both images',
        'Focus on the smile area, not full face',
        'Add subtle brand overlay with logo',
        'Include "Results may vary" disclaimer'
      ],
      colorPalette: [...colorPalette.primary, ...colorPalette.secondary],
      textOverlay: campaignType === 'lead_gen' ? 'See Your Potential - Free Consultation' : undefined,
      predictedPerformance: 92,
      reasoning: 'Before/after images consistently outperform other formats for dental implant campaigns, with 2-3x higher engagement rates.',
      examplePrompt: 'Professional dental before/after image, split composition, warm lighting, natural looking results, clean background'
    });

    // Patient Smile Portrait
    recommendations.push({
      id: `img-smile-portrait-${Date.now()}`,
      type: 'image',
      concept: 'Happy Patient Portrait',
      description: 'Authentic portrait of a smiling patient showing natural-looking implant results.',
      styleGuide: [
        'Use natural, soft lighting',
        'Capture genuine emotion and confidence',
        'Age-appropriate model (45-65)',
        'Professional but warm setting'
      ],
      colorPalette: [...colorPalette.neutral, ...colorPalette.accent],
      textOverlay: 'Smile With Confidence Again',
      predictedPerformance: 88,
      reasoning: 'Authentic patient imagery builds trust and relatability with the target audience.',
      examplePrompt: 'Portrait of mature adult with confident genuine smile, soft natural lighting, clean background, professional quality'
    });

    // Doctor/Patient Interaction
    recommendations.push({
      id: `img-doctor-patient-${Date.now()}`,
      type: 'image',
      concept: 'Care & Consultation',
      description: 'Dentist having a caring conversation with patient in modern office setting.',
      styleGuide: [
        'Show genuine connection between doctor and patient',
        'Modern, clean office environment visible',
        'Doctor in professional attire',
        'Patient appears comfortable and engaged'
      ],
      colorPalette: [...colorPalette.primary, ...colorPalette.neutral],
      textOverlay: 'Expert Care, Personal Touch',
      predictedPerformance: 82,
      reasoning: 'Shows the human side of dental care and reduces anxiety about consultations.',
      examplePrompt: 'Dentist consulting with patient, modern dental office, warm professional interaction, natural lighting'
    });

    // Technology/Modern Equipment
    recommendations.push({
      id: `img-technology-${Date.now()}`,
      type: 'image',
      concept: 'Advanced Technology',
      description: 'Showcase of modern dental implant technology and equipment.',
      styleGuide: [
        'Highlight cutting-edge equipment',
        'Clean, minimalist composition',
        'Incorporate brand colors subtly',
        'Convey precision and expertise'
      ],
      colorPalette: [...colorPalette.primary, ...colorPalette.secondary],
      textOverlay: 'State-of-the-Art Implant Technology',
      predictedPerformance: 75,
      reasoning: 'Appeals to analytical decision-makers who value expertise and innovation.',
      examplePrompt: 'Modern dental equipment, clean clinical aesthetic, blue accent lighting, high-tech atmosphere'
    });

    // Lifestyle Image
    recommendations.push({
      id: `img-lifestyle-${Date.now()}`,
      type: 'image',
      concept: 'Life After Implants',
      description: 'Person enjoying life activities with confident smile (eating, laughing, socializing).',
      styleGuide: [
        'Natural, candid moment capture',
        'Focus on enjoying food or social situation',
        'Diverse representation when possible',
        'Warm, inviting atmosphere'
      ],
      colorPalette: [...colorPalette.accent, ...colorPalette.neutral],
      textOverlay: 'Enjoy Life Without Limits',
      predictedPerformance: 80,
      reasoning: 'Emotional appeal showing the outcome rather than the procedure.',
      examplePrompt: 'Mature adult eating an apple confidently, outdoor setting, natural smile, lifestyle photography'
    });

    return recommendations;
  }

  private generateVideoRecommendations(
    campaignType: CampaignObjective,
    platform: AdPlatform,
    colorPalette: typeof COLOR_PALETTES.professional,
    tone: string
  ): CreativeRecommendation[] {
    const recommendations: CreativeRecommendation[] = [];
    const concepts = VIDEO_CONCEPTS[campaignType] || VIDEO_CONCEPTS.lead_gen;

    for (const concept of concepts) {
      recommendations.push({
        id: `video-${concept.concept.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`,
        type: 'video',
        concept: concept.concept,
        description: concept.description,
        styleGuide: this.getVideoStyleGuide(concept.concept, tone),
        colorPalette: [...colorPalette.primary, ...colorPalette.secondary],
        predictedPerformance: concept.estimatedPerformance,
        reasoning: `${concept.concept} videos typically achieve ${concept.estimatedPerformance}% engagement score for ${campaignType} campaigns.`
      });
    }

    return recommendations;
  }

  private generateCarouselRecommendation(
    campaignType: CampaignObjective,
    colorPalette: typeof COLOR_PALETTES.professional,
    tone: string
  ): CreativeRecommendation {
    return {
      id: `carousel-journey-${Date.now()}`,
      type: 'carousel',
      concept: 'Implant Journey Carousel',
      description: 'Multi-slide carousel showing the patient journey from consultation to results.',
      styleGuide: [
        'Consistent visual style across all slides',
        'Clear progression narrative',
        'Mix of patient/doctor imagery',
        'Strong CTA on final slide'
      ],
      colorPalette: [...colorPalette.primary, ...colorPalette.secondary, ...colorPalette.accent],
      predictedPerformance: 85,
      reasoning: 'Carousels allow storytelling and have 1.4x higher engagement than single images.'
    };
  }

  private getVideoStyleGuide(concept: string, tone: string): string[] {
    const baseGuide = [
      'High-quality 1080p minimum resolution',
      'Proper lighting (avoid harsh shadows)',
      'Clear audio with minimal background noise',
      'Include captions for sound-off viewing'
    ];

    const conceptSpecific: Record<string, string[]> = {
      'Patient Testimonial': [
        'Use natural setting, not overly produced',
        'Show before/after imagery if available',
        'Keep patient comfortable and authentic',
        'Include name and brief context'
      ],
      'Before/After Transformation': [
        'Side-by-side or transition format',
        'Consistent lighting between shots',
        'Include timeline of transformation',
        'End with confident smile shot'
      ],
      'Doctor Introduction': [
        'Professional but approachable setting',
        'Direct eye contact with camera',
        'Include credentials briefly',
        'Warm, welcoming tone'
      ]
    };

    return [...baseGuide, ...(conceptSpecific[concept] || [])];
  }

  private getTopPerformingStyles(campaignType: CampaignObjective): string[] {
    return IMAGE_STYLES.dental_implants.highPerforming;
  }

  private getStylesToAvoid(): string[] {
    return IMAGE_STYLES.dental_implants.avoid;
  }

  private generateAltText(request: CreativeAnalysisRequest): string[] {
    return this.generateImageAltText('dental implant creative', request.voiceProfile);
  }

  private generateVideoStoryboard(request: CreativeAnalysisRequest) {
    const { campaignType, voiceProfile } = request;
    const tone = voiceProfile.tone || 'professional';

    // Testimonial storyboard as example
    return [
      {
        scene: 1,
        description: 'Patient introduction - sitting comfortably, looks at camera',
        duration: '5 seconds',
        textOverlay: 'Meet [Patient Name]'
      },
      {
        scene: 2,
        description: 'Patient describes their problem before implants',
        duration: '10 seconds',
        textOverlay: undefined
      },
      {
        scene: 3,
        description: 'B-roll of the dental practice/consultation',
        duration: '5 seconds',
        textOverlay: 'Free Consultation Available'
      },
      {
        scene: 4,
        description: 'Patient talks about the procedure experience',
        duration: '10 seconds',
        textOverlay: undefined
      },
      {
        scene: 5,
        description: 'Before/after imagery or patient showing smile',
        duration: '5 seconds',
        textOverlay: 'Results speak for themselves'
      },
      {
        scene: 6,
        description: 'Patient recommendation and emotional close',
        duration: '10 seconds',
        textOverlay: undefined
      },
      {
        scene: 7,
        description: 'Call-to-action with practice branding',
        duration: '5 seconds',
        textOverlay: 'Schedule Your Free Consultation Today'
      }
    ];
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Create a new creative recommender instance
 */
export function createCreativeRecommender(config?: Partial<AIModelConfig>): CreativeRecommender {
  return new CreativeRecommender(config);
}

/**
 * Quick helper to get creative recommendations
 */
export async function getCreativeRecommendations(
  request: CreativeAnalysisRequest
): Promise<CreativeAnalysisResult> {
  const recommender = new CreativeRecommender();
  return recommender.analyzeAndRecommend(request);
}

export default CreativeRecommender;
