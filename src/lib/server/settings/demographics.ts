/**
 * State Demographics Service
 *
 * Provides database-backed state demographic data for territory calculations.
 * Reads from the StateDemographics table which stores multipliers and offsets
 * for adjusting demographic estimates by state.
 *
 * Features:
 * - In-memory caching for all 50 states + DC
 * - Sensible defaults when state not found in database
 * - Auto-refresh capability for cache invalidation
 */

import { prisma } from '$lib/server/db';
import type { StateDemographics as PrismaStateDemographics } from '@prisma/client';

// ============================================================================
// Types
// ============================================================================

export interface StateDemographics {
  id: string;
  stateCode: string;
  stateName: string;
  populationMultiplier: number;
  incomeMultiplier: number;
  ageOffset: number;
  updatedAt: Date;
}

export type StateDemographicsUpdate = Partial<
  Pick<StateDemographics, 'stateName' | 'populationMultiplier' | 'incomeMultiplier' | 'ageOffset'>
>;

// ============================================================================
// Default Values
// ============================================================================

const DEFAULT_POPULATION_MULTIPLIER = 1.0;
const DEFAULT_INCOME_MULTIPLIER = 1.0;
const DEFAULT_AGE_OFFSET = 0;

// Cache configuration
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

// ============================================================================
// Cache Implementation
// ============================================================================

interface CacheEntry {
  data: Map<string, StateDemographics>;
  loadedAt: number;
}

let demographicsCache: CacheEntry | null = null;

/**
 * Convert Prisma model to our interface (handles Float to number conversion)
 */
function toStateDemographics(record: PrismaStateDemographics): StateDemographics {
  return {
    id: record.id,
    stateCode: record.stateCode,
    stateName: record.stateName,
    populationMultiplier: record.populationMultiplier,
    incomeMultiplier: record.incomeMultiplier,
    ageOffset: record.ageOffset,
    updatedAt: record.updatedAt
  };
}

/**
 * Load all state demographics into cache
 */
async function loadCache(): Promise<Map<string, StateDemographics>> {
  const records = await prisma.stateDemographics.findMany({
    orderBy: { stateCode: 'asc' }
  });

  const dataMap = new Map<string, StateDemographics>();
  for (const record of records) {
    const demographics = toStateDemographics(record);
    dataMap.set(demographics.stateCode.toUpperCase(), demographics);
  }

  demographicsCache = {
    data: dataMap,
    loadedAt: Date.now()
  };

  return dataMap;
}

/**
 * Get cached data, refreshing if stale or not loaded
 */
async function getCachedData(): Promise<Map<string, StateDemographics>> {
  const now = Date.now();

  // Check if cache is valid
  if (demographicsCache && (now - demographicsCache.loadedAt) < CACHE_TTL_MS) {
    return demographicsCache.data;
  }

  // Reload cache
  return loadCache();
}

/**
 * Invalidate the cache, forcing a reload on next access
 */
export function invalidateCache(): void {
  demographicsCache = null;
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Get demographics data for a specific state
 *
 * @param stateCode - Two-letter state code (e.g., 'CA', 'NY')
 * @returns StateDemographics object or null if not found
 */
export async function getStateDemographics(
  stateCode: string
): Promise<StateDemographics | null> {
  const normalizedCode = stateCode.toUpperCase().trim();

  // Try cache first
  const cache = await getCachedData();
  const cached = cache.get(normalizedCode);

  if (cached) {
    return cached;
  }

  // Fall back to direct database query (handles case where cache might be stale)
  const record = await prisma.stateDemographics.findUnique({
    where: { stateCode: normalizedCode }
  });

  if (record) {
    const demographics = toStateDemographics(record);
    // Update cache with this entry
    cache.set(normalizedCode, demographics);
    return demographics;
  }

  return null;
}

/**
 * Get demographics data for all states
 *
 * @returns Array of all StateDemographics records
 */
export async function getAllStateDemographics(): Promise<StateDemographics[]> {
  const cache = await getCachedData();
  return Array.from(cache.values()).sort((a, b) =>
    a.stateCode.localeCompare(b.stateCode)
  );
}

/**
 * Update demographics data for a state
 *
 * @param stateCode - Two-letter state code
 * @param data - Partial update data
 * @returns Updated StateDemographics object
 * @throws Error if state not found
 */
export async function updateStateDemographics(
  stateCode: string,
  data: StateDemographicsUpdate
): Promise<StateDemographics> {
  const normalizedCode = stateCode.toUpperCase().trim();

  // Validate the state exists
  const existing = await prisma.stateDemographics.findUnique({
    where: { stateCode: normalizedCode }
  });

  if (!existing) {
    throw new Error(`State demographics not found for state code: ${normalizedCode}`);
  }

  // Build update data
  const updateData: {
    stateName?: string;
    populationMultiplier?: number;
    incomeMultiplier?: number;
    ageOffset?: number;
  } = {};

  if (data.stateName !== undefined) {
    updateData.stateName = data.stateName;
  }
  if (data.populationMultiplier !== undefined) {
    updateData.populationMultiplier = data.populationMultiplier;
  }
  if (data.incomeMultiplier !== undefined) {
    updateData.incomeMultiplier = data.incomeMultiplier;
  }
  if (data.ageOffset !== undefined) {
    updateData.ageOffset = data.ageOffset;
  }

  const updated = await prisma.stateDemographics.update({
    where: { stateCode: normalizedCode },
    data: updateData
  });

  // Invalidate cache to ensure fresh data
  invalidateCache();

  return toStateDemographics(updated);
}

/**
 * Get population multiplier for a state
 * Returns default value (1.0) if state not found
 *
 * @param stateCode - Two-letter state code
 * @returns Population multiplier (default: 1.0)
 */
export async function getPopulationMultiplier(stateCode: string): Promise<number> {
  const demographics = await getStateDemographics(stateCode);
  return demographics?.populationMultiplier ?? DEFAULT_POPULATION_MULTIPLIER;
}

/**
 * Get income multiplier for a state
 * Returns default value (1.0) if state not found
 *
 * @param stateCode - Two-letter state code
 * @returns Income multiplier (default: 1.0)
 */
export async function getIncomeMultiplier(stateCode: string): Promise<number> {
  const demographics = await getStateDemographics(stateCode);
  return demographics?.incomeMultiplier ?? DEFAULT_INCOME_MULTIPLIER;
}

/**
 * Get age offset for a state
 * Returns default value (0) if state not found
 *
 * @param stateCode - Two-letter state code
 * @returns Age offset in years (default: 0)
 */
export async function getAgeOffset(stateCode: string): Promise<number> {
  const demographics = await getStateDemographics(stateCode);
  return demographics?.ageOffset ?? DEFAULT_AGE_OFFSET;
}

/**
 * Get all demographic modifiers for a state in a single call
 * Returns default values if state not found
 *
 * @param stateCode - Two-letter state code
 * @returns Object with populationMultiplier, incomeMultiplier, and ageOffset
 */
export async function getStateModifiers(stateCode: string): Promise<{
  populationMultiplier: number;
  incomeMultiplier: number;
  ageOffset: number;
}> {
  const demographics = await getStateDemographics(stateCode);

  return {
    populationMultiplier: demographics?.populationMultiplier ?? DEFAULT_POPULATION_MULTIPLIER,
    incomeMultiplier: demographics?.incomeMultiplier ?? DEFAULT_INCOME_MULTIPLIER,
    ageOffset: demographics?.ageOffset ?? DEFAULT_AGE_OFFSET
  };
}

/**
 * Check if a state exists in the demographics table
 *
 * @param stateCode - Two-letter state code
 * @returns true if state exists in database
 */
export async function stateExists(stateCode: string): Promise<boolean> {
  const normalizedCode = stateCode.toUpperCase().trim();
  const cache = await getCachedData();
  return cache.has(normalizedCode);
}

/**
 * Get count of states in the demographics table
 *
 * @returns Number of states with demographic data
 */
export async function getStateCount(): Promise<number> {
  const cache = await getCachedData();
  return cache.size;
}

/**
 * Upsert state demographics (create or update)
 * Useful for seeding or bulk updates
 *
 * @param stateCode - Two-letter state code
 * @param data - Full demographics data
 * @returns Created or updated StateDemographics
 */
export async function upsertStateDemographics(
  stateCode: string,
  data: {
    stateName: string;
    populationMultiplier?: number;
    incomeMultiplier?: number;
    ageOffset?: number;
  }
): Promise<StateDemographics> {
  const normalizedCode = stateCode.toUpperCase().trim();

  const record = await prisma.stateDemographics.upsert({
    where: { stateCode: normalizedCode },
    create: {
      stateCode: normalizedCode,
      stateName: data.stateName,
      populationMultiplier: data.populationMultiplier ?? DEFAULT_POPULATION_MULTIPLIER,
      incomeMultiplier: data.incomeMultiplier ?? DEFAULT_INCOME_MULTIPLIER,
      ageOffset: data.ageOffset ?? DEFAULT_AGE_OFFSET
    },
    update: {
      stateName: data.stateName,
      ...(data.populationMultiplier !== undefined && {
        populationMultiplier: data.populationMultiplier
      }),
      ...(data.incomeMultiplier !== undefined && {
        incomeMultiplier: data.incomeMultiplier
      }),
      ...(data.ageOffset !== undefined && {
        ageOffset: data.ageOffset
      })
    }
  });

  // Invalidate cache
  invalidateCache();

  return toStateDemographics(record);
}

/**
 * Bulk upsert state demographics
 * Useful for seeding all 50 states + DC at once
 *
 * @param states - Array of state demographics to upsert
 * @returns Number of states processed
 */
export async function bulkUpsertStateDemographics(
  states: Array<{
    stateCode: string;
    stateName: string;
    populationMultiplier?: number;
    incomeMultiplier?: number;
    ageOffset?: number;
  }>
): Promise<number> {
  // Process in a transaction for consistency
  await prisma.$transaction(
    states.map((state) =>
      prisma.stateDemographics.upsert({
        where: { stateCode: state.stateCode.toUpperCase().trim() },
        create: {
          stateCode: state.stateCode.toUpperCase().trim(),
          stateName: state.stateName,
          populationMultiplier: state.populationMultiplier ?? DEFAULT_POPULATION_MULTIPLIER,
          incomeMultiplier: state.incomeMultiplier ?? DEFAULT_INCOME_MULTIPLIER,
          ageOffset: state.ageOffset ?? DEFAULT_AGE_OFFSET
        },
        update: {
          stateName: state.stateName,
          populationMultiplier: state.populationMultiplier ?? DEFAULT_POPULATION_MULTIPLIER,
          incomeMultiplier: state.incomeMultiplier ?? DEFAULT_INCOME_MULTIPLIER,
          ageOffset: state.ageOffset ?? DEFAULT_AGE_OFFSET
        }
      })
    )
  );

  // Invalidate cache
  invalidateCache();

  return states.length;
}
