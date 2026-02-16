import type { PageServerLoad, Actions } from './$types';
import { fail } from '@sveltejs/kit';
import { prisma } from '$lib/server/db';
import { hash } from '@node-rs/argon2';
import {
  getIntegrations,
  connectIntegration as connectInt,
  disconnectIntegration as disconnectInt,
  INTEGRATIONS_METADATA,
  type IntegrationId
} from '$lib/server/integrations';

export const load: PageServerLoad = async ({ url }) => {
  const activeTab = url.searchParams.get('tab') || 'general';

  // Platform settings (would normally come from a settings table)
  const platformSettings = {
    companyName: 'SqueezMedia',
    platformName: 'Implant Lead Engine',
    supportEmail: 'support@squeezmedia.com',
    billingEmail: 'billing@squeezmedia.com',
    defaultTimezone: 'America/New_York',
    defaultCurrency: 'USD',
    maxTerritoriesPerClient: 5,
    defaultTrialDays: 14,
    maintenanceMode: false,
    debugMode: false
  };

  // Notification settings
  const notificationSettings = {
    emailNotifications: true,
    smsNotifications: false,
    slackIntegration: true,
    slackChannel: '#alerts',
    notifyOnNewLead: true,
    notifyOnNewClient: true,
    notifyOnChurnRisk: true,
    notifyOnPaymentFailed: true,
    notifyOnTicketCreated: true,
    notifyOnAnomalyDetected: true,
    dailyDigest: true,
    weeklyReport: true
  };

  // Integration status - loaded dynamically from database
  const integrations = await getIntegrations();

  // Get integration metadata for configuration forms
  const integrationFields = INTEGRATIONS_METADATA.reduce((acc, meta) => {
    acc[meta.id] = meta.fields;
    return acc;
  }, {} as Record<string, typeof INTEGRATIONS_METADATA[0]['fields']>);

  // Team members (internal staff) - loaded from database
  // Internal roles are: super_admin, admin, support (no organizationId or null)
  const internalUsers = await prisma.user.findMany({
    where: {
      role: {
        in: ['super_admin', 'admin', 'support']
      },
      deletedAt: null
    },
    orderBy: [
      { role: 'asc' },
      { firstName: 'asc' }
    ],
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      role: true,
      isActive: true,
      lastLoginAt: true
    }
  });

  const teamMembers = internalUsers.map(user => ({
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    role: user.role,
    status: user.isActive ? 'active' : 'inactive',
    lastLogin: user.lastLoginAt?.toISOString() || null
  }));

  // API keys (masked)
  const apiKeys = [
    {
      id: '1',
      name: 'Production API Key',
      key: 'sk_live_****************************1234',
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 90).toISOString(),
      lastUsed: new Date().toISOString(),
      status: 'active'
    },
    {
      id: '2',
      name: 'Development API Key',
      key: 'sk_test_****************************5678',
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30).toISOString(),
      lastUsed: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(),
      status: 'active'
    }
  ];

  return {
    activeTab,
    platformSettings,
    notificationSettings,
    integrations,
    integrationFields,
    teamMembers,
    apiKeys
  };
};

export const actions: Actions = {
  updatePlatformSettings: async ({ request, locals }) => {
    if (!locals.user) {
      return fail(401, { message: 'Unauthorized' });
    }

    if (locals.user.role !== 'super_admin') {
      return fail(403, { message: 'Only super admins can update platform settings' });
    }

    const formData = await request.formData();
    const companyName = formData.get('companyName') as string;
    const platformName = formData.get('platformName') as string;
    const supportEmail = formData.get('supportEmail') as string;
    const billingEmail = formData.get('billingEmail') as string;
    const defaultTimezone = formData.get('defaultTimezone') as string;

    // In a real implementation, save to database
    console.log('Updating platform settings:', {
      companyName,
      platformName,
      supportEmail,
      billingEmail,
      defaultTimezone
    });

    return { success: true, message: 'Platform settings updated successfully' };
  },

  updateNotificationSettings: async ({ request, locals }) => {
    if (!locals.user) {
      return fail(401, { message: 'Unauthorized' });
    }

    const formData = await request.formData();

    // In a real implementation, save to database
    console.log('Updating notification settings from form data');

    return { success: true, message: 'Notification settings updated successfully' };
  },

  connectIntegration: async ({ request, locals }) => {
    if (!locals.user) {
      return fail(401, { message: 'Unauthorized' });
    }

    if (!['super_admin', 'admin'].includes(locals.user.role)) {
      return fail(403, { message: 'You do not have permission to configure integrations' });
    }

    const formData = await request.formData();
    const integrationId = formData.get('integrationId') as IntegrationId;

    if (!integrationId) {
      return fail(400, { message: 'Integration ID is required' });
    }

    // Get all form fields for this integration
    const meta = INTEGRATIONS_METADATA.find(m => m.id === integrationId);
    if (!meta) {
      return fail(400, { message: 'Unknown integration' });
    }

    // Extract credentials from form data
    const credentials: Record<string, string> = {};
    for (const field of meta.fields) {
      const value = formData.get(field.key);
      if (value) {
        credentials[field.key] = value.toString();
      }
    }

    // Connect the integration
    const result = await connectInt(integrationId, credentials, locals.user.id);

    if (!result.success) {
      return fail(400, { message: result.error || 'Failed to connect integration' });
    }

    return { success: true, message: `${meta.name} connected successfully` };
  },

  disconnectIntegration: async ({ request, locals }) => {
    if (!locals.user) {
      return fail(401, { message: 'Unauthorized' });
    }

    if (!['super_admin', 'admin'].includes(locals.user.role)) {
      return fail(403, { message: 'You do not have permission to configure integrations' });
    }

    const formData = await request.formData();
    const integrationId = formData.get('integrationId') as IntegrationId;

    if (!integrationId) {
      return fail(400, { message: 'Integration ID is required' });
    }

    const meta = INTEGRATIONS_METADATA.find(m => m.id === integrationId);
    if (!meta) {
      return fail(400, { message: 'Unknown integration' });
    }

    // Disconnect the integration
    const result = await disconnectInt(integrationId, locals.user.id);

    if (!result.success) {
      return fail(400, { message: result.error || 'Failed to disconnect integration' });
    }

    return { success: true, message: `${meta.name} disconnected` };
  },

  configureIntegration: async ({ request, locals }) => {
    if (!locals.user) {
      return fail(401, { message: 'Unauthorized' });
    }

    if (!['super_admin', 'admin'].includes(locals.user.role)) {
      return fail(403, { message: 'You do not have permission to configure integrations' });
    }

    const formData = await request.formData();
    const integrationId = formData.get('integrationId') as IntegrationId;

    if (!integrationId) {
      return fail(400, { message: 'Integration ID is required' });
    }

    // Get all form fields for this integration
    const meta = INTEGRATIONS_METADATA.find(m => m.id === integrationId);
    if (!meta) {
      return fail(400, { message: 'Unknown integration' });
    }

    // Extract credentials from form data
    const credentials: Record<string, string> = {};
    for (const field of meta.fields) {
      const value = formData.get(field.key);
      if (value) {
        credentials[field.key] = value.toString();
      }
    }

    // Update the integration configuration
    const result = await connectInt(integrationId, credentials, locals.user.id);

    if (!result.success) {
      return fail(400, { message: result.error || 'Failed to update integration' });
    }

    return { success: true, message: `${meta.name} configuration updated` };
  },

  inviteTeamMember: async ({ request, locals }) => {
    if (!locals.user) {
      return fail(401, { message: 'Unauthorized' });
    }

    if (!['super_admin', 'admin'].includes(locals.user.role)) {
      return fail(403, { message: 'You do not have permission to invite team members' });
    }

    const formData = await request.formData();
    const email = formData.get('email') as string;
    const firstName = formData.get('firstName') as string;
    const lastName = formData.get('lastName') as string;
    const role = formData.get('role') as string;

    if (!email || !role) {
      return fail(400, { message: 'Email and role are required' });
    }

    if (!firstName || !lastName) {
      return fail(400, { message: 'First name and last name are required' });
    }

    // Validate role
    if (!['super_admin', 'admin', 'support'].includes(role)) {
      return fail(400, { message: 'Invalid role. Must be super_admin, admin, or support' });
    }

    // Only super_admin can create other super_admins
    if (role === 'super_admin' && locals.user.role !== 'super_admin') {
      return fail(403, { message: 'Only super admins can create other super admins' });
    }

    try {
      // Check if user with this email already exists
      const existingUser = await prisma.user.findUnique({
        where: { email: email.toLowerCase() }
      });

      if (existingUser) {
        if (existingUser.deletedAt) {
          // Reactivate deleted user
          await prisma.user.update({
            where: { id: existingUser.id },
            data: {
              deletedAt: null,
              isActive: true,
              firstName,
              lastName,
              role: role as any
            }
          });
          return { success: true, message: `Team member ${email} has been reactivated` };
        }
        return fail(400, { message: 'A user with this email already exists' });
      }

      // Generate a temporary password (in production, you'd send an invite email)
      const tempPassword = crypto.randomUUID().slice(0, 12);
      const passwordHash = await hash(tempPassword, {
        memoryCost: 19456,
        timeCost: 2,
        outputLen: 32,
        parallelism: 1
      });

      // Create the new team member
      await prisma.user.create({
        data: {
          email: email.toLowerCase(),
          firstName,
          lastName,
          passwordHash,
          role: role as any,
          isActive: true,
          organizationId: null // Internal staff don't belong to client organizations
        }
      });

      // Return credentials for admin to share with the new team member
      return {
        success: true,
        showCredentials: true,
        credentials: {
          email: email.toLowerCase(),
          password: tempPassword,
          name: `${firstName} ${lastName}`
        },
        message: `Team member created successfully`
      };
    } catch (error) {
      console.error('Failed to invite team member:', error);
      return fail(500, { message: 'Failed to create team member' });
    }
  },

  updateTeamMember: async ({ request, locals }) => {
    if (!locals.user) {
      return fail(401, { message: 'Unauthorized' });
    }

    if (!['super_admin', 'admin'].includes(locals.user.role)) {
      return fail(403, { message: 'You do not have permission to update team members' });
    }

    const formData = await request.formData();
    const memberId = formData.get('memberId') as string;
    const role = formData.get('role') as string;
    const status = formData.get('status') as string;
    const firstName = formData.get('firstName') as string;
    const lastName = formData.get('lastName') as string;

    if (!memberId) {
      return fail(400, { message: 'Member ID is required' });
    }

    try {
      // Check if user exists
      const user = await prisma.user.findUnique({
        where: { id: memberId },
        select: { id: true, role: true }
      });

      if (!user) {
        return fail(404, { message: 'Team member not found' });
      }

      // Only super_admin can modify other super_admins
      if (user.role === 'super_admin' && locals.user.role !== 'super_admin') {
        return fail(403, { message: 'Only super admins can modify other super admins' });
      }

      // Only super_admin can promote to super_admin
      if (role === 'super_admin' && locals.user.role !== 'super_admin') {
        return fail(403, { message: 'Only super admins can promote users to super admin' });
      }

      // Build update data
      const updateData: any = {};

      if (role && ['super_admin', 'admin', 'support'].includes(role)) {
        updateData.role = role;
      }

      if (status) {
        updateData.isActive = status === 'active';
      }

      if (firstName) {
        updateData.firstName = firstName;
      }

      if (lastName) {
        updateData.lastName = lastName;
      }

      // Update the user
      await prisma.user.update({
        where: { id: memberId },
        data: updateData
      });

      return { success: true, message: 'Team member updated successfully' };
    } catch (error) {
      console.error('Failed to update team member:', error);
      return fail(500, { message: 'Failed to update team member' });
    }
  },

  removeTeamMember: async ({ request, locals }) => {
    if (!locals.user) {
      return fail(401, { message: 'Unauthorized' });
    }

    if (locals.user.role !== 'super_admin') {
      return fail(403, { message: 'Only super admins can remove team members' });
    }

    const formData = await request.formData();
    const memberId = formData.get('memberId') as string;

    if (!memberId) {
      return fail(400, { message: 'Member ID is required' });
    }

    // Prevent deleting yourself
    if (memberId === locals.user.id) {
      return fail(400, { message: 'You cannot remove yourself' });
    }

    try {
      // Check if user exists and is internal staff
      const user = await prisma.user.findUnique({
        where: { id: memberId },
        select: { id: true, role: true, email: true }
      });

      if (!user) {
        return fail(404, { message: 'Team member not found' });
      }

      // Only allow removing internal staff roles
      if (!['super_admin', 'admin', 'support'].includes(user.role)) {
        return fail(400, { message: 'Cannot remove client users from this page' });
      }

      // Soft delete the user
      await prisma.user.update({
        where: { id: memberId },
        data: {
          deletedAt: new Date(),
          isActive: false
        }
      });

      return { success: true, message: 'Team member removed successfully' };
    } catch (error) {
      console.error('Failed to remove team member:', error);
      return fail(500, { message: 'Failed to remove team member' });
    }
  },

  generateApiKey: async ({ request, locals }) => {
    if (!locals.user) {
      return fail(401, { message: 'Unauthorized' });
    }

    if (locals.user.role !== 'super_admin') {
      return fail(403, { message: 'Only super admins can generate API keys' });
    }

    const formData = await request.formData();
    const name = formData.get('name') as string;

    // In a real implementation, generate and store API key
    console.log('Generating API key:', name);

    return { success: true, message: 'API key generated successfully' };
  },

  revokeApiKey: async ({ request, locals }) => {
    if (!locals.user) {
      return fail(401, { message: 'Unauthorized' });
    }

    if (locals.user.role !== 'super_admin') {
      return fail(403, { message: 'Only super admins can revoke API keys' });
    }

    const formData = await request.formData();
    const keyId = formData.get('keyId') as string;

    // In a real implementation, revoke API key
    console.log('Revoking API key:', keyId);

    return { success: true, message: 'API key revoked' };
  }
};
