import type { PageServerLoad, Actions } from './$types';
import { prisma } from '$lib/server/db';
import { error, fail, redirect } from '@sveltejs/kit';
import { hash } from '@node-rs/argon2';
import { scrapeWebsite, scrapeMultipleSources, type ScrapedContent } from '$lib/server/ai/scraper';
import { analyzeVoice, analyzeMultipleSources, prepareContentForAnalysis, type ToneType } from '$lib/server/ai/voice-analyzer';
import { generateVoiceProfile, generateInitialContent, type VoiceProfile } from '$lib/server/ai/voice-generator';
import { AdCopyGenerator } from '$lib/server/ai/ad-generator';
import { generateAdCopy as generateContentAdCopy, generateHeadlines, generateCTAs } from '$lib/server/ai/content-generator';
import type { BrandVoiceProfile, TerritoryInfo, AdPlatform } from '$lib/server/ai/types';

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
      // Get the voice profile with its sources
      const voiceProfile = await prisma.voiceProfile.findUnique({
        where: { id: voiceProfileId },
        include: {
          sources: true,
          organization: {
            select: {
              id: true,
              name: true,
              website: true
            }
          }
        }
      });

      if (!voiceProfile) {
        return fail(404, { error: 'Voice profile not found' });
      }

      // Update status to analyzing
      await prisma.voiceProfile.update({
        where: { id: voiceProfileId },
        data: {
          status: 'analyzing',
          analysisStartedAt: new Date()
        }
      });

      // Collect all URLs to scrape from sources
      const sourcesToScrape: Array<{
        url: string;
        sourceId: string;
      }> = [];

      for (const source of voiceProfile.sources) {
        if (source.sourceUrl) {
          sourcesToScrape.push({
            url: source.sourceUrl,
            sourceId: source.id
          });
        }
      }

      // Also include organization website if available and not already in sources
      if (voiceProfile.organization.website) {
        const websiteUrl = voiceProfile.organization.website;
        const alreadyIncluded = sourcesToScrape.some(s => s.url === websiteUrl);
        if (!alreadyIncluded) {
          sourcesToScrape.push({
            url: websiteUrl,
            sourceId: 'organization'
          });
        }
      }

      if (sourcesToScrape.length === 0) {
        await prisma.voiceProfile.update({
          where: { id: voiceProfileId },
          data: {
            status: 'pending',
            analysisStartedAt: null
          }
        });
        return fail(400, { error: 'No URLs available to analyze. Please add at least one source URL.' });
      }

      // Scrape all sources
      const scrapedResults: ScrapedContent[] = [];
      const scrapeErrors: string[] = [];

      for (const source of sourcesToScrape) {
        try {
          const result = await scrapeWebsite(source.url);
          if (result.success) {
            scrapedResults.push(result);

            // Update the source with extracted content
            if (source.sourceId !== 'organization') {
              await prisma.voiceProfileSource.update({
                where: { id: source.sourceId },
                data: {
                  contentExtracted: result.content.substring(0, 10000), // Limit stored content
                  processedAt: new Date()
                }
              });
            }
          } else {
            scrapeErrors.push(`${source.url}: ${result.error?.message || 'Unknown error'}`);
          }
        } catch (scrapeErr) {
          console.error(`Failed to scrape ${source.url}:`, scrapeErr);
          scrapeErrors.push(`${source.url}: ${scrapeErr instanceof Error ? scrapeErr.message : 'Scrape failed'}`);
        }
      }

      if (scrapedResults.length === 0) {
        await prisma.voiceProfile.update({
          where: { id: voiceProfileId },
          data: {
            status: 'pending',
            analysisStartedAt: null
          }
        });
        return fail(500, {
          error: `Failed to scrape any content. Errors: ${scrapeErrors.join('; ')}`
        });
      }

      // Analyze the scraped content
      const analysisResult = await analyzeMultipleSources(scrapedResults);

      if (!analysisResult.success || !analysisResult.analysis) {
        await prisma.voiceProfile.update({
          where: { id: voiceProfileId },
          data: {
            status: 'pending',
            analysisStartedAt: null
          }
        });
        return fail(500, {
          error: `Voice analysis failed: ${analysisResult.error?.message || 'Unknown error'}`
        });
      }

      const analysis = analysisResult.analysis;

      // Generate sample content based on the analysis
      const contentResult = await generateInitialContent(analysis);
      const sampleContent = contentResult.success && contentResult.content ? contentResult.content : null;

      // Update the voice profile with analysis results
      await prisma.voiceProfile.update({
        where: { id: voiceProfileId },
        data: {
          status: 'in_review',
          analysisCompletedAt: new Date(),
          tone: analysis.tone,
          personality: analysis.personality,
          formalityLevel: analysis.formalityLevel,
          targetAudience: analysis.targetAudience,
          keyDifferentiators: analysis.keyDifferentiators,
          preferredTerms: analysis.preferredTerms,
          avoidTerms: analysis.avoidTerms,
          sampleHeadlines: sampleContent?.headlines || analysis.keyPhrases,
          sampleAdCopy: sampleContent?.adCopy || [],
          sampleCtas: sampleContent?.ctas || [],
          qualityScore: analysis.qualityScore
        }
      });

      return {
        success: true,
        message: `Analysis complete. Scraped ${scrapedResults.length} source(s).${scrapeErrors.length > 0 ? ` ${scrapeErrors.length} source(s) failed.` : ''}`
      };
    } catch (err) {
      console.error('Failed to start voice analysis:', err);

      // Reset status on error
      try {
        await prisma.voiceProfile.update({
          where: { id: voiceProfileId },
          data: {
            status: 'pending',
            analysisStartedAt: null
          }
        });
      } catch (resetErr) {
        console.error('Failed to reset voice profile status:', resetErr);
      }

      return fail(500, { error: 'Failed to complete voice analysis' });
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
    const regenerateSamples = formData.get('regenerateSamples') === 'true';

    if (!voiceProfileId) {
      return fail(400, { error: 'Voice profile ID is required' });
    }

    try {
      // Build the update data
      const updateData: Record<string, unknown> = {
        status: 'in_review',
        analysisCompletedAt: new Date(),
        tone: tone || null,
        personality: personality || null,
        formalityLevel: formalityLevel as 'formal' | 'professional' | 'casual' | 'friendly' | null || null,
        targetAudience: targetAudience || null
      };

      // Optionally regenerate sample content based on the manual input
      if (regenerateSamples && tone && personality) {
        try {
          // Create a minimal analysis object for content generation
          const manualAnalysis = {
            tone: tone,
            tones: ['professional'] as ToneType[],
            personality: personality,
            formalityLevel: (formalityLevel as 'formal' | 'professional' | 'casual' | 'friendly') || 'professional',
            targetAudience: targetAudience || 'Adults seeking dental care',
            voiceCharacteristics: {
              empathy: 0.7,
              authority: 0.7,
              warmth: 0.7,
              urgency: 0.3,
              technicality: 0.4,
              confidence: 0.8
            },
            communicationStyle: 'Clear and professional communication',
            keyDifferentiators: [] as string[],
            preferredTerms: [] as string[],
            avoidTerms: [] as string[],
            keyPhrases: [] as string[],
            emotionalTriggers: [] as string[],
            valuePropositions: [] as string[],
            qualityScore: 70,
            analysisNotes: 'Manually configured voice profile'
          };

          const contentResult = await generateInitialContent(manualAnalysis);
          if (contentResult.success && contentResult.content) {
            updateData.sampleHeadlines = contentResult.content.headlines;
            updateData.sampleAdCopy = contentResult.content.adCopy;
            updateData.sampleCtas = contentResult.content.ctas;
          }
        } catch (genErr) {
          console.error('Failed to regenerate sample content:', genErr);
          // Continue with update even if sample generation fails
        }
      }

      // Set a quality score (lower for manual entries since they lack full AI analysis)
      updateData.qualityScore = 70;

      await prisma.voiceProfile.update({
        where: { id: voiceProfileId },
        data: updateData
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
    const platform = (formData.get('platform') as string) || 'facebook';
    const variantCount = parseInt(formData.get('variantCount') as string) || 1;

    if (!campaignId || !voiceProfileId) {
      return fail(400, { error: 'Campaign ID and Voice Profile ID are required' });
    }

    try {
      // Get the approved voice profile
      const voiceProfile = await prisma.voiceProfile.findUnique({
        where: { id: voiceProfileId },
        include: {
          organization: {
            include: {
              territoryAssignments: {
                where: { status: 'active' },
                include: {
                  territory: true
                },
                take: 1
              }
            }
          }
        }
      });

      if (!voiceProfile) {
        return fail(404, { error: 'Voice profile not found' });
      }

      if (voiceProfile.status !== 'approved') {
        return fail(400, { error: 'Voice profile must be approved before generating content' });
      }

      // Get territory info for context
      const territory = voiceProfile.organization.territoryAssignments[0]?.territory;
      const territoryInfo: TerritoryInfo = {
        id: territory?.id || '',
        name: territory?.name || '',
        city: territory?.city || voiceProfile.organization.city || 'Your City',
        state: territory?.state || voiceProfile.organization.state || 'ST',
        radiusMiles: territory?.radiusMiles || 25,
        population: territory?.population || undefined,
        medianIncome: territory?.medianIncome || undefined
      };

      // Convert database voice profile to BrandVoiceProfile type for AI generator
      const brandVoiceProfile: BrandVoiceProfile = {
        id: voiceProfile.id,
        organizationId: voiceProfile.organizationId,
        name: voiceProfile.name,
        status: voiceProfile.status,
        tone: voiceProfile.tone,
        personality: voiceProfile.personality,
        formalityLevel: voiceProfile.formalityLevel as BrandVoiceProfile['formalityLevel'],
        targetAudience: voiceProfile.targetAudience,
        keyDifferentiators: voiceProfile.keyDifferentiators as string[] | null,
        avoidTerms: voiceProfile.avoidTerms as string[] | null,
        preferredTerms: voiceProfile.preferredTerms as string[] | null,
        sampleHeadlines: voiceProfile.sampleHeadlines as string[] | null,
        sampleAdCopy: voiceProfile.sampleAdCopy as string[] | null,
        sampleCtas: voiceProfile.sampleCtas as string[] | null,
        qualityScore: voiceProfile.qualityScore?.toNumber() || null
      };

      // Generate ad copy using the AI service
      const adGenerator = new AdCopyGenerator();
      const result = await adGenerator.generateAdCopy({
        platform: platform as AdPlatform,
        campaignType: 'lead_gen',
        voiceProfile: brandVoiceProfile,
        targetAudience: {},
        territory: territoryInfo,
        variantCount
      });

      // Create CampaignCreative records for each generated variant
      const createdCreatives: string[] = [];

      for (const variant of result.variants) {
        // Extract content based on platform type
        let headline: string | null = null;
        let body: string | null = null;
        let ctaText: string | null = null;

        if ('primaryText' in variant.content) {
          // Facebook/Instagram ad format
          headline = variant.content.headline;
          body = variant.content.primaryText;
          ctaText = variant.content.callToAction;
        } else if ('headlines' in variant.content) {
          // Google ad format - combine headlines and descriptions
          headline = variant.content.headlines.slice(0, 3).join(' | ');
          body = variant.content.descriptions.join(' ');
          ctaText = 'Learn More';
        }

        const creative = await prisma.campaignCreative.create({
          data: {
            campaignId,
            creativeType: creativeType as any,
            voiceProfileId,
            aiGenerated: true,
            status: 'pending_review',
            headline,
            body,
            ctaText,
            performanceScore: variant.predictedScore
          }
        });

        createdCreatives.push(creative.id);
      }

      return {
        success: true,
        creativeIds: createdCreatives,
        voiceConsistencyScore: result.voiceConsistencyScore,
        recommendations: result.recommendations
      };
    } catch (err) {
      console.error('Failed to generate ad copy:', err);
      return fail(500, { error: 'Failed to generate ad copy. Please try again.' });
    }
  },

  generateBulkCreatives: async ({ params, request, locals }) => {
    if (!locals.user) {
      return fail(401, { error: 'Not authenticated' });
    }

    const formData = await request.formData();
    const campaignId = formData.get('campaignId') as string;
    const voiceProfileId = formData.get('voiceProfileId') as string;
    const count = parseInt(formData.get('count') as string) || 5;
    const platform = (formData.get('platform') as string) || 'facebook';
    const context = formData.get('context') as string;

    if (!campaignId || !voiceProfileId) {
      return fail(400, { error: 'Campaign ID and Voice Profile ID are required' });
    }

    try {
      // Get the approved voice profile
      const voiceProfile = await prisma.voiceProfile.findUnique({
        where: { id: voiceProfileId },
        include: {
          organization: {
            include: {
              territoryAssignments: {
                where: { status: 'active' },
                include: {
                  territory: true
                },
                take: 1
              }
            }
          }
        }
      });

      if (!voiceProfile) {
        return fail(404, { error: 'Voice profile not found' });
      }

      if (voiceProfile.status !== 'approved') {
        return fail(400, { error: 'Voice profile must be approved before generating content' });
      }

      // Get territory info for context
      const territory = voiceProfile.organization.territoryAssignments[0]?.territory;
      const territoryInfo: TerritoryInfo = {
        id: territory?.id || '',
        name: territory?.name || '',
        city: territory?.city || voiceProfile.organization.city || 'Your City',
        state: territory?.state || voiceProfile.organization.state || 'ST',
        radiusMiles: territory?.radiusMiles || 25,
        population: territory?.population || undefined,
        medianIncome: territory?.medianIncome || undefined
      };

      // Convert database voice profile to BrandVoiceProfile type for AI generator
      const brandVoiceProfile: BrandVoiceProfile = {
        id: voiceProfile.id,
        organizationId: voiceProfile.organizationId,
        name: voiceProfile.name,
        status: voiceProfile.status,
        tone: voiceProfile.tone,
        personality: voiceProfile.personality,
        formalityLevel: voiceProfile.formalityLevel as BrandVoiceProfile['formalityLevel'],
        targetAudience: voiceProfile.targetAudience,
        keyDifferentiators: voiceProfile.keyDifferentiators as string[] | null,
        avoidTerms: voiceProfile.avoidTerms as string[] | null,
        preferredTerms: voiceProfile.preferredTerms as string[] | null,
        sampleHeadlines: voiceProfile.sampleHeadlines as string[] | null,
        sampleAdCopy: voiceProfile.sampleAdCopy as string[] | null,
        sampleCtas: voiceProfile.sampleCtas as string[] | null,
        qualityScore: voiceProfile.qualityScore?.toNumber() || null
      };

      // Generate multiple variants using the AI service
      const adGenerator = new AdCopyGenerator();
      const result = await adGenerator.generateAdCopy({
        platform: platform as AdPlatform,
        campaignType: 'lead_gen',
        voiceProfile: brandVoiceProfile,
        targetAudience: {},
        territory: territoryInfo,
        variantCount: count
      });

      // Create CampaignCreative records for each generated variant
      const createdCreatives: string[] = [];

      for (const variant of result.variants) {
        // Extract content based on platform type
        let headline: string | null = null;
        let body: string | null = null;
        let ctaText: string | null = null;

        if ('primaryText' in variant.content) {
          // Facebook/Instagram ad format
          headline = variant.content.headline;
          body = variant.content.primaryText;
          ctaText = variant.content.callToAction;
        } else if ('headlines' in variant.content) {
          // Google ad format - combine headlines and descriptions
          headline = variant.content.headlines.slice(0, 3).join(' | ');
          body = variant.content.descriptions.join(' ');
          ctaText = 'Learn More';
        }

        const creative = await prisma.campaignCreative.create({
          data: {
            campaignId,
            creativeType: 'text',
            voiceProfileId,
            aiGenerated: true,
            status: 'pending_review',
            headline,
            body,
            ctaText,
            performanceScore: variant.predictedScore
          }
        });

        createdCreatives.push(creative.id);
      }

      return {
        success: true,
        count: createdCreatives.length,
        creativeIds: createdCreatives,
        voiceConsistencyScore: result.voiceConsistencyScore,
        recommendations: result.recommendations
      };
    } catch (err) {
      console.error('Failed to generate bulk creatives:', err);
      return fail(500, { error: 'Failed to generate bulk creatives. Please try again.' });
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
  },

  // Bulk Creative Actions
  approveBulkCreatives: async ({ request, locals }) => {
    if (!locals.user) {
      return fail(401, { error: 'Not authenticated' });
    }

    const formData = await request.formData();
    const creativeIdsJson = formData.get('creativeIds') as string;

    if (!creativeIdsJson) {
      return fail(400, { error: 'Creative IDs are required' });
    }

    try {
      const creativeIds = JSON.parse(creativeIdsJson) as string[];

      if (!Array.isArray(creativeIds) || creativeIds.length === 0) {
        return fail(400, { error: 'At least one creative ID is required' });
      }

      const result = await prisma.campaignCreative.updateMany({
        where: {
          id: { in: creativeIds },
          status: { in: ['pending_review', 'draft'] }
        },
        data: { status: 'approved' }
      });

      return { success: true, approvedCount: result.count };
    } catch (err) {
      console.error('Failed to approve bulk creatives:', err);
      return fail(500, { error: 'Failed to approve creatives' });
    }
  },

  rejectBulkCreatives: async ({ request, locals }) => {
    if (!locals.user) {
      return fail(401, { error: 'Not authenticated' });
    }

    const formData = await request.formData();
    const creativeIdsJson = formData.get('creativeIds') as string;
    const reason = formData.get('reason') as string;

    if (!creativeIdsJson) {
      return fail(400, { error: 'Creative IDs are required' });
    }

    try {
      const creativeIds = JSON.parse(creativeIdsJson) as string[];

      if (!Array.isArray(creativeIds) || creativeIds.length === 0) {
        return fail(400, { error: 'At least one creative ID is required' });
      }

      const result = await prisma.campaignCreative.updateMany({
        where: {
          id: { in: creativeIds },
          status: { in: ['pending_review', 'draft'] }
        },
        data: { status: 'rejected' }
      });

      return { success: true, rejectedCount: result.count, reason: reason || undefined };
    } catch (err) {
      console.error('Failed to reject bulk creatives:', err);
      return fail(500, { error: 'Failed to reject creatives' });
    }
  },

  regenerateCreative: async ({ request, locals }) => {
    if (!locals.user) {
      return fail(401, { error: 'Not authenticated' });
    }

    const formData = await request.formData();
    const creativeId = formData.get('creativeId') as string;

    if (!creativeId) {
      return fail(400, { error: 'Creative ID is required' });
    }

    try {
      // Get the existing creative to copy its settings
      const existingCreative = await prisma.campaignCreative.findUnique({
        where: { id: creativeId },
        include: {
          campaign: {
            include: {
              organization: {
                include: {
                  territoryAssignments: {
                    where: { status: 'active' },
                    include: {
                      territory: true
                    },
                    take: 1
                  }
                }
              }
            }
          },
          voiceProfile: true
        }
      });

      if (!existingCreative) {
        return fail(404, { error: 'Creative not found' });
      }

      if (!existingCreative.voiceProfile) {
        return fail(400, { error: 'Cannot regenerate: no voice profile associated with this creative' });
      }

      const voiceProfile = existingCreative.voiceProfile;
      const organization = existingCreative.campaign.organization;

      // Get territory info for context
      const territory = organization.territoryAssignments[0]?.territory;
      const territoryInfo: TerritoryInfo = {
        id: territory?.id || '',
        name: territory?.name || '',
        city: territory?.city || organization.city || 'Your City',
        state: territory?.state || organization.state || 'ST',
        radiusMiles: territory?.radiusMiles || 25,
        population: territory?.population || undefined,
        medianIncome: territory?.medianIncome || undefined
      };

      // Convert database voice profile to BrandVoiceProfile type
      const brandVoiceProfile: BrandVoiceProfile = {
        id: voiceProfile.id,
        organizationId: voiceProfile.organizationId,
        name: voiceProfile.name,
        status: voiceProfile.status,
        tone: voiceProfile.tone,
        personality: voiceProfile.personality,
        formalityLevel: voiceProfile.formalityLevel as BrandVoiceProfile['formalityLevel'],
        targetAudience: voiceProfile.targetAudience,
        keyDifferentiators: voiceProfile.keyDifferentiators as string[] | null,
        avoidTerms: voiceProfile.avoidTerms as string[] | null,
        preferredTerms: voiceProfile.preferredTerms as string[] | null,
        sampleHeadlines: voiceProfile.sampleHeadlines as string[] | null,
        sampleAdCopy: voiceProfile.sampleAdCopy as string[] | null,
        sampleCtas: voiceProfile.sampleCtas as string[] | null,
        qualityScore: voiceProfile.qualityScore?.toNumber() || null
      };

      // Determine platform from campaign
      const platform = (existingCreative.campaign.platform?.toLowerCase() || 'facebook') as AdPlatform;

      // Generate a new variant
      const adGenerator = new AdCopyGenerator();
      const result = await adGenerator.generateAdCopy({
        platform,
        campaignType: 'lead_gen',
        voiceProfile: brandVoiceProfile,
        targetAudience: {},
        territory: territoryInfo,
        variantCount: 1
      });

      if (result.variants.length === 0) {
        return fail(500, { error: 'No content generated' });
      }

      const variant = result.variants[0];

      // Extract content based on platform type
      let headline: string | null = null;
      let body: string | null = null;
      let ctaText: string | null = null;

      if ('primaryText' in variant.content) {
        headline = variant.content.headline;
        body = variant.content.primaryText;
        ctaText = variant.content.callToAction;
      } else if ('headlines' in variant.content) {
        headline = variant.content.headlines.slice(0, 3).join(' | ');
        body = variant.content.descriptions.join(' ');
        ctaText = 'Learn More';
      }

      // Create a new creative record (keeping the old one for reference)
      const newCreative = await prisma.campaignCreative.create({
        data: {
          campaignId: existingCreative.campaignId,
          creativeType: existingCreative.creativeType,
          voiceProfileId: existingCreative.voiceProfileId,
          aiGenerated: true,
          status: 'pending_review',
          headline,
          body,
          ctaText,
          performanceScore: variant.predictedScore
        }
      });

      // Optionally mark the old creative as replaced
      await prisma.campaignCreative.update({
        where: { id: creativeId },
        data: { status: 'rejected' }
      });

      return {
        success: true,
        newCreativeId: newCreative.id,
        oldCreativeId: creativeId,
        voiceConsistencyScore: result.voiceConsistencyScore
      };
    } catch (err) {
      console.error('Failed to regenerate creative:', err);
      return fail(500, { error: 'Failed to regenerate creative. Please try again.' });
    }
  },

  createUserAccount: async ({ params, request }) => {
    const formData = await request.formData();
    const email = formData.get('email') as string;
    const firstName = formData.get('firstName') as string;
    const lastName = formData.get('lastName') as string;

    if (!email) {
      return fail(400, { error: 'Email is required', actionType: 'createUserAccount' });
    }

    try {
      // Get the organization first
      const organization = await prisma.organization.findUnique({
        where: { id: params.id }
      });

      if (!organization) {
        return fail(404, { error: 'Organization not found', actionType: 'createUserAccount' });
      }

      // Check if user already exists
      const existingUser = await prisma.user.findUnique({
        where: { email: email.toLowerCase() }
      });

      // Generate temporary password
      const tempPassword = crypto.randomUUID().slice(0, 12);
      const passwordHash = await hash(tempPassword, {
        memoryCost: 19456,
        timeCost: 2,
        outputLen: 32,
        parallelism: 1
      });

      if (existingUser) {
        // If user was soft-deleted, reactivate them
        if (existingUser.deletedAt) {
          await prisma.user.update({
            where: { id: existingUser.id },
            data: {
              deletedAt: null,
              isActive: true,
              passwordHash,
              firstName: firstName || existingUser.firstName,
              lastName: lastName || existingUser.lastName,
              organizationId: organization.id,
              role: 'client_owner'
            }
          });

          return {
            success: true,
            actionType: 'createUserAccount',
            reactivated: true,
            credentials: {
              email: email.toLowerCase(),
              password: tempPassword
            }
          };
        }

        // If user exists and is active, check if they belong to a different org
        if (existingUser.organizationId && existingUser.organizationId !== params.id) {
          return fail(400, { error: 'This email is already associated with another organization', actionType: 'createUserAccount' });
        }

        // User exists for this org - just reset their password
        await prisma.user.update({
          where: { id: existingUser.id },
          data: {
            passwordHash,
            isActive: true
          }
        });

        return {
          success: true,
          actionType: 'createUserAccount',
          credentials: {
            email: email.toLowerCase(),
            password: tempPassword
          }
        };
      }

      // Create new user account
      await prisma.user.create({
        data: {
          email: email.toLowerCase(),
          firstName: firstName || organization.name.split(' ')[0] || 'Client',
          lastName: lastName || organization.name.split(' ').slice(1).join(' ') || 'Owner',
          passwordHash,
          role: 'client_owner',
          isActive: true,
          organizationId: organization.id
        }
      });

      return {
        success: true,
        actionType: 'createUserAccount',
        credentials: {
          email: email.toLowerCase(),
          password: tempPassword
        }
      };
    } catch (err) {
      console.error('Failed to create user account:', err);
      return fail(500, { error: 'Failed to create user account', actionType: 'createUserAccount' });
    }
  },

  resetPassword: async ({ request }) => {
    const formData = await request.formData();
    const userId = formData.get('userId') as string;

    if (!userId) {
      return fail(400, { error: 'User ID is required', actionType: 'resetPassword' });
    }

    try {
      const user = await prisma.user.findUnique({
        where: { id: userId }
      });

      if (!user) {
        return fail(404, { error: 'User not found', actionType: 'resetPassword' });
      }

      // Generate new temporary password
      const tempPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-4).toUpperCase();
      const bcrypt = await import('bcryptjs');
      const passwordHash = await bcrypt.hash(tempPassword, 10);

      await prisma.user.update({
        where: { id: userId },
        data: { passwordHash }
      });

      return {
        success: true,
        actionType: 'resetPassword',
        credentials: {
          email: user.email,
          password: tempPassword
        }
      };
    } catch (err) {
      console.error('Failed to reset password:', err);
      return fail(500, { error: 'Failed to reset password', actionType: 'resetPassword' });
    }
  },

  deleteClient: async ({ params }) => {
    const { id } = params;

    // Check if organization exists first
    const organization = await prisma.organization.findUnique({
      where: { id }
    });

    if (!organization) {
      return fail(404, { error: 'Client not found' });
    }

    if (organization.deletedAt) {
      return fail(400, { error: 'Client has already been deleted' });
    }

    try {
      // Soft delete the organization
      await prisma.organization.update({
        where: { id },
        data: { deletedAt: new Date() }
      });
    } catch (err) {
      console.error('Failed to soft delete organization:', err);
      return fail(500, { error: 'Failed to delete client organization' });
    }

    try {
      // Also soft delete associated users
      await prisma.user.updateMany({
        where: { organizationId: id },
        data: { deletedAt: new Date(), isActive: false }
      });
    } catch (err) {
      console.error('Failed to soft delete users:', err);
      // Continue anyway - org is already deleted
    }

    try {
      // Get the territory IDs FIRST before updating assignments
      const assignments = await prisma.territoryAssignment.findMany({
        where: { organizationId: id, status: 'active' },
        select: { territoryId: true }
      });

      // Release any territory assignments
      if (assignments.length > 0) {
        await prisma.territoryAssignment.updateMany({
          where: { organizationId: id, status: 'active' },
          data: { status: 'terminated' }
        });

        // Unlock territories - set back to available
        for (const assignment of assignments) {
          await prisma.territory.update({
            where: { id: assignment.territoryId },
            data: { status: 'available' }
          });
        }
      }
    } catch (err) {
      console.error('Failed to release territories:', err);
      // Continue anyway - org is already deleted
    }

    return { success: true, deleted: true };
  },

  deleteUser: async ({ params, request }) => {
    const formData = await request.formData();
    const userId = formData.get('userId') as string;

    if (!userId) {
      return fail(400, { error: 'User ID is required' });
    }

    try {
      // Get the user to verify they belong to this organization
      const user = await prisma.user.findUnique({
        where: { id: userId }
      });

      if (!user) {
        return fail(404, { error: 'User not found' });
      }

      if (user.organizationId !== params.id) {
        return fail(403, { error: 'User does not belong to this organization' });
      }

      // Hard delete the user (or soft delete if preferred)
      await prisma.user.delete({
        where: { id: userId }
      });

      return { success: true, deletedUserId: userId };
    } catch (err) {
      console.error('Failed to delete user:', err);
      return fail(500, { error: 'Failed to delete user' });
    }
  }
};
