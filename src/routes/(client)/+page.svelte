<script lang="ts">
  import { Card, Button } from 'flowbite-svelte';
  import {
    UsersGroupOutline,
    ChartOutline,
    RocketOutline,
    CashOutline,
    ArrowRightOutline,
    DownloadOutline
  } from 'flowbite-svelte-icons';
  import { StatCard } from '$lib/components/ui';
  import { RecentLeadsList } from '$lib/components/leads';
  import { CampaignHealthGrid } from '$lib/components/campaigns';
  import { formatCurrency, formatPercent, formatNumber, getHealthScoreColor, getHealthScoreLabel } from '$lib/utils';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();

  // Health score display
  let healthColors = $derived(getHealthScoreColor(data.healthScore));
  let healthLabel = $derived(getHealthScoreLabel(data.healthScore));
</script>

<div class="space-y-6">
  <!-- Page Header -->
  <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
    <div>
      <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
      <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
        Welcome back! Here's an overview of your lead generation performance.
      </p>
    </div>
    <div class="flex gap-2">
      <Button color="light" size="sm">
        <DownloadOutline class="mr-2 h-4 w-4" />
        Download Report
      </Button>
      <Button href="/leads" size="sm">
        View Leads
        <ArrowRightOutline class="ml-2 h-4 w-4" />
      </Button>
    </div>
  </div>

  <!-- Health Score Banner (if available) -->
  {#if data.healthScore !== null}
    <Card class="p-4 {healthColors.bgLight}">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div class="flex h-12 w-12 items-center justify-center rounded-full {healthColors.bg} text-white font-bold">
            {data.healthScore.toFixed(0)}
          </div>
          <div>
            <p class="font-medium text-gray-900 dark:text-white">Account Health: {healthLabel}</p>
            <p class="text-sm text-gray-600 dark:text-gray-400">
              Your lead generation performance is being tracked and optimized.
            </p>
          </div>
        </div>
        <Button href="/account" color="light" size="sm">
          View Details
        </Button>
      </div>
    </Card>
  {/if}

  <!-- Stats Grid -->
  {#if data.stats}
    <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard
        title="Total Leads This Month"
        value={formatNumber(data.stats.leadsThisMonth)}
        change={data.stats.leadChange}
        positiveIsUp={true}
      >
        {#snippet icon()}
          <UsersGroupOutline class="h-6 w-6 text-primary-600 dark:text-primary-300" />
        {/snippet}
      </StatCard>

      <StatCard
        title="Conversion Rate"
        value={formatPercent(data.stats.conversionRate)}
        change={data.stats.conversionChange}
        positiveIsUp={true}
        iconBgColor="bg-green-100 dark:bg-green-900"
      >
        {#snippet icon()}
          <ChartOutline class="h-6 w-6 text-green-600 dark:text-green-300" />
        {/snippet}
      </StatCard>

      <StatCard
        title="Active Campaigns"
        value={formatNumber(data.stats.activeCampaigns)}
        change={null}
        iconBgColor="bg-purple-100 dark:bg-purple-900"
      >
        {#snippet icon()}
          <RocketOutline class="h-6 w-6 text-purple-600 dark:text-purple-300" />
        {/snippet}
      </StatCard>

      <StatCard
        title="Cost Per Lead"
        value={formatCurrency(data.stats.costPerLead)}
        change={data.stats.cplChange}
        positiveIsUp={false}
        iconBgColor="bg-yellow-100 dark:bg-yellow-900"
      >
        {#snippet icon()}
          <CashOutline class="h-6 w-6 text-yellow-600 dark:text-yellow-300" />
        {/snippet}
      </StatCard>
    </div>
  {:else}
    <!-- Empty state for stats -->
    <Card class="p-8 text-center">
      <ChartOutline class="mx-auto mb-4 h-12 w-12 text-gray-400" />
      <h3 class="mb-2 text-lg font-medium text-gray-900 dark:text-white">No Data Available</h3>
      <p class="mb-4 text-gray-500 dark:text-gray-400">
        Start a campaign to see your lead generation statistics.
      </p>
      <Button href="/campaigns">Get Started</Button>
    </Card>
  {/if}

  <!-- Content Grid: Recent Leads + Campaign Health -->
  <div class="grid gap-6 lg:grid-cols-2">
    <RecentLeadsList
      leads={data.recentLeads}
      title="Recent Leads"
      viewAllHref="/leads"
    />

    <CampaignHealthGrid
      campaigns={data.campaigns}
      title="Campaign Performance"
      viewAllHref="/campaigns"
    />
  </div>

  <!-- Quick Actions Card -->
  <Card>
    <h3 class="mb-4 text-lg font-semibold text-gray-900 dark:text-white">Quick Actions</h3>
    <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <a
        href="/leads"
        class="flex items-center gap-3 rounded-lg border border-gray-200 p-4 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-700/50"
      >
        <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-100 dark:bg-primary-900">
          <UsersGroupOutline class="h-5 w-5 text-primary-600 dark:text-primary-300" />
        </div>
        <div>
          <p class="font-medium text-gray-900 dark:text-white">View All Leads</p>
          <p class="text-sm text-gray-500 dark:text-gray-400">Manage your leads</p>
        </div>
      </a>

      <a
        href="/campaigns"
        class="flex items-center gap-3 rounded-lg border border-gray-200 p-4 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-700/50"
      >
        <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100 dark:bg-purple-900">
          <RocketOutline class="h-5 w-5 text-purple-600 dark:text-purple-300" />
        </div>
        <div>
          <p class="font-medium text-gray-900 dark:text-white">View Campaigns</p>
          <p class="text-sm text-gray-500 dark:text-gray-400">Campaign performance</p>
        </div>
      </a>

      <a
        href="/leads/analytics"
        class="flex items-center gap-3 rounded-lg border border-gray-200 p-4 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-700/50"
      >
        <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900">
          <ChartOutline class="h-5 w-5 text-green-600 dark:text-green-300" />
        </div>
        <div>
          <p class="font-medium text-gray-900 dark:text-white">Lead Analytics</p>
          <p class="text-sm text-gray-500 dark:text-gray-400">Detailed insights</p>
        </div>
      </a>

      <a
        href="/support"
        class="flex items-center gap-3 rounded-lg border border-gray-200 p-4 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-700/50"
      >
        <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-yellow-100 dark:bg-yellow-900">
          <CashOutline class="h-5 w-5 text-yellow-600 dark:text-yellow-300" />
        </div>
        <div>
          <p class="font-medium text-gray-900 dark:text-white">Get Support</p>
          <p class="text-sm text-gray-500 dark:text-gray-400">Help & resources</p>
        </div>
      </a>
    </div>
  </Card>
</div>
