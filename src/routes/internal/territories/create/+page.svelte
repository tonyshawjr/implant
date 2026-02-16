<script lang="ts">
  import type { PageData, ActionData } from './$types';
  import { enhance } from '$app/forms';
  import { onMount } from 'svelte';
  import { browser } from '$app/environment';
  import { goto } from '$app/navigation';

  let { data, form }: { data: PageData; form: ActionData } = $props();

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
    // New fields for better market analysis
    population65Plus: number;
    population65PlusPercent: number;
    medianHomeValue: number;
    veteransCount: number;
    ownerOccupiedPercent: number;
  }

  interface GeoOption {
    fips: string;
    name: string;
  }

  // State variables
  let territoryType = $state<'metro' | 'county' | 'city' | 'zipcode'>('zipcode');
  let selectedState = $state('');
  let selectedStateFips = $state('');
  let selectedMetro = $state('');
  let selectedCounty = $state('');
  let selectedCity = $state('');
  let zipCodeInput = $state('');
  let selectedZipCodes = $state<ZipCodeEntry[]>([]);
  let demographics = $state<Demographics | null>(null);
  let territoryName = $state('');
  let monthlyBasePrice = $state(1500);
  let isLoading = $state(false);
  let isLoadingDemographics = $state(false);
  let isCreating = $state(false);
  let errorMessage = $state('');
  let successMessage = $state('');

  // Options from Census API
  let metroOptions = $state<GeoOption[]>([]);
  let countyOptions = $state<GeoOption[]>([]);
  let cityOptions = $state<GeoOption[]>([]);

  // Map state
  let mapContainer: HTMLDivElement;
  let map: any = null;
  let L: any = null;
  let circles: any[] = [];

  // State FIPS mapping
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

  const US_STATES = [
    { code: 'AL', name: 'Alabama' }, { code: 'AK', name: 'Alaska' }, { code: 'AZ', name: 'Arizona' },
    { code: 'AR', name: 'Arkansas' }, { code: 'CA', name: 'California' }, { code: 'CO', name: 'Colorado' },
    { code: 'CT', name: 'Connecticut' }, { code: 'DE', name: 'Delaware' }, { code: 'FL', name: 'Florida' },
    { code: 'GA', name: 'Georgia' }, { code: 'HI', name: 'Hawaii' }, { code: 'ID', name: 'Idaho' },
    { code: 'IL', name: 'Illinois' }, { code: 'IN', name: 'Indiana' }, { code: 'IA', name: 'Iowa' },
    { code: 'KS', name: 'Kansas' }, { code: 'KY', name: 'Kentucky' }, { code: 'LA', name: 'Louisiana' },
    { code: 'ME', name: 'Maine' }, { code: 'MD', name: 'Maryland' }, { code: 'MA', name: 'Massachusetts' },
    { code: 'MI', name: 'Michigan' }, { code: 'MN', name: 'Minnesota' }, { code: 'MS', name: 'Mississippi' },
    { code: 'MO', name: 'Missouri' }, { code: 'MT', name: 'Montana' }, { code: 'NE', name: 'Nebraska' },
    { code: 'NV', name: 'Nevada' }, { code: 'NH', name: 'New Hampshire' }, { code: 'NJ', name: 'New Jersey' },
    { code: 'NM', name: 'New Mexico' }, { code: 'NY', name: 'New York' }, { code: 'NC', name: 'North Carolina' },
    { code: 'ND', name: 'North Dakota' }, { code: 'OH', name: 'Ohio' }, { code: 'OK', name: 'Oklahoma' },
    { code: 'OR', name: 'Oregon' }, { code: 'PA', name: 'Pennsylvania' }, { code: 'RI', name: 'Rhode Island' },
    { code: 'SC', name: 'South Carolina' }, { code: 'SD', name: 'South Dakota' }, { code: 'TN', name: 'Tennessee' },
    { code: 'TX', name: 'Texas' }, { code: 'UT', name: 'Utah' }, { code: 'VT', name: 'Vermont' },
    { code: 'VA', name: 'Virginia' }, { code: 'WA', name: 'Washington' }, { code: 'WV', name: 'West Virginia' },
    { code: 'WI', name: 'Wisconsin' }, { code: 'WY', name: 'Wyoming' }, { code: 'DC', name: 'District of Columbia' }
  ];

  // Computed: can create territory?
  let canCreate = $derived(
    territoryName.trim() !== '' &&
    monthlyBasePrice > 0 &&
    (
      (territoryType === 'zipcode' && selectedZipCodes.length > 0) ||
      (territoryType === 'metro' && selectedState && selectedMetro) ||
      (territoryType === 'county' && selectedState && selectedCounty) ||
      (territoryType === 'city' && selectedState && selectedCity)
    )
  );

  // Initialize Leaflet map
  onMount(async () => {
    if (browser) {
      L = (await import('leaflet')).default;
      map = L.map(mapContainer).setView([39.8283, -98.5795], 4);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      }).addTo(map);
    }
    return () => { if (map) map.remove(); };
  });

  // Update map when zip codes change
  $effect(() => {
    if (map && L && selectedZipCodes.length > 0) {
      updateMapMarkers();
    }
  });

  function updateMapMarkers() {
    if (!map || !L) return;
    circles.forEach(c => map.removeLayer(c));
    circles = [];

    selectedZipCodes.forEach(zip => {
      const circle = L.circle([zip.lat, zip.lng], {
        radius: 8046.72, // 5 miles in meters
        fillColor: '#3b82f6',
        fillOpacity: 0.2,
        color: '#3b82f6',
        weight: 2
      }).addTo(map);

      circle.bindPopup(`<strong>${zip.zipCode}</strong><br>${zip.city}, ${zip.state}`);
      circles.push(circle);
    });

    if (selectedZipCodes.length > 0) {
      const bounds = L.latLngBounds(selectedZipCodes.map(z => [z.lat, z.lng]));
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }

  // Handle territory type change
  function handleTypeChange() {
    selectedState = '';
    selectedStateFips = '';
    selectedMetro = '';
    selectedCounty = '';
    selectedCity = '';
    selectedZipCodes = [];
    demographics = null;
    territoryName = '';
    metroOptions = [];
    countyOptions = [];
    cityOptions = [];
    errorMessage = '';
  }

  // Handle state change
  async function handleStateChange() {
    selectedMetro = '';
    selectedCounty = '';
    selectedCity = '';
    metroOptions = [];
    countyOptions = [];
    cityOptions = [];
    demographics = null;

    if (!selectedState) return;

    selectedStateFips = STATE_FIPS[selectedState] || '';

    isLoading = true;
    errorMessage = '';

    try {
      if (territoryType === 'metro') {
        await fetchMetroAreas();
      } else if (territoryType === 'county') {
        await fetchCounties();
      } else if (territoryType === 'city') {
        await fetchCities();
      }
    } catch (error) {
      console.error('Error loading options:', error);
      errorMessage = 'Failed to load options. Please try again.';
    } finally {
      isLoading = false;
    }
  }

  // Fetch metro areas from Census API
  async function fetchMetroAreas() {
    try {
      const response = await fetch(
        `https://api.census.gov/data/2023/acs/acs5?get=NAME&for=metropolitan%20statistical%20area/micropolitan%20statistical%20area:*`
      );
      const data = await response.json();

      // Filter by state abbreviation (metro names include state like "Charlotte-Concord-Gastonia, NC-SC")
      const stateAbbr = selectedState;
      metroOptions = data.slice(1)
        .filter((row: string[]) => row[0].includes(`, ${stateAbbr}`) || row[0].includes(`-${stateAbbr}`) || row[0].includes(`${stateAbbr}-`))
        .map((row: string[]) => ({
          fips: row[1],
          name: row[0].split(',')[0] // Get metro name without state suffix
        }))
        .sort((a: GeoOption, b: GeoOption) => a.name.localeCompare(b.name));
    } catch (error) {
      console.error('Error fetching metro areas:', error);
      errorMessage = 'Failed to load metro areas.';
    }
  }

  // Fetch counties from Census API
  async function fetchCounties() {
    try {
      const response = await fetch(
        `https://api.census.gov/data/2023/acs/acs5?get=NAME&for=county:*&in=state:${selectedStateFips}`
      );
      const data = await response.json();

      countyOptions = data.slice(1)
        .map((row: string[]) => ({
          fips: row[2], // county FIPS
          name: row[0].replace(' County', '').split(',')[0]
        }))
        .sort((a: GeoOption, b: GeoOption) => a.name.localeCompare(b.name));
    } catch (error) {
      console.error('Error fetching counties:', error);
      errorMessage = 'Failed to load counties.';
    }
  }

  // Fetch cities from Census API
  async function fetchCities() {
    try {
      const response = await fetch(
        `https://api.census.gov/data/2023/acs/acs5?get=NAME&for=place:*&in=state:${selectedStateFips}`
      );
      const data = await response.json();

      cityOptions = data.slice(1)
        .map((row: string[]) => ({
          fips: row[2], // place FIPS
          name: row[0].replace(' city', '').replace(' town', '').replace(' village', '').split(',')[0]
        }))
        .sort((a: GeoOption, b: GeoOption) => a.name.localeCompare(b.name));
    } catch (error) {
      console.error('Error fetching cities:', error);
      errorMessage = 'Failed to load cities.';
    }
  }

  // Handle selection changes - fetch demographics
  async function handleMetroChange() {
    if (selectedMetro) {
      const metro = metroOptions.find(m => m.fips === selectedMetro);
      if (metro) {
        territoryName = `${metro.name} Metro`;
      }
      await fetchMetroDemographics();
    }
  }

  // Census variables for comprehensive demographics
  // B01003_001E = Total population
  // B11001_001E = Total households
  // B19013_001E = Median household income
  // B01002_001E = Median age
  // B25077_001E = Median home value
  // B21001_002E = Civilian veterans
  // B25003_001E = Total occupied housing units
  // B25003_002E = Owner-occupied housing units
  // B01001_020E-025E = Males 65+ (6 age groups)
  // B01001_044E-049E = Females 65+ (6 age groups)
  const CENSUS_VARIABLES = 'B01003_001E,B11001_001E,B19013_001E,B01002_001E,B25077_001E,B21001_002E,B25003_001E,B25003_002E,B01001_020E,B01001_021E,B01001_022E,B01001_023E,B01001_024E,B01001_025E,B01001_044E,B01001_045E,B01001_046E,B01001_047E,B01001_048E,B01001_049E';

  // Parse Census API response into Demographics object
  function parseDemographicsData(row: string[]): Demographics {
    const population = parseInt(row[0]) || 0;
    const households = parseInt(row[1]) || 0;
    const medianIncome = parseInt(row[2]) || 0;
    const medianAge = parseFloat(row[3]) || 0;
    const medianHomeValue = parseInt(row[4]) || 0;
    const veteransCount = parseInt(row[5]) || 0;
    const totalOccupied = parseInt(row[6]) || 0;
    const ownerOccupied = parseInt(row[7]) || 0;

    // Sum 65+ population (males: indices 8-13, females: indices 14-19)
    let population65Plus = 0;
    for (let i = 8; i <= 19; i++) {
      population65Plus += parseInt(row[i]) || 0;
    }

    const population65PlusPercent = population > 0 ? (population65Plus / population) * 100 : 0;
    const ownerOccupiedPercent = totalOccupied > 0 ? (ownerOccupied / totalOccupied) * 100 : 0;

    return {
      population,
      households,
      medianIncome,
      medianAge,
      population65Plus,
      population65PlusPercent,
      medianHomeValue,
      veteransCount,
      ownerOccupiedPercent
    };
  }

  // Fetch demographics for metro area (MSA)
  async function fetchMetroDemographics() {
    if (!selectedMetro) return;

    isLoadingDemographics = true;
    try {
      const response = await fetch(
        `https://api.census.gov/data/2023/acs/acs5?get=${CENSUS_VARIABLES}&for=metropolitan%20statistical%20area/micropolitan%20statistical%20area:${selectedMetro}`
      );
      const data = await response.json();

      if (data && data.length > 1) {
        demographics = parseDemographicsData(data[1]);
      }
    } catch (error) {
      console.error('Error fetching metro demographics:', error);
      errorMessage = 'Failed to load metro demographics.';
    } finally {
      isLoadingDemographics = false;
    }
  }

  async function handleCountyChange() {
    if (selectedCounty) {
      const county = countyOptions.find(c => c.fips === selectedCounty);
      if (county) {
        territoryName = `${county.name} County, ${selectedState}`;
      }
      await fetchCountyDemographics();
    }
  }

  async function handleCityChange() {
    if (selectedCity) {
      const city = cityOptions.find(c => c.fips === selectedCity);
      if (city) {
        territoryName = `${city.name}, ${selectedState}`;
      }
      await fetchCityDemographics();
    }
  }

  // Fetch demographics for county
  async function fetchCountyDemographics() {
    if (!selectedStateFips || !selectedCounty) return;

    isLoadingDemographics = true;
    try {
      const response = await fetch(
        `https://api.census.gov/data/2023/acs/acs5?get=${CENSUS_VARIABLES}&for=county:${selectedCounty}&in=state:${selectedStateFips}`
      );
      const data = await response.json();

      if (data && data.length > 1) {
        demographics = parseDemographicsData(data[1]);
      }
    } catch (error) {
      console.error('Error fetching county demographics:', error);
    } finally {
      isLoadingDemographics = false;
    }
  }

  // Fetch demographics for city
  async function fetchCityDemographics() {
    if (!selectedStateFips || !selectedCity) return;

    isLoadingDemographics = true;
    try {
      const response = await fetch(
        `https://api.census.gov/data/2023/acs/acs5?get=${CENSUS_VARIABLES}&for=place:${selectedCity}&in=state:${selectedStateFips}`
      );
      const data = await response.json();

      if (data && data.length > 1) {
        demographics = parseDemographicsData(data[1]);
      }
    } catch (error) {
      console.error('Error fetching city demographics:', error);
    } finally {
      isLoadingDemographics = false;
    }
  }

  // Add zip code directly
  async function addZipCode() {
    const zip = zipCodeInput.trim();
    if (!zip) return;

    // Validate format
    if (!/^\d{5}$/.test(zip)) {
      errorMessage = 'Please enter a valid 5-digit zip code.';
      return;
    }

    // Check if already added
    if (selectedZipCodes.some(z => z.zipCode === zip)) {
      errorMessage = 'This zip code is already added.';
      return;
    }

    isLoading = true;
    errorMessage = '';

    try {
      // Get location data from Nominatim
      const geoResponse = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${zip},USA&limit=1&addressdetails=1`,
        { headers: { 'User-Agent': 'SqueezMedia-Platform' } }
      );
      const geoData = await geoResponse.json();

      if (!geoData || geoData.length === 0) {
        errorMessage = 'Zip code not found. Please check and try again.';
        return;
      }

      const result = geoData[0];
      const city = result.address?.city || result.address?.town || result.address?.village || result.address?.county || 'Unknown';
      const state = result.address?.state || '';

      // Get population from Census
      let population = 0;
      try {
        const censusResponse = await fetch(
          `https://api.census.gov/data/2023/acs/acs5?get=B01003_001E&for=zip%20code%20tabulation%20area:${zip}`
        );
        const censusData = await censusResponse.json();
        if (censusData && censusData.length > 1) {
          population = parseInt(censusData[1][0]) || 0;
        }
      } catch (e) {
        console.log('Census data not available for zip');
      }

      const newZip: ZipCodeEntry = {
        zipCode: zip,
        city,
        state,
        lat: parseFloat(result.lat),
        lng: parseFloat(result.lon),
        population
      };

      selectedZipCodes = [...selectedZipCodes, newZip];
      zipCodeInput = '';

      // Auto-generate territory name
      if (selectedZipCodes.length === 1) {
        territoryName = `${city} Area`;
      }

      // Update demographics
      await updateZipDemographics();

    } catch (error) {
      console.error('Error adding zip code:', error);
      errorMessage = 'Failed to add zip code. Please try again.';
    } finally {
      isLoading = false;
    }
  }

  function removeZipCode(zipCode: string) {
    selectedZipCodes = selectedZipCodes.filter(z => z.zipCode !== zipCode);
    updateZipDemographics();
  }

  // Update demographics from selected zip codes
  async function updateZipDemographics() {
    if (selectedZipCodes.length === 0) {
      demographics = null;
      return;
    }

    isLoadingDemographics = true;

    try {
      let totalPop = 0;
      let totalHouseholds = 0;
      let total65Plus = 0;
      let totalVeterans = 0;
      let totalOccupied = 0;
      let totalOwnerOccupied = 0;
      let incomeSum = 0;
      let ageSum = 0;
      let homeValueSum = 0;
      let validIncomeCount = 0;
      let validHomeValueCount = 0;

      for (const zip of selectedZipCodes) {
        try {
          const response = await fetch(
            `https://api.census.gov/data/2023/acs/acs5?get=${CENSUS_VARIABLES}&for=zip%20code%20tabulation%20area:${zip.zipCode}`
          );
          const data = await response.json();

          if (data && data.length > 1) {
            const row = data[1];
            const pop = parseInt(row[0]) || 0;
            const households = parseInt(row[1]) || 0;
            totalPop += pop;
            totalHouseholds += households;

            // Sum 65+ population (indices 8-19)
            for (let i = 8; i <= 19; i++) {
              total65Plus += parseInt(row[i]) || 0;
            }

            totalVeterans += parseInt(row[5]) || 0;
            totalOccupied += parseInt(row[6]) || 0;
            totalOwnerOccupied += parseInt(row[7]) || 0;

            const income = parseInt(row[2]);
            const age = parseFloat(row[3]);
            const homeValue = parseInt(row[4]);

            if (income > 0 && pop > 0) {
              incomeSum += income * pop;
              ageSum += age * pop;
              validIncomeCount += pop;
            }

            if (homeValue > 0 && households > 0) {
              homeValueSum += homeValue * households;
              validHomeValueCount += households;
            }
          }
        } catch (e) {
          // Continue if one zip fails
        }
      }

      demographics = {
        population: totalPop,
        households: totalHouseholds,
        medianIncome: validIncomeCount > 0 ? Math.round(incomeSum / validIncomeCount) : 0,
        medianAge: validIncomeCount > 0 ? Math.round((ageSum / validIncomeCount) * 10) / 10 : 0,
        population65Plus: total65Plus,
        population65PlusPercent: totalPop > 0 ? Math.round((total65Plus / totalPop) * 1000) / 10 : 0,
        medianHomeValue: validHomeValueCount > 0 ? Math.round(homeValueSum / validHomeValueCount) : 0,
        veteransCount: totalVeterans,
        ownerOccupiedPercent: totalOccupied > 0 ? Math.round((totalOwnerOccupied / totalOccupied) * 1000) / 10 : 0
      };
    } catch (error) {
      console.error('Error updating demographics:', error);
    } finally {
      isLoadingDemographics = false;
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
            <input type="radio" name="territoryType" value="metro" bind:group={territoryType} onchange={handleTypeChange} />
            <div class="radio-content">
              <span class="radio-label">Metro Area</span>
              <span class="radio-description">Major metropolitan statistical area</span>
            </div>
          </label>

          <label class="radio-option" class:selected={territoryType === 'county'}>
            <input type="radio" name="territoryType" value="county" bind:group={territoryType} onchange={handleTypeChange} />
            <div class="radio-content">
              <span class="radio-label">County</span>
              <span class="radio-description">Single county boundary</span>
            </div>
          </label>

          <label class="radio-option" class:selected={territoryType === 'city'}>
            <input type="radio" name="territoryType" value="city" bind:group={territoryType} onchange={handleTypeChange} />
            <div class="radio-content">
              <span class="radio-label">City</span>
              <span class="radio-description">City or town boundary</span>
            </div>
          </label>

          <label class="radio-option" class:selected={territoryType === 'zipcode'}>
            <input type="radio" name="territoryType" value="zipcode" bind:group={territoryType} onchange={handleTypeChange} />
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
        {#if territoryType === 'metro' || territoryType === 'county' || territoryType === 'city'}
          <!-- State Selection -->
          <div class="form-group">
            <label class="form-label">State</label>
            <select class="form-input form-select" bind:value={selectedState} onchange={handleStateChange}>
              <option value="">Select a state...</option>
              {#each US_STATES as state}
                <option value={state.code}>{state.name}</option>
              {/each}
            </select>
          </div>
        {/if}

        {#if territoryType === 'metro' && selectedState}
          <div class="form-group">
            <label class="form-label">Metro Area</label>
            {#if isLoading}
              <div class="loading-indicator"><span class="spinner"></span> Loading metro areas...</div>
            {:else if metroOptions.length === 0}
              <p class="no-options">No metro areas found for this state.</p>
            {:else}
              <select class="form-input form-select" bind:value={selectedMetro} onchange={handleMetroChange}>
                <option value="">Select a metro area...</option>
                {#each metroOptions as metro}
                  <option value={metro.fips}>{metro.name}</option>
                {/each}
              </select>
            {/if}
          </div>
        {/if}

        {#if territoryType === 'county' && selectedState}
          <div class="form-group">
            <label class="form-label">County</label>
            {#if isLoading}
              <div class="loading-indicator"><span class="spinner"></span> Loading counties...</div>
            {:else}
              <select class="form-input form-select" bind:value={selectedCounty} onchange={handleCountyChange}>
                <option value="">Select a county...</option>
                {#each countyOptions as county}
                  <option value={county.fips}>{county.name}</option>
                {/each}
              </select>
            {/if}
          </div>
        {/if}

        {#if territoryType === 'city' && selectedState}
          <div class="form-group">
            <label class="form-label">City</label>
            {#if isLoading}
              <div class="loading-indicator"><span class="spinner"></span> Loading cities...</div>
            {:else}
              <select class="form-input form-select" bind:value={selectedCity} onchange={handleCityChange}>
                <option value="">Select a city...</option>
                {#each cityOptions as city}
                  <option value={city.fips}>{city.name}</option>
                {/each}
              </select>
            {/if}
          </div>
        {/if}

        {#if territoryType === 'zipcode'}
          <div class="form-group">
            <label class="form-label">Add Zip Codes</label>
            <div class="search-row">
              <input
                type="text"
                class="form-input"
                placeholder="Enter 5-digit zip code"
                maxlength="5"
                bind:value={zipCodeInput}
                onkeydown={(e) => e.key === 'Enter' && addZipCode()}
              />
              <button type="button" class="btn btn-primary" onclick={addZipCode} disabled={isLoading || !zipCodeInput.trim()}>
                {#if isLoading}
                  <span class="spinner-sm"></span>
                {:else}
                  Add
                {/if}
              </button>
            </div>
          </div>

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
                    <button type="button" class="remove-btn" onclick={() => removeZipCode(zip.zipCode)} title="Remove">
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
          <p class="error-message">{errorMessage}</p>
        {/if}
      </div>
    </div>

    <!-- Step 3: Territory Details -->
    <div class="step-section">
      <div class="step-header">
        <span class="step-number">3</span>
        <h3 class="step-title">Territory Details</h3>
      </div>
      <div class="step-content">
        <div class="form-group">
          <label class="form-label">Territory Name</label>
          <input type="text" class="form-input" placeholder="e.g., Wilmington Metro" bind:value={territoryName} />
        </div>

        <div class="form-group">
          <label class="form-label">Monthly Base Price</label>
          <div class="price-input-wrapper">
            <span class="price-prefix">$</span>
            <input type="number" class="form-input price-input" min="0" step="100" bind:value={monthlyBasePrice} />
            <span class="price-suffix">/mo</span>
          </div>
        </div>

        <form
          method="POST"
          action="?/createTerritory"
          use:enhance={() => {
            isCreating = true;
            return async ({ result, update }) => {
              isCreating = false;
              if (result.type === 'redirect') {
                goto('/internal/territories');
              } else if (result.type === 'failure') {
                errorMessage = (result.data as any)?.error || 'Failed to create territory';
              }
            };
          }}
        >
          <input type="hidden" name="name" value={territoryName} />
          <input type="hidden" name="boundaryType" value={territoryType} />
          <input type="hidden" name="state" value={selectedState || (selectedZipCodes[0]?.state || '')} />
          <input type="hidden" name="zipCodes" value={JSON.stringify(selectedZipCodes.map(z => ({ zipCode: z.zipCode, city: z.city })))} />
          <input type="hidden" name="demographics" value={JSON.stringify(demographics || {})} />
          <input type="hidden" name="monthlyBasePrice" value={monthlyBasePrice} />
          <input type="hidden" name="centerLat" value={selectedZipCodes[0]?.lat || 39.8283} />
          <input type="hidden" name="centerLng" value={selectedZipCodes[0]?.lng || -98.5795} />
          <input type="hidden" name="radiusMiles" value={15} />
          <input type="hidden" name="msaCode" value={selectedMetro || ''} />
          <input type="hidden" name="countyFips" value={selectedCounty || ''} />
          <input type="hidden" name="placeFips" value={selectedCity || ''} />

          <button type="submit" class="btn btn-primary btn-lg btn-full" disabled={!canCreate || isCreating}>
            {#if isCreating}
              <span class="spinner-sm"></span> Creating...
            {:else}
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
        <h3 class="card-title">Territory Map</h3>
        {#if selectedZipCodes.length > 0}
          <span class="badge badge-info">{selectedZipCodes.length} zip code{selectedZipCodes.length > 1 ? 's' : ''}</span>
        {/if}
      </div>
      <div class="map-container" bind:this={mapContainer}></div>
    </div>

    <!-- Demographics Card -->
    <div class="card demographics-card">
      <div class="card-header">
        <h3 class="card-title">Demographics</h3>
        {#if isLoadingDemographics}
          <span class="spinner-sm"></span>
        {/if}
      </div>
      <div class="card-body">
        {#if demographics}
          <div class="demographics-grid">
            <!-- Row 1: Population metrics -->
            <div class="demo-item">
              <div class="demo-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                  <circle cx="9" cy="7" r="4"/>
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                  <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                </svg>
              </div>
              <div class="demo-content">
                <div class="demo-value">{formatNumber(demographics.population)}</div>
                <div class="demo-label">Population</div>
              </div>
            </div>

            <div class="demo-item">
              <div class="demo-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                  <polyline points="9 22 9 12 15 12 15 22"/>
                </svg>
              </div>
              <div class="demo-content">
                <div class="demo-value">{formatNumber(demographics.households)}</div>
                <div class="demo-label">Households</div>
              </div>
            </div>

            <div class="demo-item">
              <div class="demo-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="12" y1="1" x2="12" y2="23"/>
                  <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
                </svg>
              </div>
              <div class="demo-content">
                <div class="demo-value">{formatCurrency(demographics.medianIncome)}</div>
                <div class="demo-label">Median Income</div>
              </div>
            </div>

            <div class="demo-item">
              <div class="demo-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="10"/>
                  <polyline points="12 6 12 12 16 14"/>
                </svg>
              </div>
              <div class="demo-content">
                <div class="demo-value">{demographics.medianAge}</div>
                <div class="demo-label">Median Age</div>
              </div>
            </div>

            <!-- Row 2: Market indicators -->
            <div class="demo-item highlight">
              <div class="demo-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                  <circle cx="12" cy="7" r="4"/>
                </svg>
              </div>
              <div class="demo-content">
                <div class="demo-value">{formatNumber(demographics.population65Plus)} <span class="demo-percent">({demographics.population65PlusPercent.toFixed(1)}%)</span></div>
                <div class="demo-label">Population 65+</div>
              </div>
            </div>

            <div class="demo-item">
              <div class="demo-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                  <path d="M9 22V12h6v10"/>
                </svg>
              </div>
              <div class="demo-content">
                <div class="demo-value">{formatCurrency(demographics.medianHomeValue)}</div>
                <div class="demo-label">Median Home Value</div>
              </div>
            </div>

            <div class="demo-item">
              <div class="demo-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/>
                  <line x1="4" y1="22" x2="4" y2="15"/>
                </svg>
              </div>
              <div class="demo-content">
                <div class="demo-value">{formatNumber(demographics.veteransCount)}</div>
                <div class="demo-label">Veterans</div>
              </div>
            </div>

            <div class="demo-item">
              <div class="demo-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                  <line x1="9" y1="3" x2="9" y2="21"/>
                </svg>
              </div>
              <div class="demo-content">
                <div class="demo-value">{demographics.ownerOccupiedPercent.toFixed(1)}%</div>
                <div class="demo-label">Owner Occupied</div>
              </div>
            </div>
          </div>

          <!-- Market Score Indicator -->
          <div class="market-score">
            <div class="market-score-header">
              <span class="market-score-label">Implant Market Potential</span>
              <span class="market-score-value" class:high={demographics.population65PlusPercent >= 15} class:medium={demographics.population65PlusPercent >= 10 && demographics.population65PlusPercent < 15} class:low={demographics.population65PlusPercent < 10}>
                {#if demographics.population65PlusPercent >= 15}
                  High
                {:else if demographics.population65PlusPercent >= 10}
                  Medium
                {:else}
                  Moderate
                {/if}
              </span>
            </div>
            <div class="market-score-bar">
              <div class="market-score-fill" style="width: {Math.min(demographics.population65PlusPercent * 5, 100)}%"></div>
            </div>
            <p class="market-score-note">Based on 65+ population ({demographics.population65PlusPercent.toFixed(1)}%) - primary implant demographic</p>
          </div>
        {:else}
          <div class="empty-demographics">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
              <circle cx="12" cy="10" r="3"/>
            </svg>
            <p>Select a location to view demographics</p>
          </div>
        {/if}
      </div>
    </div>

    <!-- Territory Summary -->
    {#if territoryName}
      <div class="card summary-card">
        <div class="card-header">
          <h3 class="card-title">Territory Summary</h3>
        </div>
        <div class="card-body">
          <div class="summary-row">
            <span class="summary-label">Name</span>
            <span class="summary-value">{territoryName}</span>
          </div>
          <div class="summary-row">
            <span class="summary-label">Type</span>
            <span class="summary-value capitalize">{territoryType}</span>
          </div>
          <div class="summary-row">
            <span class="summary-label">Base Price</span>
            <span class="summary-value">{formatCurrency(monthlyBasePrice)}/mo</span>
          </div>
          {#if territoryType === 'zipcode'}
            <div class="summary-row">
              <span class="summary-label">Zip Codes</span>
              <span class="summary-value">{selectedZipCodes.length}</span>
            </div>
          {/if}
        </div>
      </div>
    {/if}
  </div>
</div>

<style>
  .page-header {
    margin-bottom: var(--spacing-6);
  }

  .page-header-left {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-1);
  }

  .back-link {
    display: inline-flex;
    align-items: center;
    gap: var(--spacing-2);
    color: var(--gray-500);
    text-decoration: none;
    font-size: 0.875rem;
    margin-bottom: var(--spacing-2);
  }

  .back-link:hover {
    color: var(--primary-600);
  }

  .page-title {
    font-size: 1.5rem;
    font-weight: 600;
    color: var(--gray-900);
    margin: 0;
  }

  .page-subtitle {
    color: var(--gray-500);
    margin: 0;
  }

  .builder-container {
    display: grid;
    grid-template-columns: 420px 1fr;
    gap: var(--spacing-6);
    align-items: start;
  }

  @media (max-width: 1024px) {
    .builder-container {
      grid-template-columns: 1fr;
    }
  }

  .builder-sidebar {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-4);
  }

  .builder-main {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-4);
  }

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
    border-bottom: 1px solid var(--gray-200);
    background: var(--gray-50);
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

  .radio-group {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-2);
  }

  .radio-option {
    display: flex;
    align-items: center;
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

  .radio-option input {
    margin: 0;
  }

  .radio-content {
    display: flex;
    flex-direction: column;
  }

  .radio-label {
    font-weight: 500;
    color: var(--gray-900);
  }

  .radio-description {
    font-size: 0.8125rem;
    color: var(--gray-500);
  }

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
    font-size: 0.9375rem;
    color: var(--gray-900);
    background: white;
    transition: all 0.2s ease;
  }

  .form-input:focus {
    outline: none;
    border-color: var(--primary-500);
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }

  .form-select {
    appearance: none;
    background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3e%3c/svg%3e");
    background-position: right 0.5rem center;
    background-repeat: no-repeat;
    background-size: 1.5em 1.5em;
    padding-right: 2.5rem;
  }

  .search-row {
    display: flex;
    gap: var(--spacing-2);
  }

  .search-row .form-input {
    flex: 1;
  }

  .selected-items {
    margin-top: var(--spacing-4);
  }

  .selected-list {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-2);
    max-height: 200px;
    overflow-y: auto;
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
  }

  .selected-item-primary {
    font-weight: 500;
    color: var(--gray-900);
  }

  .selected-item-secondary {
    font-size: 0.8125rem;
    color: var(--gray-500);
  }

  .remove-btn {
    width: 28px;
    height: 28px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: transparent;
    border: none;
    color: var(--gray-400);
    cursor: pointer;
    border-radius: var(--radius-md);
    transition: all 0.2s ease;
  }

  .remove-btn:hover {
    background: var(--danger-100);
    color: var(--danger-600);
  }

  .loading-indicator {
    display: flex;
    align-items: center;
    gap: var(--spacing-2);
    color: var(--gray-500);
    font-size: 0.875rem;
    padding: var(--spacing-2);
  }

  .no-options {
    color: var(--gray-500);
    font-size: 0.875rem;
    font-style: italic;
  }

  .error-message {
    color: var(--danger-600);
    font-size: 0.875rem;
    margin-top: var(--spacing-2);
  }

  .price-input-wrapper {
    display: flex;
    align-items: center;
    gap: var(--spacing-2);
  }

  .price-prefix, .price-suffix {
    color: var(--gray-500);
    font-size: 0.9375rem;
  }

  .price-input {
    flex: 1;
    text-align: right;
  }

  .btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: var(--spacing-2);
    padding: var(--spacing-2) var(--spacing-4);
    border-radius: var(--radius-md);
    font-weight: 500;
    font-size: 0.9375rem;
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
    opacity: 0.6;
    cursor: not-allowed;
  }

  .btn-lg {
    padding: var(--spacing-3) var(--spacing-5);
    font-size: 1rem;
  }

  .btn-full {
    width: 100%;
  }

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

  .map-card {
    min-height: 350px;
    display: flex;
    flex-direction: column;
  }

  .map-container {
    flex: 1;
    min-height: 300px;
  }

  .demographics-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: var(--spacing-4);
  }

  .demo-item {
    display: flex;
    gap: var(--spacing-3);
  }

  .demo-icon {
    width: 40px;
    height: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--primary-100);
    color: var(--primary-600);
    border-radius: var(--radius-lg);
    flex-shrink: 0;
  }

  .demo-content {
    display: flex;
    flex-direction: column;
  }

  .demo-value {
    font-size: 1.125rem;
    font-weight: 600;
    color: var(--gray-900);
  }

  .demo-label {
    font-size: 0.8125rem;
    color: var(--gray-500);
  }

  .demo-percent {
    font-size: 0.875rem;
    font-weight: 500;
    color: var(--primary-600);
  }

  .demo-item.highlight {
    background: var(--primary-50);
    padding: var(--spacing-3);
    border-radius: var(--radius-lg);
    margin: calc(-1 * var(--spacing-3));
    margin-top: var(--spacing-2);
  }

  .demo-item.highlight .demo-icon {
    background: var(--primary-200);
    color: var(--primary-700);
  }

  /* Market Score Indicator */
  .market-score {
    margin-top: var(--spacing-4);
    padding-top: var(--spacing-4);
    border-top: 1px solid var(--gray-100);
  }

  .market-score-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: var(--spacing-2);
  }

  .market-score-label {
    font-size: 0.875rem;
    font-weight: 500;
    color: var(--gray-700);
  }

  .market-score-value {
    font-size: 0.875rem;
    font-weight: 600;
    padding: 2px 8px;
    border-radius: var(--radius-full);
  }

  .market-score-value.high {
    background: var(--success-100);
    color: var(--success-700);
  }

  .market-score-value.medium {
    background: var(--warning-100);
    color: var(--warning-700);
  }

  .market-score-value.low {
    background: var(--gray-100);
    color: var(--gray-600);
  }

  .market-score-bar {
    height: 8px;
    background: var(--gray-100);
    border-radius: var(--radius-full);
    overflow: hidden;
  }

  .market-score-fill {
    height: 100%;
    background: linear-gradient(90deg, var(--primary-400), var(--primary-600));
    border-radius: var(--radius-full);
    transition: width 0.3s ease;
  }

  .market-score-note {
    font-size: 0.75rem;
    color: var(--gray-500);
    margin: var(--spacing-2) 0 0 0;
  }

  .empty-demographics {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: var(--spacing-8);
    color: var(--gray-400);
    text-align: center;
  }

  .empty-demographics svg {
    margin-bottom: var(--spacing-3);
  }

  .empty-demographics p {
    margin: 0;
    color: var(--gray-500);
  }

  .summary-row {
    display: flex;
    justify-content: space-between;
    padding: var(--spacing-2) 0;
    border-bottom: 1px solid var(--gray-100);
  }

  .summary-row:last-child {
    border-bottom: none;
  }

  .summary-label {
    color: var(--gray-500);
  }

  .summary-value {
    font-weight: 500;
    color: var(--gray-900);
  }

  .capitalize {
    text-transform: capitalize;
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

  .spinner {
    width: 16px;
    height: 16px;
    border: 2px solid var(--gray-300);
    border-top-color: var(--primary-600);
    border-radius: 50%;
    animation: spin 0.6s linear infinite;
  }

  .spinner-sm {
    width: 14px;
    height: 14px;
    border: 2px solid rgba(255, 255, 255, 0.3);
    border-top-color: white;
    border-radius: 50%;
    animation: spin 0.6s linear infinite;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }
</style>
