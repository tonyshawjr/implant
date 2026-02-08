import type { PageServerLoad, Actions } from './$types';
import { prisma } from '$lib/server/db';
import { fail } from '@sveltejs/kit';
import type { ProspectStage, Prisma } from '@prisma/client';

// Define the pipeline stages in order
const PIPELINE_STAGES: ProspectStage[] = [
  'new',
  'qualified',
  'demo_scheduled',
  'proposal_sent',
  'negotiation',
  'closed_won',
  'closed_lost'
];

export const load: PageServerLoad = async () => {
  // Get all prospects grouped by stage
  const [prospects, pipelineStats, salesUsers, territories, plans] = await Promise.all([
    // All prospects with their related data
    prisma.prospect.findMany({
      select: {
        id: true,
        practiceName: true,
        contactFirstName: true,
        contactLastName: true,
        contactEmail: true,
        contactPhone: true,
        website: true,
        city: true,
        state: true,
        source: true,
        stage: true,
        monthlyValue: true,
        probability: true,
        expectedCloseDate: true,
        notes: true,
        createdAt: true,
        updatedAt: true,
        assignedTo: true,
        assignedToUser: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        },
        territoryReservations: {
          where: {
            status: 'active'
          },
          select: {
            id: true,
            territoryId: true,
            expiresAt: true,
            territory: {
              select: {
                id: true,
                name: true,
                city: true,
                state: true
              }
            }
          },
          take: 1
        },
        proposals: {
          select: {
            id: true,
            proposalNumber: true,
            status: true,
            monthlyValue: true,
            territory: {
              select: {
                name: true,
                city: true,
                state: true
              }
            }
          },
          orderBy: {
            createdAt: 'desc'
          },
          take: 1
        },
        activities: {
          select: {
            id: true,
            activityType: true,
            subject: true,
            description: true,
            outcome: true,
            completedAt: true,
            performedByUser: {
              select: {
                firstName: true,
                lastName: true
              }
            },
            createdAt: true
          },
          orderBy: {
            createdAt: 'desc'
          },
          take: 5
        }
      },
      orderBy: {
        updatedAt: 'desc'
      }
    }),

    // Pipeline statistics
    prisma.$transaction([
      // Total pipeline value
      prisma.prospect.aggregate({
        _sum: {
          monthlyValue: true
        },
        where: {
          stage: {
            notIn: ['closed_won', 'closed_lost']
          }
        }
      }),
      // Count by stage
      prisma.prospect.groupBy({
        by: ['stage'],
        orderBy: { stage: 'asc' },
        _count: true,
        _sum: {
          monthlyValue: true
        }
      }),
      // Closed won this month
      prisma.prospect.aggregate({
        _count: true,
        _sum: {
          monthlyValue: true
        },
        where: {
          stage: 'closed_won',
          closedAt: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
          }
        }
      }),
      // Closed lost this month
      prisma.prospect.aggregate({
        _count: true,
        where: {
          stage: 'closed_lost',
          closedAt: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
          }
        }
      }),
      // Average deal size (closed won last 90 days)
      prisma.prospect.aggregate({
        _avg: {
          monthlyValue: true
        },
        where: {
          stage: 'closed_won',
          closedAt: {
            gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
          }
        }
      })
    ]),

    // Sales team members for assignment
    prisma.user.findMany({
      where: {
        role: {
          in: ['admin', 'super_admin']
        },
        isActive: true,
        deletedAt: null
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true
      }
    }),

    // Available territories for proposals
    prisma.territory.findMany({
      where: {
        status: 'available'
      },
      select: {
        id: true,
        name: true,
        city: true,
        state: true,
        monthlyBasePrice: true
      },
      orderBy: {
        name: 'asc'
      }
    }),

    // Plans for proposals
    prisma.plan.findMany({
      where: {
        isActive: true
      },
      select: {
        id: true,
        name: true,
        slug: true,
        basePrice: true,
        description: true
      },
      orderBy: {
        sortOrder: 'asc'
      }
    })
  ]);

  // Calculate conversion rate (closed won / (closed won + closed lost))
  const closedWon = pipelineStats[2]._count ?? 0;
  const closedLost = pipelineStats[3]._count ?? 0;
  const conversionRate = closedWon + closedLost > 0
    ? (closedWon / (closedWon + closedLost)) * 100
    : 0;

  // Group prospects by stage for Kanban
  const prospectsByStage = PIPELINE_STAGES.reduce((acc, stage) => {
    acc[stage] = prospects
      .filter(p => p.stage === stage)
      .map(p => ({
        id: p.id,
        practiceName: p.practiceName,
        contactName: `${p.contactFirstName} ${p.contactLastName}`,
        contactEmail: p.contactEmail,
        contactPhone: p.contactPhone,
        website: p.website,
        location: p.city && p.state ? `${p.city}, ${p.state}` : null,
        source: p.source,
        stage: p.stage,
        monthlyValue: p.monthlyValue ? Number(p.monthlyValue) : null,
        probability: p.probability,
        expectedCloseDate: p.expectedCloseDate?.toISOString() ?? null,
        notes: p.notes,
        createdAt: p.createdAt.toISOString(),
        updatedAt: p.updatedAt.toISOString(),
        assignedTo: p.assignedToUser ? {
          id: p.assignedToUser.id,
          name: `${p.assignedToUser.firstName} ${p.assignedToUser.lastName}`
        } : null,
        territoryReservation: p.territoryReservations[0] ? {
          id: p.territoryReservations[0].id,
          territoryId: p.territoryReservations[0].territoryId,
          territoryName: p.territoryReservations[0].territory.name,
          territoryLocation: `${p.territoryReservations[0].territory.city}, ${p.territoryReservations[0].territory.state}`,
          expiresAt: p.territoryReservations[0].expiresAt.toISOString()
        } : null,
        latestProposal: p.proposals[0] ? {
          id: p.proposals[0].id,
          proposalNumber: p.proposals[0].proposalNumber,
          status: p.proposals[0].status,
          monthlyValue: Number(p.proposals[0].monthlyValue),
          territoryName: p.proposals[0].territory.name
        } : null,
        recentActivities: p.activities.map(a => ({
          id: a.id,
          type: a.activityType,
          subject: a.subject,
          description: a.description,
          outcome: a.outcome,
          completedAt: a.completedAt?.toISOString() ?? null,
          performedBy: a.performedByUser
            ? `${a.performedByUser.firstName} ${a.performedByUser.lastName}`
            : null,
          createdAt: a.createdAt.toISOString()
        }))
      }));
    return acc;
  }, {} as Record<ProspectStage, any[]>);

  // Stage statistics
  const stageStats = pipelineStats[1].reduce((acc, stat) => {
    acc[stat.stage] = {
      count: stat._count as number,
      value: stat._sum?.monthlyValue ? Number(stat._sum.monthlyValue) : 0
    };
    return acc;
  }, {} as Record<string, { count: number; value: number }>);

  return {
    prospectsByStage,
    stages: PIPELINE_STAGES,
    metrics: {
      totalPipelineValue: pipelineStats[0]._sum.monthlyValue
        ? Number(pipelineStats[0]._sum.monthlyValue)
        : 0,
      conversionRate,
      avgDealSize: pipelineStats[4]._avg.monthlyValue
        ? Number(pipelineStats[4]._avg.monthlyValue)
        : 0,
      closedWonThisMonth: {
        count: closedWon,
        value: pipelineStats[2]._sum.monthlyValue
          ? Number(pipelineStats[2]._sum.monthlyValue)
          : 0
      },
      closedLostThisMonth: closedLost
    },
    stageStats,
    salesUsers: salesUsers.map(u => ({
      id: u.id,
      name: `${u.firstName} ${u.lastName}`,
      email: u.email
    })),
    territories: territories.map(t => ({
      id: t.id,
      name: t.name,
      location: `${t.city}, ${t.state}`,
      basePrice: t.monthlyBasePrice ? Number(t.monthlyBasePrice) : 0
    })),
    plans: plans.map(p => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      basePrice: Number(p.basePrice),
      description: p.description
    }))
  };
};

export const actions: Actions = {
  // Update prospect stage (for drag and drop)
  updateStage: async ({ request }) => {
    const formData = await request.formData();
    const prospectId = formData.get('prospectId') as string;
    const newStage = formData.get('stage') as ProspectStage;

    if (!prospectId || !newStage) {
      return fail(400, { error: 'Missing required fields' });
    }

    if (!PIPELINE_STAGES.includes(newStage)) {
      return fail(400, { error: 'Invalid stage' });
    }

    try {
      const updateData: Prisma.ProspectUpdateInput = {
        stage: newStage,
        updatedAt: new Date()
      };

      // Set closed date if moving to closed stage
      if (newStage === 'closed_won' || newStage === 'closed_lost') {
        updateData.closedAt = new Date();
      }

      await prisma.prospect.update({
        where: { id: prospectId },
        data: updateData
      });

      return { success: true };
    } catch (error) {
      console.error('Failed to update prospect stage:', error);
      return fail(500, { error: 'Failed to update stage' });
    }
  },

  // Create new prospect
  createProspect: async ({ request, locals }) => {
    const formData = await request.formData();

    const practiceName = formData.get('practiceName') as string;
    const contactFirstName = formData.get('contactFirstName') as string;
    const contactLastName = formData.get('contactLastName') as string;
    const contactEmail = formData.get('contactEmail') as string;
    const contactPhone = formData.get('contactPhone') as string | null;
    const website = formData.get('website') as string | null;
    const city = formData.get('city') as string | null;
    const state = formData.get('state') as string | null;
    const source = formData.get('source') as string;
    const monthlyValue = formData.get('monthlyValue') as string | null;
    const assignedTo = formData.get('assignedTo') as string | null;
    const notes = formData.get('notes') as string | null;

    if (!practiceName || !contactFirstName || !contactLastName || !contactEmail || !source) {
      return fail(400, { error: 'Missing required fields' });
    }

    try {
      const prospect = await prisma.prospect.create({
        data: {
          practiceName,
          contactFirstName,
          contactLastName,
          contactEmail,
          contactPhone,
          website,
          city,
          state,
          source: source as any,
          stage: 'new',
          monthlyValue: monthlyValue ? parseFloat(monthlyValue) : null,
          assignedTo: assignedTo || null,
          notes
        }
      });

      return { success: true, prospectId: prospect.id };
    } catch (error) {
      console.error('Failed to create prospect:', error);
      return fail(500, { error: 'Failed to create prospect' });
    }
  },

  // Add activity to prospect
  addActivity: async ({ request, locals }) => {
    const formData = await request.formData();

    const prospectId = formData.get('prospectId') as string;
    const activityType = formData.get('activityType') as string;
    const subject = formData.get('subject') as string;
    const description = formData.get('description') as string | null;
    const outcome = formData.get('outcome') as string | null;

    if (!prospectId || !activityType || !subject) {
      return fail(400, { error: 'Missing required fields' });
    }

    if (!locals.user) {
      return fail(401, { error: 'Unauthorized' });
    }

    try {
      await prisma.prospectActivity.create({
        data: {
          prospectId,
          activityType: activityType as any,
          subject,
          description,
          outcome,
          performedBy: locals.user.id,
          completedAt: new Date()
        }
      });

      return { success: true };
    } catch (error) {
      console.error('Failed to add activity:', error);
      return fail(500, { error: 'Failed to add activity' });
    }
  },

  // Create proposal
  createProposal: async ({ request, locals }) => {
    const formData = await request.formData();

    const prospectId = formData.get('prospectId') as string;
    const territoryId = formData.get('territoryId') as string;
    const planId = formData.get('planId') as string;
    const monthlyValue = formData.get('monthlyValue') as string;
    const termMonths = formData.get('termMonths') as string;
    const discountPercentage = formData.get('discountPercentage') as string | null;
    const discountReason = formData.get('discountReason') as string | null;
    const customTerms = formData.get('customTerms') as string | null;

    if (!prospectId || !territoryId || !planId || !monthlyValue) {
      return fail(400, { error: 'Missing required fields' });
    }

    if (!locals.user) {
      return fail(401, { error: 'Unauthorized' });
    }

    try {
      // Generate proposal number
      const proposalCount = await prisma.proposal.count();
      const proposalNumber = `PROP-${String(proposalCount + 1).padStart(5, '0')}`;

      // Calculate valid until (14 days from now)
      const validUntil = new Date();
      validUntil.setDate(validUntil.getDate() + 14);

      const proposal = await prisma.proposal.create({
        data: {
          proposalNumber,
          prospectId,
          territoryId,
          planId,
          monthlyValue: parseFloat(monthlyValue),
          termMonths: termMonths ? parseInt(termMonths) : 12,
          discountPercentage: discountPercentage ? parseFloat(discountPercentage) : null,
          discountReason,
          customTerms,
          validUntil,
          createdBy: locals.user.id
        }
      });

      // Update prospect stage to proposal_sent
      await prisma.prospect.update({
        where: { id: prospectId },
        data: { stage: 'proposal_sent' }
      });

      return { success: true, proposalId: proposal.id };
    } catch (error) {
      console.error('Failed to create proposal:', error);
      return fail(500, { error: 'Failed to create proposal' });
    }
  },

  // Reserve territory for prospect
  reserveTerritory: async ({ request, locals }) => {
    const formData = await request.formData();

    const prospectId = formData.get('prospectId') as string;
    const territoryId = formData.get('territoryId') as string;
    const daysToHold = formData.get('daysToHold') as string;
    const notes = formData.get('notes') as string | null;

    if (!prospectId || !territoryId) {
      return fail(400, { error: 'Missing required fields' });
    }

    if (!locals.user) {
      return fail(401, { error: 'Unauthorized' });
    }

    try {
      // Calculate expiry date
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + (daysToHold ? parseInt(daysToHold) : 7));

      await prisma.territoryReservation.create({
        data: {
          prospectId,
          territoryId,
          reservedBy: locals.user.id,
          reservedAt: new Date(),
          expiresAt,
          notes
        }
      });

      return { success: true };
    } catch (error) {
      console.error('Failed to reserve territory:', error);
      return fail(500, { error: 'Failed to reserve territory' });
    }
  },

  // Update prospect assignment
  updateAssignment: async ({ request }) => {
    const formData = await request.formData();

    const prospectId = formData.get('prospectId') as string;
    const assignedTo = formData.get('assignedTo') as string | null;

    if (!prospectId) {
      return fail(400, { error: 'Missing prospect ID' });
    }

    try {
      await prisma.prospect.update({
        where: { id: prospectId },
        data: {
          assignedTo: assignedTo || null
        }
      });

      return { success: true };
    } catch (error) {
      console.error('Failed to update assignment:', error);
      return fail(500, { error: 'Failed to update assignment' });
    }
  }
};
