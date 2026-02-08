/**
 * Voice Profile Generation API Endpoint
 *
 * POST /api/ai/generate-profile - Generates a complete voice profile from analysis
 *
 * Request Body:
 * - profileId: string - Voice profile ID to generate for
 * - regenerate?: boolean - Force regeneration even if sample content exists
 *
 * Response:
 * - profile: Complete voice profile with guidelines and sample content
 */

import { json, type RequestHandler } from '@sveltejs/kit';
import { prisma } from '$lib/server/db';
import { generateVoiceProfile, generateGuidelinesDocument } from '$lib/server/ai/voice-generator';
import type { VoiceAnalysis } from '$lib/server/ai/voice-analyzer';

// =============================================================================
// Types
// =============================================================================

interface GenerateProfileRequest {
  profileId: string;
  regenerate?: boolean;
}

// =============================================================================
// POST Handler - Generate Voice Profile
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
    let body: GenerateProfileRequest;
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

    if (!body.profileId) {
      return json(
        {
          success: false,
          error: {
            code: 'MISSING_PROFILE_ID',
            message: 'Profile ID is required'
          }
        },
        { status: 400 }
      );
    }

    // Get the voice profile
    const voiceProfile = await prisma.voiceProfile.findFirst({
      where: {
        id: body.profileId,
        organizationId
      }
    });

    if (!voiceProfile) {
      return json(
        {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Voice profile not found'
          }
        },
        { status: 404 }
      );
    }

    // Check if profile has been analyzed
    if (!voiceProfile.tone || !voiceProfile.personality) {
      return json(
        {
          success: false,
          error: {
            code: 'NOT_ANALYZED',
            message: 'Voice profile must be analyzed before generating content'
          }
        },
        { status: 400 }
      );
    }

    // Check if sample content already exists and regeneration not requested
    const hasExistingContent =
      voiceProfile.sampleHeadlines &&
      (voiceProfile.sampleHeadlines as string[]).length > 0;

    if (hasExistingContent && !body.regenerate) {
      return json({
        success: true,
        data: {
          profileId: voiceProfile.id,
          alreadyGenerated: true,
          profile: formatProfileForResponse(voiceProfile)
        }
      });
    }

    // Convert database profile to analysis format
    const analysis: VoiceAnalysis = {
      tone: voiceProfile.tone || 'Professional',
      tones: ['professional'],
      personality: voiceProfile.personality || 'Trustworthy',
      formalityLevel: (voiceProfile.formalityLevel as any) || 'professional',
      targetAudience: voiceProfile.targetAudience || 'Adults seeking dental care',
      voiceCharacteristics: {
        empathy: 0.7,
        authority: 0.7,
        warmth: 0.7,
        urgency: 0.3,
        technicality: 0.4,
        confidence: 0.8
      },
      communicationStyle: 'Professional and caring communication style',
      keyDifferentiators: (voiceProfile.keyDifferentiators as string[]) || [],
      preferredTerms: (voiceProfile.preferredTerms as string[]) || [],
      avoidTerms: (voiceProfile.avoidTerms as string[]) || [],
      keyPhrases: [],
      emotionalTriggers: [],
      valuePropositions: (voiceProfile.keyDifferentiators as string[]) || [],
      qualityScore: voiceProfile.qualityScore ? Number(voiceProfile.qualityScore) : 70,
      analysisNotes: ''
    };

    // Generate the complete voice profile
    const result = await generateVoiceProfile(analysis, organizationId, voiceProfile.name);

    if (!result.success || !result.profile) {
      return json(
        {
          success: false,
          error: {
            code: 'GENERATION_FAILED',
            message: result.error?.message || 'Failed to generate voice profile'
          }
        },
        { status: 500 }
      );
    }

    // Update the database with generated content
    const updatedProfile = await prisma.voiceProfile.update({
      where: { id: voiceProfile.id },
      data: {
        sampleHeadlines: result.profile.sampleHeadlines,
        sampleAdCopy: result.profile.sampleAdCopy,
        sampleCtas: result.profile.sampleCtas,
        status: 'in_review',
        updatedAt: new Date()
      }
    });

    // Generate guidelines document
    const guidelinesDoc = generateGuidelinesDocument(result.profile);

    // Log the generation
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        organizationId,
        action: 'voice_profile_generation',
        entityType: 'voice_profile',
        entityId: voiceProfile.id,
        newValues: {
          headlinesGenerated: result.profile.sampleHeadlines.length,
          adCopyGenerated: result.profile.sampleAdCopy.length,
          ctasGenerated: result.profile.sampleCtas.length
        }
      }
    });

    return json({
      success: true,
      data: {
        profileId: updatedProfile.id,
        status: updatedProfile.status,
        profile: {
          tone: result.profile.tone,
          personality: result.profile.personality,
          formalityLevel: result.profile.formalityLevel,
          targetAudience: result.profile.targetAudience,
          voiceCharacteristics: result.profile.voiceCharacteristics,
          keyDifferentiators: result.profile.keyDifferentiators,
          preferredTerms: result.profile.preferredTerms,
          avoidTerms: result.profile.avoidTerms,
          communicationStyle: result.profile.communicationStyle,
          qualityScore: result.profile.qualityScore
        },
        sampleContent: {
          headlines: result.profile.sampleHeadlines,
          adCopy: result.profile.sampleAdCopy,
          ctas: result.profile.sampleCtas
        },
        writingGuidelines: result.profile.writingGuidelines,
        guidelinesDocument: guidelinesDoc
      }
    });
  } catch (error) {
    console.error('Error generating voice profile:', error);

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

// =============================================================================
// GET Handler - Get Generated Profile
// =============================================================================

export const GET: RequestHandler = async ({ url, locals }) => {
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

  const organizationId = locals.user.organizationId;
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

  const profileId = url.searchParams.get('profileId');

  try {
    const voiceProfile = profileId
      ? await prisma.voiceProfile.findFirst({
          where: { id: profileId, organizationId }
        })
      : await prisma.voiceProfile.findFirst({
          where: { organizationId },
          orderBy: { createdAt: 'desc' }
        });

    if (!voiceProfile) {
      return json({
        success: true,
        data: {
          hasProfile: false
        }
      });
    }

    return json({
      success: true,
      data: {
        hasProfile: true,
        profile: formatProfileForResponse(voiceProfile)
      }
    });
  } catch (error) {
    console.error('Error getting voice profile:', error);

    return json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to get voice profile'
        }
      },
      { status: 500 }
    );
  }
};

// =============================================================================
// Helper Functions
// =============================================================================

function formatProfileForResponse(profile: any) {
  return {
    id: profile.id,
    name: profile.name,
    status: profile.status,
    tone: profile.tone,
    personality: profile.personality,
    formalityLevel: profile.formalityLevel,
    targetAudience: profile.targetAudience,
    keyDifferentiators: profile.keyDifferentiators || [],
    preferredTerms: profile.preferredTerms || [],
    avoidTerms: profile.avoidTerms || [],
    qualityScore: profile.qualityScore ? Number(profile.qualityScore) : null,
    sampleContent: {
      headlines: profile.sampleHeadlines || [],
      adCopy: profile.sampleAdCopy || [],
      ctas: profile.sampleCtas || []
    },
    analysisStartedAt: profile.analysisStartedAt,
    analysisCompletedAt: profile.analysisCompletedAt,
    approvedAt: profile.approvedAt,
    createdAt: profile.createdAt,
    updatedAt: profile.updatedAt
  };
}
