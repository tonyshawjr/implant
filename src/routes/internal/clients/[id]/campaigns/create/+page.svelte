<script lang="ts">
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { Button, Breadcrumb, BreadcrumbItem, Alert } from 'flowbite-svelte';
  import { ArrowLeftOutline, HomeOutline } from 'flowbite-svelte-icons';
  import { CampaignWizard } from '$lib/components/campaigns';

  let { data, form } = $props();

  // Check for form submission result
  $effect(() => {
    if (form?.success && form?.campaignId) {
      // Redirect to the client page after successful creation
      goto(`/internal/clients/${data.organization.id}`);
    }
  });

  // Determine if user is admin
  const isAdmin = $page.data.user?.role === 'super_admin' || $page.data.user?.role === 'admin';
</script>

<svelte:head>
  <title>Create Campaign - {data.organization.name} | SqueezMedia</title>
</svelte:head>

<div class="p-6">
  <!-- Breadcrumb -->
  <Breadcrumb class="mb-6">
    <BreadcrumbItem href="/internal" home>
      <HomeOutline class="me-2 h-4 w-4" />
      Internal
    </BreadcrumbItem>
    <BreadcrumbItem href="/internal/clients/{data.organization.id}">
      {data.organization.name}
    </BreadcrumbItem>
    <BreadcrumbItem>Create Campaign</BreadcrumbItem>
  </Breadcrumb>

  <!-- Header -->
  <div class="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
    <div>
      <h1 class="text-2xl font-bold text-gray-900 dark:text-white">
        Create Campaign
      </h1>
      <p class="mt-1 text-gray-500 dark:text-gray-400">
        Set up a new advertising campaign for {data.organization.name}
      </p>
    </div>
    <Button
      color="alternative"
      href="/internal/clients/{data.organization.id}"
    >
      <ArrowLeftOutline class="mr-2 h-4 w-4" />
      Back to Client
    </Button>
  </div>

  <!-- Form Success Message -->
  {#if form?.success}
    <Alert color="green" class="mb-6" dismissable>
      <span class="font-medium">Success!</span>
      {form.message || 'Campaign created successfully.'}
    </Alert>
  {/if}

  <!-- Form Error Message -->
  {#if form?.error}
    <Alert color="red" class="mb-6" dismissable>
      <span class="font-medium">Error:</span>
      {form.error}
    </Alert>
  {/if}

  <!-- Campaign Wizard -->
  <CampaignWizard
    organizationId={data.organization.id}
    organizationName={data.organization.name}
    assets={data.assets}
    landingPages={data.landingPages}
    templates={data.templates}
    voiceProfiles={data.voiceProfiles}
    territory={data.territory}
    recommendedBudget={data.recommendedBudget}
    {isAdmin}
  />
</div>
