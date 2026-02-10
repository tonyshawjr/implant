<script lang="ts">
  import type { PageData } from './$types';
  import { enhance } from '$app/forms';

  let { data }: { data: PageData } = $props();

  // Active tab state
  let activeTab = $state(data.activeTab || 'voice-queue');

  // Helper functions
  function formatCurrency(value: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  }

  function formatNumber(value: number): string {
    return new Intl.NumberFormat('en-US').format(value);
  }

  function formatPercent(value: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'percent',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value / 100);
  }

  function formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  }

  function formatDateTime(dateString: string): string {
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  }

  function getTimeAgo(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  }

  function getStatusBadgeClass(status: string): string {
    switch (status) {
      case 'pending':
        return 'badge-warning';
      case 'analyzing':
        return 'badge-primary';
      case 'in_review':
        return 'badge-primary';
      case 'approved':
        return 'badge-success';
      case 'rejected':
        return 'badge-danger';
      case 'draft':
        return 'badge-gray';
      case 'pending_review':
        return 'badge-warning';
      case 'active':
        return 'badge-success';
      default:
        return 'badge-gray';
    }
  }

  function getSeverityBadgeClass(severity: string): string {
    switch (severity) {
      case 'critical':
        return 'badge-danger';
      case 'warning':
        return 'badge-warning';
      case 'info':
        return 'badge-primary';
      default:
        return 'badge-gray';
    }
  }

  function getImpactBadgeClass(impact: string): string {
    switch (impact) {
      case 'high':
        return 'badge-success';
      case 'medium':
        return 'badge-primary';
      case 'low':
        return 'badge-gray';
      default:
        return 'badge-gray';
    }
  }

  function getInitials(name: string): string {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }

  function formatStatusLabel(status: string): string {
    return status.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  }
</script>

<svelte:head>
  <title>AI Operations - ILE Operations</title>
</svelte:head>

<!-- Stats Row -->
<div class="stats-row">
  <div class="stat-card">
    <div class="stat-card-header">
      <div class="stat-card-icon primary">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/>
          <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
          <line x1="12" y1="19" x2="12" y2="22"/>
        </svg>
      </div>
    </div>
    <div class="stat-card-label">Voice Profiles Queue</div>
    <div class="stat-card-value">{data.stats.pendingVoiceProfiles + data.stats.analyzingVoiceProfiles + data.stats.inReviewVoiceProfiles}</div>
    <div class="stat-card-change">
      <span class="badge badge-warning">{data.stats.pendingVoiceProfiles} pending</span>
      <span class="badge badge-primary" style="margin-left: 4px;">{data.stats.inReviewVoiceProfiles} review</span>
    </div>
  </div>

  <div class="stat-card">
    <div class="stat-card-header">
      <div class="stat-card-icon success">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="2" y="7" width="20" height="14" rx="2" ry="2"/>
          <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
        </svg>
      </div>
    </div>
    <div class="stat-card-label">Campaign Factory</div>
    <div class="stat-card-value">{data.stats.draftCampaigns + data.stats.pendingReviewCampaigns}</div>
    <div class="stat-card-change">
      <span class="badge badge-gray">{data.stats.draftCampaigns} draft</span>
      <span class="badge badge-warning" style="margin-left: 4px;">{data.stats.pendingReviewCampaigns} review</span>
    </div>
  </div>

  <div class="stat-card">
    <div class="stat-card-header">
      <div class="stat-card-icon warning">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
        </svg>
      </div>
    </div>
    <div class="stat-card-label">Optimization Queue</div>
    <div class="stat-card-value">{data.stats.totalOptimizations}</div>
    <div class="stat-card-change positive">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/>
      </svg>
      Recent optimizations
    </div>
  </div>

  <div class="stat-card">
    <div class="stat-card-header">
      <div class="stat-card-icon danger">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
          <line x1="12" y1="9" x2="12" y2="13"/>
          <line x1="12" y1="17" x2="12.01" y2="17"/>
        </svg>
      </div>
    </div>
    <div class="stat-card-label">AI Anomalies</div>
    <div class="stat-card-value">{data.stats.criticalAnomalies + data.stats.warningAnomalies}</div>
    <div class="stat-card-change negative">
      <span class="badge badge-danger">{data.stats.criticalAnomalies} critical</span>
      <span class="badge badge-warning" style="margin-left: 4px;">{data.stats.warningAnomalies} warnings</span>
    </div>
  </div>
</div>

<!-- Performance Metrics Summary -->
<div class="card mb-6">
  <div class="card-header">
    <div>
      <h3 class="card-title">30-Day Performance Overview</h3>
      <p class="card-subtitle">Aggregate metrics across all AI-managed campaigns</p>
    </div>
  </div>
  <div class="card-body">
    <div class="metrics-grid">
      <div class="metric-item">
        <span class="metric-label">Total Spend</span>
        <span class="metric-value">{formatCurrency(data.performanceMetrics.totalSpend)}</span>
      </div>
      <div class="metric-item">
        <span class="metric-label">Impressions</span>
        <span class="metric-value">{formatNumber(data.performanceMetrics.totalImpressions)}</span>
      </div>
      <div class="metric-item">
        <span class="metric-label">Clicks</span>
        <span class="metric-value">{formatNumber(data.performanceMetrics.totalClicks)}</span>
      </div>
      <div class="metric-item">
        <span class="metric-label">Avg CTR</span>
        <span class="metric-value">{formatPercent(data.performanceMetrics.avgCtr)}</span>
      </div>
      <div class="metric-item">
        <span class="metric-label">Total Leads</span>
        <span class="metric-value">{formatNumber(data.performanceMetrics.totalLeads)}</span>
      </div>
      <div class="metric-item">
        <span class="metric-label">Avg CPL</span>
        <span class="metric-value">{formatCurrency(data.performanceMetrics.avgCpl)}</span>
      </div>
    </div>
  </div>
</div>

<!-- Tabs Navigation -->
<div class="tabs">
  <button
    class="tab"
    class:active={activeTab === 'voice-queue'}
    onclick={() => activeTab = 'voice-queue'}
  >
    Voice Queue
    {#if data.voiceProfileQueue.length > 0}
      <span class="tab-badge">{data.voiceProfileQueue.length}</span>
    {/if}
  </button>
  <button
    class="tab"
    class:active={activeTab === 'campaign-factory'}
    onclick={() => activeTab = 'campaign-factory'}
  >
    Campaign Factory
    {#if data.campaignQueue.length > 0}
      <span class="tab-badge">{data.campaignQueue.length}</span>
    {/if}
  </button>
  <button
    class="tab"
    class:active={activeTab === 'content-review'}
    onclick={() => activeTab = 'content-review'}
  >
    Content Review
    {#if data.adCopyReviewQueue.length > 0}
      <span class="tab-badge">{data.adCopyReviewQueue.length}</span>
    {/if}
  </button>
  <button
    class="tab"
    class:active={activeTab === 'anomalies'}
    onclick={() => activeTab = 'anomalies'}
  >
    Anomalies
    {#if data.anomalyAlerts.length > 0}
      <span class="tab-badge danger">{data.anomalyAlerts.length}</span>
    {/if}
  </button>
  <button
    class="tab"
    class:active={activeTab === 'optimizations'}
    onclick={() => activeTab = 'optimizations'}
  >
    Optimizations
  </button>
</div>

<!-- Voice Profile Queue Tab -->
{#if activeTab === 'voice-queue'}
  <div class="card">
    <div class="card-header">
      <div>
        <h3 class="card-title">Voice Profile Queue</h3>
        <p class="card-subtitle">Brand voice profiles pending analysis or review</p>
      </div>
      <button class="btn btn-outline btn-sm">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M3 6h18"/>
          <path d="M7 12h10"/>
          <path d="M10 18h4"/>
        </svg>
        Filter
      </button>
    </div>
    <div class="table-container">
      <table class="table">
        <thead>
          <tr>
            <th>Client</th>
            <th>Profile Name</th>
            <th>Status</th>
            <th>Sources</th>
            <th>Quality</th>
            <th>Created</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {#if data.voiceProfileQueue.length > 0}
            {#each data.voiceProfileQueue as profile}
              <tr>
                <td>
                  <div class="client-cell">
                    <div class="client-avatar">{getInitials(profile.organization.name)}</div>
                    <div class="client-info">
                      <div class="client-name">{profile.organization.name}</div>
                      <div class="client-slug">{profile.organization.slug}</div>
                    </div>
                  </div>
                </td>
                <td>
                  <div class="profile-info">
                    <span class="profile-name">{profile.name}</span>
                    {#if profile.tone}
                      <span class="profile-tone">{profile.tone}</span>
                    {/if}
                  </div>
                </td>
                <td>
                  <span class="badge {getStatusBadgeClass(profile.status)}">
                    {formatStatusLabel(profile.status)}
                  </span>
                </td>
                <td>
                  <span class="source-count">{profile.sources.length} sources</span>
                </td>
                <td>
                  {#if profile.qualityScore !== null}
                    <div class="quality-score" class:high={profile.qualityScore >= 80} class:medium={profile.qualityScore >= 60 && profile.qualityScore < 80} class:low={profile.qualityScore < 60}>
                      {profile.qualityScore}
                    </div>
                  {:else}
                    <span class="text-gray-500">--</span>
                  {/if}
                </td>
                <td>
                  <span class="text-sm text-gray-500">{getTimeAgo(profile.createdAt)}</span>
                </td>
                <td>
                  <div class="table-actions">
                    {#if profile.status === 'pending'}
                      <form method="POST" action="?/startAnalysis" use:enhance>
                        <input type="hidden" name="voiceProfileId" value={profile.id} />
                        <button type="submit" class="btn btn-sm btn-primary">Start Analysis</button>
                      </form>
                    {:else if profile.status === 'analyzing'}
                      <form method="POST" action="?/completeAnalysis" use:enhance>
                        <input type="hidden" name="voiceProfileId" value={profile.id} />
                        <button type="submit" class="btn btn-sm btn-success">Complete</button>
                      </form>
                    {:else if profile.status === 'in_review'}
                      <div class="flex gap-2">
                        <form method="POST" action="?/approveVoiceProfile" use:enhance>
                          <input type="hidden" name="voiceProfileId" value={profile.id} />
                          <button type="submit" class="btn btn-sm btn-success">Approve</button>
                        </form>
                        <form method="POST" action="?/rejectVoiceProfile" use:enhance>
                          <input type="hidden" name="voiceProfileId" value={profile.id} />
                          <button type="submit" class="btn btn-sm btn-danger">Reject</button>
                        </form>
                      </div>
                    {/if}
                  </div>
                </td>
              </tr>
            {/each}
          {:else}
            <tr>
              <td colspan="7">
                <div class="empty-state">
                  <div class="empty-state-icon">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/>
                      <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                      <line x1="12" y1="19" x2="12" y2="22"/>
                    </svg>
                  </div>
                  <h3 class="empty-state-title">No voice profiles in queue</h3>
                  <p class="empty-state-description">All voice profiles have been processed.</p>
                </div>
              </td>
            </tr>
          {/if}
        </tbody>
      </table>
    </div>
  </div>
{/if}

<!-- Campaign Factory Tab -->
{#if activeTab === 'campaign-factory'}
  <div class="card">
    <div class="card-header">
      <div>
        <h3 class="card-title">Campaign Factory</h3>
        <p class="card-subtitle">Campaigns in draft or pending review status</p>
      </div>
      <button class="btn btn-primary">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="12" y1="5" x2="12" y2="19"/>
          <line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
        New Campaign
      </button>
    </div>
    <div class="table-container">
      <table class="table">
        <thead>
          <tr>
            <th>Campaign</th>
            <th>Client</th>
            <th>Platform</th>
            <th>Territory</th>
            <th>Budget</th>
            <th>Status</th>
            <th>Creatives</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {#if data.campaignQueue.length > 0}
            {#each data.campaignQueue as campaign}
              <tr>
                <td>
                  <div class="campaign-info">
                    <span class="campaign-name">{campaign.name}</span>
                    <span class="campaign-type">{campaign.campaignType}</span>
                  </div>
                </td>
                <td>
                  <div class="client-cell">
                    <div class="client-avatar sm">{getInitials(campaign.organization.name)}</div>
                    <span class="client-name-inline">{campaign.organization.name}</span>
                  </div>
                </td>
                <td>
                  <span class="badge badge-gray">{campaign.platform}</span>
                </td>
                <td>
                  {#if campaign.territory}
                    <span class="text-sm">{campaign.territory.city}, {campaign.territory.state}</span>
                  {:else}
                    <span class="text-gray-500">--</span>
                  {/if}
                </td>
                <td>
                  {#if campaign.dailyBudget}
                    <span class="text-sm">{formatCurrency(campaign.dailyBudget)}/day</span>
                  {:else if campaign.monthlyBudget}
                    <span class="text-sm">{formatCurrency(campaign.monthlyBudget)}/mo</span>
                  {:else}
                    <span class="text-gray-500">--</span>
                  {/if}
                </td>
                <td>
                  <span class="badge {getStatusBadgeClass(campaign.status)}">
                    {formatStatusLabel(campaign.status)}
                  </span>
                </td>
                <td>
                  <span class="creative-count">{campaign.creatives.length} creatives</span>
                </td>
                <td>
                  <div class="table-actions">
                    {#if campaign.status === 'pending_review'}
                      <div class="flex gap-2">
                        <form method="POST" action="?/approveCampaign" use:enhance>
                          <input type="hidden" name="campaignId" value={campaign.id} />
                          <button type="submit" class="btn btn-sm btn-success">Approve</button>
                        </form>
                        <form method="POST" action="?/rejectCampaign" use:enhance>
                          <input type="hidden" name="campaignId" value={campaign.id} />
                          <button type="submit" class="btn btn-sm btn-outline">Revise</button>
                        </form>
                      </div>
                    {:else}
                      <button class="btn btn-sm btn-outline">Edit</button>
                    {/if}
                  </div>
                </td>
              </tr>
            {/each}
          {:else}
            <tr>
              <td colspan="8">
                <div class="empty-state">
                  <div class="empty-state-icon">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <rect x="2" y="7" width="20" height="14" rx="2" ry="2"/>
                      <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
                    </svg>
                  </div>
                  <h3 class="empty-state-title">No campaigns in queue</h3>
                  <p class="empty-state-description">All campaigns have been processed or launched.</p>
                </div>
              </td>
            </tr>
          {/if}
        </tbody>
      </table>
    </div>
  </div>
{/if}

<!-- Content Review Tab -->
{#if activeTab === 'content-review'}
  <div class="card">
    <div class="card-header">
      <div>
        <h3 class="card-title">Content Review Queue</h3>
        <p class="card-subtitle">AI-generated ad copy pending approval</p>
      </div>
      <div class="flex gap-3">
        <select class="form-input form-select" style="width: 200px;">
          <option value="">All Clients</option>
          {#each data.organizations as org}
            <option value={org.id}>{org.name}</option>
          {/each}
        </select>
      </div>
    </div>
    <div class="content-review-grid">
      {#if data.adCopyReviewQueue.length > 0}
        {#each data.adCopyReviewQueue as creative}
          <div class="creative-card">
            <div class="creative-card-header">
              <div class="creative-meta">
                <span class="badge badge-gray">{creative.creativeType}</span>
                {#if creative.aiGenerated}
                  <span class="badge badge-primary">AI Generated</span>
                {/if}
              </div>
              <span class="creative-time">{getTimeAgo(creative.createdAt)}</span>
            </div>
            <div class="creative-card-body">
              <div class="creative-client">
                <span class="client-avatar sm">{getInitials(creative.campaign.organization.name)}</span>
                <span class="text-sm font-medium">{creative.campaign.organization.name}</span>
              </div>
              <div class="creative-content">
                {#if creative.headline}
                  <h4 class="creative-headline">{creative.headline}</h4>
                {/if}
                {#if creative.body}
                  <p class="creative-body">{creative.body}</p>
                {/if}
                {#if creative.ctaText}
                  <div class="creative-cta">
                    <span class="cta-button">{creative.ctaText}</span>
                  </div>
                {/if}
              </div>
              {#if creative.voiceProfile}
                <div class="creative-voice">
                  <span class="text-xs text-gray-500">Voice Profile:</span>
                  <span class="text-xs font-medium">{creative.voiceProfile.name}</span>
                </div>
              {/if}
            </div>
            <div class="creative-card-footer">
              <div class="flex gap-2">
                <form method="POST" action="?/approveCreative" use:enhance class="flex-1">
                  <input type="hidden" name="creativeId" value={creative.id} />
                  <button type="submit" class="btn btn-sm btn-success w-full">Approve</button>
                </form>
                <form method="POST" action="?/rejectCreative" use:enhance class="flex-1">
                  <input type="hidden" name="creativeId" value={creative.id} />
                  <button type="submit" class="btn btn-sm btn-outline w-full">Reject</button>
                </form>
              </div>
            </div>
          </div>
        {/each}
      {:else}
        <div class="empty-state" style="grid-column: 1 / -1;">
          <div class="empty-state-icon">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
              <line x1="16" y1="13" x2="8" y2="13"/>
              <line x1="16" y1="17" x2="8" y2="17"/>
              <polyline points="10 9 9 9 8 9"/>
            </svg>
          </div>
          <h3 class="empty-state-title">No content pending review</h3>
          <p class="empty-state-description">All AI-generated content has been reviewed.</p>
        </div>
      {/if}
    </div>
  </div>
{/if}

<!-- Anomalies Tab -->
{#if activeTab === 'anomalies'}
  <div class="card">
    <div class="card-header">
      <div>
        <h3 class="card-title">AI Anomaly Alerts</h3>
        <p class="card-subtitle">Performance deviations requiring attention</p>
      </div>
    </div>
    <div class="table-container">
      <table class="table">
        <thead>
          <tr>
            <th>Severity</th>
            <th>Alert</th>
            <th>Client</th>
            <th>Metric</th>
            <th>Deviation</th>
            <th>Detected</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {#if data.anomalyAlerts.length > 0}
            {#each data.anomalyAlerts as anomaly}
              <tr>
                <td>
                  <span class="badge {getSeverityBadgeClass(anomaly.severity)}">
                    {anomaly.severity}
                  </span>
                </td>
                <td>
                  <div class="anomaly-info">
                    <span class="anomaly-title">{anomaly.title}</span>
                    <span class="anomaly-description">{anomaly.description}</span>
                  </div>
                </td>
                <td>
                  {#if anomaly.organization}
                    <span class="text-sm">{anomaly.organization.name}</span>
                  {:else}
                    <span class="text-gray-500">Platform-wide</span>
                  {/if}
                </td>
                <td>
                  <span class="text-sm">{anomaly.metricName}</span>
                </td>
                <td>
                  {#if anomaly.deviationPercentage !== null}
                    <span class="deviation-value" class:negative={anomaly.deviationPercentage < 0} class:positive={anomaly.deviationPercentage > 0}>
                      {anomaly.deviationPercentage > 0 ? '+' : ''}{anomaly.deviationPercentage.toFixed(1)}%
                    </span>
                  {:else}
                    <span class="text-gray-500">--</span>
                  {/if}
                </td>
                <td>
                  <span class="text-sm text-gray-500">{getTimeAgo(anomaly.detectedAt)}</span>
                </td>
                <td>
                  <div class="table-actions">
                    {#if !anomaly.acknowledgedAt}
                      <form method="POST" action="?/acknowledgeAnomaly" use:enhance>
                        <input type="hidden" name="anomalyId" value={anomaly.id} />
                        <button type="submit" class="btn btn-sm btn-outline">Acknowledge</button>
                      </form>
                    {:else}
                      <form method="POST" action="?/resolveAnomaly" use:enhance>
                        <input type="hidden" name="anomalyId" value={anomaly.id} />
                        <button type="submit" class="btn btn-sm btn-success">Resolve</button>
                      </form>
                    {/if}
                  </div>
                </td>
              </tr>
            {/each}
          {:else}
            <tr>
              <td colspan="7">
                <div class="empty-state">
                  <div class="empty-state-icon">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                      <polyline points="22 4 12 14.01 9 11.01"/>
                    </svg>
                  </div>
                  <h3 class="empty-state-title">No anomalies detected</h3>
                  <p class="empty-state-description">All AI systems are operating within normal parameters.</p>
                </div>
              </td>
            </tr>
          {/if}
        </tbody>
      </table>
    </div>
  </div>
{/if}

<!-- Optimizations Tab -->
{#if activeTab === 'optimizations'}
  <div class="card">
    <div class="card-header">
      <div>
        <h3 class="card-title">Recent AI Optimizations</h3>
        <p class="card-subtitle">Automated campaign optimizations applied by AI</p>
      </div>
    </div>
    <div class="optimization-feed">
      {#if data.recentOptimizations.length > 0}
        {#each data.recentOptimizations as optimization}
          <div class="optimization-item">
            <div class="optimization-icon" class:high={optimization.impact === 'high'} class:medium={optimization.impact === 'medium'} class:low={optimization.impact === 'low'}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
              </svg>
            </div>
            <div class="optimization-content">
              <div class="optimization-header">
                <span class="optimization-title">{optimization.title}</span>
                <span class="badge {getImpactBadgeClass(optimization.impact)}">{optimization.impact} impact</span>
              </div>
              <p class="optimization-description">{optimization.description}</p>
              <div class="optimization-meta">
                <span class="optimization-campaign">
                  {optimization.campaign.organization.name} - {optimization.campaign.name}
                </span>
                <span class="optimization-time">{getTimeAgo(optimization.appliedAt)}</span>
              </div>
              {#if optimization.impactMetric && optimization.impactValue !== null}
                <div class="optimization-impact">
                  <span class="impact-metric">{optimization.impactMetric}:</span>
                  <span class="impact-value positive">+{optimization.impactValue.toFixed(1)}%</span>
                  {#if optimization.aiConfidence !== null}
                    <span class="confidence-badge">
                      {optimization.aiConfidence.toFixed(0)}% confidence
                    </span>
                  {/if}
                </div>
              {/if}
            </div>
          </div>
        {/each}
      {:else}
        <div class="empty-state">
          <div class="empty-state-icon">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
            </svg>
          </div>
          <h3 class="empty-state-title">No recent optimizations</h3>
          <p class="empty-state-description">AI optimizations will appear here as they are applied.</p>
        </div>
      {/if}
    </div>
  </div>
{/if}

<style>
  .stats-row {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: var(--spacing-6);
    margin-bottom: var(--spacing-6);
  }

  @media (max-width: 1200px) {
    .stats-row {
      grid-template-columns: repeat(2, 1fr);
    }
  }

  @media (max-width: 640px) {
    .stats-row {
      grid-template-columns: 1fr;
    }
  }

  /* Metrics Grid */
  .metrics-grid {
    display: grid;
    grid-template-columns: repeat(6, 1fr);
    gap: var(--spacing-4);
  }

  @media (max-width: 1200px) {
    .metrics-grid {
      grid-template-columns: repeat(3, 1fr);
    }
  }

  @media (max-width: 640px) {
    .metrics-grid {
      grid-template-columns: repeat(2, 1fr);
    }
  }

  .metric-item {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-1);
    padding: var(--spacing-3);
    background: var(--gray-50);
    border-radius: var(--radius-lg);
  }

  .metric-label {
    font-size: 0.75rem;
    color: var(--gray-500);
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .metric-value {
    font-size: 1.25rem;
    font-weight: 600;
    color: var(--gray-900);
  }

  /* Tabs Enhancement */
  .tab {
    display: flex;
    align-items: center;
    gap: var(--spacing-2);
  }

  .tab-badge {
    background: var(--gray-200);
    color: var(--gray-600);
    font-size: 0.75rem;
    font-weight: 600;
    padding: 2px 8px;
    border-radius: var(--radius-full);
  }

  .tab.active .tab-badge {
    background: var(--primary-100);
    color: var(--primary-700);
  }

  .tab-badge.danger {
    background: var(--danger-100);
    color: var(--danger-600);
  }

  /* Client Cell */
  .client-cell {
    display: flex;
    align-items: center;
    gap: var(--spacing-3);
  }

  .client-avatar {
    width: 36px;
    height: 36px;
    border-radius: var(--radius-lg);
    background: var(--primary-100);
    color: var(--primary-700);
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 600;
    font-size: 0.8125rem;
    flex-shrink: 0;
  }

  .client-avatar.sm {
    width: 28px;
    height: 28px;
    font-size: 0.75rem;
  }

  .client-info {
    display: flex;
    flex-direction: column;
  }

  .client-name {
    font-weight: 500;
    color: var(--gray-900);
  }

  .client-name-inline {
    font-size: 0.875rem;
    color: var(--gray-700);
  }

  .client-slug {
    font-size: 0.75rem;
    color: var(--gray-500);
  }

  /* Profile Info */
  .profile-info {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .profile-name {
    font-weight: 500;
    color: var(--gray-900);
  }

  .profile-tone {
    font-size: 0.75rem;
    color: var(--gray-500);
  }

  /* Quality Score */
  .quality-score {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 24px;
    border-radius: var(--radius-md);
    font-weight: 600;
    font-size: 0.8125rem;
  }

  .quality-score.high {
    background: var(--success-100);
    color: var(--success-700);
  }

  .quality-score.medium {
    background: var(--warning-100);
    color: var(--warning-600);
  }

  .quality-score.low {
    background: var(--danger-100);
    color: var(--danger-600);
  }

  /* Source Count */
  .source-count {
    font-size: 0.875rem;
    color: var(--gray-600);
  }

  /* Campaign Info */
  .campaign-info {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .campaign-name {
    font-weight: 500;
    color: var(--gray-900);
  }

  .campaign-type {
    font-size: 0.75rem;
    color: var(--gray-500);
    text-transform: capitalize;
  }

  .creative-count {
    font-size: 0.875rem;
    color: var(--gray-600);
  }

  /* Content Review Grid */
  .content-review-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: var(--spacing-4);
    padding: var(--spacing-5);
  }

  @media (max-width: 1200px) {
    .content-review-grid {
      grid-template-columns: repeat(2, 1fr);
    }
  }

  @media (max-width: 768px) {
    .content-review-grid {
      grid-template-columns: 1fr;
    }
  }

  /* Creative Card */
  .creative-card {
    background: white;
    border: 1px solid var(--gray-200);
    border-radius: var(--radius-xl);
    overflow: hidden;
  }

  .creative-card-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--spacing-3) var(--spacing-4);
    background: var(--gray-50);
    border-bottom: 1px solid var(--gray-100);
  }

  .creative-meta {
    display: flex;
    gap: var(--spacing-2);
  }

  .creative-time {
    font-size: 0.75rem;
    color: var(--gray-500);
  }

  .creative-card-body {
    padding: var(--spacing-4);
  }

  .creative-client {
    display: flex;
    align-items: center;
    gap: var(--spacing-2);
    margin-bottom: var(--spacing-3);
  }

  .creative-content {
    background: var(--gray-50);
    border-radius: var(--radius-lg);
    padding: var(--spacing-3);
    margin-bottom: var(--spacing-3);
  }

  .creative-headline {
    font-size: 0.9375rem;
    font-weight: 600;
    color: var(--gray-900);
    margin-bottom: var(--spacing-2);
  }

  .creative-body {
    font-size: 0.875rem;
    color: var(--gray-600);
    line-height: 1.5;
    margin-bottom: var(--spacing-2);
  }

  .creative-cta {
    margin-top: var(--spacing-2);
  }

  .cta-button {
    display: inline-block;
    padding: var(--spacing-1) var(--spacing-3);
    background: var(--primary-600);
    color: white;
    font-size: 0.75rem;
    font-weight: 500;
    border-radius: var(--radius-md);
  }

  .creative-voice {
    display: flex;
    gap: var(--spacing-2);
    align-items: center;
  }

  .creative-card-footer {
    padding: var(--spacing-3) var(--spacing-4);
    border-top: 1px solid var(--gray-100);
    background: var(--gray-50);
  }

  /* Anomaly Info */
  .anomaly-info {
    display: flex;
    flex-direction: column;
    gap: 2px;
    max-width: 300px;
  }

  .anomaly-title {
    font-weight: 500;
    color: var(--gray-900);
  }

  .anomaly-description {
    font-size: 0.75rem;
    color: var(--gray-500);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  /* Deviation Value */
  .deviation-value {
    font-weight: 600;
    font-size: 0.875rem;
  }

  .deviation-value.positive {
    color: var(--success-600);
  }

  .deviation-value.negative {
    color: var(--danger-600);
  }

  /* Optimization Feed */
  .optimization-feed {
    padding: var(--spacing-5);
  }

  .optimization-item {
    display: flex;
    gap: var(--spacing-4);
    padding: var(--spacing-4);
    border-bottom: 1px solid var(--gray-100);
  }

  .optimization-item:last-child {
    border-bottom: none;
  }

  .optimization-icon {
    width: 40px;
    height: 40px;
    border-radius: var(--radius-lg);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    background: var(--gray-100);
    color: var(--gray-600);
  }

  .optimization-icon.high {
    background: var(--success-100);
    color: var(--success-600);
  }

  .optimization-icon.medium {
    background: var(--primary-100);
    color: var(--primary-600);
  }

  .optimization-icon.low {
    background: var(--gray-100);
    color: var(--gray-600);
  }

  .optimization-content {
    flex: 1;
  }

  .optimization-header {
    display: flex;
    align-items: center;
    gap: var(--spacing-3);
    margin-bottom: var(--spacing-2);
  }

  .optimization-title {
    font-weight: 600;
    color: var(--gray-900);
  }

  .optimization-description {
    font-size: 0.875rem;
    color: var(--gray-600);
    line-height: 1.5;
    margin-bottom: var(--spacing-2);
  }

  .optimization-meta {
    display: flex;
    align-items: center;
    gap: var(--spacing-4);
    font-size: 0.75rem;
    color: var(--gray-500);
    margin-bottom: var(--spacing-2);
  }

  .optimization-campaign {
    font-weight: 500;
  }

  .optimization-impact {
    display: flex;
    align-items: center;
    gap: var(--spacing-2);
    padding: var(--spacing-2) var(--spacing-3);
    background: var(--gray-50);
    border-radius: var(--radius-md);
    width: fit-content;
  }

  .impact-metric {
    font-size: 0.75rem;
    color: var(--gray-500);
  }

  .impact-value {
    font-size: 0.875rem;
    font-weight: 600;
  }

  .impact-value.positive {
    color: var(--success-600);
  }

  .confidence-badge {
    font-size: 0.75rem;
    color: var(--gray-500);
    padding-left: var(--spacing-2);
    border-left: 1px solid var(--gray-200);
  }

  /* Utility */
  .flex-1 {
    flex: 1;
  }
</style>
