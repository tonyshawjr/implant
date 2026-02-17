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

export const load: PageServerLoad = async () => {
  // Return default values for a new template
  return {
    formSchema: {
      fields: [
        {
          id: 'field_default_1',
          name: 'full_name',
          type: 'text',
          label: 'Full Name',
          placeholder: 'Enter your full name',
          required: true
        },
        {
          id: 'field_default_2',
          name: 'phone',
          type: 'phone',
          label: 'Phone Number',
          placeholder: '(555) 123-4567',
          required: true
        },
        {
          id: 'field_default_3',
          name: 'email',
          type: 'email',
          label: 'Email Address',
          placeholder: 'you@example.com',
          required: false
        }
      ],
      submit_button_text: 'Get My Free Consultation',
      success_message: 'Thank you! We will contact you within 24 hours.'
    },
    defaultHtml: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{{organization_name}} - Get Your Free Consultation</title>
  <style>
    :root {
      --primary-color: {{primary_color}};
    }
  </style>
</head>
<body>
  <div class="landing-page">
    <header class="header">
      <img src="{{logo_url}}" alt="{{organization_name}}" class="logo" />
    </header>

    <main class="content">
      <h1>Transform Your Smile Today</h1>
      <p>Schedule your free consultation with {{organization_name}}</p>

      <div class="form-container">
        {{form}}
      </div>

      <p class="phone-cta">
        Or call us directly: <a href="tel:{{phone}}">{{phone}}</a>
      </p>
    </main>

    <footer class="footer">
      <p>&copy; {{organization_name}}. All rights reserved.</p>
    </footer>
  </div>
</body>
</html>`,
    defaultCss: `/* Landing Page Styles */
.landing-page {
  font-family: system-ui, -apple-system, sans-serif;
  max-width: 600px;
  margin: 0 auto;
  padding: 2rem;
}

.header {
  text-align: center;
  margin-bottom: 2rem;
}

.logo {
  max-height: 60px;
  width: auto;
}

.content {
  text-align: center;
}

h1 {
  color: var(--primary-color);
  font-size: 2rem;
  margin-bottom: 1rem;
}

.form-container {
  background: #f9fafb;
  border-radius: 12px;
  padding: 2rem;
  margin: 2rem 0;
}

.form-field {
  margin-bottom: 1rem;
  text-align: left;
}

.form-field label {
  display: block;
  font-weight: 500;
  margin-bottom: 0.5rem;
}

.form-field input,
.form-field select,
.form-field textarea {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 1rem;
}

.submit-btn {
  width: 100%;
  background: var(--primary-color);
  color: white;
  border: none;
  padding: 1rem;
  border-radius: 8px;
  font-size: 1.1rem;
  font-weight: 600;
  cursor: pointer;
  margin-top: 1rem;
}

.submit-btn:hover {
  opacity: 0.9;
}

.phone-cta {
  margin-top: 1.5rem;
  color: #6b7280;
}

.phone-cta a {
  color: var(--primary-color);
  text-decoration: none;
  font-weight: 600;
}

.footer {
  margin-top: 3rem;
  text-align: center;
  color: #9ca3af;
  font-size: 0.875rem;
}

/* Responsive */
@media (max-width: 640px) {
  .landing-page {
    padding: 1rem;
  }

  h1 {
    font-size: 1.5rem;
  }

  .form-container {
    padding: 1.5rem;
  }
}`
  };
};

export const actions: Actions = {
  create: async ({ request, locals }) => {
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

    // Validation
    if (!name || !slug || !htmlTemplate || !category) {
      return fail(400, {
        message: 'Name, slug, category, and HTML template are required',
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

    // Check if slug is unique
    const existingTemplate = await prisma.landingPageTemplate.findUnique({
      where: { slug }
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

    // Create the template
    const template = await prisma.landingPageTemplate.create({
      data: {
        name,
        slug,
        description: description || null,
        category,
        htmlTemplate,
        cssTemplate: cssTemplate || null,
        configSchema,
        isActive: false, // Start as inactive (draft)
        createdBy: locals.user.id
      }
    });

    // Redirect to the edit page
    throw redirect(302, `/internal/templates/${template.id}`);
  }
};
