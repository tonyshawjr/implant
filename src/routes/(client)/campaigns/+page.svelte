<script lang="ts">
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();

  function getStatusColor(status: string): string {
    switch (status) {
      case 'active': return 'badge-success';
      case 'paused': return 'badge-warning';
      case 'draft': return 'badge-gray';
      case 'completed': return 'badge-primary';
      default: return 'badge-gray';
    }
  }

  function formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(amount);
  }

  function formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
</script>

<svelte:head>
  <title>Campaigns - Implant Lead Engine</title>
</svelte:head>

<div class="page-content">
  <!-- Stats Row -->
  <div class="grid grid-cols-4 mb-6">
    <div class="stat-card">
      <div class="stat-card-header">
        <div class="stat-card-icon primary">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M3 11l18-5v12L3 13v-2z"/>
            <path d="M11.6 16.8a3 3 0 1 1-5.8-1.6"/>
          </svg>
        </div>
      </div>
      <div class="stat-card-label">Active Campaigns</div>
      <div class="stat-card-value">{data.stats?.active || 0}</div>
    </div>

    <div class="stat-card">
      <div class="stat-card-header">
        <div class="stat-card-icon success">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
            <circle cx="9" cy="7" r="4"/>
          </svg>
        </div>
      </div>
      <div class="stat-card-label">Total Leads</div>
      <div class="stat-card-value">{data.stats?.totalLeads || 0}</div>
    </div>

    <div class="stat-card">
      <div class="stat-card-header">
        <div class="stat-card-icon warning">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="12" y1="1" x2="12" y2="23"/>
            <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
          </svg>
        </div>
      </div>
      <div class="stat-card-label">Total Spend</div>
      <div class="stat-card-value">{formatCurrency(data.stats?.totalSpend || 0)}</div>
    </div>

    <div class="stat-card">
      <div class="stat-card-header">
        <div class="stat-card-icon primary">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/>
          </svg>
        </div>
      </div>
      <div class="stat-card-label">Avg Cost Per Lead</div>
      <div class="stat-card-value">{formatCurrency(data.stats?.avgCPL || 0)}</div>
    </div>
  </div>

  <!-- Campaigns Grid -->
  <div class="card">
    <div class="card-header">
      <h2 class="card-title">Your Campaigns</h2>
    </div>
    <div class="card-body">
      {#if data.campaigns && data.campaigns.length > 0}
        <div class="grid grid-cols-2">
          {#each data.campaigns as campaign}
            <div class="card" style="border: 1px solid var(--gray-200);">
              <div class="card-body">
                <div class="flex justify-between items-start mb-4">
                  <div>
                    <h3 class="font-semibold text-gray-900">{campaign.name}</h3>
                    <p class="text-sm text-gray-500">{campaign.platform || 'Facebook'}</p>
                  </div>
                  <span class="badge {getStatusColor(campaign.status)}">{campaign.status}</span>
                </div>

                <div class="grid grid-cols-3 gap-4 mb-4">
                  <div>
                    <div class="text-sm text-gray-500">Leads</div>
                    <div class="font-semibold">{campaign.leads || 0}</div>
                  </div>
                  <div>
                    <div class="text-sm text-gray-500">Spend</div>
                    <div class="font-semibold">{formatCurrency(campaign.spend || 0)}</div>
                  </div>
                  <div>
                    <div class="text-sm text-gray-500">CPL</div>
                    <div class="font-semibold">{formatCurrency(campaign.cpl || 0)}</div>
                  </div>
                </div>

                <div class="flex justify-between items-center">
                  <span class="text-sm text-gray-500">
                    Started {formatDate(campaign.startDate)}
                  </span>
                  <a href="/campaigns/{campaign.id}" class="btn btn-sm btn-outline">View Details</a>
                </div>
              </div>
            </div>
          {/each}
        </div>
      {:else}
        <div class="empty-state">
          <div class="empty-state-icon">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M3 11l18-5v12L3 13v-2z"/>
              <path d="M11.6 16.8a3 3 0 1 1-5.8-1.6"/>
            </svg>
          </div>
          <h3 class="empty-state-title">No campaigns yet</h3>
          <p class="empty-state-description">Your campaigns will be set up by our team during onboarding.</p>
        </div>
      {/if}
    </div>
  </div>
</div>
