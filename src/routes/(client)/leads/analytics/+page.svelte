<script lang="ts">
  import { Card, Button, Progressbar } from 'flowbite-svelte';
  import {
    ArrowLeftOutline,
    ChartOutline,
    ChartPieOutline,
    ChartMixedOutline,
    UsersGroupOutline
  } from 'flowbite-svelte-icons';
  import { formatNumber, formatPercent } from '$lib/utils';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();

  // Colors for charts (using Tailwind color classes)
  const sourceColors: Record<string, string> = {
    google: 'bg-blue-500',
    facebook: 'bg-indigo-500',
    instagram: 'bg-purple-500',
    website: 'bg-green-500',
    referral: 'bg-yellow-500',
    manual: 'bg-gray-500'
  };

  const statusColors: Record<string, string> = {
    new: 'bg-gray-400',
    contacted: 'bg-blue-400',
    qualified: 'bg-indigo-500',
    appointment_set: 'bg-purple-500',
    consultation_completed: 'bg-cyan-500',
    converted: 'bg-green-500',
    lost: 'bg-red-500'
  };

  const temperatureColors: Record<string, string> = {
    hot: 'bg-red-500',
    warm: 'bg-yellow-500',
    cold: 'bg-blue-500'
  };

  // Calculate max for scaling bar charts
  let maxSourceCount = $derived(Math.max(...data.leadsBySource.map(s => s.count), 1));
  let maxDailyCount = $derived(Math.max(...data.leadsOverTime.map(d => d.count), 1));
</script>

<div class="space-y-6">
  <!-- Page Header -->
  <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
    <div class="flex items-center gap-4">
      <Button href="/leads" color="light" size="sm">
        <ArrowLeftOutline class="h-4 w-4" />
      </Button>
      <div>
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Lead Analytics</h1>
        <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Insights and trends from your lead data.
        </p>
      </div>
    </div>
    <div class="flex items-center gap-2">
      <span class="text-sm text-gray-500 dark:text-gray-400">Total Leads:</span>
      <span class="text-lg font-bold text-gray-900 dark:text-white">{formatNumber(data.totalLeads)}</span>
    </div>
  </div>

  <!-- Stats Row -->
  <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
    <Card class="p-4">
      <div class="flex items-center gap-3">
        <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-100 dark:bg-primary-900">
          <UsersGroupOutline class="h-5 w-5 text-primary-600 dark:text-primary-300" />
        </div>
        <div>
          <p class="text-sm text-gray-500 dark:text-gray-400">Total Leads</p>
          <p class="text-xl font-bold text-gray-900 dark:text-white">{formatNumber(data.totalLeads)}</p>
        </div>
      </div>
    </Card>

    <Card class="p-4">
      <div class="flex items-center gap-3">
        <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900">
          <ChartOutline class="h-5 w-5 text-green-600 dark:text-green-300" />
        </div>
        <div>
          <p class="text-sm text-gray-500 dark:text-gray-400">Conversion Rate</p>
          <p class="text-xl font-bold text-gray-900 dark:text-white">
            {formatPercent(data.conversionFunnel.find(f => f.stage === 'Converted')?.percentage ?? 0)}
          </p>
        </div>
      </div>
    </Card>

    <Card class="p-4">
      <div class="flex items-center gap-3">
        <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-red-100 dark:bg-red-900">
          <ChartPieOutline class="h-5 w-5 text-red-600 dark:text-red-300" />
        </div>
        <div>
          <p class="text-sm text-gray-500 dark:text-gray-400">Hot Leads</p>
          <p class="text-xl font-bold text-gray-900 dark:text-white">
            {formatNumber(data.temperatureDistribution.find(t => t.temperature === 'hot')?.count ?? 0)}
          </p>
        </div>
      </div>
    </Card>

    <Card class="p-4">
      <div class="flex items-center gap-3">
        <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900">
          <ChartMixedOutline class="h-5 w-5 text-blue-600 dark:text-blue-300" />
        </div>
        <div>
          <p class="text-sm text-gray-500 dark:text-gray-400">Top Source</p>
          <p class="text-xl font-bold text-gray-900 dark:text-white">
            {data.leadsBySource[0]?.label ?? 'N/A'}
          </p>
        </div>
      </div>
    </Card>
  </div>

  <!-- Charts Grid -->
  <div class="grid gap-6 lg:grid-cols-2">
    <!-- Leads by Source (Bar Chart Placeholder) -->
    <Card>
      <div class="mb-4 flex items-center justify-between">
        <h3 class="text-lg font-semibold text-gray-900 dark:text-white">Leads by Source</h3>
        <ChartMixedOutline class="h-5 w-5 text-gray-400" />
      </div>

      {#if data.leadsBySource.length === 0}
        <div class="flex h-48 items-center justify-center text-gray-500 dark:text-gray-400">
          No data available
        </div>
      {:else}
        <div class="space-y-3">
          {#each data.leadsBySource as source}
            <div>
              <div class="mb-1 flex items-center justify-between text-sm">
                <span class="font-medium text-gray-900 dark:text-white">{source.label}</span>
                <span class="text-gray-500 dark:text-gray-400">{formatNumber(source.count)} leads</span>
              </div>
              <div class="h-4 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                <div
                  class="h-full rounded-full {sourceColors[source.source] ?? 'bg-gray-500'} transition-all duration-500"
                  style="width: {(source.count / maxSourceCount) * 100}%"
                ></div>
              </div>
            </div>
          {/each}
        </div>
      {/if}
    </Card>

    <!-- Lead Temperature Distribution (Pie Chart Placeholder) -->
    <Card>
      <div class="mb-4 flex items-center justify-between">
        <h3 class="text-lg font-semibold text-gray-900 dark:text-white">Lead Quality Distribution</h3>
        <ChartPieOutline class="h-5 w-5 text-gray-400" />
      </div>

      {#if data.temperatureDistribution.length === 0}
        <div class="flex h-48 items-center justify-center text-gray-500 dark:text-gray-400">
          No data available
        </div>
      {:else}
        <div class="flex items-center gap-6">
          <!-- Simple visual pie representation -->
          <div class="relative h-40 w-40 flex-shrink-0">
            <div class="absolute inset-0 flex items-center justify-center">
              <div class="text-center">
                <p class="text-2xl font-bold text-gray-900 dark:text-white">{formatNumber(data.totalLeads)}</p>
                <p class="text-xs text-gray-500 dark:text-gray-400">Total</p>
              </div>
            </div>
            <svg class="h-40 w-40 -rotate-90 transform" viewBox="0 0 100 100">
              {#each data.temperatureDistribution as temp, i}
                {@const offset = data.temperatureDistribution.slice(0, i).reduce((acc, t) => acc + t.percentage, 0)}
                {@const circumference = 2 * Math.PI * 40}
                {@const strokeColor = temp.temperature === 'hot' ? '#ef4444' : temp.temperature === 'warm' ? '#eab308' : '#3b82f6'}
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  fill="none"
                  stroke={strokeColor}
                  stroke-width="20"
                  stroke-dasharray="{(temp.percentage / 100) * circumference} {circumference}"
                  stroke-dashoffset="{-(offset / 100) * circumference}"
                  class="transition-all duration-500"
                />
              {/each}
            </svg>
          </div>

          <!-- Legend -->
          <div class="flex-1 space-y-3">
            {#each data.temperatureDistribution as temp}
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <div class="h-3 w-3 rounded-full {temperatureColors[temp.temperature]}"></div>
                  <span class="text-sm font-medium text-gray-900 dark:text-white">{temp.label}</span>
                </div>
                <div class="text-right">
                  <span class="text-sm font-medium text-gray-900 dark:text-white">{formatNumber(temp.count)}</span>
                  <span class="ml-1 text-xs text-gray-500 dark:text-gray-400">({formatPercent(temp.percentage)})</span>
                </div>
              </div>
            {/each}
          </div>
        </div>
      {/if}
    </Card>

    <!-- Leads Over Time (Line Chart Placeholder) -->
    <Card class="lg:col-span-2">
      <div class="mb-4 flex items-center justify-between">
        <h3 class="text-lg font-semibold text-gray-900 dark:text-white">Leads Over Time (Last 30 Days)</h3>
        <ChartOutline class="h-5 w-5 text-gray-400" />
      </div>

      {#if data.leadsOverTime.length === 0}
        <div class="flex h-48 items-center justify-center text-gray-500 dark:text-gray-400">
          No data available
        </div>
      {:else}
        <!-- Simple bar chart representation -->
        <div class="flex h-48 items-end gap-0.5">
          {#each data.leadsOverTime as day}
            <div
              class="flex-1 rounded-t bg-primary-500 transition-all duration-300 hover:bg-primary-600"
              style="height: {maxDailyCount > 0 ? (day.count / maxDailyCount) * 100 : 0}%; min-height: 2px;"
              title="{day.date}: {day.count} leads"
            ></div>
          {/each}
        </div>
        <div class="mt-2 flex justify-between text-xs text-gray-500 dark:text-gray-400">
          <span>{data.leadsOverTime[0]?.date ?? ''}</span>
          <span>{data.leadsOverTime[data.leadsOverTime.length - 1]?.date ?? ''}</span>
        </div>
      {/if}
    </Card>

    <!-- Conversion Funnel -->
    <Card class="lg:col-span-2">
      <div class="mb-4 flex items-center justify-between">
        <h3 class="text-lg font-semibold text-gray-900 dark:text-white">Conversion Funnel</h3>
        <ChartMixedOutline class="h-5 w-5 text-gray-400" />
      </div>

      {#if data.conversionFunnel.length === 0}
        <div class="flex h-48 items-center justify-center text-gray-500 dark:text-gray-400">
          No data available
        </div>
      {:else}
        <div class="space-y-4">
          {#each data.conversionFunnel as stage, i}
            {@const bgColor = i === 0 ? 'bg-gray-400' : i === data.conversionFunnel.length - 1 ? 'bg-green-500' : 'bg-primary-500'}
            <div class="flex items-center gap-4">
              <div class="w-40 flex-shrink-0">
                <p class="font-medium text-gray-900 dark:text-white">{stage.stage}</p>
                <p class="text-sm text-gray-500 dark:text-gray-400">
                  {formatNumber(stage.count)} ({formatPercent(stage.percentage)})
                </p>
              </div>
              <div class="flex-1">
                <div class="h-8 overflow-hidden rounded-lg bg-gray-200 dark:bg-gray-700">
                  <div
                    class="h-full {bgColor} flex items-center justify-end pr-2 transition-all duration-500"
                    style="width: {stage.percentage}%"
                  >
                    {#if stage.percentage > 10}
                      <span class="text-xs font-medium text-white">{formatNumber(stage.count)}</span>
                    {/if}
                  </div>
                </div>
              </div>
              {#if i > 0}
                {@const dropoff = data.conversionFunnel[i - 1].count - stage.count}
                {@const dropoffPct = data.conversionFunnel[i - 1].count > 0 ? (dropoff / data.conversionFunnel[i - 1].count) * 100 : 0}
                <div class="w-24 flex-shrink-0 text-right">
                  <p class="text-sm text-red-600 dark:text-red-400">
                    -{formatNumber(dropoff)}
                  </p>
                  <p class="text-xs text-gray-500 dark:text-gray-400">
                    -{formatPercent(dropoffPct)} drop
                  </p>
                </div>
              {:else}
                <div class="w-24 flex-shrink-0"></div>
              {/if}
            </div>
          {/each}
        </div>
      {/if}
    </Card>

    <!-- Leads by Status -->
    <Card class="lg:col-span-2">
      <div class="mb-4 flex items-center justify-between">
        <h3 class="text-lg font-semibold text-gray-900 dark:text-white">Lead Status Distribution</h3>
        <ChartPieOutline class="h-5 w-5 text-gray-400" />
      </div>

      {#if data.leadsByStatus.length === 0}
        <div class="flex h-24 items-center justify-center text-gray-500 dark:text-gray-400">
          No data available
        </div>
      {:else}
        <div class="flex flex-wrap gap-4">
          {#each data.leadsByStatus as status}
            <div class="flex items-center gap-3 rounded-lg border border-gray-200 px-4 py-3 dark:border-gray-700">
              <div class="h-4 w-4 rounded-full {statusColors[status.status] ?? 'bg-gray-400'}"></div>
              <div>
                <p class="text-sm font-medium text-gray-900 dark:text-white">{status.label}</p>
                <p class="text-lg font-bold text-gray-900 dark:text-white">{formatNumber(status.count)}</p>
              </div>
            </div>
          {/each}
        </div>
      {/if}
    </Card>
  </div>

  <!-- Chart Integration Note -->
  <Card class="border-dashed border-yellow-300 bg-yellow-50 dark:border-yellow-700 dark:bg-yellow-900/20">
    <div class="flex items-start gap-3">
      <ChartOutline class="h-6 w-6 flex-shrink-0 text-yellow-600 dark:text-yellow-400" />
      <div>
        <h4 class="font-medium text-yellow-800 dark:text-yellow-300">Interactive Charts Coming Soon</h4>
        <p class="mt-1 text-sm text-yellow-700 dark:text-yellow-400">
          The visualizations above are placeholder representations. Full interactive charts with
          LayerChart or Chart.js will be integrated to provide detailed drill-down capabilities,
          date range selection, and export options.
        </p>
      </div>
    </div>
  </Card>
</div>
