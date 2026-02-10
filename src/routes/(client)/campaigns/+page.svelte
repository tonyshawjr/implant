<script lang="ts">
  import type { PageData, ActionData } from './$types';
  import { enhance } from '$app/forms';

  let { data, form }: { data: PageData; form: ActionData } = $props();

  let showRequestModal = $state(false);

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

  function getStatusBadgeClass(status: string): string {
    switch (status) {
      case 'active':
        return 'badge-success';
      case 'paused':
        return 'badge-warning';
      case 'draft':
        return 'badge-gray';
      case 'completed':
        return 'badge-primary';
      case 'archived':
        return 'badge-gray';
      default:
        return 'badge-gray';
    }
  }

  function getPlatformIcon(platform: string): string {
    switch (platform?.toLowerCase()) {
      case 'facebook':
      case 'meta':
        return 'facebook';
      case 'google':
        return 'google';
      default:
        return 'default';
    }
  }

  function getTrendClass(direction: string): string {
    switch (direction) {
      case 'up':
        return 'positive';
      case 'down':
        return 'negative';
      default:
        return 'neutral';
    }
  }

  function getCplClass(cpl: number): string {
    if (cpl <= 50) return 'good';
    if (cpl <= 75) return 'average';
    return 'poor';
  }

  function getBudgetProgress(spend: number, budget: number | null): number {
    if (!budget || budget === 0) return 0;
    return Math.min((spend / budget) * 100, 100);
  }

  function formatDate(dateString: string | null): string {
    if (!dateString) return 'Not set';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  }

  function capitalizeFirst(str: string): string {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1).replace(/_/g, ' ');
  }

  function closeModal() {
    showRequestModal = false;
  }
</script>

<svelte:head>
  <title>Campaigns - Implant Lead Engine</title>
</svelte:head>

<!-- Stats Row -->
<div class="stats-row">
  <div class="stat-card">
    <div class="stat-card-header">
      <div class="stat-card-icon primary">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
        </svg>
      </div>
    </div>
    <div class="stat-card-label">Active Campaigns</div>
    <div class="stat-card-value">{data.stats.activeCampaigns}</div>
    <div class="stat-card-change neutral">
      {data.stats.totalCampaigns} total campaigns
    </div>
  </div>

  <div class="stat-card">
    <div class="stat-card-header">
      <div class="stat-card-icon success">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/>
          <line x1="1" y1="10" x2="23" y2="10"/>
        </svg>
      </div>
    </div>
    <div class="stat-card-label">Total Spend</div>
    <div class="stat-card-value">{formatCurrency(data.stats.totalSpend)}</div>
    <div class="stat-card-change neutral">
      Last 30 days
    </div>
  </div>

  <div class="stat-card">
    <div class="stat-card-header">
      <div class="stat-card-icon warning">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
          <circle cx="9" cy="7" r="4"/>
          <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
          <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
        </svg>
      </div>
    </div>
    <div class="stat-card-label">Leads Generated</div>
    <div class="stat-card-value">{formatNumber(data.stats.totalLeads)}</div>
    <div class="stat-card-change neutral">
      Last 30 days
    </div>
  </div>

  <div class="stat-card">
    <div class="stat-card-header">
      <div class="stat-card-icon danger">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="12" y1="1" x2="12" y2="23"/>
          <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
        </svg>
      </div>
    </div>
    <div class="stat-card-label">Average CPL</div>
    <div class="stat-card-value">{formatCurrency(data.stats.avgCpl)}</div>
    <div class="stat-card-change neutral">
      Cost per lead
    </div>
  </div>
</div>

<!-- Page Header -->
<div class="page-header">
  <div class="page-header-left">
    <h2 class="page-title">Your Campaigns</h2>
    <p class="page-subtitle">Monitor and manage your advertising campaigns</p>
  </div>
  <div class="page-header-right">
    <button class="btn btn-primary" onclick={() => showRequestModal = true}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <line x1="12" y1="5" x2="12" y2="19"/>
        <line x1="5" y1="12" x2="19" y2="12"/>
      </svg>
      Request New Campaign
    </button>
  </div>
</div>

<!-- Success/Error Messages -->
{#if form?.success}
  <div class="alert alert-success">
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
      <polyline points="22 4 12 14.01 9 11.01"/>
    </svg>
    <span>{form.message}</span>
  </div>
{/if}

{#if form?.message && !form?.success}
  <div class="alert alert-danger">
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <circle cx="12" cy="12" r="10"/>
      <line x1="12" y1="8" x2="12" y2="12"/>
      <line x1="12" y1="16" x2="12.01" y2="16"/>
    </svg>
    <span>{form.message}</span>
  </div>
{/if}

<!-- Campaigns Grid -->
{#if data.campaigns && data.campaigns.length > 0}
  <div class="campaigns-grid">
    {#each data.campaigns as campaign}
      <div class="card campaign-card">
        <div class="campaign-card-header">
          <div class="campaign-info">
            <div class="campaign-platform {getPlatformIcon(campaign.platform)}">
              {#if campaign.platform?.toLowerCase() === 'facebook' || campaign.platform?.toLowerCase() === 'meta'}
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
              {:else if campaign.platform?.toLowerCase() === 'google'}
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
              {:else}
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="10"/>
                </svg>
              {/if}
            </div>
            <div>
              <h3 class="campaign-name">{campaign.name}</h3>
              <div class="campaign-meta">
                <span class="campaign-type">{capitalizeFirst(campaign.campaignType || 'lead_generation')}</span>
                {#if campaign.territory}
                  <span class="campaign-territory">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                      <circle cx="12" cy="10" r="3"/>
                    </svg>
                    {campaign.territory.city}, {campaign.territory.state}
                  </span>
                {/if}
              </div>
            </div>
          </div>
          <span class="badge {getStatusBadgeClass(campaign.status)}">
            {capitalizeFirst(campaign.status)}
          </span>
        </div>

        <div class="campaign-card-body">
          <!-- Budget Progress -->
          <div class="campaign-budget">
            <div class="budget-header">
              <span class="budget-label">Budget</span>
              <span class="budget-value">
                {formatCurrency(campaign.metrics.spend)} / {campaign.monthlyBudget ? formatCurrency(campaign.monthlyBudget) : 'N/A'}
              </span>
            </div>
            {#if campaign.monthlyBudget}
              <div class="progress-bar">
                <div
                  class="progress-bar-fill {getBudgetProgress(campaign.metrics.spend, campaign.monthlyBudget) >= 90 ? 'warning' : ''}"
                  style="width: {getBudgetProgress(campaign.metrics.spend, campaign.monthlyBudget)}%"
                ></div>
              </div>
            {/if}
          </div>

          <!-- Campaign Metrics -->
          <div class="campaign-metrics">
            <div class="metric-item">
              <span class="metric-label">Impressions</span>
              <span class="metric-value">{formatNumber(campaign.metrics.impressions)}</span>
            </div>
            <div class="metric-item">
              <span class="metric-label">Clicks</span>
              <span class="metric-value">{formatNumber(campaign.metrics.clicks)}</span>
            </div>
            <div class="metric-item">
              <span class="metric-label">CTR</span>
              <span class="metric-value">{campaign.metrics.ctr}%</span>
            </div>
            <div class="metric-item highlight">
              <span class="metric-label">Leads</span>
              <span class="metric-value">{formatNumber(campaign.metrics.leads)}</span>
              {#if campaign.trend.direction !== 'neutral'}
                <span class="metric-trend {getTrendClass(campaign.trend.direction)}">
                  {#if campaign.trend.direction === 'up'}
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/>
                    </svg>
                  {:else}
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <polyline points="23 18 13.5 8.5 8.5 13.5 1 6"/>
                    </svg>
                  {/if}
                  {campaign.trend.leads > 0 ? '+' : ''}{campaign.trend.leads}%
                </span>
              {/if}
            </div>
            <div class="metric-item">
              <span class="metric-label">CPL</span>
              <span class="metric-value cpl-value {getCplClass(campaign.metrics.cpl)}">{formatCurrency(campaign.metrics.cpl)}</span>
            </div>
          </div>

          <!-- Campaign Info -->
          <div class="campaign-dates">
            <div class="date-item">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                <line x1="16" y1="2" x2="16" y2="6"/>
                <line x1="8" y1="2" x2="8" y2="6"/>
                <line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
              <span>Started: {formatDate(campaign.startDate)}</span>
            </div>
            {#if campaign.optimizationCount > 0}
              <div class="optimization-badge">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M12 20V10"/>
                  <path d="M18 20V4"/>
                  <path d="M6 20v-4"/>
                </svg>
                {campaign.optimizationCount} optimizations
              </div>
            {/if}
          </div>
        </div>

        <div class="campaign-card-footer">
          <div class="campaign-assets">
            {#if campaign.hasLandingPage}
              <span class="asset-badge">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14 2 14 8 20 8"/>
                </svg>
                Landing Page
              </span>
            {/if}
            {#if campaign.creativeCount > 0}
              <span class="asset-badge">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                  <circle cx="8.5" cy="8.5" r="1.5"/>
                  <polyline points="21 15 16 10 5 21"/>
                </svg>
                {campaign.creativeCount} Creatives
              </span>
            {/if}
          </div>
          <a href="/campaigns/{campaign.id}" class="btn btn-outline btn-sm">
            View Details
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </a>
        </div>
      </div>
    {/each}
  </div>
{:else}
  <div class="card">
    <div class="empty-state">
      <div class="empty-state-icon">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
        </svg>
      </div>
      <h3 class="empty-state-title">No campaigns yet</h3>
      <p class="empty-state-description">Request your first campaign to start generating leads.</p>
      <button class="btn btn-primary" onclick={() => showRequestModal = true}>
        Request Campaign
      </button>
    </div>
  </div>
{/if}

<!-- Request Campaign Modal -->
{#if showRequestModal}
  <div class="modal-overlay open" onclick={(e) => e.target === e.currentTarget && closeModal()} role="dialog" aria-modal="true">
    <div class="modal">
      <div class="modal-header">
        <h3 class="modal-title">Request New Campaign</h3>
        <button class="modal-close" onclick={closeModal} aria-label="Close modal">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>
      <form method="POST" action="?/requestCampaign" use:enhance={() => {
        return async ({ result, update }) => {
          await update();
          if (result.type === 'success') {
            closeModal();
          }
        };
      }}>
        <div class="modal-body">
          <div class="form-group">
            <label class="form-label" for="platform">Platform *</label>
            <select class="form-input form-select" name="platform" id="platform" required>
              <option value="">Select platform...</option>
              <option value="facebook">Facebook / Meta</option>
              <option value="google">Google Ads</option>
            </select>
          </div>

          <div class="form-group">
            <label class="form-label" for="campaignType">Campaign Type *</label>
            <select class="form-input form-select" name="campaignType" id="campaignType" required>
              <option value="">Select type...</option>
              <option value="lead_generation">Lead Generation</option>
              <option value="awareness">Brand Awareness</option>
              <option value="traffic">Website Traffic</option>
              <option value="retargeting">Retargeting</option>
            </select>
          </div>

          <div class="form-group">
            <label class="form-label" for="objective">Campaign Objective *</label>
            <input
              type="text"
              class="form-input"
              name="objective"
              id="objective"
              placeholder="e.g., Generate dental implant leads in my territory"
              required
            />
          </div>

          <div class="form-group">
            <label class="form-label" for="monthlyBudget">Suggested Monthly Budget</label>
            <input
              type="text"
              class="form-input"
              name="monthlyBudget"
              id="monthlyBudget"
              placeholder="e.g., $2,000 - $3,000"
            />
          </div>

          <div class="form-group">
            <label class="form-label" for="notes">Additional Notes</label>
            <textarea
              class="form-input"
              name="notes"
              id="notes"
              rows="3"
              placeholder="Any specific requirements or preferences..."
            ></textarea>
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" onclick={closeModal}>Cancel</button>
          <button type="submit" class="btn btn-primary">Submit Request</button>
        </div>
      </form>
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

  .stat-card-change.neutral {
    color: var(--gray-500);
  }

  .page-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: var(--spacing-6);
  }

  .page-title {
    font-size: 1.25rem;
    font-weight: 600;
    color: var(--gray-900);
  }

  .page-subtitle {
    font-size: 0.875rem;
    color: var(--gray-500);
    margin-top: var(--spacing-1);
  }

  .alert {
    display: flex;
    align-items: center;
    gap: var(--spacing-3);
    padding: var(--spacing-4);
    border-radius: var(--radius-lg);
    margin-bottom: var(--spacing-6);
  }

  .alert-success {
    background: var(--success-50);
    color: var(--success-700);
    border: 1px solid var(--success-100);
  }

  .alert-danger {
    background: var(--danger-50);
    color: var(--danger-600);
    border: 1px solid var(--danger-100);
  }

  .campaigns-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: var(--spacing-6);
  }

  @media (max-width: 1200px) {
    .campaigns-grid {
      grid-template-columns: 1fr;
    }
  }

  .campaign-card {
    display: flex;
    flex-direction: column;
  }

  .campaign-card-header {
    padding: var(--spacing-4) var(--spacing-5);
    border-bottom: 1px solid var(--gray-100);
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: var(--spacing-3);
  }

  .campaign-info {
    display: flex;
    align-items: flex-start;
    gap: var(--spacing-3);
  }

  .campaign-platform {
    width: 40px;
    height: 40px;
    border-radius: var(--radius-lg);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .campaign-platform.facebook {
    background: #e7f3ff;
    color: #1877f2;
  }

  .campaign-platform.google {
    background: #fef7e0;
    color: #ea4335;
  }

  .campaign-platform.default {
    background: var(--gray-100);
    color: var(--gray-500);
  }

  .campaign-name {
    font-size: 1rem;
    font-weight: 600;
    color: var(--gray-900);
    margin-bottom: var(--spacing-1);
  }

  .campaign-meta {
    display: flex;
    align-items: center;
    gap: var(--spacing-3);
    font-size: 0.75rem;
    color: var(--gray-500);
  }

  .campaign-type {
    text-transform: capitalize;
  }

  .campaign-territory {
    display: flex;
    align-items: center;
    gap: var(--spacing-1);
  }

  .campaign-card-body {
    padding: var(--spacing-5);
    flex: 1;
  }

  .campaign-budget {
    margin-bottom: var(--spacing-4);
  }

  .budget-header {
    display: flex;
    justify-content: space-between;
    margin-bottom: var(--spacing-2);
    font-size: 0.875rem;
  }

  .budget-label {
    color: var(--gray-500);
  }

  .budget-value {
    font-weight: 500;
    color: var(--gray-700);
  }

  .campaign-metrics {
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    gap: var(--spacing-4);
    padding: var(--spacing-4);
    background: var(--gray-50);
    border-radius: var(--radius-lg);
    margin-bottom: var(--spacing-4);
  }

  @media (max-width: 768px) {
    .campaign-metrics {
      grid-template-columns: repeat(3, 1fr);
    }
  }

  .metric-item {
    text-align: center;
  }

  .metric-item.highlight {
    position: relative;
  }

  .metric-label {
    display: block;
    font-size: 0.75rem;
    color: var(--gray-500);
    margin-bottom: var(--spacing-1);
  }

  .metric-value {
    display: block;
    font-size: 1rem;
    font-weight: 600;
    color: var(--gray-900);
  }

  .metric-trend {
    display: inline-flex;
    align-items: center;
    gap: 2px;
    font-size: 0.75rem;
    font-weight: 500;
    margin-top: var(--spacing-1);
  }

  .metric-trend.positive {
    color: var(--success-600);
  }

  .metric-trend.negative {
    color: var(--danger-500);
  }

  .cpl-value.good {
    color: var(--success-600);
  }

  .cpl-value.average {
    color: var(--warning-600);
  }

  .cpl-value.poor {
    color: var(--danger-500);
  }

  .campaign-dates {
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-size: 0.8125rem;
    color: var(--gray-500);
  }

  .date-item {
    display: flex;
    align-items: center;
    gap: var(--spacing-2);
  }

  .optimization-badge {
    display: flex;
    align-items: center;
    gap: var(--spacing-1);
    padding: 2px 8px;
    background: var(--primary-50);
    color: var(--primary-600);
    border-radius: var(--radius-full);
    font-size: 0.75rem;
    font-weight: 500;
  }

  .campaign-card-footer {
    padding: var(--spacing-4) var(--spacing-5);
    border-top: 1px solid var(--gray-100);
    display: flex;
    align-items: center;
    justify-content: space-between;
    background: var(--gray-50);
    border-radius: 0 0 var(--radius-xl) var(--radius-xl);
  }

  .campaign-assets {
    display: flex;
    gap: var(--spacing-2);
  }

  .asset-badge {
    display: inline-flex;
    align-items: center;
    gap: var(--spacing-1);
    padding: 4px 8px;
    background: white;
    border: 1px solid var(--gray-200);
    border-radius: var(--radius-md);
    font-size: 0.75rem;
    color: var(--gray-600);
  }

  .btn-outline {
    background: white;
  }

  .btn-sm {
    padding: var(--spacing-2) var(--spacing-3);
    font-size: 0.8125rem;
  }

  /* Form styles */
  textarea.form-input {
    resize: vertical;
    min-height: 80px;
  }

  @media (max-width: 640px) {
    .page-header {
      flex-direction: column;
      align-items: flex-start;
      gap: var(--spacing-4);
    }

    .campaign-assets {
      flex-wrap: wrap;
    }

    .campaign-card-footer {
      flex-direction: column;
      gap: var(--spacing-3);
      align-items: stretch;
    }

    .campaign-card-footer .btn {
      width: 100%;
      justify-content: center;
    }
  }
</style>
