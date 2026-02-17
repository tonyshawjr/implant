<script lang="ts">
  import type { PageData, ActionData } from './$types';
  import { enhance } from '$app/forms';
  import { goto } from '$app/navigation';
  import {
    Badge,
    Button,
    Alert,
    Modal,
    Select,
    Breadcrumb,
    BreadcrumbItem,
    Dropdown,
    DropdownItem
  } from 'flowbite-svelte';
  import {
    PlusOutline,
    EyeOutline,
    FileDocOutline,
    ChartOutline,
    UsersGroupOutline,
    CheckCircleOutline,
    ExclamationCircleOutline,
    ChevronDownOutline,
    HomeOutline
  } from 'flowbite-svelte-icons';
  import LandingPageCard from '$lib/components/landing-pages/LandingPageCard.svelte';

  let { data, form }: { data: PageData; form: ActionData } = $props();

  let showCreateModal = $state(false);
  let selectedTemplateId = $state('');
  let isCreating = $state(false);

  // Filter state
  let statusFilter = $state('all');

  // Filtered landing pages
  let filteredLandingPages = $derived(
    statusFilter === 'all'
      ? data.landingPages
      : data.landingPages.filter(lp => lp.status === statusFilter)
  );

  // Template options for dropdown
  let templateOptions = $derived(
    data.templates.map(t => ({
      value: t.id,
      name: `${t.name} (${t.category})`
    }))
  );

  function handleCopyUrl() {
    // Could show a toast notification here
  }
</script>

<svelte:head>
  <title>Landing Pages - {data.organization.name} - SqueezMedia</title>
</svelte:head>

<!-- Breadcrumb -->
<Breadcrumb aria-label="Breadcrumb navigation" class="mb-6">
  <BreadcrumbItem href="/internal" home>
    {#snippet icon()}
      <HomeOutline class="w-4 h-4 me-2" />
    {/snippet}
    Clients
  </BreadcrumbItem>
  <BreadcrumbItem href="/internal/clients/{data.organization.id}">
    {data.organization.name}
  </BreadcrumbItem>
  <BreadcrumbItem>Landing Pages</BreadcrumbItem>
</Breadcrumb>

<!-- Stats Row -->
<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
  <div class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-4">
    <div class="flex items-center gap-3">
      <div class="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
        <FileDocOutline class="w-5 h-5 text-blue-600 dark:text-blue-400" />
      </div>
      <div>
        <p class="text-sm text-gray-500 dark:text-gray-400">Total Pages</p>
        <p class="text-xl font-bold text-gray-900 dark:text-white">{data.stats.totalPages}</p>
      </div>
    </div>
  </div>

  <div class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-4">
    <div class="flex items-center gap-3">
      <div class="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
        <CheckCircleOutline class="w-5 h-5 text-green-600 dark:text-green-400" />
      </div>
      <div>
        <p class="text-sm text-gray-500 dark:text-gray-400">Published</p>
        <p class="text-xl font-bold text-gray-900 dark:text-white">{data.stats.publishedPages}</p>
      </div>
    </div>
  </div>

  <div class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-4">
    <div class="flex items-center gap-3">
      <div class="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
        <EyeOutline class="w-5 h-5 text-purple-600 dark:text-purple-400" />
      </div>
      <div>
        <p class="text-sm text-gray-500 dark:text-gray-400">Total Views</p>
        <p class="text-xl font-bold text-gray-900 dark:text-white">
          {data.stats.totalViews.toLocaleString()}
        </p>
      </div>
    </div>
  </div>

  <div class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-4">
    <div class="flex items-center gap-3">
      <div class="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
        <UsersGroupOutline class="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
      </div>
      <div>
        <p class="text-sm text-gray-500 dark:text-gray-400">Submissions</p>
        <p class="text-xl font-bold text-gray-900 dark:text-white">
          {data.stats.totalSubmissions.toLocaleString()}
        </p>
      </div>
    </div>
  </div>

  <div class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-4">
    <div class="flex items-center gap-3">
      <div class="p-2 bg-teal-100 dark:bg-teal-900/30 rounded-lg">
        <ChartOutline class="w-5 h-5 text-teal-600 dark:text-teal-400" />
      </div>
      <div>
        <p class="text-sm text-gray-500 dark:text-gray-400">Avg Conv. Rate</p>
        <p class="text-xl font-bold text-gray-900 dark:text-white">{data.stats.avgConversionRate}%</p>
      </div>
    </div>
  </div>
</div>

<!-- Page Header -->
<div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
  <div>
    <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Landing Pages</h1>
    <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
      Manage landing pages for {data.organization.name}
    </p>
  </div>
  <div class="flex items-center gap-3">
    <!-- Status Filter -->
    <Select
      class="w-40"
      items={[
        { value: 'all', name: 'All Status' },
        { value: 'published', name: 'Published' },
        { value: 'draft', name: 'Draft' },
        { value: 'archived', name: 'Archived' }
      ]}
      bind:value={statusFilter}
    />

    <!-- Create Button with Template Dropdown -->
    <Button color="primary" onclick={() => (showCreateModal = true)}>
      <PlusOutline class="w-4 h-4 me-2" />
      Create Landing Page
    </Button>
  </div>
</div>

<!-- Success/Error Messages -->
{#if form?.success}
  <Alert color="green" class="mb-6">
    <CheckCircleOutline slot="icon" class="w-5 h-5" />
    {form.message}
  </Alert>
{/if}

{#if form?.message && !form?.success}
  <Alert color="red" class="mb-6">
    <ExclamationCircleOutline slot="icon" class="w-5 h-5" />
    {form.message}
  </Alert>
{/if}

<!-- Landing Pages Grid -->
{#if filteredLandingPages && filteredLandingPages.length > 0}
  <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
    {#each filteredLandingPages as landingPage (landingPage.id)}
      <LandingPageCard
        {landingPage}
        organizationId={data.organization.id}
        onCopyUrl={handleCopyUrl}
      />
    {/each}
  </div>
{:else}
  <div class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-12 text-center">
    <div class="flex justify-center mb-4">
      <div class="p-4 bg-gray-100 dark:bg-gray-700 rounded-full">
        <FileDocOutline class="w-8 h-8 text-gray-400 dark:text-gray-500" />
      </div>
    </div>
    <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-2">
      {#if statusFilter !== 'all'}
        No {statusFilter} landing pages
      {:else}
        No landing pages yet
      {/if}
    </h3>
    <p class="text-gray-500 dark:text-gray-400 mb-6">
      {#if statusFilter !== 'all'}
        Try changing the filter or create a new landing page.
      {:else}
        Create your first landing page for {data.organization.name} to get started.
      {/if}
    </p>
    {#if statusFilter === 'all'}
      <Button color="primary" onclick={() => (showCreateModal = true)}>
        <PlusOutline class="w-4 h-4 me-2" />
        Create First Landing Page
      </Button>
    {/if}
  </div>
{/if}

<!-- Create Landing Page Modal -->
<Modal bind:open={showCreateModal} size="md" title="Create Landing Page">
  <p class="text-gray-500 dark:text-gray-400 mb-4">
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
    <div class="mb-6">
      <label for="templateSelect" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
        Choose Template
      </label>
      {#if data.templates.length > 0}
        <Select
          id="templateSelect"
          name="templateId"
          items={templateOptions}
          bind:value={selectedTemplateId}
          placeholder="Select a template..."
          required
        />
        {#if selectedTemplateId}
          {@const selectedTemplate = data.templates.find(t => t.id === selectedTemplateId)}
          {#if selectedTemplate}
            <div class="mt-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <div class="flex items-center gap-2 mb-1">
                <span class="font-medium text-gray-900 dark:text-white">
                  {selectedTemplate.name}
                </span>
                <Badge color="blue">{selectedTemplate.category}</Badge>
              </div>
              {#if selectedTemplate.description}
                <p class="text-sm text-gray-500 dark:text-gray-400">
                  {selectedTemplate.description}
                </p>
              {/if}
            </div>
          {/if}
        {/if}
      {:else}
        <p class="text-sm text-gray-500 dark:text-gray-400 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
          No templates available. Please create a template first in the
          <a href="/internal/templates" class="text-primary-600 hover:underline">Templates</a> section.
        </p>
      {/if}
    </div>

    <div class="flex justify-end gap-3">
      <Button color="light" onclick={() => (showCreateModal = false)} disabled={isCreating}>
        Cancel
      </Button>
      <Button
        type="submit"
        color="primary"
        disabled={!selectedTemplateId || isCreating || data.templates.length === 0}
      >
        {isCreating ? 'Creating...' : 'Create Landing Page'}
      </Button>
    </div>
  </form>
</Modal>
