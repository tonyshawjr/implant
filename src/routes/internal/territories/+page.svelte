<script lang="ts">
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();

  function getStatusColor(status: string): string {
    switch (status) {
      case 'locked': return 'badge-success';
      case 'available': return 'badge-primary';
      case 'waitlist': return 'badge-warning';
      default: return 'badge-gray';
    }
  }

  function formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(amount);
  }

  function formatNumber(num: number): string {
    return new Intl.NumberFormat('en-US').format(num);
  }
</script>

<svelte:head>
  <title>Territory Management - ILE Operations</title>
</svelte:head>

<div class="page-content">
  <!-- Stats Row -->
  <div class="grid grid-cols-4 mb-6">
    <div class="stat-card">
      <div class="stat-card-header">
        <div class="stat-card-icon primary">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
            <circle cx="12" cy="10" r="3"/>
          </svg>
        </div>
      </div>
      <div class="stat-card-label">Total Territories</div>
      <div class="stat-card-value">{data.stats.total}</div>
    </div>

    <div class="stat-card">
      <div class="stat-card-header">
        <div class="stat-card-icon success">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
          </svg>
        </div>
      </div>
      <div class="stat-card-label">Locked</div>
      <div class="stat-card-value">{data.stats.locked}</div>
    </div>

    <div class="stat-card">
      <div class="stat-card-header">
        <div class="stat-card-icon warning">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
            <circle cx="9" cy="7" r="4"/>
            <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
            <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
          </svg>
        </div>
      </div>
      <div class="stat-card-label">On Waitlist</div>
      <div class="stat-card-value">{data.stats.totalWaitlistEntries}</div>
    </div>

    <div class="stat-card">
      <div class="stat-card-header">
        <div class="stat-card-icon primary">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="12" y1="1" x2="12" y2="23"/>
            <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
          </svg>
        </div>
      </div>
      <div class="stat-card-label">Monthly Revenue</div>
      <div class="stat-card-value">{formatCurrency(data.stats.monthlyRevenue)}</div>
    </div>
  </div>

  <!-- Filters -->
  <div class="card mb-6">
    <div class="card-body">
      <div class="flex gap-4 items-center">
        <div class="flex-1">
          <input type="text" class="form-input" placeholder="Search territories..." value={data.filters.search}>
        </div>
        <select class="form-input form-select" style="width: 150px;">
          <option value="">All Status</option>
          <option value="available" selected={data.filters.status === 'available'}>Available</option>
          <option value="locked" selected={data.filters.status === 'locked'}>Locked</option>
          <option value="waitlist" selected={data.filters.status === 'waitlist'}>Waitlist</option>
        </select>
        <select class="form-input form-select" style="width: 150px;">
          <option value="">All States</option>
          {#each data.states as state}
            <option value={state} selected={data.filters.state === state}>{state}</option>
          {/each}
        </select>
        <button class="btn btn-primary">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="12" y1="5" x2="12" y2="19"/>
            <line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Add Territory
        </button>
      </div>
    </div>
  </div>

  <!-- Territories Table -->
  <div class="card">
    <div class="card-header">
      <h2 class="card-title">All Territories</h2>
      <span class="text-sm text-gray-500">{data.pagination.total} total</span>
    </div>
    <div class="table-container">
      <table class="table">
        <thead>
          <tr>
            <th>Territory</th>
            <th>Status</th>
            <th>Type</th>
            <th>Client</th>
            <th>Population</th>
            <th>Monthly Rate</th>
            <th>Waitlist</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {#if data.territories && data.territories.length > 0}
            {#each data.territories as territory}
              <tr>
                <td>
                  <div class="font-medium text-gray-900">{territory.name}</div>
                  <div class="text-sm text-gray-500">{territory.location}</div>
                </td>
                <td>
                  <span class="badge {getStatusColor(territory.status)}">{territory.status}</span>
                </td>
                <td class="text-gray-600">{territory.type || 'Standard'}</td>
                <td>
                  {#if territory.client}
                    <a href="/internal/clients/{territory.client.id}" class="text-primary font-medium">
                      {territory.client.name}
                    </a>
                  {:else}
                    <span class="text-gray-400">--</span>
                  {/if}
                </td>
                <td>{territory.population ? formatNumber(territory.population) : '--'}</td>
                <td class="font-medium">{territory.monthlyBasePrice ? formatCurrency(territory.monthlyBasePrice) : '--'}</td>
                <td>
                  {#if territory.counts.waitlist > 0}
                    <span class="badge badge-warning">{territory.counts.waitlist} waiting</span>
                  {:else}
                    <span class="text-gray-400">--</span>
                  {/if}
                </td>
                <td>
                  <div class="table-actions">
                    <button class="btn btn-sm btn-outline" title="View Details">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                        <circle cx="12" cy="12" r="3"/>
                      </svg>
                    </button>
                    <button class="btn btn-sm btn-outline" title="Edit">
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
              <td colspan="8">
                <div class="empty-state">
                  <div class="empty-state-icon">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                      <circle cx="12" cy="10" r="3"/>
                    </svg>
                  </div>
                  <h3 class="empty-state-title">No territories yet</h3>
                  <p class="empty-state-description">Get started by adding your first territory.</p>
                  <button class="btn btn-primary">Add Territory</button>
                </div>
              </td>
            </tr>
          {/if}
        </tbody>
      </table>
    </div>
  </div>
</div>
