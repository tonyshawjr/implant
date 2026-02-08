/**
 * Territory Utilities
 * Server-side utilities for territory management
 */

// Overlap checking utilities
export {
  calculateDistance,
  checkTerritoryOverlap,
  getOverlapDetails,
  findOverlappingTerritories,
  validateTerritoryPlacement,
  calculateTerritoryArea,
  calculateOverlapArea,
  formatOverlapDescription,
  type TerritoryLocation,
  type OverlapResult
} from './overlap';

// Demographics estimation utilities
export {
  estimateDemographics,
  getDetailedDemographics,
  estimateCompetitorCount,
  recommendTerritoryTier,
  type DemographicEstimate,
  type DetailedDemographics
} from './demographics';
