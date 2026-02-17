<script lang="ts">
  import type { PageData, ActionData } from './$types';
  import { enhance } from '$app/forms';
  import { goto } from '$app/navigation';
  import {
    Button,
    Input,
    Textarea,
    Select,
    Label,
    Alert,
    Badge,
    Toggle
  } from 'flowbite-svelte';
  import {
    ArrowLeftOutline,
    CheckCircleOutline,
    ExclamationCircleOutline,
    EyeOutline,
    CloudArrowUpOutline
  } from 'flowbite-svelte-icons';
  import TemplateEditor from '$lib/components/templates/TemplateEditor.svelte';

  let { data, form }: { data: PageData; form: ActionData } = $props();

  // Form state
  let name = $state(data.template.name);
  let slug = $state(data.template.slug);
  let description = $state(data.template.description || '');
  let category = $state(data.template.category);
  let isActive = $state(data.template.isActive);
  let htmlTemplate = $state(data.template.htmlTemplate);
  let cssTemplate = $state(data.template.cssTemplate || '');
  let formSchema = $state(data.formSchema);

  let isSaving = $state(false);
  let hasChanges = $state(false);

  const categoryOptions = [
    { value: 'implant', name: 'Dental Implant' },
    { value: 'cosmetic', name: 'Cosmetic' },
    { value: 'general', name: 'General' },
    { value: 'promo', name: 'Promotional' }
  ];

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
    if (!slug || slug === generateSlug(data.template.name)) {
      slug = generateSlug(name);
    }
    hasChanges = true;
  }

  function handleHtmlChange(html: string) {
    htmlTemplate = html;
    hasChanges = true;
  }

  function handleCssChange(css: string) {
    cssTemplate = css;
    hasChanges = true;
  }

  function handleFormSchemaChange(schema: typeof formSchema) {
    formSchema = schema;
    hasChanges = true;
  }

  function markChanged() {
    hasChanges = true;
  }
</script>

<svelte:head>
  <title>Edit Template: {data.template.name} - SqueezMedia</title>
</svelte:head>

<div class="h-full flex flex-col">
  <!-- Header -->
  <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
    <div class="flex items-center gap-4">
      <Button href="/internal/templates" color="light" size="sm">
        <ArrowLeftOutline class="w-4 h-4 me-1" />
        Back
      </Button>
      <div>
        <div class="flex items-center gap-2">
          <h1 class="text-xl font-bold text-gray-900 dark:text-white">
            {data.template.name}
          </h1>
          {#if data.template.isActive}
            <Badge color="green">Active</Badge>
          {:else}
            <Badge color="gray">Inactive</Badge>
          {/if}
          {#if hasChanges}
            <Badge color="yellow">Unsaved Changes</Badge>
          {/if}
        </div>
        <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Used {data.template.usageCount} times
          {#if data.template.conversionRateAvg !== null}
            &middot; {data.template.conversionRateAvg}% avg. conversion
          {/if}
        </p>
      </div>
    </div>
    <div class="flex items-center gap-2">
      <Button
        href="/internal/templates/{data.template.id}/preview"
        color="light"
        size="sm"
      >
        <EyeOutline class="w-4 h-4 me-1" />
        Preview
      </Button>
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
    <input type="hidden" name="htmlTemplate" value={htmlTemplate} />
    <input type="hidden" name="cssTemplate" value={cssTemplate} />
    <input type="hidden" name="formSchema" value={JSON.stringify(formSchema)} />
    <input type="hidden" name="isActive" value={isActive.toString()} />

    <!-- Left Column - Editor -->
    <div class="flex-1 min-w-0 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 overflow-hidden flex flex-col">
      <TemplateEditor
        {htmlTemplate}
        {cssTemplate}
        {formSchema}
        onHtmlChange={handleHtmlChange}
        onCssChange={handleCssChange}
        onFormSchemaChange={handleFormSchemaChange}
      />
    </div>

    <!-- Right Column - Settings & Actions -->
    <div class="w-full lg:w-80 space-y-6 flex-shrink-0">
      <!-- Template Settings Card -->
      <div class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
        <h2 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Template Settings
        </h2>

        <div class="space-y-4">
          <div>
            <Label for="templateName" class="mb-2">Name *</Label>
            <Input
              id="templateName"
              name="name"
              value={name}
              oninput={handleNameChange}
              placeholder="Template name"
              required
            />
          </div>

          <div>
            <Label for="templateSlug" class="mb-2">Slug *</Label>
            <Input
              id="templateSlug"
              name="slug"
              bind:value={slug}
              oninput={markChanged}
              placeholder="template-slug"
              required
            />
            <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Used in URLs. Lowercase letters, numbers, and hyphens only.
            </p>
          </div>

          <div>
            <Label for="templateCategory" class="mb-2">Category *</Label>
            <Select
              id="templateCategory"
              name="category"
              items={categoryOptions}
              bind:value={category}
              onchange={markChanged}
            />
          </div>

          <div>
            <Label for="templateDescription" class="mb-2">Description</Label>
            <Textarea
              id="templateDescription"
              name="description"
              bind:value={description}
              oninput={markChanged}
              rows={3}
              placeholder="Brief description of this template..."
            />
          </div>

          <div class="flex items-center justify-between pt-2">
            <Label for="templateActive">Active Status</Label>
            <Toggle
              id="templateActive"
              bind:checked={isActive}
              onchange={markChanged}
            />
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

          {#if !data.template.isActive}
            <form method="POST" action="?/publish" use:enhance>
              <Button type="submit" color="green" class="w-full">
                Publish Template
              </Button>
            </form>
          {:else}
            <form method="POST" action="?/unpublish" use:enhance>
              <Button type="submit" color="light" class="w-full">
                Unpublish Template
              </Button>
            </form>
          {/if}
        </div>
      </div>

      <!-- Info Card -->
      <div class="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 text-sm text-gray-600 dark:text-gray-400">
        <h3 class="font-medium text-gray-900 dark:text-white mb-2">Template Info</h3>
        <ul class="space-y-1">
          <li>Created: {new Date(data.template.createdAt).toLocaleDateString()}</li>
          <li>Updated: {new Date(data.template.updatedAt).toLocaleDateString()}</li>
          {#if data.template.createdBy}
            <li>By: {data.template.createdBy.firstName} {data.template.createdBy.lastName}</li>
          {/if}
          <li>Landing pages: {data.template.landingPageCount}</li>
        </ul>
      </div>
    </div>
  </form>
</div>
