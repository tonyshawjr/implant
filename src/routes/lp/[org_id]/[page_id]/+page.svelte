<script lang="ts">
  import type { PageData } from './$types';
  import { page } from '$app/stores';
  import LandingPageRenderer from '$lib/components/landing-pages/LandingPageRenderer.svelte';

  let { data }: { data: PageData } = $props();

  // Extract UTM parameters from URL
  const utmParams = $derived({
    utm_source: $page.url.searchParams.get('utm_source') || undefined,
    utm_medium: $page.url.searchParams.get('utm_medium') || undefined,
    utm_campaign: $page.url.searchParams.get('utm_campaign') || undefined,
    utm_content: $page.url.searchParams.get('utm_content') || undefined,
    utm_term: $page.url.searchParams.get('utm_term') || undefined
  });

  // Get tracking pixels if any
  const trackingPixels = $derived(
    data.landingPage.trackingPixels as Array<{ type: string; id: string }> | null
  );
</script>

<svelte:head>
  <title>{data.landingPage.metaTitle}</title>
  <meta name="description" content={data.landingPage.metaDescription} />

  <!-- Open Graph tags -->
  <meta property="og:title" content={data.landingPage.metaTitle} />
  <meta property="og:description" content={data.landingPage.metaDescription} />
  <meta property="og:type" content="website" />
  {#if data.organization.logoUrl}
    <meta property="og:image" content={data.organization.logoUrl} />
  {/if}

  <!-- No index for landing pages (they should be accessed via ads) -->
  <meta name="robots" content="noindex, nofollow" />

  <!-- Tracking Pixels -->
  {#if trackingPixels}
    {#each trackingPixels as pixel}
      {#if pixel.type === 'facebook' && pixel.id}
        <!-- Facebook Pixel -->
        <script>
          !function(f,b,e,v,n,t,s)
          {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
          n.callMethod.apply(n,arguments):n.queue.push(arguments)};
          if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
          n.queue=[];t=b.createElement(e);t.async=!0;
          t.src=v;s=b.getElementsByTagName(e)[0];
          s.parentNode.insertBefore(t,s)}(window, document,'script',
          'https://connect.facebook.net/en_US/fbevents.js');
          fbq('init', '{pixel.id}');
          fbq('track', 'PageView');
        </script>
        <noscript>
          <img height="1" width="1" style="display:none"
               src="https://www.facebook.com/tr?id={pixel.id}&ev=PageView&noscript=1"
               alt=""/>
        </noscript>
      {/if}
      {#if pixel.type === 'google' && pixel.id}
        <!-- Google Analytics / GTM -->
        <script async src="https://www.googletagmanager.com/gtag/js?id={pixel.id}"></script>
        <script>
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '{pixel.id}');
        </script>
      {/if}
    {/each}
  {/if}
</svelte:head>

<LandingPageRenderer
  landingPage={data.landingPage}
  organization={data.organization}
  {utmParams}
/>
