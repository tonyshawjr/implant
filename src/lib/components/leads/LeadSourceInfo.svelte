<script lang="ts">
  import { Card, Badge } from 'flowbite-svelte';
  import {
    GlobeOutline,
    RocketOutline,
    MapPinOutline,
    LinkOutline
  } from 'flowbite-svelte-icons';

  interface Campaign {
    id: string;
    name: string;
    platform: string;
  }

  interface Territory {
    id: string;
    name: string;
    city: string;
    state: string;
  }

  interface Props {
    source: string;
    sourceDetail: string | null;
    campaign: Campaign | null;
    territory: Territory | null;
    utmSource: string | null;
    utmMedium: string | null;
    utmCampaign: string | null;
    utmContent: string | null;
  }

  let {
    source,
    sourceDetail,
    campaign,
    territory,
    utmSource,
    utmMedium,
    utmCampaign,
    utmContent
  }: Props = $props();

  // Format source name
  function formatSource(src: string): string {
    const sources: Record<string, string> = {
      google: 'Google',
      facebook: 'Facebook',
      instagram: 'Instagram',
      website: 'Website',
      referral: 'Referral',
      manual: 'Manual Entry'
    };
    return sources[src] ?? src;
  }

  // Get source badge color
  function getSourceColor(src: string): 'red' | 'blue' | 'purple' | 'green' | 'yellow' | 'dark' {
    const colors: Record<string, 'red' | 'blue' | 'purple' | 'green' | 'yellow' | 'dark'> = {
      google: 'blue',
      facebook: 'blue',
      instagram: 'purple',
      website: 'green',
      referral: 'yellow',
      manual: 'dark'
    };
    return colors[src] ?? 'dark';
  }

  // Check if we have UTM parameters
  let hasUtm = $derived(utmSource || utmMedium || utmCampaign || utmContent);
</script>

<Card>
  <h3 class="mb-4 text-lg font-semibold text-gray-900 dark:text-white">Source Information</h3>

  <div class="space-y-4">
    <!-- Source -->
    <div class="flex items-start gap-3">
      <div class="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-primary-100 dark:bg-primary-900">
        <GlobeOutline class="h-5 w-5 text-primary-600 dark:text-primary-300" />
      </div>
      <div>
        <p class="text-sm text-gray-500 dark:text-gray-400">Lead Source</p>
        <div class="flex items-center gap-2">
          <Badge color={getSourceColor(source)}>
            {formatSource(source)}
          </Badge>
          {#if sourceDetail}
            <span class="text-sm text-gray-600 dark:text-gray-400">
              ({sourceDetail})
            </span>
          {/if}
        </div>
      </div>
    </div>

    <!-- Campaign -->
    {#if campaign}
      <div class="flex items-start gap-3">
        <div class="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-purple-100 dark:bg-purple-900">
          <RocketOutline class="h-5 w-5 text-purple-600 dark:text-purple-300" />
        </div>
        <div>
          <p class="text-sm text-gray-500 dark:text-gray-400">Campaign</p>
          <a
            href="/campaigns/{campaign.id}"
            class="font-medium text-primary-600 hover:underline dark:text-primary-400"
          >
            {campaign.name}
          </a>
          <p class="text-sm text-gray-600 dark:text-gray-400">
            {campaign.platform}
          </p>
        </div>
      </div>
    {/if}

    <!-- Territory -->
    {#if territory}
      <div class="flex items-start gap-3">
        <div class="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900">
          <MapPinOutline class="h-5 w-5 text-green-600 dark:text-green-300" />
        </div>
        <div>
          <p class="text-sm text-gray-500 dark:text-gray-400">Territory</p>
          <p class="font-medium text-gray-900 dark:text-white">
            {territory.name}
          </p>
          <p class="text-sm text-gray-600 dark:text-gray-400">
            {territory.city}, {territory.state}
          </p>
        </div>
      </div>
    {/if}

    <!-- UTM Parameters -->
    {#if hasUtm}
      <div class="flex items-start gap-3">
        <div class="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-yellow-100 dark:bg-yellow-900">
          <LinkOutline class="h-5 w-5 text-yellow-600 dark:text-yellow-300" />
        </div>
        <div class="flex-1">
          <p class="mb-2 text-sm text-gray-500 dark:text-gray-400">UTM Parameters</p>
          <div class="grid gap-2 text-sm">
            {#if utmSource}
              <div class="flex items-center justify-between rounded bg-gray-50 px-2 py-1 dark:bg-gray-700">
                <span class="text-gray-500 dark:text-gray-400">Source</span>
                <span class="font-medium text-gray-900 dark:text-white">{utmSource}</span>
              </div>
            {/if}
            {#if utmMedium}
              <div class="flex items-center justify-between rounded bg-gray-50 px-2 py-1 dark:bg-gray-700">
                <span class="text-gray-500 dark:text-gray-400">Medium</span>
                <span class="font-medium text-gray-900 dark:text-white">{utmMedium}</span>
              </div>
            {/if}
            {#if utmCampaign}
              <div class="flex items-center justify-between rounded bg-gray-50 px-2 py-1 dark:bg-gray-700">
                <span class="text-gray-500 dark:text-gray-400">Campaign</span>
                <span class="font-medium text-gray-900 dark:text-white">{utmCampaign}</span>
              </div>
            {/if}
            {#if utmContent}
              <div class="flex items-center justify-between rounded bg-gray-50 px-2 py-1 dark:bg-gray-700">
                <span class="text-gray-500 dark:text-gray-400">Content</span>
                <span class="font-medium text-gray-900 dark:text-white">{utmContent}</span>
              </div>
            {/if}
          </div>
        </div>
      </div>
    {/if}
  </div>
</Card>
