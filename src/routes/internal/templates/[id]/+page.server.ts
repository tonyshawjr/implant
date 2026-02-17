import type { PageServerLoad, Actions } from './$types';
import { prisma } from '$lib/server/db';
import { fail, redirect } from '@sveltejs/kit';
import type { LandingPageCategory } from '@prisma/client';

interface FormField {
  id: string;
  name: string;
  type: 'text' | 'email' | 'phone' | 'select' | 'checkbox' | 'textarea';
  label: string;
  placeholder?: string;
  required: boolean;
  options?: string[];
}

interface FormSchema {
  fields: FormField[];
  submit_button_text: string;
  success_message: string;
}

export const load: PageServerLoad = async ({ params }) => {
  const template = await prisma.landingPageTemplate.findUnique({
    where: { id: params.id },
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
    }
  });

  if (!template) {
    throw redirect(302, '/internal/templates');
  }

  // Parse the configSchema to get form fields
  let formSchema: FormSchema = {
    fields: [],
    submit_button_text: 'Submit',
    success_message: 'Thank you for your submission!'
  };

  if (template.configSchema) {
    try {
      const parsed = typeof template.configSchema === 'string'
        ? JSON.parse(template.configSchema)
        : template.configSchema;

      // Ensure the parsed schema has the expected structure
      formSchema = {
        fields: Array.isArray(parsed.fields) ? parsed.fields : [],
        submit_button_text: parsed.submit_button_text || 'Submit',
        success_message: parsed.success_message || 'Thank you for your submission!'
      };
    } catch {
      // Keep default
    }
  }

  return {
    template: {
      id: template.id,
      name: template.name,
      slug: template.slug,
      description: template.description,
      category: template.category,
      thumbnailUrl: template.thumbnailUrl,
      htmlTemplate: template.htmlTemplate,
      cssTemplate: template.cssTemplate,
      configSchema: template.configSchema,
      defaultConfig: template.defaultConfig,
      isActive: template.isActive,
      usageCount: template.usageCount,
      conversionRateAvg: template.conversionRateAvg ? Number(template.conversionRateAvg) : null,
      createdAt: template.createdAt.toISOString(),
      updatedAt: template.updatedAt.toISOString(),
      createdBy: template.createdByUser,
      landingPageCount: template._count.landingPages
    },
    formSchema
  };
};

export const actions: Actions = {
  save: async ({ request, params, locals }) => {
    if (!locals.user) {
      return fail(401, { message: 'Unauthorized' });
    }

    const formData = await request.formData();
    const name = formData.get('name') as string;
    const slug = formData.get('slug') as string;
    const description = formData.get('description') as string;
    const category = formData.get('category') as LandingPageCategory;
    const htmlTemplate = formData.get('htmlTemplate') as string;
    const cssTemplate = formData.get('cssTemplate') as string;
    const formSchemaStr = formData.get('formSchema') as string;
    const isActive = formData.get('isActive') === 'true';

    // Validation
    if (!name || !slug || !htmlTemplate) {
      return fail(400, {
        message: 'Name, slug, and HTML template are required',
        values: { name, slug, description, category, htmlTemplate, cssTemplate }
      });
    }

    // Validate slug format
    const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
    if (!slugRegex.test(slug)) {
      return fail(400, {
        message: 'Slug must be lowercase alphanumeric with hyphens only',
        values: { name, slug, description, category, htmlTemplate, cssTemplate }
      });
    }

    // Check if slug is unique (excluding current template)
    const existingTemplate = await prisma.landingPageTemplate.findFirst({
      where: {
        slug,
        id: { not: params.id }
      }
    });

    if (existingTemplate) {
      return fail(400, {
        message: 'A template with this slug already exists',
        values: { name, slug, description, category, htmlTemplate, cssTemplate }
      });
    }

    // Parse form schema
    let configSchema = null;
    if (formSchemaStr) {
      try {
        configSchema = JSON.parse(formSchemaStr);
      } catch {
        return fail(400, {
          message: 'Invalid form schema JSON',
          values: { name, slug, description, category, htmlTemplate, cssTemplate }
        });
      }
    }

    // Update the template
    await prisma.landingPageTemplate.update({
      where: { id: params.id },
      data: {
        name,
        slug,
        description: description || null,
        category,
        htmlTemplate,
        cssTemplate: cssTemplate || null,
        configSchema,
        isActive
      }
    });

    return {
      success: true,
      message: 'Template saved successfully'
    };
  },

  publish: async ({ params, locals }) => {
    if (!locals.user) {
      return fail(401, { message: 'Unauthorized' });
    }

    await prisma.landingPageTemplate.update({
      where: { id: params.id },
      data: {
        isActive: true
      }
    });

    return {
      success: true,
      message: 'Template published successfully'
    };
  },

  unpublish: async ({ params, locals }) => {
    if (!locals.user) {
      return fail(401, { message: 'Unauthorized' });
    }

    await prisma.landingPageTemplate.update({
      where: { id: params.id },
      data: {
        isActive: false
      }
    });

    return {
      success: true,
      message: 'Template unpublished successfully'
    };
  }
};
