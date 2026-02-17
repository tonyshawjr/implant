import type { PageServerLoad } from './$types';
import { prisma } from '$lib/server/db';
import { redirect } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ params }) => {
  const template = await prisma.landingPageTemplate.findUnique({
    where: { id: params.id }
  });

  if (!template) {
    throw redirect(302, '/internal/templates');
  }

  // Parse form schema
  let formSchema = {
    fields: [],
    submit_button_text: 'Submit',
    success_message: 'Thank you!'
  };

  if (template.configSchema) {
    try {
      formSchema = typeof template.configSchema === 'string'
        ? JSON.parse(template.configSchema)
        : template.configSchema;
    } catch {
      // Keep default
    }
  }

  // Sample data for preview
  const sampleData = {
    organization_name: 'Sample Dental Practice',
    logo_url: '/images/sample-logo.png',
    phone: '(555) 123-4567',
    primary_color: '#2563eb'
  };

  return {
    template: {
      id: template.id,
      name: template.name,
      slug: template.slug,
      category: template.category,
      htmlTemplate: template.htmlTemplate,
      cssTemplate: template.cssTemplate,
      isActive: template.isActive
    },
    formSchema,
    sampleData
  };
};
