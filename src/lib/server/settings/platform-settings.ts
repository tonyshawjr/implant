/**
 * Platform Settings Service
 *
 * Provides read/write access to platform settings stored in the PlatformSettings table.
 * Implements caching with 5-minute TTL for performance.
 */

import { prisma } from '$lib/server/db';

// =============================================================================
// Types
// =============================================================================

export type SettingType = 'string' | 'number' | 'boolean' | 'json';
export type SettingCategory = 'branding' | 'contact' | 'business' | 'feature_flags';

export interface PlatformSetting {
	id: string;
	key: string;
	value: string;
	type: SettingType;
	category: SettingCategory;
	label: string;
	description: string | null;
	updatedAt: Date;
	updatedBy: string | null;
}

export interface SettingInput {
	key: string;
	value: unknown;
	type: SettingType;
	category: SettingCategory;
	label: string;
	description?: string;
	updatedBy?: string;
}

// =============================================================================
// Cache Implementation
// =============================================================================

interface CacheEntry<T> {
	value: T;
	expiresAt: number;
}

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes in milliseconds
const settingsCache = new Map<string, CacheEntry<unknown>>();

/**
 * Gets a value from cache if it exists and is not expired
 */
function getFromCache<T>(key: string): T | undefined {
	const entry = settingsCache.get(key);
	if (!entry) {
		return undefined;
	}

	if (Date.now() > entry.expiresAt) {
		// Entry expired, remove it
		settingsCache.delete(key);
		return undefined;
	}

	return entry.value as T;
}

/**
 * Sets a value in cache with TTL
 */
function setInCache<T>(key: string, value: T): void {
	settingsCache.set(key, {
		value,
		expiresAt: Date.now() + CACHE_TTL_MS
	});
}

/**
 * Invalidates a cache entry by key
 */
function invalidateCache(key: string): void {
	settingsCache.delete(key);
	// Also invalidate category cache that might include this key
	for (const cacheKey of settingsCache.keys()) {
		if (cacheKey.startsWith('category:') || cacheKey === 'all_settings') {
			settingsCache.delete(cacheKey);
		}
	}
}

/**
 * Clears the entire cache
 */
export function clearSettingsCache(): void {
	settingsCache.clear();
}

// =============================================================================
// Value Serialization/Deserialization
// =============================================================================

/**
 * Serializes a value to JSON string for storage
 */
function serializeValue(value: unknown, type: SettingType): string {
	switch (type) {
		case 'string':
			return JSON.stringify(String(value));
		case 'number':
			return JSON.stringify(Number(value));
		case 'boolean':
			return JSON.stringify(Boolean(value));
		case 'json':
			return JSON.stringify(value);
		default:
			return JSON.stringify(value);
	}
}

/**
 * Deserializes a JSON string to the appropriate type
 */
function deserializeValue(value: string, type: string): unknown {
	try {
		const parsed = JSON.parse(value);

		switch (type) {
			case 'string':
				return String(parsed);
			case 'number':
				return Number(parsed);
			case 'boolean':
				return Boolean(parsed);
			case 'json':
				return parsed;
			default:
				return parsed;
		}
	} catch (error) {
		console.error(`Failed to deserialize setting value: ${value}`, error);
		// Return raw string if parsing fails
		return value;
	}
}

// =============================================================================
// Core Service Functions
// =============================================================================

/**
 * Gets a single setting value by key
 * Returns undefined if the setting doesn't exist
 */
export async function getSetting<T = unknown>(key: string): Promise<T | undefined> {
	// Check cache first
	const cached = getFromCache<T>(`setting:${key}`);
	if (cached !== undefined) {
		return cached;
	}

	try {
		const setting = await prisma.platformSettings.findUnique({
			where: { key }
		});

		if (!setting) {
			return undefined;
		}

		const value = deserializeValue(setting.value, setting.type) as T;

		// Cache the result
		setInCache(`setting:${key}`, value);

		return value;
	} catch (error) {
		console.error(`Error fetching setting '${key}':`, error);
		throw new Error(`Failed to fetch setting '${key}'`);
	}
}

/**
 * Gets a setting with a default value if not found
 */
export async function getSettingWithDefault<T>(key: string, defaultValue: T): Promise<T> {
	const value = await getSetting<T>(key);
	return value !== undefined ? value : defaultValue;
}

/**
 * Sets a setting value, creating it if it doesn't exist
 */
export async function setSetting(
	key: string,
	value: unknown,
	type: SettingType,
	category: SettingCategory,
	label: string,
	description?: string,
	updatedBy?: string
): Promise<void> {
	try {
		const serializedValue = serializeValue(value, type);

		await prisma.platformSettings.upsert({
			where: { key },
			create: {
				key,
				value: serializedValue,
				type,
				category,
				label,
				description: description || null,
				updatedBy: updatedBy || null
			},
			update: {
				value: serializedValue,
				type,
				category,
				label,
				description: description || null,
				updatedBy: updatedBy || null
			}
		});

		// Invalidate cache for this key
		invalidateCache(key);
	} catch (error) {
		console.error(`Error setting '${key}':`, error);
		throw new Error(`Failed to set setting '${key}'`);
	}
}

/**
 * Sets multiple settings at once
 */
export async function setSettings(settings: SettingInput[]): Promise<void> {
	try {
		await prisma.$transaction(
			settings.map((setting) =>
				prisma.platformSettings.upsert({
					where: { key: setting.key },
					create: {
						key: setting.key,
						value: serializeValue(setting.value, setting.type),
						type: setting.type,
						category: setting.category,
						label: setting.label,
						description: setting.description || null,
						updatedBy: setting.updatedBy || null
					},
					update: {
						value: serializeValue(setting.value, setting.type),
						type: setting.type,
						category: setting.category,
						label: setting.label,
						description: setting.description || null,
						updatedBy: setting.updatedBy || null
					}
				})
			)
		);

		// Invalidate cache for all updated keys
		for (const setting of settings) {
			invalidateCache(setting.key);
		}
	} catch (error) {
		console.error('Error setting multiple settings:', error);
		throw new Error('Failed to set multiple settings');
	}
}

/**
 * Gets all settings in a category as a key-value record
 */
export async function getSettingsByCategory(category: string): Promise<Record<string, unknown>> {
	// Check cache first
	const cacheKey = `category:${category}`;
	const cached = getFromCache<Record<string, unknown>>(cacheKey);
	if (cached !== undefined) {
		return cached;
	}

	try {
		const settings = await prisma.platformSettings.findMany({
			where: { category }
		});

		const result: Record<string, unknown> = {};

		for (const setting of settings) {
			result[setting.key] = deserializeValue(setting.value, setting.type);
		}

		// Cache the result
		setInCache(cacheKey, result);

		return result;
	} catch (error) {
		console.error(`Error fetching settings for category '${category}':`, error);
		throw new Error(`Failed to fetch settings for category '${category}'`);
	}
}

/**
 * Gets all settings as a flat key-value record
 */
export async function getAllSettings(): Promise<Record<string, unknown>> {
	const cacheKey = 'all_settings';
	const cached = getFromCache<Record<string, unknown>>(cacheKey);
	if (cached !== undefined) {
		return cached;
	}

	try {
		const settings = await prisma.platformSettings.findMany();

		const result: Record<string, unknown> = {};

		for (const setting of settings) {
			result[setting.key] = deserializeValue(setting.value, setting.type);
		}

		// Cache the result
		setInCache(cacheKey, result);

		return result;
	} catch (error) {
		console.error('Error fetching all settings:', error);
		throw new Error('Failed to fetch all settings');
	}
}

/**
 * Gets settings with full metadata (for admin UI)
 */
export async function getSettingsWithMetadata(category?: string): Promise<PlatformSetting[]> {
	try {
		const settings = await prisma.platformSettings.findMany({
			where: category ? { category } : undefined,
			orderBy: [{ category: 'asc' }, { key: 'asc' }]
		});

		return settings.map((s) => ({
			...s,
			type: s.type as SettingType,
			category: s.category as SettingCategory
		}));
	} catch (error) {
		console.error('Error fetching settings with metadata:', error);
		throw new Error('Failed to fetch settings with metadata');
	}
}

/**
 * Deletes a setting by key
 */
export async function deleteSetting(key: string): Promise<void> {
	try {
		await prisma.platformSettings.delete({
			where: { key }
		});

		// Invalidate cache
		invalidateCache(key);
	} catch (error) {
		// Ignore not found errors (Prisma P2025)
		if ((error as { code?: string }).code === 'P2025') {
			return;
		}
		console.error(`Error deleting setting '${key}':`, error);
		throw new Error(`Failed to delete setting '${key}'`);
	}
}

// =============================================================================
// Typed Getter Helpers
// =============================================================================

// Branding Settings
export async function getCompanyName(): Promise<string> {
	return getSettingWithDefault<string>('company_name', 'SqueezMedia');
}

export async function getPlatformName(): Promise<string> {
	return getSettingWithDefault<string>('platform_name', 'Implant Lead Engine');
}

export async function getLogoUrl(): Promise<string> {
	return getSettingWithDefault<string>('logo_url', '/images/logo.svg');
}

export async function getFaviconUrl(): Promise<string> {
	return getSettingWithDefault<string>('favicon_url', '/favicon.ico');
}

export async function getPrimaryColor(): Promise<string> {
	return getSettingWithDefault<string>('primary_color', '#3B82F6');
}

// Contact Settings
export async function getSupportEmail(): Promise<string> {
	return getSettingWithDefault<string>('support_email', 'support@squeezmedia.com');
}

export async function getBillingEmail(): Promise<string> {
	return getSettingWithDefault<string>('billing_email', 'billing@squeezmedia.com');
}

export async function getSalesEmail(): Promise<string> {
	return getSettingWithDefault<string>('sales_email', 'sales@squeezmedia.com');
}

export async function getSupportPhone(): Promise<string> {
	return getSettingWithDefault<string>('support_phone', '');
}

// Business Settings
export async function getAppUrl(): Promise<string> {
	return getSettingWithDefault<string>('app_url', 'https://app.squeezmedia.com');
}

export async function getDefaultTimezone(): Promise<string> {
	return getSettingWithDefault<string>('default_timezone', 'America/New_York');
}

export async function getDefaultCurrency(): Promise<string> {
	return getSettingWithDefault<string>('default_currency', 'USD');
}

export async function getDefaultCaseValue(): Promise<number> {
	return getSettingWithDefault<number>('default_case_value', 4000);
}

export async function getTrialDays(): Promise<number> {
	return getSettingWithDefault<number>('trial_days', 0);
}

// Feature Flags
export async function isFeatureEnabled(featureKey: string): Promise<boolean> {
	return getSettingWithDefault<boolean>(`feature_${featureKey}`, false);
}

export async function getMaintenanceMode(): Promise<boolean> {
	return getSettingWithDefault<boolean>('maintenance_mode', false);
}

export async function getMaintenanceMessage(): Promise<string> {
	return getSettingWithDefault<string>(
		'maintenance_message',
		'We are currently performing scheduled maintenance. Please check back soon.'
	);
}

// =============================================================================
// Initialization Helper
// =============================================================================

/**
 * Default settings to seed the database with
 */
export const DEFAULT_SETTINGS: SettingInput[] = [
	// Branding
	{
		key: 'company_name',
		value: 'SqueezMedia',
		type: 'string',
		category: 'branding',
		label: 'Company Name',
		description: 'The legal company name'
	},
	{
		key: 'platform_name',
		value: 'Implant Lead Engine',
		type: 'string',
		category: 'branding',
		label: 'Platform Name',
		description: 'The marketing name for the platform'
	},
	{
		key: 'logo_url',
		value: '/images/logo.svg',
		type: 'string',
		category: 'branding',
		label: 'Logo URL',
		description: 'URL to the main logo image'
	},
	{
		key: 'favicon_url',
		value: '/favicon.ico',
		type: 'string',
		category: 'branding',
		label: 'Favicon URL',
		description: 'URL to the favicon'
	},
	{
		key: 'primary_color',
		value: '#3B82F6',
		type: 'string',
		category: 'branding',
		label: 'Primary Color',
		description: 'Primary brand color in hex format'
	},

	// Contact
	{
		key: 'support_email',
		value: 'support@squeezmedia.com',
		type: 'string',
		category: 'contact',
		label: 'Support Email',
		description: 'Email address for support inquiries'
	},
	{
		key: 'billing_email',
		value: 'billing@squeezmedia.com',
		type: 'string',
		category: 'contact',
		label: 'Billing Email',
		description: 'Email address for billing inquiries'
	},
	{
		key: 'sales_email',
		value: 'sales@squeezmedia.com',
		type: 'string',
		category: 'contact',
		label: 'Sales Email',
		description: 'Email address for sales inquiries'
	},
	{
		key: 'support_phone',
		value: '',
		type: 'string',
		category: 'contact',
		label: 'Support Phone',
		description: 'Phone number for support (optional)'
	},

	// Business
	{
		key: 'app_url',
		value: 'https://app.squeezmedia.com',
		type: 'string',
		category: 'business',
		label: 'Application URL',
		description: 'Base URL for the application'
	},
	{
		key: 'default_timezone',
		value: 'America/New_York',
		type: 'string',
		category: 'business',
		label: 'Default Timezone',
		description: 'Default timezone for new organizations'
	},
	{
		key: 'default_currency',
		value: 'USD',
		type: 'string',
		category: 'business',
		label: 'Default Currency',
		description: 'Default currency code'
	},
	{
		key: 'default_case_value',
		value: 4000,
		type: 'number',
		category: 'business',
		label: 'Default Case Value',
		description: 'Default estimated value for a dental implant case'
	},
	{
		key: 'trial_days',
		value: 0,
		type: 'number',
		category: 'business',
		label: 'Trial Period Days',
		description: 'Number of days for free trial (0 = no trial)'
	},

	// Feature Flags
	{
		key: 'maintenance_mode',
		value: false,
		type: 'boolean',
		category: 'feature_flags',
		label: 'Maintenance Mode',
		description: 'Enable maintenance mode for the platform'
	},
	{
		key: 'maintenance_message',
		value: 'We are currently performing scheduled maintenance. Please check back soon.',
		type: 'string',
		category: 'feature_flags',
		label: 'Maintenance Message',
		description: 'Message to display during maintenance'
	},
	{
		key: 'feature_ai_optimizer',
		value: true,
		type: 'boolean',
		category: 'feature_flags',
		label: 'AI Optimizer',
		description: 'Enable AI-powered campaign optimization'
	},
	{
		key: 'feature_competitor_intelligence',
		value: true,
		type: 'boolean',
		category: 'feature_flags',
		label: 'Competitor Intelligence',
		description: 'Enable competitor intelligence reports'
	},
	{
		key: 'feature_voice_ai',
		value: true,
		type: 'boolean',
		category: 'feature_flags',
		label: 'Voice AI',
		description: 'Enable AI voice profile generation'
	}
];

/**
 * Seeds the database with default settings (only creates missing settings)
 */
export async function seedDefaultSettings(): Promise<void> {
	console.log('Seeding default platform settings...');

	for (const setting of DEFAULT_SETTINGS) {
		try {
			// Check if setting already exists
			const existing = await prisma.platformSettings.findUnique({
				where: { key: setting.key }
			});

			if (!existing) {
				await prisma.platformSettings.create({
					data: {
						key: setting.key,
						value: serializeValue(setting.value, setting.type),
						type: setting.type,
						category: setting.category,
						label: setting.label,
						description: setting.description || null
					}
				});
				console.log(`  Created setting: ${setting.key}`);
			}
		} catch (error) {
			console.error(`  Error creating setting ${setting.key}:`, error);
		}
	}

	console.log('Default settings seeding complete.');
}
