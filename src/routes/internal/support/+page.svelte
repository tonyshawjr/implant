<script lang="ts">
  import type { PageData } from './$types';
  import { enhance } from '$app/forms';
  import { goto } from '$app/navigation';

  let { data }: { data: PageData } = $props();

  // Filter state
  let statusFilter = $state(data.filters.status);
  let priorityFilter = $state(data.filters.priority);
  let clientFilter = $state(data.filters.client);
  let assigneeFilter = $state(data.filters.assignee);

  // Modal state
  let selectedTicket = $state<typeof data.tickets[0] | null>(null);
  let showTicketModal = $state(false);
  let replyMessage = $state('');
  let isInternalNote = $state(false);

  // Helper functions
  function formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  function formatRelativeTime(hours: number): string {
    if (hours < 1) return 'Just now';
    if (hours < 24) return `${Math.floor(hours)}h ago`;
    const days = Math.floor(hours / 24);
    if (days === 1) return '1 day ago';
    return `${days} days ago`;
  }

  function getPriorityClass(priority: string): string {
    switch (priority) {
      case 'urgent': return 'danger';
      case 'high': return 'warning';
      case 'medium': return 'primary';
      case 'low': return 'secondary';
      default: return 'secondary';
    }
  }

  function getStatusClass(status: string): string {
    switch (status) {
      case 'open': return 'primary';
      case 'pending': return 'warning';
      case 'in_progress': return 'info';
      case 'escalated': return 'danger';
      case 'resolved': return 'success';
      case 'closed': return 'secondary';
      default: return 'secondary';
    }
  }

  function formatStatus(status: string): string {
    return status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
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
    if (statusFilter) params.set('status', statusFilter);
    if (priorityFilter) params.set('priority', priorityFilter);
    if (clientFilter) params.set('client', clientFilter);
    if (assigneeFilter) params.set('assignee', assigneeFilter);
    goto(`/internal/support?${params.toString()}`);
  }

  function clearFilters() {
    statusFilter = '';
    priorityFilter = '';
    clientFilter = '';
    assigneeFilter = '';
    goto('/internal/support');
  }

  function openTicketModal(ticket: typeof data.tickets[0]) {
    selectedTicket = ticket;
    showTicketModal = true;
    replyMessage = '';
    isInternalNote = false;
  }

  function closeTicketModal() {
    showTicketModal = false;
    selectedTicket = null;
  }
</script>

<svelte:head>
  <title>Support Center - ILE Operations</title>
</svelte:head>

<!-- Stats Row -->
<div class="stats-row">
  <div class="stat-card">
    <div class="stat-card-header">
      <div class="stat-card-icon primary">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
        </svg>
      </div>
    </div>
    <div class="stat-card-label">Open Tickets</div>
    <div class="stat-card-value">{data.stats.openTickets}</div>
    <div class="stat-card-change {data.stats.urgentHighPriority > 0 ? 'negative' : 'neutral'}">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10"/>
        <line x1="12" y1="8" x2="12" y2="12"/>
        <line x1="12" y1="16" x2="12.01" y2="16"/>
      </svg>
      {data.stats.urgentHighPriority} urgent/high priority
    </div>
  </div>

  <div class="stat-card">
    <div class="stat-card-header">
      <div class="stat-card-icon warning">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/>
          <polyline points="12 6 12 12 16 14"/>
        </svg>
      </div>
    </div>
    <div class="stat-card-label">Avg Response Time</div>
    <div class="stat-card-value">{data.stats.avgResponseTimeHours}h</div>
    <div class="stat-card-change {data.stats.avgResponseTimeHours <= 2 ? 'positive' : data.stats.avgResponseTimeHours <= 4 ? 'neutral' : 'negative'}">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/>
      </svg>
      Target: &lt;2 hours
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
    <div class="stat-card-label">Resolution Rate</div>
    <div class="stat-card-value">{data.stats.resolutionRate}%</div>
    <div class="stat-card-change positive">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/>
      </svg>
      Last 30 days
    </div>
  </div>

  <div class="stat-card">
    <div class="stat-card-header">
      <div class="stat-card-icon danger">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
          <line x1="12" y1="9" x2="12" y2="13"/>
          <line x1="12" y1="17" x2="12.01" y2="17"/>
        </svg>
      </div>
    </div>
    <div class="stat-card-label">Escalated</div>
    <div class="stat-card-value">{data.stats.escalatedCount}</div>
    <div class="stat-card-change {data.stats.escalatedCount > 0 ? 'negative' : 'positive'}">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10"/>
        <line x1="12" y1="8" x2="12" y2="12"/>
        <line x1="12" y1="16" x2="12.01" y2="16"/>
      </svg>
      Needs attention
    </div>
  </div>
</div>

<!-- Filters Bar -->
<div class="filters-bar">
  <div class="filter-group">
    <label class="filter-label">Status</label>
    <select class="form-input form-select filter-input" bind:value={statusFilter} onchange={applyFilters}>
      <option value="">All Open</option>
      <option value="open">Open</option>
      <option value="pending">Pending</option>
      <option value="in_progress">In Progress</option>
      <option value="escalated">Escalated</option>
      <option value="resolved">Resolved</option>
      <option value="closed">Closed</option>
    </select>
  </div>

  <div class="filter-group">
    <label class="filter-label">Priority</label>
    <select class="form-input form-select filter-input" bind:value={priorityFilter} onchange={applyFilters}>
      <option value="">All Priorities</option>
      <option value="urgent">Urgent</option>
      <option value="high">High</option>
      <option value="medium">Medium</option>
      <option value="low">Low</option>
    </select>
  </div>

  <div class="filter-group">
    <label class="filter-label">Client</label>
    <select class="form-input form-select filter-input" bind:value={clientFilter} onchange={applyFilters}>
      <option value="">All Clients</option>
      {#each data.organizations as org}
        <option value={org.id}>{org.name}</option>
      {/each}
    </select>
  </div>

  <div class="filter-group">
    <label class="filter-label">Assigned To</label>
    <select class="form-input form-select filter-input" bind:value={assigneeFilter} onchange={applyFilters}>
      <option value="">All Assignees</option>
      {#each data.supportUsers as user}
        <option value={user.id}>{user.name}</option>
      {/each}
    </select>
  </div>

  <div class="filter-group" style="margin-left: auto;">
    <label class="filter-label">&nbsp;</label>
    <button class="btn btn-secondary" onclick={clearFilters}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <line x1="18" y1="6" x2="6" y2="18"/>
        <line x1="6" y1="6" x2="18" y2="18"/>
      </svg>
      Clear Filters
    </button>
  </div>
</div>

<!-- Tickets Table -->
<div class="card">
  <div class="table-container">
    <table class="table">
      <thead>
        <tr>
          <th>Ticket ID</th>
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
            <tr class="ticket-row {ticket.priority === 'urgent' || ticket.priority === 'high' ? 'priority-highlight' : ''}">
              <td>
                <span class="ticket-number">#{ticket.ticketNumber}</span>
              </td>
              <td>
                <div class="client-name-cell">
                  <div class="client-avatar">{getInitials(ticket.organization.name)}</div>
                  <div class="client-info">
                    <div class="client-practice-name">{ticket.organization.name}</div>
                    <div class="client-contact">{ticket.submittedBy.email}</div>
                  </div>
                </div>
              </td>
              <td>
                <div class="ticket-subject">
                  <span class="subject-text">{ticket.subject}</span>
                  <span class="category-badge">{ticket.category}</span>
                </div>
              </td>
              <td>
                <span class="badge badge-{getPriorityClass(ticket.priority)}">
                  {ticket.priority.charAt(0).toUpperCase() + ticket.priority.slice(1)}
                </span>
              </td>
              <td>
                <span class="badge badge-{getStatusClass(ticket.status)}">
                  {formatStatus(ticket.status)}
                </span>
              </td>
              <td>
                <div class="created-cell">
                  <span class="created-date">{formatDate(ticket.createdAt)}</span>
                  <span class="created-ago">{formatRelativeTime(ticket.ageHours)}</span>
                </div>
              </td>
              <td>
                {#if ticket.assignedTo}
                  <div class="assignee-cell">
                    <div class="assignee-avatar">{getInitials(ticket.assignedTo.name)}</div>
                    <span class="assignee-name">{ticket.assignedTo.name}</span>
                  </div>
                {:else}
                  <span class="unassigned">Unassigned</span>
                {/if}
              </td>
              <td>
                <div class="quick-actions">
                  <button class="action-btn" title="View Ticket" onclick={() => openTicketModal(ticket)}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                      <circle cx="12" cy="12" r="3"/>
                    </svg>
                  </button>
                  <form method="POST" action="?/assignTicket" use:enhance>
                    <input type="hidden" name="ticketId" value={ticket.id}>
                    <select
                      name="assignedTo"
                      class="action-select"
                      title="Assign"
                      onchange={(e) => e.currentTarget.form?.requestSubmit()}
                    >
                      <option value="" selected={!ticket.assignedTo}>Assign...</option>
                      {#each data.supportUsers as user}
                        <option value={user.id} selected={ticket.assignedTo?.id === user.id}>
                          {user.name}
                        </option>
                      {/each}
                    </select>
                  </form>
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
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                    <polyline points="22 4 12 14.01 9 11.01"/>
                  </svg>
                </div>
                <h3 class="empty-state-title">No tickets found</h3>
                <p class="empty-state-description">All caught up! No tickets match your current filters.</p>
                <button class="btn btn-secondary" onclick={clearFilters}>Clear Filters</button>
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
      <span class="pagination-info">
        Showing {((data.pagination.page - 1) * data.pagination.pageSize) + 1} - {Math.min(data.pagination.page * data.pagination.pageSize, data.pagination.totalCount)} of {data.pagination.totalCount} tickets
      </span>
      <div class="pagination-controls">
        {#if data.pagination.page > 1}
          <a href="?page={data.pagination.page - 1}&status={statusFilter}&priority={priorityFilter}&client={clientFilter}&assignee={assigneeFilter}" class="btn btn-secondary btn-sm">
            Previous
          </a>
        {/if}
        {#if data.pagination.page < data.pagination.totalPages}
          <a href="?page={data.pagination.page + 1}&status={statusFilter}&priority={priorityFilter}&client={clientFilter}&assignee={assigneeFilter}" class="btn btn-secondary btn-sm">
            Next
          </a>
        {/if}
      </div>
    </div>
  {/if}
</div>

<!-- Health Alerts Section -->
{#if data.healthAlerts && data.healthAlerts.length > 0}
  <div class="card" style="margin-top: var(--spacing-6);">
    <div class="card-header">
      <h3 class="card-title">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
          <line x1="12" y1="9" x2="12" y2="13"/>
          <line x1="12" y1="17" x2="12.01" y2="17"/>
        </svg>
        Active Health Alerts
      </h3>
      <span class="badge badge-danger">{data.healthAlerts.length} Active</span>
    </div>
    <div class="alerts-list">
      {#each data.healthAlerts as alert}
        <div class="alert-item severity-{alert.severity}">
          <div class="alert-content">
            <div class="alert-header">
              <span class="alert-title">{alert.title}</span>
              <span class="badge badge-{alert.severity === 'critical' ? 'danger' : alert.severity === 'high' ? 'warning' : 'secondary'}">
                {alert.severity}
              </span>
            </div>
            <div class="alert-meta">
              <span class="alert-client">{alert.organization.name}</span>
              <span class="alert-time">{formatDate(alert.createdAt)}</span>
            </div>
            <p class="alert-description">{alert.description}</p>
          </div>
          <div class="alert-actions">
            {#if !alert.isAcknowledged}
              <form method="POST" action="?/acknowledgeAlert" use:enhance>
                <input type="hidden" name="alertId" value={alert.id}>
                <button type="submit" class="btn btn-secondary btn-sm">Acknowledge</button>
              </form>
            {/if}
            <form method="POST" action="?/resolveAlert" use:enhance>
              <input type="hidden" name="alertId" value={alert.id}>
              <button type="submit" class="btn btn-primary btn-sm">Resolve</button>
            </form>
          </div>
        </div>
      {/each}
    </div>
  </div>
{/if}

<!-- Upcoming Reviews Section -->
{#if data.upcomingReviews && data.upcomingReviews.length > 0}
  <div class="card" style="margin-top: var(--spacing-6);">
    <div class="card-header">
      <h3 class="card-title">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
          <line x1="16" y1="2" x2="16" y2="6"/>
          <line x1="8" y1="2" x2="8" y2="6"/>
          <line x1="3" y1="10" x2="21" y2="10"/>
        </svg>
        Upcoming Monthly Reviews
      </h3>
      <span class="badge badge-primary">{data.upcomingReviews.length} Scheduled</span>
    </div>
    <div class="reviews-list">
      {#each data.upcomingReviews as review}
        <div class="review-item">
          <div class="review-date">
            <span class="review-day">{new Date(review.scheduledDate).getDate()}</span>
            <span class="review-month">{new Date(review.scheduledDate).toLocaleDateString('en-US', { month: 'short' })}</span>
          </div>
          <div class="review-content">
            <div class="review-client">{review.organization.name}</div>
            <div class="review-meta">
              <span>{review.reviewType.replace(/_/g, ' ')}</span>
              <span>{review.durationMinutes} min</span>
              {#if review.conductedBy}
                <span>with {review.conductedBy.name}</span>
              {/if}
            </div>
          </div>
          {#if review.meetingLink}
            <a href={review.meetingLink} target="_blank" rel="noopener" class="btn btn-secondary btn-sm">
              Join Meeting
            </a>
          {/if}
        </div>
      {/each}
    </div>
  </div>
{/if}

<!-- Ticket Detail Modal -->
{#if showTicketModal && selectedTicket}
  <div class="modal-overlay" onclick={closeTicketModal}>
    <div class="modal" onclick={(e) => e.stopPropagation()}>
      <div class="modal-header">
        <div class="modal-title-area">
          <h2 class="modal-title">Ticket #{selectedTicket.ticketNumber}</h2>
          <div class="modal-badges">
            <span class="badge badge-{getPriorityClass(selectedTicket.priority)}">
              {selectedTicket.priority}
            </span>
            <span class="badge badge-{getStatusClass(selectedTicket.status)}">
              {formatStatus(selectedTicket.status)}
            </span>
          </div>
        </div>
        <button class="modal-close" onclick={closeTicketModal}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>

      <div class="modal-body">
        <div class="ticket-details">
          <div class="ticket-info-grid">
            <div class="info-item">
              <span class="info-label">Client</span>
              <span class="info-value">{selectedTicket.organization.name}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Submitted By</span>
              <span class="info-value">{selectedTicket.submittedBy.name}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Category</span>
              <span class="info-value">{selectedTicket.category}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Created</span>
              <span class="info-value">{formatDate(selectedTicket.createdAt)}</span>
            </div>
          </div>

          <div class="ticket-subject-full">
            <h4>{selectedTicket.subject}</h4>
            <p>{selectedTicket.description}</p>
          </div>

          <!-- Messages Thread -->
          <div class="messages-thread">
            <h4>Conversation</h4>
            {#if selectedTicket.messages.length > 0}
              {#each selectedTicket.messages as message}
                <div class="message {message.isInternal ? 'internal' : ''} {message.sender.role === 'client_owner' || message.sender.role === 'client_admin' || message.sender.role === 'client_staff' ? 'client' : 'staff'}">
                  <div class="message-header">
                    <span class="message-sender">{message.sender.name}</span>
                    {#if message.isInternal}
                      <span class="badge badge-secondary">Internal Note</span>
                    {/if}
                    <span class="message-time">{formatDate(message.createdAt)}</span>
                  </div>
                  <div class="message-body">{message.message}</div>
                </div>
              {/each}
            {:else}
              <p class="no-messages">No messages yet.</p>
            {/if}
          </div>

          <!-- Reply Form -->
          <form method="POST" action="?/replyToTicket" use:enhance class="reply-form">
            <input type="hidden" name="ticketId" value={selectedTicket.id}>
            <input type="hidden" name="isInternal" value={isInternalNote.toString()}>
            <textarea
              name="message"
              class="form-input reply-textarea"
              placeholder={isInternalNote ? 'Add internal note...' : 'Type your reply...'}
              bind:value={replyMessage}
              rows="4"
            ></textarea>
            <div class="reply-actions">
              <label class="internal-toggle">
                <input type="checkbox" bind:checked={isInternalNote}>
                <span>Internal Note</span>
              </label>
              <button type="submit" class="btn btn-primary" disabled={!replyMessage.trim()}>
                {isInternalNote ? 'Add Note' : 'Send Reply'}
              </button>
            </div>
          </form>
        </div>

        <!-- Status Actions -->
        <div class="modal-actions">
          <form method="POST" action="?/updateTicketStatus" use:enhance class="status-form">
            <input type="hidden" name="ticketId" value={selectedTicket.id}>
            <select name="status" class="form-input form-select">
              <option value="open" selected={selectedTicket.status === 'open'}>Open</option>
              <option value="pending" selected={selectedTicket.status === 'pending'}>Pending</option>
              <option value="in_progress" selected={selectedTicket.status === 'in_progress'}>In Progress</option>
              <option value="escalated" selected={selectedTicket.status === 'escalated'}>Escalated</option>
              <option value="resolved" selected={selectedTicket.status === 'resolved'}>Resolved</option>
              <option value="closed" selected={selectedTicket.status === 'closed'}>Closed</option>
            </select>
            <button type="submit" class="btn btn-secondary">Update Status</button>
          </form>

          <form method="POST" action="?/updatePriority" use:enhance class="priority-form">
            <input type="hidden" name="ticketId" value={selectedTicket.id}>
            <select name="priority" class="form-input form-select">
              <option value="low" selected={selectedTicket.priority === 'low'}>Low</option>
              <option value="medium" selected={selectedTicket.priority === 'medium'}>Medium</option>
              <option value="high" selected={selectedTicket.priority === 'high'}>High</option>
              <option value="urgent" selected={selectedTicket.priority === 'urgent'}>Urgent</option>
            </select>
            <button type="submit" class="btn btn-secondary">Update Priority</button>
          </form>
        </div>
      </div>
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

  /* Ticket Number */
  .ticket-number {
    font-family: monospace;
    font-weight: 600;
    color: var(--gray-700);
  }

  /* Client Cell */
  .client-name-cell {
    display: flex;
    align-items: center;
    gap: var(--spacing-3);
  }

  .client-avatar {
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

  .client-info {
    display: flex;
    flex-direction: column;
  }

  .client-practice-name {
    font-weight: 500;
    color: var(--gray-900);
  }

  .client-contact {
    font-size: 0.75rem;
    color: var(--gray-500);
  }

  /* Ticket Subject */
  .ticket-subject {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-1);
  }

  .subject-text {
    font-weight: 500;
    color: var(--gray-900);
    max-width: 300px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .category-badge {
    font-size: 0.6875rem;
    text-transform: uppercase;
    color: var(--gray-500);
    letter-spacing: 0.05em;
  }

  /* Badges */
  .badge {
    display: inline-flex;
    align-items: center;
    padding: 4px 10px;
    border-radius: var(--radius-full);
    font-size: 0.75rem;
    font-weight: 500;
  }

  .badge-primary {
    background: var(--primary-100);
    color: var(--primary-700);
  }

  .badge-secondary {
    background: var(--gray-100);
    color: var(--gray-600);
  }

  .badge-success {
    background: var(--success-100);
    color: var(--success-700);
  }

  .badge-warning {
    background: var(--warning-100);
    color: var(--warning-600);
  }

  .badge-danger {
    background: var(--danger-100);
    color: var(--danger-600);
  }

  .badge-info {
    background: #dbeafe;
    color: #1d4ed8;
  }

  /* Created Cell */
  .created-cell {
    display: flex;
    flex-direction: column;
  }

  .created-date {
    font-size: 0.875rem;
    color: var(--gray-700);
  }

  .created-ago {
    font-size: 0.75rem;
    color: var(--gray-500);
  }

  /* Assignee Cell */
  .assignee-cell {
    display: flex;
    align-items: center;
    gap: var(--spacing-2);
  }

  .assignee-avatar {
    width: 28px;
    height: 28px;
    border-radius: var(--radius-md);
    background: var(--gray-200);
    color: var(--gray-600);
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 600;
    font-size: 0.6875rem;
  }

  .assignee-name {
    font-size: 0.875rem;
    color: var(--gray-700);
  }

  .unassigned {
    font-size: 0.875rem;
    color: var(--gray-400);
    font-style: italic;
  }

  /* Quick Actions */
  .quick-actions {
    display: flex;
    gap: var(--spacing-2);
    align-items: center;
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

  .action-select {
    padding: 4px 8px;
    font-size: 0.75rem;
    border: 1px solid var(--gray-200);
    border-radius: var(--radius-md);
    background: white;
    color: var(--gray-600);
    cursor: pointer;
  }

  /* Priority Highlight */
  .ticket-row.priority-highlight {
    background: var(--warning-50);
  }

  /* Pagination */
  .pagination {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--spacing-4) var(--spacing-5);
    border-top: 1px solid var(--gray-200);
  }

  .pagination-info {
    font-size: 0.875rem;
    color: var(--gray-500);
  }

  .pagination-controls {
    display: flex;
    gap: var(--spacing-2);
  }

  .btn-sm {
    padding: 6px 12px;
    font-size: 0.8125rem;
  }

  /* Card Header */
  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--spacing-4) var(--spacing-5);
    border-bottom: 1px solid var(--gray-200);
  }

  .card-title {
    display: flex;
    align-items: center;
    gap: var(--spacing-2);
    font-size: 1rem;
    font-weight: 600;
    color: var(--gray-900);
    margin: 0;
  }

  /* Health Alerts */
  .alerts-list {
    padding: var(--spacing-4);
  }

  .alert-item {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    padding: var(--spacing-4);
    border-radius: var(--radius-lg);
    margin-bottom: var(--spacing-3);
    border-left: 4px solid var(--gray-300);
    background: var(--gray-50);
  }

  .alert-item.severity-critical {
    border-left-color: var(--danger-500);
    background: var(--danger-50);
  }

  .alert-item.severity-high {
    border-left-color: var(--warning-500);
    background: var(--warning-50);
  }

  .alert-content {
    flex: 1;
  }

  .alert-header {
    display: flex;
    align-items: center;
    gap: var(--spacing-2);
    margin-bottom: var(--spacing-1);
  }

  .alert-title {
    font-weight: 600;
    color: var(--gray-900);
  }

  .alert-meta {
    display: flex;
    gap: var(--spacing-3);
    font-size: 0.75rem;
    color: var(--gray-500);
    margin-bottom: var(--spacing-2);
  }

  .alert-description {
    font-size: 0.875rem;
    color: var(--gray-600);
    margin: 0;
  }

  .alert-actions {
    display: flex;
    gap: var(--spacing-2);
    flex-shrink: 0;
    margin-left: var(--spacing-4);
  }

  /* Upcoming Reviews */
  .reviews-list {
    padding: var(--spacing-4);
  }

  .review-item {
    display: flex;
    align-items: center;
    gap: var(--spacing-4);
    padding: var(--spacing-3);
    border-radius: var(--radius-lg);
    background: var(--gray-50);
    margin-bottom: var(--spacing-3);
  }

  .review-date {
    display: flex;
    flex-direction: column;
    align-items: center;
    width: 50px;
    padding: var(--spacing-2);
    background: white;
    border-radius: var(--radius-md);
    border: 1px solid var(--gray-200);
  }

  .review-day {
    font-size: 1.25rem;
    font-weight: 700;
    color: var(--primary-600);
  }

  .review-month {
    font-size: 0.6875rem;
    text-transform: uppercase;
    color: var(--gray-500);
  }

  .review-content {
    flex: 1;
  }

  .review-client {
    font-weight: 600;
    color: var(--gray-900);
  }

  .review-meta {
    display: flex;
    gap: var(--spacing-3);
    font-size: 0.75rem;
    color: var(--gray-500);
  }

  /* Modal Styles */
  .modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    padding: var(--spacing-6);
  }

  .modal {
    background: white;
    border-radius: var(--radius-xl);
    width: 100%;
    max-width: 800px;
    max-height: 90vh;
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }

  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    padding: var(--spacing-5);
    border-bottom: 1px solid var(--gray-200);
  }

  .modal-title-area {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-2);
  }

  .modal-title {
    font-size: 1.25rem;
    font-weight: 600;
    color: var(--gray-900);
    margin: 0;
  }

  .modal-badges {
    display: flex;
    gap: var(--spacing-2);
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

  .ticket-info-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: var(--spacing-4);
    margin-bottom: var(--spacing-5);
  }

  .info-item {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-1);
  }

  .info-label {
    font-size: 0.75rem;
    font-weight: 500;
    color: var(--gray-500);
    text-transform: uppercase;
  }

  .info-value {
    font-weight: 500;
    color: var(--gray-900);
  }

  .ticket-subject-full {
    padding: var(--spacing-4);
    background: var(--gray-50);
    border-radius: var(--radius-lg);
    margin-bottom: var(--spacing-5);
  }

  .ticket-subject-full h4 {
    margin: 0 0 var(--spacing-2);
    font-size: 1rem;
    font-weight: 600;
    color: var(--gray-900);
  }

  .ticket-subject-full p {
    margin: 0;
    color: var(--gray-600);
    line-height: 1.6;
  }

  /* Messages Thread */
  .messages-thread {
    margin-bottom: var(--spacing-5);
  }

  .messages-thread h4 {
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--gray-700);
    margin: 0 0 var(--spacing-3);
  }

  .message {
    padding: var(--spacing-3);
    border-radius: var(--radius-lg);
    margin-bottom: var(--spacing-3);
    border-left: 3px solid var(--gray-300);
    background: var(--gray-50);
  }

  .message.staff {
    border-left-color: var(--primary-500);
    background: var(--primary-50);
  }

  .message.internal {
    border-left-color: var(--warning-500);
    background: var(--warning-50);
  }

  .message-header {
    display: flex;
    align-items: center;
    gap: var(--spacing-2);
    margin-bottom: var(--spacing-2);
  }

  .message-sender {
    font-weight: 600;
    color: var(--gray-900);
  }

  .message-time {
    font-size: 0.75rem;
    color: var(--gray-500);
    margin-left: auto;
  }

  .message-body {
    color: var(--gray-700);
    line-height: 1.6;
  }

  .no-messages {
    color: var(--gray-500);
    font-style: italic;
    text-align: center;
    padding: var(--spacing-4);
  }

  /* Reply Form */
  .reply-form {
    margin-top: var(--spacing-4);
  }

  .reply-textarea {
    width: 100%;
    resize: vertical;
    min-height: 100px;
  }

  .reply-actions {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: var(--spacing-3);
  }

  .internal-toggle {
    display: flex;
    align-items: center;
    gap: var(--spacing-2);
    font-size: 0.875rem;
    color: var(--gray-600);
    cursor: pointer;
  }

  .internal-toggle input {
    width: 16px;
    height: 16px;
  }

  /* Modal Actions */
  .modal-actions {
    display: flex;
    gap: var(--spacing-4);
    margin-top: var(--spacing-5);
    padding-top: var(--spacing-5);
    border-top: 1px solid var(--gray-200);
  }

  .status-form,
  .priority-form {
    display: flex;
    gap: var(--spacing-2);
    align-items: center;
  }

  .status-form select,
  .priority-form select {
    min-width: 140px;
  }

  /* Empty State */
  .empty-state {
    text-align: center;
    padding: var(--spacing-10);
  }

  .empty-state-icon {
    width: 64px;
    height: 64px;
    margin: 0 auto var(--spacing-4);
    background: var(--success-100);
    border-radius: var(--radius-full);
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--success-600);
  }

  .empty-state-title {
    font-size: 1.125rem;
    font-weight: 600;
    color: var(--gray-900);
    margin: 0 0 var(--spacing-2);
  }

  .empty-state-description {
    color: var(--gray-500);
    margin: 0 0 var(--spacing-4);
  }
</style>
