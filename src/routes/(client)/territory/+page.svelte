<script lang="ts">
  import type { PageData } from './$types';
  import { onMount } from 'svelte';
  import { browser } from '$app/environment';

  let { data }: { data: PageData } = $props();

  // Map state
  let mapContainer: HTMLDivElement;
  let map: any = null;
  let L: any = null;

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

  function getScoreClass(score: number | null): string {
    if (score === null) return 'gray';
    if (score >= 65) return 'success';
    if (score >= 40) return 'warning';
    return 'gray';
  }

  function getBoundaryTypeLabel(type: string | null): string {
    switch (type) {
      case 'metro': return 'Metro Area';
      case 'county': return 'County';
      case 'city': return 'City';
      case 'zipcode': return 'Zip Code(s)';
      default: return 'Custom';
    }
  }

  // State FIPS mapping for boundary fetching
  const STATE_FIPS: Record<string, string> = {
    'AL': '01', 'AK': '02', 'AZ': '04', 'AR': '05', 'CA': '06', 'CO': '08', 'CT': '09',
    'DE': '10', 'FL': '12', 'GA': '13', 'HI': '15', 'ID': '16', 'IL': '17', 'IN': '18',
    'IA': '19', 'KS': '20', 'KY': '21', 'LA': '22', 'ME': '23', 'MD': '24', 'MA': '25',
    'MI': '26', 'MN': '27', 'MS': '28', 'MO': '29', 'MT': '30', 'NE': '31', 'NV': '32',
    'NH': '33', 'NJ': '34', 'NM': '35', 'NY': '36', 'NC': '37', 'ND': '38', 'OH': '39',
    'OK': '40', 'OR': '41', 'PA': '42', 'RI': '44', 'SC': '45', 'SD': '46', 'TN': '47',
    'TX': '48', 'UT': '49', 'VT': '50', 'VA': '51', 'WA': '53', 'WV': '54', 'WI': '55',
    'WY': '56', 'DC': '11', 'PR': '72'
  };

  // Fetch GeoJSON boundary from Census TIGERweb API
  async function fetchBoundary(type: string, geoid: string): Promise<any> {
    try {
      let layerId: number;
      let whereClause: string;

      if (type === 'metro') {
        layerId = 93;
        whereClause = `GEOID='${geoid}'`;
      } else if (type === 'county') {
        layerId = 82;
        whereClause = `GEOID='${geoid}'`;
      } else if (type === 'city') {
        layerId = 28;
        whereClause = `GEOID='${geoid}'`;
      } else {
        layerId = 2;
        whereClause = `ZCTA5='${geoid}'`;
      }

      const url = `https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/tigerWMS_ACS2023/MapServer/${layerId}/query?where=${encodeURIComponent(whereClause)}&f=geojson&outSR=4326&outFields=*`;

      const response = await fetch(url);
      const data = await response.json();

      if (data.features && data.features.length > 0) {
        return data.features[0];
      }
    } catch (e) {
      console.error('Error fetching boundary:', e);
    }
    return null;
  }

  // Initialize Leaflet map
  onMount(async () => {
    if (browser && data.territory) {
      L = (await import('leaflet')).default;

      const centerLat = data.territory.centerLat || 39.8283;
      const centerLng = data.territory.centerLng || -98.5795;

      map = L.map(mapContainer).setView([centerLat, centerLng], 10);

      // CartoDB Positron - clean, minimal map style
      L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 20
      }).addTo(map);

      // Load and display the territory boundary
      await loadTerritoryBoundary();
    }
    return () => { if (map) map.remove(); };
  });

  async function loadTerritoryBoundary() {
    if (!data.territory || !map || !L) return;

    const t = data.territory;
    const bt = t.boundaryType || 'custom';
    let geoid = '';

    if (bt === 'metro' && t.msaCode) {
      geoid = t.msaCode;
    } else if (bt === 'county' && t.countyFips) {
      const stateFips = STATE_FIPS[t.state] || '';
      geoid = `${stateFips}${t.countyFips}`;
    } else if (bt === 'city' && t.placeFips) {
      const stateFips = STATE_FIPS[t.state] || '';
      geoid = `${stateFips}${t.placeFips}`;
    } else if (bt === 'zipcode' && data.zipCodes.length > 0) {
      // For zip codes, we'll show all of them
      for (const zc of data.zipCodes) {
        const boundary = await fetchBoundary('zipcode', zc.zipCode);
        if (boundary) {
          const geoLayer = L.geoJSON(boundary, {
            style: {
              fillColor: '#2563eb',
              fillOpacity: 0.25,
              color: '#2563eb',
              weight: 2
            }
          }).addTo(map);
          geoLayer.bindPopup(`<strong>${zc.zipCode}</strong><br>${zc.city || ''}`);
        } else {
          // Fallback to circle if no boundary
          const circle = L.circle([t.centerLat, t.centerLng], {
            radius: 4000,
            fillColor: '#2563eb',
            fillOpacity: 0.3,
            color: '#2563eb',
            weight: 2
          }).addTo(map);
          circle.bindPopup(`<strong>${zc.zipCode}</strong><br>${zc.city || ''}`);
        }
      }
      map.setView([t.centerLat, t.centerLng], 11);
      return;
    }

    if (geoid) {
      const boundary = await fetchBoundary(bt, geoid);
      if (boundary) {
        const geoLayer = L.geoJSON(boundary, {
          style: {
            fillColor: '#2563eb',
            fillOpacity: 0.25,
            color: '#2563eb',
            weight: 2
          }
        }).addTo(map);
        geoLayer.bindPopup(`<strong>${t.name}</strong><br>${getBoundaryTypeLabel(bt)}`);
        map.fitBounds(geoLayer.getBounds(), { padding: [30, 30] });
      } else {
        // Fallback to circle
        showFallbackCircle();
      }
    } else {
      // Show fallback circle for custom or unknown boundary
      showFallbackCircle();
    }
  }

  function showFallbackCircle() {
    if (!data.territory || !map || !L) return;
    const t = data.territory;
    const radius = (t.radiusMiles || 15) * 1609.34; // Convert miles to meters

    const circle = L.circle([t.centerLat, t.centerLng], {
      radius,
      fillColor: '#2563eb',
      fillOpacity: 0.2,
      color: '#2563eb',
      weight: 2,
      dashArray: '5, 5'
    }).addTo(map);
    circle.bindPopup(`<strong>${t.name}</strong><br>${t.radiusMiles} mile radius`);
    map.fitBounds(circle.getBounds(), { padding: [30, 30] });
  }
</script>

<svelte:head>
  <title>Territory - Implant Lead Engine</title>
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=" crossorigin="" />
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
  <div class="card">
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
        <span class="badge badge-{data.territory.status === 'locked' ? 'primary' : 'success'}">
          {data.territory.status.charAt(0).toUpperCase() + data.territory.status.slice(1)}
        </span>
      </div>
    </div>
    <div class="card-body">
      <div class="territory-info-grid">
        <div class="info-item">
          <span class="info-label">Coverage Type</span>
          <span class="info-value">{getBoundaryTypeLabel(data.territory.boundaryType)}</span>
        </div>
        <div class="info-item">
          <span class="info-label">Coverage Area</span>
          <span class="info-value">{data.territory.radiusMiles} mile radius</span>
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
  <div class="territory-grid">
    <!-- Interactive Map -->
    <div class="card map-card">
      <div class="card-header">
        <h3 class="card-title">Territory Map</h3>
      </div>
      <div class="map-container" bind:this={mapContainer}></div>
    </div>

    <!-- Demographics Card -->
    <div class="card">
      <div class="card-header">
        <h3 class="card-title">Demographics</h3>
        {#if data.territory.marketScore !== null}
          <span class="market-score-badge {getScoreClass(data.territory.marketScore)}">
            Market Score: {data.territory.marketScore}/100
          </span>
        {/if}
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

          {#if data.territory.population65Plus}
            <div class="demographic-item highlight">
              <div class="demographic-icon success">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                  <circle cx="12" cy="7" r="4"/>
                </svg>
              </div>
              <div class="demographic-content">
                <span class="demographic-label">Population 65+</span>
                <span class="demographic-value">
                  {formatNumber(data.territory.population65Plus)}
                  {#if data.territory.population65Pct}
                    <span class="demo-percent">({data.territory.population65Pct.toFixed(1)}%)</span>
                  {/if}
                </span>
              </div>
            </div>
          {/if}

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

          {#if data.territory.implantCandidates}
            <div class="demographic-item">
              <div class="demographic-icon success">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
                </svg>
              </div>
              <div class="demographic-content">
                <span class="demographic-label">Implant Candidates</span>
                <span class="demographic-value">{formatNumber(data.territory.implantCandidates)}</span>
              </div>
            </div>
          {/if}
        </div>
      </div>
    </div>
  </div>

  <!-- Performance Metrics -->
  <div class="stats-row">
    <div class="stat-card">
      <div class="stat-card-header">
        <div class="stat-card-icon {getScoreClass(data.territory.marketScore)}">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
          </svg>
        </div>
      </div>
      <div class="stat-card-label">Market Score</div>
      <div class="stat-card-value">{data.territory.marketScore ?? 'N/A'}{data.territory.marketScore ? '/100' : ''}</div>
      <div class="stat-card-change positive">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/>
        </svg>
        Territory quality
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
  /* Cards */
  .card {
    background: white;
    border-radius: var(--radius-xl);
    border: 1px solid var(--gray-200);
    overflow: hidden;
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
    font-size: 1.125rem;
    font-weight: 600;
    color: var(--gray-900);
    margin: 0;
  }

  .card-subtitle {
    font-size: 0.875rem;
    color: var(--gray-500);
    margin: var(--spacing-1) 0 0 0;
  }

  .card-body {
    padding: var(--spacing-5);
  }

  /* Territory Info Grid */
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

  /* Territory Grid - Map & Demographics */
  .territory-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--spacing-6);
    margin-bottom: var(--spacing-6);
  }

  @media (max-width: 1024px) {
    .territory-grid {
      grid-template-columns: 1fr;
    }
  }

  /* Map Card */
  .map-card {
    display: flex;
    flex-direction: column;
    margin-bottom: 0;
  }

  .map-container {
    height: 350px;
    background: var(--gray-100);
    border-radius: 0 0 var(--radius-xl) var(--radius-xl);
  }

  /* Market Score Badge */
  .market-score-badge {
    display: inline-flex;
    padding: 4px 10px;
    font-size: 0.75rem;
    font-weight: 500;
    border-radius: var(--radius-md);
  }

  .market-score-badge.success {
    background: var(--success-100);
    color: var(--success-700);
  }

  .market-score-badge.warning {
    background: var(--warning-100);
    color: var(--warning-700);
  }

  .market-score-badge.gray {
    background: var(--gray-100);
    color: var(--gray-600);
  }

  /* Demographics */
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

  .demographic-item.highlight {
    background: var(--primary-50);
    padding: var(--spacing-3);
    border-radius: var(--radius-lg);
    margin: 0 calc(-1 * var(--spacing-3));
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

  .demo-percent {
    font-size: 0.875rem;
    font-weight: 500;
    color: var(--primary-600);
    margin-left: var(--spacing-1);
  }

  .competition-count {
    font-size: 0.75rem;
    font-weight: 400;
    color: var(--gray-500);
    margin-left: var(--spacing-1);
  }

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

  .stat-card {
    background: white;
    border-radius: var(--radius-xl);
    border: 1px solid var(--gray-200);
    padding: var(--spacing-5);
  }

  .stat-card-header {
    margin-bottom: var(--spacing-3);
  }

  .stat-card-icon {
    width: 44px;
    height: 44px;
    border-radius: var(--radius-lg);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .stat-card-icon.primary {
    background: var(--primary-100);
    color: var(--primary-600);
  }

  .stat-card-icon.success {
    background: var(--success-100);
    color: var(--success-600);
  }

  .stat-card-icon.warning {
    background: var(--warning-100);
    color: var(--warning-600);
  }

  .stat-card-icon.gray {
    background: var(--gray-100);
    color: var(--gray-600);
  }

  .stat-card-label {
    font-size: 0.875rem;
    color: var(--gray-500);
    margin-bottom: var(--spacing-1);
  }

  .stat-card-value {
    font-size: 1.5rem;
    font-weight: 700;
    color: var(--gray-900);
    margin-bottom: var(--spacing-2);
  }

  .stat-card-change {
    display: flex;
    align-items: center;
    gap: var(--spacing-1);
    font-size: 0.8125rem;
  }

  .stat-card-change.positive {
    color: var(--success-600);
  }

  /* Zip Codes Grid */
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

  /* Badges */
  .badge {
    display: inline-flex;
    align-items: center;
    padding: 4px 10px;
    border-radius: var(--radius-full);
    font-size: 0.75rem;
    font-weight: 500;
  }

  .badge-success {
    background: var(--success-100);
    color: var(--success-700);
  }

  .badge-primary {
    background: var(--primary-100);
    color: var(--primary-700);
  }

  .badge-gray {
    background: var(--gray-100);
    color: var(--gray-600);
  }

  /* Empty state */
  .empty-state {
    text-align: center;
    padding: var(--spacing-10);
  }

  .empty-state-icon {
    width: 64px;
    height: 64px;
    border-radius: var(--radius-full);
    background: var(--gray-100);
    color: var(--gray-400);
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0 auto var(--spacing-4);
  }

  .empty-state-title {
    font-size: 1.125rem;
    font-weight: 600;
    color: var(--gray-900);
    margin: 0 0 var(--spacing-2);
  }

  .empty-state-description {
    font-size: 0.875rem;
    color: var(--gray-500);
    margin: 0 0 var(--spacing-4);
    max-width: 400px;
    margin-left: auto;
    margin-right: auto;
  }

  /* Button */
  .btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: var(--spacing-2);
    padding: var(--spacing-2) var(--spacing-4);
    border: none;
    border-radius: var(--radius-md);
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.15s ease;
    text-decoration: none;
  }

  .btn-primary {
    background: var(--primary-600);
    color: white;
  }

  .btn-primary:hover {
    background: var(--primary-700);
  }

  /* Utilities */
  .flex {
    display: flex;
  }

  .items-center {
    align-items: center;
  }

  .gap-3 {
    gap: var(--spacing-3);
  }
</style>
