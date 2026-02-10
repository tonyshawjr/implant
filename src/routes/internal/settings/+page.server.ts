import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
  // Return basic settings data - in production would come from database
  return {
    settings: {
      general: {
        platformName: 'Implant Lead Engine',
        supportEmail: 'support@squeez.media',
        timezone: 'America/New_York'
      },
      notifications: {
        emailAlerts: true,
        slackIntegration: false,
        dailyDigest: true,
        weeklyReport: true
      },
      integrations: [
        { name: 'Stripe', status: 'connected', lastSync: new Date().toISOString() },
        { name: 'Twilio', status: 'connected', lastSync: new Date().toISOString() },
        { name: 'Meta Ads', status: 'not_connected', lastSync: null },
        { name: 'Google Ads', status: 'not_connected', lastSync: null }
      ]
    }
  };
};
