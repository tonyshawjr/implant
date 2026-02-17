import type { PageServerLoad, Actions } from './$types';
import { prisma } from '$lib/server/db';
import { error, fail, redirect } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ params }) => {
  const { id: organizationId, page_id: landingPageId } = params;

  // Load organization
  const organization = await prisma.organization.findUnique({
    where: { id: organizationId, deletedAt: null },
    select: {
      id: true,
      name: true,
      slug: true,
      logoUrl: true,
      website: true,
      phone: true,
      email: true,
      status: true
    }
  });

  if (!organization) {
    throw error(404, 'Client not found');
  }

  // Load landing page with template
  const landingPage = await prisma.landingPage.findUnique({
    where: { id: landingPageId },
    include: {
      template: {
        select: {
          id: true,
          name: true,
          slug: true,
          category: true,
          htmlTemplate: true,
          cssTemplate: true,
          configSchema: true,
          defaultConfig: true
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
    }
  });

  if (!landingPage) {
    throw error(404, 'Landing page not found');
  }

  if (landingPage.organizationId !== organizationId) {
    throw error(403, 'Landing page does not belong to this organization');
  }

  // Load available campaigns for linking
  const campaigns = await prisma.campaign.findMany({
    where: {
      organizationId,
      status: { in: ['draft', 'active'] }
    },
    select: {
      id: true,
      name: true,
      status: true
    },
    orderBy: { name: 'asc' }
  });

  // Parse config JSON for template variables
  let config = {};
  if (landingPage.config) {
    try {
      config = typeof landingPage.config === 'string'
        ? JSON.parse(landingPage.config)
        : landingPage.config;
    } catch {
      // Keep empty object
    }
  }

  // Parse form schema from template
  let formSchema = {
    fields: [],
    submit_button_text: 'Submit',
    success_message: 'Thank you for your submission!'
  };

  if (landingPage.template?.configSchema) {
    try {
      const parsed = typeof landingPage.template.configSchema === 'string'
        ? JSON.parse(landingPage.template.configSchema)
        : landingPage.template.configSchema;
      formSchema = {
        fields: Array.isArray(parsed.fields) ? parsed.fields : [],
        submit_button_text: parsed.submit_button_text || 'Submit',
        success_message: parsed.success_message || 'Thank you for your submission!'
      };
    } catch {
      // Keep defaults
    }
  }

  return {
    organization,
    landingPage: {
      id: landingPage.id,
      name: landingPage.name,
      slug: landingPage.slug,
      url: landingPage.url,
      status: landingPage.status,
      customHtml: landingPage.customHtml,
      customCss: landingPage.customCss,
      config,
      metaTitle: landingPage.metaTitle,
      metaDescription: landingPage.metaDescription,
      trackingPixels: landingPage.trackingPixels,
      viewCount: landingPage.viewCount,
      submissionCount: landingPage.submissionCount,
      conversionRate: landingPage.conversionRate ? Number(landingPage.conversionRate) : 0,
      publishedAt: landingPage.publishedAt?.toISOString() ?? null,
      createdAt: landingPage.createdAt.toISOString(),
      updatedAt: landingPage.updatedAt.toISOString(),
      template: landingPage.template ? {
        id: landingPage.template.id,
        name: landingPage.template.name,
        slug: landingPage.template.slug,
        category: landingPage.template.category,
        htmlTemplate: landingPage.template.htmlTemplate,
        cssTemplate: landingPage.template.cssTemplate,
        configSchema: landingPage.template.configSchema,
        defaultConfig: landingPage.template.defaultConfig
      } : null,
      campaign: landingPage.campaign ? {
        id: landingPage.campaign.id,
        name: landingPage.campaign.name
      } : null,
      createdBy: landingPage.createdByUser ? {
        id: landingPage.createdByUser.id,
        name: `${landingPage.createdByUser.firstName} ${landingPage.createdByUser.lastName}`
      } : null
    },
    campaigns,
    formSchema,
    publicUrl: `/lp/${organizationId}/${landingPageId}`
  };
};

export const actions: Actions = {
  save: async ({ request, params, locals }) => {
    if (!locals.user) {
      return fail(401, { message: 'Unauthorized' });
    }

    const { id: organizationId, page_id: landingPageId } = params;
    const formData = await request.formData();

    const name = formData.get('name') as string;
    const slug = formData.get('slug') as string;
    const metaTitle = formData.get('metaTitle') as string;
    const metaDescription = formData.get('metaDescription') as string;
    const customHtml = formData.get('customHtml') as string;
    const customCss = formData.get('customCss') as string;
    const configStr = formData.get('config') as string;
    const campaignId = formData.get('campaignId') as string;

    // Validation
    if (!name || !slug) {
      return fail(400, {
        message: 'Name and slug are required',
        values: { name, slug, metaTitle, metaDescription }
      });
    }

    // Validate slug format
    const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
    if (!slugRegex.test(slug)) {
      return fail(400, {
        message: 'Slug must be lowercase alphanumeric with hyphens only',
        values: { name, slug, metaTitle, metaDescription }
      });
    }

    // Check if slug is unique within the organization (excluding current page)
    const existingPage = await prisma.landingPage.findFirst({
      where: {
        organizationId,
        slug,
        id: { not: landingPageId }
      }
    });

    if (existingPage) {
      return fail(400, {
        message: 'A landing page with this slug already exists for this client',
        values: { name, slug, metaTitle, metaDescription }
      });
    }

    // Parse config
    let config = {};
    if (configStr) {
      try {
        config = JSON.parse(configStr);
      } catch {
        return fail(400, {
          message: 'Invalid config JSON',
          values: { name, slug, metaTitle, metaDescription }
        });
      }
    }

    // Update the landing page
    await prisma.landingPage.update({
      where: { id: landingPageId },
      data: {
        name,
        slug,
        metaTitle: metaTitle || null,
        metaDescription: metaDescription || null,
        customHtml: customHtml || null,
        customCss: customCss || null,
        config,
        campaignId: campaignId || null
      }
    });

    return {
      success: true,
      message: 'Landing page saved successfully'
    };
  },

  publish: async ({ params, locals }) => {
    if (!locals.user) {
      return fail(401, { message: 'Unauthorized' });
    }

    const { page_id: landingPageId } = params;

    await prisma.landingPage.update({
      where: { id: landingPageId },
      data: {
        status: 'published',
        publishedAt: new Date()
      }
    });

    return {
      success: true,
      message: 'Landing page published successfully'
    };
  },

  unpublish: async ({ params, locals }) => {
    if (!locals.user) {
      return fail(401, { message: 'Unauthorized' });
    }

    const { page_id: landingPageId } = params;

    await prisma.landingPage.update({
      where: { id: landingPageId },
      data: {
        status: 'draft',
        publishedAt: null
      }
    });

    return {
      success: true,
      message: 'Landing page unpublished successfully'
    };
  },

  delete: async ({ params, locals }) => {
    if (!locals.user) {
      return fail(401, { message: 'Unauthorized' });
    }

    const { id: organizationId, page_id: landingPageId } = params;

    // Archive instead of hard delete
    await prisma.landingPage.update({
      where: { id: landingPageId },
      data: {
        status: 'archived'
      }
    });

    throw redirect(302, `/internal/clients/${organizationId}/landing-pages`);
  }
};
