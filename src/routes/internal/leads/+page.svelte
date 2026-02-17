<script lang="ts">
  import type { PageData } from './$types';
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import { browser } from '$app/environment';
  import { ButtonGroup, Button, Select, Badge } from 'flowbite-svelte';
  import { TableColumnOutline, GridPlusOutline, BuildingOutline } from 'flowbite-svelte-icons';
  import { flip } from 'svelte/animate';
  import { dndzone } from 'svelte-dnd-action';
  import LeadKanbanCard from '$lib/components/leads/LeadKanbanCard.svelte';

  let { data }: { data: PageData } = $props();

  // Helper function to check if lead is stale
  function isLeadStale(lead: { lastActivityAt?: string | null; createdAt: string }): boolean {
    const checkDate = lead.lastActivityAt || lead.createdAt;
    const dateToCheck = new Date(checkDate);
    const now = new Date();
    const diffDays = (now.getTime() - dateToCheck.getTime()) / (1000 * 60 * 60 * 24);
    return diffDays >= 3;
  }

  // View mode state
  let viewMode = $state<'list' | 'kanban'>('kanban');

  // Load view preference from localStorage
  $effect(() => {
    if (browser) {
      const savedView = localStorage.getItem('internal-leads-view-mode');
      if (savedView === 'kanban' || savedView === 'list') {
        viewMode = savedView;
      }
    }
  });

  function setViewMode(mode: 'list' | 'kanban') {
    viewMode = mode;
    if (browser) {
      localStorage.setItem('internal-leads-view-mode', mode);
    }
  }

  // Local filter state
  let searchValue = $state(data.filters.search);
  let statusFilter = $state(data.filters.status);
  let sourceFilter = $state(data.filters.source);
  let organizationFilter = $state(data.filters.organizationId);

  // Kanban column configurations
  const columns = [
    { id: 'new', label: 'New', color: '#3b82f6', bgColor: '#eff6ff' },
    { id: 'contacted', label: 'Contacted', color: '#eab308', bgColor: '#fefce8' },
    { id: 'qualified', label: 'Qualified', color: '#a855f7', bgColor: '#faf5ff' },
    { id: 'appointment_set', label: 'Appointment Set', color: '#f97316', bgColor: '#fff7ed' },
    { id: 'consultation_completed', label: 'Consultation', color: '#6366f1', bgColor: '#eef2ff' },
    { id: 'converted', label: 'Converted', color: '#22c55e', bgColor: '#f0fdf4' },
    { id: 'lost', label: 'Lost', color: '#ef4444', bgColor: '#fef2f2' }
  ];

  // Group leads by status
  const leadsByStatus = $derived(() => {
    const grouped: Record<string, typeof data.leads> = {};
    for (const col of columns) {
      grouped[col.id] = [];
    }
    for (const lead of data.leads) {
      if (grouped[lead.status]) {
        grouped[lead.status].push(lead);
      } else {
        grouped['new'].push(lead);
      }
    }
    return grouped;
  });

  // Local column state for drag and drop
  let columnItems = $state<Record<string, typeof data.leads>>({});

  $effect(() => {
    const grouped = leadsByStatus();
    columnItems = { ...grouped };
  });

  const flipDurationMs = 200;

  function handleDndConsider(columnId: string, e: CustomEvent<{ items: typeof data.leads }>) {
    columnItems[columnId] = e.detail.items;
  }

  async function handleDndFinalize(columnId: string, e: CustomEvent<{ items: typeof data.leads }>) {
    columnItems[columnId] = e.detail.items;

    const movedLead = e.detail.items.find(item => item.status !== columnId);

    if (movedLead) {
      try {
        const response = await fetch(`/api/leads/${movedLead.id}/status`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: columnId })
        });

        if (!response.ok) {
          throw new Error('Failed to update status');
        }

        movedLead.status = columnId;
      } catch (error) {
        console.error('Error updating lead status:', error);
        // Revert on error
        goto($page.url.pathname + $page.url.search, { invalidateAll: true });
      }
    }
  }

  // Filter functions
  function applyFilters() {
    const params = new URLSearchParams();
    if (searchValue) params.set('search', searchValue);
    if (statusFilter) params.set('status', statusFilter);
    if (sourceFilter) params.set('source', sourceFilter);
    if (organizationFilter) params.set('organization', organizationFilter);
    params.set('page', '1');
    goto(`?${params.toString()}`);
  }

  function clearFilters() {
    searchValue = '';
    statusFilter = '';
    sourceFilter = '';
    organizationFilter = '';
    goto('/internal/leads');
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

  // Stats
  const stats = $derived({
    total: data.pagination.totalCount,
    byStatus: columns.map(col => ({
      ...col,
      count: data.leads.filter(l => l.status === col.id).length
    }))
  });

  // Helper functions
  function formatStatus(status: string): string {
    return status.split('_').map(word =>
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  }

  function formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  }

  function getStatusColor(status: string): 'blue' | 'yellow' | 'purple' | 'indigo' | 'green' | 'red' | 'gray' {
    const colorMap: Record<string, 'blue' | 'yellow' | 'purple' | 'indigo' | 'green' | 'red' | 'gray'> = {
      new: 'blue',
      contacted: 'yellow',
      qualified: 'purple',
      appointment_set: 'indigo',
      consultation_completed: 'indigo',
      converted: 'green',
      lost: 'red'
    };
    return colorMap[status] || 'gray';
  }

  function getTemperatureColor(temp: string | null, score: number | null): 'red' | 'yellow' | 'blue' {
    if (temp === 'hot' || (score && score >= 80)) return 'red';
    if (temp === 'warm' || (score && score >= 50)) return 'yellow';
    return 'blue';
  }

  function getInitials(firstName: string | null, lastName: string | null): string {
    const first = firstName?.charAt(0) || '';
    const last = lastName?.charAt(0) || '';
    return (first + last).toUpperCase() || '?';
  }
</script>

<svelte:head>
  <title>All Leads - Internal Dashboard</title>
</svelte:head>

<div class="page-header">
  <div>
    <h1 class="page-title">All Leads</h1>
    <p class="page-subtitle">Cross-client lead management and pipeline overview</p>
  </div>
  <div class="header-stats">
    <div class="stat-pill">
      <span class="stat-value">{stats.total}</span>
      <span class="stat-label">Total Leads</span>
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
        placeholder="Search leads..."
        style="padding-left: 40px;"
        bind:value={searchValue}
        onkeydown={handleSearchKeydown}
      >
    </div>
  </div>

  <div class="filter-group">
    <label class="filter-label">Organization</label>
    <select class="form-input form-select filter-input" bind:value={organizationFilter} onchange={applyFilters}>
      <option value="">All Organizations</option>
      {#each data.organizations as org}
        <option value={org.id}>{org.name}</option>
      {/each}
    </select>
  </div>

  <div class="filter-group">
    <label class="filter-label">Status</label>
    <select class="form-input form-select filter-input" bind:value={statusFilter} onchange={applyFilters}>
      <option value="">All Status</option>
      {#each columns as col}
        <option value={col.id}>{col.label}</option>
      {/each}
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

  <div class="filter-group filter-actions">
    <label class="filter-label">&nbsp;</label>
    <div class="flex gap-2">
      <button class="btn btn-secondary" onclick={clearFilters}>Clear</button>
      <button class="btn btn-primary" onclick={applyFilters}>Apply</button>
    </div>
  </div>
</div>

<!-- View Toggle -->
<div class="view-toggle-bar">
  <div class="view-toggle-label">View:</div>
  <ButtonGroup>
    <Button
      color={viewMode === 'list' ? 'primary' : 'alternative'}
      size="sm"
      onclick={() => setViewMode('list')}
    >
      <TableColumnOutline class="w-4 h-4 me-1.5" />
      List
    </Button>
    <Button
      color={viewMode === 'kanban' ? 'primary' : 'alternative'}
      size="sm"
      onclick={() => setViewMode('kanban')}
    >
      <GridPlusOutline class="w-4 h-4 me-1.5" />
      Kanban
    </Button>
  </ButtonGroup>
</div>

{#if viewMode === 'kanban'}
  <!-- Kanban Board -->
  <div class="kanban-container">
    <div class="kanban-board">
      {#each columns as column (column.id)}
        <div class="kanban-column">
          <div class="column-header" style="border-top-color: {column.color};">
            <div class="header-content">
              <h3 class="column-title">{column.label}</h3>
              <Badge color="gray" class="text-xs">{columnItems[column.id]?.length || 0}</Badge>
            </div>
          </div>

          <div
            class="column-body"
            style="background-color: {column.bgColor};"
            use:dndzone={{
              items: columnItems[column.id] || [],
              flipDurationMs,
              type: 'internal-leads',
              dropTargetStyle: {
                outline: `2px dashed ${column.color}`,
                outlineOffset: '-2px'
              }
            }}
            onconsider={(e) => handleDndConsider(column.id, e)}
            onfinalize={(e) => handleDndFinalize(column.id, e)}
          >
            {#each columnItems[column.id] || [] as lead (lead.id)}
              <div animate:flip={{ duration: flipDurationMs }}>
                <a href="/internal/clients/{lead.organizationSlug}/leads/{lead.id}" class="kanban-card-link">
                  <div class="internal-kanban-card" class:stale={isLeadStale(lead)}>
                    <!-- Organization Badge -->
                    <div class="org-badge">
                      <BuildingOutline class="w-3 h-3" />
                      <span>{lead.organizationName}</span>
                    </div>

                    <!-- Lead Name and Temperature -->
                    <div class="card-header">
                      <span class="lead-name">
                        {lead.firstName || ''} {lead.lastName || 'Unknown'}
                      </span>
                      <Badge color={getTemperatureColor(lead.temperature, lead.score)} class="text-xs px-1.5 py-0.5">
                        {lead.temperature === 'hot' || (lead.score && lead.score >= 80) ? 'Hot' :
                         lead.temperature === 'warm' || (lead.score && lead.score >= 50) ? 'Warm' : 'Cold'}
                      </Badge>
                    </div>

                    <!-- Contact Info -->
                    <div class="contact-info">
                      {#if lead.phone}
                        <span class="contact-item">{lead.phone}</span>
                      {/if}
                      {#if lead.email}
                        <span class="contact-item truncate">{lead.email}</span>
                      {/if}
                    </div>

                    <!-- Footer -->
                    <div class="card-footer">
                      <span class="time-ago">{formatDate(lead.createdAt)}</span>
                    </div>
                  </div>
                </a>
              </div>
            {/each}

            {#if !columnItems[column.id]?.length}
              <div class="empty-column">
                <span>No leads</span>
              </div>
            {/if}
          </div>
        </div>
      {/each}
    </div>
  </div>
{:else}
  <!-- List View -->
  <div class="card">
    <div class="table-container">
      <table class="table">
        <thead>
          <tr>
            <th>Organization</th>
            <th>Name</th>
            <th>Contact</th>
            <th>Temperature</th>
            <th>Status</th>
            <th>Created</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {#if data.leads.length > 0}
            {#each data.leads as lead}
              <tr>
                <td>
                  <Badge color="gray">
                    <BuildingOutline class="w-3 h-3 me-1" />
                    {lead.organizationName}
                  </Badge>
                </td>
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
                  <Badge color={getTemperatureColor(lead.temperature, lead.score)}>
                    {lead.temperature === 'hot' || (lead.score && lead.score >= 80) ? 'Hot' :
                     lead.temperature === 'warm' || (lead.score && lead.score >= 50) ? 'Warm' : 'Cold'}
                  </Badge>
                </td>
                <td>
                  <Badge color={getStatusColor(lead.status)}>
                    {formatStatus(lead.status)}
                  </Badge>
                </td>
                <td>{formatDate(lead.createdAt)}</td>
                <td>
                  <a href="/internal/clients/{lead.organizationSlug}/leads/{lead.id}" class="btn btn-sm btn-secondary">
                    View
                  </a>
                </td>
              </tr>
            {/each}
          {:else}
            <tr>
              <td colspan="7">
                <div class="empty-state">
                  <h3 class="empty-state-title">No leads found</h3>
                  <p class="empty-state-description">
                    {#if searchValue || statusFilter || sourceFilter || organizationFilter}
                      Try adjusting your filters to find leads.
                    {:else}
                      Leads will appear here when clients start generating results.
                    {/if}
                  </p>
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
              Previous
            </button>
            <button
              class="btn btn-secondary btn-sm"
              disabled={data.pagination.page >= data.pagination.totalPages}
              onclick={() => goToPage(data.pagination.page + 1)}
            >
              Next
            </button>
          </div>
        </div>
      </div>
    {/if}
  </div>
{/if}


<style>
  .page-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: var(--spacing-6);
  }

  .page-title {
    font-size: 1.5rem;
    font-weight: 600;
    color: var(--gray-900);
    margin: 0 0 0.25rem 0;
  }

  .page-subtitle {
    font-size: 0.875rem;
    color: var(--gray-500);
    margin: 0;
  }

  .header-stats {
    display: flex;
    gap: var(--spacing-4);
  }

  .stat-pill {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: var(--spacing-3) var(--spacing-4);
    background: white;
    border-radius: var(--radius-lg);
    border: 1px solid var(--gray-200);
  }

  .stat-value {
    font-size: 1.25rem;
    font-weight: 600;
    color: var(--gray-900);
  }

  .stat-label {
    font-size: 0.75rem;
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
    margin-bottom: var(--spacing-4);
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
    min-width: 200px;
  }

  .filter-actions {
    margin-left: auto;
  }

  .view-toggle-bar {
    display: flex;
    align-items: center;
    gap: var(--spacing-3);
    margin-bottom: var(--spacing-4);
  }

  .view-toggle-label {
    font-size: 0.875rem;
    font-weight: 500;
    color: var(--gray-600);
  }

  /* Kanban Styles */
  .kanban-container {
    width: 100%;
    overflow-x: auto;
    padding-bottom: 1rem;
  }

  .kanban-board {
    display: flex;
    gap: 1rem;
    min-width: max-content;
  }

  .kanban-column {
    display: flex;
    flex-direction: column;
    min-width: 280px;
    max-width: 320px;
    flex: 1;
  }

  .column-header {
    background: white;
    border-radius: 0.5rem 0.5rem 0 0;
    padding: 0.75rem 1rem;
    border-top: 3px solid;
    border-left: 1px solid #e5e7eb;
    border-right: 1px solid #e5e7eb;
  }

  .header-content {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .column-title {
    font-weight: 600;
    font-size: 0.875rem;
    color: #374151;
    margin: 0;
  }

  .column-body {
    flex: 1;
    min-height: 400px;
    padding: 0.75rem;
    border-radius: 0 0 0.5rem 0.5rem;
    border: 1px solid #e5e7eb;
    border-top: none;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    overflow-y: auto;
  }

  .empty-column {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 100px;
    color: #9ca3af;
    font-size: 0.875rem;
    border: 2px dashed #e5e7eb;
    border-radius: 0.375rem;
    flex: 1;
  }

  .kanban-card-link {
    text-decoration: none;
    display: block;
  }

  .internal-kanban-card {
    background: white;
    border-radius: 0.5rem;
    padding: 0.75rem;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    cursor: move;
    transition: all 0.2s ease;
    border-left: 3px solid transparent;
  }

  .internal-kanban-card:hover {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    transform: translateY(-1px);
  }

  .internal-kanban-card.stale {
    border-left-color: #ef4444;
  }

  .org-badge {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    font-size: 0.625rem;
    color: #6b7280;
    background: #f3f4f6;
    padding: 0.125rem 0.375rem;
    border-radius: 0.25rem;
    width: fit-content;
    margin-bottom: 0.375rem;
  }

  .card-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
    margin-bottom: 0.375rem;
  }

  .lead-name {
    font-weight: 500;
    font-size: 0.875rem;
    color: #111827;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    flex: 1;
  }

  .contact-info {
    display: flex;
    flex-direction: column;
    gap: 0.125rem;
    margin-bottom: 0.375rem;
  }

  .contact-item {
    font-size: 0.75rem;
    color: #6b7280;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .card-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding-top: 0.375rem;
    border-top: 1px solid #f3f4f6;
  }

  .time-ago {
    font-size: 0.6875rem;
    color: #9ca3af;
  }

  /* List View Styles */
  .lead-name-cell {
    display: flex;
    align-items: center;
    gap: var(--spacing-3);
  }

  .lead-avatar {
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

  .lead-info {
    display: flex;
    flex-direction: column;
  }

  .lead-full-name {
    font-weight: 500;
    color: var(--gray-900);
    font-size: 0.875rem;
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
    gap: var(--spacing-2);
  }

  .empty-state {
    text-align: center;
    padding: var(--spacing-8);
  }

  .empty-state-title {
    font-size: 1rem;
    font-weight: 500;
    color: var(--gray-900);
    margin-bottom: var(--spacing-2);
  }

  .empty-state-description {
    font-size: 0.875rem;
    color: var(--gray-500);
  }

  /* Dark mode */
  :global(.dark) .page-title {
    color: #f9fafb;
  }

  :global(.dark) .stat-pill {
    background: #1f2937;
    border-color: #374151;
  }

  :global(.dark) .stat-value {
    color: #f9fafb;
  }

  :global(.dark) .filters-bar {
    background: #1f2937;
    border-color: #374151;
  }

  :global(.dark) .column-header {
    background: #1f2937;
    border-color: #374151;
  }

  :global(.dark) .column-title {
    color: #f3f4f6;
  }

  :global(.dark) .column-body {
    border-color: #374151;
  }

  :global(.dark) .internal-kanban-card {
    background: #1f2937;
  }

  :global(.dark) .lead-name {
    color: #f9fafb;
  }
</style>
