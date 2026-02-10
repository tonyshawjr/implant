<script lang="ts">
  import type { PageData } from './$types';
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';

  let { data }: { data: PageData } = $props();

  // Local filter state
  let searchValue = $state(data.filters.search);
  let statusFilter = $state(data.filters.status);
  let sourceFilter = $state(data.filters.source);
  let dateFrom = $state(data.filters.dateFrom);
  let dateTo = $state(data.filters.dateTo);

  // Computed stats
  const stats = $derived({
    total: data.pagination.totalCount,
    newToday: data.leads.filter(l => {
      const today = new Date();
      const leadDate = new Date(l.createdAt);
      return leadDate.toDateString() === today.toDateString();
    }).length,
    hot: data.leads.filter(l => l.temperature === 'hot' || (l.score && l.score >= 80)).length,
    conversionRate: data.pagination.totalCount > 0
      ? Math.round((data.leads.filter(l => l.status === 'converted').length / data.pagination.totalCount) * 100)
      : 0
  });

  // Helper functions
  function getTemperatureClass(temperature: string | null, score: number | null): string {
    if (temperature === 'hot' || (score && score >= 80)) return 'hot';
    if (temperature === 'warm' || (score && score >= 50)) return 'warm';
    return 'cold';
  }

  function getTemperatureLabel(temperature: string | null, score: number | null): string {
    if (temperature === 'hot' || (score && score >= 80)) return 'Hot';
    if (temperature === 'warm' || (score && score >= 50)) return 'Warm';
    return 'Cold';
  }

  function getStatusBadgeClass(status: string): string {
    switch (status) {
      case 'new': return 'badge-primary';
      case 'contacted': return 'badge-gray';
      case 'qualified': return 'badge-warning';
      case 'appointment_set': return 'badge-primary';
      case 'consultation_completed': return 'badge-success';
      case 'converted': return 'badge-success';
      case 'lost': return 'badge-danger';
      default: return 'badge-gray';
    }
  }

  function formatStatus(status: string): string {
    return status.split('_').map(word =>
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  }

  function formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  }

  function formatSource(source: string): string {
    return source.charAt(0).toUpperCase() + source.slice(1);
  }

  function getInitials(firstName: string, lastName: string): string {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  }

  // Filter and navigation functions
  function applyFilters() {
    const params = new URLSearchParams();
    if (searchValue) params.set('search', searchValue);
    if (statusFilter) params.set('status', statusFilter);
    if (sourceFilter) params.set('source', sourceFilter);
    if (dateFrom) params.set('dateFrom', dateFrom);
    if (dateTo) params.set('dateTo', dateTo);
    params.set('page', '1');
    goto(`?${params.toString()}`);
  }

  function clearFilters() {
    searchValue = '';
    statusFilter = '';
    sourceFilter = '';
    dateFrom = '';
    dateTo = '';
    goto('/leads');
  }

  function goToPage(pageNum: number) {
    const params = new URLSearchParams($page.url.searchParams);
    params.set('page', pageNum.toString());
    goto(`?${params.toString()}`);
  }

  function handleSearchKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter') {
      applyFilters();
    }
  }
</script>

<svelte:head>
  <title>Leads - Implant Lead Engine</title>
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
    <div class="stat-card-label">Total Leads</div>
    <div class="stat-card-value">{stats.total}</div>
    <div class="stat-card-change positive">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/>
      </svg>
      All time
    </div>
  </div>

  <div class="stat-card">
    <div class="stat-card-header">
      <div class="stat-card-icon success">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/>
          <polyline points="12 6 12 12 16 14"/>
        </svg>
      </div>
    </div>
    <div class="stat-card-label">New Today</div>
    <div class="stat-card-value">{stats.newToday}</div>
    <div class="stat-card-change positive">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/>
      </svg>
      Last 24 hours
    </div>
  </div>

  <div class="stat-card">
    <div class="stat-card-header">
      <div class="stat-card-icon warning">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
        </svg>
      </div>
    </div>
    <div class="stat-card-label">Hot Leads</div>
    <div class="stat-card-value">{stats.hot}</div>
    <div class="stat-card-change positive">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/>
      </svg>
      High priority
    </div>
  </div>

  <div class="stat-card">
    <div class="stat-card-header">
      <div class="stat-card-icon danger">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
          <polyline points="22 4 12 14.01 9 11.01"/>
        </svg>
      </div>
    </div>
    <div class="stat-card-label">Conversion Rate</div>
    <div class="stat-card-value">{stats.conversionRate}%</div>
    <div class="stat-card-change positive">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/>
      </svg>
      This period
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
        placeholder="Search leads by name, email, phone..."
        style="padding-left: 40px;"
        bind:value={searchValue}
        onkeydown={handleSearchKeydown}
      >
    </div>
  </div>
  <div class="filter-group">
    <label class="filter-label">Status</label>
    <select class="form-input form-select filter-input" bind:value={statusFilter} onchange={applyFilters}>
      <option value="">All Status</option>
      <option value="new">New</option>
      <option value="contacted">Contacted</option>
      <option value="qualified">Qualified</option>
      <option value="appointment_set">Appointment Set</option>
      <option value="consultation_completed">Consultation Completed</option>
      <option value="converted">Converted</option>
      <option value="lost">Lost</option>
    </select>
  </div>
  <div class="filter-group">
    <label class="filter-label">Source</label>
    <select class="form-input form-select filter-input" bind:value={sourceFilter} onchange={applyFilters}>
      <option value="">All Sources</option>
      <option value="google">Google</option>
      <option value="facebook">Facebook</option>
      <option value="instagram">Instagram</option>
      <option value="website">Website</option>
      <option value="referral">Referral</option>
      <option value="manual">Manual</option>
    </select>
  </div>
  <div class="filter-group">
    <label class="filter-label">From Date</label>
    <input
      type="date"
      class="form-input filter-input"
      bind:value={dateFrom}
      onchange={applyFilters}
    >
  </div>
  <div class="filter-group">
    <label class="filter-label">To Date</label>
    <input
      type="date"
      class="form-input filter-input"
      bind:value={dateTo}
      onchange={applyFilters}
    >
  </div>
  <div class="filter-group filter-actions">
    <label class="filter-label">&nbsp;</label>
    <div class="flex gap-2">
      <button class="btn btn-secondary" onclick={clearFilters}>
        Clear
      </button>
      <button class="btn btn-primary" onclick={applyFilters}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
        </svg>
        Apply
      </button>
    </div>
  </div>
</div>

<!-- Leads Table -->
<div class="card">
  <div class="table-container">
    <table class="table">
      <thead>
        <tr>
          <th>Name</th>
          <th>Contact</th>
          <th>Source</th>
          <th>Score/Temp</th>
          <th>Status</th>
          <th>Created</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        {#if data.leads && data.leads.length > 0}
          {#each data.leads as lead}
            <tr>
              <td>
                <div class="lead-name-cell">
                  <div class="lead-avatar">{getInitials(lead.firstName, lead.lastName)}</div>
                  <div class="lead-info">
                    <div class="lead-full-name">{lead.firstName} {lead.lastName}</div>
                    {#if lead.campaignName}
                      <div class="lead-campaign">{lead.campaignName}</div>
                    {/if}
                  </div>
                </div>
              </td>
              <td>
                <div class="lead-contact">
                  <div class="lead-email">{lead.email || '-'}</div>
                  <div class="lead-phone">{lead.phone || '-'}</div>
                </div>
              </td>
              <td>
                <span class="badge badge-gray">
                  {formatSource(lead.source)}
                </span>
              </td>
              <td>
                <div class="lead-score-cell">
                  <div class="lead-score {getTemperatureClass(lead.temperature, lead.score)}">
                    {lead.score ?? '-'}
                  </div>
                  <span class="temperature-label">{getTemperatureLabel(lead.temperature, lead.score)}</span>
                </div>
              </td>
              <td>
                <span class="badge {getStatusBadgeClass(lead.status)}">
                  {formatStatus(lead.status)}
                </span>
              </td>
              <td>
                <div class="lead-date">{formatDate(lead.createdAt)}</div>
              </td>
              <td>
                <div class="quick-actions">
                  <a href="/leads/{lead.id}" class="action-btn" title="View Details">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                      <circle cx="12" cy="12" r="3"/>
                    </svg>
                  </a>
                  <button class="action-btn primary" title="Contact Lead">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
                    </svg>
                  </button>
                  <button class="action-btn" title="Add Note">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
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
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                    <circle cx="9" cy="7" r="4"/>
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                    <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                  </svg>
                </div>
                <h3 class="empty-state-title">No leads found</h3>
                <p class="empty-state-description">
                  {#if searchValue || statusFilter || sourceFilter || dateFrom || dateTo}
                    Try adjusting your filters to find leads.
                  {:else}
                    Leads will appear here when your campaigns start generating results.
                  {/if}
                </p>
                {#if searchValue || statusFilter || sourceFilter || dateFrom || dateTo}
                  <button class="btn btn-primary" onclick={clearFilters}>Clear Filters</button>
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
    <div class="card-footer">
      <div class="pagination">
        <div class="pagination-info">
          Showing {(data.pagination.page - 1) * data.pagination.pageSize + 1} to {Math.min(data.pagination.page * data.pagination.pageSize, data.pagination.totalCount)} of {data.pagination.totalCount} leads
        </div>
        <div class="pagination-controls">
          <button
            class="btn btn-secondary btn-sm"
            disabled={data.pagination.page <= 1}
            onclick={() => goToPage(data.pagination.page - 1)}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
            Previous
          </button>

          <div class="pagination-pages">
            {#each Array.from({ length: Math.min(5, data.pagination.totalPages) }, (_, i) => {
              const startPage = Math.max(1, Math.min(data.pagination.page - 2, data.pagination.totalPages - 4));
              return startPage + i;
            }) as pageNum}
              <button
                class="btn btn-sm {pageNum === data.pagination.page ? 'btn-primary' : 'btn-secondary'}"
                onclick={() => goToPage(pageNum)}
              >
                {pageNum}
              </button>
            {/each}
          </div>

          <button
            class="btn btn-secondary btn-sm"
            disabled={data.pagination.page >= data.pagination.totalPages}
            onclick={() => goToPage(data.pagination.page + 1)}
          >
            Next
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </button>
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
    min-width: 160px;
  }

  .search-filter {
    flex: 1;
    min-width: 250px;
  }

  .filter-actions {
    margin-left: auto;
  }

  .lead-name-cell {
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

  .lead-full-name {
    font-weight: 500;
    color: var(--gray-900);
  }

  .lead-campaign {
    font-size: 0.75rem;
    color: var(--gray-500);
  }

  .lead-contact {
    display: flex;
    flex-direction: column;
  }

  .lead-email {
    font-size: 0.875rem;
    color: var(--gray-700);
  }

  .lead-phone {
    font-size: 0.75rem;
    color: var(--gray-500);
  }

  .lead-date {
    font-size: 0.875rem;
    color: var(--gray-600);
  }

  .lead-score-cell {
    display: flex;
    align-items: center;
    gap: var(--spacing-2);
  }

  .temperature-label {
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

  .pagination {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: var(--spacing-4);
  }

  .pagination-info {
    font-size: 0.875rem;
    color: var(--gray-500);
  }

  .pagination-controls {
    display: flex;
    align-items: center;
    gap: var(--spacing-2);
  }

  .pagination-pages {
    display: flex;
    gap: var(--spacing-1);
  }

  @media (max-width: 768px) {
    .filters-bar {
      flex-direction: column;
      align-items: stretch;
    }

    .filter-group {
      width: 100%;
    }

    .search-filter {
      min-width: 100%;
    }

    .filter-input {
      min-width: 100%;
      width: 100%;
    }

    .filter-actions {
      margin-left: 0;
    }

    .pagination {
      flex-direction: column;
      align-items: center;
    }

    .pagination-pages {
      display: none;
    }
  }
</style>
