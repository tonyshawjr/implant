<script lang="ts">
  import { goto } from '$app/navigation';
  import { page } from '$app/state';
  import {
    Card,
    Badge,
    Button,
    Table,
    TableHead,
    TableHeadCell,
    TableBody,
    TableBodyRow,
    TableBodyCell,
    Input,
    Select,
    Drawer,
    CloseButton,
    Pagination,
    Avatar
  } from 'flowbite-svelte';
  import {
    SearchOutline,
    PlusOutline,
    FilterOutline,
    ExclamationCircleOutline,
    CalendarOutline,
    ArrowRightOutline,
    UsersGroupOutline,
    ChartPieOutline,
    CashOutline,
    ArrowTrendingUpOutline
  } from 'flowbite-svelte-icons';
  import { HealthScoreBadge, OrgStatusBadge, ContractStatusBadge } from '$lib/components/internal';
  import { StatCard } from '$lib/components/ui';
  import { formatCurrency, formatCompactCurrency, formatDate, getInitials, getDaysUntil } from '$lib/utils';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();

  // Filter state
  let searchValue = $state(data.filters.search);
  let statusFilter = $state(data.filters.status);
  let healthFilter = $state(data.filters.health);
  let isFilterDrawerOpen = $state(false);
  let searchTimeout: ReturnType<typeof setTimeout>;

  // Handle search with debounce
  function handleSearch(event: Event) {
    const target = event.target as HTMLInputElement;
    searchValue = target.value;

    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      applyFilters();
    }, 300);
  }

  // Apply filters to URL
  function applyFilters() {
    const params = new URLSearchParams();
    if (searchValue) params.set('search', searchValue);
    if (statusFilter) params.set('status', statusFilter);
    if (healthFilter) params.set('health', healthFilter);

    goto(`?${params.toString()}`, { replaceState: true });
  }

  // Handle filter changes
  function handleStatusChange(event: Event) {
    const target = event.target as HTMLSelectElement;
    statusFilter = target.value;
    applyFilters();
  }

  function handleHealthChange(event: Event) {
    const target = event.target as HTMLSelectElement;
    healthFilter = target.value;
    applyFilters();
  }

  // Clear all filters
  function clearFilters() {
    searchValue = '';
    statusFilter = '';
    healthFilter = '';
    goto('?', { replaceState: true });
  }

  // Navigate to client detail
  function viewClient(clientId: string) {
    goto(`/internal/clients/${clientId}`);
  }

  // Pagination
  function goToPage(newPage: number) {
    const params = new URLSearchParams(page.url.searchParams);
    params.set('page', newPage.toString());
    goto(`?${params.toString()}`, { replaceState: true });
  }

  // Check if any filters are active
  let hasActiveFilters = $derived(!!searchValue || !!statusFilter || !!healthFilter);
</script>

<div class="space-y-6">
  <!-- Page Header -->
  <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
    <div>
      <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Client Overview</h1>
      <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
        Manage and monitor all client accounts
      </p>
    </div>
    <Button size="sm" href="/internal/clients/new">
      <PlusOutline class="mr-2 h-4 w-4" />
      Add Client
    </Button>
  </div>

  <!-- Summary Stats -->
  <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
    <StatCard
      title="Total Clients"
      value={data.stats.totalClients.toString()}
    >
      {#snippet icon()}
        <UsersGroupOutline class="h-6 w-6 text-primary-600 dark:text-primary-400" />
      {/snippet}
    </StatCard>

    <StatCard
      title="Active Clients"
      value={data.stats.activeClients.toString()}
      iconBgColor="bg-green-100 dark:bg-green-900"
    >
      {#snippet icon()}
        <ChartPieOutline class="h-6 w-6 text-green-600 dark:text-green-400" />
      {/snippet}
    </StatCard>

    <StatCard
      title="Monthly Revenue"
      value={formatCompactCurrency(data.stats.mrr)}
      iconBgColor="bg-blue-100 dark:bg-blue-900"
    >
      {#snippet icon()}
        <CashOutline class="h-6 w-6 text-blue-600 dark:text-blue-400" />
      {/snippet}
    </StatCard>

    <StatCard
      title="Clients at Risk"
      value={data.stats.clientsAtRisk.toString()}
      iconBgColor={data.stats.clientsAtRisk > 0 ? 'bg-red-100 dark:bg-red-900' : 'bg-gray-100 dark:bg-gray-800'}
    >
      {#snippet icon()}
        <ExclamationCircleOutline class="h-6 w-6 {data.stats.clientsAtRisk > 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-600 dark:text-gray-400'}" />
      {/snippet}
    </StatCard>
  </div>

  <!-- Filters and Search -->
  <Card class="p-4">
    <div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
      <div class="flex flex-1 flex-wrap gap-3">
        <div class="min-w-[200px] flex-1 max-w-xs">
          <Input
            placeholder="Search clients..."
            value={searchValue}
            oninput={handleSearch}
            class="ps-9"
          >
            {#snippet left()}
              <SearchOutline class="h-5 w-5" />
            {/snippet}
          </Input>
        </div>
        <Select class="w-40" value={statusFilter} onchange={handleStatusChange}>
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
          <option value="churned">Churned</option>
        </Select>
        <Select class="w-40" value={healthFilter} onchange={handleHealthChange}>
          <option value="">All Health</option>
          <option value="excellent">Excellent (85+)</option>
          <option value="good">Good (70-84)</option>
          <option value="warning">Warning (50-69)</option>
          <option value="critical">Critical (&lt;50)</option>
        </Select>
      </div>
      <div class="flex items-center gap-2">
        {#if hasActiveFilters}
          <Button color="light" size="sm" onclick={clearFilters}>
            Clear Filters
          </Button>
        {/if}
        <Button color="light" size="sm" onclick={() => isFilterDrawerOpen = true}>
          <FilterOutline class="mr-2 h-4 w-4" />
          More Filters
        </Button>
      </div>
    </div>
  </Card>

  <!-- Main Content Grid -->
  <div class="grid gap-6 xl:grid-cols-4">
    <!-- Client Table (3 columns) -->
    <div class="xl:col-span-3">
      <Card class="overflow-hidden p-0">
        <Table striped hoverable>
          <TableHead>
            <TableHeadCell class="w-[250px]">Client</TableHeadCell>
            <TableHeadCell>Territory</TableHeadCell>
            <TableHeadCell>Health Score</TableHeadCell>
            <TableHeadCell>CPL</TableHeadCell>
            <TableHeadCell>Leads (MTD)</TableHeadCell>
            <TableHeadCell>Contract</TableHeadCell>
            <TableHeadCell class="w-[100px]">Actions</TableHeadCell>
          </TableHead>
          <TableBody>
            {#if data.clients.length === 0}
              <TableBodyRow>
                <TableBodyCell colspan={7} class="text-center py-8">
                  <div class="flex flex-col items-center gap-2">
                    <UsersGroupOutline class="h-12 w-12 text-gray-400" />
                    <p class="text-gray-500 dark:text-gray-400">No clients found</p>
                    {#if hasActiveFilters}
                      <Button color="light" size="sm" onclick={clearFilters}>
                        Clear filters
                      </Button>
                    {/if}
                  </div>
                </TableBodyCell>
              </TableBodyRow>
            {:else}
              {#each data.clients as client}
                <TableBodyRow
                  class="cursor-pointer"
                  onclick={() => viewClient(client.id)}
                >
                  <TableBodyCell>
                    <div class="flex items-center gap-3">
                      <Avatar size="sm" class="bg-primary-100 text-primary-600 dark:bg-primary-900 dark:text-primary-300">
                        {getInitials(client.name.split(' ')[0], client.name.split(' ')[1] || '')}
                      </Avatar>
                      <div>
                        <p class="font-medium text-gray-900 dark:text-white">{client.name}</p>
                        <OrgStatusBadge status={client.status} size="xs" showDot={false} />
                      </div>
                    </div>
                  </TableBodyCell>
                  <TableBodyCell>
                    {#if client.territory}
                      <span class="text-gray-900 dark:text-white">{client.territory.location}</span>
                    {:else}
                      <span class="text-gray-400">-</span>
                    {/if}
                  </TableBodyCell>
                  <TableBodyCell>
                    <HealthScoreBadge score={client.healthScore} />
                  </TableBodyCell>
                  <TableBodyCell>
                    <span class="font-medium {client.cpl > 100 ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-white'}">
                      {formatCurrency(client.cpl, { showCents: false })}
                    </span>
                  </TableBodyCell>
                  <TableBodyCell>
                    <span class="font-medium text-gray-900 dark:text-white">{client.leadsThisMonth}</span>
                  </TableBodyCell>
                  <TableBodyCell>
                    {#if client.contract}
                      <div class="flex flex-col gap-1">
                        <ContractStatusBadge status={client.contract.status} size="xs" />
                        <span class="text-xs text-gray-500">
                          {formatCurrency(client.contract.mrr)}/mo
                        </span>
                      </div>
                    {:else}
                      <span class="text-gray-400">No contract</span>
                    {/if}
                  </TableBodyCell>
                  <TableBodyCell>
                    <Button size="xs" color="light" onclick={(e: Event) => { e.stopPropagation(); viewClient(client.id); }}>
                      View
                    </Button>
                  </TableBodyCell>
                </TableBodyRow>
              {/each}
            {/if}
          </TableBody>
        </Table>

        <!-- Pagination -->
        {#if data.pagination.totalPages > 1}
          <div class="flex items-center justify-between border-t border-gray-200 px-4 py-3 dark:border-gray-700">
            <p class="text-sm text-gray-500 dark:text-gray-400">
              Showing {((data.pagination.page - 1) * data.pagination.limit) + 1} to {Math.min(data.pagination.page * data.pagination.limit, data.pagination.total)} of {data.pagination.total} clients
            </p>
            <div class="flex gap-2">
              <Button
                size="xs"
                color="light"
                disabled={data.pagination.page === 1}
                onclick={() => goToPage(data.pagination.page - 1)}
              >
                Previous
              </Button>
              <Button
                size="xs"
                color="light"
                disabled={data.pagination.page === data.pagination.totalPages}
                onclick={() => goToPage(data.pagination.page + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        {/if}
      </Card>
    </div>

    <!-- Quick Insights Panel (1 column) -->
    <div class="space-y-4 xl:col-span-1">
      <!-- Clients Needing Attention -->
      <Card class="p-4">
        <h3 class="mb-4 flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">
          <ExclamationCircleOutline class="h-5 w-5 text-red-500" />
          Needs Attention
        </h3>
        {#if data.clients.filter(c => c.healthScore < 50).length === 0}
          <p class="text-sm text-gray-500 dark:text-gray-400">All clients are healthy!</p>
        {:else}
          <div class="space-y-3">
            {#each data.clients.filter(c => c.healthScore < 50).slice(0, 5) as client}
              <button
                class="flex w-full items-center justify-between rounded-lg p-2 text-left hover:bg-gray-50 dark:hover:bg-gray-700"
                onclick={() => viewClient(client.id)}
              >
                <div class="flex items-center gap-2">
                  <Avatar size="xs" class="bg-red-100 text-red-600">
                    {getInitials(client.name.split(' ')[0], '')}
                  </Avatar>
                  <span class="text-sm font-medium text-gray-900 dark:text-white">{client.name}</span>
                </div>
                <HealthScoreBadge score={client.healthScore} showBar={false} size="sm" />
              </button>
            {/each}
          </div>
        {/if}
      </Card>

      <!-- Upcoming Renewals -->
      <Card class="p-4">
        <h3 class="mb-4 flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">
          <CalendarOutline class="h-5 w-5 text-yellow-500" />
          Upcoming Renewals
        </h3>
        {#if data.upcomingRenewals.length === 0}
          <p class="text-sm text-gray-500 dark:text-gray-400">No renewals in the next 30 days</p>
        {:else}
          <div class="space-y-3">
            {#each data.upcomingRenewals as renewal}
              {@const daysUntil = getDaysUntil(new Date(renewal.endDate))}
              <button
                class="flex w-full items-center justify-between rounded-lg p-2 text-left hover:bg-gray-50 dark:hover:bg-gray-700"
                onclick={() => viewClient(renewal.organizationId)}
              >
                <div class="flex flex-col">
                  <span class="text-sm font-medium text-gray-900 dark:text-white">{renewal.organizationName}</span>
                  <span class="text-xs text-gray-500">
                    {daysUntil === 0 ? 'Today' : daysUntil === 1 ? 'Tomorrow' : `${daysUntil} days`}
                  </span>
                </div>
                <Badge color={daysUntil <= 7 ? 'red' : daysUntil <= 14 ? 'yellow' : 'blue'}>
                  {formatDate(renewal.endDate, 'short')}
                </Badge>
              </button>
            {/each}
          </div>
        {/if}
      </Card>

      <!-- Quick Stats -->
      <Card class="p-4">
        <h3 class="mb-4 flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">
          <ArrowTrendingUpOutline class="h-5 w-5 text-blue-500" />
          This Month
        </h3>
        <div class="space-y-3">
          <div class="flex items-center justify-between">
            <span class="text-sm text-gray-500 dark:text-gray-400">Total Leads</span>
            <span class="font-medium text-gray-900 dark:text-white">{data.stats.totalLeadsThisMonth}</span>
          </div>
          <div class="flex items-center justify-between">
            <span class="text-sm text-gray-500 dark:text-gray-400">Active Campaigns</span>
            <span class="font-medium text-gray-900 dark:text-white">
              {data.clients.reduce((sum, c) => sum + c.activeCampaigns, 0)}
            </span>
          </div>
          <div class="flex items-center justify-between">
            <span class="text-sm text-gray-500 dark:text-gray-400">Suspended</span>
            <span class="font-medium text-yellow-600 dark:text-yellow-400">{data.stats.suspendedClients}</span>
          </div>
          <div class="flex items-center justify-between">
            <span class="text-sm text-gray-500 dark:text-gray-400">Churned MTD</span>
            <span class="font-medium text-red-600 dark:text-red-400">{data.stats.churnedThisMonth}</span>
          </div>
        </div>
      </Card>
    </div>
  </div>
</div>

<!-- Advanced Filters Drawer -->
<Drawer bind:open={isFilterDrawerOpen} placement="right" class="w-96">
  <div class="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
    <h5 class="text-lg font-semibold text-gray-900 dark:text-white">Advanced Filters</h5>
    <CloseButton onclick={() => isFilterDrawerOpen = false} />
  </div>
  <div class="p-4 space-y-4">
    <p class="text-sm text-gray-500 dark:text-gray-400">
      Additional filter options coming soon...
    </p>
    <div class="space-y-3">
      <label class="block">
        <span class="text-sm font-medium text-gray-700 dark:text-gray-300">Territory</span>
        <Select class="mt-1">
          <option value="">All Territories</option>
        </Select>
      </label>
      <label class="block">
        <span class="text-sm font-medium text-gray-700 dark:text-gray-300">Account Manager</span>
        <Select class="mt-1">
          <option value="">All Managers</option>
        </Select>
      </label>
      <label class="block">
        <span class="text-sm font-medium text-gray-700 dark:text-gray-300">Plan</span>
        <Select class="mt-1">
          <option value="">All Plans</option>
          <option value="starter">Starter</option>
          <option value="growth">Growth</option>
          <option value="enterprise">Enterprise</option>
        </Select>
      </label>
    </div>
  </div>
  <div class="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
    <div class="flex gap-2">
      <Button class="flex-1" color="light" onclick={() => { clearFilters(); isFilterDrawerOpen = false; }}>
        Clear All
      </Button>
      <Button class="flex-1" onclick={() => { applyFilters(); isFilterDrawerOpen = false; }}>
        Apply Filters
      </Button>
    </div>
  </div>
</Drawer>
