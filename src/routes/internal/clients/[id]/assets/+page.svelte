<script lang="ts">
  import { Breadcrumb, BreadcrumbItem, Heading } from 'flowbite-svelte';
  import { HomeOutline, UsersGroupSolid, FileImageSolid } from 'flowbite-svelte-icons';
  import { AssetLibrary } from '$lib/components/assets';

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
    usageCount: number;
    createdAt: string;
    uploadedBy: string | null;
  }

  interface PageData {
    organization: {
      id: string;
      name: string;
      slug: string;
    };
    assets: Asset[];
  }

  let { data }: { data: PageData } = $props();
</script>

<svelte:head>
  <title>Creative Assets - {data.organization.name} | SqueezMedia</title>
</svelte:head>

<div class="space-y-6">
  <!-- Breadcrumb -->
  <Breadcrumb aria-label="Navigation breadcrumb">
    <BreadcrumbItem href="/internal" home>
      {#snippet icon()}
        <HomeOutline class="me-2 h-4 w-4" />
      {/snippet}
      Dashboard
    </BreadcrumbItem>
    <BreadcrumbItem href="/internal/clients">
      {#snippet icon()}
        <UsersGroupSolid class="me-2 h-4 w-4" />
      {/snippet}
      Clients
    </BreadcrumbItem>
    <BreadcrumbItem href="/internal/clients/{data.organization.id}">
      {data.organization.name}
    </BreadcrumbItem>
    <BreadcrumbItem>
      {#snippet icon()}
        <FileImageSolid class="me-2 h-4 w-4" />
      {/snippet}
      Assets
    </BreadcrumbItem>
  </Breadcrumb>

  <!-- Page Header -->
  <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
    <div>
      <Heading tag="h1" class="text-2xl font-bold text-gray-900 dark:text-white">
        Creative Assets
      </Heading>
      <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
        Manage images and videos for {data.organization.name}'s ad campaigns.
      </p>
    </div>
  </div>

  <!-- Asset Library -->
  <AssetLibrary
    assets={data.assets}
    organizationId={data.organization.id}
  />
</div>
