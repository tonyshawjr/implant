<script lang="ts">
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();

  // Helper functions
  function formatCurrency(value: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  }

  function formatPercent(value: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'percent',
      minimumFractionDigits: 1,
      maximumFractionDigits: 1
    }).format(value / 100);
  }

  function formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  }

  function getHealthClass(score: number): string {
    if (score >= 85) return 'excellent';
    if (score >= 70) return 'good';
    if (score >= 50) return 'warning';
    return 'critical';
  }

  function getStatusClass(status: string): string {
    switch (status) {
      case 'paid': return 'success';
      case 'pending': return 'warning';
      case 'overdue': return 'danger';
      case 'draft': return 'neutral';
      default: return 'neutral';
    }
  }

  function getDaysUntilExpiry(dateStr: string): number {
    const expiry = new Date(dateStr);
    const now = new Date();
    const diffTime = expiry.getTime() - now.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  function getInitials(name: string): string {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }

  // Reactive state for date range filter
  let selectedRange = $state(data.dateRange.toString());
</script>

<svelte:head>
  <title>Financial Overview - ILE Operations</title>
</svelte:head>

<!-- Stats Row -->
<div class="stats-row">
  <div class="stat-card">
    <div class="stat-card-header">
      <div class="stat-card-icon success">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="12" y1="1" x2="12" y2="23"/>
          <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
        </svg>
      </div>
    </div>
    <div class="stat-card-label">Monthly Recurring Revenue</div>
    <div class="stat-card-value">{formatCurrency(data.summary.mrr)}</div>
    <div class="stat-card-change {data.summary.mrrGrowth >= 0 ? 'positive' : 'negative'}">
      {#if data.summary.mrrGrowth >= 0}
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/>
        </svg>
      {:else}
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="23 18 13.5 8.5 8.5 13.5 1 6"/>
        </svg>
      {/if}
      {data.summary.mrrGrowth >= 0 ? '+' : ''}{data.summary.mrrGrowth.toFixed(1)}% vs last month
    </div>
  </div>

  <div class="stat-card">
    <div class="stat-card-header">
      <div class="stat-card-icon primary">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/>
          <line x1="1" y1="10" x2="23" y2="10"/>
        </svg>
      </div>
    </div>
    <div class="stat-card-label">Annual Recurring Revenue</div>
    <div class="stat-card-value">{formatCurrency(data.summary.arr)}</div>
    <div class="stat-card-subtext">
      {data.summary.totalClients} active clients
    </div>
  </div>

  <div class="stat-card">
    <div class="stat-card-header">
      <div class="stat-card-icon warning">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
          <circle cx="9" cy="7" r="4"/>
          <line x1="19" y1="8" x2="19" y2="14"/>
          <line x1="22" y1="11" x2="16" y2="11"/>
        </svg>
      </div>
    </div>
    <div class="stat-card-label">Avg Revenue Per Client</div>
    <div class="stat-card-value">{formatCurrency(data.summary.avgRevenuePerClient)}</div>
    <div class="stat-card-subtext">
      +{formatCurrency(data.summary.addonMRR)} from add-ons
    </div>
  </div>

  <div class="stat-card">
    <div class="stat-card-header">
      <div class="stat-card-icon {data.summary.churnRate > 5 ? 'danger' : data.summary.churnRate > 2 ? 'warning' : 'success'}">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
          <circle cx="8.5" cy="7" r="4"/>
          <line x1="18" y1="8" x2="23" y2="13"/>
          <line x1="23" y1="8" x2="18" y2="13"/>
        </svg>
      </div>
    </div>
    <div class="stat-card-label">Monthly Churn Rate</div>
    <div class="stat-card-value">{data.summary.churnRate.toFixed(1)}%</div>
    <div class="stat-card-subtext">
      {data.churnRiskClients.length} clients at risk
    </div>
  </div>
</div>

<!-- Revenue Breakdown Section -->
<div class="content-grid">
  <!-- MRR by Tier -->
  <div class="card">
    <div class="card-header">
      <h3 class="card-title">Revenue by Tier</h3>
    </div>
    <div class="card-body">
      {#if data.mrrByTier.length > 0}
        <div class="tier-breakdown">
          {#each data.mrrByTier as tier}
            <div class="tier-item">
              <div class="tier-info">
                <span class="tier-name">{tier.tierName}</span>
                <span class="tier-clients">{tier.count} clients</span>
              </div>
              <div class="tier-revenue">
                <span class="tier-amount">{formatCurrency(tier.mrr)}</span>
                <span class="tier-percent">{tier.percentage.toFixed(1)}%</span>
              </div>
              <div class="tier-bar-container">
                <div class="tier-bar" style="width: {tier.percentage}%"></div>
              </div>
            </div>
          {/each}
        </div>
      {:else}
        <div class="empty-state-small">
          <p>No revenue data available</p>
        </div>
      {/if}
    </div>
  </div>

  <!-- Margin Analysis -->
  <div class="card">
    <div class="card-header">
      <h3 class="card-title">Margin Analysis</h3>
    </div>
    <div class="card-body">
      {#if data.marginAnalysis.length > 0}
        <div class="margin-table">
          <div class="margin-header">
            <span>Tier</span>
            <span>Revenue</span>
            <span>Est. Cost</span>
            <span>Margin</span>
          </div>
          {#each data.marginAnalysis as margin}
            <div class="margin-row">
              <span class="margin-tier">{margin.tierName}</span>
              <span>{formatCurrency(margin.revenue)}</span>
              <span class="margin-cost">{formatCurrency(margin.estimatedCost)}</span>
              <span class="margin-value {margin.marginPercent >= 60 ? 'good' : margin.marginPercent >= 40 ? 'average' : 'poor'}">
                {formatPercent(margin.marginPercent)}
              </span>
            </div>
          {/each}
        </div>
      {:else}
        <div class="empty-state-small">
          <p>No margin data available</p>
        </div>
      {/if}
    </div>
  </div>
</div>

<!-- MRR History Chart -->
<div class="card">
  <div class="card-header">
    <h3 class="card-title">MRR Trend (Last 6 Months)</h3>
  </div>
  <div class="card-body">
    <div class="mrr-chart">
      {#each data.mrrHistory as point, i}
        <div class="chart-bar-wrapper">
          <div class="chart-value">{formatCurrency(point.mrr)}</div>
          <div
            class="chart-bar"
            style="height: {Math.max(20, (point.mrr / Math.max(...data.mrrHistory.map(p => p.mrr), 1)) * 150)}px"
          ></div>
          <div class="chart-label">{point.month}</div>
        </div>
      {/each}
    </div>
  </div>
</div>

<!-- Clients at Risk Section -->
<div class="card">
  <div class="card-header">
    <h3 class="card-title">Clients at Risk</h3>
    <span class="card-badge danger">{data.churnRiskClients.length} at risk</span>
  </div>

  <!-- Desktop Table -->
  <div class="table-container desktop-table">
    <table class="table">
      <thead>
        <tr>
          <th>Client</th>
          <th>Health Score</th>
          <th>Plan</th>
          <th>MRR</th>
          <th>Contract Expires</th>
          <th>Risk Factor</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        {#if data.churnRiskClients.length > 0}
          {#each data.churnRiskClients as client}
            {@const daysUntil = client.contract ? getDaysUntilExpiry(client.contract.endDate) : 999}
            <tr>
              <td>
                <div class="client-name-cell">
                  <div class="client-avatar">{getInitials(client.name)}</div>
                  <div class="client-info">
                    <div class="client-practice-name">{client.name}</div>
                    <div class="client-contact">Since {client.clientSince ? formatDate(client.clientSince) : 'N/A'}</div>
                  </div>
                </div>
              </td>
              <td>
                <div class="health-score {getHealthClass(client.healthScore)}">
                  {client.healthScore}
                </div>
              </td>
              <td>{client.contract?.planName || 'N/A'}</td>
              <td>{client.contract ? formatCurrency(client.contract.monthlyCommitment) : 'N/A'}</td>
              <td>
                {#if client.contract}
                  <span class="expiry-date {daysUntil <= 30 ? 'urgent' : daysUntil <= 90 ? 'warning' : ''}">
                    {formatDate(client.contract.endDate)}
                  </span>
                  <span class="days-remaining">({daysUntil} days)</span>
                {:else}
                  N/A
                {/if}
              </td>
              <td>
                <div class="risk-factors">
                  {#if client.healthScore < 50}
                    <span class="risk-badge critical">Low Health</span>
                  {/if}
                  {#if daysUntil <= 90}
                    <span class="risk-badge warning">Expiring Soon</span>
                  {/if}
                </div>
              </td>
              <td>
                <div class="quick-actions">
                  <a href="/internal/clients/{client.id}" class="action-btn" title="View Details">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                      <circle cx="12" cy="12" r="3"/>
                    </svg>
                  </a>
                  <button class="action-btn primary" title="Contact Client">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72"/>
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
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                    <polyline points="22 4 12 14.01 9 11.01"/>
                  </svg>
                </div>
                <h3 class="empty-state-title">No clients at risk</h3>
                <p class="empty-state-description">All clients have healthy scores and active contracts.</p>
              </div>
            </td>
          </tr>
        {/if}
      </tbody>
    </table>
  </div>

  <!-- Mobile Card List -->
  <div class="mobile-card-list">
    {#if data.churnRiskClients.length > 0}
      {#each data.churnRiskClients as client}
        {@const daysUntil = client.contract ? getDaysUntilExpiry(client.contract.endDate) : 999}
        <a href="/internal/clients/{client.id}" class="mobile-card-item risk-client-card">
          <div class="mobile-card-header">
            <div class="client-name-cell">
              <div class="client-avatar">{getInitials(client.name)}</div>
              <div class="client-info">
                <div class="client-practice-name">{client.name}</div>
                <div class="client-contact">Since {client.clientSince ? formatDate(client.clientSince) : 'N/A'}</div>
              </div>
            </div>
            <div class="health-score {getHealthClass(client.healthScore)}">
              {client.healthScore}
            </div>
          </div>
          <div class="mobile-card-content">
            <div class="mobile-card-row">
              <span class="mobile-card-label">Plan</span>
              <span>{client.contract?.planName || 'N/A'}</span>
            </div>
            <div class="mobile-card-row">
              <span class="mobile-card-label">MRR</span>
              <span class="amount">{client.contract ? formatCurrency(client.contract.monthlyCommitment) : 'N/A'}</span>
            </div>
            <div class="mobile-card-row">
              <span class="mobile-card-label">Expires</span>
              <span>
                {#if client.contract}
                  <span class="expiry-date {daysUntil <= 30 ? 'urgent' : daysUntil <= 90 ? 'warning' : ''}">
                    {formatDate(client.contract.endDate)}
                  </span>
                  <span class="days-remaining">({daysUntil}d)</span>
                {:else}
                  N/A
                {/if}
              </span>
            </div>
            <div class="mobile-card-row">
              <span class="mobile-card-label">Risk</span>
              <div class="risk-factors">
                {#if client.healthScore < 50}
                  <span class="risk-badge critical">Low Health</span>
                {/if}
                {#if daysUntil <= 90}
                  <span class="risk-badge warning">Expiring Soon</span>
                {/if}
              </div>
            </div>
          </div>
          <div class="mobile-card-actions">
            <button class="btn btn-sm btn-outline" onclick={(e) => { e.preventDefault(); }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72"/>
              </svg>
              Contact
            </button>
            <span class="btn btn-sm btn-primary">
              View Details
            </span>
          </div>
        </a>
      {/each}
    {:else}
      <div class="empty-state-mobile">
        <div class="empty-state-icon">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
            <polyline points="22 4 12 14.01 9 11.01"/>
          </svg>
        </div>
        <h3 class="empty-state-title">No clients at risk</h3>
        <p class="empty-state-description">All clients have healthy scores and active contracts.</p>
      </div>
    {/if}
  </div>
</div>

<!-- Recent Transactions Section -->
<div class="content-grid">
  <!-- Recent Invoices -->
  <div class="card">
    <div class="card-header">
      <h3 class="card-title">Recent Transactions</h3>
      <a href="/internal/invoices" class="card-link">View All</a>
    </div>
    <div class="table-container">
      <table class="table compact">
        <thead>
          <tr>
            <th>Invoice</th>
            <th>Client</th>
            <th>Amount</th>
            <th>Status</th>
            <th>Date</th>
          </tr>
        </thead>
        <tbody>
          {#if data.recentInvoices.length > 0}
            {#each data.recentInvoices.slice(0, 10) as invoice}
              <tr>
                <td class="invoice-number">{invoice.invoiceNumber}</td>
                <td>{invoice.organization.name}</td>
                <td class="amount">{formatCurrency(invoice.totalAmount)}</td>
                <td>
                  <span class="status-badge {getStatusClass(invoice.status)}">
                    {invoice.status}
                  </span>
                </td>
                <td class="date">{formatDate(invoice.issueDate)}</td>
              </tr>
            {/each}
          {:else}
            <tr>
              <td colspan="5">
                <div class="empty-state-small">
                  <p>No recent transactions</p>
                </div>
              </td>
            </tr>
          {/if}
        </tbody>
      </table>
    </div>
  </div>

  <!-- Overdue Invoices -->
  <div class="card">
    <div class="card-header">
      <h3 class="card-title">Overdue Invoices</h3>
      <span class="card-badge danger">{data.overdueInvoices.length} overdue</span>
    </div>
    <div class="table-container">
      <table class="table compact">
        <thead>
          <tr>
            <th>Client</th>
            <th>Amount</th>
            <th>Due Date</th>
            <th>Days Overdue</th>
          </tr>
        </thead>
        <tbody>
          {#if data.overdueInvoices.length > 0}
            {#each data.overdueInvoices as invoice}
              {@const daysOverdue = Math.abs(getDaysUntilExpiry(invoice.dueDate))}
              <tr>
                <td>{invoice.organization.name}</td>
                <td class="amount">{formatCurrency(invoice.totalAmount)}</td>
                <td class="date">{formatDate(invoice.dueDate)}</td>
                <td>
                  <span class="overdue-days {daysOverdue > 30 ? 'critical' : daysOverdue > 14 ? 'warning' : ''}">
                    {daysOverdue} days
                  </span>
                </td>
              </tr>
            {/each}
          {:else}
            <tr>
              <td colspan="4">
                <div class="empty-state-small">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                    <polyline points="22 4 12 14.01 9 11.01"/>
                  </svg>
                  <p>No overdue invoices</p>
                </div>
              </td>
            </tr>
          {/if}
        </tbody>
      </table>
    </div>
  </div>
</div>

<!-- Invoice Stats Summary -->
<div class="stats-row stats-row-small">
  <div class="stat-card-mini">
    <div class="stat-mini-label">Paid Invoices</div>
    <div class="stat-mini-value success">{formatCurrency(data.invoiceStats.paid.total)}</div>
    <div class="stat-mini-count">{data.invoiceStats.paid.count} invoices</div>
  </div>
  <div class="stat-card-mini">
    <div class="stat-mini-label">Pending Invoices</div>
    <div class="stat-mini-value warning">{formatCurrency(data.invoiceStats.pending.total)}</div>
    <div class="stat-mini-count">{data.invoiceStats.pending.count} invoices</div>
  </div>
  <div class="stat-card-mini">
    <div class="stat-mini-label">Overdue Invoices</div>
    <div class="stat-mini-value danger">{formatCurrency(data.invoiceStats.overdue.total)}</div>
    <div class="stat-mini-count">{data.invoiceStats.overdue.count} invoices</div>
  </div>
  <div class="stat-card-mini">
    <div class="stat-mini-label">Draft Invoices</div>
    <div class="stat-mini-value neutral">{formatCurrency(data.invoiceStats.draft.total)}</div>
    <div class="stat-mini-count">{data.invoiceStats.draft.count} invoices</div>
  </div>
</div>

<style>
  /* Stats Row */
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

  .stat-card-subtext {
    font-size: 0.75rem;
    color: var(--gray-500);
    margin-top: var(--spacing-1);
  }

  /* Content Grid */
  .content-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: var(--spacing-6);
    margin-bottom: var(--spacing-6);
  }

  @media (max-width: 1024px) {
    .content-grid {
      grid-template-columns: 1fr;
    }
  }

  /* Card Styles */
  .card {
    background: white;
    border-radius: var(--radius-xl);
    border: 1px solid var(--gray-200);
    margin-bottom: var(--spacing-6);
  }

  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--spacing-4) var(--spacing-5);
    border-bottom: 1px solid var(--gray-100);
  }

  .card-title {
    font-size: 1rem;
    font-weight: 600;
    color: var(--gray-900);
    margin: 0;
  }

  .card-body {
    padding: var(--spacing-5);
  }

  .card-link {
    font-size: 0.875rem;
    color: var(--primary-600);
    text-decoration: none;
    font-weight: 500;
  }

  .card-link:hover {
    text-decoration: underline;
  }

  .card-badge {
    padding: 4px 10px;
    border-radius: var(--radius-full);
    font-size: 0.75rem;
    font-weight: 500;
  }

  .card-badge.danger {
    background: var(--danger-100);
    color: var(--danger-600);
  }

  /* Tier Breakdown */
  .tier-breakdown {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-4);
  }

  .tier-item {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-2);
  }

  .tier-info {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
  }

  .tier-name {
    font-weight: 600;
    color: var(--gray-900);
  }

  .tier-clients {
    font-size: 0.75rem;
    color: var(--gray-500);
  }

  .tier-revenue {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
  }

  .tier-amount {
    font-size: 1.125rem;
    font-weight: 600;
    color: var(--gray-900);
  }

  .tier-percent {
    font-size: 0.875rem;
    color: var(--gray-500);
  }

  .tier-bar-container {
    height: 8px;
    background: var(--gray-100);
    border-radius: var(--radius-full);
    overflow: hidden;
  }

  .tier-bar {
    height: 100%;
    background: linear-gradient(90deg, var(--primary-500), var(--primary-400));
    border-radius: var(--radius-full);
    transition: width 0.3s ease;
  }

  /* Margin Analysis */
  .margin-table {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-3);
  }

  .margin-header {
    display: grid;
    grid-template-columns: 1.5fr 1fr 1fr 0.8fr;
    gap: var(--spacing-4);
    font-size: 0.75rem;
    font-weight: 500;
    color: var(--gray-500);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    padding-bottom: var(--spacing-2);
    border-bottom: 1px solid var(--gray-100);
  }

  .margin-row {
    display: grid;
    grid-template-columns: 1.5fr 1fr 1fr 0.8fr;
    gap: var(--spacing-4);
    align-items: center;
    padding: var(--spacing-2) 0;
  }

  .margin-tier {
    font-weight: 500;
    color: var(--gray-900);
  }

  .margin-cost {
    color: var(--gray-500);
  }

  .margin-value {
    font-weight: 600;
    text-align: right;
  }

  .margin-value.good {
    color: var(--success-600);
  }

  .margin-value.average {
    color: var(--warning-600);
  }

  .margin-value.poor {
    color: var(--danger-500);
  }

  /* MRR Chart */
  .mrr-chart {
    display: flex;
    justify-content: space-around;
    align-items: flex-end;
    height: 200px;
    padding: var(--spacing-4) 0;
  }

  .chart-bar-wrapper {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--spacing-2);
  }

  .chart-value {
    font-size: 0.75rem;
    font-weight: 500;
    color: var(--gray-700);
  }

  .chart-bar {
    width: 48px;
    background: linear-gradient(180deg, var(--primary-400), var(--primary-600));
    border-radius: var(--radius-md) var(--radius-md) 0 0;
    transition: height 0.3s ease;
  }

  .chart-label {
    font-size: 0.75rem;
    color: var(--gray-500);
  }

  /* Table Styles */
  .table-container {
    overflow-x: auto;
  }

  .table {
    width: 100%;
    border-collapse: collapse;
  }

  .table th {
    padding: var(--spacing-3) var(--spacing-4);
    text-align: left;
    font-size: 0.75rem;
    font-weight: 500;
    color: var(--gray-500);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    background: var(--gray-50);
    border-bottom: 1px solid var(--gray-200);
  }

  .table td {
    padding: var(--spacing-3) var(--spacing-4);
    border-bottom: 1px solid var(--gray-100);
    font-size: 0.875rem;
    color: var(--gray-700);
  }

  .table.compact th,
  .table.compact td {
    padding: var(--spacing-2) var(--spacing-3);
  }

  .table tbody tr:hover {
    background: var(--gray-50);
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

  /* Health Score */
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

  /* Expiry & Risk */
  .expiry-date {
    font-weight: 500;
  }

  .expiry-date.urgent {
    color: var(--danger-600);
  }

  .expiry-date.warning {
    color: var(--warning-600);
  }

  .days-remaining {
    font-size: 0.75rem;
    color: var(--gray-500);
    margin-left: var(--spacing-1);
  }

  .risk-factors {
    display: flex;
    gap: var(--spacing-2);
    flex-wrap: wrap;
  }

  .risk-badge {
    padding: 2px 8px;
    border-radius: var(--radius-full);
    font-size: 0.6875rem;
    font-weight: 500;
  }

  .risk-badge.critical {
    background: var(--danger-100);
    color: var(--danger-600);
  }

  .risk-badge.warning {
    background: var(--warning-100);
    color: var(--warning-600);
  }

  /* Status Badge */
  .status-badge {
    display: inline-flex;
    align-items: center;
    gap: var(--spacing-1);
    padding: 4px 10px;
    border-radius: var(--radius-full);
    font-size: 0.75rem;
    font-weight: 500;
    text-transform: capitalize;
  }

  .status-badge.success {
    background: var(--success-100);
    color: var(--success-700);
  }

  .status-badge.warning {
    background: var(--warning-100);
    color: var(--warning-600);
  }

  .status-badge.danger {
    background: var(--danger-100);
    color: var(--danger-600);
  }

  .status-badge.neutral {
    background: var(--gray-100);
    color: var(--gray-600);
  }

  /* Invoice Table */
  .invoice-number {
    font-family: var(--font-mono);
    font-size: 0.8125rem;
    color: var(--gray-600);
  }

  .amount {
    font-weight: 600;
    color: var(--gray-900);
  }

  .date {
    color: var(--gray-500);
  }

  .overdue-days {
    font-weight: 500;
  }

  .overdue-days.warning {
    color: var(--warning-600);
  }

  .overdue-days.critical {
    color: var(--danger-600);
  }

  /* Quick Actions */
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

  /* Mini Stats Row */
  .stats-row-small {
    gap: var(--spacing-4);
  }

  .stat-card-mini {
    background: white;
    border-radius: var(--radius-lg);
    border: 1px solid var(--gray-200);
    padding: var(--spacing-4);
    text-align: center;
  }

  .stat-mini-label {
    font-size: 0.75rem;
    font-weight: 500;
    color: var(--gray-500);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin-bottom: var(--spacing-2);
  }

  .stat-mini-value {
    font-size: 1.25rem;
    font-weight: 700;
  }

  .stat-mini-value.success {
    color: var(--success-600);
  }

  .stat-mini-value.warning {
    color: var(--warning-600);
  }

  .stat-mini-value.danger {
    color: var(--danger-600);
  }

  .stat-mini-value.neutral {
    color: var(--gray-600);
  }

  .stat-mini-count {
    font-size: 0.75rem;
    color: var(--gray-500);
    margin-top: var(--spacing-1);
  }

  /* Empty States */
  .empty-state {
    padding: var(--spacing-8);
    text-align: center;
  }

  .empty-state-icon {
    width: 64px;
    height: 64px;
    border-radius: var(--radius-full);
    background: var(--success-100);
    color: var(--success-600);
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0 auto var(--spacing-4);
  }

  .empty-state-title {
    font-size: 1rem;
    font-weight: 600;
    color: var(--gray-900);
    margin: 0 0 var(--spacing-2);
  }

  .empty-state-description {
    font-size: 0.875rem;
    color: var(--gray-500);
    margin: 0;
  }

  .empty-state-small {
    padding: var(--spacing-4);
    text-align: center;
    color: var(--gray-500);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--spacing-2);
  }

  .empty-state-small svg {
    color: var(--success-500);
  }

  .empty-state-small p {
    margin: 0;
    font-size: 0.875rem;
  }

  /* Mobile Responsive Styles */
  .desktop-table {
    display: block;
  }

  .mobile-card-list {
    display: none;
  }

  @media (max-width: 768px) {
    .desktop-table {
      display: none;
    }

    .mobile-card-list {
      display: flex;
      flex-direction: column;
      gap: var(--spacing-3);
      padding: var(--spacing-4);
    }

    .mobile-card-item {
      background: white;
      border: 1px solid var(--gray-200);
      border-radius: var(--radius-lg);
      padding: var(--spacing-4);
      text-decoration: none;
      color: inherit;
    }

    .risk-client-card:active {
      background: var(--gray-50);
    }

    .mobile-card-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: var(--spacing-3);
      margin-bottom: var(--spacing-3);
    }

    .mobile-card-header .client-avatar {
      width: 44px;
      height: 44px;
      font-size: 0.9375rem;
    }

    .mobile-card-content {
      display: flex;
      flex-direction: column;
      gap: var(--spacing-3);
      padding-top: var(--spacing-3);
      border-top: 1px solid var(--gray-100);
      margin-bottom: var(--spacing-3);
    }

    .mobile-card-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .mobile-card-label {
      font-size: 0.75rem;
      font-weight: 500;
      color: var(--gray-500);
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .mobile-card-actions {
      display: flex;
      gap: var(--spacing-2);
      padding-top: var(--spacing-3);
      border-top: 1px solid var(--gray-100);
    }

    .mobile-card-actions .btn {
      flex: 1;
      justify-content: center;
      min-height: 44px;
      text-align: center;
    }

    /* Empty state mobile */
    .empty-state-mobile {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: var(--spacing-8) var(--spacing-4);
      text-align: center;
    }

    /* MRR Chart mobile */
    .mrr-chart {
      overflow-x: auto;
      -webkit-overflow-scrolling: touch;
      padding-bottom: var(--spacing-2);
    }

    .chart-bar-wrapper {
      flex-shrink: 0;
    }

    .chart-bar {
      width: 36px;
    }

    .chart-value {
      font-size: 0.6875rem;
    }

    /* Margin table mobile */
    .margin-header,
    .margin-row {
      grid-template-columns: 1.2fr 1fr 1fr 0.8fr;
      gap: var(--spacing-2);
      font-size: 0.75rem;
    }

    /* Card adjustments */
    .card-header {
      flex-direction: column;
      align-items: flex-start;
      gap: var(--spacing-2);
    }

    .card-body {
      padding: var(--spacing-4);
    }

    /* Stats row mini mobile */
    .stats-row-small {
      grid-template-columns: repeat(2, 1fr);
    }

    .stat-card-mini {
      padding: var(--spacing-3);
    }

    .stat-mini-value {
      font-size: 1rem;
    }
  }

  @media (max-width: 480px) {
    .margin-header,
    .margin-row {
      grid-template-columns: 1fr 1fr;
      gap: var(--spacing-2);
    }

    .margin-header span:nth-child(3),
    .margin-row span:nth-child(3) {
      display: none;
    }

    .mrr-chart {
      height: 160px;
    }

    .chart-bar {
      width: 28px;
    }
  }
</style>
