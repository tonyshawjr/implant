import type { PageServerLoad, Actions } from './$types';
import { prisma } from '$lib/server/db';
import { error, fail, redirect } from '@sveltejs/kit';
import type { CampaignPlatform, CampaignType, CampaignStatus } from '@prisma/client';

export const load: PageServerLoad = async ({ params, locals }) => {
  if (!locals.user) {
    throw redirect(302, '/login');
  }

  const { id } = params;

  // Fetch organization with territory assignments
  const organization = await prisma.organization.findUnique({
    where: { id, deletedAt: null },
    select: {
      id: true,
      name: true,
      slug: true,
      website: true,
      territoryAssignments: {
        where: { status: 'active' },
        include: {
          territory: {
            select: {
              id: true,
              name: true,
              city: true,
              state: true,
              radiusMiles: true,
              population: true,
              medianIncome: true,
              monthlyBasePrice: true
            }
          }
        }
      }
    }
  });

  if (!organization) {
    throw error(404, 'Client not found');
  }

  // Get existing landing pages for this organization
  const landingPages = await prisma.landingPage.findMany({
    where: { organizationId: id },
    select: {
      id: true,
      name: true,
      slug: true,
      url: true,
      status: true,
      template: {
        select: {
          id: true,
          name: true,
          category: true,
          thumbnailUrl: true
        }
      },
      viewCount: true,
      submissionCount: true,
      conversionRate: true,
      createdAt: true
    },
    orderBy: { createdAt: 'desc' }
  });

  // Get existing assets for this organization
  const assets = await prisma.creativeAsset.findMany({
    where: { organizationId: id },
    select: {
      id: true,
      name: true,
      assetType: true,
      fileUrl: true,
      thumbnailUrl: true,
      fileSize: true,
      mimeType: true,
      dimensions: true,
      durationSeconds: true,
      tags: true,
      usageCount: true,
      createdAt: true
    },
    orderBy: { createdAt: 'desc' }
  });

  // Get landing page templates for creating new pages
  const templates = await prisma.landingPageTemplate.findMany({
    where: { isActive: true },
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      category: true,
      thumbnailUrl: true,
      conversionRateAvg: true
    },
    orderBy: { usageCount: 'desc' }
  });

  // Get approved voice profiles for AI content generation
  const voiceProfiles = await prisma.voiceProfile.findMany({
    where: {
      organizationId: id,
      status: 'approved'
    },
    select: {
      id: true,
      name: true,
      tone: true,
      personality: true,
      formalityLevel: true,
      targetAudience: true,
      sampleHeadlines: true,
      sampleAdCopy: true,
      sampleCtas: true,
      qualityScore: true
    },
    orderBy: { createdAt: 'desc' }
  });

  // Get territory for budget recommendation
  const territory = organization.territoryAssignments[0]?.territory;
  const recommendedMonthlyBudget = territory?.monthlyBasePrice
    ? Number(territory.monthlyBasePrice) * 0.3 // 30% of territory price as ad budget baseline
    : 1500; // Default $1500/month

  return {
    organization: {
      id: organization.id,
      name: organization.name,
      slug: organization.slug,
      website: organization.website
    },
    territory: territory
      ? {
          id: territory.id,
          name: territory.name,
          location: `${territory.city}, ${territory.state}`,
          radiusMiles: territory.radiusMiles,
          population: territory.population,
          medianIncome: territory.medianIncome,
          monthlyBasePrice: territory.monthlyBasePrice ? Number(territory.monthlyBasePrice) : null
        }
      : null,
    landingPages: landingPages.map((lp) => ({
      id: lp.id,
      name: lp.name,
      slug: lp.slug,
      url: lp.url,
      status: lp.status,
      template: lp.template,
      metrics: {
        viewCount: lp.viewCount,
        submissionCount: lp.submissionCount,
        conversionRate: lp.conversionRate ? Number(lp.conversionRate) : null
      },
      createdAt: lp.createdAt.toISOString()
    })),
    assets: assets.map((asset) => ({
      id: asset.id,
      name: asset.name,
      assetType: asset.assetType,
      fileUrl: asset.fileUrl,
      thumbnailUrl: asset.thumbnailUrl,
      fileSize: asset.fileSize,
      mimeType: asset.mimeType,
      dimensions: asset.dimensions as { width?: number; height?: number } | null,
      durationSeconds: asset.durationSeconds,
      tags: asset.tags as string[] | null,
      usageCount: asset.usageCount,
      createdAt: asset.createdAt.toISOString()
    })),
    templates: templates.map((t) => ({
      id: t.id,
      name: t.name,
      slug: t.slug,
      description: t.description,
      category: t.category,
      thumbnailUrl: t.thumbnailUrl,
      conversionRateAvg: t.conversionRateAvg ? Number(t.conversionRateAvg) : null
    })),
    voiceProfiles: voiceProfiles.map((vp) => ({
      id: vp.id,
      name: vp.name,
      tone: vp.tone,
      personality: vp.personality,
      formalityLevel: vp.formalityLevel,
      targetAudience: vp.targetAudience,
      sampleHeadlines: vp.sampleHeadlines as string[] | null,
      sampleAdCopy: vp.sampleAdCopy as string[] | null,
      sampleCtas: vp.sampleCtas as string[] | null,
      qualityScore: vp.qualityScore ? Number(vp.qualityScore) : null
    })),
    recommendedBudget: {
      monthly: recommendedMonthlyBudget,
      daily: Math.round(recommendedMonthlyBudget / 30)
    }
  };
};

export const actions: Actions = {
  createCampaign: async ({ params, request, locals }) => {
    if (!locals.user) {
      return fail(401, { error: 'Not authenticated' });
    }

    const formData = await request.formData();

    // Extract form data
    const platform = formData.get('platform') as CampaignPlatform;
    const campaignType = formData.get('campaignType') as CampaignType;
    const name = formData.get('name') as string;
    const objective = formData.get('objective') as string;
    const primaryCreativeId = formData.get('primaryCreativeId') as string;
    const headlines = formData.get('headlines') as string;
    const primaryText = formData.get('primaryText') as string;
    const callToAction = formData.get('callToAction') as string;
    const landingPageId = formData.get('landingPageId') as string;
    const monthlyBudget = parseFloat(formData.get('monthlyBudget') as string);
    const dailyBudget = parseFloat(formData.get('dailyBudget') as string);
    const startDate = formData.get('startDate') as string;
    const endDate = formData.get('endDate') as string;
    const isOngoing = formData.get('isOngoing') === 'true';
    const submitType = formData.get('submitType') as 'review' | 'publish';

    // Validation
    if (!platform || !campaignType || !name) {
      return fail(400, {
        error: 'Platform, campaign type, and name are required',
        values: { platform, campaignType, name }
      });
    }

    if (!monthlyBudget || monthlyBudget <= 0) {
      return fail(400, { error: 'Valid monthly budget is required' });
    }

    if (!startDate) {
      return fail(400, { error: 'Start date is required' });
    }

    // Determine status based on submit type and user role
    let status: CampaignStatus = 'draft';
    if (submitType === 'review') {
      status = 'pending_review';
    } else if (submitType === 'publish') {
      // Only admins can publish directly
      if (
        locals.user.role === 'super_admin' ||
        locals.user.role === 'admin'
      ) {
        status = 'active';
      } else {
        status = 'pending_review';
      }
    }

    // Get organization's territory
    const territoryAssignment = await prisma.territoryAssignment.findFirst({
      where: {
        organizationId: params.id,
        status: 'active'
      }
    });

    try {
      // Create the campaign
      const campaign = await prisma.campaign.create({
        data: {
          organizationId: params.id,
          territoryId: territoryAssignment?.territoryId || null,
          name,
          platform,
          campaignType,
          status,
          objective: objective || null,
          monthlyBudget,
          dailyBudget: dailyBudget || Math.round((monthlyBudget / 30) * 100) / 100,
          startDate: new Date(startDate),
          endDate: isOngoing ? null : endDate ? new Date(endDate) : null,
          createdBy: locals.user.id,
          approvedBy: status === 'active' ? locals.user.id : null,
          approvedAt: status === 'active' ? new Date() : null
        }
      });

      // Create campaign creative if primary creative is selected
      if (primaryCreativeId || headlines || primaryText) {
        // Get the asset info if a primary creative is selected
        let mediaUrls: string[] | null = null;
        let creativeType: 'image' | 'video' | 'text' = 'text';

        if (primaryCreativeId) {
          const asset = await prisma.creativeAsset.findUnique({
            where: { id: primaryCreativeId }
          });

          if (asset) {
            mediaUrls = [asset.fileUrl];
            creativeType = asset.assetType === 'video' ? 'video' : 'image';

            // Increment usage count
            await prisma.creativeAsset.update({
              where: { id: primaryCreativeId },
              data: { usageCount: { increment: 1 } }
            });
          }
        }

        // Parse headlines (one per line)
        const headlineList = headlines
          ? headlines.split('\n').filter((h) => h.trim())
          : [];
        const primaryHeadline = headlineList[0] || null;

        await prisma.campaignCreative.create({
          data: {
            campaignId: campaign.id,
            creativeType,
            headline: primaryHeadline,
            body: primaryText || null,
            ctaText: callToAction || null,
            mediaUrls: mediaUrls || undefined,
            status: status === 'active' ? 'approved' : 'draft',
            aiGenerated: false
          }
        });
      }

      // Link landing page to campaign if selected
      if (landingPageId) {
        await prisma.landingPage.update({
          where: { id: landingPageId },
          data: { campaignId: campaign.id }
        });
      }

      // Create audit log entry
      await prisma.auditLog.create({
        data: {
          userId: locals.user.id,
          organizationId: params.id,
          action: 'campaign_created',
          entityType: 'campaign',
          entityId: campaign.id,
          newValues: {
            name,
            platform,
            campaignType,
            status,
            monthlyBudget,
            dailyBudget,
            startDate,
            endDate: isOngoing ? null : endDate
          }
        }
      });

      return {
        success: true,
        campaignId: campaign.id,
        message:
          status === 'active'
            ? 'Campaign created and published successfully'
            : 'Campaign created and submitted for review'
      };
    } catch (err) {
      console.error('Failed to create campaign:', err);
      return fail(500, { error: 'Failed to create campaign. Please try again.' });
    }
  },

  createLandingPage: async ({ params, request, locals }) => {
    if (!locals.user) {
      return fail(401, { error: 'Not authenticated' });
    }

    const formData = await request.formData();
    const templateId = formData.get('templateId') as string;
    const name = formData.get('name') as string;

    if (!templateId || !name) {
      return fail(400, { error: 'Template and name are required' });
    }

    try {
      // Get the template
      const template = await prisma.landingPageTemplate.findUnique({
        where: { id: templateId }
      });

      if (!template) {
        return fail(404, { error: 'Template not found' });
      }

      // Generate unique slug
      const baseSlug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      let slug = baseSlug;
      let counter = 1;

      while (
        await prisma.landingPage.findFirst({
          where: { organizationId: params.id, slug }
        })
      ) {
        slug = `${baseSlug}-${counter}`;
        counter++;
      }

      // Create the landing page
      const landingPage = await prisma.landingPage.create({
        data: {
          organizationId: params.id,
          templateId,
          name,
          slug,
          status: 'draft',
          config: template.defaultConfig || {},
          createdBy: locals.user.id
        }
      });

      // Update template usage count
      await prisma.landingPageTemplate.update({
        where: { id: templateId },
        data: { usageCount: { increment: 1 } }
      });

      return {
        success: true,
        landingPageId: landingPage.id,
        message: 'Landing page created successfully'
      };
    } catch (err) {
      console.error('Failed to create landing page:', err);
      return fail(500, { error: 'Failed to create landing page' });
    }
  }
};
