import type { PageServerLoad } from './$types';
import { prisma } from '$lib/server/db';
import { startOfMonth, endOfMonth, addMonths } from '$lib/utils';

export const load: PageServerLoad = async ({ parent }) => {
  const { user, organization } = await parent();

  if (!organization) {
    return {
      stats: null,
      recentLeads: [],
      campaigns: [],
      healthScore: null
    };
  }

  const organizationId = organization.id;
  const now = new Date();
  const thisMonthStart = startOfMonth(now);
  const thisMonthEnd = endOfMonth(now);
  const lastMonthStart = startOfMonth(addMonths(now, -1));
  const lastMonthEnd = endOfMonth(addMonths(now, -1));

  // Get lead counts for this month and last month
  const [leadsThisMonth, leadsLastMonth, recentLeads, campaigns, campaignMetrics] = await Promise.all([
    // Leads this month
    prisma.lead.count({
      where: {
        organizationId,
        createdAt: {
          gte: thisMonthStart,
          lte: thisMonthEnd
        }
      }
    }),

    // Leads last month
    prisma.lead.count({
      where: {
        organizationId,
        createdAt: {
          gte: lastMonthStart,
          lte: lastMonthEnd
        }
      }
    }),

    // Recent leads (last 10)
    prisma.lead.findMany({
      where: {
        organizationId
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        status: true,
        temperature: true,
        source: true,
        createdAt: true
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 10
    }),

    // Active campaigns with their basic info
    prisma.campaign.findMany({
      where: {
        organizationId,
        status: {
          in: ['active', 'paused']
        }
      },
      select: {
        id: true,
        name: true,
        platform: true,
        status: true,
        monthlyBudget: true,
        dailyBudget: true
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 6
    }),

    // Get campaign metrics for this month
    prisma.campaignMetric.groupBy({
      by: ['campaignId'],
      where: {
        campaign: {
          organizationId
        },
        date: {
          gte: thisMonthStart,
          lte: thisMonthEnd
        }
      },
      _sum: {
        spend: true,
        leads: true
      }
    })
  ]);

  // Calculate conversion rate (converted leads / total leads)
  const [convertedLeadsThisMonth, convertedLeadsLastMonth] = await Promise.all([
    prisma.lead.count({
      where: {
        organizationId,
        status: 'converted',
        convertedAt: {
          gte: thisMonthStart,
          lte: thisMonthEnd
        }
      }
    }),
    prisma.lead.count({
      where: {
        organizationId,
        status: 'converted',
        convertedAt: {
          gte: lastMonthStart,
          lte: lastMonthEnd
        }
      }
    })
  ]);

  // Calculate total spend this month and last month
  const [spendThisMonth, spendLastMonth] = await Promise.all([
    prisma.campaignMetric.aggregate({
      where: {
        campaign: {
          organizationId
        },
        date: {
          gte: thisMonthStart,
          lte: thisMonthEnd
        }
      },
      _sum: {
        spend: true
      }
    }),
    prisma.campaignMetric.aggregate({
      where: {
        campaign: {
          organizationId
        },
        date: {
          gte: lastMonthStart,
          lte: lastMonthEnd
        }
      },
      _sum: {
        spend: true
      }
    })
  ]);

  // Calculate stats
  const totalSpendThisMonth = Number(spendThisMonth._sum.spend ?? 0);
  const totalSpendLastMonth = Number(spendLastMonth._sum.spend ?? 0);

  const conversionRateThisMonth = leadsThisMonth > 0
    ? (convertedLeadsThisMonth / leadsThisMonth) * 100
    : 0;
  const conversionRateLastMonth = leadsLastMonth > 0
    ? (convertedLeadsLastMonth / leadsLastMonth) * 100
    : 0;

  const cplThisMonth = leadsThisMonth > 0
    ? totalSpendThisMonth / leadsThisMonth
    : 0;
  const cplLastMonth = leadsLastMonth > 0
    ? totalSpendLastMonth / leadsLastMonth
    : 0;

  // Calculate percentage changes
  const leadChange = leadsLastMonth > 0
    ? ((leadsThisMonth - leadsLastMonth) / leadsLastMonth) * 100
    : leadsThisMonth > 0 ? 100 : 0;

  const conversionChange = conversionRateLastMonth > 0
    ? conversionRateThisMonth - conversionRateLastMonth
    : conversionRateThisMonth;

  const cplChange = cplLastMonth > 0
    ? ((cplThisMonth - cplLastMonth) / cplLastMonth) * 100
    : cplThisMonth > 0 ? -100 : 0;

  // Count active campaigns
  const activeCampaignCount = campaigns.filter(c => c.status === 'active').length;

  // Create campaign metrics map for quick lookup
  const metricsMap = new Map(
    campaignMetrics.map(m => [
      m.campaignId,
      { spend: Number(m._sum.spend ?? 0), leads: m._sum.leads ?? 0 }
    ])
  );

  // Enrich campaigns with metrics
  const enrichedCampaigns = campaigns.map(campaign => {
    const metrics = metricsMap.get(campaign.id) ?? { spend: 0, leads: 0 };
    const budget = Number(campaign.monthlyBudget ?? 0);
    const cpl = metrics.leads > 0 ? metrics.spend / metrics.leads : null;

    return {
      id: campaign.id,
      name: campaign.name,
      platform: campaign.platform,
      status: campaign.status,
      leadsThisMonth: metrics.leads,
      spend: metrics.spend,
      budget,
      cpl
    };
  });

  // Get organization health score
  const orgWithHealth = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { healthScore: true }
  });

  return {
    stats: {
      leadsThisMonth,
      leadChange,
      conversionRate: conversionRateThisMonth,
      conversionChange,
      activeCampaigns: activeCampaignCount,
      costPerLead: cplThisMonth,
      cplChange
    },
    recentLeads: recentLeads.map(lead => ({
      ...lead,
      createdAt: lead.createdAt.toISOString()
    })),
    campaigns: enrichedCampaigns,
    healthScore: orgWithHealth?.healthScore ? Number(orgWithHealth.healthScore) : null
  };
};
