<script lang="ts">
  import {
    Table,
    TableBody,
    TableBodyCell,
    TableBodyRow,
    TableHead,
    TableHeadCell,
    Checkbox
  } from 'flowbite-svelte';
  import { SortOutline } from 'flowbite-svelte-icons';
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import LeadStatusBadge from './LeadStatusBadge.svelte';
  import LeadScoreBadge from './LeadScoreBadge.svelte';
  import { formatFullName, formatPhone, formatDate } from '$lib/utils';
  import type { LeadStatus, LeadTemperature } from '$lib/utils';

  interface Lead {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string | null;
    phone: string | null;
    status: LeadStatus | string;
    temperature: LeadTemperature | string;
    score: number | null;
    source: string;
    campaignName: string | null;
    createdAt: string;
  }

  interface Props {
    leads: Lead[];
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    selectedIds?: string[];
    onSelectionChange?: (ids: string[]) => void;
  }

  let {
    leads,
    sortBy = 'createdAt',
    sortOrder = 'desc',
    selectedIds = [],
    onSelectionChange
  }: Props = $props();

  // Selection state
  let localSelectedIds = $state<string[]>(selectedIds);
  let selectAll = $state(false);

  // Sync selection with parent
  $effect(() => {
    localSelectedIds = selectedIds;
  });

  // Handle individual checkbox change
  function toggleSelection(id: string) {
    if (localSelectedIds.includes(id)) {
      localSelectedIds = localSelectedIds.filter(i => i !== id);
    } else {
      localSelectedIds = [...localSelectedIds, id];
    }
    onSelectionChange?.(localSelectedIds);
  }

  // Handle select all
  function toggleSelectAll() {
    if (selectAll) {
      localSelectedIds = [];
    } else {
      localSelectedIds = leads.map(l => l.id);
    }
    selectAll = !selectAll;
    onSelectionChange?.(localSelectedIds);
  }

  // Handle sort
  function handleSort(field: string) {
    const params = new URLSearchParams($page.url.searchParams);
    const newOrder = sortBy === field && sortOrder === 'desc' ? 'asc' : 'desc';
    params.set('sortBy', field);
    params.set('sortOrder', newOrder);
    goto(`/leads?${params.toString()}`);
  }

  // Get sort indicator
  function getSortIndicator(field: string): string {
    if (sortBy !== field) return '';
    return sortOrder === 'asc' ? ' ↑' : ' ↓';
  }

  // Format source name
  function formatSource(source: string): string {
    const sources: Record<string, string> = {
      google: 'Google',
      facebook: 'Facebook',
      instagram: 'Instagram',
      website: 'Website',
      referral: 'Referral',
      manual: 'Manual'
    };
    return sources[source] ?? source;
  }
</script>

<div class="overflow-x-auto">
  <Table hoverable={true} striped={true}>
    <TableHead>
      <TableHeadCell class="w-12 p-4">
        <Checkbox checked={selectAll} onclick={toggleSelectAll} />
      </TableHeadCell>
      <TableHeadCell class="cursor-pointer" onclick={() => handleSort('firstName')}>
        <div class="flex items-center gap-1">
          Name
          <SortOutline class="h-4 w-4 text-gray-400" />
          {getSortIndicator('firstName')}
        </div>
      </TableHeadCell>
      <TableHeadCell class="cursor-pointer" onclick={() => handleSort('email')}>
        <div class="flex items-center gap-1">
          Email
          <SortOutline class="h-4 w-4 text-gray-400" />
          {getSortIndicator('email')}
        </div>
      </TableHeadCell>
      <TableHeadCell>Phone</TableHeadCell>
      <TableHeadCell class="cursor-pointer" onclick={() => handleSort('status')}>
        <div class="flex items-center gap-1">
          Status
          <SortOutline class="h-4 w-4 text-gray-400" />
          {getSortIndicator('status')}
        </div>
      </TableHeadCell>
      <TableHeadCell class="cursor-pointer" onclick={() => handleSort('temperature')}>
        <div class="flex items-center gap-1">
          Temperature
          <SortOutline class="h-4 w-4 text-gray-400" />
          {getSortIndicator('temperature')}
        </div>
      </TableHeadCell>
      <TableHeadCell class="cursor-pointer" onclick={() => handleSort('source')}>
        <div class="flex items-center gap-1">
          Source
          <SortOutline class="h-4 w-4 text-gray-400" />
          {getSortIndicator('source')}
        </div>
      </TableHeadCell>
      <TableHeadCell class="cursor-pointer" onclick={() => handleSort('createdAt')}>
        <div class="flex items-center gap-1">
          Date
          <SortOutline class="h-4 w-4 text-gray-400" />
          {getSortIndicator('createdAt')}
        </div>
      </TableHeadCell>
    </TableHead>
    <TableBody>
      {#each leads as lead (lead.id)}
        <TableBodyRow class="cursor-pointer" onclick={() => goto(`/leads/${lead.id}`)}>
          <!-- svelte-ignore a11y_click_events_have_key_events -->
          <!-- svelte-ignore a11y_no_static_element_interactions -->
          <TableBodyCell class="w-12 p-4">
            <div onclick={(e: MouseEvent) => e.stopPropagation()}>
              <Checkbox
                checked={localSelectedIds.includes(lead.id)}
                onclick={() => toggleSelection(lead.id)}
              />
            </div>
          </TableBodyCell>
          <TableBodyCell class="font-medium text-gray-900 dark:text-white">
            {formatFullName(lead.firstName, lead.lastName)}
          </TableBodyCell>
          <TableBodyCell>
            {lead.email ?? '-'}
          </TableBodyCell>
          <TableBodyCell>
            {formatPhone(lead.phone)}
          </TableBodyCell>
          <TableBodyCell>
            <LeadStatusBadge status={lead.status} size="xs" />
          </TableBodyCell>
          <TableBodyCell>
            <LeadScoreBadge temperature={lead.temperature} score={lead.score} size="xs" />
          </TableBodyCell>
          <TableBodyCell>
            <span class="text-sm text-gray-600 dark:text-gray-400">
              {formatSource(lead.source)}
            </span>
          </TableBodyCell>
          <TableBodyCell>
            <span class="text-sm text-gray-600 dark:text-gray-400">
              {formatDate(lead.createdAt, 'short')}
            </span>
          </TableBodyCell>
        </TableBodyRow>
      {:else}
        <TableBodyRow>
          <TableBodyCell colspan={8} class="py-8 text-center text-gray-500 dark:text-gray-400">
            No leads found. Try adjusting your filters.
          </TableBodyCell>
        </TableBodyRow>
      {/each}
    </TableBody>
  </Table>
</div>
