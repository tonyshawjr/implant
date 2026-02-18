import type { PageServerLoad } from './$types';
import { prisma } from '$lib/server/db';
import { error } from '@sveltejs/kit';

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

  // Get recent leads attributed to each landing page
  // We'll use sourceDetail to track landing page attribution
  const landingPageIds = landingPages.map(lp => lp.id);

  const recentLeads = await prisma.lead.findMany({
    where: {
      organizationId: organization.id,
      sourceDetail: { in: landingPageIds }
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      status: true,
      sourceDetail: true,
      createdAt: true
    },
    orderBy: {
      createdAt: 'desc'
    },
    take: 50
  });

  // Group leads by landing page
  const leadsByLandingPage: Record<string, typeof recentLeads> = {};
  for (const lead of recentLeads) {
    const lpId = lead.sourceDetail;
    if (lpId) {
      if (!leadsByLandingPage[lpId]) {
        leadsByLandingPage[lpId] = [];
      }
      leadsByLandingPage[lpId].push(lead);
    }
  }

  // Calculate aggregate stats
  const totalViews = landingPages.reduce((sum, lp) => sum + lp.viewCount, 0);
  const totalSubmissions = landingPages.reduce((sum, lp) => sum + lp.submissionCount, 0);
  const avgConversionRate = totalViews > 0
    ? (totalSubmissions / totalViews) * 100
    : 0;

  // Serialize landing pages for client
  const serializedLandingPages = landingPages.map(lp => ({
    id: lp.id,
    name: lp.name,
    slug: lp.slug,
    url: lp.url,
    status: lp.status,
    viewCount: lp.viewCount,
    submissionCount: lp.submissionCount,
    conversionRate: lp.conversionRate ? Number(lp.conversionRate) :
      (lp.viewCount > 0 ? (lp.submissionCount / lp.viewCount) * 100 : 0),
    metaTitle: lp.metaTitle,
    metaDescription: lp.metaDescription,
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
    recentLeads: (leadsByLandingPage[lp.id] || []).slice(0, 5).map(lead => ({
      id: lead.id,
      firstName: lead.firstName,
      lastName: lead.lastName,
      email: lead.email,
      status: lead.status,
      createdAt: lead.createdAt.toISOString()
    }))
  }));

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
      publishedPages: landingPages.filter(lp => lp.status === 'published').length,
      totalViews,
      totalSubmissions,
      avgConversionRate: Math.round(avgConversionRate * 100) / 100
    }
  };
};
