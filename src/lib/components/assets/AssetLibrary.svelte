<script lang="ts">
  import { Button, ButtonGroup, Input } from 'flowbite-svelte';
  import { SearchOutline, FileImageSolid, FileVideoSolid, GridPlusOutline } from 'flowbite-svelte-icons';
  import AssetUploader from './AssetUploader.svelte';
  import AssetCard from './AssetCard.svelte';

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

  // Type for uploaded asset from AssetUploader (slightly different shape)
  interface UploadedAsset {
    id: string;
    organizationId: string | null;
    name: string;
    type: string;
    url: string;
    fileSize: number | null;
    mimeType: string | null;
    tags: string[] | null;
    uploadedBy: string | null;
    createdAt: string;
  }

  interface Props {
    assets: Asset[];
    organizationId: string;
    selectable?: boolean;
    selectedAssets?: Asset[];
    onSelect?: (asset: Asset) => void;
  }

  let { assets = [], organizationId, selectable = false, selectedAssets = [], onSelect }: Props = $props();

  // State
  let localAssets = $state<Asset[]>([]);
  let filterType = $state<'all' | 'image' | 'video'>('all');
  let searchQuery = $state('');

  // Initialize local assets from props
  $effect(() => {
    localAssets = [...assets];
  });

  // Filtered assets
  let filteredAssets = $derived(() => {
    let result = localAssets;

    // Filter by type
    if (filterType !== 'all') {
      result = result.filter(asset => asset.assetType === filterType);
    }

    // Filter by search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(asset =>
        asset.name.toLowerCase().includes(query) ||
        (asset.tags && asset.tags.some(tag => tag.toLowerCase().includes(query)))
      );
    }

    return result;
  });

  // Stats
  let imageCount = $derived(localAssets.filter(a => a.assetType === 'image').length);
  let videoCount = $derived(localAssets.filter(a => a.assetType === 'video').length);

  // Handlers
  function handleNewAsset(uploadedAsset: UploadedAsset) {
    // Convert uploaded asset format to Asset format
    const newAsset: Asset = {
      id: uploadedAsset.id,
      organizationId: uploadedAsset.organizationId,
      name: uploadedAsset.name,
      assetType: uploadedAsset.type,
      fileUrl: uploadedAsset.url,
      thumbnailUrl: null,
      fileSize: uploadedAsset.fileSize,
      mimeType: uploadedAsset.mimeType,
      tags: uploadedAsset.tags,
      createdAt: uploadedAsset.createdAt
    };
    // Add to the beginning of the list (most recent first)
    localAssets = [newAsset, ...localAssets];
  }

  function handleDeleteAsset(asset: Asset) {
    localAssets = localAssets.filter(a => a.id !== asset.id);
  }

  function isSelected(asset: Asset): boolean {
    return selectedAssets.some(a => a.id === asset.id);
  }
</script>

<div class="space-y-6">
  <!-- Upload Section -->
  <div class="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
    <h3 class="mb-4 text-lg font-medium text-gray-900 dark:text-white">Upload New Assets</h3>
    <AssetUploader {organizationId} onUpload={handleNewAsset} />
  </div>

  <!-- Filter & Search Section -->
  <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
    <!-- Type Filter -->
    <ButtonGroup>
      <Button
        color={filterType === 'all' ? 'primary' : 'alternative'}
        onclick={() => filterType = 'all'}
      >
        <GridPlusOutline class="mr-2 h-4 w-4" />
        All ({localAssets.length})
      </Button>
      <Button
        color={filterType === 'image' ? 'primary' : 'alternative'}
        onclick={() => filterType = 'image'}
      >
        <FileImageSolid class="mr-2 h-4 w-4" />
        Images ({imageCount})
      </Button>
      <Button
        color={filterType === 'video' ? 'primary' : 'alternative'}
        onclick={() => filterType = 'video'}
      >
        <FileVideoSolid class="mr-2 h-4 w-4" />
        Videos ({videoCount})
      </Button>
    </ButtonGroup>

    <!-- Search -->
    <div class="relative w-full sm:w-64">
      <div class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
        <SearchOutline class="h-4 w-4 text-gray-500 dark:text-gray-400" />
      </div>
      <Input
        type="search"
        placeholder="Search by name or tag..."
        bind:value={searchQuery}
        class="pl-10"
      />
    </div>
  </div>

  <!-- Asset Grid -->
  {#if filteredAssets().length > 0}
    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {#each filteredAssets() as asset (asset.id)}
        <AssetCard
          {asset}
          {selectable}
          selected={isSelected(asset)}
          onSelect={onSelect}
          onDelete={handleDeleteAsset}
        />
      {/each}
    </div>
  {:else if localAssets.length === 0}
    <!-- Empty State -->
    <div class="flex flex-col items-center justify-center rounded-lg border border-dashed border-gray-300 bg-gray-50 p-12 text-center dark:border-gray-600 dark:bg-gray-800">
      <div class="rounded-full bg-gray-100 p-4 dark:bg-gray-700">
        <FileImageSolid class="h-8 w-8 text-gray-400 dark:text-gray-500" />
      </div>
      <h3 class="mt-4 text-lg font-medium text-gray-900 dark:text-white">No assets yet</h3>
      <p class="mt-2 text-sm text-gray-500 dark:text-gray-400">
        Upload images and videos to build your creative library.
      </p>
    </div>
  {:else}
    <!-- No Results State -->
    <div class="flex flex-col items-center justify-center rounded-lg border border-dashed border-gray-300 bg-gray-50 p-12 text-center dark:border-gray-600 dark:bg-gray-800">
      <SearchOutline class="h-8 w-8 text-gray-400 dark:text-gray-500" />
      <h3 class="mt-4 text-lg font-medium text-gray-900 dark:text-white">No matches found</h3>
      <p class="mt-2 text-sm text-gray-500 dark:text-gray-400">
        Try adjusting your search or filter to find what you're looking for.
      </p>
      <Button color="alternative" class="mt-4" onclick={() => { searchQuery = ''; filterType = 'all'; }}>
        Clear filters
      </Button>
    </div>
  {/if}
</div>
