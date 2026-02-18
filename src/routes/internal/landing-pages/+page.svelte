<script lang="ts">
  import type { PageData, ActionData } from './$types';
  import { enhance } from '$app/forms';
  import { goto } from '$app/navigation';
  import {
    Badge,
    Button,
    Input,
    Select,
    Alert,
    Table,
    TableHead,
    TableHeadCell,
    TableBody,
    TableBodyRow,
    TableBodyCell,
    Toggle,
    Tooltip
  } from 'flowbite-svelte';
  import {
    PlusOutline,
    SearchOutline,
    EyeOutline,
    EditOutline,
    ClipboardOutline,
    FileDocOutline,
    ChartOutline,
    UsersGroupOutline,
    CheckCircleOutline,
    ExclamationCircleOutline,
    ArchiveOutline,
    GlobeOutline
  } from 'flowbite-svelte-icons';

  let { data, form }: { data: PageData; form: ActionData } = $props();

  let searchValue = $state(data.filters.search);
  let organizationFilter = $state(data.filters.organizationId);
  let statusFilter = $state(data.filters.status);
  let copiedId = $state<string | null>(null);

  const statusOptions = [
    { value: '', name: 'All Status' },
    { value: 'published', name: 'Published' },
    { value: 'draft', name: 'Draft' },
    { value: 'archived', name: 'Archived' }
  ];

  // Organization options for dropdown
  let organizationOptions = $derived([
    { value: '', name: 'All Clients' },
    ...data.organizations.map(org => ({
      value: org.id,
      name: org.name
    }))
  ]);

  function handleSearch() {
    const params = new URLSearchParams();
    if (searchValue) params.set('search', searchValue);
    if (organizationFilter) params.set('organization', organizationFilter);
    if (statusFilter) params.set('status', statusFilter);
    goto(`/internal/landing-pages?${params.toString()}`);
  }

  function handleFilterChange() {
    handleSearch();
  }

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

  function formatNumber(num: number): string {
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'k';
    }
    return num.toString();
  }

  function formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  }

  function getPublicUrl(organizationId: string, pageId: string): string {
    return `/lp/${organizationId}/${pageId}`;
  }

  async function copyToClipboard(organizationId: string, pageId: string) {
    const url = `${window.location.origin}${getPublicUrl(organizationId, pageId)}`;
    try {
      await navigator.clipboard.writeText(url);
      copiedId = pageId;
      setTimeout(() => {
        copiedId = null;
      }, 2000);
    } catch (err) {
      console.error('Failed to copy URL:', err);
    }
  }
</script>

<svelte:head>
  <title>Landing Pages - SqueezMedia</title>
</svelte:head>

<!-- Stats Row -->
<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
  <div class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-4">
    <div class="flex items-center gap-3">
      <div class="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
        <FileDocOutline class="w-5 h-5 text-blue-600 dark:text-blue-400" />
      </div>
      <div>
        <p class="text-sm text-gray-500 dark:text-gray-400">Total Pages</p>
        <p class="text-xl font-bold text-gray-900 dark:text-white">{data.stats.totalPages}</p>
      </div>
    </div>
  </div>

  <div class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-4">
    <div class="flex items-center gap-3">
      <div class="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
        <CheckCircleOutline class="w-5 h-5 text-green-600 dark:text-green-400" />
      </div>
      <div>
        <p class="text-sm text-gray-500 dark:text-gray-400">Published</p>
        <p class="text-xl font-bold text-gray-900 dark:text-white">{data.stats.publishedPages}</p>
      </div>
    </div>
  </div>

  <div class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-4">
    <div class="flex items-center gap-3">
      <div class="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
        <EyeOutline class="w-5 h-5 text-purple-600 dark:text-purple-400" />
      </div>
      <div>
        <p class="text-sm text-gray-500 dark:text-gray-400">Total Views</p>
        <p class="text-xl font-bold text-gray-900 dark:text-white">
          {data.stats.totalViews.toLocaleString()}
        </p>
      </div>
    </div>
  </div>

  <div class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-4">
    <div class="flex items-center gap-3">
      <div class="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
        <UsersGroupOutline class="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
      </div>
      <div>
        <p class="text-sm text-gray-500 dark:text-gray-400">Submissions</p>
        <p class="text-xl font-bold text-gray-900 dark:text-white">
          {data.stats.totalSubmissions.toLocaleString()}
        </p>
      </div>
    </div>
  </div>

  <div class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-4">
    <div class="flex items-center gap-3">
      <div class="p-2 bg-teal-100 dark:bg-teal-900/30 rounded-lg">
        <ChartOutline class="w-5 h-5 text-teal-600 dark:text-teal-400" />
      </div>
      <div>
        <p class="text-sm text-gray-500 dark:text-gray-400">Avg Conv. Rate</p>
        <p class="text-xl font-bold text-gray-900 dark:text-white">{data.stats.avgConversionRate}%</p>
      </div>
    </div>
  </div>
</div>

<!-- Page Header -->
<div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
  <div>
    <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Landing Pages</h1>
    <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
      Manage landing pages across all clients
    </p>
  </div>
  <Button href="/internal/landing-pages/create" color="primary">
    <PlusOutline class="w-4 h-4 me-2" />
    Create New
  </Button>
</div>

<!-- Success/Error Messages -->
{#if form?.success}
  <Alert color="green" class="mb-6">
    <CheckCircleOutline slot="icon" class="w-5 h-5" />
    {form.message}
  </Alert>
{/if}

{#if form?.message && !form?.success}
  <Alert color="red" class="mb-6">
    <ExclamationCircleOutline slot="icon" class="w-5 h-5" />
    {form.message}
  </Alert>
{/if}

<!-- Filters -->
<div class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-4 mb-6">
  <div class="flex flex-col sm:flex-row gap-4">
    <div class="flex-1">
      <form onsubmit={(e) => { e.preventDefault(); handleSearch(); }}>
        <Input
          bind:value={searchValue}
          placeholder="Search landing pages..."
          class="w-full"
        >
          <SearchOutline slot="left" class="w-5 h-5 text-gray-400" />
        </Input>
      </form>
    </div>
    <div class="w-full sm:w-56">
      <Select
        items={organizationOptions}
        bind:value={organizationFilter}
        onchange={handleFilterChange}
        placeholder="All Clients"
      />
    </div>
    <div class="w-full sm:w-40">
      <Select
        items={statusOptions}
        bind:value={statusFilter}
        onchange={handleFilterChange}
        placeholder="All Status"
      />
    </div>
  </div>
</div>

<!-- Landing Pages Table -->
{#if data.landingPages && data.landingPages.length > 0}
  <div class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
    <Table striped>
      <TableHead class="bg-gray-50 dark:bg-gray-700">
        <TableHeadCell class="px-6 py-4">Name</TableHeadCell>
        <TableHeadCell class="px-6 py-4">Client</TableHeadCell>
        <TableHeadCell class="px-6 py-4">Template</TableHeadCell>
        <TableHeadCell class="px-6 py-4 text-center">Status</TableHeadCell>
        <TableHeadCell class="px-6 py-4 text-right">Views</TableHeadCell>
        <TableHeadCell class="px-6 py-4 text-right">Submissions</TableHeadCell>
        <TableHeadCell class="px-6 py-4 text-right">Conv Rate</TableHeadCell>
        <TableHeadCell class="px-6 py-4 text-center">Actions</TableHeadCell>
      </TableHead>
      <TableBody>
        {#each data.landingPages as landingPage (landingPage.id)}
          <TableBodyRow>
            <TableBodyCell class="px-6 py-4">
              <div class="font-medium text-gray-900 dark:text-white">
                {landingPage.name}
              </div>
              <div class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Created {formatDate(landingPage.createdAt)}
              </div>
            </TableBodyCell>
            <TableBodyCell class="px-6 py-4">
              {#if landingPage.organization}
                <a
                  href="/internal/clients/{landingPage.organization.id}"
                  class="text-primary-600 hover:underline font-medium"
                >
                  {landingPage.organization.name}
                </a>
              {:else}
                <span class="text-gray-400">-</span>
              {/if}
            </TableBodyCell>
            <TableBodyCell class="px-6 py-4">
              {#if landingPage.template}
                <Badge color={getCategoryColor(landingPage.template.category)} class="text-xs">
                  {landingPage.template.name}
                </Badge>
              {:else}
                <span class="text-gray-400 text-sm">Custom</span>
              {/if}
            </TableBodyCell>
            <TableBodyCell class="px-6 py-4 text-center">
              <Badge color={getStatusColor(landingPage.status)}>
                {getStatusLabel(landingPage.status)}
              </Badge>
            </TableBodyCell>
            <TableBodyCell class="px-6 py-4 text-right font-medium text-gray-900 dark:text-white">
              {formatNumber(landingPage.viewCount)}
            </TableBodyCell>
            <TableBodyCell class="px-6 py-4 text-right font-medium text-gray-900 dark:text-white">
              {formatNumber(landingPage.submissionCount)}
            </TableBodyCell>
            <TableBodyCell class="px-6 py-4 text-right">
              <span class="font-semibold text-green-600 dark:text-green-400">
                {landingPage.conversionRate.toFixed(1)}%
              </span>
            </TableBodyCell>
            <TableBodyCell class="px-6 py-4">
              <div class="flex items-center justify-center gap-1">
                <!-- Edit Button -->
                <Button
                  href="/internal/clients/{landingPage.organization?.id}/landing-pages/{landingPage.id}"
                  size="xs"
                  color="light"
                  id="edit-btn-{landingPage.id}"
                >
                  <EditOutline class="w-4 h-4" />
                </Button>
                <Tooltip triggeredBy="#edit-btn-{landingPage.id}">Edit</Tooltip>

                <!-- Preview Button -->
                {#if landingPage.organization}
                  <Button
                    href={getPublicUrl(landingPage.organization.id, landingPage.id)}
                    target="_blank"
                    size="xs"
                    color="light"
                    id="preview-btn-{landingPage.id}"
                  >
                    <EyeOutline class="w-4 h-4" />
                  </Button>
                  <Tooltip triggeredBy="#preview-btn-{landingPage.id}">Preview</Tooltip>
                {/if}

                <!-- Copy URL Button -->
                {#if landingPage.organization}
                  <Button
                    size="xs"
                    color="light"
                    onclick={() => copyToClipboard(landingPage.organization!.id, landingPage.id)}
                    id="copy-btn-{landingPage.id}"
                  >
                    <ClipboardOutline class="w-4 h-4" />
                  </Button>
                  <Tooltip triggeredBy="#copy-btn-{landingPage.id}">
                    {copiedId === landingPage.id ? 'Copied!' : 'Copy URL'}
                  </Tooltip>
                {/if}

                <!-- Publish/Unpublish Toggle -->
                {#if landingPage.status !== 'archived'}
                  <form method="POST" action="?/togglePublish" use:enhance class="flex items-center ml-1">
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
            </TableBodyCell>
          </TableBodyRow>
        {/each}
      </TableBody>
    </Table>
  </div>
{:else}
  <div class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-12 text-center">
    <div class="flex justify-center mb-4">
      <div class="p-4 bg-gray-100 dark:bg-gray-700 rounded-full">
        <FileDocOutline class="w-8 h-8 text-gray-400 dark:text-gray-500" />
      </div>
    </div>
    <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-2">
      {#if data.filters.search || data.filters.organizationId || data.filters.status}
        No landing pages found
      {:else}
        No landing pages yet
      {/if}
    </h3>
    <p class="text-gray-500 dark:text-gray-400 mb-6">
      {#if data.filters.search || data.filters.organizationId || data.filters.status}
        Try adjusting your search or filter criteria.
      {:else}
        Create your first landing page for a client to get started.
      {/if}
    </p>
    {#if !data.filters.search && !data.filters.organizationId && !data.filters.status}
      <Button href="/internal/landing-pages/create" color="primary">
        <PlusOutline class="w-4 h-4 me-2" />
        Create First Landing Page
      </Button>
    {/if}
  </div>
{/if}
