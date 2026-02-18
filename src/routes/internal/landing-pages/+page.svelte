<script lang="ts">
  import type { PageData, ActionData } from './$types';
  import { enhance } from '$app/forms';
  import { goto } from '$app/navigation';

  let { data, form }: { data: PageData; form: ActionData } = $props();

  let searchValue = $state(data.filters.search);
  let organizationFilter = $state(data.filters.organizationId);
  let statusFilter = $state(data.filters.status);
  let copiedId = $state<string | null>(null);

  function handleSearch() {
    const params = new URLSearchParams();
    if (searchValue) params.set('search', searchValue);
    if (organizationFilter) params.set('organization', organizationFilter);
    if (statusFilter) params.set('status', statusFilter);
    goto(`/internal/landing-pages?${params.toString()}`);
  }

  function handleFilterChange() {
    handleSearch();
  }

  function getStatusBadgeClass(status: string): string {
    switch (status) {
      case 'published':
        return 'badge-success';
      case 'draft':
        return 'badge-warning';
      case 'archived':
        return 'badge-gray';
      default:
        return 'badge-gray';
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

  function getCategoryBadgeClass(category: string): string {
    switch (category) {
      case 'implant':
        return 'badge-primary';
      case 'cosmetic':
        return 'badge-purple';
      case 'general':
        return 'badge-success';
      case 'promo':
        return 'badge-warning';
      default:
        return 'badge-primary';
    }
  }

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

  function getPublicUrl(slug: string, isDraft: boolean = false): string {
    return isDraft ? `/lp/${slug}?preview=true` : `/lp/${slug}`;
  }

  async function copyToClipboard(slug: string, pageId: string, isDraft: boolean = false) {
    const url = isDraft
      ? `${window.location.origin}/lp/${slug}?preview=true`
      : `${window.location.origin}/lp/${slug}`;
    try {
      await navigator.clipboard.writeText(url);
      copiedId = pageId;
      setTimeout(() => {
        copiedId = null;
      }, 2000);
    } catch (err) {
      console.error('Failed to copy URL:', err);
    }
  }
</script>

<svelte:head>
  <title>Landing Pages - SqueezMedia</title>
</svelte:head>

<!-- Stats Row -->
<div class="stats-row">
  <div class="stat-card">
    <div class="stat-card-header">
      <div class="stat-card-icon primary">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          <polyline points="14 2 14 8 20 8"/>
          <line x1="16" y1="13" x2="8" y2="13"/>
          <line x1="16" y1="17" x2="8" y2="17"/>
          <polyline points="10 9 9 9 8 9"/>
        </svg>
      </div>
    </div>
    <div class="stat-card-label">Total Pages</div>
    <div class="stat-card-value">{data.stats.totalPages}</div>
    <div class="stat-card-change neutral">
      Landing pages created
    </div>
  </div>

  <div class="stat-card">
    <div class="stat-card-header">
      <div class="stat-card-icon success">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
          <polyline points="22 4 12 14.01 9 11.01"/>
        </svg>
      </div>
    </div>
    <div class="stat-card-label">Published</div>
    <div class="stat-card-value">{data.stats.publishedPages}</div>
    <div class="stat-card-change positive">
      Live & active
    </div>
  </div>

  <div class="stat-card">
    <div class="stat-card-header">
      <div class="stat-card-icon primary">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
          <circle cx="12" cy="12" r="3"/>
        </svg>
      </div>
    </div>
    <div class="stat-card-label">Total Views</div>
    <div class="stat-card-value">{data.stats.totalViews.toLocaleString()}</div>
    <div class="stat-card-change neutral">
      Page impressions
    </div>
  </div>

  <div class="stat-card">
    <div class="stat-card-header">
      <div class="stat-card-icon warning">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
          <circle cx="9" cy="7" r="4"/>
          <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
          <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
        </svg>
      </div>
    </div>
    <div class="stat-card-label">Submissions</div>
    <div class="stat-card-value">{data.stats.totalSubmissions.toLocaleString()}</div>
    <div class="stat-card-change positive">
      Form completions
    </div>
  </div>

  <div class="stat-card">
    <div class="stat-card-header">
      <div class="stat-card-icon success">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="18" y1="20" x2="18" y2="10"/>
          <line x1="12" y1="20" x2="12" y2="4"/>
          <line x1="6" y1="20" x2="6" y2="14"/>
        </svg>
      </div>
    </div>
    <div class="stat-card-label">Avg Conv. Rate</div>
    <div class="stat-card-value">{data.stats.avgConversionRate}%</div>
    <div class="stat-card-change positive">
      Conversion performance
    </div>
  </div>
</div>

<!-- Page Header -->
<div class="card">
  <div class="card-header card-header-with-action">
    <div>
      <h3 class="card-title">Landing Pages</h3>
      <p class="card-subtitle">Manage landing pages across all clients</p>
    </div>
    <a href="/internal/landing-pages/create" class="btn btn-primary">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <line x1="12" y1="5" x2="12" y2="19"/>
        <line x1="5" y1="12" x2="19" y2="12"/>
      </svg>
      Create New
    </a>
  </div>

  <!-- Filters -->
  <div class="filters-bar">
    <div class="filter-group">
      <form onsubmit={(e) => { e.preventDefault(); handleSearch(); }} class="search-form">
        <div class="search-input-wrapper">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"/>
            <line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            type="text"
            bind:value={searchValue}
            placeholder="Search landing pages..."
            class="search-input"
          />
        </div>
      </form>
    </div>
    <div class="filter-group">
      <select
        bind:value={organizationFilter}
        onchange={handleFilterChange}
        class="filter-select"
      >
        <option value="">All Clients</option>
        {#each data.organizations as org}
          <option value={org.id}>{org.name}</option>
        {/each}
      </select>
    </div>
    <div class="filter-group">
      <select
        bind:value={statusFilter}
        onchange={handleFilterChange}
        class="filter-select"
      >
        <option value="">All Status</option>
        <option value="published">Published</option>
        <option value="draft">Draft</option>
        <option value="archived">Archived</option>
      </select>
    </div>
  </div>

  <!-- Success/Error Messages -->
  {#if form?.success}
    <div class="alert alert-success">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
        <polyline points="22 4 12 14.01 9 11.01"/>
      </svg>
      {form.message}
    </div>
  {/if}

  {#if form?.message && !form?.success}
    <div class="alert alert-danger">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10"/>
        <line x1="12" y1="8" x2="12" y2="12"/>
        <line x1="12" y1="16" x2="12.01" y2="16"/>
      </svg>
      {form.message}
    </div>
  {/if}

  <!-- Table -->
  {#if data.landingPages && data.landingPages.length > 0}
    <div class="table-container">
      <table class="table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Client</th>
            <th>Template</th>
            <th class="text-center">Status</th>
            <th class="text-right">Views</th>
            <th class="text-right">Submissions</th>
            <th class="text-right">Conv Rate</th>
            <th class="text-center">Actions</th>
          </tr>
        </thead>
        <tbody>
          {#each data.landingPages as landingPage (landingPage.id)}
            <tr>
              <td>
                <div class="cell-primary">{landingPage.name}</div>
                <div class="cell-secondary">Created {formatDate(landingPage.createdAt)}</div>
              </td>
              <td>
                {#if landingPage.organization}
                  <a href="/internal/clients/{landingPage.organization.id}" class="link">
                    {landingPage.organization.name}
                  </a>
                {:else}
                  <span class="text-muted">-</span>
                {/if}
              </td>
              <td>
                {#if landingPage.template}
                  <span class="badge {getCategoryBadgeClass(landingPage.template.category)}">
                    {landingPage.template.name}
                  </span>
                {:else}
                  <span class="text-muted">Custom</span>
                {/if}
              </td>
              <td class="text-center">
                <span class="badge {getStatusBadgeClass(landingPage.status)}">
                  {getStatusLabel(landingPage.status)}
                </span>
              </td>
              <td class="text-right font-medium">{formatNumber(landingPage.viewCount)}</td>
              <td class="text-right font-medium">{formatNumber(landingPage.submissionCount)}</td>
              <td class="text-right">
                <span class="text-success font-semibold">{landingPage.conversionRate.toFixed(1)}%</span>
              </td>
              <td>
                <div class="table-actions">
                  <!-- Edit Button -->
                  <a
                    href="/internal/clients/{landingPage.organization?.id}/landing-pages/{landingPage.id}"
                    class="btn btn-icon btn-sm"
                    title="Edit"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                    </svg>
                  </a>

                  <!-- Preview Button -->
                  {#if landingPage.slug}
                    <a
                      href={getPublicUrl(landingPage.slug, landingPage.status === 'draft')}
                      target="_blank"
                      class="btn btn-icon btn-sm"
                      title="Preview"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                        <circle cx="12" cy="12" r="3"/>
                      </svg>
                    </a>
                  {/if}

                  <!-- Copy URL Button -->
                  {#if landingPage.slug}
                    <button
                      type="button"
                      class="btn btn-icon btn-sm"
                      onclick={() => copyToClipboard(landingPage.slug, landingPage.id, landingPage.status === 'draft')}
                      title={copiedId === landingPage.id ? 'Copied!' : 'Copy URL'}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        {#if copiedId === landingPage.id}
                          <polyline points="20 6 9 17 4 12"/>
                        {:else}
                          <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                        {/if}
                      </svg>
                    </button>
                  {/if}

                  <!-- Publish/Unpublish Toggle -->
                  {#if landingPage.status !== 'archived'}
                    <form method="POST" action="?/togglePublish" use:enhance class="inline-form">
                      <input type="hidden" name="landingPageId" value={landingPage.id} />
                      <button
                        type="submit"
                        class="btn btn-sm {landingPage.status === 'published' ? 'btn-success' : 'btn-outline'}"
                        title={landingPage.status === 'published' ? 'Unpublish' : 'Publish'}
                      >
                        {landingPage.status === 'published' ? 'Live' : 'Draft'}
                      </button>
                    </form>
                  {/if}
                </div>
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {:else}
    <div class="empty-state">
      <div class="empty-state-icon">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          <polyline points="14 2 14 8 20 8"/>
          <line x1="16" y1="13" x2="8" y2="13"/>
          <line x1="16" y1="17" x2="8" y2="17"/>
        </svg>
      </div>
      <h3 class="empty-state-title">
        {#if data.filters.search || data.filters.organizationId || data.filters.status}
          No landing pages found
        {:else}
          No landing pages yet
        {/if}
      </h3>
      <p class="empty-state-description">
        {#if data.filters.search || data.filters.organizationId || data.filters.status}
          Try adjusting your search or filter criteria.
        {:else}
          Create your first landing page for a client to get started.
        {/if}
      </p>
      {#if !data.filters.search && !data.filters.organizationId && !data.filters.status}
        <a href="/internal/landing-pages/create" class="btn btn-primary">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="12" y1="5" x2="12" y2="19"/>
            <line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Create First Landing Page
        </a>
      {/if}
    </div>
  {/if}
</div>

<style>
  .stats-row {
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    gap: var(--spacing-6);
    margin-bottom: var(--spacing-6);
  }

  @media (max-width: 1200px) {
    .stats-row {
      grid-template-columns: repeat(3, 1fr);
    }
  }

  @media (max-width: 768px) {
    .stats-row {
      grid-template-columns: repeat(2, 1fr);
    }
  }

  @media (max-width: 480px) {
    .stats-row {
      grid-template-columns: 1fr;
    }
  }

  .stat-card-change.neutral {
    color: var(--gray-500);
  }

  .card-header-with-action {
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: var(--spacing-4);
  }

  .filters-bar {
    display: flex;
    gap: var(--spacing-4);
    padding: var(--spacing-4);
    border-bottom: 1px solid var(--gray-200);
    flex-wrap: wrap;
  }

  .filter-group {
    flex: 1;
    min-width: 180px;
  }

  .search-form {
    width: 100%;
  }

  .search-input-wrapper {
    position: relative;
    display: flex;
    align-items: center;
  }

  .search-input-wrapper svg {
    position: absolute;
    left: 12px;
    color: var(--gray-400);
  }

  .search-input {
    width: 100%;
    padding: 10px 12px 10px 40px;
    border: 1px solid var(--gray-300);
    border-radius: var(--radius-lg);
    font-size: 0.875rem;
    background: white;
  }

  .search-input:focus {
    outline: none;
    border-color: var(--primary-500);
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }

  .filter-select {
    width: 100%;
    padding: 10px 12px;
    border: 1px solid var(--gray-300);
    border-radius: var(--radius-lg);
    font-size: 0.875rem;
    background: white;
    cursor: pointer;
  }

  .filter-select:focus {
    outline: none;
    border-color: var(--primary-500);
  }

  .alert {
    display: flex;
    align-items: center;
    gap: var(--spacing-3);
    padding: var(--spacing-4);
    margin: var(--spacing-4);
    border-radius: var(--radius-lg);
  }

  .alert-success {
    background: var(--success-50);
    color: var(--success-700);
    border: 1px solid var(--success-200);
  }

  .alert-danger {
    background: var(--danger-50);
    color: var(--danger-700);
    border: 1px solid var(--danger-200);
  }

  .table-container {
    overflow-x: auto;
  }

  .cell-primary {
    font-weight: 500;
    color: var(--gray-900);
  }

  .cell-secondary {
    font-size: 0.75rem;
    color: var(--gray-500);
    margin-top: 2px;
  }

  .link {
    color: var(--primary-600);
    font-weight: 500;
  }

  .link:hover {
    text-decoration: underline;
  }

  .text-muted {
    color: var(--gray-400);
  }

  .text-success {
    color: var(--success-600);
  }

  .font-medium {
    font-weight: 500;
  }

  .font-semibold {
    font-weight: 600;
  }

  .text-center {
    text-align: center;
  }

  .text-right {
    text-align: right;
  }

  .table-actions {
    display: flex;
    justify-content: center;
    gap: var(--spacing-2);
  }

  .btn-icon {
    padding: 6px;
    min-width: auto;
  }

  .inline-form {
    display: inline;
  }

  .badge-purple {
    background: #f3e8ff;
    color: #7c3aed;
  }

  .empty-state {
    padding: var(--spacing-12);
    text-align: center;
  }

  .empty-state-icon {
    display: inline-flex;
    padding: var(--spacing-4);
    background: var(--gray-100);
    border-radius: var(--radius-full);
    margin-bottom: var(--spacing-4);
    color: var(--gray-400);
  }

  .empty-state-title {
    font-size: 1.125rem;
    font-weight: 600;
    color: var(--gray-900);
    margin-bottom: var(--spacing-2);
  }

  .empty-state-description {
    color: var(--gray-500);
    margin-bottom: var(--spacing-6);
  }
</style>
