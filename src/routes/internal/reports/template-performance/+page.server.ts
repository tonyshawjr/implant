import type { PageServerLoad } from './$types';
import { prisma } from '$lib/server/db';
import { startOfDay, addDays } from '$lib/utils';

export const load: PageServerLoad = async ({ url }) => {
  // Get filter params
  const dateRange = url.searchParams.get('range') || '30d';
  const category = url.searchParams.get('category') || '';

  // Calculate date range
  const now = new Date();
  let startDate: Date;

  switch (dateRange) {
    case '7d':
      startDate = startOfDay(addDays(now, -7));
      break;
    case '30d':
      startDate = startOfDay(addDays(now, -30));
      break;
    case '90d':
      startDate = startOfDay(addDays(now, -90));
      break;
    case 'all':
    default:
      startDate = new Date(2020, 0, 1); // All time
  }

  // Build category filter
  const categoryFilter = category && ['implant', 'cosmetic', 'general', 'promo'].includes(category)
    ? { category: category as 'implant' | 'cosmetic' | 'general' | 'promo' }
    : {};

  // Load all templates with their landing page instances
  const templates = await prisma.landingPageTemplate.findMany({
    where: {
      ...categoryFilter
    },
    include: {
      landingPages: {
        where: {
          status: 'published',
          publishedAt: {
            gte: startDate
          }
        },
        select: {
          id: true,
          name: true,
          viewCount: true,
          submissionCount: true,
          conversionRate: true,
          publishedAt: true,
          organization: {
            select: {
              id: true,
              name: true
            }
          }
        }
      },
      createdByUser: {
        select: {
          id: true,
          firstName: true,
          lastName: true
        }
      }
    },
    orderBy: {
      usageCount: 'desc'
    }
  });

  // Calculate aggregated metrics for each template
  const templatePerformance = templates.map(template => {
    const instances = template.landingPages;
    const instanceCount = instances.length;

    // Aggregate metrics from all instances
    const totalViews = instances.reduce((sum, lp) => sum + (lp.viewCount || 0), 0);
    const totalSubmissions = instances.reduce((sum, lp) => sum + (lp.submissionCount || 0), 0);

    // Calculate average conversion rate
    const avgConversionRate = totalViews > 0
      ? Math.round((totalSubmissions / totalViews) * 10000) / 100
      : 0;

    // Find best and worst performing instances
    const instancesWithConversion = instances
      .map(lp => ({
        ...lp,
        calculatedRate: lp.viewCount && lp.viewCount > 0
          ? (lp.submissionCount || 0) / lp.viewCount * 100
          : 0
      }))
      .filter(lp => lp.viewCount && lp.viewCount > 10); // Only consider instances with meaningful traffic

    let bestInstance = null;
    let worstInstance = null;

    if (instancesWithConversion.length > 0) {
      const sorted = [...instancesWithConversion].sort((a, b) => b.calculatedRate - a.calculatedRate);
      bestInstance = {
        id: sorted[0].id,
        name: sorted[0].name,
        organization: sorted[0].organization,
        conversionRate: Math.round(sorted[0].calculatedRate * 100) / 100
      };
      if (sorted.length > 1) {
        const worst = sorted[sorted.length - 1];
        worstInstance = {
          id: worst.id,
          name: worst.name,
          organization: worst.organization,
          conversionRate: Math.round(worst.calculatedRate * 100) / 100
        };
      }
    }

    // Calculate trend (compare to template's historical average)
    const historicalRate = template.conversionRateAvg
      ? Number(template.conversionRateAvg)
      : 0;
    const trend = historicalRate > 0
      ? Math.round(((avgConversionRate - historicalRate) / historicalRate) * 100)
      : 0;

    return {
      id: template.id,
      name: template.name,
      slug: template.slug,
      description: template.description,
      category: template.category,
      thumbnailUrl: template.thumbnailUrl,
      isActive: template.isActive,
      createdAt: template.createdAt.toISOString(),
      createdBy: template.createdByUser
        ? `${template.createdByUser.firstName} ${template.createdByUser.lastName}`
        : null,
      metrics: {
        instanceCount,
        totalViews,
        totalSubmissions,
        avgConversionRate,
        historicalRate,
        trend
      },
      bestInstance,
      worstInstance
    };
  });

  // Sort by total submissions by default (can be changed in UI)
  templatePerformance.sort((a, b) => b.metrics.totalSubmissions - a.metrics.totalSubmissions);

  // Calculate summary stats
  const stats = {
    totalTemplates: templates.length,
    activeTemplates: templates.filter(t => t.isActive).length,
    totalInstances: templatePerformance.reduce((sum, t) => sum + t.metrics.instanceCount, 0),
    totalViews: templatePerformance.reduce((sum, t) => sum + t.metrics.totalViews, 0),
    totalSubmissions: templatePerformance.reduce((sum, t) => sum + t.metrics.totalSubmissions, 0),
    avgConversionRate: 0
  };

  // Calculate overall average conversion rate
  if (stats.totalViews > 0) {
    stats.avgConversionRate = Math.round((stats.totalSubmissions / stats.totalViews) * 10000) / 100;
  }

  // Get unique categories for filter
  const categories = [
    { value: '', label: 'All Categories' },
    { value: 'implant', label: 'Implant' },
    { value: 'cosmetic', label: 'Cosmetic' },
    { value: 'general', label: 'General' },
    { value: 'promo', label: 'Promo' }
  ];

  // Date range options
  const dateRanges = [
    { value: '7d', label: 'Last 7 Days' },
    { value: '30d', label: 'Last 30 Days' },
    { value: '90d', label: 'Last 90 Days' },
    { value: 'all', label: 'All Time' }
  ];

  return {
    templates: templatePerformance,
    stats,
    filters: {
      dateRange,
      category,
      categories,
      dateRanges
    }
  };
};
