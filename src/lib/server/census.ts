/**
 * US Census Bureau API Utility
 *
 * Provides functions to fetch geographic and demographic data from the Census Bureau.
 * Uses the American Community Survey (ACS) 5-Year estimates.
 *
 * API Documentation: https://www.census.gov/data/developers/data-sets/acs-5year.html
 * No API key required for basic usage.
 */

// =============================================================================
// Types
// =============================================================================

export interface Demographics {
	population: number;
	households: number;
	medianIncome: number;
	medianAge: number;
}

export interface GeoEntity {
	fips: string;
	name: string;
	state?: string;
}

export interface MetroArea extends GeoEntity {
	type: 'metropolitan' | 'micropolitan';
}

export interface ZipCode extends GeoEntity {
	zipCode: string;
}

export interface CensusApiError extends Error {
	statusCode?: number;
	endpoint?: string;
}

// =============================================================================
// Configuration
// =============================================================================

const BASE_URL = 'https://api.census.gov/data/2022/acs/acs5';

// ACS 5-Year variable codes for demographics
const VARIABLES = {
	NAME: 'NAME',
	POPULATION: 'B01003_001E',      // Total Population
	HOUSEHOLDS: 'B11001_001E',      // Total Households
	MEDIAN_INCOME: 'B19013_001E',   // Median Household Income
	MEDIAN_AGE: 'B01002_001E'       // Median Age
} as const;

// Cache TTL in milliseconds (1 hour for geographic data, 24 hours for demographics)
const CACHE_TTL = {
	GEO: 60 * 60 * 1000,           // 1 hour
	DEMOGRAPHICS: 24 * 60 * 60 * 1000  // 24 hours
};

// =============================================================================
// In-Memory Cache
// =============================================================================

interface CacheEntry<T> {
	data: T;
	timestamp: number;
	ttl: number;
}

const cache = new Map<string, CacheEntry<unknown>>();

/**
 * Get cached data if still valid
 */
function getFromCache<T>(key: string): T | null {
	const entry = cache.get(key) as CacheEntry<T> | undefined;
	if (!entry) return null;

	const isExpired = Date.now() - entry.timestamp > entry.ttl;
	if (isExpired) {
		cache.delete(key);
		return null;
	}

	return entry.data;
}

/**
 * Store data in cache
 */
function setCache<T>(key: string, data: T, ttl: number): void {
	cache.set(key, {
		data,
		timestamp: Date.now(),
		ttl
	});
}

/**
 * Clear all cached data (useful for testing or forced refresh)
 */
export function clearCache(): void {
	cache.clear();
}

// =============================================================================
// API Helper Functions
// =============================================================================

/**
 * Make a request to the Census API
 */
async function fetchCensusData(
	variables: string[],
	forClause: string,
	inClause?: string
): Promise<string[][]> {
	const params = new URLSearchParams({
		get: variables.join(','),
		for: forClause
	});

	if (inClause) {
		params.set('in', inClause);
	}

	const url = `${BASE_URL}?${params.toString()}`;

	try {
		const response = await fetch(url);

		if (!response.ok) {
			const error = new Error(`Census API error: ${response.status} ${response.statusText}`) as CensusApiError;
			error.statusCode = response.status;
			error.endpoint = url;
			throw error;
		}

		const data = await response.json();

		// Census API returns array of arrays, first row is headers
		if (!Array.isArray(data) || data.length < 2) {
			return [];
		}

		return data;
	} catch (err) {
		if (err instanceof Error && 'statusCode' in err) {
			throw err;
		}

		const error = new Error(`Failed to fetch Census data: ${err instanceof Error ? err.message : 'Unknown error'}`) as CensusApiError;
		error.endpoint = url;
		throw error;
	}
}

/**
 * Parse numeric value from Census API response, handling null/negative values
 * Census uses negative numbers to indicate missing/suppressed data
 */
function parseNumber(value: string | null | undefined): number {
	if (!value || value === 'null') return 0;
	const num = parseInt(value, 10);
	return isNaN(num) || num < 0 ? 0 : num;
}

/**
 * Parse float value from Census API response
 */
function parseFloat(value: string | null | undefined): number {
	if (!value || value === 'null') return 0;
	const num = Number.parseFloat(value);
	return isNaN(num) || num < 0 ? 0 : num;
}

/**
 * Extract demographics from Census API response row
 * Assumes standard variable order: NAME, POPULATION, HOUSEHOLDS, MEDIAN_INCOME, MEDIAN_AGE
 */
function extractDemographics(row: string[]): Demographics {
	return {
		population: parseNumber(row[1]),
		households: parseNumber(row[2]),
		medianIncome: parseNumber(row[3]),
		medianAge: parseFloat(row[4])
	};
}

// =============================================================================
// Geographic Functions
// =============================================================================

/**
 * Get list of all US states with FIPS codes
 * @returns Array of states with FIPS codes and names
 */
export async function getStates(): Promise<GeoEntity[]> {
	const cacheKey = 'states';
	const cached = getFromCache<GeoEntity[]>(cacheKey);
	if (cached) return cached;

	const data = await fetchCensusData(
		[VARIABLES.NAME],
		'state:*'
	);

	// Skip header row, map to GeoEntity
	const states = data.slice(1).map(row => ({
		fips: row[1], // state FIPS code
		name: row[0]  // state name
	})).sort((a, b) => a.name.localeCompare(b.name));

	setCache(cacheKey, states, CACHE_TTL.GEO);
	return states;
}

/**
 * Get Metropolitan and Micropolitan Statistical Areas
 * @param stateFips Optional state FIPS code to filter by
 * @returns Array of metro areas
 */
export async function getMetroAreas(stateFips?: string): Promise<MetroArea[]> {
	const cacheKey = `metro-areas-${stateFips || 'all'}`;
	const cached = getFromCache<MetroArea[]>(cacheKey);
	if (cached) return cached;

	// Metropolitan Statistical Areas use CBSA (Core Based Statistical Area) codes
	// We need to use a different endpoint for this
	const url = `https://api.census.gov/data/2022/acs/acs5?get=NAME&for=metropolitan%20statistical%20area/micropolitan%20statistical%20area:*`;

	try {
		const response = await fetch(url);
		if (!response.ok) {
			throw new Error(`Census API error: ${response.status}`);
		}

		const data: string[][] = await response.json();

		let metros = data.slice(1).map(row => {
			const name = row[0];
			const isMetropolitan = name.toLowerCase().includes('metro');

			return {
				fips: row[1],
				name: name,
				type: (isMetropolitan ? 'metropolitan' : 'micropolitan') as 'metropolitan' | 'micropolitan'
			};
		});

		// Filter by state if provided (metro areas often span multiple states)
		if (stateFips) {
			// Get state name for filtering
			const states = await getStates();
			const state = states.find(s => s.fips === stateFips);
			if (state) {
				const stateAbbr = getStateAbbreviation(state.name);
				metros = metros.filter(m =>
					m.name.includes(`, ${stateAbbr}`) ||
					m.name.includes(`-${stateAbbr}`) ||
					m.name.includes(`${stateAbbr}-`)
				);
			}
		}

		metros.sort((a, b) => a.name.localeCompare(b.name));
		setCache(cacheKey, metros, CACHE_TTL.GEO);
		return metros;

	} catch (err) {
		console.error('Failed to fetch metro areas:', err);
		return [];
	}
}

/**
 * Get counties in a state
 * @param stateFips State FIPS code (e.g., "37" for North Carolina)
 * @returns Array of counties
 */
export async function getCounties(stateFips: string): Promise<GeoEntity[]> {
	const cacheKey = `counties-${stateFips}`;
	const cached = getFromCache<GeoEntity[]>(cacheKey);
	if (cached) return cached;

	const data = await fetchCensusData(
		[VARIABLES.NAME],
		'county:*',
		`state:${stateFips}`
	);

	const counties = data.slice(1).map(row => ({
		fips: row[2], // county FIPS (state is row[1])
		name: row[0].replace(/, [A-Za-z]+$/, ''), // Remove state suffix from name
		state: stateFips
	})).sort((a, b) => a.name.localeCompare(b.name));

	setCache(cacheKey, counties, CACHE_TTL.GEO);
	return counties;
}

/**
 * Get cities/places in a state
 * @param stateFips State FIPS code
 * @param search Optional search string to filter cities
 * @returns Array of cities/places
 */
export async function getCities(stateFips: string, search?: string): Promise<GeoEntity[]> {
	const cacheKey = `cities-${stateFips}`;
	let cities = getFromCache<GeoEntity[]>(cacheKey);

	if (!cities) {
		const data = await fetchCensusData(
			[VARIABLES.NAME],
			'place:*',
			`state:${stateFips}`
		);

		cities = data.slice(1).map(row => ({
			fips: row[2], // place FIPS
			name: row[0].replace(/ (city|town|village|CDP|borough),.*$/i, ''), // Clean up name
			state: stateFips
		})).sort((a, b) => a.name.localeCompare(b.name));

		setCache(cacheKey, cities, CACHE_TTL.GEO);
	}

	// Filter by search if provided
	if (search) {
		const searchLower = search.toLowerCase();
		cities = cities.filter(c => c.name.toLowerCase().includes(searchLower));
	}

	return cities;
}

/**
 * Search zip codes by number or city name
 * Note: Census API doesn't support direct zip code search by city name,
 * so this function searches by zip code prefix
 * @param query Zip code or partial zip code
 * @returns Array of matching zip codes
 */
export async function searchZipCodes(query: string): Promise<ZipCode[]> {
	// Clean query - only digits for zip codes
	const cleanQuery = query.replace(/\D/g, '');

	if (!cleanQuery || cleanQuery.length < 3) {
		return [];
	}

	const cacheKey = `zipcodes-${cleanQuery}`;
	const cached = getFromCache<ZipCode[]>(cacheKey);
	if (cached) return cached;

	// For zip codes, we need to query specific ones since wildcards aren't fully supported
	// We'll query the exact zip if 5 digits, otherwise construct a range
	let forClause: string;

	if (cleanQuery.length === 5) {
		forClause = `zip code tabulation area:${cleanQuery}`;
	} else {
		// Census API supports wildcards with * for zip codes
		forClause = `zip code tabulation area:${cleanQuery}*`;
	}

	try {
		const data = await fetchCensusData(
			[VARIABLES.NAME],
			forClause
		);

		const zipCodes = data.slice(1).map(row => ({
			fips: row[1],
			zipCode: row[1],
			name: row[0] // Usually "ZCTA5 XXXXX"
		}));

		setCache(cacheKey, zipCodes, CACHE_TTL.GEO);
		return zipCodes;

	} catch (err) {
		// Census API may not support wildcard for all cases, return empty
		console.error('Zip code search failed:', err);
		return [];
	}
}

// =============================================================================
// Demographic Functions
// =============================================================================

/**
 * Get demographics for a specific zip code (ZCTA)
 * @param zipCode 5-digit zip code
 * @returns Demographics data
 */
export async function getZipDemographics(zipCode: string): Promise<Demographics | null> {
	const cleanZip = zipCode.replace(/\D/g, '');
	if (cleanZip.length !== 5) {
		throw new Error('Invalid zip code format. Must be 5 digits.');
	}

	const cacheKey = `demo-zip-${cleanZip}`;
	const cached = getFromCache<Demographics>(cacheKey);
	if (cached) return cached;

	try {
		const data = await fetchCensusData(
			[VARIABLES.NAME, VARIABLES.POPULATION, VARIABLES.HOUSEHOLDS, VARIABLES.MEDIAN_INCOME, VARIABLES.MEDIAN_AGE],
			`zip code tabulation area:${cleanZip}`
		);

		if (data.length < 2) {
			return null;
		}

		const demographics = extractDemographics(data[1]);
		setCache(cacheKey, demographics, CACHE_TTL.DEMOGRAPHICS);
		return demographics;

	} catch (err) {
		console.error(`Failed to get demographics for zip ${cleanZip}:`, err);
		return null;
	}
}

/**
 * Get demographics for a county
 * @param stateFips State FIPS code
 * @param countyFips County FIPS code
 * @returns Demographics data
 */
export async function getCountyDemographics(
	stateFips: string,
	countyFips: string
): Promise<Demographics | null> {
	const cacheKey = `demo-county-${stateFips}-${countyFips}`;
	const cached = getFromCache<Demographics>(cacheKey);
	if (cached) return cached;

	try {
		const data = await fetchCensusData(
			[VARIABLES.NAME, VARIABLES.POPULATION, VARIABLES.HOUSEHOLDS, VARIABLES.MEDIAN_INCOME, VARIABLES.MEDIAN_AGE],
			`county:${countyFips}`,
			`state:${stateFips}`
		);

		if (data.length < 2) {
			return null;
		}

		const demographics = extractDemographics(data[1]);
		setCache(cacheKey, demographics, CACHE_TTL.DEMOGRAPHICS);
		return demographics;

	} catch (err) {
		console.error(`Failed to get demographics for county ${countyFips}:`, err);
		return null;
	}
}

/**
 * Get demographics for a city/place
 * @param stateFips State FIPS code
 * @param placeFips Place FIPS code
 * @returns Demographics data
 */
export async function getCityDemographics(
	stateFips: string,
	placeFips: string
): Promise<Demographics | null> {
	const cacheKey = `demo-city-${stateFips}-${placeFips}`;
	const cached = getFromCache<Demographics>(cacheKey);
	if (cached) return cached;

	try {
		const data = await fetchCensusData(
			[VARIABLES.NAME, VARIABLES.POPULATION, VARIABLES.HOUSEHOLDS, VARIABLES.MEDIAN_INCOME, VARIABLES.MEDIAN_AGE],
			`place:${placeFips}`,
			`state:${stateFips}`
		);

		if (data.length < 2) {
			return null;
		}

		const demographics = extractDemographics(data[1]);
		setCache(cacheKey, demographics, CACHE_TTL.DEMOGRAPHICS);
		return demographics;

	} catch (err) {
		console.error(`Failed to get demographics for place ${placeFips}:`, err);
		return null;
	}
}

/**
 * Aggregate demographics for multiple zip codes
 * Useful for calculating territory-wide demographics
 *
 * Note: Median values (income, age) are averaged when aggregating,
 * which is an approximation. For precise territory analysis,
 * consider population-weighted averages.
 *
 * @param zipCodes Array of 5-digit zip codes
 * @returns Aggregated demographics
 */
export async function aggregateZipDemographics(zipCodes: string[]): Promise<Demographics> {
	if (!zipCodes.length) {
		return {
			population: 0,
			households: 0,
			medianIncome: 0,
			medianAge: 0
		};
	}

	// Fetch demographics for all zip codes in parallel
	const results = await Promise.all(
		zipCodes.map(zip => getZipDemographics(zip))
	);

	// Filter out nulls (zip codes that weren't found)
	const validResults = results.filter((r): r is Demographics => r !== null);

	if (!validResults.length) {
		return {
			population: 0,
			households: 0,
			medianIncome: 0,
			medianAge: 0
		};
	}

	// Sum population and households
	const totalPopulation = validResults.reduce((sum, d) => sum + d.population, 0);
	const totalHouseholds = validResults.reduce((sum, d) => sum + d.households, 0);

	// Population-weighted average for median income and age
	// This gives more accurate aggregates for territories with varying populations
	let weightedIncome = 0;
	let weightedAge = 0;

	for (const result of validResults) {
		if (result.population > 0) {
			weightedIncome += result.medianIncome * result.population;
			weightedAge += result.medianAge * result.population;
		}
	}

	const avgMedianIncome = totalPopulation > 0
		? Math.round(weightedIncome / totalPopulation)
		: 0;
	const avgMedianAge = totalPopulation > 0
		? Math.round((weightedAge / totalPopulation) * 10) / 10
		: 0;

	return {
		population: totalPopulation,
		households: totalHouseholds,
		medianIncome: avgMedianIncome,
		medianAge: avgMedianAge
	};
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Map of state names to abbreviations
 */
const STATE_ABBREVIATIONS: Record<string, string> = {
	'Alabama': 'AL', 'Alaska': 'AK', 'Arizona': 'AZ', 'Arkansas': 'AR',
	'California': 'CA', 'Colorado': 'CO', 'Connecticut': 'CT', 'Delaware': 'DE',
	'Florida': 'FL', 'Georgia': 'GA', 'Hawaii': 'HI', 'Idaho': 'ID',
	'Illinois': 'IL', 'Indiana': 'IN', 'Iowa': 'IA', 'Kansas': 'KS',
	'Kentucky': 'KY', 'Louisiana': 'LA', 'Maine': 'ME', 'Maryland': 'MD',
	'Massachusetts': 'MA', 'Michigan': 'MI', 'Minnesota': 'MN', 'Mississippi': 'MS',
	'Missouri': 'MO', 'Montana': 'MT', 'Nebraska': 'NE', 'Nevada': 'NV',
	'New Hampshire': 'NH', 'New Jersey': 'NJ', 'New Mexico': 'NM', 'New York': 'NY',
	'North Carolina': 'NC', 'North Dakota': 'ND', 'Ohio': 'OH', 'Oklahoma': 'OK',
	'Oregon': 'OR', 'Pennsylvania': 'PA', 'Rhode Island': 'RI', 'South Carolina': 'SC',
	'South Dakota': 'SD', 'Tennessee': 'TN', 'Texas': 'TX', 'Utah': 'UT',
	'Vermont': 'VT', 'Virginia': 'VA', 'Washington': 'WA', 'West Virginia': 'WV',
	'Wisconsin': 'WI', 'Wyoming': 'WY', 'District of Columbia': 'DC',
	'Puerto Rico': 'PR'
};

/**
 * Get state abbreviation from full name
 */
function getStateAbbreviation(stateName: string): string {
	return STATE_ABBREVIATIONS[stateName] || stateName.substring(0, 2).toUpperCase();
}

/**
 * Get state name from FIPS code
 * @param stateFips State FIPS code
 * @returns State name or null if not found
 */
export async function getStateName(stateFips: string): Promise<string | null> {
	const states = await getStates();
	const state = states.find(s => s.fips === stateFips);
	return state?.name || null;
}

/**
 * Validate a FIPS code format
 */
export function isValidFips(fips: string, type: 'state' | 'county' | 'place' | 'zip'): boolean {
	const lengths: Record<string, number> = {
		state: 2,
		county: 3,
		place: 5,
		zip: 5
	};

	const expectedLength = lengths[type];
	return /^\d+$/.test(fips) && fips.length === expectedLength;
}

// =============================================================================
// Batch Operations (for performance with large territory definitions)
// =============================================================================

/**
 * Batch fetch demographics for multiple counties
 * More efficient than individual calls for large territories
 */
export async function batchGetCountyDemographics(
	counties: Array<{ stateFips: string; countyFips: string }>
): Promise<Map<string, Demographics>> {
	const results = new Map<string, Demographics>();

	// Group by state for more efficient queries
	const byState = new Map<string, string[]>();
	for (const { stateFips, countyFips } of counties) {
		const existing = byState.get(stateFips) || [];
		existing.push(countyFips);
		byState.set(stateFips, existing);
	}

	// Fetch each state's counties
	const fetchPromises = Array.from(byState.entries()).map(async ([stateFips, countyFipsList]) => {
		for (const countyFips of countyFipsList) {
			const demo = await getCountyDemographics(stateFips, countyFips);
			if (demo) {
				results.set(`${stateFips}-${countyFips}`, demo);
			}
		}
	});

	await Promise.all(fetchPromises);
	return results;
}

/**
 * Format demographics for display
 */
export function formatDemographics(demo: Demographics): {
	population: string;
	households: string;
	medianIncome: string;
	medianAge: string;
} {
	return {
		population: demo.population.toLocaleString(),
		households: demo.households.toLocaleString(),
		medianIncome: `$${demo.medianIncome.toLocaleString()}`,
		medianAge: demo.medianAge.toFixed(1)
	};
}
