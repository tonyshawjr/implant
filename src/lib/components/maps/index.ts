/**
 * Maps Components
 * Leaflet-based map components for territory visualization
 */

// Components
export { default as TerritoryMap } from './TerritoryMap.svelte';
export { default as MasterTerritoryMap } from './MasterTerritoryMap.svelte';
export { default as TerritoryCircle } from './TerritoryCircle.svelte';
export { default as LocationSearch } from './LocationSearch.svelte';

// Utilities and Constants
export {
  // Color constants
  TERRITORY_COLORS,
  PRIMARY_TERRITORY_COLOR,

  // Tile layer configurations
  TILE_LAYERS,
  DEFAULT_TILE_LAYER,

  // Map options
  DEFAULT_MAP_OPTIONS,
  MAP_CONFIGS,
  CIRCLE_DEFAULTS,
  MARKER_ICON_OPTIONS,

  // Geographic constants
  US_CENTER,
  MILES_TO_METERS,
  MILES_PER_DEGREE_LAT,

  // Utility functions
  getMilesPerDegreeLng,
  getTerritoryColor,
  milesToMeters,
  calculateCircleBounds,

  // Types
  type TerritoryStatus,
  type TileLayerKey,
  type MapConfigKey
} from './map-styles';
