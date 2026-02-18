import type { PageServerLoad, Actions } from './$types';
import { prisma } from '$lib/server/db';
import { error, fail, redirect } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ parent, url }) => {
  const { organization, user } = await parent();

  if (!organization) {
    throw error(404, 'Organization not found');
  }

  // Get pre-selected template from query parameter
  const preselectedTemplateId = url.searchParams.get('template');

  // Load available templates
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
      conversionRateAvg: true,
      usageCount: true
    },
    orderBy: [
      { category: 'asc' },
      { usageCount: 'desc' },
      { name: 'asc' }
    ]
  });

  // Find the preselected template if provided
  const selectedTemplate = preselectedTemplateId
    ? templates.find(t => t.id === preselectedTemplateId)
    : null;

  return {
    templates: templates.map(t => ({
      id: t.id,
      name: t.name,
      slug: t.slug,
      category: t.category,
      description: t.description,
      thumbnailUrl: t.thumbnailUrl,
      estimatedConversionRate: t.conversionRateAvg ? Number(t.conversionRateAvg) : null,
      usageCount: t.usageCount
    })),
    preselectedTemplate: selectedTemplate ? {
      id: selectedTemplate.id,
      name: selectedTemplate.name,
      slug: selectedTemplate.slug,
      category: selectedTemplate.category,
      description: selectedTemplate.description,
      thumbnailUrl: selectedTemplate.thumbnailUrl,
      estimatedConversionRate: selectedTemplate.conversionRateAvg
        ? Number(selectedTemplate.conversionRateAvg)
        : null
    } : null,
    organization: {
      id: organization.id,
      name: organization.name
    }
  };
};

/**
 * Generate a unique slug for a landing page
 */
async function generateUniqueSlug(organizationId: string, baseName: string): Promise<string> {
  // Clean up the name to create a base slug
  const baseSlug = baseName
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .substring(0, 50);

  let slug = baseSlug;
  let counter = 1;

  // Check if slug exists and generate a unique one
  while (await prisma.landingPage.findFirst({
    where: { organizationId, slug }
  })) {
    slug = `${baseSlug}-${counter}`;
    counter++;
  }

  return slug;
}

export const actions: Actions = {
  create: async ({ request, locals }) => {
    const { user, organization } = locals;

    if (!user) {
      return fail(401, { message: 'You must be logged in' });
    }

    if (!organization) {
      return fail(400, { message: 'No organization found' });
    }

    const formData = await request.formData();
    const templateId = formData.get('templateId') as string;
    const name = formData.get('name') as string;
    const customSlug = formData.get('slug') as string | null;

    // Validation
    if (!templateId) {
      return fail(400, {
        message: 'Please select a template',
        templateId,
        name,
        slug: customSlug
      });
    }

    if (!name || name.trim().length < 3) {
      return fail(400, {
        message: 'Name must be at least 3 characters',
        templateId,
        name,
        slug: customSlug
      });
    }

    // Get the template
    const template = await prisma.landingPageTemplate.findUnique({
      where: { id: templateId }
    });

    if (!template) {
      return fail(404, {
        message: 'Template not found',
        templateId,
        name,
        slug: customSlug
      });
    }

    // Generate or validate slug
    let slug: string;
    if (customSlug && customSlug.trim()) {
      // Clean up the custom slug
      slug = customSlug
        .toLowerCase()
        .replace(/[^a-z0-9-]/g, '')
        .replace(/-+/g, '-')
        .substring(0, 50);

      // Check if custom slug is already taken
      const existingPage = await prisma.landingPage.findFirst({
        where: { organizationId: organization.id, slug }
      });

      if (existingPage) {
        return fail(400, {
          message: 'This URL slug is already in use. Please choose a different one.',
          templateId,
          name,
          slug: customSlug
        });
      }
    } else {
      // Generate a unique slug from the name
      slug = await generateUniqueSlug(organization.id, name);
    }

    try {
      // Create the landing page from template
      const landingPage = await prisma.landingPage.create({
        data: {
          organizationId: organization.id,
          templateId,
          name: name.trim(),
          slug,
          status: 'draft',
          customHtml: template.htmlTemplate,
          customCss: template.cssTemplate,
          config: template.defaultConfig ?? {},
          metaTitle: `${name.trim()} | ${organization.name}`,
          metaDescription: `Contact ${organization.name} for dental implant services. Schedule your free consultation today.`,
          createdBy: user.id,
          viewCount: 0,
          submissionCount: 0
        }
      });

      // Increment template usage count
      await prisma.landingPageTemplate.update({
        where: { id: templateId },
        data: {
          usageCount: { increment: 1 }
        }
      });

      // Redirect to the landing pages list with success
      throw redirect(303, '/landing-pages?created=' + landingPage.id);
    } catch (err) {
      // Check if it's a redirect (which is thrown intentionally)
      if (err && typeof err === 'object' && 'status' in err && err.status === 303) {
        throw err;
      }

      console.error('Error creating landing page:', err);
      return fail(500, {
        message: 'Failed to create landing page. Please try again.',
        templateId,
        name,
        slug: customSlug
      });
    }
  }
};
