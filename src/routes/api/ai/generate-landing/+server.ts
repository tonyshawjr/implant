/**
 * Landing Page Content Generation API Endpoint
 *
 * POST /api/ai/generate-landing - Generate landing page content
 *
 * Request Body:
 * - voiceProfileId?: string - Uses default if not specified
 * - territoryId?: string - For location-specific content
 * - campaignType?: 'lead_gen' | 'awareness' | 'retargeting'
 * - serviceFocus?: string - e.g., 'dental implants'
 * - uniqueSellingPoints?: string[] - Custom USPs to include
 * - includeFaq?: boolean - Generate FAQ content (default: true)
 * - includeUrgency?: boolean - Include urgency elements (default: true)
 *
 * Response:
 * - content: Complete landing page content structure
 * - alternativeHeadlines: Alternative headline options
 * - alternativeCtas: Alternative CTA options
 * - voiceConsistencyScore: How well content matches voice
 */

import { json, type RequestHandler } from '@sveltejs/kit';
import { prisma } from '$lib/server/db';
import {
  LandingPageGenerator,
  type CampaignObjective,
  type BrandVoiceProfile
} from '$lib/server/ai';

// =============================================================================
// Types
// =============================================================================

interface GenerateLandingRequest {
  voiceProfileId?: string;
  territoryId?: string;
  campaignType?: CampaignObjective;
  serviceFocus?: string;
  uniqueSellingPoints?: string[];
  includeFaq?: boolean;
  includeUrgency?: boolean;
  testimonialGuidance?: boolean;
}

// =============================================================================
// POST Handler - Generate Landing Page Content
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
    let body: GenerateLandingRequest;
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

    // Get organization
    const organization = await prisma.organization.findUnique({
      where: { id: organizationId }
    });

    if (!organization) {
      return json(
        {
          success: false,
          error: {
            code: 'ORGANIZATION_NOT_FOUND',
            message: 'Organization not found'
          }
        },
        { status: 404 }
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
        where: { id: body.territoryId, organizationId }
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

    // Generate landing page content
    const generator = new LandingPageGenerator();
    const result = await generator.generateLandingPage({
      voiceProfile: brandProfile,
      campaignType: body.campaignType || 'lead_gen',
      territory,
      organizationName: organization.name,
      serviceFocus: body.serviceFocus || 'dental implants',
      uniqueSellingPoints: body.uniqueSellingPoints,
      includeFaq: body.includeFaq !== false,
      includeUrgency: body.includeUrgency !== false,
      testimonialGuidance: body.testimonialGuidance !== false
    });

    // Log the generation
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        organizationId,
        action: 'landing_page_generation',
        entityType: 'landing_page',
        entityId: voiceProfile.id,
        newValues: {
          campaignType: body.campaignType || 'lead_gen',
          serviceFocus: body.serviceFocus || 'dental implants',
          voiceConsistencyScore: result.voiceConsistencyScore,
          sectionCount: result.content.sections.length,
          faqCount: result.content.faqs.length
        }
      }
    });

    return json({
      success: true,
      data: {
        voiceProfileId: voiceProfile.id,
        content: result.content,
        alternativeHeadlines: result.alternativeHeadlines,
        alternativeCtas: result.alternativeCtas,
        voiceConsistencyScore: result.voiceConsistencyScore,
        metadata: result.metadata
      }
    });
  } catch (error) {
    console.error('Error generating landing page:', error);

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
