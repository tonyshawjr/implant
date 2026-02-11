<script lang="ts">
  import { Card, Badge } from 'flowbite-svelte';
  import { GlobeOutline, ChartOutline, MapPinOutline, LinkOutline } from 'flowbite-svelte-icons';

  interface Props {
    source: string | null;
    sourceDetail: string | null;
    campaign: { id: string; name: string } | null;
    territory: { id: string; name: string } | null;
    utmSource: string | null;
    utmMedium: string | null;
    utmCampaign: string | null;
    utmContent: string | null;
  }

  let { source, sourceDetail, campaign, territory, utmSource, utmMedium, utmCampaign, utmContent }: Props = $props();

  const sourceColors: Record<string, string> = {
    facebook: 'blue',
    google: 'red',
    instagram: 'pink',
    website: 'green',
    referral: 'purple',
    direct: 'gray'
  };

  function getSourceColor(s: string | null): 'blue' | 'red' | 'pink' | 'green' | 'purple' | 'gray' {
    if (!s) return 'gray';
    return (sourceColors[s.toLowerCase()] || 'gray') as 'blue' | 'red' | 'pink' | 'green' | 'purple' | 'gray';
  }

  function formatSource(s: string | null): string {
    if (!s) return 'Unknown';
    return s.charAt(0).toUpperCase() + s.slice(1);
  }

  const hasUtmParams = utmSource || utmMedium || utmCampaign || utmContent;
</script>

<Card>
  <h3 class="mb-4 text-lg font-semibold text-gray-900 dark:text-white">Source Information</h3>
  <div class="space-y-4">
    {#if source}
      <div class="flex items-center gap-3">
        <GlobeOutline class="h-5 w-5 text-gray-400" />
        <div>
          <p class="text-sm text-gray-500 dark:text-gray-400">Source</p>
          <div class="flex items-center gap-2">
            <Badge color={getSourceColor(source)}>{formatSource(source)}</Badge>
            {#if sourceDetail}
              <span class="text-sm text-gray-600 dark:text-gray-300">{sourceDetail}</span>
            {/if}
          </div>
        </div>
      </div>
    {/if}

    {#if campaign}
      <div class="flex items-center gap-3">
        <ChartOutline class="h-5 w-5 text-gray-400" />
        <div>
          <p class="text-sm text-gray-500 dark:text-gray-400">Campaign</p>
          <a href="/campaigns/{campaign.id}" class="font-medium text-primary-600 hover:underline dark:text-primary-400">
            {campaign.name}
          </a>
        </div>
      </div>
    {/if}

    {#if territory}
      <div class="flex items-center gap-3">
        <MapPinOutline class="h-5 w-5 text-gray-400" />
        <div>
          <p class="text-sm text-gray-500 dark:text-gray-400">Territory</p>
          <p class="font-medium text-gray-900 dark:text-white">{territory.name}</p>
        </div>
      </div>
    {/if}

    {#if hasUtmParams}
      <div class="flex items-start gap-3">
        <LinkOutline class="mt-0.5 h-5 w-5 text-gray-400" />
        <div class="flex-1">
          <p class="mb-2 text-sm text-gray-500 dark:text-gray-400">UTM Parameters</p>
          <div class="space-y-1 rounded-lg bg-gray-50 p-3 dark:bg-gray-800">
            {#if utmSource}
              <p class="text-sm">
                <span class="text-gray-500 dark:text-gray-400">Source:</span>
                <span class="ml-1 text-gray-900 dark:text-white">{utmSource}</span>
              </p>
            {/if}
            {#if utmMedium}
              <p class="text-sm">
                <span class="text-gray-500 dark:text-gray-400">Medium:</span>
                <span class="ml-1 text-gray-900 dark:text-white">{utmMedium}</span>
              </p>
            {/if}
            {#if utmCampaign}
              <p class="text-sm">
                <span class="text-gray-500 dark:text-gray-400">Campaign:</span>
                <span class="ml-1 text-gray-900 dark:text-white">{utmCampaign}</span>
              </p>
            {/if}
            {#if utmContent}
              <p class="text-sm">
                <span class="text-gray-500 dark:text-gray-400">Content:</span>
                <span class="ml-1 text-gray-900 dark:text-white">{utmContent}</span>
              </p>
            {/if}
          </div>
        </div>
      </div>
    {/if}
  </div>
</Card>
