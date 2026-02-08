/**
 * Full Campaign Generation API Endpoint
 *
 * POST /api/ai/create-campaign - Generate a complete campaign blueprint
 *
 * Request Body:
 * - voiceProfileId?: string - Uses default if not specified
 * - territoryId: string - Required territory for campaign
 * - platform: 'google' | 'facebook' | 'instagram' | 'meta'
 * - campaignType?: 'lead_gen' | 'awareness' | 'retargeting'
 * - monthlyBudget: number - Monthly budget in USD
 * - startDate?: string - Campaign start date
 * - targetCpl?: number - Target cost per lead
 * - adVariantCount?: number - Number of ad variants (default: 5)
 * - createLandingPage?: boolean - Generate landing page (default: true)
 *
 * Response:
 * - blueprint: Complete campaign configuration
 * - estimatedPerformance: Projected metrics
 * - readinessScore: 0-100 launch readiness
 * - blockers: Issues preventing launch
 * - warnings: Non-blocking concerns
 */

import { json, type RequestHandler } from '@sveltejs/kit';
import { prisma } from '$lib/server/db';
import {
  CampaignFactory,
  type AdPlatform,
  type CampaignObjective,
  type BrandVoiceProfile
} from '$lib/server/ai';

// =============================================================================
// Types
// =============================================================================

interface CreateCampaignRequest {
  voiceProfileId?: string;
  territoryId: string;
  platform: AdPlatform;
  campaignType?: CampaignObjective;
  monthlyBudget: number;
  startDate?: string;
  targetCpl?: number;
  adVariantCount?: number;
  createLandingPage?: boolean;
}

// =============================================================================
// POST Handler - Create Campaign
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
    let body: CreateCampaignRequest;
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

    // Validate required fields
    if (!body.territoryId) {
      return json(
        {
          success: false,
          error: {
            code: 'MISSING_TERRITORY',
            message: 'Territory ID is required'
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

    // Validate budget
    if (!body.monthlyBudget || body.monthlyBudget < 100) {
      return json(
        {
          success: false,
          error: {
            code: 'INVALID_BUDGET',
            message: 'Monthly budget must be at least $100'
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

    // Get territory
    const territory = await prisma.territory.findFirst({
      where: { id: body.territoryId, organizationId }
    });

    if (!territory) {
      return json(
        {
          success: false,
          error: {
            code: 'TERRITORY_NOT_FOUND',
            message: 'Territory not found or access denied'
          }
        },
        { status: 404 }
      );
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

    // Format territory
    const territoryInfo = {
      id: territory.id,
      name: territory.name,
      city: territory.city || 'Your City',
      state: territory.state || 'ST',
      radiusMiles: territory.radiusMiles,
      population: territory.population || undefined,
      medianIncome: territory.medianIncome ? Number(territory.medianIncome) : undefined,
      medianAge: territory.medianAge ? Number(territory.medianAge) : undefined
    };

    // Generate campaign blueprint
    const factory = new CampaignFactory();
    const result = await factory.createCampaign({
      organizationId,
      voiceProfile: brandProfile,
      territory: territoryInfo,
      platform: body.platform,
      campaignType: body.campaignType || 'lead_gen',
      monthlyBudget: body.monthlyBudget,
      startDate: body.startDate ? new Date(body.startDate) : undefined,
      targetCpl: body.targetCpl,
      adVariantCount: body.adVariantCount || 5,
      createLandingPage: body.createLandingPage !== false
    });

    // If readiness score is high enough, optionally save as draft campaign
    // (This is just prepared, not automatically saved)

    // Log the generation
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        organizationId,
        action: 'campaign_factory_generation',
        entityType: 'campaign',
        entityId: territory.id,
        newValues: {
          platform: body.platform,
          campaignType: body.campaignType || 'lead_gen',
          monthlyBudget: body.monthlyBudget,
          readinessScore: result.readinessScore,
          adCount: result.blueprint.ads.length,
          hasLandingPage: !!result.blueprint.landingPage,
          blockerCount: result.blockers.length
        }
      }
    });

    return json({
      success: true,
      data: {
        voiceProfileId: voiceProfile.id,
        territoryId: territory.id,
        blueprint: {
          campaign: result.blueprint.campaign,
          adSets: result.blueprint.adSets,
          ads: result.blueprint.ads.map((a) => ({
            id: a.id,
            platform: a.platform,
            format: a.format,
            content: a.content,
            predictedScore: a.predictedScore,
            tags: a.tags
          })),
          landingPage: result.blueprint.landingPage,
          trackingSetup: result.blueprint.trackingSetup,
          launchChecklist: result.blueprint.launchChecklist
        },
        estimatedPerformance: result.estimatedPerformance,
        readinessScore: result.readinessScore,
        blockers: result.blockers,
        warnings: result.warnings,
        metadata: result.metadata
      }
    });
  } catch (error) {
    console.error('Error creating campaign:', error);

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
