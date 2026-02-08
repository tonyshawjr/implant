/**
 * Content Generation API Endpoint
 *
 * POST /api/ai/generate-content - Generates content in the brand voice
 *
 * Request Body:
 * - profileId?: string - Voice profile ID (uses default if not specified)
 * - contentType: 'headline' | 'ad_copy' | 'cta' | 'email' | 'social_post' | 'landing_page' | 'sms'
 * - count?: number - Number of items to generate (default: 5)
 * - platform?: 'facebook' | 'instagram' | 'google' | 'email' | 'sms'
 * - context?: string - Additional context for generation
 * - tone?: 'promotional' | 'educational' | 'testimonial' | 'urgency'
 *
 * Response:
 * - items: Array of generated content
 * - tokensUsed: Token usage statistics
 */

import { json, type RequestHandler } from '@sveltejs/kit';
import { prisma } from '$lib/server/db';
import {
  generateContent,
  generateHeadlines,
  generateAdCopy,
  generateCTAs,
  generateEmailTemplate,
  generateSocialPosts,
  generateLandingPageContent,
  generateSMSMessages,
  type ContentType,
  type ContentRequest
} from '$lib/server/ai/content-generator';
import type { VoiceProfile } from '$lib/server/ai/voice-generator';

// =============================================================================
// Types
// =============================================================================

interface GenerateContentRequest {
  profileId?: string;
  contentType: ContentType;
  count?: number;
  platform?: 'facebook' | 'instagram' | 'google' | 'email' | 'sms';
  context?: string;
  tone?: 'promotional' | 'educational' | 'testimonial' | 'urgency';
}

// =============================================================================
// POST Handler - Generate Content
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
    let body: GenerateContentRequest;
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

    // Validate content type
    const validTypes: ContentType[] = [
      'headline',
      'ad_copy',
      'cta',
      'email',
      'social_post',
      'landing_page',
      'blog_outline',
      'sms',
      'review_response'
    ];

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
    const voiceProfile = body.profileId
      ? await prisma.voiceProfile.findFirst({
          where: { id: body.profileId, organizationId }
        })
      : await prisma.voiceProfile.findFirst({
          where: { organizationId },
          orderBy: { createdAt: 'desc' }
        });

    if (!voiceProfile) {
      return json(
        {
          success: false,
          error: {
            code: 'NO_VOICE_PROFILE',
            message: 'No voice profile found. Please create and analyze a voice profile first.'
          }
        },
        { status: 400 }
      );
    }

    // Check if profile is ready
    if (voiceProfile.status === 'pending' || voiceProfile.status === 'analyzing') {
      return json(
        {
          success: false,
          error: {
            code: 'PROFILE_NOT_READY',
            message: 'Voice profile analysis is not complete. Please wait for analysis to finish.'
          }
        },
        { status: 400 }
      );
    }

    // Convert database profile to VoiceProfile format
    const profile = convertToVoiceProfile(voiceProfile);

    // Generate content based on type
    let result;
    const count = body.count || 5;

    switch (body.contentType) {
      case 'headline':
        result = await generateHeadlines(profile, count, body.context);
        break;

      case 'ad_copy':
        result = await generateAdCopy(
          profile,
          count,
          body.platform as 'facebook' | 'instagram' | 'google' || 'facebook',
          body.context
        );
        break;

      case 'cta':
        result = await generateCTAs(profile, count, body.context);
        break;

      case 'email': {
        const emailResult = await generateEmailTemplate(
          profile,
          body.tone === 'promotional' ? 'promotional' : 'welcome'
        );
        if (emailResult.success && emailResult.email) {
          return json({
            success: true,
            data: {
              profileId: voiceProfile.id,
              contentType: body.contentType,
              email: emailResult.email
            }
          });
        }
        result = { success: false, error: emailResult.error };
        break;
      }

      case 'social_post':
        result = await generateSocialPosts(
          profile,
          count,
          body.platform as 'facebook' | 'instagram' || 'facebook'
        );
        break;

      case 'landing_page': {
        const lpResult = await generateLandingPageContent(profile, body.context);
        if (lpResult.success && lpResult.content) {
          return json({
            success: true,
            data: {
              profileId: voiceProfile.id,
              contentType: body.contentType,
              landingPage: lpResult.content
            }
          });
        }
        result = { success: false, error: lpResult.error };
        break;
      }

      case 'sms':
        result = await generateSMSMessages(profile, count, 'promotional');
        break;

      default:
        result = await generateContent(profile, {
          type: body.contentType,
          count,
          context: body.context,
          platform: body.platform,
          tone: body.tone
        });
    }

    if (!result.success) {
      return json(
        {
          success: false,
          error: result.error || {
            code: 'GENERATION_FAILED',
            message: 'Content generation failed'
          }
        },
        { status: 500 }
      );
    }

    // Log the generation
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        organizationId,
        action: 'content_generation',
        entityType: 'voice_profile',
        entityId: voiceProfile.id,
        newValues: {
          contentType: body.contentType,
          itemCount: result.items?.length || 0,
          tokensUsed: result.tokensUsed
        }
      }
    });

    return json({
      success: true,
      data: {
        profileId: voiceProfile.id,
        contentType: body.contentType,
        items: result.items?.map(item => ({
          id: item.id,
          content: item.content,
          wordCount: item.metadata?.wordCount,
          characterCount: item.metadata?.characterCount
        })),
        tokensUsed: result.tokensUsed
      }
    });
  } catch (error) {
    console.error('Error generating content:', error);

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
