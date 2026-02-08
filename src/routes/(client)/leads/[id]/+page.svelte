<script lang="ts">
  import { Card, Badge, Button } from 'flowbite-svelte';
  import {
    CashOutline,
    CalendarMonthOutline,
    ClockOutline
  } from 'flowbite-svelte-icons';
  import LeadHeader from '$lib/components/leads/LeadHeader.svelte';
  import LeadContactInfo from '$lib/components/leads/LeadContactInfo.svelte';
  import LeadSourceInfo from '$lib/components/leads/LeadSourceInfo.svelte';
  import LeadActivityTimeline from '$lib/components/leads/LeadActivityTimeline.svelte';
  import LeadNotes from '$lib/components/leads/LeadNotes.svelte';
  import UpdateStatusModal from '$lib/components/leads/UpdateStatusModal.svelte';
  import { formatCurrency, formatDate, getFriendlyRelativeTime } from '$lib/utils';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();

  // Modal state
  let showStatusModal = $state(false);

  function openStatusModal() {
    showStatusModal = true;
  }

  function closeStatusModal() {
    showStatusModal = false;
  }
</script>

<div class="space-y-6">
  <!-- Lead Header -->
  <LeadHeader
    firstName={data.lead.firstName}
    lastName={data.lead.lastName}
    email={data.lead.email}
    phone={data.lead.phone}
    status={data.lead.status}
    temperature={data.lead.temperature}
    score={data.lead.score}
    onStatusChange={openStatusModal}
  />

  <!-- Main content grid -->
  <div class="grid gap-6 lg:grid-cols-3">
    <!-- Left column: Contact Info + Source Info + Notes -->
    <div class="space-y-6 lg:col-span-1">
      <LeadContactInfo
        phone={data.lead.phone}
        email={data.lead.email}
        interestLevel={data.lead.interestLevel}
        procedureInterest={data.lead.procedureInterest}
        insuranceStatus={data.lead.insuranceStatus}
        insuranceDetails={data.lead.insuranceDetails}
      />

      <LeadSourceInfo
        source={data.lead.source}
        sourceDetail={data.lead.sourceDetail}
        campaign={data.lead.campaign}
        territory={data.lead.territory}
        utmSource={data.lead.utmSource}
        utmMedium={data.lead.utmMedium}
        utmCampaign={data.lead.utmCampaign}
        utmContent={data.lead.utmContent}
      />

      <!-- Value Card -->
      {#if data.lead.estimatedRevenue || data.lead.conversionValue}
        <Card>
          <h3 class="mb-4 text-lg font-semibold text-gray-900 dark:text-white">Value</h3>
          <div class="space-y-3">
            {#if data.lead.estimatedRevenue}
              <div class="flex items-center justify-between">
                <span class="text-sm text-gray-500 dark:text-gray-400">Estimated Value</span>
                <span class="font-medium text-gray-900 dark:text-white">
                  {formatCurrency(data.lead.estimatedRevenue)}
                </span>
              </div>
            {/if}
            {#if data.lead.conversionValue}
              <div class="flex items-center justify-between">
                <span class="text-sm text-gray-500 dark:text-gray-400">Conversion Value</span>
                <span class="font-medium text-green-600 dark:text-green-400">
                  {formatCurrency(data.lead.conversionValue)}
                </span>
              </div>
            {/if}
          </div>
        </Card>
      {/if}

      <!-- Timestamps Card -->
      <Card>
        <h3 class="mb-4 text-lg font-semibold text-gray-900 dark:text-white">Timeline</h3>
        <div class="space-y-3">
          <div class="flex items-center gap-3">
            <CalendarMonthOutline class="h-5 w-5 text-gray-400" />
            <div>
              <p class="text-sm text-gray-500 dark:text-gray-400">Created</p>
              <p class="font-medium text-gray-900 dark:text-white">
                {formatDate(data.lead.createdAt, 'medium')}
              </p>
              <p class="text-xs text-gray-500 dark:text-gray-400">
                {getFriendlyRelativeTime(data.lead.createdAt)}
              </p>
            </div>
          </div>

          {#if data.lead.convertedAt}
            <div class="flex items-center gap-3">
              <CashOutline class="h-5 w-5 text-green-500" />
              <div>
                <p class="text-sm text-gray-500 dark:text-gray-400">Converted</p>
                <p class="font-medium text-green-600 dark:text-green-400">
                  {formatDate(data.lead.convertedAt, 'medium')}
                </p>
              </div>
            </div>
          {/if}

          {#if data.lead.status === 'lost' && data.lead.lostReason}
            <div class="rounded-lg bg-red-50 p-3 dark:bg-red-900/20">
              <p class="text-sm font-medium text-red-800 dark:text-red-300">Lost Reason</p>
              <p class="text-sm text-red-700 dark:text-red-400">{data.lead.lostReason}</p>
            </div>
          {/if}
        </div>
      </Card>

      <!-- Assigned To Card -->
      {#if data.lead.assignedToUser}
        <Card>
          <h3 class="mb-4 text-lg font-semibold text-gray-900 dark:text-white">Assigned To</h3>
          <div class="flex items-center gap-3">
            <div class="flex h-10 w-10 items-center justify-center rounded-full bg-primary-100 text-sm font-medium text-primary-700 dark:bg-primary-900 dark:text-primary-300">
              {data.lead.assignedToUser.firstName.charAt(0)}{data.lead.assignedToUser.lastName.charAt(0)}
            </div>
            <div>
              <p class="font-medium text-gray-900 dark:text-white">
                {data.lead.assignedToUser.firstName} {data.lead.assignedToUser.lastName}
              </p>
              <p class="text-sm text-gray-500 dark:text-gray-400">
                {data.lead.assignedToUser.email}
              </p>
            </div>
          </div>
        </Card>
      {/if}
    </div>

    <!-- Right column: Activity Timeline + Notes -->
    <div class="space-y-6 lg:col-span-2">
      <LeadNotes
        leadId={data.lead.id}
        notes={data.lead.notes}
      />

      <LeadActivityTimeline
        activities={data.lead.activities}
        title="Activity History"
      />
    </div>
  </div>

  <!-- Status Update Modal -->
  <UpdateStatusModal
    bind:open={showStatusModal}
    currentStatus={data.lead.status}
    onClose={closeStatusModal}
  />
</div>
