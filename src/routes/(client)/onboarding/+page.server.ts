import type { PageServerLoad } from './$types';
import { prisma } from '$lib/server/db';
import {
  getOnboardingPhases,
  calculatePhaseProgress,
  getEstimatedCompletionDate,
  type OnboardingPhaseWithTasks
} from '$lib/server/settings/onboarding';

interface PhaseData {
  phase: number;
  phaseName: string;
  description: string | null;
  status: 'pending' | 'in_progress' | 'completed';
  progress: number;
  tasks: Array<{
    id: string;
    title: string;
    description?: string;
    completed: boolean;
    isRequired: boolean;
  }>;
  startedAt: string | null;
  completedAt: string | null;
  dueDate: string | null;
}

export const load: PageServerLoad = async ({ parent }) => {
  const { user, organization } = await parent();

  if (!organization) {
    return {
      onboarding: null,
      phases: [],
      overallProgress: 0,
      estimatedLaunchDate: null,
      daysRemaining: null,
      nextTasks: []
    };
  }

  const organizationId = organization.id;

  // Get organization's onboarding record
  const clientOnboarding = await prisma.clientOnboarding.findUnique({
    where: { organizationId },
    include: {
      tasks: {
        orderBy: [{ phase: 'asc' }, { taskOrder: 'asc' }]
      },
      assignedToUser: {
        select: {
          firstName: true,
          lastName: true,
          email: true
        }
      }
    }
  });

  // Get onboarding phase definitions
  const phaseDefinitions = await getOnboardingPhases();

  // If no onboarding record exists, return empty state
  if (!clientOnboarding) {
    return {
      onboarding: null,
      phases: [],
      overallProgress: 0,
      estimatedLaunchDate: null,
      daysRemaining: null,
      nextTasks: []
    };
  }

  // Build completed task IDs from the onboarding tasks
  const completedTaskIds = clientOnboarding.tasks
    .filter((t) => t.status === 'completed')
    .map((t) => t.title); // Use title as identifier since tasks match by title

  // Get phase statuses from the onboarding record
  const phaseStatuses: Record<number, { status: 'pending' | 'in_progress' | 'completed'; completedAt: Date | null }> = {
    1: { status: clientOnboarding.phase1Status as 'pending' | 'in_progress' | 'completed', completedAt: clientOnboarding.phase1CompletedAt },
    2: { status: clientOnboarding.phase2Status as 'pending' | 'in_progress' | 'completed', completedAt: clientOnboarding.phase2CompletedAt },
    3: { status: clientOnboarding.phase3Status as 'pending' | 'in_progress' | 'completed', completedAt: clientOnboarding.phase3CompletedAt },
    4: { status: clientOnboarding.phase4Status as 'pending' | 'in_progress' | 'completed', completedAt: clientOnboarding.phase4CompletedAt }
  };

  // Calculate due dates based on phase days
  const startDate = new Date(clientOnboarding.startedAt);
  let cumulativeDays = 0;

  // Build phase data for the UI
  const phases: PhaseData[] = phaseDefinitions.map((phaseDef) => {
    const phaseStatus = phaseStatuses[phaseDef.phase] || { status: 'pending', completedAt: null };

    // Get tasks for this phase from the onboarding record
    const phaseTasks = clientOnboarding.tasks.filter((t) => t.phase === phaseDef.phase);

    // Calculate completion based on actual task status
    const completedTasks = phaseTasks.filter((t) => t.status === 'completed');
    const totalTasks = phaseTasks.length || phaseDef.tasks.length;
    const progress = totalTasks > 0 ? Math.round((completedTasks.length / totalTasks) * 100) : 0;

    // Calculate due date
    cumulativeDays += phaseDef.defaultDays;
    const dueDate = new Date(startDate);
    dueDate.setDate(dueDate.getDate() + cumulativeDays);

    // Map tasks - use onboarding tasks if available, otherwise use definition
    const tasks = phaseTasks.length > 0
      ? phaseTasks.map((t) => ({
          id: t.id,
          title: t.title,
          description: t.description ?? undefined,
          completed: t.status === 'completed',
          isRequired: t.isRequired
        }))
      : phaseDef.tasks.map((t) => ({
          id: t.id,
          title: t.title,
          description: t.description,
          completed: false,
          isRequired: t.isRequired
        }));

    // Determine phase started date
    let startedAt: string | null = null;
    if (phaseDef.phase === 1) {
      startedAt = clientOnboarding.startedAt.toISOString();
    } else if (phaseStatus.status !== 'pending') {
      // Estimate start based on previous phase completion
      const prevPhaseStatus = phaseStatuses[phaseDef.phase - 1];
      if (prevPhaseStatus?.completedAt) {
        startedAt = prevPhaseStatus.completedAt.toISOString();
      }
    }

    return {
      phase: phaseDef.phase,
      phaseName: phaseDef.name,
      description: phaseDef.description,
      status: phaseStatus.status,
      progress,
      tasks,
      startedAt,
      completedAt: phaseStatus.completedAt?.toISOString() ?? null,
      dueDate: dueDate.toISOString()
    };
  });

  // Calculate estimated launch date
  const estimatedLaunchDate = await getEstimatedCompletionDate(
    clientOnboarding.currentPhase,
    new Date()
  );

  // Calculate days remaining
  const today = new Date();
  const daysRemaining = Math.max(
    0,
    Math.ceil((estimatedLaunchDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  );

  // Get next incomplete tasks (up to 3)
  const nextTasks = phases
    .flatMap((phase) =>
      phase.tasks
        .filter((t) => !t.completed)
        .map((t) => ({
          ...t,
          phase: phase.phase,
          phaseName: phase.phaseName
        }))
    )
    .slice(0, 3);

  return {
    onboarding: {
      id: clientOnboarding.id,
      currentPhase: clientOnboarding.currentPhase,
      overallProgress: clientOnboarding.overallProgress,
      startedAt: clientOnboarding.startedAt.toISOString(),
      completedAt: clientOnboarding.completedAt?.toISOString() ?? null,
      assignee: clientOnboarding.assignedToUser
        ? {
            name: `${clientOnboarding.assignedToUser.firstName} ${clientOnboarding.assignedToUser.lastName}`,
            email: clientOnboarding.assignedToUser.email
          }
        : null,
      notes: clientOnboarding.notes
    },
    phases,
    overallProgress: clientOnboarding.overallProgress,
    estimatedLaunchDate: estimatedLaunchDate.toISOString(),
    daysRemaining,
    nextTasks
  };
};
