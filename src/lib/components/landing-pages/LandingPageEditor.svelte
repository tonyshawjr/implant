<script lang="ts">
  import { Tabs, TabItem, Input, Textarea, Label, Card, Badge } from 'flowbite-svelte';
  import {
    CodeOutline,
    PaletteOutline,
    CogOutline,
    InfoCircleOutline,
    FileOutline
  } from 'flowbite-svelte-icons';

  interface Props {
    customHtml: string;
    customCss: string;
    config: Record<string, unknown>;
    metaTitle: string;
    metaDescription: string;
    templateName?: string;
    onHtmlChange: (html: string) => void;
    onCssChange: (css: string) => void;
    onConfigChange: (config: Record<string, unknown>) => void;
    onMetaTitleChange: (title: string) => void;
    onMetaDescriptionChange: (desc: string) => void;
  }

  let {
    customHtml = '',
    customCss = '',
    config = {},
    metaTitle = '',
    metaDescription = '',
    templateName = '',
    onHtmlChange,
    onCssChange,
    onConfigChange,
    onMetaTitleChange,
    onMetaDescriptionChange
  }: Props = $props();

  let activeTab = $state('html');

  // Template variables reference
  const templateVariables = [
    { name: '{{organization_name}}', description: "Client's business name" },
    { name: '{{logo_url}}', description: "Client's logo URL" },
    { name: '{{phone}}', description: "Client's phone number" },
    { name: '{{email}}', description: "Client's email" },
    { name: '{{primary_color}}', description: "Client's brand color" },
    { name: '{{form}}', description: 'Auto-generated lead capture form' },
    { name: '{{cta_text}}', description: 'Call-to-action button text' }
  ];

  // Config fields that can be edited
  let configFields = $state<Array<{ key: string; value: string }>>([]);

  // Initialize config fields from config object
  $effect(() => {
    if (config && typeof config === 'object') {
      configFields = Object.entries(config).map(([key, value]) => ({
        key,
        value: typeof value === 'string' ? value : JSON.stringify(value)
      }));
    }
  });

  function handleHtmlInput(e: Event) {
    const target = e.target as HTMLTextAreaElement;
    onHtmlChange(target.value);
  }

  function handleCssInput(e: Event) {
    const target = e.target as HTMLTextAreaElement;
    onCssChange(target.value);
  }

  function handleMetaTitleInput(e: Event) {
    const target = e.target as HTMLInputElement;
    onMetaTitleChange(target.value);
  }

  function handleMetaDescriptionInput(e: Event) {
    const target = e.target as HTMLTextAreaElement;
    onMetaDescriptionChange(target.value);
  }

  function updateConfigField(index: number, value: string) {
    configFields[index].value = value;
    const newConfig: Record<string, unknown> = {};
    for (const field of configFields) {
      try {
        newConfig[field.key] = JSON.parse(field.value);
      } catch {
        newConfig[field.key] = field.value;
      }
    }
    onConfigChange(newConfig);
  }

  function addConfigField() {
    const key = `custom_field_${configFields.length + 1}`;
    configFields = [...configFields, { key, value: '' }];
    updateConfigFromFields();
  }

  function removeConfigField(index: number) {
    configFields = configFields.filter((_, i) => i !== index);
    updateConfigFromFields();
  }

  function updateConfigFromFields() {
    const newConfig: Record<string, unknown> = {};
    for (const field of configFields) {
      try {
        newConfig[field.key] = JSON.parse(field.value);
      } catch {
        newConfig[field.key] = field.value;
      }
    }
    onConfigChange(newConfig);
  }

  function updateFieldKey(index: number, newKey: string) {
    configFields[index].key = newKey;
    updateConfigFromFields();
  }
</script>

<div class="h-full flex flex-col">
  <Tabs tabStyle="underline" class="mb-4">
    <TabItem open={activeTab === 'html'} onclick={() => activeTab = 'html'}>
      {#snippet titleSlot()}
        <div class="flex items-center gap-2">
          <CodeOutline class="w-4 h-4" />
          HTML
        </div>
      {/snippet}
    </TabItem>
    <TabItem open={activeTab === 'css'} onclick={() => activeTab = 'css'}>
      {#snippet titleSlot()}
        <div class="flex items-center gap-2">
          <PaletteOutline class="w-4 h-4" />
          CSS
        </div>
      {/snippet}
    </TabItem>
    <TabItem open={activeTab === 'meta'} onclick={() => activeTab = 'meta'}>
      {#snippet titleSlot()}
        <div class="flex items-center gap-2">
          <FileOutline class="w-4 h-4" />
          Meta
        </div>
      {/snippet}
    </TabItem>
    <TabItem open={activeTab === 'config'} onclick={() => activeTab = 'config'}>
      {#snippet titleSlot()}
        <div class="flex items-center gap-2">
          <CogOutline class="w-4 h-4" />
          Config
          {#if configFields.length > 0}
            <Badge color="blue" class="ml-1">{configFields.length}</Badge>
          {/if}
        </div>
      {/snippet}
    </TabItem>
  </Tabs>

  <div class="flex-1 overflow-auto">
    {#if activeTab === 'html'}
      <div class="space-y-4">
        <!-- Template Variables Reference -->
        <Card class="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
          <div class="flex items-start gap-2">
            <InfoCircleOutline class="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
            <div>
              <h4 class="font-medium text-blue-900 dark:text-blue-100 mb-2">Template Variables</h4>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                {#each templateVariables as variable}
                  <div class="flex items-center gap-2">
                    <code class="px-1.5 py-0.5 bg-blue-100 dark:bg-blue-800 rounded text-blue-800 dark:text-blue-200 font-mono text-xs">
                      {variable.name}
                    </code>
                    <span class="text-blue-700 dark:text-blue-300">{variable.description}</span>
                  </div>
                {/each}
              </div>
            </div>
          </div>
        </Card>

        <!-- Template info -->
        {#if templateName}
          <div class="text-sm text-gray-500 dark:text-gray-400">
            Based on template: <span class="font-medium">{templateName}</span>
          </div>
        {/if}

        <!-- HTML Editor -->
        <div>
          <Label for="htmlEditor" class="mb-2">Custom HTML</Label>
          <textarea
            id="htmlEditor"
            value={customHtml}
            oninput={handleHtmlInput}
            class="w-full h-96 px-4 py-3 font-mono text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 resize-y"
            placeholder="Enter your HTML here. Use template variables to personalize content for this client..."
            spellcheck="false"
          ></textarea>
          <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Override the template HTML or leave empty to use template defaults.
          </p>
        </div>
      </div>
    {:else if activeTab === 'css'}
      <div class="space-y-4">
        <!-- CSS Tips -->
        <Card class="bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800">
          <div class="flex items-start gap-2">
            <InfoCircleOutline class="w-5 h-5 text-purple-600 dark:text-purple-400 mt-0.5 shrink-0" />
            <div>
              <h4 class="font-medium text-purple-900 dark:text-purple-100 mb-2">CSS Tips</h4>
              <ul class="text-sm text-purple-700 dark:text-purple-300 space-y-1">
                <li>Use CSS custom properties for colors: <code class="bg-purple-100 dark:bg-purple-800 px-1 rounded">var(--primary-color)</code></li>
                <li>All styles are scoped to the landing page container</li>
                <li>Include responsive breakpoints for mobile optimization</li>
              </ul>
            </div>
          </div>
        </Card>

        <!-- CSS Editor -->
        <div>
          <Label for="cssEditor" class="mb-2">Custom CSS</Label>
          <textarea
            id="cssEditor"
            value={customCss}
            oninput={handleCssInput}
            class="w-full h-96 px-4 py-3 font-mono text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 resize-y"
            placeholder="/* Add custom CSS styles here */"
            spellcheck="false"
          ></textarea>
          <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Add custom CSS to override or extend template styles.
          </p>
        </div>
      </div>
    {:else if activeTab === 'meta'}
      <div class="space-y-6">
        <!-- Meta Title -->
        <div>
          <Label for="metaTitle" class="mb-2">Meta Title</Label>
          <Input
            id="metaTitle"
            value={metaTitle}
            oninput={handleMetaTitleInput}
            placeholder="e.g., Dental Implants in [City] | [Practice Name]"
          />
          <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Page title shown in browser tabs and search results (recommended: 50-60 characters)
          </p>
        </div>

        <!-- Meta Description -->
        <div>
          <Label for="metaDescription" class="mb-2">Meta Description</Label>
          <Textarea
            id="metaDescription"
            value={metaDescription}
            oninput={handleMetaDescriptionInput}
            rows={3}
            placeholder="A brief description of this landing page for search engines..."
          />
          <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Description shown in search results (recommended: 150-160 characters)
          </p>
        </div>

        <!-- SEO Tips -->
        <Card class="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
          <div class="flex items-start gap-2">
            <InfoCircleOutline class="w-5 h-5 text-green-600 dark:text-green-400 mt-0.5 shrink-0" />
            <div>
              <h4 class="font-medium text-green-900 dark:text-green-100 mb-2">SEO Best Practices</h4>
              <ul class="text-sm text-green-700 dark:text-green-300 space-y-1">
                <li>Include the city/location name in the title</li>
                <li>Use action words in the description (e.g., "Schedule", "Get", "Discover")</li>
                <li>Mention key services or unique selling points</li>
                <li>Keep titles under 60 characters for full display</li>
              </ul>
            </div>
          </div>
        </Card>
      </div>
    {:else if activeTab === 'config'}
      <div class="space-y-4">
        <!-- Config Info -->
        <Card class="bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800">
          <div class="flex items-start gap-2">
            <InfoCircleOutline class="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5 shrink-0" />
            <div>
              <h4 class="font-medium text-yellow-900 dark:text-yellow-100 mb-1">Configuration Variables</h4>
              <p class="text-sm text-yellow-700 dark:text-yellow-300">
                Configure template-specific variables like headlines, CTA text, and other customizable content.
                These values are used to populate template placeholders.
              </p>
            </div>
          </div>
        </Card>

        <!-- Config Fields -->
        <div class="space-y-3">
          {#each configFields as field, index}
            <div class="flex items-start gap-2">
              <div class="flex-1 grid grid-cols-2 gap-2">
                <div>
                  <Input
                    size="sm"
                    value={field.key}
                    oninput={(e) => updateFieldKey(index, (e.target as HTMLInputElement).value)}
                    placeholder="Variable name"
                  />
                </div>
                <div>
                  <Input
                    size="sm"
                    value={field.value}
                    oninput={(e) => updateConfigField(index, (e.target as HTMLInputElement).value)}
                    placeholder="Value"
                  />
                </div>
              </div>
              <button
                type="button"
                onclick={() => removeConfigField(index)}
                class="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          {/each}

          <button
            type="button"
            onclick={addConfigField}
            class="flex items-center gap-2 px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
            </svg>
            Add Variable
          </button>
        </div>

        <!-- Common Variables -->
        <div class="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
          <h4 class="font-medium text-gray-900 dark:text-white mb-3">Common Variables</h4>
          <div class="grid grid-cols-2 gap-2 text-sm">
            <button
              type="button"
              onclick={() => {
                configFields = [...configFields, { key: 'headline', value: '' }];
                updateConfigFromFields();
              }}
              class="text-left px-3 py-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              + headline
            </button>
            <button
              type="button"
              onclick={() => {
                configFields = [...configFields, { key: 'subheadline', value: '' }];
                updateConfigFromFields();
              }}
              class="text-left px-3 py-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              + subheadline
            </button>
            <button
              type="button"
              onclick={() => {
                configFields = [...configFields, { key: 'cta_text', value: 'Get Started' }];
                updateConfigFromFields();
              }}
              class="text-left px-3 py-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              + cta_text
            </button>
            <button
              type="button"
              onclick={() => {
                configFields = [...configFields, { key: 'primary_color', value: '#2563eb' }];
                updateConfigFromFields();
              }}
              class="text-left px-3 py-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              + primary_color
            </button>
          </div>
        </div>
      </div>
    {/if}
  </div>
</div>
