<script lang="ts">
  import type { PageData } from './$types';
  import { goto } from '$app/navigation';

  let { data }: { data: PageData } = $props();

  // Local state for filters
  let searchValue = $state(data.filters.search);
  let statusFilter = $state(data.filters.status);
  let stateFilter = $state(data.filters.state);
  let typeFilter = $state(data.filters.type);

  // Modal state
  let showAddModal = $state(false);
  let selectedTerritory = $state<typeof data.territories[0] | null>(null);

  // Helper functions
  function formatCurrency(value: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  }

  function formatNumber(num: number): string {
    return new Intl.NumberFormat('en-US').format(num);
  }

  function getStatusClass(status: string): string {
    switch (status) {
      case 'locked': return 'locked';
      case 'available': return 'available';
      case 'waitlist': return 'waitlist';
      default: return 'default';
    }
  }

  function getStatusLabel(status: string): string {
    switch (status) {
      case 'locked': return 'Assigned';
      case 'available': return 'Available';
      case 'waitlist': return 'Waitlist';
      default: return status;
    }
  }

  function getHealthClass(score: number): string {
    if (score >= 85) return 'excellent';
    if (score >= 70) return 'good';
    if (score >= 50) return 'warning';
    return 'critical';
  }

  function getInitials(name: string): string {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }

  function applyFilters() {
    const params = new URLSearchParams();
    if (searchValue) params.set('search', searchValue);
    if (statusFilter) params.set('status', statusFilter);
    if (stateFilter) params.set('state', stateFilter);
    if (typeFilter) params.set('type', typeFilter);
    goto(`?${params.toString()}`);
  }

  function handleSearch(event: KeyboardEvent) {
    if (event.key === 'Enter') {
      applyFilters();
    }
  }

  function clearFilters() {
    searchValue = '';
    statusFilter = '';
    stateFilter = '';
    typeFilter = '';
    goto('?');
  }

  function viewTerritory(territory: typeof data.territories[0]) {
    selectedTerritory = territory;
  }

  function closeDetailPanel() {
    selectedTerritory = null;
  }
</script>

<svelte:head>
  <title>Territory Management - SqueezMedia Operations</title>
</svelte:head>

<!-- Stats Row -->
<div class="stats-row">
  <div class="stat-card">
    <div class="stat-card-header">
      <div class="stat-card-icon primary">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
          <circle cx="12" cy="10" r="3"/>
        </svg>
      </div>
    </div>
    <div class="stat-card-label">Total Territories</div>
    <div class="stat-card-value">{data.stats.total}</div>
    <div class="stat-card-change neutral">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10"/>
        <polyline points="12 6 12 12 16 14"/>
      </svg>
      Managed regions
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
    <div class="stat-card-label">Available</div>
    <div class="stat-card-value">{data.stats.available}</div>
    <div class="stat-card-change positive">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/>
      </svg>
      Ready for assignment
    </div>
  </div>

  <div class="stat-card">
    <div class="stat-card-header">
      <div class="stat-card-icon warning">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
          <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
        </svg>
      </div>
    </div>
    <div class="stat-card-label">Assigned</div>
    <div class="stat-card-value">{data.stats.locked}</div>
    <div class="stat-card-change positive">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/>
      </svg>
      Active clients
    </div>
  </div>

  <div class="stat-card">
    <div class="stat-card-header">
      <div class="stat-card-icon danger">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
          <circle cx="9" cy="7" r="4"/>
          <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
          <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
        </svg>
      </div>
    </div>
    <div class="stat-card-label">Waitlist</div>
    <div class="stat-card-value">{data.stats.totalWaitlistEntries}</div>
    <div class="stat-card-change neutral">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10"/>
        <polyline points="12 6 12 12 16 14"/>
      </svg>
      Prospects waiting
    </div>
  </div>
</div>

<!-- Map Placeholder and Revenue Card -->
<div class="map-revenue-row">
  <div class="card map-card">
    <div class="card-header">
      <h3 class="card-title">Territory Map</h3>
      <span class="badge badge-info">Interactive</span>
    </div>
    <div class="map-placeholder">
      <div class="map-placeholder-content">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
          <circle cx="12" cy="10" r="3"/>
        </svg>
        <p class="map-placeholder-text">Territory map visualization</p>
        <p class="map-placeholder-subtext">Showing {data.stats.total} territories across {data.states.length} states</p>
        <div class="map-legend">
          <div class="legend-item">
            <span class="legend-dot available"></span>
            <span>Available ({data.stats.available})</span>
          </div>
          <div class="legend-item">
            <span class="legend-dot locked"></span>
            <span>Assigned ({data.stats.locked})</span>
          </div>
          <div class="legend-item">
            <span class="legend-dot waitlist"></span>
            <span>Waitlist ({data.stats.waitlist})</span>
          </div>
        </div>
      </div>
    </div>
  </div>

  <div class="card revenue-card">
    <div class="card-header">
      <h3 class="card-title">Revenue Summary</h3>
    </div>
    <div class="card-body">
      <div class="revenue-stat">
        <div class="revenue-label">Monthly Recurring Revenue</div>
        <div class="revenue-value">{formatCurrency(data.stats.monthlyRevenue)}</div>
      </div>
      <div class="revenue-breakdown">
        <div class="breakdown-item">
          <span class="breakdown-label">Avg per Territory</span>
          <span class="breakdown-value">
            {data.stats.locked > 0 ? formatCurrency(data.stats.monthlyRevenue / data.stats.locked) : '$0'}
          </span>
        </div>
        <div class="breakdown-item">
          <span class="breakdown-label">Utilization Rate</span>
          <span class="breakdown-value">
            {data.stats.total > 0 ? Math.round((data.stats.locked / data.stats.total) * 100) : 0}%
          </span>
        </div>
        <div class="breakdown-item">
          <span class="breakdown-label">Waitlist Demand</span>
          <span class="breakdown-value">
            {data.stats.totalWaitlistEntries} prospects
          </span>
        </div>
      </div>
    </div>
  </div>
</div>

<!-- Filters Bar -->
<div class="filters-bar">
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
        placeholder="Search territories, cities, zip codes..."
        style="padding-left: 40px;"
        bind:value={searchValue}
        onkeydown={handleSearch}
      >
    </div>
  </div>
  <div class="filter-group">
    <label class="filter-label">Status</label>
    <select class="form-input form-select filter-input" bind:value={statusFilter} onchange={applyFilters}>
      <option value="">All Status</option>
      <option value="available">Available</option>
      <option value="locked">Assigned</option>
      <option value="waitlist">Waitlist</option>
    </select>
  </div>
  <div class="filter-group">
    <label class="filter-label">State</label>
    <select class="form-input form-select filter-input" bind:value={stateFilter} onchange={applyFilters}>
      <option value="">All States</option>
      {#each data.states as state}
        <option value={state}>{state}</option>
      {/each}
    </select>
  </div>
  <div class="filter-group">
    <label class="filter-label">Type</label>
    <select class="form-input form-select filter-input" bind:value={typeFilter} onchange={applyFilters}>
      <option value="">All Types</option>
      <option value="city">City</option>
      <option value="county">County</option>
      <option value="metro">Metro</option>
    </select>
  </div>
  {#if searchValue || statusFilter || stateFilter || typeFilter}
    <div class="filter-group">
      <label class="filter-label">&nbsp;</label>
      <button class="btn btn-outline" onclick={clearFilters}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="18" y1="6" x2="6" y2="18"/>
          <line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
        Clear
      </button>
    </div>
  {/if}
  <div class="filter-group filter-group-action">
    <label class="filter-label">&nbsp;</label>
    <button class="btn btn-primary" onclick={() => showAddModal = true}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <line x1="12" y1="5" x2="12" y2="19"/>
        <line x1="5" y1="12" x2="19" y2="12"/>
      </svg>
      Add Territory
    </button>
  </div>
</div>

<!-- Territories Table -->
<div class="card">
  <div class="card-header">
    <h3 class="card-title">All Territories</h3>
    <span class="card-subtitle">{data.pagination.total} total territories</span>
  </div>
  <div class="table-container">
    <table class="table">
      <thead>
        <tr>
          <th>Name</th>
          <th>Location</th>
          <th>Status</th>
          <th>Assigned Client</th>
          <th>Monthly Value</th>
          <th>Waitlist</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        {#if data.territories && data.territories.length > 0}
          {#each data.territories as territory}
            <tr>
              <td>
                <div class="territory-name-cell">
                  <div class="territory-icon">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                      <circle cx="12" cy="10" r="3"/>
                    </svg>
                  </div>
                  <div class="territory-info">
                    <div class="territory-name">{territory.name}</div>
                    <div class="territory-type">{territory.type || 'Standard'} - {territory.radiusMiles} mi radius</div>
                  </div>
                </div>
              </td>
              <td>
                <div class="location-cell">
                  <div class="location-primary">{territory.city}, {territory.state}</div>
                  {#if territory.population}
                    <div class="location-secondary">Pop: {formatNumber(territory.population)}</div>
                  {/if}
                </div>
              </td>
              <td>
                <span class="status-badge {getStatusClass(territory.status)}">
                  {getStatusLabel(territory.status)}
                </span>
              </td>
              <td>
                {#if territory.client}
                  <div class="client-cell">
                    <div class="client-avatar">{getInitials(territory.client.name)}</div>
                    <div class="client-info">
                      <a href="/internal/clients/{territory.client.id}" class="client-name">
                        {territory.client.name}
                      </a>
                      <div class="client-health">
                        <span class="health-dot {getHealthClass(territory.client.healthScore)}"></span>
                        Health: {territory.client.healthScore}
                      </div>
                    </div>
                  </div>
                {:else}
                  <span class="no-client">--</span>
                {/if}
              </td>
              <td>
                {#if territory.client}
                  <div class="value-cell">
                    <div class="value-primary">{formatCurrency(territory.client.monthlyRate)}</div>
                    <div class="value-secondary">per month</div>
                  </div>
                {:else if territory.monthlyBasePrice}
                  <div class="value-cell">
                    <div class="value-base">{formatCurrency(territory.monthlyBasePrice)}</div>
                    <div class="value-secondary">base price</div>
                  </div>
                {:else}
                  <span class="no-value">--</span>
                {/if}
              </td>
              <td>
                {#if territory.counts.waitlist > 0}
                  <div class="waitlist-cell">
                    <span class="waitlist-badge">{territory.counts.waitlist}</span>
                    <span class="waitlist-label">waiting</span>
                  </div>
                {:else}
                  <span class="no-waitlist">--</span>
                {/if}
              </td>
              <td>
                <div class="quick-actions">
                  <button class="action-btn" title="View Details" onclick={() => viewTerritory(territory)}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                      <circle cx="12" cy="12" r="3"/>
                    </svg>
                  </button>
                  <button class="action-btn primary" title="Edit Territory">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                    </svg>
                  </button>
                  <button class="action-btn" title="View on Map">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/>
                      <line x1="8" y1="2" x2="8" y2="18"/>
                      <line x1="16" y1="6" x2="16" y2="22"/>
                    </svg>
                  </button>
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
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                    <circle cx="12" cy="10" r="3"/>
                  </svg>
                </div>
                <h3 class="empty-state-title">No territories found</h3>
                <p class="empty-state-description">
                  {#if searchValue || statusFilter || stateFilter || typeFilter}
                    Try adjusting your filters or search term.
                  {:else}
                    Get started by adding your first territory.
                  {/if}
                </p>
                {#if searchValue || statusFilter || stateFilter || typeFilter}
                  <button class="btn btn-outline" onclick={clearFilters}>Clear Filters</button>
                {:else}
                  <button class="btn btn-primary" onclick={() => showAddModal = true}>Add Territory</button>
                {/if}
              </div>
            </td>
          </tr>
        {/if}
      </tbody>
    </table>
  </div>

  <!-- Pagination -->
  {#if data.pagination.totalPages > 1}
    <div class="pagination">
      <div class="pagination-info">
        Showing {((data.pagination.page - 1) * data.pagination.limit) + 1} to {Math.min(data.pagination.page * data.pagination.limit, data.pagination.total)} of {data.pagination.total} territories
      </div>
      <div class="pagination-controls">
        <button
          class="pagination-btn"
          disabled={data.pagination.page === 1}
          onclick={() => goto(`?page=${data.pagination.page - 1}`)}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </button>
        {#each Array.from({ length: Math.min(5, data.pagination.totalPages) }, (_, i) => {
          const start = Math.max(1, Math.min(data.pagination.page - 2, data.pagination.totalPages - 4));
          return start + i;
        }) as pageNum}
          <button
            class="pagination-btn {pageNum === data.pagination.page ? 'active' : ''}"
            onclick={() => goto(`?page=${pageNum}`)}
          >
            {pageNum}
          </button>
        {/each}
        <button
          class="pagination-btn"
          disabled={data.pagination.page === data.pagination.totalPages}
          onclick={() => goto(`?page=${data.pagination.page + 1}`)}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="9 18 15 12 9 6"/>
          </svg>
        </button>
      </div>
    </div>
  {/if}
</div>

<!-- Territory Detail Slide Panel -->
{#if selectedTerritory}
  <div class="detail-overlay" onclick={closeDetailPanel}></div>
  <div class="detail-panel">
    <div class="detail-header">
      <h2 class="detail-title">{selectedTerritory.name}</h2>
      <button class="close-btn" onclick={closeDetailPanel}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="18" y1="6" x2="6" y2="18"/>
          <line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
    </div>
    <div class="detail-body">
      <div class="detail-section">
        <h4 class="detail-section-title">Location Details</h4>
        <div class="detail-grid">
          <div class="detail-item">
            <span class="detail-label">City</span>
            <span class="detail-value">{selectedTerritory.city}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">State</span>
            <span class="detail-value">{selectedTerritory.state}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">Type</span>
            <span class="detail-value">{selectedTerritory.type || 'Standard'}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">Radius</span>
            <span class="detail-value">{selectedTerritory.radiusMiles} miles</span>
          </div>
        </div>
      </div>

      <div class="detail-section">
        <h4 class="detail-section-title">Demographics</h4>
        <div class="detail-grid">
          <div class="detail-item">
            <span class="detail-label">Population</span>
            <span class="detail-value">{selectedTerritory.population ? formatNumber(selectedTerritory.population) : '--'}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">Households</span>
            <span class="detail-value">{selectedTerritory.households ? formatNumber(selectedTerritory.households) : '--'}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">Median Age</span>
            <span class="detail-value">{selectedTerritory.medianAge ?? '--'}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">Median Income</span>
            <span class="detail-value">{selectedTerritory.medianIncome ? formatCurrency(selectedTerritory.medianIncome) : '--'}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">Implant Candidates</span>
            <span class="detail-value">{selectedTerritory.implantCandidates ? formatNumber(selectedTerritory.implantCandidates) : '--'}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">Competition</span>
            <span class="detail-value">{selectedTerritory.competitionCount ?? '--'} providers</span>
          </div>
        </div>
      </div>

      {#if selectedTerritory.client}
        <div class="detail-section">
          <h4 class="detail-section-title">Assigned Client</h4>
          <div class="assigned-client-card">
            <div class="client-avatar large">{getInitials(selectedTerritory.client.name)}</div>
            <div class="assigned-client-info">
              <a href="/internal/clients/{selectedTerritory.client.id}" class="assigned-client-name">
                {selectedTerritory.client.name}
              </a>
              <div class="assigned-client-meta">
                <span class="health-badge {getHealthClass(selectedTerritory.client.healthScore)}">
                  Health: {selectedTerritory.client.healthScore}
                </span>
                <span class="monthly-rate">{formatCurrency(selectedTerritory.client.monthlyRate)}/mo</span>
              </div>
            </div>
          </div>
        </div>
      {/if}

      {#if selectedTerritory.waitlist && selectedTerritory.waitlist.length > 0}
        <div class="detail-section">
          <h4 class="detail-section-title">Waitlist ({selectedTerritory.counts.waitlist})</h4>
          <div class="waitlist-list">
            {#each selectedTerritory.waitlist as entry}
              <div class="waitlist-entry">
                <div class="waitlist-position">#{entry.position}</div>
                <div class="waitlist-contact">
                  <div class="waitlist-name">{entry.contactName}</div>
                  <div class="waitlist-email">{entry.contactEmail}</div>
                  {#if entry.practiceName}
                    <div class="waitlist-practice">{entry.practiceName}</div>
                  {/if}
                </div>
              </div>
            {/each}
          </div>
        </div>
      {/if}

      <div class="detail-section">
        <h4 class="detail-section-title">Performance</h4>
        <div class="detail-grid">
          <div class="detail-item">
            <span class="detail-label">Total Leads</span>
            <span class="detail-value">{selectedTerritory.counts.leads}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">Campaigns</span>
            <span class="detail-value">{selectedTerritory.counts.campaigns}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">Performance Score</span>
            <span class="detail-value">{selectedTerritory.performanceScore ?? '--'}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">Base Price</span>
            <span class="detail-value">{selectedTerritory.monthlyBasePrice ? formatCurrency(selectedTerritory.monthlyBasePrice) : '--'}</span>
          </div>
        </div>
      </div>
    </div>
    <div class="detail-footer">
      <button class="btn btn-outline" onclick={closeDetailPanel}>Close</button>
      <a href="/internal/territories/{selectedTerritory.id}" class="btn btn-primary">View Full Details</a>
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

  /* Map and Revenue Row */
  .map-revenue-row {
    display: grid;
    grid-template-columns: 2fr 1fr;
    gap: var(--spacing-6);
    margin-bottom: var(--spacing-6);
  }

  @media (max-width: 1024px) {
    .map-revenue-row {
      grid-template-columns: 1fr;
    }
  }

  .map-card {
    min-height: 300px;
  }

  .map-placeholder {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 240px;
    background: linear-gradient(135deg, var(--gray-50) 0%, var(--gray-100) 100%);
    border-radius: var(--radius-lg);
    margin: var(--spacing-4);
  }

  .map-placeholder-content {
    text-align: center;
    color: var(--gray-500);
  }

  .map-placeholder-content svg {
    margin-bottom: var(--spacing-3);
    color: var(--gray-400);
  }

  .map-placeholder-text {
    font-weight: 500;
    color: var(--gray-600);
    margin-bottom: var(--spacing-1);
  }

  .map-placeholder-subtext {
    font-size: 0.875rem;
    color: var(--gray-500);
    margin-bottom: var(--spacing-4);
  }

  .map-legend {
    display: flex;
    gap: var(--spacing-4);
    justify-content: center;
    flex-wrap: wrap;
  }

  @media (max-width: 480px) {
    .map-legend {
      gap: var(--spacing-2) var(--spacing-3);
    }
  }

  .legend-item {
    display: flex;
    align-items: center;
    gap: var(--spacing-2);
    font-size: 0.75rem;
    color: var(--gray-600);
  }

  .legend-dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
  }

  .legend-dot.available {
    background: var(--success-500);
  }

  .legend-dot.locked {
    background: var(--primary-500);
  }

  .legend-dot.waitlist {
    background: var(--warning-500);
  }

  .revenue-card .card-body {
    padding: var(--spacing-5);
  }

  .revenue-stat {
    margin-bottom: var(--spacing-5);
    padding-bottom: var(--spacing-5);
    border-bottom: 1px solid var(--gray-200);
  }

  .revenue-label {
    font-size: 0.875rem;
    color: var(--gray-500);
    margin-bottom: var(--spacing-2);
  }

  .revenue-value {
    font-size: 2rem;
    font-weight: 700;
    color: var(--gray-900);
  }

  .revenue-breakdown {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-3);
  }

  .breakdown-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .breakdown-label {
    font-size: 0.875rem;
    color: var(--gray-500);
  }

  .breakdown-value {
    font-weight: 600;
    color: var(--gray-900);
  }

  /* Filters Bar */
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

  @media (max-width: 768px) {
    .filters-bar {
      padding: var(--spacing-3);
      gap: var(--spacing-3);
    }
  }

  .filter-group {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-1);
  }

  .filter-group-action {
    margin-left: auto;
  }

  @media (max-width: 768px) {
    .filter-group {
      flex: 1;
      min-width: calc(50% - var(--spacing-3));
    }

    .filter-group-action {
      margin-left: 0;
      width: 100%;
      flex: none;
      min-width: 100%;
    }

    .filter-group-action .btn {
      width: 100%;
    }
  }

  @media (max-width: 480px) {
    .filter-group {
      min-width: 100%;
    }
  }

  .filter-label {
    font-size: 0.75rem;
    font-weight: 500;
    color: var(--gray-500);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .filter-input {
    min-width: 160px;
  }

  @media (max-width: 768px) {
    .filter-input {
      min-width: 0;
      width: 100%;
    }
  }

  .search-filter {
    flex: 1;
    min-width: 250px;
  }

  @media (max-width: 768px) {
    .search-filter {
      min-width: 100%;
      order: -1;
    }
  }

  /* Table Styles */
  .table-container {
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
  }

  @media (max-width: 768px) {
    .table-container {
      margin: 0 calc(-1 * var(--spacing-4));
      padding: 0 var(--spacing-4);
    }

    .table-container .table {
      min-width: 800px;
    }
  }

  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--spacing-4) var(--spacing-5);
    border-bottom: 1px solid var(--gray-200);
    flex-wrap: wrap;
    gap: var(--spacing-2);
  }

  @media (max-width: 768px) {
    .card-header {
      padding: var(--spacing-3) var(--spacing-4);
    }
  }

  .card-title {
    font-size: 1rem;
    font-weight: 600;
    color: var(--gray-900);
    margin: 0;
  }

  .card-subtitle {
    font-size: 0.875rem;
    color: var(--gray-500);
  }

  .territory-name-cell {
    display: flex;
    align-items: center;
    gap: var(--spacing-3);
  }

  .territory-icon {
    width: 36px;
    height: 36px;
    border-radius: var(--radius-lg);
    background: var(--primary-100);
    color: var(--primary-600);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .territory-info {
    display: flex;
    flex-direction: column;
  }

  .territory-name {
    font-weight: 500;
    color: var(--gray-900);
  }

  .territory-type {
    font-size: 0.75rem;
    color: var(--gray-500);
  }

  .location-cell {
    display: flex;
    flex-direction: column;
  }

  .location-primary {
    color: var(--gray-900);
  }

  .location-secondary {
    font-size: 0.75rem;
    color: var(--gray-500);
  }

  .status-badge {
    display: inline-flex;
    align-items: center;
    padding: 4px 10px;
    border-radius: var(--radius-full);
    font-size: 0.75rem;
    font-weight: 500;
  }

  .status-badge.available {
    background: var(--success-100);
    color: var(--success-700);
  }

  .status-badge.locked {
    background: var(--primary-100);
    color: var(--primary-700);
  }

  .status-badge.waitlist {
    background: var(--warning-100);
    color: var(--warning-600);
  }

  .status-badge.default {
    background: var(--gray-100);
    color: var(--gray-600);
  }

  .client-cell {
    display: flex;
    align-items: center;
    gap: var(--spacing-3);
  }

  .client-avatar {
    width: 32px;
    height: 32px;
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

  .client-avatar.large {
    width: 48px;
    height: 48px;
    font-size: 1rem;
  }

  .client-info {
    display: flex;
    flex-direction: column;
  }

  .client-name {
    font-weight: 500;
    color: var(--primary-600);
    text-decoration: none;
  }

  .client-name:hover {
    text-decoration: underline;
  }

  .client-health {
    display: flex;
    align-items: center;
    gap: var(--spacing-1);
    font-size: 0.75rem;
    color: var(--gray-500);
  }

  .health-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
  }

  .health-dot.excellent {
    background: var(--success-500);
  }

  .health-dot.good {
    background: #22c55e;
  }

  .health-dot.warning {
    background: var(--warning-500);
  }

  .health-dot.critical {
    background: var(--danger-500);
  }

  .no-client,
  .no-value,
  .no-waitlist {
    color: var(--gray-400);
  }

  .value-cell {
    display: flex;
    flex-direction: column;
  }

  .value-primary {
    font-weight: 600;
    color: var(--gray-900);
  }

  .value-base {
    font-weight: 500;
    color: var(--gray-600);
  }

  .value-secondary {
    font-size: 0.75rem;
    color: var(--gray-500);
  }

  .waitlist-cell {
    display: flex;
    align-items: center;
    gap: var(--spacing-2);
  }

  .waitlist-badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    border-radius: var(--radius-full);
    background: var(--warning-100);
    color: var(--warning-700);
    font-weight: 600;
    font-size: 0.75rem;
  }

  .waitlist-label {
    font-size: 0.75rem;
    color: var(--gray-500);
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

  /* Pagination */
  .pagination {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--spacing-4) var(--spacing-5);
    border-top: 1px solid var(--gray-200);
    flex-wrap: wrap;
    gap: var(--spacing-3);
  }

  @media (max-width: 640px) {
    .pagination {
      flex-direction: column;
      padding: var(--spacing-3) var(--spacing-4);
    }
  }

  .pagination-info {
    font-size: 0.875rem;
    color: var(--gray-500);
  }

  @media (max-width: 640px) {
    .pagination-info {
      font-size: 0.75rem;
      text-align: center;
    }
  }

  .pagination-controls {
    display: flex;
    gap: var(--spacing-1);
    flex-wrap: wrap;
    justify-content: center;
  }

  .pagination-btn {
    width: 36px;
    height: 36px;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 1px solid var(--gray-200);
    background: white;
    color: var(--gray-600);
    border-radius: var(--radius-md);
    cursor: pointer;
    transition: all 0.2s ease;
    font-size: 0.875rem;
  }

  .pagination-btn:hover:not(:disabled) {
    background: var(--gray-50);
    border-color: var(--gray-300);
  }

  .pagination-btn.active {
    background: var(--primary-600);
    border-color: var(--primary-600);
    color: white;
  }

  .pagination-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  /* Detail Panel */
  .detail-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.3);
    z-index: 40;
  }

  .detail-panel {
    position: fixed;
    top: 0;
    right: 0;
    bottom: 0;
    width: 480px;
    max-width: 100%;
    background: white;
    box-shadow: -4px 0 20px rgba(0, 0, 0, 0.1);
    z-index: 50;
    display: flex;
    flex-direction: column;
  }

  .detail-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--spacing-5);
    border-bottom: 1px solid var(--gray-200);
  }

  .detail-title {
    font-size: 1.25rem;
    font-weight: 600;
    color: var(--gray-900);
    margin: 0;
  }

  .close-btn {
    width: 36px;
    height: 36px;
    display: flex;
    align-items: center;
    justify-content: center;
    border: none;
    background: transparent;
    color: var(--gray-500);
    cursor: pointer;
    border-radius: var(--radius-md);
    transition: all 0.2s ease;
  }

  .close-btn:hover {
    background: var(--gray-100);
    color: var(--gray-700);
  }

  .detail-body {
    flex: 1;
    overflow-y: auto;
    padding: var(--spacing-5);
  }

  .detail-section {
    margin-bottom: var(--spacing-6);
  }

  .detail-section:last-child {
    margin-bottom: 0;
  }

  .detail-section-title {
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--gray-900);
    margin: 0 0 var(--spacing-3) 0;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .detail-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: var(--spacing-3);
  }

  .detail-item {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-1);
  }

  .detail-label {
    font-size: 0.75rem;
    color: var(--gray-500);
  }

  .detail-value {
    font-weight: 500;
    color: var(--gray-900);
  }

  .assigned-client-card {
    display: flex;
    align-items: center;
    gap: var(--spacing-4);
    padding: var(--spacing-4);
    background: var(--gray-50);
    border-radius: var(--radius-lg);
  }

  .assigned-client-info {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-1);
  }

  .assigned-client-name {
    font-weight: 600;
    color: var(--primary-600);
    text-decoration: none;
  }

  .assigned-client-name:hover {
    text-decoration: underline;
  }

  .assigned-client-meta {
    display: flex;
    align-items: center;
    gap: var(--spacing-3);
  }

  .health-badge {
    font-size: 0.75rem;
    padding: 2px 8px;
    border-radius: var(--radius-full);
    font-weight: 500;
  }

  .health-badge.excellent {
    background: var(--success-100);
    color: var(--success-700);
  }

  .health-badge.good {
    background: #dcfce7;
    color: #15803d;
  }

  .health-badge.warning {
    background: var(--warning-100);
    color: var(--warning-600);
  }

  .health-badge.critical {
    background: var(--danger-100);
    color: var(--danger-600);
  }

  .monthly-rate {
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--gray-700);
  }

  .waitlist-list {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-3);
  }

  .waitlist-entry {
    display: flex;
    align-items: flex-start;
    gap: var(--spacing-3);
    padding: var(--spacing-3);
    background: var(--gray-50);
    border-radius: var(--radius-md);
  }

  .waitlist-position {
    width: 28px;
    height: 28px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--warning-100);
    color: var(--warning-700);
    border-radius: var(--radius-full);
    font-weight: 600;
    font-size: 0.75rem;
    flex-shrink: 0;
  }

  .waitlist-contact {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .waitlist-name {
    font-weight: 500;
    color: var(--gray-900);
  }

  .waitlist-email {
    font-size: 0.875rem;
    color: var(--gray-500);
  }

  .waitlist-practice {
    font-size: 0.75rem;
    color: var(--gray-400);
  }

  .detail-footer {
    display: flex;
    justify-content: flex-end;
    gap: var(--spacing-3);
    padding: var(--spacing-4) var(--spacing-5);
    border-top: 1px solid var(--gray-200);
  }

  /* Badge styles */
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
</style>
