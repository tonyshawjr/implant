import type { PageServerLoad, Actions } from './$types';
import { fail } from '@sveltejs/kit';

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

  // Integration status
  const integrations = [
    {
      id: 'stripe',
      name: 'Stripe',
      description: 'Payment processing and subscription management',
      status: 'connected',
      lastSync: new Date().toISOString(),
      icon: 'credit-card'
    },
    {
      id: 'twilio',
      name: 'Twilio',
      description: 'SMS and voice notifications',
      status: 'connected',
      lastSync: new Date().toISOString(),
      icon: 'phone'
    },
    {
      id: 'facebook',
      name: 'Meta Ads',
      description: 'Facebook and Instagram advertising',
      status: 'connected',
      lastSync: new Date().toISOString(),
      icon: 'megaphone'
    },
    {
      id: 'google-ads',
      name: 'Google Ads',
      description: 'Google advertising platform',
      status: 'connected',
      lastSync: new Date().toISOString(),
      icon: 'search'
    },
    {
      id: 'mapbox',
      name: 'Mapbox',
      description: 'Territory mapping and visualization',
      status: 'connected',
      lastSync: new Date().toISOString(),
      icon: 'map'
    },
    {
      id: 'calendly',
      name: 'Calendly',
      description: 'Appointment scheduling',
      status: 'disconnected',
      lastSync: null,
      icon: 'calendar'
    },
    {
      id: 'slack',
      name: 'Slack',
      description: 'Team notifications and alerts',
      status: 'connected',
      lastSync: new Date().toISOString(),
      icon: 'chat'
    },
    {
      id: 'openai',
      name: 'OpenAI',
      description: 'AI content generation',
      status: 'connected',
      lastSync: new Date().toISOString(),
      icon: 'sparkles'
    }
  ];

  // Team members (internal staff)
  const teamMembers = [
    {
      id: '1',
      firstName: 'Sarah',
      lastName: 'Johnson',
      email: 'sarah@squeezmedia.com',
      role: 'super_admin',
      status: 'active',
      lastLogin: new Date(Date.now() - 1000 * 60 * 30).toISOString()
    },
    {
      id: '2',
      firstName: 'Mike',
      lastName: 'Chen',
      email: 'mike@squeezmedia.com',
      role: 'admin',
      status: 'active',
      lastLogin: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString()
    },
    {
      id: '3',
      firstName: 'Emily',
      lastName: 'Davis',
      email: 'emily@squeezmedia.com',
      role: 'admin',
      status: 'active',
      lastLogin: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString()
    },
    {
      id: '4',
      firstName: 'James',
      lastName: 'Wilson',
      email: 'james@squeezmedia.com',
      role: 'support',
      status: 'active',
      lastLogin: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString()
    },
    {
      id: '5',
      firstName: 'Anna',
      lastName: 'Martinez',
      email: 'anna@squeezmedia.com',
      role: 'support',
      status: 'inactive',
      lastLogin: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30).toISOString()
    }
  ];

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

    const formData = await request.formData();
    const integrationId = formData.get('integrationId') as string;

    // In a real implementation, initiate OAuth flow or API key setup
    console.log('Connecting integration:', integrationId);

    return { success: true, message: 'Integration connection initiated' };
  },

  disconnectIntegration: async ({ request, locals }) => {
    if (!locals.user) {
      return fail(401, { message: 'Unauthorized' });
    }

    const formData = await request.formData();
    const integrationId = formData.get('integrationId') as string;

    // In a real implementation, revoke OAuth tokens and remove from database
    console.log('Disconnecting integration:', integrationId);

    return { success: true, message: 'Integration disconnected' };
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

    // In a real implementation, send invitation email and create pending user
    console.log('Inviting team member:', { email, firstName, lastName, role });

    return { success: true, message: `Invitation sent to ${email}` };
  },

  updateTeamMember: async ({ request, locals }) => {
    if (!locals.user) {
      return fail(401, { message: 'Unauthorized' });
    }

    const formData = await request.formData();
    const memberId = formData.get('memberId') as string;
    const role = formData.get('role') as string;
    const status = formData.get('status') as string;

    // In a real implementation, update user in database
    console.log('Updating team member:', { memberId, role, status });

    return { success: true, message: 'Team member updated' };
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

    // In a real implementation, soft delete user
    console.log('Removing team member:', memberId);

    return { success: true, message: 'Team member removed' };
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
