<script lang="ts">
  import { enhance } from '$app/forms';
  import { Badge, Button, Card, Tooltip, Toggle } from 'flowbite-svelte';
  import {
    EyeOutline,
    EditOutline,
    ClipboardOutline,
    ChartPieOutline,
    GlobeOutline,
    CalendarMonthOutline
  } from 'flowbite-svelte-icons';

  interface LandingPage {
    id: string;
    name: string;
    slug: string;
    url: string | null;
    status: 'draft' | 'published' | 'archived';
    viewCount: number;
    submissionCount: number;
    conversionRate: number;
    metaTitle: string | null;
    metaDescription: string | null;
    publishedAt: string | null;
    createdAt: string;
    updatedAt: string;
    template: {
      id: string;
      name: string;
      category: string;
    } | null;
    campaign: {
      id: string;
      name: string;
    } | null;
    createdBy: {
      id: string;
      name: string;
    } | null;
  }

  interface Props {
    landingPage: LandingPage;
    organizationId: string;
    onCopyUrl?: () => void;
  }

  let { landingPage, organizationId, onCopyUrl }: Props = $props();

  let copySuccess = $state(false);

  function getStatusColor(status: string): 'green' | 'yellow' | 'gray' {
    switch (status) {
      case 'published':
        return 'green';
      case 'draft':
        return 'yellow';
      case 'archived':
        return 'gray';
      default:
        return 'gray';
    }
  }

  function getStatusLabel(status: string): string {
    switch (status) {
      case 'published':
        return 'Published';
      case 'draft':
        return 'Draft';
      case 'archived':
        return 'Archived';
      default:
        return status;
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

  function formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  }

  function formatNumber(num: number): string {
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'k';
    }
    return num.toString();
  }

  function getPublicUrl(): string {
    return `/lp/${organizationId}/${landingPage.id}`;
  }

  async function copyToClipboard() {
    const url = `${window.location.origin}${getPublicUrl()}`;
    try {
      await navigator.clipboard.writeText(url);
      copySuccess = true;
      onCopyUrl?.();
      setTimeout(() => {
        copySuccess = false;
      }, 2000);
    } catch (err) {
      console.error('Failed to copy URL:', err);
    }
  }
</script>

<Card class="relative overflow-hidden">
  <!-- Content -->
  <div class="space-y-3">
    <!-- Header with name and status -->
    <div class="flex items-start justify-between gap-2">
      <div class="min-w-0 flex-1">
        <h3 class="text-lg font-semibold text-gray-900 dark:text-white truncate">
          {landingPage.name}
        </h3>
        {#if landingPage.template}
          <div class="flex items-center gap-2 mt-1">
            <Badge color={getCategoryColor(landingPage.template.category)} class="text-xs">
              {landingPage.template.name}
            </Badge>
          </div>
        {/if}
      </div>
      <Badge color={getStatusColor(landingPage.status)} class="shrink-0">
        {getStatusLabel(landingPage.status)}
      </Badge>
    </div>

    <!-- Metrics row -->
    <div class="grid grid-cols-3 gap-3 py-3 border-y border-gray-100 dark:border-gray-700">
      <div class="text-center">
        <div class="text-lg font-semibold text-gray-900 dark:text-white">
          {formatNumber(landingPage.viewCount)}
        </div>
        <div class="text-xs text-gray-500 dark:text-gray-400">Views</div>
      </div>
      <div class="text-center">
        <div class="text-lg font-semibold text-gray-900 dark:text-white">
          {formatNumber(landingPage.submissionCount)}
        </div>
        <div class="text-xs text-gray-500 dark:text-gray-400">Submissions</div>
      </div>
      <div class="text-center">
        <div class="text-lg font-semibold text-green-600 dark:text-green-400">
          {landingPage.conversionRate.toFixed(1)}%
        </div>
        <div class="text-xs text-gray-500 dark:text-gray-400">Conv. Rate</div>
      </div>
    </div>

    <!-- Meta info -->
    <div class="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
      <div class="flex items-center gap-1">
        <CalendarMonthOutline class="w-4 h-4" />
        <span>{formatDate(landingPage.createdAt)}</span>
      </div>
      {#if landingPage.campaign}
        <div class="flex items-center gap-1 truncate">
          <span class="truncate">Campaign: {landingPage.campaign.name}</span>
        </div>
      {/if}
    </div>

    <!-- Public URL -->
    <div class="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
      <GlobeOutline class="w-4 h-4 text-gray-400 shrink-0" />
      <code class="text-xs text-gray-600 dark:text-gray-300 truncate flex-1">
        {getPublicUrl()}
      </code>
      <Button
        size="xs"
        color="light"
        onclick={copyToClipboard}
        id="copy-url-{landingPage.id}"
      >
        <ClipboardOutline class="w-3.5 h-3.5" />
      </Button>
      <Tooltip triggeredBy="#copy-url-{landingPage.id}">
        {copySuccess ? 'Copied!' : 'Copy URL'}
      </Tooltip>
    </div>

    <!-- Actions -->
    <div class="flex items-center gap-2 pt-2">
      <Button
        href="/internal/clients/{organizationId}/landing-pages/{landingPage.id}"
        size="sm"
        color="primary"
        class="flex-1"
      >
        <EditOutline class="w-4 h-4 me-1" />
        Edit
      </Button>

      <Button
        href={getPublicUrl()}
        target="_blank"
        size="sm"
        color="light"
        id="preview-btn-{landingPage.id}"
      >
        <EyeOutline class="w-4 h-4" />
      </Button>
      <Tooltip triggeredBy="#preview-btn-{landingPage.id}">Preview</Tooltip>

      <Button
        href="/internal/clients/{organizationId}/landing-pages/{landingPage.id}/analytics"
        size="sm"
        color="light"
        id="analytics-btn-{landingPage.id}"
      >
        <ChartPieOutline class="w-4 h-4" />
      </Button>
      <Tooltip triggeredBy="#analytics-btn-{landingPage.id}">View Analytics</Tooltip>

      <!-- Quick publish/unpublish toggle -->
      {#if landingPage.status !== 'archived'}
        <form method="POST" action="?/togglePublish" use:enhance class="flex items-center">
          <input type="hidden" name="landingPageId" value={landingPage.id} />
          <Toggle
            size="small"
            checked={landingPage.status === 'published'}
            onchange={(e) => {
              const form = (e.target as HTMLElement).closest('form');
              form?.requestSubmit();
            }}
          />
        </form>
      {/if}
    </div>
  </div>
</Card>
