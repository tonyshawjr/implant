import type { PageServerLoad, Actions } from './$types';
import { prisma } from '$lib/server/db';
import { error, fail } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ parent }) => {
  const { organization } = await parent();

  if (!organization) {
    throw error(404, 'Organization not found');
  }

  // Load all landing pages for this organization
  const landingPages = await prisma.landingPage.findMany({
    where: {
      organizationId: organization.id,
      status: { not: 'archived' }
    },
    include: {
      template: {
        select: {
          id: true,
          name: true,
          category: true,
          thumbnailUrl: true
        }
      },
      campaign: {
        select: {
          id: true,
          name: true
        }
      }
    },
    orderBy: {
      createdAt: 'desc'
    }
  });

  // Get ALL leads from landing pages for this organization
  // sourceDetail stores either "Landing Page: UUID" (old) or "Landing Page: Name" (new)
  const allLandingPageLeads = await prisma.lead.findMany({
    where: {
      organizationId: organization.id,
      source: 'website',
      sourceDetail: { startsWith: 'Landing Page:' }
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      status: true,
      temperature: true,
      sourceDetail: true,
      createdAt: true
    },
    orderBy: {
      createdAt: 'desc'
    }
  });

  // Match leads to landing pages by ID or name in sourceDetail
  const leadsByLandingPage: Record<string, typeof allLandingPageLeads> = {};
  for (const lead of allLandingPageLeads) {
    const detail = lead.sourceDetail?.replace('Landing Page:', '').trim() || '';
    // Match by landing page ID (old format) or name (new format)
    const matchedPage = landingPages.find(lp =>
      lp.id === detail || lp.name === detail
    );
    if (matchedPage) {
      if (!leadsByLandingPage[matchedPage.id]) {
        leadsByLandingPage[matchedPage.id] = [];
      }
      leadsByLandingPage[matchedPage.id].push(lead);
    }
  }

  // Calculate aggregate stats
  const totalViews = landingPages.reduce((sum, lp) => sum + lp.viewCount, 0);
  const totalSubmissions = landingPages.reduce((sum, lp) => sum + lp.submissionCount, 0);
  const publishedCount = landingPages.filter(lp => lp.status === 'published').length;

  // This month's leads
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);
  const leadsThisMonth = allLandingPageLeads.filter(
    l => new Date(l.createdAt) >= startOfMonth
  ).length;

  // Best converting page
  let bestConversion = 0;
  let bestPageName = '';
  for (const lp of landingPages) {
    const rate = lp.viewCount > 0 ? (lp.submissionCount / lp.viewCount) * 100 : 0;
    if (rate > bestConversion && lp.submissionCount > 0) {
      bestConversion = rate;
      bestPageName = lp.template?.name || lp.name;
    }
  }

  // Serialize landing pages for client
  const serializedLandingPages = landingPages.map(lp => {
    const lpLeads = leadsByLandingPage[lp.id] || [];
    const lastLead = lpLeads.length > 0 ? lpLeads[0] : null;

    return {
      id: lp.id,
      name: lp.name,
      slug: lp.slug,
      url: lp.url,
      status: lp.status,
      viewCount: lp.viewCount,
      submissionCount: lp.submissionCount,
      conversionRate: lp.conversionRate ? Number(lp.conversionRate) :
        (lp.viewCount > 0 ? (lp.submissionCount / lp.viewCount) * 100 : 0),
      publishedAt: lp.publishedAt?.toISOString() ?? null,
      createdAt: lp.createdAt.toISOString(),
      updatedAt: lp.updatedAt.toISOString(),
      template: lp.template ? {
        id: lp.template.id,
        name: lp.template.name,
        category: lp.template.category,
        thumbnailUrl: lp.template.thumbnailUrl
      } : null,
      campaign: lp.campaign ? {
        id: lp.campaign.id,
        name: lp.campaign.name
      } : null,
      leadCount: lpLeads.length,
      lastLeadAt: lastLead?.createdAt.toISOString() ?? null,
      recentLeads: lpLeads.slice(0, 3).map(lead => ({
        id: lead.id,
        firstName: lead.firstName,
        lastName: lead.lastName,
        email: lead.email,
        status: lead.status,
        temperature: lead.temperature,
        createdAt: lead.createdAt.toISOString()
      }))
    };
  });

  // Load available templates for creating new landing pages
  const templates = await prisma.landingPageTemplate.findMany({
    where: {
      isActive: true
    },
    select: {
      id: true,
      name: true,
      slug: true,
      category: true,
      description: true,
      thumbnailUrl: true,
      conversionRateAvg: true
    },
    orderBy: [
      { category: 'asc' },
      { name: 'asc' }
    ]
  });

  return {
    landingPages: serializedLandingPages,
    templates: templates.map(t => ({
      id: t.id,
      name: t.name,
      slug: t.slug,
      category: t.category,
      description: t.description,
      thumbnailUrl: t.thumbnailUrl,
      estimatedConversionRate: t.conversionRateAvg ? Number(t.conversionRateAvg) : null
    })),
    stats: {
      totalPages: landingPages.length,
      publishedPages: publishedCount,
      totalViews,
      totalSubmissions,
      leadsThisMonth,
      bestConversion: Math.round(bestConversion * 10) / 10,
      bestPageName
    }
  };
};

export const actions: Actions = {
  togglePublish: async ({ request, locals }) => {
    if (!locals.user) {
      return fail(401, { message: 'Unauthorized' });
    }

    const formData = await request.formData();
    const landingPageId = formData.get('landingPageId') as string;

    if (!landingPageId) {
      return fail(400, { message: 'Missing landing page ID' });
    }

    try {
      const landingPage = await prisma.landingPage.findFirst({
        where: {
          id: landingPageId,
          organizationId: locals.user.organizationId ?? undefined
        }
      });

      if (!landingPage) {
        return fail(404, { message: 'Landing page not found' });
      }

      const newStatus = landingPage.status === 'published' ? 'draft' : 'published';

      await prisma.landingPage.update({
        where: { id: landingPageId },
        data: {
          status: newStatus,
          publishedAt: newStatus === 'published' ? new Date() : landingPage.publishedAt
        }
      });

      return { success: true };
    } catch (e) {
      console.error('Error toggling publish status:', e);
      return fail(500, { message: 'Failed to update status' });
    }
  }
};
