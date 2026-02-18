<script lang="ts">
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

<div class="editor-container">
  <!-- Tabs -->
  <div class="tabs" style="margin-bottom: 1rem; border-bottom: 1px solid var(--gray-200);">
    <button
      type="button"
      class="tab"
      class:active={activeTab === 'html'}
      onclick={() => activeTab = 'html'}
    >
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>
      HTML
    </button>
    <button
      type="button"
      class="tab"
      class:active={activeTab === 'css'}
      onclick={() => activeTab = 'css'}
    >
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" /></svg>
      CSS
    </button>
    <button
      type="button"
      class="tab"
      class:active={activeTab === 'meta'}
      onclick={() => activeTab = 'meta'}
    >
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
      Meta
    </button>
    <button
      type="button"
      class="tab"
      class:active={activeTab === 'config'}
      onclick={() => activeTab = 'config'}
    >
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
      Config
      {#if configFields.length > 0}
        <span class="badge badge-primary" style="margin-left: 4px; font-size: 0.7rem;">{configFields.length}</span>
      {/if}
    </button>
  </div>

  <!-- Tab Content -->
  <div class="tab-content">
    {#if activeTab === 'html'}
      <div class="space-y-4">
        <!-- Template Variables Reference -->
        <div class="info-box info-box-blue">
          <div style="display: flex; align-items: flex-start; gap: 0.5rem;">
            <svg class="w-5 h-5" style="color: var(--primary-600); flex-shrink: 0; margin-top: 2px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            <div>
              <h4 style="font-weight: 600; margin-bottom: 0.5rem;">Template Variables</h4>
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem; font-size: 0.875rem;">
                {#each templateVariables as variable}
                  <div style="display: flex; align-items: center; gap: 0.5rem;">
                    <code class="code-tag">{variable.name}</code>
                    <span style="color: var(--gray-600);">{variable.description}</span>
                  </div>
                {/each}
              </div>
            </div>
          </div>
        </div>

        {#if templateName}
          <p style="font-size: 0.875rem; color: var(--gray-500);">
            Based on template: <span style="font-weight: 500;">{templateName}</span>
          </p>
        {/if}

        <!-- HTML Editor -->
        <div>
          <label class="form-label" for="htmlEditor">Custom HTML</label>
          <textarea
            id="htmlEditor"
            value={customHtml}
            oninput={handleHtmlInput}
            class="form-input code-editor"
            placeholder="Enter your HTML here. Use template variables to personalize content for this client..."
            spellcheck="false"
            rows="16"
          ></textarea>
          <span class="form-hint">Override the template HTML or leave empty to use template defaults.</span>
        </div>
      </div>
    {:else if activeTab === 'css'}
      <div class="space-y-4">
        <!-- CSS Tips -->
        <div class="info-box info-box-purple">
          <div style="display: flex; align-items: flex-start; gap: 0.5rem;">
            <svg class="w-5 h-5" style="color: #7c3aed; flex-shrink: 0; margin-top: 2px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            <div>
              <h4 style="font-weight: 600; margin-bottom: 0.5rem;">CSS Tips</h4>
              <ul style="font-size: 0.875rem; color: var(--gray-600); list-style: disc; padding-left: 1rem;">
                <li>Use CSS custom properties for colors: <code class="code-tag">var(--primary-color)</code></li>
                <li>All styles are scoped to the landing page container</li>
                <li>Include responsive breakpoints for mobile optimization</li>
              </ul>
            </div>
          </div>
        </div>

        <!-- CSS Editor -->
        <div>
          <label class="form-label" for="cssEditor">Custom CSS</label>
          <textarea
            id="cssEditor"
            value={customCss}
            oninput={handleCssInput}
            class="form-input code-editor"
            placeholder="/* Add custom CSS styles here */"
            spellcheck="false"
            rows="16"
          ></textarea>
          <span class="form-hint">Add custom CSS to override or extend template styles.</span>
        </div>
      </div>
    {:else if activeTab === 'meta'}
      <div class="space-y-6">
        <div>
          <label class="form-label" for="metaTitle">Meta Title</label>
          <input
            type="text"
            id="metaTitle"
            value={metaTitle}
            oninput={handleMetaTitleInput}
            class="form-input"
            placeholder="e.g., Dental Implants in [City] | [Practice Name]"
          />
          <span class="form-hint">Page title shown in browser tabs and search results (recommended: 50-60 characters)</span>
        </div>

        <div>
          <label class="form-label" for="metaDescription">Meta Description</label>
          <textarea
            id="metaDescription"
            value={metaDescription}
            oninput={handleMetaDescriptionInput}
            class="form-input"
            rows="3"
            placeholder="A brief description of this landing page for search engines..."
          ></textarea>
          <span class="form-hint">Description shown in search results (recommended: 150-160 characters)</span>
        </div>

        <!-- SEO Tips -->
        <div class="info-box info-box-green">
          <div style="display: flex; align-items: flex-start; gap: 0.5rem;">
            <svg class="w-5 h-5" style="color: var(--success-600); flex-shrink: 0; margin-top: 2px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            <div>
              <h4 style="font-weight: 600; margin-bottom: 0.5rem;">SEO Best Practices</h4>
              <ul style="font-size: 0.875rem; color: var(--gray-600); list-style: disc; padding-left: 1rem;">
                <li>Include the city/location name in the title</li>
                <li>Use action words in the description (e.g., "Schedule", "Get", "Discover")</li>
                <li>Mention key services or unique selling points</li>
                <li>Keep titles under 60 characters for full display</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    {:else if activeTab === 'config'}
      <div class="space-y-4">
        <!-- Config Info -->
        <div class="info-box info-box-yellow">
          <div style="display: flex; align-items: flex-start; gap: 0.5rem;">
            <svg class="w-5 h-5" style="color: #d97706; flex-shrink: 0; margin-top: 2px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            <div>
              <h4 style="font-weight: 600; margin-bottom: 0.25rem;">Configuration Variables</h4>
              <p style="font-size: 0.875rem; color: var(--gray-600);">
                Configure template-specific variables like headlines, CTA text, and other customizable content.
              </p>
            </div>
          </div>
        </div>

        <!-- Config Fields -->
        <div class="space-y-3">
          {#each configFields as field, index}
            <div style="display: flex; align-items: flex-start; gap: 0.5rem;">
              <div style="flex: 1; display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem;">
                <input
                  type="text"
                  class="form-input"
                  value={field.key}
                  oninput={(e) => updateFieldKey(index, (e.target as HTMLInputElement).value)}
                  placeholder="Variable name"
                />
                <input
                  type="text"
                  class="form-input"
                  value={field.value}
                  oninput={(e) => updateConfigField(index, (e.target as HTMLInputElement).value)}
                  placeholder="Value"
                />
              </div>
              <button
                type="button"
                onclick={() => removeConfigField(index)}
                class="btn-icon-danger"
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
            class="btn btn-outline"
            style="font-size: 0.875rem;"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
            </svg>
            Add Variable
          </button>
        </div>

        <!-- Common Variables -->
        <div style="margin-top: 1.5rem; padding-top: 1.5rem; border-top: 1px solid var(--gray-200);">
          <h4 style="font-weight: 500; margin-bottom: 0.75rem;">Common Variables</h4>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem; font-size: 0.875rem;">
            <button
              type="button"
              onclick={() => {
                configFields = [...configFields, { key: 'headline', value: '' }];
                updateConfigFromFields();
              }}
              class="quick-add-btn"
            >
              + headline
            </button>
            <button
              type="button"
              onclick={() => {
                configFields = [...configFields, { key: 'subheadline', value: '' }];
                updateConfigFromFields();
              }}
              class="quick-add-btn"
            >
              + subheadline
            </button>
            <button
              type="button"
              onclick={() => {
                configFields = [...configFields, { key: 'cta_text', value: 'Get Started' }];
                updateConfigFromFields();
              }}
              class="quick-add-btn"
            >
              + cta_text
            </button>
            <button
              type="button"
              onclick={() => {
                configFields = [...configFields, { key: 'primary_color', value: '#2563eb' }];
                updateConfigFromFields();
              }}
              class="quick-add-btn"
            >
              + primary_color
            </button>
          </div>
        </div>
      </div>
    {/if}
  </div>
</div>

<style>
  .editor-container {
    display: flex;
    flex-direction: column;
    height: 100%;
  }

  .tab-content {
    flex: 1;
    overflow-y: auto;
  }

  .space-y-3 > :not(:first-child) { margin-top: 0.75rem; }
  .space-y-4 > :not(:first-child) { margin-top: 1rem; }
  .space-y-6 > :not(:first-child) { margin-top: 1.5rem; }

  .code-editor {
    font-family: 'Fira Code', 'Cascadia Code', 'Consolas', monospace;
    font-size: 0.8125rem;
    line-height: 1.6;
    resize: vertical;
    min-height: 300px;
  }

  .code-tag {
    padding: 0.125rem 0.375rem;
    background: var(--gray-100);
    border-radius: 4px;
    font-family: monospace;
    font-size: 0.75rem;
  }

  .info-box {
    padding: 1rem;
    border-radius: 0.75rem;
    border: 1px solid;
  }

  .info-box-blue {
    background: #eff6ff;
    border-color: #bfdbfe;
  }

  .info-box-purple {
    background: #f5f3ff;
    border-color: #ddd6fe;
  }

  .info-box-green {
    background: #f0fdf4;
    border-color: #bbf7d0;
  }

  .info-box-yellow {
    background: #fffbeb;
    border-color: #fde68a;
  }

  .btn-icon-danger {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0.5rem;
    color: var(--danger-600);
    background: transparent;
    border: none;
    border-radius: 0.5rem;
    cursor: pointer;
  }

  .btn-icon-danger:hover {
    background: #fef2f2;
  }

  .quick-add-btn {
    text-align: left;
    padding: 0.5rem 0.75rem;
    background: var(--gray-50);
    border: 1px solid var(--gray-200);
    border-radius: 0.5rem;
    cursor: pointer;
    font-size: 0.875rem;
    color: var(--gray-700);
  }

  .quick-add-btn:hover {
    background: var(--gray-100);
  }
</style>
