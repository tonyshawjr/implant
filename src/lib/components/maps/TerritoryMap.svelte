<script lang="ts">
  /**
   * TerritoryMap.svelte
   * Displays a single territory with center marker and radius circle
   * Uses OpenStreetMap tiles and handles SSR by dynamically importing Leaflet
   */

  import { onMount, onDestroy } from 'svelte';
  import { browser } from '$app/environment';
  import {
    DEFAULT_TILE_LAYER,
    PRIMARY_TERRITORY_COLOR,
    MAP_CONFIGS,
    milesToMeters,
    calculateCircleBounds
  } from './map-styles';
  import type { Map as LeafletMap, Marker, Circle } from 'leaflet';

  interface Props {
    /** Center latitude of the territory */
    centerLat: number;
    /** Center longitude of the territory */
    centerLng: number;
    /** Radius of the territory in miles */
    radiusMiles: number;
    /** Name of the territory (shown in marker popup) */
    territoryName: string;
    /** Optional subtitle for the popup (e.g., "City, State") */
    territorySubtitle?: string;
    /** Height of the map container */
    height?: string;
    /** Whether to show zoom controls */
    showZoomControl?: boolean;
    /** Whether to allow scroll wheel zoom */
    scrollWheelZoom?: boolean;
    /** Fill color for the territory circle */
    fillColor?: string;
    /** Stroke color for the territory circle */
    strokeColor?: string;
    /** Fill opacity for the territory circle */
    fillOpacity?: number;
    /** Custom class for the container */
    class?: string;
  }

  let {
    centerLat,
    centerLng,
    radiusMiles,
    territoryName,
    territorySubtitle = '',
    height = '400px',
    showZoomControl = true,
    scrollWheelZoom = true,
    fillColor = PRIMARY_TERRITORY_COLOR.fill,
    strokeColor = PRIMARY_TERRITORY_COLOR.stroke,
    fillOpacity = PRIMARY_TERRITORY_COLOR.fillOpacity,
    class: className = ''
  }: Props = $props();

  let mapContainer: HTMLDivElement;
  let map: LeafletMap | null = $state(null);
  let L: typeof import('leaflet') | null = $state(null);
  let marker: Marker | null = $state(null);
  let circle: Circle | null = $state(null);
  let isLoading = $state(true);
  let loadError = $state<string | null>(null);

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

        // Initialize map
        map = L.map(mapContainer, {
          center: [centerLat, centerLng],
          zoom: MAP_CONFIGS.singleTerritory.zoom,
          zoomControl: showZoomControl,
          scrollWheelZoom
        });

        // Add tile layer
        L.tileLayer(DEFAULT_TILE_LAYER.url, {
          attribution: DEFAULT_TILE_LAYER.attribution,
          maxZoom: DEFAULT_TILE_LAYER.maxZoom
        }).addTo(map);

        // Add territory circle
        circle = L.circle([centerLat, centerLng], {
          color: strokeColor,
          fillColor: fillColor,
          fillOpacity: fillOpacity,
          opacity: PRIMARY_TERRITORY_COLOR.strokeOpacity,
          radius: milesToMeters(radiusMiles),
          weight: 2
        }).addTo(map);

        // Add center marker
        marker = L.marker([centerLat, centerLng]).addTo(map);

        // Create popup content
        const popupContent = territorySubtitle
          ? `<b>${territoryName}</b><br>${territorySubtitle}`
          : `<b>${territoryName}</b>`;
        marker.bindPopup(popupContent);

        // Fit map to territory bounds
        fitToBounds();

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

  // Update circle when props change
  $effect(() => {
    if (circle && L) {
      circle.setLatLng([centerLat, centerLng]);
      circle.setRadius(milesToMeters(radiusMiles));
      circle.setStyle({
        color: strokeColor,
        fillColor: fillColor,
        fillOpacity: fillOpacity
      });
    }
  });

  // Update marker when coordinates change
  $effect(() => {
    if (marker && L) {
      marker.setLatLng([centerLat, centerLng]);
      const popupContent = territorySubtitle
        ? `<b>${territoryName}</b><br>${territorySubtitle}`
        : `<b>${territoryName}</b>`;
      marker.setPopupContent(popupContent);
    }
  });

  // Fit bounds when territory changes
  $effect(() => {
    if (map && L && centerLat && centerLng && radiusMiles) {
      fitToBounds();
    }
  });

  function fitToBounds(): void {
    if (!map || !L) return;

    const bounds = calculateCircleBounds(centerLat, centerLng, radiusMiles);
    map.fitBounds([
      [bounds.south, bounds.west],
      [bounds.north, bounds.east]
    ], { padding: [20, 20] });
  }

  function cleanup(): void {
    if (marker) {
      marker.remove();
      marker = null;
    }
    if (circle) {
      circle.remove();
      circle = null;
    }
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
   * Open the marker popup
   */
  export function openPopup(): void {
    if (marker) {
      marker.openPopup();
    }
  }

  /**
   * Close the marker popup
   */
  export function closePopup(): void {
    if (marker) {
      marker.closePopup();
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
    <div class="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-700">
      <div class="flex flex-col items-center gap-2">
        <div class="h-8 w-8 animate-spin rounded-full border-4 border-primary-600 border-t-transparent"></div>
        <span class="text-sm text-gray-500 dark:text-gray-400">Loading map...</span>
      </div>
    </div>
  {/if}

  {#if loadError}
    <div class="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-700">
      <div class="flex flex-col items-center gap-2 text-center">
        <svg class="h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
        </svg>
        <span class="text-sm text-gray-500 dark:text-gray-400">{loadError}</span>
      </div>
    </div>
  {/if}
</div>
