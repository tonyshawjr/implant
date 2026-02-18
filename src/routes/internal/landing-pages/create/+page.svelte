<script lang="ts">
  import type { PageData, ActionData } from './$types';
  import { enhance } from '$app/forms';
  import {
    Button,
    Input,
    Select,
    Label,
    Alert,
    Badge,
    Card
  } from 'flowbite-svelte';
  import {
    ArrowLeftOutline,
    ExclamationCircleOutline,
    PlusOutline,
    EyeOutline,
    CheckCircleSolid,
    ChartOutline
  } from 'flowbite-svelte-icons';

  let { data, form }: { data: PageData; form: ActionData } = $props();

  // Form state
  let organizationId = $state('');
  let templateSlug = $state('');
  let name = $state('');
  let slug = $state('');
  let isCreating = $state(false);

  // Organization options for dropdown
  let organizationOptions = $derived([
    { value: '', name: 'Select a client...' },
    ...data.organizations.map(org => ({
      value: org.id,
      name: org.name
    }))
  ]);

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
    // Auto-generate slug from name
    slug = generateSlug(name);
  }

  function handleTemplateSelect(templateSlugValue: string) {
    templateSlug = templateSlugValue;
    // Auto-generate name based on org and template
    if (selectedOrganization && templateSlugValue) {
      const template = data.templates.find(t => t.slug === templateSlugValue);
      if (template) {
        name = `${selectedOrganization.name} - ${template.name}`;
        slug = generateSlug(name);
      }
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
</script>

<svelte:head>
  <title>Create Landing Page - SqueezMedia</title>
</svelte:head>

<div class="max-w-6xl mx-auto">
  <!-- Header -->
  <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
    <div class="flex items-center gap-4">
      <Button href="/internal/landing-pages" color="light" size="sm">
        <ArrowLeftOutline class="w-4 h-4 me-1" />
        Back
      </Button>
      <div>
        <h1 class="text-xl font-bold text-gray-900 dark:text-white">
          Create Landing Page
        </h1>
        <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Create a new landing page for a client using a funnel template
        </p>
      </div>
    </div>
  </div>

  <!-- Error Messages -->
  {#if form?.message && !form?.success}
    <Alert color="red" class="mb-6">
      <ExclamationCircleOutline slot="icon" class="w-5 h-5" />
      {form.message}
    </Alert>
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
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <!-- Main Content - Left Side -->
      <div class="lg:col-span-2 space-y-6">
        <!-- Step 1: Select Organization -->
        <div class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
          <div class="flex items-center gap-3 mb-4">
            <div class="flex items-center justify-center w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 font-semibold text-sm">
              1
            </div>
            <h2 class="text-lg font-semibold text-gray-900 dark:text-white">
              Select Client
            </h2>
          </div>

          <div class="space-y-4">
            <div>
              <Label for="organization" class="mb-2">Client Organization *</Label>
              <Select
                id="organization"
                name="organizationId"
                items={organizationOptions}
                bind:value={organizationId}
                required
              />
            </div>

            {#if selectedOrganization}
              <div class="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <div class="flex items-center gap-3">
                  {#if selectedOrganization.logoUrl}
                    <img
                      src={selectedOrganization.logoUrl}
                      alt={selectedOrganization.name}
                      class="w-10 h-10 rounded-lg object-cover"
                    />
                  {:else}
                    <div class="w-10 h-10 rounded-lg bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                      <span class="text-primary-600 dark:text-primary-400 font-semibold">
                        {selectedOrganization.name.charAt(0)}
                      </span>
                    </div>
                  {/if}
                  <div>
                    <p class="font-medium text-gray-900 dark:text-white">
                      {selectedOrganization.name}
                    </p>
                    {#if selectedOrganization.city && selectedOrganization.state}
                      <p class="text-sm text-gray-500 dark:text-gray-400">
                        {selectedOrganization.city}, {selectedOrganization.state}
                      </p>
                    {/if}
                  </div>
                </div>
              </div>
            {/if}
          </div>
        </div>

        <!-- Step 2: Select Template -->
        <div class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
          <div class="flex items-center gap-3 mb-4">
            <div class="flex items-center justify-center w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 font-semibold text-sm">
              2
            </div>
            <h2 class="text-lg font-semibold text-gray-900 dark:text-white">
              Select Template
            </h2>
          </div>

          <input type="hidden" name="templateSlug" value={templateSlug} />

          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {#each data.templates as template (template.slug)}
              <button
                type="button"
                class="text-left p-4 rounded-xl border-2 transition-all {templateSlug === template.slug
                  ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'}"
                onclick={() => handleTemplateSelect(template.slug)}
              >
                <!-- Template Preview -->
                <div
                  class="h-24 rounded-lg mb-3 flex items-center justify-center"
                  style="background: linear-gradient(135deg, {template.primaryColor}20, {template.primaryColor}40)"
                >
                  <div
                    class="w-12 h-12 rounded-full flex items-center justify-center"
                    style="background-color: {template.primaryColor}"
                  >
                    <span class="text-white text-xl font-bold">
                      {template.stepCount}
                    </span>
                  </div>
                </div>

                <!-- Template Info -->
                <div class="space-y-2">
                  <div class="flex items-start justify-between gap-2">
                    <h3 class="font-semibold text-gray-900 dark:text-white text-sm">
                      {template.name}
                    </h3>
                    {#if templateSlug === template.slug}
                      <CheckCircleSolid class="w-5 h-5 text-primary-500 shrink-0" />
                    {/if}
                  </div>

                  <Badge color={getCategoryColor(template.category)} class="text-xs">
                    {getCategoryLabel(template.category)}
                  </Badge>

                  <p class="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
                    {template.description}
                  </p>

                  <div class="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                    <ChartOutline class="w-3.5 h-3.5" />
                    <span>{template.estimatedConversionRate}% est. conv. rate</span>
                  </div>
                </div>
              </button>
            {/each}
          </div>
        </div>

        <!-- Step 3: Page Details -->
        <div class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
          <div class="flex items-center gap-3 mb-4">
            <div class="flex items-center justify-center w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 font-semibold text-sm">
              3
            </div>
            <h2 class="text-lg font-semibold text-gray-900 dark:text-white">
              Page Details
            </h2>
          </div>

          <div class="space-y-4">
            <div>
              <Label for="pageName" class="mb-2">Landing Page Name *</Label>
              <Input
                id="pageName"
                name="name"
                value={name}
                oninput={handleNameChange}
                placeholder="e.g., Acme Dental - Implant Quiz"
                required
              />
              <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Internal name for this landing page
              </p>
            </div>

            <div>
              <Label for="pageSlug" class="mb-2">URL Slug</Label>
              <Input
                id="pageSlug"
                name="slug"
                bind:value={slug}
                placeholder="acme-dental-implant-quiz"
              />
              <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Used in the landing page URL. Auto-generated from name if left empty.
              </p>
            </div>
          </div>
        </div>
      </div>

      <!-- Sidebar - Right Side -->
      <div class="space-y-6">
        <!-- Selected Template Preview -->
        {#if selectedTemplate}
          <div class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
            <h3 class="font-semibold text-gray-900 dark:text-white mb-4">
              Selected Template
            </h3>

            <div
              class="h-32 rounded-lg mb-4 flex items-center justify-center"
              style="background: linear-gradient(135deg, {selectedTemplate.primaryColor}20, {selectedTemplate.primaryColor}40)"
            >
              <div
                class="w-16 h-16 rounded-full flex items-center justify-center"
                style="background-color: {selectedTemplate.primaryColor}"
              >
                <span class="text-white text-2xl font-bold">
                  {selectedTemplate.stepCount}
                </span>
              </div>
            </div>

            <h4 class="font-semibold text-gray-900 dark:text-white mb-2">
              {selectedTemplate.name}
            </h4>

            <p class="text-sm text-gray-500 dark:text-gray-400 mb-3">
              {selectedTemplate.description}
            </p>

            <div class="flex items-center gap-2 mb-3">
              <Badge color={getCategoryColor(selectedTemplate.category)}>
                {getCategoryLabel(selectedTemplate.category)}
              </Badge>
              <Badge color="green">
                {selectedTemplate.estimatedConversionRate}% Conv. Rate
              </Badge>
            </div>

            <div class="text-sm text-gray-600 dark:text-gray-400">
              <strong>{selectedTemplate.stepCount}</strong> interactive steps
            </div>
          </div>
        {/if}

        <!-- Create Button -->
        <div class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
          <Button
            type="submit"
            color="primary"
            class="w-full"
            disabled={isCreating || !organizationId || !templateSlug || !name}
          >
            <PlusOutline class="w-4 h-4 me-2" />
            {isCreating ? 'Creating...' : 'Create Landing Page'}
          </Button>
          <p class="mt-3 text-xs text-gray-500 dark:text-gray-400 text-center">
            Page will be created as a draft. You can edit and publish it after creation.
          </p>
        </div>

        <!-- Help Card -->
        <div class="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 border border-blue-200 dark:border-blue-800">
          <h3 class="font-medium text-blue-900 dark:text-blue-100 mb-2">
            About Funnel Templates
          </h3>
          <ul class="space-y-1 text-sm text-blue-700 dark:text-blue-300">
            <li>- Interactive quiz-style lead funnels</li>
            <li>- Mobile-optimized for high conversion</li>
            <li>- Auto-populated with client info</li>
            <li>- Customizable after creation</li>
            <li>- Integrated lead capture forms</li>
          </ul>
        </div>
      </div>
    </div>
  </form>
</div>
