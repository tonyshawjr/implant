<script lang="ts">
  import { goto } from '$app/navigation';
  import {
    Card,
    Badge,
    Button,
    Select,
    Table,
    TableHead,
    TableHeadCell,
    TableBody,
    TableBodyRow,
    TableBodyCell,
    Progressbar
  } from 'flowbite-svelte';
  import {
    CurrencyDollarOutline,
    ChartPieOutline,
    UsersOutline,
    ArrowTrendingUpOutline,
    ArrowTrendingDownOutline,
    ExclamationTriangleOutline,
    DocumentTextOutline,
    GlobeAmericasOutline,
    ChartBarOutline,
    ClockOutline,
    EyeOutline,
    CalendarOutline
  } from 'flowbite-svelte-icons';
  import type { PageData } from './$types';
  import { formatCurrency, formatCompactCurrency, formatDate, formatPercent, formatNumber } from '$lib/utils';

  let { data }: { data: PageData } = $props();

  // Date range handling
  function handleDateRangeChange(event: Event) {
    const select = event.target as HTMLSelectElement;
    const url = new URL(window.location.href);
    url.searchParams.set('range', select.value);
    goto(url.toString(), { replaceState: true });
  }

  // Tier color config
  const tierColors: Record<string, { bg: string; text: string; bar: string }> = {
    starter: { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-600 dark:text-blue-400', bar: 'bg-blue-500' },
    growth: { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-600 dark:text-green-400', bar: 'bg-green-500' },
    enterprise: { bg: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-purple-600 dark:text-purple-400', bar: 'bg-purple-500' }
  };

  // Invoice status config
  const invoiceStatusConfig: Record<string, { label: string; color: 'green' | 'yellow' | 'red' | 'gray' | 'blue' }> = {
    paid: { label: 'Paid', color: 'green' },
    pending: { label: 'Pending', color: 'yellow' },
    overdue: { label: 'Overdue', color: 'red' },
    draft: { label: 'Draft', color: 'gray' },
    cancelled: { label: 'Cancelled', color: 'gray' }
  };

  // Calculate health score color
  function getHealthScoreColor(score: number): string {
    if (score >= 85) return 'text-green-600 dark:text-green-400';
    if (score >= 70) return 'text-blue-600 dark:text-blue-400';
    if (score >= 50) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  }

  function getHealthScoreBgColor(score: number): string {
    if (score >= 85) return 'bg-green-500';
    if (score >= 70) return 'bg-blue-500';
    if (score >= 50) return 'bg-yellow-500';
    return 'bg-red-500';
  }

  // Calculate days until contract expiry
  function getDaysUntilExpiry(endDate: string): number {
    const end = new Date(endDate);
    const now = new Date();
    const diffTime = end.getTime() - now.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  // Calculate total MRR from tier breakdown for chart percentages
  const totalMRR = data.summary.mrr;
</script>

<div class="space-y-6">
  <!-- Page Header with Date Range Selector -->
  <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
    <div>
      <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Financial Dashboard</h1>
      <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
        Revenue metrics, billing, and financial health overview
      </p>
    </div>
    <div class="flex items-center gap-3">
      <CalendarOutline class="h-5 w-5 text-gray-500" />
      <Select
        class="w-40"
        value={data.dateRange.toString()}
        on:change={handleDateRangeChange}
      >
        <option value="7">Last 7 days</option>
        <option value="30">Last 30 days</option>
        <option value="60">Last 60 days</option>
        <option value="90">Last 90 days</option>
      </Select>
    </div>
  </div>

  <!-- Summary Stats -->
  <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
    <!-- MRR Card -->
    <Card class="p-4">
      <div class="flex items-center justify-between">
        <div>
          <p class="text-sm font-medium text-gray-500 dark:text-gray-400">Monthly Recurring Revenue</p>
          <p class="mt-1 text-2xl font-bold text-gray-900 dark:text-white">
            {formatCurrency(data.summary.mrr, { showCents: false })}
          </p>
        </div>
        <div class="flex h-12 w-12 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900/30">
          <CurrencyDollarOutline class="h-6 w-6 text-green-600 dark:text-green-400" />
        </div>
      </div>
      <div class="mt-3 flex items-center text-sm">
        {#if data.summary.mrrGrowth >= 0}
          <Badge color="green" class="mr-2">
            <ArrowTrendingUpOutline class="mr-1 h-3 w-3" />
            {formatPercent(data.summary.mrrGrowth)}
          </Badge>
        {:else}
          <Badge color="red" class="mr-2">
            <ArrowTrendingDownOutline class="mr-1 h-3 w-3" />
            {formatPercent(Math.abs(data.summary.mrrGrowth))}
          </Badge>
        {/if}
        <span class="text-gray-500 dark:text-gray-400">vs last month</span>
      </div>
    </Card>

    <!-- ARR Card -->
    <Card class="p-4">
      <div class="flex items-center justify-between">
        <div>
          <p class="text-sm font-medium text-gray-500 dark:text-gray-400">Annual Recurring Revenue</p>
          <p class="mt-1 text-2xl font-bold text-gray-900 dark:text-white">
            {formatCompactCurrency(data.summary.arr)}
          </p>
        </div>
        <div class="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30">
          <ChartBarOutline class="h-6 w-6 text-blue-600 dark:text-blue-400" />
        </div>
      </div>
      <p class="mt-3 text-sm text-gray-500 dark:text-gray-400">
        {data.summary.totalClients} active clients
      </p>
    </Card>

    <!-- Avg Revenue Per Client -->
    <Card class="p-4">
      <div class="flex items-center justify-between">
        <div>
          <p class="text-sm font-medium text-gray-500 dark:text-gray-400">Avg Revenue Per Client</p>
          <p class="mt-1 text-2xl font-bold text-gray-900 dark:text-white">
            {formatCurrency(data.summary.avgRevenuePerClient, { showCents: false })}
          </p>
        </div>
        <div class="flex h-12 w-12 items-center justify-center rounded-lg bg-purple-100 dark:bg-purple-900/30">
          <UsersOutline class="h-6 w-6 text-purple-600 dark:text-purple-400" />
        </div>
      </div>
      <p class="mt-3 text-sm text-gray-500 dark:text-gray-400">
        + {formatCurrency(data.summary.addonMRR, { showCents: false })} add-ons
      </p>
    </Card>

    <!-- Churn Rate -->
    <Card class="p-4">
      <div class="flex items-center justify-between">
        <div>
          <p class="text-sm font-medium text-gray-500 dark:text-gray-400">Churn Rate (MTD)</p>
          <p class="mt-1 text-2xl font-bold {data.summary.churnRate > 5 ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-white'}">
            {formatPercent(data.summary.churnRate)}
          </p>
        </div>
        <div class="flex h-12 w-12 items-center justify-center rounded-lg {data.summary.churnRate > 5 ? 'bg-red-100 dark:bg-red-900/30' : 'bg-yellow-100 dark:bg-yellow-900/30'}">
          <ArrowTrendingDownOutline class="h-6 w-6 {data.summary.churnRate > 5 ? 'text-red-600 dark:text-red-400' : 'text-yellow-600 dark:text-yellow-400'}" />
        </div>
      </div>
      <p class="mt-3 text-sm text-gray-500 dark:text-gray-400">
        Industry avg: 3-5%
      </p>
    </Card>
  </div>

  <!-- Row 2: Revenue by Tier + MRR Trend -->
  <div class="grid gap-6 lg:grid-cols-2">
    <!-- Revenue by Tier Chart -->
    <Card class="p-5">
      <h3 class="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-white">
        <ChartPieOutline class="h-5 w-5 text-primary-600" />
        Revenue by Tier
      </h3>

      {#if data.mrrByTier.length === 0}
        <div class="py-8 text-center">
          <p class="text-gray-500 dark:text-gray-400">No revenue data available</p>
        </div>
      {:else}
        <div class="space-y-4">
          {#each data.mrrByTier as tier}
            {@const colors = tierColors[tier.tier] || tierColors.starter}
            <div>
              <div class="mb-2 flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <span class="font-medium text-gray-900 dark:text-white">{tier.tierName}</span>
                  <Badge color="dark">{tier.count} clients</Badge>
                </div>
                <span class="font-semibold text-gray-900 dark:text-white">
                  {formatCurrency(tier.mrr, { showCents: false })}
                </span>
              </div>
              <div class="h-3 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                <div
                  class="h-full rounded-full transition-all {colors.bar}"
                  style="width: {tier.percentage}%"
                ></div>
              </div>
              <p class="mt-1 text-right text-xs text-gray-500 dark:text-gray-400">
                {formatPercent(tier.percentage)} of total MRR
              </p>
            </div>
          {/each}
        </div>

        <!-- Tier Summary -->
        <div class="mt-6 grid grid-cols-3 gap-4 border-t border-gray-200 pt-4 dark:border-gray-700">
          {#each data.mrrByTier as tier}
            {@const colors = tierColors[tier.tier] || tierColors.starter}
            <div class="text-center">
              <div class={`inline-block rounded-full px-3 py-1 text-xs font-medium ${colors.bg} ${colors.text}`}>
                {tier.tierName}
              </div>
              <p class="mt-2 text-lg font-bold text-gray-900 dark:text-white">{tier.count}</p>
              <p class="text-xs text-gray-500 dark:text-gray-400">clients</p>
            </div>
          {/each}
        </div>
      {/if}
    </Card>

    <!-- MRR Trend (Simple Bar Chart) -->
    <Card class="p-5">
      <h3 class="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-white">
        <ArrowTrendingUpOutline class="h-5 w-5 text-primary-600" />
        MRR Trend (6 Months)
      </h3>

      {#if data.mrrHistory.length === 0}
        <div class="py-8 text-center">
          <p class="text-gray-500 dark:text-gray-400">No historical data available</p>
        </div>
      {:else}
        {@const maxMRR = Math.max(...data.mrrHistory.map(m => m.mrr))}
        <div class="flex h-48 items-end justify-between gap-2">
          {#each data.mrrHistory as month, index}
            {@const height = maxMRR > 0 ? (month.mrr / maxMRR) * 100 : 0}
            {@const isLatest = index === data.mrrHistory.length - 1}
            <div class="flex flex-1 flex-col items-center">
              <div class="relative mb-2 w-full">
                <div
                  class="mx-auto w-full max-w-[40px] rounded-t transition-all {isLatest ? 'bg-primary-600' : 'bg-gray-300 dark:bg-gray-600'}"
                  style="height: {height * 1.5}px"
                ></div>
                {#if isLatest}
                  <div class="absolute -top-6 left-1/2 -translate-x-1/2 whitespace-nowrap text-xs font-bold text-primary-600">
                    {formatCompactCurrency(month.mrr)}
                  </div>
                {/if}
              </div>
              <span class="text-xs text-gray-500 dark:text-gray-400">{month.month}</span>
            </div>
          {/each}
        </div>

        <div class="mt-4 flex justify-between border-t border-gray-200 pt-4 text-sm dark:border-gray-700">
          <div>
            <span class="text-gray-500 dark:text-gray-400">Starting MRR:</span>
            <span class="ml-2 font-medium text-gray-900 dark:text-white">
              {formatCurrency(data.mrrHistory[0]?.mrr || 0, { showCents: false })}
            </span>
          </div>
          <div>
            <span class="text-gray-500 dark:text-gray-400">Current MRR:</span>
            <span class="ml-2 font-medium text-gray-900 dark:text-white">
              {formatCurrency(data.mrrHistory[data.mrrHistory.length - 1]?.mrr || 0, { showCents: false })}
            </span>
          </div>
        </div>
      {/if}
    </Card>
  </div>

  <!-- Row 3: Ad Spend + Margin Analysis -->
  <div class="grid gap-6 lg:grid-cols-2">
    <!-- Ad Spend Under Management -->
    <Card class="p-5">
      <h3 class="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-white">
        <ChartBarOutline class="h-5 w-5 text-primary-600" />
        Ad Spend Under Management
      </h3>

      <div class="mb-4 flex items-center justify-between">
        <div>
          <p class="text-3xl font-bold text-gray-900 dark:text-white">
            {formatCurrency(data.summary.totalAdSpend, { compact: true })}
          </p>
          <p class="text-sm text-gray-500 dark:text-gray-400">Last {data.dateRange} days</p>
        </div>
        <div class="flex items-center gap-2">
          {#if data.summary.adSpendGrowth >= 0}
            <Badge color="green">
              <ArrowTrendingUpOutline class="mr-1 h-3 w-3" />
              {formatPercent(data.summary.adSpendGrowth)}
            </Badge>
          {:else}
            <Badge color="red">
              <ArrowTrendingDownOutline class="mr-1 h-3 w-3" />
              {formatPercent(Math.abs(data.summary.adSpendGrowth))}
            </Badge>
          {/if}
        </div>
      </div>

      <div class="space-y-2 text-sm">
        <div class="flex justify-between rounded-lg bg-gray-50 px-3 py-2 dark:bg-gray-700/50">
          <span class="text-gray-600 dark:text-gray-400">Avg spend per client</span>
          <span class="font-medium text-gray-900 dark:text-white">
            {data.summary.totalClients > 0
              ? formatCurrency(data.summary.totalAdSpend / data.summary.totalClients, { showCents: false })
              : '$0'}
          </span>
        </div>
        <div class="flex justify-between rounded-lg bg-gray-50 px-3 py-2 dark:bg-gray-700/50">
          <span class="text-gray-600 dark:text-gray-400">Daily avg spend</span>
          <span class="font-medium text-gray-900 dark:text-white">
            {formatCurrency(data.summary.totalAdSpend / data.dateRange, { showCents: false })}
          </span>
        </div>
      </div>
    </Card>

    <!-- Margin Analysis -->
    <Card class="p-5">
      <h3 class="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-white">
        <ChartPieOutline class="h-5 w-5 text-primary-600" />
        Margin Analysis by Tier
      </h3>

      {#if data.marginAnalysis.length === 0}
        <div class="py-8 text-center">
          <p class="text-gray-500 dark:text-gray-400">No margin data available</p>
        </div>
      {:else}
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="border-b border-gray-200 dark:border-gray-700">
                <th class="pb-2 text-left font-medium text-gray-500 dark:text-gray-400">Tier</th>
                <th class="pb-2 text-right font-medium text-gray-500 dark:text-gray-400">Revenue</th>
                <th class="pb-2 text-right font-medium text-gray-500 dark:text-gray-400">Est. Cost</th>
                <th class="pb-2 text-right font-medium text-gray-500 dark:text-gray-400">Margin</th>
              </tr>
            </thead>
            <tbody>
              {#each data.marginAnalysis as tier}
                {@const colors = tierColors[tier.tier] || tierColors.starter}
                <tr class="border-b border-gray-100 dark:border-gray-800">
                  <td class="py-3">
                    <span class={`font-medium ${colors.text}`}>{tier.tierName}</span>
                    <span class="ml-2 text-xs text-gray-500">({tier.clientCount})</span>
                  </td>
                  <td class="py-3 text-right font-medium text-gray-900 dark:text-white">
                    {formatCurrency(tier.revenue, { showCents: false })}
                  </td>
                  <td class="py-3 text-right text-gray-600 dark:text-gray-400">
                    {formatCurrency(tier.estimatedCost, { showCents: false })}
                  </td>
                  <td class="py-3 text-right">
                    <span class={tier.marginPercent >= 50 ? 'text-green-600 dark:text-green-400' : tier.marginPercent >= 30 ? 'text-yellow-600 dark:text-yellow-400' : 'text-red-600 dark:text-red-400'}>
                      {formatPercent(tier.marginPercent)}
                    </span>
                  </td>
                </tr>
              {/each}
            </tbody>
            <tfoot>
              <tr class="font-semibold">
                <td class="pt-3 text-gray-900 dark:text-white">Total</td>
                <td class="pt-3 text-right text-gray-900 dark:text-white">
                  {formatCurrency(data.marginAnalysis.reduce((sum, t) => sum + t.revenue, 0), { showCents: false })}
                </td>
                <td class="pt-3 text-right text-gray-600 dark:text-gray-400">
                  {formatCurrency(data.marginAnalysis.reduce((sum, t) => sum + t.estimatedCost, 0), { showCents: false })}
                </td>
                <td class="pt-3 text-right text-green-600 dark:text-green-400">
                  {formatPercent((data.marginAnalysis.reduce((sum, t) => sum + t.margin, 0) / Math.max(data.marginAnalysis.reduce((sum, t) => sum + t.revenue, 0), 1)) * 100)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      {/if}
    </Card>
  </div>

  <!-- Row 4: Revenue by Territory -->
  <Card class="p-5">
    <h3 class="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-white">
      <GlobeAmericasOutline class="h-5 w-5 text-primary-600" />
      Top Territories by Revenue
    </h3>

    {#if data.topTerritories.length === 0}
      <div class="py-8 text-center">
        <p class="text-gray-500 dark:text-gray-400">No territory data available</p>
      </div>
    {:else}
      <div class="overflow-x-auto">
        <Table striped>
          <TableHead>
            <TableHeadCell>Territory</TableHeadCell>
            <TableHeadCell>Location</TableHeadCell>
            <TableHeadCell>Client</TableHeadCell>
            <TableHeadCell class="text-right">Monthly Revenue</TableHeadCell>
          </TableHead>
          <TableBody>
            {#each data.topTerritories as territory, index}
              <TableBodyRow>
                <TableBodyCell>
                  <div class="flex items-center gap-2">
                    <span class="flex h-6 w-6 items-center justify-center rounded-full bg-primary-100 text-xs font-bold text-primary-600 dark:bg-primary-900/30 dark:text-primary-400">
                      {index + 1}
                    </span>
                    <span class="font-medium text-gray-900 dark:text-white">{territory.territoryName}</span>
                  </div>
                </TableBodyCell>
                <TableBodyCell>{territory.city}, {territory.state}</TableBodyCell>
                <TableBodyCell>{territory.organizationName}</TableBodyCell>
                <TableBodyCell class="text-right font-semibold text-gray-900 dark:text-white">
                  {formatCurrency(territory.monthlyRevenue, { showCents: false })}
                </TableBodyCell>
              </TableBodyRow>
            {/each}
          </TableBody>
        </Table>
      </div>
    {/if}
  </Card>

  <!-- Row 5: Churn Risk + Invoice Tracking -->
  <div class="grid gap-6 lg:grid-cols-2">
    <!-- Churn Risk Table -->
    <Card class="p-5">
      <h3 class="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-white">
        <ExclamationTriangleOutline class="h-5 w-5 text-yellow-500" />
        Churn Risk Clients
      </h3>

      {#if data.churnRiskClients.length === 0}
        <div class="py-8 text-center">
          <p class="text-green-600 dark:text-green-400">No clients at immediate churn risk</p>
        </div>
      {:else}
        <div class="space-y-3">
          {#each data.churnRiskClients as client}
            <div class="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
              <div class="mb-2 flex items-start justify-between">
                <div>
                  <a href="/internal/clients/{client.slug}" class="font-medium text-gray-900 hover:text-primary-600 dark:text-white dark:hover:text-primary-400">
                    {client.name}
                  </a>
                  {#if client.contract}
                    <p class="text-xs text-gray-500 dark:text-gray-400">
                      {client.contract.planName} - {formatCurrency(client.contract.monthlyCommitment, { showCents: false })}/mo
                    </p>
                  {/if}
                </div>
                <div class="text-right">
                  <div class="flex items-center gap-2">
                    <div class="h-2 w-16 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                      <div
                        class="h-full rounded-full {getHealthScoreBgColor(client.healthScore)}"
                        style="width: {client.healthScore}%"
                      ></div>
                    </div>
                    <span class={`text-sm font-medium ${getHealthScoreColor(client.healthScore)}`}>
                      {client.healthScore}
                    </span>
                  </div>
                </div>
              </div>

              <!-- Risk indicators -->
              <div class="flex flex-wrap gap-2">
                {#if client.healthScore < 50}
                  <Badge color="red">Low Health Score</Badge>
                {/if}
                {#if client.contract && getDaysUntilExpiry(client.contract.endDate) <= 90}
                  {@const daysLeft = getDaysUntilExpiry(client.contract.endDate)}
                  <Badge color={daysLeft <= 30 ? 'red' : 'yellow'}>
                    <ClockOutline class="mr-1 h-3 w-3" />
                    {daysLeft} days until renewal
                  </Badge>
                {/if}
              </div>
            </div>
          {/each}
        </div>
      {/if}
    </Card>

    <!-- Invoice Tracking -->
    <Card class="p-5">
      <div class="mb-4 flex items-center justify-between">
        <h3 class="flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-white">
          <DocumentTextOutline class="h-5 w-5 text-primary-600" />
          Invoice Tracking
        </h3>
        <Button size="xs" color="light" href="/internal/billing">View All</Button>
      </div>

      <!-- Invoice Stats -->
      <div class="mb-4 grid grid-cols-4 gap-2">
        <div class="rounded-lg bg-green-50 p-3 text-center dark:bg-green-900/30">
          <p class="text-lg font-bold text-green-600 dark:text-green-400">{data.invoiceStats.paid.count}</p>
          <p class="text-xs text-green-600 dark:text-green-400">Paid</p>
        </div>
        <div class="rounded-lg bg-yellow-50 p-3 text-center dark:bg-yellow-900/30">
          <p class="text-lg font-bold text-yellow-600 dark:text-yellow-400">{data.invoiceStats.pending.count}</p>
          <p class="text-xs text-yellow-600 dark:text-yellow-400">Pending</p>
        </div>
        <div class="rounded-lg bg-red-50 p-3 text-center dark:bg-red-900/30">
          <p class="text-lg font-bold text-red-600 dark:text-red-400">{data.invoiceStats.overdue.count}</p>
          <p class="text-xs text-red-600 dark:text-red-400">Overdue</p>
        </div>
        <div class="rounded-lg bg-gray-50 p-3 text-center dark:bg-gray-700/50">
          <p class="text-lg font-bold text-gray-600 dark:text-gray-400">{data.invoiceStats.draft.count}</p>
          <p class="text-xs text-gray-600 dark:text-gray-400">Draft</p>
        </div>
      </div>

      <!-- Overdue Invoices -->
      {#if data.overdueInvoices.length > 0}
        <div class="mb-4">
          <p class="mb-2 text-sm font-medium text-red-600 dark:text-red-400">Overdue Invoices</p>
          <div class="space-y-2">
            {#each data.overdueInvoices.slice(0, 3) as invoice}
              <div class="flex items-center justify-between rounded-lg bg-red-50 px-3 py-2 dark:bg-red-900/20">
                <div>
                  <span class="font-medium text-gray-900 dark:text-white">{invoice.organization?.name}</span>
                  <span class="ml-2 text-xs text-gray-500 dark:text-gray-400">{invoice.invoiceNumber}</span>
                </div>
                <div class="text-right">
                  <span class="font-semibold text-red-600 dark:text-red-400">
                    {formatCurrency(invoice.totalAmount)}
                  </span>
                  <p class="text-xs text-gray-500 dark:text-gray-400">
                    Due {formatDate(invoice.dueDate, 'short')}
                  </p>
                </div>
              </div>
            {/each}
          </div>
        </div>
      {/if}

      <!-- Recent Invoices -->
      <div>
        <p class="mb-2 text-sm font-medium text-gray-600 dark:text-gray-400">Recent Invoices</p>
        <div class="space-y-2">
          {#each data.recentInvoices.slice(0, 5) as invoice}
            {@const status = invoiceStatusConfig[invoice.status]}
            <div class="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2 dark:bg-gray-700/50">
              <div class="flex items-center gap-3">
                <Badge color={status.color}>{status.label}</Badge>
                <div>
                  <span class="font-medium text-gray-900 dark:text-white">{invoice.organization?.name}</span>
                  <p class="text-xs text-gray-500 dark:text-gray-400">{invoice.invoiceNumber}</p>
                </div>
              </div>
              <div class="text-right">
                <span class="font-semibold text-gray-900 dark:text-white">
                  {formatCurrency(invoice.totalAmount)}
                </span>
                <p class="text-xs text-gray-500 dark:text-gray-400">
                  {formatDate(invoice.issueDate, 'short')}
                </p>
              </div>
            </div>
          {/each}
        </div>
      </div>
    </Card>
  </div>
</div>
