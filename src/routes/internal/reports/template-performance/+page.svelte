<script lang="ts">
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
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
    Breadcrumb,
    BreadcrumbItem
  } from 'flowbite-svelte';
  import {
    FileOutline,
    EyeOutline,
    UserAddOutline,
    ChartPieOutline,
    ArrowUpOutline,
    ArrowDownOutline,
    ChevronUpOutline,
    ChevronDownOutline
  } from 'flowbite-svelte-icons';
  import { formatNumber, formatPercent } from '$lib/utils';

  export let data;

  $: ({ templates, stats, filters } = data);

  // Sorting state
  let sortColumn = 'totalSubmissions';
  let sortDirection: 'asc' | 'desc' = 'desc';

  // Sorted templates
  $: sortedTemplates = [...templates].sort((a, b) => {
    let aVal: number;
    let bVal: number;

    switch (sortColumn) {
      case 'name':
        return sortDirection === 'asc'
          ? a.name.localeCompare(b.name)
          : b.name.localeCompare(a.name);
      case 'instanceCount':
        aVal = a.metrics.instanceCount;
        bVal = b.metrics.instanceCount;
        break;
      case 'totalViews':
        aVal = a.metrics.totalViews;
        bVal = b.metrics.totalViews;
        break;
      case 'totalSubmissions':
        aVal = a.metrics.totalSubmissions;
        bVal = b.metrics.totalSubmissions;
        break;
      case 'avgConversionRate':
        aVal = a.metrics.avgConversionRate;
        bVal = b.metrics.avgConversionRate;
        break;
      case 'trend':
        aVal = a.metrics.trend;
        bVal = b.metrics.trend;
        break;
      default:
        aVal = a.metrics.totalSubmissions;
        bVal = b.metrics.totalSubmissions;
    }

    return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
  });

  // Toggle sort
  function toggleSort(column: string) {
    if (sortColumn === column) {
      sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      sortColumn = column;
      sortDirection = 'desc';
    }
  }

  // Local filter state
  let selectedDateRange = filters.dateRange;
  let selectedCategory = filters.category;

  // Handle filter changes
  function applyFilters() {
    const params = new URLSearchParams();
    if (selectedDateRange !== '30d') params.set('range', selectedDateRange);
    if (selectedCategory) params.set('category', selectedCategory);
    const query = params.toString();
    goto(query ? `?${query}` : '/internal/reports/template-performance', { replaceState: true });
  }

  // React to filter changes
  $: if (selectedDateRange !== filters.dateRange || selectedCategory !== filters.category) {
    // Only navigate if values have changed from server-provided values
    if (selectedDateRange || selectedCategory) {
      applyFilters();
    }
  }

  // Category badge colors
  function getCategoryColor(category: string): 'blue' | 'green' | 'purple' | 'yellow' {
    switch (category) {
      case 'implant': return 'blue';
      case 'cosmetic': return 'purple';
      case 'general': return 'green';
      case 'promo': return 'yellow';
      default: return 'blue';
    }
  }

  // Sort header helper
  function getSortIcon(column: string) {
    if (sortColumn !== column) return null;
    return sortDirection === 'asc' ? ChevronUpOutline : ChevronDownOutline;
  }
</script>

<svelte:head>
  <title>Template Performance Report | SqueezMedia</title>
</svelte:head>

<div class="space-y-6">
  <!-- Breadcrumb -->
  <Breadcrumb class="mb-4">
    <BreadcrumbItem href="/internal" home>Dashboard</BreadcrumbItem>
    <BreadcrumbItem href="/internal/templates">Templates</BreadcrumbItem>
    <BreadcrumbItem>Performance Report</BreadcrumbItem>
  </Breadcrumb>

  <!-- Header -->
  <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
    <div>
      <h1 class="text-2xl font-bold text-gray-900 dark:text-white">
        Template Performance Report
      </h1>
      <p class="text-sm text-gray-500 dark:text-gray-400">
        Aggregated performance metrics across all landing page templates
      </p>
    </div>
    <div class="flex gap-2">
      <Button href="/internal/templates" color="light">
        View All Templates
      </Button>
    </div>
  </div>

  <!-- Filters -->
  <Card class="p-4">
    <div class="flex flex-wrap items-center gap-4">
      <div class="flex items-center gap-2">
        <span class="text-sm font-medium text-gray-700 dark:text-gray-300">Date Range:</span>
        <select
          bind:value={selectedDateRange}
          class="w-40 rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-sm text-gray-900 focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 dark:focus:border-blue-500 dark:focus:ring-blue-500"
        >
          {#each filters.dateRanges as range}
            <option value={range.value}>{range.label}</option>
          {/each}
        </select>
      </div>
      <div class="flex items-center gap-2">
        <span class="text-sm font-medium text-gray-700 dark:text-gray-300">Category:</span>
        <select
          bind:value={selectedCategory}
          class="w-40 rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-sm text-gray-900 focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 dark:focus:border-blue-500 dark:focus:ring-blue-500"
        >
          {#each filters.categories as cat}
            <option value={cat.value}>{cat.label}</option>
          {/each}
        </select>
      </div>
    </div>
  </Card>

  <!-- Summary Stats -->
  <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
    <Card class="p-4">
      <div class="flex items-center justify-between">
        <div>
          <p class="text-sm font-medium text-gray-500 dark:text-gray-400">Templates</p>
          <p class="text-2xl font-bold text-gray-900 dark:text-white">
            {stats.totalTemplates}
          </p>
          <p class="text-xs text-gray-500">{stats.activeTemplates} active</p>
        </div>
        <div class="rounded-full bg-blue-100 p-3 dark:bg-blue-900">
          <FileOutline class="h-6 w-6 text-blue-600 dark:text-blue-300" />
        </div>
      </div>
    </Card>

    <Card class="p-4">
      <div class="flex items-center justify-between">
        <div>
          <p class="text-sm font-medium text-gray-500 dark:text-gray-400">Instances</p>
          <p class="text-2xl font-bold text-gray-900 dark:text-white">
            {stats.totalInstances}
          </p>
          <p class="text-xs text-gray-500">published pages</p>
        </div>
        <div class="rounded-full bg-indigo-100 p-3 dark:bg-indigo-900">
          <FileOutline class="h-6 w-6 text-indigo-600 dark:text-indigo-300" />
        </div>
      </div>
    </Card>

    <Card class="p-4">
      <div class="flex items-center justify-between">
        <div>
          <p class="text-sm font-medium text-gray-500 dark:text-gray-400">Total Views</p>
          <p class="text-2xl font-bold text-gray-900 dark:text-white">
            {stats.totalViews.toLocaleString()}
          </p>
        </div>
        <div class="rounded-full bg-purple-100 p-3 dark:bg-purple-900">
          <EyeOutline class="h-6 w-6 text-purple-600 dark:text-purple-300" />
        </div>
      </div>
    </Card>

    <Card class="p-4">
      <div class="flex items-center justify-between">
        <div>
          <p class="text-sm font-medium text-gray-500 dark:text-gray-400">Total Submissions</p>
          <p class="text-2xl font-bold text-gray-900 dark:text-white">
            {stats.totalSubmissions.toLocaleString()}
          </p>
        </div>
        <div class="rounded-full bg-green-100 p-3 dark:bg-green-900">
          <UserAddOutline class="h-6 w-6 text-green-600 dark:text-green-300" />
        </div>
      </div>
    </Card>

    <Card class="p-4 xl:col-span-2">
      <div class="flex items-center justify-between">
        <div>
          <p class="text-sm font-medium text-gray-500 dark:text-gray-400">Avg Conversion Rate</p>
          <p class="text-2xl font-bold text-gray-900 dark:text-white">
            {stats.avgConversionRate}%
          </p>
          <p class="text-xs text-gray-500">across all templates</p>
        </div>
        <div class="rounded-full bg-emerald-100 p-3 dark:bg-emerald-900">
          <ChartPieOutline class="h-6 w-6 text-emerald-600 dark:text-emerald-300" />
        </div>
      </div>
    </Card>
  </div>

  <!-- Templates Table -->
  <Card class="overflow-hidden p-0">
    <Table striped>
      <TableHead>
        <TableHeadCell>
          <button
            type="button"
            class="flex items-center gap-1 hover:text-gray-700 dark:hover:text-gray-300"
            on:click={() => toggleSort('name')}
          >
            Template
            {#if sortColumn === 'name'}
              <svelte:component this={getSortIcon('name')} class="h-4 w-4" />
            {/if}
          </button>
        </TableHeadCell>
        <TableHeadCell>Category</TableHeadCell>
        <TableHeadCell>
          <button
            type="button"
            class="flex items-center gap-1 hover:text-gray-700 dark:hover:text-gray-300"
            on:click={() => toggleSort('instanceCount')}
          >
            Instances
            {#if sortColumn === 'instanceCount'}
              <svelte:component this={getSortIcon('instanceCount')} class="h-4 w-4" />
            {/if}
          </button>
        </TableHeadCell>
        <TableHeadCell>
          <button
            type="button"
            class="flex items-center gap-1 hover:text-gray-700 dark:hover:text-gray-300"
            on:click={() => toggleSort('totalViews')}
          >
            Total Views
            {#if sortColumn === 'totalViews'}
              <svelte:component this={getSortIcon('totalViews')} class="h-4 w-4" />
            {/if}
          </button>
        </TableHeadCell>
        <TableHeadCell>
          <button
            type="button"
            class="flex items-center gap-1 hover:text-gray-700 dark:hover:text-gray-300"
            on:click={() => toggleSort('totalSubmissions')}
          >
            Submissions
            {#if sortColumn === 'totalSubmissions'}
              <svelte:component this={getSortIcon('totalSubmissions')} class="h-4 w-4" />
            {/if}
          </button>
        </TableHeadCell>
        <TableHeadCell>
          <button
            type="button"
            class="flex items-center gap-1 hover:text-gray-700 dark:hover:text-gray-300"
            on:click={() => toggleSort('avgConversionRate')}
          >
            Avg Conv. Rate
            {#if sortColumn === 'avgConversionRate'}
              <svelte:component this={getSortIcon('avgConversionRate')} class="h-4 w-4" />
            {/if}
          </button>
        </TableHeadCell>
        <TableHeadCell>Best Instance</TableHeadCell>
        <TableHeadCell>
          <button
            type="button"
            class="flex items-center gap-1 hover:text-gray-700 dark:hover:text-gray-300"
            on:click={() => toggleSort('trend')}
          >
            Trend
            {#if sortColumn === 'trend'}
              <svelte:component this={getSortIcon('trend')} class="h-4 w-4" />
            {/if}
          </button>
        </TableHeadCell>
      </TableHead>
      <TableBody>
        {#each sortedTemplates as template}
          <TableBodyRow class="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800">
            <TableBodyCell>
              <a href="/internal/templates/{template.id}" class="flex items-center gap-3 hover:opacity-80">
                {#if template.thumbnailUrl}
                  <img
                    src={template.thumbnailUrl}
                    alt={template.name}
                    class="h-10 w-16 rounded object-cover"
                  />
                {:else}
                  <div class="flex h-10 w-16 items-center justify-center rounded bg-gray-200 dark:bg-gray-700">
                    <FileOutline class="h-5 w-5 text-gray-400" />
                  </div>
                {/if}
                <div>
                  <p class="font-medium text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400">{template.name}</p>
                  {#if !template.isActive}
                    <Badge color="red" class="mt-1">Inactive</Badge>
                  {/if}
                </div>
              </a>
            </TableBodyCell>
            <TableBodyCell>
              <Badge color={getCategoryColor(template.category)}>
                {template.category}
              </Badge>
            </TableBodyCell>
            <TableBodyCell>
              <span class="font-medium">{template.metrics.instanceCount}</span>
            </TableBodyCell>
            <TableBodyCell>
              {template.metrics.totalViews.toLocaleString()}
            </TableBodyCell>
            <TableBodyCell>
              <span class="font-medium">{template.metrics.totalSubmissions.toLocaleString()}</span>
            </TableBodyCell>
            <TableBodyCell>
              <div class="flex items-center gap-2">
                <div class="h-2 w-16 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                  <div
                    class="h-full bg-green-500"
                    style="width: {Math.min(template.metrics.avgConversionRate * 5, 100)}%"
                  ></div>
                </div>
                <span class="text-sm font-medium">{template.metrics.avgConversionRate}%</span>
              </div>
            </TableBodyCell>
            <TableBodyCell>
              {#if template.bestInstance}
                <div class="text-sm">
                  <p class="font-medium text-gray-900 dark:text-white">
                    {template.bestInstance.conversionRate}%
                  </p>
                  <p class="text-xs text-gray-500 truncate max-w-[120px]" title={template.bestInstance.organization?.name}>
                    {template.bestInstance.organization?.name || 'Unknown'}
                  </p>
                </div>
              {:else}
                <span class="text-gray-400">-</span>
              {/if}
            </TableBodyCell>
            <TableBodyCell>
              {#if template.metrics.trend !== 0}
                <div class="flex items-center gap-1 {template.metrics.trend > 0 ? 'text-green-600' : 'text-red-600'}">
                  {#if template.metrics.trend > 0}
                    <ArrowUpOutline class="h-4 w-4" />
                  {:else}
                    <ArrowDownOutline class="h-4 w-4" />
                  {/if}
                  <span class="font-medium">{Math.abs(template.metrics.trend)}%</span>
                </div>
              {:else}
                <span class="text-gray-400">-</span>
              {/if}
            </TableBodyCell>
          </TableBodyRow>
        {/each}
      </TableBody>
    </Table>

    {#if sortedTemplates.length === 0}
      <div class="flex flex-col items-center justify-center py-12">
        <FileOutline class="h-12 w-12 text-gray-400" />
        <p class="mt-4 text-gray-500 dark:text-gray-400">No templates found</p>
        <Button href="/internal/templates/create" class="mt-4">
          Create Template
        </Button>
      </div>
    {/if}
  </Card>
</div>
