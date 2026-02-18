<script lang="ts">
  import type { PageData, ActionData } from './$types';
  import { enhance } from '$app/forms';
  import LandingPageCard from '$lib/components/landing-pages/LandingPageCard.svelte';

  let { data, form }: { data: PageData; form: ActionData } = $props();

  let showCreateModal = $state(false);
  let selectedTemplateId = $state('');
  let isCreating = $state(false);
  let statusFilter = $state('all');

  let filteredLandingPages = $derived(
    statusFilter === 'all'
      ? data.landingPages
      : data.landingPages.filter(lp => lp.status === statusFilter)
  );

  function getCategoryBadgeClass(category: string): string {
    switch (category) {
      case 'implant': return 'badge-primary';
      case 'cosmetic': return 'badge-purple';
      case 'general': return 'badge-success';
      case 'promo': return 'badge-warning';
      default: return 'badge-primary';
    }
  }
</script>

<svelte:head>
  <title>Landing Pages - {data.organization.name} - SqueezMedia</title>
</svelte:head>

<!-- Breadcrumb -->
<nav class="breadcrumb">
  <a href="/internal">Clients</a>
  <span class="sep">/</span>
  <a href="/internal/clients/{data.organization.id}">{data.organization.name}</a>
  <span class="sep">/</span>
  <span class="current">Landing Pages</span>
</nav>

<!-- Stats Row -->
<div class="stats-row">
  <div class="stat-card">
    <div class="stat-card-header">
      <div class="stat-card-icon primary">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
      </div>
    </div>
    <div class="stat-card-label">Total Pages</div>
    <div class="stat-card-value">{data.stats.totalPages}</div>
  </div>

  <div class="stat-card">
    <div class="stat-card-header">
      <div class="stat-card-icon success">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
      </div>
    </div>
    <div class="stat-card-label">Published</div>
    <div class="stat-card-value">{data.stats.publishedPages}</div>
  </div>

  <div class="stat-card">
    <div class="stat-card-header">
      <div class="stat-card-icon primary">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
      </div>
    </div>
    <div class="stat-card-label">Total Views</div>
    <div class="stat-card-value">{data.stats.totalViews.toLocaleString()}</div>
  </div>

  <div class="stat-card">
    <div class="stat-card-header">
      <div class="stat-card-icon warning">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
      </div>
    </div>
    <div class="stat-card-label">Submissions</div>
    <div class="stat-card-value">{data.stats.totalSubmissions.toLocaleString()}</div>
  </div>

  <div class="stat-card">
    <div class="stat-card-header">
      <div class="stat-card-icon success">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
      </div>
    </div>
    <div class="stat-card-label">Avg Conv. Rate</div>
    <div class="stat-card-value">{data.stats.avgConversionRate}%</div>
  </div>
</div>

<!-- Page Header -->
<div class="card">
  <div class="card-header" style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem;">
    <div>
      <h3 class="card-title">Landing Pages</h3>
      <p class="card-subtitle">Manage landing pages for {data.organization.name}</p>
    </div>
    <div style="display: flex; align-items: center; gap: 0.75rem;">
      <select bind:value={statusFilter} class="form-select" style="width: auto; min-width: 140px;">
        <option value="all">All Status</option>
        <option value="published">Published</option>
        <option value="draft">Draft</option>
        <option value="archived">Archived</option>
      </select>
      <button class="btn btn-primary" onclick={() => (showCreateModal = true)}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        Create Landing Page
      </button>
    </div>
  </div>

  <!-- Success/Error Messages -->
  {#if form?.success}
    <div class="alert alert-success" style="margin: 1rem;">
      {form.message}
    </div>
  {/if}

  {#if form?.message && !form?.success}
    <div class="alert alert-danger" style="margin: 1rem;">
      {form.message}
    </div>
  {/if}

  <div class="card-body">
    {#if filteredLandingPages && filteredLandingPages.length > 0}
      <div class="lp-grid">
        {#each filteredLandingPages as landingPage (landingPage.id)}
          <LandingPageCard
            {landingPage}
            organizationId={data.organization.id}
          />
        {/each}
      </div>
    {:else}
      <div class="empty-state">
        <div class="empty-state-icon">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
        </div>
        <h3 class="empty-state-title">
          {#if statusFilter !== 'all'}
            No {statusFilter} landing pages
          {:else}
            No landing pages yet
          {/if}
        </h3>
        <p class="empty-state-description">
          {#if statusFilter !== 'all'}
            Try changing the filter or create a new landing page.
          {:else}
            Create your first landing page for {data.organization.name} to get started.
          {/if}
        </p>
        {#if statusFilter === 'all'}
          <button class="btn btn-primary" onclick={() => (showCreateModal = true)}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Create First Landing Page
          </button>
        {/if}
      </div>
    {/if}
  </div>
</div>

<!-- Create Landing Page Modal -->
{#if showCreateModal}
  <div class="modal-overlay" onclick={() => (showCreateModal = false)} role="presentation">
    <div class="modal" onclick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
      <div class="modal-header">
        <h3>Create Landing Page</h3>
        <button class="modal-close" onclick={() => (showCreateModal = false)}>
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
      </div>
      <div class="modal-body">
        <p style="color: var(--gray-600); margin-bottom: 1rem;">
          Select a template to create a new landing page for {data.organization.name}.
          You can customize it after creation.
        </p>

        <form
          method="POST"
          action="?/createFromTemplate"
          use:enhance={() => {
            isCreating = true;
            return async ({ result, update }) => {
              isCreating = false;
              if (result.type === 'redirect') {
                showCreateModal = false;
              }
              await update();
            };
          }}
        >
          <div style="margin-bottom: 1.5rem;">
            <label class="form-label" for="templateSelect">Choose Template</label>
            {#if data.templates.length > 0}
              <select
                id="templateSelect"
                name="templateId"
                bind:value={selectedTemplateId}
                class="form-select"
                required
              >
                <option value="" disabled>Select a template...</option>
                {#each data.templates as template}
                  <option value={template.id}>{template.name} ({template.category})</option>
                {/each}
              </select>
              {#if selectedTemplateId}
                {@const selectedTemplate = data.templates.find(t => t.id === selectedTemplateId)}
                {#if selectedTemplate}
                  <div style="margin-top: 0.75rem; padding: 0.75rem; background: var(--gray-50); border-radius: var(--radius-lg);">
                    <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.25rem;">
                      <span style="font-weight: 500;">{selectedTemplate.name}</span>
                      <span class="badge {getCategoryBadgeClass(selectedTemplate.category)}">{selectedTemplate.category}</span>
                    </div>
                    {#if selectedTemplate.description}
                      <p style="font-size: 0.875rem; color: var(--gray-500);">{selectedTemplate.description}</p>
                    {/if}
                  </div>
                {/if}
              {/if}
            {:else}
              <p style="font-size: 0.875rem; color: var(--gray-500); padding: 1rem; background: var(--gray-50); border-radius: var(--radius-lg);">
                No templates available. Create templates first.
              </p>
            {/if}
          </div>

          <div style="display: flex; justify-content: flex-end; gap: 0.75rem;">
            <button type="button" class="btn btn-secondary" onclick={() => (showCreateModal = false)} disabled={isCreating}>
              Cancel
            </button>
            <button
              type="submit"
              class="btn btn-primary"
              disabled={!selectedTemplateId || isCreating || data.templates.length === 0}
            >
              {isCreating ? 'Creating...' : 'Create Landing Page'}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
{/if}

<style>
  .breadcrumb {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.875rem;
    margin-bottom: 1.5rem;
    color: var(--gray-500);
  }

  .breadcrumb a {
    color: var(--gray-500);
    text-decoration: none;
  }

  .breadcrumb a:hover {
    color: var(--primary-600);
  }

  .breadcrumb .sep {
    color: var(--gray-300);
  }

  .breadcrumb .current {
    color: var(--gray-900);
    font-weight: 500;
  }

  .stats-row {
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    gap: var(--spacing-4);
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

  .lp-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 1.5rem;
  }

  @media (max-width: 1200px) {
    .lp-grid {
      grid-template-columns: repeat(2, 1fr);
    }
  }

  @media (max-width: 768px) {
    .lp-grid {
      grid-template-columns: 1fr;
    }
  }

  .alert {
    padding: 0.75rem 1rem;
    border-radius: var(--radius-lg);
    font-size: 0.875rem;
  }

  .alert-success {
    background: #f0fdf4;
    border: 1px solid #bbf7d0;
    color: #166534;
  }

  .alert-danger {
    background: #fef2f2;
    border: 1px solid #fecaca;
    color: #991b1b;
  }

  .empty-state {
    padding: 3rem;
    text-align: center;
  }

  .empty-state-icon {
    display: inline-flex;
    padding: 1rem;
    background: var(--gray-100);
    border-radius: 50%;
    margin-bottom: 1rem;
    color: var(--gray-400);
  }

  .empty-state-title {
    font-size: 1.125rem;
    font-weight: 600;
    margin-bottom: 0.5rem;
  }

  .empty-state-description {
    color: var(--gray-500);
    margin-bottom: 1.5rem;
  }

  .badge-purple {
    background: #f3e8ff;
    color: #7c3aed;
  }
</style>
