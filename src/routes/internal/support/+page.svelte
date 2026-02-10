<script lang="ts">
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();

  function getStatusColor(status: string): string {
    switch (status) {
      case 'open': return 'badge-danger';
      case 'in_progress': return 'badge-warning';
      case 'pending': return 'badge-warning';
      case 'resolved': return 'badge-success';
      case 'closed': return 'badge-gray';
      default: return 'badge-gray';
    }
  }

  function getPriorityColor(priority: string): string {
    switch (priority) {
      case 'urgent': return 'badge-danger';
      case 'high': return 'badge-warning';
      case 'medium': return 'badge-primary';
      case 'low': return 'badge-gray';
      default: return 'badge-gray';
    }
  }

  function formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  }
</script>

<svelte:head>
  <title>Support Center - ILE Operations</title>
</svelte:head>

<div class="page-content">
  <!-- Stats Row -->
  <div class="grid grid-cols-4 mb-6">
    <div class="stat-card">
      <div class="stat-card-header">
        <div class="stat-card-icon danger">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
        </div>
      </div>
      <div class="stat-card-label">Open Tickets</div>
      <div class="stat-card-value">{data.stats?.open || 0}</div>
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
      <div class="stat-card-label">In Progress</div>
      <div class="stat-card-value">{data.stats?.inProgress || 0}</div>
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
      <div class="stat-card-label">Resolved Today</div>
      <div class="stat-card-value">{data.stats?.resolvedToday || 0}</div>
    </div>

    <div class="stat-card">
      <div class="stat-card-header">
        <div class="stat-card-icon primary">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <polyline points="12 6 12 12 16 14"/>
          </svg>
        </div>
      </div>
      <div class="stat-card-label">Avg Response Time</div>
      <div class="stat-card-value">{data.stats?.avgResponseTime || '2h'}</div>
    </div>
  </div>

  <!-- Filters -->
  <div class="card mb-6">
    <div class="card-body">
      <div class="flex gap-4 items-center">
        <div class="flex-1">
          <input type="text" class="form-input" placeholder="Search tickets..." value={data.filters?.search || ''}>
        </div>
        <select class="form-input form-select" style="width: 150px;">
          <option value="">All Status</option>
          <option value="open">Open</option>
          <option value="in_progress">In Progress</option>
          <option value="pending">Pending</option>
          <option value="resolved">Resolved</option>
        </select>
        <select class="form-input form-select" style="width: 150px;">
          <option value="">All Priority</option>
          <option value="urgent">Urgent</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
      </div>
    </div>
  </div>

  <!-- Tickets Table -->
  <div class="card">
    <div class="card-header">
      <h2 class="card-title">Support Tickets</h2>
      <span class="text-sm text-gray-500">{data.pagination?.total || 0} total</span>
    </div>
    <div class="table-container">
      <table class="table">
        <thead>
          <tr>
            <th>Ticket</th>
            <th>Client</th>
            <th>Subject</th>
            <th>Priority</th>
            <th>Status</th>
            <th>Created</th>
            <th>Assigned To</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {#if data.tickets && data.tickets.length > 0}
            {#each data.tickets as ticket}
              <tr>
                <td class="font-medium">#{ticket.ticketNumber}</td>
                <td>
                  <a href="/internal/clients/{ticket.organizationId}" class="text-primary">
                    {ticket.organizationName}
                  </a>
                </td>
                <td class="truncate" style="max-width: 250px;">{ticket.subject}</td>
                <td>
                  <span class="badge {getPriorityColor(ticket.priority)}">{ticket.priority}</span>
                </td>
                <td>
                  <span class="badge {getStatusColor(ticket.status)}">{ticket.status.replace('_', ' ')}</span>
                </td>
                <td class="text-gray-500">{formatDate(ticket.createdAt)}</td>
                <td>{ticket.assignedTo || '--'}</td>
                <td>
                  <div class="table-actions">
                    <button class="btn btn-sm btn-outline">View</button>
                    <button class="btn btn-sm btn-primary">Reply</button>
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
                      <circle cx="12" cy="12" r="10"/>
                      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
                      <line x1="12" y1="17" x2="12.01" y2="17"/>
                    </svg>
                  </div>
                  <h3 class="empty-state-title">No support tickets</h3>
                  <p class="empty-state-description">All caught up! No open tickets.</p>
                </div>
              </td>
            </tr>
          {/if}
        </tbody>
      </table>
    </div>
  </div>
</div>
