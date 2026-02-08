/**
 * Campaign Optimization API Endpoint
 *
 * POST /api/ai/optimize-campaign - Analyze campaign and get optimization suggestions
 *
 * Request Body:
 * - campaignId: string - Campaign to analyze
 * - dateRangeStart?: string - Start of analysis period (default: 30 days ago)
 * - dateRangeEnd?: string - End of analysis period (default: today)
 *
 * Response:
 * - summary: Text summary of campaign health
 * - healthScore: 0-100 score
 * - topIssues: Priority issues to address
 * - topOpportunities: Growth opportunities
 * - recommendations: Detailed optimization recommendations
 * - budgetAllocation: Budget reallocation suggestions
 * - creativeInsights: Creative performance analysis
 */

import { json, type RequestHandler } from '@sveltejs/kit';
import { prisma } from '$lib/server/db';
import { PerformanceOptimizer, type CampaignPerformanceData, type AdPlatform } from '$lib/server/ai';

// =============================================================================
// Types
// =============================================================================

interface OptimizeCampaignRequest {
  campaignId: string;
  dateRangeStart?: string;
  dateRangeEnd?: string;
}

// =============================================================================
// POST Handler - Optimize Campaign
// =============================================================================

export const POST: RequestHandler = async ({ request, locals }) => {
  // Check authentication
  if (!locals.user) {
    return json(
      {
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required'
        }
      },
      { status: 401 }
    );
  }

  const user = locals.user;
  const organizationId = user.organizationId;

  if (!organizationId) {
    return json(
      {
        success: false,
        error: {
          code: 'NO_ORGANIZATION',
          message: 'User must belong to an organization'
        }
      },
      { status: 400 }
    );
  }

  try {
    // Parse request body
    let body: OptimizeCampaignRequest;
    try {
      body = await request.json();
    } catch {
      return json(
        {
          success: false,
          error: {
            code: 'INVALID_JSON',
            message: 'Invalid request body'
          }
        },
        { status: 400 }
      );
    }

    // Validate campaign ID
    if (!body.campaignId) {
      return json(
        {
          success: false,
          error: {
            code: 'MISSING_CAMPAIGN_ID',
            message: 'Campaign ID is required'
          }
        },
        { status: 400 }
      );
    }

    // Get campaign with metrics
    const campaign = await prisma.campaign.findFirst({
      where: {
        id: body.campaignId,
        organizationId
      },
      include: {
        metrics: {
          orderBy: { date: 'desc' },
          take: 60 // Last 60 days of data
        },
        creatives: {
          where: { status: 'approved' }
        }
      }
    });

    if (!campaign) {
      return json(
        {
          success: false,
          error: {
            code: 'CAMPAIGN_NOT_FOUND',
            message: 'Campaign not found or access denied'
          }
        },
        { status: 404 }
      );
    }

    // Calculate date range
    const endDate = body.dateRangeEnd ? new Date(body.dateRangeEnd) : new Date();
    const startDate = body.dateRangeStart
      ? new Date(body.dateRangeStart)
      : new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Filter metrics by date range
    const filteredMetrics = campaign.metrics.filter((m) => {
      const date = new Date(m.date);
      return date >= startDate && date <= endDate;
    });

    // Aggregate metrics
    const aggregatedMetrics = filteredMetrics.reduce(
      (acc, m) => ({
        impressions: acc.impressions + m.impressions,
        clicks: acc.clicks + m.clicks,
        spend: acc.spend + Number(m.spend),
        leads: acc.leads + m.leads,
        conversions: acc.conversions + m.conversions
      }),
      { impressions: 0, clicks: 0, spend: 0, leads: 0, conversions: 0 }
    );

    // Calculate derived metrics
    const ctr = aggregatedMetrics.impressions > 0
      ? (aggregatedMetrics.clicks / aggregatedMetrics.impressions) * 100
      : 0;
    const cpl = aggregatedMetrics.leads > 0
      ? aggregatedMetrics.spend / aggregatedMetrics.leads
      : 0;
    const cpa = aggregatedMetrics.conversions > 0
      ? aggregatedMetrics.spend / aggregatedMetrics.conversions
      : 0;

    // Format historical trend
    const historicalTrend = filteredMetrics.map((m) => ({
      date: m.date.toISOString(),
      impressions: m.impressions,
      clicks: m.clicks,
      spend: Number(m.spend),
      leads: m.leads
    }));

    // Format creative data
    const creatives = campaign.creatives.map((c) => ({
      id: c.id,
      headline: c.headline || 'Untitled',
      impressions: 0, // Would be aggregated from metrics
      clicks: 0,
      ctr: 0,
      leads: 0
    }));

    // Prepare performance data
    const performanceData: CampaignPerformanceData = {
      campaignId: campaign.id,
      platform: campaign.platform as AdPlatform,
      metrics: {
        impressions: aggregatedMetrics.impressions,
        clicks: aggregatedMetrics.clicks,
        ctr: Math.round(ctr * 100) / 100,
        spend: Math.round(aggregatedMetrics.spend * 100) / 100,
        leads: aggregatedMetrics.leads,
        cpl: Math.round(cpl * 100) / 100,
        conversions: aggregatedMetrics.conversions,
        cpa: Math.round(cpa * 100) / 100
      },
      historicalTrend,
      creatives
    };

    // Analyze campaign
    const optimizer = new PerformanceOptimizer();
    const analysis = await optimizer.analyzeCampaign(performanceData);

    // Log the analysis
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        organizationId,
        action: 'campaign_optimization_analysis',
        entityType: 'campaign',
        entityId: campaign.id,
        newValues: {
          healthScore: analysis.healthScore,
          issueCount: analysis.topIssues.length,
          recommendationCount: analysis.recommendations.length,
          dateRange: { start: startDate.toISOString(), end: endDate.toISOString() }
        }
      }
    });

    return json({
      success: true,
      data: {
        campaignId: campaign.id,
        campaignName: campaign.name,
        platform: campaign.platform,
        dateRange: {
          start: startDate.toISOString(),
          end: endDate.toISOString()
        },
        summary: analysis.summary,
        healthScore: analysis.healthScore,
        topIssues: analysis.topIssues,
        topOpportunities: analysis.topOpportunities,
        recommendations: analysis.recommendations.map((r) => ({
          id: r.id,
          type: r.type,
          priority: r.priority,
          title: r.title,
          description: r.description,
          reasoning: r.reasoning,
          expectedImpact: r.expectedImpact,
          actionSteps: r.actionSteps,
          confidence: r.confidence,
          autoApplicable: r.autoApplicable
        })),
        budgetAllocation: analysis.budgetAllocation,
        creativeInsights: analysis.creativeInsights,
        metadata: analysis.metadata
      }
    });
  } catch (error) {
    console.error('Error optimizing campaign:', error);

    return json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'An unexpected error occurred'
        }
      },
      { status: 500 }
    );
  }
};
