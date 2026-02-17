import type { PageServerLoad, Actions } from './$types';
import { prisma } from '$lib/server/db';
import { fail } from '@sveltejs/kit';
import type { PhaseStatus, Prisma } from '@prisma/client';
import { ROLE_SUPER_ADMIN, ROLE_ADMIN } from '$lib/constants/roles';

// Define onboarding phases and their default tasks
const PHASE_DEFINITIONS = [
  {
    phase: 1,
    name: 'Account Setup',
    description: 'Contract, credentials, and billing setup',
    defaultDays: 2,
    tasks: [
      { title: 'Contract signed and processed', isRequired: true },
      { title: 'Account credentials created', isRequired: true },
      { title: 'Payment method configured', isRequired: true },
      { title: 'Welcome email sent', isRequired: true },
      { title: 'Initial kickoff call scheduled', isRequired: false }
    ]
  },
  {
    phase: 2,
    name: 'Voice Analysis',
    description: 'AI crawl, profile generation, and approval',
    defaultDays: 4,
    tasks: [
      { title: 'Website crawled and analyzed', isRequired: true },
      { title: 'Voice profile generated', isRequired: true },
      { title: 'Sample content created', isRequired: true },
      { title: 'Client review of voice profile', isRequired: true },
      { title: 'Voice profile approved', isRequired: true },
      { title: 'Adjustments applied (if any)', isRequired: false }
    ]
  },
  {
    phase: 3,
    name: 'Campaign Build',
    description: 'Landing pages, ad accounts, and tracking setup',
    defaultDays: 4,
    tasks: [
      { title: 'Landing page template selected', isRequired: true },
      { title: 'Landing page customized and published', isRequired: true },
      { title: 'Ad account connected', isRequired: true },
      { title: 'Tracking pixels installed', isRequired: true },
      { title: 'Campaign structure created', isRequired: true },
      { title: 'Ad creatives approved', isRequired: true },
      { title: 'Conversion tracking verified', isRequired: true }
    ]
  },
  {
    phase: 4,
    name: 'Launch',
    description: 'Go live, training, and initial monitoring',
    defaultDays: 4,
    tasks: [
      { title: 'Campaign launched', isRequired: true },
      { title: 'Client training completed', isRequired: true },
      { title: 'Lead notification setup verified', isRequired: true },
      { title: 'First leads confirmed', isRequired: true },
      { title: '48-hour performance check', isRequired: true },
      { title: 'Week 1 review call scheduled', isRequired: false }
    ]
  }
];

export const load: PageServerLoad = async () => {
  // Get all active onboardings with their details
  const [onboardings, onboardingStats, specialists] = await Promise.all([
    // All onboardings that are not completed
    prisma.clientOnboarding.findMany({
      where: {
        completedAt: null
      },
      select: {
        id: true,
        currentPhase: true,
        phase1Status: true,
        phase1CompletedAt: true,
        phase2Status: true,
        phase2CompletedAt: true,
        phase3Status: true,
        phase3CompletedAt: true,
        phase4Status: true,
        phase4CompletedAt: true,
        overallProgress: true,
        notes: true,
        startedAt: true,
        organization: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            status: true
          }
        },
        assignedToUser: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        },
        tasks: {
          select: {
            id: true,
            phase: true,
            taskOrder: true,
            title: true,
            description: true,
            isRequired: true,
            status: true,
            completedAt: true,
            completedByUser: {
              select: {
                firstName: true,
                lastName: true
              }
            }
          },
          orderBy: [
            { phase: 'asc' },
            { taskOrder: 'asc' }
          ]
        }
      },
      orderBy: [
        { currentPhase: 'asc' },
        { startedAt: 'asc' }
      ]
    }),

    // Statistics
    prisma.$transaction([
      // Currently in onboarding
      prisma.clientOnboarding.count({
        where: { completedAt: null }
      }),
      // Completed this month
      prisma.clientOnboarding.count({
        where: {
          completedAt: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
          }
        }
      }),
      // Average completion time (last 30 days)
      prisma.clientOnboarding.findMany({
        where: {
          completedAt: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
          }
        },
        select: {
          startedAt: true,
          completedAt: true
        }
      }),
      // By phase
      prisma.clientOnboarding.groupBy({
        by: ['currentPhase'],
        where: { completedAt: null },
        orderBy: { currentPhase: 'asc' },
        _count: true
      }),
      // Delayed (started more than 14 days ago and not completed)
      prisma.clientOnboarding.count({
        where: {
          completedAt: null,
          startedAt: {
            lt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000)
          }
        }
      })
    ]),

    // Specialists for assignment
    prisma.user.findMany({
      where: {
        role: {
          in: [ROLE_ADMIN, ROLE_SUPER_ADMIN]
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
    })
  ]);

  // Calculate average completion time
  const completedOnboardings = onboardingStats[2];
  let avgCompletionDays = 0;
  if (completedOnboardings.length > 0) {
    const totalDays = completedOnboardings.reduce((acc, o) => {
      if (o.completedAt) {
        return acc + ((o.completedAt.getTime() - o.startedAt.getTime()) / (1000 * 60 * 60 * 24));
      }
      return acc;
    }, 0);
    avgCompletionDays = Math.round(totalDays / completedOnboardings.length);
  }

  // Group by phase for stats
  const byPhase = onboardingStats[3].reduce((acc, stat) => {
    acc[stat.currentPhase] = stat._count as number;
    return acc;
  }, {} as Record<number, number>);

  // Map onboardings to response format
  const onboardingData = onboardings.map(o => {
    // Calculate days in onboarding
    const daysInOnboarding = Math.floor((Date.now() - o.startedAt.getTime()) / (1000 * 60 * 60 * 24));

    // Calculate phase progress
    const getPhaseProgress = (phase: number) => {
      const phaseTasks = o.tasks.filter(t => t.phase === phase);
      if (phaseTasks.length === 0) return 0;
      const completed = phaseTasks.filter(t => t.status === 'completed').length;
      return Math.round((completed / phaseTasks.length) * 100);
    };

    return {
      id: o.id,
      currentPhase: o.currentPhase,
      phases: [
        {
          phase: 1,
          name: PHASE_DEFINITIONS[0].name,
          status: o.phase1Status,
          completedAt: o.phase1CompletedAt?.toISOString() ?? null,
          progress: getPhaseProgress(1)
        },
        {
          phase: 2,
          name: PHASE_DEFINITIONS[1].name,
          status: o.phase2Status,
          completedAt: o.phase2CompletedAt?.toISOString() ?? null,
          progress: getPhaseProgress(2)
        },
        {
          phase: 3,
          name: PHASE_DEFINITIONS[2].name,
          status: o.phase3Status,
          completedAt: o.phase3CompletedAt?.toISOString() ?? null,
          progress: getPhaseProgress(3)
        },
        {
          phase: 4,
          name: PHASE_DEFINITIONS[3].name,
          status: o.phase4Status,
          completedAt: o.phase4CompletedAt?.toISOString() ?? null,
          progress: getPhaseProgress(4)
        }
      ],
      overallProgress: o.overallProgress,
      notes: o.notes,
      daysInOnboarding,
      isDelayed: daysInOnboarding > 14,
      startedAt: o.startedAt.toISOString(),
      organization: {
        id: o.organization.id,
        name: o.organization.name,
        email: o.organization.email,
        phone: o.organization.phone
      },
      assignedTo: o.assignedToUser ? {
        id: o.assignedToUser.id,
        name: `${o.assignedToUser.firstName} ${o.assignedToUser.lastName}`,
        email: o.assignedToUser.email
      } : null,
      tasks: o.tasks.map(t => ({
        id: t.id,
        phase: t.phase,
        taskOrder: t.taskOrder,
        title: t.title,
        description: t.description,
        isRequired: t.isRequired,
        status: t.status,
        completedAt: t.completedAt?.toISOString() ?? null,
        completedBy: t.completedByUser
          ? `${t.completedByUser.firstName} ${t.completedByUser.lastName}`
          : null
      }))
    };
  });

  // Group onboardings by current phase for pipeline view
  const onboardingsByPhase = {
    1: onboardingData.filter(o => o.currentPhase === 1),
    2: onboardingData.filter(o => o.currentPhase === 2),
    3: onboardingData.filter(o => o.currentPhase === 3),
    4: onboardingData.filter(o => o.currentPhase === 4)
  };

  return {
    onboardings: onboardingData,
    onboardingsByPhase,
    phaseDefinitions: PHASE_DEFINITIONS,
    stats: {
      inProgress: onboardingStats[0],
      completedThisMonth: onboardingStats[1],
      avgCompletionDays,
      byPhase,
      delayed: onboardingStats[4]
    },
    specialists: specialists.map(s => ({
      id: s.id,
      name: `${s.firstName} ${s.lastName}`,
      email: s.email
    }))
  };
};

export const actions: Actions = {
  // Complete a task
  completeTask: async ({ request, locals }) => {
    const formData = await request.formData();

    const taskId = formData.get('taskId') as string;
    const onboardingId = formData.get('onboardingId') as string;

    if (!taskId || !onboardingId) {
      return fail(400, { error: 'Missing required fields' });
    }

    if (!locals.user) {
      return fail(401, { error: 'Unauthorized' });
    }

    try {
      // Complete the task
      await prisma.onboardingTask.update({
        where: { id: taskId },
        data: {
          status: 'completed',
          completedBy: locals.user.id,
          completedAt: new Date()
        }
      });

      // Update overall progress and check phase completion
      await updateOnboardingProgress(onboardingId);

      return { success: true };
    } catch (error) {
      console.error('Failed to complete task:', error);
      return fail(500, { error: 'Failed to complete task' });
    }
  },

  // Uncomplete a task
  uncompleteTask: async ({ request }) => {
    const formData = await request.formData();

    const taskId = formData.get('taskId') as string;
    const onboardingId = formData.get('onboardingId') as string;

    if (!taskId || !onboardingId) {
      return fail(400, { error: 'Missing required fields' });
    }

    try {
      await prisma.onboardingTask.update({
        where: { id: taskId },
        data: {
          status: 'pending',
          completedBy: null,
          completedAt: null
        }
      });

      // Update overall progress
      await updateOnboardingProgress(onboardingId);

      return { success: true };
    } catch (error) {
      console.error('Failed to uncomplete task:', error);
      return fail(500, { error: 'Failed to uncomplete task' });
    }
  },

  // Advance to next phase
  advancePhase: async ({ request }) => {
    const formData = await request.formData();

    const onboardingId = formData.get('onboardingId') as string;

    if (!onboardingId) {
      return fail(400, { error: 'Missing onboarding ID' });
    }

    try {
      const onboarding = await prisma.clientOnboarding.findUnique({
        where: { id: onboardingId },
        select: { currentPhase: true }
      });

      if (!onboarding) {
        return fail(404, { error: 'Onboarding not found' });
      }

      const nextPhase = onboarding.currentPhase + 1;
      if (nextPhase > 4) {
        return fail(400, { error: 'Already at final phase' });
      }

      // Update current phase and mark previous as completed
      const updateData: Prisma.ClientOnboardingUpdateInput = {
        currentPhase: nextPhase
      };

      // Mark current phase as completed
      if (onboarding.currentPhase === 1) {
        updateData.phase1Status = 'completed';
        updateData.phase1CompletedAt = new Date();
        updateData.phase2Status = 'in_progress';
      } else if (onboarding.currentPhase === 2) {
        updateData.phase2Status = 'completed';
        updateData.phase2CompletedAt = new Date();
        updateData.phase3Status = 'in_progress';
      } else if (onboarding.currentPhase === 3) {
        updateData.phase3Status = 'completed';
        updateData.phase3CompletedAt = new Date();
        updateData.phase4Status = 'in_progress';
      }

      await prisma.clientOnboarding.update({
        where: { id: onboardingId },
        data: updateData
      });

      return { success: true };
    } catch (error) {
      console.error('Failed to advance phase:', error);
      return fail(500, { error: 'Failed to advance phase' });
    }
  },

  // Complete onboarding
  completeOnboarding: async ({ request }) => {
    const formData = await request.formData();

    const onboardingId = formData.get('onboardingId') as string;

    if (!onboardingId) {
      return fail(400, { error: 'Missing onboarding ID' });
    }

    try {
      await prisma.clientOnboarding.update({
        where: { id: onboardingId },
        data: {
          phase4Status: 'completed',
          phase4CompletedAt: new Date(),
          overallProgress: 100,
          completedAt: new Date()
        }
      });

      return { success: true };
    } catch (error) {
      console.error('Failed to complete onboarding:', error);
      return fail(500, { error: 'Failed to complete onboarding' });
    }
  },

  // Assign specialist
  assignSpecialist: async ({ request }) => {
    const formData = await request.formData();

    const onboardingId = formData.get('onboardingId') as string;
    const assignedTo = formData.get('assignedTo') as string | null;

    if (!onboardingId) {
      return fail(400, { error: 'Missing onboarding ID' });
    }

    try {
      await prisma.clientOnboarding.update({
        where: { id: onboardingId },
        data: {
          assignedTo: assignedTo || null
        }
      });

      return { success: true };
    } catch (error) {
      console.error('Failed to assign specialist:', error);
      return fail(500, { error: 'Failed to assign specialist' });
    }
  },

  // Update notes
  updateNotes: async ({ request }) => {
    const formData = await request.formData();

    const onboardingId = formData.get('onboardingId') as string;
    const notes = formData.get('notes') as string;

    if (!onboardingId) {
      return fail(400, { error: 'Missing onboarding ID' });
    }

    try {
      await prisma.clientOnboarding.update({
        where: { id: onboardingId },
        data: { notes }
      });

      return { success: true };
    } catch (error) {
      console.error('Failed to update notes:', error);
      return fail(500, { error: 'Failed to update notes' });
    }
  }
};

// Helper function to update onboarding progress
async function updateOnboardingProgress(onboardingId: string) {
  const onboarding = await prisma.clientOnboarding.findUnique({
    where: { id: onboardingId },
    include: {
      tasks: {
        select: {
          phase: true,
          status: true,
          isRequired: true
        }
      }
    }
  });

  if (!onboarding) return;

  // Calculate overall progress based on required tasks
  const requiredTasks = onboarding.tasks.filter(t => t.isRequired);
  const completedRequired = requiredTasks.filter(t => t.status === 'completed').length;
  const overallProgress = requiredTasks.length > 0
    ? Math.round((completedRequired / requiredTasks.length) * 100)
    : 0;

  await prisma.clientOnboarding.update({
    where: { id: onboardingId },
    data: { overallProgress }
  });
}
