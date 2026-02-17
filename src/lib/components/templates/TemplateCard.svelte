<script lang="ts">
  import { Badge, Button, Card, Tooltip } from 'flowbite-svelte';
  import {
    EyeOutline,
    EditOutline,
    FileCopyOutline,
    ChartOutline
  } from 'flowbite-svelte-icons';

  interface Template {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    category: 'implant' | 'cosmetic' | 'general' | 'promo';
    thumbnailUrl: string | null;
    isActive: boolean;
    usageCount: number;
    conversionRateAvg: number | null;
    createdAt: string;
    updatedAt: string;
    createdBy: {
      id: string;
      firstName: string;
      lastName: string;
    } | null;
    landingPageCount: number;
  }

  interface Props {
    template: Template;
    onClone?: (templateId: string) => void;
  }

  let { template, onClone }: Props = $props();

  function getCategoryColor(category: string): 'blue' | 'green' | 'yellow' | 'purple' {
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

  function truncateDescription(text: string | null, maxLength: number = 100): string {
    if (!text) return 'No description available';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength).trim() + '...';
  }

  function handleClone() {
    if (onClone) {
      onClone(template.id);
    }
  }
</script>

<Card class="relative overflow-hidden">
  <!-- Thumbnail or placeholder -->
  <div class="relative h-40 bg-gray-100 dark:bg-gray-700 -mx-6 -mt-6 mb-4">
    {#if template.thumbnailUrl}
      <img
        src={template.thumbnailUrl}
        alt={template.name}
        class="w-full h-full object-cover"
      />
    {:else}
      <div class="w-full h-full flex items-center justify-center">
        <svg class="w-16 h-16 text-gray-300 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
        </svg>
      </div>
    {/if}

    <!-- Status indicator -->
    {#if !template.isActive}
      <div class="absolute top-2 right-2">
        <Badge color="gray">Inactive</Badge>
      </div>
    {/if}
  </div>

  <!-- Content -->
  <div class="space-y-3">
    <!-- Header with name and category -->
    <div class="flex items-start justify-between gap-2">
      <h3 class="text-lg font-semibold text-gray-900 dark:text-white line-clamp-1">
        {template.name}
      </h3>
      <Badge color={getCategoryColor(template.category)} class="shrink-0">
        {getCategoryLabel(template.category)}
      </Badge>
    </div>

    <!-- Description -->
    <p class="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
      {truncateDescription(template.description)}
    </p>

    <!-- Stats row -->
    <div class="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
      <div class="flex items-center gap-1">
        <ChartOutline class="w-4 h-4" />
        <span>{template.usageCount} uses</span>
      </div>
      {#if template.conversionRateAvg !== null}
        <div class="flex items-center gap-1">
          <span class="font-medium text-green-600 dark:text-green-400">
            {template.conversionRateAvg}%
          </span>
          <span>conv.</span>
        </div>
      {/if}
    </div>

    <!-- Actions -->
    <div class="flex items-center gap-2 pt-2 border-t border-gray-100 dark:border-gray-700">
      <Button
        href="/internal/templates/{template.id}"
        size="sm"
        color="primary"
        class="flex-1"
      >
        <EditOutline class="w-4 h-4 me-1" />
        Edit
      </Button>

      <Button
        href="/internal/templates/{template.id}/preview"
        size="sm"
        color="light"
        id="preview-btn-{template.id}"
      >
        <EyeOutline class="w-4 h-4" />
      </Button>
      <Tooltip triggeredBy="#preview-btn-{template.id}">Preview</Tooltip>

      <Button
        size="sm"
        color="light"
        onclick={handleClone}
        id="clone-btn-{template.id}"
      >
        <FileCopyOutline class="w-4 h-4" />
      </Button>
      <Tooltip triggeredBy="#clone-btn-{template.id}">Clone Template</Tooltip>
    </div>
  </div>
</Card>

<style>
  .line-clamp-1 {
    display: -webkit-box;
    -webkit-line-clamp: 1;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .line-clamp-2 {
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
</style>
