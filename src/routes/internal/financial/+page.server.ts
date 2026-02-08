import type { PageServerLoad } from './$types';
import { prisma } from '$lib/server/db';

export const load: PageServerLoad = async ({ url }) => {
  const dateRange = url.searchParams.get('range') || '30';
  const daysBack = parseInt(dateRange) || 30;

  const now = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - daysBack);

  const previousStartDate = new Date(startDate);
  previousStartDate.setDate(previousStartDate.getDate() - daysBack);

  // Get all active contracts with their plans and organizations
  const activeContracts = await prisma.contract.findMany({
    where: {
      status: 'active',
      organization: {
        deletedAt: null,
        status: 'active'
      }
    },
    include: {
      plan: {
        select: {
          id: true,
          name: true,
          slug: true,
          basePrice: true
        }
      },
      organization: {
        select: {
          id: true,
          name: true,
          slug: true,
          healthScore: true,
          clientSince: true,
          territoryAssignments: {
            where: { status: 'active' },
            include: {
              territory: {
                select: {
                  id: true,
                  name: true,
                  city: true,
                  state: true,
                  monthlyBasePrice: true
                }
              }
            }
          }
        }
      }
    }
  });

  // Calculate MRR by plan/tier
  const mrrByTier: Record<string, { count: number; mrr: number; planName: string }> = {};
  let totalMRR = 0;

  for (const contract of activeContracts) {
    const planSlug = contract.plan.slug;
    const monthlyCommitment = Number(contract.monthlyCommitment);
    totalMRR += monthlyCommitment;

    if (!mrrByTier[planSlug]) {
      mrrByTier[planSlug] = { count: 0, mrr: 0, planName: contract.plan.name };
    }
    mrrByTier[planSlug].count += 1;
    mrrByTier[planSlug].mrr += monthlyCommitment;
  }

  // Get revenue by territory (top territories)
  const territoryRevenue: Array<{
    territoryId: string;
    territoryName: string;
    city: string;
    state: string;
    organizationName: string;
    monthlyRevenue: number;
  }> = [];

  for (const contract of activeContracts) {
    for (const assignment of contract.organization.territoryAssignments) {
      territoryRevenue.push({
        territoryId: assignment.territory.id,
        territoryName: assignment.territory.name,
        city: assignment.territory.city,
        state: assignment.territory.state,
        organizationName: contract.organization.name,
        monthlyRevenue: Number(assignment.monthlyRate)
      });
    }
  }

  // Sort by revenue and take top 10
  const topTerritories = territoryRevenue
    .sort((a, b) => b.monthlyRevenue - a.monthlyRevenue)
    .slice(0, 10);

  // Get add-on revenue
  const activeAddons = await prisma.organizationAddon.findMany({
    where: {
      status: 'active',
      organization: {
        deletedAt: null,
        status: 'active'
      }
    },
    include: {
      addon: {
        select: {
          id: true,
          name: true,
          price: true,
          addonType: true
        }
      }
    }
  });

  let addonMRR = 0;
  for (const orgAddon of activeAddons) {
    if (orgAddon.addon.addonType === 'recurring') {
      const price = orgAddon.priceOverride ? Number(orgAddon.priceOverride) : Number(orgAddon.addon.price);
      addonMRR += price;
    }
  }

  // Calculate total ad spend under management (from campaign metrics)
  const adSpendMetrics = await prisma.campaignMetric.aggregate({
    where: {
      date: {
        gte: startDate
      },
      campaign: {
        status: 'active'
      }
    },
    _sum: {
      spend: true
    }
  });

  const totalAdSpend = adSpendMetrics._sum.spend ? Number(adSpendMetrics._sum.spend) : 0;

  // Get previous period ad spend for comparison
  const previousAdSpendMetrics = await prisma.campaignMetric.aggregate({
    where: {
      date: {
        gte: previousStartDate,
        lt: startDate
      },
      campaign: {
        status: 'active'
      }
    },
    _sum: {
      spend: true
    }
  });

  const previousAdSpend = previousAdSpendMetrics._sum.spend ? Number(previousAdSpendMetrics._sum.spend) : 0;

  // Calculate churn rate
  const churnedLastMonth = await prisma.organization.count({
    where: {
      status: 'churned',
      updatedAt: {
        gte: new Date(now.getFullYear(), now.getMonth(), 1)
      }
    }
  });

  const totalClientsStartOfMonth = await prisma.organization.count({
    where: {
      deletedAt: null,
      clientSince: {
        lt: new Date(now.getFullYear(), now.getMonth(), 1)
      }
    }
  });

  const churnRate = totalClientsStartOfMonth > 0
    ? (churnedLastMonth / totalClientsStartOfMonth) * 100
    : 0;

  // Get clients at churn risk (low health score + contract expiring soon)
  const threeMonthsFromNow = new Date();
  threeMonthsFromNow.setMonth(threeMonthsFromNow.getMonth() + 3);

  const churnRiskClients = await prisma.organization.findMany({
    where: {
      deletedAt: null,
      status: 'active',
      OR: [
        { healthScore: { lt: 50 } },
        {
          contracts: {
            some: {
              status: 'active',
              endDate: { lte: threeMonthsFromNow }
            }
          }
        }
      ]
    },
    include: {
      contracts: {
        where: { status: 'active' },
        include: {
          plan: {
            select: { name: true }
          }
        },
        orderBy: { endDate: 'asc' },
        take: 1
      }
    },
    orderBy: { healthScore: 'asc' },
    take: 10
  });

  // Get recent invoices
  const recentInvoices = await prisma.invoice.findMany({
    include: {
      organization: {
        select: {
          id: true,
          name: true,
          slug: true
        }
      }
    },
    orderBy: { issueDate: 'desc' },
    take: 20
  });

  // Get overdue invoices
  const overdueInvoices = await prisma.invoice.findMany({
    where: {
      status: 'overdue',
      dueDate: { lt: now }
    },
    include: {
      organization: {
        select: {
          id: true,
          name: true,
          slug: true
        }
      }
    },
    orderBy: { dueDate: 'asc' }
  });

  // Calculate invoice totals
  const invoiceStats = await prisma.invoice.groupBy({
    by: ['status'],
    _sum: {
      totalAmount: true
    },
    _count: true
  });

  const invoiceStatsMap: Record<string, { total: number; count: number }> = {};
  for (const stat of invoiceStats) {
    invoiceStatsMap[stat.status] = {
      total: stat._sum.totalAmount ? Number(stat._sum.totalAmount) : 0,
      count: stat._count
    };
  }

  // Calculate margin analysis per tier
  const marginAnalysis = Object.entries(mrrByTier).map(([slug, data]) => {
    // Estimate costs based on tier (simplified model)
    const estimatedCostPerClient: Record<string, number> = {
      starter: 400,
      growth: 600,
      enterprise: 900
    };
    const costPerClient = estimatedCostPerClient[slug] || 500;
    const totalCost = data.count * costPerClient;
    const margin = data.mrr - totalCost;
    const marginPercent = data.mrr > 0 ? (margin / data.mrr) * 100 : 0;

    return {
      tier: slug,
      tierName: data.planName,
      clientCount: data.count,
      revenue: data.mrr,
      estimatedCost: totalCost,
      margin,
      marginPercent
    };
  });

  // Get MRR history for trend (last 6 months)
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  const contractsHistory = await prisma.contract.findMany({
    where: {
      OR: [
        { status: 'active' },
        {
          cancelledAt: { gte: sixMonthsAgo }
        }
      ]
    },
    select: {
      monthlyCommitment: true,
      startDate: true,
      cancelledAt: true,
      status: true
    }
  });

  // Calculate MRR for each of the last 6 months
  const mrrHistory: Array<{ month: string; mrr: number }> = [];
  for (let i = 5; i >= 0; i--) {
    const monthDate = new Date();
    monthDate.setMonth(monthDate.getMonth() - i);
    const monthStart = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
    const monthEnd = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0);

    let monthMRR = 0;
    for (const contract of contractsHistory) {
      const startDate = new Date(contract.startDate);
      const cancelDate = contract.cancelledAt ? new Date(contract.cancelledAt) : null;

      if (startDate <= monthEnd && (!cancelDate || cancelDate >= monthStart)) {
        monthMRR += Number(contract.monthlyCommitment);
      }
    }

    mrrHistory.push({
      month: monthStart.toLocaleString('en-US', { month: 'short', year: '2-digit' }),
      mrr: monthMRR
    });
  }

  // Calculate previous month MRR for comparison
  const previousMonthMRR = mrrHistory.length >= 2 ? mrrHistory[mrrHistory.length - 2].mrr : totalMRR;
  const mrrGrowth = previousMonthMRR > 0
    ? ((totalMRR - previousMonthMRR) / previousMonthMRR) * 100
    : 0;

  // Calculate ARR
  const arr = totalMRR * 12;

  // Calculate average revenue per client
  const avgRevenuePerClient = activeContracts.length > 0
    ? totalMRR / activeContracts.length
    : 0;

  // Serialize data for client
  const serializeInvoice = (invoice: typeof recentInvoices[0]) => ({
    id: invoice.id,
    invoiceNumber: invoice.invoiceNumber,
    status: invoice.status,
    issueDate: invoice.issueDate.toISOString(),
    dueDate: invoice.dueDate.toISOString(),
    totalAmount: Number(invoice.totalAmount),
    paidAmount: Number(invoice.paidAmount),
    paidAt: invoice.paidAt?.toISOString() ?? null,
    organization: invoice.organization
  });

  const serializeChurnRiskClient = (client: typeof churnRiskClients[0]) => ({
    id: client.id,
    name: client.name,
    slug: client.slug,
    healthScore: client.healthScore ? Number(client.healthScore) : 0,
    clientSince: client.clientSince?.toISOString() ?? null,
    contract: client.contracts[0] ? {
      endDate: client.contracts[0].endDate.toISOString(),
      monthlyCommitment: Number(client.contracts[0].monthlyCommitment),
      planName: client.contracts[0].plan.name
    } : null
  });

  return {
    dateRange: daysBack,
    summary: {
      mrr: totalMRR,
      mrrGrowth,
      arr,
      avgRevenuePerClient,
      addonMRR,
      churnRate,
      totalClients: activeContracts.length,
      totalAdSpend,
      adSpendGrowth: previousAdSpend > 0
        ? ((totalAdSpend - previousAdSpend) / previousAdSpend) * 100
        : 0
    },
    mrrByTier: Object.entries(mrrByTier).map(([slug, data]) => ({
      tier: slug,
      tierName: data.planName,
      count: data.count,
      mrr: data.mrr,
      percentage: totalMRR > 0 ? (data.mrr / totalMRR) * 100 : 0
    })),
    mrrHistory,
    topTerritories,
    marginAnalysis,
    churnRiskClients: churnRiskClients.map(serializeChurnRiskClient),
    recentInvoices: recentInvoices.map(serializeInvoice),
    overdueInvoices: overdueInvoices.map(serializeInvoice),
    invoiceStats: {
      paid: invoiceStatsMap.paid || { total: 0, count: 0 },
      pending: invoiceStatsMap.pending || { total: 0, count: 0 },
      overdue: invoiceStatsMap.overdue || { total: 0, count: 0 },
      draft: invoiceStatsMap.draft || { total: 0, count: 0 }
    }
  };
};
