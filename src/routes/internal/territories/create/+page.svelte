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
    population65Plus: number;
    population65PlusPercent: number;
    medianHomeValue: number;
    veteransCount: number;
    ownerOccupiedPercent: number;
  }

  interface SelectedArea {
    id: string;
    type: 'metro' | 'county' | 'city' | 'zipcode';
    name: string;
    displayName: string;
    fips?: string;
    stateFips?: string;
    state: string;
    zipCodes: ZipCodeEntry[];
    // Center coordinates for map display (fallback)
    centerLat?: number;
    centerLng?: number;
    // GeoJSON boundary for precise map display
    boundary?: any; // GeoJSON Feature
    // Included cities/towns for metros and counties
    includedPlaces?: string[];
  }

  interface GeoOption {
    fips: string;
    name: string;
  }

  // State variables - simplified for multi-select
  let addMode = $state<'metro' | 'county' | 'city' | 'zipcode'>('zipcode');
  let selectedState = $state('');
  let selectedStateFips = $state('');
  let selectedOption = $state(''); // generic for metro/county/city selection
  let zipCodeInput = $state('');

  // Search/filter state for dropdowns
  let stateSearch = $state('');
  let optionSearch = $state('');
  let showStateDropdown = $state(false);
  let showOptionDropdown = $state(false);

  // Filtered lists based on search
  let filteredStates = $derived(
    stateSearch.length > 0
      ? US_STATES.filter(s =>
          s.name.toLowerCase().includes(stateSearch.toLowerCase()) ||
          s.code.toLowerCase().includes(stateSearch.toLowerCase())
        )
      : US_STATES
  );

  let filteredOptions = $derived.by(() => {
    const search = optionSearch.toLowerCase();
    if (addMode === 'metro') {
      return search.length > 0
        ? metroOptions.filter(o => o.name.toLowerCase().includes(search))
        : metroOptions;
    } else if (addMode === 'county') {
      return search.length > 0
        ? countyOptions.filter(o => o.name.toLowerCase().includes(search))
        : countyOptions;
    } else if (addMode === 'city') {
      return search.length > 0
        ? cityOptions.filter(o => o.name.toLowerCase().includes(search))
        : cityOptions;
    }
    return [];
  });

  // Selected areas - the main collection
  let selectedAreas = $state<SelectedArea[]>([]);

  // Aggregated data - get all unique zip codes from all areas
  let allZipCodes = $derived.by(() => {
    const zips: ZipCodeEntry[] = [];
    const seen = new Set<string>();
    for (const area of selectedAreas) {
      for (const zip of area.zipCodes) {
        if (!seen.has(zip.zipCode)) {
          seen.add(zip.zipCode);
          zips.push(zip);
        }
      }
    }
    return zips;
  });

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
  let mapLayers: any[] = []; // GeoJSON layers and circles

  // Market score for auto-pricing
  let marketScore = $state(0);
  let priceAutoCalculated = $state(true);

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
    selectedAreas.length > 0
  );

  // Initialize Leaflet map
  onMount(async () => {
    if (browser) {
      L = (await import('leaflet')).default;
      map = L.map(mapContainer).setView([39.8283, -98.5795], 4);
      // CartoDB Positron - clean, minimal map style
      L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 20
      }).addTo(map);
    }
    return () => { if (map) map.remove(); };
  });

  // Update map when areas change
  $effect(() => {
    if (map && L) {
      updateMapMarkers();
    }
  });

  function updateMapMarkers() {
    if (!map || !L) return;

    // Clear existing layers
    mapLayers.forEach(layer => map.removeLayer(layer));
    mapLayers = [];

    const allBounds: any[] = [];

    // Draw markers for all selected areas
    selectedAreas.forEach(area => {
      const color = getAreaColor(area.type);

      if (area.boundary) {
        // Draw actual GeoJSON boundary
        const geoLayer = L.geoJSON(area.boundary, {
          style: {
            fillColor: color,
            fillOpacity: 0.25,
            color: color,
            weight: 2
          }
        }).addTo(map);

        geoLayer.bindPopup(`<strong>${area.displayName}</strong><br>${getAreaTypeLabel(area.type)}`);
        mapLayers.push(geoLayer);
        allBounds.push(geoLayer.getBounds());
      } else if (area.type === 'zipcode' && area.zipCodes.length > 0) {
        // Zip codes without boundary - use circles
        area.zipCodes.forEach(zip => {
          const circle = L.circle([zip.lat, zip.lng], {
            radius: 4000, // ~2.5 miles
            fillColor: color,
            fillOpacity: 0.3,
            color: color,
            weight: 2
          }).addTo(map);
          circle.bindPopup(`<strong>${zip.zipCode}</strong><br>${zip.city}, ${zip.state}`);
          mapLayers.push(circle);
          allBounds.push(circle.getBounds());
        });
      } else if (area.centerLat && area.centerLng) {
        // Fallback to circle for areas without boundary data
        const radius = area.type === 'metro' ? 40000 : area.type === 'county' ? 25000 : 10000;
        const circle = L.circle([area.centerLat, area.centerLng], {
          radius,
          fillColor: color,
          fillOpacity: 0.2,
          color: color,
          weight: 2,
          dashArray: '5, 5' // Dashed to indicate approximate
        }).addTo(map);
        circle.bindPopup(`<strong>${area.displayName}</strong><br>${getAreaTypeLabel(area.type)} (approximate)`);
        mapLayers.push(circle);
        allBounds.push(circle.getBounds());
      }
    });

    // Fit map to show all areas
    if (allBounds.length > 0) {
      let combinedBounds = allBounds[0];
      for (let i = 1; i < allBounds.length; i++) {
        combinedBounds = combinedBounds.extend(allBounds[i]);
      }
      map.fitBounds(combinedBounds, { padding: [30, 30] });
    }
  }

  function getAreaColor(type: string): string {
    // Colorblind-friendly colors with good contrast on light map
    switch (type) {
      case 'metro': return '#7c3aed'; // violet (distinct)
      case 'county': return '#0891b2'; // cyan (colorblind-safe)
      case 'city': return '#ea580c'; // orange (colorblind-safe)
      case 'zipcode': return '#2563eb'; // blue (primary)
      default: return '#64748b'; // slate gray
    }
  }

  // Fetch GeoJSON boundary from Census TIGERweb API
  async function fetchBoundary(type: string, geoid: string): Promise<any> {
    try {
      // TIGERweb ACS2023 layer IDs (verified working):
      // Layer 93 = Metropolitan Statistical Areas (MSAs)
      // Layer 91 = Micropolitan Statistical Areas
      // Layer 82 = Counties
      // Layer 28 = Incorporated Places (cities/towns)
      // Layer 2 = ZIP Code Tabulation Areas (ZCTAs)
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
        // ZIP codes
        layerId = 2; // ZCTAs
        whereClause = `ZCTA5='${geoid}'`;
      }

      const url = `https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/tigerWMS_ACS2023/MapServer/${layerId}/query?where=${encodeURIComponent(whereClause)}&f=geojson&outSR=4326&outFields=*`;

      console.log(`Fetching boundary: ${type} ${geoid} from layer ${layerId}`);
      const response = await fetch(url);
      const data = await response.json();

      if (data.features && data.features.length > 0) {
        console.log(`Boundary found for ${type} ${geoid}:`, data.features[0].properties);
        return data.features[0];
      }

      console.warn(`No boundary found for ${type} ${geoid}. Response:`, data);
    } catch (e) {
      console.error('Error fetching boundary:', e);
    }
    return null;
  }

  // Fetch cities and counties within a metro area
  async function fetchMetroPlaces(msaCode: string, metroName: string): Promise<string[]> {
    const allPlaces: string[] = [];

    try {
      // Get the counties in this metro from Census API
      const response = await fetch(
        `https://api.census.gov/data/2023/acs/acs5?get=NAME,B01003_001E&for=county:*&in=metropolitan%20statistical%20area/micropolitan%20statistical%20area:${msaCode}`
      );

      if (response.ok) {
        const data = await response.json();
        const counties = data.slice(1).map((row: string[]) => ({
          name: row[0].split(',')[0].replace(' County', ''),
          stateFips: row[0].includes('North Carolina') ? '37' :
                     row[0].includes('South Carolina') ? '45' : '',
          countyFips: row[3] || ''
        }));

        // For each county, get the major cities/towns
        for (const county of counties.slice(0, 5)) { // Limit to 5 counties
          if (county.stateFips && county.countyFips) {
            try {
              const placesResponse = await fetch(
                `https://api.census.gov/data/2023/acs/acs5?get=NAME,B01003_001E&for=county%20subdivision:*&in=state:${county.stateFips}&in=county:${county.countyFips}`
              );

              if (placesResponse.ok) {
                const placesData = await placesResponse.json();
                const places = placesData.slice(1)
                  .map((row: string[]) => ({
                    name: row[0].split(',')[0]
                      .replace(' township', '')
                      .replace(' town', '')
                      .replace(' city', '')
                      .replace(' UT', '')
                      .replace(' CCD', '')
                      .trim(),
                    population: parseInt(row[1]) || 0
                  }))
                  .filter((p: any) => p.population > 1000)
                  .sort((a: any, b: any) => b.population - a.population)
                  .slice(0, 5); // Top 5 per county

                places.forEach((p: any) => {
                  if (!allPlaces.includes(p.name)) {
                    allPlaces.push(p.name);
                  }
                });
              }
            } catch (e) {
              console.warn(`Could not fetch places for county ${county.name}:`, e);
            }
          }
        }
      }
    } catch (e) {
      console.error('Error fetching metro places:', e);
    }

    // If we got places, return them; otherwise, parse from metro name
    if (allPlaces.length > 0) {
      return allPlaces.slice(0, 15); // Limit to 15 places
    }

    // Fallback: parse principal city from metro name
    const namePart = metroName.split(' Metro')[0].split(' Micro')[0];
    const citiesPart = namePart.split(',')[0];
    return citiesPart.split('-').map(c => c.trim()).filter(c => c.length > 0);
  }

  // Fetch cities/towns within a county using county subdivisions
  async function fetchCountyPlaces(stateFips: string, countyFips: string): Promise<string[]> {
    try {
      // Use Census API to get county subdivisions (townships, cities, etc.)
      const response = await fetch(
        `https://api.census.gov/data/2023/acs/acs5?get=NAME,B01003_001E&for=county%20subdivision:*&in=state:${stateFips}&in=county:${countyFips}`
      );

      if (!response.ok) {
        console.warn('County subdivision query failed');
        return [];
      }

      const data = await response.json();

      // Parse subdivision names and sort by population
      const places = data.slice(1)
        .map((row: string[]) => {
          // Extract city/township name from full name like "Jacksonville township, Onslow County, NC"
          const fullName = row[0];
          let name = fullName.split(',')[0]
            .replace(' township', '')
            .replace(' town', '')
            .replace(' city', '')
            .replace(' UT', '') // Unorganized Territory
            .replace(' CCD', '') // Census County Division
            .trim();
          return {
            name,
            population: parseInt(row[1]) || 0
          };
        })
        .filter((p: any) => p.population > 500) // Filter out very small areas
        .sort((a: any, b: any) => b.population - a.population)
        .slice(0, 8) // Top 8 places
        .map((p: any) => p.name);

      return places;
    } catch (e) {
      console.error('Error fetching county places:', e);
      return [];
    }
  }

  // Calculate market score and recommended price using config from database
  function calculateMarketScore(demo: Demographics): { score: number; price: number } {
    const config = data.pricingConfig;
    let score = 0;

    // Helper function to get points based on thresholds
    function getPoints(value: number, thresholds: Array<{min: number, points: number}>): number {
      for (const t of thresholds) {
        if (value >= t.min) return t.points;
      }
      return 0;
    }

    // 65+ Population % scoring
    if (config.scoring?.senior?.thresholds) {
      score += getPoints(demo.population65PlusPercent, config.scoring.senior.thresholds);
    } else {
      // Fallback
      const seniorPct = demo.population65PlusPercent;
      if (seniorPct >= 20) score += 30;
      else if (seniorPct >= 15) score += 25;
      else if (seniorPct >= 12) score += 20;
      else if (seniorPct >= 8) score += 15;
      else score += 10;
    }

    // Median Household Income scoring
    if (config.scoring?.income?.thresholds) {
      score += getPoints(demo.medianIncome, config.scoring.income.thresholds);
    } else {
      const income = demo.medianIncome;
      if (income >= 100000) score += 25;
      else if (income >= 75000) score += 20;
      else if (income >= 55000) score += 15;
      else if (income >= 40000) score += 10;
      else score += 5;
    }

    // Population Size scoring
    if (config.scoring?.population?.thresholds) {
      score += getPoints(demo.population, config.scoring.population.thresholds);
    } else {
      const pop = demo.population;
      if (pop >= 500000) score += 25;
      else if (pop >= 250000) score += 20;
      else if (pop >= 100000) score += 15;
      else if (pop >= 50000) score += 10;
      else score += 5;
    }

    // Median Home Value scoring
    if (config.scoring?.homeValue?.thresholds) {
      score += getPoints(demo.medianHomeValue, config.scoring.homeValue.thresholds);
    } else {
      const homeValue = demo.medianHomeValue;
      if (homeValue >= 500000) score += 20;
      else if (homeValue >= 350000) score += 16;
      else if (homeValue >= 250000) score += 12;
      else if (homeValue >= 150000) score += 8;
      else score += 4;
    }

    // Calculate price based on score using config tiers
    let price = 1000; // Default
    if (config.priceTiers && Array.isArray(config.priceTiers)) {
      // Sort tiers by minScore descending to find the right tier
      const sortedTiers = [...config.priceTiers].sort((a, b) => b.minScore - a.minScore);
      for (const tier of sortedTiers) {
        if (score >= tier.minScore) {
          price = tier.price;
          break;
        }
      }
    } else {
      // Fallback
      if (score >= 80) price = 3500;
      else if (score >= 65) price = 2750;
      else if (score >= 50) price = 2000;
      else if (score >= 35) price = 1500;
      else price = 1000;
    }

    return { score, price };
  }

  // Handle state change - load options based on add mode
  async function handleStateChange() {
    if (!selectedState) return;
    selectedStateFips = STATE_FIPS[selectedState] || '';
    selectedOption = '';

    isLoading = true;
    errorMessage = '';

    try {
      if (addMode === 'metro') {
        await fetchMetroAreas();
      } else if (addMode === 'county') {
        await fetchCounties();
      } else if (addMode === 'city') {
        await fetchCities();
      }
    } catch (error) {
      console.error('Error loading options:', error);
      errorMessage = 'Failed to load options. Please try again.';
    } finally {
      isLoading = false;
    }
  }

  // Handle add mode change
  function handleModeChange() {
    selectedOption = '';
    metroOptions = [];
    countyOptions = [];
    cityOptions = [];

    if (selectedState) {
      handleStateChange();
    }
  }

  // Fetch metro areas from Census API
  async function fetchMetroAreas() {
    try {
      const response = await fetch(
        `https://api.census.gov/data/2023/acs/acs5?get=NAME&for=metropolitan%20statistical%20area/micropolitan%20statistical%20area:*`
      );
      const data = await response.json();

      const stateAbbr = selectedState;
      metroOptions = data.slice(1)
        .filter((row: string[]) => row[0].includes(`, ${stateAbbr}`) || row[0].includes(`-${stateAbbr}`) || row[0].includes(`${stateAbbr}-`))
        .map((row: string[]) => ({
          fips: row[1],
          name: row[0].split(',')[0]
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
          fips: row[2],
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
          fips: row[2],
          name: row[0].replace(' city', '').replace(' town', '').replace(' village', '').replace(' CDP', '').split(',')[0]
        }))
        .sort((a: GeoOption, b: GeoOption) => a.name.localeCompare(b.name));
    } catch (error) {
      console.error('Error fetching cities:', error);
      errorMessage = 'Failed to load cities.';
    }
  }

  // Census variables for comprehensive demographics
  const CENSUS_VARIABLES = 'B01003_001E,B11001_001E,B19013_001E,B01002_001E,B25077_001E,B21001_002E,B25003_001E,B25003_002E,B01001_020E,B01001_021E,B01001_022E,B01001_023E,B01001_024E,B01001_025E,B01001_044E,B01001_045E,B01001_046E,B01001_047E,B01001_048E,B01001_049E';

  // Geocode a location to get coordinates
  async function geocodeLocation(query: string): Promise<{lat: number, lng: number} | null> {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`,
        { headers: { 'User-Agent': 'SqueezMedia-Platform' } }
      );
      const data = await response.json();
      if (data && data.length > 0) {
        return {
          lat: parseFloat(data[0].lat),
          lng: parseFloat(data[0].lon)
        };
      }
    } catch (e) {
      console.error('Geocoding error:', e);
    }
    return null;
  }

  // Add selected metro area
  async function addMetroArea() {
    if (!selectedOption) return;

    const metro = metroOptions.find(m => m.fips === selectedOption);
    if (!metro) return;

    // Check if already added
    if (selectedAreas.some(a => a.type === 'metro' && a.fips === selectedOption)) {
      errorMessage = 'This metro area is already added.';
      return;
    }

    isLoading = true;
    errorMessage = '';

    try {
      // Fetch the actual boundary from Census TIGERweb
      const boundary = await fetchBoundary('metro', selectedOption);

      // Fetch principal cities in this metro
      const includedPlaces = await fetchMetroPlaces(selectedOption, metro.name);

      // Fallback to geocoding if boundary not found
      let coords = null;
      if (!boundary) {
        coords = await geocodeLocation(`${metro.name} metropolitan area, USA`);
      }

      const newArea: SelectedArea = {
        id: `metro-${selectedOption}`,
        type: 'metro',
        name: metro.name,
        displayName: `${metro.name} Metro`,
        fips: selectedOption,
        state: selectedState,
        zipCodes: [],
        centerLat: coords?.lat,
        centerLng: coords?.lng,
        boundary,
        includedPlaces
      };

      selectedAreas = [...selectedAreas, newArea];
      selectedOption = '';

      // Auto-generate territory name if first area
      if (selectedAreas.length === 1) {
        territoryName = `${metro.name} Metro`;
      }

      await updateAggregateDemographics();
      updateMapMarkers();
    } catch (error) {
      console.error('Error adding metro area:', error);
      errorMessage = 'Failed to add metro area.';
    } finally {
      isLoading = false;
    }
  }

  // Add selected county
  async function addCounty() {
    if (!selectedOption || !selectedStateFips) return;

    const county = countyOptions.find(c => c.fips === selectedOption);
    if (!county) return;

    // Check if already added
    const areaId = `county-${selectedStateFips}-${selectedOption}`;
    if (selectedAreas.some(a => a.id === areaId)) {
      errorMessage = 'This county is already added.';
      return;
    }

    isLoading = true;
    errorMessage = '';

    try {
      // County GEOID is state FIPS + county FIPS (e.g., "37129" for New Hanover, NC)
      const countyGeoid = `${selectedStateFips}${selectedOption}`;
      const boundary = await fetchBoundary('county', countyGeoid);

      // Fetch cities/towns in this county
      const includedPlaces = await fetchCountyPlaces(selectedStateFips, selectedOption);

      // Fallback to geocoding if boundary not found
      let coords = null;
      if (!boundary) {
        const stateName = US_STATES.find(s => s.code === selectedState)?.name || selectedState;
        coords = await geocodeLocation(`${county.name} County, ${stateName}, USA`);
      }

      const newArea: SelectedArea = {
        id: areaId,
        type: 'county',
        name: county.name,
        displayName: `${county.name} County, ${selectedState}`,
        fips: selectedOption,
        stateFips: selectedStateFips,
        state: selectedState,
        zipCodes: [],
        centerLat: coords?.lat,
        centerLng: coords?.lng,
        boundary,
        includedPlaces
      };

      selectedAreas = [...selectedAreas, newArea];
      selectedOption = '';

      if (selectedAreas.length === 1) {
        territoryName = `${county.name} County`;
      }

      await updateAggregateDemographics();
      updateMapMarkers();
    } catch (error) {
      console.error('Error adding county:', error);
      errorMessage = 'Failed to add county.';
    } finally {
      isLoading = false;
    }
  }

  // Add selected city
  async function addCity() {
    if (!selectedOption || !selectedStateFips) return;

    const city = cityOptions.find(c => c.fips === selectedOption);
    if (!city) return;

    // Check if already added
    const areaId = `city-${selectedStateFips}-${selectedOption}`;
    if (selectedAreas.some(a => a.id === areaId)) {
      errorMessage = 'This city is already added.';
      return;
    }

    isLoading = true;
    errorMessage = '';

    try {
      // Place GEOID is state FIPS + place FIPS (e.g., "3774440" for Wilmington, NC)
      const placeGeoid = `${selectedStateFips}${selectedOption}`;
      const boundary = await fetchBoundary('city', placeGeoid);

      // Fallback to geocoding if boundary not found
      let coords = null;
      if (!boundary) {
        const stateName = US_STATES.find(s => s.code === selectedState)?.name || selectedState;
        coords = await geocodeLocation(`${city.name}, ${stateName}, USA`);
      }

      const newArea: SelectedArea = {
        id: areaId,
        type: 'city',
        name: city.name,
        displayName: `${city.name}, ${selectedState}`,
        fips: selectedOption,
        stateFips: selectedStateFips,
        state: selectedState,
        zipCodes: [],
        centerLat: coords?.lat,
        centerLng: coords?.lng,
        boundary
      };

      selectedAreas = [...selectedAreas, newArea];
      selectedOption = '';

      if (selectedAreas.length === 1) {
        territoryName = `${city.name}, ${selectedState}`;
      }

      await updateAggregateDemographics();
      updateMapMarkers();
    } catch (error) {
      console.error('Error adding city:', error);
      errorMessage = 'Failed to add city.';
    } finally {
      isLoading = false;
    }
  }

  // Add zip code directly
  async function addZipCode() {
    const zip = zipCodeInput.trim();
    if (!zip) return;

    if (!/^\d{5}$/.test(zip)) {
      errorMessage = 'Please enter a valid 5-digit zip code.';
      return;
    }

    // Check if already added
    if (selectedAreas.some(a => a.type === 'zipcode' && a.name === zip)) {
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
        isLoading = false;
        return;
      }

      const result = geoData[0];
      const city = result.address?.city || result.address?.town || result.address?.village || result.address?.county || 'Unknown';
      const state = result.address?.state || '';
      const stateCode = Object.entries(STATE_FIPS).find(([code, fips]) =>
        US_STATES.find(s => s.code === code)?.name === state
      )?.[0] || '';

      const zipEntry: ZipCodeEntry = {
        zipCode: zip,
        city,
        state: stateCode || state,
        lat: parseFloat(result.lat),
        lng: parseFloat(result.lon)
      };

      // Try to fetch ZIP code boundary
      const boundary = await fetchBoundary('zipcode', zip);

      const newArea: SelectedArea = {
        id: `zip-${zip}`,
        type: 'zipcode',
        name: zip,
        displayName: `${zip} - ${city}, ${stateCode || state}`,
        state: stateCode || state,
        zipCodes: [zipEntry],
        boundary
      };

      selectedAreas = [...selectedAreas, newArea];
      zipCodeInput = '';

      if (selectedAreas.length === 1) {
        territoryName = `${city} Area`;
      }

      await updateAggregateDemographics();
    } catch (error) {
      console.error('Error adding zip code:', error);
      errorMessage = 'Failed to add zip code. Please try again.';
    } finally {
      isLoading = false;
    }
  }

  // Remove an area
  function removeArea(id: string) {
    selectedAreas = selectedAreas.filter(a => a.id !== id);
    updateAggregateDemographics();
  }

  // Update aggregate demographics from all selected areas
  async function updateAggregateDemographics() {
    if (selectedAreas.length === 0) {
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

      for (const area of selectedAreas) {
        try {
          let apiUrl = '';

          if (area.type === 'metro') {
            apiUrl = `https://api.census.gov/data/2023/acs/acs5?get=${CENSUS_VARIABLES}&for=metropolitan%20statistical%20area/micropolitan%20statistical%20area:${area.fips}`;
          } else if (area.type === 'county') {
            apiUrl = `https://api.census.gov/data/2023/acs/acs5?get=${CENSUS_VARIABLES}&for=county:${area.fips}&in=state:${area.stateFips}`;
          } else if (area.type === 'city') {
            apiUrl = `https://api.census.gov/data/2023/acs/acs5?get=${CENSUS_VARIABLES}&for=place:${area.fips}&in=state:${area.stateFips}`;
          } else if (area.type === 'zipcode') {
            apiUrl = `https://api.census.gov/data/2023/acs/acs5?get=${CENSUS_VARIABLES}&for=zip%20code%20tabulation%20area:${area.name}`;
          }

          const response = await fetch(apiUrl);
          const data = await response.json();

          if (data && data.length > 1) {
            const row = data[1];
            const pop = parseInt(row[0]) || 0;
            const households = parseInt(row[1]) || 0;
            totalPop += pop;
            totalHouseholds += households;

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
          console.error('Error fetching demographics for area:', area.id, e);
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

      // Calculate market score and auto-set price
      const { score, price } = calculateMarketScore(demographics);
      marketScore = score;

      // Only auto-update price if user hasn't manually changed it
      if (priceAutoCalculated) {
        monthlyBasePrice = price;
      }
    } catch (error) {
      console.error('Error updating demographics:', error);
    } finally {
      isLoadingDemographics = false;
    }
  }

  // Track when user manually changes price
  function handlePriceChange() {
    priceAutoCalculated = false;
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

  function getAreaTypeIcon(type: string): string {
    switch (type) {
      case 'metro': return '🏙️';
      case 'county': return '📍';
      case 'city': return '🏘️';
      case 'zipcode': return '📮';
      default: return '📍';
    }
  }

  function getAreaTypeLabel(type: string): string {
    switch (type) {
      case 'metro': return 'Metro Area';
      case 'county': return 'County';
      case 'city': return 'City';
      case 'zipcode': return 'Zip Code';
      default: return type;
    }
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
    <p class="page-subtitle">Build a territory by adding metros, counties, cities, or zip codes. Mix and match as needed.</p>
  </div>
</div>

<!-- Builder Container -->
<div class="builder-container">
  <!-- Left Sidebar - Add Locations -->
  <div class="builder-sidebar">
    <!-- Add Location Section -->
    <div class="card">
      <div class="card-header">
        <h3 class="card-title">Add Locations</h3>
      </div>
      <div class="card-body">
        <!-- Add Mode Tabs -->
        <div class="add-mode-tabs">
          <button
            class="mode-tab"
            class:active={addMode === 'zipcode'}
            onclick={() => { addMode = 'zipcode'; handleModeChange(); }}
          >
            Zip Codes
          </button>
          <button
            class="mode-tab"
            class:active={addMode === 'city'}
            onclick={() => { addMode = 'city'; handleModeChange(); }}
          >
            Cities
          </button>
          <button
            class="mode-tab"
            class:active={addMode === 'county'}
            onclick={() => { addMode = 'county'; handleModeChange(); }}
          >
            Counties
          </button>
          <button
            class="mode-tab"
            class:active={addMode === 'metro'}
            onclick={() => { addMode = 'metro'; handleModeChange(); }}
          >
            Metros
          </button>
        </div>

        <!-- Zip Code Input -->
        {#if addMode === 'zipcode'}
          <div class="form-group">
            <label class="form-label" for="zipcode-input">Enter Zip Code</label>
            <div class="input-with-button">
              <input
                type="text"
                id="zipcode-input"
                class="form-input"
                placeholder="e.g., 28401"
                bind:value={zipCodeInput}
                onkeydown={(e) => e.key === 'Enter' && addZipCode()}
                maxlength="5"
                autocomplete="off"
              />
              <button class="btn btn-primary" onclick={addZipCode} disabled={isLoading || !zipCodeInput.trim()}>
                {#if isLoading}
                  <span class="spinner-sm"></span>
                {:else}
                  Add
                {/if}
              </button>
            </div>
          </div>
        {:else}
          <!-- State Selection - Searchable -->
          <div class="form-group">
            <label class="form-label" for="state-search">Select State</label>
            <div class="searchable-select">
              <input
                type="text"
                id="state-search"
                class="form-input"
                placeholder="Type to search states..."
                bind:value={stateSearch}
                onfocus={() => showStateDropdown = true}
                onblur={() => setTimeout(() => showStateDropdown = false, 200)}
                autocomplete="off"
              />
              {#if selectedState && !showStateDropdown}
                <div class="selected-value">
                  {US_STATES.find(s => s.code === selectedState)?.name || selectedState}
                  <button type="button" class="clear-btn" onclick={() => { selectedState = ''; stateSearch = ''; selectedOption = ''; optionSearch = ''; }}>×</button>
                </div>
              {/if}
              {#if showStateDropdown && filteredStates.length > 0}
                <div class="dropdown-list">
                  {#each filteredStates.slice(0, 10) as state}
                    <button
                      type="button"
                      class="dropdown-item"
                      class:selected={selectedState === state.code}
                      onmousedown={() => {
                        selectedState = state.code;
                        stateSearch = '';
                        showStateDropdown = false;
                        handleStateChange();
                      }}
                    >
                      {state.name}
                    </button>
                  {/each}
                  {#if filteredStates.length > 10}
                    <div class="dropdown-hint">{filteredStates.length - 10} more - keep typing to filter</div>
                  {/if}
                </div>
              {/if}
            </div>
          </div>

          <!-- Metro/County/City Selection - Searchable -->
          {#if selectedState}
            <div class="form-group">
              <label class="form-label" for="territory-option-search">
                Select {addMode === 'metro' ? 'Metro Area' : addMode === 'county' ? 'County' : 'City'}
              </label>
              {#if isLoading}
                <div class="loading-inline">
                  <span class="spinner-sm"></span>
                  <span>Loading options...</span>
                </div>
              {:else}
                <div class="input-with-button">
                  <div class="searchable-select flex-1">
                    <input
                      type="text"
                      id="territory-option-search"
                      class="form-input"
                      placeholder="Type to search..."
                      bind:value={optionSearch}
                      onfocus={() => showOptionDropdown = true}
                      onblur={() => setTimeout(() => showOptionDropdown = false, 200)}
                      autocomplete="off"
                    />
                    {#if selectedOption && !showOptionDropdown}
                      <div class="selected-value">
                        {#if addMode === 'metro'}
                          {metroOptions.find(o => o.fips === selectedOption)?.name || selectedOption}
                        {:else if addMode === 'county'}
                          {countyOptions.find(o => o.fips === selectedOption)?.name || selectedOption}
                        {:else}
                          {cityOptions.find(o => o.fips === selectedOption)?.name || selectedOption}
                        {/if}
                        <button type="button" class="clear-btn" onclick={() => { selectedOption = ''; optionSearch = ''; }}>×</button>
                      </div>
                    {/if}
                    {#if showOptionDropdown && filteredOptions.length > 0}
                      <div class="dropdown-list">
                        {#each filteredOptions.slice(0, 15) as opt}
                          <button
                            type="button"
                            class="dropdown-item"
                            class:selected={selectedOption === opt.fips}
                            onmousedown={() => {
                              selectedOption = opt.fips;
                              optionSearch = '';
                              showOptionDropdown = false;
                            }}
                          >
                            {opt.name}
                          </button>
                        {/each}
                        {#if filteredOptions.length > 15}
                          <div class="dropdown-hint">{filteredOptions.length - 15} more - keep typing to filter</div>
                        {/if}
                      </div>
                    {/if}
                  </div>
                  <button
                    class="btn btn-primary"
                    onclick={() => {
                      if (addMode === 'metro') addMetroArea();
                      else if (addMode === 'county') addCounty();
                      else if (addMode === 'city') addCity();
                    }}
                    disabled={isLoading || !selectedOption}
                  >
                    Add
                  </button>
                </div>
              {/if}
            </div>
          {/if}
        {/if}

        {#if errorMessage}
          <div class="error-message">{errorMessage}</div>
        {/if}
      </div>
    </div>

    <!-- Selected Areas -->
    <div class="card">
      <div class="card-header">
        <h3 class="card-title">Selected Areas</h3>
        <span class="area-count">{selectedAreas.length} location{selectedAreas.length !== 1 ? 's' : ''}</span>
      </div>
      <div class="card-body">
        {#if selectedAreas.length === 0}
          <div class="empty-areas">
            <p>No locations added yet.</p>
            <p class="hint">Add zip codes, cities, counties, or metro areas above.</p>
          </div>
        {:else}
          <div class="areas-list">
            {#each selectedAreas as area}
              <div class="area-item">
                <div class="area-info">
                  <span class="area-icon">{getAreaTypeIcon(area.type)}</span>
                  <div class="area-details">
                    <span class="area-name">{area.displayName}</span>
                    <span class="area-type">{getAreaTypeLabel(area.type)}</span>
                    {#if area.includedPlaces && area.includedPlaces.length > 0}
                      <div class="included-places">
                        <span class="places-label">Includes:</span>
                        <span class="places-list">{area.includedPlaces.join(', ')}</span>
                      </div>
                    {/if}
                  </div>
                </div>
                <button class="remove-btn" onclick={() => removeArea(area.id)} title="Remove">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="18" y1="6" x2="6" y2="18"/>
                    <line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              </div>
            {/each}
          </div>
        {/if}
      </div>
    </div>

    <!-- Territory Details -->
    <div class="card">
      <div class="card-header">
        <h3 class="card-title">Territory Details</h3>
      </div>
      <div class="card-body">
        <div class="form-group">
          <label class="form-label" for="territory-name">Territory Name</label>
          <input
            type="text"
            id="territory-name"
            class="form-input"
            placeholder="e.g., Greater Wilmington"
            bind:value={territoryName}
            autocomplete="off"
          />
        </div>

        <div class="form-group">
          <label class="form-label" for="monthly-base-price">
            Monthly Base Price
            {#if priceAutoCalculated && demographics}
              <span class="price-auto-badge">Auto</span>
            {/if}
          </label>
          <div class="input-with-prefix">
            <span class="input-prefix">$</span>
            <input
              type="number"
              id="monthly-base-price"
              class="form-input"
              bind:value={monthlyBasePrice}
              oninput={handlePriceChange}
              min="0"
              step="100"
              autocomplete="off"
            />
          </div>
          {#if demographics}
            <div class="price-info">
              <span class="market-score-badge" class:score-high={marketScore >= 65} class:score-medium={marketScore >= 40 && marketScore < 65} class:score-low={marketScore < 40}>
                Market Score: {marketScore}/100
              </span>
              {#if !priceAutoCalculated}
                <button type="button" class="reset-price-btn" onclick={() => { priceAutoCalculated = true; const { price } = calculateMarketScore(demographics); monthlyBasePrice = price; }}>
                  Reset to suggested
                </button>
              {/if}
            </div>
          {/if}
        </div>
      </div>
    </div>

    <!-- Create Button -->
    <form method="POST" action="?/createTerritory" use:enhance={() => {
      isCreating = true;
      return async ({ result }) => {
        isCreating = false;
        if (result.type === 'redirect') {
          goto(result.location);
        } else if (result.type === 'failure') {
          errorMessage = result.data?.error || 'Failed to create territory';
        }
      };
    }}>
      <input type="hidden" name="name" value={territoryName} />
      <input type="hidden" name="boundaryType" value={selectedAreas.length === 1 ? selectedAreas[0].type : 'custom'} />
      <input type="hidden" name="state" value={selectedAreas[0]?.state || ''} />
      <input type="hidden" name="primaryCity" value={selectedAreas[0]?.name || allZipCodes[0]?.city || ''} />
      <input type="hidden" name="zipCodes" value={JSON.stringify(allZipCodes.map(z => ({ zipCode: z.zipCode, city: z.city })))} />
      <input type="hidden" name="demographics" value={JSON.stringify(demographics || {})} />
      <input type="hidden" name="monthlyBasePrice" value={monthlyBasePrice} />
      <input type="hidden" name="centerLat" value={selectedAreas[0]?.boundary?.properties?.CENTLAT || selectedAreas[0]?.centerLat || (allZipCodes.length > 0 ? allZipCodes.reduce((sum, z) => sum + z.lat, 0) / allZipCodes.length : 0)} />
      <input type="hidden" name="centerLng" value={selectedAreas[0]?.boundary?.properties?.CENTLON || selectedAreas[0]?.centerLng || (allZipCodes.length > 0 ? allZipCodes.reduce((sum, z) => sum + z.lng, 0) / allZipCodes.length : 0)} />
      <input type="hidden" name="radiusMiles" value="15" />
      <input type="hidden" name="msaCode" value={selectedAreas.find(a => a.type === 'metro')?.fips || ''} />
      <input type="hidden" name="countyFips" value={selectedAreas.find(a => a.type === 'county')?.fips || ''} />
      <input type="hidden" name="placeFips" value={selectedAreas.find(a => a.type === 'city')?.fips || ''} />
      <input type="hidden" name="selectedAreas" value={JSON.stringify(selectedAreas)} />

      <button type="submit" class="btn btn-primary btn-lg btn-full" disabled={!canCreate || isCreating}>
        {#if isCreating}
          <span class="spinner-sm"></span>
          Creating Territory...
        {:else}
          Create Territory
        {/if}
      </button>
    </form>
  </div>

  <!-- Right Side - Map and Demographics -->
  <div class="builder-main">
    <!-- Map -->
    <div class="card map-card">
      <div class="card-header">
        <h3 class="card-title">Territory Map</h3>
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
            <p>Add locations to view demographics</p>
          </div>
        {/if}
      </div>
    </div>
  </div>
</div>

<style>
  /* Layout */
  .page-header {
    margin-bottom: var(--spacing-6);
  }

  .page-header-left {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-2);
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
    color: var(--gray-700);
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
    grid-template-columns: 400px 1fr;
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

  /* Cards */
  .card {
    background: white;
    border-radius: var(--radius-lg);
    border: 1px solid var(--gray-200);
    overflow: visible;
  }

  .card .card-header {
    border-radius: var(--radius-lg) var(--radius-lg) 0 0;
  }

  .map-card {
    overflow: hidden;
  }

  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--spacing-4);
    border-bottom: 1px solid var(--gray-100);
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

  /* Add Mode Tabs */
  .add-mode-tabs {
    display: flex;
    gap: var(--spacing-1);
    margin-bottom: var(--spacing-4);
    background: var(--gray-100);
    padding: 4px;
    border-radius: var(--radius-lg);
  }

  .mode-tab {
    flex: 1;
    padding: var(--spacing-2) var(--spacing-3);
    border: none;
    background: transparent;
    color: var(--gray-600);
    font-size: 0.8125rem;
    font-weight: 500;
    cursor: pointer;
    border-radius: var(--radius-md);
    transition: all 0.15s ease;
  }

  .mode-tab:hover {
    color: var(--gray-900);
  }

  .mode-tab.active {
    background: white;
    color: var(--gray-900);
    box-shadow: 0 1px 2px rgba(0,0,0,0.05);
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
    margin-bottom: var(--spacing-2);
  }

  .form-input {
    width: 100%;
    padding: var(--spacing-2) var(--spacing-3);
    border: 1px solid var(--gray-300);
    border-radius: var(--radius-md);
    font-size: 0.875rem;
    transition: border-color 0.15s ease;
  }

  .form-input:focus {
    outline: none;
    border-color: var(--primary-500);
    box-shadow: 0 0 0 3px var(--primary-100);
  }

  .form-select {
    appearance: none;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E");
    background-repeat: no-repeat;
    background-position: right 12px center;
    padding-right: 40px;
  }

  .input-with-button {
    display: flex;
    gap: var(--spacing-2);
  }

  .input-with-button .form-input {
    flex: 1;
  }

  .input-with-prefix {
    position: relative;
  }

  .input-prefix {
    position: absolute;
    left: 12px;
    top: 50%;
    transform: translateY(-50%);
    color: var(--gray-500);
    font-size: 0.875rem;
  }

  .input-with-prefix .form-input {
    padding-left: 28px;
  }

  .loading-inline {
    display: flex;
    align-items: center;
    gap: var(--spacing-2);
    color: var(--gray-500);
    font-size: 0.875rem;
  }

  /* Searchable Select Dropdown */
  .searchable-select {
    position: relative;
    z-index: 10;
  }

  .form-group:focus-within {
    z-index: 20;
  }

  .searchable-select .form-input {
    width: 100%;
  }

  .searchable-select .selected-value {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--spacing-2) var(--spacing-3);
    background: white;
    border: 1px solid var(--gray-300);
    border-radius: var(--radius-md);
    font-size: 0.875rem;
    cursor: pointer;
  }

  .searchable-select .clear-btn {
    background: none;
    border: none;
    color: var(--gray-400);
    cursor: pointer;
    font-size: 1.25rem;
    line-height: 1;
    padding: 0 4px;
  }

  .searchable-select .clear-btn:hover {
    color: var(--gray-600);
  }

  .searchable-select .dropdown-list {
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    max-height: 250px;
    overflow-y: auto;
    background: white;
    border: 1px solid var(--gray-300);
    border-radius: var(--radius-md);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
    z-index: 1000;
    margin-top: 4px;
  }

  .searchable-select .dropdown-item {
    display: block;
    width: 100%;
    padding: var(--spacing-2) var(--spacing-3);
    text-align: left;
    background: none;
    border: none;
    cursor: pointer;
    font-size: 0.875rem;
    color: var(--gray-700);
  }

  .searchable-select .dropdown-item:hover {
    background: var(--gray-100);
  }

  .searchable-select .dropdown-item.selected {
    background: var(--blue-50);
    color: var(--blue-700);
  }

  .searchable-select .dropdown-hint {
    padding: var(--spacing-2) var(--spacing-3);
    font-size: 0.75rem;
    color: var(--gray-500);
    background: var(--gray-50);
    border-top: 1px solid var(--gray-200);
  }

  .input-with-button .searchable-select {
    flex: 1;
  }

  .input-with-button .searchable-select.flex-1 {
    min-width: 0;
  }

  .error-message {
    margin-top: var(--spacing-3);
    padding: var(--spacing-3);
    background: var(--danger-50);
    color: var(--danger-700);
    border-radius: var(--radius-md);
    font-size: 0.875rem;
  }

  /* Pricing Auto Badge */
  .price-auto-badge {
    display: inline-flex;
    padding: 2px 6px;
    background: var(--primary-100);
    color: var(--primary-700);
    font-size: 0.625rem;
    font-weight: 600;
    text-transform: uppercase;
    border-radius: var(--radius-full);
    margin-left: var(--spacing-2);
  }

  .price-info {
    display: flex;
    align-items: center;
    gap: var(--spacing-2);
    margin-top: var(--spacing-2);
  }

  .market-score-badge {
    display: inline-flex;
    padding: 4px 8px;
    font-size: 0.75rem;
    font-weight: 500;
    border-radius: var(--radius-md);
  }

  .market-score-badge.score-high {
    background: var(--success-100);
    color: var(--success-700);
  }

  .market-score-badge.score-medium {
    background: var(--warning-100);
    color: var(--warning-700);
  }

  .market-score-badge.score-low {
    background: var(--gray-100);
    color: var(--gray-600);
  }

  .reset-price-btn {
    background: none;
    border: none;
    color: var(--primary-600);
    font-size: 0.75rem;
    cursor: pointer;
    text-decoration: underline;
  }

  .reset-price-btn:hover {
    color: var(--primary-700);
  }

  /* Buttons */
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
  }

  .btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .btn-primary {
    background: var(--primary-600);
    color: white;
  }

  .btn-primary:hover:not(:disabled) {
    background: var(--primary-700);
  }

  .btn-lg {
    padding: var(--spacing-3) var(--spacing-6);
    font-size: 1rem;
  }

  .btn-full {
    width: 100%;
  }

  /* Selected Areas */
  .area-count {
    font-size: 0.8125rem;
    color: var(--gray-500);
  }

  .empty-areas {
    text-align: center;
    padding: var(--spacing-6);
    color: var(--gray-500);
  }

  .empty-areas p {
    margin: 0;
  }

  .empty-areas .hint {
    font-size: 0.8125rem;
    color: var(--gray-400);
    margin-top: var(--spacing-2);
  }

  .areas-list {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-2);
  }

  .area-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--spacing-3);
    background: var(--gray-50);
    border-radius: var(--radius-md);
  }

  .area-info {
    display: flex;
    align-items: center;
    gap: var(--spacing-3);
  }

  .area-icon {
    font-size: 1.25rem;
  }

  .area-details {
    display: flex;
    flex-direction: column;
  }

  .area-name {
    font-size: 0.875rem;
    font-weight: 500;
    color: var(--gray-900);
  }

  .area-type {
    font-size: 0.75rem;
    color: var(--gray-500);
  }

  .included-places {
    margin-top: 0.25rem;
    font-size: 0.75rem;
    color: var(--gray-600);
    line-height: 1.4;
  }

  .places-label {
    font-weight: 500;
    color: var(--gray-500);
  }

  .places-list {
    color: var(--gray-700);
  }

  .remove-btn {
    padding: var(--spacing-1);
    border: none;
    background: transparent;
    color: var(--gray-400);
    cursor: pointer;
    border-radius: var(--radius-sm);
  }

  .remove-btn:hover {
    background: var(--gray-100);
    color: var(--danger-600);
  }

  /* Map */
  .map-card {
    min-height: 400px;
  }

  .map-container {
    height: 350px;
    background: var(--gray-100);
  }

  /* Demographics */
  .demographics-card .card-body {
    padding: var(--spacing-4);
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

  /* Market Score */
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

  /* Spinner */
  .spinner-sm {
    width: 16px;
    height: 16px;
    border: 2px solid currentColor;
    border-right-color: transparent;
    border-radius: 50%;
    animation: spin 0.75s linear infinite;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }
</style>
