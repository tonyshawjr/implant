import type { PageServerLoad, Actions } from './$types';
import { prisma } from '$lib/server/db';
import { fail } from '@sveltejs/kit';
import type { LandingPageCategory } from '@prisma/client';

export const load: PageServerLoad = async ({ url }) => {
  const search = url.searchParams.get('search') || '';
  const category = url.searchParams.get('category') || '';

  // Build the where clause dynamically
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {};

  if (search) {
    where.name = {
      contains: search,
      mode: 'insensitive'
    };
  }

  if (category && ['implant', 'cosmetic', 'general', 'promo'].includes(category)) {
    where.category = category as LandingPageCategory;
  }

  // Get all templates
  const templates = await prisma.landingPageTemplate.findMany({
    where,
    include: {
      createdByUser: {
        select: {
          id: true,
          firstName: true,
          lastName: true
        }
      },
      _count: {
        select: {
          landingPages: true
        }
      }
    },
    orderBy: {
      createdAt: 'desc'
    }
  });

  // Calculate stats
  const stats = {
    totalTemplates: templates.length,
    activeTemplates: templates.filter(t => t.isActive).length,
    totalUsage: templates.reduce((sum, t) => sum + t.usageCount, 0),
    avgConversionRate: 0
  };

  const templatesWithConversion = templates.filter(t => t.conversionRateAvg !== null);
  if (templatesWithConversion.length > 0) {
    stats.avgConversionRate = Math.round(
      templatesWithConversion.reduce((sum, t) => sum + Number(t.conversionRateAvg), 0) /
      templatesWithConversion.length * 100
    ) / 100;
  }

  // Serialize templates for client
  const serializedTemplates = templates.map(template => ({
    id: template.id,
    name: template.name,
    slug: template.slug,
    description: template.description,
    category: template.category,
    thumbnailUrl: template.thumbnailUrl,
    isActive: template.isActive,
    usageCount: template.usageCount,
    conversionRateAvg: template.conversionRateAvg ? Number(template.conversionRateAvg) : null,
    createdAt: template.createdAt.toISOString(),
    updatedAt: template.updatedAt.toISOString(),
    createdBy: template.createdByUser,
    landingPageCount: template._count.landingPages
  }));

  return {
    templates: serializedTemplates,
    stats,
    filters: {
      search,
      category
    }
  };
};

export const actions: Actions = {
  clone: async ({ request, locals }) => {
    if (!locals.user) {
      return fail(401, { message: 'Unauthorized' });
    }

    const formData = await request.formData();
    const templateId = formData.get('templateId') as string;

    if (!templateId) {
      return fail(400, { message: 'Template ID is required' });
    }

    // Get the original template
    const original = await prisma.landingPageTemplate.findUnique({
      where: { id: templateId }
    });

    if (!original) {
      return fail(404, { message: 'Template not found' });
    }

    // Create a unique slug
    const baseSlug = `${original.slug}-copy`;
    let slug = baseSlug;
    let counter = 1;

    while (await prisma.landingPageTemplate.findUnique({ where: { slug } })) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    // Clone the template
    const cloned = await prisma.landingPageTemplate.create({
      data: {
        name: `${original.name} (Copy)`,
        slug,
        description: original.description,
        category: original.category,
        thumbnailUrl: original.thumbnailUrl,
        htmlTemplate: original.htmlTemplate,
        cssTemplate: original.cssTemplate,
        configSchema: original.configSchema ?? undefined,
        defaultConfig: original.defaultConfig ?? undefined,
        isActive: false,
        createdBy: locals.user.id
      }
    });

    return {
      success: true,
      message: 'Template cloned successfully',
      templateId: cloned.id
    };
  },

  toggleActive: async ({ request, locals }) => {
    if (!locals.user) {
      return fail(401, { message: 'Unauthorized' });
    }

    const formData = await request.formData();
    const templateId = formData.get('templateId') as string;

    if (!templateId) {
      return fail(400, { message: 'Template ID is required' });
    }

    const template = await prisma.landingPageTemplate.findUnique({
      where: { id: templateId }
    });

    if (!template) {
      return fail(404, { message: 'Template not found' });
    }

    await prisma.landingPageTemplate.update({
      where: { id: templateId },
      data: {
        isActive: !template.isActive
      }
    });

    return {
      success: true,
      message: template.isActive ? 'Template deactivated' : 'Template activated'
    };
  },

  delete: async ({ request, locals }) => {
    if (!locals.user) {
      return fail(401, { message: 'Unauthorized' });
    }

    const formData = await request.formData();
    const templateId = formData.get('templateId') as string;

    if (!templateId) {
      return fail(400, { message: 'Template ID is required' });
    }

    // Soft delete - set isActive to false (model doesn't have deletedAt)
    await prisma.landingPageTemplate.update({
      where: { id: templateId },
      data: {
        isActive: false
      }
    });

    return {
      success: true,
      message: 'Template deleted successfully'
    };
  }
};
