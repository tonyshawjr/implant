<script lang="ts">
  import { Card, Button, Pagination } from 'flowbite-svelte';
  import { DownloadOutline, ChartOutline, UsersGroupOutline } from 'flowbite-svelte-icons';
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import LeadFilters from '$lib/components/leads/LeadFilters.svelte';
  import LeadTable from '$lib/components/leads/LeadTable.svelte';
  import { formatNumber } from '$lib/utils';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();

  // Selected leads for bulk actions
  let selectedLeadIds = $state<string[]>([]);

  // Handle selection change
  function handleSelectionChange(ids: string[]) {
    selectedLeadIds = ids;
  }

  // Handle page change
  function handlePageChange(newPage: number) {
    const params = new URLSearchParams($page.url.searchParams);
    params.set('page', newPage.toString());
    goto(`/leads?${params.toString()}`);
  }

  // Handle export (placeholder)
  function handleExport() {
    alert('Export functionality coming soon!');
  }

  // Build pagination pages array
  let pages = $derived(() => {
    const { page: currentPage, totalPages } = data.pagination;
    const items: { name: number; active: boolean }[] = [];

    // Show up to 7 page numbers
    let startPage = Math.max(1, currentPage - 3);
    let endPage = Math.min(totalPages, startPage + 6);

    if (endPage - startPage < 6) {
      startPage = Math.max(1, endPage - 6);
    }

    for (let i = startPage; i <= endPage; i++) {
      items.push({ name: i, active: i === currentPage });
    }

    return items;
  });
</script>

<div class="space-y-6">
  <!-- Page Header -->
  <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
    <div>
      <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Leads Center</h1>
      <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
        Manage and track all your leads in one place.
      </p>
    </div>
    <div class="flex gap-2">
      <Button href="/leads/analytics" color="light" size="sm">
        <ChartOutline class="mr-2 h-4 w-4" />
        Analytics
      </Button>
      <Button color="light" size="sm" onclick={handleExport} disabled={selectedLeadIds.length === 0}>
        <DownloadOutline class="mr-2 h-4 w-4" />
        Export {selectedLeadIds.length > 0 ? `(${selectedLeadIds.length})` : ''}
      </Button>
    </div>
  </div>

  <!-- Stats Summary -->
  <div class="grid gap-4 sm:grid-cols-4">
    <Card class="p-4">
      <div class="flex items-center gap-3">
        <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-100 dark:bg-primary-900">
          <UsersGroupOutline class="h-5 w-5 text-primary-600 dark:text-primary-300" />
        </div>
        <div>
          <p class="text-sm text-gray-500 dark:text-gray-400">Total Leads</p>
          <p class="text-xl font-bold text-gray-900 dark:text-white">
            {formatNumber(data.pagination.totalCount)}
          </p>
        </div>
      </div>
    </Card>
    <Card class="p-4">
      <div class="flex items-center gap-3">
        <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900">
          <UsersGroupOutline class="h-5 w-5 text-blue-600 dark:text-blue-300" />
        </div>
        <div>
          <p class="text-sm text-gray-500 dark:text-gray-400">New</p>
          <p class="text-xl font-bold text-gray-900 dark:text-white">
            {formatNumber(data.leads.filter(l => l.status === 'new').length)}
          </p>
        </div>
      </div>
    </Card>
    <Card class="p-4">
      <div class="flex items-center gap-3">
        <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-yellow-100 dark:bg-yellow-900">
          <UsersGroupOutline class="h-5 w-5 text-yellow-600 dark:text-yellow-300" />
        </div>
        <div>
          <p class="text-sm text-gray-500 dark:text-gray-400">Qualified</p>
          <p class="text-xl font-bold text-gray-900 dark:text-white">
            {formatNumber(data.leads.filter(l => l.status === 'qualified').length)}
          </p>
        </div>
      </div>
    </Card>
    <Card class="p-4">
      <div class="flex items-center gap-3">
        <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900">
          <UsersGroupOutline class="h-5 w-5 text-green-600 dark:text-green-300" />
        </div>
        <div>
          <p class="text-sm text-gray-500 dark:text-gray-400">Converted</p>
          <p class="text-xl font-bold text-gray-900 dark:text-white">
            {formatNumber(data.leads.filter(l => l.status === 'converted').length)}
          </p>
        </div>
      </div>
    </Card>
  </div>

  <!-- Filters -->
  <Card class="p-4">
    <LeadFilters
      search={data.filters.search}
      status={data.filters.status}
      source={data.filters.source}
      dateFrom={data.filters.dateFrom}
      dateTo={data.filters.dateTo}
    />
  </Card>

  <!-- Leads Table -->
  <Card>
    <LeadTable
      leads={data.leads}
      sortBy={data.filters.sortBy}
      sortOrder={data.filters.sortOrder}
      selectedIds={selectedLeadIds}
      onSelectionChange={handleSelectionChange}
    />

    <!-- Pagination -->
    {#if data.pagination.totalPages > 1}
      <div class="mt-4 flex flex-col items-center justify-between gap-4 border-t border-gray-200 px-4 py-3 dark:border-gray-700 sm:flex-row">
        <p class="text-sm text-gray-500 dark:text-gray-400">
          Showing {(data.pagination.page - 1) * data.pagination.pageSize + 1} to {Math.min(data.pagination.page * data.pagination.pageSize, data.pagination.totalCount)} of {formatNumber(data.pagination.totalCount)} results
        </p>
        <div class="flex items-center gap-2">
          <Button
            color="light"
            size="sm"
            disabled={data.pagination.page === 1}
            onclick={() => handlePageChange(data.pagination.page - 1)}
          >
            Previous
          </Button>
          <div class="hidden gap-1 sm:flex">
            {#each pages() as p}
              <Button
                color={p.active ? 'primary' : 'light'}
                size="sm"
                onclick={() => handlePageChange(p.name)}
              >
                {p.name}
              </Button>
            {/each}
          </div>
          <span class="text-sm text-gray-500 dark:text-gray-400 sm:hidden">
            Page {data.pagination.page} of {data.pagination.totalPages}
          </span>
          <Button
            color="light"
            size="sm"
            disabled={data.pagination.page === data.pagination.totalPages}
            onclick={() => handlePageChange(data.pagination.page + 1)}
          >
            Next
          </Button>
        </div>
      </div>
    {/if}
  </Card>
</div>
