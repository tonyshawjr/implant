import type { PageServerLoad, Actions } from './$types';
import { prisma } from '$lib/server/db';
import { fail } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ url }) => {
  const organizationId = url.searchParams.get('organization') || '';
  const statusFilter = url.searchParams.get('status') || '';
  const search = url.searchParams.get('search') || '';

  // Build the where clause dynamically
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {};

  if (organizationId) {
    where.organizationId = organizationId;
  }

  if (statusFilter && ['draft', 'published', 'archived'].includes(statusFilter)) {
    where.status = statusFilter;
  }

  if (search) {
    where.name = {
      contains: search,
      mode: 'insensitive'
    };
  }

  // Get all landing pages with organization info
  const landingPages = await prisma.landingPage.findMany({
    where,
    include: {
      organization: {
        select: {
          id: true,
          name: true,
          slug: true,
          logoUrl: true
        }
      },
      template: {
        select: {
          id: true,
          name: true,
          category: true
        }
      },
      campaign: {
        select: {
          id: true,
          name: true
        }
      },
      createdByUser: {
        select: {
          id: true,
          firstName: true,
          lastName: true
        }
      }
    },
    orderBy: {
      createdAt: 'desc'
    }
  });

  // Get all organizations for filter dropdown
  const organizations = await prisma.organization.findMany({
    where: {
      deletedAt: null
    },
    select: {
      id: true,
      name: true,
      slug: true
    },
    orderBy: {
      name: 'asc'
    }
  });

  // Calculate aggregate stats
  const totalPages = landingPages.length;
  const publishedPages = landingPages.filter(lp => lp.status === 'published').length;
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
    organization: lp.organization ? {
      id: lp.organization.id,
      name: lp.organization.name,
      slug: lp.organization.slug,
      logoUrl: lp.organization.logoUrl
    } : null,
    template: lp.template ? {
      id: lp.template.id,
      name: lp.template.name,
      category: lp.template.category
    } : null,
    campaign: lp.campaign ? {
      id: lp.campaign.id,
      name: lp.campaign.name
    } : null,
    createdBy: lp.createdByUser ? {
      id: lp.createdByUser.id,
      name: `${lp.createdByUser.firstName} ${lp.createdByUser.lastName}`
    } : null
  }));

  return {
    landingPages: serializedLandingPages,
    organizations,
    stats: {
      totalPages,
      publishedPages,
      draftPages: landingPages.filter(lp => lp.status === 'draft').length,
      archivedPages: landingPages.filter(lp => lp.status === 'archived').length,
      totalViews,
      totalSubmissions,
      avgConversionRate: Math.round(avgConversionRate * 100) / 100
    },
    filters: {
      organizationId,
      status: statusFilter,
      search
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
      return fail(400, { message: 'Landing page ID is required' });
    }

    const landingPage = await prisma.landingPage.findUnique({
      where: { id: landingPageId }
    });

    if (!landingPage) {
      return fail(404, { message: 'Landing page not found' });
    }

    const newStatus = landingPage.status === 'published' ? 'draft' : 'published';

    await prisma.landingPage.update({
      where: { id: landingPageId },
      data: {
        status: newStatus,
        publishedAt: newStatus === 'published' ? new Date() : null
      }
    });

    return {
      success: true,
      message: newStatus === 'published' ? 'Landing page published' : 'Landing page unpublished'
    };
  },

  archive: async ({ request, locals }) => {
    if (!locals.user) {
      return fail(401, { message: 'Unauthorized' });
    }

    const formData = await request.formData();
    const landingPageId = formData.get('landingPageId') as string;

    if (!landingPageId) {
      return fail(400, { message: 'Landing page ID is required' });
    }

    const landingPage = await prisma.landingPage.findUnique({
      where: { id: landingPageId }
    });

    if (!landingPage) {
      return fail(404, { message: 'Landing page not found' });
    }

    await prisma.landingPage.update({
      where: { id: landingPageId },
      data: {
        status: 'archived'
      }
    });

    return {
      success: true,
      message: 'Landing page archived successfully'
    };
  }
};
