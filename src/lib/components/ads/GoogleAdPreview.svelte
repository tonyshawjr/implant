<script lang="ts">
  interface Props {
    headline: string;
    description: string;
    displayUrl?: string;
    businessName: string;
  }

  let {
    headline,
    description,
    displayUrl = '',
    businessName
  }: Props = $props();

  // Get headlines (supports multiple)
  function getHeadlines(headlines: string): string[] {
    const lines = headlines.split('\n').filter(h => h.trim());
    return lines.slice(0, 3).map(h => truncate(h, 30));
  }

  // Truncate for Google limits
  function truncate(text: string, limit: number): string {
    if (!text) return '';
    if (text.length <= limit) return text;
    return text.substring(0, limit - 3) + '...';
  }

  // Format display URL
  function formatDisplayUrl(url: string): string {
    if (!url) return 'www.example.com';
    try {
      const parsed = new URL(url.startsWith('http') ? url : `https://${url}`);
      return parsed.hostname.replace('www.', '');
    } catch {
      return url.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0];
    }
  }

  let displayHeadlines = $derived(getHeadlines(headline));
  let displayDescription = $derived(truncate(description, 90) || 'Your ad description will appear here...');
  let formattedUrl = $derived(formatDisplayUrl(displayUrl));
</script>

<div class="google-ad-preview">
  <div class="google-search-bar">
    <div class="google-logo">
      <span class="g-blue">G</span>
      <span class="g-red">o</span>
      <span class="g-yellow">o</span>
      <span class="g-blue">g</span>
      <span class="g-green">l</span>
      <span class="g-red">e</span>
    </div>
    <div class="google-search-input">
      <span class="search-query">dental implants near me</span>
      <svg class="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="11" cy="11" r="8"/>
        <path d="m21 21-4.3-4.3"/>
      </svg>
    </div>
  </div>

  <div class="google-results">
    <!-- Ad Result -->
    <div class="google-ad-result">
      <div class="ad-header">
        <span class="ad-badge">Sponsored</span>
        <span class="ad-url">{formattedUrl}</span>
      </div>

      <div class="ad-headline">
        {#each displayHeadlines as h, i}
          {h}{#if i < displayHeadlines.length - 1}<span class="headline-separator"> | </span>{/if}
        {:else}
          Your Headline Here
        {/each}
      </div>

      <div class="ad-description">
        {displayDescription}
      </div>

      <!-- Sitelinks -->
      <div class="ad-sitelinks">
        <a href="#" class="sitelink">Free Consultation</a>
        <a href="#" class="sitelink">Financing Options</a>
        <a href="#" class="sitelink">Before & After</a>
        <a href="#" class="sitelink">Contact Us</a>
      </div>
    </div>

    <!-- Organic Result Placeholder -->
    <div class="organic-result">
      <div class="organic-url">
        <div class="organic-favicon"></div>
        <span>www.competitor-example.com</span>
      </div>
      <div class="organic-headline">Top Dental Implant Providers in Your Area - Reviews & Costs</div>
      <div class="organic-description">Compare the best dental implant providers. Read reviews, check costs, and find the right dentist for your needs...</div>
    </div>

    <div class="organic-result faded">
      <div class="organic-url">
        <div class="organic-favicon"></div>
        <span>www.example-dentistry.com</span>
      </div>
      <div class="organic-headline">Affordable Dental Implants - Starting at $999</div>
      <div class="organic-description">Get quality dental implants at affordable prices. Experienced surgeons, financing available...</div>
    </div>
  </div>
</div>

<style>
  .google-ad-preview {
    background: white;
    border-radius: 8px;
    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    font-family: arial, sans-serif;
    overflow: hidden;
    max-width: 600px;
  }

  .google-search-bar {
    display: flex;
    align-items: center;
    gap: 24px;
    padding: 12px 20px;
    background: #f8f9fa;
    border-bottom: 1px solid #dfe1e5;
  }

  .google-logo {
    font-size: 22px;
    font-weight: 500;
    font-family: 'Product Sans', arial, sans-serif;
  }

  .g-blue { color: #4285f4; }
  .g-red { color: #ea4335; }
  .g-yellow { color: #fbbc05; }
  .g-green { color: #34a853; }

  .google-search-input {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: space-between;
    background: white;
    border: 1px solid #dfe1e5;
    border-radius: 24px;
    padding: 10px 16px;
  }

  .search-query {
    color: #202124;
    font-size: 14px;
  }

  .search-icon {
    width: 20px;
    height: 20px;
    color: #4285f4;
  }

  .google-results {
    padding: 16px 20px;
  }

  .google-ad-result {
    padding-bottom: 16px;
    margin-bottom: 16px;
    border-bottom: 1px solid #ebebeb;
  }

  .ad-header {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 4px;
  }

  .ad-badge {
    font-size: 12px;
    font-weight: 500;
    color: #202124;
    background: none;
    padding: 0;
  }

  .ad-url {
    font-size: 14px;
    color: #202124;
  }

  .ad-headline {
    font-size: 20px;
    color: #1a0dab;
    line-height: 1.3;
    margin-bottom: 4px;
    cursor: pointer;
  }

  .ad-headline:hover {
    text-decoration: underline;
  }

  .headline-separator {
    color: #70757a;
  }

  .ad-description {
    font-size: 14px;
    line-height: 1.58;
    color: #4d5156;
    max-width: 100%;
  }

  .ad-sitelinks {
    display: flex;
    flex-wrap: wrap;
    gap: 8px 24px;
    margin-top: 8px;
  }

  .sitelink {
    font-size: 14px;
    color: #1a0dab;
    text-decoration: none;
  }

  .sitelink:hover {
    text-decoration: underline;
  }

  .organic-result {
    padding: 12px 0;
  }

  .organic-result.faded {
    opacity: 0.5;
  }

  .organic-url {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 4px;
  }

  .organic-favicon {
    width: 16px;
    height: 16px;
    background: #dfe1e5;
    border-radius: 50%;
  }

  .organic-url span {
    font-size: 12px;
    color: #202124;
  }

  .organic-headline {
    font-size: 18px;
    color: #1a0dab;
    line-height: 1.3;
    margin-bottom: 4px;
    cursor: pointer;
  }

  .organic-headline:hover {
    text-decoration: underline;
  }

  .organic-description {
    font-size: 13px;
    line-height: 1.5;
    color: #4d5156;
  }
</style>
