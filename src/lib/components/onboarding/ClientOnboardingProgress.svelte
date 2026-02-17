<script lang="ts">
  import { Card, Timeline, TimelineItem, Progressbar, Badge, Button, Checkbox } from 'flowbite-svelte';
  import {
    CheckCircleSolid,
    ClockOutline,
    RocketOutline,
    UserAddOutline,
    LightbulbOutline,
    CogOutline,
    FlagSolid,
    ArrowRightOutline
  } from 'flowbite-svelte-icons';

  interface Task {
    id: string;
    title: string;
    description?: string;
    completed: boolean;
    isRequired: boolean;
  }

  interface Phase {
    phase: number;
    phaseName: string;
    description?: string | null;
    status: 'pending' | 'in_progress' | 'completed';
    progress: number;
    tasks: Task[];
    startedAt?: string | null;
    completedAt?: string | null;
    dueDate?: string | null;
  }

  interface Props {
    phases: Phase[];
    currentPhase?: number;
    onTaskClick?: (phaseNumber: number, taskId: string) => void;
  }

  let { phases, currentPhase = 1, onTaskClick }: Props = $props();

  const phaseIcons: Record<number, typeof CheckCircleSolid> = {
    1: UserAddOutline,
    2: LightbulbOutline,
    3: CogOutline,
    4: RocketOutline
  };

  function getPhaseIcon(phase: number) {
    return phaseIcons[phase] || FlagSolid;
  }

  function getStatusColor(status: string): 'green' | 'primary' | 'gray' {
    switch (status) {
      case 'completed':
        return 'green';
      case 'in_progress':
        return 'primary';
      default:
        return 'gray';
    }
  }

  function getStatusBadgeColor(status: string): 'green' | 'yellow' | 'gray' {
    switch (status) {
      case 'completed':
        return 'green';
      case 'in_progress':
        return 'yellow';
      default:
        return 'gray';
    }
  }

  function formatDate(dateString: string | null | undefined): string {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  }

  function getProgressColor(progress: number): 'green' | 'yellow' | 'blue' | 'gray' {
    if (progress >= 100) return 'green';
    if (progress >= 50) return 'blue';
    if (progress > 0) return 'yellow';
    return 'gray';
  }

  function handleTaskClick(phaseNumber: number, taskId: string) {
    if (onTaskClick) {
      onTaskClick(phaseNumber, taskId);
    }
  }
</script>

<div class="space-y-6">
  <Timeline order="vertical">
    {#each phases as phase, index (phase.phase)}
      {@const IconComponent = getPhaseIcon(phase.phase)}
      {@const isCurrentPhase = phase.phase === currentPhase}
      {@const isLastPhase = index === phases.length - 1}
      {@const statusColor = getStatusColor(phase.status)}

      <TimelineItem
        title={phase.phaseName}
        date={phase.dueDate ? `Due: ${formatDate(phase.dueDate)}` : ''}
        color={statusColor}
        isLast={isLastPhase}
      >
        {#snippet orientationSlot()}
          <span
            class="absolute -left-4 flex h-8 w-8 items-center justify-center rounded-full ring-8 ring-white dark:ring-gray-900
              {phase.status === 'completed'
              ? 'bg-green-200 dark:bg-green-900'
              : phase.status === 'in_progress'
                ? 'bg-primary-200 dark:bg-primary-900'
                : 'bg-gray-200 dark:bg-gray-700'}"
          >
            {#if phase.status === 'completed'}
              <CheckCircleSolid
                class="h-4 w-4 text-green-600 dark:text-green-400"
              />
            {:else if phase.status === 'in_progress'}
              <IconComponent
                class="h-4 w-4 text-primary-600 dark:text-primary-400"
              />
            {:else}
              <ClockOutline
                class="h-4 w-4 text-gray-500 dark:text-gray-400"
              />
            {/if}
          </span>
        {/snippet}

        <div class="ml-4">
          <!-- Phase Header -->
          <div class="mb-3 flex items-center gap-3">
            <Badge color={getStatusBadgeColor(phase.status)} class="capitalize">
              {phase.status === 'in_progress' ? 'In Progress' : phase.status}
            </Badge>
            {#if isCurrentPhase && phase.status !== 'completed'}
              <Badge color="primary" rounded>Current Phase</Badge>
            {/if}
          </div>

          <!-- Phase Description -->
          {#if phase.description}
            <p class="mb-3 text-sm text-gray-600 dark:text-gray-400">
              {phase.description}
            </p>
          {/if}

          <!-- Progress Bar -->
          <div class="mb-4">
            <div class="mb-1 flex justify-between text-sm">
              <span class="text-gray-600 dark:text-gray-400">Progress</span>
              <span class="font-medium text-gray-900 dark:text-white">{phase.progress}%</span>
            </div>
            <Progressbar
              progress={String(phase.progress)}
              size="h-2"
              color={getProgressColor(phase.progress)}
            />
          </div>

          <!-- Tasks Card -->
          <Card class="mt-3 p-4">
            <h4 class="mb-3 text-sm font-semibold text-gray-900 dark:text-white">
              Tasks ({phase.tasks.filter(t => t.completed).length}/{phase.tasks.length})
            </h4>
            <ul class="space-y-2">
              {#each phase.tasks as task (task.id)}
                <li class="flex items-start gap-3">
                  <div class="flex-shrink-0 pt-0.5">
                    {#if task.completed}
                      <CheckCircleSolid class="h-5 w-5 text-green-500" />
                    {:else}
                      <div
                        class="h-5 w-5 rounded-full border-2
                          {phase.status === 'in_progress'
                          ? 'border-primary-400 dark:border-primary-500'
                          : 'border-gray-300 dark:border-gray-600'}"
                      ></div>
                    {/if}
                  </div>
                  <div class="flex-1 min-w-0">
                    <button
                      type="button"
                      onclick={() => handleTaskClick(phase.phase, task.id)}
                      class="text-left w-full group"
                    >
                      <p
                        class="text-sm font-medium
                          {task.completed
                          ? 'text-gray-500 line-through dark:text-gray-400'
                          : 'text-gray-900 dark:text-white group-hover:text-primary-600 dark:group-hover:text-primary-400'}"
                      >
                        {task.title}
                        {#if task.isRequired}
                          <span class="text-red-500">*</span>
                        {/if}
                      </p>
                      {#if task.description && !task.completed}
                        <p class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                          {task.description}
                        </p>
                      {/if}
                    </button>
                  </div>
                </li>
              {/each}
            </ul>
          </Card>

          <!-- Phase Dates -->
          {#if phase.startedAt || phase.completedAt}
            <div class="mt-3 flex gap-4 text-xs text-gray-500 dark:text-gray-400">
              {#if phase.startedAt}
                <span>Started: {formatDate(phase.startedAt)}</span>
              {/if}
              {#if phase.completedAt}
                <span>Completed: {formatDate(phase.completedAt)}</span>
              {/if}
            </div>
          {/if}
        </div>
      </TimelineItem>
    {/each}
  </Timeline>
</div>
