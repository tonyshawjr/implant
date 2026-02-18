<script lang="ts">
  import type { PageData, ActionData } from './$types';
  import { enhance } from '$app/forms';

  let { data, form }: { data: PageData; form: ActionData } = $props();

  // Form state
  let organizationId = $state('');
  let templateSlug = $state('');
  let name = $state('');
  let slug = $state('');
  let isCreating = $state(false);

  // Selected organization details
  let selectedOrganization = $derived(
    data.organizations.find(org => org.id === organizationId)
  );

  // Selected template details
  let selectedTemplate = $derived(
    data.templates.find(t => t.slug === templateSlug)
  );

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
    slug = generateSlug(name);
  }

  function handleTemplateSelect(templateSlugValue: string) {
    templateSlug = templateSlugValue;
    if (selectedOrganization && templateSlugValue) {
      const template = data.templates.find(t => t.slug === templateSlugValue);
      if (template) {
        name = `${selectedOrganization.name} - ${template.name}`;
        slug = generateSlug(name);
      }
    }
  }

  function getCategoryLabel(category: string): string {
    switch (category) {
      case 'implant':
        return 'Dental Implant';
      case 'cosmetic':
        return 'Cosmetic';
      case 'general':
        return 'General';
      case 'promo':
        return 'Promotional';
      default:
        return category;
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
</script>

<svelte:head>
  <title>Create Landing Page - SqueezMedia</title>
</svelte:head>

<!-- Header -->
<div class="page-header">
  <a href="/internal/landing-pages" class="btn btn-outline btn-sm">
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <line x1="19" y1="12" x2="5" y2="12"/>
      <polyline points="12 19 5 12 12 5"/>
    </svg>
    Back
  </a>
  <div class="page-header-content">
    <h1 class="page-title">Create Landing Page</h1>
    <p class="page-subtitle">Create a new landing page for a client using a funnel template</p>
  </div>
</div>

<!-- Error Messages -->
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

<form
  method="POST"
  action="?/create"
  use:enhance={() => {
    isCreating = true;
    return async ({ update }) => {
      await update();
      isCreating = false;
    };
  }}
>
  <div class="create-layout">
    <!-- Main Content -->
    <div class="main-content">
      <!-- Step 1: Select Organization -->
      <div class="card">
        <div class="card-header">
          <div class="step-indicator">
            <span class="step-number">1</span>
            <h3 class="card-title">Select Client</h3>
          </div>
        </div>
        <div class="card-body">
          <div class="form-group">
            <label for="organization" class="form-label">Client Organization *</label>
            <select
              id="organization"
              name="organizationId"
              bind:value={organizationId}
              required
              class="form-select"
            >
              <option value="">Select a client...</option>
              {#each data.organizations as org}
                <option value={org.id}>{org.name}</option>
              {/each}
            </select>
          </div>

          {#if selectedOrganization}
            <div class="selected-info">
              <div class="selected-avatar">
                {#if selectedOrganization.logoUrl}
                  <img src={selectedOrganization.logoUrl} alt={selectedOrganization.name} />
                {:else}
                  <span class="avatar-letter">{selectedOrganization.name.charAt(0)}</span>
                {/if}
              </div>
              <div class="selected-details">
                <div class="selected-name">{selectedOrganization.name}</div>
                {#if selectedOrganization.city && selectedOrganization.state}
                  <div class="selected-location">{selectedOrganization.city}, {selectedOrganization.state}</div>
                {/if}
              </div>
            </div>
          {/if}
        </div>
      </div>

      <!-- Step 2: Select Template -->
      <div class="card">
        <div class="card-header">
          <div class="step-indicator">
            <span class="step-number">2</span>
            <h3 class="card-title">Select Template</h3>
          </div>
        </div>
        <div class="card-body">
          <input type="hidden" name="templateSlug" value={templateSlug} />

          <div class="template-grid">
            {#each data.templates as template (template.slug)}
              <button
                type="button"
                class="template-card"
                class:selected={templateSlug === template.slug}
                onclick={() => handleTemplateSelect(template.slug)}
              >
                <!-- Template Preview -->
                <div
                  class="template-preview"
                  style="background: linear-gradient(135deg, {template.primaryColor}20, {template.primaryColor}40)"
                >
                  <div
                    class="template-icon"
                    style="background-color: {template.primaryColor}"
                  >
                    <span>{template.stepCount}</span>
                  </div>
                </div>

                <!-- Template Info -->
                <div class="template-info">
                  <div class="template-header">
                    <h4 class="template-name">{template.name}</h4>
                    {#if templateSlug === template.slug}
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" class="check-icon">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                      </svg>
                    {/if}
                  </div>

                  <span class="badge {getCategoryBadgeClass(template.category)}">
                    {getCategoryLabel(template.category)}
                  </span>

                  <p class="template-description">{template.description}</p>

                  <div class="template-stats">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <line x1="18" y1="20" x2="18" y2="10"/>
                      <line x1="12" y1="20" x2="12" y2="4"/>
                      <line x1="6" y1="20" x2="6" y2="14"/>
                    </svg>
                    <span>{template.estimatedConversionRate}% est. conv. rate</span>
                  </div>
                </div>
              </button>
            {/each}
          </div>
        </div>
      </div>

      <!-- Step 3: Page Details -->
      <div class="card">
        <div class="card-header">
          <div class="step-indicator">
            <span class="step-number">3</span>
            <h3 class="card-title">Page Details</h3>
          </div>
        </div>
        <div class="card-body">
          <div class="form-group">
            <label for="pageName" class="form-label">Landing Page Name *</label>
            <input
              type="text"
              id="pageName"
              name="name"
              value={name}
              oninput={handleNameChange}
              placeholder="e.g., Acme Dental - Implant Quiz"
              required
              class="form-input"
            />
            <p class="form-hint">Internal name for this landing page</p>
          </div>

          <div class="form-group">
            <label for="pageSlug" class="form-label">URL Slug</label>
            <input
              type="text"
              id="pageSlug"
              name="slug"
              bind:value={slug}
              placeholder="acme-dental-implant-quiz"
              class="form-input"
            />
            <p class="form-hint">Used in the landing page URL. Auto-generated from name if left empty.</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Sidebar -->
    <div class="sidebar-content">
      <!-- Selected Template Preview -->
      {#if selectedTemplate}
        <div class="card">
          <div class="card-header">
            <h3 class="card-title">Selected Template</h3>
          </div>
          <div class="card-body">
            <div
              class="preview-image"
              style="background: linear-gradient(135deg, {selectedTemplate.primaryColor}20, {selectedTemplate.primaryColor}40)"
            >
              <div
                class="preview-icon"
                style="background-color: {selectedTemplate.primaryColor}"
              >
                <span>{selectedTemplate.stepCount}</span>
              </div>
            </div>

            <h4 class="preview-name">{selectedTemplate.name}</h4>
            <p class="preview-description">{selectedTemplate.description}</p>

            <div class="preview-badges">
              <span class="badge {getCategoryBadgeClass(selectedTemplate.category)}">
                {getCategoryLabel(selectedTemplate.category)}
              </span>
              <span class="badge badge-success">
                {selectedTemplate.estimatedConversionRate}% Conv. Rate
              </span>
            </div>

            <div class="preview-steps">
              <strong>{selectedTemplate.stepCount}</strong> interactive steps
            </div>
          </div>
        </div>
      {/if}

      <!-- Create Button -->
      <div class="card">
        <div class="card-body">
          <button
            type="submit"
            class="btn btn-primary btn-lg btn-full"
            disabled={isCreating || !organizationId || !templateSlug || !name}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="12" y1="5" x2="12" y2="19"/>
              <line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            {isCreating ? 'Creating...' : 'Create Landing Page'}
          </button>
          <p class="create-hint">
            Page will be created as a draft. You can edit and publish it after creation.
          </p>
        </div>
      </div>

      <!-- Help Card -->
      <div class="help-card">
        <h3 class="help-title">About Funnel Templates</h3>
        <ul class="help-list">
          <li>Interactive quiz-style lead funnels</li>
          <li>Mobile-optimized for high conversion</li>
          <li>Auto-populated with client info</li>
          <li>Customizable after creation</li>
          <li>Integrated lead capture forms</li>
        </ul>
      </div>
    </div>
  </div>
</form>

<style>
  .page-header {
    display: flex;
    align-items: flex-start;
    gap: var(--spacing-4);
    margin-bottom: var(--spacing-6);
  }

  .page-header-content {
    flex: 1;
  }

  .page-title {
    font-size: 1.5rem;
    font-weight: 700;
    color: var(--gray-900);
    margin-bottom: var(--spacing-1);
  }

  .page-subtitle {
    color: var(--gray-500);
    font-size: 0.875rem;
  }

  .alert {
    display: flex;
    align-items: center;
    gap: var(--spacing-3);
    padding: var(--spacing-4);
    margin-bottom: var(--spacing-6);
    border-radius: var(--radius-lg);
  }

  .alert-danger {
    background: var(--danger-50);
    color: var(--danger-700);
    border: 1px solid var(--danger-200);
  }

  .create-layout {
    display: grid;
    grid-template-columns: 2fr 1fr;
    gap: var(--spacing-6);
    align-items: start;
  }

  @media (max-width: 1024px) {
    .create-layout {
      grid-template-columns: 1fr;
    }

    .sidebar-content {
      order: -1;
    }
  }

  .main-content {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-6);
  }

  .sidebar-content {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-6);
  }

  .step-indicator {
    display: flex;
    align-items: center;
    gap: var(--spacing-3);
  }

  .step-number {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    border-radius: var(--radius-full);
    background: var(--primary-100);
    color: var(--primary-600);
    font-weight: 600;
    font-size: 0.875rem;
  }

  .form-group {
    margin-bottom: var(--spacing-4);
  }

  .form-group:last-child {
    margin-bottom: 0;
  }

  .form-label {
    display: block;
    font-size: 0.875rem;
    font-weight: 500;
    color: var(--gray-700);
    margin-bottom: var(--spacing-2);
  }

  .form-input,
  .form-select {
    width: 100%;
    padding: 10px 12px;
    border: 1px solid var(--gray-300);
    border-radius: var(--radius-lg);
    font-size: 0.875rem;
    background: white;
  }

  .form-input:focus,
  .form-select:focus {
    outline: none;
    border-color: var(--primary-500);
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }

  .form-hint {
    font-size: 0.75rem;
    color: var(--gray-500);
    margin-top: var(--spacing-1);
  }

  .selected-info {
    display: flex;
    align-items: center;
    gap: var(--spacing-3);
    padding: var(--spacing-4);
    background: var(--gray-50);
    border-radius: var(--radius-lg);
    margin-top: var(--spacing-4);
  }

  .selected-avatar {
    width: 40px;
    height: 40px;
    border-radius: var(--radius-lg);
    background: var(--primary-100);
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
  }

  .selected-avatar img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .avatar-letter {
    color: var(--primary-600);
    font-weight: 600;
    font-size: 1rem;
  }

  .selected-name {
    font-weight: 500;
    color: var(--gray-900);
  }

  .selected-location {
    font-size: 0.875rem;
    color: var(--gray-500);
  }

  .template-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: var(--spacing-4);
  }

  .template-card {
    text-align: left;
    padding: var(--spacing-4);
    border: 2px solid var(--gray-200);
    border-radius: var(--radius-xl);
    background: white;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .template-card:hover {
    border-color: var(--gray-300);
  }

  .template-card.selected {
    border-color: var(--primary-500);
    background: var(--primary-50);
  }

  .template-preview {
    height: 80px;
    border-radius: var(--radius-lg);
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: var(--spacing-3);
  }

  .template-icon {
    width: 40px;
    height: 40px;
    border-radius: var(--radius-full);
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-weight: 700;
    font-size: 1rem;
  }

  .template-info {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-2);
  }

  .template-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: var(--spacing-2);
  }

  .template-name {
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--gray-900);
    margin: 0;
  }

  .check-icon {
    color: var(--primary-500);
    flex-shrink: 0;
  }

  .template-description {
    font-size: 0.75rem;
    color: var(--gray-500);
    line-height: 1.4;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
    margin: 0;
  }

  .template-stats {
    display: flex;
    align-items: center;
    gap: var(--spacing-1);
    font-size: 0.75rem;
    color: var(--success-600);
  }

  .preview-image {
    height: 120px;
    border-radius: var(--radius-lg);
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: var(--spacing-4);
  }

  .preview-icon {
    width: 56px;
    height: 56px;
    border-radius: var(--radius-full);
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-weight: 700;
    font-size: 1.5rem;
  }

  .preview-name {
    font-size: 1rem;
    font-weight: 600;
    color: var(--gray-900);
    margin-bottom: var(--spacing-2);
  }

  .preview-description {
    font-size: 0.875rem;
    color: var(--gray-500);
    margin-bottom: var(--spacing-3);
  }

  .preview-badges {
    display: flex;
    gap: var(--spacing-2);
    flex-wrap: wrap;
    margin-bottom: var(--spacing-3);
  }

  .preview-steps {
    font-size: 0.875rem;
    color: var(--gray-600);
  }

  .btn-lg {
    padding: 12px 24px;
    font-size: 1rem;
  }

  .btn-full {
    width: 100%;
    justify-content: center;
  }

  .create-hint {
    font-size: 0.75rem;
    color: var(--gray-500);
    text-align: center;
    margin-top: var(--spacing-3);
  }

  .help-card {
    padding: var(--spacing-4);
    background: var(--primary-50);
    border: 1px solid var(--primary-200);
    border-radius: var(--radius-xl);
  }

  .help-title {
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--primary-900);
    margin-bottom: var(--spacing-3);
  }

  .help-list {
    list-style: none;
    padding: 0;
    margin: 0;
  }

  .help-list li {
    font-size: 0.875rem;
    color: var(--primary-700);
    padding-left: var(--spacing-4);
    position: relative;
    margin-bottom: var(--spacing-1);
  }

  .help-list li::before {
    content: '•';
    position: absolute;
    left: 0;
  }

  .badge-purple {
    background: #f3e8ff;
    color: #7c3aed;
  }
</style>
