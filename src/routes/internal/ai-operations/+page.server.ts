import type { PageServerLoad, Actions } from './$types';
import { prisma } from '$lib/server/db';
import { fail } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ url }) => {
  const activeTab = url.searchParams.get('tab') || 'voice-queue';
  const clientFilter = url.searchParams.get('client') || '';

  // Get voice profiles in queue (pending, analyzing, in_review)
  const voiceProfileQueue = await prisma.voiceProfile.findMany({
    where: {
      status: {
        in: ['pending', 'analyzing', 'in_review']
      }
    },
    include: {
      organization: {
        select: {
          id: true,
          name: true,
          slug: true,
          logoUrl: true,
          clientSince: true
        }
      },
      sources: {
        select: {
          id: true,
          sourceType: true,
          sourceUrl: true,
          fileName: true,
          processedAt: true
        }
      },
      approvedByUser: {
        select: {
          id: true,
          firstName: true,
          lastName: true
        }
      }
    },
    orderBy: [
      { status: 'asc' },
      { createdAt: 'asc' }
    ]
  });

  // Get campaigns in draft/pending review status
  const campaignQueue = await prisma.campaign.findMany({
    where: {
      status: {
        in: ['draft', 'pending_review']
      }
    },
    include: {
      organization: {
        select: {
          id: true,
          name: true,
          slug: true
        }
      },
      territory: {
        select: {
          id: true,
          name: true,
          city: true,
          state: true
        }
      },
      creatives: {
        where: {
          status: {
            in: ['draft', 'pending_review']
          }
        },
        select: {
          id: true,
          creativeType: true,
          headline: true,
          body: true,
          status: true
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
    orderBy: [
      { status: 'asc' },
      { createdAt: 'asc' }
    ]
  });

  // Get creatives pending review
  const adCopyReviewQueue = await prisma.campaignCreative.findMany({
    where: {
      status: 'pending_review',
      ...(clientFilter ? { campaign: { organizationId: clientFilter } } : {})
    },
    include: {
      campaign: {
        include: {
          organization: {
            select: {
              id: true,
              name: true,
              slug: true
            }
          }
        }
      },
      voiceProfile: {
        select: {
          id: true,
          name: true,
          tone: true,
          formalityLevel: true
        }
      }
    },
    orderBy: { createdAt: 'asc' }
  });

  // Get AI anomalies (unresolved)
  const anomalyAlerts = await prisma.aiAnomaly.findMany({
    where: {
      resolvedAt: null
    },
    include: {
      organization: {
        select: {
          id: true,
          name: true,
          slug: true
        }
      },
      acknowledgedByUser: {
        select: {
          id: true,
          firstName: true,
          lastName: true
        }
      }
    },
    orderBy: [
      { severity: 'desc' },
      { detectedAt: 'desc' }
    ],
    take: 50
  });

  // Get recent optimization actions
  const recentOptimizations = await prisma.campaignOptimizationLog.findMany({
    include: {
      campaign: {
        include: {
          organization: {
            select: {
              id: true,
              name: true
            }
          }
        }
      }
    },
    orderBy: { appliedAt: 'desc' },
    take: 20
  });

  // Get aggregate performance metrics across all clients
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const campaignMetricsAgg = await prisma.campaignMetric.aggregate({
    where: {
      date: {
        gte: thirtyDaysAgo
      }
    },
    _sum: {
      impressions: true,
      clicks: true,
      spend: true,
      leads: true,
      conversions: true
    },
    _avg: {
      cpl: true,
      ctr: true
    }
  });

  // Get all organizations for filter dropdown
  const organizations = await prisma.organization.findMany({
    where: {
      deletedAt: null,
      status: 'active'
    },
    select: {
      id: true,
      name: true,
      slug: true
    },
    orderBy: { name: 'asc' }
  });

  // Calculate queue stats
  const stats = {
    pendingVoiceProfiles: voiceProfileQueue.filter(v => v.status === 'pending').length,
    analyzingVoiceProfiles: voiceProfileQueue.filter(v => v.status === 'analyzing').length,
    inReviewVoiceProfiles: voiceProfileQueue.filter(v => v.status === 'in_review').length,
    draftCampaigns: campaignQueue.filter(c => c.status === 'draft').length,
    pendingReviewCampaigns: campaignQueue.filter(c => c.status === 'pending_review').length,
    pendingCreatives: adCopyReviewQueue.length,
    criticalAnomalies: anomalyAlerts.filter(a => a.severity === 'critical').length,
    warningAnomalies: anomalyAlerts.filter(a => a.severity === 'warning').length,
    totalOptimizations: recentOptimizations.length
  };

  // Serialize dates and decimals for client
  const serializeVoiceProfile = (profile: typeof voiceProfileQueue[0]) => ({
    id: profile.id,
    name: profile.name,
    status: profile.status,
    qualityScore: profile.qualityScore ? Number(profile.qualityScore) : null,
    tone: profile.tone,
    personality: profile.personality,
    formalityLevel: profile.formalityLevel,
    analysisStartedAt: profile.analysisStartedAt?.toISOString() ?? null,
    analysisCompletedAt: profile.analysisCompletedAt?.toISOString() ?? null,
    createdAt: profile.createdAt.toISOString(),
    organization: profile.organization,
    sources: profile.sources.map(s => ({
      id: s.id,
      sourceType: s.sourceType,
      sourceUrl: s.sourceUrl,
      fileName: s.fileName,
      processedAt: s.processedAt?.toISOString() ?? null
    })),
    approvedBy: profile.approvedByUser
  });

  const serializeCampaign = (campaign: typeof campaignQueue[0]) => ({
    id: campaign.id,
    name: campaign.name,
    platform: campaign.platform,
    campaignType: campaign.campaignType,
    status: campaign.status,
    dailyBudget: campaign.dailyBudget ? Number(campaign.dailyBudget) : null,
    monthlyBudget: campaign.monthlyBudget ? Number(campaign.monthlyBudget) : null,
    objective: campaign.objective,
    startDate: campaign.startDate?.toISOString() ?? null,
    createdAt: campaign.createdAt.toISOString(),
    organization: campaign.organization,
    territory: campaign.territory,
    creatives: campaign.creatives,
    createdBy: campaign.createdByUser
  });

  const serializeCreative = (creative: typeof adCopyReviewQueue[0]) => ({
    id: creative.id,
    creativeType: creative.creativeType,
    headline: creative.headline,
    body: creative.body,
    ctaText: creative.ctaText,
    ctaUrl: creative.ctaUrl,
    status: creative.status,
    aiGenerated: creative.aiGenerated,
    performanceScore: creative.performanceScore ? Number(creative.performanceScore) : null,
    createdAt: creative.createdAt.toISOString(),
    campaign: {
      id: creative.campaign.id,
      name: creative.campaign.name,
      platform: creative.campaign.platform,
      organization: creative.campaign.organization
    },
    voiceProfile: creative.voiceProfile
  });

  const serializeAnomaly = (anomaly: typeof anomalyAlerts[0]) => ({
    id: anomaly.id,
    anomalyType: anomaly.anomalyType,
    severity: anomaly.severity,
    title: anomaly.title,
    description: anomaly.description,
    metricName: anomaly.metricName,
    expectedValue: anomaly.expectedValue ? Number(anomaly.expectedValue) : null,
    actualValue: anomaly.actualValue ? Number(anomaly.actualValue) : null,
    deviationPercentage: anomaly.deviationPercentage ? Number(anomaly.deviationPercentage) : null,
    detectedAt: anomaly.detectedAt.toISOString(),
    acknowledgedAt: anomaly.acknowledgedAt?.toISOString() ?? null,
    organization: anomaly.organization,
    acknowledgedBy: anomaly.acknowledgedByUser
  });

  const serializeOptimization = (opt: typeof recentOptimizations[0]) => ({
    id: opt.id,
    optimizationType: opt.optimizationType,
    title: opt.title,
    description: opt.description,
    impact: opt.impact,
    impactMetric: opt.impactMetric,
    impactValue: opt.impactValue ? Number(opt.impactValue) : null,
    aiConfidence: opt.aiConfidence ? Number(opt.aiConfidence) : null,
    appliedAt: opt.appliedAt.toISOString(),
    campaign: {
      id: opt.campaign.id,
      name: opt.campaign.name,
      organization: opt.campaign.organization
    }
  });

  return {
    activeTab,
    clientFilter,
    voiceProfileQueue: voiceProfileQueue.map(serializeVoiceProfile),
    campaignQueue: campaignQueue.map(serializeCampaign),
    adCopyReviewQueue: adCopyReviewQueue.map(serializeCreative),
    anomalyAlerts: anomalyAlerts.map(serializeAnomaly),
    recentOptimizations: recentOptimizations.map(serializeOptimization),
    organizations,
    stats,
    performanceMetrics: {
      totalImpressions: campaignMetricsAgg._sum.impressions ?? 0,
      totalClicks: campaignMetricsAgg._sum.clicks ?? 0,
      totalSpend: campaignMetricsAgg._sum.spend ? Number(campaignMetricsAgg._sum.spend) : 0,
      totalLeads: campaignMetricsAgg._sum.leads ?? 0,
      totalConversions: campaignMetricsAgg._sum.conversions ?? 0,
      avgCpl: campaignMetricsAgg._avg.cpl ? Number(campaignMetricsAgg._avg.cpl) : 0,
      avgCtr: campaignMetricsAgg._avg.ctr ? Number(campaignMetricsAgg._avg.ctr) : 0
    }
  };
};

export const actions: Actions = {
  startAnalysis: async ({ request, locals }) => {
    if (!locals.user) {
      return fail(401, { message: 'Unauthorized' });
    }

    const formData = await request.formData();
    const voiceProfileId = formData.get('voiceProfileId') as string;

    if (!voiceProfileId) {
      return fail(400, { message: 'Voice profile ID is required' });
    }

    await prisma.voiceProfile.update({
      where: { id: voiceProfileId },
      data: {
        status: 'analyzing',
        analysisStartedAt: new Date()
      }
    });

    return { success: true, message: 'Analysis started' };
  },

  completeAnalysis: async ({ request, locals }) => {
    if (!locals.user) {
      return fail(401, { message: 'Unauthorized' });
    }

    const formData = await request.formData();
    const voiceProfileId = formData.get('voiceProfileId') as string;

    if (!voiceProfileId) {
      return fail(400, { message: 'Voice profile ID is required' });
    }

    await prisma.voiceProfile.update({
      where: { id: voiceProfileId },
      data: {
        status: 'in_review',
        analysisCompletedAt: new Date()
      }
    });

    return { success: true, message: 'Analysis complete, moved to review' };
  },

  approveVoiceProfile: async ({ request, locals }) => {
    if (!locals.user) {
      return fail(401, { message: 'Unauthorized' });
    }

    const formData = await request.formData();
    const voiceProfileId = formData.get('voiceProfileId') as string;

    if (!voiceProfileId) {
      return fail(400, { message: 'Voice profile ID is required' });
    }

    await prisma.voiceProfile.update({
      where: { id: voiceProfileId },
      data: {
        status: 'approved',
        approvedBy: locals.user.id,
        approvedAt: new Date()
      }
    });

    return { success: true, message: 'Voice profile approved' };
  },

  rejectVoiceProfile: async ({ request, locals }) => {
    if (!locals.user) {
      return fail(401, { message: 'Unauthorized' });
    }

    const formData = await request.formData();
    const voiceProfileId = formData.get('voiceProfileId') as string;
    const reason = formData.get('reason') as string;

    if (!voiceProfileId) {
      return fail(400, { message: 'Voice profile ID is required' });
    }

    await prisma.voiceProfile.update({
      where: { id: voiceProfileId },
      data: {
        status: 'rejected',
        rejectionReason: reason || 'No reason provided'
      }
    });

    return { success: true, message: 'Voice profile rejected' };
  },

  approveCampaign: async ({ request, locals }) => {
    if (!locals.user) {
      return fail(401, { message: 'Unauthorized' });
    }

    const formData = await request.formData();
    const campaignId = formData.get('campaignId') as string;

    if (!campaignId) {
      return fail(400, { message: 'Campaign ID is required' });
    }

    await prisma.campaign.update({
      where: { id: campaignId },
      data: {
        status: 'active',
        approvedBy: locals.user.id,
        approvedAt: new Date()
      }
    });

    return { success: true, message: 'Campaign approved and activated' };
  },

  rejectCampaign: async ({ request, locals }) => {
    if (!locals.user) {
      return fail(401, { message: 'Unauthorized' });
    }

    const formData = await request.formData();
    const campaignId = formData.get('campaignId') as string;

    if (!campaignId) {
      return fail(400, { message: 'Campaign ID is required' });
    }

    await prisma.campaign.update({
      where: { id: campaignId },
      data: {
        status: 'draft'
      }
    });

    return { success: true, message: 'Campaign sent back to draft' };
  },

  approveCreative: async ({ request, locals }) => {
    if (!locals.user) {
      return fail(401, { message: 'Unauthorized' });
    }

    const formData = await request.formData();
    const creativeId = formData.get('creativeId') as string;

    if (!creativeId) {
      return fail(400, { message: 'Creative ID is required' });
    }

    await prisma.campaignCreative.update({
      where: { id: creativeId },
      data: {
        status: 'approved'
      }
    });

    return { success: true, message: 'Ad copy approved' };
  },

  rejectCreative: async ({ request, locals }) => {
    if (!locals.user) {
      return fail(401, { message: 'Unauthorized' });
    }

    const formData = await request.formData();
    const creativeId = formData.get('creativeId') as string;

    if (!creativeId) {
      return fail(400, { message: 'Creative ID is required' });
    }

    await prisma.campaignCreative.update({
      where: { id: creativeId },
      data: {
        status: 'rejected'
      }
    });

    return { success: true, message: 'Ad copy rejected' };
  },

  acknowledgeAnomaly: async ({ request, locals }) => {
    if (!locals.user) {
      return fail(401, { message: 'Unauthorized' });
    }

    const formData = await request.formData();
    const anomalyId = formData.get('anomalyId') as string;

    if (!anomalyId) {
      return fail(400, { message: 'Anomaly ID is required' });
    }

    await prisma.aiAnomaly.update({
      where: { id: anomalyId },
      data: {
        acknowledgedBy: locals.user.id,
        acknowledgedAt: new Date()
      }
    });

    return { success: true, message: 'Anomaly acknowledged' };
  },

  resolveAnomaly: async ({ request, locals }) => {
    if (!locals.user) {
      return fail(401, { message: 'Unauthorized' });
    }

    const formData = await request.formData();
    const anomalyId = formData.get('anomalyId') as string;
    const notes = formData.get('notes') as string;

    if (!anomalyId) {
      return fail(400, { message: 'Anomaly ID is required' });
    }

    await prisma.aiAnomaly.update({
      where: { id: anomalyId },
      data: {
        resolvedBy: locals.user.id,
        resolvedAt: new Date(),
        resolutionNotes: notes || null
      }
    });

    return { success: true, message: 'Anomaly resolved' };
  }
};
