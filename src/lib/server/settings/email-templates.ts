import { prisma } from '$lib/server/db';
import type { EmailTemplate } from '@prisma/client';

// ============================================================================
// Types
// ============================================================================

/**
 * Valid email template types
 */
export type EmailTemplateType =
  | 'welcome'
  | 'password_reset'
  | 'lead_notification'
  | 'invoice'
  | 'invite';

/**
 * Input for creating a new email template
 */
export interface CreateEmailTemplateInput {
  type: EmailTemplateType;
  subject: string;
  htmlContent: string;
  textContent?: string | null;
  variables?: Record<string, string>; // Variable name -> description
  isActive?: boolean;
  updatedBy?: string | null;
}

/**
 * Input for updating an email template
 */
export interface UpdateEmailTemplateInput {
  subject?: string;
  htmlContent?: string;
  textContent?: string | null;
  variables?: Record<string, string>;
  isActive?: boolean;
  updatedBy?: string | null;
}

/**
 * Rendered email template result
 */
export interface RenderedEmailTemplate {
  subject: string;
  html: string;
  text: string | null;
}

/**
 * System variables that are always available in templates
 */
interface SystemVariables {
  companyName: string;
  platformName: string;
  supportEmail: string;
}

// ============================================================================
// System Variables
// ============================================================================

/**
 * Fetch system variables from PlatformSettings
 * Falls back to defaults if not found
 */
async function getSystemVariables(): Promise<SystemVariables> {
  const settings = await prisma.platformSettings.findMany({
    where: {
      key: {
        in: ['company_name', 'platform_name', 'support_email']
      }
    }
  });

  const settingsMap = new Map(settings.map(s => [s.key, s.value]));

  return {
    companyName: settingsMap.get('company_name') || 'SqueezMedia',
    platformName: settingsMap.get('platform_name') || 'Implant Lead Engine',
    supportEmail: settingsMap.get('support_email') || 'support@squeezmedia.com'
  };
}

// ============================================================================
// Template Variable Replacement
// ============================================================================

/**
 * Replace template variables with actual values
 * Supports:
 * - Simple variables: {{variableName}}
 * - Nested variables: {{user.firstName}}
 * - System variables: {{companyName}}, {{platformName}}, {{supportEmail}}
 */
function replaceVariables(
  template: string,
  variables: Record<string, unknown>,
  systemVariables: SystemVariables
): string {
  // Merge system variables with provided variables
  const allVariables: Record<string, unknown> = {
    ...variables,
    companyName: systemVariables.companyName,
    platformName: systemVariables.platformName,
    supportEmail: systemVariables.supportEmail
  };

  // Replace all {{variableName}} patterns
  return template.replace(/\{\{([^}]+)\}\}/g, (match, path) => {
    const trimmedPath = path.trim();
    const value = getNestedValue(allVariables, trimmedPath);

    // Return the original placeholder if value is undefined/null
    if (value === undefined || value === null) {
      console.warn(`Email template variable "${trimmedPath}" not found in provided variables`);
      return match;
    }

    // Convert value to string
    return String(value);
  });
}

/**
 * Get a nested value from an object using dot notation
 * e.g., getNestedValue({ user: { firstName: 'John' } }, 'user.firstName') => 'John'
 */
function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  const parts = path.split('.');
  let current: unknown = obj;

  for (const part of parts) {
    if (current === null || current === undefined) {
      return undefined;
    }
    if (typeof current === 'object') {
      current = (current as Record<string, unknown>)[part];
    } else {
      return undefined;
    }
  }

  return current;
}

// ============================================================================
// CRUD Operations
// ============================================================================

/**
 * Get an email template by type
 */
export async function getEmailTemplate(
  type: string
): Promise<EmailTemplate | null> {
  return prisma.emailTemplate.findUnique({
    where: { type }
  });
}

/**
 * Get all email templates
 */
export async function getAllEmailTemplates(): Promise<EmailTemplate[]> {
  return prisma.emailTemplate.findMany({
    orderBy: { type: 'asc' }
  });
}

/**
 * Get all active email templates
 */
export async function getActiveEmailTemplates(): Promise<EmailTemplate[]> {
  return prisma.emailTemplate.findMany({
    where: { isActive: true },
    orderBy: { type: 'asc' }
  });
}

/**
 * Create a new email template
 */
export async function createEmailTemplate(
  data: CreateEmailTemplateInput
): Promise<EmailTemplate> {
  return prisma.emailTemplate.create({
    data: {
      type: data.type,
      subject: data.subject,
      htmlContent: data.htmlContent,
      textContent: data.textContent ?? null,
      variables: data.variables ?? {},
      isActive: data.isActive ?? true,
      updatedBy: data.updatedBy ?? null
    }
  });
}

/**
 * Update an existing email template
 */
export async function updateEmailTemplate(
  type: string,
  data: UpdateEmailTemplateInput
): Promise<EmailTemplate> {
  const updateData: Record<string, unknown> = {};

  if (data.subject !== undefined) {
    updateData.subject = data.subject;
  }
  if (data.htmlContent !== undefined) {
    updateData.htmlContent = data.htmlContent;
  }
  if (data.textContent !== undefined) {
    updateData.textContent = data.textContent;
  }
  if (data.variables !== undefined) {
    updateData.variables = data.variables;
  }
  if (data.isActive !== undefined) {
    updateData.isActive = data.isActive;
  }
  if (data.updatedBy !== undefined) {
    updateData.updatedBy = data.updatedBy;
  }

  return prisma.emailTemplate.update({
    where: { type },
    data: updateData
  });
}

/**
 * Delete an email template by type
 */
export async function deleteEmailTemplate(type: string): Promise<EmailTemplate> {
  return prisma.emailTemplate.delete({
    where: { type }
  });
}

// ============================================================================
// Template Rendering
// ============================================================================

/**
 * Render an email template with variable substitution
 *
 * @param type - The template type (e.g., 'welcome', 'password_reset')
 * @param variables - Object containing variables to substitute
 * @returns Rendered template with subject, html, and text content
 * @throws Error if template not found or is inactive
 *
 * @example
 * const rendered = await renderEmailTemplate('welcome', {
 *   user: { firstName: 'John', lastName: 'Doe' },
 *   organizationName: 'Acme Dental',
 *   loginUrl: 'https://app.example.com/login'
 * });
 */
export async function renderEmailTemplate(
  type: string,
  variables: Record<string, unknown>
): Promise<RenderedEmailTemplate> {
  // Fetch the template
  const template = await prisma.emailTemplate.findUnique({
    where: { type }
  });

  if (!template) {
    throw new Error(`Email template "${type}" not found`);
  }

  if (!template.isActive) {
    throw new Error(`Email template "${type}" is not active`);
  }

  // Fetch system variables
  const systemVariables = await getSystemVariables();

  // Render the template
  const renderedSubject = replaceVariables(template.subject, variables, systemVariables);
  const renderedHtml = replaceVariables(template.htmlContent, variables, systemVariables);
  const renderedText = template.textContent
    ? replaceVariables(template.textContent, variables, systemVariables)
    : null;

  return {
    subject: renderedSubject,
    html: renderedHtml,
    text: renderedText
  };
}

/**
 * Preview a template rendering without saving (useful for template editor)
 */
export async function previewEmailTemplate(
  subject: string,
  htmlContent: string,
  textContent: string | null,
  variables: Record<string, unknown>
): Promise<RenderedEmailTemplate> {
  const systemVariables = await getSystemVariables();

  return {
    subject: replaceVariables(subject, variables, systemVariables),
    html: replaceVariables(htmlContent, variables, systemVariables),
    text: textContent ? replaceVariables(textContent, variables, systemVariables) : null
  };
}

// ============================================================================
// Template Validation
// ============================================================================

/**
 * Extract all variable placeholders from a template string
 */
export function extractTemplateVariables(template: string): string[] {
  const matches = template.matchAll(/\{\{([^}]+)\}\}/g);
  const variables = new Set<string>();

  for (const match of matches) {
    variables.add(match[1].trim());
  }

  return Array.from(variables);
}

/**
 * Validate that all required variables are provided
 */
export function validateTemplateVariables(
  template: string,
  providedVariables: Record<string, unknown>
): { valid: boolean; missingVariables: string[] } {
  const systemVariableNames = ['companyName', 'platformName', 'supportEmail'];
  const requiredVariables = extractTemplateVariables(template);
  const missingVariables: string[] = [];

  for (const variable of requiredVariables) {
    // Skip system variables (they're always provided)
    if (systemVariableNames.includes(variable)) {
      continue;
    }

    // Check if the variable (or its root for nested vars) is provided
    const rootVariable = variable.split('.')[0];
    if (!(rootVariable in providedVariables)) {
      missingVariables.push(variable);
    }
  }

  return {
    valid: missingVariables.length === 0,
    missingVariables
  };
}

// ============================================================================
// Default Templates
// ============================================================================

/**
 * Default template definitions for seeding
 */
export const DEFAULT_EMAIL_TEMPLATES: CreateEmailTemplateInput[] = [
  {
    type: 'welcome',
    subject: 'Welcome to {{platformName}} - {{organizationName}}',
    htmlContent: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%); padding: 30px; border-radius: 12px 12px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 24px;">Welcome to {{platformName}}!</h1>
    <p style="color: rgba(255,255,255,0.8); margin: 10px 0 0 0;">Your account has been created</p>
  </div>
  <div style="background: white; border: 1px solid #e5e7eb; border-top: none; padding: 30px; border-radius: 0 0 12px 12px;">
    <p>Hi {{user.firstName}},</p>
    <p>Welcome to {{platformName}}! You've been added to <strong>{{organizationName}}</strong>.</p>
    <p>You can now access your dashboard to manage leads, view campaigns, and track performance.</p>
    <div style="text-align: center; margin: 30px 0;">
      <a href="{{loginUrl}}" style="display: inline-block; background: #2563eb; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600;">Go to Dashboard</a>
    </div>
    <p style="color: #6b7280; font-size: 14px;">If you have any questions, reach out to us at {{supportEmail}}.</p>
  </div>
</body>
</html>`,
    textContent: `Welcome to {{platformName}}!

Hi {{user.firstName}},

Welcome to {{platformName}}! You've been added to {{organizationName}}.

You can now access your dashboard to manage leads, view campaigns, and track performance.

Go to Dashboard: {{loginUrl}}

If you have any questions, reach out to us at {{supportEmail}}.`,
    variables: {
      'user.firstName': 'User first name',
      'organizationName': 'Organization name',
      'loginUrl': 'Dashboard login URL'
    }
  },
  {
    type: 'password_reset',
    subject: 'Reset Your Password - {{platformName}}',
    htmlContent: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%); padding: 30px; border-radius: 12px 12px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 24px;">Password Reset</h1>
    <p style="color: rgba(255,255,255,0.8); margin: 10px 0 0 0;">Reset your {{platformName}} account password</p>
  </div>
  <div style="background: white; border: 1px solid #e5e7eb; border-top: none; padding: 30px; border-radius: 0 0 12px 12px;">
    <p>Hi{{#if user.firstName}} {{user.firstName}}{{/if}},</p>
    <p>We received a request to reset your password. Click the button below to create a new password:</p>
    <div style="text-align: center; margin: 30px 0;">
      <a href="{{resetLink}}" style="display: inline-block; background: #2563eb; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600;">Reset Password</a>
    </div>
    <p style="color: #6b7280; font-size: 14px;">This link will expire in {{expiresIn}}.</p>
    <p style="color: #6b7280; font-size: 14px;">If you didn't request this, you can safely ignore this email.</p>
  </div>
</body>
</html>`,
    textContent: `Password Reset Request

Hi{{#if user.firstName}} {{user.firstName}}{{/if}},

We received a request to reset your password. Use the link below to create a new password:

{{resetLink}}

This link will expire in {{expiresIn}}.

If you didn't request this, you can safely ignore this email.`,
    variables: {
      'user.firstName': 'User first name (optional)',
      'resetLink': 'Password reset URL',
      'expiresIn': 'Link expiration time (e.g., "1 hour")'
    }
  },
  {
    type: 'lead_notification',
    subject: 'New Lead: {{lead.name}} ({{lead.temperature}})',
    htmlContent: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%); padding: 30px; border-radius: 12px 12px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 24px;">New Lead Alert</h1>
    <p style="color: rgba(255,255,255,0.8); margin: 10px 0 0 0;">A new lead has been captured for {{organizationName}}</p>
  </div>
  <div style="background: white; border: 1px solid #e5e7eb; border-top: none; padding: 30px; border-radius: 0 0 12px 12px;">
    <div style="display: inline-block; padding: 6px 16px; border-radius: 20px; background: {{lead.temperatureColor}}; color: white; font-weight: 600; font-size: 14px; margin-bottom: 20px;">
      {{lead.temperature}} LEAD
    </div>
    <table style="width: 100%; border-collapse: collapse;">
      <tr>
        <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb; color: #6b7280; width: 120px;">Name</td>
        <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb; font-weight: 600;">{{lead.name}}</td>
      </tr>
      <tr>
        <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb; color: #6b7280;">Phone</td>
        <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb;"><a href="tel:{{lead.phone}}" style="color: #2563eb;">{{lead.phone}}</a></td>
      </tr>
      <tr>
        <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb; color: #6b7280;">Email</td>
        <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb;"><a href="mailto:{{lead.email}}" style="color: #2563eb;">{{lead.email}}</a></td>
      </tr>
      <tr>
        <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb; color: #6b7280;">Source</td>
        <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb;">{{lead.source}}</td>
      </tr>
    </table>
    <div style="margin-top: 30px; text-align: center;">
      <a href="{{dashboardUrl}}" style="display: inline-block; background: #2563eb; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600;">View Lead Details</a>
    </div>
  </div>
  <p style="color: #9ca3af; font-size: 12px; text-align: center; margin-top: 20px;">
    This is an automated notification from {{companyName}}.
  </p>
</body>
</html>`,
    textContent: `New Lead Alert

A new {{lead.temperature}} lead has been captured for {{organizationName}}.

Name: {{lead.name}}
Phone: {{lead.phone}}
Email: {{lead.email}}
Source: {{lead.source}}

View lead details: {{dashboardUrl}}`,
    variables: {
      'lead.name': 'Lead full name',
      'lead.phone': 'Lead phone number',
      'lead.email': 'Lead email address',
      'lead.source': 'Lead source (e.g., Google, Facebook)',
      'lead.temperature': 'Lead temperature (HOT, WARM, COLD)',
      'lead.temperatureColor': 'Color code for temperature badge',
      'organizationName': 'Organization name',
      'dashboardUrl': 'Link to lead details in dashboard'
    }
  },
  {
    type: 'invoice',
    subject: 'Invoice {{invoice.number}} - {{organizationName}}',
    htmlContent: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%); padding: 30px; border-radius: 12px 12px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 24px;">Invoice</h1>
    <p style="color: rgba(255,255,255,0.8); margin: 10px 0 0 0;">{{invoice.number}}</p>
  </div>
  <div style="background: white; border: 1px solid #e5e7eb; border-top: none; padding: 30px; border-radius: 0 0 12px 12px;">
    <div style="display: flex; justify-content: space-between; margin-bottom: 30px;">
      <div>
        <p style="color: #6b7280; margin: 0 0 4px 0; font-size: 14px;">Issue Date</p>
        <p style="margin: 0; font-weight: 600;">{{invoice.issueDate}}</p>
      </div>
      <div style="text-align: right;">
        <p style="color: #6b7280; margin: 0 0 4px 0; font-size: 14px;">Due Date</p>
        <p style="margin: 0; font-weight: 600;">{{invoice.dueDate}}</p>
      </div>
    </div>
    <table style="width: 100%; border-collapse: collapse;">
      <tr>
        <th style="padding: 12px 0; border-bottom: 2px solid #e5e7eb; text-align: left; color: #6b7280;">Description</th>
        <th style="padding: 12px 0; border-bottom: 2px solid #e5e7eb; text-align: right; color: #6b7280;">Amount</th>
      </tr>
      {{invoice.itemsHtml}}
      <tr>
        <td style="padding: 16px 0; font-weight: 700; font-size: 18px;">Total</td>
        <td style="padding: 16px 0; font-weight: 700; font-size: 18px; text-align: right;">{{invoice.total}}</td>
      </tr>
    </table>
    <div style="margin-top: 30px; text-align: center;">
      <a href="{{paymentUrl}}" style="display: inline-block; background: #2563eb; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600;">Pay Now</a>
    </div>
  </div>
  <p style="color: #9ca3af; font-size: 12px; text-align: center; margin-top: 20px;">
    This is an automated invoice from {{companyName}}.
  </p>
</body>
</html>`,
    textContent: `Invoice {{invoice.number}}

Organization: {{organizationName}}
Issue Date: {{invoice.issueDate}}
Due Date: {{invoice.dueDate}}

{{invoice.itemsText}}

Total: {{invoice.total}}

Pay now: {{paymentUrl}}`,
    variables: {
      'invoice.number': 'Invoice number',
      'invoice.issueDate': 'Formatted issue date',
      'invoice.dueDate': 'Formatted due date',
      'invoice.itemsHtml': 'HTML table rows for line items',
      'invoice.itemsText': 'Text list of line items',
      'invoice.total': 'Formatted total amount',
      'organizationName': 'Organization name',
      'paymentUrl': 'Payment link URL'
    }
  },
  {
    type: 'invite',
    subject: "You've Been Invited to {{platformName}}",
    htmlContent: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%); padding: 30px; border-radius: 12px 12px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 24px;">Welcome to the Team!</h1>
    <p style="color: rgba(255,255,255,0.8); margin: 10px 0 0 0;">You've been added to {{platformName}}</p>
  </div>
  <div style="background: white; border: 1px solid #e5e7eb; border-top: none; padding: 30px; border-radius: 0 0 12px 12px;">
    <p>Hi {{user.firstName}},</p>
    <p>You've been invited to join {{organizationName}} as a <strong>{{user.role}}</strong>.</p>
    <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
      <p style="margin: 0 0 12px 0; font-weight: 600;">Your Login Credentials:</p>
      <table style="width: 100%;">
        <tr>
          <td style="padding: 6px 0; color: #6b7280;">Email:</td>
          <td style="padding: 6px 0; font-weight: 500;">{{user.email}}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #6b7280;">Temporary Password:</td>
          <td style="padding: 6px 0; font-family: monospace; font-weight: 600; color: #2563eb;">{{tempPassword}}</td>
        </tr>
      </table>
    </div>
    <p style="color: #dc2626; font-size: 14px;"><strong>Important:</strong> Please change your password after your first login.</p>
    <div style="text-align: center; margin: 30px 0;">
      <a href="{{loginUrl}}" style="display: inline-block; background: #2563eb; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600;">Log In Now</a>
    </div>
    <p style="color: #6b7280; font-size: 14px;">If you have any questions, reach out to us at {{supportEmail}}.</p>
  </div>
</body>
</html>`,
    textContent: `Welcome to the Team!

Hi {{user.firstName}},

You've been invited to join {{organizationName}} as a {{user.role}}.

Your Login Credentials:
Email: {{user.email}}
Temporary Password: {{tempPassword}}

IMPORTANT: Please change your password after your first login.

Log in now: {{loginUrl}}

If you have any questions, reach out to us at {{supportEmail}}.`,
    variables: {
      'user.firstName': 'User first name',
      'user.email': 'User email address',
      'user.role': 'User role (e.g., Admin, Staff)',
      'organizationName': 'Organization name',
      'tempPassword': 'Temporary password',
      'loginUrl': 'Login URL'
    }
  }
];

/**
 * Seed default email templates (useful for initial setup or migrations)
 */
export async function seedEmailTemplates(): Promise<void> {
  for (const template of DEFAULT_EMAIL_TEMPLATES) {
    await prisma.emailTemplate.upsert({
      where: { type: template.type },
      update: {
        subject: template.subject,
        htmlContent: template.htmlContent,
        textContent: template.textContent,
        variables: template.variables
      },
      create: {
        type: template.type,
        subject: template.subject,
        htmlContent: template.htmlContent,
        textContent: template.textContent ?? null,
        variables: template.variables ?? {},
        isActive: true
      }
    });
  }
}
