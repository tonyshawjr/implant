<script lang="ts">
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();

  function formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(amount);
  }

  function formatPercent(value: number): string {
    return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;
  }
</script>

<svelte:head>
  <title>Financial Overview - ILE Operations</title>
</svelte:head>

<div class="page-content">
  <!-- Stats Row -->
  <div class="grid grid-cols-4 mb-6">
    <div class="stat-card">
      <div class="stat-card-header">
        <div class="stat-card-icon primary">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="12" y1="1" x2="12" y2="23"/>
            <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
          </svg>
        </div>
      </div>
      <div class="stat-card-label">Monthly Recurring Revenue</div>
      <div class="stat-card-value">{formatCurrency(data.mrr?.current || 0)}</div>
      <div class="stat-card-change positive">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/>
        </svg>
        {formatPercent(data.mrr?.growth || 0)} from last month
      </div>
    </div>

    <div class="stat-card">
      <div class="stat-card-header">
        <div class="stat-card-icon success">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/>
            <line x1="1" y1="10" x2="23" y2="10"/>
          </svg>
        </div>
      </div>
      <div class="stat-card-label">Revenue This Month</div>
      <div class="stat-card-value">{formatCurrency(data.revenue?.thisMonth || 0)}</div>
    </div>

    <div class="stat-card">
      <div class="stat-card-header">
        <div class="stat-card-icon warning">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
          </svg>
        </div>
      </div>
      <div class="stat-card-label">Ad Spend (Managed)</div>
      <div class="stat-card-value">{formatCurrency(data.adSpend?.thisMonth || 0)}</div>
    </div>

    <div class="stat-card">
      <div class="stat-card-header">
        <div class="stat-card-icon danger">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
            <circle cx="8.5" cy="7" r="4"/>
            <line x1="18" y1="8" x2="23" y2="13"/>
            <line x1="23" y1="8" x2="18" y2="13"/>
          </svg>
        </div>
      </div>
      <div class="stat-card-label">Churn Rate</div>
      <div class="stat-card-value">{data.churn?.rate?.toFixed(1) || 0}%</div>
    </div>
  </div>

  <div class="grid grid-cols-2">
    <!-- Revenue Breakdown -->
    <div class="card">
      <div class="card-header">
        <h2 class="card-title">Revenue Breakdown</h2>
      </div>
      <div class="card-body">
        <div class="chart-placeholder">
          Revenue chart will render here
        </div>
        <div class="mt-4">
          <div class="flex justify-between items-center py-2 border-b" style="border-color: var(--gray-100);">
            <span class="text-gray-600">Platform Fees</span>
            <span class="font-semibold">{formatCurrency(data.revenue?.platformFees || 0)}</span>
          </div>
          <div class="flex justify-between items-center py-2 border-b" style="border-color: var(--gray-100);">
            <span class="text-gray-600">Ad Management</span>
            <span class="font-semibold">{formatCurrency(data.revenue?.adManagement || 0)}</span>
          </div>
          <div class="flex justify-between items-center py-2 border-b" style="border-color: var(--gray-100);">
            <span class="text-gray-600">Add-ons</span>
            <span class="font-semibold">{formatCurrency(data.revenue?.addons || 0)}</span>
          </div>
          <div class="flex justify-between items-center py-2">
            <span class="font-semibold text-gray-900">Total</span>
            <span class="font-bold text-primary">{formatCurrency(data.revenue?.thisMonth || 0)}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Clients at Risk -->
    <div class="card">
      <div class="card-header">
        <h2 class="card-title">Churn Risk</h2>
        <span class="badge badge-danger">{data.atRisk?.length || 0} at risk</span>
      </div>
      <div class="card-body">
        {#if data.atRisk && data.atRisk.length > 0}
          <div class="activity-feed">
            {#each data.atRisk as client}
              <div class="activity-item">
                <div class="avatar" style="background: var(--danger-100); color: var(--danger-600);">
                  {client.name?.charAt(0) || 'C'}
                </div>
                <div class="activity-content">
                  <div class="activity-title">{client.name}</div>
                  <div class="activity-time">
                    Health: {client.healthScore}% | MRR: {formatCurrency(client.mrr || 0)}
                  </div>
                </div>
                <a href="/internal/clients/{client.id}" class="btn btn-sm btn-outline">View</a>
              </div>
            {/each}
          </div>
        {:else}
          <div class="empty-state">
            <p class="text-success">No clients at churn risk!</p>
          </div>
        {/if}
      </div>
    </div>
  </div>

  <!-- Recent Invoices -->
  <div class="card mt-6">
    <div class="card-header">
      <h2 class="card-title">Recent Invoices</h2>
      <button class="btn btn-outline btn-sm">View All</button>
    </div>
    <div class="table-container">
      <table class="table">
        <thead>
          <tr>
            <th>Invoice #</th>
            <th>Client</th>
            <th>Amount</th>
            <th>Status</th>
            <th>Date</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {#if data.recentInvoices && data.recentInvoices.length > 0}
            {#each data.recentInvoices as invoice}
              <tr>
                <td class="font-medium">{invoice.number}</td>
                <td>{invoice.clientName}</td>
                <td class="font-semibold">{formatCurrency(invoice.amount)}</td>
                <td>
                  <span class="badge {invoice.status === 'paid' ? 'badge-success' : invoice.status === 'pending' ? 'badge-warning' : 'badge-danger'}">
                    {invoice.status}
                  </span>
                </td>
                <td class="text-gray-500">{new Date(invoice.date).toLocaleDateString()}</td>
                <td>
                  <button class="btn btn-sm btn-outline">View</button>
                </td>
              </tr>
            {/each}
          {:else}
            <tr>
              <td colspan="6" class="text-center text-gray-500 py-8">No recent invoices</td>
            </tr>
          {/if}
        </tbody>
      </table>
    </div>
  </div>
</div>
