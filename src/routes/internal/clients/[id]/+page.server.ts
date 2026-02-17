import type { PageServerLoad, Actions } from './$types';
import { prisma } from '$lib/server/db';
import { error, fail, redirect } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ params, url }) => {
  const { id } = params;
  const activeAiTab = url.searchParams.get('aiTab') || 'voice-profile';

  // Current month date range
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

  // Last month for comparison
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);

  // Fetch organization with all related data
  const organization = await prisma.organization.findUnique({
    where: { id, deletedAt: null },
    include: {
      accountManager: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          avatarUrl: true
        }
      },
      contacts: {
        orderBy: { isPrimary: 'desc' }
      },
      territoryAssignments: {
        where: { status: 'active' },
        include: {
          territory: {
            select: {
              id: true,
              name: true,
              city: true,
              state: true,
              radiusMiles: true,
              population: true,
              medianIncome: true,
              territoryType: true
            }
          }
        }
      },
      contracts: {
        orderBy: { startDate: 'desc' },
        take: 5,
        include: {
          plan: true
        }
      },
      invoices: {
        orderBy: { issueDate: 'desc' },
        take: 5,
        select: {
          id: true,
          invoiceNumber: true,
          status: true,
          totalAmount: true,
          paidAmount: true,
          issueDate: true,
          dueDate: true
        }
      },
      campaigns: {
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: {
          _count: {
            select: {
              leads: true
            }
          }
        }
      },
      healthScoreHistory: {
        orderBy: { calculatedAt: 'desc' },
        take: 30
      },
      clientOnboarding: {
        include: {
          tasks: {
            orderBy: [{ phase: 'asc' }, { taskOrder: 'asc' }]
          }
        }
      },
      supportTickets: {
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: {
          submittedByUser: {
            select: {
              firstName: true,
              lastName: true
            }
          }
        }
      },
      communicationLogs: {
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: {
          createdByUser: {
            select: {
              firstName: true,
              lastName: true
            }
          }
        }
      },
      monthlyReviews: {
        orderBy: { scheduledDate: 'desc' },
        take: 3
      }
    }
  });

  if (!organization) {
    throw error(404, 'Client not found');
  }

  // Get lead stats
  const [
    leadsThisMonth,
    leadsLastMonth,
    totalLeads,
    leadsByStatus,
    recentLeads
  ] = await Promise.all([
    prisma.lead.count({
      where: {
        organizationId: id,
        createdAt: { gte: startOfMonth, lte: endOfMonth }
      }
    }),
    prisma.lead.count({
      where: {
        organizationId: id,
        createdAt: { gte: startOfLastMonth, lte: endOfLastMonth }
      }
    }),
    prisma.lead.count({
      where: { organizationId: id }
    }),
    prisma.lead.groupBy({
      by: ['status'],
      where: { organizationId: id },
      _count: { status: true }
    }),
    prisma.lead.findMany({
      where: { organizationId: id },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        status: true,
        temperature: true,
        score: true,
        source: true,
        createdAt: true
      }
    })
  ]);

  // Get campaign metrics
  const [currentMonthMetrics, lastMonthMetrics] = await Promise.all([
    prisma.campaignMetric.aggregate({
      where: {
        campaign: { organizationId: id },
        date: { gte: startOfMonth, lte: endOfMonth }
      },
      _sum: {
        impressions: true,
        clicks: true,
        spend: true,
        leads: true,
        conversions: true
      }
    }),
    prisma.campaignMetric.aggregate({
      where: {
        campaign: { organizationId: id },
        date: { gte: startOfLastMonth, lte: endOfLastMonth }
      },
      _sum: {
        spend: true,
        leads: true
      }
    })
  ]);

  // Calculate CPL
  const currentSpend = currentMonthMetrics._sum.spend?.toNumber() || 0;
  const currentLeads = currentMonthMetrics._sum.leads || 0;
  const lastSpend = lastMonthMetrics._sum.spend?.toNumber() || 0;
  const lastLeads = lastMonthMetrics._sum.leads || 0;

  const currentCpl = currentLeads > 0 ? currentSpend / currentLeads : 0;
  const lastCpl = lastLeads > 0 ? lastSpend / lastLeads : 0;
  const cplChange = lastCpl > 0 ? ((currentCpl - lastCpl) / lastCpl) * 100 : 0;

  // Calculate conversion rate
  const conversions = currentMonthMetrics._sum.conversions || 0;
  const conversionRate = currentLeads > 0 ? (conversions / currentLeads) * 100 : 0;

  // Health score breakdown from most recent history
  const latestHealthScore = organization.healthScoreHistory[0];

  // Get users in organization
  const teamMembers = await prisma.user.findMany({
    where: {
      organizationId: id,
      deletedAt: null
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      role: true,
      lastLoginAt: true,
      isActive: true
    },
    orderBy: { createdAt: 'asc' }
  });

  // Get voice profiles for this organization
  const voiceProfiles = await prisma.voiceProfile.findMany({
    where: {
      organizationId: id
    },
    include: {
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
    orderBy: { createdAt: 'desc' }
  });

  // Get AI-generated creatives for this organization (pending review)
  const pendingCreatives = await prisma.campaignCreative.findMany({
    where: {
      campaign: { organizationId: id },
      aiGenerated: true,
      status: { in: ['pending_review', 'draft'] }
    },
    include: {
      campaign: {
        select: {
          id: true,
          name: true,
          platform: true
        }
      },
      voiceProfile: {
        select: {
          id: true,
          name: true
        }
      }
    },
    orderBy: { createdAt: 'desc' },
    take: 10
  });

  // Get recently approved/rejected AI creatives
  const recentCreatives = await prisma.campaignCreative.findMany({
    where: {
      campaign: { organizationId: id },
      aiGenerated: true,
      status: { in: ['approved', 'rejected'] }
    },
    include: {
      campaign: {
        select: {
          id: true,
          name: true,
          platform: true
        }
      },
      voiceProfile: {
        select: {
          id: true,
          name: true
        }
      }
    },
    orderBy: { updatedAt: 'desc' },
    take: 10
  });

  // Build the response
  return {
    organization: {
      id: organization.id,
      name: organization.name,
      slug: organization.slug,
      logoUrl: organization.logoUrl,
      website: organization.website,
      phone: organization.phone,
      email: organization.email,
      address: {
        line1: organization.addressLine1,
        line2: organization.addressLine2,
        city: organization.city,
        state: organization.state,
        postalCode: organization.postalCode,
        country: organization.country
      },
      status: organization.status,
      healthScore: organization.healthScore?.toNumber() ?? 0,
      avgCaseValue: organization.avgCaseValue?.toNumber() ?? 4000,
      clientSince: organization.clientSince?.toISOString() ?? null,
      createdAt: organization.createdAt.toISOString()
    },
    accountManager: organization.accountManager ? {
      id: organization.accountManager.id,
      name: `${organization.accountManager.firstName} ${organization.accountManager.lastName}`,
      email: organization.accountManager.email,
      avatarUrl: organization.accountManager.avatarUrl
    } : null,
    contacts: organization.contacts.map(c => ({
      id: c.id,
      type: c.contactType,
      name: `${c.firstName} ${c.lastName}`,
      title: c.title,
      email: c.email,
      phone: c.phone,
      isPrimary: c.isPrimary
    })),
    territory: organization.territoryAssignments[0]?.territory ? {
      id: organization.territoryAssignments[0].territory.id,
      name: organization.territoryAssignments[0].territory.name,
      location: `${organization.territoryAssignments[0].territory.city}, ${organization.territoryAssignments[0].territory.state}`,
      radiusMiles: organization.territoryAssignments[0].territory.radiusMiles,
      population: organization.territoryAssignments[0].territory.population,
      medianIncome: organization.territoryAssignments[0].territory.medianIncome,
      type: organization.territoryAssignments[0].territory.territoryType,
      monthlyRate: organization.territoryAssignments[0]?.monthlyRate?.toNumber() ?? 0
    } : null,
    contract: organization.contracts[0] ? {
      id: organization.contracts[0].id,
      contractNumber: organization.contracts[0].contractNumber,
      status: organization.contracts[0].status,
      plan: organization.contracts[0].plan.name,
      monthlyCommitment: organization.contracts[0].monthlyCommitment.toNumber(),
      termMonths: organization.contracts[0].termMonths,
      startDate: organization.contracts[0].startDate.toISOString(),
      endDate: organization.contracts[0].endDate.toISOString(),
      autoRenew: organization.contracts[0].autoRenew
    } : null,
    metrics: {
      leadsThisMonth,
      leadsLastMonth,
      leadsTrend: leadsLastMonth > 0 ? ((leadsThisMonth - leadsLastMonth) / leadsLastMonth) * 100 : 0,
      totalLeads,
      spend: currentSpend,
      cpl: currentCpl,
      cplChange,
      conversionRate,
      conversions,
      impressions: currentMonthMetrics._sum.impressions || 0,
      clicks: currentMonthMetrics._sum.clicks || 0
    },
    leadsByStatus: leadsByStatus.map(s => ({
      status: s.status,
      count: s._count.status
    })),
    recentLeads: recentLeads.map(lead => ({
      id: lead.id,
      name: `${lead.firstName || ''} ${lead.lastName || ''}`.trim() || 'Unknown',
      email: lead.email,
      phone: lead.phone,
      status: lead.status,
      temperature: lead.temperature,
      score: lead.score,
      source: lead.source,
      createdAt: lead.createdAt.toISOString()
    })),
    campaigns: organization.campaigns.map(c => ({
      id: c.id,
      name: c.name,
      platform: c.platform,
      type: c.campaignType,
      status: c.status,
      dailyBudget: c.dailyBudget?.toNumber() ?? null,
      monthlyBudget: c.monthlyBudget?.toNumber() ?? null,
      leadCount: c._count.leads,
      startDate: c.startDate?.toISOString() ?? null,
      endDate: c.endDate?.toISOString() ?? null
    })),
    healthScoreBreakdown: latestHealthScore ? {
      overall: organization.healthScore?.toNumber() ?? 0,
      leadVolume: latestHealthScore.leadVolumeScore?.toNumber() ?? 0,
      costEfficiency: latestHealthScore.costEfficiencyScore?.toNumber() ?? 0,
      engagement: latestHealthScore.engagementScore?.toNumber() ?? 0,
      paymentHistory: latestHealthScore.paymentHistoryScore?.toNumber() ?? 0,
      contractTenure: latestHealthScore.contractTenureScore?.toNumber() ?? 0,
      calculatedAt: latestHealthScore.calculatedAt.toISOString()
    } : null,
    healthScoreHistory: organization.healthScoreHistory.map(h => ({
      score: h.score.toNumber(),
      date: h.calculatedAt.toISOString()
    })),
    onboarding: organization.clientOnboarding ? {
      id: organization.clientOnboarding.id,
      currentPhase: organization.clientOnboarding.currentPhase,
      overallProgress: organization.clientOnboarding.overallProgress,
      phase1Status: organization.clientOnboarding.phase1Status,
      phase2Status: organization.clientOnboarding.phase2Status,
      phase3Status: organization.clientOnboarding.phase3Status,
      phase4Status: organization.clientOnboarding.phase4Status,
      startedAt: organization.clientOnboarding.startedAt.toISOString(),
      completedAt: organization.clientOnboarding.completedAt?.toISOString() ?? null,
      tasks: organization.clientOnboarding.tasks.map(t => ({
        id: t.id,
        phase: t.phase,
        title: t.title,
        status: t.status,
        isRequired: t.isRequired,
        completedAt: t.completedAt?.toISOString() ?? null
      }))
    } : null,
    recentInvoices: organization.invoices.map(i => ({
      id: i.id,
      invoiceNumber: i.invoiceNumber,
      status: i.status,
      totalAmount: i.totalAmount.toNumber(),
      paidAmount: i.paidAmount.toNumber(),
      issueDate: i.issueDate.toISOString(),
      dueDate: i.dueDate.toISOString()
    })),
    supportTickets: organization.supportTickets.map(t => ({
      id: t.id,
      ticketNumber: t.ticketNumber,
      subject: t.subject,
      category: t.category,
      priority: t.priority,
      status: t.status,
      submittedBy: `${t.submittedByUser.firstName} ${t.submittedByUser.lastName}`,
      createdAt: t.createdAt.toISOString()
    })),
    communicationLog: organization.communicationLogs.map(c => ({
      id: c.id,
      type: c.entryType,
      title: c.title,
      body: c.body,
      direction: c.direction,
      createdBy: `${c.createdByUser.firstName} ${c.createdByUser.lastName}`,
      createdAt: c.createdAt.toISOString()
    })),
    monthlyReviews: organization.monthlyReviews.map(r => ({
      id: r.id,
      type: r.reviewType,
      scheduledDate: r.scheduledDate.toISOString(),
      status: r.status,
      meetingLink: r.meetingLink
    })),
    teamMembers: teamMembers.map(u => ({
      id: u.id,
      name: `${u.firstName} ${u.lastName}`,
      email: u.email,
      role: u.role,
      lastLoginAt: u.lastLoginAt?.toISOString() ?? null,
      isActive: u.isActive
    })),
    // AI-related data
    activeAiTab,
    voiceProfiles: voiceProfiles.map(v => ({
      id: v.id,
      name: v.name,
      status: v.status,
      qualityScore: v.qualityScore?.toNumber() ?? null,
      tone: v.tone,
      personality: v.personality,
      formalityLevel: v.formalityLevel,
      targetAudience: v.targetAudience,
      keyDifferentiators: v.keyDifferentiators as string[] | null,
      avoidTerms: v.avoidTerms as string[] | null,
      preferredTerms: v.preferredTerms as string[] | null,
      sampleHeadlines: v.sampleHeadlines as string[] | null,
      sampleAdCopy: v.sampleAdCopy as string[] | null,
      sampleCtas: v.sampleCtas as string[] | null,
      analysisStartedAt: v.analysisStartedAt?.toISOString() ?? null,
      analysisCompletedAt: v.analysisCompletedAt?.toISOString() ?? null,
      approvedAt: v.approvedAt?.toISOString() ?? null,
      approvedBy: v.approvedByUser ? `${v.approvedByUser.firstName} ${v.approvedByUser.lastName}` : null,
      rejectionReason: v.rejectionReason,
      sources: v.sources.map(s => ({
        id: s.id,
        sourceType: s.sourceType,
        sourceUrl: s.sourceUrl,
        fileName: s.fileName,
        processedAt: s.processedAt?.toISOString() ?? null
      })),
      createdAt: v.createdAt.toISOString(),
      updatedAt: v.updatedAt.toISOString()
    })),
    pendingCreatives: pendingCreatives.map(c => ({
      id: c.id,
      creativeType: c.creativeType,
      headline: c.headline,
      body: c.body,
      ctaText: c.ctaText,
      ctaUrl: c.ctaUrl,
      status: c.status,
      aiGenerated: c.aiGenerated,
      performanceScore: c.performanceScore?.toNumber() ?? null,
      campaign: {
        id: c.campaign.id,
        name: c.campaign.name,
        platform: c.campaign.platform
      },
      voiceProfile: c.voiceProfile ? {
        id: c.voiceProfile.id,
        name: c.voiceProfile.name
      } : null,
      createdAt: c.createdAt.toISOString()
    })),
    recentCreatives: recentCreatives.map(c => ({
      id: c.id,
      creativeType: c.creativeType,
      headline: c.headline,
      body: c.body,
      ctaText: c.ctaText,
      status: c.status,
      aiGenerated: c.aiGenerated,
      campaign: {
        id: c.campaign.id,
        name: c.campaign.name,
        platform: c.campaign.platform
      },
      voiceProfile: c.voiceProfile ? {
        id: c.voiceProfile.id,
        name: c.voiceProfile.name
      } : null,
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString()
    }))
  };
};

export const actions: Actions = {
  addCommunicationLog: async ({ params, request, locals }) => {
    if (!locals.user) {
      return fail(401, { error: 'Not authenticated' });
    }

    const formData = await request.formData();
    const entryType = formData.get('entryType') as string;
    const title = formData.get('title') as string;
    const body = formData.get('body') as string;
    const direction = formData.get('direction') as string;

    if (!entryType || !title) {
      return fail(400, { error: 'Entry type and title are required' });
    }

    try {
      await prisma.communicationLog.create({
        data: {
          organizationId: params.id,
          entryType: entryType as any,
          title,
          body: body || null,
          direction: direction as any || null,
          createdBy: locals.user.id
        }
      });

      return { success: true };
    } catch (err) {
      console.error('Failed to add communication log:', err);
      return fail(500, { error: 'Failed to add communication log' });
    }
  },

  scheduleReview: async ({ params, request, locals }) => {
    if (!locals.user) {
      return fail(401, { error: 'Not authenticated' });
    }

    const formData = await request.formData();
    const reviewType = formData.get('reviewType') as string;
    const scheduledDate = formData.get('scheduledDate') as string;
    const meetingLink = formData.get('meetingLink') as string;

    if (!reviewType || !scheduledDate) {
      return fail(400, { error: 'Review type and date are required' });
    }

    try {
      await prisma.monthlyReview.create({
        data: {
          organizationId: params.id,
          reviewType: reviewType as any,
          scheduledDate: new Date(scheduledDate),
          meetingLink: meetingLink || null,
          conductedBy: locals.user.id
        }
      });

      return { success: true };
    } catch (err) {
      console.error('Failed to schedule review:', err);
      return fail(500, { error: 'Failed to schedule review' });
    }
  },

  updateStatus: async ({ params, request }) => {
    const formData = await request.formData();
    const newStatus = formData.get('status') as string;

    if (!newStatus) {
      return fail(400, { error: 'Status is required' });
    }

    try {
      await prisma.organization.update({
        where: { id: params.id },
        data: { status: newStatus as any }
      });

      return { success: true };
    } catch (err) {
      console.error('Failed to update status:', err);
      return fail(500, { error: 'Failed to update status' });
    }
  },

  pauseCampaigns: async ({ params }) => {
    try {
      await prisma.campaign.updateMany({
        where: {
          organizationId: params.id,
          status: 'active'
        },
        data: { status: 'paused' }
      });

      return { success: true };
    } catch (err) {
      console.error('Failed to pause campaigns:', err);
      return fail(500, { error: 'Failed to pause campaigns' });
    }
  },

  // Voice Profile Actions
  createVoiceProfile: async ({ params, request, locals }) => {
    if (!locals.user) {
      return fail(401, { error: 'Not authenticated' });
    }

    const formData = await request.formData();
    const websiteUrl = formData.get('websiteUrl') as string;
    const profileName = formData.get('profileName') as string || 'Primary';

    if (!websiteUrl) {
      return fail(400, { error: 'Website URL is required' });
    }

    try {
      // Create voice profile with website source
      const voiceProfile = await prisma.voiceProfile.create({
        data: {
          organizationId: params.id,
          name: profileName,
          status: 'pending',
          sources: {
            create: {
              sourceType: 'website',
              sourceUrl: websiteUrl
            }
          }
        }
      });

      return { success: true, voiceProfileId: voiceProfile.id };
    } catch (err) {
      console.error('Failed to create voice profile:', err);
      return fail(500, { error: 'Failed to create voice profile' });
    }
  },

  addVoiceSource: async ({ request, locals }) => {
    if (!locals.user) {
      return fail(401, { error: 'Not authenticated' });
    }

    const formData = await request.formData();
    const voiceProfileId = formData.get('voiceProfileId') as string;
    const sourceType = formData.get('sourceType') as string;
    const sourceUrl = formData.get('sourceUrl') as string;
    const sourceText = formData.get('sourceText') as string;

    if (!voiceProfileId || !sourceType) {
      return fail(400, { error: 'Voice profile ID and source type are required' });
    }

    try {
      await prisma.voiceProfileSource.create({
        data: {
          voiceProfileId,
          sourceType: sourceType as any,
          sourceUrl: sourceUrl || null,
          contentExtracted: sourceText || null
        }
      });

      return { success: true };
    } catch (err) {
      console.error('Failed to add voice source:', err);
      return fail(500, { error: 'Failed to add voice source' });
    }
  },

  startVoiceAnalysis: async ({ request, locals }) => {
    if (!locals.user) {
      return fail(401, { error: 'Not authenticated' });
    }

    const formData = await request.formData();
    const voiceProfileId = formData.get('voiceProfileId') as string;

    if (!voiceProfileId) {
      return fail(400, { error: 'Voice profile ID is required' });
    }

    try {
      await prisma.voiceProfile.update({
        where: { id: voiceProfileId },
        data: {
          status: 'analyzing',
          analysisStartedAt: new Date()
        }
      });

      // TODO: Trigger actual AI analysis here
      // For now, we just update the status

      return { success: true };
    } catch (err) {
      console.error('Failed to start voice analysis:', err);
      return fail(500, { error: 'Failed to start voice analysis' });
    }
  },

  completeVoiceAnalysis: async ({ request, locals }) => {
    if (!locals.user) {
      return fail(401, { error: 'Not authenticated' });
    }

    const formData = await request.formData();
    const voiceProfileId = formData.get('voiceProfileId') as string;
    const tone = formData.get('tone') as string;
    const personality = formData.get('personality') as string;
    const formalityLevel = formData.get('formalityLevel') as string;
    const targetAudience = formData.get('targetAudience') as string;

    if (!voiceProfileId) {
      return fail(400, { error: 'Voice profile ID is required' });
    }

    try {
      await prisma.voiceProfile.update({
        where: { id: voiceProfileId },
        data: {
          status: 'in_review',
          analysisCompletedAt: new Date(),
          tone: tone || null,
          personality: personality || null,
          formalityLevel: formalityLevel as any || null,
          targetAudience: targetAudience || null,
          qualityScore: 75 // Placeholder score
        }
      });

      return { success: true };
    } catch (err) {
      console.error('Failed to complete voice analysis:', err);
      return fail(500, { error: 'Failed to complete voice analysis' });
    }
  },

  approveVoiceProfile: async ({ request, locals }) => {
    if (!locals.user) {
      return fail(401, { error: 'Not authenticated' });
    }

    const formData = await request.formData();
    const voiceProfileId = formData.get('voiceProfileId') as string;

    if (!voiceProfileId) {
      return fail(400, { error: 'Voice profile ID is required' });
    }

    try {
      await prisma.voiceProfile.update({
        where: { id: voiceProfileId },
        data: {
          status: 'approved',
          approvedBy: locals.user.id,
          approvedAt: new Date()
        }
      });

      return { success: true };
    } catch (err) {
      console.error('Failed to approve voice profile:', err);
      return fail(500, { error: 'Failed to approve voice profile' });
    }
  },

  rejectVoiceProfile: async ({ request, locals }) => {
    if (!locals.user) {
      return fail(401, { error: 'Not authenticated' });
    }

    const formData = await request.formData();
    const voiceProfileId = formData.get('voiceProfileId') as string;
    const reason = formData.get('reason') as string;

    if (!voiceProfileId) {
      return fail(400, { error: 'Voice profile ID is required' });
    }

    try {
      await prisma.voiceProfile.update({
        where: { id: voiceProfileId },
        data: {
          status: 'rejected',
          rejectionReason: reason || 'No reason provided'
        }
      });

      return { success: true };
    } catch (err) {
      console.error('Failed to reject voice profile:', err);
      return fail(500, { error: 'Failed to reject voice profile' });
    }
  },

  updateVoiceProfile: async ({ request, locals }) => {
    if (!locals.user) {
      return fail(401, { error: 'Not authenticated' });
    }

    const formData = await request.formData();
    const voiceProfileId = formData.get('voiceProfileId') as string;
    const tone = formData.get('tone') as string;
    const personality = formData.get('personality') as string;
    const formalityLevel = formData.get('formalityLevel') as string;
    const targetAudience = formData.get('targetAudience') as string;

    if (!voiceProfileId) {
      return fail(400, { error: 'Voice profile ID is required' });
    }

    try {
      await prisma.voiceProfile.update({
        where: { id: voiceProfileId },
        data: {
          tone: tone || undefined,
          personality: personality || undefined,
          formalityLevel: formalityLevel as any || undefined,
          targetAudience: targetAudience || undefined
        }
      });

      return { success: true };
    } catch (err) {
      console.error('Failed to update voice profile:', err);
      return fail(500, { error: 'Failed to update voice profile' });
    }
  },

  // AI Content Generation Actions
  generateAdCopy: async ({ params, request, locals }) => {
    if (!locals.user) {
      return fail(401, { error: 'Not authenticated' });
    }

    const formData = await request.formData();
    const campaignId = formData.get('campaignId') as string;
    const voiceProfileId = formData.get('voiceProfileId') as string;
    const creativeType = formData.get('creativeType') as string || 'text_ad';
    const topic = formData.get('topic') as string;

    if (!campaignId || !voiceProfileId) {
      return fail(400, { error: 'Campaign ID and Voice Profile ID are required' });
    }

    try {
      // Create a placeholder creative - in production this would call AI API
      const creative = await prisma.campaignCreative.create({
        data: {
          campaignId,
          creativeType: creativeType as any,
          voiceProfileId,
          aiGenerated: true,
          status: 'pending_review',
          headline: `AI Generated Headline for ${topic || 'dental implants'}`,
          body: `This is placeholder AI-generated ad copy. In production, this would be generated by Claude/OpenAI using the voice profile settings.`,
          ctaText: 'Learn More'
        }
      });

      return { success: true, creativeId: creative.id };
    } catch (err) {
      console.error('Failed to generate ad copy:', err);
      return fail(500, { error: 'Failed to generate ad copy' });
    }
  },

  generateBulkCreatives: async ({ params, request, locals }) => {
    if (!locals.user) {
      return fail(401, { error: 'Not authenticated' });
    }

    const formData = await request.formData();
    const campaignId = formData.get('campaignId') as string;
    const voiceProfileId = formData.get('voiceProfileId') as string;
    const count = parseInt(formData.get('count') as string) || 3;

    if (!campaignId || !voiceProfileId) {
      return fail(400, { error: 'Campaign ID and Voice Profile ID are required' });
    }

    try {
      // Create multiple placeholder creatives
      const creativesToCreate = [];
      for (let i = 0; i < count; i++) {
        creativesToCreate.push({
          campaignId,
          creativeType: 'text_ad' as const,
          voiceProfileId,
          aiGenerated: true,
          status: 'pending_review' as const,
          headline: `AI Generated Headline Variation ${i + 1}`,
          body: `This is placeholder AI-generated ad copy variation ${i + 1}. In production, this would be generated by Claude/OpenAI.`,
          ctaText: ['Learn More', 'Get Started', 'Book Now'][i % 3]
        });
      }

      await prisma.campaignCreative.createMany({
        data: creativesToCreate
      });

      return { success: true, count };
    } catch (err) {
      console.error('Failed to generate bulk creatives:', err);
      return fail(500, { error: 'Failed to generate bulk creatives' });
    }
  },

  approveCreative: async ({ request, locals }) => {
    if (!locals.user) {
      return fail(401, { error: 'Not authenticated' });
    }

    const formData = await request.formData();
    const creativeId = formData.get('creativeId') as string;

    if (!creativeId) {
      return fail(400, { error: 'Creative ID is required' });
    }

    try {
      await prisma.campaignCreative.update({
        where: { id: creativeId },
        data: { status: 'approved' }
      });

      return { success: true };
    } catch (err) {
      console.error('Failed to approve creative:', err);
      return fail(500, { error: 'Failed to approve creative' });
    }
  },

  rejectCreative: async ({ request, locals }) => {
    if (!locals.user) {
      return fail(401, { error: 'Not authenticated' });
    }

    const formData = await request.formData();
    const creativeId = formData.get('creativeId') as string;

    if (!creativeId) {
      return fail(400, { error: 'Creative ID is required' });
    }

    try {
      await prisma.campaignCreative.update({
        where: { id: creativeId },
        data: { status: 'rejected' }
      });

      return { success: true };
    } catch (err) {
      console.error('Failed to reject creative:', err);
      return fail(500, { error: 'Failed to reject creative' });
    }
  },

  editCreative: async ({ request, locals }) => {
    if (!locals.user) {
      return fail(401, { error: 'Not authenticated' });
    }

    const formData = await request.formData();
    const creativeId = formData.get('creativeId') as string;
    const headline = formData.get('headline') as string;
    const body = formData.get('body') as string;
    const ctaText = formData.get('ctaText') as string;

    if (!creativeId) {
      return fail(400, { error: 'Creative ID is required' });
    }

    try {
      await prisma.campaignCreative.update({
        where: { id: creativeId },
        data: {
          headline: headline || undefined,
          body: body || undefined,
          ctaText: ctaText || undefined
        }
      });

      return { success: true };
    } catch (err) {
      console.error('Failed to edit creative:', err);
      return fail(500, { error: 'Failed to edit creative' });
    }
  }
};
