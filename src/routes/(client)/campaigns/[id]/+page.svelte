<script lang="ts">
  import {
    Card,
    Badge,
    Button,
    Tabs,
    TabItem,
    Timeline,
    TimelineItem,
    Indicator,
    Progressbar
  } from 'flowbite-svelte';
  import {
    ArrowLeftOutline,
    ArrowUpOutline,
    ArrowDownOutline,
    ChartOutline,
    RocketOutline,
    PlayOutline,
    PauseOutline,
    CheckOutline,
    CloseOutline,
    LinkOutline,
    ImageOutline,
    LightbulbOutline,
    CogOutline,
    ExclamationCircleOutline,
    ClockOutline
  } from 'flowbite-svelte-icons';
  import type { PageData } from './$types';
  import { formatCurrency, formatCompactNumber, formatDate, formatPercent } from '$lib/utils';

  let { data }: { data: PageData } = $props();

  // Platform display config
  const platformConfig: Record<string, { label: string; color: string; bgColor: string }> = {
    google: {
      label: 'Google Ads',
      color: 'text-blue-600 dark:text-blue-400',
      bgColor: 'bg-blue-100 dark:bg-blue-900/30'
    },
    facebook: {
      label: 'Facebook',
      color: 'text-indigo-600 dark:text-indigo-400',
      bgColor: 'bg-indigo-100 dark:bg-indigo-900/30'
    },
    instagram: {
      label: 'Instagram',
      color: 'text-pink-600 dark:text-pink-400',
      bgColor: 'bg-pink-100 dark:bg-pink-900/30'
    },
    meta: {
      label: 'Meta',
      color: 'text-blue-600 dark:text-blue-400',
      bgColor: 'bg-blue-100 dark:bg-blue-900/30'
    }
  };

  // Status badge config
  const statusConfig: Record<string, { label: string; color: 'green' | 'yellow' | 'gray' | 'blue' | 'red'; icon: any }> = {
    active: { label: 'Active', color: 'green', icon: PlayOutline },
    paused: { label: 'Paused', color: 'yellow', icon: PauseOutline },
    draft: { label: 'Draft', color: 'gray', icon: CogOutline },
    pending_review: { label: 'Pending Review', color: 'blue', icon: ClockOutline },
    completed: { label: 'Completed', color: 'gray', icon: CheckOutline }
  };

  // Campaign type labels
  const campaignTypeLabels: Record<string, string> = {
    lead_gen: 'Lead Generation',
    awareness: 'Brand Awareness',
    retargeting: 'Retargeting'
  };

  // Optimization type labels and icons
  const optimizationTypeConfig: Record<string, { label: string; icon: any; color: string }> = {
    bid_adjustment: { label: 'Bid Adjustment', icon: ChartOutline, color: 'text-blue-500' },
    audience_change: { label: 'Audience Change', icon: RocketOutline, color: 'text-purple-500' },
    budget_change: { label: 'Budget Change', icon: CogOutline, color: 'text-green-500' },
    creative_swap: { label: 'Creative Swap', icon: ImageOutline, color: 'text-pink-500' },
    pause_ad: { label: 'Ad Paused', icon: PauseOutline, color: 'text-yellow-500' },
    scale_ad: { label: 'Ad Scaled', icon: ArrowUpOutline, color: 'text-green-500' }
  };

  // Impact badge colors
  const impactColors: Record<string, 'green' | 'yellow' | 'red'> = {
    positive: 'green',
    neutral: 'yellow',
    negative: 'red'
  };

  // Creative status labels
  const creativeStatusLabels: Record<string, { label: string; color: 'green' | 'yellow' | 'gray' | 'red' }> = {
    draft: { label: 'Draft', color: 'gray' },
    pending_review: { label: 'Pending', color: 'yellow' },
    approved: { label: 'Approved', color: 'green' },
    rejected: { label: 'Rejected', color: 'red' }
  };

  let platform = $derived(platformConfig[data.campaign.platform] || platformConfig.google);
  let status = $derived(statusConfig[data.campaign.status] || statusConfig.draft);
  let StatusIcon = $derived(status.icon);

  // Get trend display
  function getTrendDisplay(value: number, direction: string, positiveIsUp = true) {
    const isPositive = positiveIsUp ? direction === 'up' : direction === 'down';
    return {
      icon: direction === 'up' ? ArrowUpOutline : direction === 'down' ? ArrowDownOutline : null,
      color: isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400',
      bgColor: isPositive ? 'bg-green-100 dark:bg-green-900/30' : 'bg-red-100 dark:bg-red-900/30',
      value: Math.abs(value)
    };
  }
</script>

<div class="space-y-6">
  <!-- Back Button and Header -->
  <div class="flex flex-col gap-4">
    <a
      href="/campaigns"
      class="inline-flex w-fit items-center gap-2 text-sm text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
    >
      <ArrowLeftOutline class="h-4 w-4" />
      Back to Campaigns
    </a>

    <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div class="flex items-center gap-4">
        <div class={`flex h-14 w-14 items-center justify-center rounded-xl ${platform.bgColor}`}>
          <span class={`text-2xl font-bold ${platform.color}`}>
            {data.campaign.platform.charAt(0).toUpperCase()}
          </span>
        </div>
        <div>
          <div class="flex items-center gap-3">
            <h1 class="text-2xl font-bold text-gray-900 dark:text-white">{data.campaign.name}</h1>
            <Badge color={status.color} class="flex items-center gap-1">
              <StatusIcon class="h-3 w-3" />
              {status.label}
            </Badge>
          </div>
          <div class="mt-1 flex flex-wrap items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
            <span>{platform.label}</span>
            <span class="hidden sm:inline">-</span>
            <span>{campaignTypeLabels[data.campaign.campaignType] || data.campaign.campaignType}</span>
            {#if data.campaign.territory}
              <span class="hidden sm:inline">-</span>
              <span>{data.campaign.territory.city}, {data.campaign.territory.state}</span>
            {/if}
          </div>
        </div>
      </div>

      <div class="flex items-center gap-2">
        {#if data.campaign.dailyBudget}
          <div class="text-right">
            <p class="text-xs text-gray-500 dark:text-gray-400">Daily Budget</p>
            <p class="font-semibold text-gray-900 dark:text-white">
              {formatCurrency(data.campaign.dailyBudget)}
            </p>
          </div>
        {/if}
        {#if data.campaign.monthlyBudget}
          <div class="ml-4 border-l border-gray-200 pl-4 text-right dark:border-gray-700">
            <p class="text-xs text-gray-500 dark:text-gray-400">Monthly Budget</p>
            <p class="font-semibold text-gray-900 dark:text-white">
              {formatCurrency(data.campaign.monthlyBudget)}
            </p>
          </div>
        {/if}
      </div>
    </div>
  </div>

  <!-- Metrics Grid -->
  <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
    <Card class="p-4">
      <p class="text-sm font-medium text-gray-500 dark:text-gray-400">Impressions</p>
      <p class="mt-1 text-2xl font-bold text-gray-900 dark:text-white">
        {formatCompactNumber(data.metrics.total.impressions)}
      </p>
      <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
        ~{formatCompactNumber(data.metrics.dailyAvg.impressions)}/day avg
      </p>
    </Card>

    <Card class="p-4">
      <p class="text-sm font-medium text-gray-500 dark:text-gray-400">Clicks</p>
      <p class="mt-1 text-2xl font-bold text-gray-900 dark:text-white">
        {formatCompactNumber(data.metrics.total.clicks)}
      </p>
      <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
        {formatPercent(data.metrics.total.ctr)} CTR
      </p>
    </Card>

    <Card class="p-4">
      {@const leadsTrend = getTrendDisplay(data.metrics.trends.leads, data.metrics.trends.leadsDirection)}
      <div class="flex items-start justify-between">
        <div>
          <p class="text-sm font-medium text-gray-500 dark:text-gray-400">Leads</p>
          <p class="mt-1 text-2xl font-bold text-gray-900 dark:text-white">
            {data.metrics.total.leads}
          </p>
        </div>
        {#if leadsTrend.icon}
          {@const LeadsTrendIcon = leadsTrend.icon}
          <div class={`flex items-center gap-1 rounded-full px-2 py-0.5 ${leadsTrend.bgColor}`}>
            <LeadsTrendIcon class={`h-3 w-3 ${leadsTrend.color}`} />
            <span class={`text-xs font-medium ${leadsTrend.color}`}>{leadsTrend.value}%</span>
          </div>
        {/if}
      </div>
      <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
        ~{data.metrics.dailyAvg.leads}/day avg
      </p>
    </Card>

    <Card class="p-4">
      <p class="text-sm font-medium text-gray-500 dark:text-gray-400">Cost Per Lead</p>
      <p class="mt-1 text-2xl font-bold text-gray-900 dark:text-white">
        {formatCurrency(data.metrics.total.cpl)}
      </p>
      <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
        {formatCurrency(data.metrics.total.spend)} total spend
      </p>
    </Card>
  </div>

  <!-- Additional Metrics Row -->
  <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
    <Card class="p-4">
      <p class="text-sm font-medium text-gray-500 dark:text-gray-400">Spend (Last 30 Days)</p>
      <p class="mt-1 text-2xl font-bold text-gray-900 dark:text-white">
        {formatCurrency(data.metrics.total.spend)}
      </p>
      {@const spendTrend = getTrendDisplay(data.metrics.trends.spend, data.metrics.trends.spendDirection, false)}
      {#if spendTrend.icon}
        {@const SpendTrendIcon = spendTrend.icon}
        <div class="mt-1 flex items-center gap-1">
          <SpendTrendIcon class={`h-3 w-3 ${spendTrend.color}`} />
          <span class={`text-xs font-medium ${spendTrend.color}`}>{spendTrend.value}% vs prev 7 days</span>
        </div>
      {/if}
    </Card>

    <Card class="p-4">
      <p class="text-sm font-medium text-gray-500 dark:text-gray-400">Conversions</p>
      <p class="mt-1 text-2xl font-bold text-gray-900 dark:text-white">
        {data.metrics.total.conversions}
      </p>
      <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
        {formatCurrency(data.metrics.total.cpa)} CPA
      </p>
    </Card>

    <Card class="p-4">
      <p class="text-sm font-medium text-gray-500 dark:text-gray-400">Campaign Duration</p>
      <p class="mt-1 text-2xl font-bold text-gray-900 dark:text-white">
        {#if data.campaign.startDate}
          {formatDate(data.campaign.startDate, 'short')}
        {:else}
          Not started
        {/if}
      </p>
      <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
        {#if data.campaign.endDate}
          Ends {formatDate(data.campaign.endDate, 'short')}
        {:else}
          Ongoing
        {/if}
      </p>
    </Card>

    <Card class="p-4">
      <p class="text-sm font-medium text-gray-500 dark:text-gray-400">AI Optimizations</p>
      <p class="mt-1 text-2xl font-bold text-gray-900 dark:text-white">
        {data.optimizationLogs.length}
      </p>
      <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">Applied automatically</p>
    </Card>
  </div>

  <!-- Tabbed Content -->
  <Tabs style="underline" class="mt-6">
    <!-- Performance Chart Placeholder -->
    <TabItem open title="Performance">
      <Card class="mt-4 p-6">
        <h3 class="mb-4 text-lg font-semibold text-gray-900 dark:text-white">Daily Performance</h3>

        {#if data.metrics.daily.length === 0}
          <div class="flex flex-col items-center justify-center py-12 text-center">
            <ChartOutline class="h-12 w-12 text-gray-400" />
            <p class="mt-4 text-gray-500 dark:text-gray-400">No performance data available yet.</p>
            <p class="text-sm text-gray-400 dark:text-gray-500">Metrics will appear once the campaign is running.</p>
          </div>
        {:else}
          <!-- Simple data table as chart placeholder -->
          <div class="overflow-x-auto">
            <table class="w-full text-left text-sm">
              <thead class="border-b border-gray-200 text-xs uppercase text-gray-500 dark:border-gray-700 dark:text-gray-400">
                <tr>
                  <th class="py-3 pr-4">Date</th>
                  <th class="py-3 px-4 text-right">Impressions</th>
                  <th class="py-3 px-4 text-right">Clicks</th>
                  <th class="py-3 px-4 text-right">CTR</th>
                  <th class="py-3 px-4 text-right">Leads</th>
                  <th class="py-3 px-4 text-right">Spend</th>
                  <th class="py-3 pl-4 text-right">CPL</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-100 dark:divide-gray-700">
                {#each data.metrics.daily.slice(-7).reverse() as day}
                  <tr class="text-gray-900 dark:text-white">
                    <td class="py-3 pr-4 font-medium">{formatDate(day.date, 'short')}</td>
                    <td class="py-3 px-4 text-right">{formatCompactNumber(day.impressions)}</td>
                    <td class="py-3 px-4 text-right">{formatCompactNumber(day.clicks)}</td>
                    <td class="py-3 px-4 text-right">{formatPercent(day.ctr)}</td>
                    <td class="py-3 px-4 text-right">{day.leads}</td>
                    <td class="py-3 px-4 text-right">{formatCurrency(day.spend)}</td>
                    <td class="py-3 pl-4 text-right">{formatCurrency(day.cpl)}</td>
                  </tr>
                {/each}
              </tbody>
            </table>
          </div>
          <p class="mt-4 text-center text-sm text-gray-500 dark:text-gray-400">
            Showing last 7 days. Full performance charts coming soon.
          </p>
        {/if}
      </Card>
    </TabItem>

    <!-- Ad Creatives -->
    <TabItem title="Ad Creatives">
      <div class="mt-4 space-y-4">
        {#if data.creatives.length === 0}
          <Card class="p-8 text-center">
            <ImageOutline class="mx-auto h-12 w-12 text-gray-400" />
            <p class="mt-4 text-gray-500 dark:text-gray-400">No ad creatives yet.</p>
            <p class="text-sm text-gray-400 dark:text-gray-500">
              Creatives will be generated based on your brand voice.
            </p>
          </Card>
        {:else}
          <div class="grid gap-4 md:grid-cols-2">
            {#each data.creatives as creative}
              {@const creativeStatus = creativeStatusLabels[creative.status] || creativeStatusLabels.draft}
              <Card class="p-5">
                <div class="mb-3 flex items-start justify-between">
                  <div class="flex items-center gap-2">
                    <Badge color={creative.type === 'video' ? 'purple' : creative.type === 'carousel' ? 'blue' : 'gray'}>
                      {creative.type}
                    </Badge>
                    {#if creative.aiGenerated}
                      <Badge color="indigo" class="flex items-center gap-1">
                        <LightbulbOutline class="h-3 w-3" />
                        AI Generated
                      </Badge>
                    {/if}
                  </div>
                  <Badge color={creativeStatus.color}>{creativeStatus.label}</Badge>
                </div>

                {#if creative.headline}
                  <h4 class="mb-2 text-lg font-semibold text-gray-900 dark:text-white">
                    {creative.headline}
                  </h4>
                {/if}

                {#if creative.body}
                  <p class="mb-3 text-sm text-gray-600 dark:text-gray-400 line-clamp-3">
                    {creative.body}
                  </p>
                {/if}

                {#if creative.ctaText}
                  <div class="flex items-center gap-2">
                    <Button size="xs" color="light" class="pointer-events-none">
                      {creative.ctaText}
                    </Button>
                    {#if creative.ctaUrl}
                      <a
                        href={creative.ctaUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        class="text-xs text-primary-600 hover:underline dark:text-primary-400"
                      >
                        <LinkOutline class="inline h-3 w-3" /> View link
                      </a>
                    {/if}
                  </div>
                {/if}

                {#if creative.performanceScore !== null}
                  <div class="mt-4 border-t border-gray-100 pt-3 dark:border-gray-700">
                    <div class="flex items-center justify-between text-sm">
                      <span class="text-gray-500 dark:text-gray-400">Performance Score</span>
                      <span class="font-medium text-gray-900 dark:text-white">
                        {creative.performanceScore}/100
                      </span>
                    </div>
                    <Progressbar
                      progress={creative.performanceScore}
                      size="h-2"
                      class="mt-2"
                      color={creative.performanceScore >= 70 ? 'green' : creative.performanceScore >= 40 ? 'yellow' : 'red'}
                    />
                  </div>
                {/if}
              </Card>
            {/each}
          </div>
        {/if}
      </div>
    </TabItem>

    <!-- Landing Pages -->
    <TabItem title="Landing Pages">
      <div class="mt-4 space-y-4">
        {#if data.landingPages.length === 0}
          <Card class="p-8 text-center">
            <LinkOutline class="mx-auto h-12 w-12 text-gray-400" />
            <p class="mt-4 text-gray-500 dark:text-gray-400">No landing pages linked to this campaign.</p>
          </Card>
        {:else}
          {#each data.landingPages as page}
            <Card class="p-5">
              <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h4 class="font-semibold text-gray-900 dark:text-white">{page.name}</h4>
                  {#if page.url}
                    <a
                      href={page.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      class="mt-1 inline-flex items-center gap-1 text-sm text-primary-600 hover:underline dark:text-primary-400"
                    >
                      <LinkOutline class="h-3 w-3" />
                      {page.url}
                    </a>
                  {/if}
                </div>

                <div class="flex items-center gap-6 text-sm">
                  <div class="text-center">
                    <p class="font-semibold text-gray-900 dark:text-white">{formatCompactNumber(page.viewCount)}</p>
                    <p class="text-gray-500 dark:text-gray-400">Views</p>
                  </div>
                  <div class="text-center">
                    <p class="font-semibold text-gray-900 dark:text-white">{formatCompactNumber(page.submissionCount)}</p>
                    <p class="text-gray-500 dark:text-gray-400">Submissions</p>
                  </div>
                  {#if page.conversionRate !== null}
                    <div class="text-center">
                      <p class="font-semibold text-green-600 dark:text-green-400">
                        {formatPercent(page.conversionRate)}
                      </p>
                      <p class="text-gray-500 dark:text-gray-400">Conv. Rate</p>
                    </div>
                  {/if}
                </div>
              </div>
            </Card>
          {/each}
        {/if}
      </div>
    </TabItem>

    <!-- AI Optimization Log -->
    <TabItem title="AI Optimizations">
      <Card class="mt-4 p-5">
        <h3 class="mb-4 text-lg font-semibold text-gray-900 dark:text-white">Optimization History</h3>

        {#if data.optimizationLogs.length === 0}
          <div class="flex flex-col items-center justify-center py-12 text-center">
            <LightbulbOutline class="h-12 w-12 text-gray-400" />
            <p class="mt-4 text-gray-500 dark:text-gray-400">No optimizations applied yet.</p>
            <p class="text-sm text-gray-400 dark:text-gray-500">
              Our AI continuously monitors and optimizes your campaigns.
            </p>
          </div>
        {:else}
          <Timeline>
            {#each data.optimizationLogs as log}
              {@const typeConfig = optimizationTypeConfig[log.type] || { label: log.type, icon: CogOutline, color: 'text-gray-500' }}
              {@const TypeIcon = typeConfig.icon}
              <TimelineItem title={log.title} date={formatDate(log.appliedAt, 'datetime')}>
                {#snippet icon()}
                  <span class="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 ring-4 ring-white dark:bg-gray-700 dark:ring-gray-800">
                    <TypeIcon class={`h-4 w-4 ${typeConfig.color}`} />
                  </span>
                {/snippet}

                <div class="mb-2 flex flex-wrap items-center gap-2">
                  <Badge color="gray">{typeConfig.label}</Badge>
                  {#if log.impact}
                    <Badge color={impactColors[log.impact] || 'gray'}>
                      {log.impact} impact
                    </Badge>
                  {/if}
                  {#if log.aiConfidence !== null}
                    <span class="text-xs text-gray-500 dark:text-gray-400">
                      {Math.round(log.aiConfidence * 100)}% confidence
                    </span>
                  {/if}
                </div>

                {#if log.description}
                  <p class="text-sm text-gray-600 dark:text-gray-400">{log.description}</p>
                {/if}

                {#if log.impactMetric && log.impactValue !== null}
                  <p class="mt-2 text-sm">
                    <span class="text-gray-500 dark:text-gray-400">Result:</span>
                    <span class="ml-1 font-medium text-gray-900 dark:text-white">
                      {log.impactMetric}
                      {log.impactValue > 0 ? '+' : ''}{log.impactValue}%
                    </span>
                  </p>
                {/if}
              </TimelineItem>
            {/each}
          </Timeline>
        {/if}
      </Card>
    </TabItem>
  </Tabs>

  <!-- Campaign Details Footer -->
  <Card class="p-5">
    <h3 class="mb-4 text-lg font-semibold text-gray-900 dark:text-white">Campaign Details</h3>
    <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <div>
        <p class="text-sm text-gray-500 dark:text-gray-400">Created</p>
        <p class="font-medium text-gray-900 dark:text-white">
          {formatDate(data.campaign.createdAt, 'medium')}
        </p>
        {#if data.campaign.createdBy}
          <p class="text-xs text-gray-500 dark:text-gray-400">by {data.campaign.createdBy}</p>
        {/if}
      </div>

      {#if data.campaign.approvedAt}
        <div>
          <p class="text-sm text-gray-500 dark:text-gray-400">Approved</p>
          <p class="font-medium text-gray-900 dark:text-white">
            {formatDate(data.campaign.approvedAt, 'medium')}
          </p>
          {#if data.campaign.approvedBy}
            <p class="text-xs text-gray-500 dark:text-gray-400">by {data.campaign.approvedBy}</p>
          {/if}
        </div>
      {/if}

      {#if data.campaign.territory}
        <div>
          <p class="text-sm text-gray-500 dark:text-gray-400">Territory</p>
          <p class="font-medium text-gray-900 dark:text-white">
            {data.campaign.territory.name}
          </p>
          <p class="text-xs text-gray-500 dark:text-gray-400">
            {data.campaign.territory.city}, {data.campaign.territory.state}
            ({data.campaign.territory.radiusMiles} mi radius)
          </p>
        </div>
      {/if}

      {#if data.campaign.externalCampaignId}
        <div>
          <p class="text-sm text-gray-500 dark:text-gray-400">External ID</p>
          <p class="font-mono text-sm text-gray-900 dark:text-white">
            {data.campaign.externalCampaignId}
          </p>
        </div>
      {/if}

      {#if data.campaign.objective}
        <div class="sm:col-span-2">
          <p class="text-sm text-gray-500 dark:text-gray-400">Objective</p>
          <p class="text-gray-900 dark:text-white">{data.campaign.objective}</p>
        </div>
      {/if}
    </div>
  </Card>
</div>
