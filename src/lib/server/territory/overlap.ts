/**
 * Territory Overlap Utilities
 * Functions for checking if territories overlap with each other
 */

// Earth's radius in miles
const EARTH_RADIUS_MILES = 3958.8;

// Degrees to radians conversion
const DEG_TO_RAD = Math.PI / 180;

export interface TerritoryLocation {
  id: string;
  name: string;
  centerLat: number;
  centerLng: number;
  radiusMiles: number;
  status?: string;
  city?: string;
  state?: string;
}

export interface OverlapResult {
  territory: TerritoryLocation;
  distance: number;
  overlapMiles: number;
  overlapPercentage: number;
}

/**
 * Calculate the distance between two points using the Haversine formula
 *
 * @param lat1 - Latitude of first point
 * @param lng1 - Longitude of first point
 * @param lat2 - Latitude of second point
 * @param lng2 - Longitude of second point
 * @returns Distance in miles
 */
export function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const dLat = (lat2 - lat1) * DEG_TO_RAD;
  const dLng = (lng2 - lng1) * DEG_TO_RAD;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * DEG_TO_RAD) * Math.cos(lat2 * DEG_TO_RAD) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return EARTH_RADIUS_MILES * c;
}

/**
 * Check if two territories overlap
 *
 * @param territory1 - First territory
 * @param territory2 - Second territory
 * @returns true if territories overlap, false otherwise
 */
export function checkTerritoryOverlap(
  territory1: TerritoryLocation,
  territory2: TerritoryLocation
): boolean {
  const distance = calculateDistance(
    territory1.centerLat,
    territory1.centerLng,
    territory2.centerLat,
    territory2.centerLng
  );

  // Territories overlap if the distance between centers is less than the sum of radii
  return distance < (territory1.radiusMiles + territory2.radiusMiles);
}

/**
 * Get detailed overlap information between two territories
 *
 * @param territory1 - First territory
 * @param territory2 - Second territory
 * @returns Overlap details including distance and overlap amount
 */
export function getOverlapDetails(
  territory1: TerritoryLocation,
  territory2: TerritoryLocation
): { overlaps: boolean; distance: number; overlapMiles: number; overlapPercentage: number } {
  const distance = calculateDistance(
    territory1.centerLat,
    territory1.centerLng,
    territory2.centerLat,
    territory2.centerLng
  );

  const combinedRadii = territory1.radiusMiles + territory2.radiusMiles;
  const overlaps = distance < combinedRadii;

  // Calculate how much they overlap
  const overlapMiles = overlaps ? combinedRadii - distance : 0;

  // Calculate overlap as percentage of the smaller territory
  const smallerRadius = Math.min(territory1.radiusMiles, territory2.radiusMiles);
  const overlapPercentage = overlaps ? Math.min((overlapMiles / (smallerRadius * 2)) * 100, 100) : 0;

  return {
    overlaps,
    distance,
    overlapMiles,
    overlapPercentage
  };
}

/**
 * Find all territories that overlap with a new territory
 *
 * @param newTerritory - The new territory to check
 * @param existingTerritories - Array of existing territories
 * @param options - Optional filtering options
 * @returns Array of overlapping territories with overlap details
 */
export function findOverlappingTerritories(
  newTerritory: Omit<TerritoryLocation, 'id' | 'name'> & { id?: string; name?: string },
  existingTerritories: TerritoryLocation[],
  options: {
    excludeId?: string;
    minOverlapPercentage?: number;
    statusFilter?: string[];
  } = {}
): OverlapResult[] {
  const { excludeId, minOverlapPercentage = 0, statusFilter } = options;

  const overlapping: OverlapResult[] = [];

  for (const existing of existingTerritories) {
    // Skip the same territory (for update operations)
    if (excludeId && existing.id === excludeId) {
      continue;
    }

    // Apply status filter if provided
    if (statusFilter && statusFilter.length > 0 && existing.status) {
      if (!statusFilter.includes(existing.status)) {
        continue;
      }
    }

    const details = getOverlapDetails(
      {
        id: newTerritory.id || 'new',
        name: newTerritory.name || 'New Territory',
        ...newTerritory
      },
      existing
    );

    if (details.overlaps && details.overlapPercentage >= minOverlapPercentage) {
      overlapping.push({
        territory: existing,
        distance: details.distance,
        overlapMiles: details.overlapMiles,
        overlapPercentage: details.overlapPercentage
      });
    }
  }

  // Sort by overlap percentage (most overlap first)
  overlapping.sort((a, b) => b.overlapPercentage - a.overlapPercentage);

  return overlapping;
}

/**
 * Check if a territory would be valid (no overlaps with locked territories)
 *
 * @param newTerritory - The new territory to validate
 * @param existingTerritories - Array of existing territories
 * @param options - Validation options
 * @returns Validation result with any conflicts
 */
export function validateTerritoryPlacement(
  newTerritory: Omit<TerritoryLocation, 'id' | 'name'> & { id?: string; name?: string },
  existingTerritories: TerritoryLocation[],
  options: {
    excludeId?: string;
    allowWaitlistOverlap?: boolean;
    maxAllowedOverlapPercentage?: number;
  } = {}
): { valid: boolean; conflicts: OverlapResult[]; warnings: OverlapResult[] } {
  const { excludeId, allowWaitlistOverlap = true, maxAllowedOverlapPercentage = 0 } = options;

  const conflicts: OverlapResult[] = [];
  const warnings: OverlapResult[] = [];

  // Find overlaps with locked territories (always a conflict)
  const lockedOverlaps = findOverlappingTerritories(newTerritory, existingTerritories, {
    excludeId,
    statusFilter: ['locked'],
    minOverlapPercentage: maxAllowedOverlapPercentage
  });
  conflicts.push(...lockedOverlaps);

  // Find overlaps with available/waitlist territories (warning only if allowed)
  const otherOverlaps = findOverlappingTerritories(newTerritory, existingTerritories, {
    excludeId,
    statusFilter: ['available', 'waitlist'],
    minOverlapPercentage: maxAllowedOverlapPercentage
  });

  if (allowWaitlistOverlap) {
    warnings.push(...otherOverlaps);
  } else {
    conflicts.push(...otherOverlaps);
  }

  return {
    valid: conflicts.length === 0,
    conflicts,
    warnings
  };
}

/**
 * Calculate the approximate area of a territory in square miles
 *
 * @param radiusMiles - Radius in miles
 * @returns Area in square miles
 */
export function calculateTerritoryArea(radiusMiles: number): number {
  return Math.PI * radiusMiles * radiusMiles;
}

/**
 * Calculate the approximate overlap area between two overlapping circles
 * This is an approximation using the lens formula
 *
 * @param radius1 - Radius of first circle in miles
 * @param radius2 - Radius of second circle in miles
 * @param distance - Distance between centers in miles
 * @returns Approximate overlap area in square miles
 */
export function calculateOverlapArea(
  radius1: number,
  radius2: number,
  distance: number
): number {
  // If circles don't overlap
  if (distance >= radius1 + radius2) {
    return 0;
  }

  // If one circle is completely inside the other
  if (distance <= Math.abs(radius1 - radius2)) {
    const smallerRadius = Math.min(radius1, radius2);
    return Math.PI * smallerRadius * smallerRadius;
  }

  // Lens formula for overlapping circles
  const r1Sq = radius1 * radius1;
  const r2Sq = radius2 * radius2;
  const dSq = distance * distance;

  const part1 = r1Sq * Math.acos((dSq + r1Sq - r2Sq) / (2 * distance * radius1));
  const part2 = r2Sq * Math.acos((dSq + r2Sq - r1Sq) / (2 * distance * radius2));
  const part3 = 0.5 * Math.sqrt(
    (-distance + radius1 + radius2) *
    (distance + radius1 - radius2) *
    (distance - radius1 + radius2) *
    (distance + radius1 + radius2)
  );

  return part1 + part2 - part3;
}

/**
 * Get a formatted string describing the overlap between territories
 */
export function formatOverlapDescription(overlap: OverlapResult): string {
  if (overlap.overlapPercentage >= 100) {
    return `Completely overlaps with ${overlap.territory.name}`;
  }
  if (overlap.overlapPercentage >= 50) {
    return `Significant overlap (${overlap.overlapPercentage.toFixed(0)}%) with ${overlap.territory.name}`;
  }
  if (overlap.overlapPercentage >= 25) {
    return `Moderate overlap (${overlap.overlapPercentage.toFixed(0)}%) with ${overlap.territory.name}`;
  }
  return `Minor overlap (${overlap.overlapPercentage.toFixed(0)}%) with ${overlap.territory.name}`;
}
