<script lang="ts">
  /**
   * TerritoryCircle.svelte
   * Reusable circle overlay component for Leaflet maps
   * Must be used within a parent component that has initialized the Leaflet map
   */

  import { onMount, onDestroy } from 'svelte';
  import { CIRCLE_DEFAULTS, milesToMeters, getTerritoryColor } from './map-styles';
  import type { Map as LeafletMap, Circle } from 'leaflet';

  interface Props {
    /** Leaflet map instance */
    map: LeafletMap | null;
    /** Leaflet library reference */
    L: typeof import('leaflet') | null;
    /** Center latitude */
    lat: number;
    /** Center longitude */
    lng: number;
    /** Radius in miles */
    radiusMiles: number;
    /** Fill color (overrides status-based color) */
    color?: string;
    /** Stroke color (defaults to slightly darker fill) */
    strokeColor?: string;
    /** Fill opacity (0-1) */
    fillOpacity?: number;
    /** Stroke opacity (0-1) */
    strokeOpacity?: number;
    /** Territory status (used to determine color if color not provided) */
    status?: 'locked' | 'available' | 'waitlist' | 'pending' | 'selected' | 'hover';
    /** Stroke weight in pixels */
    weight?: number;
    /** Whether the circle is interactive */
    interactive?: boolean;
    /** Click handler */
    onclick?: () => void;
    /** Mouse enter handler */
    onmouseenter?: () => void;
    /** Mouse leave handler */
    onmouseleave?: () => void;
  }

  let {
    map,
    L,
    lat,
    lng,
    radiusMiles,
    color,
    strokeColor,
    fillOpacity,
    strokeOpacity,
    status = 'available',
    weight = CIRCLE_DEFAULTS.weight,
    interactive = true,
    onclick,
    onmouseenter,
    onmouseleave
  }: Props = $props();

  let circle: Circle | null = $state(null);

  // Get colors based on status or explicit props
  const statusColors = $derived(getTerritoryColor(status));
  const effectiveFillColor = $derived(color || statusColors.fill);
  const effectiveStrokeColor = $derived(strokeColor || statusColors.stroke);
  const effectiveFillOpacity = $derived(fillOpacity ?? statusColors.fillOpacity);
  const effectiveStrokeOpacity = $derived(strokeOpacity ?? statusColors.strokeOpacity);

  // Create or update circle when map/L is available
  $effect(() => {
    if (map && L && lat && lng && radiusMiles) {
      // Remove existing circle if present
      if (circle) {
        circle.remove();
      }

      // Create new circle
      circle = L.circle([lat, lng], {
        color: effectiveStrokeColor,
        fillColor: effectiveFillColor,
        fillOpacity: effectiveFillOpacity,
        opacity: effectiveStrokeOpacity,
        radius: milesToMeters(radiusMiles),
        weight,
        interactive
      });

      // Add event listeners
      if (onclick) {
        circle.on('click', onclick);
      }
      if (onmouseenter) {
        circle.on('mouseover', onmouseenter);
      }
      if (onmouseleave) {
        circle.on('mouseout', onmouseleave);
      }

      // Add to map
      circle.addTo(map);
    }
  });

  // Update circle style when colors change
  $effect(() => {
    if (circle) {
      circle.setStyle({
        color: effectiveStrokeColor,
        fillColor: effectiveFillColor,
        fillOpacity: effectiveFillOpacity,
        opacity: effectiveStrokeOpacity,
        weight
      });
    }
  });

  // Update circle position/radius when coordinates change
  $effect(() => {
    if (circle && L && lat && lng) {
      circle.setLatLng([lat, lng]);
    }
  });

  $effect(() => {
    if (circle && radiusMiles) {
      circle.setRadius(milesToMeters(radiusMiles));
    }
  });

  // Cleanup on unmount
  onDestroy(() => {
    if (circle) {
      circle.remove();
      circle = null;
    }
  });

  /**
   * Get the Leaflet circle instance
   */
  export function getCircle(): Circle | null {
    return circle;
  }

  /**
   * Bring circle to front
   */
  export function bringToFront(): void {
    if (circle) {
      circle.bringToFront();
    }
  }

  /**
   * Bring circle to back
   */
  export function bringToBack(): void {
    if (circle) {
      circle.bringToBack();
    }
  }
</script>

<!-- This component doesn't render any DOM - it only manages Leaflet circle layer -->
