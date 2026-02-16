<script lang="ts">
  import type { PageData } from './$types';
  import { goto } from '$app/navigation';
  import { enhance } from '$app/forms';
  import { onMount } from 'svelte';
  import { browser } from '$app/environment';

  let { data }: { data: PageData } = $props();

  // Local state for filters
  let searchValue = $state(data.filters.search);
  let statusFilter = $state(data.filters.status);
  let stateFilter = $state(data.filters.state);
  let typeFilter = $state(data.filters.type);

  // Modal state
  let showAddModal = $state(false);
  let selectedTerritory = $state<typeof data.territories[0] | null>(null);

  // Map state
  let mapContainer: HTMLDivElement;
  let map: any = null;
  let L: any = null;
  let isFullscreen = $state(false);
  let isLoadingBoundaries = $state(false);
  let boundaryLayers: Map<string, any> = new Map();

  // State FIPS mapping for boundary lookups
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

  // Form state for Add/Edit Territory
  let newTerritory = $state({
    name: '',
    city: '',
    state: '',
    zipCode: '',
    territoryType: 'city',
    radiusMiles: 15,
    centerLat: 0,
    centerLng: 0,
    monthlyBasePrice: 1500,
    population: 0
  });
  let isSubmitting = $state(false);
  let isLookingUp = $state(false);
  let lookupError = $state('');

  // Edit mode
  let editingTerritory = $state<typeof data.territories[0] | null>(null);
  let showEditModal = $state(false);
  let showDeleteConfirm = $state(false);
  let territoryToDelete = $state<typeof data.territories[0] | null>(null);

  // Geocoding lookup using Nominatim (free, no API key) + Census Bureau for population
  async function lookupLocation() {
    if (!newTerritory.zipCode && !newTerritory.city) {
      lookupError = 'Enter a zip code or city name';
      return;
    }

    isLookingUp = true;
    lookupError = '';

    try {
      // Build search query
      const query = newTerritory.zipCode
        ? `${newTerritory.zipCode}, USA`
        : `${newTerritory.city}, ${newTerritory.state}, USA`;

      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1&addressdetails=1`,
        { headers: { 'User-Agent': 'SqueezMedia-Platform' } }
      );

      const results = await response.json();

      if (results.length === 0) {
        lookupError = 'Location not found. Try a different zip code or city.';
        return;
      }

      const result = results[0];

      // Update coordinates
      newTerritory.centerLat = parseFloat(result.lat);
      newTerritory.centerLng = parseFloat(result.lon);

      // Update city/state from result if we searched by zip
      if (newTerritory.zipCode && result.address) {
        newTerritory.city = result.address.city || result.address.town || result.address.village || newTerritory.city;
        newTerritory.state = result.address.state || newTerritory.state;
      }

      // Auto-generate name based on new city
      if (newTerritory.city) {
        const suffix = newTerritory.territoryType === 'metro' ? ' Metro' :
                       newTerritory.territoryType === 'county' ? ' County' : '';
        newTerritory.name = `${newTerritory.city}${suffix}`;
      }

      // Fetch population from US Census Bureau (free, no API key required)
      if (newTerritory.zipCode) {
        try {
          // Use ACS 5-year estimates for zip code tabulation areas (ZCTAs)
          const censusResponse = await fetch(
            `https://api.census.gov/data/2022/acs/acs5?get=NAME,B01003_001E&for=zip%20code%20tabulation%20area:${newTerritory.zipCode}`
          );
          const censusData = await censusResponse.json();

          // Census API returns array where first row is headers, second row is data
          if (censusData && censusData.length > 1 && censusData[1][1]) {
            newTerritory.population = parseInt(censusData[1][1]);
          }
        } catch (censusError) {
          console.log('Census data not available for this zip code');
          // Don't fail the whole lookup if census fails
        }
      }

    } catch (error) {
      console.error('Geocoding error:', error);
      lookupError = 'Failed to lookup location. Please try again.';
    } finally {
      isLookingUp = false;
    }
  }

  function openEditModal(territory: typeof data.territories[0]) {
    editingTerritory = territory;
    newTerritory = {
      name: territory.name,
      city: territory.city,
      state: territory.state,
      zipCode: '',
      territoryType: territory.type || 'city',
      radiusMiles: territory.radiusMiles,
      centerLat: territory.centerLat,
      centerLng: territory.centerLng,
      monthlyBasePrice: territory.monthlyBasePrice || 1500,
      population: territory.population || 0
    };
    showEditModal = true;
  }

  function closeEditModal() {
    showEditModal = false;
    editingTerritory = null;
    resetForm();
  }

  function confirmDelete(territory: typeof data.territories[0]) {
    territoryToDelete = territory;
    showDeleteConfirm = true;
  }

  function cancelDelete() {
    showDeleteConfirm = false;
    territoryToDelete = null;
  }

  function resetForm() {
    newTerritory = {
      name: '',
      city: '',
      state: '',
      zipCode: '',
      territoryType: 'city',
      radiusMiles: 15,
      centerLat: 0,
      centerLng: 0,
      monthlyBasePrice: 1500,
      population: 0
    };
    lookupError = '';
  }

  // Initialize Leaflet map
  onMount(async () => {
    if (browser) {
      L = (await import('leaflet')).default;

      // Initialize map centered on US
      map = L.map(mapContainer).setView([39.8283, -98.5795], 4);

      // Add OpenStreetMap tiles
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      }).addTo(map);

      // Add territory markers
      addTerritoryMarkers();
    }

    return () => {
      if (map) {
        map.remove();
      }
    };
  });

  // Fetch GeoJSON boundary from Census TIGERweb API
  async function fetchBoundary(type: string, geoid: string): Promise<any> {
    try {
      let layerId: number;
      let whereClause: string;

      if (type === 'metro') {
        layerId = 93; // Metropolitan Statistical Areas
        whereClause = `GEOID='${geoid}'`;
      } else if (type === 'county') {
        layerId = 82; // Counties
        whereClause = `GEOID='${geoid}'`;
      } else if (type === 'city') {
        layerId = 28; // Incorporated Places
        whereClause = `GEOID='${geoid}'`;
      } else {
        layerId = 2; // ZCTAs
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

  async function addTerritoryMarkers() {
    if (!map || !L || !data.territories) return;

    isLoadingBoundaries = true;
    const allBounds: any[] = [];

    // Clear existing layers
    boundaryLayers.forEach(layer => map.removeLayer(layer));
    boundaryLayers.clear();

    for (const territory of data.territories) {
      const color = territory.status === 'locked' ? '#3b82f6' :
                    territory.status === 'available' ? '#22c55e' :
                    '#f59e0b';

      let layer: any = null;
      let boundary: any = null;

      // Try to fetch real boundary based on boundary type
      if (territory.boundaryType && territory.boundaryType !== 'custom') {
        const bt = territory.boundaryType;
        let geoid = '';

        if (bt === 'metro' && territory.msaCode) {
          geoid = territory.msaCode;
        } else if (bt === 'county' && territory.countyFips) {
          const stateFips = STATE_FIPS[territory.state] || '';
          geoid = `${stateFips}${territory.countyFips}`;
        } else if (bt === 'city' && territory.placeFips) {
          const stateFips = STATE_FIPS[territory.state] || '';
          geoid = `${stateFips}${territory.placeFips}`;
        }

        if (geoid) {
          boundary = await fetchBoundary(bt, geoid);
        }
      }

      if (boundary) {
        // Draw real GeoJSON boundary
        layer = L.geoJSON(boundary, {
          style: {
            fillColor: color,
            fillOpacity: 0.25,
            color: color,
            weight: 2
          }
        }).addTo(map);

        allBounds.push(layer.getBounds());
      } else {
        // Fallback to circle
        layer = L.circle([territory.centerLat, territory.centerLng], {
          radius: territory.radiusMiles * 1609.34,
          fillColor: color,
          fillOpacity: 0.2,
          color: color,
          weight: 2,
          dashArray: boundary ? undefined : '5, 5' // Dashed for approximate
        }).addTo(map);

        allBounds.push(layer.getBounds());
      }

      // Add popup with click to edit
      const popupContent = `
        <div style="min-width: 180px;">
          <strong style="font-size: 14px;">${territory.name}</strong><br>
          <span style="color: #666;">${territory.city}, ${territory.state}</span><br>
          <span style="display: inline-block; padding: 2px 8px; margin: 4px 0; border-radius: 12px; font-size: 12px; background: ${color}22; color: ${color};">
            ${territory.status === 'locked' ? 'Assigned' : territory.status === 'available' ? 'Available' : 'Waitlist'}
          </span><br>
          ${territory.client ? `<span style="font-size: 12px;">Client: ${territory.client.name}</span><br>` : ''}
          ${territory.population ? `<span style="font-size: 12px;">Pop: ${formatNumber(territory.population)}</span><br>` : ''}
          <a href="/internal/territories/${territory.id}/edit" style="display: inline-block; margin-top: 8px; padding: 4px 12px; background: #3b82f6; color: white; text-decoration: none; border-radius: 4px; font-size: 12px;">Edit Territory</a>
        </div>
      `;
      layer.bindPopup(popupContent);

      // Make clickable
      layer.on('click', () => {
        layer.openPopup();
      });

      boundaryLayers.set(territory.id, layer);
    }

    // Fit map to show all territories
    if (allBounds.length > 0) {
      let combinedBounds = allBounds[0];
      for (let i = 1; i < allBounds.length; i++) {
        combinedBounds = combinedBounds.extend(allBounds[i]);
      }
      map.fitBounds(combinedBounds, { padding: [50, 50] });
    }

    isLoadingBoundaries = false;
  }

  function toggleFullscreen() {
    isFullscreen = !isFullscreen;
    // Need to invalidate map size after transition
    setTimeout(() => {
      if (map) {
        map.invalidateSize();
      }
    }, 300);
  }

  function closeAddModal() {
    showAddModal = false;
    resetForm();
  }

  // Helper functions
  function formatCurrency(value: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  }

  function formatNumber(num: number): string {
    return new Intl.NumberFormat('en-US').format(num);
  }

  function getStatusClass(status: string): string {
    switch (status) {
      case 'locked': return 'locked';
      case 'available': return 'available';
      case 'waitlist': return 'waitlist';
      default: return 'default';
    }
  }

  function getStatusLabel(status: string): string {
    switch (status) {
      case 'locked': return 'Assigned';
      case 'available': return 'Available';
      case 'waitlist': return 'Waitlist';
      default: return status;
    }
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

  function applyFilters() {
    const params = new URLSearchParams();
    if (searchValue) params.set('search', searchValue);
    if (statusFilter) params.set('status', statusFilter);
    if (stateFilter) params.set('state', stateFilter);
    if (typeFilter) params.set('type', typeFilter);
    goto(`?${params.toString()}`);
  }

  function handleSearch(event: KeyboardEvent) {
    if (event.key === 'Enter') {
      applyFilters();
    }
  }

  function clearFilters() {
    searchValue = '';
    statusFilter = '';
    stateFilter = '';
    typeFilter = '';
    goto('?');
  }

  function viewTerritory(territory: typeof data.territories[0]) {
    selectedTerritory = territory;
  }

  function closeDetailPanel() {
    selectedTerritory = null;
  }
</script>

<svelte:head>
  <title>Territory Management - SqueezMedia Operations</title>
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=" crossorigin="" />
</svelte:head>

<!-- Stats Row -->
<div class="stats-row">
  <div class="stat-card">
    <div class="stat-card-header">
      <div class="stat-card-icon primary">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
          <circle cx="12" cy="10" r="3"/>
        </svg>
      </div>
    </div>
    <div class="stat-card-label">Total Territories</div>
    <div class="stat-card-value">{data.stats.total}</div>
    <div class="stat-card-change neutral">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10"/>
        <polyline points="12 6 12 12 16 14"/>
      </svg>
      Managed regions
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
    <div class="stat-card-label">Available</div>
    <div class="stat-card-value">{data.stats.available}</div>
    <div class="stat-card-change positive">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/>
      </svg>
      Ready for assignment
    </div>
  </div>

  <div class="stat-card">
    <div class="stat-card-header">
      <div class="stat-card-icon warning">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
          <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
        </svg>
      </div>
    </div>
    <div class="stat-card-label">Assigned</div>
    <div class="stat-card-value">{data.stats.locked}</div>
    <div class="stat-card-change positive">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/>
      </svg>
      Active clients
    </div>
  </div>

  <div class="stat-card">
    <div class="stat-card-header">
      <div class="stat-card-icon danger">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
          <circle cx="9" cy="7" r="4"/>
          <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
          <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
        </svg>
      </div>
    </div>
    <div class="stat-card-label">Waitlist</div>
    <div class="stat-card-value">{data.stats.totalWaitlistEntries}</div>
    <div class="stat-card-change neutral">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10"/>
        <polyline points="12 6 12 12 16 14"/>
      </svg>
      Prospects waiting
    </div>
  </div>
</div>

<!-- Map and Revenue Card -->
<div class="map-revenue-row" class:fullscreen-active={isFullscreen}>
  <div class="card map-card" class:fullscreen={isFullscreen}>
    <div class="card-header">
      <h3 class="card-title">
        Territory Map
        {#if isLoadingBoundaries}
          <span class="loading-indicator">Loading boundaries...</span>
        {/if}
      </h3>
      <div class="map-actions">
        <span class="badge badge-info">Interactive</span>
        <button class="fullscreen-btn" onclick={toggleFullscreen} title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}>
          {#if isFullscreen}
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"/>
            </svg>
          {:else}
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/>
            </svg>
          {/if}
        </button>
      </div>
    </div>
    <div class="map-container" class:fullscreen-map={isFullscreen} bind:this={mapContainer}></div>
    <div class="map-legend-bar">
      <div class="legend-item">
        <span class="legend-dot available"></span>
        <span>Available ({data.stats.available})</span>
      </div>
      <div class="legend-item">
        <span class="legend-dot locked"></span>
        <span>Assigned ({data.stats.locked})</span>
      </div>
      <div class="legend-item">
        <span class="legend-dot waitlist"></span>
        <span>Waitlist ({data.stats.waitlist})</span>
      </div>
      {#if isFullscreen}
        <button class="btn btn-outline btn-sm" onclick={toggleFullscreen}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
          Close Fullscreen
        </button>
      {/if}
    </div>
  </div>

  <div class="card revenue-card">
    <div class="card-header">
      <h3 class="card-title">Revenue Summary</h3>
    </div>
    <div class="card-body">
      <div class="revenue-stat">
        <div class="revenue-label">Monthly Recurring Revenue</div>
        <div class="revenue-value">{formatCurrency(data.stats.monthlyRevenue)}</div>
      </div>
      <div class="revenue-breakdown">
        <div class="breakdown-item">
          <span class="breakdown-label">Avg per Territory</span>
          <span class="breakdown-value">
            {data.stats.locked > 0 ? formatCurrency(data.stats.monthlyRevenue / data.stats.locked) : '$0'}
          </span>
        </div>
        <div class="breakdown-item">
          <span class="breakdown-label">Utilization Rate</span>
          <span class="breakdown-value">
            {data.stats.total > 0 ? Math.round((data.stats.locked / data.stats.total) * 100) : 0}%
          </span>
        </div>
        <div class="breakdown-item">
          <span class="breakdown-label">Waitlist Demand</span>
          <span class="breakdown-value">
            {data.stats.totalWaitlistEntries} prospects
          </span>
        </div>
      </div>
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
      <input
        type="text"
        class="form-input filter-input"
        placeholder="Search territories, cities, zip codes..."
        style="padding-left: 40px;"
        bind:value={searchValue}
        onkeydown={handleSearch}
      >
    </div>
  </div>
  <div class="filter-group">
    <label class="filter-label">Status</label>
    <select class="form-input form-select filter-input" bind:value={statusFilter} onchange={applyFilters}>
      <option value="">All Status</option>
      <option value="available">Available</option>
      <option value="locked">Assigned</option>
      <option value="waitlist">Waitlist</option>
    </select>
  </div>
  <div class="filter-group">
    <label class="filter-label">State</label>
    <select class="form-input form-select filter-input" bind:value={stateFilter} onchange={applyFilters}>
      <option value="">All States</option>
      {#each data.states as state}
        <option value={state}>{state}</option>
      {/each}
    </select>
  </div>
  <div class="filter-group">
    <label class="filter-label">Type</label>
    <select class="form-input form-select filter-input" bind:value={typeFilter} onchange={applyFilters}>
      <option value="">All Types</option>
      <option value="city">City</option>
      <option value="county">County</option>
      <option value="metro">Metro</option>
    </select>
  </div>
  {#if searchValue || statusFilter || stateFilter || typeFilter}
    <div class="filter-group">
      <label class="filter-label">&nbsp;</label>
      <button class="btn btn-outline" onclick={clearFilters}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="18" y1="6" x2="6" y2="18"/>
          <line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
        Clear
      </button>
    </div>
  {/if}
  <div class="filter-group filter-group-action">
    <label class="filter-label">&nbsp;</label>
    <a href="/internal/territories/create" class="btn btn-primary">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <line x1="12" y1="5" x2="12" y2="19"/>
        <line x1="5" y1="12" x2="19" y2="12"/>
      </svg>
      Add Territory
    </a>
  </div>
</div>

<!-- Territories Table -->
<div class="card">
  <div class="card-header">
    <h3 class="card-title">All Territories</h3>
    <span class="card-subtitle">{data.pagination.total} total territories</span>
  </div>
  <div class="table-container">
    <table class="table">
      <thead>
        <tr>
          <th>Name</th>
          <th>Location</th>
          <th>Status</th>
          <th>Assigned Client</th>
          <th>Monthly Value</th>
          <th>Waitlist</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        {#if data.territories && data.territories.length > 0}
          {#each data.territories as territory}
            <tr>
              <td>
                <div class="territory-name-cell">
                  <div class="territory-icon">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                      <circle cx="12" cy="10" r="3"/>
                    </svg>
                  </div>
                  <div class="territory-info">
                    <div class="territory-name">{territory.name}</div>
                    <div class="territory-type">{territory.type || 'Standard'} - {territory.radiusMiles} mi radius</div>
                  </div>
                </div>
              </td>
              <td>
                <div class="location-cell">
                  <div class="location-primary">{territory.city}, {territory.state}</div>
                  {#if territory.population}
                    <div class="location-secondary">Pop: {formatNumber(territory.population)}</div>
                  {/if}
                </div>
              </td>
              <td>
                <span class="status-badge {getStatusClass(territory.status)}">
                  {getStatusLabel(territory.status)}
                </span>
              </td>
              <td>
                {#if territory.client}
                  <div class="client-cell">
                    <div class="client-avatar">{getInitials(territory.client.name)}</div>
                    <div class="client-info">
                      <a href="/internal/clients/{territory.client.id}" class="client-name">
                        {territory.client.name}
                      </a>
                      <div class="client-health">
                        <span class="health-dot {getHealthClass(territory.client.healthScore)}"></span>
                        Health: {territory.client.healthScore}
                      </div>
                    </div>
                  </div>
                {:else}
                  <span class="no-client">--</span>
                {/if}
              </td>
              <td>
                {#if territory.client}
                  <div class="value-cell">
                    <div class="value-primary">{formatCurrency(territory.client.monthlyRate)}</div>
                    <div class="value-secondary">per month</div>
                  </div>
                {:else if territory.monthlyBasePrice}
                  <div class="value-cell">
                    <div class="value-base">{formatCurrency(territory.monthlyBasePrice)}</div>
                    <div class="value-secondary">base price</div>
                  </div>
                {:else}
                  <span class="no-value">--</span>
                {/if}
              </td>
              <td>
                {#if territory.counts.waitlist > 0}
                  <div class="waitlist-cell">
                    <span class="waitlist-badge">{territory.counts.waitlist}</span>
                    <span class="waitlist-label">waiting</span>
                  </div>
                {:else}
                  <span class="no-waitlist">--</span>
                {/if}
              </td>
              <td>
                <div class="quick-actions">
                  <button class="action-btn" title="View Details" onclick={() => viewTerritory(territory)}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                      <circle cx="12" cy="12" r="3"/>
                    </svg>
                  </button>
                  <a href="/internal/territories/{territory.id}/edit" class="action-btn primary" title="Edit Territory">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                    </svg>
                  </a>
                  <button class="action-btn danger" title="Delete Territory" onclick={() => confirmDelete(territory)}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <polyline points="3 6 5 6 21 6"/>
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
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
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                    <circle cx="12" cy="10" r="3"/>
                  </svg>
                </div>
                <h3 class="empty-state-title">No territories found</h3>
                <p class="empty-state-description">
                  {#if searchValue || statusFilter || stateFilter || typeFilter}
                    Try adjusting your filters or search term.
                  {:else}
                    Get started by adding your first territory.
                  {/if}
                </p>
                {#if searchValue || statusFilter || stateFilter || typeFilter}
                  <button class="btn btn-outline" onclick={clearFilters}>Clear Filters</button>
                {:else}
                  <a href="/internal/territories/create" class="btn btn-primary">Add Territory</a>
                {/if}
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
      <div class="pagination-info">
        Showing {((data.pagination.page - 1) * data.pagination.limit) + 1} to {Math.min(data.pagination.page * data.pagination.limit, data.pagination.total)} of {data.pagination.total} territories
      </div>
      <div class="pagination-controls">
        <button
          class="pagination-btn"
          disabled={data.pagination.page === 1}
          onclick={() => goto(`?page=${data.pagination.page - 1}`)}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </button>
        {#each Array.from({ length: Math.min(5, data.pagination.totalPages) }, (_, i) => {
          const start = Math.max(1, Math.min(data.pagination.page - 2, data.pagination.totalPages - 4));
          return start + i;
        }) as pageNum}
          <button
            class="pagination-btn {pageNum === data.pagination.page ? 'active' : ''}"
            onclick={() => goto(`?page=${pageNum}`)}
          >
            {pageNum}
          </button>
        {/each}
        <button
          class="pagination-btn"
          disabled={data.pagination.page === data.pagination.totalPages}
          onclick={() => goto(`?page=${data.pagination.page + 1}`)}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="9 18 15 12 9 6"/>
          </svg>
        </button>
      </div>
    </div>
  {/if}
</div>

<!-- Territory Detail Slide Panel -->
{#if selectedTerritory}
  <div class="detail-overlay" onclick={closeDetailPanel}></div>
  <div class="detail-panel">
    <div class="detail-header">
      <h2 class="detail-title">{selectedTerritory.name}</h2>
      <button class="close-btn" onclick={closeDetailPanel}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="18" y1="6" x2="6" y2="18"/>
          <line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
    </div>
    <div class="detail-body">
      <div class="detail-section">
        <h4 class="detail-section-title">Location Details</h4>
        <div class="detail-grid">
          <div class="detail-item">
            <span class="detail-label">City</span>
            <span class="detail-value">{selectedTerritory.city}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">State</span>
            <span class="detail-value">{selectedTerritory.state}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">Type</span>
            <span class="detail-value">{selectedTerritory.type || 'Standard'}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">Radius</span>
            <span class="detail-value">{selectedTerritory.radiusMiles} miles</span>
          </div>
        </div>
      </div>

      <div class="detail-section">
        <h4 class="detail-section-title">Demographics</h4>
        <div class="detail-grid">
          <div class="detail-item">
            <span class="detail-label">Population</span>
            <span class="detail-value">{selectedTerritory.population ? formatNumber(selectedTerritory.population) : '--'}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">Households</span>
            <span class="detail-value">{selectedTerritory.households ? formatNumber(selectedTerritory.households) : '--'}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">Median Age</span>
            <span class="detail-value">{selectedTerritory.medianAge ?? '--'}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">Median Income</span>
            <span class="detail-value">{selectedTerritory.medianIncome ? formatCurrency(selectedTerritory.medianIncome) : '--'}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">Implant Candidates</span>
            <span class="detail-value">{selectedTerritory.implantCandidates ? formatNumber(selectedTerritory.implantCandidates) : '--'}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">Competition</span>
            <span class="detail-value">{selectedTerritory.competitionCount ?? '--'} providers</span>
          </div>
        </div>
      </div>

      {#if selectedTerritory.client}
        <div class="detail-section">
          <h4 class="detail-section-title">Assigned Client</h4>
          <div class="assigned-client-card">
            <div class="client-avatar large">{getInitials(selectedTerritory.client.name)}</div>
            <div class="assigned-client-info">
              <a href="/internal/clients/{selectedTerritory.client.id}" class="assigned-client-name">
                {selectedTerritory.client.name}
              </a>
              <div class="assigned-client-meta">
                <span class="health-badge {getHealthClass(selectedTerritory.client.healthScore)}">
                  Health: {selectedTerritory.client.healthScore}
                </span>
                <span class="monthly-rate">{formatCurrency(selectedTerritory.client.monthlyRate)}/mo</span>
              </div>
            </div>
          </div>
        </div>
      {/if}

      {#if selectedTerritory.waitlist && selectedTerritory.waitlist.length > 0}
        <div class="detail-section">
          <h4 class="detail-section-title">Waitlist ({selectedTerritory.counts.waitlist})</h4>
          <div class="waitlist-list">
            {#each selectedTerritory.waitlist as entry}
              <div class="waitlist-entry">
                <div class="waitlist-position">#{entry.position}</div>
                <div class="waitlist-contact">
                  <div class="waitlist-name">{entry.contactName}</div>
                  <div class="waitlist-email">{entry.contactEmail}</div>
                  {#if entry.practiceName}
                    <div class="waitlist-practice">{entry.practiceName}</div>
                  {/if}
                </div>
              </div>
            {/each}
          </div>
        </div>
      {/if}

      <div class="detail-section">
        <h4 class="detail-section-title">Performance</h4>
        <div class="detail-grid">
          <div class="detail-item">
            <span class="detail-label">Total Leads</span>
            <span class="detail-value">{selectedTerritory.counts.leads}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">Campaigns</span>
            <span class="detail-value">{selectedTerritory.counts.campaigns}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">Performance Score</span>
            <span class="detail-value">{selectedTerritory.performanceScore ?? '--'}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">Base Price</span>
            <span class="detail-value">{selectedTerritory.monthlyBasePrice ? formatCurrency(selectedTerritory.monthlyBasePrice) : '--'}</span>
          </div>
        </div>
      </div>
    </div>
    <div class="detail-footer">
      <button class="btn btn-outline" onclick={closeDetailPanel}>Close</button>
      <button class="btn btn-primary" onclick={() => { closeDetailPanel(); openEditModal(selectedTerritory); }}>Edit Territory</button>
    </div>
  </div>
{/if}

<!-- Add Territory Modal -->
{#if showAddModal}
  <div class="modal-overlay" onclick={closeAddModal}></div>
  <div class="modal">
    <div class="modal-header">
      <h2 class="modal-title">Add New Territory</h2>
      <button class="close-btn" onclick={closeAddModal}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="18" y1="6" x2="6" y2="18"/>
          <line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
    </div>
    <form
      method="POST"
      action="?/addTerritory"
      use:enhance={() => {
        isSubmitting = true;
        return async ({ result, update }) => {
          isSubmitting = false;
          if (result.type === 'success') {
            closeAddModal();
            await update();
          }
        };
      }}
    >
      <div class="modal-body">
        <!-- Location Lookup Section -->
        <div class="lookup-section">
          <h4 class="section-title">Step 1: Find Location</h4>
          <p class="section-description">Enter a zip code or city to auto-fill coordinates and details.</p>

          <div class="lookup-row">
            <div class="form-group" style="flex: 1;">
              <label class="form-label">Zip Code</label>
              <input
                type="text"
                class="form-input"
                placeholder="28401"
                maxlength="5"
                bind:value={newTerritory.zipCode}
              />
            </div>
            <span class="lookup-or">or</span>
            <div class="form-group" style="flex: 2;">
              <label class="form-label">City, State</label>
              <div class="input-row">
                <input
                  type="text"
                  class="form-input"
                  placeholder="Wilmington"
                  bind:value={newTerritory.city}
                />
                <input
                  type="text"
                  class="form-input"
                  placeholder="NC"
                  maxlength="2"
                  style="width: 80px;"
                  bind:value={newTerritory.state}
                />
              </div>
            </div>
            <button type="button" class="btn btn-primary lookup-btn" onclick={lookupLocation} disabled={isLookingUp}>
              {#if isLookingUp}
                Looking up...
              {:else}
                Lookup
              {/if}
            </button>
          </div>

          {#if lookupError}
            <p class="lookup-error">{lookupError}</p>
          {/if}

          {#if newTerritory.centerLat !== 0}
            <p class="lookup-success">Location found: {newTerritory.centerLat.toFixed(4)}, {newTerritory.centerLng.toFixed(4)}</p>
          {/if}
        </div>

        <hr class="section-divider" />

        <!-- Territory Details Section -->
        <h4 class="section-title">Step 2: Territory Details</h4>

        <div class="form-grid">
          <div class="form-group full-width">
            <label class="form-label">Territory Name *</label>
            <input
              type="text"
              name="name"
              class="form-input"
              placeholder="e.g., Wilmington Metro, Austin North"
              bind:value={newTerritory.name}
              required
            />
          </div>

          <!-- Hidden fields for city/state (already filled from lookup) -->
          <input type="hidden" name="city" value={newTerritory.city} />
          <input type="hidden" name="state" value={newTerritory.state} />

          <div class="form-group">
            <label class="form-label">Territory Type</label>
            <select name="territoryType" class="form-input form-select" bind:value={newTerritory.territoryType}>
              <option value="city">City</option>
              <option value="county">County</option>
              <option value="metro">Metro Area</option>
            </select>
          </div>

          <div class="form-group">
            <label class="form-label">Radius (miles) *</label>
            <input
              type="number"
              name="radiusMiles"
              class="form-input"
              min="5"
              max="100"
              bind:value={newTerritory.radiusMiles}
              required
            />
          </div>

          <div class="form-group">
            <label class="form-label">Coordinates (auto-filled)</label>
            <div class="coordinates-display">
              <input type="hidden" name="centerLat" value={newTerritory.centerLat} />
              <input type="hidden" name="centerLng" value={newTerritory.centerLng} />
              <span class="coord-value">
                {#if newTerritory.centerLat !== 0}
                  {newTerritory.centerLat.toFixed(4)}, {newTerritory.centerLng.toFixed(4)}
                {:else}
                  Use lookup above
                {/if}
              </span>
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">Monthly Base Price ($)</label>
            <input
              type="number"
              name="monthlyBasePrice"
              class="form-input"
              min="0"
              step="100"
              bind:value={newTerritory.monthlyBasePrice}
            />
          </div>

          <div class="form-group">
            <label class="form-label">Population (estimate)</label>
            <input
              type="number"
              name="population"
              class="form-input"
              min="0"
              bind:value={newTerritory.population}
            />
          </div>
        </div>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-outline" onclick={closeAddModal}>Cancel</button>
        <button type="submit" class="btn btn-primary" disabled={isSubmitting || newTerritory.centerLat === 0}>
          {#if isSubmitting}
            Creating...
          {:else}
            Create Territory
          {/if}
        </button>
      </div>
    </form>
  </div>
{/if}

<!-- Edit Territory Modal -->
{#if showEditModal && editingTerritory}
  <div class="modal-overlay" onclick={closeEditModal}></div>
  <div class="modal">
    <div class="modal-header">
      <h2 class="modal-title">Edit Territory</h2>
      <button class="close-btn" onclick={closeEditModal}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="18" y1="6" x2="6" y2="18"/>
          <line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
    </div>
    <form
      method="POST"
      action="?/updateTerritory"
      use:enhance={() => {
        isSubmitting = true;
        return async ({ result, update }) => {
          isSubmitting = false;
          if (result.type === 'success') {
            closeEditModal();
            await update();
          }
        };
      }}
    >
      <input type="hidden" name="territoryId" value={editingTerritory.id} />
      <div class="modal-body">
        <div class="form-grid">
          <div class="form-group full-width">
            <label class="form-label">Territory Name *</label>
            <input
              type="text"
              name="name"
              class="form-input"
              bind:value={newTerritory.name}
              required
            />
          </div>

          <div class="form-group">
            <label class="form-label">City</label>
            <input
              type="text"
              name="city"
              class="form-input"
              bind:value={newTerritory.city}
            />
          </div>

          <div class="form-group">
            <label class="form-label">State</label>
            <input
              type="text"
              name="state"
              class="form-input"
              maxlength="2"
              bind:value={newTerritory.state}
            />
          </div>

          <div class="form-group">
            <label class="form-label">Territory Type</label>
            <select name="territoryType" class="form-input form-select" bind:value={newTerritory.territoryType}>
              <option value="city">City</option>
              <option value="county">County</option>
              <option value="metro">Metro Area</option>
            </select>
          </div>

          <div class="form-group">
            <label class="form-label">Radius (miles)</label>
            <input
              type="number"
              name="radiusMiles"
              class="form-input"
              min="5"
              max="100"
              bind:value={newTerritory.radiusMiles}
            />
          </div>

          <div class="form-group">
            <label class="form-label">Monthly Base Price ($)</label>
            <input
              type="number"
              name="monthlyBasePrice"
              class="form-input"
              min="0"
              step="100"
              bind:value={newTerritory.monthlyBasePrice}
            />
          </div>

          <div class="form-group">
            <label class="form-label">Population</label>
            <input
              type="number"
              name="population"
              class="form-input"
              min="0"
              bind:value={newTerritory.population}
            />
          </div>
        </div>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-outline" onclick={closeEditModal}>Cancel</button>
        <button type="submit" class="btn btn-primary" disabled={isSubmitting}>
          {#if isSubmitting}
            Saving...
          {:else}
            Save Changes
          {/if}
        </button>
      </div>
    </form>
  </div>
{/if}

<!-- Delete Confirmation Modal -->
{#if showDeleteConfirm && territoryToDelete}
  <div class="modal-overlay" onclick={cancelDelete}></div>
  <div class="modal modal-sm">
    <div class="modal-header">
      <h2 class="modal-title">Delete Territory</h2>
      <button class="close-btn" onclick={cancelDelete}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="18" y1="6" x2="6" y2="18"/>
          <line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
    </div>
    <form
      method="POST"
      action="?/deleteTerritory"
      use:enhance={() => {
        isSubmitting = true;
        return async ({ result, update }) => {
          isSubmitting = false;
          if (result.type === 'success') {
            cancelDelete();
            await update();
          }
        };
      }}
    >
      <input type="hidden" name="territoryId" value={territoryToDelete.id} />
      <div class="modal-body">
        <div class="delete-warning">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
            <line x1="12" y1="9" x2="12" y2="13"/>
            <line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
          <p>Are you sure you want to delete <strong>{territoryToDelete.name}</strong>?</p>
          <p class="delete-subtext">This action cannot be undone. All associated data will be permanently removed.</p>
        </div>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-outline" onclick={cancelDelete}>Cancel</button>
        <button type="submit" class="btn btn-danger" disabled={isSubmitting}>
          {#if isSubmitting}
            Deleting...
          {:else}
            Delete Territory
          {/if}
        </button>
      </div>
    </form>
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

  /* Map and Revenue Row */
  .map-revenue-row {
    display: grid;
    grid-template-columns: 2fr 1fr;
    gap: var(--spacing-6);
    margin-bottom: var(--spacing-6);
  }

  @media (max-width: 1024px) {
    .map-revenue-row {
      grid-template-columns: 1fr;
    }
  }

  .map-card {
    min-height: 400px;
    display: flex;
    flex-direction: column;
  }

  .map-container {
    flex: 1;
    min-height: 300px;
    border-radius: 0 0 var(--radius-lg) var(--radius-lg);
    z-index: 1;
  }

  .map-legend-bar {
    display: flex;
    gap: var(--spacing-4);
    justify-content: center;
    padding: var(--spacing-3);
    background: var(--gray-50);
    border-top: 1px solid var(--gray-200);
    flex-wrap: wrap;
  }

  .map-placeholder {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 240px;
    background: linear-gradient(135deg, var(--gray-50) 0%, var(--gray-100) 100%);
    border-radius: var(--radius-lg);
    margin: var(--spacing-4);
  }

  .map-placeholder-content {
    text-align: center;
    color: var(--gray-500);
  }

  .map-placeholder-content svg {
    margin-bottom: var(--spacing-3);
    color: var(--gray-400);
  }

  .map-placeholder-text {
    font-weight: 500;
    color: var(--gray-600);
    margin-bottom: var(--spacing-1);
  }

  .map-placeholder-subtext {
    font-size: 0.875rem;
    color: var(--gray-500);
    margin-bottom: var(--spacing-4);
  }

  .map-legend {
    display: flex;
    gap: var(--spacing-4);
    justify-content: center;
    flex-wrap: wrap;
  }

  @media (max-width: 480px) {
    .map-legend {
      gap: var(--spacing-2) var(--spacing-3);
    }
  }

  .legend-item {
    display: flex;
    align-items: center;
    gap: var(--spacing-2);
    font-size: 0.75rem;
    color: var(--gray-600);
  }

  .legend-dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
  }

  .legend-dot.available {
    background: var(--success-500);
  }

  .legend-dot.locked {
    background: var(--primary-500);
  }

  .legend-dot.waitlist {
    background: var(--warning-500);
  }

  .revenue-card .card-body {
    padding: var(--spacing-5);
  }

  .revenue-stat {
    margin-bottom: var(--spacing-5);
    padding-bottom: var(--spacing-5);
    border-bottom: 1px solid var(--gray-200);
  }

  .revenue-label {
    font-size: 0.875rem;
    color: var(--gray-500);
    margin-bottom: var(--spacing-2);
  }

  .revenue-value {
    font-size: 2rem;
    font-weight: 700;
    color: var(--gray-900);
  }

  .revenue-breakdown {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-3);
  }

  .breakdown-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .breakdown-label {
    font-size: 0.875rem;
    color: var(--gray-500);
  }

  .breakdown-value {
    font-weight: 600;
    color: var(--gray-900);
  }

  /* Filters Bar */
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

  @media (max-width: 768px) {
    .filters-bar {
      padding: var(--spacing-3);
      gap: var(--spacing-3);
    }
  }

  .filter-group {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-1);
  }

  .filter-group-action {
    margin-left: auto;
  }

  @media (max-width: 768px) {
    .filter-group {
      flex: 1;
      min-width: calc(50% - var(--spacing-3));
    }

    .filter-group-action {
      margin-left: 0;
      width: 100%;
      flex: none;
      min-width: 100%;
    }

    .filter-group-action .btn {
      width: 100%;
    }
  }

  @media (max-width: 480px) {
    .filter-group {
      min-width: 100%;
    }
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

  @media (max-width: 768px) {
    .filter-input {
      min-width: 0;
      width: 100%;
    }
  }

  .search-filter {
    flex: 1;
    min-width: 250px;
  }

  @media (max-width: 768px) {
    .search-filter {
      min-width: 100%;
      order: -1;
    }
  }

  /* Table Styles */
  .table-container {
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
  }

  @media (max-width: 768px) {
    .table-container {
      margin: 0 calc(-1 * var(--spacing-4));
      padding: 0 var(--spacing-4);
    }

    .table-container .table {
      min-width: 800px;
    }
  }

  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--spacing-4) var(--spacing-5);
    border-bottom: 1px solid var(--gray-200);
    flex-wrap: wrap;
    gap: var(--spacing-2);
  }

  @media (max-width: 768px) {
    .card-header {
      padding: var(--spacing-3) var(--spacing-4);
    }
  }

  .card-title {
    font-size: 1rem;
    font-weight: 600;
    color: var(--gray-900);
    margin: 0;
  }

  .card-subtitle {
    font-size: 0.875rem;
    color: var(--gray-500);
  }

  .territory-name-cell {
    display: flex;
    align-items: center;
    gap: var(--spacing-3);
  }

  .territory-icon {
    width: 36px;
    height: 36px;
    border-radius: var(--radius-lg);
    background: var(--primary-100);
    color: var(--primary-600);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .territory-info {
    display: flex;
    flex-direction: column;
  }

  .territory-name {
    font-weight: 500;
    color: var(--gray-900);
  }

  .territory-type {
    font-size: 0.75rem;
    color: var(--gray-500);
  }

  .location-cell {
    display: flex;
    flex-direction: column;
  }

  .location-primary {
    color: var(--gray-900);
  }

  .location-secondary {
    font-size: 0.75rem;
    color: var(--gray-500);
  }

  .status-badge {
    display: inline-flex;
    align-items: center;
    padding: 4px 10px;
    border-radius: var(--radius-full);
    font-size: 0.75rem;
    font-weight: 500;
  }

  .status-badge.available {
    background: var(--success-100);
    color: var(--success-700);
  }

  .status-badge.locked {
    background: var(--primary-100);
    color: var(--primary-700);
  }

  .status-badge.waitlist {
    background: var(--warning-100);
    color: var(--warning-600);
  }

  .status-badge.default {
    background: var(--gray-100);
    color: var(--gray-600);
  }

  .client-cell {
    display: flex;
    align-items: center;
    gap: var(--spacing-3);
  }

  .client-avatar {
    width: 32px;
    height: 32px;
    border-radius: var(--radius-lg);
    background: var(--primary-100);
    color: var(--primary-700);
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 600;
    font-size: 0.75rem;
    flex-shrink: 0;
  }

  .client-avatar.large {
    width: 48px;
    height: 48px;
    font-size: 1rem;
  }

  .client-info {
    display: flex;
    flex-direction: column;
  }

  .client-name {
    font-weight: 500;
    color: var(--primary-600);
    text-decoration: none;
  }

  .client-name:hover {
    text-decoration: underline;
  }

  .client-health {
    display: flex;
    align-items: center;
    gap: var(--spacing-1);
    font-size: 0.75rem;
    color: var(--gray-500);
  }

  .health-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
  }

  .health-dot.excellent {
    background: var(--success-500);
  }

  .health-dot.good {
    background: #22c55e;
  }

  .health-dot.warning {
    background: var(--warning-500);
  }

  .health-dot.critical {
    background: var(--danger-500);
  }

  .no-client,
  .no-value,
  .no-waitlist {
    color: var(--gray-400);
  }

  .value-cell {
    display: flex;
    flex-direction: column;
  }

  .value-primary {
    font-weight: 600;
    color: var(--gray-900);
  }

  .value-base {
    font-weight: 500;
    color: var(--gray-600);
  }

  .value-secondary {
    font-size: 0.75rem;
    color: var(--gray-500);
  }

  .waitlist-cell {
    display: flex;
    align-items: center;
    gap: var(--spacing-2);
  }

  .waitlist-badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    border-radius: var(--radius-full);
    background: var(--warning-100);
    color: var(--warning-700);
    font-weight: 600;
    font-size: 0.75rem;
  }

  .waitlist-label {
    font-size: 0.75rem;
    color: var(--gray-500);
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

  /* Pagination */
  .pagination {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--spacing-4) var(--spacing-5);
    border-top: 1px solid var(--gray-200);
    flex-wrap: wrap;
    gap: var(--spacing-3);
  }

  @media (max-width: 640px) {
    .pagination {
      flex-direction: column;
      padding: var(--spacing-3) var(--spacing-4);
    }
  }

  .pagination-info {
    font-size: 0.875rem;
    color: var(--gray-500);
  }

  @media (max-width: 640px) {
    .pagination-info {
      font-size: 0.75rem;
      text-align: center;
    }
  }

  .pagination-controls {
    display: flex;
    gap: var(--spacing-1);
    flex-wrap: wrap;
    justify-content: center;
  }

  .pagination-btn {
    width: 36px;
    height: 36px;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 1px solid var(--gray-200);
    background: white;
    color: var(--gray-600);
    border-radius: var(--radius-md);
    cursor: pointer;
    transition: all 0.2s ease;
    font-size: 0.875rem;
  }

  .pagination-btn:hover:not(:disabled) {
    background: var(--gray-50);
    border-color: var(--gray-300);
  }

  .pagination-btn.active {
    background: var(--primary-600);
    border-color: var(--primary-600);
    color: white;
  }

  .pagination-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  /* Detail Panel */
  .detail-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.3);
    z-index: 40;
  }

  .detail-panel {
    position: fixed;
    top: 0;
    right: 0;
    bottom: 0;
    width: 480px;
    max-width: 100%;
    background: white;
    box-shadow: -4px 0 20px rgba(0, 0, 0, 0.1);
    z-index: 50;
    display: flex;
    flex-direction: column;
  }

  .detail-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--spacing-5);
    border-bottom: 1px solid var(--gray-200);
  }

  .detail-title {
    font-size: 1.25rem;
    font-weight: 600;
    color: var(--gray-900);
    margin: 0;
  }

  .close-btn {
    width: 36px;
    height: 36px;
    display: flex;
    align-items: center;
    justify-content: center;
    border: none;
    background: transparent;
    color: var(--gray-500);
    cursor: pointer;
    border-radius: var(--radius-md);
    transition: all 0.2s ease;
  }

  .close-btn:hover {
    background: var(--gray-100);
    color: var(--gray-700);
  }

  .detail-body {
    flex: 1;
    overflow-y: auto;
    padding: var(--spacing-5);
  }

  .detail-section {
    margin-bottom: var(--spacing-6);
  }

  .detail-section:last-child {
    margin-bottom: 0;
  }

  .detail-section-title {
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--gray-900);
    margin: 0 0 var(--spacing-3) 0;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .detail-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: var(--spacing-3);
  }

  .detail-item {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-1);
  }

  .detail-label {
    font-size: 0.75rem;
    color: var(--gray-500);
  }

  .detail-value {
    font-weight: 500;
    color: var(--gray-900);
  }

  .assigned-client-card {
    display: flex;
    align-items: center;
    gap: var(--spacing-4);
    padding: var(--spacing-4);
    background: var(--gray-50);
    border-radius: var(--radius-lg);
  }

  .assigned-client-info {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-1);
  }

  .assigned-client-name {
    font-weight: 600;
    color: var(--primary-600);
    text-decoration: none;
  }

  .assigned-client-name:hover {
    text-decoration: underline;
  }

  .assigned-client-meta {
    display: flex;
    align-items: center;
    gap: var(--spacing-3);
  }

  .health-badge {
    font-size: 0.75rem;
    padding: 2px 8px;
    border-radius: var(--radius-full);
    font-weight: 500;
  }

  .health-badge.excellent {
    background: var(--success-100);
    color: var(--success-700);
  }

  .health-badge.good {
    background: #dcfce7;
    color: #15803d;
  }

  .health-badge.warning {
    background: var(--warning-100);
    color: var(--warning-600);
  }

  .health-badge.critical {
    background: var(--danger-100);
    color: var(--danger-600);
  }

  .monthly-rate {
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--gray-700);
  }

  .waitlist-list {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-3);
  }

  .waitlist-entry {
    display: flex;
    align-items: flex-start;
    gap: var(--spacing-3);
    padding: var(--spacing-3);
    background: var(--gray-50);
    border-radius: var(--radius-md);
  }

  .waitlist-position {
    width: 28px;
    height: 28px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--warning-100);
    color: var(--warning-700);
    border-radius: var(--radius-full);
    font-weight: 600;
    font-size: 0.75rem;
    flex-shrink: 0;
  }

  .waitlist-contact {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .waitlist-name {
    font-weight: 500;
    color: var(--gray-900);
  }

  .waitlist-email {
    font-size: 0.875rem;
    color: var(--gray-500);
  }

  .waitlist-practice {
    font-size: 0.75rem;
    color: var(--gray-400);
  }

  .detail-footer {
    display: flex;
    justify-content: flex-end;
    gap: var(--spacing-3);
    padding: var(--spacing-4) var(--spacing-5);
    border-top: 1px solid var(--gray-200);
  }

  /* Badge styles */
  .badge {
    display: inline-flex;
    align-items: center;
    padding: 4px 10px;
    border-radius: var(--radius-full);
    font-size: 0.75rem;
    font-weight: 500;
  }

  .badge-info {
    background: var(--primary-100);
    color: var(--primary-700);
  }

  /* Modal Styles */
  .modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.5);
    z-index: 100;
  }

  .modal {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 90%;
    max-width: 600px;
    max-height: 90vh;
    background: white;
    border-radius: var(--radius-xl);
    box-shadow: var(--shadow-xl);
    z-index: 101;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--spacing-4) var(--spacing-5);
    border-bottom: 1px solid var(--gray-200);
  }

  .modal-title {
    font-size: 1.25rem;
    font-weight: 600;
    color: var(--gray-900);
    margin: 0;
  }

  .modal-body {
    padding: var(--spacing-5);
    overflow-y: auto;
    flex: 1;
  }

  .modal-footer {
    display: flex;
    justify-content: flex-end;
    gap: var(--spacing-3);
    padding: var(--spacing-4) var(--spacing-5);
    border-top: 1px solid var(--gray-200);
    background: var(--gray-50);
  }

  .form-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: var(--spacing-4);
  }

  @media (max-width: 640px) {
    .form-grid {
      grid-template-columns: 1fr;
    }
  }

  .form-group {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-1);
  }

  .form-group.full-width {
    grid-column: 1 / -1;
  }

  .form-label {
    font-size: 0.875rem;
    font-weight: 500;
    color: var(--gray-700);
  }

  .form-help {
    font-size: 0.75rem;
    color: var(--gray-500);
    margin-top: var(--spacing-1);
  }

  /* Lookup Section Styles */
  .lookup-section {
    background: var(--gray-50);
    border-radius: var(--radius-lg);
    padding: var(--spacing-4);
    margin-bottom: var(--spacing-4);
  }

  .section-title {
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--gray-900);
    margin: 0 0 var(--spacing-1) 0;
  }

  .section-description {
    font-size: 0.8125rem;
    color: var(--gray-500);
    margin: 0 0 var(--spacing-3) 0;
  }

  .lookup-row {
    display: flex;
    gap: var(--spacing-3);
    align-items: flex-end;
    flex-wrap: wrap;
  }

  .lookup-or {
    font-size: 0.8125rem;
    color: var(--gray-400);
    padding-bottom: var(--spacing-2);
  }

  .input-row {
    display: flex;
    gap: var(--spacing-2);
  }

  .lookup-btn {
    flex-shrink: 0;
  }

  .lookup-error {
    color: var(--danger-600);
    font-size: 0.8125rem;
    margin-top: var(--spacing-2);
  }

  .lookup-success {
    color: var(--success-600);
    font-size: 0.8125rem;
    margin-top: var(--spacing-2);
  }

  .section-divider {
    border: none;
    border-top: 1px solid var(--gray-200);
    margin: var(--spacing-4) 0;
  }

  .coordinates-display {
    padding: var(--spacing-2) var(--spacing-3);
    background: var(--gray-100);
    border-radius: var(--radius-md);
    font-family: monospace;
  }

  .coord-value {
    font-size: 0.875rem;
    color: var(--gray-600);
  }

  /* Delete Modal Styles */
  .modal-sm {
    max-width: 400px;
  }

  .delete-warning {
    text-align: center;
    padding: var(--spacing-4);
  }

  .delete-warning svg {
    color: var(--danger-500);
    margin-bottom: var(--spacing-3);
  }

  .delete-warning p {
    margin: 0 0 var(--spacing-2) 0;
    color: var(--gray-700);
  }

  .delete-subtext {
    font-size: 0.875rem;
    color: var(--gray-500);
  }

  .btn-danger {
    background: var(--danger-600);
    color: white;
    border: none;
  }

  .btn-danger:hover {
    background: var(--danger-700);
  }

  /* Action button danger state */
  .action-btn.danger:hover {
    background: var(--danger-50);
    color: var(--danger-600);
    border-color: var(--danger-200);
  }

  @media (max-width: 640px) {
    .lookup-row {
      flex-direction: column;
      align-items: stretch;
    }

    .lookup-or {
      text-align: center;
      padding: var(--spacing-1) 0;
    }

    .input-row {
      flex-direction: column;
    }

    .input-row input {
      width: 100% !important;
    }
  }

  /* Fullscreen Map Styles */
  .map-actions {
    display: flex;
    align-items: center;
    gap: var(--spacing-2);
  }

  .fullscreen-btn {
    width: 36px;
    height: 36px;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 1px solid var(--gray-200);
    background: white;
    color: var(--gray-600);
    border-radius: var(--radius-md);
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .fullscreen-btn:hover {
    background: var(--gray-50);
    color: var(--gray-900);
    border-color: var(--gray-300);
  }

  .loading-indicator {
    font-size: 0.75rem;
    color: var(--primary-600);
    margin-left: var(--spacing-2);
    animation: pulse 1.5s infinite;
  }

  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }

  /* Fullscreen mode for map */
  .map-revenue-row.fullscreen-active {
    position: fixed;
    inset: 0;
    z-index: 1000;
    display: block;
    padding: 0;
    margin: 0;
    background: rgba(0, 0, 0, 0.9);
  }

  .map-revenue-row.fullscreen-active .revenue-card {
    display: none;
  }

  .map-card.fullscreen {
    position: fixed;
    inset: var(--spacing-4);
    z-index: 1001;
    min-height: auto;
    border-radius: var(--radius-xl);
    box-shadow: var(--shadow-2xl);
    display: flex;
    flex-direction: column;
  }

  .map-container.fullscreen-map {
    flex: 1;
    min-height: 0;
    height: 100%;
  }

  .map-card.fullscreen .card-header {
    flex-shrink: 0;
  }

  .map-card.fullscreen .map-legend-bar {
    flex-shrink: 0;
  }

  /* Small button style for fullscreen close */
  .btn-sm {
    padding: var(--spacing-2) var(--spacing-3);
    font-size: 0.8125rem;
    display: inline-flex;
    align-items: center;
    gap: var(--spacing-1);
  }
</style>
