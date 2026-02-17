<script lang="ts">
  import type { PageData, ActionData } from './$types';
  import { enhance } from '$app/forms';
  import {
    Button,
    Input,
    Textarea,
    Select,
    Label,
    Alert
  } from 'flowbite-svelte';
  import {
    ArrowLeftOutline,
    ExclamationCircleOutline,
    PlusOutline
  } from 'flowbite-svelte-icons';
  import TemplateEditor from '$lib/components/templates/TemplateEditor.svelte';

  let { data, form }: { data: PageData; form: ActionData } = $props();

  // Form state
  let name = $state('');
  let slug = $state('');
  let description = $state('');
  let category = $state('implant');
  let htmlTemplate = $state(data.defaultHtml);
  let cssTemplate = $state(data.defaultCss);
  let formSchema = $state(data.formSchema);

  let isCreating = $state(false);

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
    // Auto-generate slug
    slug = generateSlug(name);
  }

  function handleHtmlChange(html: string) {
    htmlTemplate = html;
  }

  function handleCssChange(css: string) {
    cssTemplate = css;
  }

  function handleFormSchemaChange(schema: typeof formSchema) {
    formSchema = schema;
  }
</script>

<svelte:head>
  <title>Create New Template - SqueezMedia</title>
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
        <h1 class="text-xl font-bold text-gray-900 dark:text-white">
          Create New Template
        </h1>
        <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Build a reusable landing page template for clients
        </p>
      </div>
    </div>
  </div>

  <!-- Error Messages -->
  {#if form?.message && !form?.success}
    <Alert color="red" class="mb-4">
      <ExclamationCircleOutline slot="icon" class="w-5 h-5" />
      {form.message}
    </Alert>
  {/if}

  <!-- Main Content - Two Column Layout -->
  <form
    method="POST"
    action="?/create"
    class="flex-1 flex flex-col lg:flex-row gap-6 min-h-0"
    use:enhance={() => {
      isCreating = true;
      return async ({ update }) => {
        await update();
        isCreating = false;
      };
    }}
  >
    <!-- Hidden inputs for form data -->
    <input type="hidden" name="htmlTemplate" value={htmlTemplate} />
    <input type="hidden" name="cssTemplate" value={cssTemplate} />
    <input type="hidden" name="formSchema" value={JSON.stringify(formSchema)} />

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
              placeholder="e.g., Implant Hero Landing"
              required
            />
          </div>

          <div>
            <Label for="templateSlug" class="mb-2">Slug *</Label>
            <Input
              id="templateSlug"
              name="slug"
              bind:value={slug}
              placeholder="implant-hero-landing"
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
            />
          </div>

          <div>
            <Label for="templateDescription" class="mb-2">Description</Label>
            <Textarea
              id="templateDescription"
              name="description"
              bind:value={description}
              rows={3}
              placeholder="Brief description of this template..."
            />
          </div>
        </div>
      </div>

      <!-- Create Button -->
      <div class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
        <Button
          type="submit"
          color="primary"
          class="w-full"
          disabled={isCreating || !name || !slug}
        >
          <PlusOutline class="w-4 h-4 me-2" />
          {isCreating ? 'Creating...' : 'Create Template'}
        </Button>
        <p class="mt-3 text-xs text-gray-500 dark:text-gray-400 text-center">
          Template will be created as a draft. You can publish it later.
        </p>
      </div>

      <!-- Tips Card -->
      <div class="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 border border-blue-200 dark:border-blue-800">
        <h3 class="font-medium text-blue-900 dark:text-blue-100 mb-2">Tips</h3>
        <ul class="space-y-1 text-sm text-blue-700 dark:text-blue-300">
          <li>- Use template variables like <code class="bg-blue-100 dark:bg-blue-800 px-1 rounded">{'{{organization_name}}'}</code></li>
          <li>- Add <code class="bg-blue-100 dark:bg-blue-800 px-1 rounded">{'{{form}}'}</code> where you want the lead form</li>
          <li>- Test on mobile before publishing</li>
          <li>- Keep forms short for higher conversion</li>
        </ul>
      </div>
    </div>
  </form>
</div>
