<script lang="ts">
  import type { PageData, ActionData } from './$types';
  import { enhance } from '$app/forms';
  import {
    Button,
    Input,
    Label,
    Helper,
    Badge,
    Alert
  } from 'flowbite-svelte';
  import {
    ArrowLeftOutline,
    CheckCircleOutline,
    EyeOutline,
    ExclamationCircleOutline,
    FileDocOutline,
    StarSolid
  } from 'flowbite-svelte-icons';

  let { data, form }: { data: PageData; form: ActionData } = $props();

  // Form state
  let selectedTemplateId = $state(data.preselectedTemplate?.id || '');
  let pageName = $state(form?.name || '');
  let customSlug = $state(form?.slug || '');
  let isSubmitting = $state(false);

  // Get selected template
  let selectedTemplate = $derived(
    data.templates.find(t => t.id === selectedTemplateId)
  );

  // Computed slug preview
  let slugPreview = $derived(
    customSlug
      ? customSlug.toLowerCase().replace(/[^a-z0-9-]/g, '').replace(/-+/g, '-')
      : pageName.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').substring(0, 50)
  );

  // Helper functions
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

  function selectTemplate(templateId: string) {
    selectedTemplateId = templateId;
  }

  function isTemplateSelected(templateId: string): boolean {
    return selectedTemplateId === templateId;
  }
</script>

<svelte:head>
  <title>Create Landing Page - Implant Lead Engine</title>
</svelte:head>

<!-- Back Button -->
<div class="page-back">
  <a href="/landing-pages" class="back-link">
    <ArrowLeftOutline class="w-4 h-4" />
    Back to Landing Pages
  </a>
</div>

<!-- Page Header -->
<div class="page-header">
  <div>
    <h1 class="page-title">Create New Landing Page</h1>
    <p class="page-subtitle">Choose a template and customize your lead capture page</p>
  </div>
</div>

<!-- Error Alert -->
{#if form?.message}
  <Alert color="red" class="mb-6">
    <ExclamationCircleOutline slot="icon" class="w-5 h-5" />
    {form.message}
  </Alert>
{/if}

<form
  method="POST"
  action="?/create"
  use:enhance={() => {
    isSubmitting = true;
    return async ({ update }) => {
      isSubmitting = false;
      await update();
    };
  }}
>
  <div class="create-page-layout">
    <!-- Left Column: Template Selection -->
    <div class="template-selection">
      <div class="section-header">
        <h2 class="section-title">Select Template</h2>
        <p class="section-subtitle">Choose a starting point for your landing page</p>
      </div>

      <input type="hidden" name="templateId" value={selectedTemplateId} />

      <div class="template-grid">
        {#each data.templates as template}
          <button
            type="button"
            class="template-card {isTemplateSelected(template.id) ? 'selected' : ''}"
            onclick={() => selectTemplate(template.id)}
          >
            {#if isTemplateSelected(template.id)}
              <div class="selected-indicator">
                <CheckCircleOutline class="w-5 h-5" />
              </div>
            {/if}

            <div class="template-preview">
              {#if template.thumbnailUrl}
                <img src={template.thumbnailUrl} alt={template.name} />
              {:else}
                <div class="template-placeholder">
                  <FileDocOutline class="w-10 h-10 text-gray-400" />
                </div>
              {/if}
            </div>

            <div class="template-info">
              <div class="template-header">
                <h3 class="template-name">{template.name}</h3>
                <Badge color={getCategoryColor(template.category)} class="text-xs">
                  {template.category}
                </Badge>
              </div>

              {#if template.description}
                <p class="template-description">{template.description}</p>
              {/if}

              <div class="template-meta">
                {#if template.estimatedConversionRate}
                  <span class="conversion-rate">
                    <StarSolid class="w-3 h-3 text-yellow-400" />
                    ~{template.estimatedConversionRate}% conversion
                  </span>
                {/if}
                <span class="usage-count">
                  Used {template.usageCount} times
                </span>
              </div>
            </div>

            {#if template.thumbnailUrl}
              <div class="preview-indicator">
                <EyeOutline class="w-4 h-4" />
                Preview available
              </div>
            {/if}
          </button>
        {/each}
      </div>

      {#if data.templates.length === 0}
        <div class="no-templates">
          <FileDocOutline class="w-12 h-12 text-gray-400 mb-4" />
          <p class="text-gray-500">No templates available at this time.</p>
          <p class="text-sm text-gray-400 mt-2">Please contact support for assistance.</p>
        </div>
      {/if}
    </div>

    <!-- Right Column: Customization -->
    <div class="customization-panel">
      <div class="card">
        <div class="card-header">
          <h3 class="card-title">Page Details</h3>
        </div>
        <div class="card-body">
          <!-- Selected Template Summary -->
          {#if selectedTemplate}
            <div class="selected-template-summary">
              <div class="summary-icon">
                {#if selectedTemplate.thumbnailUrl}
                  <img src={selectedTemplate.thumbnailUrl} alt={selectedTemplate.name} />
                {:else}
                  <FileDocOutline class="w-6 h-6 text-gray-400" />
                {/if}
              </div>
              <div class="summary-info">
                <span class="summary-label">Selected Template</span>
                <span class="summary-name">{selectedTemplate.name}</span>
              </div>
              <Badge color={getCategoryColor(selectedTemplate.category)} class="text-xs">
                {selectedTemplate.category}
              </Badge>
            </div>
          {:else}
            <div class="no-template-selected">
              <ExclamationCircleOutline class="w-5 h-5 text-yellow-500" />
              <span>Please select a template from the left</span>
            </div>
          {/if}

          <!-- Page Name -->
          <div class="form-group">
            <Label for="pageName" class="mb-2">Page Name *</Label>
            <Input
              id="pageName"
              name="name"
              type="text"
              placeholder="e.g., Dental Implants Consultation"
              bind:value={pageName}
              required
            />
            <Helper class="mt-1">
              A descriptive name for your landing page
            </Helper>
          </div>

          <!-- Custom Slug -->
          <div class="form-group">
            <Label for="customSlug" class="mb-2">URL Slug (optional)</Label>
            <div class="slug-input-wrapper">
              <span class="slug-prefix">/lp/</span>
              <Input
                id="customSlug"
                name="slug"
                type="text"
                placeholder="auto-generated"
                bind:value={customSlug}
                class="slug-input"
              />
            </div>
            {#if slugPreview}
              <Helper class="mt-1">
                Your page will be at: <code class="url-preview">/lp/{slugPreview}</code>
              </Helper>
            {:else}
              <Helper class="mt-1">
                Leave empty to auto-generate from page name
              </Helper>
            {/if}
          </div>

          <!-- Organization Info -->
          <div class="org-info">
            <span class="org-label">Creating for:</span>
            <span class="org-name">{data.organization.name}</span>
          </div>
        </div>

        <div class="card-footer">
          <a href="/landing-pages" class="btn btn-secondary">
            Cancel
          </a>
          <Button
            type="submit"
            color="primary"
            disabled={!selectedTemplateId || !pageName.trim() || isSubmitting}
          >
            {#if isSubmitting}
              Creating...
            {:else}
              Create Landing Page
            {/if}
          </Button>
        </div>
      </div>

      <!-- Tips Card -->
      <div class="tips-card">
        <h4 class="tips-title">Tips for Success</h4>
        <ul class="tips-list">
          <li>
            <CheckCircleOutline class="w-4 h-4 text-green-500" />
            <span>Choose a template that matches your campaign goals</span>
          </li>
          <li>
            <CheckCircleOutline class="w-4 h-4 text-green-500" />
            <span>Use a clear, descriptive name for easy tracking</span>
          </li>
          <li>
            <CheckCircleOutline class="w-4 h-4 text-green-500" />
            <span>Keep your slug short and memorable</span>
          </li>
          <li>
            <CheckCircleOutline class="w-4 h-4 text-green-500" />
            <span>After creation, customize the content to match your brand</span>
          </li>
        </ul>
      </div>
    </div>
  </div>
</form>

<style>
  .page-back {
    margin-bottom: var(--spacing-4);
  }

  .back-link {
    display: inline-flex;
    align-items: center;
    gap: var(--spacing-2);
    font-size: 0.875rem;
    color: var(--gray-600);
    transition: color 0.2s ease;
  }

  .back-link:hover {
    color: var(--primary-600);
  }

  .page-header {
    margin-bottom: var(--spacing-6);
  }

  .page-title {
    font-size: 1.5rem;
    font-weight: 700;
    color: var(--gray-900);
    margin-bottom: var(--spacing-1);
  }

  .page-subtitle {
    font-size: 0.875rem;
    color: var(--gray-500);
  }

  .create-page-layout {
    display: grid;
    grid-template-columns: 1fr 400px;
    gap: var(--spacing-6);
    align-items: start;
  }

  @media (max-width: 1200px) {
    .create-page-layout {
      grid-template-columns: 1fr;
    }
  }

  .template-selection {
    background: white;
    border-radius: var(--radius-xl);
    border: 1px solid var(--gray-200);
    padding: var(--spacing-5);
  }

  .section-header {
    margin-bottom: var(--spacing-5);
  }

  .section-title {
    font-size: 1rem;
    font-weight: 600;
    color: var(--gray-900);
    margin-bottom: var(--spacing-1);
  }

  .section-subtitle {
    font-size: 0.875rem;
    color: var(--gray-500);
  }

  .template-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: var(--spacing-4);
  }

  @media (max-width: 768px) {
    .template-grid {
      grid-template-columns: 1fr;
    }
  }

  .template-card {
    position: relative;
    background: white;
    border: 2px solid var(--gray-200);
    border-radius: var(--radius-lg);
    overflow: hidden;
    cursor: pointer;
    transition: all 0.2s ease;
    text-align: left;
  }

  .template-card:hover {
    border-color: var(--gray-300);
    box-shadow: var(--shadow-md);
  }

  .template-card.selected {
    border-color: var(--primary-500);
    box-shadow: 0 0 0 3px var(--primary-100);
  }

  .selected-indicator {
    position: absolute;
    top: var(--spacing-2);
    right: var(--spacing-2);
    width: 28px;
    height: 28px;
    background: var(--primary-500);
    color: white;
    border-radius: var(--radius-full);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10;
  }

  .template-preview {
    width: 100%;
    height: 140px;
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

  .template-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: var(--spacing-2);
    margin-bottom: var(--spacing-2);
  }

  .template-name {
    font-size: 0.9375rem;
    font-weight: 600;
    color: var(--gray-900);
  }

  .template-description {
    font-size: 0.8125rem;
    color: var(--gray-500);
    margin-bottom: var(--spacing-3);
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .template-meta {
    display: flex;
    align-items: center;
    gap: var(--spacing-3);
    flex-wrap: wrap;
  }

  .conversion-rate {
    display: flex;
    align-items: center;
    gap: var(--spacing-1);
    font-size: 0.75rem;
    color: var(--success-600);
    font-weight: 500;
  }

  .usage-count {
    font-size: 0.75rem;
    color: var(--gray-400);
  }

  .preview-indicator {
    position: absolute;
    bottom: var(--spacing-3);
    right: var(--spacing-3);
    display: flex;
    align-items: center;
    gap: var(--spacing-1);
    font-size: 0.75rem;
    color: var(--gray-500);
    background: white;
    padding: var(--spacing-1) var(--spacing-2);
    border-radius: var(--radius-md);
    box-shadow: var(--shadow-sm);
  }

  .no-templates {
    text-align: center;
    padding: var(--spacing-10);
  }

  /* Customization Panel */
  .customization-panel {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-4);
    position: sticky;
    top: calc(var(--header-height) + var(--spacing-6));
  }

  .selected-template-summary {
    display: flex;
    align-items: center;
    gap: var(--spacing-3);
    padding: var(--spacing-3);
    background: var(--gray-50);
    border-radius: var(--radius-lg);
    margin-bottom: var(--spacing-5);
  }

  .summary-icon {
    width: 48px;
    height: 48px;
    border-radius: var(--radius-md);
    overflow: hidden;
    background: white;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .summary-icon img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .summary-info {
    flex: 1;
    min-width: 0;
  }

  .summary-label {
    display: block;
    font-size: 0.75rem;
    color: var(--gray-500);
  }

  .summary-name {
    display: block;
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--gray-900);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .no-template-selected {
    display: flex;
    align-items: center;
    gap: var(--spacing-2);
    padding: var(--spacing-3);
    background: var(--warning-50);
    border: 1px solid var(--warning-100);
    border-radius: var(--radius-lg);
    margin-bottom: var(--spacing-5);
    font-size: 0.875rem;
    color: var(--warning-600);
  }

  .form-group {
    margin-bottom: var(--spacing-5);
  }

  .slug-input-wrapper {
    display: flex;
    align-items: center;
  }

  .slug-prefix {
    padding: var(--spacing-2) var(--spacing-3);
    background: var(--gray-100);
    border: 1px solid var(--gray-300);
    border-right: none;
    border-radius: var(--radius-lg) 0 0 var(--radius-lg);
    font-size: 0.875rem;
    color: var(--gray-500);
  }

  :global(.slug-input) {
    border-radius: 0 var(--radius-lg) var(--radius-lg) 0 !important;
  }

  .url-preview {
    padding: 2px 6px;
    background: var(--gray-100);
    border-radius: var(--radius-sm);
    font-size: 0.8125rem;
    color: var(--gray-700);
  }

  .org-info {
    display: flex;
    align-items: center;
    gap: var(--spacing-2);
    padding: var(--spacing-3);
    background: var(--primary-50);
    border-radius: var(--radius-lg);
    font-size: 0.875rem;
  }

  .org-label {
    color: var(--primary-700);
  }

  .org-name {
    font-weight: 600;
    color: var(--primary-800);
  }

  .card-footer {
    display: flex;
    justify-content: flex-end;
    gap: var(--spacing-3);
  }

  /* Tips Card */
  .tips-card {
    background: var(--gray-50);
    border: 1px solid var(--gray-200);
    border-radius: var(--radius-xl);
    padding: var(--spacing-5);
  }

  .tips-title {
    font-size: 0.9375rem;
    font-weight: 600;
    color: var(--gray-900);
    margin-bottom: var(--spacing-4);
  }

  .tips-list {
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: var(--spacing-3);
  }

  .tips-list li {
    display: flex;
    align-items: flex-start;
    gap: var(--spacing-2);
    font-size: 0.8125rem;
    color: var(--gray-600);
  }

  .tips-list li :global(svg) {
    flex-shrink: 0;
    margin-top: 2px;
  }

  @media (max-width: 1200px) {
    .customization-panel {
      position: static;
    }
  }
</style>
