import type { PageServerLoad } from './$types';
import { prisma } from '$lib/server/db';
import { error } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ params }) => {
  const { org_id, page_id } = params;

  // Load landing page by page_id and organization_id
  const landingPage = await prisma.landingPage.findFirst({
    where: {
      id: page_id,
      organizationId: org_id,
      status: 'published'
    },
    select: {
      id: true,
      name: true,
      slug: true,
      url: true,
      status: true,
      config: true,
      customHtml: true,
      customCss: true,
      metaTitle: true,
      metaDescription: true,
      trackingPixels: true,
      viewCount: true,
      submissionCount: true,
      conversionRate: true,
      publishedAt: true,
      template: {
        select: {
          id: true,
          name: true,
          htmlTemplate: true,
          cssTemplate: true,
          configSchema: true,
          defaultConfig: true
        }
      },
      organization: {
        select: {
          id: true,
          name: true,
          slug: true,
          logoUrl: true,
          phone: true,
          email: true,
          website: true,
          status: true
        }
      }
    }
  });

  // Return 404 if landing page not found or not published
  if (!landingPage) {
    throw error(404, {
      message: 'Landing page not found'
    });
  }

  // Check if organization is active
  if (landingPage.organization.status !== 'active') {
    throw error(404, {
      message: 'Landing page not available'
    });
  }

  // Increment view count (fire and forget - don't await)
  prisma.landingPage.update({
    where: { id: landingPage.id },
    data: { viewCount: { increment: 1 } }
  }).catch((err) => {
    console.error('Failed to increment view count:', err);
  });

  // Extract primary color from config if available
  const config = landingPage.config as Record<string, unknown> | null;
  const primaryColor = (config?.primaryColor as string) || '#2563eb';

  return {
    landingPage: {
      id: landingPage.id,
      name: landingPage.name,
      slug: landingPage.slug,
      metaTitle: landingPage.metaTitle || landingPage.name,
      metaDescription: landingPage.metaDescription || `Contact ${landingPage.organization.name} for dental implant services`,
      customHtml: landingPage.customHtml,
      customCss: landingPage.customCss,
      config: landingPage.config,
      trackingPixels: landingPage.trackingPixels,
      template: landingPage.template
    },
    organization: {
      id: landingPage.organization.id,
      name: landingPage.organization.name,
      slug: landingPage.organization.slug,
      logoUrl: landingPage.organization.logoUrl,
      phone: landingPage.organization.phone,
      email: landingPage.organization.email,
      website: landingPage.organization.website,
      primaryColor
    }
  };
};
