<script lang="ts">
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();

  function getStatusColor(status: string): string {
    switch (status) {
      case 'open': return 'badge-primary';
      case 'in_progress': return 'badge-warning';
      case 'resolved': return 'badge-success';
      case 'closed': return 'badge-gray';
      default: return 'badge-gray';
    }
  }

  function formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  }
</script>

<svelte:head>
  <title>Support - Implant Lead Engine</title>
</svelte:head>

<div class="page-content">
  <div class="mb-6">
    <h1 class="text-2xl font-bold text-gray-900">Support Center</h1>
    <p class="text-gray-500">Get help with your account, view tickets, and access resources.</p>
  </div>

  <div class="grid grid-cols-3 mb-6">
    <!-- Quick Actions -->
    <div class="card" style="grid-column: span 2;">
      <div class="card-header">
        <h2 class="card-title">How can we help?</h2>
      </div>
      <div class="card-body">
        <div class="grid grid-cols-3 gap-4">
          <button class="p-6 text-center" style="background: var(--gray-50); border-radius: var(--radius-lg); border: 1px solid var(--gray-200);">
            <div class="avatar mx-auto mb-3" style="background: var(--primary-100); color: var(--primary-600); width: 48px; height: 48px;">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
              </svg>
            </div>
            <div class="font-medium text-gray-900">New Ticket</div>
            <div class="text-sm text-gray-500 mt-1">Submit a support request</div>
          </button>

          <button class="p-6 text-center" style="background: var(--gray-50); border-radius: var(--radius-lg); border: 1px solid var(--gray-200);">
            <div class="avatar mx-auto mb-3" style="background: var(--success-100); color: var(--success-600); width: 48px; height: 48px;">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/>
                <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
                <line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
            </div>
            <div class="font-medium text-gray-900">FAQ</div>
            <div class="text-sm text-gray-500 mt-1">Common questions answered</div>
          </button>

          <button class="p-6 text-center" style="background: var(--gray-50); border-radius: var(--radius-lg); border: 1px solid var(--gray-200);">
            <div class="avatar mx-auto mb-3" style="background: var(--warning-100); color: var(--warning-600); width: 48px; height: 48px;">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
              </svg>
            </div>
            <div class="font-medium text-gray-900">Documentation</div>
            <div class="text-sm text-gray-500 mt-1">Guides and tutorials</div>
          </button>
        </div>
      </div>
    </div>

    <!-- Contact Info -->
    <div class="card">
      <div class="card-header">
        <h2 class="card-title">Contact Us</h2>
      </div>
      <div class="card-body">
        <div class="flex flex-col gap-4">
          <div>
            <div class="text-sm text-gray-500">Email</div>
            <div class="font-medium">support@squeez.media</div>
          </div>
          <div>
            <div class="text-sm text-gray-500">Phone</div>
            <div class="font-medium">(555) 123-4567</div>
          </div>
          <div>
            <div class="text-sm text-gray-500">Hours</div>
            <div class="font-medium">Mon-Fri, 9am-6pm ET</div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- Your Tickets -->
  <div class="card">
    <div class="card-header">
      <h2 class="card-title">Your Tickets</h2>
      <button class="btn btn-primary btn-sm">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="12" y1="5" x2="12" y2="19"/>
          <line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
        New Ticket
      </button>
    </div>
    <div class="table-container">
      <table class="table">
        <thead>
          <tr>
            <th>Ticket #</th>
            <th>Subject</th>
            <th>Status</th>
            <th>Created</th>
            <th>Last Update</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {#if data.tickets && data.tickets.length > 0}
            {#each data.tickets as ticket}
              <tr>
                <td class="font-medium">#{ticket.ticketNumber}</td>
                <td>{ticket.subject}</td>
                <td>
                  <span class="badge {getStatusColor(ticket.status)}">{ticket.status.replace('_', ' ')}</span>
                </td>
                <td class="text-gray-500">{formatDate(ticket.createdAt)}</td>
                <td class="text-gray-500">{formatDate(ticket.updatedAt)}</td>
                <td>
                  <button class="btn btn-sm btn-outline">View</button>
                </td>
              </tr>
            {/each}
          {:else}
            <tr>
              <td colspan="6">
                <div class="empty-state">
                  <div class="empty-state-icon">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                      <polyline points="22 4 12 14.01 9 11.01"/>
                    </svg>
                  </div>
                  <h3 class="empty-state-title">No tickets</h3>
                  <p class="empty-state-description">You haven't submitted any support tickets yet.</p>
                  <button class="btn btn-primary">Create Your First Ticket</button>
                </div>
              </td>
            </tr>
          {/if}
        </tbody>
      </table>
    </div>
  </div>
</div>
