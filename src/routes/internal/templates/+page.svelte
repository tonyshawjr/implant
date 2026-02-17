<script lang="ts">
  import type { PageData, ActionData } from './$types';
  import { enhance } from '$app/forms';
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import { Badge, Button, Input, Select, Alert, Modal } from 'flowbite-svelte';
  import {
    PlusOutline,
    SearchOutline,
    GridOutline,
    ChartOutline,
    CheckCircleOutline,
    ExclamationCircleOutline
  } from 'flowbite-svelte-icons';
  import TemplateCard from '$lib/components/templates/TemplateCard.svelte';

  let { data, form }: { data: PageData; form: ActionData } = $props();

  let searchValue = $state(data.filters.search);
  let categoryValue = $state(data.filters.category);
  let cloneModalOpen = $state(false);
  let templateToClone = $state<string | null>(null);

  const categoryOptions = [
    { value: '', name: 'All Categories' },
    { value: 'implant', name: 'Dental Implant' },
    { value: 'cosmetic', name: 'Cosmetic' },
    { value: 'general', name: 'General' },
    { value: 'promo', name: 'Promotional' }
  ];

  function handleSearch() {
    const params = new URLSearchParams();
    if (searchValue) params.set('search', searchValue);
    if (categoryValue) params.set('category', categoryValue);
    goto(`/internal/templates?${params.toString()}`);
  }

  function handleCategoryChange(event: Event) {
    const target = event.target as HTMLSelectElement;
    categoryValue = target.value;
    handleSearch();
  }

  function handleClone(templateId: string) {
    templateToClone = templateId;
    cloneModalOpen = true;
  }
</script>

<svelte:head>
  <title>Landing Page Templates - SqueezMedia</title>
</svelte:head>

<!-- Stats Row -->
<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
  <div class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-5">
    <div class="flex items-center gap-3">
      <div class="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
        <GridOutline class="w-5 h-5 text-blue-600 dark:text-blue-400" />
      </div>
      <div>
        <p class="text-sm text-gray-500 dark:text-gray-400">Total Templates</p>
        <p class="text-2xl font-bold text-gray-900 dark:text-white">{data.stats.totalTemplates}</p>
      </div>
    </div>
  </div>

  <div class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-5">
    <div class="flex items-center gap-3">
      <div class="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
        <CheckCircleOutline class="w-5 h-5 text-green-600 dark:text-green-400" />
      </div>
      <div>
        <p class="text-sm text-gray-500 dark:text-gray-400">Active Templates</p>
        <p class="text-2xl font-bold text-gray-900 dark:text-white">{data.stats.activeTemplates}</p>
      </div>
    </div>
  </div>

  <div class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-5">
    <div class="flex items-center gap-3">
      <div class="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
        <ChartOutline class="w-5 h-5 text-purple-600 dark:text-purple-400" />
      </div>
      <div>
        <p class="text-sm text-gray-500 dark:text-gray-400">Total Usage</p>
        <p class="text-2xl font-bold text-gray-900 dark:text-white">{data.stats.totalUsage}</p>
      </div>
    </div>
  </div>

  <div class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-5">
    <div class="flex items-center gap-3">
      <div class="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
        <ChartOutline class="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
      </div>
      <div>
        <p class="text-sm text-gray-500 dark:text-gray-400">Avg Conversion Rate</p>
        <p class="text-2xl font-bold text-gray-900 dark:text-white">{data.stats.avgConversionRate}%</p>
      </div>
    </div>
  </div>
</div>

<!-- Page Header -->
<div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
  <div>
    <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Landing Page Templates</h1>
    <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
      Create and manage reusable landing page templates for clients
    </p>
  </div>
  <Button href="/internal/templates/create" color="primary">
    <PlusOutline class="w-4 h-4 me-2" />
    New Template
  </Button>
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

<!-- Filters -->
<div class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-4 mb-6">
  <div class="flex flex-col sm:flex-row gap-4">
    <div class="flex-1">
      <form onsubmit={(e) => { e.preventDefault(); handleSearch(); }}>
        <Input
          bind:value={searchValue}
          placeholder="Search templates..."
          class="w-full"
        >
          <SearchOutline slot="left" class="w-5 h-5 text-gray-400" />
        </Input>
      </form>
    </div>
    <div class="w-full sm:w-48">
      <Select
        items={categoryOptions}
        bind:value={categoryValue}
        onchange={handleCategoryChange}
        placeholder="All Categories"
      />
    </div>
  </div>
</div>

<!-- Templates Grid -->
{#if data.templates && data.templates.length > 0}
  <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
    {#each data.templates as template (template.id)}
      <TemplateCard {template} onClone={handleClone} />
    {/each}
  </div>
{:else}
  <div class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-12 text-center">
    <div class="flex justify-center mb-4">
      <div class="p-4 bg-gray-100 dark:bg-gray-700 rounded-full">
        <GridOutline class="w-8 h-8 text-gray-400 dark:text-gray-500" />
      </div>
    </div>
    <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-2">
      {#if data.filters.search || data.filters.category}
        No templates found
      {:else}
        No templates yet
      {/if}
    </h3>
    <p class="text-gray-500 dark:text-gray-400 mb-6">
      {#if data.filters.search || data.filters.category}
        Try adjusting your search or filter criteria.
      {:else}
        Create your first landing page template to get started.
      {/if}
    </p>
    {#if !data.filters.search && !data.filters.category}
      <Button href="/internal/templates/create" color="primary">
        <PlusOutline class="w-4 h-4 me-2" />
        Create First Template
      </Button>
    {/if}
  </div>
{/if}

<!-- Clone Confirmation Modal -->
<Modal bind:open={cloneModalOpen} size="sm" title="Clone Template">
  <p class="text-gray-500 dark:text-gray-400">
    Are you sure you want to clone this template? A copy will be created with "(Copy)" appended to the name.
  </p>
  <svelte:fragment slot="footer">
    <form method="POST" action="?/clone" use:enhance={() => {
      return async ({ result, update }) => {
        await update();
        cloneModalOpen = false;
        if (result.type === 'success' && result.data?.templateId) {
          goto(`/internal/templates/${result.data.templateId}`);
        }
      };
    }}>
      <input type="hidden" name="templateId" value={templateToClone} />
      <div class="flex gap-3">
        <Button color="light" onclick={() => cloneModalOpen = false}>Cancel</Button>
        <Button type="submit" color="primary">Clone Template</Button>
      </div>
    </form>
  </svelte:fragment>
</Modal>
