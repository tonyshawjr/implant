<script lang="ts">
  import { enhance } from '$app/forms';
  import { goto } from '$app/navigation';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();

  let showTemplateModal = $state(false);
  let copiedId = $state<string | null>(null);

  function getDisplayName(lp: typeof data.landingPages[0]): string {
    // Strip org name prefix if present (e.g., "Coastal Carolina Dental Care - Denture Alternative Quiz" → "Denture Alternative Quiz")
    const name = lp.name;
    if (name.includes(' - ')) {
      return name.split(' - ').slice(1).join(' - ');
    }
    return lp.template?.name || name;
  }

  function getTemplateBadgeClass(category: string): string {
    switch (category) {
      case 'implant': return 'badge-primary';
      case 'cosmetic': return 'badge-purple';
      case 'general': return 'badge-success';
      case 'promo': return 'badge-warning';
      default: return 'badge-primary';
    }
  }

  function getRelativeTime(dateStr: string): string {
    const now = new Date();
    const date = new Date(dateStr);
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  function formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  }

  async function copyUrl(slug: string) {
    const url = `${window.location.origin}/lp/${slug}`;
    try {
      await navigator.clipboard.writeText(url);
      copiedId = slug;
      setTimeout(() => copiedId = null, 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  }

  function selectTemplate(templateId: string) {
    showTemplateModal = false;
    goto(`/landing-pages/create?template=${templateId}`);
  }
</script>

<svelte:head>
  <title>Landing Pages - Implant Lead Engine</title>
</svelte:head>

<!-- Stats Row -->
<div class="stats-row">
  <div class="stat-card">
    <div class="stat-card-label">Active Pages</div>
    <div class="stat-card-value">{data.stats.publishedPages}<span class="stat-total">/{data.stats.totalPages}</span></div>
    {#if data.stats.publishedPages === 0 && data.stats.totalPages > 0}
      <div class="stat-card-change negative">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
        None published yet
      </div>
    {:else if data.stats.publishedPages > 0}
      <div class="stat-card-change positive">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
        </svg>
        Live & capturing leads
      </div>
    {:else}
      <div class="stat-card-change neutral">No pages yet</div>
    {/if}
  </div>

  <div class="stat-card">
    <div class="stat-card-label">Total Leads</div>
    <div class="stat-card-value">{data.stats.totalSubmissions}</div>
    <div class="stat-card-change neutral">
      From all pages
    </div>
  </div>

  <div class="stat-card">
    <div class="stat-card-label">This Month</div>
    <div class="stat-card-value">{data.stats.leadsThisMonth}</div>
    <div class="stat-card-change {data.stats.leadsThisMonth > 0 ? 'positive' : 'neutral'}">
      {data.stats.leadsThisMonth > 0 ? 'Leads captured' : 'No leads yet'}
    </div>
  </div>

  <div class="stat-card">
    <div class="stat-card-label">Best Conversion</div>
    <div class="stat-card-value">{data.stats.bestConversion > 0 ? `${data.stats.bestConversion}%` : '—'}</div>
    <div class="stat-card-change {data.stats.bestConversion >= 10 ? 'positive' : 'neutral'}">
      {#if data.stats.bestConversion > 0}
        {data.stats.bestPageName}
      {:else}
        Needs more traffic
      {/if}
    </div>
  </div>
</div>

<!-- Alert Banner for no published pages -->
{#if data.stats.publishedPages === 0 && data.stats.totalPages > 0}
  <div class="alert-banner">
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
    </svg>
    <div class="alert-content">
      <strong>Your landing pages aren't live yet.</strong>
      Publish a page below to start capturing leads from your ads.
    </div>
  </div>
{/if}

<!-- Page Header -->
<div class="page-header">
  <div class="page-header-left">
    <h2 class="page-title">Your Landing Pages</h2>
    <p class="page-subtitle">{data.landingPages.length} page{data.landingPages.length !== 1 ? 's' : ''} · {data.stats.totalViews} total views</p>
  </div>
  <div class="page-header-right">
    <button class="btn btn-primary" onclick={() => showTemplateModal = true}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
      </svg>
      Create New Page
    </button>
  </div>
</div>

<!-- Landing Pages Grid -->
{#if data.landingPages && data.landingPages.length > 0}
  <div class="lp-grid">
    {#each data.landingPages as lp (lp.id)}
      <div class="card lp-card">
        <!-- Status Bar -->
        {#if lp.status === 'draft'}
          <div class="lp-status-bar draft">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            <span>Not Live</span>
            <form method="POST" action="?/togglePublish" use:enhance style="display:contents;">
              <input type="hidden" name="landingPageId" value={lp.id} />
              <button type="submit" class="publish-btn">Publish Now</button>
            </form>
          </div>
        {:else}
          <div class="lp-status-bar live">
            <span class="live-dot"></span>
            <span>Live</span>
            {#if lp.publishedAt}
              <span class="status-meta">since {formatDate(lp.publishedAt)}</span>
            {/if}
          </div>
        {/if}

        <!-- Card Header -->
        <div class="lp-header">
          <div class="lp-header-info">
            <h3 class="lp-name">{getDisplayName(lp)}</h3>
            <div class="lp-tags">
              {#if lp.template}
                <span class="badge {getTemplateBadgeClass(lp.template.category)}">{lp.template.name}</span>
              {/if}
              {#if lp.campaign}
                <span class="lp-campaign">{lp.campaign.name}</span>
              {/if}
            </div>
          </div>
        </div>

        <!-- Metrics -->
        <div class="lp-metrics">
          <div class="lp-metric">
            <span class="lp-metric-value">{lp.viewCount}</span>
            <span class="lp-metric-label">Views</span>
          </div>
          <div class="lp-metric-divider"></div>
          <div class="lp-metric">
            <span class="lp-metric-value">{lp.submissionCount}</span>
            <span class="lp-metric-label">Leads</span>
          </div>
          <div class="lp-metric-divider"></div>
          <div class="lp-metric">
            <span class="lp-metric-value {lp.conversionRate >= 10 ? 'metric-good' : lp.conversionRate > 0 ? 'metric-ok' : ''}">{lp.conversionRate.toFixed(1)}%</span>
            <span class="lp-metric-label">Conversion</span>
          </div>
        </div>

        <!-- Recent Leads (only show if there are leads) -->
        {#if lp.recentLeads && lp.recentLeads.length > 0}
          <div class="lp-leads">
            <div class="lp-leads-header">
              <span class="lp-leads-title">Recent Leads</span>
              <a href="/leads" class="lp-leads-link">View all →</a>
            </div>
            {#each lp.recentLeads as lead}
              <a href="/leads/{lead.id}" class="lp-lead-row">
                <div class="lp-lead-avatar">{lead.firstName?.[0] || ''}{lead.lastName?.[0] || ''}</div>
                <div class="lp-lead-info">
                  <span class="lp-lead-name">{lead.firstName} {lead.lastName}</span>
                  <span class="lp-lead-email">{lead.email}</span>
                </div>
                <span class="lp-lead-time">{getRelativeTime(lead.createdAt)}</span>
              </a>
            {/each}
          </div>
        {/if}

        <!-- URL & Actions -->
        <div class="lp-footer">
          <div class="lp-url-row">
            <button
              class="lp-copy-btn"
              onclick={() => copyUrl(lp.slug)}
            >
              {#if copiedId === lp.slug}
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--success-600)" stroke-width="2">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
                <span class="copy-text success">Copied!</span>
              {:else}
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                </svg>
                <span class="copy-text">Copy Link</span>
              {/if}
            </button>

            <a href="/lp/{lp.slug}{lp.status === 'draft' ? '?preview=true' : ''}" target="_blank" class="btn btn-sm btn-secondary">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
              </svg>
              Preview
            </a>

            {#if lp.leadCount > 0}
              <a href="/leads" class="btn btn-sm btn-secondary">
                {lp.leadCount} Lead{lp.leadCount !== 1 ? 's' : ''}
              </a>
            {/if}
          </div>

          <div class="lp-dates">
            {#if lp.lastLeadAt}
              <span class="lp-date-item">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/>
                </svg>
                Last lead {getRelativeTime(lp.lastLeadAt)}
              </span>
            {/if}
            <span class="lp-date-item">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
              Created {formatDate(lp.createdAt)}
            </span>
          </div>
        </div>
      </div>
    {/each}
  </div>
{:else}
  <div class="card">
    <div class="empty-state">
      <div class="empty-icon">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--gray-300)" stroke-width="1.5">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          <polyline points="14 2 14 8 20 8"/>
          <line x1="16" y1="13" x2="8" y2="13"/>
          <line x1="16" y1="17" x2="8" y2="17"/>
          <polyline points="10 9 9 9 8 9"/>
        </svg>
      </div>
      <h3 class="empty-title">No landing pages yet</h3>
      <p class="empty-description">
        Create your first lead capture page to start converting ad traffic into patient inquiries.
      </p>
      <button class="btn btn-primary" onclick={() => showTemplateModal = true}>
        Create Your First Page
      </button>
    </div>
  </div>
{/if}

<!-- Template Selection Modal -->
{#if showTemplateModal}
  <div class="modal-overlay open" onclick={(e) => e.target === e.currentTarget && (showTemplateModal = false)} role="presentation">
    <div class="modal modal-lg" role="dialog" aria-modal="true" tabindex="-1">
      <div class="modal-header">
        <h3 class="modal-title">Choose a Template</h3>
        <button class="modal-close" onclick={() => showTemplateModal = false} aria-label="Close">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>
      <div class="modal-body">
        <p class="modal-hint">Select a template to get started. You can customize everything after creation.</p>
        {#if data.templates && data.templates.length > 0}
          <div class="template-grid">
            {#each data.templates as template}
              <button class="template-card" onclick={() => selectTemplate(template.id)}>
                <div class="template-preview">
                  {#if template.thumbnailUrl}
                    <img src={template.thumbnailUrl} alt={template.name} />
                  {:else}
                    <div class="template-placeholder">
                      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--gray-300)" stroke-width="1.5">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                        <polyline points="14 2 14 8 20 8"/>
                      </svg>
                    </div>
                  {/if}
                </div>
                <div class="template-info">
                  <h4 class="template-name">{template.name}</h4>
                  {#if template.description}
                    <p class="template-desc">{template.description}</p>
                  {/if}
                  {#if template.estimatedConversionRate}
                    <div class="template-stat">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
                      </svg>
                      ~{template.estimatedConversionRate}% avg. conversion
                    </div>
                  {/if}
                </div>
              </button>
            {/each}
          </div>
        {:else}
          <p class="empty-templates">No templates available yet. Contact support to get started.</p>
        {/if}
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick={() => showTemplateModal = false}>Cancel</button>
        <a href="/landing-pages/create" class="btn btn-primary">Start from Scratch</a>
      </div>
    </div>
  </div>
{/if}

<style>
  /* Stats Row */
  .stats-row {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: var(--spacing-6);
    margin-bottom: var(--spacing-6);
  }

  .stat-total {
    font-size: 0.875rem;
    font-weight: 400;
    color: var(--gray-400);
  }

  /* Alert Banner */
  .alert-banner {
    display: flex;
    align-items: center;
    gap: var(--spacing-3);
    padding: var(--spacing-4) var(--spacing-5);
    background: var(--warning-50, #fffbeb);
    border: 1px solid var(--warning-200, #fde68a);
    border-radius: var(--radius-lg);
    margin-bottom: var(--spacing-6);
    color: var(--warning-800, #92400e);
  }

  .alert-banner svg {
    flex-shrink: 0;
    color: var(--warning-500);
  }

  .alert-content {
    font-size: 0.875rem;
    line-height: 1.5;
  }

  .alert-content strong {
    display: block;
    margin-bottom: 2px;
  }

  /* Page Header */
  .page-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: var(--spacing-6);
  }

  .page-title {
    font-size: 1.25rem;
    font-weight: 600;
    color: var(--gray-900);
  }

  .page-subtitle {
    font-size: 0.875rem;
    color: var(--gray-500);
    margin-top: var(--spacing-1);
  }

  /* Landing Pages Grid */
  .lp-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: var(--spacing-6);
  }

  .lp-card {
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  /* Status Bar */
  .lp-status-bar {
    display: flex;
    align-items: center;
    gap: var(--spacing-2);
    padding: var(--spacing-2) var(--spacing-4);
    font-size: 0.8125rem;
    font-weight: 500;
  }

  .lp-status-bar.draft {
    background: var(--warning-50, #fffbeb);
    color: var(--warning-700, #b45309);
    border-bottom: 1px solid var(--warning-100, #fef3c7);
  }

  .lp-status-bar.live {
    background: var(--success-50, #f0fdf4);
    color: var(--success-700, #15803d);
    border-bottom: 1px solid var(--success-100, #dcfce7);
  }

  .live-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--success-500);
    animation: pulse 2s infinite;
  }

  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }

  .status-meta {
    font-weight: 400;
    color: var(--success-500);
    font-size: 0.75rem;
  }

  .publish-btn {
    margin-left: auto;
    padding: var(--spacing-1) var(--spacing-3);
    background: var(--warning-600, #d97706);
    color: white;
    border: none;
    border-radius: var(--radius-md);
    font-size: 0.75rem;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.15s;
  }

  .publish-btn:hover {
    background: var(--warning-700, #b45309);
  }

  /* Card Header */
  .lp-header {
    padding: var(--spacing-4) var(--spacing-5);
  }

  .lp-name {
    font-size: 1.0625rem;
    font-weight: 600;
    color: var(--gray-900);
    margin-bottom: var(--spacing-2);
  }

  .lp-tags {
    display: flex;
    align-items: center;
    gap: var(--spacing-2);
    flex-wrap: wrap;
  }

  .lp-campaign {
    font-size: 0.75rem;
    color: var(--gray-500);
  }

  .badge-purple {
    background: var(--purple-100, #f3e8ff);
    color: var(--purple-700, #7c3aed);
  }

  /* Metrics */
  .lp-metrics {
    display: flex;
    align-items: center;
    padding: var(--spacing-4) var(--spacing-5);
    background: var(--gray-50);
    border-top: 1px solid var(--gray-100);
    border-bottom: 1px solid var(--gray-100);
  }

  .lp-metric {
    flex: 1;
    text-align: center;
  }

  .lp-metric-divider {
    width: 1px;
    height: 28px;
    background: var(--gray-200);
  }

  .lp-metric-value {
    display: block;
    font-size: 1.25rem;
    font-weight: 700;
    color: var(--gray-900);
  }

  .lp-metric-value.metric-good {
    color: var(--success-600);
  }

  .lp-metric-value.metric-ok {
    color: var(--warning-600);
  }

  .lp-metric-label {
    display: block;
    font-size: 0.6875rem;
    color: var(--gray-500);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin-top: 2px;
  }

  /* Recent Leads */
  .lp-leads {
    padding: var(--spacing-3) var(--spacing-5);
    border-bottom: 1px solid var(--gray-100);
  }

  .lp-leads-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: var(--spacing-2);
  }

  .lp-leads-title {
    font-size: 0.75rem;
    font-weight: 600;
    color: var(--gray-500);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .lp-leads-link {
    font-size: 0.75rem;
    color: var(--primary-600);
    text-decoration: none;
  }

  .lp-leads-link:hover {
    color: var(--primary-700);
  }

  .lp-lead-row {
    display: flex;
    align-items: center;
    gap: var(--spacing-3);
    padding: var(--spacing-2) 0;
    text-decoration: none;
    border-radius: var(--radius-md);
    transition: background 0.1s;
  }

  .lp-lead-row:hover {
    background: var(--gray-50);
    margin: 0 calc(-1 * var(--spacing-2));
    padding: var(--spacing-2);
  }

  .lp-lead-avatar {
    width: 28px;
    height: 28px;
    border-radius: 50%;
    background: var(--primary-100);
    color: var(--primary-600);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.625rem;
    font-weight: 600;
    flex-shrink: 0;
  }

  .lp-lead-info {
    flex: 1;
    min-width: 0;
  }

  .lp-lead-name {
    display: block;
    font-size: 0.875rem;
    font-weight: 500;
    color: var(--gray-900);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .lp-lead-email {
    display: block;
    font-size: 0.75rem;
    color: var(--gray-400);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .lp-lead-time {
    font-size: 0.75rem;
    color: var(--gray-400);
    flex-shrink: 0;
  }

  /* Footer */
  .lp-footer {
    padding: var(--spacing-3) var(--spacing-5) var(--spacing-4);
  }

  .lp-url-row {
    display: flex;
    align-items: center;
    gap: var(--spacing-2);
    margin-bottom: var(--spacing-3);
  }

  .lp-copy-btn {
    display: flex;
    align-items: center;
    gap: var(--spacing-2);
    padding: var(--spacing-1) var(--spacing-3);
    background: var(--gray-100);
    border: 1px solid var(--gray-200);
    border-radius: var(--radius-md);
    font-size: 0.8125rem;
    color: var(--gray-600);
    cursor: pointer;
    transition: all 0.15s;
  }

  .lp-copy-btn:hover {
    background: var(--gray-200);
    color: var(--gray-900);
  }

  .copy-text {
    font-size: 0.8125rem;
  }

  .copy-text.success {
    color: var(--success-600);
  }

  .lp-dates {
    display: flex;
    align-items: center;
    gap: var(--spacing-4);
    flex-wrap: wrap;
  }

  .lp-date-item {
    display: flex;
    align-items: center;
    gap: var(--spacing-1);
    font-size: 0.75rem;
    color: var(--gray-400);
  }

  .lp-date-item svg {
    flex-shrink: 0;
  }

  /* Empty State */
  .empty-state {
    text-align: center;
    padding: var(--spacing-12) var(--spacing-8);
  }

  .empty-icon {
    margin-bottom: var(--spacing-4);
  }

  .empty-title {
    font-size: 1.125rem;
    font-weight: 600;
    color: var(--gray-900);
    margin-bottom: var(--spacing-2);
  }

  .empty-description {
    font-size: 0.875rem;
    color: var(--gray-500);
    max-width: 400px;
    margin: 0 auto var(--spacing-6);
    line-height: 1.6;
  }

  /* Template Modal */
  .modal-lg {
    max-width: 800px;
  }

  .modal-hint {
    font-size: 0.875rem;
    color: var(--gray-500);
    margin-bottom: var(--spacing-5);
  }

  .template-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: var(--spacing-4);
    max-height: 60vh;
    overflow-y: auto;
  }

  .template-card {
    background: white;
    border: 2px solid var(--gray-200);
    border-radius: var(--radius-lg);
    overflow: hidden;
    cursor: pointer;
    transition: all 0.2s;
    text-align: left;
  }

  .template-card:hover {
    border-color: var(--primary-500);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  }

  .template-preview {
    width: 100%;
    height: 100px;
    background: var(--gray-50);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .template-preview img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .template-placeholder {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 100%;
  }

  .template-info {
    padding: var(--spacing-3);
  }

  .template-name {
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--gray-900);
    margin-bottom: var(--spacing-1);
  }

  .template-desc {
    font-size: 0.75rem;
    color: var(--gray-500);
    margin-bottom: var(--spacing-2);
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .template-stat {
    display: flex;
    align-items: center;
    gap: var(--spacing-1);
    font-size: 0.75rem;
    color: var(--success-600);
    font-weight: 500;
  }

  .empty-templates {
    text-align: center;
    color: var(--gray-500);
    padding: var(--spacing-8);
  }

  /* Responsive */
  @media (max-width: 1200px) {
    .stats-row {
      grid-template-columns: repeat(2, 1fr);
    }
    .lp-grid {
      grid-template-columns: 1fr;
    }
  }

  @media (max-width: 768px) {
    .template-grid {
      grid-template-columns: repeat(2, 1fr);
    }
  }

  @media (max-width: 640px) {
    .stats-row {
      grid-template-columns: 1fr;
    }
    .page-header {
      flex-direction: column;
      align-items: flex-start;
      gap: var(--spacing-4);
    }
    .template-grid {
      grid-template-columns: 1fr;
    }
    .lp-url-row {
      flex-wrap: wrap;
    }
  }
</style>
