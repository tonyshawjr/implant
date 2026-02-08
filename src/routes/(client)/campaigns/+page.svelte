<script lang="ts">
  import { enhance } from '$app/forms';
  import {
    Card,
    Badge,
    Button,
    Modal,
    Select,
    Textarea,
    Label,
    Input,
    Spinner,
    ButtonGroup,
    Tabs,
    TabItem,
    Alert,
    Progressbar,
    Accordion,
    AccordionItem
  } from 'flowbite-svelte';
  import {
    RocketOutline,
    PlusOutline,
    ArrowUpOutline,
    ArrowDownOutline,
    FilterOutline,
    ChevronRightOutline,
    PlayOutline,
    PauseOutline,
    EyeOutline,
    SparklesOutline,
    LightbulbOutline,
    BeakerOutline,
    ChartBarOutline,
    ClipboardDocumentListOutline,
    CheckCircleOutline,
    ExclamationTriangleOutline,
    ArrowPathOutline
  } from 'flowbite-svelte-icons';
  import type { PageData, ActionData } from './$types';
  import { formatCurrency, formatCompactNumber, formatDate, formatPercent } from '$lib/utils';

  let { data, form }: { data: PageData; form: ActionData } = $props();

  // State
  let showRequestModal = $state(false);
  let showAIGenerateModal = $state(false);
  let showOptimizationPanel = $state(false);
  let showVariantViewer = $state(false);
  let isSubmitting = $state(false);
  let isGenerating = $state(false);
  let statusFilter = $state<string>('all');
  let platformFilter = $state<string>('all');

  // AI Generation State
  let aiPlatform = $state<string>('facebook');
  let aiCampaignType = $state<string>('lead_gen');
  let aiMonthlyBudget = $state<number>(2000);
  let generatedBlueprint = $state<any>(null);
  let generationError = $state<string | null>(null);

  // Optimization State
  let selectedCampaignForOptimization = $state<string | null>(null);
  let optimizationResults = $state<any>(null);
  let isOptimizing = $state(false);

  // A/B Variant State
  let variantContent = $state<string>('');
  let variantType = $state<string>('headline');
  let generatedVariants = $state<any[]>([]);
  let isGeneratingVariants = $state(false);

  // AI Campaign Generation
  async function generateAICampaign() {
    isGenerating = true;
    generationError = null;

    try {
      const response = await fetch('/api/ai/create-campaign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          territoryId: data.territory?.id,
          platform: aiPlatform,
          campaignType: aiCampaignType,
          monthlyBudget: aiMonthlyBudget,
          createLandingPage: true
        })
      });

      const result = await response.json();

      if (result.success) {
        generatedBlueprint = result.data;
      } else {
        generationError = result.error?.message || 'Failed to generate campaign';
      }
    } catch (err) {
      generationError = err instanceof Error ? err.message : 'An error occurred';
    } finally {
      isGenerating = false;
    }
  }

  // Campaign Optimization
  async function optimizeCampaign(campaignId: string) {
    isOptimizing = true;
    selectedCampaignForOptimization = campaignId;

    try {
      const response = await fetch('/api/ai/optimize-campaign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaignId })
      });

      const result = await response.json();

      if (result.success) {
        optimizationResults = result.data;
        showOptimizationPanel = true;
      }
    } catch (err) {
      console.error('Optimization error:', err);
    } finally {
      isOptimizing = false;
    }
  }

  // A/B Variant Generation
  async function generateVariants() {
    if (!variantContent.trim()) return;

    isGeneratingVariants = true;

    try {
      const response = await fetch('/api/ai/generate-variants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          originalContent: variantContent,
          contentType: variantType,
          variantCount: 5
        })
      });

      const result = await response.json();

      if (result.success) {
        generatedVariants = result.data.variants;
      }
    } catch (err) {
      console.error('Variant generation error:', err);
    } finally {
      isGeneratingVariants = false;
    }
  }

  // Health score color helper
  function getHealthScoreColor(score: number): string {
    if (score >= 80) return 'text-green-600 dark:text-green-400';
    if (score >= 60) return 'text-yellow-600 dark:text-yellow-400';
    if (score >= 40) return 'text-orange-600 dark:text-orange-400';
    return 'text-red-600 dark:text-red-400';
  }

  function getHealthScoreBg(score: number): string {
    if (score >= 80) return 'bg-green-100 dark:bg-green-900/30';
    if (score >= 60) return 'bg-yellow-100 dark:bg-yellow-900/30';
    if (score >= 40) return 'bg-orange-100 dark:bg-orange-900/30';
    return 'bg-red-100 dark:bg-red-900/30';
  }

  // Filtered campaigns
  let filteredCampaigns = $derived(() => {
    let campaigns = data.campaigns;

    if (statusFilter !== 'all') {
      campaigns = campaigns.filter(c => c.status === statusFilter);
    }

    if (platformFilter !== 'all') {
      campaigns = campaigns.filter(c => c.platform === platformFilter);
    }

    return campaigns;
  });

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
  const statusConfig: Record<string, { label: string; color: 'green' | 'yellow' | 'gray' | 'blue' | 'red' }> = {
    active: { label: 'Active', color: 'green' },
    paused: { label: 'Paused', color: 'yellow' },
    draft: { label: 'Draft', color: 'gray' },
    pending_review: { label: 'Pending Review', color: 'blue' },
    completed: { label: 'Completed', color: 'gray' }
  };

  // Campaign type labels
  const campaignTypeLabels: Record<string, string> = {
    lead_gen: 'Lead Generation',
    awareness: 'Brand Awareness',
    retargeting: 'Retargeting'
  };

  // Get trend icon and color
  function getTrendDisplay(trend: { leads: number; direction: string }) {
    if (trend.direction === 'up') {
      return {
        icon: ArrowUpOutline,
        color: 'text-green-600 dark:text-green-400',
        bgColor: 'bg-green-100 dark:bg-green-900/30'
      };
    } else if (trend.direction === 'down') {
      return {
        icon: ArrowDownOutline,
        color: 'text-red-600 dark:text-red-400',
        bgColor: 'bg-red-100 dark:bg-red-900/30'
      };
    }
    return {
      icon: null,
      color: 'text-gray-500 dark:text-gray-400',
      bgColor: 'bg-gray-100 dark:bg-gray-700'
    };
  }

  // Close modal on success
  $effect(() => {
    if (form?.success) {
      showRequestModal = false;
      isSubmitting = false;
    }
  });
</script>

<div class="space-y-6">
  <!-- Page Header -->
  <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
    <div>
      <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Campaigns</h1>
      <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
        Manage and monitor your advertising campaigns across all platforms.
      </p>
    </div>
    <div class="flex gap-2">
      <Button size="sm" color="purple" onclick={() => (showAIGenerateModal = true)}>
        <SparklesOutline class="mr-2 h-4 w-4" />
        AI Generate Campaign
      </Button>
      <Button size="sm" onclick={() => (showRequestModal = true)}>
        <PlusOutline class="mr-2 h-4 w-4" />
        Request Campaign
      </Button>
    </div>
  </div>

  <!-- Stats Cards -->
  <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
    <Card class="p-4">
      <div class="flex items-center justify-between">
        <div>
          <p class="text-sm font-medium text-gray-500 dark:text-gray-400">Total Campaigns</p>
          <p class="mt-1 text-2xl font-bold text-gray-900 dark:text-white">{data.stats.totalCampaigns}</p>
        </div>
        <div class="flex h-12 w-12 items-center justify-center rounded-lg bg-primary-100 dark:bg-primary-900/30">
          <RocketOutline class="h-6 w-6 text-primary-600 dark:text-primary-400" />
        </div>
      </div>
      <p class="mt-2 text-sm text-gray-500 dark:text-gray-400">
        {data.stats.activeCampaigns} active
      </p>
    </Card>

    <Card class="p-4">
      <div class="flex items-center justify-between">
        <div>
          <p class="text-sm font-medium text-gray-500 dark:text-gray-400">Total Leads</p>
          <p class="mt-1 text-2xl font-bold text-gray-900 dark:text-white">
            {formatCompactNumber(data.stats.totalLeads)}
          </p>
        </div>
        <div class="flex h-12 w-12 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900/30">
          <PlayOutline class="h-6 w-6 text-green-600 dark:text-green-400" />
        </div>
      </div>
      <p class="mt-2 text-sm text-gray-500 dark:text-gray-400">From all campaigns</p>
    </Card>

    <Card class="p-4">
      <div class="flex items-center justify-between">
        <div>
          <p class="text-sm font-medium text-gray-500 dark:text-gray-400">Total Spend</p>
          <p class="mt-1 text-2xl font-bold text-gray-900 dark:text-white">
            {formatCurrency(data.stats.totalSpend, { compact: true })}
          </p>
        </div>
        <div class="flex h-12 w-12 items-center justify-center rounded-lg bg-yellow-100 dark:bg-yellow-900/30">
          <EyeOutline class="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
        </div>
      </div>
      <p class="mt-2 text-sm text-gray-500 dark:text-gray-400">Last 30 days</p>
    </Card>

    <Card class="p-4">
      <div class="flex items-center justify-between">
        <div>
          <p class="text-sm font-medium text-gray-500 dark:text-gray-400">Avg. Cost Per Lead</p>
          <p class="mt-1 text-2xl font-bold text-gray-900 dark:text-white">
            {formatCurrency(data.stats.avgCpl)}
          </p>
        </div>
        <div class="flex h-12 w-12 items-center justify-center rounded-lg bg-purple-100 dark:bg-purple-900/30">
          <RocketOutline class="h-6 w-6 text-purple-600 dark:text-purple-400" />
        </div>
      </div>
      <p class="mt-2 text-sm text-gray-500 dark:text-gray-400">Platform average</p>
    </Card>
  </div>

  <!-- AI Tools Quick Actions -->
  <Card class="p-4">
    <div class="flex items-center justify-between mb-4">
      <div class="flex items-center gap-2">
        <SparklesOutline class="h-5 w-5 text-purple-500" />
        <h3 class="font-semibold text-gray-900 dark:text-white">AI Tools</h3>
      </div>
      <Badge color="purple">Beta</Badge>
    </div>
    <div class="grid gap-3 sm:grid-cols-3">
      <button
        onclick={() => (showAIGenerateModal = true)}
        class="flex items-center gap-3 rounded-lg border border-gray-200 p-3 text-left transition-colors hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
      >
        <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100 dark:bg-purple-900/30">
          <RocketOutline class="h-5 w-5 text-purple-600 dark:text-purple-400" />
        </div>
        <div>
          <p class="font-medium text-gray-900 dark:text-white">Generate Campaign</p>
          <p class="text-xs text-gray-500 dark:text-gray-400">AI-powered full campaign setup</p>
        </div>
      </button>

      <button
        onclick={() => (showVariantViewer = true)}
        class="flex items-center gap-3 rounded-lg border border-gray-200 p-3 text-left transition-colors hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
      >
        <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30">
          <BeakerOutline class="h-5 w-5 text-blue-600 dark:text-blue-400" />
        </div>
        <div>
          <p class="font-medium text-gray-900 dark:text-white">A/B Variants</p>
          <p class="text-xs text-gray-500 dark:text-gray-400">Generate test variations</p>
        </div>
      </button>

      {#if data.campaigns.length > 0}
        <button
          onclick={() => {
            const activeCampaign = data.campaigns.find(c => c.status === 'active');
            if (activeCampaign) optimizeCampaign(activeCampaign.id);
          }}
          disabled={isOptimizing}
          class="flex items-center gap-3 rounded-lg border border-gray-200 p-3 text-left transition-colors hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800 disabled:opacity-50"
        >
          <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900/30">
            {#if isOptimizing}
              <Spinner size="5" />
            {:else}
              <LightbulbOutline class="h-5 w-5 text-green-600 dark:text-green-400" />
            {/if}
          </div>
          <div>
            <p class="font-medium text-gray-900 dark:text-white">Get Optimizations</p>
            <p class="text-xs text-gray-500 dark:text-gray-400">AI-powered recommendations</p>
          </div>
        </button>
      {:else}
        <div class="flex items-center gap-3 rounded-lg border border-gray-200 p-3 opacity-50 dark:border-gray-700">
          <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-700">
            <LightbulbOutline class="h-5 w-5 text-gray-400" />
          </div>
          <div>
            <p class="font-medium text-gray-500 dark:text-gray-400">Get Optimizations</p>
            <p class="text-xs text-gray-400">Requires active campaign</p>
          </div>
        </div>
      {/if}
    </div>
  </Card>

  <!-- Optimization Suggestions Panel -->
  {#if showOptimizationPanel && optimizationResults}
    <Card class="p-0">
      <div class="flex items-center justify-between border-b border-gray-200 p-4 dark:border-gray-700">
        <div class="flex items-center gap-3">
          <div class={`flex h-12 w-12 items-center justify-center rounded-lg ${getHealthScoreBg(optimizationResults.healthScore)}`}>
            <span class={`text-lg font-bold ${getHealthScoreColor(optimizationResults.healthScore)}`}>
              {optimizationResults.healthScore}
            </span>
          </div>
          <div>
            <h3 class="font-semibold text-gray-900 dark:text-white">
              Campaign Health: {optimizationResults.campaignName}
            </h3>
            <p class="text-sm text-gray-500 dark:text-gray-400">{optimizationResults.summary}</p>
          </div>
        </div>
        <Button size="sm" color="light" onclick={() => (showOptimizationPanel = false)}>
          Close
        </Button>
      </div>

      <div class="p-4 space-y-4">
        <!-- Issues and Opportunities -->
        {#if optimizationResults.topIssues?.length > 0}
          <div>
            <h4 class="mb-2 flex items-center gap-2 font-medium text-gray-900 dark:text-white">
              <ExclamationTriangleOutline class="h-4 w-4 text-yellow-500" />
              Top Issues
            </h4>
            <ul class="space-y-1 text-sm text-gray-600 dark:text-gray-400">
              {#each optimizationResults.topIssues.slice(0, 3) as issue}
                <li class="flex items-start gap-2">
                  <span class="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-yellow-500"></span>
                  {issue}
                </li>
              {/each}
            </ul>
          </div>
        {/if}

        {#if optimizationResults.topOpportunities?.length > 0}
          <div>
            <h4 class="mb-2 flex items-center gap-2 font-medium text-gray-900 dark:text-white">
              <LightbulbOutline class="h-4 w-4 text-green-500" />
              Opportunities
            </h4>
            <ul class="space-y-1 text-sm text-gray-600 dark:text-gray-400">
              {#each optimizationResults.topOpportunities.slice(0, 3) as opp}
                <li class="flex items-start gap-2">
                  <span class="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-green-500"></span>
                  {opp}
                </li>
              {/each}
            </ul>
          </div>
        {/if}

        <!-- Recommendations -->
        {#if optimizationResults.recommendations?.length > 0}
          <div>
            <h4 class="mb-3 font-medium text-gray-900 dark:text-white">Recommendations</h4>
            <div class="space-y-3">
              {#each optimizationResults.recommendations.slice(0, 5) as rec}
                <div class="rounded-lg border border-gray-200 p-3 dark:border-gray-700">
                  <div class="mb-2 flex items-start justify-between">
                    <div class="flex items-center gap-2">
                      <Badge color={rec.priority === 'high' ? 'red' : rec.priority === 'medium' ? 'yellow' : 'gray'}>
                        {rec.priority}
                      </Badge>
                      <span class="text-sm font-medium text-gray-900 dark:text-white">{rec.title}</span>
                    </div>
                    <span class="text-xs text-gray-500 dark:text-gray-400">
                      {Math.round(rec.confidence * 100)}% confidence
                    </span>
                  </div>
                  <p class="text-sm text-gray-600 dark:text-gray-400">{rec.description}</p>
                  {#if rec.expectedImpact}
                    <div class="mt-2 flex items-center gap-2">
                      <Badge color="green">
                        +{rec.expectedImpact.improvementPercent}% {rec.expectedImpact.metric}
                      </Badge>
                    </div>
                  {/if}
                </div>
              {/each}
            </div>
          </div>
        {/if}
      </div>
    </Card>
  {/if}

  <!-- Filters -->
  <Card class="p-4">
    <div class="flex flex-wrap items-center gap-4">
      <div class="flex items-center gap-2">
        <FilterOutline class="h-5 w-5 text-gray-500 dark:text-gray-400" />
        <span class="text-sm font-medium text-gray-700 dark:text-gray-300">Filters:</span>
      </div>

      <ButtonGroup>
        <Button
          color={statusFilter === 'all' ? 'primary' : 'light'}
          size="sm"
          onclick={() => (statusFilter = 'all')}
        >
          All
        </Button>
        <Button
          color={statusFilter === 'active' ? 'primary' : 'light'}
          size="sm"
          onclick={() => (statusFilter = 'active')}
        >
          Active
        </Button>
        <Button
          color={statusFilter === 'paused' ? 'primary' : 'light'}
          size="sm"
          onclick={() => (statusFilter = 'paused')}
        >
          Paused
        </Button>
        <Button
          color={statusFilter === 'draft' ? 'primary' : 'light'}
          size="sm"
          onclick={() => (statusFilter = 'draft')}
        >
          Draft
        </Button>
      </ButtonGroup>

      <div class="flex items-center gap-2">
        <span class="text-sm text-gray-500 dark:text-gray-400">Platform:</span>
        <Select
          size="sm"
          class="w-36"
          bind:value={platformFilter}
          items={[
            { value: 'all', name: 'All Platforms' },
            { value: 'google', name: 'Google Ads' },
            { value: 'facebook', name: 'Facebook' },
            { value: 'instagram', name: 'Instagram' },
            { value: 'meta', name: 'Meta' }
          ]}
        />
      </div>
    </div>
  </Card>

  <!-- Campaigns Grid -->
  {#if filteredCampaigns().length === 0}
    <Card class="p-8 text-center">
      <RocketOutline class="mx-auto h-12 w-12 text-gray-400" />
      <h3 class="mt-4 text-lg font-medium text-gray-900 dark:text-white">No campaigns found</h3>
      <p class="mt-2 text-sm text-gray-500 dark:text-gray-400">
        {#if data.campaigns.length === 0}
          Get started by requesting your first campaign.
        {:else}
          Try adjusting your filters to see more campaigns.
        {/if}
      </p>
      {#if data.campaigns.length === 0}
        <Button class="mt-4" onclick={() => (showRequestModal = true)}>
          <PlusOutline class="mr-2 h-4 w-4" />
          Request Campaign
        </Button>
      {/if}
    </Card>
  {:else}
    <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {#each filteredCampaigns() as campaign}
        {@const platform = platformConfig[campaign.platform] || platformConfig.google}
        {@const status = statusConfig[campaign.status] || statusConfig.draft}
        {@const trend = getTrendDisplay(campaign.trend)}

        <Card class="group relative overflow-hidden p-0 transition-shadow hover:shadow-lg">
          <a href="/campaigns/{campaign.id}" class="block p-5">
            <!-- Header -->
            <div class="mb-4 flex items-start justify-between">
              <div class="flex items-center gap-3">
                <div class={`flex h-10 w-10 items-center justify-center rounded-lg ${platform.bgColor}`}>
                  <span class={`text-sm font-bold ${platform.color}`}>
                    {campaign.platform.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div>
                  <h3 class="font-semibold text-gray-900 dark:text-white">{campaign.name}</h3>
                  <p class="text-sm text-gray-500 dark:text-gray-400">{platform.label}</p>
                </div>
              </div>
              <Badge color={status.color}>{status.label}</Badge>
            </div>

            <!-- Metrics -->
            <div class="mb-4 grid grid-cols-2 gap-3">
              <div class="rounded-lg bg-gray-50 p-3 dark:bg-gray-700/50">
                <p class="text-xs font-medium text-gray-500 dark:text-gray-400">Impressions</p>
                <p class="text-lg font-semibold text-gray-900 dark:text-white">
                  {formatCompactNumber(campaign.metrics.impressions)}
                </p>
              </div>
              <div class="rounded-lg bg-gray-50 p-3 dark:bg-gray-700/50">
                <p class="text-xs font-medium text-gray-500 dark:text-gray-400">Clicks</p>
                <p class="text-lg font-semibold text-gray-900 dark:text-white">
                  {formatCompactNumber(campaign.metrics.clicks)}
                </p>
              </div>
              <div class="rounded-lg bg-gray-50 p-3 dark:bg-gray-700/50">
                <p class="text-xs font-medium text-gray-500 dark:text-gray-400">CTR</p>
                <p class="text-lg font-semibold text-gray-900 dark:text-white">
                  {formatPercent(campaign.metrics.ctr)}
                </p>
              </div>
              <div class="rounded-lg bg-gray-50 p-3 dark:bg-gray-700/50">
                <p class="text-xs font-medium text-gray-500 dark:text-gray-400">Leads</p>
                <p class="text-lg font-semibold text-gray-900 dark:text-white">
                  {campaign.metrics.leads}
                </p>
              </div>
            </div>

            <!-- CPL and Trend -->
            <div class="flex items-center justify-between border-t border-gray-100 pt-4 dark:border-gray-700">
              <div>
                <p class="text-xs font-medium text-gray-500 dark:text-gray-400">Cost Per Lead</p>
                <p class="text-lg font-bold text-gray-900 dark:text-white">
                  {formatCurrency(campaign.metrics.cpl)}
                </p>
              </div>

              {#if campaign.trend.direction !== 'neutral' && trend.icon}
                {@const TrendIcon = trend.icon}
                <div class={`flex items-center gap-1 rounded-full px-2 py-1 ${trend.bgColor}`}>
                  <TrendIcon class={`h-4 w-4 ${trend.color}`} />
                  <span class={`text-sm font-medium ${trend.color}`}>
                    {Math.abs(campaign.trend.leads)}%
                  </span>
                </div>
              {/if}
            </div>

            <!-- View details indicator -->
            <div class="absolute right-4 top-1/2 -translate-y-1/2 opacity-0 transition-opacity group-hover:opacity-100">
              <ChevronRightOutline class="h-5 w-5 text-gray-400" />
            </div>
          </a>
        </Card>
      {/each}
    </div>
  {/if}
</div>

<!-- Request Campaign Modal -->
<Modal title="Request New Campaign" bind:open={showRequestModal} size="md" outsideclose>
  <form
    method="POST"
    action="?/requestCampaign"
    use:enhance={() => {
      isSubmitting = true;
      return async ({ update }) => {
        await update();
        isSubmitting = false;
      };
    }}
  >
    {#if form?.message && !form?.success}
      <div class="mb-4 rounded-lg bg-red-50 p-4 text-sm text-red-800 dark:bg-red-900/30 dark:text-red-400">
        {form.message}
      </div>
    {/if}

    <div class="space-y-4">
      <div>
        <Label for="platform" class="mb-2">Advertising Platform *</Label>
        <Select
          id="platform"
          name="platform"
          required
          items={[
            { value: '', name: 'Select a platform' },
            { value: 'google', name: 'Google Ads' },
            { value: 'facebook', name: 'Facebook Ads' },
            { value: 'instagram', name: 'Instagram Ads' },
            { value: 'meta', name: 'Meta (Facebook + Instagram)' }
          ]}
        />
      </div>

      <div>
        <Label for="campaignType" class="mb-2">Campaign Type *</Label>
        <Select
          id="campaignType"
          name="campaignType"
          required
          items={[
            { value: '', name: 'Select campaign type' },
            { value: 'lead_gen', name: 'Lead Generation' },
            { value: 'awareness', name: 'Brand Awareness' },
            { value: 'retargeting', name: 'Retargeting' }
          ]}
        />
      </div>

      <div>
        <Label for="objective" class="mb-2">Campaign Objective *</Label>
        <Textarea
          id="objective"
          name="objective"
          rows={3}
          required
          placeholder="Describe what you want to achieve with this campaign..."
        />
      </div>

      <div>
        <Label for="monthlyBudget" class="mb-2">Suggested Monthly Budget</Label>
        <Input
          id="monthlyBudget"
          name="monthlyBudget"
          type="text"
          placeholder="e.g., $2,000"
        />
        <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
          Our team will discuss budget options with you
        </p>
      </div>

      <div>
        <Label for="notes" class="mb-2">Additional Notes</Label>
        <Textarea
          id="notes"
          name="notes"
          rows={3}
          placeholder="Any specific requirements or preferences..."
        />
      </div>
    </div>

    <div class="mt-6 flex justify-end gap-3">
      <Button color="light" onclick={() => (showRequestModal = false)}>Cancel</Button>
      <Button type="submit" disabled={isSubmitting}>
        {#if isSubmitting}
          <Spinner size="4" class="mr-2" />
          Submitting...
        {:else}
          Submit Request
        {/if}
      </Button>
    </div>
  </form>
</Modal>

<!-- Success Toast -->
{#if form?.success}
  <div class="fixed bottom-4 right-4 z-50 rounded-lg bg-green-50 p-4 shadow-lg dark:bg-green-900/50">
    <p class="text-sm font-medium text-green-800 dark:text-green-200">{form.message}</p>
  </div>
{/if}

<!-- AI Generate Campaign Modal -->
<Modal title="AI Campaign Generator" bind:open={showAIGenerateModal} size="xl" outsideclose>
  {#if !generatedBlueprint}
    <div class="space-y-4">
      <Alert color="purple" class="mb-4">
        <SparklesOutline slot="icon" class="h-5 w-5" />
        <span class="font-medium">AI-Powered Campaign Creation</span>
        <p class="mt-1 text-sm">
          Our AI will generate a complete campaign blueprint including ad copy, targeting suggestions, and landing page content tailored to your brand voice.
        </p>
      </Alert>

      <div class="grid gap-4 sm:grid-cols-2">
        <div>
          <Label for="ai-platform" class="mb-2">Platform *</Label>
          <Select
            id="ai-platform"
            bind:value={aiPlatform}
            items={[
              { value: 'facebook', name: 'Facebook Ads' },
              { value: 'google', name: 'Google Ads' },
              { value: 'instagram', name: 'Instagram Ads' },
              { value: 'meta', name: 'Meta (Facebook + Instagram)' }
            ]}
          />
        </div>

        <div>
          <Label for="ai-type" class="mb-2">Campaign Type *</Label>
          <Select
            id="ai-type"
            bind:value={aiCampaignType}
            items={[
              { value: 'lead_gen', name: 'Lead Generation' },
              { value: 'awareness', name: 'Brand Awareness' },
              { value: 'retargeting', name: 'Retargeting' }
            ]}
          />
        </div>
      </div>

      <div>
        <Label for="ai-budget" class="mb-2">Monthly Budget ($)</Label>
        <Input
          id="ai-budget"
          type="number"
          bind:value={aiMonthlyBudget}
          min={100}
          step={100}
        />
        <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
          Minimum $100. AI will optimize campaign structure for your budget.
        </p>
      </div>

      {#if generationError}
        <Alert color="red">
          <ExclamationTriangleOutline slot="icon" class="h-5 w-5" />
          {generationError}
        </Alert>
      {/if}
    </div>

    <div class="mt-6 flex justify-end gap-3">
      <Button color="light" onclick={() => (showAIGenerateModal = false)}>Cancel</Button>
      <Button color="purple" onclick={generateAICampaign} disabled={isGenerating}>
        {#if isGenerating}
          <Spinner size="4" class="mr-2" />
          Generating...
        {:else}
          <SparklesOutline class="mr-2 h-4 w-4" />
          Generate Campaign
        {/if}
      </Button>
    </div>
  {:else}
    <!-- Generated Blueprint View -->
    <div class="space-y-4">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div class={`flex h-12 w-12 items-center justify-center rounded-lg ${getHealthScoreBg(generatedBlueprint.readinessScore)}`}>
            <span class={`text-lg font-bold ${getHealthScoreColor(generatedBlueprint.readinessScore)}`}>
              {generatedBlueprint.readinessScore}
            </span>
          </div>
          <div>
            <h3 class="font-semibold text-gray-900 dark:text-white">Campaign Blueprint Ready</h3>
            <p class="text-sm text-gray-500 dark:text-gray-400">
              Readiness Score: {generatedBlueprint.readinessScore}/100
            </p>
          </div>
        </div>
        <Button size="sm" color="light" onclick={() => (generatedBlueprint = null)}>
          <ArrowPathOutline class="mr-2 h-4 w-4" />
          Regenerate
        </Button>
      </div>

      {#if generatedBlueprint.blockers?.length > 0}
        <Alert color="red">
          <ExclamationTriangleOutline slot="icon" class="h-5 w-5" />
          <span class="font-medium">Blockers</span>
          <ul class="mt-1 list-disc pl-4 text-sm">
            {#each generatedBlueprint.blockers as blocker}
              <li>{blocker}</li>
            {/each}
          </ul>
        </Alert>
      {/if}

      {#if generatedBlueprint.warnings?.length > 0}
        <Alert color="yellow">
          <ExclamationTriangleOutline slot="icon" class="h-5 w-5" />
          <span class="font-medium">Warnings</span>
          <ul class="mt-1 list-disc pl-4 text-sm">
            {#each generatedBlueprint.warnings as warning}
              <li>{warning}</li>
            {/each}
          </ul>
        </Alert>
      {/if}

      <!-- Campaign Overview -->
      <div class="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
        <h4 class="mb-3 font-medium text-gray-900 dark:text-white">Campaign Overview</h4>
        <div class="grid gap-2 text-sm sm:grid-cols-2">
          <div>
            <span class="text-gray-500 dark:text-gray-400">Name:</span>
            <span class="ml-2 font-medium text-gray-900 dark:text-white">
              {generatedBlueprint.blueprint.campaign.name}
            </span>
          </div>
          <div>
            <span class="text-gray-500 dark:text-gray-400">Daily Budget:</span>
            <span class="ml-2 font-medium text-gray-900 dark:text-white">
              {formatCurrency(generatedBlueprint.blueprint.campaign.dailyBudget)}
            </span>
          </div>
          <div>
            <span class="text-gray-500 dark:text-gray-400">Ad Sets:</span>
            <span class="ml-2 font-medium text-gray-900 dark:text-white">
              {generatedBlueprint.blueprint.adSets.length}
            </span>
          </div>
          <div>
            <span class="text-gray-500 dark:text-gray-400">Ad Variants:</span>
            <span class="ml-2 font-medium text-gray-900 dark:text-white">
              {generatedBlueprint.blueprint.ads.length}
            </span>
          </div>
        </div>
      </div>

      <!-- Estimated Performance -->
      <div class="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
        <h4 class="mb-3 font-medium text-gray-900 dark:text-white">Estimated Performance</h4>
        <div class="grid gap-4 sm:grid-cols-3">
          <div class="text-center">
            <p class="text-2xl font-bold text-gray-900 dark:text-white">
              {generatedBlueprint.estimatedPerformance.projectedLeads}
            </p>
            <p class="text-sm text-gray-500 dark:text-gray-400">Leads/Month</p>
          </div>
          <div class="text-center">
            <p class="text-2xl font-bold text-gray-900 dark:text-white">
              {formatCurrency(generatedBlueprint.estimatedPerformance.projectedCpl)}
            </p>
            <p class="text-sm text-gray-500 dark:text-gray-400">Est. CPL</p>
          </div>
          <div class="text-center">
            <p class="text-2xl font-bold text-gray-900 dark:text-white">
              {generatedBlueprint.estimatedPerformance.projectedRoas?.toFixed(1) || 'N/A'}x
            </p>
            <p class="text-sm text-gray-500 dark:text-gray-400">Est. ROAS</p>
          </div>
        </div>
      </div>

      <!-- Generated Ads Preview -->
      <div class="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
        <h4 class="mb-3 font-medium text-gray-900 dark:text-white">Ad Copy Variants</h4>
        <div class="space-y-3 max-h-60 overflow-y-auto">
          {#each generatedBlueprint.blueprint.ads.slice(0, 3) as ad, i}
            <div class="rounded-lg bg-gray-50 p-3 dark:bg-gray-700/50">
              <div class="mb-2 flex items-center justify-between">
                <Badge color="purple">Variant {i + 1}</Badge>
                <span class="text-xs text-gray-500 dark:text-gray-400">
                  Score: {Math.round(ad.predictedScore)}%
                </span>
              </div>
              {#if 'primaryText' in ad.content}
                <p class="text-sm font-medium text-gray-900 dark:text-white">
                  {ad.content.headline}
                </p>
                <p class="mt-1 text-sm text-gray-600 dark:text-gray-400">
                  {ad.content.primaryText.slice(0, 100)}...
                </p>
              {:else if 'headlines' in ad.content}
                <p class="text-sm font-medium text-gray-900 dark:text-white">
                  {ad.content.headlines[0]}
                </p>
                <p class="mt-1 text-sm text-gray-600 dark:text-gray-400">
                  {ad.content.descriptions[0]}
                </p>
              {/if}
            </div>
          {/each}
        </div>
      </div>

      <!-- Launch Checklist -->
      <div class="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
        <h4 class="mb-3 flex items-center gap-2 font-medium text-gray-900 dark:text-white">
          <ClipboardDocumentListOutline class="h-5 w-5" />
          Launch Checklist
        </h4>
        <div class="space-y-2 max-h-40 overflow-y-auto">
          {#each generatedBlueprint.blueprint.launchChecklist.slice(0, 8) as item}
            <label class="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              <input type="checkbox" class="rounded border-gray-300 text-primary-600 focus:ring-primary-500" />
              {item}
            </label>
          {/each}
        </div>
      </div>
    </div>

    <div class="mt-6 flex justify-end gap-3">
      <Button color="light" onclick={() => (showAIGenerateModal = false)}>Close</Button>
      <Button color="green" disabled={generatedBlueprint.blockers?.length > 0}>
        <CheckCircleOutline class="mr-2 h-4 w-4" />
        Submit for Review
      </Button>
    </div>
  {/if}
</Modal>

<!-- A/B Variant Viewer Modal -->
<Modal title="A/B Test Variant Generator" bind:open={showVariantViewer} size="lg" outsideclose>
  <div class="space-y-4">
    <Alert color="blue" class="mb-4">
      <BeakerOutline slot="icon" class="h-5 w-5" />
      <span class="font-medium">Generate Test Variants</span>
      <p class="mt-1 text-sm">
        Enter your existing content and we'll generate optimized variants for A/B testing with predicted performance scores.
      </p>
    </Alert>

    <div>
      <Label for="variant-type" class="mb-2">Content Type</Label>
      <Select
        id="variant-type"
        bind:value={variantType}
        items={[
          { value: 'headline', name: 'Headline' },
          { value: 'cta', name: 'Call to Action' },
          { value: 'body', name: 'Body Copy' },
          { value: 'description', name: 'Description' }
        ]}
      />
    </div>

    <div>
      <Label for="original-content" class="mb-2">Original Content</Label>
      <Textarea
        id="original-content"
        bind:value={variantContent}
        rows={3}
        placeholder="Enter your current headline, CTA, or copy that you want to test..."
      />
    </div>

    <Button color="blue" onclick={generateVariants} disabled={isGeneratingVariants || !variantContent.trim()}>
      {#if isGeneratingVariants}
        <Spinner size="4" class="mr-2" />
        Generating Variants...
      {:else}
        <BeakerOutline class="mr-2 h-4 w-4" />
        Generate Variants
      {/if}
    </Button>

    {#if generatedVariants.length > 0}
      <div class="mt-4 border-t border-gray-200 pt-4 dark:border-gray-700">
        <h4 class="mb-3 font-medium text-gray-900 dark:text-white">Generated Variants</h4>
        <div class="space-y-3">
          {#each generatedVariants as variant, i}
            <div class="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
              <div class="mb-2 flex items-start justify-between">
                <div class="flex items-center gap-2">
                  {#if i === 0}
                    <Badge color="gray">Control</Badge>
                  {:else}
                    <Badge color="blue">Variant {i}</Badge>
                  {/if}
                  {#if variant.predictedLiftPercent > 0}
                    <Badge color="green">+{variant.predictedLiftPercent}% lift</Badge>
                  {/if}
                </div>
                <span class="text-xs text-gray-500 dark:text-gray-400">
                  {Math.round(variant.confidence * 100)}% confidence
                </span>
              </div>

              <p class="mb-2 text-gray-900 dark:text-white">{variant.content}</p>

              <p class="text-sm text-gray-500 dark:text-gray-400">
                <span class="font-medium">Hypothesis:</span> {variant.hypothesis}
              </p>

              {#if variant.tags?.length > 0}
                <div class="mt-2 flex flex-wrap gap-1">
                  {#each variant.tags.slice(0, 4) as tag}
                    <Badge color="dark" class="text-xs">{tag}</Badge>
                  {/each}
                </div>
              {/if}
            </div>
          {/each}
        </div>

        <div class="mt-4 rounded-lg bg-blue-50 p-3 dark:bg-blue-900/20">
          <p class="text-sm text-blue-800 dark:text-blue-200">
            <span class="font-medium">Recommended Sample Size:</span>
            Test each variant with at least 1,000 impressions for statistically significant results.
          </p>
        </div>
      </div>
    {/if}
  </div>

  <div class="mt-6 flex justify-end">
    <Button color="light" onclick={() => (showVariantViewer = false)}>Close</Button>
  </div>
</Modal>
