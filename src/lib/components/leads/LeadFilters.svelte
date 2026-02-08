<script lang="ts">
  import { Input, Select, Button } from 'flowbite-svelte';
  import { SearchOutline, FilterOutline, CloseOutline } from 'flowbite-svelte-icons';
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';

  interface Props {
    search?: string;
    status?: string;
    source?: string;
    dateFrom?: string;
    dateTo?: string;
  }

  let {
    search = '',
    status = '',
    source = '',
    dateFrom = '',
    dateTo = ''
  }: Props = $props();

  // Local state for form inputs
  let searchValue = $state(search);
  let statusValue = $state(status);
  let sourceValue = $state(source);
  let dateFromValue = $state(dateFrom);
  let dateToValue = $state(dateTo);
  let showAdvanced = $state(false);

  // Status options
  const statusOptions = [
    { value: '', name: 'All Statuses' },
    { value: 'new', name: 'New' },
    { value: 'contacted', name: 'Contacted' },
    { value: 'qualified', name: 'Qualified' },
    { value: 'appointment_set', name: 'Appointment Set' },
    { value: 'consultation_completed', name: 'Consultation Completed' },
    { value: 'converted', name: 'Converted' },
    { value: 'lost', name: 'Lost' }
  ];

  // Source options
  const sourceOptions = [
    { value: '', name: 'All Sources' },
    { value: 'google', name: 'Google' },
    { value: 'facebook', name: 'Facebook' },
    { value: 'instagram', name: 'Instagram' },
    { value: 'website', name: 'Website' },
    { value: 'referral', name: 'Referral' },
    { value: 'manual', name: 'Manual Entry' }
  ];

  // Apply filters
  function applyFilters() {
    const params = new URLSearchParams();

    if (searchValue) params.set('search', searchValue);
    if (statusValue) params.set('status', statusValue);
    if (sourceValue) params.set('source', sourceValue);
    if (dateFromValue) params.set('dateFrom', dateFromValue);
    if (dateToValue) params.set('dateTo', dateToValue);

    // Preserve sort order if present
    const currentSort = $page.url.searchParams.get('sortBy');
    const currentOrder = $page.url.searchParams.get('sortOrder');
    if (currentSort) params.set('sortBy', currentSort);
    if (currentOrder) params.set('sortOrder', currentOrder);

    // Reset to page 1 when filtering
    params.set('page', '1');

    goto(`/leads?${params.toString()}`);
  }

  // Clear all filters
  function clearFilters() {
    searchValue = '';
    statusValue = '';
    sourceValue = '';
    dateFromValue = '';
    dateToValue = '';
    goto('/leads');
  }

  // Check if any filters are active
  let hasActiveFilters = $derived(
    searchValue !== '' || statusValue !== '' || sourceValue !== '' ||
    dateFromValue !== '' || dateToValue !== ''
  );

  // Handle search on Enter key
  function handleSearchKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter') {
      applyFilters();
    }
  }
</script>

<div class="space-y-4">
  <!-- Main filter row -->
  <div class="flex flex-col gap-4 sm:flex-row">
    <!-- Search input -->
    <div class="relative flex-1">
      <Input
        type="text"
        placeholder="Search leads by name, email, or phone..."
        bind:value={searchValue}
        onkeydown={handleSearchKeydown}
        class="pl-10"
      />
      <SearchOutline class="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
    </div>

    <!-- Status select -->
    <Select
      bind:value={statusValue}
      items={statusOptions}
      class="w-full sm:w-48"
    />

    <!-- Source select -->
    <Select
      bind:value={sourceValue}
      items={sourceOptions}
      class="w-full sm:w-48"
    />

    <!-- Action buttons -->
    <div class="flex gap-2">
      <Button color="primary" onclick={applyFilters}>
        <SearchOutline class="mr-2 h-4 w-4" />
        Search
      </Button>
      <Button
        color="light"
        onclick={() => (showAdvanced = !showAdvanced)}
      >
        <FilterOutline class="mr-2 h-4 w-4" />
        {showAdvanced ? 'Less' : 'More'}
      </Button>
    </div>
  </div>

  <!-- Advanced filters (date range) -->
  {#if showAdvanced}
    <div class="flex flex-col gap-4 rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800 sm:flex-row sm:items-end">
      <div class="flex-1">
        <label class="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
          Date From
        </label>
        <Input type="date" bind:value={dateFromValue} />
      </div>
      <div class="flex-1">
        <label class="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
          Date To
        </label>
        <Input type="date" bind:value={dateToValue} />
      </div>
      <Button color="primary" onclick={applyFilters}>
        Apply Date Filter
      </Button>
    </div>
  {/if}

  <!-- Active filters indicator -->
  {#if hasActiveFilters}
    <div class="flex items-center gap-2">
      <span class="text-sm text-gray-500 dark:text-gray-400">Active filters:</span>
      <div class="flex flex-wrap gap-2">
        {#if searchValue}
          <span class="inline-flex items-center rounded-full bg-primary-100 px-3 py-1 text-sm text-primary-800 dark:bg-primary-900 dark:text-primary-300">
            Search: {searchValue}
          </span>
        {/if}
        {#if statusValue}
          <span class="inline-flex items-center rounded-full bg-blue-100 px-3 py-1 text-sm text-blue-800 dark:bg-blue-900 dark:text-blue-300">
            Status: {statusOptions.find(s => s.value === statusValue)?.name}
          </span>
        {/if}
        {#if sourceValue}
          <span class="inline-flex items-center rounded-full bg-green-100 px-3 py-1 text-sm text-green-800 dark:bg-green-900 dark:text-green-300">
            Source: {sourceOptions.find(s => s.value === sourceValue)?.name}
          </span>
        {/if}
        {#if dateFromValue || dateToValue}
          <span class="inline-flex items-center rounded-full bg-yellow-100 px-3 py-1 text-sm text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300">
            Date: {dateFromValue || 'Any'} - {dateToValue || 'Any'}
          </span>
        {/if}
      </div>
      <Button color="light" size="xs" onclick={clearFilters}>
        <CloseOutline class="mr-1 h-3 w-3" />
        Clear All
      </Button>
    </div>
  {/if}
</div>
