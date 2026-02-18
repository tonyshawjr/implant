<script lang="ts">
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

  function getSourceBadgeClass(s: string | null): string {
    const map: Record<string, string> = {
      facebook: 'badge-primary',
      google: 'badge-danger',
      instagram: 'badge-purple',
      website: 'badge-success',
      referral: 'badge-warning',
      direct: 'badge-gray'
    };
    return map[s?.toLowerCase() || ''] || 'badge-gray';
  }

  function formatSource(s: string | null): string {
    if (!s) return 'Unknown';
    return s.charAt(0).toUpperCase() + s.slice(1);
  }

  const hasUtmParams = utmSource || utmMedium || utmCampaign || utmContent;
</script>

<div class="card">
  <div class="card-header">
    <h3 class="card-title">Source Information</h3>
  </div>
  <div class="card-body">
    <div class="info-list">
      {#if source}
        <div class="info-row">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <line x1="2" y1="12" x2="22" y2="12"/>
            <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
          </svg>
          <div>
            <div class="info-label">Source</div>
            <div class="info-row-inline">
              <span class="badge {getSourceBadgeClass(source)}">{formatSource(source)}</span>
              {#if sourceDetail}
                <span class="info-sub">{sourceDetail}</span>
              {/if}
            </div>
          </div>
        </div>
      {/if}

      {#if campaign}
        <div class="info-row">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="20" x2="18" y2="10"/>
            <line x1="12" y1="20" x2="12" y2="4"/>
            <line x1="6" y1="20" x2="6" y2="14"/>
          </svg>
          <div>
            <div class="info-label">Campaign</div>
            <a href="/campaigns/{campaign.id}" class="info-link">{campaign.name}</a>
          </div>
        </div>
      {/if}

      {#if territory}
        <div class="info-row">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
            <circle cx="12" cy="10" r="3"/>
          </svg>
          <div>
            <div class="info-label">Territory</div>
            <div class="info-value">{territory.name}</div>
          </div>
        </div>
      {/if}

      {#if hasUtmParams}
        <div class="info-row">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
          </svg>
          <div class="utm-section">
            <div class="info-label">UTM Parameters</div>
            <div class="utm-box">
              {#if utmSource}
                <div class="utm-row"><span class="utm-key">Source:</span> {utmSource}</div>
              {/if}
              {#if utmMedium}
                <div class="utm-row"><span class="utm-key">Medium:</span> {utmMedium}</div>
              {/if}
              {#if utmCampaign}
                <div class="utm-row"><span class="utm-key">Campaign:</span> {utmCampaign}</div>
              {/if}
              {#if utmContent}
                <div class="utm-row"><span class="utm-key">Content:</span> {utmContent}</div>
              {/if}
            </div>
          </div>
        </div>
      {/if}
    </div>
  </div>
</div>

<style>
  .info-list {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-4);
  }

  .info-row {
    display: flex;
    align-items: flex-start;
    gap: var(--spacing-3);
  }

  .info-row svg {
    color: var(--gray-400);
    flex-shrink: 0;
    margin-top: 2px;
  }

  .info-label {
    font-size: 0.75rem;
    color: var(--gray-500);
    margin-bottom: 2px;
  }

  .info-value {
    font-weight: 500;
    color: var(--gray-900);
  }

  .info-link {
    font-weight: 500;
    color: var(--primary-600);
    text-decoration: none;
  }

  .info-link:hover {
    text-decoration: underline;
  }

  .info-sub {
    font-size: 0.875rem;
    color: var(--gray-600);
  }

  .info-row-inline {
    display: flex;
    align-items: center;
    gap: var(--spacing-2);
  }

  .badge-purple {
    background: #ede9fe;
    color: #6d28d9;
  }

  .badge-gray {
    background: var(--gray-100);
    color: var(--gray-700);
  }

  .utm-section {
    flex: 1;
  }

  .utm-box {
    padding: var(--spacing-3);
    background: var(--gray-50);
    border-radius: var(--radius-lg);
    display: flex;
    flex-direction: column;
    gap: var(--spacing-1);
  }

  .utm-row {
    font-size: 0.875rem;
    color: var(--gray-900);
  }

  .utm-key {
    color: var(--gray-500);
  }
</style>
