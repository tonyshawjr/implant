import { prisma } from '../db';

// SendGrid configuration
const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY || '';
const FROM_EMAIL = process.env.FROM_EMAIL || 'noreply@squeezmedia.com';
const FROM_NAME = process.env.FROM_NAME || 'SqueezMedia';

export interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export interface LeadEmailInfo {
  id: string;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  email: string | null;
  source: string;
  temperature: string;
  procedureInterest: string | null;
  notes: string | null;
  organizationName: string;
  dashboardUrl: string;
}

export interface InvoiceEmailInfo {
  invoiceNumber: string;
  issueDate: Date;
  dueDate: Date;
  totalAmount: number;
  organizationName: string;
  items: Array<{
    description: string;
    amount: number;
  }>;
  paymentUrl?: string;
}

/**
 * Check if SendGrid is properly configured
 */
export function isSendGridConfigured(): boolean {
  return !!SENDGRID_API_KEY;
}

/**
 * Send an email using SendGrid
 */
async function sendEmail(
  to: string,
  subject: string,
  htmlContent: string,
  textContent?: string
): Promise<EmailResult> {
  try {
    if (!isSendGridConfigured()) {
      console.warn('SendGrid is not configured. Email not sent.');
      return {
        success: false,
        error: 'SendGrid is not configured'
      };
    }

    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SENDGRID_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: to }] }],
        from: { email: FROM_EMAIL, name: FROM_NAME },
        subject,
        content: [
          ...(textContent ? [{ type: 'text/plain', value: textContent }] : []),
          { type: 'text/html', value: htmlContent }
        ]
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`SendGrid API error: ${response.status} - ${errorText}`);
    }

    const messageId = response.headers.get('X-Message-Id') || undefined;

    return {
      success: true,
      messageId
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error sending email';
    console.error('Error sending email:', errorMessage);
    return {
      success: false,
      error: errorMessage
    };
  }
}

/**
 * Send a new lead notification email
 */
export async function sendLeadEmail(
  email: string,
  leadInfo: LeadEmailInfo
): Promise<EmailResult> {
  const leadName = leadInfo.firstName
    ? `${leadInfo.firstName}${leadInfo.lastName ? ' ' + leadInfo.lastName : ''}`
    : 'New Lead';

  const temperatureColor = {
    hot: '#dc2626',
    warm: '#f59e0b',
    cold: '#3b82f6'
  }[leadInfo.temperature.toLowerCase()] || '#6b7280';

  const subject = `New Lead: ${leadName} (${leadInfo.temperature.toUpperCase()})`;

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%); padding: 30px; border-radius: 12px 12px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 24px;">New Lead Alert</h1>
    <p style="color: rgba(255,255,255,0.8); margin: 10px 0 0 0;">A new lead has been captured for ${leadInfo.organizationName}</p>
  </div>

  <div style="background: white; border: 1px solid #e5e7eb; border-top: none; padding: 30px; border-radius: 0 0 12px 12px;">
    <div style="display: inline-block; padding: 6px 16px; border-radius: 20px; background: ${temperatureColor}; color: white; font-weight: 600; font-size: 14px; margin-bottom: 20px;">
      ${leadInfo.temperature.toUpperCase()} LEAD
    </div>

    <table style="width: 100%; border-collapse: collapse;">
      <tr>
        <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb; color: #6b7280; width: 120px;">Name</td>
        <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb; font-weight: 600;">${leadName}</td>
      </tr>
      ${leadInfo.phone ? `
      <tr>
        <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb; color: #6b7280;">Phone</td>
        <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb;"><a href="tel:${leadInfo.phone}" style="color: #2563eb;">${leadInfo.phone}</a></td>
      </tr>
      ` : ''}
      ${leadInfo.email ? `
      <tr>
        <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb; color: #6b7280;">Email</td>
        <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb;"><a href="mailto:${leadInfo.email}" style="color: #2563eb;">${leadInfo.email}</a></td>
      </tr>
      ` : ''}
      <tr>
        <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb; color: #6b7280;">Source</td>
        <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb;">${leadInfo.source}</td>
      </tr>
      ${leadInfo.procedureInterest ? `
      <tr>
        <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb; color: #6b7280;">Interest</td>
        <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb;">${leadInfo.procedureInterest}</td>
      </tr>
      ` : ''}
      ${leadInfo.notes ? `
      <tr>
        <td style="padding: 12px 0; color: #6b7280; vertical-align: top;">Notes</td>
        <td style="padding: 12px 0;">${leadInfo.notes}</td>
      </tr>
      ` : ''}
    </table>

    <div style="margin-top: 30px; text-align: center;">
      <a href="${leadInfo.dashboardUrl}" style="display: inline-block; background: #2563eb; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600;">View Lead Details</a>
    </div>
  </div>

  <p style="color: #9ca3af; font-size: 12px; text-align: center; margin-top: 20px;">
    This is an automated notification from SqueezMedia.
    <a href="${leadInfo.dashboardUrl}/account" style="color: #6b7280;">Manage notification preferences</a>
  </p>
</body>
</html>
`;

  const textContent = `
New Lead Alert

A new ${leadInfo.temperature.toUpperCase()} lead has been captured for ${leadInfo.organizationName}.

Name: ${leadName}
${leadInfo.phone ? `Phone: ${leadInfo.phone}` : ''}
${leadInfo.email ? `Email: ${leadInfo.email}` : ''}
Source: ${leadInfo.source}
${leadInfo.procedureInterest ? `Interest: ${leadInfo.procedureInterest}` : ''}
${leadInfo.notes ? `Notes: ${leadInfo.notes}` : ''}

View lead details: ${leadInfo.dashboardUrl}
`;

  const result = await sendEmail(email, subject, htmlContent, textContent.trim());

  // Log the notification
  try {
    await logNotification({
      type: 'email',
      category: 'new_lead',
      recipient: email,
      success: result.success,
      messageId: result.messageId,
      error: result.error,
      metadata: { leadId: leadInfo.id }
    });
  } catch (err) {
    console.error('Failed to log email notification:', err);
  }

  return result;
}

/**
 * Send an invoice notification email
 */
export async function sendInvoiceEmail(
  email: string,
  invoiceInfo: InvoiceEmailInfo
): Promise<EmailResult> {
  const subject = `Invoice ${invoiceInfo.invoiceNumber} - ${invoiceInfo.organizationName}`;

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);

  const formatDate = (date: Date) =>
    date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

  const itemsHtml = invoiceInfo.items
    .map(
      (item) => `
      <tr>
        <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb;">${item.description}</td>
        <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb; text-align: right;">${formatCurrency(item.amount)}</td>
      </tr>
    `
    )
    .join('');

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%); padding: 30px; border-radius: 12px 12px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 24px;">Invoice</h1>
    <p style="color: rgba(255,255,255,0.8); margin: 10px 0 0 0;">${invoiceInfo.invoiceNumber}</p>
  </div>

  <div style="background: white; border: 1px solid #e5e7eb; border-top: none; padding: 30px; border-radius: 0 0 12px 12px;">
    <div style="display: flex; justify-content: space-between; margin-bottom: 30px;">
      <div>
        <p style="color: #6b7280; margin: 0 0 4px 0; font-size: 14px;">Issue Date</p>
        <p style="margin: 0; font-weight: 600;">${formatDate(invoiceInfo.issueDate)}</p>
      </div>
      <div style="text-align: right;">
        <p style="color: #6b7280; margin: 0 0 4px 0; font-size: 14px;">Due Date</p>
        <p style="margin: 0; font-weight: 600;">${formatDate(invoiceInfo.dueDate)}</p>
      </div>
    </div>

    <table style="width: 100%; border-collapse: collapse;">
      <tr>
        <th style="padding: 12px 0; border-bottom: 2px solid #e5e7eb; text-align: left; color: #6b7280; font-weight: 600;">Description</th>
        <th style="padding: 12px 0; border-bottom: 2px solid #e5e7eb; text-align: right; color: #6b7280; font-weight: 600;">Amount</th>
      </tr>
      ${itemsHtml}
      <tr>
        <td style="padding: 16px 0; font-weight: 700; font-size: 18px;">Total</td>
        <td style="padding: 16px 0; font-weight: 700; font-size: 18px; text-align: right;">${formatCurrency(invoiceInfo.totalAmount)}</td>
      </tr>
    </table>

    ${invoiceInfo.paymentUrl ? `
    <div style="margin-top: 30px; text-align: center;">
      <a href="${invoiceInfo.paymentUrl}" style="display: inline-block; background: #2563eb; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600;">Pay Now</a>
    </div>
    ` : ''}
  </div>

  <p style="color: #9ca3af; font-size: 12px; text-align: center; margin-top: 20px;">
    This is an automated invoice from SqueezMedia.
  </p>
</body>
</html>
`;

  const textContent = `
Invoice ${invoiceInfo.invoiceNumber}

Organization: ${invoiceInfo.organizationName}
Issue Date: ${formatDate(invoiceInfo.issueDate)}
Due Date: ${formatDate(invoiceInfo.dueDate)}

Items:
${invoiceInfo.items.map((item) => `- ${item.description}: ${formatCurrency(item.amount)}`).join('\n')}

Total: ${formatCurrency(invoiceInfo.totalAmount)}
${invoiceInfo.paymentUrl ? `\nPay now: ${invoiceInfo.paymentUrl}` : ''}
`;

  const result = await sendEmail(email, subject, htmlContent, textContent.trim());

  // Log the notification
  try {
    await logNotification({
      type: 'email',
      category: 'invoice',
      recipient: email,
      success: result.success,
      messageId: result.messageId,
      error: result.error,
      metadata: { invoiceNumber: invoiceInfo.invoiceNumber }
    });
  } catch (err) {
    console.error('Failed to log email notification:', err);
  }

  return result;
}

/**
 * Send a password reset email
 */
export async function sendPasswordResetEmail(
  email: string,
  resetLink: string,
  userName?: string
): Promise<EmailResult> {
  const subject = 'Reset Your Password - SqueezMedia';

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%); padding: 30px; border-radius: 12px 12px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 24px;">Password Reset</h1>
    <p style="color: rgba(255,255,255,0.8); margin: 10px 0 0 0;">Reset your SqueezMedia account password</p>
  </div>

  <div style="background: white; border: 1px solid #e5e7eb; border-top: none; padding: 30px; border-radius: 0 0 12px 12px;">
    <p style="margin: 0 0 20px 0;">Hi${userName ? ` ${userName}` : ''},</p>

    <p style="margin: 0 0 20px 0;">We received a request to reset your password. Click the button below to create a new password:</p>

    <div style="text-align: center; margin: 30px 0;">
      <a href="${resetLink}" style="display: inline-block; background: #2563eb; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600;">Reset Password</a>
    </div>

    <p style="margin: 0 0 10px 0; color: #6b7280; font-size: 14px;">This link will expire in 1 hour.</p>

    <p style="margin: 0; color: #6b7280; font-size: 14px;">If you didn't request this, you can safely ignore this email. Your password won't be changed.</p>
  </div>

  <p style="color: #9ca3af; font-size: 12px; text-align: center; margin-top: 20px;">
    This is an automated email from SqueezMedia. Please do not reply.
  </p>
</body>
</html>
`;

  const textContent = `
Password Reset Request

Hi${userName ? ` ${userName}` : ''},

We received a request to reset your password. Use the link below to create a new password:

${resetLink}

This link will expire in 1 hour.

If you didn't request this, you can safely ignore this email. Your password won't be changed.
`;

  const result = await sendEmail(email, subject, htmlContent, textContent.trim());

  // Log the notification
  try {
    await logNotification({
      type: 'email',
      category: 'password_reset',
      recipient: email,
      success: result.success,
      messageId: result.messageId,
      error: result.error
    });
  } catch (err) {
    console.error('Failed to log email notification:', err);
  }

  return result;
}

/**
 * Send a welcome email to new users
 */
export async function sendWelcomeEmail(
  email: string,
  userName: string,
  organizationName: string,
  loginUrl: string
): Promise<EmailResult> {
  const subject = `Welcome to SqueezMedia - ${organizationName}`;

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%); padding: 30px; border-radius: 12px 12px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 24px;">Welcome to SqueezMedia!</h1>
    <p style="color: rgba(255,255,255,0.8); margin: 10px 0 0 0;">Your account has been created</p>
  </div>

  <div style="background: white; border: 1px solid #e5e7eb; border-top: none; padding: 30px; border-radius: 0 0 12px 12px;">
    <p style="margin: 0 0 20px 0;">Hi ${userName},</p>

    <p style="margin: 0 0 20px 0;">Welcome to the SqueezMedia platform! You've been added to <strong>${organizationName}</strong>.</p>

    <p style="margin: 0 0 20px 0;">You can now access your dashboard to manage leads, view campaigns, and track performance.</p>

    <div style="text-align: center; margin: 30px 0;">
      <a href="${loginUrl}" style="display: inline-block; background: #2563eb; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600;">Go to Dashboard</a>
    </div>

    <p style="margin: 0; color: #6b7280; font-size: 14px;">If you have any questions, please reach out to your account manager or contact our support team.</p>
  </div>

  <p style="color: #9ca3af; font-size: 12px; text-align: center; margin-top: 20px;">
    This is an automated email from SqueezMedia.
  </p>
</body>
</html>
`;

  const textContent = `
Welcome to SqueezMedia!

Hi ${userName},

Welcome to the SqueezMedia platform! You've been added to ${organizationName}.

You can now access your dashboard to manage leads, view campaigns, and track performance.

Go to Dashboard: ${loginUrl}

If you have any questions, please reach out to your account manager or contact our support team.
`;

  const result = await sendEmail(email, subject, htmlContent, textContent.trim());

  // Log the notification
  try {
    await logNotification({
      type: 'email',
      category: 'welcome',
      recipient: email,
      success: result.success,
      messageId: result.messageId,
      error: result.error,
      metadata: { organizationName }
    });
  } catch (err) {
    console.error('Failed to log email notification:', err);
  }

  return result;
}

/**
 * Send a team member invitation email with login credentials
 */
export async function sendTeamInviteEmail(
  email: string,
  firstName: string,
  lastName: string,
  role: string,
  tempPassword: string,
  loginUrl: string
): Promise<EmailResult> {
  const subject = 'You\'ve Been Invited to SqueezMedia';
  const roleDisplay = role === 'super_admin' ? 'Super Admin' : role === 'admin' ? 'Admin' : 'Support';

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%); padding: 30px; border-radius: 12px 12px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 24px;">Welcome to the Team!</h1>
    <p style="color: rgba(255,255,255,0.8); margin: 10px 0 0 0;">You've been added to SqueezMedia</p>
  </div>

  <div style="background: white; border: 1px solid #e5e7eb; border-top: none; padding: 30px; border-radius: 0 0 12px 12px;">
    <p style="margin: 0 0 20px 0;">Hi ${firstName},</p>

    <p style="margin: 0 0 20px 0;">You've been invited to join the SqueezMedia internal team as a <strong>${roleDisplay}</strong>.</p>

    <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
      <p style="margin: 0 0 12px 0; font-weight: 600;">Your Login Credentials:</p>
      <table style="width: 100%;">
        <tr>
          <td style="padding: 6px 0; color: #6b7280;">Email:</td>
          <td style="padding: 6px 0; font-weight: 500;">${email}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #6b7280;">Temporary Password:</td>
          <td style="padding: 6px 0; font-family: monospace; font-weight: 600; color: #2563eb;">${tempPassword}</td>
        </tr>
      </table>
    </div>

    <p style="margin: 0 0 20px 0; color: #dc2626; font-size: 14px;"><strong>Important:</strong> Please change your password after your first login.</p>

    <div style="text-align: center; margin: 30px 0;">
      <a href="${loginUrl}" style="display: inline-block; background: #2563eb; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600;">Log In Now</a>
    </div>

    <p style="margin: 0; color: #6b7280; font-size: 14px;">If you have any questions, reach out to your team administrator.</p>
  </div>

  <p style="color: #9ca3af; font-size: 12px; text-align: center; margin-top: 20px;">
    This is an automated email from SqueezMedia. Please do not reply.
  </p>
</body>
</html>
`;

  const textContent = `
Welcome to the Team!

Hi ${firstName},

You've been invited to join the SqueezMedia internal team as a ${roleDisplay}.

Your Login Credentials:
Email: ${email}
Temporary Password: ${tempPassword}

IMPORTANT: Please change your password after your first login.

Log in now: ${loginUrl}

If you have any questions, reach out to your team administrator.
`;

  const result = await sendEmail(email, subject, htmlContent, textContent.trim());

  // Log the notification
  try {
    await logNotification({
      type: 'email',
      category: 'team_invite',
      recipient: email,
      success: result.success,
      messageId: result.messageId,
      error: result.error,
      metadata: { role, firstName, lastName }
    });
  } catch (err) {
    console.error('Failed to log email notification:', err);
  }

  return result;
}

interface NotificationLogEntry {
  type: 'sms' | 'email';
  category: string;
  recipient: string;
  success: boolean;
  messageId?: string;
  error?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Log notification to audit trail
 */
async function logNotification(entry: NotificationLogEntry): Promise<void> {
  await prisma.auditLog.create({
    data: {
      action: 'notification_sent',
      entityType: 'notification',
      entityId: entry.messageId || null,
      newValues: {
        type: entry.type,
        category: entry.category,
        recipient: entry.recipient,
        success: entry.success,
        error: entry.error || undefined,
        metadata: entry.metadata ? JSON.parse(JSON.stringify(entry.metadata)) : undefined
      }
    }
  });
}
