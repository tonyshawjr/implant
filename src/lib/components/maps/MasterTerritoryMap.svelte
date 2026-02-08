<script lang="ts">
  /**
   * MasterTerritoryMap.svelte
   * Displays multiple territories on a single map
   * Color-coded circles: locked=red, available=green, waitlist=yellow
   * Click territory to show details in popup or emit event
   * Auto-fits bounds to show all territories
   */

  import { onMount, onDestroy, createEventDispatcher } from 'svelte';
  import { browser } from '$app/environment';
  import {
    DEFAULT_TILE_LAYER,
    TERRITORY_COLORS,
    MAP_CONFIGS,
    US_CENTER,
    milesToMeters,
    getTerritoryColor,
    calculateCircleBounds
  } from './map-styles';
  import type { Map as LeafletMap, Circle, LatLngBounds, CircleMarker, LayerGroup } from 'leaflet';

  interface Territory {
    id: string;
    name: string;
    centerLat: number;
    centerLng: number;
    radiusMiles: number;
    status: 'locked' | 'available' | 'waitlist' | 'pending';
    city?: string;
    state?: string;
    population?: number;
    monthlyBasePrice?: number;
    client?: {
      name: string;
      id: string;
    } | null;
  }

  interface Props {
    /** Array of territories to display */
    territories: Territory[];
    /** Height of the map container */
    height?: string;
    /** Whether to show zoom controls */
    showZoomControl?: boolean;
    /** Whether to allow scroll wheel zoom */
    scrollWheelZoom?: boolean;
    /** ID of the currently selected territory */
    selectedTerritoryId?: string | null;
    /** Whether to show popups on click */
    showPopups?: boolean;
    /** Custom class for the container */
    class?: string;
  }

  let {
    territories = [],
    height = '500px',
    showZoomControl = true,
    scrollWheelZoom = true,
    selectedTerritoryId = null,
    showPopups = true,
    class: className = ''
  }: Props = $props();

  const dispatch = createEventDispatcher<{
    territoryClick: { territory: Territory };
    territoryHover: { territory: Territory | null };
  }>();

  let mapContainer: HTMLDivElement;
  let map: LeafletMap | null = $state(null);
  let L: typeof import('leaflet') | null = $state(null);
  let territoriesLayer: LayerGroup | null = $state(null);
  let territoryCircles: Map<string, { circle: Circle; marker: CircleMarker }> = new Map();
  let isLoading = $state(true);
  let loadError = $state<string | null>(null);
  let hoveredTerritoryId = $state<string | null>(null);

  // Initialize map on mount (client-side only)
  onMount(() => {
    let mounted = true;

    async function initMap() {
      if (!browser) return;

      try {
        // Dynamic import of Leaflet
        const leaflet = await import('leaflet');
        if (!mounted) return;

        L = leaflet.default;

        // Fix for default marker icon in Leaflet with bundlers
        delete (L.Icon.Default.prototype as any)._getIconUrl;
        L.Icon.Default.mergeOptions({
          iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
          iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
          shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png'
        });

        // Initialize map centered on US
        map = L.map(mapContainer, {
          center: [US_CENTER.lat, US_CENTER.lng],
          zoom: MAP_CONFIGS.masterMap.zoom,
          zoomControl: showZoomControl,
          scrollWheelZoom
        });

        // Add tile layer
        L.tileLayer(DEFAULT_TILE_LAYER.url, {
          attribution: DEFAULT_TILE_LAYER.attribution,
          maxZoom: DEFAULT_TILE_LAYER.maxZoom
        }).addTo(map);

        // Create layer group for territories
        territoriesLayer = L.layerGroup().addTo(map);

        // Render territories
        renderTerritories();

        isLoading = false;
      } catch (err) {
        console.error('Failed to initialize map:', err);
        loadError = 'Failed to load map';
        isLoading = false;
      }
    }

    initMap();

    return () => {
      mounted = false;
      cleanup();
    };
  });

  // Re-render territories when they change
  $effect(() => {
    if (map && L && territoriesLayer && territories) {
      renderTerritories();
    }
  });

  // Update selected territory highlight
  $effect(() => {
    if (territoryCircles.size > 0 && L) {
      updateSelectedHighlight();
    }
  });

  function renderTerritories(): void {
    if (!map || !L || !territoriesLayer) return;

    // Clear existing territories
    territoriesLayer.clearLayers();
    territoryCircles.clear();

    if (territories.length === 0) return;

    // Add each territory
    territories.forEach(territory => {
      addTerritory(territory);
    });

    // Fit bounds to show all territories
    fitToAllTerritories();
  }

  function addTerritory(territory: Territory): void {
    if (!map || !L || !territoriesLayer) return;

    const colors = getTerritoryColor(territory.status);
    const isSelected = territory.id === selectedTerritoryId;

    // Create circle
    const circle = L.circle([territory.centerLat, territory.centerLng], {
      color: isSelected ? TERRITORY_COLORS.selected.stroke : colors.stroke,
      fillColor: isSelected ? TERRITORY_COLORS.selected.fill : colors.fill,
      fillOpacity: isSelected ? TERRITORY_COLORS.selected.fillOpacity : colors.fillOpacity,
      opacity: isSelected ? TERRITORY_COLORS.selected.strokeOpacity : colors.strokeOpacity,
      radius: milesToMeters(territory.radiusMiles),
      weight: isSelected ? 3 : 2,
      interactive: true
    });

    // Create small marker at center
    const marker = L.circleMarker([territory.centerLat, territory.centerLng], {
      radius: 4,
      fillColor: isSelected ? TERRITORY_COLORS.selected.stroke : colors.stroke,
      fillOpacity: 1,
      color: '#ffffff',
      weight: 1
    });

    // Add popup if enabled
    if (showPopups) {
      const popupContent = createPopupContent(territory);
      circle.bindPopup(popupContent, { maxWidth: 300 });
      marker.bindPopup(popupContent, { maxWidth: 300 });
    }

    // Event handlers for circle
    circle.on('click', () => {
      dispatch('territoryClick', { territory });
    });

    circle.on('mouseover', () => {
      hoveredTerritoryId = territory.id;
      dispatch('territoryHover', { territory });
      highlightTerritory(territory.id, true);
    });

    circle.on('mouseout', () => {
      hoveredTerritoryId = null;
      dispatch('territoryHover', { territory: null });
      highlightTerritory(territory.id, false);
    });

    // Event handlers for marker
    marker.on('click', () => {
      dispatch('territoryClick', { territory });
    });

    marker.on('mouseover', () => {
      hoveredTerritoryId = territory.id;
      dispatch('territoryHover', { territory });
      highlightTerritory(territory.id, true);
    });

    marker.on('mouseout', () => {
      hoveredTerritoryId = null;
      dispatch('territoryHover', { territory: null });
      highlightTerritory(territory.id, false);
    });

    // Add to layer group
    territoriesLayer.addLayer(circle);
    territoriesLayer.addLayer(marker);

    // Store references
    territoryCircles.set(territory.id, { circle, marker });
  }

  function createPopupContent(territory: Territory): string {
    const statusLabel = territory.status.charAt(0).toUpperCase() + territory.status.slice(1);
    const location = territory.city && territory.state
      ? `${territory.city}, ${territory.state}`
      : '';

    let html = `
      <div class="territory-popup">
        <div style="font-weight: bold; font-size: 14px; margin-bottom: 4px;">${territory.name}</div>
    `;

    if (location) {
      html += `<div style="color: #6B7280; font-size: 12px; margin-bottom: 4px;">${location}</div>`;
    }

    html += `
        <div style="margin-bottom: 4px;">
          <span style="display: inline-block; padding: 2px 8px; border-radius: 9999px; font-size: 11px; font-weight: 500;
            background-color: ${getStatusBgColor(territory.status)}; color: ${getStatusTextColor(territory.status)};">
            ${statusLabel}
          </span>
        </div>
        <div style="font-size: 12px; color: #374151;">
          <div>Radius: ${territory.radiusMiles} miles</div>
    `;

    if (territory.population) {
      html += `<div>Population: ${territory.population.toLocaleString()}</div>`;
    }

    if (territory.monthlyBasePrice) {
      html += `<div>Base Price: $${territory.monthlyBasePrice.toLocaleString()}/mo</div>`;
    }

    if (territory.client) {
      html += `<div style="margin-top: 4px; padding-top: 4px; border-top: 1px solid #E5E7EB;">
        <span style="color: #6B7280;">Client:</span> ${territory.client.name}
      </div>`;
    }

    html += `</div></div>`;

    return html;
  }

  function getStatusBgColor(status: string): string {
    switch (status) {
      case 'locked': return '#FEE2E2';
      case 'available': return '#DCFCE7';
      case 'waitlist': return '#FEF3C7';
      default: return '#DBEAFE';
    }
  }

  function getStatusTextColor(status: string): string {
    switch (status) {
      case 'locked': return '#B91C1C';
      case 'available': return '#15803D';
      case 'waitlist': return '#A16207';
      default: return '#1D4ED8';
    }
  }

  function highlightTerritory(territoryId: string, highlight: boolean): void {
    const ref = territoryCircles.get(territoryId);
    if (!ref || !L) return;

    const territory = territories.find(t => t.id === territoryId);
    if (!territory) return;

    const isSelected = territory.id === selectedTerritoryId;
    const colors = isSelected
      ? TERRITORY_COLORS.selected
      : highlight
        ? TERRITORY_COLORS.hover
        : getTerritoryColor(territory.status);

    ref.circle.setStyle({
      color: colors.stroke,
      fillColor: colors.fill,
      fillOpacity: colors.fillOpacity,
      opacity: colors.strokeOpacity,
      weight: isSelected || highlight ? 3 : 2
    });

    ref.marker.setStyle({
      fillColor: colors.stroke
    });

    if (highlight || isSelected) {
      ref.circle.bringToFront();
      ref.marker.bringToFront();
    }
  }

  function updateSelectedHighlight(): void {
    territoryCircles.forEach((ref, id) => {
      const territory = territories.find(t => t.id === id);
      if (!territory) return;

      const isSelected = id === selectedTerritoryId;
      const isHovered = id === hoveredTerritoryId;
      const colors = isSelected
        ? TERRITORY_COLORS.selected
        : isHovered
          ? TERRITORY_COLORS.hover
          : getTerritoryColor(territory.status);

      ref.circle.setStyle({
        color: colors.stroke,
        fillColor: colors.fill,
        fillOpacity: colors.fillOpacity,
        opacity: colors.strokeOpacity,
        weight: isSelected || isHovered ? 3 : 2
      });

      ref.marker.setStyle({
        fillColor: colors.stroke
      });

      if (isSelected) {
        ref.circle.bringToFront();
        ref.marker.bringToFront();
      }
    });
  }

  function fitToAllTerritories(): void {
    if (!map || !L || territories.length === 0) return;

    // Calculate combined bounds
    let minLat = Infinity;
    let maxLat = -Infinity;
    let minLng = Infinity;
    let maxLng = -Infinity;

    territories.forEach(territory => {
      const bounds = calculateCircleBounds(
        territory.centerLat,
        territory.centerLng,
        territory.radiusMiles
      );
      minLat = Math.min(minLat, bounds.south);
      maxLat = Math.max(maxLat, bounds.north);
      minLng = Math.min(minLng, bounds.west);
      maxLng = Math.max(maxLng, bounds.east);
    });

    map.fitBounds([
      [minLat, minLng],
      [maxLat, maxLng]
    ], { padding: [50, 50] });
  }

  function cleanup(): void {
    if (territoriesLayer) {
      territoriesLayer.clearLayers();
      territoriesLayer = null;
    }
    territoryCircles.clear();
    if (map) {
      map.remove();
      map = null;
    }
  }

  onDestroy(() => {
    cleanup();
  });

  /**
   * Force a map resize (useful when container size changes)
   */
  export function invalidateSize(): void {
    if (map) {
      map.invalidateSize();
    }
  }

  /**
   * Zoom to a specific territory
   */
  export function zoomToTerritory(territoryId: string): void {
    const territory = territories.find(t => t.id === territoryId);
    if (!territory || !map || !L) return;

    const bounds = calculateCircleBounds(
      territory.centerLat,
      territory.centerLng,
      territory.radiusMiles
    );

    map.fitBounds([
      [bounds.south, bounds.west],
      [bounds.north, bounds.east]
    ], { padding: [50, 50] });
  }

  /**
   * Reset view to show all territories
   */
  export function resetView(): void {
    fitToAllTerritories();
  }

  /**
   * Open popup for a specific territory
   */
  export function openTerritoryPopup(territoryId: string): void {
    const ref = territoryCircles.get(territoryId);
    if (ref) {
      ref.circle.openPopup();
    }
  }

  /**
   * Get the Leaflet map instance
   */
  export function getMap(): LeafletMap | null {
    return map;
  }
</script>

<svelte:head>
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
</svelte:head>

<div
  bind:this={mapContainer}
  class="relative w-full rounded-lg overflow-hidden {className}"
  style="height: {height};"
>
  {#if isLoading}
    <div class="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-700 z-10">
      <div class="flex flex-col items-center gap-2">
        <div class="h-8 w-8 animate-spin rounded-full border-4 border-primary-600 border-t-transparent"></div>
        <span class="text-sm text-gray-500 dark:text-gray-400">Loading map...</span>
      </div>
    </div>
  {/if}

  {#if loadError}
    <div class="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-700 z-10">
      <div class="flex flex-col items-center gap-2 text-center">
        <svg class="h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
        </svg>
        <span class="text-sm text-gray-500 dark:text-gray-400">{loadError}</span>
      </div>
    </div>
  {/if}

  {#if !isLoading && !loadError && territories.length === 0}
    <div class="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
      <div class="bg-white/90 dark:bg-gray-800/90 rounded-lg px-4 py-3 shadow">
        <span class="text-sm text-gray-500 dark:text-gray-400">No territories to display</span>
      </div>
    </div>
  {/if}
</div>

<!-- Legend -->
<div class="mt-2 flex flex-wrap gap-4 text-sm">
  <div class="flex items-center gap-2">
    <span class="h-3 w-3 rounded-full" style="background-color: {TERRITORY_COLORS.locked.fill}; border: 2px solid {TERRITORY_COLORS.locked.stroke};"></span>
    <span class="text-gray-600 dark:text-gray-400">Locked</span>
  </div>
  <div class="flex items-center gap-2">
    <span class="h-3 w-3 rounded-full" style="background-color: {TERRITORY_COLORS.available.fill}; border: 2px solid {TERRITORY_COLORS.available.stroke};"></span>
    <span class="text-gray-600 dark:text-gray-400">Available</span>
  </div>
  <div class="flex items-center gap-2">
    <span class="h-3 w-3 rounded-full" style="background-color: {TERRITORY_COLORS.waitlist.fill}; border: 2px solid {TERRITORY_COLORS.waitlist.stroke};"></span>
    <span class="text-gray-600 dark:text-gray-400">Waitlist</span>
  </div>
</div>
