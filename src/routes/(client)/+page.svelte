<script lang="ts">
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();

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
    return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;
  }

  function formatDate(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) {
      return `${diffMins}m ago`;
    } else if (diffHours < 24) {
      return `${diffHours}h ago`;
    } else if (diffDays < 7) {
      return `${diffDays}d ago`;
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  }

  function getTemperatureClass(temperature: string | null): string {
    switch (temperature?.toLowerCase()) {
      case 'hot': return 'hot';
      case 'warm': return 'warm';
      default: return 'cold';
    }
  }

  function getStatusBadgeClass(status: string | null): string {
    switch (status?.toLowerCase()) {
      case 'new': return 'badge-primary';
      case 'contacted': return 'badge-warning';
      case 'qualified': return 'badge-success';
      case 'converted': return 'badge-success';
      case 'lost': return 'badge-gray';
      default: return 'badge-gray';
    }
  }

  function getCampaignStatusClass(status: string | null): string {
    switch (status?.toLowerCase()) {
      case 'active': return 'badge-success';
      case 'paused': return 'badge-warning';
      default: return 'badge-gray';
    }
  }

  function getPlatformIcon(platform: string | null): string {
    switch (platform?.toLowerCase()) {
      case 'facebook':
      case 'meta':
        return 'M22 12c0-5.52-4.48-10-10-10S2 6.48 2 12c0 4.84 3.44 8.87 8 9.8V15H8v-3h2V9.5C10 7.57 11.57 6 13.5 6H16v3h-2c-.55 0-1 .45-1 1v2h3v3h-3v6.95c5.05-.5 9-4.76 9-9.95z';
      case 'google':
        return 'M12.545 10.239v3.821h5.445c-.712 2.315-2.647 3.972-5.445 3.972-3.332 0-6.033-2.701-6.033-6.032s2.701-6.032 6.033-6.032c1.498 0 2.866.549 3.921 1.453l2.814-2.814C17.503 2.988 15.139 2 12.545 2 7.021 2 2.543 6.477 2.543 12s4.478 10 10.002 10c8.396 0 10.249-7.85 9.426-11.748l-9.426-.013z';
      default:
        return 'M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5';
    }
  }

  function getInitials(firstName: string | null, lastName: string | null): string {
    const first = firstName?.[0] || '';
    const last = lastName?.[0] || '';
    return (first + last).toUpperCase() || '??';
  }
</script>

<svelte:head>
  <title>Dashboard - Implant Lead Engine</title>
</svelte:head>

<!-- Stats Row -->
<div class="stats-row">
  <div class="stat-card">
    <div class="stat-card-header">
      <div class="stat-card-icon primary">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
          <circle cx="9" cy="7" r="4"/>
          <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
          <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
        </svg>
      </div>
    </div>
    <div class="stat-card-label">Leads This Month</div>
    <div class="stat-card-value">{data.stats?.leadsThisMonth ?? 0}</div>
    <div class="stat-card-change {(data.stats?.leadChange ?? 0) >= 0 ? 'positive' : 'negative'}">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        {#if (data.stats?.leadChange ?? 0) >= 0}
          <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/>
        {:else}
          <polyline points="23 18 13.5 8.5 8.5 13.5 1 6"/>
        {/if}
      </svg>
      {formatPercent(data.stats?.leadChange ?? 0)} vs last month
    </div>
  </div>

  <div class="stat-card">
    <div class="stat-card-header">
      <div class="stat-card-icon success">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
          <polyline points="22 4 12 14.01 9 11.01"/>
        </svg>
      </div>
    </div>
    <div class="stat-card-label">Conversion Rate</div>
    <div class="stat-card-value">{(data.stats?.conversionRate ?? 0).toFixed(1)}%</div>
    <div class="stat-card-change {(data.stats?.conversionChange ?? 0) >= 0 ? 'positive' : 'negative'}">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        {#if (data.stats?.conversionChange ?? 0) >= 0}
          <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/>
        {:else}
          <polyline points="23 18 13.5 8.5 8.5 13.5 1 6"/>
        {/if}
      </svg>
      {(data.stats?.conversionChange ?? 0) >= 0 ? '+' : ''}{(data.stats?.conversionChange ?? 0).toFixed(1)}pp vs last month
    </div>
  </div>

  <div class="stat-card">
    <div class="stat-card-header">
      <div class="stat-card-icon warning">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
        </svg>
      </div>
    </div>
    <div class="stat-card-label">Active Campaigns</div>
    <div class="stat-card-value">{data.stats?.activeCampaigns ?? 0}</div>
    <div class="stat-card-change neutral">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10"/>
        <polyline points="12 6 12 12 16 14"/>
      </svg>
      Running now
    </div>
  </div>

  <div class="stat-card">
    <div class="stat-card-header">
      <div class="stat-card-icon {(data.stats?.cplChange ?? 0) <= 0 ? 'success' : 'danger'}">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="12" y1="1" x2="12" y2="23"/>
          <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
        </svg>
      </div>
    </div>
    <div class="stat-card-label">Cost Per Lead</div>
    <div class="stat-card-value">{formatCurrency(data.stats?.costPerLead ?? 0)}</div>
    <div class="stat-card-change {(data.stats?.cplChange ?? 0) <= 0 ? 'positive' : 'negative'}">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        {#if (data.stats?.cplChange ?? 0) <= 0}
          <polyline points="23 18 13.5 8.5 8.5 13.5 1 6"/>
        {:else}
          <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/>
        {/if}
      </svg>
      {formatPercent(data.stats?.cplChange ?? 0)} vs last month
    </div>
  </div>
</div>

<!-- Main Content Grid -->
<div class="dashboard-grid">
  <!-- Recent Leads Section -->
  <div class="card leads-section">
    <div class="card-header">
      <div>
        <h3 class="card-title">Recent Leads</h3>
        <p class="card-subtitle">Your latest lead submissions</p>
      </div>
      <a href="/leads" class="btn btn-secondary btn-sm">View All</a>
    </div>
    <div class="table-container">
      <table class="table">
        <thead>
          <tr>
            <th>Lead</th>
            <th>Status</th>
            <th>Temperature</th>
            <th>Source</th>
            <th>Received</th>
          </tr>
        </thead>
        <tbody>
          {#if data.recentLeads && data.recentLeads.length > 0}
            {#each data.recentLeads as lead}
              <tr>
                <td>
                  <div class="lead-name-cell">
                    <div class="lead-avatar">{getInitials(lead.firstName, lead.lastName)}</div>
                    <div class="lead-info">
                      <div class="lead-name">{lead.firstName || ''} {lead.lastName || ''}</div>
                      <div class="lead-contact">{lead.phone || lead.email || 'No contact'}</div>
                    </div>
                  </div>
                </td>
                <td>
                  <span class="badge {getStatusBadgeClass(lead.status)}">
                    {lead.status || 'New'}
                  </span>
                </td>
                <td>
                  <div class="lead-temperature {getTemperatureClass(lead.temperature)}">
                    {lead.temperature || 'Cold'}
                  </div>
                </td>
                <td class="text-sm text-gray-600">{lead.source || 'Direct'}</td>
                <td class="text-sm text-gray-500">{formatDate(lead.createdAt)}</td>
              </tr>
            {/each}
          {:else}
            <tr>
              <td colspan="5">
                <div class="empty-state">
                  <div class="empty-state-icon">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                      <circle cx="9" cy="7" r="4"/>
                      <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                      <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                    </svg>
                  </div>
                  <h3 class="empty-state-title">No leads yet</h3>
                  <p class="empty-state-description">Your leads will appear here once your campaigns start generating results.</p>
                </div>
              </td>
            </tr>
          {/if}
        </tbody>
      </table>
    </div>
  </div>

  <!-- Campaign Performance Section -->
  <div class="card campaigns-section">
    <div class="card-header">
      <div>
        <h3 class="card-title">Campaign Performance</h3>
        <p class="card-subtitle">This month's metrics</p>
      </div>
      <a href="/campaigns" class="btn btn-secondary btn-sm">Manage</a>
    </div>
    <div class="card-body">
      {#if data.campaigns && data.campaigns.length > 0}
        <div class="campaigns-list">
          {#each data.campaigns as campaign}
            <div class="campaign-item">
              <div class="campaign-info">
                <div class="campaign-platform">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                    <path d="{getPlatformIcon(campaign.platform)}"/>
                  </svg>
                </div>
                <div>
                  <div class="campaign-name">{campaign.name}</div>
                  <div class="campaign-meta">
                    <span class="badge {getCampaignStatusClass(campaign.status)}">{campaign.status}</span>
                    <span class="text-xs text-gray-500">{campaign.leadsThisMonth} leads</span>
                  </div>
                </div>
              </div>
              <div class="campaign-stats">
                <div class="campaign-stat">
                  <div class="campaign-stat-value">{formatCurrency(campaign.spend)}</div>
                  <div class="campaign-stat-label">Spent</div>
                </div>
                <div class="campaign-stat">
                  <div class="campaign-stat-value">{campaign.cpl !== null ? formatCurrency(campaign.cpl) : '-'}</div>
                  <div class="campaign-stat-label">CPL</div>
                </div>
                {#if campaign.budget > 0}
                  <div class="campaign-progress">
                    <div class="progress-bar">
                      <div
                        class="progress-bar-fill {campaign.spend / campaign.budget > 0.9 ? 'warning' : ''}"
                        style="width: {Math.min((campaign.spend / campaign.budget) * 100, 100)}%"
                      ></div>
                    </div>
                    <div class="text-xs text-gray-500 mt-1">
                      {((campaign.spend / campaign.budget) * 100).toFixed(0)}% of budget
                    </div>
                  </div>
                {/if}
              </div>
            </div>
          {/each}
        </div>
      {:else}
        <div class="empty-state">
          <div class="empty-state-icon">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
            </svg>
          </div>
          <h3 class="empty-state-title">No active campaigns</h3>
          <p class="empty-state-description">Your campaign performance will be shown here once campaigns are running.</p>
        </div>
      {/if}
    </div>
  </div>

  <!-- Quick Actions Section -->
  <div class="card quick-actions-section">
    <div class="card-header">
      <h3 class="card-title">Quick Actions</h3>
    </div>
    <div class="card-body">
      <div class="quick-actions-grid">
        <a href="/leads" class="quick-action-card">
          <div class="quick-action-icon primary">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <line x1="19" y1="8" x2="19" y2="14"/>
              <line x1="22" y1="11" x2="16" y2="11"/>
            </svg>
          </div>
          <div class="quick-action-content">
            <div class="quick-action-title">View All Leads</div>
            <div class="quick-action-description">Manage and track your leads</div>
          </div>
          <svg class="quick-action-arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="9 18 15 12 9 6"/>
          </svg>
        </a>

        <a href="/campaigns" class="quick-action-card">
          <div class="quick-action-icon success">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
            </svg>
          </div>
          <div class="quick-action-content">
            <div class="quick-action-title">Campaign Dashboard</div>
            <div class="quick-action-description">View campaign performance</div>
          </div>
          <svg class="quick-action-arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="9 18 15 12 9 6"/>
          </svg>
        </a>

        <a href="/territory" class="quick-action-card">
          <div class="quick-action-icon warning">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
              <circle cx="12" cy="10" r="3"/>
            </svg>
          </div>
          <div class="quick-action-content">
            <div class="quick-action-title">Territory Map</div>
            <div class="quick-action-description">View your exclusive territory</div>
          </div>
          <svg class="quick-action-arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="9 18 15 12 9 6"/>
          </svg>
        </a>

        <a href="/support" class="quick-action-card">
          <div class="quick-action-icon danger">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/>
              <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
              <line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
          </div>
          <div class="quick-action-content">
            <div class="quick-action-title">Get Support</div>
            <div class="quick-action-description">Contact our support team</div>
          </div>
          <svg class="quick-action-arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="9 18 15 12 9 6"/>
          </svg>
        </a>
      </div>
    </div>
  </div>

  <!-- Health Score Widget (if available) -->
  {#if data.healthScore !== null}
    <div class="card health-score-section">
      <div class="card-header">
        <h3 class="card-title">Account Health</h3>
      </div>
      <div class="card-body">
        <div class="health-score-display">
          <div class="health-score-circle {data.healthScore >= 85 ? 'excellent' : data.healthScore >= 70 ? 'good' : data.healthScore >= 50 ? 'warning' : 'critical'}">
            <span class="health-score-value">{data.healthScore}</span>
            <span class="health-score-label">Score</span>
          </div>
          <div class="health-score-details">
            <div class="health-score-status">
              {#if data.healthScore >= 85}
                <span class="badge badge-success">Excellent</span>
              {:else if data.healthScore >= 70}
                <span class="badge badge-primary">Good</span>
              {:else if data.healthScore >= 50}
                <span class="badge badge-warning">Needs Attention</span>
              {:else}
                <span class="badge badge-danger">Critical</span>
              {/if}
            </div>
            <p class="health-score-message">
              {#if data.healthScore >= 85}
                Your account is performing excellently. Keep up the great work!
              {:else if data.healthScore >= 70}
                Your account is in good standing with room for improvement.
              {:else if data.healthScore >= 50}
                Some metrics need attention. Review your campaigns and leads.
              {:else}
                Immediate attention required. Contact support for assistance.
              {/if}
            </p>
          </div>
        </div>
      </div>
    </div>
  {/if}
</div>

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

  .dashboard-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--spacing-6);
  }

  @media (max-width: 1024px) {
    .dashboard-grid {
      grid-template-columns: 1fr;
    }
  }

  .leads-section {
    grid-column: span 2;
  }

  @media (max-width: 1024px) {
    .leads-section {
      grid-column: span 1;
    }
  }

  /* Lead name cell */
  .lead-name-cell {
    display: flex;
    align-items: center;
    gap: var(--spacing-3);
  }

  .lead-avatar {
    width: 36px;
    height: 36px;
    border-radius: var(--radius-full);
    background: var(--primary-100);
    color: var(--primary-700);
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 600;
    font-size: 0.8125rem;
    flex-shrink: 0;
  }

  .lead-info {
    display: flex;
    flex-direction: column;
  }

  .lead-name {
    font-weight: 500;
    color: var(--gray-900);
  }

  .lead-contact {
    font-size: 0.75rem;
    color: var(--gray-500);
  }

  /* Lead temperature */
  .lead-temperature {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 4px 10px;
    border-radius: var(--radius-full);
    font-size: 0.75rem;
    font-weight: 500;
    text-transform: capitalize;
  }

  .lead-temperature.hot {
    background: var(--success-100);
    color: var(--success-700);
  }

  .lead-temperature.warm {
    background: var(--warning-100);
    color: var(--warning-600);
  }

  .lead-temperature.cold {
    background: var(--gray-100);
    color: var(--gray-600);
  }

  /* Campaign list */
  .campaigns-list {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-4);
  }

  .campaign-item {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    padding: var(--spacing-4);
    background: var(--gray-50);
    border-radius: var(--radius-lg);
    gap: var(--spacing-4);
  }

  .campaign-info {
    display: flex;
    gap: var(--spacing-3);
  }

  .campaign-platform {
    width: 36px;
    height: 36px;
    border-radius: var(--radius-lg);
    background: white;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--gray-600);
    flex-shrink: 0;
  }

  .campaign-name {
    font-weight: 500;
    color: var(--gray-900);
    margin-bottom: var(--spacing-1);
  }

  .campaign-meta {
    display: flex;
    align-items: center;
    gap: var(--spacing-2);
  }

  .campaign-stats {
    display: flex;
    align-items: center;
    gap: var(--spacing-6);
  }

  .campaign-stat {
    text-align: right;
  }

  .campaign-stat-value {
    font-weight: 600;
    color: var(--gray-900);
  }

  .campaign-stat-label {
    font-size: 0.75rem;
    color: var(--gray-500);
  }

  .campaign-progress {
    min-width: 100px;
  }

  /* Quick actions */
  .quick-actions-section {
    grid-column: span 1;
  }

  .quick-actions-grid {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-3);
  }

  .quick-action-card {
    display: flex;
    align-items: center;
    gap: var(--spacing-4);
    padding: var(--spacing-4);
    background: var(--gray-50);
    border-radius: var(--radius-lg);
    transition: all 0.2s ease;
    text-decoration: none;
    color: inherit;
  }

  .quick-action-card:hover {
    background: var(--gray-100);
    transform: translateX(4px);
  }

  .quick-action-icon {
    width: 44px;
    height: 44px;
    border-radius: var(--radius-lg);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .quick-action-icon.primary {
    background: var(--primary-100);
    color: var(--primary-600);
  }

  .quick-action-icon.success {
    background: var(--success-100);
    color: var(--success-600);
  }

  .quick-action-icon.warning {
    background: var(--warning-100);
    color: var(--warning-600);
  }

  .quick-action-icon.danger {
    background: var(--danger-100);
    color: var(--danger-600);
  }

  .quick-action-content {
    flex: 1;
  }

  .quick-action-title {
    font-weight: 500;
    color: var(--gray-900);
  }

  .quick-action-description {
    font-size: 0.8125rem;
    color: var(--gray-500);
  }

  .quick-action-arrow {
    color: var(--gray-400);
    flex-shrink: 0;
  }

  /* Health score */
  .health-score-section {
    grid-column: span 1;
  }

  .health-score-display {
    display: flex;
    align-items: center;
    gap: var(--spacing-6);
  }

  .health-score-circle {
    width: 100px;
    height: 100px;
    border-radius: var(--radius-full);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .health-score-circle.excellent {
    background: var(--success-100);
    border: 3px solid var(--success-500);
  }

  .health-score-circle.good {
    background: var(--primary-100);
    border: 3px solid var(--primary-500);
  }

  .health-score-circle.warning {
    background: var(--warning-100);
    border: 3px solid var(--warning-500);
  }

  .health-score-circle.critical {
    background: var(--danger-100);
    border: 3px solid var(--danger-500);
  }

  .health-score-value {
    font-size: 1.75rem;
    font-weight: 700;
    color: var(--gray-900);
    line-height: 1;
  }

  .health-score-label {
    font-size: 0.75rem;
    color: var(--gray-500);
    margin-top: var(--spacing-1);
  }

  .health-score-details {
    flex: 1;
  }

  .health-score-status {
    margin-bottom: var(--spacing-2);
  }

  .health-score-message {
    font-size: 0.875rem;
    color: var(--gray-600);
    line-height: 1.5;
  }
</style>
