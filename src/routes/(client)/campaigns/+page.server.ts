import type { PageServerLoad, Actions } from './$types';
import { prisma } from '$lib/server/db';
import { fail } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ parent }) => {
  const { organization } = await parent();

  if (!organization) {
    return {
      campaigns: [],
      stats: {
        totalCampaigns: 0,
        activeCampaigns: 0,
        totalLeads: 0,
        totalSpend: 0,
        avgCpl: 0
      }
    };
  }

  // Get all campaigns for this organization with aggregated metrics
  const campaigns = await prisma.campaign.findMany({
    where: {
      organizationId: organization.id
    },
    include: {
      territory: {
        select: {
          id: true,
          name: true,
          city: true,
          state: true
        }
      },
      metrics: {
        orderBy: { date: 'desc' },
        take: 30
      },
      creatives: {
        where: { status: 'approved' },
        take: 3
      },
      landingPages: {
        where: { status: 'published' },
        take: 1
      },
      _count: {
        select: {
          leads: true,
          optimizationLogs: true
        }
      }
    },
    orderBy: [
      { status: 'asc' },
      { updatedAt: 'desc' }
    ]
  });

  // Calculate aggregated metrics for each campaign
  const campaignsWithMetrics = campaigns.map((campaign) => {
    const totalMetrics = campaign.metrics.reduce(
      (acc, metric) => ({
        impressions: acc.impressions + metric.impressions,
        clicks: acc.clicks + metric.clicks,
        spend: acc.spend + Number(metric.spend),
        leads: acc.leads + metric.leads,
        conversions: acc.conversions + metric.conversions
      }),
      { impressions: 0, clicks: 0, spend: 0, leads: 0, conversions: 0 }
    );

    const ctr = totalMetrics.impressions > 0
      ? (totalMetrics.clicks / totalMetrics.impressions) * 100
      : 0;
    const cpl = totalMetrics.leads > 0
      ? totalMetrics.spend / totalMetrics.leads
      : 0;
    const cpa = totalMetrics.conversions > 0
      ? totalMetrics.spend / totalMetrics.conversions
      : 0;

    // Calculate 7-day trend
    const last7Days = campaign.metrics.slice(0, 7);
    const prev7Days = campaign.metrics.slice(7, 14);

    const last7Leads = last7Days.reduce((sum, m) => sum + m.leads, 0);
    const prev7Leads = prev7Days.reduce((sum, m) => sum + m.leads, 0);
    const leadsTrend = prev7Leads > 0
      ? ((last7Leads - prev7Leads) / prev7Leads) * 100
      : 0;

    return {
      id: campaign.id,
      name: campaign.name,
      platform: campaign.platform,
      campaignType: campaign.campaignType,
      status: campaign.status,
      startDate: campaign.startDate?.toISOString() ?? null,
      endDate: campaign.endDate?.toISOString() ?? null,
      dailyBudget: campaign.dailyBudget ? Number(campaign.dailyBudget) : null,
      monthlyBudget: campaign.monthlyBudget ? Number(campaign.monthlyBudget) : null,
      territory: campaign.territory,
      leadCount: campaign._count.leads,
      optimizationCount: campaign._count.optimizationLogs,
      hasLandingPage: campaign.landingPages.length > 0,
      creativeCount: campaign.creatives.length,
      metrics: {
        impressions: totalMetrics.impressions,
        clicks: totalMetrics.clicks,
        ctr: Math.round(ctr * 100) / 100,
        spend: Math.round(totalMetrics.spend * 100) / 100,
        leads: totalMetrics.leads,
        cpl: Math.round(cpl * 100) / 100,
        conversions: totalMetrics.conversions,
        cpa: Math.round(cpa * 100) / 100
      },
      trend: {
        leads: Math.round(leadsTrend * 10) / 10,
        direction: leadsTrend > 5 ? 'up' : leadsTrend < -5 ? 'down' : 'neutral'
      },
      createdAt: campaign.createdAt.toISOString(),
      updatedAt: campaign.updatedAt.toISOString()
    };
  });

  // Calculate overall stats
  const stats = {
    totalCampaigns: campaigns.length,
    activeCampaigns: campaigns.filter(c => c.status === 'active').length,
    totalLeads: campaignsWithMetrics.reduce((sum, c) => sum + c.metrics.leads, 0),
    totalSpend: Math.round(campaignsWithMetrics.reduce((sum, c) => sum + c.metrics.spend, 0) * 100) / 100,
    avgCpl: 0
  };

  if (stats.totalLeads > 0) {
    stats.avgCpl = Math.round((stats.totalSpend / stats.totalLeads) * 100) / 100;
  }

  return {
    campaigns: campaignsWithMetrics,
    stats
  };
};

export const actions: Actions = {
  requestCampaign: async ({ request, locals }) => {
    if (!locals.user) {
      return fail(401, { message: 'Unauthorized' });
    }

    const formData = await request.formData();
    const platform = formData.get('platform') as string;
    const campaignType = formData.get('campaignType') as string;
    const objective = formData.get('objective') as string;
    const monthlyBudget = formData.get('monthlyBudget') as string;
    const notes = formData.get('notes') as string;

    if (!platform || !campaignType || !objective) {
      return fail(400, {
        message: 'Please fill in all required fields',
        platform,
        campaignType,
        objective,
        monthlyBudget,
        notes
      });
    }

    const user = locals.user;
    if (!user.organizationId) {
      return fail(400, { message: 'No organization found for user' });
    }

    // Create a support ticket for the campaign request
    const ticketNumber = `TKT-${Date.now().toString(36).toUpperCase()}`;

    await prisma.supportTicket.create({
      data: {
        ticketNumber,
        organizationId: user.organizationId,
        submittedBy: user.id,
        category: 'campaign',
        priority: 'medium',
        subject: `New Campaign Request: ${platform} - ${campaignType}`,
        description: `
Campaign Request Details:
- Platform: ${platform}
- Campaign Type: ${campaignType}
- Objective: ${objective}
- Suggested Monthly Budget: ${monthlyBudget || 'Not specified'}

Additional Notes:
${notes || 'None provided'}
        `.trim()
      }
    });

    return {
      success: true,
      message: 'Campaign request submitted successfully. Our team will review and reach out shortly.'
    };
  }
};
