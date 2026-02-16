<script lang="ts">
  import type { PageData, ActionData } from './$types';
  import { enhance } from '$app/forms';
  import { onMount } from 'svelte';
  import { browser } from '$app/environment';
  import { goto } from '$app/navigation';

  let { data, form }: { data: PageData; form: ActionData } = $props();

  // US States list
  const US_STATES = [
    { code: 'AL', name: 'Alabama' },
    { code: 'AK', name: 'Alaska' },
    { code: 'AZ', name: 'Arizona' },
    { code: 'AR', name: 'Arkansas' },
    { code: 'CA', name: 'California' },
    { code: 'CO', name: 'Colorado' },
    { code: 'CT', name: 'Connecticut' },
    { code: 'DE', name: 'Delaware' },
    { code: 'FL', name: 'Florida' },
    { code: 'GA', name: 'Georgia' },
    { code: 'HI', name: 'Hawaii' },
    { code: 'ID', name: 'Idaho' },
    { code: 'IL', name: 'Illinois' },
    { code: 'IN', name: 'Indiana' },
    { code: 'IA', name: 'Iowa' },
    { code: 'KS', name: 'Kansas' },
    { code: 'KY', name: 'Kentucky' },
    { code: 'LA', name: 'Louisiana' },
    { code: 'ME', name: 'Maine' },
    { code: 'MD', name: 'Maryland' },
    { code: 'MA', name: 'Massachusetts' },
    { code: 'MI', name: 'Michigan' },
    { code: 'MN', name: 'Minnesota' },
    { code: 'MS', name: 'Mississippi' },
    { code: 'MO', name: 'Missouri' },
    { code: 'MT', name: 'Montana' },
    { code: 'NE', name: 'Nebraska' },
    { code: 'NV', name: 'Nevada' },
    { code: 'NH', name: 'New Hampshire' },
    { code: 'NJ', name: 'New Jersey' },
    { code: 'NM', name: 'New Mexico' },
    { code: 'NY', name: 'New York' },
    { code: 'NC', name: 'North Carolina' },
    { code: 'ND', name: 'North Dakota' },
    { code: 'OH', name: 'Ohio' },
    { code: 'OK', name: 'Oklahoma' },
    { code: 'OR', name: 'Oregon' },
    { code: 'PA', name: 'Pennsylvania' },
    { code: 'RI', name: 'Rhode Island' },
    { code: 'SC', name: 'South Carolina' },
    { code: 'SD', name: 'South Dakota' },
    { code: 'TN', name: 'Tennessee' },
    { code: 'TX', name: 'Texas' },
    { code: 'UT', name: 'Utah' },
    { code: 'VT', name: 'Vermont' },
    { code: 'VA', name: 'Virginia' },
    { code: 'WA', name: 'Washington' },
    { code: 'WV', name: 'West Virginia' },
    { code: 'WI', name: 'Wisconsin' },
    { code: 'WY', name: 'Wyoming' },
    { code: 'DC', name: 'District of Columbia' }
  ];

  // Type definitions
  interface ZipCodeEntry {
    zipCode: string;
    city: string;
    state: string;
    lat: number;
    lng: number;
    population?: number;
  }

  interface Demographics {
    population: number;
    households: number;
    medianIncome: number;
    medianAge: number;
  }

  // State variables
  let territoryType = $state<'metro' | 'county' | 'city' | 'zipcode'>('zipcode');
  let selectedState = $state('');
  let selectedMetro = $state('');
  let selectedCounty = $state('');
  let citySearch = $state('');
  let zipCodeSearch = $state('');
  let selectedZipCodes = $state<ZipCodeEntry[]>([]);
  let demographics = $state<Demographics | null>(null);
  let territoryName = $state('');
  let monthlyBasePrice = $state(1500);
  let isLoading = $state(false);
  let isSearching = $state(false);
  let isCreating = $state(false);
  let errorMessage = $state('');
  let successMessage = $state('');

  // Search results
  let zipSearchResults = $state<ZipCodeEntry[]>([]);
  let citySearchResults = $state<Array<{city: string, state: string, lat: number, lng: number}>>([]);
  let metroOptions = $state<Array<{code: string, name: string}>>([]);
  let countyOptions = $state<Array<{code: string, name: string}>>([]);

  // Map state
  let mapContainer: HTMLDivElement;
  let map: any = null;
  let L: any = null;
  let markers: any[] = [];
  let circles: any[] = [];

  // Computed values
  let canCreate = $derived(
    territoryName.trim() !== '' &&
    monthlyBasePrice > 0 &&
    (
      (territoryType === 'zipcode' && selectedZipCodes.length > 0) ||
      (territoryType === 'metro' && selectedState && selectedMetro) ||
      (territoryType === 'county' && selectedState && selectedCounty) ||
      (territoryType === 'city' && selectedState && citySearch)
    )
  );

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
    }

    return () => {
      if (map) {
        map.remove();
      }
    };
  });

  // Update map when zip codes change
  $effect(() => {
    if (map && L && selectedZipCodes.length > 0) {
      updateMapMarkers();
    }
  });

  function updateMapMarkers() {
    if (!map || !L) return;

    // Clear existing markers and circles
    markers.forEach(m => map.removeLayer(m));
    circles.forEach(c => map.removeLayer(c));
    markers = [];
    circles = [];

    // Add new markers for each zip code
    selectedZipCodes.forEach(zip => {
      const circle = L.circle([zip.lat, zip.lng], {
        radius: 8046.72, // 5 miles in meters
        fillColor: '#3b82f6',
        fillOpacity: 0.2,
        color: '#3b82f6',
        weight: 2
      }).addTo(map);

      circle.bindPopup(`
        <strong>${zip.zipCode}</strong><br>
        ${zip.city}, ${zip.state}<br>
        ${zip.population ? `Pop: ${formatNumber(zip.population)}` : ''}
      `);

      circles.push(circle);
    });

    // Fit map to show all markers
    if (selectedZipCodes.length > 0) {
      const bounds = L.latLngBounds(
        selectedZipCodes.map(z => [z.lat, z.lng])
      );
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }

  // Search for zip codes using Nominatim
  async function searchZipCodes() {
    if (!zipCodeSearch.trim()) return;

    isSearching = true;
    errorMessage = '';
    zipSearchResults = [];

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(zipCodeSearch + ', USA')}&limit=5&addressdetails=1`,
        { headers: { 'User-Agent': 'SqueezMedia-Platform' } }
      );

      const results = await response.json();

      if (results.length === 0) {
        errorMessage = 'No results found. Try a different zip code.';
        return;
      }

      // Filter and map results
      zipSearchResults = results
        .filter((r: any) => r.address?.postcode)
        .map((r: any) => ({
          zipCode: r.address.postcode,
          city: r.address.city || r.address.town || r.address.village || r.address.county || 'Unknown',
          state: r.address.state || '',
          lat: parseFloat(r.lat),
          lng: parseFloat(r.lon),
          population: 0
        }));

      // If direct zip code match, try to get population from Census
      if (zipCodeSearch.match(/^\d{5}$/)) {
        try {
          const censusResponse = await fetch(
            `https://api.census.gov/data/2022/acs/acs5?get=NAME,B01003_001E&for=zip%20code%20tabulation%20area:${zipCodeSearch}`
          );
          const censusData = await censusResponse.json();
          if (censusData && censusData.length > 1 && censusData[1][1]) {
            const pop = parseInt(censusData[1][1]);
            if (zipSearchResults.length > 0) {
              zipSearchResults[0].population = pop;
            }
          }
        } catch (e) {
          console.log('Census data not available');
        }
      }

    } catch (error) {
      console.error('Search error:', error);
      errorMessage = 'Failed to search. Please try again.';
    } finally {
      isSearching = false;
    }
  }

  function addZipCode(zip: ZipCodeEntry) {
    // Check if already added
    if (selectedZipCodes.some(z => z.zipCode === zip.zipCode)) {
      errorMessage = 'This zip code is already added.';
      return;
    }

    selectedZipCodes = [...selectedZipCodes, zip];
    zipSearchResults = [];
    zipCodeSearch = '';
    errorMessage = '';

    // Auto-generate territory name if empty
    if (!territoryName && selectedZipCodes.length === 1) {
      territoryName = `${zip.city} Area`;
    }

    // Update demographics
    updateDemographics();
  }

  function removeZipCode(zipCode: string) {
    selectedZipCodes = selectedZipCodes.filter(z => z.zipCode !== zipCode);
    updateDemographics();
  }

  async function updateDemographics() {
    if (selectedZipCodes.length === 0) {
      demographics = null;
      return;
    }

    // Aggregate demographics from selected zip codes
    let totalPop = 0;
    let totalHouseholds = 0;

    for (const zip of selectedZipCodes) {
      if (zip.population) {
        totalPop += zip.population;
        totalHouseholds += Math.round(zip.population / 2.5); // Rough estimate
      }
    }

    // If we don't have population data, try to fetch it
    if (totalPop === 0) {
      for (const zip of selectedZipCodes) {
        try {
          const censusResponse = await fetch(
            `https://api.census.gov/data/2022/acs/acs5?get=NAME,B01003_001E,B19013_001E,B01002_001E&for=zip%20code%20tabulation%20area:${zip.zipCode}`
          );
          const censusData = await censusResponse.json();
          if (censusData && censusData.length > 1) {
            const pop = parseInt(censusData[1][1]) || 0;
            totalPop += pop;
            totalHouseholds += Math.round(pop / 2.5);
          }
        } catch (e) {
          // Continue if one zip fails
        }
      }
    }

    demographics = {
      population: totalPop,
      households: totalHouseholds,
      medianIncome: 65000, // Default estimate
      medianAge: 38 // Default estimate
    };
  }

  // Fetch metros for a state
  async function fetchMetros() {
    if (!selectedState) {
      metroOptions = [];
      return;
    }

    isLoading = true;
    try {
      // Using Census Bureau's Core Based Statistical Areas (CBSAs)
      // For now, we'll use a simplified approach with major metros
      const stateName = US_STATES.find(s => s.code === selectedState)?.name || '';

      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=metro+area+${stateName}+USA&limit=10`,
        { headers: { 'User-Agent': 'SqueezMedia-Platform' } }
      );

      const results = await response.json();
      metroOptions = results
        .filter((r: any) => r.display_name.includes(stateName))
        .map((r: any) => ({
          code: r.place_id.toString(),
          name: r.display_name.split(',')[0]
        }));
    } catch (error) {
      console.error('Error fetching metros:', error);
    } finally {
      isLoading = false;
    }
  }

  // Fetch counties for a state
  async function fetchCounties() {
    if (!selectedState) {
      countyOptions = [];
      return;
    }

    isLoading = true;
    try {
      const stateFips = getStateFips(selectedState);
      const response = await fetch(
        `https://api.census.gov/data/2022/acs/acs5?get=NAME&for=county:*&in=state:${stateFips}`
      );

      const results = await response.json();
      if (results && results.length > 1) {
        countyOptions = results.slice(1).map((r: string[]) => ({
          code: r[2], // county FIPS code
          name: r[0].replace(' County', '').replace(`, ${US_STATES.find(s => s.code === selectedState)?.name}`, '')
        })).sort((a: any, b: any) => a.name.localeCompare(b.name));
      }
    } catch (error) {
      console.error('Error fetching counties:', error);
      // Fallback to Nominatim
      const stateName = US_STATES.find(s => s.code === selectedState)?.name || '';
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=county+${stateName}+USA&limit=50`,
          { headers: { 'User-Agent': 'SqueezMedia-Platform' } }
        );
        const results = await response.json();
        countyOptions = results
          .filter((r: any) => r.type === 'administrative')
          .map((r: any) => ({
            code: r.place_id.toString(),
            name: r.display_name.split(',')[0].replace(' County', '')
          }));
      } catch (e) {
        console.error('Fallback search failed:', e);
      }
    } finally {
      isLoading = false;
    }
  }

  function getStateFips(stateCode: string): string {
    const fipsMap: Record<string, string> = {
      'AL': '01', 'AK': '02', 'AZ': '04', 'AR': '05', 'CA': '06', 'CO': '08', 'CT': '09',
      'DE': '10', 'FL': '12', 'GA': '13', 'HI': '15', 'ID': '16', 'IL': '17', 'IN': '18',
      'IA': '19', 'KS': '20', 'KY': '21', 'LA': '22', 'ME': '23', 'MD': '24', 'MA': '25',
      'MI': '26', 'MN': '27', 'MS': '28', 'MO': '29', 'MT': '30', 'NE': '31', 'NV': '32',
      'NH': '33', 'NJ': '34', 'NM': '35', 'NY': '36', 'NC': '37', 'ND': '38', 'OH': '39',
      'OK': '40', 'OR': '41', 'PA': '42', 'RI': '44', 'SC': '45', 'SD': '46', 'TN': '47',
      'TX': '48', 'UT': '49', 'VT': '50', 'VA': '51', 'WA': '53', 'WV': '54', 'WI': '55',
      'WY': '56', 'DC': '11'
    };
    return fipsMap[stateCode] || '00';
  }

  // Handle territory type change
  function handleTypeChange() {
    // Reset selections when type changes
    selectedState = '';
    selectedMetro = '';
    selectedCounty = '';
    citySearch = '';
    selectedZipCodes = [];
    demographics = null;
    territoryName = '';
    metroOptions = [];
    countyOptions = [];
  }

  // Handle state change
  function handleStateChange() {
    selectedMetro = '';
    selectedCounty = '';
    metroOptions = [];
    countyOptions = [];

    if (territoryType === 'metro') {
      fetchMetros();
    } else if (territoryType === 'county') {
      fetchCounties();
    }
  }

  // Auto-generate territory name based on selection
  function generateTerritoryName() {
    const stateName = US_STATES.find(s => s.code === selectedState)?.name || selectedState;

    switch (territoryType) {
      case 'metro':
        if (selectedMetro) {
          const metro = metroOptions.find(m => m.code === selectedMetro);
          territoryName = metro ? `${metro.name} Metro` : '';
        }
        break;
      case 'county':
        if (selectedCounty) {
          const county = countyOptions.find(c => c.code === selectedCounty);
          territoryName = county ? `${county.name} County, ${selectedState}` : '';
        }
        break;
      case 'city':
        if (citySearch) {
          territoryName = `${citySearch}, ${selectedState}`;
        }
        break;
      case 'zipcode':
        if (selectedZipCodes.length === 1) {
          territoryName = `${selectedZipCodes[0].city} Area`;
        } else if (selectedZipCodes.length > 1) {
          territoryName = `${selectedZipCodes[0].city} + ${selectedZipCodes.length - 1} more`;
        }
        break;
    }
  }

  // Create territory
  async function createTerritory() {
    if (!canCreate) return;

    isCreating = true;
    errorMessage = '';
    successMessage = '';

    try {
      // Prepare territory data
      const territoryData = {
        name: territoryName,
        type: territoryType,
        state: selectedState || (selectedZipCodes[0]?.state || ''),
        monthlyBasePrice,
        zipCodes: territoryType === 'zipcode' ? selectedZipCodes : [],
        metro: territoryType === 'metro' ? selectedMetro : null,
        county: territoryType === 'county' ? selectedCounty : null,
        city: territoryType === 'city' ? citySearch : null,
        demographics
      };

      // Submit form via POST
      const formData = new FormData();
      formData.append('data', JSON.stringify(territoryData));

      const response = await fetch('?/createTerritory', {
        method: 'POST',
        body: formData
      });

      if (response.ok) {
        successMessage = 'Territory created successfully!';
        setTimeout(() => {
          goto('/internal/territories');
        }, 1500);
      } else {
        throw new Error('Failed to create territory');
      }
    } catch (error) {
      console.error('Error creating territory:', error);
      errorMessage = 'Failed to create territory. Please try again.';
    } finally {
      isCreating = false;
    }
  }

  // Helper functions
  function formatNumber(num: number): string {
    return new Intl.NumberFormat('en-US').format(num);
  }

  function formatCurrency(value: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  }
</script>

<svelte:head>
  <title>Create Territory - SqueezMedia Operations</title>
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=" crossorigin="" />
</svelte:head>

<!-- Page Header -->
<div class="page-header">
  <div class="page-header-left">
    <a href="/internal/territories" class="back-link">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polyline points="15 18 9 12 15 6"/>
      </svg>
      Back to Territories
    </a>
    <h1 class="page-title">Create New Territory</h1>
    <p class="page-subtitle">Define a new exclusive territory for your lead generation network.</p>
  </div>
</div>

<!-- Builder Container -->
<div class="builder-container">
  <!-- Left Sidebar - Form -->
  <div class="builder-sidebar">
    <!-- Step 1: Territory Type -->
    <div class="step-section">
      <div class="step-header">
        <span class="step-number">1</span>
        <h3 class="step-title">Territory Type</h3>
      </div>
      <div class="step-content">
        <div class="radio-group">
          <label class="radio-option" class:selected={territoryType === 'metro'}>
            <input
              type="radio"
              name="territoryType"
              value="metro"
              bind:group={territoryType}
              onchange={handleTypeChange}
            />
            <div class="radio-content">
              <span class="radio-label">Metro Area</span>
              <span class="radio-description">Major metropolitan statistical area</span>
            </div>
          </label>

          <label class="radio-option" class:selected={territoryType === 'county'}>
            <input
              type="radio"
              name="territoryType"
              value="county"
              bind:group={territoryType}
              onchange={handleTypeChange}
            />
            <div class="radio-content">
              <span class="radio-label">County</span>
              <span class="radio-description">Single county boundary</span>
            </div>
          </label>

          <label class="radio-option" class:selected={territoryType === 'city'}>
            <input
              type="radio"
              name="territoryType"
              value="city"
              bind:group={territoryType}
              onchange={handleTypeChange}
            />
            <div class="radio-content">
              <span class="radio-label">City</span>
              <span class="radio-description">City limits or radius</span>
            </div>
          </label>

          <label class="radio-option" class:selected={territoryType === 'zipcode'}>
            <input
              type="radio"
              name="territoryType"
              value="zipcode"
              bind:group={territoryType}
              onchange={handleTypeChange}
            />
            <div class="radio-content">
              <span class="radio-label">Zip Code(s)</span>
              <span class="radio-description">One or more zip codes</span>
            </div>
          </label>
        </div>
      </div>
    </div>

    <!-- Step 2: Location Selection -->
    <div class="step-section">
      <div class="step-header">
        <span class="step-number">2</span>
        <h3 class="step-title">Location Selection</h3>
      </div>
      <div class="step-content">
        {#if territoryType === 'metro'}
          <!-- Metro Selection -->
          <div class="form-group">
            <label class="form-label">State</label>
            <select
              class="form-input form-select"
              bind:value={selectedState}
              onchange={handleStateChange}
            >
              <option value="">Select a state...</option>
              {#each US_STATES as state}
                <option value={state.code}>{state.name}</option>
              {/each}
            </select>
          </div>

          {#if selectedState}
            <div class="form-group">
              <label class="form-label">Metro Area</label>
              {#if isLoading}
                <div class="loading-indicator">
                  <span class="spinner"></span>
                  Loading metros...
                </div>
              {:else}
                <select
                  class="form-input form-select"
                  bind:value={selectedMetro}
                  onchange={generateTerritoryName}
                >
                  <option value="">Select a metro area...</option>
                  {#each metroOptions as metro}
                    <option value={metro.code}>{metro.name}</option>
                  {/each}
                </select>
              {/if}
            </div>
          {/if}

        {:else if territoryType === 'county'}
          <!-- County Selection -->
          <div class="form-group">
            <label class="form-label">State</label>
            <select
              class="form-input form-select"
              bind:value={selectedState}
              onchange={handleStateChange}
            >
              <option value="">Select a state...</option>
              {#each US_STATES as state}
                <option value={state.code}>{state.name}</option>
              {/each}
            </select>
          </div>

          {#if selectedState}
            <div class="form-group">
              <label class="form-label">County</label>
              {#if isLoading}
                <div class="loading-indicator">
                  <span class="spinner"></span>
                  Loading counties...
                </div>
              {:else}
                <select
                  class="form-input form-select"
                  bind:value={selectedCounty}
                  onchange={generateTerritoryName}
                >
                  <option value="">Select a county...</option>
                  {#each countyOptions as county}
                    <option value={county.code}>{county.name}</option>
                  {/each}
                </select>
              {/if}
            </div>
          {/if}

        {:else if territoryType === 'city'}
          <!-- City Selection -->
          <div class="form-group">
            <label class="form-label">State</label>
            <select
              class="form-input form-select"
              bind:value={selectedState}
            >
              <option value="">Select a state...</option>
              {#each US_STATES as state}
                <option value={state.code}>{state.name}</option>
              {/each}
            </select>
          </div>

          {#if selectedState}
            <div class="form-group">
              <label class="form-label">City Name</label>
              <input
                type="text"
                class="form-input"
                placeholder="Enter city name..."
                bind:value={citySearch}
                oninput={generateTerritoryName}
              />
            </div>
          {/if}

        {:else if territoryType === 'zipcode'}
          <!-- Zip Code Selection -->
          <div class="form-group">
            <label class="form-label">Search Zip Codes</label>
            <div class="search-row">
              <input
                type="text"
                class="form-input"
                placeholder="Enter zip code (e.g., 28401)"
                bind:value={zipCodeSearch}
                onkeydown={(e) => e.key === 'Enter' && searchZipCodes()}
              />
              <button
                type="button"
                class="btn btn-primary"
                onclick={searchZipCodes}
                disabled={isSearching || !zipCodeSearch.trim()}
              >
                {#if isSearching}
                  <span class="spinner-sm"></span>
                {:else}
                  Add
                {/if}
              </button>
            </div>
          </div>

          <!-- Search Results -->
          {#if zipSearchResults.length > 0}
            <div class="search-results">
              {#each zipSearchResults as result}
                <button
                  type="button"
                  class="search-result-item"
                  onclick={() => addZipCode(result)}
                >
                  <div class="result-info">
                    <span class="result-zip">{result.zipCode}</span>
                    <span class="result-location">{result.city}, {result.state}</span>
                  </div>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="12" y1="5" x2="12" y2="19"/>
                    <line x1="5" y1="12" x2="19" y2="12"/>
                  </svg>
                </button>
              {/each}
            </div>
          {/if}

          <!-- Selected Zip Codes -->
          {#if selectedZipCodes.length > 0}
            <div class="selected-items">
              <label class="form-label">Selected Zip Codes ({selectedZipCodes.length})</label>
              <div class="selected-list">
                {#each selectedZipCodes as zip}
                  <div class="selected-item">
                    <div class="selected-item-info">
                      <span class="selected-item-primary">{zip.zipCode}</span>
                      <span class="selected-item-secondary">{zip.city}, {zip.state}</span>
                    </div>
                    <button
                      type="button"
                      class="remove-btn"
                      onclick={() => removeZipCode(zip.zipCode)}
                      title="Remove"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="18" y1="6" x2="6" y2="18"/>
                        <line x1="6" y1="6" x2="18" y2="18"/>
                      </svg>
                    </button>
                  </div>
                {/each}
              </div>
            </div>
          {/if}
        {/if}

        {#if errorMessage}
          <div class="error-message">{errorMessage}</div>
        {/if}
      </div>
    </div>

    <!-- Step 3: Details -->
    <div class="step-section">
      <div class="step-header">
        <span class="step-number">3</span>
        <h3 class="step-title">Territory Details</h3>
      </div>
      <div class="step-content">
        <div class="form-group">
          <label class="form-label">Territory Name</label>
          <input
            type="text"
            class="form-input"
            placeholder="e.g., Wilmington Metro, Austin North"
            bind:value={territoryName}
          />
          <p class="form-help">Auto-filled based on selection. You can edit this.</p>
        </div>

        <div class="form-group">
          <label class="form-label">Monthly Base Price</label>
          <div class="price-input-wrapper">
            <span class="price-prefix">$</span>
            <input
              type="number"
              class="form-input price-input"
              min="0"
              step="100"
              bind:value={monthlyBasePrice}
            />
            <span class="price-suffix">/mo</span>
          </div>
        </div>

        {#if successMessage}
          <div class="success-message">{successMessage}</div>
        {/if}

        <form
          method="POST"
          action="?/createTerritory"
          use:enhance={() => {
            isCreating = true;
            return async ({ result, update }) => {
              isCreating = false;
              if (result.type === 'success') {
                successMessage = 'Territory created successfully!';
                setTimeout(() => {
                  goto('/internal/territories');
                }, 1500);
              } else if (result.type === 'failure') {
                errorMessage = 'Failed to create territory. Please try again.';
              }
            };
          }}
        >
          <!-- Hidden form fields -->
          <input type="hidden" name="name" value={territoryName} />
          <input type="hidden" name="type" value={territoryType} />
          <input type="hidden" name="state" value={selectedState || (selectedZipCodes[0]?.state || '')} />
          <input type="hidden" name="monthlyBasePrice" value={monthlyBasePrice} />
          <input type="hidden" name="zipCodes" value={JSON.stringify(selectedZipCodes)} />
          <input type="hidden" name="metro" value={selectedMetro} />
          <input type="hidden" name="county" value={selectedCounty} />
          <input type="hidden" name="city" value={citySearch} />
          <input type="hidden" name="demographics" value={JSON.stringify(demographics)} />

          <button
            type="submit"
            class="btn btn-primary btn-lg btn-full"
            disabled={!canCreate || isCreating}
          >
            {#if isCreating}
              <span class="spinner-sm"></span>
              Creating Territory...
            {:else}
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="12" y1="5" x2="12" y2="19"/>
                <line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              Create Territory
            {/if}
          </button>
        </form>
      </div>
    </div>
  </div>

  <!-- Right Side - Map and Demographics -->
  <div class="builder-main">
    <!-- Map Card -->
    <div class="card map-card">
      <div class="card-header">
        <h3 class="card-title">Territory Preview</h3>
        <span class="badge badge-info">Interactive Map</span>
      </div>
      <div class="map-container" bind:this={mapContainer}></div>
      <div class="map-legend-bar">
        <div class="legend-item">
          <span class="legend-dot selected"></span>
          <span>Selected Areas</span>
        </div>
      </div>
    </div>

    <!-- Demographics Panel -->
    <div class="card demographics-card">
      <div class="card-header">
        <h3 class="card-title">Demographics</h3>
      </div>
      <div class="card-body">
        {#if demographics}
          <div class="demographics-grid">
            <div class="demographic-item">
              <div class="demographic-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                  <circle cx="9" cy="7" r="4"/>
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                  <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                </svg>
              </div>
              <div class="demographic-content">
                <span class="demographic-value">{formatNumber(demographics.population)}</span>
                <span class="demographic-label">Population</span>
              </div>
            </div>

            <div class="demographic-item">
              <div class="demographic-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                  <polyline points="9 22 9 12 15 12 15 22"/>
                </svg>
              </div>
              <div class="demographic-content">
                <span class="demographic-value">{formatNumber(demographics.households)}</span>
                <span class="demographic-label">Households</span>
              </div>
            </div>

            <div class="demographic-item">
              <div class="demographic-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="12" y1="1" x2="12" y2="23"/>
                  <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
                </svg>
              </div>
              <div class="demographic-content">
                <span class="demographic-value">{formatCurrency(demographics.medianIncome)}</span>
                <span class="demographic-label">Median Income</span>
              </div>
            </div>

            <div class="demographic-item">
              <div class="demographic-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="10"/>
                  <polyline points="12 6 12 12 16 14"/>
                </svg>
              </div>
              <div class="demographic-content">
                <span class="demographic-value">{demographics.medianAge}</span>
                <span class="demographic-label">Median Age</span>
              </div>
            </div>
          </div>
        {:else}
          <div class="demographics-empty">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
              <circle cx="12" cy="10" r="3"/>
            </svg>
            <p>Select locations to view demographics</p>
          </div>
        {/if}
      </div>
    </div>

    <!-- Territory Summary -->
    {#if territoryName || selectedZipCodes.length > 0}
      <div class="card summary-card">
        <div class="card-header">
          <h3 class="card-title">Territory Summary</h3>
        </div>
        <div class="card-body">
          <div class="summary-grid">
            <div class="summary-item">
              <span class="summary-label">Name</span>
              <span class="summary-value">{territoryName || 'Not set'}</span>
            </div>
            <div class="summary-item">
              <span class="summary-label">Type</span>
              <span class="summary-value">{territoryType.charAt(0).toUpperCase() + territoryType.slice(1)}</span>
            </div>
            <div class="summary-item">
              <span class="summary-label">Base Price</span>
              <span class="summary-value">{formatCurrency(monthlyBasePrice)}/mo</span>
            </div>
            {#if territoryType === 'zipcode'}
              <div class="summary-item">
                <span class="summary-label">Zip Codes</span>
                <span class="summary-value">{selectedZipCodes.length} selected</span>
              </div>
            {/if}
          </div>
        </div>
      </div>
    {/if}
  </div>
</div>

<style>
  /* Page Header */
  .page-header {
    margin-bottom: var(--spacing-6);
  }

  .back-link {
    display: inline-flex;
    align-items: center;
    gap: var(--spacing-2);
    color: var(--gray-500);
    text-decoration: none;
    font-size: 0.875rem;
    margin-bottom: var(--spacing-2);
    transition: color 0.2s ease;
  }

  .back-link:hover {
    color: var(--primary-600);
  }

  .page-title {
    font-size: 1.5rem;
    font-weight: 700;
    color: var(--gray-900);
    margin: 0 0 var(--spacing-1) 0;
  }

  .page-subtitle {
    font-size: 0.875rem;
    color: var(--gray-500);
    margin: 0;
  }

  /* Builder Container */
  .builder-container {
    display: flex;
    gap: var(--spacing-6);
    min-height: calc(100vh - 200px);
  }

  @media (max-width: 1024px) {
    .builder-container {
      flex-direction: column;
    }
  }

  /* Builder Sidebar */
  .builder-sidebar {
    width: 400px;
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
    gap: var(--spacing-4);
  }

  @media (max-width: 1024px) {
    .builder-sidebar {
      width: 100%;
    }
  }

  /* Builder Main */
  .builder-main {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: var(--spacing-4);
  }

  /* Step Section */
  .step-section {
    background: white;
    border-radius: var(--radius-xl);
    border: 1px solid var(--gray-200);
    overflow: hidden;
  }

  .step-header {
    display: flex;
    align-items: center;
    gap: var(--spacing-3);
    padding: var(--spacing-4);
    background: var(--gray-50);
    border-bottom: 1px solid var(--gray-200);
  }

  .step-number {
    width: 28px;
    height: 28px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--primary-600);
    color: white;
    border-radius: var(--radius-full);
    font-weight: 600;
    font-size: 0.875rem;
  }

  .step-title {
    font-size: 1rem;
    font-weight: 600;
    color: var(--gray-900);
    margin: 0;
  }

  .step-content {
    padding: var(--spacing-4);
  }

  /* Radio Group */
  .radio-group {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-2);
  }

  .radio-option {
    display: flex;
    align-items: flex-start;
    gap: var(--spacing-3);
    padding: var(--spacing-3);
    border: 1px solid var(--gray-200);
    border-radius: var(--radius-lg);
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .radio-option:hover {
    border-color: var(--primary-300);
    background: var(--primary-50);
  }

  .radio-option.selected {
    border-color: var(--primary-500);
    background: var(--primary-50);
  }

  .radio-option input[type="radio"] {
    margin-top: 2px;
    accent-color: var(--primary-600);
  }

  .radio-content {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .radio-label {
    font-weight: 500;
    color: var(--gray-900);
  }

  .radio-description {
    font-size: 0.75rem;
    color: var(--gray-500);
  }

  /* Form Elements */
  .form-group {
    margin-bottom: var(--spacing-4);
  }

  .form-group:last-child {
    margin-bottom: 0;
  }

  .form-label {
    display: block;
    font-size: 0.875rem;
    font-weight: 500;
    color: var(--gray-700);
    margin-bottom: var(--spacing-1);
  }

  .form-input {
    width: 100%;
    padding: var(--spacing-2) var(--spacing-3);
    border: 1px solid var(--gray-300);
    border-radius: var(--radius-md);
    font-size: 0.875rem;
    transition: border-color 0.2s ease, box-shadow 0.2s ease;
  }

  .form-input:focus {
    outline: none;
    border-color: var(--primary-500);
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }

  .form-select {
    appearance: none;
    background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e");
    background-position: right 0.5rem center;
    background-repeat: no-repeat;
    background-size: 1.5em 1.5em;
    padding-right: 2.5rem;
  }

  .form-help {
    font-size: 0.75rem;
    color: var(--gray-500);
    margin-top: var(--spacing-1);
  }

  /* Search Row */
  .search-row {
    display: flex;
    gap: var(--spacing-2);
  }

  .search-row .form-input {
    flex: 1;
  }

  /* Search Results */
  .search-results {
    margin-top: var(--spacing-3);
    border: 1px solid var(--gray-200);
    border-radius: var(--radius-lg);
    overflow: hidden;
  }

  .search-result-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    padding: var(--spacing-3);
    background: white;
    border: none;
    border-bottom: 1px solid var(--gray-100);
    cursor: pointer;
    transition: background 0.2s ease;
    text-align: left;
  }

  .search-result-item:last-child {
    border-bottom: none;
  }

  .search-result-item:hover {
    background: var(--primary-50);
  }

  .result-info {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .result-zip {
    font-weight: 600;
    color: var(--gray-900);
  }

  .result-location {
    font-size: 0.75rem;
    color: var(--gray-500);
  }

  .search-result-item svg {
    color: var(--primary-600);
  }

  /* Selected Items */
  .selected-items {
    margin-top: var(--spacing-4);
  }

  .selected-list {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-2);
    margin-top: var(--spacing-2);
  }

  .selected-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--spacing-2) var(--spacing-3);
    background: var(--gray-50);
    border-radius: var(--radius-md);
    border: 1px solid var(--gray-200);
  }

  .selected-item-info {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .selected-item-primary {
    font-weight: 500;
    color: var(--gray-900);
  }

  .selected-item-secondary {
    font-size: 0.75rem;
    color: var(--gray-500);
  }

  .remove-btn {
    width: 28px;
    height: 28px;
    display: flex;
    align-items: center;
    justify-content: center;
    border: none;
    background: transparent;
    color: var(--gray-400);
    cursor: pointer;
    border-radius: var(--radius-md);
    transition: all 0.2s ease;
  }

  .remove-btn:hover {
    background: var(--danger-100);
    color: var(--danger-600);
  }

  /* Price Input */
  .price-input-wrapper {
    display: flex;
    align-items: center;
    border: 1px solid var(--gray-300);
    border-radius: var(--radius-md);
    overflow: hidden;
  }

  .price-prefix,
  .price-suffix {
    padding: var(--spacing-2) var(--spacing-3);
    background: var(--gray-50);
    color: var(--gray-500);
    font-size: 0.875rem;
    border: none;
  }

  .price-input {
    border: none;
    border-radius: 0;
    text-align: right;
  }

  .price-input:focus {
    box-shadow: none;
  }

  /* Loading Indicator */
  .loading-indicator {
    display: flex;
    align-items: center;
    gap: var(--spacing-2);
    padding: var(--spacing-3);
    color: var(--gray-500);
    font-size: 0.875rem;
  }

  .spinner {
    width: 20px;
    height: 20px;
    border: 2px solid var(--gray-200);
    border-top-color: var(--primary-600);
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  .spinner-sm {
    width: 16px;
    height: 16px;
    border: 2px solid rgba(255, 255, 255, 0.3);
    border-top-color: white;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  /* Messages */
  .error-message {
    padding: var(--spacing-3);
    background: var(--danger-50);
    color: var(--danger-700);
    border-radius: var(--radius-md);
    font-size: 0.875rem;
    margin-top: var(--spacing-3);
  }

  .success-message {
    padding: var(--spacing-3);
    background: var(--success-50);
    color: var(--success-700);
    border-radius: var(--radius-md);
    font-size: 0.875rem;
    margin-bottom: var(--spacing-3);
  }

  /* Buttons */
  .btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: var(--spacing-2);
    padding: var(--spacing-2) var(--spacing-4);
    border-radius: var(--radius-md);
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
    border: none;
  }

  .btn-primary {
    background: var(--primary-600);
    color: white;
  }

  .btn-primary:hover:not(:disabled) {
    background: var(--primary-700);
  }

  .btn-primary:disabled {
    background: var(--gray-300);
    cursor: not-allowed;
  }

  .btn-lg {
    padding: var(--spacing-3) var(--spacing-6);
    font-size: 1rem;
  }

  .btn-full {
    width: 100%;
  }

  /* Card Styles */
  .card {
    background: white;
    border-radius: var(--radius-xl);
    border: 1px solid var(--gray-200);
    overflow: hidden;
  }

  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--spacing-4);
    border-bottom: 1px solid var(--gray-200);
  }

  .card-title {
    font-size: 1rem;
    font-weight: 600;
    color: var(--gray-900);
    margin: 0;
  }

  .card-body {
    padding: var(--spacing-4);
  }

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

  /* Map Card */
  .map-card {
    flex: 1;
    min-height: 400px;
    display: flex;
    flex-direction: column;
  }

  .map-container {
    flex: 1;
    min-height: 300px;
    z-index: 1;
  }

  .map-legend-bar {
    display: flex;
    gap: var(--spacing-4);
    justify-content: center;
    padding: var(--spacing-3);
    background: var(--gray-50);
    border-top: 1px solid var(--gray-200);
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

  .legend-dot.selected {
    background: var(--primary-500);
  }

  /* Demographics Card */
  .demographics-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: var(--spacing-4);
  }

  .demographic-item {
    display: flex;
    align-items: center;
    gap: var(--spacing-3);
    padding: var(--spacing-3);
    background: var(--gray-50);
    border-radius: var(--radius-lg);
  }

  .demographic-icon {
    width: 48px;
    height: 48px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--primary-100);
    color: var(--primary-600);
    border-radius: var(--radius-lg);
    flex-shrink: 0;
  }

  .demographic-content {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .demographic-value {
    font-size: 1.125rem;
    font-weight: 600;
    color: var(--gray-900);
  }

  .demographic-label {
    font-size: 0.75rem;
    color: var(--gray-500);
  }

  .demographics-empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: var(--spacing-8);
    color: var(--gray-400);
    text-align: center;
  }

  .demographics-empty svg {
    margin-bottom: var(--spacing-3);
  }

  .demographics-empty p {
    margin: 0;
    font-size: 0.875rem;
  }

  /* Summary Card */
  .summary-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: var(--spacing-4);
  }

  .summary-item {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-1);
  }

  .summary-label {
    font-size: 0.75rem;
    color: var(--gray-500);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .summary-value {
    font-weight: 600;
    color: var(--gray-900);
  }

  /* Responsive */
  @media (max-width: 640px) {
    .demographics-grid {
      grid-template-columns: 1fr;
    }

    .summary-grid {
      grid-template-columns: 1fr;
    }

    .search-row {
      flex-direction: column;
    }
  }
</style>
