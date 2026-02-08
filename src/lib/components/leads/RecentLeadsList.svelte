<script lang="ts">
  import { Card } from 'flowbite-svelte';
  import LeadStatusBadge from './LeadStatusBadge.svelte';
  import LeadScoreBadge from './LeadScoreBadge.svelte';
  import { formatFullName, getInitials, getFriendlyRelativeTime } from '$lib/utils';
  import type { LeadStatus, LeadTemperature } from '$lib/utils';

  interface Lead {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string | null;
    status: LeadStatus | string;
    temperature: LeadTemperature | string;
    source: string;
    createdAt: Date | string;
  }

  interface Props {
    leads: Lead[];
    title?: string;
    showViewAll?: boolean;
    viewAllHref?: string;
  }

  let {
    leads,
    title = 'Recent Leads',
    showViewAll = true,
    viewAllHref = '/leads'
  }: Props = $props();
</script>

<Card>
  <div class="mb-4 flex items-center justify-between">
    <h2 class="text-lg font-semibold text-gray-900 dark:text-white">{title}</h2>
    {#if showViewAll}
      <a href={viewAllHref} class="text-sm font-medium text-primary-600 hover:underline dark:text-primary-400">
        View all
      </a>
    {/if}
  </div>

  {#if leads.length === 0}
    <div class="py-8 text-center text-gray-500 dark:text-gray-400">
      <p>No leads yet. Start a campaign to get leads!</p>
    </div>
  {:else}
    <div class="space-y-3">
      {#each leads as lead (lead.id)}
        <a
          href="/leads/{lead.id}"
          class="flex items-center justify-between rounded-lg border border-gray-100 p-3 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-700/50"
        >
          <div class="flex items-center gap-3">
            <div class="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-sm font-medium text-gray-600 dark:bg-gray-700 dark:text-gray-300">
              {getInitials(lead.firstName, lead.lastName)}
            </div>
            <div>
              <p class="font-medium text-gray-900 dark:text-white">
                {formatFullName(lead.firstName, lead.lastName)}
              </p>
              <p class="text-sm text-gray-500 dark:text-gray-400">
                {lead.email ?? 'No email'}
              </p>
            </div>
          </div>
          <div class="flex flex-col items-end gap-1">
            <div class="flex items-center gap-2">
              <LeadScoreBadge temperature={lead.temperature} size="xs" />
              <LeadStatusBadge status={lead.status} size="xs" />
            </div>
            <p class="text-xs text-gray-500 dark:text-gray-400">
              {getFriendlyRelativeTime(lead.createdAt)}
            </p>
          </div>
        </a>
      {/each}
    </div>
  {/if}
</Card>
