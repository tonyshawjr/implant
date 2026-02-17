<script lang="ts">
  import { page } from '$app/stores';
  import { Card, Badge, Button, Table, TableHead, TableHeadCell, TableBody, TableBodyRow, TableBodyCell, Breadcrumb, BreadcrumbItem } from 'flowbite-svelte';
  import { ArrowLeftOutline, EyeOutline, UserAddOutline, ChartPieOutline, ArrowUpOutline, ArrowDownOutline, LinkOutline } from 'flowbite-svelte-icons';
  import LandingPageAnalytics from '$lib/components/analytics/LandingPageAnalytics.svelte';
  import ConversionFunnel from '$lib/components/analytics/ConversionFunnel.svelte';
  import { formatDate, formatPercent, getRelativeTime } from '$lib/utils';

  export let data;

  $: ({ landingPage, metrics, temperatureDistribution, trafficSources, utmCampaigns, viewsByDay, conversionFunnel, recentLeads } = data);

  // Status badge colors
  function getStatusColor(status: string): 'green' | 'yellow' | 'red' | 'gray' {
    switch (status) {
      case 'published': return 'green';
      case 'draft': return 'yellow';
      case 'archived': return 'red';
      default: return 'gray';
    }
  }

  // Temperature badge colors
  function getTemperatureColor(temp: string): 'red' | 'yellow' | 'blue' {
    switch (temp) {
      case 'hot': return 'red';
      case 'warm': return 'yellow';
      case 'cold': return 'blue';
      default: return 'blue';
    }
  }
</script>

<svelte:head>
  <title>Analytics - {landingPage.name} | SqueezMedia</title>
</svelte:head>

<div class="space-y-6">
  <!-- Breadcrumb Navigation -->
  <Breadcrumb class="mb-4">
    <BreadcrumbItem href="/internal" home>Dashboard</BreadcrumbItem>
    <BreadcrumbItem href="/internal/clients/{landingPage.organization.id}">
      {landingPage.organization.name}
    </BreadcrumbItem>
    <BreadcrumbItem>Landing Pages</BreadcrumbItem>
    <BreadcrumbItem>{landingPage.name}</BreadcrumbItem>
    <BreadcrumbItem>Analytics</BreadcrumbItem>
  </Breadcrumb>

  <!-- Header -->
  <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
    <div class="flex items-center gap-4">
      <Button href="/internal/clients/{landingPage.organization.id}" color="light" size="sm">
        <ArrowLeftOutline class="me-2 h-4 w-4" />
        Back to Client
      </Button>
      <div>
        <div class="flex items-center gap-2">
          <h1 class="text-2xl font-bold text-gray-900 dark:text-white">
            {landingPage.name}
          </h1>
          <Badge color={getStatusColor(landingPage.status)}>
            {landingPage.status}
          </Badge>
        </div>
        <p class="text-sm text-gray-500 dark:text-gray-400">
          {#if landingPage.template}
            Template: {landingPage.template.name}
          {:else}
            Custom Landing Page
          {/if}
          {#if landingPage.campaign}
            <span class="mx-2">|</span>
            Campaign: {landingPage.campaign.name}
          {/if}
        </p>
      </div>
    </div>
    <div class="flex gap-2">
      {#if landingPage.url}
        <Button href={landingPage.url} target="_blank" color="light" size="sm">
          <LinkOutline class="me-2 h-4 w-4" />
          View Page
        </Button>
      {/if}
    </div>
  </div>

  <!-- Stats Cards -->
  <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
    <!-- Total Views -->
    <Card class="p-4">
      <div class="flex items-center justify-between">
        <div>
          <p class="text-sm font-medium text-gray-500 dark:text-gray-400">Total Views</p>
          <p class="text-2xl font-bold text-gray-900 dark:text-white">
            {metrics.totalViews.toLocaleString()}
          </p>
        </div>
        <div class="rounded-full bg-blue-100 p-3 dark:bg-blue-900">
          <EyeOutline class="h-6 w-6 text-blue-600 dark:text-blue-300" />
        </div>
      </div>
    </Card>

    <!-- Total Submissions -->
    <Card class="p-4">
      <div class="flex items-center justify-between">
        <div>
          <p class="text-sm font-medium text-gray-500 dark:text-gray-400">Total Submissions</p>
          <p class="text-2xl font-bold text-gray-900 dark:text-white">
            {metrics.totalSubmissions.toLocaleString()}
          </p>
          {#if metrics.leadsTrend !== 0}
            <div class="flex items-center text-sm {metrics.leadsTrend > 0 ? 'text-green-600' : 'text-red-600'}">
              {#if metrics.leadsTrend > 0}
                <ArrowUpOutline class="me-1 h-3 w-3" />
              {:else}
                <ArrowDownOutline class="me-1 h-3 w-3" />
              {/if}
              {Math.abs(metrics.leadsTrend)}% vs prev 15 days
            </div>
          {/if}
        </div>
        <div class="rounded-full bg-indigo-100 p-3 dark:bg-indigo-900">
          <UserAddOutline class="h-6 w-6 text-indigo-600 dark:text-indigo-300" />
        </div>
      </div>
    </Card>

    <!-- Conversion Rate -->
    <Card class="p-4">
      <div class="flex items-center justify-between">
        <div>
          <p class="text-sm font-medium text-gray-500 dark:text-gray-400">Conversion Rate</p>
          <p class="text-2xl font-bold text-gray-900 dark:text-white">
            {metrics.conversionRate}%
          </p>
        </div>
        <div class="rounded-full bg-green-100 p-3 dark:bg-green-900">
          <ChartPieOutline class="h-6 w-6 text-green-600 dark:text-green-300" />
        </div>
      </div>
    </Card>

    <!-- Avg Lead Score -->
    <Card class="p-4">
      <div class="flex items-center justify-between">
        <div>
          <p class="text-sm font-medium text-gray-500 dark:text-gray-400">Avg Lead Score</p>
          <p class="text-2xl font-bold text-gray-900 dark:text-white">
            {metrics.avgLeadScore}
          </p>
        </div>
        <div class="flex gap-1">
          <Badge color="red">{temperatureDistribution.hot} hot</Badge>
          <Badge color="yellow">{temperatureDistribution.warm} warm</Badge>
        </div>
      </div>
    </Card>
  </div>

  <!-- Main Analytics Component with Charts -->
  <LandingPageAnalytics {viewsByDay} {trafficSources} {temperatureDistribution} />

  <!-- Conversion Funnel -->
  <ConversionFunnel stages={conversionFunnel} />

  <!-- UTM Campaign Breakdown -->
  <Card class="p-4">
    <h3 class="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
      UTM Campaign Breakdown
    </h3>
    {#if utmCampaigns.length > 0}
      <Table striped>
        <TableHead>
          <TableHeadCell>Campaign</TableHeadCell>
          <TableHeadCell>Leads</TableHeadCell>
          <TableHeadCell>Share</TableHeadCell>
          <TableHeadCell>Hot Leads</TableHeadCell>
          <TableHeadCell>Warm Leads</TableHeadCell>
          <TableHeadCell>Quality Score</TableHeadCell>
        </TableHead>
        <TableBody>
          {#each utmCampaigns as campaign}
            <TableBodyRow>
              <TableBodyCell class="font-medium">{campaign.campaign}</TableBodyCell>
              <TableBodyCell>{campaign.count}</TableBodyCell>
              <TableBodyCell>{campaign.percentage}%</TableBodyCell>
              <TableBodyCell>
                <Badge color="red">{campaign.hotLeads}</Badge>
              </TableBodyCell>
              <TableBodyCell>
                <Badge color="yellow">{campaign.warmLeads}</Badge>
              </TableBodyCell>
              <TableBodyCell>
                <div class="flex items-center gap-2">
                  <div class="h-2 w-16 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                    <div
                      class="h-full bg-green-500"
                      style="width: {campaign.qualityScore}%"
                    ></div>
                  </div>
                  <span class="text-sm">{campaign.qualityScore}%</span>
                </div>
              </TableBodyCell>
            </TableBodyRow>
          {/each}
        </TableBody>
      </Table>
    {:else}
      <p class="text-center text-gray-500 dark:text-gray-400 py-8">
        No UTM campaign data available yet.
      </p>
    {/if}
  </Card>

  <!-- Recent Leads -->
  <Card class="p-4">
    <div class="mb-4 flex items-center justify-between">
      <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
        Recent Leads
      </h3>
      <Button href="/internal/clients/{landingPage.organization.id}" color="light" size="sm">
        View All Leads
      </Button>
    </div>
    {#if recentLeads.length > 0}
      <Table striped>
        <TableHead>
          <TableHeadCell>Name</TableHeadCell>
          <TableHeadCell>Contact</TableHeadCell>
          <TableHeadCell>Source</TableHeadCell>
          <TableHeadCell>Temperature</TableHeadCell>
          <TableHeadCell>Score</TableHeadCell>
          <TableHeadCell>Status</TableHeadCell>
          <TableHeadCell>Created</TableHeadCell>
        </TableHead>
        <TableBody>
          {#each recentLeads as lead}
            <TableBodyRow>
              <TableBodyCell class="font-medium">{lead.name}</TableBodyCell>
              <TableBodyCell>
                <div class="text-sm">
                  {#if lead.email}
                    <div>{lead.email}</div>
                  {/if}
                  {#if lead.phone}
                    <div class="text-gray-500">{lead.phone}</div>
                  {/if}
                </div>
              </TableBodyCell>
              <TableBodyCell>
                <Badge color="blue">{lead.source}</Badge>
                {#if lead.utmCampaign}
                  <div class="mt-1 text-xs text-gray-500">{lead.utmCampaign}</div>
                {/if}
              </TableBodyCell>
              <TableBodyCell>
                <Badge color={getTemperatureColor(lead.temperature)}>
                  {lead.temperature}
                </Badge>
              </TableBodyCell>
              <TableBodyCell>
                {lead.score ?? '-'}
              </TableBodyCell>
              <TableBodyCell>
                <Badge color="gray">{lead.status.replace('_', ' ')}</Badge>
              </TableBodyCell>
              <TableBodyCell>
                {getRelativeTime(lead.createdAt)}
              </TableBodyCell>
            </TableBodyRow>
          {/each}
        </TableBody>
      </Table>
    {:else}
      <p class="text-center text-gray-500 dark:text-gray-400 py-8">
        No leads captured from this landing page yet.
      </p>
    {/if}
  </Card>
</div>
