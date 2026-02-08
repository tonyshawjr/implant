import type { PageServerLoad, Actions } from './$types';
import { prisma } from '$lib/server/db';
import { fail } from '@sveltejs/kit';
import {
  scrapeMultipleSources,
  analyzeMultipleSources,
  generateVoiceProfile,
  recordApproval,
  recordRejection,
  getFeedbackStats,
  type ContentType
} from '$lib/server/ai';

export const load: PageServerLoad = async ({ parent }) => {
  const { organization } = await parent();

  if (!organization) {
    return {
      voiceProfile: null,
      sources: [],
      sampleContent: null
    };
  }

  // Get the primary voice profile for this organization
  const voiceProfile = await prisma.voiceProfile.findFirst({
    where: {
      organizationId: organization.id
    },
    include: {
      sources: {
        orderBy: { createdAt: 'desc' }
      },
      approvedByUser: {
        select: {
          firstName: true,
          lastName: true
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  });

  if (!voiceProfile) {
    return {
      voiceProfile: null,
      sources: [],
      sampleContent: null
    };
  }

  // Format sources for display
  const sources = voiceProfile.sources.map(source => ({
    id: source.id,
    type: source.sourceType,
    url: source.sourceUrl,
    fileName: source.fileName,
    fileSize: source.fileSize,
    contentExtracted: source.contentExtracted ? source.contentExtracted.substring(0, 500) : null,
    analysisNotes: source.analysisNotes,
    processedAt: source.processedAt?.toISOString() ?? null,
    createdAt: source.createdAt.toISOString()
  }));

  // Parse JSON fields for sample content
  const sampleHeadlines = voiceProfile.sampleHeadlines as string[] | null;
  const sampleAdCopy = voiceProfile.sampleAdCopy as string[] | null;
  const sampleCtas = voiceProfile.sampleCtas as string[] | null;
  const keyDifferentiators = voiceProfile.keyDifferentiators as string[] | null;
  const avoidTerms = voiceProfile.avoidTerms as string[] | null;
  const preferredTerms = voiceProfile.preferredTerms as string[] | null;

  return {
    voiceProfile: {
      id: voiceProfile.id,
      name: voiceProfile.name,
      status: voiceProfile.status,
      analysisStartedAt: voiceProfile.analysisStartedAt?.toISOString() ?? null,
      analysisCompletedAt: voiceProfile.analysisCompletedAt?.toISOString() ?? null,
      qualityScore: voiceProfile.qualityScore ? Number(voiceProfile.qualityScore) : null,
      tone: voiceProfile.tone,
      personality: voiceProfile.personality,
      formalityLevel: voiceProfile.formalityLevel,
      targetAudience: voiceProfile.targetAudience,
      keyDifferentiators,
      avoidTerms,
      preferredTerms,
      approvedBy: voiceProfile.approvedByUser
        ? `${voiceProfile.approvedByUser.firstName} ${voiceProfile.approvedByUser.lastName}`
        : null,
      approvedAt: voiceProfile.approvedAt?.toISOString() ?? null,
      rejectionReason: voiceProfile.rejectionReason,
      createdAt: voiceProfile.createdAt.toISOString(),
      updatedAt: voiceProfile.updatedAt.toISOString()
    },
    sources,
    sampleContent: {
      headlines: sampleHeadlines || [],
      adCopy: sampleAdCopy || [],
      ctas: sampleCtas || []
    }
  };
};

export const actions: Actions = {
  // Approve a sample content item
  approveSample: async ({ request, locals }) => {
    if (!locals.user) {
      return fail(401, { message: 'Unauthorized' });
    }

    const formData = await request.formData();
    const profileId = formData.get('profileId') as string;
    const contentType = formData.get('contentType') as string;
    const contentIndex = parseInt(formData.get('contentIndex') as string);

    if (!profileId || !contentType || isNaN(contentIndex)) {
      return fail(400, { message: 'Invalid request parameters' });
    }

    // In a real implementation, you would store approval status per content item
    // For now, we just log the approval and return success
    console.log(`Sample ${contentType}[${contentIndex}] approved for profile ${profileId}`);

    return {
      success: true,
      action: 'approve',
      contentType,
      contentIndex
    };
  },

  // Reject a sample content item
  rejectSample: async ({ request, locals }) => {
    if (!locals.user) {
      return fail(401, { message: 'Unauthorized' });
    }

    const formData = await request.formData();
    const profileId = formData.get('profileId') as string;
    const contentType = formData.get('contentType') as string;
    const contentIndex = parseInt(formData.get('contentIndex') as string);
    const reason = formData.get('reason') as string;

    if (!profileId || !contentType || isNaN(contentIndex)) {
      return fail(400, { message: 'Invalid request parameters' });
    }

    // In a real implementation, you would store rejection status and reason
    console.log(`Sample ${contentType}[${contentIndex}] rejected for profile ${profileId}: ${reason}`);

    return {
      success: true,
      action: 'reject',
      contentType,
      contentIndex
    };
  },

  // Update voice adjustments
  updateAdjustments: async ({ request, locals }) => {
    if (!locals.user) {
      return fail(401, { message: 'Unauthorized' });
    }

    const user = locals.user;
    if (!user.organizationId) {
      return fail(400, { message: 'No organization found for user' });
    }

    const formData = await request.formData();
    const profileId = formData.get('profileId') as string;
    const formalityLevel = formData.get('formalityLevel') as string;
    const preferredTermsRaw = formData.get('preferredTerms') as string;
    const avoidTermsRaw = formData.get('avoidTerms') as string;

    if (!profileId) {
      return fail(400, { message: 'Profile ID is required' });
    }

    // Verify the profile belongs to the user's organization
    const profile = await prisma.voiceProfile.findFirst({
      where: {
        id: profileId,
        organizationId: user.organizationId
      }
    });

    if (!profile) {
      return fail(404, { message: 'Voice profile not found' });
    }

    // Parse terms (comma-separated)
    const preferredTerms = preferredTermsRaw
      ? preferredTermsRaw.split(',').map(t => t.trim()).filter(Boolean)
      : [];
    const avoidTerms = avoidTermsRaw
      ? avoidTermsRaw.split(',').map(t => t.trim()).filter(Boolean)
      : [];

    // Update the profile
    await prisma.voiceProfile.update({
      where: { id: profileId },
      data: {
        formalityLevel: formalityLevel as any,
        preferredTerms,
        avoidTerms,
        updatedAt: new Date()
      }
    });

    return {
      success: true,
      message: 'Voice adjustments saved successfully'
    };
  },

  // Request voice profile regeneration
  requestRegeneration: async ({ request, locals }) => {
    if (!locals.user) {
      return fail(401, { message: 'Unauthorized' });
    }

    const user = locals.user;
    if (!user.organizationId) {
      return fail(400, { message: 'No organization found for user' });
    }

    const formData = await request.formData();
    const profileId = formData.get('profileId') as string;
    const feedback = formData.get('feedback') as string;

    if (!profileId) {
      return fail(400, { message: 'Profile ID is required' });
    }

    // Verify the profile belongs to the user's organization
    const profile = await prisma.voiceProfile.findFirst({
      where: {
        id: profileId,
        organizationId: user.organizationId
      }
    });

    if (!profile) {
      return fail(404, { message: 'Voice profile not found' });
    }

    // Create a support ticket for regeneration request
    const ticketNumber = `TKT-${Date.now().toString(36).toUpperCase()}`;

    await prisma.supportTicket.create({
      data: {
        ticketNumber,
        organizationId: user.organizationId,
        submittedBy: user.id,
        category: 'campaign',
        priority: 'medium',
        subject: 'Brand Voice Profile Regeneration Request',
        description: `
The client has requested regeneration of their brand voice profile.

Profile ID: ${profileId}
Profile Name: ${profile.name}

Feedback provided:
${feedback || 'No specific feedback provided'}
        `.trim()
      }
    });

    return {
      success: true,
      message: 'Regeneration request submitted. Our team will review and update your voice profile.'
    };
  },

  // Analyze brand from URLs (AI-powered)
  analyzeBrand: async ({ request, locals }) => {
    if (!locals.user) {
      return fail(401, { message: 'Unauthorized' });
    }

    const user = locals.user;
    if (!user.organizationId) {
      return fail(400, { message: 'No organization found for user' });
    }

    const formData = await request.formData();
    const websiteUrl = formData.get('websiteUrl') as string;
    const facebookUrl = formData.get('facebookUrl') as string;
    const instagramUrl = formData.get('instagramUrl') as string;
    const googleBusinessUrl = formData.get('googleBusinessUrl') as string;

    // Build sources array
    const sources: Array<{ type: 'website' | 'facebook' | 'instagram' | 'google_business'; url: string }> = [];

    if (websiteUrl) {
      try {
        new URL(websiteUrl);
        sources.push({ type: 'website', url: websiteUrl });
      } catch {
        return fail(400, { message: 'Invalid website URL' });
      }
    }

    if (facebookUrl) {
      try {
        new URL(facebookUrl);
        sources.push({ type: 'facebook', url: facebookUrl });
      } catch {
        return fail(400, { message: 'Invalid Facebook URL' });
      }
    }

    if (instagramUrl) {
      try {
        new URL(instagramUrl);
        sources.push({ type: 'instagram', url: instagramUrl });
      } catch {
        return fail(400, { message: 'Invalid Instagram URL' });
      }
    }

    if (googleBusinessUrl) {
      try {
        new URL(googleBusinessUrl);
        sources.push({ type: 'google_business', url: googleBusinessUrl });
      } catch {
        return fail(400, { message: 'Invalid Google Business URL' });
      }
    }

    if (sources.length === 0) {
      return fail(400, { message: 'At least one source URL is required' });
    }

    try {
      // Get or create voice profile
      let voiceProfile = await prisma.voiceProfile.findFirst({
        where: { organizationId: user.organizationId },
        orderBy: { createdAt: 'desc' }
      });

      if (!voiceProfile) {
        voiceProfile = await prisma.voiceProfile.create({
          data: {
            organizationId: user.organizationId,
            name: 'Primary',
            status: 'analyzing',
            analysisStartedAt: new Date()
          }
        });
      } else {
        await prisma.voiceProfile.update({
          where: { id: voiceProfile.id },
          data: {
            status: 'analyzing',
            analysisStartedAt: new Date()
          }
        });
      }

      // Scrape sources
      const scrapingResult = await scrapeMultipleSources(sources);

      if (!scrapingResult.success || scrapingResult.sources.length === 0) {
        await prisma.voiceProfile.update({
          where: { id: voiceProfile.id },
          data: { status: 'pending' }
        });
        return fail(500, { message: 'Failed to scrape any sources. Please check the URLs and try again.' });
      }

      // Store sources
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

      // Analyze content
      const analysisResult = await analyzeMultipleSources(scrapingResult.sources);

      if (!analysisResult.success || !analysisResult.analysis) {
        await prisma.voiceProfile.update({
          where: { id: voiceProfile.id },
          data: { status: 'pending' }
        });
        return fail(500, { message: 'Voice analysis failed. Please try again.' });
      }

      // Update profile with analysis results
      await prisma.voiceProfile.update({
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

      return {
        success: true,
        message: 'Brand analysis complete! Review your voice profile below.',
        profileId: voiceProfile.id
      };
    } catch (error) {
      console.error('Brand analysis error:', error);
      return fail(500, { message: 'An error occurred during analysis. Please try again.' });
    }
  },

  // Generate sample content (AI-powered)
  generateContent: async ({ request, locals }) => {
    if (!locals.user) {
      return fail(401, { message: 'Unauthorized' });
    }

    const user = locals.user;
    if (!user.organizationId) {
      return fail(400, { message: 'No organization found for user' });
    }

    const formData = await request.formData();
    const profileId = formData.get('profileId') as string;

    if (!profileId) {
      return fail(400, { message: 'Profile ID is required' });
    }

    try {
      // Get the voice profile
      const voiceProfile = await prisma.voiceProfile.findFirst({
        where: {
          id: profileId,
          organizationId: user.organizationId
        }
      });

      if (!voiceProfile) {
        return fail(404, { message: 'Voice profile not found' });
      }

      if (!voiceProfile.tone || !voiceProfile.personality) {
        return fail(400, { message: 'Profile must be analyzed before generating content' });
      }

      // Convert to VoiceAnalysis format and generate profile
      const analysis = {
        tone: voiceProfile.tone,
        tones: ['professional'] as const,
        personality: voiceProfile.personality,
        formalityLevel: (voiceProfile.formalityLevel || 'professional') as 'formal' | 'professional' | 'casual' | 'friendly',
        targetAudience: voiceProfile.targetAudience || 'Adults seeking dental care',
        voiceCharacteristics: {
          empathy: 0.7,
          authority: 0.7,
          warmth: 0.7,
          urgency: 0.3,
          technicality: 0.4,
          confidence: 0.8
        },
        communicationStyle: 'Professional and caring communication',
        keyDifferentiators: (voiceProfile.keyDifferentiators as string[]) || [],
        preferredTerms: (voiceProfile.preferredTerms as string[]) || [],
        avoidTerms: (voiceProfile.avoidTerms as string[]) || [],
        keyPhrases: [],
        emotionalTriggers: [],
        valuePropositions: (voiceProfile.keyDifferentiators as string[]) || [],
        qualityScore: voiceProfile.qualityScore ? Number(voiceProfile.qualityScore) : 70,
        analysisNotes: ''
      };

      const result = await generateVoiceProfile(analysis, user.organizationId, voiceProfile.name);

      if (!result.success || !result.profile) {
        return fail(500, { message: 'Failed to generate content. Please try again.' });
      }

      // Update profile with generated content
      await prisma.voiceProfile.update({
        where: { id: profileId },
        data: {
          sampleHeadlines: result.profile.sampleHeadlines,
          sampleAdCopy: result.profile.sampleAdCopy,
          sampleCtas: result.profile.sampleCtas,
          updatedAt: new Date()
        }
      });

      return {
        success: true,
        message: 'Sample content generated successfully!',
        sampleContent: {
          headlines: result.profile.sampleHeadlines,
          adCopy: result.profile.sampleAdCopy,
          ctas: result.profile.sampleCtas
        }
      };
    } catch (error) {
      console.error('Content generation error:', error);
      return fail(500, { message: 'An error occurred during content generation. Please try again.' });
    }
  },

  // Record content approval for learning
  approveForLearning: async ({ request, locals }) => {
    if (!locals.user) {
      return fail(401, { message: 'Unauthorized' });
    }

    const user = locals.user;
    if (!user.organizationId) {
      return fail(400, { message: 'No organization found for user' });
    }

    const formData = await request.formData();
    const profileId = formData.get('profileId') as string;
    const contentType = formData.get('contentType') as ContentType;
    const content = formData.get('content') as string;

    if (!profileId || !contentType || !content) {
      return fail(400, { message: 'Missing required fields' });
    }

    try {
      const result = await recordApproval(
        user.organizationId,
        profileId,
        contentType,
        content
      );

      const stats = getFeedbackStats(user.organizationId, profileId);

      return {
        success: true,
        feedbackId: result.feedbackId,
        stats: {
          total: stats.total,
          approvalRate: stats.approvalRate
        }
      };
    } catch (error) {
      console.error('Approval recording error:', error);
      return fail(500, { message: 'Failed to record approval' });
    }
  },

  // Record content rejection for learning
  rejectForLearning: async ({ request, locals }) => {
    if (!locals.user) {
      return fail(401, { message: 'Unauthorized' });
    }

    const user = locals.user;
    if (!user.organizationId) {
      return fail(400, { message: 'No organization found for user' });
    }

    const formData = await request.formData();
    const profileId = formData.get('profileId') as string;
    const contentType = formData.get('contentType') as ContentType;
    const content = formData.get('content') as string;
    const reason = formData.get('reason') as string;

    if (!profileId || !contentType || !content) {
      return fail(400, { message: 'Missing required fields' });
    }

    try {
      const result = await recordRejection(
        user.organizationId,
        profileId,
        contentType,
        content,
        reason
      );

      const stats = getFeedbackStats(user.organizationId, profileId);

      return {
        success: true,
        feedbackId: result.feedbackId,
        stats: {
          total: stats.total,
          approvalRate: stats.approvalRate
        }
      };
    } catch (error) {
      console.error('Rejection recording error:', error);
      return fail(500, { message: 'Failed to record rejection' });
    }
  },

  // Approve the voice profile
  approveProfile: async ({ request, locals }) => {
    if (!locals.user) {
      return fail(401, { message: 'Unauthorized' });
    }

    const user = locals.user;
    if (!user.organizationId) {
      return fail(400, { message: 'No organization found for user' });
    }

    const formData = await request.formData();
    const profileId = formData.get('profileId') as string;

    if (!profileId) {
      return fail(400, { message: 'Profile ID is required' });
    }

    try {
      await prisma.voiceProfile.update({
        where: { id: profileId },
        data: {
          status: 'approved',
          approvedBy: user.id,
          approvedAt: new Date()
        }
      });

      return {
        success: true,
        message: 'Voice profile approved and activated!'
      };
    } catch (error) {
      console.error('Profile approval error:', error);
      return fail(500, { message: 'Failed to approve profile' });
    }
  }
};
