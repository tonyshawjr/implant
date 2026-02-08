<script lang="ts">
  import { enhance } from '$app/forms';
  import { goto } from '$app/navigation';
  import {
    Card,
    Badge,
    Button,
    Modal,
    Select,
    Textarea,
    Label,
    Tabs,
    TabItem,
    Spinner,
    Progressbar,
    Timeline,
    TimelineItem,
    Alert,
    Input
  } from 'flowbite-svelte';
  import {
    MicrophoneOutline,
    RocketOutline,
    DocumentTextOutline,
    ExclamationCircleOutline,
    CheckCircleOutline,
    CloseCircleOutline,
    PlayOutline,
    EyeOutline,
    ClockOutline,
    ChartPieOutline,
    CogOutline,
    ArrowPathOutline,
    LightbulbOutline,
    ChartBarOutline,
    BoltOutline,
    AdjustmentsHorizontalOutline,
    SparklesOutline,
    BeakerOutline,
    PhotoOutline
  } from 'flowbite-svelte-icons';
  import type { PageData, ActionData } from './$types';
  import { formatCurrency, formatCompactNumber, formatDate, formatPercent } from '$lib/utils';

  let { data, form }: { data: PageData; form: ActionData } = $props();

  // State
  let isSubmitting = $state(false);
  let showRejectModal = $state(false);
  let showResolveModal = $state(false);
  let showAIGeneratorModal = $state(false);
  let showBulkGeneratorModal = $state(false);
  let rejectTargetId = $state<string | null>(null);
  let rejectTargetType = $state<'voice' | 'campaign' | 'creative'>('voice');
  let resolveAnomalyId = $state<string | null>(null);
  let rejectReason = $state('');
  let resolveNotes = $state('');

  // AI Generation State
  let isGeneratingBulk = $state(false);
  let bulkGenerationType = $state<'ads' | 'landing' | 'variants'>('ads');
  let selectedOrganization = $state<string>('');
  let bulkGenerationResults = $state<any>(null);

  // Bulk AI Generation
  async function runBulkGeneration() {
    if (!selectedOrganization) return;

    isGeneratingBulk = true;
    bulkGenerationResults = null;

    try {
      let endpoint = '';
      switch (bulkGenerationType) {
        case 'ads':
          endpoint = '/api/ai/generate-ads';
          break;
        case 'landing':
          endpoint = '/api/ai/generate-landing';
          break;
        case 'variants':
          endpoint = '/api/ai/generate-variants';
          break;
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationId: selectedOrganization,
          platform: 'facebook',
          variantCount: 5
        })
      });

      const result = await response.json();
      bulkGenerationResults = result;
    } catch (err) {
      console.error('Bulk generation error:', err);
    } finally {
      isGeneratingBulk = false;
    }
  }

  // Tab navigation
  function handleTabChange(tab: string) {
    const url = new URL(window.location.href);
    url.searchParams.set('tab', tab);
    goto(url.toString(), { replaceState: true });
  }

  // Client filter
  function handleClientFilter(event: Event) {
    const select = event.target as HTMLSelectElement;
    const url = new URL(window.location.href);
    if (select.value) {
      url.searchParams.set('client', select.value);
    } else {
      url.searchParams.delete('client');
    }
    goto(url.toString(), { replaceState: true });
  }

  // Status badge configs
  const voiceStatusConfig: Record<string, { label: string; color: 'yellow' | 'blue' | 'purple' | 'green' | 'red' }> = {
    pending: { label: 'Pending', color: 'yellow' },
    analyzing: { label: 'Analyzing', color: 'blue' },
    in_review: { label: 'In Review', color: 'purple' },
    approved: { label: 'Approved', color: 'green' },
    rejected: { label: 'Rejected', color: 'red' }
  };

  const campaignStatusConfig: Record<string, { label: string; color: 'gray' | 'blue' | 'green' }> = {
    draft: { label: 'Draft', color: 'gray' },
    pending_review: { label: 'Pending Review', color: 'blue' },
    active: { label: 'Active', color: 'green' }
  };

  const severityConfig: Record<string, { label: string; color: 'blue' | 'yellow' | 'red' }> = {
    info: { label: 'Info', color: 'blue' },
    warning: { label: 'Warning', color: 'yellow' },
    critical: { label: 'Critical', color: 'red' }
  };

  const optimizationTypeLabels: Record<string, string> = {
    bid_adjustment: 'Bid Adjustment',
    audience_change: 'Audience Change',
    budget_change: 'Budget Change',
    creative_swap: 'Creative Swap',
    pause_ad: 'Pause Ad',
    scale_ad: 'Scale Ad'
  };

  const impactConfig: Record<string, { color: string; bgColor: string }> = {
    positive: { color: 'text-green-600 dark:text-green-400', bgColor: 'bg-green-100 dark:bg-green-900/30' },
    neutral: { color: 'text-gray-600 dark:text-gray-400', bgColor: 'bg-gray-100 dark:bg-gray-700' },
    negative: { color: 'text-red-600 dark:text-red-400', bgColor: 'bg-red-100 dark:bg-red-900/30' }
  };

  // Platform labels
  const platformLabels: Record<string, string> = {
    google: 'Google Ads',
    facebook: 'Facebook',
    instagram: 'Instagram',
    meta: 'Meta'
  };

  // Open reject modal
  function openRejectModal(id: string, type: 'voice' | 'campaign' | 'creative') {
    rejectTargetId = id;
    rejectTargetType = type;
    rejectReason = '';
    showRejectModal = true;
  }

  // Open resolve modal
  function openResolveModal(id: string) {
    resolveAnomalyId = id;
    resolveNotes = '';
    showResolveModal = true;
  }
</script>

<div class="space-y-6">
  <!-- Page Header -->
  <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
    <div>
      <h1 class="text-2xl font-bold text-gray-900 dark:text-white">AI Operations Center</h1>
      <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
        Manage AI-powered workflows: voice profiles, campaigns, content, and performance monitoring
      </p>
    </div>
    <div class="flex gap-2">
      <Button size="sm" color="purple" onclick={() => (showBulkGeneratorModal = true)}>
        <SparklesOutline class="mr-2 h-4 w-4" />
        Bulk AI Generator
      </Button>
    </div>
  </div>

  <!-- Stats Overview -->
  <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
    <Card class="p-4">
      <div class="flex items-center justify-between">
        <div>
          <p class="text-sm font-medium text-gray-500 dark:text-gray-400">Voice Queue</p>
          <p class="mt-1 text-2xl font-bold text-gray-900 dark:text-white">
            {data.stats.pendingVoiceProfiles + data.stats.analyzingVoiceProfiles + data.stats.inReviewVoiceProfiles}
          </p>
        </div>
        <div class="flex h-12 w-12 items-center justify-center rounded-lg bg-purple-100 dark:bg-purple-900/30">
          <MicrophoneOutline class="h-6 w-6 text-purple-600 dark:text-purple-400" />
        </div>
      </div>
      <p class="mt-2 text-sm text-gray-500 dark:text-gray-400">
        {data.stats.pendingVoiceProfiles} pending, {data.stats.inReviewVoiceProfiles} in review
      </p>
    </Card>

    <Card class="p-4">
      <div class="flex items-center justify-between">
        <div>
          <p class="text-sm font-medium text-gray-500 dark:text-gray-400">Campaign Queue</p>
          <p class="mt-1 text-2xl font-bold text-gray-900 dark:text-white">
            {data.stats.draftCampaigns + data.stats.pendingReviewCampaigns}
          </p>
        </div>
        <div class="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30">
          <RocketOutline class="h-6 w-6 text-blue-600 dark:text-blue-400" />
        </div>
      </div>
      <p class="mt-2 text-sm text-gray-500 dark:text-gray-400">
        {data.stats.pendingReviewCampaigns} pending review
      </p>
    </Card>

    <Card class="p-4">
      <div class="flex items-center justify-between">
        <div>
          <p class="text-sm font-medium text-gray-500 dark:text-gray-400">Content Review</p>
          <p class="mt-1 text-2xl font-bold text-gray-900 dark:text-white">{data.stats.pendingCreatives}</p>
        </div>
        <div class="flex h-12 w-12 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900/30">
          <DocumentTextOutline class="h-6 w-6 text-green-600 dark:text-green-400" />
        </div>
      </div>
      <p class="mt-2 text-sm text-gray-500 dark:text-gray-400">Ad copies awaiting QA</p>
    </Card>

    <Card class="p-4">
      <div class="flex items-center justify-between">
        <div>
          <p class="text-sm font-medium text-gray-500 dark:text-gray-400">Anomalies</p>
          <p class="mt-1 text-2xl font-bold {data.stats.criticalAnomalies > 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-white'}">
            {data.stats.criticalAnomalies + data.stats.warningAnomalies}
          </p>
        </div>
        <div class="flex h-12 w-12 items-center justify-center rounded-lg {data.stats.criticalAnomalies > 0 ? 'bg-red-100 dark:bg-red-900/30' : 'bg-yellow-100 dark:bg-yellow-900/30'}">
          <ExclamationCircleOutline class="h-6 w-6 {data.stats.criticalAnomalies > 0 ? 'text-red-600 dark:text-red-400' : 'text-yellow-600 dark:text-yellow-400'}" />
        </div>
      </div>
      <p class="mt-2 text-sm text-gray-500 dark:text-gray-400">
        {data.stats.criticalAnomalies} critical, {data.stats.warningAnomalies} warning
      </p>
    </Card>
  </div>

  <!-- AI Tools Quick Actions -->
  <Card class="p-4">
    <div class="flex items-center justify-between mb-4">
      <div class="flex items-center gap-2">
        <SparklesOutline class="h-5 w-5 text-purple-500" />
        <h3 class="font-semibold text-gray-900 dark:text-white">AI Campaign Factory Tools</h3>
      </div>
      <Badge color="purple">Phase 8B</Badge>
    </div>
    <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <div class="flex items-center gap-3 rounded-lg border border-gray-200 p-3 dark:border-gray-700">
        <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100 dark:bg-purple-900/30">
          <RocketOutline class="h-5 w-5 text-purple-600 dark:text-purple-400" />
        </div>
        <div>
          <p class="font-medium text-gray-900 dark:text-white">Campaign Factory</p>
          <p class="text-xs text-gray-500 dark:text-gray-400">Full campaign blueprints</p>
        </div>
      </div>

      <div class="flex items-center gap-3 rounded-lg border border-gray-200 p-3 dark:border-gray-700">
        <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30">
          <DocumentTextOutline class="h-5 w-5 text-blue-600 dark:text-blue-400" />
        </div>
        <div>
          <p class="font-medium text-gray-900 dark:text-white">Ad Copy Generator</p>
          <p class="text-xs text-gray-500 dark:text-gray-400">Platform-specific ads</p>
        </div>
      </div>

      <div class="flex items-center gap-3 rounded-lg border border-gray-200 p-3 dark:border-gray-700">
        <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900/30">
          <BeakerOutline class="h-5 w-5 text-green-600 dark:text-green-400" />
        </div>
        <div>
          <p class="font-medium text-gray-900 dark:text-white">A/B Variant Generator</p>
          <p class="text-xs text-gray-500 dark:text-gray-400">Test variations</p>
        </div>
      </div>

      <div class="flex items-center gap-3 rounded-lg border border-gray-200 p-3 dark:border-gray-700">
        <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-yellow-100 dark:bg-yellow-900/30">
          <LightbulbOutline class="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
        </div>
        <div>
          <p class="font-medium text-gray-900 dark:text-white">Performance Optimizer</p>
          <p class="text-xs text-gray-500 dark:text-gray-400">AI recommendations</p>
        </div>
      </div>
    </div>

    <!-- Platform Metrics -->
    <div class="mt-4 grid gap-4 border-t border-gray-200 pt-4 dark:border-gray-700 sm:grid-cols-3">
      <div class="text-center">
        <p class="text-2xl font-bold text-gray-900 dark:text-white">
          {formatCompactNumber(data.performanceMetrics.totalImpressions)}
        </p>
        <p class="text-sm text-gray-500 dark:text-gray-400">Total Impressions (30d)</p>
      </div>
      <div class="text-center">
        <p class="text-2xl font-bold text-gray-900 dark:text-white">
          {data.performanceMetrics.totalLeads}
        </p>
        <p class="text-sm text-gray-500 dark:text-gray-400">Total Leads (30d)</p>
      </div>
      <div class="text-center">
        <p class="text-2xl font-bold text-gray-900 dark:text-white">
          {formatCurrency(data.performanceMetrics.avgCpl)}
        </p>
        <p class="text-sm text-gray-500 dark:text-gray-400">Platform Avg CPL</p>
      </div>
    </div>
  </Card>

  <!-- Tabbed Interface -->
  <Card class="p-0">
    <Tabs style="underline" class="p-4 pb-0">
      <TabItem open={data.activeTab === 'voice-queue'} on:click={() => handleTabChange('voice-queue')}>
        {#snippet title()}
          <div class="flex items-center gap-2">
            <MicrophoneOutline class="h-4 w-4" />
            <span>Brand Voice Queue</span>
            {#if data.voiceProfileQueue.length > 0}
              <Badge color="purple" class="ml-1">{data.voiceProfileQueue.length}</Badge>
            {/if}
          </div>
        {/snippet}
      </TabItem>
      <TabItem open={data.activeTab === 'campaign-factory'} on:click={() => handleTabChange('campaign-factory')}>
        {#snippet title()}
          <div class="flex items-center gap-2">
            <RocketOutline class="h-4 w-4" />
            <span>Campaign Factory</span>
            {#if data.campaignQueue.length > 0}
              <Badge color="blue" class="ml-1">{data.campaignQueue.length}</Badge>
            {/if}
          </div>
        {/snippet}
      </TabItem>
      <TabItem open={data.activeTab === 'content-review'} on:click={() => handleTabChange('content-review')}>
        {#snippet title()}
          <div class="flex items-center gap-2">
            <DocumentTextOutline class="h-4 w-4" />
            <span>Content Review</span>
            {#if data.adCopyReviewQueue.length > 0}
              <Badge color="green" class="ml-1">{data.adCopyReviewQueue.length}</Badge>
            {/if}
          </div>
        {/snippet}
      </TabItem>
      <TabItem open={data.activeTab === 'performance'} on:click={() => handleTabChange('performance')}>
        {#snippet title()}
          <div class="flex items-center gap-2">
            <ChartBarOutline class="h-4 w-4" />
            <span>Performance Monitor</span>
            {#if data.anomalyAlerts.length > 0}
              <Badge color={data.stats.criticalAnomalies > 0 ? 'red' : 'yellow'} class="ml-1">
                {data.anomalyAlerts.length}
              </Badge>
            {/if}
          </div>
        {/snippet}
      </TabItem>
    </Tabs>

    <div class="p-4">
      <!-- Tab 1: Brand Voice Queue -->
      {#if data.activeTab === 'voice-queue'}
        <div class="space-y-4">
          {#if data.voiceProfileQueue.length === 0}
            <div class="py-12 text-center">
              <MicrophoneOutline class="mx-auto h-12 w-12 text-gray-400" />
              <h3 class="mt-4 text-lg font-medium text-gray-900 dark:text-white">No voice profiles in queue</h3>
              <p class="mt-2 text-sm text-gray-500 dark:text-gray-400">
                All voice profiles have been processed
              </p>
            </div>
          {:else}
            <div class="grid gap-4 lg:grid-cols-2">
              {#each data.voiceProfileQueue as profile}
                {@const status = voiceStatusConfig[profile.status]}
                <Card class="p-4">
                  <div class="mb-4 flex items-start justify-between">
                    <div class="flex items-center gap-3">
                      <div class="flex h-12 w-12 items-center justify-center rounded-lg bg-primary-100 text-sm font-bold text-primary-600 dark:bg-primary-900/30 dark:text-primary-400">
                        {profile.organization?.name?.slice(0, 2).toUpperCase() || 'NA'}
                      </div>
                      <div>
                        <h3 class="font-semibold text-gray-900 dark:text-white">
                          {profile.organization?.name || 'Unknown Organization'}
                        </h3>
                        <p class="text-sm text-gray-500 dark:text-gray-400">{profile.name}</p>
                      </div>
                    </div>
                    <Badge color={status.color}>{status.label}</Badge>
                  </div>

                  <!-- Sources -->
                  {#if profile.sources.length > 0}
                    <div class="mb-4">
                      <p class="mb-2 text-xs font-medium uppercase text-gray-500 dark:text-gray-400">Sources</p>
                      <div class="flex flex-wrap gap-2">
                        {#each profile.sources as source}
                          <Badge color="dark">
                            {source.sourceType}: {source.fileName || source.sourceUrl?.slice(0, 30) || 'N/A'}
                          </Badge>
                        {/each}
                      </div>
                    </div>
                  {/if}

                  <!-- Voice attributes if available -->
                  {#if profile.tone || profile.formalityLevel}
                    <div class="mb-4 grid grid-cols-2 gap-2 text-sm">
                      {#if profile.tone}
                        <div>
                          <span class="text-gray-500 dark:text-gray-400">Tone:</span>
                          <span class="ml-1 font-medium text-gray-900 dark:text-white">{profile.tone}</span>
                        </div>
                      {/if}
                      {#if profile.formalityLevel}
                        <div>
                          <span class="text-gray-500 dark:text-gray-400">Formality:</span>
                          <span class="ml-1 font-medium capitalize text-gray-900 dark:text-white">{profile.formalityLevel}</span>
                        </div>
                      {/if}
                      {#if profile.qualityScore}
                        <div>
                          <span class="text-gray-500 dark:text-gray-400">Quality:</span>
                          <span class="ml-1 font-medium text-gray-900 dark:text-white">{profile.qualityScore}%</span>
                        </div>
                      {/if}
                    </div>
                  {/if}

                  <!-- Timestamps -->
                  <div class="mb-4 text-xs text-gray-500 dark:text-gray-400">
                    <span>Created: {formatDate(profile.createdAt, 'relative')}</span>
                    {#if profile.analysisStartedAt}
                      <span class="ml-3">Analysis started: {formatDate(profile.analysisStartedAt, 'relative')}</span>
                    {/if}
                  </div>

                  <!-- Action Buttons -->
                  <div class="flex gap-2">
                    {#if profile.status === 'pending'}
                      <form method="POST" action="?/startAnalysis" use:enhance={() => {
                        isSubmitting = true;
                        return async ({ update }) => {
                          await update();
                          isSubmitting = false;
                        };
                      }}>
                        <input type="hidden" name="voiceProfileId" value={profile.id} />
                        <Button type="submit" size="sm" disabled={isSubmitting}>
                          <PlayOutline class="mr-2 h-4 w-4" />
                          Start Analysis
                        </Button>
                      </form>
                    {:else if profile.status === 'analyzing'}
                      <form method="POST" action="?/completeAnalysis" use:enhance={() => {
                        isSubmitting = true;
                        return async ({ update }) => {
                          await update();
                          isSubmitting = false;
                        };
                      }}>
                        <input type="hidden" name="voiceProfileId" value={profile.id} />
                        <Button type="submit" size="sm" color="blue" disabled={isSubmitting}>
                          <CheckCircleOutline class="mr-2 h-4 w-4" />
                          Complete Analysis
                        </Button>
                      </form>
                    {:else if profile.status === 'in_review'}
                      <form method="POST" action="?/approveVoiceProfile" use:enhance={() => {
                        isSubmitting = true;
                        return async ({ update }) => {
                          await update();
                          isSubmitting = false;
                        };
                      }}>
                        <input type="hidden" name="voiceProfileId" value={profile.id} />
                        <Button type="submit" size="sm" color="green" disabled={isSubmitting}>
                          <CheckCircleOutline class="mr-2 h-4 w-4" />
                          Approve
                        </Button>
                      </form>
                      <Button size="sm" color="red" outline onclick={() => openRejectModal(profile.id, 'voice')}>
                        <CloseCircleOutline class="mr-2 h-4 w-4" />
                        Reject
                      </Button>
                    {/if}
                    <Button size="sm" color="light" href="/internal/clients/{profile.organization?.slug}">
                      <EyeOutline class="mr-2 h-4 w-4" />
                      View Client
                    </Button>
                  </div>
                </Card>
              {/each}
            </div>
          {/if}
        </div>
      {/if}

      <!-- Tab 2: Campaign Factory -->
      {#if data.activeTab === 'campaign-factory'}
        <div class="space-y-4">
          {#if data.campaignQueue.length === 0}
            <div class="py-12 text-center">
              <RocketOutline class="mx-auto h-12 w-12 text-gray-400" />
              <h3 class="mt-4 text-lg font-medium text-gray-900 dark:text-white">No campaigns in queue</h3>
              <p class="mt-2 text-sm text-gray-500 dark:text-gray-400">
                All campaigns have been processed
              </p>
            </div>
          {:else}
            <div class="grid gap-4 lg:grid-cols-2">
              {#each data.campaignQueue as campaign}
                {@const status = campaignStatusConfig[campaign.status]}
                <Card class="p-4">
                  <div class="mb-4 flex items-start justify-between">
                    <div>
                      <h3 class="font-semibold text-gray-900 dark:text-white">{campaign.name}</h3>
                      <p class="text-sm text-gray-500 dark:text-gray-400">
                        {campaign.organization?.name || 'Unknown Organization'}
                      </p>
                    </div>
                    <Badge color={status.color}>{status.label}</Badge>
                  </div>

                  <!-- Campaign Details -->
                  <div class="mb-4 grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span class="text-gray-500 dark:text-gray-400">Platform:</span>
                      <span class="ml-1 font-medium text-gray-900 dark:text-white">
                        {platformLabels[campaign.platform] || campaign.platform}
                      </span>
                    </div>
                    <div>
                      <span class="text-gray-500 dark:text-gray-400">Type:</span>
                      <span class="ml-1 font-medium capitalize text-gray-900 dark:text-white">
                        {campaign.campaignType.replace('_', ' ')}
                      </span>
                    </div>
                    {#if campaign.monthlyBudget}
                      <div>
                        <span class="text-gray-500 dark:text-gray-400">Monthly Budget:</span>
                        <span class="ml-1 font-medium text-gray-900 dark:text-white">
                          {formatCurrency(campaign.monthlyBudget)}
                        </span>
                      </div>
                    {/if}
                    {#if campaign.territory}
                      <div>
                        <span class="text-gray-500 dark:text-gray-400">Territory:</span>
                        <span class="ml-1 font-medium text-gray-900 dark:text-white">
                          {campaign.territory.city}, {campaign.territory.state}
                        </span>
                      </div>
                    {/if}
                  </div>

                  <!-- Objective -->
                  {#if campaign.objective}
                    <div class="mb-4">
                      <p class="text-xs font-medium uppercase text-gray-500 dark:text-gray-400">Objective</p>
                      <p class="mt-1 text-sm text-gray-700 dark:text-gray-300">{campaign.objective}</p>
                    </div>
                  {/if}

                  <!-- Creatives Count -->
                  {#if campaign.creatives.length > 0}
                    <div class="mb-4">
                      <Badge color="dark">{campaign.creatives.length} creatives pending</Badge>
                    </div>
                  {/if}

                  <!-- Timestamps -->
                  <div class="mb-4 text-xs text-gray-500 dark:text-gray-400">
                    Created: {formatDate(campaign.createdAt, 'relative')}
                    {#if campaign.createdBy}
                      by {campaign.createdBy.firstName} {campaign.createdBy.lastName}
                    {/if}
                  </div>

                  <!-- Action Buttons -->
                  <div class="flex gap-2">
                    {#if campaign.status === 'pending_review'}
                      <form method="POST" action="?/approveCampaign" use:enhance={() => {
                        isSubmitting = true;
                        return async ({ update }) => {
                          await update();
                          isSubmitting = false;
                        };
                      }}>
                        <input type="hidden" name="campaignId" value={campaign.id} />
                        <Button type="submit" size="sm" color="green" disabled={isSubmitting}>
                          <CheckCircleOutline class="mr-2 h-4 w-4" />
                          Approve & Activate
                        </Button>
                      </form>
                      <form method="POST" action="?/rejectCampaign" use:enhance={() => {
                        isSubmitting = true;
                        return async ({ update }) => {
                          await update();
                          isSubmitting = false;
                        };
                      }}>
                        <input type="hidden" name="campaignId" value={campaign.id} />
                        <Button type="submit" size="sm" color="red" outline disabled={isSubmitting}>
                          <CloseCircleOutline class="mr-2 h-4 w-4" />
                          Send to Draft
                        </Button>
                      </form>
                    {:else}
                      <Button size="sm" color="blue">
                        <CogOutline class="mr-2 h-4 w-4" />
                        Edit Campaign
                      </Button>
                    {/if}
                    <Button size="sm" color="light">
                      <EyeOutline class="mr-2 h-4 w-4" />
                      Preview
                    </Button>
                  </div>
                </Card>
              {/each}
            </div>
          {/if}
        </div>
      {/if}

      <!-- Tab 3: Content Review -->
      {#if data.activeTab === 'content-review'}
        <div class="space-y-4">
          <!-- Client Filter -->
          <div class="flex items-center gap-4">
            <Label class="text-sm font-medium text-gray-700 dark:text-gray-300">Filter by Client:</Label>
            <Select
              class="w-64"
              value={data.clientFilter}
              on:change={handleClientFilter}
            >
              <option value="">All Clients</option>
              {#each data.organizations as org}
                <option value={org.id}>{org.name}</option>
              {/each}
            </Select>
          </div>

          {#if data.adCopyReviewQueue.length === 0}
            <div class="py-12 text-center">
              <DocumentTextOutline class="mx-auto h-12 w-12 text-gray-400" />
              <h3 class="mt-4 text-lg font-medium text-gray-900 dark:text-white">No content pending review</h3>
              <p class="mt-2 text-sm text-gray-500 dark:text-gray-400">
                All ad copy has been reviewed
              </p>
            </div>
          {:else}
            <div class="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
              {#each data.adCopyReviewQueue as creative}
                <Card class="p-4">
                  <div class="mb-4 flex items-start justify-between">
                    <div>
                      <h3 class="font-semibold text-gray-900 dark:text-white">
                        {creative.campaign.organization?.name || 'Unknown'}
                      </h3>
                      <p class="text-sm text-gray-500 dark:text-gray-400">
                        {creative.campaign.name} - {platformLabels[creative.campaign.platform] || creative.campaign.platform}
                      </p>
                    </div>
                    <div class="flex gap-2">
                      {#if creative.aiGenerated}
                        <Badge color="purple">AI Generated</Badge>
                      {/if}
                      <Badge color="dark" class="capitalize">{creative.creativeType}</Badge>
                    </div>
                  </div>

                  <!-- Ad Copy Preview -->
                  <div class="mb-4 rounded-lg bg-gray-50 p-4 dark:bg-gray-700/50">
                    {#if creative.headline}
                      <p class="mb-2 text-lg font-bold text-gray-900 dark:text-white">{creative.headline}</p>
                    {/if}
                    {#if creative.body}
                      <p class="mb-2 text-sm text-gray-700 dark:text-gray-300">{creative.body}</p>
                    {/if}
                    {#if creative.ctaText}
                      <div class="mt-3">
                        <span class="inline-block rounded bg-primary-600 px-4 py-2 text-sm font-medium text-white">
                          {creative.ctaText}
                        </span>
                      </div>
                    {/if}
                  </div>

                  <!-- Voice Profile Info -->
                  {#if creative.voiceProfile}
                    <div class="mb-4 text-xs text-gray-500 dark:text-gray-400">
                      <span>Voice Profile: {creative.voiceProfile.name}</span>
                      {#if creative.voiceProfile.tone}
                        <span class="ml-2">| Tone: {creative.voiceProfile.tone}</span>
                      {/if}
                    </div>
                  {/if}

                  <!-- Action Buttons -->
                  <div class="flex gap-2">
                    <form method="POST" action="?/approveCreative" use:enhance={() => {
                      isSubmitting = true;
                      return async ({ update }) => {
                        await update();
                        isSubmitting = false;
                      };
                    }}>
                      <input type="hidden" name="creativeId" value={creative.id} />
                      <Button type="submit" size="sm" color="green" disabled={isSubmitting}>
                        <CheckCircleOutline class="mr-2 h-4 w-4" />
                        Approve
                      </Button>
                    </form>
                    <form method="POST" action="?/rejectCreative" use:enhance={() => {
                      isSubmitting = true;
                      return async ({ update }) => {
                        await update();
                        isSubmitting = false;
                      };
                    }}>
                      <input type="hidden" name="creativeId" value={creative.id} />
                      <Button type="submit" size="sm" color="red" outline disabled={isSubmitting}>
                        <CloseCircleOutline class="mr-2 h-4 w-4" />
                        Reject
                      </Button>
                    </form>
                  </div>
                </Card>
              {/each}
            </div>
          {/if}
        </div>
      {/if}

      <!-- Tab 4: Performance Monitor -->
      {#if data.activeTab === 'performance'}
        <div class="space-y-6">
          <!-- Performance Metrics Summary -->
          <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div class="rounded-lg bg-gray-50 p-4 dark:bg-gray-700/50">
              <p class="text-sm font-medium text-gray-500 dark:text-gray-400">Total Impressions (30d)</p>
              <p class="mt-1 text-2xl font-bold text-gray-900 dark:text-white">
                {formatCompactNumber(data.performanceMetrics.totalImpressions)}
              </p>
            </div>
            <div class="rounded-lg bg-gray-50 p-4 dark:bg-gray-700/50">
              <p class="text-sm font-medium text-gray-500 dark:text-gray-400">Total Leads (30d)</p>
              <p class="mt-1 text-2xl font-bold text-gray-900 dark:text-white">
                {formatCompactNumber(data.performanceMetrics.totalLeads)}
              </p>
            </div>
            <div class="rounded-lg bg-gray-50 p-4 dark:bg-gray-700/50">
              <p class="text-sm font-medium text-gray-500 dark:text-gray-400">Total Spend (30d)</p>
              <p class="mt-1 text-2xl font-bold text-gray-900 dark:text-white">
                {formatCurrency(data.performanceMetrics.totalSpend, { compact: true })}
              </p>
            </div>
            <div class="rounded-lg bg-gray-50 p-4 dark:bg-gray-700/50">
              <p class="text-sm font-medium text-gray-500 dark:text-gray-400">Avg CPL (30d)</p>
              <p class="mt-1 text-2xl font-bold text-gray-900 dark:text-white">
                {formatCurrency(data.performanceMetrics.avgCpl)}
              </p>
            </div>
          </div>

          <div class="grid gap-6 lg:grid-cols-2">
            <!-- Anomaly Alerts -->
            <div>
              <h3 class="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-white">
                <ExclamationCircleOutline class="h-5 w-5 text-yellow-500" />
                Anomaly Alerts
              </h3>

              {#if data.anomalyAlerts.length === 0}
                <Card class="p-6 text-center">
                  <CheckCircleOutline class="mx-auto h-8 w-8 text-green-500" />
                  <p class="mt-2 text-sm text-gray-500 dark:text-gray-400">No active anomalies detected</p>
                </Card>
              {:else}
                <div class="space-y-3">
                  {#each data.anomalyAlerts.slice(0, 10) as anomaly}
                    {@const severity = severityConfig[anomaly.severity]}
                    <Card class="p-4">
                      <div class="mb-2 flex items-start justify-between">
                        <div class="flex items-center gap-2">
                          <Badge color={severity.color}>{severity.label}</Badge>
                          <span class="text-xs text-gray-500 dark:text-gray-400">
                            {formatDate(anomaly.detectedAt, 'relative')}
                          </span>
                        </div>
                        {#if anomaly.acknowledgedAt}
                          <Badge color="dark">Acknowledged</Badge>
                        {/if}
                      </div>

                      <h4 class="font-medium text-gray-900 dark:text-white">{anomaly.title}</h4>
                      <p class="mt-1 text-sm text-gray-600 dark:text-gray-400">{anomaly.description}</p>

                      {#if anomaly.organization}
                        <p class="mt-2 text-xs text-gray-500 dark:text-gray-400">
                          Client: {anomaly.organization.name}
                        </p>
                      {/if}

                      {#if anomaly.metricName && anomaly.deviationPercentage}
                        <div class="mt-2 rounded bg-gray-100 px-2 py-1 text-xs dark:bg-gray-700">
                          {anomaly.metricName}: {anomaly.deviationPercentage}% deviation
                          {#if anomaly.expectedValue && anomaly.actualValue}
                            (expected {formatCompactNumber(anomaly.expectedValue)}, actual {formatCompactNumber(anomaly.actualValue)})
                          {/if}
                        </div>
                      {/if}

                      <div class="mt-3 flex gap-2">
                        {#if !anomaly.acknowledgedAt}
                          <form method="POST" action="?/acknowledgeAnomaly" use:enhance={() => {
                            isSubmitting = true;
                            return async ({ update }) => {
                              await update();
                              isSubmitting = false;
                            };
                          }}>
                            <input type="hidden" name="anomalyId" value={anomaly.id} />
                            <Button type="submit" size="xs" color="light" disabled={isSubmitting}>
                              Acknowledge
                            </Button>
                          </form>
                        {/if}
                        <Button size="xs" color="green" onclick={() => openResolveModal(anomaly.id)}>
                          Resolve
                        </Button>
                      </div>
                    </Card>
                  {/each}
                </div>
              {/if}
            </div>

            <!-- Recent Optimizations -->
            <div>
              <h3 class="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-white">
                <BoltOutline class="h-5 w-5 text-blue-500" />
                Recent Optimizations
              </h3>

              {#if data.recentOptimizations.length === 0}
                <Card class="p-6 text-center">
                  <AdjustmentsHorizontalOutline class="mx-auto h-8 w-8 text-gray-400" />
                  <p class="mt-2 text-sm text-gray-500 dark:text-gray-400">No recent optimizations</p>
                </Card>
              {:else}
                <div class="space-y-3">
                  {#each data.recentOptimizations.slice(0, 10) as opt}
                    {@const impact = impactConfig[opt.impact || 'neutral']}
                    <Card class="p-4">
                      <div class="mb-2 flex items-start justify-between">
                        <Badge color="blue">{optimizationTypeLabels[opt.optimizationType] || opt.optimizationType}</Badge>
                        <span class="text-xs text-gray-500 dark:text-gray-400">
                          {formatDate(opt.appliedAt, 'relative')}
                        </span>
                      </div>

                      <h4 class="font-medium text-gray-900 dark:text-white">{opt.title}</h4>
                      {#if opt.description}
                        <p class="mt-1 text-sm text-gray-600 dark:text-gray-400">{opt.description}</p>
                      {/if}

                      <p class="mt-2 text-xs text-gray-500 dark:text-gray-400">
                        {opt.campaign.organization?.name} - {opt.campaign.name}
                      </p>

                      {#if opt.impact && opt.impactValue}
                        <div class="mt-2 flex items-center gap-2">
                          <span class={`rounded px-2 py-1 text-xs font-medium ${impact.bgColor} ${impact.color}`}>
                            {opt.impact === 'positive' ? '+' : opt.impact === 'negative' ? '-' : ''}{formatPercent(opt.impactValue)}
                            {#if opt.impactMetric}
                              {opt.impactMetric}
                            {/if}
                          </span>
                          {#if opt.aiConfidence}
                            <span class="text-xs text-gray-500 dark:text-gray-400">
                              AI Confidence: {formatPercent(opt.aiConfidence * 100)}
                            </span>
                          {/if}
                        </div>
                      {/if}
                    </Card>
                  {/each}
                </div>
              {/if}
            </div>
          </div>
        </div>
      {/if}
    </div>
  </Card>
</div>

<!-- Reject Modal -->
<Modal title="Reject with Reason" bind:open={showRejectModal} size="md" outsideclose>
  <form
    method="POST"
    action={rejectTargetType === 'voice' ? '?/rejectVoiceProfile' : '?/rejectCampaign'}
    use:enhance={() => {
      isSubmitting = true;
      return async ({ update }) => {
        await update();
        isSubmitting = false;
        showRejectModal = false;
      };
    }}
  >
    <input type="hidden" name={rejectTargetType === 'voice' ? 'voiceProfileId' : 'campaignId'} value={rejectTargetId} />

    <div class="space-y-4">
      <div>
        <Label for="reason" class="mb-2">Reason for Rejection</Label>
        <Textarea
          id="reason"
          name="reason"
          rows={4}
          bind:value={rejectReason}
          placeholder="Please provide a reason for rejection..."
        />
      </div>
    </div>

    <div class="mt-6 flex justify-end gap-3">
      <Button color="light" onclick={() => (showRejectModal = false)}>Cancel</Button>
      <Button type="submit" color="red" disabled={isSubmitting}>
        {#if isSubmitting}
          <Spinner size="4" class="mr-2" />
        {/if}
        Reject
      </Button>
    </div>
  </form>
</Modal>

<!-- Resolve Anomaly Modal -->
<Modal title="Resolve Anomaly" bind:open={showResolveModal} size="md" outsideclose>
  <form
    method="POST"
    action="?/resolveAnomaly"
    use:enhance={() => {
      isSubmitting = true;
      return async ({ update }) => {
        await update();
        isSubmitting = false;
        showResolveModal = false;
      };
    }}
  >
    <input type="hidden" name="anomalyId" value={resolveAnomalyId} />

    <div class="space-y-4">
      <div>
        <Label for="notes" class="mb-2">Resolution Notes</Label>
        <Textarea
          id="notes"
          name="notes"
          rows={4}
          bind:value={resolveNotes}
          placeholder="Describe how this anomaly was resolved..."
        />
      </div>
    </div>

    <div class="mt-6 flex justify-end gap-3">
      <Button color="light" onclick={() => (showResolveModal = false)}>Cancel</Button>
      <Button type="submit" color="green" disabled={isSubmitting}>
        {#if isSubmitting}
          <Spinner size="4" class="mr-2" />
        {/if}
        Resolve
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

<!-- Bulk AI Generator Modal -->
<Modal title="Bulk AI Generator" bind:open={showBulkGeneratorModal} size="xl">
  <div class="space-y-6">
    <!-- Generation Type Selection -->
    <div>
      <Label class="mb-2">Generation Type</Label>
      <div class="grid grid-cols-3 gap-3">
        <button
          type="button"
          class="flex flex-col items-center rounded-lg border-2 p-4 transition-all {bulkGenerationType === 'ads' ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20' : 'border-gray-200 hover:border-gray-300 dark:border-gray-700'}"
          onclick={() => (bulkGenerationType = 'ads')}
        >
          <DocumentTextOutline class="mb-2 h-8 w-8 text-primary-500" />
          <span class="font-medium">Ad Copy</span>
          <span class="text-xs text-gray-500">Generate ad variations</span>
        </button>
        <button
          type="button"
          class="flex flex-col items-center rounded-lg border-2 p-4 transition-all {bulkGenerationType === 'landing' ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20' : 'border-gray-200 hover:border-gray-300 dark:border-gray-700'}"
          onclick={() => (bulkGenerationType = 'landing')}
        >
          <RocketOutline class="mb-2 h-8 w-8 text-green-500" />
          <span class="font-medium">Landing Pages</span>
          <span class="text-xs text-gray-500">Generate page content</span>
        </button>
        <button
          type="button"
          class="flex flex-col items-center rounded-lg border-2 p-4 transition-all {bulkGenerationType === 'variants' ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20' : 'border-gray-200 hover:border-gray-300 dark:border-gray-700'}"
          onclick={() => (bulkGenerationType = 'variants')}
        >
          <BeakerOutline class="mb-2 h-8 w-8 text-purple-500" />
          <span class="font-medium">A/B Variants</span>
          <span class="text-xs text-gray-500">Test variations</span>
        </button>
      </div>
    </div>

    <!-- Organization Selection -->
    <div>
      <Label for="bulk-org" class="mb-2">Select Organization</Label>
      <Select id="bulk-org" bind:value={selectedOrganization}>
        <option value="">Choose an organization...</option>
        {#each data.organizations || [] as org}
          <option value={org.id}>{org.name}</option>
        {/each}
      </Select>
    </div>

    <!-- Platform Selection (for ads) -->
    {#if bulkGenerationType === 'ads'}
      <div class="grid grid-cols-2 gap-4">
        <div>
          <Label class="mb-2">Platform</Label>
          <Select>
            <option value="facebook">Facebook / Meta</option>
            <option value="google">Google Ads</option>
            <option value="instagram">Instagram</option>
          </Select>
        </div>
        <div>
          <Label class="mb-2">Variant Count</Label>
          <Select>
            <option value="3">3 variants</option>
            <option value="5" selected>5 variants</option>
            <option value="10">10 variants</option>
          </Select>
        </div>
      </div>
    {/if}

    <!-- Results Display -->
    {#if bulkGenerationResults}
      <div class="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800">
        <div class="mb-3 flex items-center justify-between">
          <h4 class="font-medium text-gray-900 dark:text-white">Generation Results</h4>
          {#if bulkGenerationResults.success}
            <Badge color="green">Success</Badge>
          {:else}
            <Badge color="red">Failed</Badge>
          {/if}
        </div>

        {#if bulkGenerationResults.success}
          <div class="space-y-3">
            {#if bulkGenerationType === 'ads' && bulkGenerationResults.data?.variants}
              {#each bulkGenerationResults.data.variants.slice(0, 3) as variant, i}
                <div class="rounded border border-gray-200 bg-white p-3 dark:border-gray-600 dark:bg-gray-700">
                  <div class="mb-1 flex items-center justify-between">
                    <span class="text-sm font-medium">Variant {i + 1}</span>
                    <Badge color="blue">{Math.round((variant.predictedScore || 0.75) * 100)}% predicted</Badge>
                  </div>
                  <p class="text-sm text-gray-600 dark:text-gray-300">{variant.content?.headline || variant.headline || 'Generated headline'}</p>
                </div>
              {/each}
              {#if bulkGenerationResults.data.variants.length > 3}
                <p class="text-center text-sm text-gray-500">
                  +{bulkGenerationResults.data.variants.length - 3} more variants
                </p>
              {/if}
            {:else if bulkGenerationType === 'landing' && bulkGenerationResults.data?.content}
              <div class="rounded border border-gray-200 bg-white p-3 dark:border-gray-600 dark:bg-gray-700">
                <p class="font-medium">{bulkGenerationResults.data.content.headline || 'Landing page generated'}</p>
                <p class="mt-1 text-sm text-gray-600 dark:text-gray-300">
                  {bulkGenerationResults.data.content.sections?.length || 0} sections,
                  {bulkGenerationResults.data.content.faqs?.length || 0} FAQs
                </p>
              </div>
            {:else if bulkGenerationType === 'variants' && bulkGenerationResults.data?.variants}
              {#each bulkGenerationResults.data.variants.slice(0, 3) as variant, i}
                <div class="rounded border border-gray-200 bg-white p-3 dark:border-gray-600 dark:bg-gray-700">
                  <div class="mb-1 flex items-center justify-between">
                    <span class="text-sm font-medium">Variant {i + 1}</span>
                    <Badge color="purple">+{variant.predictedLiftPercent || 0}% lift</Badge>
                  </div>
                  <p class="text-sm text-gray-600 dark:text-gray-300">{variant.content || 'Test variant'}</p>
                </div>
              {/each}
            {/if}
          </div>
        {:else}
          <p class="text-sm text-red-600 dark:text-red-400">
            {bulkGenerationResults.error?.message || 'Generation failed. Please try again.'}
          </p>
        {/if}
      </div>
    {/if}
  </div>

  <div class="mt-6 flex justify-end gap-3">
    <Button color="light" onclick={() => (showBulkGeneratorModal = false)}>Cancel</Button>
    <Button
      color="primary"
      disabled={!selectedOrganization || isGeneratingBulk}
      onclick={runBulkGeneration}
    >
      {#if isGeneratingBulk}
        <Spinner size="4" class="mr-2" />
        Generating...
      {:else}
        <SparklesOutline class="mr-2 h-4 w-4" />
        Generate
      {/if}
    </Button>
  </div>
</Modal>
