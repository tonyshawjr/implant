/**
 * Optimization Config Service
 *
 * Manages AI optimization thresholds and settings stored in the OptimizationSetting table.
 * These settings control when AI should flag campaigns for optimization.
 *
 * Default settings:
 * - ctrDropPercent: 20 (%) - Flag if CTR drops by this percentage
 * - cplIncreasePercent: 25 (%) - Flag if CPL increases by this percentage
 * - budgetUtilizationMin: 80 (%) - Flag if budget utilization falls below this
 * - creativeFatigueImpressions: 50000 (impressions) - Flag creative after this many impressions
 * - daysSinceOptimization: 7 (days) - Flag campaigns not optimized in this many days
 */

import { prisma } from '$lib/server/db';
import type { OptimizationSetting } from '@prisma/client';

// =============================================================================
// Types
// =============================================================================

export interface OptimizationSettings {
	ctrDropPercent: number;
	cplIncreasePercent: number;
	budgetUtilizationMin: number;
	creativeFatigueImpressions: number;
	daysSinceOptimization: number;
	[key: string]: number;
}

export interface OptimizationSettingWithMeta {
	id: string;
	key: string;
	value: number;
	label: string;
	description: string | null;
	unit: string | null;
	updatedAt: Date;
}

// =============================================================================
// Cache Configuration
// =============================================================================

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes in milliseconds

interface CacheEntry<T> {
	data: T;
	timestamp: number;
}

// Cache for all settings as key-value pairs
let settingsCache: CacheEntry<Record<string, number>> | null = null;

// Cache for individual settings
const individualCache = new Map<string, CacheEntry<number>>();

// Cache for full setting objects
let fullSettingsCache: CacheEntry<OptimizationSetting[]> | null = null;

// =============================================================================
// Cache Helpers
// =============================================================================

/**
 * Check if a cache entry is still valid
 */
function isCacheValid<T>(entry: CacheEntry<T> | null): entry is CacheEntry<T> {
	if (!entry) return false;
	return Date.now() - entry.timestamp < CACHE_TTL;
}

/**
 * Invalidate all caches (called after updates)
 */
function invalidateCache(): void {
	settingsCache = null;
	individualCache.clear();
	fullSettingsCache = null;
}

/**
 * Clear all cached optimization settings (useful for testing)
 */
export function clearOptimizationCache(): void {
	invalidateCache();
}

// =============================================================================
// Default Settings
// =============================================================================

const DEFAULT_SETTINGS: OptimizationSettings = {
	ctrDropPercent: 20,
	cplIncreasePercent: 25,
	budgetUtilizationMin: 80,
	creativeFatigueImpressions: 50000,
	daysSinceOptimization: 7
};

// =============================================================================
// Service Functions
// =============================================================================

/**
 * Get all optimization settings as a key-value object
 *
 * Returns cached settings if available and not expired.
 * Falls back to default values for any missing keys.
 *
 * @returns Record of setting keys to their numeric values
 *
 * @example
 * const settings = await getOptimizationSettings();
 * if (currentCTR < previousCTR * (1 - settings.ctrDropPercent / 100)) {
 *   // Flag for optimization
 * }
 */
export async function getOptimizationSettings(): Promise<Record<string, number>> {
	// Return cached settings if valid
	if (isCacheValid(settingsCache)) {
		return settingsCache.data;
	}

	try {
		const settings = await prisma.optimizationSetting.findMany({
			select: {
				key: true,
				value: true
			}
		});

		// Convert to key-value object
		const settingsMap: Record<string, number> = { ...DEFAULT_SETTINGS };
		for (const setting of settings) {
			settingsMap[setting.key] = setting.value;
		}

		// Update cache
		settingsCache = {
			data: settingsMap,
			timestamp: Date.now()
		};

		return settingsMap;
	} catch (error) {
		console.error('Error fetching optimization settings:', error);
		// Return defaults on error
		return { ...DEFAULT_SETTINGS };
	}
}

/**
 * Get a specific optimization setting value by key
 *
 * Returns cached value if available and not expired.
 * Returns the default value if the setting doesn't exist.
 *
 * @param key - The setting key (e.g., 'ctrDropPercent')
 * @returns The numeric value of the setting
 *
 * @example
 * const creativeFatigueThreshold = await getOptimizationSetting('creativeFatigueImpressions');
 * if (ad.impressions > creativeFatigueThreshold) {
 *   // Mark creative as fatigued
 * }
 */
export async function getOptimizationSetting(key: string): Promise<number> {
	// Check individual cache first
	const cached = individualCache.get(key);
	if (isCacheValid(cached)) {
		return cached.data;
	}

	// Check if we have all settings cached
	if (isCacheValid(settingsCache) && key in settingsCache.data) {
		const value = settingsCache.data[key];
		// Also cache individually
		individualCache.set(key, {
			data: value,
			timestamp: Date.now()
		});
		return value;
	}

	try {
		const setting = await prisma.optimizationSetting.findUnique({
			where: { key },
			select: { value: true }
		});

		// Use the stored value or fall back to default
		const value = setting?.value ?? DEFAULT_SETTINGS[key] ?? 0;

		// Cache the value
		individualCache.set(key, {
			data: value,
			timestamp: Date.now()
		});

		return value;
	} catch (error) {
		console.error(`Error fetching optimization setting '${key}':`, error);
		// Return default on error
		return DEFAULT_SETTINGS[key] ?? 0;
	}
}

/**
 * Update an optimization setting value
 *
 * Updates the setting in the database and invalidates all caches.
 *
 * @param key - The setting key to update
 * @param value - The new numeric value
 * @returns The updated OptimizationSetting object
 * @throws Error if the setting key doesn't exist
 *
 * @example
 * // Increase the CPL threshold to 30%
 * await updateOptimizationSetting('cplIncreasePercent', 30);
 */
export async function updateOptimizationSetting(
	key: string,
	value: number
): Promise<OptimizationSetting> {
	try {
		const updatedSetting = await prisma.optimizationSetting.update({
			where: { key },
			data: {
				value,
				updatedAt: new Date()
			}
		});

		// Invalidate all caches to ensure consistency
		invalidateCache();

		return updatedSetting;
	} catch (error) {
		// Check if it's a "record not found" error
		if (
			error instanceof Error &&
			error.message.includes('Record to update not found')
		) {
			throw new Error(`Optimization setting '${key}' not found`);
		}
		throw error;
	}
}

/**
 * Get all optimization settings with full metadata
 *
 * Returns cached settings if available and not expired.
 * Includes id, key, value, label, description, unit, and updatedAt.
 *
 * @returns Array of full OptimizationSetting objects
 *
 * @example
 * const settings = await getAllOptimizationSettings();
 * // Render settings in admin UI with labels and descriptions
 * settings.forEach(setting => {
 *   console.log(`${setting.label}: ${setting.value}${setting.unit || ''}`);
 * });
 */
export async function getAllOptimizationSettings(): Promise<OptimizationSetting[]> {
	// Return cached settings if valid
	if (isCacheValid(fullSettingsCache)) {
		return fullSettingsCache.data;
	}

	try {
		const settings = await prisma.optimizationSetting.findMany({
			orderBy: { key: 'asc' }
		});

		// Update cache
		fullSettingsCache = {
			data: settings,
			timestamp: Date.now()
		};

		// Also update the key-value cache
		const settingsMap: Record<string, number> = { ...DEFAULT_SETTINGS };
		for (const setting of settings) {
			settingsMap[setting.key] = setting.value;
		}
		settingsCache = {
			data: settingsMap,
			timestamp: Date.now()
		};

		return settings;
	} catch (error) {
		console.error('Error fetching all optimization settings:', error);
		throw error;
	}
}

/**
 * Create a new optimization setting (typically used for seeding/setup)
 *
 * @param data - The setting data to create
 * @returns The created OptimizationSetting object
 *
 * @example
 * await createOptimizationSetting({
 *   key: 'newThreshold',
 *   value: 50,
 *   label: 'New Threshold',
 *   description: 'A new optimization threshold',
 *   unit: '%'
 * });
 */
export async function createOptimizationSetting(data: {
	key: string;
	value: number;
	label: string;
	description?: string;
	unit?: string;
}): Promise<OptimizationSetting> {
	const setting = await prisma.optimizationSetting.create({
		data: {
			key: data.key,
			value: data.value,
			label: data.label,
			description: data.description ?? null,
			unit: data.unit ?? null
		}
	});

	// Invalidate caches
	invalidateCache();

	return setting;
}

/**
 * Upsert optimization setting (create if not exists, update if exists)
 *
 * Useful for seeding default settings without errors.
 *
 * @param data - The setting data to upsert
 * @returns The upserted OptimizationSetting object
 */
export async function upsertOptimizationSetting(data: {
	key: string;
	value: number;
	label: string;
	description?: string;
	unit?: string;
}): Promise<OptimizationSetting> {
	const setting = await prisma.optimizationSetting.upsert({
		where: { key: data.key },
		create: {
			key: data.key,
			value: data.value,
			label: data.label,
			description: data.description ?? null,
			unit: data.unit ?? null
		},
		update: {
			value: data.value,
			label: data.label,
			description: data.description ?? null,
			unit: data.unit ?? null
		}
	});

	// Invalidate caches
	invalidateCache();

	return setting;
}

/**
 * Seed default optimization settings
 *
 * Creates all default settings if they don't exist.
 * Safe to call multiple times.
 */
export async function seedDefaultSettings(): Promise<void> {
	const defaultSettings = [
		{
			key: 'ctrDropPercent',
			value: 20,
			label: 'CTR Drop Threshold',
			description: 'Flag campaign if CTR drops by this percentage from baseline',
			unit: '%'
		},
		{
			key: 'cplIncreasePercent',
			value: 25,
			label: 'CPL Increase Threshold',
			description: 'Flag campaign if cost per lead increases by this percentage',
			unit: '%'
		},
		{
			key: 'budgetUtilizationMin',
			value: 80,
			label: 'Minimum Budget Utilization',
			description: 'Flag campaign if budget utilization falls below this percentage',
			unit: '%'
		},
		{
			key: 'creativeFatigueImpressions',
			value: 50000,
			label: 'Creative Fatigue Threshold',
			description: 'Flag creative for refresh after reaching this many impressions',
			unit: 'impressions'
		},
		{
			key: 'daysSinceOptimization',
			value: 7,
			label: 'Days Since Last Optimization',
			description: 'Flag campaign if not optimized within this many days',
			unit: 'days'
		}
	];

	for (const setting of defaultSettings) {
		await upsertOptimizationSetting(setting);
	}
}
