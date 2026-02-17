<script lang="ts">
  import { Tabs, TabItem, Input, Textarea, Label, Card, Badge } from 'flowbite-svelte';
  import {
    CodeOutline,
    PaletteOutline,
    ListOutline,
    CogOutline,
    InfoCircleOutline
  } from 'flowbite-svelte-icons';
  import FormFieldBuilder from './FormFieldBuilder.svelte';

  interface FormField {
    id: string;
    name: string;
    type: 'text' | 'email' | 'phone' | 'select' | 'checkbox' | 'textarea';
    label: string;
    placeholder?: string;
    required: boolean;
    options?: string[];
  }

  interface FormSchema {
    fields: FormField[];
    submit_button_text: string;
    success_message: string;
  }

  interface Props {
    htmlTemplate: string;
    cssTemplate: string;
    formSchema: FormSchema;
    onHtmlChange: (html: string) => void;
    onCssChange: (css: string) => void;
    onFormSchemaChange: (schema: FormSchema) => void;
  }

  let {
    htmlTemplate = '',
    cssTemplate = '',
    formSchema = { fields: [], submit_button_text: 'Submit', success_message: 'Thank you!' },
    onHtmlChange,
    onCssChange,
    onFormSchemaChange
  }: Props = $props();

  let activeTab = $state('html');

  // Local state for form settings
  let submitButtonText = $state(formSchema.submit_button_text || 'Submit');
  let successMessage = $state(formSchema.success_message || 'Thank you!');
  let localFields = $state<FormField[]>(formSchema.fields || []);

  // Template variables reference
  const templateVariables = [
    { name: '{{organization_name}}', description: "Client's business name" },
    { name: '{{logo_url}}', description: "Client's logo URL" },
    { name: '{{phone}}', description: "Client's phone number" },
    { name: '{{primary_color}}', description: "Client's brand color" },
    { name: '{{form}}', description: 'Auto-generated form HTML based on form fields' },
    { name: '{{cta_text}}', description: 'Call-to-action button text' }
  ];

  function handleFieldsChange(fields: FormField[]) {
    localFields = fields;
    updateFormSchema();
  }

  function updateFormSchema() {
    onFormSchemaChange({
      fields: localFields,
      submit_button_text: submitButtonText,
      success_message: successMessage
    });
  }

  function handleHtmlInput(e: Event) {
    const target = e.target as HTMLTextAreaElement;
    onHtmlChange(target.value);
  }

  function handleCssInput(e: Event) {
    const target = e.target as HTMLTextAreaElement;
    onCssChange(target.value);
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
    <TabItem open={activeTab === 'fields'} onclick={() => activeTab = 'fields'}>
      {#snippet titleSlot()}
        <div class="flex items-center gap-2">
          <ListOutline class="w-4 h-4" />
          Form Fields
          {#if localFields.length > 0}
            <Badge color="blue" class="ml-1">{localFields.length}</Badge>
          {/if}
        </div>
      {/snippet}
    </TabItem>
    <TabItem open={activeTab === 'settings'} onclick={() => activeTab = 'settings'}>
      {#snippet titleSlot()}
        <div class="flex items-center gap-2">
          <CogOutline class="w-4 h-4" />
          Settings
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

        <!-- HTML Editor -->
        <div>
          <Label for="htmlEditor" class="mb-2">HTML Template</Label>
          <textarea
            id="htmlEditor"
            value={htmlTemplate}
            oninput={handleHtmlInput}
            class="w-full h-96 px-4 py-3 font-mono text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 resize-y"
            placeholder="Enter your HTML template here..."
            spellcheck="false"
          ></textarea>
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
            value={cssTemplate}
            oninput={handleCssInput}
            class="w-full h-96 px-4 py-3 font-mono text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 resize-y"
            placeholder="/* Add your custom CSS styles here */&#10;&#10;.landing-page {&#10;  font-family: system-ui, sans-serif;&#10;}"
            spellcheck="false"
          ></textarea>
        </div>
      </div>
    {:else if activeTab === 'fields'}
      <div class="space-y-4">
        <!-- Form Fields Info -->
        <Card class="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
          <div class="flex items-start gap-2">
            <InfoCircleOutline class="w-5 h-5 text-green-600 dark:text-green-400 mt-0.5 shrink-0" />
            <div>
              <h4 class="font-medium text-green-900 dark:text-green-100 mb-1">Form Fields</h4>
              <p class="text-sm text-green-700 dark:text-green-300">
                Define the fields that will appear in the lead capture form.
                Use <code class="bg-green-100 dark:bg-green-800 px-1 rounded">{'{{form}}'}</code> in your HTML to place the auto-generated form.
              </p>
            </div>
          </div>
        </Card>

        <!-- Form Field Builder -->
        <FormFieldBuilder
          fields={localFields}
          onFieldsChange={handleFieldsChange}
        />
      </div>
    {:else if activeTab === 'settings'}
      <div class="space-y-6">
        <!-- Submit Button Settings -->
        <div>
          <Label for="submitButtonText" class="mb-2">Submit Button Text</Label>
          <Input
            id="submitButtonText"
            bind:value={submitButtonText}
            placeholder="e.g., Get My Free Consultation"
            onblur={updateFormSchema}
          />
          <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
            The text displayed on the form submit button
          </p>
        </div>

        <!-- Success Message Settings -->
        <div>
          <Label for="successMessage" class="mb-2">Success Message</Label>
          <Textarea
            id="successMessage"
            bind:value={successMessage}
            rows={3}
            placeholder="Thank you! We'll call you within 24 hours."
            onblur={updateFormSchema}
          />
          <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Message shown after successful form submission
          </p>
        </div>

        <!-- Form Behavior Info -->
        <Card class="bg-gray-50 dark:bg-gray-700/50">
          <h4 class="font-medium text-gray-900 dark:text-white mb-3">Form Behavior</h4>
          <ul class="space-y-2 text-sm text-gray-600 dark:text-gray-400">
            <li class="flex items-start gap-2">
              <span class="text-green-500 mt-0.5">-</span>
              <span>Form submissions are automatically captured as leads</span>
            </li>
            <li class="flex items-start gap-2">
              <span class="text-green-500 mt-0.5">-</span>
              <span>UTM parameters are tracked for attribution</span>
            </li>
            <li class="flex items-start gap-2">
              <span class="text-green-500 mt-0.5">-</span>
              <span>Duplicate submissions are detected and flagged</span>
            </li>
            <li class="flex items-start gap-2">
              <span class="text-green-500 mt-0.5">-</span>
              <span>Email and SMS notifications can be configured per client</span>
            </li>
          </ul>
        </Card>
      </div>
    {/if}
  </div>
</div>
