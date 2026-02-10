<script lang="ts">
  import { enhance } from '$app/forms';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();

  // Modal state
  let showAddClientModal = $state(false);
  let isSubmitting = $state(false);

  // Helper functions
  function formatCurrency(value: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
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
</script>

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
    <div class="stat-card-label">Active Clients</div>
    <div class="stat-card-value">{data.stats?.activeClients ?? 0}</div>
    <div class="stat-card-change positive">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/>
      </svg>
      +3 this month
    </div>
  </div>

  <div class="stat-card">
    <div class="stat-card-header">
      <div class="stat-card-icon success">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/>
          <line x1="1" y1="10" x2="23" y2="10"/>
        </svg>
      </div>
    </div>
    <div class="stat-card-label">Monthly Revenue</div>
    <div class="stat-card-value">$47,500</div>
    <div class="stat-card-change positive">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/>
      </svg>
      +12% vs last month
    </div>
  </div>

  <div class="stat-card">
    <div class="stat-card-header">
      <div class="stat-card-icon warning">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
        </svg>
      </div>
    </div>
    <div class="stat-card-label">Leads This Month</div>
    <div class="stat-card-value">{data.stats?.totalLeadsThisMonth ?? 0}</div>
    <div class="stat-card-change positive">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/>
      </svg>
      +8% vs last month
    </div>
  </div>

  <div class="stat-card">
    <div class="stat-card-header">
      <div class="stat-card-icon danger">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/>
          <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
          <line x1="12" y1="17" x2="12.01" y2="17"/>
        </svg>
      </div>
    </div>
    <div class="stat-card-label">Open Tickets</div>
    <div class="stat-card-value">{data.stats?.pendingTickets ?? 0}</div>
    <div class="stat-card-change negative">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polyline points="23 18 13.5 8.5 8.5 13.5 1 6"/>
      </svg>
      +2 from yesterday
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
      <input type="text" class="form-input filter-input" placeholder="Search clients..." style="padding-left: 40px;">
    </div>
  </div>
  <div class="filter-group">
    <label class="filter-label">Status</label>
    <select class="form-input form-select filter-input">
      <option value="">All Status</option>
      <option value="active">Active</option>
      <option value="paused">Paused</option>
      <option value="churned">Churned</option>
    </select>
  </div>
  <div class="filter-group">
    <label class="filter-label">Health</label>
    <select class="form-input form-select filter-input">
      <option value="">All Health</option>
      <option value="excellent">Excellent (85+)</option>
      <option value="good">Good (70-84)</option>
      <option value="warning">Warning (50-69)</option>
      <option value="critical">Critical (&lt;50)</option>
    </select>
  </div>
  <div class="filter-group" style="margin-left: auto;">
    <label class="filter-label">&nbsp;</label>
    <button class="btn btn-primary" onclick={() => showAddClientModal = true}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <line x1="12" y1="5" x2="12" y2="19"/>
        <line x1="5" y1="12" x2="19" y2="12"/>
      </svg>
      Add Client
    </button>
  </div>
</div>

<!-- Clients Table -->
<div class="card">
  <div class="table-container">
    <table class="table">
      <thead>
        <tr>
          <th>Client</th>
          <th>Territory</th>
          <th>Health</th>
          <th>MRR</th>
          <th>Leads/Mo</th>
          <th>CPL</th>
          <th>Contract</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        {#if data.clients && data.clients.length > 0}
          {#each data.clients as client}
            <tr>
              <td>
                <div class="client-name-cell">
                  <div class="client-avatar">{getInitials(client.name)}</div>
                  <div class="client-info">
                    <div class="client-practice-name">{client.name}</div>
                    <div class="client-contact">{client.slug}</div>
                  </div>
                </div>
              </td>
              <td>{client.territory?.location || 'Unassigned'}</td>
              <td>
                <div class="health-score {getHealthClass(client.healthScore || 0)}">
                  {client.healthScore || 0}
                </div>
              </td>
              <td>{formatCurrency(client.contract?.mrr || 0)}</td>
              <td>{client.leadsThisMonth || 0}</td>
              <td class="cpl-value {(client.cpl || 0) <= 50 ? 'good' : (client.cpl || 0) <= 75 ? 'average' : 'poor'}">
                {formatCurrency(client.cpl || 0)}
              </td>
              <td>
                <span class="contract-status {client.status || 'active'}">
                  {client.status || 'Active'}
                </span>
              </td>
              <td>
                <div class="quick-actions">
                  <a href="/internal/clients/{client.id}" class="action-btn" title="View Details">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                      <circle cx="12" cy="12" r="3"/>
                    </svg>
                  </a>
                  <button class="action-btn primary" title="Edit">
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
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                    <circle cx="9" cy="7" r="4"/>
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                    <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                  </svg>
                </div>
                <h3 class="empty-state-title">No clients yet</h3>
                <p class="empty-state-description">Get started by adding your first client.</p>
                <button class="btn btn-primary" onclick={() => showAddClientModal = true}>Add First Client</button>
              </div>
            </td>
          </tr>
        {/if}
      </tbody>
    </table>
  </div>
</div>

<!-- Add Client Modal -->
{#if showAddClientModal}
<div class="modal-overlay open" onclick={(e) => e.target === e.currentTarget && (showAddClientModal = false)}>
  <div class="modal" style="max-width: 600px;">
    <div class="modal-header">
      <h2 class="modal-title">Add New Client</h2>
      <button class="modal-close" onclick={() => showAddClientModal = false}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="18" y1="6" x2="6" y2="18"/>
          <line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
    </div>
    <form
      method="POST"
      action="?/addClient"
      use:enhance={() => {
        isSubmitting = true;
        return async ({ result, update }) => {
          isSubmitting = false;
          if (result.type === 'success') {
            showAddClientModal = false;
          }
          await update();
        };
      }}
    >
      <div class="modal-body">
        <div class="form-group">
          <label for="name" class="form-label">Practice Name *</label>
          <input type="text" id="name" name="name" class="form-input" placeholder="e.g., Smile Dental Care" required />
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--spacing-4);">
          <div class="form-group">
            <label for="email" class="form-label">Contact Email *</label>
            <input type="email" id="email" name="email" class="form-input" placeholder="contact@practice.com" required />
          </div>
          <div class="form-group">
            <label for="phone" class="form-label">Phone</label>
            <input type="tel" id="phone" name="phone" class="form-input" placeholder="(555) 123-4567" />
          </div>
        </div>

        <div style="display: grid; grid-template-columns: 2fr 1fr 1fr; gap: var(--spacing-4);">
          <div class="form-group">
            <label for="city" class="form-label">City *</label>
            <input type="text" id="city" name="city" class="form-input" placeholder="City" required />
          </div>
          <div class="form-group">
            <label for="state" class="form-label">State *</label>
            <input type="text" id="state" name="state" class="form-input" placeholder="CA" maxlength="2" required />
          </div>
          <div class="form-group">
            <label for="zip" class="form-label">ZIP</label>
            <input type="text" id="zip" name="zip" class="form-input" placeholder="90210" />
          </div>
        </div>

        <div class="form-group">
          <label for="website" class="form-label">Website</label>
          <input type="url" id="website" name="website" class="form-input" placeholder="https://practice.com" />
        </div>

        <div class="form-group">
          <label for="plan" class="form-label">Plan Tier</label>
          <select id="plan" name="plan" class="form-input form-select">
            <option value="starter">Starter - $1,500/mo</option>
            <option value="growth" selected>Growth - $2,500/mo</option>
            <option value="enterprise">Enterprise - $4,000+/mo</option>
          </select>
        </div>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-secondary" onclick={() => showAddClientModal = false}>Cancel</button>
        <button type="submit" class="btn btn-primary" disabled={isSubmitting}>
          {#if isSubmitting}
            Creating...
          {:else}
            Create Client
          {/if}
        </button>
      </div>
    </form>
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
    min-width: 180px;
  }

  .search-filter {
    flex: 1;
    min-width: 250px;
  }

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

  .health-score {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 42px;
    height: 28px;
    border-radius: var(--radius-md);
    font-weight: 600;
    font-size: 0.8125rem;
  }

  .health-score.excellent {
    background: var(--success-100);
    color: var(--success-700);
  }

  .health-score.good {
    background: #dcfce7;
    color: #15803d;
  }

  .health-score.warning {
    background: var(--warning-100);
    color: var(--warning-600);
  }

  .health-score.critical {
    background: var(--danger-100);
    color: var(--danger-600);
  }

  .cpl-value {
    font-weight: 500;
  }

  .cpl-value.good {
    color: var(--success-600);
  }

  .cpl-value.average {
    color: var(--warning-600);
  }

  .cpl-value.poor {
    color: var(--danger-500);
  }

  .contract-status {
    display: inline-flex;
    align-items: center;
    gap: var(--spacing-1);
    padding: 4px 10px;
    border-radius: var(--radius-full);
    font-size: 0.75rem;
    font-weight: 500;
  }

  .contract-status.active {
    background: var(--success-100);
    color: var(--success-700);
  }

  .contract-status.renewing {
    background: var(--primary-100);
    color: var(--primary-700);
  }

  .contract-status.expiring {
    background: var(--warning-100);
    color: var(--warning-600);
  }

  .contract-status.churned {
    background: var(--gray-100);
    color: var(--gray-600);
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
</style>
