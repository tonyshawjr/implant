/**
 * Ad Copy Generation API Endpoint
 *
 * POST /api/ai/generate-ads - Generate ad copy variants for campaigns
 *
 * Request Body:
 * - platform: 'google' | 'facebook' | 'instagram' | 'meta'
 * - campaignType?: 'lead_gen' | 'awareness' | 'retargeting'
 * - voiceProfileId?: string - Uses default if not specified
 * - territoryId?: string - For location-specific copy
 * - variantCount?: number - Number of variants (default: 5)
 *
 * Response:
 * - variants: Array of generated ad copy variants
 * - voiceConsistencyScore: How well the copy matches the voice
 * - recommendations: Suggestions for optimization
 */

import { json, type RequestHandler } from '@sveltejs/kit';
import { prisma } from '$lib/server/db';
import {
  AdCopyGenerator,
  type AdPlatform,
  type CampaignObjective,
  type BrandVoiceProfile
} from '$lib/server/ai';

// =============================================================================
// Types
// =============================================================================

interface GenerateAdsRequest {
  platform: AdPlatform;
  campaignType?: CampaignObjective;
  voiceProfileId?: string;
  territoryId?: string;
  variantCount?: number;
  includeEmoji?: boolean;
  customPrompt?: string;
}

// =============================================================================
// POST Handler - Generate Ads
// =============================================================================

export const POST: RequestHandler = async ({ request, locals }) => {
  // Check authentication
  if (!locals.user) {
    return json(
      {
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required'
        }
      },
      { status: 401 }
    );
  }

  const user = locals.user;
  const organizationId = user.organizationId;

  if (!organizationId) {
    return json(
      {
        success: false,
        error: {
          code: 'NO_ORGANIZATION',
          message: 'User must belong to an organization'
        }
      },
      { status: 400 }
    );
  }

  try {
    // Parse request body
    let body: GenerateAdsRequest;
    try {
      body = await request.json();
    } catch {
      return json(
        {
          success: false,
          error: {
            code: 'INVALID_JSON',
            message: 'Invalid request body'
          }
        },
        { status: 400 }
      );
    }

    // Validate platform
    const validPlatforms: AdPlatform[] = ['google', 'facebook', 'instagram', 'meta'];
    if (!body.platform || !validPlatforms.includes(body.platform)) {
      return json(
        {
          success: false,
          error: {
            code: 'INVALID_PLATFORM',
            message: `Invalid platform. Must be one of: ${validPlatforms.join(', ')}`
          }
        },
        { status: 400 }
      );
    }

    // Get voice profile
    const voiceProfile = body.voiceProfileId
      ? await prisma.voiceProfile.findFirst({
          where: { id: body.voiceProfileId, organizationId }
        })
      : await prisma.voiceProfile.findFirst({
          where: { organizationId, status: 'approved' },
          orderBy: { createdAt: 'desc' }
        });

    if (!voiceProfile) {
      return json(
        {
          success: false,
          error: {
            code: 'NO_VOICE_PROFILE',
            message: 'No approved voice profile found. Please create and approve a voice profile first.'
          }
        },
        { status: 400 }
      );
    }

    // Get territory if specified
    let territory = {
      id: '',
      name: 'Default Territory',
      city: 'Your City',
      state: 'ST',
      radiusMiles: 25
    };

    if (body.territoryId) {
      const dbTerritory = await prisma.territory.findFirst({
        where: {
          id: body.territoryId,
          assignments: {
            some: {
              organizationId,
              status: 'active'
            }
          }
        }
      });

      if (dbTerritory) {
        territory = {
          id: dbTerritory.id,
          name: dbTerritory.name,
          city: dbTerritory.city || 'Your City',
          state: dbTerritory.state || 'ST',
          radiusMiles: dbTerritory.radiusMiles
        };
      }
    }

    // Convert database profile to BrandVoiceProfile format
    const brandProfile: BrandVoiceProfile = {
      id: voiceProfile.id,
      organizationId: voiceProfile.organizationId,
      name: voiceProfile.name,
      status: voiceProfile.status as BrandVoiceProfile['status'],
      tone: voiceProfile.tone,
      personality: voiceProfile.personality,
      formalityLevel: voiceProfile.formalityLevel as BrandVoiceProfile['formalityLevel'],
      targetAudience: voiceProfile.targetAudience,
      keyDifferentiators: voiceProfile.keyDifferentiators as string[] | null,
      avoidTerms: voiceProfile.avoidTerms as string[] | null,
      preferredTerms: voiceProfile.preferredTerms as string[] | null,
      sampleHeadlines: voiceProfile.sampleHeadlines as string[] | null,
      sampleAdCopy: voiceProfile.sampleAdCopy as string[] | null,
      sampleCtas: voiceProfile.sampleCtas as string[] | null,
      qualityScore: voiceProfile.qualityScore ? Number(voiceProfile.qualityScore) : null
    };

    // Generate ads
    const generator = new AdCopyGenerator();
    const result = await generator.generateAdCopy({
      platform: body.platform,
      campaignType: body.campaignType || 'lead_gen',
      voiceProfile: brandProfile,
      territory,
      targetAudience: {},
      variantCount: body.variantCount || 5,
      includeEmoji: body.includeEmoji,
      customPrompt: body.customPrompt
    });

    // Log the generation
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        organizationId,
        action: 'ad_copy_generation',
        entityType: 'campaign',
        entityId: voiceProfile.id,
        newValues: {
          platform: body.platform,
          campaignType: body.campaignType || 'lead_gen',
          variantCount: result.variants.length,
          voiceConsistencyScore: result.voiceConsistencyScore
        }
      }
    });

    return json({
      success: true,
      data: {
        voiceProfileId: voiceProfile.id,
        platform: body.platform,
        variants: result.variants.map((v) => ({
          id: v.id,
          platform: v.platform,
          format: v.format,
          content: v.content,
          predictedScore: v.predictedScore,
          reasoning: v.reasoning,
          tags: v.tags
        })),
        voiceConsistencyScore: result.voiceConsistencyScore,
        recommendations: result.recommendations,
        metadata: result.metadata
      }
    });
  } catch (error) {
    console.error('Error generating ads:', error);

    return json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'An unexpected error occurred'
        }
      },
      { status: 500 }
    );
  }
};
