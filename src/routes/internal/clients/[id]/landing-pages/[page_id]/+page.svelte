<script lang="ts">
  import type { PageData, ActionData } from './$types';
  import { enhance } from '$app/forms';
  import {
    Button,
    Input,
    Label,
    Alert,
    Badge,
    Select,
    Breadcrumb,
    BreadcrumbItem,
    Modal,
    Tooltip
  } from 'flowbite-svelte';
  import {
    ArrowLeftOutline,
    CheckCircleOutline,
    ExclamationCircleOutline,
    EyeOutline,
    CloudArrowUpOutline,
    TrashBinOutline,
    ClipboardOutline,
    GlobeOutline,
    HomeOutline
  } from 'flowbite-svelte-icons';
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

  // Campaign options for dropdown
  let campaignOptions = $derived([
    { value: '', name: 'No campaign' },
    ...data.campaigns.map(c => ({
      value: c.id,
      name: `${c.name} (${c.status})`
    }))
  ]);

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
    // Auto-generate slug if it matches the original generated slug
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

  function getFullUrl(): string {
    if (typeof window !== 'undefined') {
      return `${window.location.origin}${data.publicUrl}`;
    }
    return data.publicUrl;
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

<div class="h-full flex flex-col">
  <!-- Breadcrumb -->
  <Breadcrumb aria-label="Breadcrumb navigation" class="mb-4">
    <BreadcrumbItem href="/internal" home>
      {#snippet icon()}
        <HomeOutline class="w-4 h-4 me-2" />
      {/snippet}
      Clients
    </BreadcrumbItem>
    <BreadcrumbItem href="/internal/clients/{data.organization.id}">
      {data.organization.name}
    </BreadcrumbItem>
    <BreadcrumbItem href="/internal/clients/{data.organization.id}/landing-pages">
      Landing Pages
    </BreadcrumbItem>
    <BreadcrumbItem>{data.landingPage.name}</BreadcrumbItem>
  </Breadcrumb>

  <!-- Header -->
  <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
    <div class="flex items-center gap-4">
      <Button
        href="/internal/clients/{data.organization.id}/landing-pages"
        color="light"
        size="sm"
      >
        <ArrowLeftOutline class="w-4 h-4 me-1" />
        Back
      </Button>
      <div>
        <div class="flex items-center gap-2">
          <h1 class="text-xl font-bold text-gray-900 dark:text-white">
            {data.landingPage.name}
          </h1>
          {#if data.landingPage.status === 'published'}
            <Badge color="green">Published</Badge>
          {:else if data.landingPage.status === 'draft'}
            <Badge color="yellow">Draft</Badge>
          {:else}
            <Badge color="gray">Archived</Badge>
          {/if}
          {#if hasChanges}
            <Badge color="red">Unsaved Changes</Badge>
          {/if}
        </div>
        <div class="flex items-center gap-2 mt-1 text-sm text-gray-500 dark:text-gray-400">
          <span>{data.landingPage.viewCount.toLocaleString()} views</span>
          <span>-</span>
          <span>{data.landingPage.submissionCount.toLocaleString()} submissions</span>
          {#if data.landingPage.template}
            <span>-</span>
            <span>Template: {data.landingPage.template.name}</span>
          {/if}
        </div>
      </div>
    </div>
    <div class="flex items-center gap-2">
      <Button
        href={data.publicUrl}
        target="_blank"
        color="light"
        size="sm"
      >
        <EyeOutline class="w-4 h-4 me-1" />
        Preview
      </Button>
    </div>
  </div>

  <!-- Public URL Bar -->
  <div class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-4 mb-6">
    <div class="flex items-center gap-3">
      <GlobeOutline class="w-5 h-5 text-gray-400 shrink-0" />
      <div class="flex-1">
        <p class="text-xs text-gray-500 dark:text-gray-400 mb-1">Public URL</p>
        <code class="text-sm text-gray-900 dark:text-white font-mono">
          {getFullUrl()}
        </code>
      </div>
      <Button
        size="sm"
        color="light"
        onclick={copyToClipboard}
        id="copy-url-btn"
      >
        <ClipboardOutline class="w-4 h-4 me-1" />
        {copySuccess ? 'Copied!' : 'Copy URL'}
      </Button>
      {#if data.landingPage.status === 'published'}
        <Badge color="green" class="shrink-0">Live</Badge>
      {:else}
        <Badge color="yellow" class="shrink-0">Not Published</Badge>
      {/if}
    </div>
  </div>

  <!-- Success/Error Messages -->
  {#if form?.success}
    <Alert color="green" class="mb-4">
      <CheckCircleOutline slot="icon" class="w-5 h-5" />
      {form.message}
    </Alert>
  {/if}

  {#if form?.message && !form?.success}
    <Alert color="red" class="mb-4">
      <ExclamationCircleOutline slot="icon" class="w-5 h-5" />
      {form.message}
    </Alert>
  {/if}

  <!-- Main Content - Two Column Layout -->
  <form
    method="POST"
    action="?/save"
    class="flex-1 flex flex-col lg:flex-row gap-6 min-h-0"
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
    <div class="flex-1 min-w-0 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 overflow-hidden flex flex-col">
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

    <!-- Right Column - Settings & Actions -->
    <div class="w-full lg:w-80 space-y-6 flex-shrink-0">
      <!-- Page Settings Card -->
      <div class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
        <h2 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Page Settings
        </h2>

        <div class="space-y-4">
          <div>
            <Label for="pageName" class="mb-2">Name *</Label>
            <Input
              id="pageName"
              name="name"
              value={name}
              oninput={handleNameChange}
              placeholder="Landing page name"
              required
            />
          </div>

          <div>
            <Label for="pageSlug" class="mb-2">Slug *</Label>
            <Input
              id="pageSlug"
              name="slug"
              bind:value={slug}
              oninput={markChanged}
              placeholder="page-slug"
              required
            />
            <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Used in URLs. Lowercase letters, numbers, and hyphens only.
            </p>
          </div>

          <div>
            <Label for="campaignSelect" class="mb-2">Campaign</Label>
            <Select
              id="campaignSelect"
              name="campaignId"
              items={campaignOptions}
              bind:value={campaignId}
              onchange={markChanged}
            />
            <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Link this page to a campaign for lead attribution.
            </p>
          </div>
        </div>
      </div>

      <!-- Actions Card -->
      <div class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
        <h2 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Actions
        </h2>

        <div class="space-y-3">
          <Button
            type="submit"
            color="primary"
            class="w-full"
            disabled={isSaving}
          >
            <CloudArrowUpOutline class="w-4 h-4 me-2" />
            {isSaving ? 'Saving...' : 'Save Changes'}
          </Button>

          {#if data.landingPage.status !== 'published'}
            <form method="POST" action="?/publish" use:enhance class="w-full">
              <Button type="submit" color="green" class="w-full">
                Publish Landing Page
              </Button>
            </form>
          {:else}
            <form method="POST" action="?/unpublish" use:enhance class="w-full">
              <Button type="submit" color="light" class="w-full">
                Unpublish Landing Page
              </Button>
            </form>
          {/if}

          {#if data.landingPage.status !== 'archived'}
            <Button
              color="red"
              outline
              class="w-full"
              onclick={() => (showDeleteModal = true)}
            >
              <TrashBinOutline class="w-4 h-4 me-2" />
              Archive Page
            </Button>
          {/if}
        </div>
      </div>

      <!-- Info Card -->
      <div class="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 text-sm text-gray-600 dark:text-gray-400">
        <h3 class="font-medium text-gray-900 dark:text-white mb-2">Page Info</h3>
        <ul class="space-y-1">
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

      <!-- Live Preview Frame -->
      {#if data.landingPage.status === 'published'}
        <div class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
          <div class="p-3 border-b border-gray-100 dark:border-gray-700">
            <h3 class="font-medium text-gray-900 dark:text-white text-sm">Live Preview</h3>
          </div>
          <div class="relative" style="padding-bottom: 75%;">
            <iframe
              src={data.publicUrl}
              title="Landing page preview"
              class="absolute inset-0 w-full h-full border-0"
              sandbox="allow-scripts allow-same-origin"
            ></iframe>
          </div>
        </div>
      {/if}
    </div>
  </form>
</div>

<!-- Delete Confirmation Modal -->
<Modal bind:open={showDeleteModal} size="sm" title="Archive Landing Page">
  <p class="text-gray-500 dark:text-gray-400">
    Are you sure you want to archive this landing page? It will no longer be publicly accessible,
    but you can restore it later.
  </p>
  <svelte:fragment slot="footer">
    <form method="POST" action="?/delete" use:enhance>
      <div class="flex justify-end gap-3">
        <Button color="light" onclick={() => (showDeleteModal = false)}>
          Cancel
        </Button>
        <Button type="submit" color="red">
          Archive Page
        </Button>
      </div>
    </form>
  </svelte:fragment>
</Modal>
