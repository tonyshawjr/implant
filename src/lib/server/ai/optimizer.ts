/**
 * Performance Optimizer
 * Analyzes campaign performance and generates optimization recommendations
 */

import type {
  CampaignPerformanceData,
  PerformanceAnalysis,
  OptimizationRecommendation,
  OptimizationType,
  OptimizationPriority,
  AIModelConfig,
  DEFAULT_AI_CONFIG
} from './types';

// ============================================================================
// Constants
// ============================================================================

const BENCHMARKS = {
  dental_implants: {
    ctr: { poor: 0.5, average: 1.5, good: 3.0, excellent: 5.0 },
    cpl: { excellent: 50, good: 100, average: 150, poor: 250 },
    conversionRate: { poor: 1, average: 3, good: 5, excellent: 10 }
  }
};

const OPTIMIZATION_THRESHOLDS = {
  ctrDropPercent: 20, // Alert if CTR drops more than 20%
  cplIncreasePercent: 25, // Alert if CPL increases more than 25%
  budgetUtilizationMin: 80, // Alert if budget utilization below 80%
  creativeFatigueImpressions: 50000, // Alert after 50K impressions
  daysSinceOptimization: 7 // Suggest optimization if no changes in 7 days
};

// ============================================================================
// Performance Optimizer Class
// ============================================================================

export class PerformanceOptimizer {
  private config: AIModelConfig;

  constructor(config: Partial<AIModelConfig> = {}) {
    this.config = { ...DEFAULT_AI_CONFIG, ...config };
  }

  /**
   * Analyze campaign performance and generate recommendations
   */
  async analyzeCampaign(data: CampaignPerformanceData): Promise<PerformanceAnalysis> {
    const startTime = Date.now();

    const healthScore = this.calculateHealthScore(data);
    const issues = this.identifyIssues(data);
    const opportunities = this.identifyOpportunities(data);
    const recommendations = this.generateRecommendations(data, issues, opportunities);
    const budgetRecommendations = this.analyzeBudgetAllocation(data);
    const creativeInsights = this.analyzeCreatives(data);

    const processingTimeMs = Date.now() - startTime;

    return {
      summary: this.generateSummary(data, healthScore, issues, opportunities),
      healthScore,
      topIssues: issues.slice(0, 5),
      topOpportunities: opportunities.slice(0, 5),
      recommendations,
      budgetAllocation: budgetRecommendations,
      creativeInsights,
      metadata: {
        analyzedAt: new Date(),
        dataRangeStart: this.getDataRangeStart(data),
        dataRangeEnd: new Date(),
        processingTimeMs
      }
    };
  }

  /**
   * Analyze multiple campaigns and prioritize optimizations
   */
  async analyzeMultipleCampaigns(
    campaigns: CampaignPerformanceData[]
  ): Promise<{
    campaignAnalyses: Map<string, PerformanceAnalysis>;
    prioritizedRecommendations: OptimizationRecommendation[];
    overallHealthScore: number;
  }> {
    const analyses = new Map<string, PerformanceAnalysis>();
    const allRecommendations: OptimizationRecommendation[] = [];

    for (const campaign of campaigns) {
      const analysis = await this.analyzeCampaign(campaign);
      analyses.set(campaign.campaignId, analysis);
      allRecommendations.push(...analysis.recommendations);
    }

    // Sort all recommendations by priority and expected impact
    const prioritized = allRecommendations.sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      }
      return b.expectedImpact.improvementPercent - a.expectedImpact.improvementPercent;
    });

    // Calculate overall health score
    const scores = Array.from(analyses.values()).map((a) => a.healthScore);
    const overallHealthScore =
      scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;

    return {
      campaignAnalyses: analyses,
      prioritizedRecommendations: prioritized.slice(0, 20),
      overallHealthScore
    };
  }

  // ============================================================================
  // Health Score Calculation
  // ============================================================================

  private calculateHealthScore(data: CampaignPerformanceData): number {
    const { metrics, historicalTrend, creatives } = data;
    let score = 100;

    // CTR scoring (25 points)
    const ctrScore = this.scoreCtr(metrics.ctr);
    score -= 25 - ctrScore;

    // CPL scoring (25 points)
    const cplScore = this.scoreCpl(metrics.cpl);
    score -= 25 - cplScore;

    // Trend scoring (20 points)
    const trendScore = this.scoreTrend(historicalTrend);
    score -= 20 - trendScore;

    // Creative performance scoring (15 points)
    const creativeScore = this.scoreCreatives(creatives);
    score -= 15 - creativeScore;

    // Volume scoring (15 points)
    const volumeScore = this.scoreVolume(metrics);
    score -= 15 - volumeScore;

    return Math.max(0, Math.min(100, Math.round(score)));
  }

  private scoreCtr(ctr: number): number {
    const benchmarks = BENCHMARKS.dental_implants.ctr;
    if (ctr >= benchmarks.excellent) return 25;
    if (ctr >= benchmarks.good) return 20;
    if (ctr >= benchmarks.average) return 15;
    if (ctr >= benchmarks.poor) return 10;
    return 5;
  }

  private scoreCpl(cpl: number): number {
    const benchmarks = BENCHMARKS.dental_implants.cpl;
    if (cpl <= benchmarks.excellent) return 25;
    if (cpl <= benchmarks.good) return 20;
    if (cpl <= benchmarks.average) return 15;
    if (cpl <= benchmarks.poor) return 10;
    return 5;
  }

  private scoreTrend(trend: CampaignPerformanceData['historicalTrend']): number {
    if (trend.length < 7) return 15; // Not enough data

    const recent = trend.slice(0, 7);
    const previous = trend.slice(7, 14);

    if (previous.length === 0) return 15;

    const recentLeads = recent.reduce((sum, t) => sum + t.leads, 0);
    const prevLeads = previous.reduce((sum, t) => sum + t.leads, 0);

    const growth = prevLeads > 0 ? (recentLeads - prevLeads) / prevLeads : 0;

    if (growth > 0.1) return 20; // 10%+ growth
    if (growth > 0) return 17;
    if (growth > -0.1) return 13;
    if (growth > -0.2) return 8;
    return 3;
  }

  private scoreCreatives(creatives: CampaignPerformanceData['creatives']): number {
    if (creatives.length === 0) return 10;

    const avgCtr = creatives.reduce((sum, c) => sum + c.ctr, 0) / creatives.length;
    const variance = this.calculateVariance(creatives.map((c) => c.ctr));

    let score = 15;

    // Penalize if there's too much variance (some creatives underperforming)
    if (variance > 2) score -= 5;

    // Penalize if no creatives are performing well
    const hasWinner = creatives.some((c) => c.ctr > avgCtr * 1.3);
    if (!hasWinner) score -= 3;

    return Math.max(0, score);
  }

  private scoreVolume(metrics: CampaignPerformanceData['metrics']): number {
    // Score based on lead volume
    if (metrics.leads >= 50) return 15;
    if (metrics.leads >= 30) return 12;
    if (metrics.leads >= 15) return 9;
    if (metrics.leads >= 5) return 6;
    return 3;
  }

  // ============================================================================
  // Issue and Opportunity Identification
  // ============================================================================

  private identifyIssues(data: CampaignPerformanceData): string[] {
    const issues: string[] = [];
    const { metrics, historicalTrend, creatives } = data;

    // High CPL
    if (metrics.cpl > BENCHMARKS.dental_implants.cpl.poor) {
      issues.push(`Cost per lead ($${metrics.cpl.toFixed(2)}) is significantly above industry average`);
    } else if (metrics.cpl > BENCHMARKS.dental_implants.cpl.average) {
      issues.push(`Cost per lead ($${metrics.cpl.toFixed(2)}) is above average - room for improvement`);
    }

    // Low CTR
    if (metrics.ctr < BENCHMARKS.dental_implants.ctr.poor) {
      issues.push(`Click-through rate (${metrics.ctr.toFixed(2)}%) is critically low`);
    } else if (metrics.ctr < BENCHMARKS.dental_implants.ctr.average) {
      issues.push(`Click-through rate (${metrics.ctr.toFixed(2)}%) is below average`);
    }

    // Declining performance
    if (historicalTrend.length >= 14) {
      const recent = historicalTrend.slice(0, 7);
      const previous = historicalTrend.slice(7, 14);
      const recentLeads = recent.reduce((sum, t) => sum + t.leads, 0);
      const prevLeads = previous.reduce((sum, t) => sum + t.leads, 0);

      if (prevLeads > 0 && (recentLeads - prevLeads) / prevLeads < -0.2) {
        issues.push('Lead volume has decreased more than 20% compared to previous week');
      }
    }

    // Creative fatigue
    const highImpression = creatives.filter(
      (c) => c.impressions > OPTIMIZATION_THRESHOLDS.creativeFatigueImpressions
    );
    if (highImpression.length > 0) {
      issues.push(
        `${highImpression.length} creative(s) may be experiencing fatigue (50K+ impressions)`
      );
    }

    // Low converting creatives
    const lowPerformers = creatives.filter((c) => c.leads === 0 && c.impressions > 1000);
    if (lowPerformers.length > 0) {
      issues.push(`${lowPerformers.length} creative(s) have zero leads despite significant traffic`);
    }

    // Low volume
    if (metrics.impressions < 1000) {
      issues.push('Low impression volume - campaign may need budget increase');
    }

    return issues;
  }

  private identifyOpportunities(data: CampaignPerformanceData): string[] {
    const opportunities: string[] = [];
    const { metrics, creatives, audienceBreakdown } = data;

    // Good CTR - opportunity to scale
    if (metrics.ctr > BENCHMARKS.dental_implants.ctr.good) {
      opportunities.push('Strong CTR indicates room to increase budget and scale reach');
    }

    // Good CPL - opportunity to scale
    if (metrics.cpl < BENCHMARKS.dental_implants.cpl.good) {
      opportunities.push('Efficient CPL suggests opportunity to increase budget while maintaining performance');
    }

    // Winning creatives
    const avgCtr = creatives.reduce((sum, c) => sum + c.ctr, 0) / Math.max(creatives.length, 1);
    const winners = creatives.filter((c) => c.ctr > avgCtr * 1.3);
    if (winners.length > 0) {
      opportunities.push(
        `${winners.length} top-performing creative(s) could receive more budget allocation`
      );
    }

    // Audience insights
    if (audienceBreakdown?.length) {
      const bestSegment = audienceBreakdown.reduce((best, seg) =>
        seg.performance > best.performance ? seg : best
      );
      if (bestSegment.performance > 0) {
        opportunities.push(
          `"${bestSegment.segment}" audience segment shows highest performance - consider expansion`
        );
      }
    }

    // A/B testing opportunity
    if (creatives.length < 3) {
      opportunities.push('Limited creative variants - A/B testing could improve performance');
    }

    // Retargeting opportunity
    if (metrics.conversions < metrics.leads * 0.3) {
      opportunities.push('Conversion rate suggests retargeting campaigns could capture more leads');
    }

    return opportunities;
  }

  // ============================================================================
  // Recommendation Generation
  // ============================================================================

  private generateRecommendations(
    data: CampaignPerformanceData,
    issues: string[],
    opportunities: string[]
  ): OptimizationRecommendation[] {
    const recommendations: OptimizationRecommendation[] = [];
    const { metrics, creatives, audienceBreakdown } = data;

    // Budget recommendations
    if (metrics.cpl < BENCHMARKS.dental_implants.cpl.good && metrics.leads > 10) {
      recommendations.push({
        id: `rec-budget-${Date.now()}-1`,
        type: 'budget_change',
        priority: 'high',
        title: 'Increase Daily Budget',
        description: `Current CPL ($${metrics.cpl.toFixed(2)}) is excellent. Increase budget to capture more leads at efficient rates.`,
        reasoning: 'Strong performance metrics indicate campaign can scale without significant CPL increase.',
        expectedImpact: {
          metric: 'leads',
          currentValue: metrics.leads,
          projectedValue: Math.round(metrics.leads * 1.3),
          improvementPercent: 30
        },
        actionSteps: [
          'Increase daily budget by 25-30%',
          'Monitor CPL for first 48 hours',
          'Adjust if CPL increases more than 15%'
        ],
        confidence: 0.82,
        autoApplicable: true,
        previousValue: { dailyBudget: Math.round(metrics.spend / 30) },
        suggestedValue: { dailyBudget: Math.round((metrics.spend / 30) * 1.3) }
      });
    }

    // Creative recommendations
    const poorCreatives = creatives.filter(
      (c) => c.ctr < metrics.ctr * 0.5 && c.impressions > 500
    );
    if (poorCreatives.length > 0) {
      recommendations.push({
        id: `rec-creative-${Date.now()}-1`,
        type: 'pause_ad',
        priority: 'medium',
        title: 'Pause Underperforming Creatives',
        description: `${poorCreatives.length} creative(s) are performing below average and consuming budget inefficiently.`,
        reasoning: 'Reallocating budget from poor performers to winners improves overall campaign efficiency.',
        expectedImpact: {
          metric: 'ctr',
          currentValue: metrics.ctr,
          projectedValue: metrics.ctr * 1.15,
          improvementPercent: 15
        },
        actionSteps: [
          'Pause the following creatives: ' + poorCreatives.map((c) => c.id).join(', '),
          'Reallocate budget to top performers',
          'Consider creating new variants based on winning headlines'
        ],
        confidence: 0.78,
        autoApplicable: true
      });
    }

    // High impression creatives - swap
    const fatigued = creatives.filter(
      (c) => c.impressions > OPTIMIZATION_THRESHOLDS.creativeFatigueImpressions
    );
    if (fatigued.length > 0) {
      recommendations.push({
        id: `rec-creative-${Date.now()}-2`,
        type: 'creative_swap',
        priority: 'medium',
        title: 'Refresh High-Impression Creatives',
        description: `${fatigued.length} creative(s) have high impression counts and may be experiencing fatigue.`,
        reasoning: 'Ad fatigue leads to declining CTR over time. Fresh creatives maintain engagement.',
        expectedImpact: {
          metric: 'ctr',
          currentValue: metrics.ctr,
          projectedValue: metrics.ctr * 1.2,
          improvementPercent: 20
        },
        actionSteps: [
          'Generate new creative variants using A/B test generator',
          'Gradually phase out fatigued creatives',
          'Test 3-5 new variants before full replacement'
        ],
        confidence: 0.72,
        autoApplicable: false
      });
    }

    // Bid adjustment recommendations
    if (metrics.ctr > BENCHMARKS.dental_implants.ctr.good && metrics.cpl > BENCHMARKS.dental_implants.cpl.average) {
      recommendations.push({
        id: `rec-bid-${Date.now()}-1`,
        type: 'bid_adjustment',
        priority: 'medium',
        title: 'Lower Bid Strategy',
        description: 'High CTR with high CPL suggests bids may be higher than necessary.',
        reasoning: 'Strong engagement metrics indicate competitive positioning without needing premium bids.',
        expectedImpact: {
          metric: 'cpl',
          currentValue: metrics.cpl,
          projectedValue: metrics.cpl * 0.85,
          improvementPercent: 15
        },
        actionSteps: [
          'Reduce maximum bid by 10-15%',
          'Switch to cost cap or bid cap strategy if available',
          'Monitor impression share for any significant drops'
        ],
        confidence: 0.70,
        autoApplicable: true
      });
    }

    // Audience recommendations
    if (audienceBreakdown?.length) {
      const sortedAudiences = [...audienceBreakdown].sort(
        (a, b) => b.performance - a.performance
      );
      const topAudience = sortedAudiences[0];
      const worstAudience = sortedAudiences[sortedAudiences.length - 1];

      if (topAudience.performance > worstAudience.performance * 2) {
        recommendations.push({
          id: `rec-audience-${Date.now()}-1`,
          type: 'audience_change',
          priority: 'high',
          title: 'Reallocate Audience Budget',
          description: `"${topAudience.segment}" significantly outperforms "${worstAudience.segment}".`,
          reasoning: 'Shifting budget to top-performing audiences maximizes ROI.',
          expectedImpact: {
            metric: 'leads',
            currentValue: metrics.leads,
            projectedValue: Math.round(metrics.leads * 1.25),
            improvementPercent: 25
          },
          actionSteps: [
            `Increase budget allocation for "${topAudience.segment}" by 30%`,
            `Reduce or pause "${worstAudience.segment}" audience`,
            'Create lookalike audience from top performers'
          ],
          confidence: 0.80,
          autoApplicable: true
        });
      }
    }

    // Scaling recommendation
    const topCreatives = creatives.filter((c) => c.ctr > metrics.ctr * 1.3);
    if (topCreatives.length > 0 && metrics.cpl < BENCHMARKS.dental_implants.cpl.average) {
      recommendations.push({
        id: `rec-scale-${Date.now()}-1`,
        type: 'scale_ad',
        priority: 'high',
        title: 'Scale Winning Creatives',
        description: `${topCreatives.length} creative(s) are outperforming with efficient CPL.`,
        reasoning: 'Scaling proven winners with good economics is lower risk than testing new content.',
        expectedImpact: {
          metric: 'leads',
          currentValue: metrics.leads,
          projectedValue: Math.round(metrics.leads * 1.5),
          improvementPercent: 50
        },
        actionSteps: [
          'Duplicate winning ad sets with 50% higher budget',
          'Test in expanded geographic targeting',
          'Monitor frequency to avoid fatigue'
        ],
        confidence: 0.75,
        autoApplicable: false
      });
    }

    // Sort by priority and confidence
    return recommendations.sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      }
      return b.confidence - a.confidence;
    });
  }

  // ============================================================================
  // Budget Analysis
  // ============================================================================

  private analyzeBudgetAllocation(data: CampaignPerformanceData) {
    const current = [
      {
        campaignId: data.campaignId,
        budget: data.metrics.spend,
        performance: this.calculatePerformanceScore(data.metrics)
      }
    ];

    // For single campaign, recommend based on performance
    const performanceScore = current[0].performance;
    let recommendedBudget = data.metrics.spend;
    let reasoning = '';

    if (performanceScore > 80) {
      recommendedBudget = data.metrics.spend * 1.3;
      reasoning = 'Excellent performance justifies 30% budget increase';
    } else if (performanceScore > 60) {
      recommendedBudget = data.metrics.spend * 1.1;
      reasoning = 'Good performance supports modest 10% budget increase';
    } else if (performanceScore < 40) {
      recommendedBudget = data.metrics.spend * 0.7;
      reasoning = 'Poor performance suggests reducing budget until optimizations take effect';
    } else {
      reasoning = 'Average performance - maintain current budget while optimizing';
    }

    return {
      current,
      recommended: [
        {
          campaignId: data.campaignId,
          budget: Math.round(recommendedBudget),
          reasoning
        }
      ]
    };
  }

  private calculatePerformanceScore(metrics: CampaignPerformanceData['metrics']): number {
    let score = 0;

    // CTR scoring (0-30)
    if (metrics.ctr >= 3) score += 30;
    else if (metrics.ctr >= 1.5) score += 20;
    else if (metrics.ctr >= 0.5) score += 10;

    // CPL scoring (0-40)
    if (metrics.cpl <= 50) score += 40;
    else if (metrics.cpl <= 100) score += 30;
    else if (metrics.cpl <= 150) score += 20;
    else if (metrics.cpl <= 250) score += 10;

    // Conversion rate scoring (0-30)
    const convRate = metrics.leads > 0 ? (metrics.conversions / metrics.leads) * 100 : 0;
    if (convRate >= 10) score += 30;
    else if (convRate >= 5) score += 20;
    else if (convRate >= 2) score += 10;

    return score;
  }

  // ============================================================================
  // Creative Analysis
  // ============================================================================

  private analyzeCreatives(data: CampaignPerformanceData) {
    const { creatives } = data;

    if (creatives.length === 0) {
      return {
        topPerformers: [],
        underperformers: [],
        fatigueAlerts: []
      };
    }

    const avgCtr = creatives.reduce((sum, c) => sum + c.ctr, 0) / creatives.length;

    return {
      topPerformers: creatives
        .filter((c) => c.ctr > avgCtr * 1.2)
        .sort((a, b) => b.ctr - a.ctr)
        .slice(0, 5)
        .map((c) => c.headline),
      underperformers: creatives
        .filter((c) => c.ctr < avgCtr * 0.5)
        .map((c) => c.headline),
      fatigueAlerts: creatives
        .filter((c) => c.impressions > OPTIMIZATION_THRESHOLDS.creativeFatigueImpressions)
        .map((c) => `${c.headline} (${(c.impressions / 1000).toFixed(0)}K impressions)`)
    };
  }

  // ============================================================================
  // Utility Methods
  // ============================================================================

  private generateSummary(
    data: CampaignPerformanceData,
    healthScore: number,
    issues: string[],
    opportunities: string[]
  ): string {
    const { metrics, platform } = data;

    let summary = `This ${platform} campaign has a health score of ${healthScore}/100. `;

    if (healthScore >= 80) {
      summary += 'Performance is excellent with strong metrics across the board. ';
    } else if (healthScore >= 60) {
      summary += 'Performance is good with some room for optimization. ';
    } else if (healthScore >= 40) {
      summary += 'Performance needs attention - several areas require optimization. ';
    } else {
      summary += 'Performance is concerning - immediate action recommended. ';
    }

    summary += `Current CPL is $${metrics.cpl.toFixed(2)} with ${metrics.leads} leads generated. `;

    if (issues.length > 0) {
      summary += `Key issues: ${issues[0]}. `;
    }

    if (opportunities.length > 0) {
      summary += `Top opportunity: ${opportunities[0]}.`;
    }

    return summary;
  }

  private getDataRangeStart(data: CampaignPerformanceData): Date {
    if (data.historicalTrend.length > 0) {
      const oldestDate = data.historicalTrend[data.historicalTrend.length - 1].date;
      return new Date(oldestDate);
    }
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    return thirtyDaysAgo;
  }

  private calculateVariance(values: number[]): number {
    if (values.length === 0) return 0;
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const squaredDiffs = values.map((v) => Math.pow(v - mean, 2));
    return Math.sqrt(squaredDiffs.reduce((a, b) => a + b, 0) / values.length);
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Create a new performance optimizer instance
 */
export function createOptimizer(config?: Partial<AIModelConfig>): PerformanceOptimizer {
  return new PerformanceOptimizer(config);
}

/**
 * Quick analysis helper for a single campaign
 */
export async function analyzeCampaignPerformance(
  data: CampaignPerformanceData
): Promise<PerformanceAnalysis> {
  const optimizer = new PerformanceOptimizer();
  return optimizer.analyzeCampaign(data);
}

export default PerformanceOptimizer;
