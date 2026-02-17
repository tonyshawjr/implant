import type { PageServerLoad, Actions } from './$types';
import { prisma } from '$lib/server/db';
import { error, fail, redirect } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ params }) => {
  const { id } = params;

  // Load organization
  const organization = await prisma.organization.findUnique({
    where: { id, deletedAt: null },
    select: {
      id: true,
      name: true,
      slug: true,
      logoUrl: true,
      website: true,
      status: true
    }
  });

  if (!organization) {
    throw error(404, 'Client not found');
  }

  // Load all landing pages for this organization
  const landingPages = await prisma.landingPage.findMany({
    where: {
      organizationId: id
    },
    include: {
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

  // Load available templates for the create dropdown
  const templates = await prisma.landingPageTemplate.findMany({
    where: {
      isActive: true
    },
    select: {
      id: true,
      name: true,
      category: true,
      description: true,
      thumbnailUrl: true
    },
    orderBy: {
      name: 'asc'
    }
  });

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
    organization,
    landingPages: serializedLandingPages,
    templates,
    stats: {
      totalPages: landingPages.length,
      publishedPages: landingPages.filter(lp => lp.status === 'published').length,
      totalViews,
      totalSubmissions,
      avgConversionRate: Math.round(avgConversionRate * 100) / 100
    }
  };
};

export const actions: Actions = {
  createFromTemplate: async ({ request, params, locals }) => {
    if (!locals.user) {
      return fail(401, { message: 'Unauthorized' });
    }

    const { id: organizationId } = params;
    const formData = await request.formData();
    const templateId = formData.get('templateId') as string;

    if (!templateId) {
      return fail(400, { message: 'Template is required' });
    }

    // Verify organization exists
    const organization = await prisma.organization.findUnique({
      where: { id: organizationId, deletedAt: null },
      select: { id: true, name: true }
    });

    if (!organization) {
      return fail(404, { message: 'Client not found' });
    }

    // Get the template
    const template = await prisma.landingPageTemplate.findUnique({
      where: { id: templateId }
    });

    if (!template) {
      return fail(404, { message: 'Template not found' });
    }

    // Generate unique slug
    const baseSlug = template.slug;
    let slug = baseSlug;
    let counter = 1;

    while (await prisma.landingPage.findFirst({
      where: { organizationId, slug }
    })) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    // Create the landing page from template
    const landingPage = await prisma.landingPage.create({
      data: {
        organizationId,
        templateId,
        name: `${organization.name} - ${template.name}`,
        slug,
        status: 'draft',
        customHtml: template.htmlTemplate,
        customCss: template.cssTemplate,
        config: template.defaultConfig ?? {},
        metaTitle: `${organization.name} | Dental Implants`,
        metaDescription: `Contact ${organization.name} for dental implant services. Schedule your free consultation today.`,
        createdBy: locals.user.id
      }
    });

    // Increment template usage count
    await prisma.landingPageTemplate.update({
      where: { id: templateId },
      data: {
        usageCount: { increment: 1 }
      }
    });

    // Redirect to the editor
    throw redirect(302, `/internal/clients/${organizationId}/landing-pages/${landingPage.id}`);
  },

  togglePublish: async ({ request, params, locals }) => {
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

    if (landingPage.organizationId !== params.id) {
      return fail(403, { message: 'Landing page does not belong to this organization' });
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

  delete: async ({ request, params, locals }) => {
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

    if (landingPage.organizationId !== params.id) {
      return fail(403, { message: 'Landing page does not belong to this organization' });
    }

    // Archive the landing page instead of hard delete
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
