import type { PageServerLoad, Actions } from './$types';
import type { LandingPageCategory } from '@prisma/client';
import { prisma } from '$lib/server/db';
import { fail, redirect } from '@sveltejs/kit';
import { funnelTemplates } from '$lib/server/landing-pages/templates';

export const load: PageServerLoad = async () => {
  // Load all organizations for dropdown
  const organizations = await prisma.organization.findMany({
    where: {
      deletedAt: null,
      status: { in: ['active', 'onboarding'] }
    },
    select: {
      id: true,
      name: true,
      slug: true,
      logoUrl: true,
      phone: true,
      city: true,
      state: true
    },
    orderBy: {
      name: 'asc'
    }
  });

  // Get funnel templates from the templates.ts file
  const templates = funnelTemplates.map(template => ({
    slug: template.slug,
    name: template.name,
    description: template.description,
    category: template.category,
    thumbnailUrl: template.thumbnailUrl,
    estimatedConversionRate: template.estimatedConversionRate,
    primaryColor: template.styles.primaryColor,
    stepCount: template.steps.length
  }));

  return {
    organizations,
    templates
  };
};

export const actions: Actions = {
  create: async ({ request, locals }) => {
    if (!locals.user) {
      return fail(401, { message: 'Unauthorized' });
    }

    const formData = await request.formData();
    const organizationId = formData.get('organizationId') as string;
    const templateSlug = formData.get('templateSlug') as string;
    const name = formData.get('name') as string;
    const customSlug = formData.get('slug') as string;

    // Validation
    if (!organizationId) {
      return fail(400, { message: 'Please select a client' });
    }

    if (!templateSlug) {
      return fail(400, { message: 'Please select a template' });
    }

    if (!name) {
      return fail(400, { message: 'Please enter a name for the landing page' });
    }

    // Validate slug format
    const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
    if (customSlug && !slugRegex.test(customSlug)) {
      return fail(400, {
        message: 'Slug must be lowercase alphanumeric with hyphens only'
      });
    }

    // Verify organization exists
    const organization = await prisma.organization.findUnique({
      where: { id: organizationId, deletedAt: null },
      select: {
        id: true,
        name: true,
        phone: true,
        city: true,
        state: true,
        logoUrl: true
      }
    });

    if (!organization) {
      return fail(404, { message: 'Client not found' });
    }

    // Get the funnel template
    const funnelTemplate = funnelTemplates.find(t => t.slug === templateSlug);
    if (!funnelTemplate) {
      return fail(404, { message: 'Template not found' });
    }

    // Generate unique slug
    const baseSlug = customSlug || generateSlug(name);
    let slug = baseSlug;
    let counter = 1;

    while (await prisma.landingPage.findFirst({
      where: { organizationId, slug }
    })) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    // First, check if we have a LandingPageTemplate record for this funnel,
    // or create the landing page with the funnel config stored directly

    // Find or create a template record
    let dbTemplate = await prisma.landingPageTemplate.findUnique({
      where: { slug: templateSlug }
    });

    if (!dbTemplate) {
      // Create a template record from the funnel template
      dbTemplate = await prisma.landingPageTemplate.create({
        data: {
          name: funnelTemplate.name,
          slug: funnelTemplate.slug,
          description: funnelTemplate.description,
          category: funnelTemplate.category as LandingPageCategory,
          thumbnailUrl: funnelTemplate.thumbnailUrl,
          htmlTemplate: '', // Funnel templates generate HTML dynamically
          cssTemplate: null,
          configSchema: JSON.parse(JSON.stringify({
            type: 'funnel',
            steps: funnelTemplate.steps,
            styles: funnelTemplate.styles,
            resultLogic: funnelTemplate.resultLogic || null
          })),
          defaultConfig: JSON.parse(JSON.stringify({
            templateSlug: funnelTemplate.slug,
            styles: funnelTemplate.styles
          })),
          isActive: true,
          createdBy: locals.user.id
        }
      });
    }

    // Create the landing page
    const landingPage = await prisma.landingPage.create({
      data: {
        organizationId,
        templateId: dbTemplate.id,
        name,
        slug,
        status: 'draft',
        config: {
          templateSlug: funnelTemplate.slug,
          styles: funnelTemplate.styles,
          organizationData: {
            name: organization.name,
            phone: organization.phone || '',
            city: organization.city || '',
            state: organization.state || '',
            logoUrl: organization.logoUrl || ''
          }
        },
        metaTitle: `${organization.name} | ${funnelTemplate.name}`,
        metaDescription: funnelTemplate.description,
        createdBy: locals.user.id
      }
    });

    // Increment template usage count
    await prisma.landingPageTemplate.update({
      where: { id: dbTemplate.id },
      data: {
        usageCount: { increment: 1 }
      }
    });

    // Redirect to the landing page editor within the client context
    throw redirect(302, `/internal/clients/${organizationId}/landing-pages/${landingPage.id}`);
  }
};

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}
