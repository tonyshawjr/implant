<script lang="ts">
  import { Card, Badge, Button, Table, TableHead, TableHeadCell, TableBody, TableBodyRow, TableBodyCell, Alert } from 'flowbite-svelte';
  import {
    MapPinOutline,
    UsersGroupOutline,
    HomeOutline,
    CashOutline,
    ChartOutline,
    BuildingOutline,
    CalendarMonthOutline,
    CheckCircleOutline,
    InfoCircleOutline,
    GlobeOutline,
    RefreshOutline
  } from 'flowbite-svelte-icons';
  import { TerritoryMap } from '$lib/components/maps';
  import { formatCurrency, formatNumber, formatDate } from '$lib/utils';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();

  // Reference to the map component for programmatic control
  let territoryMapRef: TerritoryMap;

  // Territory type label mapping
  const territoryTypeLabels: Record<string, string> = {
    standard: 'Standard',
    premium: 'Premium',
    metro: 'Metro Area'
  };

  // Get territory type badge color
  function getTypeColor(type: string): 'blue' | 'purple' | 'green' {
    switch (type) {
      case 'premium': return 'purple';
      case 'metro': return 'green';
      default: return 'blue';
    }
  }

  // Handle map interaction
  function handleMapClick() {
    if (territoryMapRef) {
      territoryMapRef.openPopup();
    }
  }
</script>

<div class="space-y-6">
  <!-- Page Header -->
  <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
    <div>
      <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Territory</h1>
      <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
        View your exclusive territory coverage and demographics.
      </p>
    </div>
    {#if data.territory && data.assignment}
      <Badge color="green" class="gap-2 px-3 py-1.5 text-sm">
        <CheckCircleOutline class="h-4 w-4" />
        Exclusive Territory
      </Badge>
    {/if}
  </div>

  {#if !data.territory}
    <!-- No Territory State -->
    <Alert color="blue" class="border">
      <div class="flex items-center gap-3">
        <InfoCircleOutline class="h-5 w-5 flex-shrink-0" />
        <span><span class="font-medium">No territory assigned.</span> Contact your account manager to set up your exclusive territory.</span>
      </div>
    </Alert>

    <!-- Placeholder for territories page -->
    <Card class="p-8">
      <div class="flex flex-col items-center text-center">
        <div class="rounded-full bg-primary-100 p-4 dark:bg-primary-900">
          <GlobeOutline class="h-12 w-12 text-primary-600 dark:text-primary-400" />
        </div>
        <h2 class="mt-4 text-xl font-semibold text-gray-900 dark:text-white">
          Secure Your Exclusive Territory
        </h2>
        <p class="mt-2 max-w-md text-gray-500 dark:text-gray-400">
          Get exclusive access to a geographic territory with no competition on our platform.
          Each territory includes leads, demographics, and marketing support.
        </p>
        <Button class="mt-6" href="/support">
          Contact Sales
        </Button>
      </div>
    </Card>
  {:else}
    <div class="grid gap-6 lg:grid-cols-3">
      <!-- Map Section -->
      <div class="lg:col-span-2">
        <Card class="h-full p-0 overflow-hidden">
          <div class="flex items-center justify-between border-b border-gray-200 p-4 dark:border-gray-700">
            <h2 class="flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-white">
              <GlobeOutline class="h-5 w-5 text-primary-600" />
              Territory Map
            </h2>
            <Button
              size="xs"
              color="light"
              onclick={handleMapClick}
              title="Show territory details"
            >
              <MapPinOutline class="h-4 w-4" />
            </Button>
          </div>
          <TerritoryMap
            bind:this={territoryMapRef}
            centerLat={data.territory.centerLat}
            centerLng={data.territory.centerLng}
            radiusMiles={data.territory.radiusMiles}
            territoryName={data.territory.name}
            territorySubtitle="{data.territory.city}, {data.territory.state}"
            height="400px"
            showZoomControl={true}
            scrollWheelZoom={true}
          />
        </Card>
      </div>

      <!-- Territory Info Panel -->
      <div class="space-y-6">
        <!-- Territory Details Card -->
        <Card>
          <h3 class="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-white">
            <MapPinOutline class="h-5 w-5 text-primary-600" />
            Territory Details
          </h3>
          <dl class="space-y-3">
            <div class="flex justify-between">
              <dt class="text-sm text-gray-500 dark:text-gray-400">Name</dt>
              <dd class="text-sm font-medium text-gray-900 dark:text-white">{data.territory.name}</dd>
            </div>
            <div class="flex justify-between">
              <dt class="text-sm text-gray-500 dark:text-gray-400">Location</dt>
              <dd class="text-sm font-medium text-gray-900 dark:text-white">
                {data.territory.city}, {data.territory.state}
              </dd>
            </div>
            <div class="flex justify-between">
              <dt class="text-sm text-gray-500 dark:text-gray-400">Radius</dt>
              <dd class="text-sm font-medium text-gray-900 dark:text-white">
                {data.territory.radiusMiles} miles
              </dd>
            </div>
            <div class="flex justify-between">
              <dt class="text-sm text-gray-500 dark:text-gray-400">Type</dt>
              <dd>
                <Badge color={getTypeColor(data.territory.territoryType)}>
                  {territoryTypeLabels[data.territory.territoryType] || data.territory.territoryType}
                </Badge>
              </dd>
            </div>
            <div class="flex justify-between">
              <dt class="text-sm text-gray-500 dark:text-gray-400">Coordinates</dt>
              <dd class="text-xs font-mono text-gray-600 dark:text-gray-300">
                {data.territory.centerLat.toFixed(4)}, {data.territory.centerLng.toFixed(4)}
              </dd>
            </div>
            {#if data.assignment}
              <div class="border-t border-gray-200 pt-3 dark:border-gray-700">
                <div class="flex justify-between">
                  <dt class="text-sm text-gray-500 dark:text-gray-400">Assigned</dt>
                  <dd class="text-sm font-medium text-gray-900 dark:text-white">
                    {formatDate(data.assignment.assignedAt, 'medium')}
                  </dd>
                </div>
              </div>
              <div class="flex justify-between">
                <dt class="text-sm text-gray-500 dark:text-gray-400">Monthly Rate</dt>
                <dd class="text-sm font-medium text-gray-900 dark:text-white">
                  {formatCurrency(data.assignment.monthlyRate)}
                </dd>
              </div>
              {#if data.assignment.expiresAt}
                <div class="flex justify-between">
                  <dt class="text-sm text-gray-500 dark:text-gray-400">Contract Ends</dt>
                  <dd class="text-sm font-medium text-gray-900 dark:text-white">
                    {formatDate(data.assignment.expiresAt, 'medium')}
                  </dd>
                </div>
              {/if}
            {/if}
          </dl>
        </Card>

        <!-- Demographics Card -->
        <Card>
          <h3 class="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-white">
            <ChartOutline class="h-5 w-5 text-primary-600" />
            Demographics
          </h3>
          <div class="grid grid-cols-2 gap-4">
            <div class="rounded-lg bg-gray-50 p-3 dark:bg-gray-700">
              <div class="flex items-center gap-2">
                <UsersGroupOutline class="h-4 w-4 text-gray-500" />
                <span class="text-xs text-gray-500 dark:text-gray-400">Population</span>
              </div>
              <p class="mt-1 text-lg font-semibold text-gray-900 dark:text-white">
                {data.territory.population ? formatNumber(data.territory.population) : 'N/A'}
              </p>
            </div>
            <div class="rounded-lg bg-gray-50 p-3 dark:bg-gray-700">
              <div class="flex items-center gap-2">
                <HomeOutline class="h-4 w-4 text-gray-500" />
                <span class="text-xs text-gray-500 dark:text-gray-400">Households</span>
              </div>
              <p class="mt-1 text-lg font-semibold text-gray-900 dark:text-white">
                {data.territory.households ? formatNumber(data.territory.households) : 'N/A'}
              </p>
            </div>
            <div class="rounded-lg bg-gray-50 p-3 dark:bg-gray-700">
              <div class="flex items-center gap-2">
                <CashOutline class="h-4 w-4 text-gray-500" />
                <span class="text-xs text-gray-500 dark:text-gray-400">Median Income</span>
              </div>
              <p class="mt-1 text-lg font-semibold text-gray-900 dark:text-white">
                {data.territory.medianIncome ? formatCurrency(data.territory.medianIncome, { showCents: false }) : 'N/A'}
              </p>
            </div>
            <div class="rounded-lg bg-gray-50 p-3 dark:bg-gray-700">
              <div class="flex items-center gap-2">
                <CalendarMonthOutline class="h-4 w-4 text-gray-500" />
                <span class="text-xs text-gray-500 dark:text-gray-400">Median Age</span>
              </div>
              <p class="mt-1 text-lg font-semibold text-gray-900 dark:text-white">
                {data.territory.medianAge ? data.territory.medianAge.toFixed(1) : 'N/A'}
              </p>
            </div>
          </div>
        </Card>

        <!-- Market Potential Card -->
        <Card>
          <h3 class="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-white">
            <BuildingOutline class="h-5 w-5 text-primary-600" />
            Market Potential
          </h3>
          <dl class="space-y-3">
            <div class="flex justify-between">
              <dt class="text-sm text-gray-500 dark:text-gray-400">Est. Implant Candidates</dt>
              <dd class="text-sm font-semibold text-primary-600 dark:text-primary-400">
                {data.territory.implantCandidates ? formatNumber(data.territory.implantCandidates) : 'N/A'}
              </dd>
            </div>
            <div class="flex justify-between">
              <dt class="text-sm text-gray-500 dark:text-gray-400">Competitor Count</dt>
              <dd class="text-sm font-medium text-gray-900 dark:text-white">
                {data.territory.competitionCount ?? 'N/A'}
              </dd>
            </div>
            {#if data.territory.performanceScore}
              <div class="flex justify-between">
                <dt class="text-sm text-gray-500 dark:text-gray-400">Performance Score</dt>
                <dd>
                  <Badge color={data.territory.performanceScore >= 70 ? 'green' : data.territory.performanceScore >= 50 ? 'yellow' : 'red'}>
                    {data.territory.performanceScore.toFixed(0)}%
                  </Badge>
                </dd>
              </div>
            {/if}
          </dl>
        </Card>
      </div>
    </div>

    <!-- Territory Coverage Area -->
    <Card>
      <div class="mb-4 flex items-center justify-between">
        <h3 class="flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-white">
          <GlobeOutline class="h-5 w-5 text-primary-600" />
          Coverage Area
        </h3>
        <div class="text-sm text-gray-500 dark:text-gray-400">
          Approximately {Math.round(Math.PI * data.territory.radiusMiles * data.territory.radiusMiles).toLocaleString()} sq mi
        </div>
      </div>
      <div class="grid gap-4 sm:grid-cols-3">
        <div class="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
          <p class="text-sm text-gray-500 dark:text-gray-400">Center Point</p>
          <p class="mt-1 font-medium text-gray-900 dark:text-white">
            {data.territory.city}, {data.territory.state}
          </p>
        </div>
        <div class="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
          <p class="text-sm text-gray-500 dark:text-gray-400">Radius</p>
          <p class="mt-1 font-medium text-gray-900 dark:text-white">
            {data.territory.radiusMiles} miles
          </p>
        </div>
        <div class="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
          <p class="text-sm text-gray-500 dark:text-gray-400">ZIP Codes Covered</p>
          <p class="mt-1 font-medium text-gray-900 dark:text-white">
            {data.zipCodes.length}
          </p>
        </div>
      </div>
    </Card>

    <!-- ZIP Codes Table -->
    {#if data.zipCodes.length > 0}
      <Card>
        <div class="mb-4 flex items-center justify-between">
          <h3 class="flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-white">
            <MapPinOutline class="h-5 w-5 text-primary-600" />
            ZIP Codes in Territory
          </h3>
          <Badge color="gray">{data.zipCodes.length} ZIP codes</Badge>
        </div>
        <div class="max-h-64 overflow-y-auto">
          <Table hoverable>
            <TableHead class="sticky top-0 bg-gray-50 dark:bg-gray-700">
              <TableHeadCell class="w-32">ZIP Code</TableHeadCell>
              <TableHeadCell>City</TableHeadCell>
              <TableHeadCell class="w-24 text-center">Primary</TableHeadCell>
            </TableHead>
            <TableBody>
              {#each data.zipCodes as zipCode}
                <TableBodyRow>
                  <TableBodyCell class="font-mono font-medium">{zipCode.zipCode}</TableBodyCell>
                  <TableBodyCell>{zipCode.city || '-'}</TableBodyCell>
                  <TableBodyCell class="text-center">
                    {#if zipCode.isPrimary}
                      <Badge color="green">Primary</Badge>
                    {:else}
                      <span class="text-gray-400">-</span>
                    {/if}
                  </TableBodyCell>
                </TableBodyRow>
              {/each}
            </TableBody>
          </Table>
        </div>
      </Card>
    {/if}
  {/if}
</div>
