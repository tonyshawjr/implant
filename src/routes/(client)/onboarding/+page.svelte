<script lang="ts">
  import { Card, Button, Badge, Progressbar, Alert } from 'flowbite-svelte';
  import {
    RocketOutline,
    CalendarMonthOutline,
    ClockOutline,
    CheckCircleSolid,
    ArrowRightOutline,
    UserHeadsetOutline,
    BookOpenOutline,
    InfoCircleOutline
  } from 'flowbite-svelte-icons';
  import ClientOnboardingProgress from '$lib/components/onboarding/ClientOnboardingProgress.svelte';

  interface Props {
    data: {
      organization: { name: string } | null;
      onboarding: {
        id: string;
        currentPhase: number;
        overallProgress: number;
        startedAt: string;
        completedAt: string | null;
        assignee: { name: string; email: string } | null;
        notes: string | null;
      } | null;
      phases: Array<{
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
      }>;
      overallProgress: number;
      estimatedLaunchDate: string | null;
      daysRemaining: number | null;
      nextTasks: Array<{
        id: string;
        title: string;
        description?: string;
        completed: boolean;
        isRequired: boolean;
        phase: number;
        phaseName: string;
      }>;
    };
  }

  let { data }: Props = $props();

  function formatDate(dateString: string | null | undefined): string {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
  }

  function getProgressMessage(progress: number): string {
    if (progress >= 100) return 'Congratulations! Your onboarding is complete.';
    if (progress >= 75) return 'Almost there! Just a few more steps to launch.';
    if (progress >= 50) return 'Great progress! You are halfway to launch.';
    if (progress >= 25) return 'Good start! Keep going to unlock your campaigns.';
    return 'Welcome! Let us get your account set up.';
  }

  function handleTaskClick(phaseNumber: number, taskId: string) {
    // Navigate to appropriate page based on task
    // This could be expanded to route to specific setup pages
    console.log(`Task clicked: Phase ${phaseNumber}, Task ${taskId}`);
  }
</script>

<svelte:head>
  <title>Onboarding | {data.organization?.name ?? 'Dashboard'}</title>
</svelte:head>

<div class="space-y-6">
  <!-- Page Header -->
  <div>
    <h1 class="text-2xl font-bold text-gray-900 dark:text-white">
      Welcome to SqueezMedia
      {#if data.organization}
        , {data.organization.name}
      {/if}
    </h1>
    <p class="mt-1 text-gray-600 dark:text-gray-400">
      {getProgressMessage(data.overallProgress)}
    </p>
  </div>

  {#if !data.onboarding}
    <!-- No onboarding record -->
    <Alert color="yellow">
      <InfoCircleOutline slot="icon" class="h-5 w-5" />
      <span class="font-medium">Onboarding not started.</span>
      Your onboarding process has not been initiated yet. Please contact support if you believe this is an error.
    </Alert>
  {:else}
    <!-- Progress Overview Cards -->
    <div class="grid gap-4 md:grid-cols-3">
      <!-- Overall Progress Card -->
      <Card class="relative overflow-hidden">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm font-medium text-gray-500 dark:text-gray-400">Overall Progress</p>
            <p class="mt-1 text-3xl font-bold text-gray-900 dark:text-white">
              {data.overallProgress}%
            </p>
          </div>
          <div class="rounded-full bg-primary-100 p-3 dark:bg-primary-900">
            <RocketOutline class="h-6 w-6 text-primary-600 dark:text-primary-400" />
          </div>
        </div>
        <div class="mt-4">
          <Progressbar
            progress={String(data.overallProgress)}
            size="h-2"
            color={data.overallProgress >= 100 ? 'green' : 'blue'}
          />
        </div>
        {#if data.overallProgress >= 100}
          <div class="mt-2 flex items-center gap-1 text-sm text-green-600 dark:text-green-400">
            <CheckCircleSolid class="h-4 w-4" />
            <span>Complete</span>
          </div>
        {/if}
      </Card>

      <!-- Estimated Launch Date Card -->
      <Card>
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm font-medium text-gray-500 dark:text-gray-400">Estimated Launch</p>
            <p class="mt-1 text-lg font-semibold text-gray-900 dark:text-white">
              {#if data.overallProgress >= 100}
                Launched!
              {:else if data.estimatedLaunchDate}
                {formatDate(data.estimatedLaunchDate)}
              {:else}
                TBD
              {/if}
            </p>
          </div>
          <div class="rounded-full bg-green-100 p-3 dark:bg-green-900">
            <CalendarMonthOutline class="h-6 w-6 text-green-600 dark:text-green-400" />
          </div>
        </div>
        {#if data.daysRemaining !== null && data.overallProgress < 100}
          <p class="mt-3 text-sm text-gray-500 dark:text-gray-400">
            {data.daysRemaining} days remaining
          </p>
        {/if}
      </Card>

      <!-- Current Phase Card -->
      <Card>
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm font-medium text-gray-500 dark:text-gray-400">Current Phase</p>
            <p class="mt-1 text-lg font-semibold text-gray-900 dark:text-white">
              {#if data.overallProgress >= 100}
                Complete
              {:else}
                Phase {data.onboarding.currentPhase} of 4
              {/if}
            </p>
          </div>
          <div class="rounded-full bg-yellow-100 p-3 dark:bg-yellow-900">
            <ClockOutline class="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
          </div>
        </div>
        {#if data.phases.length > 0}
          {@const currentPhaseData = data.phases.find(p => p.phase === data.onboarding?.currentPhase)}
          {#if currentPhaseData}
            <p class="mt-3 text-sm text-gray-500 dark:text-gray-400">
              {currentPhaseData.phaseName}
            </p>
          {/if}
        {/if}
      </Card>
    </div>

    <!-- Main Content Grid -->
    <div class="grid gap-6 lg:grid-cols-3">
      <!-- Onboarding Timeline (Main Column) -->
      <div class="lg:col-span-2">
        <Card>
          <div class="mb-4 flex items-center justify-between">
            <h2 class="text-lg font-semibold text-gray-900 dark:text-white">
              Onboarding Progress
            </h2>
            {#if data.onboarding.startedAt}
              <span class="text-sm text-gray-500 dark:text-gray-400">
                Started {formatDate(data.onboarding.startedAt)}
              </span>
            {/if}
          </div>

          <ClientOnboardingProgress
            phases={data.phases}
            currentPhase={data.onboarding.currentPhase}
            onTaskClick={handleTaskClick}
          />
        </Card>
      </div>

      <!-- Sidebar -->
      <div class="space-y-6">
        <!-- Next Steps Card -->
        {#if data.nextTasks.length > 0}
          <Card>
            <h3 class="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
              Up Next
            </h3>
            <ul class="space-y-3">
              {#each data.nextTasks as task (task.id)}
                <li class="flex items-start gap-3 rounded-lg bg-gray-50 p-3 dark:bg-gray-800">
                  <div class="flex-shrink-0">
                    <div class="flex h-6 w-6 items-center justify-center rounded-full bg-primary-100 text-xs font-medium text-primary-600 dark:bg-primary-900 dark:text-primary-400">
                      {task.phase}
                    </div>
                  </div>
                  <div class="flex-1 min-w-0">
                    <p class="text-sm font-medium text-gray-900 dark:text-white">
                      {task.title}
                    </p>
                    <p class="text-xs text-gray-500 dark:text-gray-400">
                      {task.phaseName}
                    </p>
                  </div>
                </li>
              {/each}
            </ul>
          </Card>
        {/if}

        <!-- Assigned Specialist Card -->
        {#if data.onboarding.assignee}
          <Card>
            <h3 class="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
              Your Onboarding Specialist
            </h3>
            <div class="flex items-center gap-3">
              <div class="flex h-12 w-12 items-center justify-center rounded-full bg-primary-100 dark:bg-primary-900">
                <UserHeadsetOutline class="h-6 w-6 text-primary-600 dark:text-primary-400" />
              </div>
              <div>
                <p class="font-medium text-gray-900 dark:text-white">
                  {data.onboarding.assignee.name}
                </p>
                <p class="text-sm text-gray-500 dark:text-gray-400">
                  {data.onboarding.assignee.email}
                </p>
              </div>
            </div>
            <Button href="/support" color="light" class="mt-4 w-full">
              Contact Support
              <ArrowRightOutline class="ml-2 h-4 w-4" />
            </Button>
          </Card>
        {/if}

        <!-- Resources Card -->
        <Card>
          <h3 class="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
            Helpful Resources
          </h3>
          <ul class="space-y-2">
            <li>
              <a
                href="/support/knowledge-base"
                class="flex items-center gap-2 rounded-lg p-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
              >
                <BookOpenOutline class="h-4 w-4" />
                Knowledge Base
              </a>
            </li>
            <li>
              <a
                href="/support"
                class="flex items-center gap-2 rounded-lg p-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
              >
                <UserHeadsetOutline class="h-4 w-4" />
                Support Center
              </a>
            </li>
          </ul>
        </Card>

        <!-- Notes Card -->
        {#if data.onboarding.notes}
          <Card>
            <h3 class="mb-2 text-lg font-semibold text-gray-900 dark:text-white">
              Notes from Your Team
            </h3>
            <p class="text-sm text-gray-600 dark:text-gray-400">
              {data.onboarding.notes}
            </p>
          </Card>
        {/if}
      </div>
    </div>
  {/if}
</div>
