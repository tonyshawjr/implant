import type { PageServerLoad, Actions } from './$types';
import { redirect, fail } from '@sveltejs/kit';
import { prisma } from '$lib/server/db';
import {
	getStates,
	getMetroAreas,
	getCounties,
	getCities,
	searchZipCodes,
	getZipDemographics,
	getCountyDemographics,
	getCityDemographics,
	aggregateZipDemographics,
	type Demographics,
	type GeoEntity,
	type MetroArea,
	type ZipCode
} from '$lib/server/census';

// =============================================================================
// Types
// =============================================================================

interface ZipCodeEntry {
	zipCode: string;
	city: string;
}

interface TerritoryDemographics {
	population: number;
	households: number;
	medianIncome: number;
	medianAge: number;
	population65Plus?: number;
	population65PlusPercent?: number;
	medianHomeValue?: number;
	veteransCount?: number;
	ownerOccupiedPercent?: number;
}

// =============================================================================
// Default Pricing Configuration
// =============================================================================

const DEFAULT_PRICING_CONFIG = {
	scoring: {
		senior: { weight: 30, thresholds: [{ min: 20, points: 30 }, { min: 15, points: 25 }, { min: 12, points: 20 }, { min: 8, points: 15 }, { min: 0, points: 10 }] },
		income: { weight: 25, thresholds: [{ min: 100000, points: 25 }, { min: 75000, points: 20 }, { min: 55000, points: 15 }, { min: 40000, points: 10 }, { min: 0, points: 5 }] },
		population: { weight: 25, thresholds: [{ min: 500000, points: 25 }, { min: 250000, points: 20 }, { min: 100000, points: 15 }, { min: 50000, points: 10 }, { min: 0, points: 5 }] },
		homeValue: { weight: 20, thresholds: [{ min: 500000, points: 20 }, { min: 350000, points: 16 }, { min: 250000, points: 12 }, { min: 150000, points: 8 }, { min: 0, points: 4 }] }
	},
	priceTiers: [
		{ minScore: 80, price: 3500, label: 'Premium' },
		{ minScore: 65, price: 2750, label: 'High' },
		{ minScore: 50, price: 2000, label: 'Standard' },
		{ minScore: 35, price: 1500, label: 'Moderate' },
		{ minScore: 0, price: 1000, label: 'Entry' }
	]
};

// =============================================================================
// Load Function
// =============================================================================

export const load: PageServerLoad = async () => {
	// Default return value
	const defaultReturn = {
		states: [] as GeoEntity[],
		metros: [] as MetroArea[],
		counties: [] as GeoEntity[],
		cities: [] as GeoEntity[],
		pricingConfig: DEFAULT_PRICING_CONFIG
	};

	try {
		// Fetch list of states from Census API
		const states = await getStates();

		// Fetch pricing config from database - wrapped in its own try/catch
		let pricingConfig = DEFAULT_PRICING_CONFIG;
		try {
			const pricingConfigSetting = await prisma.systemSetting.findUnique({
				where: { key: 'territory_pricing' }
			});
			if (pricingConfigSetting?.value) {
				pricingConfig = pricingConfigSetting.value as typeof DEFAULT_PRICING_CONFIG;
			}
		} catch (dbError) {
			console.error('Failed to load pricing config from database:', dbError);
			// Continue with default config
		}

		return {
			states,
			metros: [] as MetroArea[],
			counties: [] as GeoEntity[],
			cities: [] as GeoEntity[],
			pricingConfig
		};
	} catch (error) {
		console.error('Failed to load initial data:', error);

		// Return defaults if Census API fails
		return defaultReturn;
	}
};

// =============================================================================
// Form Actions
// =============================================================================

export const actions: Actions = {
	/**
	 * Fetch metro areas (MSAs) for a given state
	 */
	fetchMetros: async ({ request }) => {
		const formData = await request.formData();
		const stateFips = formData.get('stateFips') as string;

		if (!stateFips) {
			return fail(400, { error: 'State FIPS code is required' });
		}

		try {
			const metros = await getMetroAreas(stateFips);
			return { metros };
		} catch (error) {
			console.error('Failed to fetch metro areas:', error);
			return fail(500, { error: 'Failed to fetch metro areas' });
		}
	},

	/**
	 * Fetch counties for a given state
	 */
	fetchCounties: async ({ request }) => {
		const formData = await request.formData();
		const stateFips = formData.get('stateFips') as string;

		if (!stateFips) {
			return fail(400, { error: 'State FIPS code is required' });
		}

		try {
			const counties = await getCounties(stateFips);
			return { counties };
		} catch (error) {
			console.error('Failed to fetch counties:', error);
			return fail(500, { error: 'Failed to fetch counties' });
		}
	},

	/**
	 * Fetch cities for a given state with optional search filter
	 */
	fetchCities: async ({ request }) => {
		const formData = await request.formData();
		const stateFips = formData.get('stateFips') as string;
		const search = formData.get('search') as string | null;

		if (!stateFips) {
			return fail(400, { error: 'State FIPS code is required' });
		}

		try {
			const cities = await getCities(stateFips, search || undefined);
			return { cities };
		} catch (error) {
			console.error('Failed to fetch cities:', error);
			return fail(500, { error: 'Failed to fetch cities' });
		}
	},

	/**
	 * Search for zip codes by number prefix
	 */
	searchZips: async ({ request }) => {
		const formData = await request.formData();
		const query = formData.get('query') as string;

		if (!query || query.length < 3) {
			return fail(400, { error: 'Please enter at least 3 digits to search' });
		}

		try {
			const zips = await searchZipCodes(query);
			return { zips };
		} catch (error) {
			console.error('Failed to search zip codes:', error);
			return fail(500, { error: 'Failed to search zip codes' });
		}
	},

	/**
	 * Get demographics for a selected area
	 * Handles different types: zip, county, city, or multiple zips
	 */
	getDemographics: async ({ request }) => {
		const formData = await request.formData();
		const type = formData.get('type') as string;
		const stateFips = formData.get('stateFips') as string;

		try {
			let demographics: Demographics | null = null;

			switch (type) {
				case 'zip': {
					const zipCode = formData.get('zipCode') as string;
					if (!zipCode) {
						return fail(400, { error: 'Zip code is required' });
					}
					demographics = await getZipDemographics(zipCode);
					break;
				}

				case 'zips': {
					// Multiple zip codes - aggregate demographics
					const zipCodesJson = formData.get('zipCodes') as string;
					if (!zipCodesJson) {
						return fail(400, { error: 'Zip codes are required' });
					}

					try {
						const zipCodes: string[] = JSON.parse(zipCodesJson);
						if (!Array.isArray(zipCodes) || zipCodes.length === 0) {
							return fail(400, { error: 'At least one zip code is required' });
						}
						demographics = await aggregateZipDemographics(zipCodes);
					} catch {
						return fail(400, { error: 'Invalid zip codes format' });
					}
					break;
				}

				case 'county': {
					const countyFips = formData.get('countyFips') as string;
					if (!stateFips || !countyFips) {
						return fail(400, { error: 'State and county FIPS codes are required' });
					}
					demographics = await getCountyDemographics(stateFips, countyFips);
					break;
				}

				case 'city': {
					const placeFips = formData.get('placeFips') as string;
					if (!stateFips || !placeFips) {
						return fail(400, { error: 'State and place FIPS codes are required' });
					}
					demographics = await getCityDemographics(stateFips, placeFips);
					break;
				}

				default:
					return fail(400, { error: 'Invalid demographics type' });
			}

			if (!demographics) {
				return fail(404, { error: 'Demographics data not found for the selected area' });
			}

			return { demographics };
		} catch (error) {
			console.error('Failed to get demographics:', error);
			return fail(500, { error: 'Failed to fetch demographics data' });
		}
	},

	/**
	 * Create a new territory with all associated zip codes
	 */
	createTerritory: async ({ request }) => {
		const formData = await request.formData();

		// Extract required fields
		const name = formData.get('name') as string;
		const boundaryType = formData.get('boundaryType') as string;
		const state = formData.get('state') as string;
		const zipCodesJson = formData.get('zipCodes') as string;
		const demographicsJson = formData.get('demographics') as string;
		const monthlyBasePriceStr = formData.get('monthlyBasePrice') as string;
		const centerLatStr = formData.get('centerLat') as string;
		const centerLngStr = formData.get('centerLng') as string;
		const radiusMilesStr = formData.get('radiusMiles') as string;

		// Optional fields
		const msaCode = formData.get('msaCode') as string | null;
		const countyFips = formData.get('countyFips') as string | null;
		const placeFips = formData.get('placeFips') as string | null;
		const territoryType = (formData.get('territoryType') as string) || 'standard';

		// Validation
		if (!name || name.trim().length === 0) {
			return fail(400, { error: 'Territory name is required' });
		}

		if (!boundaryType) {
			return fail(400, { error: 'Boundary type is required' });
		}

		if (!state) {
			return fail(400, { error: 'State is required' });
		}

		// Parse zip codes - only required for zipcode boundary type
		let zipCodes: ZipCodeEntry[] = [];
		try {
			zipCodes = JSON.parse(zipCodesJson || '[]');
			// Only require zip codes for zipcode boundary type
			if (boundaryType === 'zipcode' && (!Array.isArray(zipCodes) || zipCodes.length === 0)) {
				return fail(400, { error: 'At least one zip code is required for zip code territories' });
			}
		} catch {
			return fail(400, { error: 'Invalid zip codes format' });
		}

		// Get primary city name from form data or first zip code
		const primaryCity = formData.get('primaryCity') as string || zipCodes[0]?.city || '';

		// Parse demographics
		let demographics: TerritoryDemographics;
		try {
			demographics = JSON.parse(demographicsJson || '{}');
		} catch {
			return fail(400, { error: 'Invalid demographics format' });
		}

		// Parse numeric values
		const monthlyBasePrice = parseFloat(monthlyBasePriceStr);
		const centerLat = parseFloat(centerLatStr);
		const centerLng = parseFloat(centerLngStr);
		const radiusMiles = parseInt(radiusMilesStr) || 15;

		if (isNaN(centerLat) || isNaN(centerLng)) {
			return fail(400, { error: 'Valid coordinates are required' });
		}

		// Check for overlapping territories
		try {
			const existingTerritories = await prisma.territory.findMany({
				where: {
					status: { in: ['available', 'locked', 'waitlist'] }
				},
				select: {
					id: true,
					name: true,
					centerLat: true,
					centerLng: true,
					radiusMiles: true
				}
			});

			// Check for overlap using Haversine approximation
			const overlapping = existingTerritories.filter((t) => {
				const tLat = t.centerLat.toNumber();
				const tLng = t.centerLng.toNumber();

				// Approximate distance in miles
				const latDiff = Math.abs(centerLat - tLat) * 69;
				const lngDiff = Math.abs(centerLng - tLng) * 69 * Math.cos(centerLat * (Math.PI / 180));
				const distance = Math.sqrt(latDiff * latDiff + lngDiff * lngDiff);

				return distance < radiusMiles + t.radiusMiles;
			});

			if (overlapping.length > 0) {
				return fail(400, {
					error: `Territory overlaps with existing territory: ${overlapping[0].name}`,
					overlapping: overlapping.map((t) => ({
						id: t.id,
						name: t.name
					}))
				});
			}
		} catch (error) {
			console.error('Failed to check for overlapping territories:', error);
			// Continue with creation even if overlap check fails
		}

		// Create the territory
		try {
			const territory = await prisma.territory.create({
				data: {
					name: name.trim(),
					city: primaryCity,
					state,
					boundaryType: boundaryType as 'metro' | 'county' | 'city' | 'zipcode' | 'custom',
					territoryType: territoryType as 'standard' | 'premium' | 'metro',
					centerLat,
					centerLng,
					radiusMiles,
					population: demographics.population || null,
					households: demographics.households || null,
					medianIncome: demographics.medianIncome || null,
					medianAge: demographics.medianAge || null,
					population65Plus: demographics.population65Plus || null,
					population65Pct: demographics.population65PlusPercent || null,
					medianHomeValue: demographics.medianHomeValue || null,
					veteransCount: demographics.veteransCount || null,
					ownerOccupiedPct: demographics.ownerOccupiedPercent || null,
					monthlyBasePrice: isNaN(monthlyBasePrice) ? null : monthlyBasePrice,
					msaCode: msaCode || null,
					countyFips: countyFips || null,
					placeFips: placeFips || null,
					status: 'available'
				}
			});

			// Add zip codes to the territory (if any)
			if (zipCodes.length > 0) {
				await prisma.territoryZipCode.createMany({
					data: zipCodes.map((z, index) => ({
						territoryId: territory.id,
						zipCode: z.zipCode,
						city: z.city || null,
						isPrimary: index === 0
					}))
				});
			}

			// Redirect to the territories list page on success
			throw redirect(303, '/internal/territories');
		} catch (error) {
			// Re-throw redirect
			if (error instanceof Response || (error && typeof error === 'object' && 'status' in error)) {
				throw error;
			}

			console.error('Failed to create territory:', error);
			return fail(500, { error: 'Failed to create territory. Please try again.' });
		}
	}
};
