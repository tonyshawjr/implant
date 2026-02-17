import { prisma } from '$lib/server/db';
import type { OnboardingPhase } from '@prisma/client';

// ============================================================================
// Types
// ============================================================================

/**
 * Task object within an onboarding phase
 */
export interface OnboardingTaskDefinition {
  id: string;
  title: string;
  description?: string;
  isRequired: boolean;
  order: number;
}

/**
 * Input for creating a new onboarding phase
 */
export interface CreateOnboardingPhaseInput {
  phase: number;
  name: string;
  description?: string;
  defaultDays: number;
  tasks: OnboardingTaskDefinition[];
  sortOrder?: number;
}

/**
 * Input for updating an onboarding phase
 */
export interface UpdateOnboardingPhaseInput {
  name?: string;
  description?: string | null;
  defaultDays?: number;
  tasks?: OnboardingTaskDefinition[];
  sortOrder?: number;
}

/**
 * Onboarding phase with typed tasks
 */
export interface OnboardingPhaseWithTasks extends Omit<OnboardingPhase, 'tasks'> {
  tasks: OnboardingTaskDefinition[];
}

// ============================================================================
// Cache
// ============================================================================

/**
 * Simple in-memory cache for total onboarding days
 * Invalidated when phases are created or updated
 */
let totalDaysCache: { value: number; timestamp: number } | null = null;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

function isCacheValid(): boolean {
  if (!totalDaysCache) return false;
  return Date.now() - totalDaysCache.timestamp < CACHE_TTL_MS;
}

function invalidateCache(): void {
  totalDaysCache = null;
}

// ============================================================================
// Service Functions
// ============================================================================

/**
 * Get all onboarding phases, sorted by phase number
 */
export async function getOnboardingPhases(): Promise<OnboardingPhaseWithTasks[]> {
  const phases = await prisma.onboardingPhase.findMany({
    orderBy: { phase: 'asc' }
  });

  return phases.map((phase) => ({
    ...phase,
    tasks: phase.tasks as OnboardingTaskDefinition[]
  }));
}

/**
 * Get a specific onboarding phase by phase number
 */
export async function getOnboardingPhase(phase: number): Promise<OnboardingPhaseWithTasks | null> {
  const result = await prisma.onboardingPhase.findUnique({
    where: { phase }
  });

  if (!result) return null;

  return {
    ...result,
    tasks: result.tasks as OnboardingTaskDefinition[]
  };
}

/**
 * Get a specific onboarding phase by ID
 */
export async function getOnboardingPhaseById(id: string): Promise<OnboardingPhaseWithTasks | null> {
  const result = await prisma.onboardingPhase.findUnique({
    where: { id }
  });

  if (!result) return null;

  return {
    ...result,
    tasks: result.tasks as OnboardingTaskDefinition[]
  };
}

/**
 * Update an onboarding phase
 */
export async function updateOnboardingPhase(
  id: string,
  data: UpdateOnboardingPhaseInput
): Promise<OnboardingPhaseWithTasks> {
  // Prepare update data, converting tasks to JSON if provided
  const updateData: Record<string, unknown> = {};

  if (data.name !== undefined) {
    updateData.name = data.name;
  }

  if (data.description !== undefined) {
    updateData.description = data.description;
  }

  if (data.defaultDays !== undefined) {
    updateData.defaultDays = data.defaultDays;
    // Invalidate cache when defaultDays changes
    invalidateCache();
  }

  if (data.tasks !== undefined) {
    updateData.tasks = data.tasks;
  }

  if (data.sortOrder !== undefined) {
    updateData.sortOrder = data.sortOrder;
  }

  const result = await prisma.onboardingPhase.update({
    where: { id },
    data: updateData
  });

  return {
    ...result,
    tasks: result.tasks as OnboardingTaskDefinition[]
  };
}

/**
 * Get total onboarding days (sum of all phase defaultDays)
 * Results are cached for 5 minutes
 */
export async function getTotalOnboardingDays(): Promise<number> {
  // Check cache first
  if (isCacheValid() && totalDaysCache) {
    return totalDaysCache.value;
  }

  // Calculate total days
  const result = await prisma.onboardingPhase.aggregate({
    _sum: {
      defaultDays: true
    }
  });

  const totalDays = result._sum.defaultDays ?? 0;

  // Update cache
  totalDaysCache = {
    value: totalDays,
    timestamp: Date.now()
  };

  return totalDays;
}

/**
 * Create a new onboarding phase
 */
export async function createOnboardingPhase(
  data: CreateOnboardingPhaseInput
): Promise<OnboardingPhaseWithTasks> {
  // Invalidate cache since we're adding a new phase
  invalidateCache();

  const result = await prisma.onboardingPhase.create({
    data: {
      phase: data.phase,
      name: data.name,
      description: data.description,
      defaultDays: data.defaultDays,
      tasks: data.tasks,
      sortOrder: data.sortOrder ?? data.phase
    }
  });

  return {
    ...result,
    tasks: result.tasks as OnboardingTaskDefinition[]
  };
}

/**
 * Delete an onboarding phase
 */
export async function deleteOnboardingPhase(id: string): Promise<void> {
  invalidateCache();
  await prisma.onboardingPhase.delete({
    where: { id }
  });
}

/**
 * Seed default onboarding phases if none exist
 * Default phases:
 * 1. Account Setup (2 days)
 * 2. Voice Analysis (4 days)
 * 3. Campaign Build (4 days)
 * 4. Launch (4 days)
 * Total: 14 days
 */
export async function seedDefaultOnboardingPhases(): Promise<OnboardingPhaseWithTasks[]> {
  const existingCount = await prisma.onboardingPhase.count();

  if (existingCount > 0) {
    return getOnboardingPhases();
  }

  const defaultPhases: CreateOnboardingPhaseInput[] = [
    {
      phase: 1,
      name: 'Account Setup',
      description: 'Initial account configuration, contract signing, and credential setup',
      defaultDays: 2,
      sortOrder: 1,
      tasks: [
        {
          id: 'contract_signed',
          title: 'Contract Signed',
          description: 'Client has signed the service agreement',
          isRequired: true,
          order: 1
        },
        {
          id: 'account_created',
          title: 'Account Created',
          description: 'Client account and user credentials configured',
          isRequired: true,
          order: 2
        },
        {
          id: 'billing_setup',
          title: 'Billing Setup',
          description: 'Payment method added and verified',
          isRequired: true,
          order: 3
        },
        {
          id: 'territory_assigned',
          title: 'Territory Assigned',
          description: 'Exclusive territory has been locked to the client',
          isRequired: true,
          order: 4
        }
      ]
    },
    {
      phase: 2,
      name: 'Voice Analysis',
      description: 'AI-powered brand voice analysis and profile generation',
      defaultDays: 4,
      sortOrder: 2,
      tasks: [
        {
          id: 'sources_collected',
          title: 'Sources Collected',
          description: 'Website and marketing materials gathered for analysis',
          isRequired: true,
          order: 1
        },
        {
          id: 'ai_analysis_complete',
          title: 'AI Analysis Complete',
          description: 'Voice profile generated by AI',
          isRequired: true,
          order: 2
        },
        {
          id: 'voice_profile_review',
          title: 'Voice Profile Review',
          description: 'Client reviews generated voice profile',
          isRequired: true,
          order: 3
        },
        {
          id: 'voice_profile_approved',
          title: 'Voice Profile Approved',
          description: 'Client approves final voice profile',
          isRequired: true,
          order: 4
        }
      ]
    },
    {
      phase: 3,
      name: 'Campaign Build',
      description: 'Landing page creation, ad account setup, and campaign configuration',
      defaultDays: 4,
      sortOrder: 3,
      tasks: [
        {
          id: 'landing_page_created',
          title: 'Landing Page Created',
          description: 'Custom landing page built using voice profile',
          isRequired: true,
          order: 1
        },
        {
          id: 'ad_accounts_connected',
          title: 'Ad Accounts Connected',
          description: 'Google and Meta ad accounts linked',
          isRequired: true,
          order: 2
        },
        {
          id: 'tracking_configured',
          title: 'Tracking Configured',
          description: 'Conversion tracking and analytics set up',
          isRequired: true,
          order: 3
        },
        {
          id: 'campaigns_built',
          title: 'Campaigns Built',
          description: 'Initial ad campaigns created and configured',
          isRequired: true,
          order: 4
        },
        {
          id: 'client_review',
          title: 'Client Review',
          description: 'Client reviews campaigns before launch',
          isRequired: true,
          order: 5
        }
      ]
    },
    {
      phase: 4,
      name: 'Launch',
      description: 'Campaign activation, training, and initial monitoring',
      defaultDays: 4,
      sortOrder: 4,
      tasks: [
        {
          id: 'campaigns_launched',
          title: 'Campaigns Launched',
          description: 'Ad campaigns activated and running',
          isRequired: true,
          order: 1
        },
        {
          id: 'client_training',
          title: 'Client Training',
          description: 'Dashboard walkthrough and lead management training',
          isRequired: true,
          order: 2
        },
        {
          id: 'first_leads_delivered',
          title: 'First Leads Delivered',
          description: 'Initial leads received and processed',
          isRequired: false,
          order: 3
        },
        {
          id: 'monitoring_active',
          title: 'Monitoring Active',
          description: 'Performance monitoring and optimization in place',
          isRequired: true,
          order: 4
        },
        {
          id: 'handoff_complete',
          title: 'Handoff Complete',
          description: 'Onboarding completed, client transitioned to active status',
          isRequired: true,
          order: 5
        }
      ]
    }
  ];

  const createdPhases: OnboardingPhaseWithTasks[] = [];

  for (const phaseData of defaultPhases) {
    const phase = await createOnboardingPhase(phaseData);
    createdPhases.push(phase);
  }

  return createdPhases;
}

/**
 * Validate task completion for a phase
 * Returns true if all required tasks are completed
 */
export function validatePhaseCompletion(
  phaseTasks: OnboardingTaskDefinition[],
  completedTaskIds: string[]
): { isComplete: boolean; missingTasks: string[] } {
  const requiredTasks = phaseTasks.filter((t) => t.isRequired);
  const missingTasks = requiredTasks
    .filter((t) => !completedTaskIds.includes(t.id))
    .map((t) => t.title);

  return {
    isComplete: missingTasks.length === 0,
    missingTasks
  };
}

/**
 * Calculate progress percentage for a phase
 */
export function calculatePhaseProgress(
  phaseTasks: OnboardingTaskDefinition[],
  completedTaskIds: string[]
): number {
  if (phaseTasks.length === 0) return 100;

  const completedCount = phaseTasks.filter((t) => completedTaskIds.includes(t.id)).length;
  return Math.round((completedCount / phaseTasks.length) * 100);
}

/**
 * Get estimated completion date based on remaining phases
 */
export async function getEstimatedCompletionDate(
  currentPhase: number,
  startDate: Date = new Date()
): Promise<Date> {
  const phases = await getOnboardingPhases();

  const remainingDays = phases
    .filter((p) => p.phase >= currentPhase)
    .reduce((sum, p) => sum + p.defaultDays, 0);

  const completionDate = new Date(startDate);
  completionDate.setDate(completionDate.getDate() + remainingDays);

  return completionDate;
}
