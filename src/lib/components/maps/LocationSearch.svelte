<script lang="ts">
  /**
   * LocationSearch.svelte
   * Search input with geocoding using Nominatim (OpenStreetMap)
   * Returns lat/lng and address when a location is selected
   */

  import { createEventDispatcher } from 'svelte';
  import { Input, Spinner, Dropdown, DropdownItem } from 'flowbite-svelte';
  import { SearchOutline, MapPinOutline, CloseOutline } from 'flowbite-svelte-icons';

  interface GeocodingResult {
    displayName: string;
    lat: number;
    lng: number;
    addressType: string;
    city?: string;
    state?: string;
    country?: string;
    boundingBox?: [number, number, number, number]; // [south, north, west, east]
  }

  interface Props {
    /** Placeholder text for the search input */
    placeholder?: string;
    /** Initial value for the search input */
    value?: string;
    /** Whether the input is disabled */
    disabled?: boolean;
    /** Custom class for the container */
    class?: string;
    /** Minimum characters before searching */
    minSearchLength?: number;
    /** Debounce delay in milliseconds */
    debounceMs?: number;
    /** Maximum number of results to show */
    maxResults?: number;
    /** Restrict search to a country code (e.g., 'us') */
    countryCode?: string;
  }

  let {
    placeholder = 'Search for a location...',
    value = '',
    disabled = false,
    class: className = '',
    minSearchLength = 3,
    debounceMs = 300,
    maxResults = 5,
    countryCode = 'us'
  }: Props = $props();

  const dispatch = createEventDispatcher<{
    select: { result: GeocodingResult };
    clear: void;
    error: { message: string };
  }>();

  let searchValue = $state('');
  let results = $state<GeocodingResult[]>([]);
  let isSearching = $state(false);
  let showDropdown = $state(false);
  let errorMessage = $state<string | null>(null);
  let debounceTimeout: ReturnType<typeof setTimeout>;
  let selectedResult = $state<GeocodingResult | null>(null);

  // Initialize searchValue from prop and sync if prop changes externally
  $effect(() => {
    if (value !== undefined) {
      searchValue = value;
    }
  });

  // Nominatim API endpoint
  const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';

  async function searchLocation(query: string): Promise<void> {
    if (query.length < minSearchLength) {
      results = [];
      showDropdown = false;
      return;
    }

    isSearching = true;
    errorMessage = null;

    try {
      const params = new URLSearchParams({
        q: query,
        format: 'json',
        addressdetails: '1',
        limit: maxResults.toString(),
        countrycodes: countryCode
      });

      const response = await fetch(`${NOMINATIM_URL}?${params}`, {
        headers: {
          'Accept': 'application/json',
          // Nominatim requires a User-Agent header
          'User-Agent': 'SqueezMedia Platform (contact@squeezmedia.com)'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to search for location');
      }

      const data = await response.json();

      results = data.map((item: any) => ({
        displayName: item.display_name,
        lat: parseFloat(item.lat),
        lng: parseFloat(item.lon),
        addressType: item.type,
        city: item.address?.city || item.address?.town || item.address?.village,
        state: item.address?.state,
        country: item.address?.country,
        boundingBox: item.boundingbox ? [
          parseFloat(item.boundingbox[0]),
          parseFloat(item.boundingbox[1]),
          parseFloat(item.boundingbox[2]),
          parseFloat(item.boundingbox[3])
        ] as [number, number, number, number] : undefined
      }));

      showDropdown = results.length > 0;
    } catch (err) {
      console.error('Geocoding error:', err);
      errorMessage = 'Failed to search for location. Please try again.';
      dispatch('error', { message: errorMessage });
      results = [];
      showDropdown = false;
    } finally {
      isSearching = false;
    }
  }

  function handleInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    searchValue = target.value;
    selectedResult = null;

    // Clear any existing timeout
    clearTimeout(debounceTimeout);

    if (searchValue.length < minSearchLength) {
      results = [];
      showDropdown = false;
      return;
    }

    // Debounce the search
    debounceTimeout = setTimeout(() => {
      searchLocation(searchValue);
    }, debounceMs);
  }

  function handleSelect(result: GeocodingResult): void {
    selectedResult = result;
    searchValue = result.displayName;
    showDropdown = false;
    results = [];
    dispatch('select', { result });
  }

  function handleClear(): void {
    searchValue = '';
    selectedResult = null;
    results = [];
    showDropdown = false;
    errorMessage = null;
    dispatch('clear');
  }

  function handleFocus(): void {
    if (results.length > 0 && !selectedResult) {
      showDropdown = true;
    }
  }

  function handleBlur(): void {
    // Delay hiding dropdown to allow click events to fire
    setTimeout(() => {
      showDropdown = false;
    }, 200);
  }

  function handleKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      showDropdown = false;
      // Blur the active element if it's an input
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
    }
  }

  function formatDisplayName(result: GeocodingResult): string {
    const parts: string[] = [];

    if (result.city) parts.push(result.city);
    if (result.state) parts.push(result.state);
    if (result.country && result.country !== 'United States') parts.push(result.country);

    if (parts.length > 0) {
      return parts.join(', ');
    }

    // Fallback to truncated display name
    const maxLength = 50;
    if (result.displayName.length > maxLength) {
      return result.displayName.substring(0, maxLength) + '...';
    }
    return result.displayName;
  }

  function getAddressTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      city: 'City',
      town: 'Town',
      village: 'Village',
      suburb: 'Suburb',
      county: 'County',
      state: 'State',
      postcode: 'ZIP Code',
      administrative: 'Area',
      neighbourhood: 'Neighborhood'
    };
    return labels[type] || type;
  }

  // Cleanup on unmount
  $effect(() => {
    return () => {
      clearTimeout(debounceTimeout);
    };
  });

  /**
   * Get the currently selected result
   */
  export function getSelectedResult(): GeocodingResult | null {
    return selectedResult;
  }

  /**
   * Clear the search input and results
   */
  export function clear(): void {
    handleClear();
  }

  /**
   * Set the search value programmatically
   */
  export function setValue(newValue: string): void {
    searchValue = newValue;
  }
</script>

<div class="relative {className}">
  <div class="relative">
    <Input
      type="text"
      {placeholder}
      value={searchValue}
      {disabled}
      oninput={handleInput}
      onfocus={handleFocus}
      onblur={handleBlur}
      onkeydown={handleKeydown}
      class="ps-9 pr-10"
    >
      {#snippet left()}
        {#if isSearching}
          <Spinner size="4" color="gray" />
        {:else}
          <SearchOutline class="h-5 w-5" />
        {/if}
      {/snippet}
    </Input>

    {#if searchValue && !disabled}
      <button
        type="button"
        class="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
        onclick={handleClear}
        aria-label="Clear search"
      >
        <CloseOutline class="h-4 w-4" />
      </button>
    {/if}
  </div>

  {#if showDropdown && results.length > 0}
    <div class="absolute z-50 mt-1 w-full rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-600 dark:bg-gray-700">
      <ul class="max-h-60 overflow-y-auto py-1">
        {#each results as result}
          <li>
            <button
              type="button"
              class="flex w-full items-start gap-3 px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-600"
              onclick={() => handleSelect(result)}
            >
              <MapPinOutline class="mt-0.5 h-4 w-4 flex-shrink-0 text-gray-400" />
              <div class="min-w-0 flex-1">
                <p class="truncate text-sm font-medium text-gray-900 dark:text-white">
                  {formatDisplayName(result)}
                </p>
                <p class="truncate text-xs text-gray-500 dark:text-gray-400">
                  {result.displayName}
                </p>
                <p class="mt-0.5 text-xs text-gray-400 dark:text-gray-500">
                  {getAddressTypeLabel(result.addressType)} &middot; {result.lat.toFixed(4)}, {result.lng.toFixed(4)}
                </p>
              </div>
            </button>
          </li>
        {/each}
      </ul>
    </div>
  {/if}

  {#if errorMessage}
    <p class="mt-1 text-sm text-red-600 dark:text-red-400">{errorMessage}</p>
  {/if}
</div>
