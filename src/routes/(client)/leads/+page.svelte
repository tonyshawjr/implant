<script lang="ts">
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();

  function getTemperatureColor(temp: string): string {
    switch (temp) {
      case 'hot': return 'badge-success';
      case 'warm': return 'badge-warning';
      case 'cold': return 'badge-gray';
      default: return 'badge-gray';
    }
  }

  function getStatusColor(status: string): string {
    switch (status) {
      case 'new': return 'badge-primary';
      case 'contacted': return 'badge-warning';
      case 'qualified': return 'badge-success';
      case 'converted': return 'badge-success';
      case 'lost': return 'badge-danger';
      default: return 'badge-gray';
    }
  }

  function formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  }
</script>

<svelte:head>
  <title>Leads - Implant Lead Engine</title>
</svelte:head>

<div class="page-content">
  <!-- Stats Row -->
  <div class="grid grid-cols-4 mb-6">
    <div class="stat-card">
      <div class="stat-card-header">
        <div class="stat-card-icon primary">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
            <circle cx="9" cy="7" r="4"/>
          </svg>
        </div>
      </div>
      <div class="stat-card-label">Total Leads</div>
      <div class="stat-card-value">{data.stats?.total || 0}</div>
    </div>

    <div class="stat-card">
      <div class="stat-card-header">
        <div class="stat-card-icon success">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <path d="M8 14s1.5 2 4 2 4-2 4-2"/>
            <line x1="9" y1="9" x2="9.01" y2="9"/>
            <line x1="15" y1="9" x2="15.01" y2="9"/>
          </svg>
        </div>
      </div>
      <div class="stat-card-label">Hot Leads</div>
      <div class="stat-card-value">{data.stats?.hot || 0}</div>
    </div>

    <div class="stat-card">
      <div class="stat-card-header">
        <div class="stat-card-icon warning">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <polyline points="12 6 12 12 16 14"/>
          </svg>
        </div>
      </div>
      <div class="stat-card-label">Pending Follow-up</div>
      <div class="stat-card-value">{data.stats?.pendingFollowup || 0}</div>
    </div>

    <div class="stat-card">
      <div class="stat-card-header">
        <div class="stat-card-icon success">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
            <polyline points="22 4 12 14.01 9 11.01"/>
          </svg>
        </div>
      </div>
      <div class="stat-card-label">Converted</div>
      <div class="stat-card-value">{data.stats?.converted || 0}</div>
    </div>
  </div>

  <!-- Filters -->
  <div class="card mb-6">
    <div class="card-body">
      <div class="flex gap-4 items-center">
        <div class="flex-1">
          <input type="text" class="form-input" placeholder="Search leads..." value={data.filters?.search || ''}>
        </div>
        <select class="form-input form-select" style="width: 150px;">
          <option value="">All Status</option>
          <option value="new">New</option>
          <option value="contacted">Contacted</option>
          <option value="qualified">Qualified</option>
          <option value="converted">Converted</option>
          <option value="lost">Lost</option>
        </select>
        <select class="form-input form-select" style="width: 150px;">
          <option value="">All Temperatures</option>
          <option value="hot">Hot</option>
          <option value="warm">Warm</option>
          <option value="cold">Cold</option>
        </select>
        <a href="/leads/analytics" class="btn btn-outline">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="20" x2="18" y2="10"/>
            <line x1="12" y1="20" x2="12" y2="4"/>
            <line x1="6" y1="20" x2="6" y2="14"/>
          </svg>
          Analytics
        </a>
      </div>
    </div>
  </div>

  <!-- Leads Table -->
  <div class="card">
    <div class="card-header">
      <h2 class="card-title">All Leads</h2>
      <span class="text-sm text-gray-500">{data.pagination?.total || 0} total</span>
    </div>
    <div class="table-container">
      <table class="table">
        <thead>
          <tr>
            <th>Lead</th>
            <th>Phone</th>
            <th>Source</th>
            <th>Temperature</th>
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
                  <div class="flex items-center gap-3">
                    <div class="avatar" style="background: var(--primary-100); color: var(--primary-600);">
                      {lead.firstName?.charAt(0) || 'L'}
                    </div>
                    <div>
                      <div class="font-medium text-gray-900">{lead.firstName} {lead.lastName}</div>
                      <div class="text-sm text-gray-500">{lead.email}</div>
                    </div>
                  </div>
                </td>
                <td>{lead.phone || '--'}</td>
                <td>{lead.source || 'Website'}</td>
                <td>
                  <span class="badge {getTemperatureColor(lead.temperature)}">{lead.temperature}</span>
                </td>
                <td>
                  <span class="badge {getStatusColor(lead.status)}">{lead.status}</span>
                </td>
                <td class="text-gray-500">{formatDate(lead.createdAt)}</td>
                <td>
                  <div class="table-actions">
                    <a href="/leads/{lead.id}" class="btn btn-sm btn-outline">View</a>
                    <button class="btn btn-sm btn-primary">Contact</button>
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
                    </svg>
                  </div>
                  <h3 class="empty-state-title">No leads yet</h3>
                  <p class="empty-state-description">Leads from your campaigns will appear here.</p>
                </div>
              </td>
            </tr>
          {/if}
        </tbody>
      </table>
    </div>
  </div>
</div>
