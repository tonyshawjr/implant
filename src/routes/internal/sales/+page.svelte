<script lang="ts">
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();

  function getStageColor(stage: string): string {
    switch (stage) {
      case 'new': return 'badge-gray';
      case 'qualified': return 'badge-primary';
      case 'demo_scheduled': return 'badge-warning';
      case 'demo_complete': return 'badge-warning';
      case 'proposal_sent': return 'badge-primary';
      case 'negotiation': return 'badge-warning';
      case 'closed_won': return 'badge-success';
      case 'closed_lost': return 'badge-danger';
      default: return 'badge-gray';
    }
  }

  function formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(amount);
  }

  function formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  function formatStage(stage: string): string {
    return stage.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }
</script>

<svelte:head>
  <title>Sales Pipeline - ILE Operations</title>
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
            <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
            <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
          </svg>
        </div>
      </div>
      <div class="stat-card-label">Active Leads</div>
      <div class="stat-card-value">{data.stats?.activeLeads || 0}</div>
    </div>

    <div class="stat-card">
      <div class="stat-card-header">
        <div class="stat-card-icon warning">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
            <line x1="16" y1="2" x2="16" y2="6"/>
            <line x1="8" y1="2" x2="8" y2="6"/>
            <line x1="3" y1="10" x2="21" y2="10"/>
          </svg>
        </div>
      </div>
      <div class="stat-card-label">Demos This Week</div>
      <div class="stat-card-value">{data.stats?.demosThisWeek || 0}</div>
    </div>

    <div class="stat-card">
      <div class="stat-card-header">
        <div class="stat-card-icon success">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="12" y1="1" x2="12" y2="23"/>
            <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
          </svg>
        </div>
      </div>
      <div class="stat-card-label">Pipeline Value</div>
      <div class="stat-card-value">{formatCurrency(data.stats?.pipelineValue || 0)}</div>
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
      <div class="stat-card-label">Closed This Month</div>
      <div class="stat-card-value">{data.stats?.closedThisMonth || 0}</div>
    </div>
  </div>

  <!-- Filters -->
  <div class="card mb-6">
    <div class="card-body">
      <div class="flex gap-4 items-center">
        <div class="flex-1">
          <input type="text" class="form-input" placeholder="Search leads..." value={data.filters?.search || ''}>
        </div>
        <select class="form-input form-select" style="width: 180px;">
          <option value="">All Stages</option>
          <option value="new">New</option>
          <option value="qualified">Qualified</option>
          <option value="demo_scheduled">Demo Scheduled</option>
          <option value="demo_complete">Demo Complete</option>
          <option value="proposal_sent">Proposal Sent</option>
          <option value="negotiation">Negotiation</option>
        </select>
        <button class="btn btn-primary">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="12" y1="5" x2="12" y2="19"/>
            <line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Add Lead
        </button>
      </div>
    </div>
  </div>

  <!-- Sales Pipeline Table -->
  <div class="card">
    <div class="card-header">
      <h2 class="card-title">Sales Pipeline</h2>
      <span class="text-sm text-gray-500">{data.pagination?.total || 0} leads</span>
    </div>
    <div class="table-container">
      <table class="table">
        <thead>
          <tr>
            <th>Contact</th>
            <th>Practice</th>
            <th>Territory</th>
            <th>Stage</th>
            <th>Value</th>
            <th>Last Activity</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {#if data.leads && data.leads.length > 0}
            {#each data.leads as lead}
              <tr>
                <td>
                  <div class="font-medium text-gray-900">{lead.contactName}</div>
                  <div class="text-sm text-gray-500">{lead.contactEmail}</div>
                </td>
                <td>{lead.practiceName || '--'}</td>
                <td>{lead.territoryName || '--'}</td>
                <td>
                  <span class="badge {getStageColor(lead.stage)}">{formatStage(lead.stage)}</span>
                </td>
                <td class="font-semibold">{formatCurrency(lead.estimatedValue || 0)}</td>
                <td class="text-gray-500">{lead.lastActivity ? formatDate(lead.lastActivity) : '--'}</td>
                <td>
                  <div class="table-actions">
                    <button class="btn btn-sm btn-outline">View</button>
                    <button class="btn btn-sm btn-primary">Update</button>
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
                      <line x1="19" y1="8" x2="19" y2="14"/>
                      <line x1="22" y1="11" x2="16" y2="11"/>
                    </svg>
                  </div>
                  <h3 class="empty-state-title">No sales leads yet</h3>
                  <p class="empty-state-description">Start building your pipeline by adding leads.</p>
                  <button class="btn btn-primary">Add First Lead</button>
                </div>
              </td>
            </tr>
          {/if}
        </tbody>
      </table>
    </div>
  </div>
</div>
