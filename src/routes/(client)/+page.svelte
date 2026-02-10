<script lang="ts">
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();

  function formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(amount);
  }

  function formatNumber(num: number): string {
    return new Intl.NumberFormat('en-US').format(num);
  }
</script>

<svelte:head>
  <title>Dashboard - Implant Lead Engine</title>
</svelte:head>

<div class="page-content">
  <!-- Welcome Section -->
  <div class="mb-6">
    <h1 class="text-2xl font-bold text-gray-900">Welcome back!</h1>
    <p class="text-gray-500">Here's what's happening with your campaigns today.</p>
  </div>

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
      <div class="stat-card-label">Leads This Month</div>
      <div class="stat-card-value">{data.stats?.leadsThisMonth || 0}</div>
      <div class="stat-card-change positive">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/>
        </svg>
        +{data.stats?.leadsGrowth || 0}% from last month
      </div>
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
      <div class="stat-card-label">Cost Per Lead</div>
      <div class="stat-card-value">{formatCurrency(data.stats?.costPerLead || 0)}</div>
    </div>

    <div class="stat-card">
      <div class="stat-card-header">
        <div class="stat-card-icon warning">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M3 11l18-5v12L3 13v-2z"/>
            <path d="M11.6 16.8a3 3 0 1 1-5.8-1.6"/>
          </svg>
        </div>
      </div>
      <div class="stat-card-label">Active Campaigns</div>
      <div class="stat-card-value">{data.stats?.activeCampaigns || 0}</div>
    </div>

    <div class="stat-card">
      <div class="stat-card-header">
        <div class="stat-card-icon primary">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/>
            <polyline points="17 6 23 6 23 12"/>
          </svg>
        </div>
      </div>
      <div class="stat-card-label">Conversion Rate</div>
      <div class="stat-card-value">{data.stats?.conversionRate || 0}%</div>
    </div>
  </div>

  <div class="grid grid-cols-2">
    <!-- Recent Leads -->
    <div class="card">
      <div class="card-header">
        <h2 class="card-title">Recent Leads</h2>
        <a href="/leads" class="btn btn-sm btn-outline">View All</a>
      </div>
      <div class="card-body">
        {#if data.recentLeads && data.recentLeads.length > 0}
          <div class="activity-feed">
            {#each data.recentLeads as lead}
              <div class="activity-item">
                <div class="avatar" style="background: var(--primary-100); color: var(--primary-600);">
                  {lead.firstName?.charAt(0) || 'L'}
                </div>
                <div class="activity-content">
                  <div class="activity-title">{lead.firstName} {lead.lastName}</div>
                  <div class="activity-time">{lead.email}</div>
                </div>
                <span class="lead-score {lead.temperature === 'hot' ? 'hot' : lead.temperature === 'warm' ? 'warm' : 'cold'}">
                  {lead.score || 0}
                </span>
              </div>
            {/each}
          </div>
        {:else}
          <div class="empty-state">
            <p class="text-gray-500">No leads yet. Your campaigns will generate leads here.</p>
          </div>
        {/if}
      </div>
    </div>

    <!-- Campaign Performance -->
    <div class="card">
      <div class="card-header">
        <h2 class="card-title">Campaign Performance</h2>
        <a href="/campaigns" class="btn btn-sm btn-outline">View All</a>
      </div>
      <div class="card-body">
        {#if data.campaigns && data.campaigns.length > 0}
          <div class="flex flex-col gap-4">
            {#each data.campaigns as campaign}
              <div class="flex items-center justify-between p-3" style="background: var(--gray-50); border-radius: var(--radius-lg);">
                <div>
                  <div class="font-medium text-gray-900">{campaign.name}</div>
                  <div class="text-sm text-gray-500">{campaign.leads} leads | {formatCurrency(campaign.spend)} spend</div>
                </div>
                <span class="badge {campaign.status === 'active' ? 'badge-success' : 'badge-gray'}">
                  {campaign.status}
                </span>
              </div>
            {/each}
          </div>
        {:else}
          <div class="empty-state">
            <p class="text-gray-500">No active campaigns.</p>
          </div>
        {/if}
      </div>
    </div>
  </div>

  <!-- Lead Performance Chart -->
  <div class="card mt-6">
    <div class="card-header">
      <h2 class="card-title">Lead Volume Trend</h2>
      <select class="form-input form-select" style="width: 150px;">
        <option value="7d">Last 7 days</option>
        <option value="30d" selected>Last 30 days</option>
        <option value="90d">Last 90 days</option>
      </select>
    </div>
    <div class="card-body">
      <div class="chart-placeholder">
        Lead volume chart will render here
      </div>
    </div>
  </div>
</div>
