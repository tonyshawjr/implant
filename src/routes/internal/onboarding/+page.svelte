<script lang="ts">
  import {
    Card, Badge, Button, Modal, Textarea, Select, Label,
    Progressbar, Avatar, Drawer, Checkbox, Accordion, AccordionItem
  } from 'flowbite-svelte';
  import {
    UsersGroupOutline,
    ClockOutline,
    CheckCircleOutline,
    ExclamationCircleOutline,
    ChevronRightOutline,
    BuildingOutline,
    UserOutline,
    EnvelopeOutline,
    PhoneOutline,
    FlagOutline,
    CloseOutline,
    FileCheckOutline
  } from 'flowbite-svelte-icons';
  import { enhance } from '$app/forms';
  import { formatDate, getRelativeTime } from '$lib/utils';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();

  // UI State
  let showOnboardingDrawer = $state(false);
  let showCompleteModal = $state(false);
  let selectedOnboarding = $state<any>(null);
  let isSubmitting = $state(false);

  // Phase colors
  const phaseColors: Record<number, { bg: string; text: string; border: string }> = {
    1: { bg: 'bg-gray-100 dark:bg-gray-800', text: 'text-gray-600 dark:text-gray-300', border: 'border-gray-400' },
    2: { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-600 dark:text-blue-400', border: 'border-blue-500' },
    3: { bg: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-purple-600 dark:text-purple-400', border: 'border-purple-500' },
    4: { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-600 dark:text-green-400', border: 'border-green-500' }
  };

  // Phase status colors
  const phaseStatusColors: Record<string, 'gray' | 'blue' | 'yellow' | 'green'> = {
    pending: 'gray',
    in_progress: 'blue',
    completed: 'green'
  };

  // Open onboarding detail
  function openOnboardingDetail(onboarding: any) {
    selectedOnboarding = onboarding;
    showOnboardingDrawer = true;
  }

  // Get phase status label
  function getPhaseStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      pending: 'Pending',
      in_progress: 'In Progress',
      completed: 'Completed'
    };
    return labels[status] || status;
  }

  // Check if phase can be advanced
  function canAdvancePhase(onboarding: any): boolean {
    const currentPhase = onboarding.phases[onboarding.currentPhase - 1];
    if (!currentPhase) return false;

    // Check if all required tasks in current phase are completed
    const currentPhaseTasks = onboarding.tasks.filter((t: any) => t.phase === onboarding.currentPhase);
    const requiredTasks = currentPhaseTasks.filter((t: any) => t.isRequired);
    const completedRequired = requiredTasks.filter((t: any) => t.status === 'completed');

    return completedRequired.length === requiredTasks.length && onboarding.currentPhase < 4;
  }

  // Check if onboarding can be completed
  function canCompleteOnboarding(onboarding: any): boolean {
    if (onboarding.currentPhase !== 4) return false;

    const phase4Tasks = onboarding.tasks.filter((t: any) => t.phase === 4);
    const requiredTasks = phase4Tasks.filter((t: any) => t.isRequired);
    const completedRequired = requiredTasks.filter((t: any) => t.status === 'completed');

    return completedRequired.length === requiredTasks.length;
  }

  // Get progress bar color
  function getProgressColor(progress: number): 'gray' | 'red' | 'yellow' | 'blue' | 'green' {
    if (progress >= 100) return 'green';
    if (progress >= 75) return 'blue';
    if (progress >= 50) return 'yellow';
    if (progress >= 25) return 'red';
    return 'gray';
  }
</script>

<div class="space-y-6">
  <!-- Page Header -->
  <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
    <div>
      <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Onboarding Management</h1>
      <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
        Track and manage client onboarding progress
      </p>
    </div>
  </div>

  <!-- Stats Cards -->
  <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
    <Card class="p-4">
      <div class="flex items-center gap-3">
        <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900">
          <UsersGroupOutline class="h-5 w-5 text-blue-600 dark:text-blue-300" />
        </div>
        <div>
          <p class="text-sm text-gray-500 dark:text-gray-400">In Progress</p>
          <p class="text-xl font-bold text-gray-900 dark:text-white">{data.stats.inProgress}</p>
        </div>
      </div>
    </Card>

    <Card class="p-4">
      <div class="flex items-center gap-3">
        <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900">
          <CheckCircleOutline class="h-5 w-5 text-green-600 dark:text-green-300" />
        </div>
        <div>
          <p class="text-sm text-gray-500 dark:text-gray-400">Completed (MTD)</p>
          <p class="text-xl font-bold text-gray-900 dark:text-white">{data.stats.completedThisMonth}</p>
        </div>
      </div>
    </Card>

    <Card class="p-4">
      <div class="flex items-center gap-3">
        <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100 dark:bg-purple-900">
          <ClockOutline class="h-5 w-5 text-purple-600 dark:text-purple-300" />
        </div>
        <div>
          <p class="text-sm text-gray-500 dark:text-gray-400">Avg Completion</p>
          <p class="text-xl font-bold text-gray-900 dark:text-white">
            {data.stats.avgCompletionDays} days
          </p>
        </div>
      </div>
    </Card>

    <Card class="p-4">
      <div class="flex items-center gap-3">
        <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-yellow-100 dark:bg-yellow-900">
          <ExclamationCircleOutline class="h-5 w-5 text-yellow-600 dark:text-yellow-300" />
        </div>
        <div>
          <p class="text-sm text-gray-500 dark:text-gray-400">Delayed</p>
          <p class="text-xl font-bold text-yellow-600 dark:text-yellow-400">{data.stats.delayed}</p>
        </div>
      </div>
    </Card>

    <Card class="p-4">
      <div class="flex items-center gap-3">
        <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-800">
          <FlagOutline class="h-5 w-5 text-gray-600 dark:text-gray-300" />
        </div>
        <div>
          <p class="text-sm text-gray-500 dark:text-gray-400">Target Days</p>
          <p class="text-xl font-bold text-gray-900 dark:text-white">14</p>
        </div>
      </div>
    </Card>
  </div>

  <!-- Onboarding Pipeline -->
  <div class="grid gap-4 lg:grid-cols-4">
    {#each data.phaseDefinitions as phaseDef}
      {@const phaseOnboardings = data.onboardingsByPhase[phaseDef.phase as keyof typeof data.onboardingsByPhase] || []}
      {@const phaseCount = data.stats.byPhase[phaseDef.phase as keyof typeof data.stats.byPhase] || 0}

      <div class="space-y-3">
        <!-- Phase Header -->
        <div class="rounded-lg p-3 {phaseColors[phaseDef.phase].bg}">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <span class="flex h-6 w-6 items-center justify-center rounded-full bg-white text-sm font-bold {phaseColors[phaseDef.phase].text} shadow-sm dark:bg-gray-700">
                {phaseDef.phase}
              </span>
              <h3 class="font-semibold {phaseColors[phaseDef.phase].text}">
                {phaseDef.name}
              </h3>
            </div>
            <Badge color="gray">{phaseCount}</Badge>
          </div>
          <p class="mt-1 text-xs {phaseColors[phaseDef.phase].text} opacity-80">
            {phaseDef.description}
          </p>
        </div>

        <!-- Onboarding Cards -->
        <div class="min-h-64 space-y-3">
          {#each phaseOnboardings as onboarding}
            <Card
              class="cursor-pointer p-3 transition-shadow hover:shadow-md {onboarding.isDelayed ? 'border-l-4 border-l-yellow-500' : ''}"
              onclick={() => openOnboardingDetail(onboarding)}
            >
              <!-- Client Name -->
              <div class="mb-2 flex items-start justify-between">
                <h4 class="font-medium text-gray-900 dark:text-white">
                  {onboarding.organization.name}
                </h4>
                {#if onboarding.isDelayed}
                  <Badge color="yellow" class="text-xs">Delayed</Badge>
                {/if}
              </div>

              <!-- Phase Progress Bar -->
              <div class="mb-3">
                <div class="mb-1 flex justify-between text-xs">
                  <span class="text-gray-500 dark:text-gray-400">
                    Phase {onboarding.currentPhase} Progress
                  </span>
                  <span class="font-medium text-gray-700 dark:text-gray-300">
                    {onboarding.phases[onboarding.currentPhase - 1]?.progress || 0}%
                  </span>
                </div>
                <Progressbar
                  progress={onboarding.phases[onboarding.currentPhase - 1]?.progress || 0}
                  size="h-1.5"
                  color={getProgressColor(onboarding.phases[onboarding.currentPhase - 1]?.progress || 0)}
                />
              </div>

              <!-- Overall Progress -->
              <div class="mb-2 text-xs text-gray-500 dark:text-gray-400">
                Overall: {onboarding.overallProgress}% complete
              </div>

              <!-- Footer -->
              <div class="flex items-center justify-between border-t border-gray-200 pt-2 dark:border-gray-700">
                <!-- Assigned Specialist -->
                {#if onboarding.assignedTo}
                  <div class="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                    <Avatar size="xs" class="h-5 w-5">
                      {onboarding.assignedTo.name.split(' ').map((n: string) => n[0]).join('')}
                    </Avatar>
                    <span>{onboarding.assignedTo.name.split(' ')[0]}</span>
                  </div>
                {:else}
                  <span class="text-xs text-gray-400">Unassigned</span>
                {/if}

                <!-- Days in onboarding -->
                <span class="text-xs {onboarding.isDelayed ? 'font-medium text-yellow-600 dark:text-yellow-400' : 'text-gray-400'}">
                  Day {onboarding.daysInOnboarding}
                </span>
              </div>
            </Card>
          {/each}

          {#if phaseOnboardings.length === 0}
            <div class="flex h-32 items-center justify-center rounded-lg border-2 border-dashed border-gray-200 text-sm text-gray-400 dark:border-gray-700">
              No clients in this phase
            </div>
          {/if}
        </div>
      </div>
    {/each}
  </div>
</div>

<!-- Onboarding Detail Drawer -->
<Drawer
  bind:open={showOnboardingDrawer}
  placement="right"
  class="w-full p-0 sm:w-[560px]"
>
  {#if selectedOnboarding}
    <div class="flex h-full flex-col">
      <!-- Header -->
      <div class="flex items-center justify-between border-b border-gray-200 p-4 dark:border-gray-700">
        <div>
          <div class="flex items-center gap-2">
            <h2 class="text-lg font-semibold text-gray-900 dark:text-white">
              {selectedOnboarding.organization.name}
            </h2>
            {#if selectedOnboarding.isDelayed}
              <Badge color="yellow">Delayed</Badge>
            {/if}
          </div>
          <p class="text-sm text-gray-500">
            Day {selectedOnboarding.daysInOnboarding} of onboarding
          </p>
        </div>
        <Button color="light" size="sm" onclick={() => showOnboardingDrawer = false}>
          <CloseOutline class="h-5 w-5" />
        </Button>
      </div>

      <!-- Content -->
      <div class="flex-1 overflow-y-auto">
        <!-- Contact Info -->
        <div class="border-b border-gray-200 p-4 dark:border-gray-700">
          <h3 class="mb-3 font-medium text-gray-900 dark:text-white">Contact Information</h3>
          <div class="space-y-2 text-sm">
            {#if selectedOnboarding.organization.email}
              <div class="flex items-center gap-2">
                <EnvelopeOutline class="h-4 w-4 text-gray-400" />
                <a href="mailto:{selectedOnboarding.organization.email}" class="text-primary-600 hover:underline">
                  {selectedOnboarding.organization.email}
                </a>
              </div>
            {/if}
            {#if selectedOnboarding.organization.phone}
              <div class="flex items-center gap-2">
                <PhoneOutline class="h-4 w-4 text-gray-400" />
                <a href="tel:{selectedOnboarding.organization.phone}" class="text-primary-600 hover:underline">
                  {selectedOnboarding.organization.phone}
                </a>
              </div>
            {/if}
          </div>

          <!-- Assign Specialist -->
          <div class="mt-4">
            <form
              method="POST"
              action="?/assignSpecialist"
              use:enhance={() => {
                return async ({ update }) => {
                  await update();
                };
              }}
              class="flex items-center gap-2"
            >
              <input type="hidden" name="onboardingId" value={selectedOnboarding.id} />
              <Select name="assignedTo" size="sm" class="flex-1">
                <option value="">Assign specialist...</option>
                {#each data.specialists as specialist}
                  <option value={specialist.id} selected={selectedOnboarding.assignedTo?.id === specialist.id}>
                    {specialist.name}
                  </option>
                {/each}
              </Select>
              <Button type="submit" size="xs">Update</Button>
            </form>
          </div>
        </div>

        <!-- Phase Progress Overview -->
        <div class="border-b border-gray-200 p-4 dark:border-gray-700">
          <h3 class="mb-3 font-medium text-gray-900 dark:text-white">Phase Progress</h3>
          <div class="flex items-center gap-1">
            {#each selectedOnboarding.phases as phase, i}
              <div class="flex-1">
                <div
                  class="h-2 rounded-full {phase.status === 'completed' ? 'bg-green-500' : phase.status === 'in_progress' ? 'bg-blue-500' : 'bg-gray-200 dark:bg-gray-700'}"
                ></div>
              </div>
              {#if i < selectedOnboarding.phases.length - 1}
                <ChevronRightOutline class="h-4 w-4 flex-shrink-0 text-gray-300" />
              {/if}
            {/each}
          </div>
          <div class="mt-2 flex justify-between text-xs text-gray-500">
            {#each data.phaseDefinitions as phaseDef}
              <span class="text-center" style="width: 23%">{phaseDef.name}</span>
            {/each}
          </div>
        </div>

        <!-- Task Checklist by Phase -->
        <div class="p-4">
          <h3 class="mb-3 font-medium text-gray-900 dark:text-white">Tasks Checklist</h3>

          <Accordion>
            {#each data.phaseDefinitions as phaseDef}
              {@const phaseTasks = selectedOnboarding.tasks.filter((t: any) => t.phase === phaseDef.phase)}
              {@const completedCount = phaseTasks.filter((t: any) => t.status === 'completed').length}
              {@const phaseData = selectedOnboarding.phases[phaseDef.phase - 1]}

              <AccordionItem open={selectedOnboarding.currentPhase === phaseDef.phase}>
                {#snippet header()}
                  <div class="flex w-full items-center justify-between pr-4">
                    <div class="flex items-center gap-2">
                      <span class="flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold {phaseColors[phaseDef.phase].bg} {phaseColors[phaseDef.phase].text}">
                        {phaseDef.phase}
                      </span>
                      <span class="font-medium">{phaseDef.name}</span>
                    </div>
                    <div class="flex items-center gap-2">
                      <Badge color={phaseStatusColors[phaseData.status]}>
                        {getPhaseStatusLabel(phaseData.status)}
                      </Badge>
                      <span class="text-sm text-gray-500">
                        {completedCount}/{phaseTasks.length}
                      </span>
                    </div>
                  </div>
                {/snippet}

                <div class="space-y-2 pt-2">
                  {#each phaseTasks as task}
                    <div class="flex items-center gap-3 rounded-lg border border-gray-200 p-2 dark:border-gray-700 {task.status === 'completed' ? 'bg-green-50 dark:bg-green-900/10' : ''}">
                      {#if task.status === 'completed'}
                        <form
                          method="POST"
                          action="?/uncompleteTask"
                          use:enhance={() => {
                            return async ({ update }) => {
                              await update();
                            };
                          }}
                        >
                          <input type="hidden" name="taskId" value={task.id} />
                          <input type="hidden" name="onboardingId" value={selectedOnboarding.id} />
                          <button type="submit" class="text-green-600 hover:text-green-700">
                            <CheckCircleOutline class="h-5 w-5" />
                          </button>
                        </form>
                      {:else}
                        <form
                          method="POST"
                          action="?/completeTask"
                          use:enhance={() => {
                            return async ({ update }) => {
                              await update();
                            };
                          }}
                        >
                          <input type="hidden" name="taskId" value={task.id} />
                          <input type="hidden" name="onboardingId" value={selectedOnboarding.id} />
                          <button type="submit" class="text-gray-300 hover:text-green-600 dark:text-gray-600 dark:hover:text-green-500">
                            <CheckCircleOutline class="h-5 w-5" />
                          </button>
                        </form>
                      {/if}

                      <div class="flex-1">
                        <div class="flex items-center gap-2">
                          <span class="text-sm {task.status === 'completed' ? 'text-gray-500 line-through' : 'text-gray-900 dark:text-white'}">
                            {task.title}
                          </span>
                          {#if task.isRequired}
                            <span class="text-xs text-red-500">*</span>
                          {/if}
                        </div>
                        {#if task.completedAt}
                          <p class="text-xs text-gray-400">
                            Completed {getRelativeTime(task.completedAt)}
                            {#if task.completedBy}
                              by {task.completedBy}
                            {/if}
                          </p>
                        {/if}
                      </div>
                    </div>
                  {/each}
                </div>
              </AccordionItem>
            {/each}
          </Accordion>
        </div>

        <!-- Notes -->
        <div class="border-t border-gray-200 p-4 dark:border-gray-700">
          <h3 class="mb-3 font-medium text-gray-900 dark:text-white">Notes</h3>
          <form
            method="POST"
            action="?/updateNotes"
            use:enhance={() => {
              isSubmitting = true;
              return async ({ update }) => {
                isSubmitting = false;
                await update();
              };
            }}
            class="space-y-2"
          >
            <input type="hidden" name="onboardingId" value={selectedOnboarding.id} />
            <Textarea
              name="notes"
              rows={3}
              value={selectedOnboarding.notes || ''}
              placeholder="Add notes about this onboarding..."
            />
            <div class="flex justify-end">
              <Button type="submit" size="xs" disabled={isSubmitting}>
                {isSubmitting ? 'Saving...' : 'Save Notes'}
              </Button>
            </div>
          </form>
        </div>
      </div>

      <!-- Actions Footer -->
      <div class="border-t border-gray-200 p-4 dark:border-gray-700">
        <div class="flex flex-wrap gap-2">
          {#if canAdvancePhase(selectedOnboarding)}
            <form
              method="POST"
              action="?/advancePhase"
              use:enhance={() => {
                isSubmitting = true;
                return async ({ result, update }) => {
                  isSubmitting = false;
                  if (result.type === 'success') {
                    await update();
                  }
                };
              }}
            >
              <input type="hidden" name="onboardingId" value={selectedOnboarding.id} />
              <Button type="submit" size="sm" disabled={isSubmitting}>
                <ChevronRightOutline class="mr-1 h-4 w-4" />
                {isSubmitting ? 'Advancing...' : `Advance to Phase ${selectedOnboarding.currentPhase + 1}`}
              </Button>
            </form>
          {/if}

          {#if canCompleteOnboarding(selectedOnboarding)}
            <Button size="sm" color="green" onclick={() => showCompleteModal = true}>
              <FileCheckOutline class="mr-1 h-4 w-4" />
              Complete Onboarding
            </Button>
          {/if}
        </div>
      </div>
    </div>
  {/if}
</Drawer>

<!-- Complete Onboarding Modal -->
<Modal title="Complete Onboarding" bind:open={showCompleteModal} size="md">
  {#if selectedOnboarding}
    <div class="space-y-4">
      <div class="rounded-lg bg-green-50 p-4 dark:bg-green-900/30">
        <div class="flex items-center gap-3">
          <CheckCircleOutline class="h-8 w-8 text-green-600 dark:text-green-400" />
          <div>
            <p class="font-medium text-green-800 dark:text-green-300">
              Ready to complete onboarding
            </p>
            <p class="text-sm text-green-600 dark:text-green-400">
              All required tasks have been completed for {selectedOnboarding.organization.name}.
            </p>
          </div>
        </div>
      </div>

      <p class="text-sm text-gray-600 dark:text-gray-400">
        Completing onboarding will:
      </p>
      <ul class="list-inside list-disc space-y-1 text-sm text-gray-600 dark:text-gray-400">
        <li>Mark the client as fully onboarded</li>
        <li>Remove them from the onboarding pipeline</li>
        <li>Begin normal account management</li>
      </ul>

      <form
        method="POST"
        action="?/completeOnboarding"
        use:enhance={() => {
          isSubmitting = true;
          return async ({ result, update }) => {
            isSubmitting = false;
            if (result.type === 'success') {
              showCompleteModal = false;
              showOnboardingDrawer = false;
              await update();
            }
          };
        }}
      >
        <input type="hidden" name="onboardingId" value={selectedOnboarding.id} />

        <div class="flex justify-end gap-3">
          <Button color="light" onclick={() => showCompleteModal = false}>Cancel</Button>
          <Button type="submit" color="green" disabled={isSubmitting}>
            {isSubmitting ? 'Completing...' : 'Complete Onboarding'}
          </Button>
        </div>
      </form>
    </div>
  {/if}
</Modal>
