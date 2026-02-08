/**
 * Content Approval API Endpoint
 *
 * POST /api/ai/approve-content - Records content approval/rejection for learning
 *
 * Request Body:
 * - profileId: string - Voice profile ID
 * - contentType: 'headline' | 'ad_copy' | 'cta' | etc.
 * - content: string - The content being approved/rejected
 * - action: 'approve' | 'reject' | 'edit'
 * - reason?: string - Reason for rejection
 * - editedContent?: string - The edited version (for 'edit' action)
 * - tags?: string[] - Optional feedback tags
 *
 * Response:
 * - feedbackId: string
 * - learningStats: Current learning statistics
 */

import { json, type RequestHandler } from '@sveltejs/kit';
import { prisma } from '$lib/server/db';
import {
  recordApproval,
  recordRejection,
  recordEdit,
  getFeedbackStats,
  analyzeFeedbackPatterns,
  suggestProfileRefinements,
  type ContentFeedback
} from '$lib/server/ai/voice-learner';
import type { ContentType } from '$lib/server/ai/content-generator';
import type { VoiceProfile } from '$lib/server/ai/voice-generator';

// =============================================================================
// Types
// =============================================================================

interface ApproveContentRequest {
  profileId: string;
  contentType: ContentType;
  content: string;
  action: 'approve' | 'reject' | 'edit';
  reason?: string;
  editedContent?: string;
  tags?: string[];
}

// =============================================================================
// POST Handler - Record Approval/Rejection
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
    let body: ApproveContentRequest;
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

    if (!body.contentType) {
      return json(
        {
          success: false,
          error: {
            code: 'MISSING_CONTENT_TYPE',
            message: 'Content type is required'
          }
        },
        { status: 400 }
      );
    }

    if (!body.content) {
      return json(
        {
          success: false,
          error: {
            code: 'MISSING_CONTENT',
            message: 'Content is required'
          }
        },
        { status: 400 }
      );
    }

    if (!body.action || !['approve', 'reject', 'edit'].includes(body.action)) {
      return json(
        {
          success: false,
          error: {
            code: 'INVALID_ACTION',
            message: 'Action must be one of: approve, reject, edit'
          }
        },
        { status: 400 }
      );
    }

    // Verify profile belongs to organization
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

    // Validate edit action has edited content
    if (body.action === 'edit' && !body.editedContent) {
      return json(
        {
          success: false,
          error: {
            code: 'MISSING_EDITED_CONTENT',
            message: 'Edited content is required for edit action'
          }
        },
        { status: 400 }
      );
    }

    // Record the feedback
    let result: { success: boolean; feedbackId: string };

    switch (body.action) {
      case 'approve':
        result = await recordApproval(
          organizationId,
          body.profileId,
          body.contentType,
          body.content,
          body.tags
        );
        break;

      case 'reject':
        result = await recordRejection(
          organizationId,
          body.profileId,
          body.contentType,
          body.content,
          body.reason,
          body.tags
        );
        break;

      case 'edit':
        result = await recordEdit(
          organizationId,
          body.profileId,
          body.contentType,
          body.content,
          body.editedContent!,
          body.tags
        );
        break;
    }

    // Get updated stats
    const stats = getFeedbackStats(organizationId, body.profileId);

    // Check if we should analyze patterns (every 10 feedback items)
    let insights = null;
    if (stats.total > 0 && stats.total % 10 === 0) {
      const analysisResult = await analyzeFeedbackPatterns(organizationId, body.profileId);
      if (analysisResult.success) {
        insights = analysisResult.insights;
      }
    }

    return json({
      success: true,
      data: {
        feedbackId: result.feedbackId,
        action: body.action,
        stats: {
          total: stats.total,
          approved: stats.approved,
          rejected: stats.rejected,
          edited: stats.edited,
          approvalRate: stats.approvalRate
        },
        insights
      }
    });
  } catch (error) {
    console.error('Error recording content feedback:', error);

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
// GET Handler - Get Feedback Stats
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
  const includeAnalysis = url.searchParams.get('analyze') === 'true';
  const includeRefinements = url.searchParams.get('refinements') === 'true';

  try {
    // Get voice profile
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
          hasProfile: false,
          stats: null
        }
      });
    }

    // Get feedback stats
    const stats = getFeedbackStats(organizationId, voiceProfile.id);

    // Optionally include analysis
    let analysis = null;
    if (includeAnalysis && stats.total >= 5) {
      const analysisResult = await analyzeFeedbackPatterns(organizationId, voiceProfile.id);
      if (analysisResult.success) {
        analysis = analysisResult.insights;
      }
    }

    // Optionally include refinement suggestions
    let refinements = null;
    if (includeRefinements && stats.total >= 10) {
      const profile = convertToVoiceProfile(voiceProfile);
      const refinementResult = await suggestProfileRefinements(profile, organizationId);
      if (refinementResult.success) {
        refinements = refinementResult.refinements;
      }
    }

    return json({
      success: true,
      data: {
        hasProfile: true,
        profileId: voiceProfile.id,
        stats: {
          total: stats.total,
          approved: stats.approved,
          rejected: stats.rejected,
          edited: stats.edited,
          approvalRate: stats.approvalRate,
          byContentType: stats.byContentType
        },
        analysis,
        refinements
      }
    });
  } catch (error) {
    console.error('Error getting feedback stats:', error);

    return json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to get feedback stats'
        }
      },
      { status: 500 }
    );
  }
};

// =============================================================================
// Helper Functions
// =============================================================================

function convertToVoiceProfile(dbProfile: any): VoiceProfile {
  return {
    id: dbProfile.id,
    organizationId: dbProfile.organizationId,
    name: dbProfile.name,
    version: 1,
    tone: dbProfile.tone || 'Professional',
    personality: dbProfile.personality || 'Trustworthy',
    formalityLevel: dbProfile.formalityLevel || 'professional',
    targetAudience: dbProfile.targetAudience || 'Adults seeking dental care',
    voiceCharacteristics: {
      empathy: 0.7,
      authority: 0.7,
      warmth: 0.7,
      urgency: 0.3,
      technicality: 0.4,
      confidence: 0.8
    },
    preferredTerms: (dbProfile.preferredTerms as string[]) || [],
    avoidTerms: (dbProfile.avoidTerms as string[]) || [],
    keyDifferentiators: (dbProfile.keyDifferentiators as string[]) || [],
    keyPhrases: [],
    communicationStyle: 'Professional and caring communication',
    writingGuidelines: {
      doStatements: [],
      dontStatements: [],
      toneDescriptions: [],
      sentenceStructure: '',
      vocabularyLevel: '',
      punctuationStyle: '',
      callToActionStyle: '',
      emotionalApproach: ''
    },
    sampleHeadlines: (dbProfile.sampleHeadlines as string[]) || [],
    sampleAdCopy: (dbProfile.sampleAdCopy as string[]) || [],
    sampleCtas: (dbProfile.sampleCtas as string[]) || [],
    qualityScore: dbProfile.qualityScore ? Number(dbProfile.qualityScore) : 70,
    analysisNotes: '',
    createdAt: dbProfile.createdAt,
    updatedAt: dbProfile.updatedAt
  };
}
