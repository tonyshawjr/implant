<script lang="ts">
  import type { PageData, ActionData } from './$types';
  import { enhance } from '$app/forms';
  import LandingPageEditor from '$lib/components/landing-pages/LandingPageEditor.svelte';

  let { data, form }: { data: PageData; form: ActionData } = $props();

  // Form state
  let name = $state(data.landingPage.name);
  let slug = $state(data.landingPage.slug);
  let metaTitle = $state(data.landingPage.metaTitle || '');
  let metaDescription = $state(data.landingPage.metaDescription || '');
  let customHtml = $state(data.landingPage.customHtml || '');
  let customCss = $state(data.landingPage.customCss || '');
  let config = $state(data.landingPage.config || {});
  let campaignId = $state(data.landingPage.campaign?.id || '');

  let isSaving = $state(false);
  let hasChanges = $state(false);
  let showDeleteModal = $state(false);
  let copySuccess = $state(false);

  function getStatusBadgeClass(status: string): string {
    switch (status) {
      case 'published': return 'badge-success';
      case 'draft': return 'badge-warning';
      case 'archived': return 'badge-gray';
      default: return 'badge-gray';
    }
  }

  // Generate slug from name
  function generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  }

  function handleNameChange(e: Event) {
    const target = e.target as HTMLInputElement;
    name = target.value;
    if (!slug || slug === generateSlug(data.landingPage.name)) {
      slug = generateSlug(name);
    }
    hasChanges = true;
  }

  function handleHtmlChange(html: string) {
    customHtml = html;
    hasChanges = true;
  }

  function handleCssChange(css: string) {
    customCss = css;
    hasChanges = true;
  }

  function handleConfigChange(newConfig: Record<string, unknown>) {
    config = newConfig;
    hasChanges = true;
  }

  function handleMetaTitleChange(title: string) {
    metaTitle = title;
    hasChanges = true;
  }

  function handleMetaDescriptionChange(desc: string) {
    metaDescription = desc;
    hasChanges = true;
  }

  function markChanged() {
    hasChanges = true;
  }

  function getPublicUrl(): string {
    return `/lp/${data.landingPage.slug}${data.landingPage.status !== 'published' ? '?preview=true' : ''}`;
  }

  function getFullUrl(): string {
    if (typeof window !== 'undefined') {
      return `${window.location.origin}${getPublicUrl()}`;
    }
    return getPublicUrl();
  }

  async function copyToClipboard() {
    try {
      await navigator.clipboard.writeText(getFullUrl());
      copySuccess = true;
      setTimeout(() => {
        copySuccess = false;
      }, 2000);
    } catch (err) {
      console.error('Failed to copy URL:', err);
    }
  }
</script>

<svelte:head>
  <title>Edit Landing Page: {data.landingPage.name} - SqueezMedia</title>
</svelte:head>

<!-- Breadcrumb -->
<nav class="breadcrumb">
  <a href="/internal">Clients</a>
  <span class="breadcrumb-separator">/</span>
  <a href="/internal/clients/{data.organization.id}">{data.organization.name}</a>
  <span class="breadcrumb-separator">/</span>
  <a href="/internal/clients/{data.organization.id}/landing-pages">Landing Pages</a>
  <span class="breadcrumb-separator">/</span>
  <span class="breadcrumb-current">{data.landingPage.name}</span>
</nav>

<!-- Header -->
<div class="page-header">
  <div class="page-header-left">
    <a href="/internal/clients/{data.organization.id}/landing-pages" class="btn btn-secondary" style="margin-right: 1rem;">
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
      Back
    </a>
    <div>
      <div style="display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
        <h1 class="page-title" style="margin: 0;">{data.landingPage.name}</h1>
        <span class="badge {getStatusBadgeClass(data.landingPage.status)}">
          {data.landingPage.status === 'published' ? 'Published' : data.landingPage.status === 'draft' ? 'Draft' : 'Archived'}
        </span>
        {#if hasChanges}
          <span class="badge badge-danger">Unsaved Changes</span>
        {/if}
      </div>
      <p class="page-subtitle" style="margin-top: 0.25rem;">
        {data.landingPage.viewCount.toLocaleString()} views - {data.landingPage.submissionCount.toLocaleString()} submissions
        {#if data.landingPage.template}
          - Template: {data.landingPage.template.name}
        {/if}
      </p>
    </div>
  </div>
  <div class="page-header-actions">
    <a href={getPublicUrl()} target="_blank" class="btn btn-secondary">
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
      Preview
    </a>
  </div>
</div>

<!-- Public URL Bar -->
<div class="card" style="margin-bottom: 1.5rem;">
  <div class="card-body" style="padding: 1rem;">
    <div style="display: flex; align-items: center; gap: 0.75rem;">
      <svg class="w-5 h-5" style="color: var(--gray-400); flex-shrink: 0;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" /></svg>
      <div style="flex: 1; min-width: 0;">
        <p style="font-size: 0.75rem; color: var(--gray-500); margin-bottom: 0.25rem;">Public URL</p>
        <code style="font-size: 0.875rem; font-family: monospace; word-break: break-all;">
          {getFullUrl()}
        </code>
      </div>
      <button class="btn btn-secondary" onclick={copyToClipboard} style="flex-shrink: 0;">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" /></svg>
        {copySuccess ? 'Copied!' : 'Copy URL'}
      </button>
      {#if data.landingPage.status === 'published'}
        <span class="badge badge-success" style="flex-shrink: 0;">Live</span>
      {:else}
        <span class="badge badge-warning" style="flex-shrink: 0;">Not Published</span>
      {/if}
    </div>
  </div>
</div>

<!-- Success/Error Messages -->
{#if form?.success}
  <div class="alert alert-success" style="margin-bottom: 1rem;">
    {form.message}
  </div>
{/if}

{#if form?.message && !form?.success}
  <div class="alert alert-danger" style="margin-bottom: 1rem;">
    {form.message}
  </div>
{/if}

<!-- Main Content - Two Column Layout -->
<form
  method="POST"
  action="?/save"
  class="editor-layout"
  use:enhance={() => {
    isSaving = true;
    return async ({ result, update }) => {
      await update();
      isSaving = false;
      if (result.type === 'success') {
        hasChanges = false;
      }
    };
  }}
>
  <!-- Hidden inputs for form data -->
  <input type="hidden" name="customHtml" value={customHtml} />
  <input type="hidden" name="customCss" value={customCss} />
  <input type="hidden" name="config" value={JSON.stringify(config)} />
  <input type="hidden" name="metaTitle" value={metaTitle} />
  <input type="hidden" name="metaDescription" value={metaDescription} />

  <!-- Left Column - Editor -->
  <div class="card editor-card">
    <div class="card-body">
      <LandingPageEditor
        {customHtml}
        {customCss}
        {config}
        {metaTitle}
        {metaDescription}
        templateName={data.landingPage.template?.name}
        onHtmlChange={handleHtmlChange}
        onCssChange={handleCssChange}
        onConfigChange={handleConfigChange}
        onMetaTitleChange={handleMetaTitleChange}
        onMetaDescriptionChange={handleMetaDescriptionChange}
      />
    </div>
  </div>

  <!-- Right Column - Settings & Actions -->
  <div class="settings-column">
    <!-- Page Settings Card -->
    <div class="card">
      <div class="card-header">
        <h2 class="card-title">Page Settings</h2>
      </div>
      <div class="card-body">
        <div style="display: flex; flex-direction: column; gap: 1rem;">
          <div>
            <label class="form-label" for="pageName">Name *</label>
            <input
              type="text"
              id="pageName"
              name="name"
              value={name}
              oninput={handleNameChange}
              class="form-input"
              placeholder="Landing page name"
              required
            />
          </div>

          <div>
            <label class="form-label" for="pageSlug">Slug *</label>
            <input
              type="text"
              id="pageSlug"
              name="slug"
              bind:value={slug}
              oninput={markChanged}
              class="form-input"
              placeholder="page-slug"
              required
            />
            <span class="form-hint">Used in URLs. Lowercase letters, numbers, and hyphens only.</span>
          </div>

          <div>
            <label class="form-label" for="campaignSelect">Campaign</label>
            <select
              id="campaignSelect"
              name="campaignId"
              bind:value={campaignId}
              onchange={markChanged}
              class="form-select"
            >
              <option value="">No campaign</option>
              {#each data.campaigns as campaign}
                <option value={campaign.id}>{campaign.name} ({campaign.status})</option>
              {/each}
            </select>
            <span class="form-hint">Link this page to a campaign for lead attribution.</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Actions Card -->
    <div class="card">
      <div class="card-header">
        <h2 class="card-title">Actions</h2>
      </div>
      <div class="card-body">
        <div style="display: flex; flex-direction: column; gap: 0.75rem;">
          <button
            type="submit"
            class="btn btn-primary"
            disabled={isSaving}
            style="width: 100%;"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>

          {#if data.landingPage.status !== 'published'}
            <form method="POST" action="?/publish" use:enhance style="width: 100%;">
              <button type="submit" class="btn btn-success" style="width: 100%;">
                Publish Landing Page
              </button>
            </form>
          {:else}
            <form method="POST" action="?/unpublish" use:enhance style="width: 100%;">
              <button type="submit" class="btn btn-secondary" style="width: 100%;">
                Unpublish Landing Page
              </button>
            </form>
          {/if}

          {#if data.landingPage.status !== 'archived'}
            <button
              type="button"
              class="btn btn-danger-outline"
              onclick={() => (showDeleteModal = true)}
              style="width: 100%;"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
              Archive Page
            </button>
          {/if}
        </div>
      </div>
    </div>

    <!-- Info Card -->
    <div class="card" style="background: var(--gray-50);">
      <div class="card-body">
        <h3 style="font-weight: 500; margin-bottom: 0.5rem;">Page Info</h3>
        <ul style="font-size: 0.875rem; color: var(--gray-600); list-style: none; padding: 0; display: flex; flex-direction: column; gap: 0.25rem;">
          <li>Created: {new Date(data.landingPage.createdAt).toLocaleDateString()}</li>
          <li>Updated: {new Date(data.landingPage.updatedAt).toLocaleDateString()}</li>
          {#if data.landingPage.publishedAt}
            <li>Published: {new Date(data.landingPage.publishedAt).toLocaleDateString()}</li>
          {/if}
          {#if data.landingPage.createdBy}
            <li>By: {data.landingPage.createdBy.name}</li>
          {/if}
          {#if data.landingPage.template}
            <li>Template: {data.landingPage.template.name}</li>
          {/if}
        </ul>
      </div>
    </div>

    <!-- Live Preview Frame -->
    {#if data.landingPage.status === 'published'}
      <div class="card" style="overflow: hidden;">
        <div class="card-header" style="padding: 0.75rem 1rem;">
          <h3 style="font-weight: 500; font-size: 0.875rem;">Live Preview</h3>
        </div>
        <div style="position: relative; padding-bottom: 75%;">
          <iframe
            src={getPublicUrl()}
            title="Landing page preview"
            style="position: absolute; inset: 0; width: 100%; height: 100%; border: 0;"
            sandbox="allow-scripts allow-same-origin"
          ></iframe>
        </div>
      </div>
    {/if}
  </div>
</form>

<!-- Delete Confirmation Modal -->
{#if showDeleteModal}
  <div class="modal-overlay" onclick={() => (showDeleteModal = false)} role="presentation">
    <div class="modal" onclick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
      <div class="modal-header">
        <h3>Archive Landing Page</h3>
        <button class="modal-close" onclick={() => (showDeleteModal = false)}>
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
      </div>
      <div class="modal-body">
        <p style="color: var(--gray-600);">
          Are you sure you want to archive this landing page? It will no longer be publicly accessible,
          but you can restore it later.
        </p>
      </div>
      <div class="modal-footer">
        <form method="POST" action="?/delete" use:enhance>
          <div style="display: flex; justify-content: flex-end; gap: 0.75rem;">
            <button type="button" class="btn btn-secondary" onclick={() => (showDeleteModal = false)}>
              Cancel
            </button>
            <button type="submit" class="btn btn-danger">
              Archive Page
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

  .breadcrumb-separator {
    color: var(--gray-300);
  }

  .breadcrumb-current {
    color: var(--gray-900);
    font-weight: 500;
  }

  .page-header {
    display: flex;
    flex-wrap: wrap;
    align-items: flex-start;
    justify-content: space-between;
    gap: 1rem;
    margin-bottom: 1.5rem;
  }

  .page-header-left {
    display: flex;
    align-items: flex-start;
    gap: 0;
  }

  .page-header-actions {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .page-title {
    font-size: 1.25rem;
    font-weight: 700;
  }

  .page-subtitle {
    font-size: 0.875rem;
    color: var(--gray-500);
  }

  .editor-layout {
    display: flex;
    gap: 1.5rem;
  }

  .editor-card {
    flex: 1;
    min-width: 0;
  }

  .settings-column {
    width: 20rem;
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  .btn-success {
    background: var(--success-600);
    color: white;
    border: none;
    padding: 0.625rem 1.25rem;
    border-radius: 0.5rem;
    font-weight: 500;
    cursor: pointer;
    font-size: 0.875rem;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
  }

  .btn-success:hover {
    background: var(--success-700);
  }

  .btn-danger {
    background: var(--danger-600);
    color: white;
    border: none;
    padding: 0.625rem 1.25rem;
    border-radius: 0.5rem;
    font-weight: 500;
    cursor: pointer;
    font-size: 0.875rem;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
  }

  .btn-danger:hover {
    background: var(--danger-700);
  }

  .btn-danger-outline {
    background: transparent;
    color: var(--danger-600);
    border: 1px solid var(--danger-600);
    padding: 0.625rem 1.25rem;
    border-radius: 0.5rem;
    font-weight: 500;
    cursor: pointer;
    font-size: 0.875rem;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
  }

  .btn-danger-outline:hover {
    background: #fef2f2;
  }

  .alert {
    padding: 1rem;
    border-radius: 0.75rem;
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

  @media (max-width: 1024px) {
    .editor-layout {
      flex-direction: column;
    }

    .settings-column {
      width: 100%;
    }
  }
</style>
