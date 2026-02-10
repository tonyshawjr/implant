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

  function formatNumber(value: number): string {
    return new Intl.NumberFormat('en-US').format(value);
  }

  function formatDate(dateString: string | null): string {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  function getCompetitionLevel(count: number | null): { label: string; class: string } {
    if (count === null) return { label: 'Unknown', class: 'gray' };
    if (count <= 3) return { label: 'Low', class: 'success' };
    if (count <= 7) return { label: 'Medium', class: 'warning' };
    return { label: 'High', class: 'danger' };
  }

  function getPerformanceClass(score: number | null): string {
    if (score === null) return 'gray';
    if (score >= 85) return 'success';
    if (score >= 70) return 'primary';
    if (score >= 50) return 'warning';
    return 'danger';
  }
</script>

<svelte:head>
  <title>Territory - Implant Lead Engine</title>
</svelte:head>

{#if !data.territory}
  <!-- No Territory Assigned -->
  <div class="card">
    <div class="empty-state">
      <div class="empty-state-icon">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
          <circle cx="12" cy="10" r="3"/>
        </svg>
      </div>
      <h3 class="empty-state-title">No Territory Assigned</h3>
      <p class="empty-state-description">Your organization does not have an active territory assignment. Contact support to get started.</p>
      <a href="/support" class="btn btn-primary">Contact Support</a>
    </div>
  </div>
{:else}
  <!-- Territory Info Card -->
  <div class="card mb-6">
    <div class="card-header">
      <div>
        <h2 class="card-title">{data.territory.name}</h2>
        <p class="card-subtitle">{data.territory.city}, {data.territory.state}</p>
      </div>
      <div class="flex items-center gap-3">
        {#if data.assignment?.isExclusive}
          <span class="badge badge-success">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right: 4px;">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
            Exclusive Territory
          </span>
        {:else}
          <span class="badge badge-gray">Shared Territory</span>
        {/if}
        <span class="badge badge-{data.territory.status === 'active' ? 'success' : 'gray'}">
          {data.territory.status.charAt(0).toUpperCase() + data.territory.status.slice(1)}
        </span>
      </div>
    </div>
    <div class="card-body">
      <div class="territory-info-grid">
        <div class="info-item">
          <span class="info-label">Coverage Area</span>
          <span class="info-value">{data.territory.radiusMiles} mile radius</span>
        </div>
        <div class="info-item">
          <span class="info-label">Territory Type</span>
          <span class="info-value">{data.territory.territoryType.replace('_', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}</span>
        </div>
        <div class="info-item">
          <span class="info-label">Monthly Rate</span>
          <span class="info-value">{formatCurrency(data.assignment?.monthlyRate ?? 0)}</span>
        </div>
        <div class="info-item">
          <span class="info-label">Assigned Date</span>
          <span class="info-value">{formatDate(data.assignment?.assignedAt ?? null)}</span>
        </div>
        <div class="info-item">
          <span class="info-label">Contract Expires</span>
          <span class="info-value">{formatDate(data.assignment?.expiresAt ?? null)}</span>
        </div>
        <div class="info-item">
          <span class="info-label">Zip Codes</span>
          <span class="info-value">{data.zipCodes.length} covered</span>
        </div>
      </div>
    </div>
  </div>

  <!-- Map and Demographics Row -->
  <div class="territory-grid mb-6">
    <!-- Map Placeholder -->
    <div class="card map-card">
      <div class="card-header">
        <h3 class="card-title">Territory Map</h3>
        <button class="btn btn-sm btn-secondary">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="15 3 21 3 21 9"/>
            <polyline points="9 21 3 21 3 15"/>
            <line x1="21" y1="3" x2="14" y2="10"/>
            <line x1="3" y1="21" x2="10" y2="14"/>
          </svg>
          Expand
        </button>
      </div>
      <div class="card-body">
        <div class="map-placeholder">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
            <circle cx="12" cy="10" r="3"/>
          </svg>
          <span>Territory Map</span>
          <span class="map-coords">{data.territory.centerLat.toFixed(4)}, {data.territory.centerLng.toFixed(4)}</span>
        </div>
      </div>
    </div>

    <!-- Demographics Card -->
    <div class="card">
      <div class="card-header">
        <h3 class="card-title">Demographics</h3>
      </div>
      <div class="card-body">
        <div class="demographics-list">
          <div class="demographic-item">
            <div class="demographic-icon primary">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
              </svg>
            </div>
            <div class="demographic-content">
              <span class="demographic-label">Population</span>
              <span class="demographic-value">{formatNumber(data.territory.population ?? 0)}</span>
            </div>
          </div>

          <div class="demographic-item">
            <div class="demographic-icon success">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                <polyline points="9 22 9 12 15 12 15 22"/>
              </svg>
            </div>
            <div class="demographic-content">
              <span class="demographic-label">Households</span>
              <span class="demographic-value">{formatNumber(data.territory.households ?? 0)}</span>
            </div>
          </div>

          <div class="demographic-item">
            <div class="demographic-icon warning">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="12" y1="1" x2="12" y2="23"/>
                <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
              </svg>
            </div>
            <div class="demographic-content">
              <span class="demographic-label">Median Income</span>
              <span class="demographic-value">{formatCurrency(data.territory.medianIncome ?? 0)}</span>
            </div>
          </div>

          <div class="demographic-item">
            <div class="demographic-icon primary">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/>
                <polyline points="12 6 12 12 16 14"/>
              </svg>
            </div>
            <div class="demographic-content">
              <span class="demographic-label">Median Age</span>
              <span class="demographic-value">{data.territory.medianAge ?? 'N/A'}</span>
            </div>
          </div>

          <div class="demographic-item">
            <div class="demographic-icon {getCompetitionLevel(data.territory.competitionCount).class}">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 2L2 7l10 5 10-5-10-5z"/>
                <path d="M2 17l10 5 10-5"/>
                <path d="M2 12l10 5 10-5"/>
              </svg>
            </div>
            <div class="demographic-content">
              <span class="demographic-label">Competition Level</span>
              <span class="demographic-value">
                {getCompetitionLevel(data.territory.competitionCount).label}
                <span class="competition-count">({data.territory.competitionCount ?? 0} providers)</span>
              </span>
            </div>
          </div>

          <div class="demographic-item">
            <div class="demographic-icon success">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
              </svg>
            </div>
            <div class="demographic-content">
              <span class="demographic-label">Implant Candidates</span>
              <span class="demographic-value">{formatNumber(data.territory.implantCandidates ?? 0)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- Performance Metrics -->
  <div class="stats-row mb-6">
    <div class="stat-card">
      <div class="stat-card-header">
        <div class="stat-card-icon {getPerformanceClass(data.territory.performanceScore)}">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
          </svg>
        </div>
      </div>
      <div class="stat-card-label">Performance Score</div>
      <div class="stat-card-value">{data.territory.performanceScore ?? 'N/A'}</div>
      <div class="stat-card-change positive">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/>
        </svg>
        Territory ranking
      </div>
    </div>

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
      <div class="stat-card-label">Population Reach</div>
      <div class="stat-card-value">{formatNumber(data.territory.population ?? 0)}</div>
      <div class="stat-card-change positive">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/>
          <polyline points="12 16 16 12 12 8"/>
          <line x1="8" y1="12" x2="16" y2="12"/>
        </svg>
        {data.territory.radiusMiles} mile radius
      </div>
    </div>

    <div class="stat-card">
      <div class="stat-card-header">
        <div class="stat-card-icon success">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
            <line x1="3" y1="9" x2="21" y2="9"/>
            <line x1="9" y1="21" x2="9" y2="9"/>
          </svg>
        </div>
      </div>
      <div class="stat-card-label">Zip Codes Covered</div>
      <div class="stat-card-value">{data.zipCodes.length}</div>
      <div class="stat-card-change positive">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
        </svg>
        Exclusive coverage
      </div>
    </div>

    <div class="stat-card">
      <div class="stat-card-header">
        <div class="stat-card-icon warning">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="12" y1="1" x2="12" y2="23"/>
            <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
          </svg>
        </div>
      </div>
      <div class="stat-card-label">Monthly Investment</div>
      <div class="stat-card-value">{formatCurrency(data.assignment?.monthlyRate ?? 0)}</div>
      <div class="stat-card-change positive">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/>
          <line x1="1" y1="10" x2="23" y2="10"/>
        </svg>
        Base rate
      </div>
    </div>
  </div>

  <!-- Covered Zip Codes -->
  {#if data.zipCodes.length > 0}
    <div class="card">
      <div class="card-header">
        <h3 class="card-title">Covered Zip Codes</h3>
        <span class="badge badge-primary">{data.zipCodes.length} zip codes</span>
      </div>
      <div class="card-body">
        <div class="zip-codes-grid">
          {#each data.zipCodes as zipCode}
            <div class="zip-code-item {zipCode.isPrimary ? 'primary' : ''}">
              <span class="zip-code-number">{zipCode.zipCode}</span>
              <span class="zip-code-city">{zipCode.city}</span>
              {#if zipCode.isPrimary}
                <span class="badge badge-primary badge-sm">Primary</span>
              {/if}
            </div>
          {/each}
        </div>
      </div>
    </div>
  {/if}
{/if}

<style>
  .territory-info-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: var(--spacing-4);
  }

  @media (max-width: 768px) {
    .territory-info-grid {
      grid-template-columns: repeat(2, 1fr);
    }
  }

  @media (max-width: 480px) {
    .territory-info-grid {
      grid-template-columns: 1fr;
    }
  }

  .info-item {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-1);
  }

  .info-label {
    font-size: 0.75rem;
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--gray-500);
  }

  .info-value {
    font-size: 1rem;
    font-weight: 600;
    color: var(--gray-900);
  }

  .territory-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--spacing-6);
  }

  @media (max-width: 1024px) {
    .territory-grid {
      grid-template-columns: 1fr;
    }
  }

  .map-card {
    display: flex;
    flex-direction: column;
  }

  .map-card .card-body {
    flex: 1;
    display: flex;
    padding: 0;
  }

  .map-placeholder {
    flex: 1;
    min-height: 300px;
    background: linear-gradient(135deg, var(--gray-100) 0%, var(--gray-50) 100%);
    border-radius: 0 0 var(--radius-xl) var(--radius-xl);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: var(--spacing-2);
    color: var(--gray-400);
    font-size: 1rem;
    font-weight: 500;
  }

  .map-coords {
    font-size: 0.75rem;
    font-weight: 400;
    color: var(--gray-400);
  }

  .demographics-list {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-4);
  }

  .demographic-item {
    display: flex;
    align-items: center;
    gap: var(--spacing-3);
  }

  .demographic-icon {
    width: 40px;
    height: 40px;
    border-radius: var(--radius-lg);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .demographic-icon.primary {
    background: var(--primary-100);
    color: var(--primary-600);
  }

  .demographic-icon.success {
    background: var(--success-100);
    color: var(--success-600);
  }

  .demographic-icon.warning {
    background: var(--warning-100);
    color: var(--warning-600);
  }

  .demographic-icon.danger {
    background: var(--danger-100);
    color: var(--danger-600);
  }

  .demographic-icon.gray {
    background: var(--gray-100);
    color: var(--gray-600);
  }

  .demographic-content {
    display: flex;
    flex-direction: column;
  }

  .demographic-label {
    font-size: 0.75rem;
    color: var(--gray-500);
  }

  .demographic-value {
    font-size: 1rem;
    font-weight: 600;
    color: var(--gray-900);
  }

  .competition-count {
    font-size: 0.75rem;
    font-weight: 400;
    color: var(--gray-500);
    margin-left: var(--spacing-1);
  }

  .stats-row {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: var(--spacing-6);
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

  .zip-codes-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
    gap: var(--spacing-3);
  }

  .zip-code-item {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-1);
    padding: var(--spacing-3);
    background: var(--gray-50);
    border-radius: var(--radius-lg);
    border: 1px solid var(--gray-200);
    transition: all 0.2s ease;
  }

  .zip-code-item:hover {
    border-color: var(--gray-300);
    background: white;
  }

  .zip-code-item.primary {
    background: var(--primary-50);
    border-color: var(--primary-200);
  }

  .zip-code-item.primary:hover {
    background: var(--primary-100);
  }

  .zip-code-number {
    font-size: 1rem;
    font-weight: 600;
    color: var(--gray-900);
  }

  .zip-code-city {
    font-size: 0.75rem;
    color: var(--gray-500);
  }

  .badge-sm {
    font-size: 0.625rem;
    padding: 1px 6px;
    margin-top: var(--spacing-1);
    width: fit-content;
  }
</style>
