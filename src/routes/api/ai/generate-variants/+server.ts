/**
 * A/B Test Variant Generation API Endpoint
 *
 * POST /api/ai/generate-variants - Generate A/B test variants
 *
 * Request Body:
 * - originalContent: string - The content to create variants for
 * - contentType: 'headline' | 'body' | 'cta' | 'description'
 * - voiceProfileId?: string - Uses default if not specified
 * - variantCount?: number - Number of variants (default: 5)
 * - testHypothesis?: string - Optional hypothesis to test
 * - focusAreas?: ('urgency' | 'social_proof' | 'benefit' | 'emotional' | 'logical')[]
 *
 * Response:
 * - variants: Array of variant options with predictions
 * - recommendedWinner: Predicted best variant ID
 * - statisticalSignificanceRequired: Required confidence level
 * - estimatedSampleSize: Estimated sample size needed
 */

import { json, type RequestHandler } from '@sveltejs/kit';
import { prisma } from '$lib/server/db';
import { ABTestVariantGenerator, type BrandVoiceProfile } from '$lib/server/ai';

// =============================================================================
// Types
// =============================================================================

interface GenerateVariantsRequest {
  originalContent: string;
  contentType: 'headline' | 'body' | 'cta' | 'description';
  voiceProfileId?: string;
  variantCount?: number;
  testHypothesis?: string;
  focusAreas?: ('urgency' | 'social_proof' | 'benefit' | 'emotional' | 'logical')[];
}

// =============================================================================
// POST Handler - Generate A/B Test Variants
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
    let body: GenerateVariantsRequest;
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
    if (!body.originalContent) {
      return json(
        {
          success: false,
          error: {
            code: 'MISSING_CONTENT',
            message: 'Original content is required'
          }
        },
        { status: 400 }
      );
    }

    // Validate content type
    const validTypes = ['headline', 'body', 'cta', 'description'];
    if (!body.contentType || !validTypes.includes(body.contentType)) {
      return json(
        {
          success: false,
          error: {
            code: 'INVALID_CONTENT_TYPE',
            message: `Invalid content type. Must be one of: ${validTypes.join(', ')}`
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

    // Generate variants
    const generator = new ABTestVariantGenerator();
    const result = await generator.generateVariants({
      originalContent: body.originalContent,
      contentType: body.contentType,
      voiceProfile: brandProfile,
      variantCount: body.variantCount || 5,
      testHypothesis: body.testHypothesis,
      focusAreas: body.focusAreas
    });

    // Log the generation
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        organizationId,
        action: 'ab_variant_generation',
        entityType: 'ab_test',
        entityId: voiceProfile.id,
        newValues: {
          contentType: body.contentType,
          originalContentLength: body.originalContent.length,
          variantCount: result.variants.length,
          recommendedWinner: result.recommendedWinner
        }
      }
    });

    return json({
      success: true,
      data: {
        voiceProfileId: voiceProfile.id,
        contentType: body.contentType,
        originalContent: body.originalContent,
        variants: result.variants.map((v) => ({
          id: v.id,
          content: v.content,
          hypothesis: v.hypothesis,
          predictedLiftPercent: v.predictedLiftPercent,
          confidence: v.confidence,
          rationale: v.rationale,
          testApproach: v.testApproach,
          tags: v.tags
        })),
        recommendedWinner: result.recommendedWinner,
        statisticalSignificanceRequired: result.statisticalSignificanceRequired,
        estimatedSampleSize: result.estimatedSampleSize,
        metadata: result.metadata
      }
    });
  } catch (error) {
    console.error('Error generating variants:', error);

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
