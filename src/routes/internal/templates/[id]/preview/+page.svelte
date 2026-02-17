<script lang="ts">
  import type { PageData } from './$types';
  import { Button, Badge, Select } from 'flowbite-svelte';
  import {
    ArrowLeftOutline,
    DesktopPcOutline,
    MobilePhoneOutline,
    TabletOutline
  } from 'flowbite-svelte-icons';

  let { data }: { data: PageData } = $props();

  type DeviceSize = 'desktop' | 'tablet' | 'mobile';
  let deviceSize = $state<DeviceSize>('desktop');

  const deviceSizes = {
    desktop: { width: '100%', maxWidth: '1200px' },
    tablet: { width: '768px', maxWidth: '768px' },
    mobile: { width: '375px', maxWidth: '375px' }
  };

  // Generate form HTML from schema
  function generateFormHtml(): string {
    const { fields, submit_button_text } = data.formSchema;

    if (!fields || fields.length === 0) {
      return '<p>No form fields defined</p>';
    }

    let formHtml = '<form class="template-form" onsubmit="event.preventDefault(); alert(\'Form submitted!\');">';

    for (const field of fields) {
      formHtml += `<div class="form-field">`;
      formHtml += `<label for="${field.name}">${field.label}${field.required ? ' *' : ''}</label>`;

      switch (field.type) {
        case 'textarea':
          formHtml += `<textarea id="${field.name}" name="${field.name}" placeholder="${field.placeholder || ''}" ${field.required ? 'required' : ''}></textarea>`;
          break;
        case 'select':
          formHtml += `<select id="${field.name}" name="${field.name}" ${field.required ? 'required' : ''}>`;
          formHtml += `<option value="">Select...</option>`;
          for (const opt of field.options || []) {
            formHtml += `<option value="${opt}">${opt}</option>`;
          }
          formHtml += `</select>`;
          break;
        case 'checkbox':
          formHtml += `<input type="checkbox" id="${field.name}" name="${field.name}" ${field.required ? 'required' : ''} />`;
          break;
        default:
          formHtml += `<input type="${field.type}" id="${field.name}" name="${field.name}" placeholder="${field.placeholder || ''}" ${field.required ? 'required' : ''} />`;
      }

      formHtml += `</div>`;
    }

    formHtml += `<button type="submit" class="submit-btn">${submit_button_text || 'Submit'}</button>`;
    formHtml += '</form>';

    return formHtml;
  }

  // Replace template variables with sample data
  function processTemplate(html: string): string {
    let processed = html;

    // Replace template variables
    processed = processed.replace(/\{\{organization_name\}\}/g, data.sampleData.organization_name);
    processed = processed.replace(/\{\{logo_url\}\}/g, data.sampleData.logo_url);
    processed = processed.replace(/\{\{phone\}\}/g, data.sampleData.phone);
    processed = processed.replace(/\{\{primary_color\}\}/g, data.sampleData.primary_color);

    // Replace form placeholder with generated form
    processed = processed.replace(/\{\{form\}\}/g, generateFormHtml());

    return processed;
  }

  // Combine HTML and CSS for the preview
  function getPreviewContent(): string {
    let html = data.template.htmlTemplate;
    const css = data.template.cssTemplate || '';

    // If it's a full HTML document, inject CSS into head
    if (html.includes('<head>')) {
      html = html.replace('</head>', `<style>${css}</style></head>`);
    } else {
      // Wrap in basic HTML structure
      html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>${css}</style>
        </head>
        <body>
          ${html}
        </body>
        </html>
      `;
    }

    return processTemplate(html);
  }

  $effect(() => {
    // Update iframe when device size changes
    const iframe = document.getElementById('preview-iframe') as HTMLIFrameElement;
    if (iframe) {
      iframe.srcdoc = getPreviewContent();
    }
  });
</script>

<svelte:head>
  <title>Preview: {data.template.name} - SqueezMedia</title>
</svelte:head>

<div class="h-screen flex flex-col bg-gray-100 dark:bg-gray-900">
  <!-- Header -->
  <div class="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3">
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-4">
        <Button href="/internal/templates/{data.template.id}" color="light" size="sm">
          <ArrowLeftOutline class="w-4 h-4 me-1" />
          Back to Editor
        </Button>
        <div class="flex items-center gap-2">
          <h1 class="text-lg font-semibold text-gray-900 dark:text-white">
            {data.template.name}
          </h1>
          {#if data.template.isActive}
            <Badge color="green">Active</Badge>
          {:else}
            <Badge color="gray">Draft</Badge>
          {/if}
        </div>
      </div>

      <!-- Device Size Selector -->
      <div class="flex items-center gap-2 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
        <button
          type="button"
          class="p-2 rounded-md transition-colors {deviceSize === 'desktop' ? 'bg-white dark:bg-gray-600 shadow-sm' : 'hover:bg-gray-200 dark:hover:bg-gray-600'}"
          onclick={() => deviceSize = 'desktop'}
          title="Desktop"
        >
          <DesktopPcOutline class="w-5 h-5 text-gray-700 dark:text-gray-300" />
        </button>
        <button
          type="button"
          class="p-2 rounded-md transition-colors {deviceSize === 'tablet' ? 'bg-white dark:bg-gray-600 shadow-sm' : 'hover:bg-gray-200 dark:hover:bg-gray-600'}"
          onclick={() => deviceSize = 'tablet'}
          title="Tablet"
        >
          <TabletOutline class="w-5 h-5 text-gray-700 dark:text-gray-300" />
        </button>
        <button
          type="button"
          class="p-2 rounded-md transition-colors {deviceSize === 'mobile' ? 'bg-white dark:bg-gray-600 shadow-sm' : 'hover:bg-gray-200 dark:hover:bg-gray-600'}"
          onclick={() => deviceSize = 'mobile'}
          title="Mobile"
        >
          <MobilePhoneOutline class="w-5 h-5 text-gray-700 dark:text-gray-300" />
        </button>
      </div>
    </div>
  </div>

  <!-- Preview Area -->
  <div class="flex-1 overflow-auto p-6 flex justify-center">
    <div
      class="bg-white shadow-2xl rounded-lg overflow-hidden transition-all duration-300"
      style="width: {deviceSizes[deviceSize].width}; max-width: {deviceSizes[deviceSize].maxWidth}; height: calc(100vh - 150px);"
    >
      <iframe
        id="preview-iframe"
        title="Template Preview"
        class="w-full h-full border-0"
        srcdoc={getPreviewContent()}
        sandbox="allow-scripts allow-forms"
      ></iframe>
    </div>
  </div>

  <!-- Footer Info -->
  <div class="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 px-4 py-2 text-center text-sm text-gray-500 dark:text-gray-400">
    Preview with sample data. Actual landing pages will use client-specific information.
  </div>
</div>
