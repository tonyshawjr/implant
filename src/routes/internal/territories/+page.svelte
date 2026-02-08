<script lang="ts">
  import { enhance } from '$app/forms';
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
    Modal,
    Drawer,
    CloseButton,
    Label,
    Textarea,
    Avatar,
    Tabs,
    TabItem,
    Listgroup,
    ListgroupItem,
    Tooltip
  } from 'flowbite-svelte';
  import {
    SearchOutline,
    PlusOutline,
    FilterOutline,
    MapPinOutline,
    GlobeAltOutline,
    UsersGroupOutline,
    CashOutline,
    ExclamationCircleOutline,
    ClockOutline,
    CheckCircleOutline,
    XCircleOutline,
    EyeOutline,
    UserPlusOutline,
    TrashBinOutline,
    MapOutline,
    TableColumnOutline,
    AdjustmentsHorizontalOutline
  } from 'flowbite-svelte-icons';
  import { TerritoryStatusBadge, HealthScoreBadge } from '$lib/components/internal';
  import { StatCard } from '$lib/components/ui';
  import { MasterTerritoryMap, LocationSearch } from '$lib/components/maps';
  import { formatCurrency, formatCompactCurrency, formatDate, formatNumber, getInitials } from '$lib/utils';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();

  // View mode
  let viewMode = $state<'table' | 'map'>('table');

  // Filter state
  let searchValue = $state(data.filters.search);
  let statusFilter = $state(data.filters.status);
  let stateFilter = $state(data.filters.state);
  let typeFilter = $state(data.filters.type);
  let searchTimeout: ReturnType<typeof setTimeout>;

  // Modal states
  let showTerritoryDetail = $state(false);
  let showAddToWaitlist = $state(false);
  let showOverlapChecker = $state(false);
  let showLocationSearch = $state(false);
  let selectedTerritory = $state<typeof data.territories[0] | null>(null);

  // Map reference
  let masterMapRef: MasterTerritoryMap;

  // Waitlist form state
  let waitlistContactName = $state('');
  let waitlistContactEmail = $state('');
  let waitlistContactPhone = $state('');
  let waitlistPracticeName = $state('');

  // Overlap checker state
  let overlapLat = $state('');
  let overlapLng = $state('');
  let overlapRadius = $state('15');
  let overlapResults = $state<Array<{ id: string; name: string; location: string; status: string }>>([]);

  // Location search state
  let searchedLocation = $state<{ lat: number; lng: number; address: string } | null>(null);

  // Transform territories for the map component
  const mapTerritories = $derived(
    data.territories.map(t => ({
      id: t.id,
      name: t.name,
      centerLat: t.centerLat,
      centerLng: t.centerLng,
      radiusMiles: t.radiusMiles,
      status: t.status as 'locked' | 'available' | 'waitlist' | 'pending',
      city: t.city || undefined,
      state: t.state || undefined,
      population: t.population ?? undefined,
      monthlyBasePrice: t.monthlyBasePrice ?? undefined,
      client: t.client ? {
        name: t.client.name,
        id: t.client.id
      } : null
    }))
  );

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
    if (stateFilter) params.set('state', stateFilter);
    if (typeFilter) params.set('type', typeFilter);

    goto(`?${params.toString()}`, { replaceState: true });
  }

  // Handle filter changes
  function handleStatusChange(event: Event) {
    const target = event.target as HTMLSelectElement;
    statusFilter = target.value;
    applyFilters();
  }

  function handleStateChange(event: Event) {
    const target = event.target as HTMLSelectElement;
    stateFilter = target.value;
    applyFilters();
  }

  function handleTypeChange(event: Event) {
    const target = event.target as HTMLSelectElement;
    typeFilter = target.value;
    applyFilters();
  }

  // Clear all filters
  function clearFilters() {
    searchValue = '';
    statusFilter = '';
    stateFilter = '';
    typeFilter = '';
    goto('?', { replaceState: true });
  }

  // View territory detail
  function viewTerritory(territory: typeof data.territories[0]) {
    selectedTerritory = territory;
    showTerritoryDetail = true;
  }

  // Open add to waitlist modal
  function openAddToWaitlist(territory: typeof data.territories[0]) {
    selectedTerritory = territory;
    showAddToWaitlist = true;
  }

  // Reset waitlist form
  function resetWaitlistForm() {
    waitlistContactName = '';
    waitlistContactEmail = '';
    waitlistContactPhone = '';
    waitlistPracticeName = '';
  }

  // Handle territory click from map
  function handleTerritoryClick(event: CustomEvent<{ territory: any }>) {
    const mapTerritory = event.detail.territory;
    const fullTerritory = data.territories.find(t => t.id === mapTerritory.id);
    if (fullTerritory) {
      viewTerritory(fullTerritory);
    }
  }

  // Handle location search selection
  function handleLocationSelect(event: CustomEvent<{ result: any }>) {
    const { result } = event.detail;
    searchedLocation = {
      lat: result.lat,
      lng: result.lng,
      address: result.displayName
    };
    // Populate overlap checker with the coordinates
    overlapLat = result.lat.toString();
    overlapLng = result.lng.toString();
    showLocationSearch = false;
  }

  // Zoom to territory on map
  function zoomToTerritory(territoryId: string) {
    if (masterMapRef) {
      masterMapRef.zoomToTerritory(territoryId);
    }
    viewMode = 'map';
  }

  // Check if any filters are active
  let hasActiveFilters = $derived(!!searchValue || !!statusFilter || !!stateFilter || !!typeFilter);

  // Pagination
  function goToPage(newPage: number) {
    const params = new URLSearchParams(page.url.searchParams);
    params.set('page', newPage.toString());
    goto(`?${params.toString()}`, { replaceState: true });
  }
</script>

<div class="space-y-6">
  <!-- Page Header -->
  <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
    <div>
      <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Territory Management</h1>
      <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
        Manage territories, availability, and waitlists
      </p>
    </div>
    <div class="flex gap-2">
      <Button color="light" size="sm" onclick={() => showLocationSearch = true}>
        <SearchOutline class="mr-2 h-4 w-4" />
        Find Location
      </Button>
      <Button color="light" size="sm" onclick={() => showOverlapChecker = true}>
        <ExclamationCircleOutline class="mr-2 h-4 w-4" />
        Check Overlap
      </Button>
      <Button size="sm" href="/internal/territories/new">
        <PlusOutline class="mr-2 h-4 w-4" />
        Add Territory
      </Button>
    </div>
  </div>

  <!-- Summary Stats -->
  <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
    <StatCard
      title="Total Territories"
      value={data.stats.total.toString()}
    >
      {#snippet icon()}
        <GlobeAltOutline class="h-6 w-6 text-primary-600 dark:text-primary-400" />
      {/snippet}
    </StatCard>

    <StatCard
      title="Locked"
      value={data.stats.locked.toString()}
      iconBgColor="bg-red-100 dark:bg-red-900"
    >
      {#snippet icon()}
        <MapPinOutline class="h-6 w-6 text-red-600 dark:text-red-400" />
      {/snippet}
    </StatCard>

    <StatCard
      title="Available"
      value={data.stats.available.toString()}
      iconBgColor="bg-green-100 dark:bg-green-900"
    >
      {#snippet icon()}
        <CheckCircleOutline class="h-6 w-6 text-green-600 dark:text-green-400" />
      {/snippet}
    </StatCard>

    <StatCard
      title="Monthly Revenue"
      value={formatCompactCurrency(data.stats.monthlyRevenue)}
      iconBgColor="bg-blue-100 dark:bg-blue-900"
    >
      {#snippet icon()}
        <CashOutline class="h-6 w-6 text-blue-600 dark:text-blue-400" />
      {/snippet}
    </StatCard>
  </div>

  <!-- Map View (Collapsible) -->
  <Card class="p-0 overflow-hidden">
    <div class="flex items-center justify-between border-b border-gray-200 p-4 dark:border-gray-700">
      <h2 class="flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-white">
        <GlobeAltOutline class="h-5 w-5 text-primary-600" />
        Territory Map
      </h2>
      <div class="flex items-center gap-2">
        <Button
          size="xs"
          color={viewMode === 'map' ? 'primary' : 'light'}
          onclick={() => viewMode = 'map'}
        >
          <MapOutline class="mr-1 h-4 w-4" />
          Map
        </Button>
        <Button
          size="xs"
          color={viewMode === 'table' ? 'primary' : 'light'}
          onclick={() => viewMode = 'table'}
        >
          <TableColumnOutline class="mr-1 h-4 w-4" />
          Table
        </Button>
      </div>
    </div>

    {#if viewMode === 'map'}
      <div class="p-4">
        <MasterTerritoryMap
          bind:this={masterMapRef}
          territories={mapTerritories}
          height="500px"
          selectedTerritoryId={selectedTerritory?.id}
          on:territoryClick={handleTerritoryClick}
        />
      </div>
    {/if}
  </Card>

  <!-- Filters and Search -->
  <Card class="p-4">
    <div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
      <div class="flex flex-1 flex-wrap gap-3">
        <div class="min-w-[200px] flex-1 max-w-xs">
          <Input
            placeholder="Search by city, state, ZIP..."
            value={searchValue}
            oninput={handleSearch}
            class="ps-9"
          >
            {#snippet left()}
              <SearchOutline class="h-5 w-5" />
            {/snippet}
          </Input>
        </div>
        <Select class="w-36" value={statusFilter} onchange={handleStatusChange}>
          <option value="">All Status</option>
          <option value="available">Available</option>
          <option value="locked">Locked</option>
          <option value="waitlist">Waitlist</option>
        </Select>
        <Select class="w-32" value={stateFilter} onchange={handleStateChange}>
          <option value="">All States</option>
          {#each data.states as state}
            <option value={state}>{state}</option>
          {/each}
        </Select>
        <Select class="w-36" value={typeFilter} onchange={handleTypeChange}>
          <option value="">All Types</option>
          <option value="standard">Standard</option>
          <option value="premium">Premium</option>
          <option value="metro">Metro</option>
        </Select>
      </div>
      <div class="flex items-center gap-2">
        {#if hasActiveFilters}
          <Button color="light" size="sm" onclick={clearFilters}>
            Clear Filters
          </Button>
        {/if}
      </div>
    </div>
  </Card>

  <!-- Territories Table -->
  {#if viewMode === 'table'}
    <Card class="overflow-hidden p-0">
      <Table striped hoverable>
        <TableHead>
          <TableHeadCell class="w-[200px]">Territory</TableHeadCell>
          <TableHeadCell>Location</TableHeadCell>
          <TableHeadCell>Status</TableHeadCell>
          <TableHeadCell>Client</TableHeadCell>
          <TableHeadCell>Revenue</TableHeadCell>
          <TableHeadCell>Demographics</TableHeadCell>
          <TableHeadCell>Waitlist</TableHeadCell>
          <TableHeadCell class="w-[140px]">Actions</TableHeadCell>
        </TableHead>
        <TableBody>
          {#if data.territories.length === 0}
            <TableBodyRow>
              <TableBodyCell colspan={8} class="text-center py-8">
                <div class="flex flex-col items-center gap-2">
                  <GlobeAltOutline class="h-12 w-12 text-gray-400" />
                  <p class="text-gray-500 dark:text-gray-400">No territories found</p>
                  {#if hasActiveFilters}
                    <Button color="light" size="sm" onclick={clearFilters}>
                      Clear filters
                    </Button>
                  {/if}
                </div>
              </TableBodyCell>
            </TableBodyRow>
          {:else}
            {#each data.territories as territory}
              <TableBodyRow
                class="cursor-pointer"
                onclick={() => viewTerritory(territory)}
              >
                <TableBodyCell>
                  <div>
                    <p class="font-medium text-gray-900 dark:text-white">{territory.name}</p>
                    <div class="flex items-center gap-1 mt-1">
                      <Badge color="dark">{territory.type}</Badge>
                      <span class="text-xs text-gray-500">{territory.radiusMiles} mi</span>
                    </div>
                  </div>
                </TableBodyCell>
                <TableBodyCell>
                  <div class="flex items-center gap-1">
                    <MapPinOutline class="h-4 w-4 text-gray-400" />
                    <span>{territory.location}</span>
                  </div>
                </TableBodyCell>
                <TableBodyCell>
                  <TerritoryStatusBadge status={territory.status} />
                </TableBodyCell>
                <TableBodyCell>
                  {#if territory.client}
                    <div class="flex items-center gap-2">
                      <Avatar size="xs" class="bg-primary-100 text-primary-600">
                        {getInitials(territory.client.name.split(' ')[0], '')}
                      </Avatar>
                      <div>
                        <p class="text-sm font-medium text-gray-900 dark:text-white">{territory.client.name}</p>
                        <HealthScoreBadge score={territory.client.healthScore} showBar={false} size="sm" />
                      </div>
                    </div>
                  {:else}
                    <span class="text-gray-400">-</span>
                  {/if}
                </TableBodyCell>
                <TableBodyCell>
                  {#if territory.client}
                    <span class="font-medium text-gray-900 dark:text-white">
                      {formatCurrency(territory.client.monthlyRate)}/mo
                    </span>
                  {:else if territory.monthlyBasePrice}
                    <span class="text-gray-500">
                      {formatCurrency(territory.monthlyBasePrice)}/mo base
                    </span>
                  {:else}
                    <span class="text-gray-400">-</span>
                  {/if}
                </TableBodyCell>
                <TableBodyCell>
                  <div class="text-sm">
                    {#if territory.population}
                      <p class="text-gray-900 dark:text-white">{formatNumber(territory.population)} pop</p>
                    {/if}
                    {#if territory.medianIncome}
                      <p class="text-gray-500">{formatCurrency(territory.medianIncome, { showCents: false })} income</p>
                    {/if}
                  </div>
                </TableBodyCell>
                <TableBodyCell>
                  {#if territory.counts.waitlist > 0}
                    <Badge color="yellow">
                      <ClockOutline class="mr-1 h-3 w-3" />
                      {territory.counts.waitlist}
                    </Badge>
                  {:else}
                    <span class="text-gray-400">-</span>
                  {/if}
                </TableBodyCell>
                <TableBodyCell>
                  <div class="flex gap-1">
                    <Button size="xs" color="light" onclick={(e: Event) => { e.stopPropagation(); viewTerritory(territory); }}>
                      <EyeOutline class="h-3 w-3" />
                    </Button>
                    <Button size="xs" color="light" onclick={(e: Event) => { e.stopPropagation(); zoomToTerritory(territory.id); }}>
                      <MapOutline class="h-3 w-3" />
                    </Button>
                    {#if territory.status !== 'locked'}
                      <Button size="xs" color="light" onclick={(e: Event) => { e.stopPropagation(); openAddToWaitlist(territory); }}>
                        <UserPlusOutline class="h-3 w-3" />
                      </Button>
                    {/if}
                  </div>
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
            Showing {((data.pagination.page - 1) * data.pagination.limit) + 1} to {Math.min(data.pagination.page * data.pagination.limit, data.pagination.total)} of {data.pagination.total} territories
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
  {/if}

  <!-- Waitlist Summary Panel -->
  {#if data.stats.totalWaitlistEntries > 0}
    <Card class="p-4">
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
          Waitlist Overview
        </h3>
        <Badge color="yellow">{data.stats.totalWaitlistEntries} waiting</Badge>
      </div>
      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {#each data.territories.filter(t => t.counts.waitlist > 0).slice(0, 6) as territory}
          <div class="p-3 rounded-lg border border-gray-200 dark:border-gray-700">
            <div class="flex items-center justify-between mb-2">
              <p class="font-medium text-gray-900 dark:text-white">{territory.name}</p>
              <Badge color="yellow">{territory.counts.waitlist}</Badge>
            </div>
            <p class="text-sm text-gray-500">{territory.location}</p>
            {#if territory.waitlist.length > 0}
              <div class="mt-2 space-y-1">
                {#each territory.waitlist.slice(0, 2) as entry}
                  <div class="flex items-center justify-between text-xs">
                    <span class="text-gray-600 dark:text-gray-400">#{entry.position} {entry.contactName}</span>
                    <span class="text-gray-500">{formatDate(entry.joinedAt, 'short')}</span>
                  </div>
                {/each}
                {#if territory.waitlist.length > 2}
                  <p class="text-xs text-gray-400">+{territory.counts.waitlist - 2} more</p>
                {/if}
              </div>
            {/if}
          </div>
        {/each}
      </div>
    </Card>
  {/if}
</div>

<!-- Territory Detail Modal -->
<Modal bind:open={showTerritoryDetail} size="lg" title={selectedTerritory?.name || 'Territory Details'}>
  {#if selectedTerritory}
    <div class="space-y-6">
      <!-- Status and Location -->
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-3">
          <TerritoryStatusBadge status={selectedTerritory.status} />
          <Badge color="dark">{selectedTerritory.type}</Badge>
        </div>
        <span class="text-sm text-gray-500">{selectedTerritory.radiusMiles} mile radius</span>
      </div>

      <!-- Location Info -->
      <div class="grid gap-4 sm:grid-cols-2">
        <div>
          <h4 class="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Location</h4>
          <p class="text-lg font-medium text-gray-900 dark:text-white">{selectedTerritory.location}</p>
          <p class="text-sm text-gray-500">
            Lat: {selectedTerritory.centerLat.toFixed(4)}, Lng: {selectedTerritory.centerLng.toFixed(4)}
          </p>
        </div>
        <div>
          <h4 class="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Pricing</h4>
          {#if selectedTerritory.client}
            <p class="text-lg font-medium text-gray-900 dark:text-white">
              {formatCurrency(selectedTerritory.client.monthlyRate)}/month
            </p>
            <p class="text-sm text-gray-500">Current rate</p>
          {:else if selectedTerritory.monthlyBasePrice}
            <p class="text-lg font-medium text-gray-900 dark:text-white">
              {formatCurrency(selectedTerritory.monthlyBasePrice)}/month
            </p>
            <p class="text-sm text-gray-500">Base price</p>
          {:else}
            <p class="text-gray-400">No pricing set</p>
          {/if}
        </div>
      </div>

      <!-- Demographics -->
      <div>
        <h4 class="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">Demographics</h4>
        <div class="grid gap-3 sm:grid-cols-3">
          {#if selectedTerritory.population}
            <div class="p-3 rounded-lg bg-gray-50 dark:bg-gray-700">
              <p class="text-xs text-gray-500 dark:text-gray-400">Population</p>
              <p class="text-lg font-medium text-gray-900 dark:text-white">{formatNumber(selectedTerritory.population)}</p>
            </div>
          {/if}
          {#if selectedTerritory.households}
            <div class="p-3 rounded-lg bg-gray-50 dark:bg-gray-700">
              <p class="text-xs text-gray-500 dark:text-gray-400">Households</p>
              <p class="text-lg font-medium text-gray-900 dark:text-white">{formatNumber(selectedTerritory.households)}</p>
            </div>
          {/if}
          {#if selectedTerritory.medianIncome}
            <div class="p-3 rounded-lg bg-gray-50 dark:bg-gray-700">
              <p class="text-xs text-gray-500 dark:text-gray-400">Median Income</p>
              <p class="text-lg font-medium text-gray-900 dark:text-white">{formatCurrency(selectedTerritory.medianIncome, { showCents: false })}</p>
            </div>
          {/if}
          {#if selectedTerritory.medianAge}
            <div class="p-3 rounded-lg bg-gray-50 dark:bg-gray-700">
              <p class="text-xs text-gray-500 dark:text-gray-400">Median Age</p>
              <p class="text-lg font-medium text-gray-900 dark:text-white">{selectedTerritory.medianAge}</p>
            </div>
          {/if}
          {#if selectedTerritory.implantCandidates}
            <div class="p-3 rounded-lg bg-gray-50 dark:bg-gray-700">
              <p class="text-xs text-gray-500 dark:text-gray-400">Implant Candidates</p>
              <p class="text-lg font-medium text-gray-900 dark:text-white">{formatNumber(selectedTerritory.implantCandidates)}</p>
            </div>
          {/if}
          {#if selectedTerritory.competitionCount !== null}
            <div class="p-3 rounded-lg bg-gray-50 dark:bg-gray-700">
              <p class="text-xs text-gray-500 dark:text-gray-400">Competitors</p>
              <p class="text-lg font-medium text-gray-900 dark:text-white">{selectedTerritory.competitionCount}</p>
            </div>
          {/if}
        </div>
      </div>

      <!-- Current Client (if locked) -->
      {#if selectedTerritory.client}
        <div>
          <h4 class="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">Current Client</h4>
          <div class="p-4 rounded-lg border border-gray-200 dark:border-gray-700">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-3">
                <Avatar size="md" class="bg-primary-100 text-primary-600">
                  {getInitials(selectedTerritory.client.name.split(' ')[0], '')}
                </Avatar>
                <div>
                  <p class="font-medium text-gray-900 dark:text-white">{selectedTerritory.client.name}</p>
                  <HealthScoreBadge score={selectedTerritory.client.healthScore} showLabel />
                </div>
              </div>
              <Button size="sm" href={`/internal/clients/${selectedTerritory.client.id}`}>
                View Client
              </Button>
            </div>
          </div>
        </div>
      {/if}

      <!-- Waitlist -->
      {#if selectedTerritory.waitlist.length > 0}
        <div>
          <h4 class="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">
            Waitlist ({selectedTerritory.counts.waitlist})
          </h4>
          <div class="space-y-2">
            {#each selectedTerritory.waitlist as entry}
              <div class="flex items-center justify-between p-3 rounded-lg border border-gray-200 dark:border-gray-700">
                <div>
                  <div class="flex items-center gap-2">
                    <Badge color="dark">#{entry.position}</Badge>
                    <span class="font-medium text-gray-900 dark:text-white">{entry.contactName}</span>
                  </div>
                  {#if entry.practiceName}
                    <p class="text-sm text-gray-500">{entry.practiceName}</p>
                  {/if}
                  <p class="text-xs text-gray-400">{entry.contactEmail}</p>
                </div>
                <div class="text-right">
                  <p class="text-sm text-gray-500">{formatDate(entry.joinedAt, 'medium')}</p>
                  <form method="POST" action="?/removeFromWaitlist" use:enhance class="mt-1">
                    <input type="hidden" name="waitlistId" value={entry.id} />
                    <input type="hidden" name="territoryId" value={selectedTerritory.id} />
                    <Button type="submit" size="xs" color="red" outline>
                      <TrashBinOutline class="h-3 w-3" />
                    </Button>
                  </form>
                </div>
              </div>
            {/each}
          </div>
        </div>
      {/if}

      <!-- Performance -->
      <div class="grid gap-4 sm:grid-cols-3">
        <div class="p-3 rounded-lg bg-gray-50 dark:bg-gray-700">
          <p class="text-xs text-gray-500 dark:text-gray-400">Total Leads</p>
          <p class="text-lg font-medium text-gray-900 dark:text-white">{selectedTerritory.counts.leads}</p>
        </div>
        <div class="p-3 rounded-lg bg-gray-50 dark:bg-gray-700">
          <p class="text-xs text-gray-500 dark:text-gray-400">Campaigns</p>
          <p class="text-lg font-medium text-gray-900 dark:text-white">{selectedTerritory.counts.campaigns}</p>
        </div>
        {#if selectedTerritory.performanceScore}
          <div class="p-3 rounded-lg bg-gray-50 dark:bg-gray-700">
            <p class="text-xs text-gray-500 dark:text-gray-400">Performance Score</p>
            <p class="text-lg font-medium text-gray-900 dark:text-white">{selectedTerritory.performanceScore}</p>
          </div>
        {/if}
      </div>
    </div>
  {/if}
  <div class="flex justify-end gap-2 mt-6">
    <Button color="light" onclick={() => showTerritoryDetail = false}>Close</Button>
    {#if selectedTerritory}
      <Button color="light" onclick={() => zoomToTerritory(selectedTerritory!.id)}>
        <MapOutline class="mr-2 h-4 w-4" />
        View on Map
      </Button>
      {#if selectedTerritory.status !== 'locked'}
        <Button onclick={() => { showTerritoryDetail = false; openAddToWaitlist(selectedTerritory!); }}>
          <UserPlusOutline class="mr-2 h-4 w-4" />
          Add to Waitlist
        </Button>
      {/if}
    {/if}
  </div>
</Modal>

<!-- Add to Waitlist Modal -->
<Modal bind:open={showAddToWaitlist} size="md" title="Add to Waitlist">
  {#if selectedTerritory}
    <form method="POST" action="?/addToWaitlist" use:enhance={() => {
      return async ({ result }) => {
        if (result.type === 'success') {
          showAddToWaitlist = false;
          resetWaitlistForm();
        }
      };
    }}>
      <input type="hidden" name="territoryId" value={selectedTerritory.id} />

      <div class="mb-4 p-3 rounded-lg bg-gray-50 dark:bg-gray-700">
        <p class="text-sm text-gray-500">Adding to waitlist for:</p>
        <p class="font-medium text-gray-900 dark:text-white">{selectedTerritory.name}</p>
        <p class="text-sm text-gray-500">{selectedTerritory.location}</p>
      </div>

      <div class="space-y-4">
        <div>
          <Label for="contactName">Contact Name *</Label>
          <Input id="contactName" name="contactName" bind:value={waitlistContactName} required placeholder="John Smith" />
        </div>
        <div>
          <Label for="contactEmail">Email *</Label>
          <Input id="contactEmail" name="contactEmail" type="email" bind:value={waitlistContactEmail} required placeholder="john@example.com" />
        </div>
        <div>
          <Label for="contactPhone">Phone</Label>
          <Input id="contactPhone" name="contactPhone" type="tel" bind:value={waitlistContactPhone} placeholder="(555) 123-4567" />
        </div>
        <div>
          <Label for="practiceName">Practice Name</Label>
          <Input id="practiceName" name="practiceName" bind:value={waitlistPracticeName} placeholder="Smile Dental Group" />
        </div>
      </div>

      <div class="mt-6 flex justify-end gap-2">
        <Button color="light" onclick={() => showAddToWaitlist = false}>Cancel</Button>
        <Button type="submit">
          <UserPlusOutline class="mr-2 h-4 w-4" />
          Add to Waitlist
        </Button>
      </div>
    </form>
  {/if}
</Modal>

<!-- Location Search Modal -->
<Modal bind:open={showLocationSearch} size="md" title="Find Location">
  <div class="space-y-4">
    <p class="text-sm text-gray-500 dark:text-gray-400">
      Search for a location to find nearby territories or check for overlap.
    </p>

    <LocationSearch
      placeholder="Search for city, address, or ZIP code..."
      on:select={handleLocationSelect}
    />

    {#if searchedLocation}
      <div class="p-4 rounded-lg border border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20">
        <div class="flex items-start gap-3">
          <CheckCircleOutline class="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5" />
          <div>
            <p class="font-medium text-gray-900 dark:text-white">Location Found</p>
            <p class="text-sm text-gray-600 dark:text-gray-300">{searchedLocation.address}</p>
            <p class="text-xs text-gray-500 mt-1">
              Coordinates: {searchedLocation.lat.toFixed(4)}, {searchedLocation.lng.toFixed(4)}
            </p>
          </div>
        </div>
        <div class="mt-3 flex gap-2">
          <Button size="sm" onclick={() => { showLocationSearch = false; showOverlapChecker = true; }}>
            <ExclamationCircleOutline class="mr-2 h-4 w-4" />
            Check Overlap
          </Button>
        </div>
      </div>
    {/if}
  </div>

  <div class="mt-6 flex justify-end">
    <Button color="light" onclick={() => showLocationSearch = false}>Close</Button>
  </div>
</Modal>

<!-- Overlap Checker Modal -->
<Modal bind:open={showOverlapChecker} size="md" title="Territory Overlap Checker">
  <form method="POST" action="?/checkOverlap" use:enhance={() => {
    return async ({ result, update }) => {
      if (result.type === 'success' && result.data) {
        overlapResults = (result.data as any).overlapping || [];
      }
      await update();
    };
  }}>
    <p class="mb-4 text-sm text-gray-500 dark:text-gray-400">
      Check if a proposed territory would overlap with existing territories.
    </p>

    <div class="space-y-4">
      <div class="grid gap-4 sm:grid-cols-2">
        <div>
          <Label for="lat">Latitude</Label>
          <Input id="lat" name="lat" type="number" step="any" bind:value={overlapLat} required placeholder="32.7767" />
        </div>
        <div>
          <Label for="lng">Longitude</Label>
          <Input id="lng" name="lng" type="number" step="any" bind:value={overlapLng} required placeholder="-96.7970" />
        </div>
      </div>
      <div>
        <Label for="radius">Radius (miles)</Label>
        <Input id="radius" name="radius" type="number" bind:value={overlapRadius} required />
      </div>
    </div>

    <div class="mt-4">
      <Button type="submit" class="w-full">
        <ExclamationCircleOutline class="mr-2 h-4 w-4" />
        Check for Overlaps
      </Button>
    </div>
  </form>

  {#if overlapResults.length > 0}
    <div class="mt-6">
      <h4 class="text-sm font-medium text-red-600 dark:text-red-400 mb-3">
        {overlapResults.length} Overlapping {overlapResults.length === 1 ? 'Territory' : 'Territories'} Found
      </h4>
      <div class="space-y-2">
        {#each overlapResults as territory}
          <div class="flex items-center justify-between p-3 rounded-lg border border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20">
            <div>
              <p class="font-medium text-gray-900 dark:text-white">{territory.name}</p>
              <p class="text-sm text-gray-500">{territory.location}</p>
            </div>
            <TerritoryStatusBadge status={territory.status} />
          </div>
        {/each}
      </div>
    </div>
  {:else if overlapLat && overlapLng}
    <div class="mt-6 p-4 rounded-lg border border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20">
      <div class="flex items-center gap-2">
        <CheckCircleOutline class="h-5 w-5 text-green-600 dark:text-green-400" />
        <p class="text-green-700 dark:text-green-400">No overlapping territories found!</p>
      </div>
    </div>
  {/if}

  <div class="mt-6 flex justify-end">
    <Button color="light" onclick={() => { showOverlapChecker = false; overlapResults = []; }}>Close</Button>
  </div>
</Modal>
