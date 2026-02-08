/**
 * Map Styles and Configuration
 * Defines color constants, tile layer URLs, and default map options for Leaflet maps
 */

// Territory status colors
export const TERRITORY_COLORS = {
  locked: {
    fill: '#EF4444', // red-500
    stroke: '#B91C1C', // red-700
    fillOpacity: 0.2,
    strokeOpacity: 0.8
  },
  available: {
    fill: '#22C55E', // green-500
    stroke: '#15803D', // green-700
    fillOpacity: 0.2,
    strokeOpacity: 0.8
  },
  waitlist: {
    fill: '#EAB308', // yellow-500
    stroke: '#A16207', // yellow-700
    fillOpacity: 0.2,
    strokeOpacity: 0.8
  },
  pending: {
    fill: '#3B82F6', // blue-500
    stroke: '#1D4ED8', // blue-700
    fillOpacity: 0.2,
    strokeOpacity: 0.8
  },
  selected: {
    fill: '#8B5CF6', // violet-500
    stroke: '#6D28D9', // violet-700
    fillOpacity: 0.3,
    strokeOpacity: 1
  },
  hover: {
    fill: '#6366F1', // indigo-500
    stroke: '#4338CA', // indigo-700
    fillOpacity: 0.25,
    strokeOpacity: 0.9
  }
} as const;

// Primary brand color for single territory views
export const PRIMARY_TERRITORY_COLOR = {
  fill: '#3B82F6', // blue-500
  stroke: '#1D4ED8', // blue-700
  fillOpacity: 0.15,
  strokeOpacity: 0.8
};

// Tile layer configurations
export const TILE_LAYERS = {
  openStreetMap: {
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 19
  },
  openStreetMapHot: {
    url: 'https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, Tiles style by <a href="https://www.hotosm.org/">HOT</a>',
    maxZoom: 19
  },
  cartoPositron: {
    url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
    maxZoom: 20,
    subdomains: 'abcd'
  },
  cartoDarkMatter: {
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
    maxZoom: 20,
    subdomains: 'abcd'
  },
  esriWorldStreetMap: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri &mdash; Source: Esri, DeLorme, NAVTEQ, USGS, Intermap, iPC, NRCAN, Esri Japan, METI, Esri China (Hong Kong), Esri (Thailand), TomTom, 2012',
    maxZoom: 18
  },
  esriWorldImagery: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
    maxZoom: 18
  }
} as const;

// Default tile layer
export const DEFAULT_TILE_LAYER = TILE_LAYERS.openStreetMap;

// Default map options
export const DEFAULT_MAP_OPTIONS = {
  zoom: 10,
  minZoom: 3,
  maxZoom: 18,
  zoomControl: true,
  scrollWheelZoom: true,
  doubleClickZoom: true,
  dragging: true
} as const;

// Map configuration for different use cases
export const MAP_CONFIGS = {
  singleTerritory: {
    zoom: 10,
    zoomControl: true,
    scrollWheelZoom: true,
    doubleClickZoom: true,
    dragging: true
  },
  masterMap: {
    zoom: 5,
    zoomControl: true,
    scrollWheelZoom: true,
    doubleClickZoom: true,
    dragging: true
  },
  preview: {
    zoom: 8,
    zoomControl: false,
    scrollWheelZoom: false,
    doubleClickZoom: false,
    dragging: false
  }
} as const;

// Circle style defaults
export const CIRCLE_DEFAULTS = {
  weight: 2,
  fillOpacity: 0.15,
  opacity: 0.8
} as const;

// Marker icon configuration (using default Leaflet markers)
export const MARKER_ICON_OPTIONS = {
  iconSize: [25, 41] as [number, number],
  iconAnchor: [12, 41] as [number, number],
  popupAnchor: [1, -34] as [number, number],
  shadowSize: [41, 41] as [number, number]
};

// US center coordinates (for default map center)
export const US_CENTER = {
  lat: 39.8283,
  lng: -98.5795
};

// Conversion constants
export const MILES_TO_METERS = 1609.34;
export const MILES_PER_DEGREE_LAT = 69;

/**
 * Get approximate miles per degree of longitude at a given latitude
 */
export function getMilesPerDegreeLng(lat: number): number {
  return MILES_PER_DEGREE_LAT * Math.cos(lat * Math.PI / 180);
}

// Territory color type
export type TerritoryColorConfig = {
  fill: string;
  stroke: string;
  fillOpacity: number;
  strokeOpacity: number;
};

/**
 * Get color configuration for a territory status
 */
export function getTerritoryColor(status: string): TerritoryColorConfig {
  const colors = TERRITORY_COLORS[status as keyof typeof TERRITORY_COLORS];
  if (colors) {
    return {
      fill: colors.fill,
      stroke: colors.stroke,
      fillOpacity: colors.fillOpacity,
      strokeOpacity: colors.strokeOpacity
    };
  }
  return {
    fill: TERRITORY_COLORS.available.fill,
    stroke: TERRITORY_COLORS.available.stroke,
    fillOpacity: TERRITORY_COLORS.available.fillOpacity,
    strokeOpacity: TERRITORY_COLORS.available.strokeOpacity
  };
}

/**
 * Convert miles to meters
 */
export function milesToMeters(miles: number): number {
  return miles * MILES_TO_METERS;
}

/**
 * Calculate approximate bounds for a circle on the map
 */
export function calculateCircleBounds(
  centerLat: number,
  centerLng: number,
  radiusMiles: number
): { south: number; north: number; west: number; east: number } {
  const latOffset = radiusMiles / MILES_PER_DEGREE_LAT;
  const lngOffset = radiusMiles / getMilesPerDegreeLng(centerLat);

  return {
    south: centerLat - latOffset,
    north: centerLat + latOffset,
    west: centerLng - lngOffset,
    east: centerLng + lngOffset
  };
}

// Type exports
export type TerritoryStatus = keyof typeof TERRITORY_COLORS;
export type TileLayerKey = keyof typeof TILE_LAYERS;
export type MapConfigKey = keyof typeof MAP_CONFIGS;
