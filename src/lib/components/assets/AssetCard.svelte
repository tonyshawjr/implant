<script lang="ts">
  import { Badge, Button, Modal } from 'flowbite-svelte';
  import {
    TrashBinOutline,
    LinkOutline,
    EyeOutline,
    FileImageSolid,
    FileVideoSolid,
    CheckOutline
  } from 'flowbite-svelte-icons';

  interface Asset {
    id: string;
    organizationId: string | null;
    name: string;
    assetType: string;
    fileUrl: string;
    thumbnailUrl?: string | null;
    fileSize: number | null;
    mimeType: string | null;
    tags?: string[] | null;
    createdAt: string;
  }

  interface Props {
    asset: Asset;
    selectable?: boolean;
    selected?: boolean;
    onSelect?: (asset: Asset) => void;
    onDelete?: (asset: Asset) => void;
  }

  let { asset, selectable = false, selected = false, onSelect, onDelete }: Props = $props();

  // State
  let showPreviewModal = $state(false);
  let showDeleteModal = $state(false);
  let isDeleting = $state(false);
  let copiedUrl = $state(false);

  // Computed
  let isImage = $derived(asset.assetType === 'image');
  let isVideo = $derived(asset.assetType === 'video');
  let displayUrl = $derived(asset.thumbnailUrl || asset.fileUrl);

  // Helpers
  function formatFileSize(bytes: number | null): string {
    if (!bytes) return 'Unknown';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  function truncateName(name: string, maxLength: number = 25): string {
    if (name.length <= maxLength) return name;
    const extension = name.split('.').pop() || '';
    const baseName = name.slice(0, -(extension.length + 1));
    const truncatedBase = baseName.slice(0, maxLength - extension.length - 4) + '...';
    return `${truncatedBase}.${extension}`;
  }

  async function copyUrl() {
    try {
      await navigator.clipboard.writeText(window.location.origin + asset.fileUrl);
      copiedUrl = true;
      setTimeout(() => {
        copiedUrl = false;
      }, 2000);
    } catch (error) {
      console.error('Failed to copy URL:', error);
    }
  }

  async function handleDelete() {
    if (!onDelete) return;

    isDeleting = true;
    try {
      const response = await fetch(`/api/assets/${asset.id}`, {
        method: 'DELETE'
      });

      const result = await response.json();

      if (result.success) {
        showDeleteModal = false;
        onDelete(asset);
      } else {
        console.error('Failed to delete asset:', result.error);
      }
    } catch (error) {
      console.error('Delete error:', error);
    } finally {
      isDeleting = false;
    }
  }

  function handleCardClick() {
    if (selectable && onSelect) {
      onSelect(asset);
    }
  }
</script>

<!-- Custom card without using Card component to avoid padding issues -->
<div
  role="button"
  tabindex="0"
  class="group relative cursor-pointer overflow-hidden rounded-lg border border-gray-200 bg-white shadow-md transition-all hover:shadow-lg dark:border-gray-700 dark:bg-gray-800 {selected ? 'ring-2 ring-primary-500' : ''}"
  onclick={handleCardClick}
  onkeydown={(e) => e.key === 'Enter' && handleCardClick()}
>
  <!-- Thumbnail -->
  <div class="relative aspect-video overflow-hidden bg-gray-100 dark:bg-gray-800">
    {#if isImage}
      <img
        src={displayUrl}
        alt={asset.name}
        class="h-full w-full object-cover"
        loading="lazy"
      />
    {:else if isVideo}
      <div class="flex h-full w-full items-center justify-center">
        <div class="rounded-full bg-gray-200 p-4 dark:bg-gray-700">
          <FileVideoSolid class="h-8 w-8 text-gray-500 dark:text-gray-400" />
        </div>
      </div>
    {:else}
      <div class="flex h-full w-full items-center justify-center">
        <FileImageSolid class="h-12 w-12 text-gray-400" />
      </div>
    {/if}

    <!-- Selection indicator -->
    {#if selectable && selected}
      <div class="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-primary-500">
        <CheckOutline class="h-4 w-4 text-white" />
      </div>
    {/if}

    <!-- Hover overlay with actions -->
    <div class="absolute inset-0 flex items-center justify-center gap-2 bg-black/60 opacity-0 transition-opacity group-hover:opacity-100">
      <Button
        size="sm"
        color="light"
        title="View"
        onclick={(e: MouseEvent) => { e.stopPropagation(); showPreviewModal = true; }}
      >
        <EyeOutline class="h-4 w-4" />
      </Button>

      <Button
        size="sm"
        color="light"
        title={copiedUrl ? 'Copied!' : 'Copy URL'}
        onclick={(e: MouseEvent) => { e.stopPropagation(); copyUrl(); }}
      >
        {#if copiedUrl}
          <CheckOutline class="h-4 w-4 text-green-500" />
        {:else}
          <LinkOutline class="h-4 w-4" />
        {/if}
      </Button>

      {#if onDelete}
        <Button
          size="sm"
          color="red"
          title="Delete"
          onclick={(e: MouseEvent) => { e.stopPropagation(); showDeleteModal = true; }}
        >
          <TrashBinOutline class="h-4 w-4" />
        </Button>
      {/if}
    </div>
  </div>

  <!-- Info -->
  <div class="p-3">
    <p class="truncate text-sm font-medium text-gray-900 dark:text-white" title={asset.name}>
      {truncateName(asset.name)}
    </p>
    <div class="mt-2 flex items-center justify-between">
      <Badge color={isImage ? 'blue' : 'purple'}>
        {isImage ? 'Image' : 'Video'}
      </Badge>
      <span class="text-xs text-gray-500 dark:text-gray-400">
        {formatFileSize(asset.fileSize)}
      </span>
    </div>
  </div>
</div>

<!-- Preview Modal -->
<Modal title={asset.name} bind:open={showPreviewModal} size="xl" outsideclose>
  <div class="flex items-center justify-center">
    {#if isImage}
      <img
        src={asset.fileUrl}
        alt={asset.name}
        class="max-h-[70vh] max-w-full rounded-lg"
      />
    {:else if isVideo}
      <video
        src={asset.fileUrl}
        controls
        class="max-h-[70vh] max-w-full rounded-lg"
      >
        <track kind="captions" />
        Your browser does not support the video tag.
      </video>
    {/if}
  </div>

  <div class="mt-4 space-y-2 text-sm text-gray-600 dark:text-gray-400">
    <p><span class="font-medium">File:</span> {asset.name}</p>
    <p><span class="font-medium">Type:</span> {asset.mimeType || 'Unknown'}</p>
    <p><span class="font-medium">Size:</span> {formatFileSize(asset.fileSize)}</p>
    {#if asset.tags && asset.tags.length > 0}
      <p>
        <span class="font-medium">Tags:</span>
        {#each asset.tags as tag}
          <Badge class="ml-1" color="gray">{tag}</Badge>
        {/each}
      </p>
    {/if}
  </div>

  {#snippet footer()}
    <Button color="alternative" onclick={() => showPreviewModal = false}>Close</Button>
    <Button color="primary" onclick={copyUrl}>
      {copiedUrl ? 'Copied!' : 'Copy URL'}
    </Button>
  {/snippet}
</Modal>

<!-- Delete Confirmation Modal -->
<Modal title="Delete Asset" bind:open={showDeleteModal} size="sm" outsideclose>
  <p class="text-gray-600 dark:text-gray-400">
    Are you sure you want to delete <span class="font-medium">{asset.name}</span>? This action cannot be undone.
  </p>

  {#snippet footer()}
    <Button color="alternative" onclick={() => showDeleteModal = false} disabled={isDeleting}>
      Cancel
    </Button>
    <Button color="red" onclick={handleDelete} disabled={isDeleting}>
      {isDeleting ? 'Deleting...' : 'Delete'}
    </Button>
  {/snippet}
</Modal>
