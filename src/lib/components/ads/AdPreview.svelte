<script lang="ts">
  import { Tabs, TabItem, Badge } from 'flowbite-svelte';
  import FacebookAdPreview from './FacebookAdPreview.svelte';
  import GoogleAdPreview from './GoogleAdPreview.svelte';
  import InstagramAdPreview from './InstagramAdPreview.svelte';

  interface Props {
    headline: string;
    primaryText: string;
    ctaText?: string;
    ctaUrl?: string;
    imageUrl?: string;
    videoUrl?: string;
    businessName: string;
    websiteUrl?: string;
    platform?: 'facebook' | 'google' | 'instagram' | 'all';
  }

  let {
    headline,
    primaryText,
    ctaText = 'Learn More',
    ctaUrl = '',
    imageUrl = '',
    videoUrl = '',
    businessName,
    websiteUrl = '',
    platform = 'all'
  }: Props = $props();

  // Character limits per platform
  const limits = {
    facebook: {
      headline: 40,
      primaryText: 125,
      description: 30
    },
    google: {
      headline: 30,
      description: 90
    },
    instagram: {
      primaryText: 125
    }
  };

  // Check if text exceeds limits
  function isOverLimit(text: string, limit: number): boolean {
    return text.length > limit;
  }

  // Truncate text for preview
  function truncate(text: string, limit: number): string {
    if (text.length <= limit) return text;
    return text.substring(0, limit - 3) + '...';
  }

  // Get first headline if multiple
  function getFirstHeadline(headlines: string): string {
    const lines = headlines.split('\n').filter(h => h.trim());
    return lines[0] || '';
  }

  let activeHeadline = $derived(getFirstHeadline(headline));
</script>

<div class="ad-preview-container">
  {#if platform === 'all'}
    <Tabs style="underline" contentClass="p-4 bg-gray-50 dark:bg-gray-800 rounded-b-lg">
      <TabItem open title="Facebook">
        <div class="flex items-center gap-2 mb-3">
          <Badge color="blue">Feed Ad</Badge>
          {#if isOverLimit(activeHeadline, limits.facebook.headline)}
            <Badge color="red">Headline over {limits.facebook.headline} chars</Badge>
          {/if}
          {#if isOverLimit(primaryText, limits.facebook.primaryText)}
            <Badge color="yellow">Text over {limits.facebook.primaryText} chars</Badge>
          {/if}
        </div>
        <FacebookAdPreview
          {headline}
          {primaryText}
          {ctaText}
          {imageUrl}
          {videoUrl}
          {businessName}
        />
      </TabItem>

      <TabItem title="Instagram">
        <div class="flex items-center gap-2 mb-3">
          <Badge color="pink">Feed Post</Badge>
          {#if isOverLimit(primaryText, limits.instagram.primaryText)}
            <Badge color="yellow">Caption over {limits.instagram.primaryText} chars</Badge>
          {/if}
        </div>
        <InstagramAdPreview
          {headline}
          {primaryText}
          {ctaText}
          {imageUrl}
          {videoUrl}
          {businessName}
        />
      </TabItem>

      <TabItem title="Google">
        <div class="flex items-center gap-2 mb-3">
          <Badge color="green">Search Ad</Badge>
          {#if isOverLimit(activeHeadline, limits.google.headline)}
            <Badge color="red">Headline over {limits.google.headline} chars</Badge>
          {/if}
        </div>
        <GoogleAdPreview
          {headline}
          description={primaryText}
          displayUrl={websiteUrl}
          {businessName}
        />
      </TabItem>
    </Tabs>
  {:else if platform === 'facebook'}
    <FacebookAdPreview
      {headline}
      {primaryText}
      {ctaText}
      {imageUrl}
      {videoUrl}
      {businessName}
    />
  {:else if platform === 'instagram'}
    <InstagramAdPreview
      {headline}
      {primaryText}
      {ctaText}
      {imageUrl}
      {videoUrl}
      {businessName}
    />
  {:else if platform === 'google'}
    <GoogleAdPreview
      {headline}
      description={primaryText}
      displayUrl={websiteUrl}
      {businessName}
    />
  {/if}
</div>

<style>
  .ad-preview-container {
    max-width: 500px;
  }
</style>
