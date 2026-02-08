<script lang="ts">
  import { Card, Badge, Button, Modal, Input, Textarea, Select, Label, Progressbar, Avatar, Drawer, Timeline, TimelineItem } from 'flowbite-svelte';
  import {
    PlusOutline,
    CurrencyDollarOutline,
    ChartPieOutline,
    TrophyOutline,
    UserOutline,
    PhoneOutline,
    EnvelopeOutline,
    MapPinOutline,
    CalendarMonthOutline,
    ClockOutline,
    DocumentTextOutline,
    ArrowRightOutline,
    ChevronDownOutline,
    BuildingOutline,
    GlobeAltOutline,
    XMarkOutline
  } from 'flowbite-svelte-icons';
  import { enhance } from '$app/forms';
  import { invalidateAll } from '$app/navigation';
  import { dndzone } from 'svelte-dnd-action';
  import { flip } from 'svelte/animate';
  import { formatCurrency, formatDate, getRelativeTime, getProspectStageColor } from '$lib/utils';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();

  // Local state for drag and drop
  let localProspectsByStage = $state<Record<string, any[]>>({ ...data.prospectsByStage });

  // Sync with server data
  $effect(() => {
    localProspectsByStage = { ...data.prospectsByStage };
  });

  // Modals
  let showNewProspectModal = $state(false);
  let showProspectDetailDrawer = $state(false);
  let showProposalModal = $state(false);
  let showReservationModal = $state(false);
  let showActivityModal = $state(false);

  // Selected prospect for detail view
  let selectedProspect = $state<any>(null);

  // Form states
  let isSubmitting = $state(false);

  // Stage labels for display
  const stageLabels: Record<string, string> = {
    new: 'New',
    qualified: 'Qualified',
    demo_scheduled: 'Demo Scheduled',
    proposal_sent: 'Proposal Sent',
    negotiation: 'Negotiation',
    closed_won: 'Closed Won',
    closed_lost: 'Closed Lost'
  };

  // Stage colors for Kanban columns
  const stageColors: Record<string, string> = {
    new: 'border-t-gray-400',
    qualified: 'border-t-blue-500',
    demo_scheduled: 'border-t-indigo-500',
    proposal_sent: 'border-t-cyan-500',
    negotiation: 'border-t-orange-500',
    closed_won: 'border-t-green-500',
    closed_lost: 'border-t-red-500'
  };

  // Handle drag and drop
  const flipDurationMs = 200;

  function handleDndConsider(stage: string, e: CustomEvent) {
    localProspectsByStage[stage] = e.detail.items;
    localProspectsByStage = { ...localProspectsByStage };
  }

  async function handleDndFinalize(stage: string, e: CustomEvent) {
    localProspectsByStage[stage] = e.detail.items;
    localProspectsByStage = { ...localProspectsByStage };

    // Find the moved item
    const movedItem = e.detail.items.find((item: any) =>
      item.stage !== stage
    );

    if (movedItem) {
      // Submit stage update
      const formData = new FormData();
      formData.append('prospectId', movedItem.id);
      formData.append('stage', stage);

      try {
        const response = await fetch('?/updateStage', {
          method: 'POST',
          body: formData
        });

        if (response.ok) {
          await invalidateAll();
        }
      } catch (error) {
        console.error('Failed to update stage:', error);
        // Revert on error
        localProspectsByStage = { ...data.prospectsByStage };
      }
    }
  }

  // Open prospect detail
  function openProspectDetail(prospect: any) {
    selectedProspect = prospect;
    showProspectDetailDrawer = true;
  }

  // Calculate weighted pipeline value
  const weightedPipelineValue = $derived(() => {
    let total = 0;
    for (const stage of data.stages) {
      if (stage !== 'closed_won' && stage !== 'closed_lost') {
        const prospects = localProspectsByStage[stage] || [];
        for (const p of prospects) {
          const value = p.monthlyValue || 0;
          const probability = p.probability || 50;
          total += value * (probability / 100);
        }
      }
    }
    return total;
  });

  // Activity type labels
  const activityTypeLabels: Record<string, string> = {
    call: 'Call',
    email: 'Email',
    meeting: 'Meeting',
    demo: 'Demo',
    proposal: 'Proposal',
    note: 'Note',
    stage_change: 'Stage Change'
  };
</script>

<div class="space-y-6">
  <!-- Page Header -->
  <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
    <div>
      <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Sales Pipeline</h1>
      <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
        Manage prospects and track deals through the sales process
      </p>
    </div>
    <Button size="sm" onclick={() => showNewProspectModal = true}>
      <PlusOutline class="mr-2 h-4 w-4" />
      Add Prospect
    </Button>
  </div>

  <!-- Sales Metrics Bar -->
  <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
    <Card class="p-4">
      <div class="flex items-center gap-3">
        <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-100 dark:bg-primary-900">
          <CurrencyDollarOutline class="h-5 w-5 text-primary-600 dark:text-primary-300" />
        </div>
        <div>
          <p class="text-sm text-gray-500 dark:text-gray-400">Pipeline Value</p>
          <p class="text-xl font-bold text-gray-900 dark:text-white">
            {formatCurrency(data.metrics.totalPipelineValue)}/mo
          </p>
        </div>
      </div>
    </Card>

    <Card class="p-4">
      <div class="flex items-center gap-3">
        <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-100 dark:bg-indigo-900">
          <ChartPieOutline class="h-5 w-5 text-indigo-600 dark:text-indigo-300" />
        </div>
        <div>
          <p class="text-sm text-gray-500 dark:text-gray-400">Weighted Value</p>
          <p class="text-xl font-bold text-gray-900 dark:text-white">
            {formatCurrency(weightedPipelineValue())}/mo
          </p>
        </div>
      </div>
    </Card>

    <Card class="p-4">
      <div class="flex items-center gap-3">
        <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900">
          <TrophyOutline class="h-5 w-5 text-green-600 dark:text-green-300" />
        </div>
        <div>
          <p class="text-sm text-gray-500 dark:text-gray-400">Conversion Rate</p>
          <p class="text-xl font-bold text-gray-900 dark:text-white">
            {data.metrics.conversionRate.toFixed(1)}%
          </p>
        </div>
      </div>
    </Card>

    <Card class="p-4">
      <div class="flex items-center gap-3">
        <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100 dark:bg-purple-900">
          <CurrencyDollarOutline class="h-5 w-5 text-purple-600 dark:text-purple-300" />
        </div>
        <div>
          <p class="text-sm text-gray-500 dark:text-gray-400">Avg Deal Size</p>
          <p class="text-xl font-bold text-gray-900 dark:text-white">
            {formatCurrency(data.metrics.avgDealSize)}/mo
          </p>
        </div>
      </div>
    </Card>

    <Card class="p-4">
      <div class="flex items-center gap-3">
        <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-100 dark:bg-cyan-900">
          <TrophyOutline class="h-5 w-5 text-cyan-600 dark:text-cyan-300" />
        </div>
        <div>
          <p class="text-sm text-gray-500 dark:text-gray-400">Won This Month</p>
          <p class="text-xl font-bold text-gray-900 dark:text-white">
            {data.metrics.closedWonThisMonth.count}
            <span class="text-sm font-normal text-gray-500">
              ({formatCurrency(data.metrics.closedWonThisMonth.value)})
            </span>
          </p>
        </div>
      </div>
    </Card>
  </div>

  <!-- Kanban Board -->
  <div class="overflow-x-auto pb-4">
    <div class="flex min-w-max gap-4">
      {#each data.stages as stage}
        {@const stageProspects = localProspectsByStage[stage] || []}
        {@const stageData = data.stageStats[stage] || { count: 0, value: 0 }}

        <div class="w-80 flex-shrink-0">
          <!-- Column Header -->
          <div class="mb-3 flex items-center justify-between rounded-lg bg-gray-50 p-3 dark:bg-gray-800">
            <div class="flex items-center gap-2">
              <h3 class="font-semibold text-gray-900 dark:text-white">
                {stageLabels[stage]}
              </h3>
              <Badge color="dark" class="text-xs">
                {stageData.count}
              </Badge>
            </div>
            {#if stage !== 'closed_won' && stage !== 'closed_lost'}
              <span class="text-xs text-gray-500 dark:text-gray-400">
                {formatCurrency(stageData.value)}/mo
              </span>
            {/if}
          </div>

          <!-- Column Content -->
          <div
            class="min-h-96 space-y-3 rounded-lg border-t-4 bg-gray-50 p-2 dark:bg-gray-800/50 {stageColors[stage]}"
            use:dndzone={{
              items: stageProspects,
              flipDurationMs,
              dropTargetStyle: { outline: '2px solid rgb(59, 130, 246)', outlineOffset: '-2px' }
            }}
            onconsider={(e) => handleDndConsider(stage, e)}
            onfinalize={(e) => handleDndFinalize(stage, e)}
          >
            {#each stageProspects as prospect (prospect.id)}
              <div animate:flip={{ duration: flipDurationMs }}>
                <!-- Prospect Card -->
                <Card
                  class="cursor-pointer p-3 transition-shadow hover:shadow-md"
                  onclick={() => openProspectDetail(prospect)}
                >
                  <!-- Practice Name -->
                  <div class="mb-2 flex items-start justify-between">
                    <h4 class="font-medium text-gray-900 dark:text-white">
                      {prospect.practiceName}
                    </h4>
                    {#if prospect.probability}
                      <Badge color="dark" class="text-xs">
                        {prospect.probability}%
                      </Badge>
                    {/if}
                  </div>

                  <!-- Contact Info -->
                  <p class="mb-2 text-sm text-gray-600 dark:text-gray-400">
                    {prospect.contactName}
                  </p>

                  <!-- Location -->
                  {#if prospect.location}
                    <div class="mb-2 flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                      <MapPinOutline class="h-3 w-3" />
                      {prospect.location}
                    </div>
                  {/if}

                  <!-- Value -->
                  {#if prospect.monthlyValue}
                    <div class="mb-2 flex items-center gap-1 text-sm font-semibold text-green-600 dark:text-green-400">
                      <CurrencyDollarOutline class="h-4 w-4" />
                      {formatCurrency(prospect.monthlyValue)}/mo
                    </div>
                  {/if}

                  <!-- Territory Reservation -->
                  {#if prospect.territoryReservation}
                    <div class="mb-2 rounded bg-yellow-50 p-1.5 text-xs dark:bg-yellow-900/30">
                      <div class="flex items-center gap-1 text-yellow-700 dark:text-yellow-400">
                        <MapPinOutline class="h-3 w-3" />
                        <span>Reserved: {prospect.territoryReservation.territoryName}</span>
                      </div>
                      <div class="mt-0.5 text-yellow-600 dark:text-yellow-500">
                        Expires {getRelativeTime(prospect.territoryReservation.expiresAt)}
                      </div>
                    </div>
                  {/if}

                  <!-- Footer -->
                  <div class="mt-2 flex items-center justify-between border-t border-gray-200 pt-2 dark:border-gray-700">
                    <!-- Assigned User -->
                    {#if prospect.assignedTo}
                      <div class="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                        <Avatar size="xs" class="h-5 w-5">
                          {prospect.assignedTo.name.split(' ').map((n: string) => n[0]).join('')}
                        </Avatar>
                        <span>{prospect.assignedTo.name.split(' ')[0]}</span>
                      </div>
                    {:else}
                      <span class="text-xs text-gray-400">Unassigned</span>
                    {/if}

                    <!-- Created Date -->
                    <span class="text-xs text-gray-400">
                      {getRelativeTime(prospect.createdAt)}
                    </span>
                  </div>
                </Card>
              </div>
            {/each}

            {#if stageProspects.length === 0}
              <div class="flex h-32 items-center justify-center text-sm text-gray-400">
                No prospects in this stage
              </div>
            {/if}
          </div>
        </div>
      {/each}
    </div>
  </div>
</div>

<!-- New Prospect Modal -->
<Modal title="Add New Prospect" bind:open={showNewProspectModal} size="lg">
  <form
    method="POST"
    action="?/createProspect"
    use:enhance={() => {
      isSubmitting = true;
      return async ({ result, update }) => {
        isSubmitting = false;
        if (result.type === 'success') {
          showNewProspectModal = false;
          await update();
        }
      };
    }}
    class="space-y-4"
  >
    <div class="grid gap-4 sm:grid-cols-2">
      <div>
        <Label for="practiceName">Practice Name *</Label>
        <Input id="practiceName" name="practiceName" required />
      </div>
      <div>
        <Label for="website">Website</Label>
        <Input id="website" name="website" type="url" placeholder="https://" />
      </div>
    </div>

    <div class="grid gap-4 sm:grid-cols-2">
      <div>
        <Label for="contactFirstName">Contact First Name *</Label>
        <Input id="contactFirstName" name="contactFirstName" required />
      </div>
      <div>
        <Label for="contactLastName">Contact Last Name *</Label>
        <Input id="contactLastName" name="contactLastName" required />
      </div>
    </div>

    <div class="grid gap-4 sm:grid-cols-2">
      <div>
        <Label for="contactEmail">Contact Email *</Label>
        <Input id="contactEmail" name="contactEmail" type="email" required />
      </div>
      <div>
        <Label for="contactPhone">Contact Phone</Label>
        <Input id="contactPhone" name="contactPhone" type="tel" />
      </div>
    </div>

    <div class="grid gap-4 sm:grid-cols-2">
      <div>
        <Label for="city">City</Label>
        <Input id="city" name="city" />
      </div>
      <div>
        <Label for="state">State</Label>
        <Input id="state" name="state" />
      </div>
    </div>

    <div class="grid gap-4 sm:grid-cols-2">
      <div>
        <Label for="source">Source *</Label>
        <Select id="source" name="source" required>
          <option value="inbound">Inbound</option>
          <option value="outbound">Outbound</option>
          <option value="referral">Referral</option>
          <option value="event">Event</option>
          <option value="website">Website</option>
        </Select>
      </div>
      <div>
        <Label for="monthlyValue">Monthly Value ($)</Label>
        <Input id="monthlyValue" name="monthlyValue" type="number" min="0" step="100" />
      </div>
    </div>

    <div>
      <Label for="assignedTo">Assign To</Label>
      <Select id="assignedTo" name="assignedTo">
        <option value="">Select assignee...</option>
        {#each data.salesUsers as user}
          <option value={user.id}>{user.name}</option>
        {/each}
      </Select>
    </div>

    <div>
      <Label for="notes">Notes</Label>
      <Textarea id="notes" name="notes" rows={3} />
    </div>

    <div class="flex justify-end gap-3">
      <Button color="light" onclick={() => showNewProspectModal = false}>Cancel</Button>
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Creating...' : 'Create Prospect'}
      </Button>
    </div>
  </form>
</Modal>

<!-- Prospect Detail Drawer -->
<Drawer
  bind:open={showProspectDetailDrawer}
  placement="right"
  class="w-full p-0 sm:w-[480px]"
>
  {#if selectedProspect}
    <div class="flex h-full flex-col">
      <!-- Header -->
      <div class="flex items-center justify-between border-b border-gray-200 p-4 dark:border-gray-700">
        <div>
          <h2 class="text-lg font-semibold text-gray-900 dark:text-white">
            {selectedProspect.practiceName}
          </h2>
          <Badge class={getProspectStageColor(selectedProspect.stage).badge}>
            {stageLabels[selectedProspect.stage]}
          </Badge>
        </div>
        <Button color="light" size="sm" onclick={() => showProspectDetailDrawer = false}>
          <XMarkOutline class="h-5 w-5" />
        </Button>
      </div>

      <!-- Content -->
      <div class="flex-1 overflow-y-auto p-4">
        <!-- Contact Info -->
        <div class="mb-6">
          <h3 class="mb-3 font-medium text-gray-900 dark:text-white">Contact Information</h3>
          <div class="space-y-2">
            <div class="flex items-center gap-2 text-sm">
              <UserOutline class="h-4 w-4 text-gray-400" />
              <span>{selectedProspect.contactName}</span>
            </div>
            {#if selectedProspect.contactEmail}
              <div class="flex items-center gap-2 text-sm">
                <EnvelopeOutline class="h-4 w-4 text-gray-400" />
                <a href="mailto:{selectedProspect.contactEmail}" class="text-primary-600 hover:underline">
                  {selectedProspect.contactEmail}
                </a>
              </div>
            {/if}
            {#if selectedProspect.contactPhone}
              <div class="flex items-center gap-2 text-sm">
                <PhoneOutline class="h-4 w-4 text-gray-400" />
                <a href="tel:{selectedProspect.contactPhone}" class="text-primary-600 hover:underline">
                  {selectedProspect.contactPhone}
                </a>
              </div>
            {/if}
            {#if selectedProspect.location}
              <div class="flex items-center gap-2 text-sm">
                <MapPinOutline class="h-4 w-4 text-gray-400" />
                <span>{selectedProspect.location}</span>
              </div>
            {/if}
            {#if selectedProspect.website}
              <div class="flex items-center gap-2 text-sm">
                <GlobeAltOutline class="h-4 w-4 text-gray-400" />
                <a href={selectedProspect.website} target="_blank" class="text-primary-600 hover:underline">
                  {selectedProspect.website}
                </a>
              </div>
            {/if}
          </div>
        </div>

        <!-- Deal Info -->
        <div class="mb-6">
          <h3 class="mb-3 font-medium text-gray-900 dark:text-white">Deal Information</h3>
          <div class="grid grid-cols-2 gap-4">
            <div class="rounded-lg bg-gray-50 p-3 dark:bg-gray-800">
              <p class="text-xs text-gray-500 dark:text-gray-400">Monthly Value</p>
              <p class="text-lg font-semibold text-gray-900 dark:text-white">
                {selectedProspect.monthlyValue ? formatCurrency(selectedProspect.monthlyValue) : 'Not set'}
              </p>
            </div>
            <div class="rounded-lg bg-gray-50 p-3 dark:bg-gray-800">
              <p class="text-xs text-gray-500 dark:text-gray-400">Probability</p>
              <p class="text-lg font-semibold text-gray-900 dark:text-white">
                {selectedProspect.probability ?? 0}%
              </p>
            </div>
            <div class="rounded-lg bg-gray-50 p-3 dark:bg-gray-800">
              <p class="text-xs text-gray-500 dark:text-gray-400">Source</p>
              <p class="text-lg font-semibold capitalize text-gray-900 dark:text-white">
                {selectedProspect.source}
              </p>
            </div>
            <div class="rounded-lg bg-gray-50 p-3 dark:bg-gray-800">
              <p class="text-xs text-gray-500 dark:text-gray-400">Expected Close</p>
              <p class="text-lg font-semibold text-gray-900 dark:text-white">
                {selectedProspect.expectedCloseDate ? formatDate(selectedProspect.expectedCloseDate) : 'Not set'}
              </p>
            </div>
          </div>
        </div>

        <!-- Territory Reservation -->
        {#if selectedProspect.territoryReservation}
          <div class="mb-6 rounded-lg border border-yellow-200 bg-yellow-50 p-4 dark:border-yellow-800 dark:bg-yellow-900/30">
            <h3 class="mb-2 flex items-center gap-2 font-medium text-yellow-800 dark:text-yellow-300">
              <MapPinOutline class="h-5 w-5" />
              Territory Reserved
            </h3>
            <p class="text-sm text-yellow-700 dark:text-yellow-400">
              {selectedProspect.territoryReservation.territoryName} - {selectedProspect.territoryReservation.territoryLocation}
            </p>
            <p class="mt-1 text-xs text-yellow-600 dark:text-yellow-500">
              Expires: {formatDate(selectedProspect.territoryReservation.expiresAt)}
            </p>
          </div>
        {/if}

        <!-- Latest Proposal -->
        {#if selectedProspect.latestProposal}
          <div class="mb-6 rounded-lg border border-gray-200 p-4 dark:border-gray-700">
            <h3 class="mb-2 flex items-center gap-2 font-medium text-gray-900 dark:text-white">
              <DocumentTextOutline class="h-5 w-5" />
              Latest Proposal
            </h3>
            <div class="space-y-1 text-sm">
              <p><span class="text-gray-500">Number:</span> {selectedProspect.latestProposal.proposalNumber}</p>
              <p><span class="text-gray-500">Territory:</span> {selectedProspect.latestProposal.territoryName}</p>
              <p><span class="text-gray-500">Value:</span> {formatCurrency(selectedProspect.latestProposal.monthlyValue)}/mo</p>
              <Badge class={getProspectStageColor(selectedProspect.latestProposal.status).badge}>
                {selectedProspect.latestProposal.status}
              </Badge>
            </div>
          </div>
        {/if}

        <!-- Notes -->
        {#if selectedProspect.notes}
          <div class="mb-6">
            <h3 class="mb-2 font-medium text-gray-900 dark:text-white">Notes</h3>
            <p class="text-sm text-gray-600 dark:text-gray-400">{selectedProspect.notes}</p>
          </div>
        {/if}

        <!-- Activity Timeline -->
        <div class="mb-6">
          <h3 class="mb-3 font-medium text-gray-900 dark:text-white">Recent Activity</h3>
          {#if selectedProspect.recentActivities.length > 0}
            <Timeline>
              {#each selectedProspect.recentActivities as activity}
                <TimelineItem
                  title={activity.subject || activityTypeLabels[activity.type]}
                  date={getRelativeTime(activity.createdAt)}
                >
                  {#if activity.description}
                    <p class="text-sm text-gray-600 dark:text-gray-400">{activity.description}</p>
                  {/if}
                  {#if activity.outcome}
                    <p class="mt-1 text-sm font-medium text-gray-700 dark:text-gray-300">
                      Outcome: {activity.outcome}
                    </p>
                  {/if}
                  {#if activity.performedBy}
                    <p class="mt-1 text-xs text-gray-500">by {activity.performedBy}</p>
                  {/if}
                </TimelineItem>
              {/each}
            </Timeline>
          {:else}
            <p class="text-sm text-gray-500 dark:text-gray-400">No activity recorded yet.</p>
          {/if}
        </div>
      </div>

      <!-- Actions Footer -->
      <div class="border-t border-gray-200 p-4 dark:border-gray-700">
        <div class="flex flex-wrap gap-2">
          <Button size="sm" onclick={() => { showProspectDetailDrawer = false; showActivityModal = true; }}>
            <PlusOutline class="mr-1 h-4 w-4" />
            Add Activity
          </Button>
          {#if !selectedProspect.territoryReservation && selectedProspect.stage !== 'closed_won' && selectedProspect.stage !== 'closed_lost'}
            <Button size="sm" color="light" onclick={() => { showProspectDetailDrawer = false; showReservationModal = true; }}>
              <MapPinOutline class="mr-1 h-4 w-4" />
              Reserve Territory
            </Button>
          {/if}
          {#if selectedProspect.stage !== 'closed_won' && selectedProspect.stage !== 'closed_lost'}
            <Button size="sm" color="light" onclick={() => { showProspectDetailDrawer = false; showProposalModal = true; }}>
              <DocumentTextOutline class="mr-1 h-4 w-4" />
              Create Proposal
            </Button>
          {/if}
        </div>
      </div>
    </div>
  {/if}
</Drawer>

<!-- Add Activity Modal -->
<Modal title="Add Activity" bind:open={showActivityModal} size="md">
  {#if selectedProspect}
    <form
      method="POST"
      action="?/addActivity"
      use:enhance={() => {
        isSubmitting = true;
        return async ({ result, update }) => {
          isSubmitting = false;
          if (result.type === 'success') {
            showActivityModal = false;
            await update();
          }
        };
      }}
      class="space-y-4"
    >
      <input type="hidden" name="prospectId" value={selectedProspect.id} />

      <div>
        <Label for="activityType">Activity Type *</Label>
        <Select id="activityType" name="activityType" required>
          <option value="call">Call</option>
          <option value="email">Email</option>
          <option value="meeting">Meeting</option>
          <option value="demo">Demo</option>
          <option value="proposal">Proposal</option>
          <option value="note">Note</option>
        </Select>
      </div>

      <div>
        <Label for="subject">Subject *</Label>
        <Input id="subject" name="subject" required />
      </div>

      <div>
        <Label for="description">Description</Label>
        <Textarea id="description" name="description" rows={3} />
      </div>

      <div>
        <Label for="outcome">Outcome</Label>
        <Input id="outcome" name="outcome" placeholder="What was the result?" />
      </div>

      <div class="flex justify-end gap-3">
        <Button color="light" onclick={() => showActivityModal = false}>Cancel</Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Adding...' : 'Add Activity'}
        </Button>
      </div>
    </form>
  {/if}
</Modal>

<!-- Create Proposal Modal -->
<Modal title="Create Proposal" bind:open={showProposalModal} size="lg">
  {#if selectedProspect}
    <form
      method="POST"
      action="?/createProposal"
      use:enhance={() => {
        isSubmitting = true;
        return async ({ result, update }) => {
          isSubmitting = false;
          if (result.type === 'success') {
            showProposalModal = false;
            await update();
          }
        };
      }}
      class="space-y-4"
    >
      <input type="hidden" name="prospectId" value={selectedProspect.id} />

      <div class="rounded-lg bg-gray-50 p-3 dark:bg-gray-800">
        <p class="text-sm text-gray-500 dark:text-gray-400">Creating proposal for</p>
        <p class="font-medium text-gray-900 dark:text-white">{selectedProspect.practiceName}</p>
      </div>

      <div class="grid gap-4 sm:grid-cols-2">
        <div>
          <Label for="territoryId">Territory *</Label>
          <Select id="territoryId" name="territoryId" required>
            <option value="">Select territory...</option>
            {#each data.territories as territory}
              <option value={territory.id}>
                {territory.name} - {territory.location} ({formatCurrency(territory.basePrice)}/mo)
              </option>
            {/each}
          </Select>
        </div>
        <div>
          <Label for="planId">Plan *</Label>
          <Select id="planId" name="planId" required>
            <option value="">Select plan...</option>
            {#each data.plans as plan}
              <option value={plan.id}>
                {plan.name} - {formatCurrency(plan.basePrice)}/mo
              </option>
            {/each}
          </Select>
        </div>
      </div>

      <div class="grid gap-4 sm:grid-cols-2">
        <div>
          <Label for="monthlyValue">Monthly Value ($) *</Label>
          <Input
            id="monthlyValue"
            name="monthlyValue"
            type="number"
            min="0"
            step="100"
            value={selectedProspect.monthlyValue || ''}
            required
          />
        </div>
        <div>
          <Label for="termMonths">Term (months)</Label>
          <Select id="termMonths" name="termMonths">
            <option value="6">6 months</option>
            <option value="12" selected>12 months</option>
            <option value="24">24 months</option>
          </Select>
        </div>
      </div>

      <div class="grid gap-4 sm:grid-cols-2">
        <div>
          <Label for="discountPercentage">Discount (%)</Label>
          <Input id="discountPercentage" name="discountPercentage" type="number" min="0" max="100" step="1" />
        </div>
        <div>
          <Label for="discountReason">Discount Reason</Label>
          <Input id="discountReason" name="discountReason" />
        </div>
      </div>

      <div>
        <Label for="customTerms">Custom Terms</Label>
        <Textarea id="customTerms" name="customTerms" rows={3} />
      </div>

      <div class="flex justify-end gap-3">
        <Button color="light" onclick={() => showProposalModal = false}>Cancel</Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Creating...' : 'Create Proposal'}
        </Button>
      </div>
    </form>
  {/if}
</Modal>

<!-- Reserve Territory Modal -->
<Modal title="Reserve Territory" bind:open={showReservationModal} size="md">
  {#if selectedProspect}
    <form
      method="POST"
      action="?/reserveTerritory"
      use:enhance={() => {
        isSubmitting = true;
        return async ({ result, update }) => {
          isSubmitting = false;
          if (result.type === 'success') {
            showReservationModal = false;
            await update();
          }
        };
      }}
      class="space-y-4"
    >
      <input type="hidden" name="prospectId" value={selectedProspect.id} />

      <div class="rounded-lg bg-gray-50 p-3 dark:bg-gray-800">
        <p class="text-sm text-gray-500 dark:text-gray-400">Reserving territory for</p>
        <p class="font-medium text-gray-900 dark:text-white">{selectedProspect.practiceName}</p>
      </div>

      <div>
        <Label for="reserveTerritoryId">Territory *</Label>
        <Select id="reserveTerritoryId" name="territoryId" required>
          <option value="">Select territory...</option>
          {#each data.territories as territory}
            <option value={territory.id}>
              {territory.name} - {territory.location}
            </option>
          {/each}
        </Select>
      </div>

      <div>
        <Label for="daysToHold">Hold Period</Label>
        <Select id="daysToHold" name="daysToHold">
          <option value="3">3 days</option>
          <option value="7" selected>7 days</option>
          <option value="14">14 days</option>
          <option value="30">30 days</option>
        </Select>
      </div>

      <div>
        <Label for="reservationNotes">Notes</Label>
        <Textarea id="reservationNotes" name="notes" rows={2} />
      </div>

      <div class="flex justify-end gap-3">
        <Button color="light" onclick={() => showReservationModal = false}>Cancel</Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Reserving...' : 'Reserve Territory'}
        </Button>
      </div>
    </form>
  {/if}
</Modal>
