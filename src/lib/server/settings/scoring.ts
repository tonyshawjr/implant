import { prisma } from '$lib/server/db';
import type { ScoringThreshold } from '@prisma/client';

// =============================================================================
// Types
// =============================================================================

export type ScoreType = 'health_score' | 'lead_temperature';

export type HealthScoreLevel = 'excellent' | 'good' | 'warning' | 'critical';
export type LeadTemperatureLevel = 'hot' | 'warm' | 'cold';

export interface ScoreLevelResult {
  level: string;
  color: string;
  label: string;
}

export interface UpdateThresholdInput {
  level?: string;
  minValue?: number;
  maxValue?: number | null;
  color?: string;
  label?: string;
  sortOrder?: number;
}

// =============================================================================
// Cache
// =============================================================================

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

const cache: {
  healthScoreThresholds: CacheEntry<ScoringThreshold[]> | null;
  leadTemperatureThresholds: CacheEntry<ScoringThreshold[]> | null;
} = {
  healthScoreThresholds: null,
  leadTemperatureThresholds: null
};

function isCacheValid<T>(entry: CacheEntry<T> | null): entry is CacheEntry<T> {
  if (!entry) return false;
  return Date.now() - entry.timestamp < CACHE_TTL_MS;
}

/**
 * Invalidates the threshold cache for a specific score type or all caches
 */
export function invalidateThresholdCache(scoreType?: ScoreType): void {
  if (!scoreType || scoreType === 'health_score') {
    cache.healthScoreThresholds = null;
  }
  if (!scoreType || scoreType === 'lead_temperature') {
    cache.leadTemperatureThresholds = null;
  }
}

// =============================================================================
// Health Score Functions
// =============================================================================

/**
 * Get all health score thresholds sorted by sortOrder
 *
 * Default thresholds:
 * - excellent: 85+ (green)
 * - good: 70-84 (blue)
 * - warning: 50-69 (yellow)
 * - critical: <50 (red)
 */
export async function getHealthScoreThresholds(): Promise<ScoringThreshold[]> {
  // Check cache first
  if (isCacheValid(cache.healthScoreThresholds)) {
    return cache.healthScoreThresholds.data;
  }

  const thresholds = await prisma.scoringThreshold.findMany({
    where: {
      scoreType: 'health_score'
    },
    orderBy: {
      sortOrder: 'asc'
    }
  });

  // Update cache
  cache.healthScoreThresholds = {
    data: thresholds,
    timestamp: Date.now()
  };

  return thresholds;
}

/**
 * Get the health score level for a given score value
 *
 * @param score - The health score value (0-100)
 * @returns The level, color, and label for the score
 */
export async function getHealthScoreLevel(score: number): Promise<ScoreLevelResult> {
  const thresholds = await getHealthScoreThresholds();

  // Find matching threshold (sorted by sortOrder, typically highest first)
  for (const threshold of thresholds) {
    const meetsMin = score >= threshold.minValue;
    const meetsMax = threshold.maxValue === null || score <= threshold.maxValue;

    if (meetsMin && meetsMax) {
      return {
        level: threshold.level,
        color: threshold.color,
        label: threshold.label
      };
    }
  }

  // Fallback if no threshold matches (should not happen with proper setup)
  return {
    level: 'unknown',
    color: 'gray-500',
    label: 'Unknown'
  };
}

// =============================================================================
// Lead Temperature Functions
// =============================================================================

/**
 * Get all lead temperature thresholds sorted by sortOrder
 *
 * Default thresholds:
 * - hot: 80+ (red/orange)
 * - warm: 50-79 (yellow)
 * - cold: <50 (blue)
 */
export async function getLeadTemperatureThresholds(): Promise<ScoringThreshold[]> {
  // Check cache first
  if (isCacheValid(cache.leadTemperatureThresholds)) {
    return cache.leadTemperatureThresholds.data;
  }

  const thresholds = await prisma.scoringThreshold.findMany({
    where: {
      scoreType: 'lead_temperature'
    },
    orderBy: {
      sortOrder: 'asc'
    }
  });

  // Update cache
  cache.leadTemperatureThresholds = {
    data: thresholds,
    timestamp: Date.now()
  };

  return thresholds;
}

/**
 * Get the lead temperature level for a given score value
 *
 * @param score - The lead temperature score (0-100)
 * @returns The level, color, and label for the temperature
 */
export async function getLeadTemperature(score: number): Promise<ScoreLevelResult> {
  const thresholds = await getLeadTemperatureThresholds();

  // Find matching threshold
  for (const threshold of thresholds) {
    const meetsMin = score >= threshold.minValue;
    const meetsMax = threshold.maxValue === null || score <= threshold.maxValue;

    if (meetsMin && meetsMax) {
      return {
        level: threshold.level,
        color: threshold.color,
        label: threshold.label
      };
    }
  }

  // Fallback if no threshold matches
  return {
    level: 'unknown',
    color: 'gray-500',
    label: 'Unknown'
  };
}

// =============================================================================
// Threshold Management Functions
// =============================================================================

/**
 * Get a single threshold by ID
 */
export async function getThresholdById(id: string): Promise<ScoringThreshold | null> {
  return prisma.scoringThreshold.findUnique({
    where: { id }
  });
}

/**
 * Update a scoring threshold
 *
 * @param id - The threshold ID
 * @param data - The fields to update
 * @returns The updated threshold
 */
export async function updateThreshold(
  id: string,
  data: UpdateThresholdInput
): Promise<ScoringThreshold> {
  // Get the existing threshold to determine score type for cache invalidation
  const existing = await prisma.scoringThreshold.findUnique({
    where: { id }
  });

  if (!existing) {
    throw new Error(`Threshold with ID ${id} not found`);
  }

  // Validate the update data
  if (data.minValue !== undefined && data.minValue < 0) {
    throw new Error('minValue cannot be negative');
  }

  if (data.maxValue !== undefined && data.maxValue !== null && data.maxValue < 0) {
    throw new Error('maxValue cannot be negative');
  }

  if (
    data.minValue !== undefined &&
    data.maxValue !== undefined &&
    data.maxValue !== null &&
    data.minValue > data.maxValue
  ) {
    throw new Error('minValue cannot be greater than maxValue');
  }

  const updated = await prisma.scoringThreshold.update({
    where: { id },
    data: {
      ...(data.level !== undefined && { level: data.level }),
      ...(data.minValue !== undefined && { minValue: data.minValue }),
      ...(data.maxValue !== undefined && { maxValue: data.maxValue }),
      ...(data.color !== undefined && { color: data.color }),
      ...(data.label !== undefined && { label: data.label }),
      ...(data.sortOrder !== undefined && { sortOrder: data.sortOrder })
    }
  });

  // Invalidate cache for the affected score type
  invalidateThresholdCache(existing.scoreType as ScoreType);

  return updated;
}

/**
 * Get all thresholds (both health score and lead temperature)
 */
export async function getAllThresholds(): Promise<ScoringThreshold[]> {
  return prisma.scoringThreshold.findMany({
    orderBy: [{ scoreType: 'asc' }, { sortOrder: 'asc' }]
  });
}

/**
 * Bulk update thresholds (useful for admin interface)
 */
export async function bulkUpdateThresholds(
  updates: Array<{ id: string; data: UpdateThresholdInput }>
): Promise<ScoringThreshold[]> {
  const results: ScoringThreshold[] = [];

  // Use transaction for atomic updates
  await prisma.$transaction(async (tx) => {
    for (const { id, data } of updates) {
      const updated = await tx.scoringThreshold.update({
        where: { id },
        data: {
          ...(data.level !== undefined && { level: data.level }),
          ...(data.minValue !== undefined && { minValue: data.minValue }),
          ...(data.maxValue !== undefined && { maxValue: data.maxValue }),
          ...(data.color !== undefined && { color: data.color }),
          ...(data.label !== undefined && { label: data.label }),
          ...(data.sortOrder !== undefined && { sortOrder: data.sortOrder })
        }
      });
      results.push(updated);
    }
  });

  // Invalidate all caches after bulk update
  invalidateThresholdCache();

  return results;
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Get default thresholds for seeding the database
 */
export function getDefaultHealthScoreThresholds(): Omit<ScoringThreshold, 'id' | 'updatedAt'>[] {
  return [
    {
      scoreType: 'health_score',
      level: 'excellent',
      minValue: 85,
      maxValue: null,
      color: 'green-500',
      label: 'Excellent',
      sortOrder: 1
    },
    {
      scoreType: 'health_score',
      level: 'good',
      minValue: 70,
      maxValue: 84,
      color: 'blue-500',
      label: 'Good',
      sortOrder: 2
    },
    {
      scoreType: 'health_score',
      level: 'warning',
      minValue: 50,
      maxValue: 69,
      color: 'yellow-500',
      label: 'Warning',
      sortOrder: 3
    },
    {
      scoreType: 'health_score',
      level: 'critical',
      minValue: 0,
      maxValue: 49,
      color: 'red-500',
      label: 'Critical',
      sortOrder: 4
    }
  ];
}

/**
 * Get default lead temperature thresholds for seeding the database
 */
export function getDefaultLeadTemperatureThresholds(): Omit<ScoringThreshold, 'id' | 'updatedAt'>[] {
  return [
    {
      scoreType: 'lead_temperature',
      level: 'hot',
      minValue: 80,
      maxValue: null,
      color: 'red-500',
      label: 'Hot',
      sortOrder: 1
    },
    {
      scoreType: 'lead_temperature',
      level: 'warm',
      minValue: 50,
      maxValue: 79,
      color: 'yellow-500',
      label: 'Warm',
      sortOrder: 2
    },
    {
      scoreType: 'lead_temperature',
      level: 'cold',
      minValue: 0,
      maxValue: 49,
      color: 'blue-500',
      label: 'Cold',
      sortOrder: 3
    }
  ];
}

/**
 * Seed default thresholds if they don't exist
 */
export async function seedDefaultThresholds(): Promise<void> {
  const existingCount = await prisma.scoringThreshold.count();

  if (existingCount > 0) {
    console.log('Scoring thresholds already exist, skipping seed');
    return;
  }

  const healthScoreDefaults = getDefaultHealthScoreThresholds();
  const leadTemperatureDefaults = getDefaultLeadTemperatureThresholds();

  await prisma.scoringThreshold.createMany({
    data: [...healthScoreDefaults, ...leadTemperatureDefaults] as Array<{
      scoreType: string;
      level: string;
      minValue: number;
      maxValue: number | null;
      color: string;
      label: string;
      sortOrder: number;
    }>
  });

  console.log('Seeded default scoring thresholds');
}

/**
 * Check if thresholds have any gaps or overlaps
 * Returns validation errors if any issues found
 */
export async function validateThresholds(scoreType: ScoreType): Promise<string[]> {
  const thresholds =
    scoreType === 'health_score'
      ? await getHealthScoreThresholds()
      : await getLeadTemperatureThresholds();

  const errors: string[] = [];

  if (thresholds.length === 0) {
    errors.push(`No thresholds defined for ${scoreType}`);
    return errors;
  }

  // Sort by minValue for validation
  const sorted = [...thresholds].sort((a, b) => a.minValue - b.minValue);

  // Check for gaps and overlaps
  for (let i = 0; i < sorted.length - 1; i++) {
    const current = sorted[i];
    const next = sorted[i + 1];

    // If current has a maxValue, check for gaps/overlaps with next
    if (current.maxValue !== null) {
      if (current.maxValue < next.minValue - 1) {
        errors.push(
          `Gap detected between ${current.level} (max: ${current.maxValue}) and ${next.level} (min: ${next.minValue})`
        );
      }
      if (current.maxValue >= next.minValue) {
        errors.push(
          `Overlap detected between ${current.level} (max: ${current.maxValue}) and ${next.level} (min: ${next.minValue})`
        );
      }
    }
  }

  // Check that we have coverage from 0
  if (sorted[0].minValue > 0) {
    errors.push(`No threshold covers scores from 0 to ${sorted[0].minValue - 1}`);
  }

  // Check that we have coverage to 100 (null maxValue)
  const hasUnlimitedMax = sorted.some((t) => t.maxValue === null);
  if (!hasUnlimitedMax) {
    const maxCovered = Math.max(...sorted.map((t) => t.maxValue ?? 0));
    if (maxCovered < 100) {
      errors.push(`No threshold covers scores above ${maxCovered}`);
    }
  }

  return errors;
}
