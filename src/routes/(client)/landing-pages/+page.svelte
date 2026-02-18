<script lang="ts">
  import type { PageData } from './$types';
  import { goto } from '$app/navigation';
  import {
    Card,
    Badge,
    Button,
    Tooltip,
    Modal
  } from 'flowbite-svelte';
  import {
    FileDocOutline,
    EyeOutline,
    UsersGroupOutline,
    ChartOutline,
    CheckCircleOutline,
    ClipboardOutline,
    PlusOutline,
    ExternalLinkOutline,
    CalendarMonthOutline,
    ArrowRightOutline
  } from 'flowbite-svelte-icons';

  let { data }: { data: PageData } = $props();

  // Template modal state
  let showTemplateModal = $state(false);

  // Copy URL state
  let copiedId = $state<string | null>(null);

  // Helper functions
  function formatNumber(num: number): string {
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'k';
    }
    return num.toString();
  }

  function formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  }

  function getStatusColor(status: string): 'green' | 'yellow' | 'gray' {
    switch (status) {
      case 'published':
        return 'green';
      case 'draft':
        return 'yellow';
      case 'archived':
        return 'gray';
      default:
        return 'gray';
    }
  }

  function getStatusLabel(status: string): string {
    switch (status) {
      case 'published':
        return 'Published';
      case 'draft':
        return 'Draft';
      case 'archived':
        return 'Archived';
      default:
        return status;
    }
  }

  function getCategoryColor(category: string): 'blue' | 'purple' | 'green' | 'yellow' {
    switch (category) {
      case 'implant':
        return 'blue';
      case 'cosmetic':
        return 'purple';
      case 'general':
        return 'green';
      case 'promo':
        return 'yellow';
      default:
        return 'blue';
    }
  }

  function getPublicUrl(landingPageId: string): string {
    return `/lp/${landingPageId}`;
  }

  async function copyToClipboard(landingPageId: string) {
    const url = `${window.location.origin}${getPublicUrl(landingPageId)}`;
    try {
      await navigator.clipboard.writeText(url);
      copiedId = landingPageId;
      setTimeout(() => {
        copiedId = null;
      }, 2000);
    } catch (err) {
      console.error('Failed to copy URL:', err);
    }
  }

  function selectTemplate(templateId: string) {
    showTemplateModal = false;
    goto(`/landing-pages/create?template=${templateId}`);
  }

  function openCreateModal() {
    showTemplateModal = true;
  }
</script>

<svelte:head>
  <title>Landing Pages - Implant Lead Engine</title>
</svelte:head>

<!-- Stats Row -->
<div class="stats-row">
  <div class="stat-card">
    <div class="stat-card-header">
      <div class="stat-card-icon primary">
        <FileDocOutline class="w-5 h-5" />
      </div>
    </div>
    <div class="stat-card-label">Total Pages</div>
    <div class="stat-card-value">{data.stats.totalPages}</div>
    <div class="stat-card-change neutral">
      {data.stats.publishedPages} published
    </div>
  </div>

  <div class="stat-card">
    <div class="stat-card-header">
      <div class="stat-card-icon success">
        <EyeOutline class="w-5 h-5" />
      </div>
    </div>
    <div class="stat-card-label">Total Views</div>
    <div class="stat-card-value">{formatNumber(data.stats.totalViews)}</div>
    <div class="stat-card-change neutral">
      All time
    </div>
  </div>

  <div class="stat-card">
    <div class="stat-card-header">
      <div class="stat-card-icon warning">
        <UsersGroupOutline class="w-5 h-5" />
      </div>
    </div>
    <div class="stat-card-label">Submissions</div>
    <div class="stat-card-value">{formatNumber(data.stats.totalSubmissions)}</div>
    <div class="stat-card-change neutral">
      Leads captured
    </div>
  </div>

  <div class="stat-card">
    <div class="stat-card-header">
      <div class="stat-card-icon danger">
        <ChartOutline class="w-5 h-5" />
      </div>
    </div>
    <div class="stat-card-label">Avg. Conversion</div>
    <div class="stat-card-value">{data.stats.avgConversionRate}%</div>
    <div class="stat-card-change neutral">
      Views to leads
    </div>
  </div>
</div>

<!-- Page Header -->
<div class="page-header">
  <div class="page-header-left">
    <h2 class="page-title">Your Landing Pages</h2>
    <p class="page-subtitle">Manage your lead capture pages and track performance</p>
  </div>
  <div class="page-header-right">
    <button class="btn btn-primary" onclick={openCreateModal}>
      <PlusOutline class="w-4 h-4" />
      Create New Page
    </button>
  </div>
</div>

<!-- Landing Pages Grid -->
{#if data.landingPages && data.landingPages.length > 0}
  <div class="landing-pages-grid">
    {#each data.landingPages as landingPage (landingPage.id)}
      <div class="card landing-page-card">
        <!-- Card Header -->
        <div class="landing-page-card-header">
          <div class="landing-page-info">
            <h3 class="landing-page-name">{landingPage.name}</h3>
            <div class="landing-page-meta">
              {#if landingPage.template}
                <Badge color={getCategoryColor(landingPage.template.category)} class="text-xs">
                  {landingPage.template.name}
                </Badge>
              {/if}
              {#if landingPage.campaign}
                <span class="campaign-tag">
                  Campaign: {landingPage.campaign.name}
                </span>
              {/if}
            </div>
          </div>
          <Badge color={getStatusColor(landingPage.status)}>
            {getStatusLabel(landingPage.status)}
          </Badge>
        </div>

        <!-- Metrics Row -->
        <div class="landing-page-metrics">
          <div class="metric-item">
            <span class="metric-value">{formatNumber(landingPage.viewCount)}</span>
            <span class="metric-label">Views</span>
          </div>
          <div class="metric-item">
            <span class="metric-value">{formatNumber(landingPage.submissionCount)}</span>
            <span class="metric-label">Submissions</span>
          </div>
          <div class="metric-item highlight">
            <span class="metric-value">{landingPage.conversionRate.toFixed(1)}%</span>
            <span class="metric-label">Conversion</span>
          </div>
        </div>

        <!-- URL Copy Section -->
        <div class="landing-page-url">
          <code class="url-text">{getPublicUrl(landingPage.id)}</code>
          <button
            class="btn btn-icon btn-secondary"
            onclick={() => copyToClipboard(landingPage.id)}
            id="copy-btn-{landingPage.id}"
          >
            <ClipboardOutline class="w-4 h-4" />
          </button>
          {#if copiedId === landingPage.id}
            <span class="copy-success">Copied!</span>
          {/if}
        </div>

        <!-- Recent Leads -->
        {#if landingPage.recentLeads && landingPage.recentLeads.length > 0}
          <div class="landing-page-leads">
            <div class="leads-header">
              <span class="leads-title">Recent Leads</span>
              <a href="/leads?source={landingPage.id}" class="leads-link">
                View all
                <ArrowRightOutline class="w-3 h-3" />
              </a>
            </div>
            <div class="leads-list">
              {#each landingPage.recentLeads.slice(0, 3) as lead}
                <div class="lead-item">
                  <div class="lead-avatar">
                    {lead.firstName?.[0] || ''}{lead.lastName?.[0] || ''}
                  </div>
                  <div class="lead-info">
                    <span class="lead-name">{lead.firstName} {lead.lastName}</span>
                    <span class="lead-date">{formatDate(lead.createdAt)}</span>
                  </div>
                </div>
              {/each}
            </div>
          </div>
        {:else}
          <div class="landing-page-leads empty">
            <span class="no-leads">No leads captured yet</span>
          </div>
        {/if}

        <!-- Card Footer -->
        <div class="landing-page-card-footer">
          <div class="footer-meta">
            <CalendarMonthOutline class="w-4 h-4" />
            <span>Created {formatDate(landingPage.createdAt)}</span>
          </div>
          <div class="footer-actions">
            <a
              href={getPublicUrl(landingPage.id)}
              target="_blank"
              class="btn btn-sm btn-outline"
            >
              <ExternalLinkOutline class="w-4 h-4" />
              Preview
            </a>
            <a
              href="/leads?source={landingPage.id}"
              class="btn btn-sm btn-secondary"
            >
              View Leads
            </a>
          </div>
        </div>
      </div>
    {/each}
  </div>
{:else}
  <div class="card">
    <div class="empty-state">
      <div class="empty-state-icon">
        <FileDocOutline class="w-8 h-8" />
      </div>
      <h3 class="empty-state-title">No landing pages yet</h3>
      <p class="empty-state-description">
        Create your first landing page to start capturing leads from your advertising campaigns.
      </p>
      <button class="btn btn-primary" onclick={openCreateModal}>
        Create Your First Page
      </button>
    </div>
  </div>
{/if}

<!-- Template Selection Modal -->
<Modal bind:open={showTemplateModal} size="xl" title="Choose a Template">
  <p class="text-gray-500 dark:text-gray-400 mb-6">
    Select a template to get started. You can customize everything after creation.
  </p>

  {#if data.templates && data.templates.length > 0}
    <div class="template-grid">
      {#each data.templates as template}
        <button
          class="template-card"
          onclick={() => selectTemplate(template.id)}
        >
          <div class="template-preview">
            {#if template.thumbnailUrl}
              <img src={template.thumbnailUrl} alt={template.name} />
            {:else}
              <div class="template-placeholder">
                <FileDocOutline class="w-12 h-12 text-gray-400" />
              </div>
            {/if}
          </div>
          <div class="template-info">
            <h4 class="template-name">{template.name}</h4>
            <Badge color={getCategoryColor(template.category)} class="text-xs mb-2">
              {template.category}
            </Badge>
            {#if template.description}
              <p class="template-description">{template.description}</p>
            {/if}
            {#if template.estimatedConversionRate}
              <div class="template-conversion">
                <CheckCircleOutline class="w-4 h-4 text-green-500" />
                <span>~{template.estimatedConversionRate}% avg. conversion</span>
              </div>
            {/if}
          </div>
        </button>
      {/each}
    </div>
  {:else}
    <div class="no-templates">
      <p class="text-gray-500">No templates available. Please contact support.</p>
    </div>
  {/if}

  {#snippet footer()}
    <Button color="alternative" onclick={() => (showTemplateModal = false)}>
      Cancel
    </Button>
    <Button href="/landing-pages/create">
      Start from Scratch
    </Button>
  {/snippet}
</Modal>

<style>
  .stats-row {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: var(--spacing-6);
    margin-bottom: var(--spacing-6);
  }

  @media (max-width: 1200px) {
    .stats-row {
      grid-template-columns: repeat(2, 1fr);
    }
  }

  @media (max-width: 640px) {
    .stats-row {
      grid-template-columns: 1fr;
    }
  }

  .stat-card-change.neutral {
    color: var(--gray-500);
  }

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

  .landing-pages-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: var(--spacing-6);
  }

  @media (max-width: 1200px) {
    .landing-pages-grid {
      grid-template-columns: 1fr;
    }
  }

  .landing-page-card {
    display: flex;
    flex-direction: column;
  }

  .landing-page-card-header {
    padding: var(--spacing-4) var(--spacing-5);
    border-bottom: 1px solid var(--gray-100);
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: var(--spacing-3);
  }

  .landing-page-info {
    flex: 1;
    min-width: 0;
  }

  .landing-page-name {
    font-size: 1rem;
    font-weight: 600;
    color: var(--gray-900);
    margin-bottom: var(--spacing-2);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .landing-page-meta {
    display: flex;
    align-items: center;
    gap: var(--spacing-2);
    flex-wrap: wrap;
  }

  .campaign-tag {
    font-size: 0.75rem;
    color: var(--gray-500);
  }

  .landing-page-metrics {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: var(--spacing-4);
    padding: var(--spacing-4) var(--spacing-5);
    background: var(--gray-50);
    border-bottom: 1px solid var(--gray-100);
  }

  .metric-item {
    text-align: center;
  }

  .metric-item.highlight .metric-value {
    color: var(--success-600);
  }

  .metric-value {
    display: block;
    font-size: 1.25rem;
    font-weight: 600;
    color: var(--gray-900);
  }

  .metric-label {
    display: block;
    font-size: 0.75rem;
    color: var(--gray-500);
    margin-top: var(--spacing-1);
  }

  .landing-page-url {
    display: flex;
    align-items: center;
    gap: var(--spacing-2);
    padding: var(--spacing-3) var(--spacing-5);
    border-bottom: 1px solid var(--gray-100);
  }

  .url-text {
    flex: 1;
    font-size: 0.8125rem;
    color: var(--gray-600);
    background: var(--gray-100);
    padding: var(--spacing-2) var(--spacing-3);
    border-radius: var(--radius-md);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .copy-success {
    font-size: 0.75rem;
    color: var(--success-600);
    font-weight: 500;
  }

  .landing-page-leads {
    padding: var(--spacing-4) var(--spacing-5);
    border-bottom: 1px solid var(--gray-100);
  }

  .landing-page-leads.empty {
    text-align: center;
    padding: var(--spacing-6) var(--spacing-5);
  }

  .no-leads {
    font-size: 0.875rem;
    color: var(--gray-400);
  }

  .leads-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: var(--spacing-3);
  }

  .leads-title {
    font-size: 0.875rem;
    font-weight: 500;
    color: var(--gray-700);
  }

  .leads-link {
    display: flex;
    align-items: center;
    gap: var(--spacing-1);
    font-size: 0.75rem;
    color: var(--primary-600);
  }

  .leads-link:hover {
    color: var(--primary-700);
  }

  .leads-list {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-2);
  }

  .lead-item {
    display: flex;
    align-items: center;
    gap: var(--spacing-3);
  }

  .lead-avatar {
    width: 28px;
    height: 28px;
    border-radius: var(--radius-full);
    background: var(--primary-100);
    color: var(--primary-600);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.625rem;
    font-weight: 600;
  }

  .lead-info {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: space-between;
    min-width: 0;
  }

  .lead-name {
    font-size: 0.875rem;
    color: var(--gray-900);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .lead-date {
    font-size: 0.75rem;
    color: var(--gray-400);
    flex-shrink: 0;
  }

  .landing-page-card-footer {
    padding: var(--spacing-4) var(--spacing-5);
    display: flex;
    align-items: center;
    justify-content: space-between;
    background: var(--gray-50);
    border-radius: 0 0 var(--radius-xl) var(--radius-xl);
  }

  .footer-meta {
    display: flex;
    align-items: center;
    gap: var(--spacing-2);
    font-size: 0.8125rem;
    color: var(--gray-500);
  }

  .footer-actions {
    display: flex;
    gap: var(--spacing-2);
  }

  /* Template Modal Styles */
  .template-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: var(--spacing-4);
    max-height: 60vh;
    overflow-y: auto;
  }

  @media (max-width: 1024px) {
    .template-grid {
      grid-template-columns: repeat(2, 1fr);
    }
  }

  @media (max-width: 640px) {
    .template-grid {
      grid-template-columns: 1fr;
    }
  }

  .template-card {
    background: white;
    border: 2px solid var(--gray-200);
    border-radius: var(--radius-lg);
    overflow: hidden;
    cursor: pointer;
    transition: all 0.2s ease;
    text-align: left;
  }

  .template-card:hover {
    border-color: var(--primary-500);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }

  .template-preview {
    width: 100%;
    height: 120px;
    background: var(--gray-100);
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
    padding: var(--spacing-4);
  }

  .template-name {
    font-size: 0.9375rem;
    font-weight: 600;
    color: var(--gray-900);
    margin-bottom: var(--spacing-2);
  }

  .template-description {
    font-size: 0.8125rem;
    color: var(--gray-500);
    margin-bottom: var(--spacing-2);
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .template-conversion {
    display: flex;
    align-items: center;
    gap: var(--spacing-1);
    font-size: 0.75rem;
    color: var(--success-600);
    font-weight: 500;
  }

  .no-templates {
    text-align: center;
    padding: var(--spacing-8);
  }

  @media (max-width: 640px) {
    .page-header {
      flex-direction: column;
      align-items: flex-start;
      gap: var(--spacing-4);
    }

    .landing-page-card-footer {
      flex-direction: column;
      gap: var(--spacing-3);
      align-items: stretch;
    }

    .footer-actions {
      width: 100%;
    }

    .footer-actions .btn {
      flex: 1;
      justify-content: center;
    }
  }
</style>
