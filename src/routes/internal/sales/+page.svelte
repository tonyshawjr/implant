<script lang="ts">
  import type { PageData } from './$types';
  import { enhance } from '$app/forms';

  let { data }: { data: PageData } = $props();

  // State
  let selectedView = $state<'pipeline' | 'table'>('pipeline');
  let searchQuery = $state('');
  let stageFilter = $state('');
  let showAddProspectModal = $state(false);

  // Helper functions
  function formatCurrency(value: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  }

  function formatDate(dateString: string | null): string {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  }

  function formatRelativeTime(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return formatDate(dateString);
  }

  function getStageLabel(stage: string): string {
    const labels: Record<string, string> = {
      new: 'New',
      qualified: 'Qualified',
      demo_scheduled: 'Demo Scheduled',
      proposal_sent: 'Proposal Sent',
      negotiation: 'Negotiation',
      closed_won: 'Closed Won',
      closed_lost: 'Closed Lost'
    };
    return labels[stage] || stage;
  }

  function getStageBadgeClass(stage: string): string {
    const classes: Record<string, string> = {
      new: 'badge-info',
      qualified: 'badge-primary',
      demo_scheduled: 'badge-warning',
      proposal_sent: 'badge-purple',
      negotiation: 'badge-orange',
      closed_won: 'badge-success',
      closed_lost: 'badge-danger'
    };
    return classes[stage] || 'badge-default';
  }

  function getActivityIcon(type: string): string {
    const icons: Record<string, string> = {
      call: 'M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z',
      email: 'M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z M22 6l-10 7L2 6',
      meeting: 'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2 M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z M23 21v-2a4 4 0 0 0-3-3.87 M16 3.13a4 4 0 0 1 0 7.75',
      note: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6 M16 13H8 M16 17H8 M10 9H8',
      demo: 'M15 10l4.553-2.276A1 1 0 0 1 21 8.618v6.764a1 1 0 0 1-1.447.894L15 14v-4z M5 8h8a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2z'
    };
    return icons[type] || icons.note;
  }

  function getInitials(name: string): string {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }

  // Computed: All prospects flattened for table view
  let allProspects = $derived(
    Object.values(data.prospectsByStage).flat()
  );

  // Computed: Filtered prospects
  let filteredProspects = $derived(
    allProspects.filter(prospect => {
      const matchesSearch = !searchQuery ||
        prospect.practiceName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        prospect.contactName.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStage = !stageFilter || prospect.stage === stageFilter;
      return matchesSearch && matchesStage;
    })
  );

  // Computed: Recent activities across all prospects
  let recentActivities = $derived(
    allProspects
      .flatMap(p => p.recentActivities.map(a => ({ ...a, prospectName: p.practiceName })))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 10)
  );

  // Active pipeline stages (excluding closed)
  const activePipelineStages = ['new', 'qualified', 'demo_scheduled', 'proposal_sent', 'negotiation'];
</script>

<svelte:head>
  <title>Sales Pipeline - ILE Operations</title>
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
    <div class="stat-card-label">Total Prospects</div>
    <div class="stat-card-value">{allProspects.length}</div>
    <div class="stat-card-change neutral">
      {data.stageStats['new']?.count ?? 0} new this week
    </div>
  </div>

  <div class="stat-card">
    <div class="stat-card-header">
      <div class="stat-card-icon success">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="12" y1="1" x2="12" y2="23"/>
          <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
        </svg>
      </div>
    </div>
    <div class="stat-card-label">Pipeline Value</div>
    <div class="stat-card-value">{formatCurrency(data.metrics.totalPipelineValue)}</div>
    <div class="stat-card-change positive">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/>
      </svg>
      Avg deal: {formatCurrency(data.metrics.avgDealSize)}
    </div>
  </div>

  <div class="stat-card">
    <div class="stat-card-header">
      <div class="stat-card-icon warning">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
          <line x1="16" y1="2" x2="16" y2="6"/>
          <line x1="8" y1="2" x2="8" y2="6"/>
          <line x1="3" y1="10" x2="21" y2="10"/>
        </svg>
      </div>
    </div>
    <div class="stat-card-label">Demos Scheduled</div>
    <div class="stat-card-value">{data.stageStats['demo_scheduled']?.count ?? 0}</div>
    <div class="stat-card-change neutral">
      {formatCurrency(data.stageStats['demo_scheduled']?.value ?? 0)} potential
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
    <div class="stat-card-label">Closed Won (MTD)</div>
    <div class="stat-card-value">{data.metrics.closedWonThisMonth.count}</div>
    <div class="stat-card-change positive">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/>
      </svg>
      {formatCurrency(data.metrics.closedWonThisMonth.value)} MRR
    </div>
  </div>

  <div class="stat-card">
    <div class="stat-card-header">
      <div class="stat-card-icon primary">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
        </svg>
      </div>
    </div>
    <div class="stat-card-label">Conversion Rate</div>
    <div class="stat-card-value">{data.metrics.conversionRate.toFixed(1)}%</div>
    <div class="stat-card-change neutral">
      Won vs Lost this month
    </div>
  </div>
</div>

<!-- View Toggle & Filters -->
<div class="filters-bar">
  <div class="filters-top-row">
    <div class="view-toggle">
      <button
        class="view-toggle-btn"
        class:active={selectedView === 'pipeline'}
        onclick={() => selectedView = 'pipeline'}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="3" y="3" width="7" height="7"/>
          <rect x="14" y="3" width="7" height="7"/>
          <rect x="14" y="14" width="7" height="7"/>
          <rect x="3" y="14" width="7" height="7"/>
        </svg>
        <span class="view-toggle-label">Pipeline</span>
      </button>
      <button
        class="view-toggle-btn"
        class:active={selectedView === 'table'}
        onclick={() => selectedView = 'table'}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="8" y1="6" x2="21" y2="6"/>
          <line x1="8" y1="12" x2="21" y2="12"/>
          <line x1="8" y1="18" x2="21" y2="18"/>
          <line x1="3" y1="6" x2="3.01" y2="6"/>
          <line x1="3" y1="12" x2="3.01" y2="12"/>
          <line x1="3" y1="18" x2="3.01" y2="18"/>
        </svg>
        <span class="view-toggle-label">Table</span>
      </button>
    </div>

    <button class="btn btn-primary add-prospect-btn" onclick={() => showAddProspectModal = true}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <line x1="12" y1="5" x2="12" y2="19"/>
        <line x1="5" y1="12" x2="19" y2="12"/>
      </svg>
      <span class="btn-text">Add Prospect</span>
    </button>
  </div>

  <div class="filters-bottom-row">
    <div class="filter-group search-filter">
      <label class="filter-label">Search</label>
      <div style="position: relative;">
        <svg style="position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: var(--gray-400);" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="11" cy="11" r="8"/>
          <line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        <input
          type="text"
          class="form-input filter-input"
          placeholder="Search prospects..."
          style="padding-left: 40px;"
          bind:value={searchQuery}
        >
      </div>
    </div>

    <div class="filter-group stage-filter">
      <label class="filter-label">Stage</label>
      <select class="form-input form-select filter-input" bind:value={stageFilter}>
        <option value="">All Stages</option>
        {#each data.stages as stage}
          <option value={stage}>{getStageLabel(stage)}</option>
        {/each}
      </select>
    </div>
  </div>
</div>

{#if selectedView === 'pipeline'}
  <!-- Pipeline/Kanban View -->
  <div class="pipeline-container">
    {#each activePipelineStages as stage}
      {@const prospects = data.prospectsByStage[stage] || []}
      {@const stats = data.stageStats[stage] || { count: 0, value: 0 }}
      <div class="pipeline-column">
        <div class="pipeline-column-header">
          <div class="pipeline-column-title">
            <span class="stage-dot {stage}"></span>
            {getStageLabel(stage)}
            <span class="stage-count">{stats.count}</span>
          </div>
          <div class="pipeline-column-value">{formatCurrency(stats.value)}</div>
        </div>
        <div class="pipeline-column-body">
          {#each prospects as prospect}
            <div class="prospect-card">
              <div class="prospect-card-header">
                <div class="prospect-avatar">{getInitials(prospect.practiceName)}</div>
                <div class="prospect-info">
                  <div class="prospect-name">{prospect.practiceName}</div>
                  <div class="prospect-contact">{prospect.contactName}</div>
                </div>
              </div>
              {#if prospect.location}
                <div class="prospect-location">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                    <circle cx="12" cy="10" r="3"/>
                  </svg>
                  {prospect.location}
                </div>
              {/if}
              {#if prospect.monthlyValue}
                <div class="prospect-value">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="12" y1="1" x2="12" y2="23"/>
                    <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
                  </svg>
                  {formatCurrency(prospect.monthlyValue)}/mo
                </div>
              {/if}
              <div class="prospect-card-footer">
                {#if prospect.assignedTo}
                  <span class="prospect-assigned">{prospect.assignedTo.name}</span>
                {:else}
                  <span class="prospect-assigned unassigned">Unassigned</span>
                {/if}
                <span class="prospect-date">{formatRelativeTime(prospect.updatedAt)}</span>
              </div>
            </div>
          {:else}
            <div class="pipeline-empty">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              <span>No prospects</span>
            </div>
          {/each}
        </div>
      </div>
    {/each}
  </div>
{:else}
  <!-- Table View -->
  <div class="card">
    <!-- Desktop Table -->
    <div class="table-container desktop-table">
      <table class="table">
        <thead>
          <tr>
            <th>Lead</th>
            <th>Company</th>
            <th>Stage</th>
            <th>Value</th>
            <th>Next Action</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {#if filteredProspects.length > 0}
            {#each filteredProspects as prospect}
              <tr>
                <td>
                  <div class="lead-cell">
                    <div class="lead-avatar">{getInitials(prospect.contactName)}</div>
                    <div class="lead-info">
                      <div class="lead-name">{prospect.contactName}</div>
                      <div class="lead-email">{prospect.contactEmail}</div>
                    </div>
                  </div>
                </td>
                <td>
                  <div class="company-cell">
                    <div class="company-name">{prospect.practiceName}</div>
                    {#if prospect.location}
                      <div class="company-location">{prospect.location}</div>
                    {/if}
                  </div>
                </td>
                <td>
                  <span class="badge {getStageBadgeClass(prospect.stage)}">
                    {getStageLabel(prospect.stage)}
                  </span>
                </td>
                <td>
                  {#if prospect.monthlyValue}
                    <div class="value-cell">
                      <div class="value-amount">{formatCurrency(prospect.monthlyValue)}/mo</div>
                      {#if prospect.probability}
                        <div class="value-probability">{prospect.probability}% prob</div>
                      {/if}
                    </div>
                  {:else}
                    <span class="text-muted">-</span>
                  {/if}
                </td>
                <td>
                  {#if prospect.expectedCloseDate}
                    <div class="next-action">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                        <line x1="16" y1="2" x2="16" y2="6"/>
                        <line x1="8" y1="2" x2="8" y2="6"/>
                        <line x1="3" y1="10" x2="21" y2="10"/>
                      </svg>
                      Close by {formatDate(prospect.expectedCloseDate)}
                    </div>
                  {:else if prospect.recentActivities[0]}
                    <div class="next-action">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="12" cy="12" r="10"/>
                        <polyline points="12 6 12 12 16 14"/>
                      </svg>
                      {prospect.recentActivities[0].subject}
                    </div>
                  {:else}
                    <span class="text-muted">No action scheduled</span>
                  {/if}
                </td>
                <td>
                  <div class="quick-actions">
                    <a href="/internal/sales/{prospect.id}" class="action-btn" title="View Details">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                        <circle cx="12" cy="12" r="3"/>
                      </svg>
                    </a>
                    <button class="action-btn primary" title="Log Activity">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
                      </svg>
                    </button>
                    <button class="action-btn" title="Send Email">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                        <polyline points="22,6 12,13 2,6"/>
                      </svg>
                    </button>
                  </div>
                </td>
              </tr>
            {/each}
          {:else}
            <tr>
              <td colspan="6">
                <div class="empty-state">
                  <div class="empty-state-icon">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                      <circle cx="9" cy="7" r="4"/>
                      <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                      <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                    </svg>
                  </div>
                  <h3 class="empty-state-title">No prospects found</h3>
                  <p class="empty-state-description">
                    {#if searchQuery || stageFilter}
                      Try adjusting your filters.
                    {:else}
                      Get started by adding your first prospect.
                    {/if}
                  </p>
                  <button class="btn btn-primary" onclick={() => showAddProspectModal = true}>Add Prospect</button>
                </div>
              </td>
            </tr>
          {/if}
        </tbody>
      </table>
    </div>

    <!-- Mobile Card List -->
    <div class="mobile-card-list">
      {#if filteredProspects.length > 0}
        {#each filteredProspects as prospect}
          <a href="/internal/sales/{prospect.id}" class="mobile-card-item prospect-mobile-card">
            <div class="mobile-card-header">
              <div class="lead-cell">
                <div class="lead-avatar">{getInitials(prospect.contactName)}</div>
                <div class="lead-info">
                  <div class="lead-name">{prospect.contactName}</div>
                  <div class="lead-email">{prospect.practiceName}</div>
                </div>
              </div>
              <span class="badge {getStageBadgeClass(prospect.stage)}">
                {getStageLabel(prospect.stage)}
              </span>
            </div>
            <div class="mobile-card-content">
              {#if prospect.location}
                <div class="mobile-card-row">
                  <span class="mobile-card-label">Location</span>
                  <span class="text-sm">{prospect.location}</span>
                </div>
              {/if}
              <div class="mobile-card-row">
                <span class="mobile-card-label">Value</span>
                <span class="value-amount">
                  {#if prospect.monthlyValue}
                    {formatCurrency(prospect.monthlyValue)}/mo
                  {:else}
                    -
                  {/if}
                </span>
              </div>
              <div class="mobile-card-row">
                <span class="mobile-card-label">Updated</span>
                <span class="text-sm text-gray-500">{formatRelativeTime(prospect.updatedAt)}</span>
              </div>
            </div>
            <div class="mobile-card-actions">
              <button class="btn btn-sm btn-outline" onclick={(e) => { e.preventDefault(); e.stopPropagation(); }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
                </svg>
                Call
              </button>
              <button class="btn btn-sm btn-outline" onclick={(e) => { e.preventDefault(); e.stopPropagation(); }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                  <polyline points="22,6 12,13 2,6"/>
                </svg>
                Email
              </button>
            </div>
          </a>
        {/each}
      {:else}
        <div class="empty-state-mobile">
          <div class="empty-state-icon">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
          </div>
          <h3 class="empty-state-title">No prospects found</h3>
          <p class="empty-state-description">
            {#if searchQuery || stageFilter}
              Try adjusting your filters.
            {:else}
              Get started by adding your first prospect.
            {/if}
          </p>
          <button class="btn btn-primary" onclick={() => showAddProspectModal = true}>Add Prospect</button>
        </div>
      {/if}
    </div>
  </div>
{/if}

<!-- Recent Activities Section -->
<div class="section-header">
  <h2 class="section-title">Recent Sales Activities</h2>
</div>

<div class="card">
  <div class="activities-list">
    {#if recentActivities.length > 0}
      {#each recentActivities as activity}
        <div class="activity-item">
          <div class="activity-icon">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d={getActivityIcon(activity.type)}/>
            </svg>
          </div>
          <div class="activity-content">
            <div class="activity-header">
              <span class="activity-type">{activity.type}</span>
              <span class="activity-time">{formatRelativeTime(activity.createdAt)}</span>
            </div>
            <div class="activity-subject">{activity.subject}</div>
            <div class="activity-meta">
              <span class="activity-prospect">{activity.prospectName}</span>
              {#if activity.performedBy}
                <span class="activity-separator">by</span>
                <span class="activity-user">{activity.performedBy}</span>
              {/if}
            </div>
          </div>
        </div>
      {/each}
    {:else}
      <div class="activities-empty">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/>
          <polyline points="12 6 12 12 16 14"/>
        </svg>
        <span>No recent activities</span>
      </div>
    {/if}
  </div>
</div>

<!-- Add Prospect Modal -->
{#if showAddProspectModal}
  <div class="modal-backdrop" onclick={() => showAddProspectModal = false}>
    <div class="modal" onclick={(e) => e.stopPropagation()}>
      <div class="modal-header">
        <h3 class="modal-title">Add New Prospect</h3>
        <button class="modal-close" onclick={() => showAddProspectModal = false}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>
      <form method="POST" action="?/createProspect" use:enhance={() => {
        return async ({ result }) => {
          if (result.type === 'success') {
            showAddProspectModal = false;
          }
        };
      }}>
        <div class="modal-body">
          <div class="form-grid">
            <div class="form-group full-width">
              <label class="form-label">Practice Name *</label>
              <input type="text" name="practiceName" class="form-input" required>
            </div>
            <div class="form-group">
              <label class="form-label">First Name *</label>
              <input type="text" name="contactFirstName" class="form-input" required>
            </div>
            <div class="form-group">
              <label class="form-label">Last Name *</label>
              <input type="text" name="contactLastName" class="form-input" required>
            </div>
            <div class="form-group">
              <label class="form-label">Email *</label>
              <input type="email" name="contactEmail" class="form-input" required>
            </div>
            <div class="form-group">
              <label class="form-label">Phone</label>
              <input type="tel" name="contactPhone" class="form-input">
            </div>
            <div class="form-group">
              <label class="form-label">City</label>
              <input type="text" name="city" class="form-input">
            </div>
            <div class="form-group">
              <label class="form-label">State</label>
              <input type="text" name="state" class="form-input">
            </div>
            <div class="form-group">
              <label class="form-label">Source *</label>
              <select name="source" class="form-input form-select" required>
                <option value="">Select source...</option>
                <option value="website">Website</option>
                <option value="referral">Referral</option>
                <option value="cold_outreach">Cold Outreach</option>
                <option value="trade_show">Trade Show</option>
                <option value="advertising">Advertising</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Est. Monthly Value</label>
              <input type="number" name="monthlyValue" class="form-input" placeholder="2500">
            </div>
            <div class="form-group">
              <label class="form-label">Assign To</label>
              <select name="assignedTo" class="form-input form-select">
                <option value="">Unassigned</option>
                {#each data.salesUsers as user}
                  <option value={user.id}>{user.name}</option>
                {/each}
              </select>
            </div>
            <div class="form-group full-width">
              <label class="form-label">Notes</label>
              <textarea name="notes" class="form-input form-textarea" rows="3"></textarea>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" onclick={() => showAddProspectModal = false}>Cancel</button>
          <button type="submit" class="btn btn-primary">Add Prospect</button>
        </div>
      </form>
    </div>
  </div>
{/if}

<style>
  .stats-row {
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    gap: var(--spacing-6);
    margin-bottom: var(--spacing-6);
  }

  @media (max-width: 1400px) {
    .stats-row {
      grid-template-columns: repeat(3, 1fr);
    }
  }

  @media (max-width: 900px) {
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

  .filters-bar {
    display: flex;
    gap: var(--spacing-4);
    flex-wrap: wrap;
    align-items: flex-end;
    padding: var(--spacing-4) var(--spacing-5);
    background: white;
    border-radius: var(--radius-xl);
    border: 1px solid var(--gray-200);
    margin-bottom: var(--spacing-6);
  }

  .view-toggle {
    display: flex;
    background: var(--gray-100);
    border-radius: var(--radius-lg);
    padding: 4px;
  }

  .view-toggle-btn {
    display: flex;
    align-items: center;
    gap: var(--spacing-2);
    padding: 8px 16px;
    border: none;
    background: transparent;
    border-radius: var(--radius-md);
    font-size: 0.875rem;
    font-weight: 500;
    color: var(--gray-600);
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .view-toggle-btn:hover {
    color: var(--gray-900);
  }

  .view-toggle-btn.active {
    background: white;
    color: var(--gray-900);
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  }

  .filter-group {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-1);
  }

  .filter-label {
    font-size: 0.75rem;
    font-weight: 500;
    color: var(--gray-500);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .filter-input {
    min-width: 180px;
  }

  .search-filter {
    flex: 1;
    min-width: 250px;
  }

  /* Pipeline View */
  .pipeline-container {
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    gap: var(--spacing-4);
    overflow-x: auto;
    padding-bottom: var(--spacing-4);
  }

  @media (max-width: 1200px) {
    .pipeline-container {
      grid-template-columns: repeat(5, minmax(260px, 1fr));
    }
  }

  .pipeline-column {
    background: var(--gray-50);
    border-radius: var(--radius-xl);
    min-height: 400px;
    display: flex;
    flex-direction: column;
  }

  .pipeline-column-header {
    padding: var(--spacing-4);
    border-bottom: 1px solid var(--gray-200);
  }

  .pipeline-column-title {
    display: flex;
    align-items: center;
    gap: var(--spacing-2);
    font-weight: 600;
    color: var(--gray-900);
    margin-bottom: var(--spacing-1);
  }

  .stage-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
  }

  .stage-dot.new { background: var(--primary-500); }
  .stage-dot.qualified { background: var(--primary-600); }
  .stage-dot.demo_scheduled { background: var(--warning-500); }
  .stage-dot.proposal_sent { background: #8b5cf6; }
  .stage-dot.negotiation { background: #f97316; }
  .stage-dot.closed_won { background: var(--success-500); }
  .stage-dot.closed_lost { background: var(--danger-500); }

  .stage-count {
    margin-left: auto;
    background: var(--gray-200);
    color: var(--gray-700);
    font-size: 0.75rem;
    font-weight: 600;
    padding: 2px 8px;
    border-radius: var(--radius-full);
  }

  .pipeline-column-value {
    font-size: 0.75rem;
    color: var(--gray-500);
  }

  .pipeline-column-body {
    padding: var(--spacing-3);
    flex: 1;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: var(--spacing-3);
  }

  .prospect-card {
    background: white;
    border-radius: var(--radius-lg);
    padding: var(--spacing-4);
    border: 1px solid var(--gray-200);
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .prospect-card:hover {
    border-color: var(--primary-300);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  }

  .prospect-card-header {
    display: flex;
    gap: var(--spacing-3);
    margin-bottom: var(--spacing-3);
  }

  .prospect-avatar {
    width: 36px;
    height: 36px;
    border-radius: var(--radius-lg);
    background: var(--primary-100);
    color: var(--primary-700);
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 600;
    font-size: 0.75rem;
    flex-shrink: 0;
  }

  .prospect-info {
    flex: 1;
    min-width: 0;
  }

  .prospect-name {
    font-weight: 600;
    color: var(--gray-900);
    font-size: 0.875rem;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .prospect-contact {
    font-size: 0.75rem;
    color: var(--gray-500);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .prospect-location,
  .prospect-value {
    display: flex;
    align-items: center;
    gap: var(--spacing-2);
    font-size: 0.75rem;
    color: var(--gray-600);
    margin-bottom: var(--spacing-2);
  }

  .prospect-value {
    color: var(--success-600);
    font-weight: 500;
  }

  .prospect-card-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding-top: var(--spacing-3);
    border-top: 1px solid var(--gray-100);
    margin-top: var(--spacing-2);
  }

  .prospect-assigned {
    font-size: 0.75rem;
    color: var(--gray-700);
    font-weight: 500;
  }

  .prospect-assigned.unassigned {
    color: var(--gray-400);
    font-style: italic;
  }

  .prospect-date {
    font-size: 0.75rem;
    color: var(--gray-400);
  }

  .pipeline-empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: var(--spacing-2);
    padding: var(--spacing-8);
    color: var(--gray-400);
    font-size: 0.875rem;
  }

  /* Table View */
  .lead-cell {
    display: flex;
    align-items: center;
    gap: var(--spacing-3);
  }

  .lead-avatar {
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

  .lead-info {
    display: flex;
    flex-direction: column;
  }

  .lead-name {
    font-weight: 500;
    color: var(--gray-900);
  }

  .lead-email {
    font-size: 0.75rem;
    color: var(--gray-500);
  }

  .company-cell {
    display: flex;
    flex-direction: column;
  }

  .company-name {
    font-weight: 500;
    color: var(--gray-900);
  }

  .company-location {
    font-size: 0.75rem;
    color: var(--gray-500);
  }

  .badge {
    display: inline-flex;
    align-items: center;
    padding: 4px 10px;
    border-radius: var(--radius-full);
    font-size: 0.75rem;
    font-weight: 500;
  }

  .badge-info {
    background: var(--primary-100);
    color: var(--primary-700);
  }

  .badge-primary {
    background: var(--primary-100);
    color: var(--primary-700);
  }

  .badge-warning {
    background: var(--warning-100);
    color: var(--warning-700);
  }

  .badge-purple {
    background: #ede9fe;
    color: #6d28d9;
  }

  .badge-orange {
    background: #ffedd5;
    color: #c2410c;
  }

  .badge-success {
    background: var(--success-100);
    color: var(--success-700);
  }

  .badge-danger {
    background: var(--danger-100);
    color: var(--danger-700);
  }

  .badge-default {
    background: var(--gray-100);
    color: var(--gray-700);
  }

  .value-cell {
    display: flex;
    flex-direction: column;
  }

  .value-amount {
    font-weight: 500;
    color: var(--gray-900);
  }

  .value-probability {
    font-size: 0.75rem;
    color: var(--gray-500);
  }

  .next-action {
    display: flex;
    align-items: center;
    gap: var(--spacing-2);
    font-size: 0.875rem;
    color: var(--gray-600);
  }

  .text-muted {
    color: var(--gray-400);
  }

  .quick-actions {
    display: flex;
    gap: var(--spacing-2);
  }

  .action-btn {
    width: 32px;
    height: 32px;
    border-radius: var(--radius-md);
    display: flex;
    align-items: center;
    justify-content: center;
    border: 1px solid var(--gray-200);
    background: white;
    color: var(--gray-500);
    cursor: pointer;
    transition: all 0.2s ease;
    text-decoration: none;
  }

  .action-btn:hover {
    background: var(--gray-50);
    color: var(--gray-700);
    border-color: var(--gray-300);
  }

  .action-btn.primary:hover {
    background: var(--primary-50);
    color: var(--primary-600);
    border-color: var(--primary-200);
  }

  /* Section Header */
  .section-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-top: var(--spacing-8);
    margin-bottom: var(--spacing-4);
  }

  .section-title {
    font-size: 1.125rem;
    font-weight: 600;
    color: var(--gray-900);
  }

  /* Activities List */
  .activities-list {
    padding: var(--spacing-4);
  }

  .activity-item {
    display: flex;
    gap: var(--spacing-4);
    padding: var(--spacing-4);
    border-bottom: 1px solid var(--gray-100);
  }

  .activity-item:last-child {
    border-bottom: none;
  }

  .activity-icon {
    width: 36px;
    height: 36px;
    border-radius: var(--radius-lg);
    background: var(--gray-100);
    color: var(--gray-600);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .activity-content {
    flex: 1;
    min-width: 0;
  }

  .activity-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: var(--spacing-1);
  }

  .activity-type {
    font-size: 0.75rem;
    text-transform: uppercase;
    font-weight: 600;
    color: var(--primary-600);
    letter-spacing: 0.05em;
  }

  .activity-time {
    font-size: 0.75rem;
    color: var(--gray-400);
  }

  .activity-subject {
    font-weight: 500;
    color: var(--gray-900);
    margin-bottom: var(--spacing-1);
  }

  .activity-meta {
    font-size: 0.75rem;
    color: var(--gray-500);
  }

  .activity-prospect {
    font-weight: 500;
  }

  .activity-separator {
    margin: 0 var(--spacing-1);
  }

  .activities-empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: var(--spacing-2);
    padding: var(--spacing-8);
    color: var(--gray-400);
    font-size: 0.875rem;
  }

  /* Modal */
  .modal-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
  }

  .modal {
    background: white;
    border-radius: var(--radius-xl);
    width: 100%;
    max-width: 600px;
    max-height: 90vh;
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }

  .modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--spacing-5);
    border-bottom: 1px solid var(--gray-200);
  }

  .modal-title {
    font-size: 1.125rem;
    font-weight: 600;
    color: var(--gray-900);
  }

  .modal-close {
    width: 32px;
    height: 32px;
    border-radius: var(--radius-md);
    display: flex;
    align-items: center;
    justify-content: center;
    border: none;
    background: transparent;
    color: var(--gray-400);
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .modal-close:hover {
    background: var(--gray-100);
    color: var(--gray-600);
  }

  .modal-body {
    padding: var(--spacing-5);
    overflow-y: auto;
  }

  .modal-footer {
    display: flex;
    justify-content: flex-end;
    gap: var(--spacing-3);
    padding: var(--spacing-5);
    border-top: 1px solid var(--gray-200);
  }

  .form-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: var(--spacing-4);
  }

  .form-group {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-1);
  }

  .form-group.full-width {
    grid-column: span 2;
  }

  .form-label {
    font-size: 0.875rem;
    font-weight: 500;
    color: var(--gray-700);
  }

  .form-textarea {
    resize: vertical;
  }

  /* Empty State */
  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: var(--spacing-12);
    text-align: center;
  }

  .empty-state-icon {
    width: 64px;
    height: 64px;
    border-radius: 50%;
    background: var(--gray-100);
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--gray-400);
    margin-bottom: var(--spacing-4);
  }

  .empty-state-title {
    font-size: 1rem;
    font-weight: 600;
    color: var(--gray-900);
    margin-bottom: var(--spacing-2);
  }

  .empty-state-description {
    font-size: 0.875rem;
    color: var(--gray-500);
    margin-bottom: var(--spacing-4);
  }

  /* Mobile Responsive Styles */
  .filters-top-row {
    display: contents;
  }

  .filters-bottom-row {
    display: contents;
  }

  .add-prospect-btn {
    margin-left: auto;
  }

  .desktop-table {
    display: block;
  }

  .mobile-card-list {
    display: none;
  }

  @media (max-width: 768px) {
    /* Filters bar mobile */
    .filters-bar {
      flex-direction: column;
      gap: var(--spacing-3);
      padding: var(--spacing-4);
    }

    .filters-top-row {
      display: flex;
      width: 100%;
      justify-content: space-between;
      align-items: center;
      gap: var(--spacing-3);
    }

    .filters-bottom-row {
      display: flex;
      flex-direction: column;
      width: 100%;
      gap: var(--spacing-3);
    }

    .view-toggle {
      flex-shrink: 0;
    }

    .view-toggle-btn {
      padding: 8px 12px;
      min-height: 44px;
    }

    .view-toggle-label {
      display: none;
    }

    .add-prospect-btn {
      min-height: 44px;
      padding: 0 var(--spacing-3);
    }

    .add-prospect-btn .btn-text {
      display: none;
    }

    .filter-group {
      width: 100%;
    }

    .search-filter,
    .stage-filter {
      flex: 1;
      min-width: 0;
    }

    .filter-input {
      min-width: 0;
      width: 100%;
    }

    /* Pipeline container mobile */
    .pipeline-container {
      display: flex;
      overflow-x: auto;
      -webkit-overflow-scrolling: touch;
      scroll-snap-type: x mandatory;
      gap: var(--spacing-3);
      padding: var(--spacing-2);
      margin: 0 calc(-1 * var(--spacing-4));
      padding-left: var(--spacing-4);
      padding-right: var(--spacing-4);
    }

    .pipeline-column {
      flex: 0 0 280px;
      scroll-snap-align: start;
      min-height: 300px;
    }

    .prospect-card {
      padding: var(--spacing-3);
    }

    /* Table/Card toggle */
    .desktop-table {
      display: none;
    }

    .mobile-card-list {
      display: flex;
      flex-direction: column;
      gap: var(--spacing-3);
      padding: var(--spacing-4);
    }

    .mobile-card-item {
      background: white;
      border: 1px solid var(--gray-200);
      border-radius: var(--radius-lg);
      padding: var(--spacing-4);
      text-decoration: none;
      color: inherit;
    }

    .prospect-mobile-card:active {
      background: var(--gray-50);
    }

    .mobile-card-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: var(--spacing-3);
      margin-bottom: var(--spacing-3);
    }

    .mobile-card-header .lead-cell {
      flex: 1;
      min-width: 0;
    }

    .mobile-card-header .lead-avatar {
      width: 44px;
      height: 44px;
      font-size: 0.9375rem;
    }

    .mobile-card-header .lead-name {
      font-size: 1rem;
    }

    .mobile-card-content {
      display: flex;
      flex-direction: column;
      gap: var(--spacing-3);
      padding-top: var(--spacing-3);
      border-top: 1px solid var(--gray-100);
      margin-bottom: var(--spacing-3);
    }

    .mobile-card-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .mobile-card-label {
      font-size: 0.75rem;
      font-weight: 500;
      color: var(--gray-500);
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .mobile-card-actions {
      display: flex;
      gap: var(--spacing-2);
      padding-top: var(--spacing-3);
      border-top: 1px solid var(--gray-100);
    }

    .mobile-card-actions .btn {
      flex: 1;
      justify-content: center;
      min-height: 44px;
    }

    /* Empty state mobile */
    .empty-state-mobile {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: var(--spacing-8) var(--spacing-4);
      text-align: center;
    }

    /* Activities on mobile */
    .activity-item {
      padding: var(--spacing-3);
    }

    .activity-header {
      flex-direction: column;
      align-items: flex-start;
      gap: var(--spacing-1);
    }

    /* Modal mobile */
    .modal-backdrop {
      padding: var(--spacing-4);
      align-items: flex-end;
    }

    .modal {
      max-width: none;
      width: 100%;
      max-height: calc(100vh - var(--spacing-8));
      border-radius: var(--radius-xl) var(--radius-xl) 0 0;
    }

    .modal-body {
      max-height: calc(100vh - 200px);
      overflow-y: auto;
    }

    .form-grid {
      grid-template-columns: 1fr;
    }

    .form-group.full-width {
      grid-column: span 1;
    }

    .modal-footer {
      flex-direction: column;
      gap: var(--spacing-2);
    }

    .modal-footer .btn {
      width: 100%;
      min-height: 44px;
    }

    /* Section header */
    .section-header {
      margin-top: var(--spacing-6);
    }
  }

  @media (max-width: 480px) {
    .stats-row {
      gap: var(--spacing-3);
    }

    .pipeline-column {
      flex: 0 0 260px;
    }
  }
</style>
