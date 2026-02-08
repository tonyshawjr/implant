/**
 * Brand Analysis API Endpoint
 *
 * POST /api/ai/analyze-brand - Triggers brand voice analysis from source URLs
 *
 * Request Body:
 * - sources: Array of { type: 'website' | 'facebook' | 'instagram' | 'google_business', url: string }
 * - profileId?: string - Optional existing profile ID to update
 *
 * Response:
 * - analysis: Voice analysis results
 * - qualityScore: Analysis quality score
 * - sources: Successfully scraped sources
 */

import { json, type RequestHandler } from '@sveltejs/kit';
import { prisma } from '$lib/server/db';
import { scrapeMultipleSources, type ScrapedContent } from '$lib/server/ai/scraper';
import { analyzeMultipleSources, type VoiceAnalysis } from '$lib/server/ai/voice-analyzer';

// =============================================================================
// Types
// =============================================================================

interface AnalyzeBrandRequest {
  sources: Array<{
    type: 'website' | 'facebook' | 'instagram' | 'google_business';
    url: string;
  }>;
  profileId?: string;
}

// =============================================================================
// POST Handler - Analyze Brand
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
    let body: AnalyzeBrandRequest;
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

    // Validate sources
    if (!body.sources || !Array.isArray(body.sources) || body.sources.length === 0) {
      return json(
        {
          success: false,
          error: {
            code: 'MISSING_SOURCES',
            message: 'At least one source URL is required'
          }
        },
        { status: 400 }
      );
    }

    // Validate source types and URLs
    const validTypes = ['website', 'facebook', 'instagram', 'google_business'];
    for (const source of body.sources) {
      if (!validTypes.includes(source.type)) {
        return json(
          {
            success: false,
            error: {
              code: 'INVALID_SOURCE_TYPE',
              message: `Invalid source type: ${source.type}`
            }
          },
          { status: 400 }
        );
      }

      try {
        new URL(source.url);
      } catch {
        return json(
          {
            success: false,
            error: {
              code: 'INVALID_URL',
              message: `Invalid URL: ${source.url}`
            }
          },
          { status: 400 }
        );
      }
    }

    // Get or create voice profile
    let voiceProfile = body.profileId
      ? await prisma.voiceProfile.findFirst({
          where: {
            id: body.profileId,
            organizationId
          }
        })
      : await prisma.voiceProfile.findFirst({
          where: { organizationId },
          orderBy: { createdAt: 'desc' }
        });

    if (!voiceProfile) {
      // Create new voice profile
      voiceProfile = await prisma.voiceProfile.create({
        data: {
          organizationId,
          name: 'Primary',
          status: 'analyzing',
          analysisStartedAt: new Date()
        }
      });
    } else {
      // Update existing profile to analyzing status
      await prisma.voiceProfile.update({
        where: { id: voiceProfile.id },
        data: {
          status: 'analyzing',
          analysisStartedAt: new Date()
        }
      });
    }

    // Scrape all sources
    const scrapingResult = await scrapeMultipleSources(body.sources);

    if (!scrapingResult.success) {
      await prisma.voiceProfile.update({
        where: { id: voiceProfile.id },
        data: { status: 'pending' }
      });

      return json(
        {
          success: false,
          error: {
            code: 'SCRAPING_FAILED',
            message: 'Failed to scrape any sources',
            details: scrapingResult.errors
          }
        },
        { status: 500 }
      );
    }

    // Store scraped sources
    for (const source of scrapingResult.sources) {
      await prisma.voiceProfileSource.create({
        data: {
          voiceProfileId: voiceProfile.id,
          sourceType: source.sourceType as any,
          sourceUrl: source.sourceUrl,
          contentExtracted: source.content.substring(0, 10000),
          analysisNotes: `Extracted ${source.metadata?.wordCount || 0} words`,
          processedAt: new Date()
        }
      });
    }

    // Analyze the scraped content
    const analysisResult = await analyzeMultipleSources(scrapingResult.sources);

    if (!analysisResult.success || !analysisResult.analysis) {
      await prisma.voiceProfile.update({
        where: { id: voiceProfile.id },
        data: { status: 'pending' }
      });

      return json(
        {
          success: false,
          error: {
            code: 'ANALYSIS_FAILED',
            message: analysisResult.error?.message || 'Voice analysis failed'
          }
        },
        { status: 500 }
      );
    }

    // Update voice profile with analysis results
    const updatedProfile = await prisma.voiceProfile.update({
      where: { id: voiceProfile.id },
      data: {
        status: 'in_review',
        analysisCompletedAt: new Date(),
        qualityScore: analysisResult.analysis.qualityScore,
        tone: analysisResult.analysis.tone,
        personality: analysisResult.analysis.personality,
        formalityLevel: analysisResult.analysis.formalityLevel as any,
        targetAudience: analysisResult.analysis.targetAudience,
        keyDifferentiators: analysisResult.analysis.keyDifferentiators,
        preferredTerms: analysisResult.analysis.preferredTerms,
        avoidTerms: analysisResult.analysis.avoidTerms
      }
    });

    // Log the analysis
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        organizationId,
        action: 'brand_voice_analysis',
        entityType: 'voice_profile',
        entityId: voiceProfile.id,
        newValues: {
          sourcesAnalyzed: scrapingResult.sources.length,
          qualityScore: analysisResult.analysis.qualityScore,
          tokensUsed: analysisResult.tokensUsed
        }
      }
    });

    return json({
      success: true,
      data: {
        profileId: updatedProfile.id,
        status: updatedProfile.status,
        analysis: {
          tone: analysisResult.analysis.tone,
          personality: analysisResult.analysis.personality,
          formalityLevel: analysisResult.analysis.formalityLevel,
          targetAudience: analysisResult.analysis.targetAudience,
          voiceCharacteristics: analysisResult.analysis.voiceCharacteristics,
          keyDifferentiators: analysisResult.analysis.keyDifferentiators,
          preferredTerms: analysisResult.analysis.preferredTerms,
          avoidTerms: analysisResult.analysis.avoidTerms,
          communicationStyle: analysisResult.analysis.communicationStyle
        },
        qualityScore: analysisResult.analysis.qualityScore,
        sources: scrapingResult.sources.map(s => ({
          type: s.sourceType,
          url: s.sourceUrl,
          title: s.title,
          wordCount: s.metadata?.wordCount
        })),
        errors: scrapingResult.errors,
        tokensUsed: analysisResult.tokensUsed
      }
    });
  } catch (error) {
    console.error('Error in brand analysis:', error);

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
// GET Handler - Get Analysis Status
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
          where: { id: profileId, organizationId },
          include: {
            sources: {
              select: {
                id: true,
                sourceType: true,
                sourceUrl: true,
                processedAt: true
              }
            }
          }
        })
      : await prisma.voiceProfile.findFirst({
          where: { organizationId },
          orderBy: { createdAt: 'desc' },
          include: {
            sources: {
              select: {
                id: true,
                sourceType: true,
                sourceUrl: true,
                processedAt: true
              }
            }
          }
        });

    if (!voiceProfile) {
      return json({
        success: true,
        data: {
          hasProfile: false,
          status: null
        }
      });
    }

    return json({
      success: true,
      data: {
        hasProfile: true,
        profileId: voiceProfile.id,
        status: voiceProfile.status,
        analysisStartedAt: voiceProfile.analysisStartedAt,
        analysisCompletedAt: voiceProfile.analysisCompletedAt,
        qualityScore: voiceProfile.qualityScore ? Number(voiceProfile.qualityScore) : null,
        sources: voiceProfile.sources
      }
    });
  } catch (error) {
    console.error('Error getting analysis status:', error);

    return json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to get analysis status'
        }
      },
      { status: 500 }
    );
  }
};
