<script lang="ts">
  import { enhance } from '$app/forms';

  interface LandingPage {
    id: string;
    name: string;
    slug: string;
    url: string | null;
    status: 'draft' | 'published' | 'archived';
    viewCount: number;
    submissionCount: number;
    conversionRate: number;
    metaTitle: string | null;
    metaDescription: string | null;
    publishedAt: string | null;
    createdAt: string;
    updatedAt: string;
    template: {
      id: string;
      name: string;
      category: string;
    } | null;
    campaign: {
      id: string;
      name: string;
    } | null;
    createdBy: {
      id: string;
      name: string;
    } | null;
  }

  interface Props {
    landingPage: LandingPage;
    organizationId: string;
    onCopyUrl?: () => void;
  }

  let { landingPage, organizationId, onCopyUrl }: Props = $props();

  let copySuccess = $state(false);

  function getStatusBadgeClass(status: string): string {
    switch (status) {
      case 'published': return 'badge-success';
      case 'draft': return 'badge-warning';
      case 'archived': return 'badge-gray';
      default: return 'badge-gray';
    }
  }

  function getStatusLabel(status: string): string {
    switch (status) {
      case 'published': return 'Published';
      case 'draft': return 'Draft';
      case 'archived': return 'Archived';
      default: return status;
    }
  }

  function getCategoryBadgeClass(category: string): string {
    switch (category) {
      case 'implant': return 'badge-primary';
      case 'cosmetic': return 'badge-purple';
      case 'general': return 'badge-success';
      case 'promo': return 'badge-warning';
      default: return 'badge-primary';
    }
  }

  function formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  }

  function formatNumber(num: number): string {
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'k';
    }
    return num.toString();
  }

  function getPublicUrl(): string {
    const isDraft = landingPage.status !== 'published';
    return isDraft ? `/lp/${landingPage.slug}?preview=true` : `/lp/${landingPage.slug}`;
  }

  async function copyToClipboard() {
    const url = `${window.location.origin}/lp/${landingPage.slug}`;
    try {
      await navigator.clipboard.writeText(url);
      copySuccess = true;
      onCopyUrl?.();
      setTimeout(() => {
        copySuccess = false;
      }, 2000);
    } catch (err) {
      console.error('Failed to copy URL:', err);
    }
  }
</script>

<div class="lp-card">
  <!-- Header -->
  <div class="lp-card-header">
    <div style="min-width: 0; flex: 1;">
      <h3 class="lp-card-name">{landingPage.name}</h3>
      {#if landingPage.template}
        <span class="badge {getCategoryBadgeClass(landingPage.template.category)}" style="margin-top: 0.25rem;">
          {landingPage.template.name}
        </span>
      {/if}
    </div>
    <span class="badge {getStatusBadgeClass(landingPage.status)}">
      {getStatusLabel(landingPage.status)}
    </span>
  </div>

  <!-- Metrics -->
  <div class="lp-card-metrics">
    <div class="lp-metric">
      <div class="lp-metric-value">{formatNumber(landingPage.viewCount)}</div>
      <div class="lp-metric-label">Views</div>
    </div>
    <div class="lp-metric">
      <div class="lp-metric-value">{formatNumber(landingPage.submissionCount)}</div>
      <div class="lp-metric-label">Submissions</div>
    </div>
    <div class="lp-metric">
      <div class="lp-metric-value lp-metric-rate">{landingPage.conversionRate.toFixed(1)}%</div>
      <div class="lp-metric-label">Conv. Rate</div>
    </div>
  </div>

  <!-- Meta -->
  <div class="lp-card-meta">
    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
    <span>{formatDate(landingPage.createdAt)}</span>
  </div>

  <!-- URL -->
  <div class="lp-card-url">
    <svg class="w-4 h-4" style="flex-shrink: 0; color: var(--gray-400);" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" /></svg>
    <code class="lp-card-url-text">/lp/{landingPage.slug}</code>
    <button type="button" class="lp-card-url-copy" onclick={copyToClipboard} title={copySuccess ? 'Copied!' : 'Copy URL'}>
      {#if copySuccess}
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
      {:else}
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
      {/if}
    </button>
  </div>

  <!-- Actions -->
  <div class="lp-card-actions">
    <a href="/internal/clients/{organizationId}/landing-pages/{landingPage.id}" class="btn btn-primary lp-card-edit-btn">
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
      Edit
    </a>

    <a href={getPublicUrl()} target="_blank" class="btn btn-secondary btn-icon" title="Preview">
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
    </a>

    {#if landingPage.status !== 'archived'}
      <form method="POST" action="?/togglePublish" use:enhance style="display: inline;">
        <input type="hidden" name="landingPageId" value={landingPage.id} />
        <button
          type="submit"
          class="btn btn-sm {landingPage.status === 'published' ? 'btn-toggle-on' : 'btn-toggle-off'}"
          title={landingPage.status === 'published' ? 'Unpublish' : 'Publish'}
        >
          {#if landingPage.status === 'published'}
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
          {:else}
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/></svg>
          {/if}
        </button>
      </form>
    {/if}
  </div>
</div>

<style>
  .lp-card {
    background: white;
    border: 1px solid var(--gray-200);
    border-radius: var(--radius-xl);
    padding: 1.25rem;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .lp-card-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 0.5rem;
  }

  .lp-card-name {
    font-size: 1rem;
    font-weight: 600;
    color: var(--gray-900);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .lp-card-metrics {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: 0.75rem;
    padding: 0.75rem 0;
    border-top: 1px solid var(--gray-100);
    border-bottom: 1px solid var(--gray-100);
  }

  .lp-metric {
    text-align: center;
  }

  .lp-metric-value {
    font-size: 1.125rem;
    font-weight: 600;
    color: var(--gray-900);
  }

  .lp-metric-rate {
    color: var(--success-600);
  }

  .lp-metric-label {
    font-size: 0.75rem;
    color: var(--gray-500);
  }

  .lp-card-meta {
    display: flex;
    align-items: center;
    gap: 0.375rem;
    font-size: 0.8125rem;
    color: var(--gray-500);
  }

  .lp-card-url {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 0.75rem;
    background: var(--gray-50);
    border-radius: var(--radius-lg);
  }

  .lp-card-url-text {
    flex: 1;
    font-size: 0.75rem;
    font-family: monospace;
    color: var(--gray-600);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .lp-card-url-copy {
    flex-shrink: 0;
    padding: 0.25rem;
    background: transparent;
    border: none;
    border-radius: 0.25rem;
    color: var(--gray-500);
    cursor: pointer;
  }

  .lp-card-url-copy:hover {
    color: var(--primary-600);
    background: var(--gray-100);
  }

  .lp-card-actions {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding-top: 0.5rem;
  }

  .lp-card-edit-btn {
    flex: 1;
  }

  .btn-icon {
    padding: 0.5rem;
    min-width: auto;
  }

  .btn-toggle-on {
    background: var(--success-600);
    color: white;
    border: none;
    padding: 0.5rem;
    border-radius: 0.5rem;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
  }

  .btn-toggle-on:hover {
    background: var(--success-700);
  }

  .btn-toggle-off {
    background: var(--gray-200);
    color: var(--gray-600);
    border: none;
    padding: 0.5rem;
    border-radius: 0.5rem;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
  }

  .btn-toggle-off:hover {
    background: var(--gray-300);
  }

  .badge-purple {
    background: #f3e8ff;
    color: #7c3aed;
  }
</style>
