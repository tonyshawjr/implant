/**
 * Geocoding Utilities
 * Server-side geocoding functions using Nominatim (OpenStreetMap) API
 */

// Nominatim API endpoints
const NOMINATIM_SEARCH_URL = 'https://nominatim.openstreetmap.org/search';
const NOMINATIM_REVERSE_URL = 'https://nominatim.openstreetmap.org/reverse';

// User agent for Nominatim requests (required)
const USER_AGENT = 'SqueezMedia Platform (contact@squeezmedia.com)';

// Rate limiting: Nominatim allows max 1 request per second
let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL = 1100; // 1.1 seconds to be safe

export interface GeocodingResult {
  lat: number;
  lng: number;
  displayName: string;
  addressType: string;
  address: {
    houseNumber?: string;
    road?: string;
    city?: string;
    town?: string;
    village?: string;
    county?: string;
    state?: string;
    stateCode?: string;
    postcode?: string;
    country?: string;
    countryCode?: string;
  };
  boundingBox?: {
    south: number;
    north: number;
    west: number;
    east: number;
  };
  importance?: number;
}

export interface ReverseGeocodingResult {
  lat: number;
  lng: number;
  displayName: string;
  address: {
    houseNumber?: string;
    road?: string;
    city?: string;
    town?: string;
    village?: string;
    county?: string;
    state?: string;
    stateCode?: string;
    postcode?: string;
    country?: string;
    countryCode?: string;
  };
}

/**
 * Rate limit requests to comply with Nominatim usage policy
 */
async function rateLimit(): Promise<void> {
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;

  if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
    await new Promise(resolve => setTimeout(resolve, MIN_REQUEST_INTERVAL - timeSinceLastRequest));
  }

  lastRequestTime = Date.now();
}

/**
 * Convert an address string to latitude and longitude coordinates
 *
 * @param address - The address to geocode (can be full address, city/state, or ZIP code)
 * @param options - Optional parameters for the search
 * @returns Array of geocoding results, ordered by relevance
 */
export async function geocodeAddress(
  address: string,
  options: {
    limit?: number;
    countryCode?: string;
    viewbox?: { south: number; north: number; west: number; east: number };
  } = {}
): Promise<GeocodingResult[]> {
  const { limit = 5, countryCode = 'us', viewbox } = options;

  await rateLimit();

  const params = new URLSearchParams({
    q: address,
    format: 'json',
    addressdetails: '1',
    limit: limit.toString(),
    countrycodes: countryCode
  });

  // Add viewbox if provided (for biasing results to a geographic area)
  if (viewbox) {
    params.append('viewbox', `${viewbox.west},${viewbox.north},${viewbox.east},${viewbox.south}`);
    params.append('bounded', '0'); // Prefer but don't require results in viewbox
  }

  try {
    const response = await fetch(`${NOMINATIM_SEARCH_URL}?${params}`, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': USER_AGENT
      }
    });

    if (!response.ok) {
      throw new Error(`Geocoding request failed with status ${response.status}`);
    }

    const data = await response.json();

    return data.map((item: any) => ({
      lat: parseFloat(item.lat),
      lng: parseFloat(item.lon),
      displayName: item.display_name,
      addressType: item.type,
      address: {
        houseNumber: item.address?.house_number,
        road: item.address?.road,
        city: item.address?.city,
        town: item.address?.town,
        village: item.address?.village,
        county: item.address?.county,
        state: item.address?.state,
        stateCode: getStateCode(item.address?.state),
        postcode: item.address?.postcode,
        country: item.address?.country,
        countryCode: item.address?.country_code?.toUpperCase()
      },
      boundingBox: item.boundingbox ? {
        south: parseFloat(item.boundingbox[0]),
        north: parseFloat(item.boundingbox[1]),
        west: parseFloat(item.boundingbox[2]),
        east: parseFloat(item.boundingbox[3])
      } : undefined,
      importance: item.importance
    }));
  } catch (error) {
    console.error('Geocoding error:', error);
    throw new Error(`Failed to geocode address: ${address}`);
  }
}

/**
 * Convert latitude and longitude coordinates to an address
 *
 * @param lat - Latitude
 * @param lng - Longitude
 * @returns The reverse geocoding result with address details
 */
export async function reverseGeocode(
  lat: number,
  lng: number
): Promise<ReverseGeocodingResult | null> {
  await rateLimit();

  const params = new URLSearchParams({
    lat: lat.toString(),
    lon: lng.toString(),
    format: 'json',
    addressdetails: '1'
  });

  try {
    const response = await fetch(`${NOMINATIM_REVERSE_URL}?${params}`, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': USER_AGENT
      }
    });

    if (!response.ok) {
      if (response.status === 404) {
        return null; // No address found for coordinates
      }
      throw new Error(`Reverse geocoding request failed with status ${response.status}`);
    }

    const data = await response.json();

    if (data.error) {
      return null;
    }

    return {
      lat: parseFloat(data.lat),
      lng: parseFloat(data.lon),
      displayName: data.display_name,
      address: {
        houseNumber: data.address?.house_number,
        road: data.address?.road,
        city: data.address?.city,
        town: data.address?.town,
        village: data.address?.village,
        county: data.address?.county,
        state: data.address?.state,
        stateCode: getStateCode(data.address?.state),
        postcode: data.address?.postcode,
        country: data.address?.country,
        countryCode: data.address?.country_code?.toUpperCase()
      }
    };
  } catch (error) {
    console.error('Reverse geocoding error:', error);
    throw new Error(`Failed to reverse geocode coordinates: ${lat}, ${lng}`);
  }
}

/**
 * Get the best city name from geocoding results
 */
export function getCityName(address: GeocodingResult['address'] | ReverseGeocodingResult['address']): string {
  return address.city || address.town || address.village || '';
}

/**
 * Format an address for display
 */
export function formatAddress(address: GeocodingResult['address'] | ReverseGeocodingResult['address']): string {
  const parts: string[] = [];

  const street = [address.houseNumber, address.road].filter(Boolean).join(' ');
  if (street) parts.push(street);

  const city = getCityName(address);
  if (city) parts.push(city);

  if (address.state) {
    parts.push(address.stateCode || address.state);
  }

  if (address.postcode) {
    // Append ZIP to the last part if it's the state
    if (parts.length > 0 && (parts[parts.length - 1] === address.state || parts[parts.length - 1] === address.stateCode)) {
      parts[parts.length - 1] += ` ${address.postcode}`;
    } else {
      parts.push(address.postcode);
    }
  }

  return parts.join(', ');
}

/**
 * US state name to abbreviation mapping
 */
const US_STATE_CODES: Record<string, string> = {
  'Alabama': 'AL',
  'Alaska': 'AK',
  'Arizona': 'AZ',
  'Arkansas': 'AR',
  'California': 'CA',
  'Colorado': 'CO',
  'Connecticut': 'CT',
  'Delaware': 'DE',
  'Florida': 'FL',
  'Georgia': 'GA',
  'Hawaii': 'HI',
  'Idaho': 'ID',
  'Illinois': 'IL',
  'Indiana': 'IN',
  'Iowa': 'IA',
  'Kansas': 'KS',
  'Kentucky': 'KY',
  'Louisiana': 'LA',
  'Maine': 'ME',
  'Maryland': 'MD',
  'Massachusetts': 'MA',
  'Michigan': 'MI',
  'Minnesota': 'MN',
  'Mississippi': 'MS',
  'Missouri': 'MO',
  'Montana': 'MT',
  'Nebraska': 'NE',
  'Nevada': 'NV',
  'New Hampshire': 'NH',
  'New Jersey': 'NJ',
  'New Mexico': 'NM',
  'New York': 'NY',
  'North Carolina': 'NC',
  'North Dakota': 'ND',
  'Ohio': 'OH',
  'Oklahoma': 'OK',
  'Oregon': 'OR',
  'Pennsylvania': 'PA',
  'Rhode Island': 'RI',
  'South Carolina': 'SC',
  'South Dakota': 'SD',
  'Tennessee': 'TN',
  'Texas': 'TX',
  'Utah': 'UT',
  'Vermont': 'VT',
  'Virginia': 'VA',
  'Washington': 'WA',
  'West Virginia': 'WV',
  'Wisconsin': 'WI',
  'Wyoming': 'WY',
  'District of Columbia': 'DC',
  'Puerto Rico': 'PR',
  'Guam': 'GU',
  'Virgin Islands': 'VI',
  'American Samoa': 'AS',
  'Northern Mariana Islands': 'MP'
};

/**
 * Get US state abbreviation from state name
 */
function getStateCode(stateName: string | undefined): string | undefined {
  if (!stateName) return undefined;
  return US_STATE_CODES[stateName] || undefined;
}

/**
 * Validate coordinates are within reasonable bounds
 */
export function isValidCoordinates(lat: number, lng: number): boolean {
  return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
}

/**
 * Check if coordinates are within the continental US (approximate)
 */
export function isInContinentalUS(lat: number, lng: number): boolean {
  // Approximate bounding box for continental US
  return lat >= 24.5 && lat <= 49.5 && lng >= -125 && lng <= -66.5;
}
