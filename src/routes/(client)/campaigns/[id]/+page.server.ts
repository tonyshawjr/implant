import type { PageServerLoad } from './$types';
import { prisma } from '$lib/server/db';
import { error } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ params, parent }) => {
  const { organization } = await parent();

  if (!organization) {
    throw error(403, 'Organization not found');
  }

  const campaign = await prisma.campaign.findFirst({
    where: {
      id: params.id,
      organizationId: organization.id
    },
    include: {
      territory: {
        select: {
          id: true,
          name: true,
          city: true,
          state: true,
          radiusMiles: true
        }
      },
      creatives: {
        orderBy: { createdAt: 'desc' }
      },
      landingPages: {
        where: { status: 'published' },
        select: {
          id: true,
          name: true,
          slug: true,
          url: true,
          viewCount: true,
          submissionCount: true,
          conversionRate: true
        }
      },
      metrics: {
        orderBy: { date: 'desc' },
        take: 90
      },
      optimizationLogs: {
        orderBy: { appliedAt: 'desc' },
        take: 20
      },
      createdByUser: {
        select: {
          firstName: true,
          lastName: true
        }
      },
      approvedByUser: {
        select: {
          firstName: true,
          lastName: true
        }
      },
      _count: {
        select: {
          leads: true
        }
      }
    }
  });

  if (!campaign) {
    throw error(404, 'Campaign not found');
  }

  // Calculate overall metrics from all metrics data
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

  // Calculate daily averages (last 30 days)
  const last30Days = campaign.metrics.slice(0, 30);
  const dailyAvg = {
    impressions: last30Days.length > 0
      ? Math.round(last30Days.reduce((sum, m) => sum + m.impressions, 0) / last30Days.length)
      : 0,
    clicks: last30Days.length > 0
      ? Math.round(last30Days.reduce((sum, m) => sum + m.clicks, 0) / last30Days.length)
      : 0,
    leads: last30Days.length > 0
      ? Math.round((last30Days.reduce((sum, m) => sum + m.leads, 0) / last30Days.length) * 10) / 10
      : 0,
    spend: last30Days.length > 0
      ? Math.round((last30Days.reduce((sum, m) => sum + Number(m.spend), 0) / last30Days.length) * 100) / 100
      : 0
  };

  // Calculate 7-day trend
  const last7Days = campaign.metrics.slice(0, 7);
  const prev7Days = campaign.metrics.slice(7, 14);

  const last7Leads = last7Days.reduce((sum, m) => sum + m.leads, 0);
  const prev7Leads = prev7Days.reduce((sum, m) => sum + m.leads, 0);
  const leadsTrend = prev7Leads > 0
    ? ((last7Leads - prev7Leads) / prev7Leads) * 100
    : 0;

  const last7Spend = last7Days.reduce((sum, m) => sum + Number(m.spend), 0);
  const prev7Spend = prev7Days.reduce((sum, m) => sum + Number(m.spend), 0);
  const spendTrend = prev7Spend > 0
    ? ((last7Spend - prev7Spend) / prev7Spend) * 100
    : 0;

  // Prepare daily metrics for charts (last 30 days, reversed for chronological order)
  const dailyMetrics = last30Days.map(m => ({
    date: m.date.toISOString().split('T')[0],
    impressions: m.impressions,
    clicks: m.clicks,
    leads: m.leads,
    spend: Number(m.spend),
    ctr: m.ctr ? Number(m.ctr) : 0,
    cpl: m.cpl ? Number(m.cpl) : 0
  })).reverse();

  // Format optimization logs
  const optimizationLogs = campaign.optimizationLogs.map(log => ({
    id: log.id,
    type: log.optimizationType,
    title: log.title,
    description: log.description,
    previousValue: log.previousValue,
    newValue: log.newValue,
    impact: log.impact,
    impactMetric: log.impactMetric,
    impactValue: log.impactValue ? Number(log.impactValue) : null,
    aiConfidence: log.aiConfidence ? Number(log.aiConfidence) : null,
    appliedAt: log.appliedAt.toISOString()
  }));

  // Format creatives for display
  const creatives = campaign.creatives.map(creative => ({
    id: creative.id,
    type: creative.creativeType,
    headline: creative.headline,
    body: creative.body,
    ctaText: creative.ctaText,
    ctaUrl: creative.ctaUrl,
    mediaUrls: creative.mediaUrls as string[] | null,
    status: creative.status,
    aiGenerated: creative.aiGenerated,
    performanceScore: creative.performanceScore ? Number(creative.performanceScore) : null
  }));

  return {
    campaign: {
      id: campaign.id,
      name: campaign.name,
      platform: campaign.platform,
      campaignType: campaign.campaignType,
      status: campaign.status,
      startDate: campaign.startDate?.toISOString() ?? null,
      endDate: campaign.endDate?.toISOString() ?? null,
      dailyBudget: campaign.dailyBudget ? Number(campaign.dailyBudget) : null,
      monthlyBudget: campaign.monthlyBudget ? Number(campaign.monthlyBudget) : null,
      totalBudget: campaign.totalBudget ? Number(campaign.totalBudget) : null,
      objective: campaign.objective,
      targetAudience: campaign.targetAudience,
      externalCampaignId: campaign.externalCampaignId,
      territory: campaign.territory,
      createdAt: campaign.createdAt.toISOString(),
      updatedAt: campaign.updatedAt.toISOString(),
      approvedAt: campaign.approvedAt?.toISOString() ?? null,
      createdBy: campaign.createdByUser
        ? `${campaign.createdByUser.firstName} ${campaign.createdByUser.lastName}`
        : null,
      approvedBy: campaign.approvedByUser
        ? `${campaign.approvedByUser.firstName} ${campaign.approvedByUser.lastName}`
        : null,
      leadCount: campaign._count.leads
    },
    metrics: {
      total: {
        impressions: totalMetrics.impressions,
        clicks: totalMetrics.clicks,
        ctr: Math.round(ctr * 100) / 100,
        spend: Math.round(totalMetrics.spend * 100) / 100,
        leads: totalMetrics.leads,
        cpl: Math.round(cpl * 100) / 100,
        conversions: totalMetrics.conversions,
        cpa: Math.round(cpa * 100) / 100
      },
      daily: dailyMetrics,
      dailyAvg,
      trends: {
        leads: Math.round(leadsTrend * 10) / 10,
        leadsDirection: leadsTrend > 5 ? 'up' : leadsTrend < -5 ? 'down' : 'neutral',
        spend: Math.round(spendTrend * 10) / 10,
        spendDirection: spendTrend > 5 ? 'up' : spendTrend < -5 ? 'down' : 'neutral'
      }
    },
    creatives,
    landingPages: campaign.landingPages.map(lp => ({
      ...lp,
      conversionRate: lp.conversionRate ? Number(lp.conversionRate) : null
    })),
    optimizationLogs
  };
};
