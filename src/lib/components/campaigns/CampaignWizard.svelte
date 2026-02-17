<script lang="ts">
  import {
    Button,
    Card,
    Input,
    Label,
    Select,
    Textarea,
    Badge,
    Alert,
    Checkbox,
    Modal,
    Spinner,
    Helper
  } from 'flowbite-svelte';
  import { Stepper } from 'flowbite-svelte';
  import {
    ArrowLeftOutline,
    ArrowRightOutline,
    CheckOutline,
    FileImageSolid,
    FileVideoSolid,
    PlusOutline,
    EyeOutline,
    WandMagicSparklesOutline,
    CalendarMonthOutline,
    CashOutline,
    GlobeOutline,
    FileLinesOutline
  } from 'flowbite-svelte-icons';
  import AssetUploader from '$lib/components/assets/AssetUploader.svelte';

  // Types
  interface Asset {
    id: string;
    name: string;
    assetType: string;
    fileUrl: string;
    thumbnailUrl: string | null;
    fileSize: number | null;
    mimeType: string | null;
    dimensions: { width?: number; height?: number } | null;
    durationSeconds: number | null;
    tags: string[] | null;
    usageCount: number;
    createdAt: string;
  }

  interface LandingPage {
    id: string;
    name: string;
    slug: string;
    url: string | null;
    status: string;
    template: {
      id: string;
      name: string;
      category: string;
      thumbnailUrl: string | null;
    } | null;
    metrics: {
      viewCount: number;
      submissionCount: number;
      conversionRate: number | null;
    };
    createdAt: string;
  }

  interface Template {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    category: string;
    thumbnailUrl: string | null;
    conversionRateAvg: number | null;
  }

  interface VoiceProfile {
    id: string;
    name: string;
    tone: string | null;
    personality: string | null;
    formalityLevel: string | null;
    targetAudience: string | null;
    sampleHeadlines: string[] | null;
    sampleAdCopy: string[] | null;
    sampleCtas: string[] | null;
    qualityScore: number | null;
  }

  interface Territory {
    id: string;
    name: string;
    location: string;
    radiusMiles: number;
    population: number | null;
    medianIncome: number | null;
    monthlyBasePrice: number | null;
  }

  interface Props {
    organizationId: string;
    organizationName: string;
    assets: Asset[];
    landingPages: LandingPage[];
    templates: Template[];
    voiceProfiles: VoiceProfile[];
    territory: Territory | null;
    recommendedBudget: {
      monthly: number;
      daily: number;
    };
    isAdmin?: boolean;
  }

  let {
    organizationId,
    organizationName,
    assets,
    landingPages,
    templates,
    voiceProfiles,
    territory,
    recommendedBudget,
    isAdmin = false
  }: Props = $props();

  // Wizard state
  let currentStep = $state(1);
  let isSubmitting = $state(false);
  let submitError = $state<string | null>(null);

  // Form data state
  let campaignData = $state({
    // Step 1: Platform & Basics
    platform: '' as 'facebook' | 'instagram' | 'google' | 'meta' | '',
    campaignType: '' as 'lead_gen' | 'awareness' | 'retargeting' | '',
    name: '',
    objective: '',

    // Step 2: Creative Assets
    primaryCreativeId: null as string | null,
    headlines: '',
    primaryText: '',
    callToAction: 'Learn More',

    // Step 3: Landing Page
    landingPageId: null as string | null,

    // Step 4: Budget & Schedule
    monthlyBudget: recommendedBudget.monthly,
    dailyBudget: recommendedBudget.daily,
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
    isOngoing: true
  });

  // Local assets state (for newly uploaded)
  let localAssets = $state<Asset[]>([...assets]);

  // Landing page modal state
  let showCreateLandingPageModal = $state(false);
  let newLandingPageName = $state('');
  let selectedTemplateId = $state<string | null>(null);
  let isCreatingLandingPage = $state(false);

  // AI generation state
  let isGeneratingAds = $state(false);

  // Step definitions for stepper
  const steps = [
    { id: 1, label: 'Platform', description: 'Basics' },
    { id: 2, label: 'Creative', description: 'Assets' },
    { id: 3, label: 'Landing', description: 'Page' },
    { id: 4, label: 'Budget', description: 'Schedule' },
    { id: 5, label: 'Review', description: 'Submit' }
  ];

  // Platform options
  const platformOptions = [
    { value: 'facebook', label: 'Facebook' },
    { value: 'instagram', label: 'Instagram' },
    { value: 'google', label: 'Google Ads' },
    { value: 'meta', label: 'Meta (FB + IG)' }
  ];

  // Campaign type options
  const campaignTypeOptions = [
    { value: 'lead_gen', label: 'Lead Generation' },
    { value: 'awareness', label: 'Brand Awareness' },
    { value: 'retargeting', label: 'Retargeting' }
  ];

  // CTA options
  const ctaOptions = [
    { value: 'Learn More', label: 'Learn More' },
    { value: 'Sign Up', label: 'Sign Up' },
    { value: 'Get Quote', label: 'Get Quote' },
    { value: 'Book Now', label: 'Book Now' },
    { value: 'Contact Us', label: 'Contact Us' }
  ];

  // Computed values
  let selectedAsset = $derived(
    campaignData.primaryCreativeId
      ? localAssets.find((a) => a.id === campaignData.primaryCreativeId)
      : null
  );

  let selectedLandingPage = $derived(
    campaignData.landingPageId
      ? landingPages.find((lp) => lp.id === campaignData.landingPageId)
      : null
  );

  // Validation functions
  function validateStep1(): boolean {
    return !!(
      campaignData.platform &&
      campaignData.campaignType &&
      campaignData.name.trim()
    );
  }

  function validateStep2(): boolean {
    // At least headlines OR primary text should be provided (creative is optional)
    return !!(campaignData.headlines.trim() || campaignData.primaryText.trim());
  }

  function validateStep3(): boolean {
    // Landing page is optional but recommended
    return true;
  }

  function validateStep4(): boolean {
    return !!(
      campaignData.monthlyBudget > 0 &&
      campaignData.startDate &&
      (campaignData.isOngoing || campaignData.endDate)
    );
  }

  function validateCurrentStep(): boolean {
    switch (currentStep) {
      case 1:
        return validateStep1();
      case 2:
        return validateStep2();
      case 3:
        return validateStep3();
      case 4:
        return validateStep4();
      case 5:
        return true;
      default:
        return false;
    }
  }

  function nextStep() {
    if (validateCurrentStep() && currentStep < 5) {
      currentStep++;
    }
  }

  function prevStep() {
    if (currentStep > 1) {
      currentStep--;
    }
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

  // Handle asset upload
  function handleAssetUpload(uploadedAsset: UploadedAsset) {
    // Convert uploaded asset format to Asset format
    const newAsset: Asset = {
      id: uploadedAsset.id,
      name: uploadedAsset.name,
      assetType: uploadedAsset.type,
      fileUrl: uploadedAsset.url,
      thumbnailUrl: null,
      fileSize: uploadedAsset.fileSize,
      mimeType: uploadedAsset.mimeType,
      dimensions: null,
      durationSeconds: null,
      tags: uploadedAsset.tags,
      usageCount: 0,
      createdAt: uploadedAsset.createdAt
    };
    localAssets = [newAsset, ...localAssets];
  }

  // Handle asset selection
  function selectAsset(assetId: string) {
    if (campaignData.primaryCreativeId === assetId) {
      campaignData.primaryCreativeId = null;
    } else {
      campaignData.primaryCreativeId = assetId;
    }
  }

  // Handle landing page selection
  function selectLandingPage(pageId: string) {
    if (campaignData.landingPageId === pageId) {
      campaignData.landingPageId = null;
    } else {
      campaignData.landingPageId = pageId;
    }
  }

  // Calculate daily budget from monthly
  function updateDailyBudget() {
    if (campaignData.monthlyBudget > 0) {
      campaignData.dailyBudget = Math.round((campaignData.monthlyBudget / 30) * 100) / 100;
    }
  }

  // Handle AI ad copy generation
  async function generateAIAdCopy() {
    if (voiceProfiles.length === 0) {
      submitError = 'No approved voice profile found. Please create one first.';
      return;
    }

    isGeneratingAds = true;
    submitError = null;

    try {
      const response = await fetch('/api/ai/generate-ads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          platform: campaignData.platform || 'facebook',
          campaignType: campaignData.campaignType || 'lead_gen',
          voiceProfileId: voiceProfiles[0]?.id,
          variantCount: 3
        })
      });

      const result = await response.json();

      if (result.success && result.data?.variants?.length > 0) {
        // Populate form with generated content
        const headlines: string[] = [];
        const bodies: string[] = [];

        for (const variant of result.data.variants) {
          if (variant.content) {
            if ('headline' in variant.content && variant.content.headline) {
              headlines.push(variant.content.headline);
            }
            if ('primaryText' in variant.content && variant.content.primaryText) {
              bodies.push(variant.content.primaryText);
            }
          }
        }

        if (headlines.length > 0) {
          campaignData.headlines = headlines.join('\n');
        }
        if (bodies.length > 0) {
          campaignData.primaryText = bodies[0];
        }
      } else {
        submitError = result.error?.message || 'Failed to generate ad copy';
      }
    } catch (err) {
      console.error('Failed to generate ads:', err);
      submitError = 'Failed to generate ad copy. Please try again.';
    } finally {
      isGeneratingAds = false;
    }
  }

  // Handle landing page creation
  async function createLandingPage() {
    if (!selectedTemplateId || !newLandingPageName.trim()) return;

    isCreatingLandingPage = true;

    try {
      const formData = new FormData();
      formData.append('templateId', selectedTemplateId);
      formData.append('name', newLandingPageName);

      const response = await fetch('?/createLandingPage', {
        method: 'POST',
        body: formData
      });

      const result = await response.json();

      if (result.data && 'success' in result.data && result.data.success) {
        // Refresh would be needed here - for now just close modal
        showCreateLandingPageModal = false;
        newLandingPageName = '';
        selectedTemplateId = null;
      } else {
        submitError = result.data?.error || 'Failed to create landing page';
      }
    } catch (err) {
      console.error('Failed to create landing page:', err);
      submitError = 'Failed to create landing page';
    } finally {
      isCreatingLandingPage = false;
    }
  }

  // Format file size
  function formatFileSize(bytes: number | null): string {
    if (!bytes) return 'Unknown';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  // Format currency
  function formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  }
</script>

<div class="space-y-6">
  <!-- Stepper -->
  <div class="rounded-lg bg-white p-4 shadow dark:bg-gray-800">
    <Stepper
      {steps}
      bind:current={currentStep}
      clickable={false}
      showCheckmarkForCompleted={true}
    />
  </div>

  <!-- Error Alert -->
  {#if submitError}
    <Alert color="red" dismissable onclick={() => (submitError = null)}>
      <span class="font-medium">Error:</span>
      {submitError}
    </Alert>
  {/if}

  <!-- Step Content -->
  <Card size="xl" class="p-6">
    <!-- Step 1: Platform & Basics -->
    {#if currentStep === 1}
      <div class="space-y-6">
        <div class="flex items-center gap-3">
          <div class="rounded-full bg-primary-100 p-3 dark:bg-primary-900">
            <GlobeOutline class="h-6 w-6 text-primary-600 dark:text-primary-400" />
          </div>
          <div>
            <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
              Platform & Campaign Basics
            </h3>
            <p class="text-sm text-gray-500 dark:text-gray-400">
              Choose your advertising platform and define your campaign
            </p>
          </div>
        </div>

        <div class="grid gap-6 md:grid-cols-2">
          <div>
            <Label for="platform" class="mb-2">Platform *</Label>
            <Select
              id="platform"
              bind:value={campaignData.platform}
              placeholder="Select platform"
            >
              {#each platformOptions as option}
                <option value={option.value}>{option.label}</option>
              {/each}
            </Select>
          </div>

          <div>
            <Label for="campaignType" class="mb-2">Campaign Type *</Label>
            <Select
              id="campaignType"
              bind:value={campaignData.campaignType}
              placeholder="Select type"
            >
              {#each campaignTypeOptions as option}
                <option value={option.value}>{option.label}</option>
              {/each}
            </Select>
          </div>
        </div>

        <div>
          <Label for="name" class="mb-2">Campaign Name *</Label>
          <Input
            id="name"
            type="text"
            bind:value={campaignData.name}
            placeholder="e.g., Spring Dental Implant Campaign"
          />
          <Helper class="mt-1">
            Choose a descriptive name that helps identify this campaign
          </Helper>
        </div>

        <div>
          <Label for="objective" class="mb-2">Campaign Objective</Label>
          <Textarea
            id="objective"
            bind:value={campaignData.objective}
            rows={3}
            placeholder="Describe the main goal of this campaign..."
          />
        </div>
      </div>
    {/if}

    <!-- Step 2: Creative Assets -->
    {#if currentStep === 2}
      <div class="space-y-6">
        <div class="flex items-center gap-3">
          <div class="rounded-full bg-primary-100 p-3 dark:bg-primary-900">
            <FileImageSolid class="h-6 w-6 text-primary-600 dark:text-primary-400" />
          </div>
          <div>
            <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
              Creative Assets
            </h3>
            <p class="text-sm text-gray-500 dark:text-gray-400">
              Select or upload images/videos and add your ad copy
            </p>
          </div>
        </div>

        <!-- Asset Selection -->
        <div>
          <div class="mb-3 flex items-center justify-between">
            <Label>Primary Creative</Label>
            {#if selectedAsset}
              <Badge color="green">Selected: {selectedAsset.name}</Badge>
            {/if}
          </div>

          {#if localAssets.length > 0}
            <div class="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
              {#each localAssets.slice(0, 8) as asset}
                <button
                  type="button"
                  class="relative overflow-hidden rounded-lg border-2 transition-all {campaignData.primaryCreativeId ===
                  asset.id
                    ? 'border-primary-500 ring-2 ring-primary-300'
                    : 'border-gray-200 hover:border-gray-300 dark:border-gray-700'}"
                  onclick={() => selectAsset(asset.id)}
                >
                  <div class="aspect-video bg-gray-100 dark:bg-gray-800">
                    {#if asset.assetType === 'image'}
                      <img
                        src={asset.thumbnailUrl || asset.fileUrl}
                        alt={asset.name}
                        class="h-full w-full object-cover"
                      />
                    {:else}
                      <div
                        class="flex h-full items-center justify-center"
                      >
                        <FileVideoSolid
                          class="h-8 w-8 text-gray-400"
                        />
                      </div>
                    {/if}
                  </div>
                  <div class="p-2">
                    <p
                      class="truncate text-xs font-medium text-gray-700 dark:text-gray-300"
                    >
                      {asset.name}
                    </p>
                    <p class="text-xs text-gray-500">
                      {formatFileSize(asset.fileSize)}
                    </p>
                  </div>
                  {#if campaignData.primaryCreativeId === asset.id}
                    <div
                      class="absolute right-2 top-2 rounded-full bg-primary-500 p-1"
                    >
                      <CheckOutline class="h-3 w-3 text-white" />
                    </div>
                  {/if}
                </button>
              {/each}
            </div>
          {/if}

          <!-- Upload New -->
          <AssetUploader
            {organizationId}
            onUpload={handleAssetUpload}
          />
        </div>

        <!-- AI Generate Button -->
        <div class="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-4 dark:border-gray-600 dark:bg-gray-800">
          <div class="flex items-center justify-between">
            <div>
              <h4 class="font-medium text-gray-900 dark:text-white">
                Generate Ad Copy with AI
              </h4>
              <p class="text-sm text-gray-500 dark:text-gray-400">
                Use your brand voice to create compelling ad copy
              </p>
            </div>
            <Button
              color="purple"
              onclick={generateAIAdCopy}
              disabled={isGeneratingAds || voiceProfiles.length === 0}
            >
              {#if isGeneratingAds}
                <Spinner size="4" class="mr-2" />
                Generating...
              {:else}
                <WandMagicSparklesOutline class="mr-2 h-4 w-4" />
                Generate Copy
              {/if}
            </Button>
          </div>
          {#if voiceProfiles.length === 0}
            <Helper class="mt-2" color="red">
              No approved voice profile available. Create one in the client's Brand
              Voice section.
            </Helper>
          {/if}
        </div>

        <!-- Headlines -->
        <div>
          <Label for="headlines" class="mb-2">Headlines (one per line)</Label>
          <Textarea
            id="headlines"
            bind:value={campaignData.headlines}
            rows={4}
            placeholder="Transform Your Smile Today, Missing Teeth? We Can Help..."
          />
          <Helper class="mt-1">
            Add multiple headline variations for A/B testing
          </Helper>
        </div>

        <!-- Primary Text -->
        <div>
          <Label for="primaryText" class="mb-2">Primary Text</Label>
          <Textarea
            id="primaryText"
            bind:value={campaignData.primaryText}
            rows={4}
            placeholder="Describe your offer, highlight benefits, and include a clear call to action..."
          />
        </div>

        <!-- CTA Selection -->
        <div>
          <Label for="cta" class="mb-2">Call-to-Action Button</Label>
          <Select id="cta" bind:value={campaignData.callToAction}>
            {#each ctaOptions as option}
              <option value={option.value}>{option.label}</option>
            {/each}
          </Select>
        </div>
      </div>
    {/if}

    <!-- Step 3: Landing Page -->
    {#if currentStep === 3}
      <div class="space-y-6">
        <div class="flex items-center gap-3">
          <div class="rounded-full bg-primary-100 p-3 dark:bg-primary-900">
            <FileLinesOutline class="h-6 w-6 text-primary-600 dark:text-primary-400" />
          </div>
          <div>
            <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
              Landing Page
            </h3>
            <p class="text-sm text-gray-500 dark:text-gray-400">
              Select or create a landing page for this campaign
            </p>
          </div>
        </div>

        <!-- Existing Landing Pages -->
        {#if landingPages.length > 0}
          <div>
            <Label class="mb-3">Select Existing Landing Page</Label>
            <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {#each landingPages as page}
                <button
                  type="button"
                  class="relative rounded-lg border-2 p-4 text-left transition-all {campaignData.landingPageId ===
                  page.id
                    ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                    : 'border-gray-200 hover:border-gray-300 dark:border-gray-700'}"
                  onclick={() => selectLandingPage(page.id)}
                >
                  <div class="mb-2 flex items-start justify-between">
                    <h4 class="font-medium text-gray-900 dark:text-white">
                      {page.name}
                    </h4>
                    <Badge
                      color={page.status === 'published' ? 'green' : 'yellow'}
                    >
                      {page.status}
                    </Badge>
                  </div>
                  {#if page.template}
                    <p class="text-sm text-gray-500 dark:text-gray-400">
                      Template: {page.template.name}
                    </p>
                  {/if}
                  {#if page.metrics.conversionRate}
                    <p class="mt-1 text-sm text-gray-500">
                      Conversion: {page.metrics.conversionRate.toFixed(1)}%
                    </p>
                  {/if}
                  {#if campaignData.landingPageId === page.id}
                    <div
                      class="absolute right-2 top-2 rounded-full bg-primary-500 p-1"
                    >
                      <CheckOutline class="h-3 w-3 text-white" />
                    </div>
                  {/if}
                </button>
              {/each}
            </div>
          </div>
        {:else}
          <Alert color="blue">
            No landing pages found for this organization. Create one from a template
            below.
          </Alert>
        {/if}

        <!-- Selected Landing Page Preview -->
        {#if selectedLandingPage && selectedLandingPage.url}
          <div class="rounded-lg border border-gray-200 dark:border-gray-700">
            <div
              class="flex items-center justify-between border-b border-gray-200 p-3 dark:border-gray-700"
            >
              <span class="font-medium text-gray-700 dark:text-gray-300">
                Preview: {selectedLandingPage.name}
              </span>
              <a
                href={selectedLandingPage.url}
                target="_blank"
                rel="noopener noreferrer"
                class="text-primary-600 hover:underline dark:text-primary-400"
              >
                <EyeOutline class="mr-1 inline h-4 w-4" />
                Open in new tab
              </a>
            </div>
            <div class="h-96 overflow-hidden">
              <iframe
                src={selectedLandingPage.url}
                title="Landing page preview"
                class="h-full w-full border-0"
                sandbox="allow-same-origin"
              ></iframe>
            </div>
          </div>
        {/if}

        <!-- Create New Landing Page Button -->
        <div class="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-4 text-center dark:border-gray-600 dark:bg-gray-800">
          <Button
            color="alternative"
            onclick={() => (showCreateLandingPageModal = true)}
          >
            <PlusOutline class="mr-2 h-4 w-4" />
            Create New Landing Page from Template
          </Button>
        </div>
      </div>
    {/if}

    <!-- Step 4: Budget & Schedule -->
    {#if currentStep === 4}
      <div class="space-y-6">
        <div class="flex items-center gap-3">
          <div class="rounded-full bg-primary-100 p-3 dark:bg-primary-900">
            <CashOutline class="h-6 w-6 text-primary-600 dark:text-primary-400" />
          </div>
          <div>
            <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
              Budget & Schedule
            </h3>
            <p class="text-sm text-gray-500 dark:text-gray-400">
              Set your campaign budget and running dates
            </p>
          </div>
        </div>

        <!-- Budget Recommendation -->
        {#if territory}
          <Alert color="blue">
            <span class="font-medium">Recommended Budget</span>
            <p class="mt-1 text-sm">
              Based on the territory ({territory.name} - {territory.location}), we
              recommend a monthly budget of
              <strong>{formatCurrency(recommendedBudget.monthly)}</strong>
              ({formatCurrency(recommendedBudget.daily)}/day) for optimal performance.
            </p>
          </Alert>
        {/if}

        <div class="grid gap-6 md:grid-cols-2">
          <div>
            <Label for="monthlyBudget" class="mb-2">Monthly Budget *</Label>
            <div class="relative">
              <span
                class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"
              >
                $
              </span>
              <Input
                id="monthlyBudget"
                type="number"
                bind:value={campaignData.monthlyBudget}
                min={0}
                step={100}
                class="pl-7"
                onchange={updateDailyBudget}
              />
            </div>
          </div>

          <div>
            <Label for="dailyBudget" class="mb-2">Daily Budget</Label>
            <div class="relative">
              <span
                class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"
              >
                $
              </span>
              <Input
                id="dailyBudget"
                type="number"
                bind:value={campaignData.dailyBudget}
                min={0}
                step={5}
                class="pl-7"
              />
            </div>
            <Helper class="mt-1">
              Auto-calculated from monthly budget (monthly / 30)
            </Helper>
          </div>
        </div>

        <div class="grid gap-6 md:grid-cols-2">
          <div>
            <Label for="startDate" class="mb-2">Start Date *</Label>
            <Input
              id="startDate"
              type="date"
              bind:value={campaignData.startDate}
              min={new Date().toISOString().split('T')[0]}
            />
          </div>

          <div>
            <Label for="endDate" class="mb-2">End Date</Label>
            <Input
              id="endDate"
              type="date"
              bind:value={campaignData.endDate}
              min={campaignData.startDate}
              disabled={campaignData.isOngoing}
            />
          </div>
        </div>

        <div class="flex items-center gap-2">
          <Checkbox
            id="isOngoing"
            bind:checked={campaignData.isOngoing}
          />
          <Label for="isOngoing" class="cursor-pointer">
            Run campaign indefinitely (ongoing)
          </Label>
        </div>
      </div>
    {/if}

    <!-- Step 5: Review & Submit -->
    {#if currentStep === 5}
      <div class="space-y-6">
        <div class="flex items-center gap-3">
          <div class="rounded-full bg-primary-100 p-3 dark:bg-primary-900">
            <CheckOutline class="h-6 w-6 text-primary-600 dark:text-primary-400" />
          </div>
          <div>
            <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
              Review & Submit
            </h3>
            <p class="text-sm text-gray-500 dark:text-gray-400">
              Review your campaign details before submitting
            </p>
          </div>
        </div>

        <!-- Summary Cards -->
        <div class="grid gap-4 md:grid-cols-2">
          <!-- Platform & Basics -->
          <Card class="p-4">
            <h4 class="mb-3 font-semibold text-gray-900 dark:text-white">
              Platform & Basics
            </h4>
            <dl class="space-y-2 text-sm">
              <div class="flex justify-between">
                <dt class="text-gray-500 dark:text-gray-400">Platform</dt>
                <dd>
                  <Badge color="blue">
                    {platformOptions.find((p) => p.value === campaignData.platform)
                      ?.label || 'Not selected'}
                  </Badge>
                </dd>
              </div>
              <div class="flex justify-between">
                <dt class="text-gray-500 dark:text-gray-400">Type</dt>
                <dd class="font-medium text-gray-900 dark:text-white">
                  {campaignTypeOptions.find(
                    (t) => t.value === campaignData.campaignType
                  )?.label || 'Not selected'}
                </dd>
              </div>
              <div class="flex justify-between">
                <dt class="text-gray-500 dark:text-gray-400">Name</dt>
                <dd class="font-medium text-gray-900 dark:text-white">
                  {campaignData.name || 'Not set'}
                </dd>
              </div>
            </dl>
          </Card>

          <!-- Creative -->
          <Card class="p-4">
            <h4 class="mb-3 font-semibold text-gray-900 dark:text-white">
              Creative Assets
            </h4>
            {#if selectedAsset}
              <div class="flex items-center gap-3">
                {#if selectedAsset.assetType === 'image'}
                  <img
                    src={selectedAsset.thumbnailUrl || selectedAsset.fileUrl}
                    alt={selectedAsset.name}
                    class="h-16 w-16 rounded object-cover"
                  />
                {:else}
                  <div
                    class="flex h-16 w-16 items-center justify-center rounded bg-gray-100 dark:bg-gray-700"
                  >
                    <FileVideoSolid class="h-8 w-8 text-gray-400" />
                  </div>
                {/if}
                <div>
                  <p class="font-medium text-gray-900 dark:text-white">
                    {selectedAsset.name}
                  </p>
                  <p class="text-sm text-gray-500">
                    {selectedAsset.assetType} - {formatFileSize(
                      selectedAsset.fileSize
                    )}
                  </p>
                </div>
              </div>
            {:else}
              <p class="text-sm text-gray-500">No creative selected</p>
            {/if}
            {#if campaignData.headlines}
              <div class="mt-3">
                <p class="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Headlines:
                </p>
                <p class="text-sm text-gray-600 dark:text-gray-400">
                  {campaignData.headlines.split('\n').filter((h) => h.trim())
                    .length} headline(s) added
                </p>
              </div>
            {/if}
            <div class="mt-2">
              <Badge color="purple">{campaignData.callToAction}</Badge>
            </div>
          </Card>

          <!-- Landing Page -->
          <Card class="p-4">
            <h4 class="mb-3 font-semibold text-gray-900 dark:text-white">
              Landing Page
            </h4>
            {#if selectedLandingPage}
              <div>
                <p class="font-medium text-gray-900 dark:text-white">
                  {selectedLandingPage.name}
                </p>
                <Badge
                  color={selectedLandingPage.status === 'published'
                    ? 'green'
                    : 'yellow'}
                >
                  {selectedLandingPage.status}
                </Badge>
                {#if selectedLandingPage.url}
                  <a
                    href={selectedLandingPage.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    class="mt-2 block text-sm text-primary-600 hover:underline"
                  >
                    Preview page
                  </a>
                {/if}
              </div>
            {:else}
              <p class="text-sm text-gray-500">No landing page selected</p>
            {/if}
          </Card>

          <!-- Budget & Schedule -->
          <Card class="p-4">
            <h4 class="mb-3 font-semibold text-gray-900 dark:text-white">
              Budget & Schedule
            </h4>
            <dl class="space-y-2 text-sm">
              <div class="flex justify-between">
                <dt class="text-gray-500 dark:text-gray-400">Monthly Budget</dt>
                <dd class="font-semibold text-gray-900 dark:text-white">
                  {formatCurrency(campaignData.monthlyBudget)}
                </dd>
              </div>
              <div class="flex justify-between">
                <dt class="text-gray-500 dark:text-gray-400">Daily Budget</dt>
                <dd class="text-gray-900 dark:text-white">
                  {formatCurrency(campaignData.dailyBudget)}
                </dd>
              </div>
              <div class="flex justify-between">
                <dt class="text-gray-500 dark:text-gray-400">Start Date</dt>
                <dd class="text-gray-900 dark:text-white">
                  {campaignData.startDate || 'Not set'}
                </dd>
              </div>
              <div class="flex justify-between">
                <dt class="text-gray-500 dark:text-gray-400">End Date</dt>
                <dd class="text-gray-900 dark:text-white">
                  {campaignData.isOngoing ? 'Ongoing' : campaignData.endDate || 'Not set'}
                </dd>
              </div>
            </dl>
          </Card>
        </div>

        <!-- Submit Buttons -->
        <form method="POST" action="?/createCampaign">
          <!-- Hidden form fields -->
          <input type="hidden" name="platform" value={campaignData.platform} />
          <input type="hidden" name="campaignType" value={campaignData.campaignType} />
          <input type="hidden" name="name" value={campaignData.name} />
          <input type="hidden" name="objective" value={campaignData.objective} />
          <input
            type="hidden"
            name="primaryCreativeId"
            value={campaignData.primaryCreativeId || ''}
          />
          <input type="hidden" name="headlines" value={campaignData.headlines} />
          <input type="hidden" name="primaryText" value={campaignData.primaryText} />
          <input type="hidden" name="callToAction" value={campaignData.callToAction} />
          <input
            type="hidden"
            name="landingPageId"
            value={campaignData.landingPageId || ''}
          />
          <input
            type="hidden"
            name="monthlyBudget"
            value={campaignData.monthlyBudget}
          />
          <input type="hidden" name="dailyBudget" value={campaignData.dailyBudget} />
          <input type="hidden" name="startDate" value={campaignData.startDate} />
          <input type="hidden" name="endDate" value={campaignData.endDate} />
          <input
            type="hidden"
            name="isOngoing"
            value={campaignData.isOngoing.toString()}
          />

          <div
            class="flex flex-col gap-3 rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800 sm:flex-row sm:items-center sm:justify-between"
          >
            <div>
              <p class="text-sm text-gray-500 dark:text-gray-400">
                Ready to launch your campaign?
              </p>
            </div>
            <div class="flex gap-3">
              <Button
                type="submit"
                name="submitType"
                value="review"
                color="alternative"
                disabled={isSubmitting}
              >
                Submit for Review
              </Button>
              {#if isAdmin}
                <Button
                  type="submit"
                  name="submitType"
                  value="publish"
                  color="green"
                  disabled={isSubmitting}
                >
                  {#if isSubmitting}
                    <Spinner size="4" class="mr-2" />
                  {/if}
                  Publish Now
                </Button>
              {/if}
            </div>
          </div>
        </form>
      </div>
    {/if}

    <!-- Navigation Buttons -->
    <div
      class="mt-6 flex items-center justify-between border-t border-gray-200 pt-6 dark:border-gray-700"
    >
      <Button
        color="alternative"
        onclick={prevStep}
        disabled={currentStep === 1}
      >
        <ArrowLeftOutline class="mr-2 h-4 w-4" />
        Previous
      </Button>

      <span class="text-sm text-gray-500 dark:text-gray-400">
        Step {currentStep} of {steps.length}
      </span>

      {#if currentStep < 5}
        <Button
          color="primary"
          onclick={nextStep}
          disabled={!validateCurrentStep()}
        >
          Next
          <ArrowRightOutline class="ml-2 h-4 w-4" />
        </Button>
      {:else}
        <div></div>
      {/if}
    </div>
  </Card>
</div>

<!-- Create Landing Page Modal -->
<Modal
  bind:open={showCreateLandingPageModal}
  title="Create Landing Page from Template"
  size="lg"
>
  <div class="space-y-4">
    <div>
      <Label for="landingPageName" class="mb-2">Landing Page Name *</Label>
      <Input
        id="landingPageName"
        type="text"
        bind:value={newLandingPageName}
        placeholder="e.g., Spring Implant Promo"
      />
    </div>

    <div>
      <Label class="mb-2">Select Template *</Label>
      <div class="grid max-h-64 gap-3 overflow-y-auto sm:grid-cols-2">
        {#each templates as template}
          <button
            type="button"
            class="rounded-lg border-2 p-3 text-left transition-all {selectedTemplateId ===
            template.id
              ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
              : 'border-gray-200 hover:border-gray-300 dark:border-gray-700'}"
            onclick={() => (selectedTemplateId = template.id)}
          >
            <div class="flex items-start gap-3">
              {#if template.thumbnailUrl}
                <img
                  src={template.thumbnailUrl}
                  alt={template.name}
                  class="h-12 w-16 rounded object-cover"
                />
              {:else}
                <div
                  class="flex h-12 w-16 items-center justify-center rounded bg-gray-100 dark:bg-gray-700"
                >
                  <FileLinesOutline class="h-6 w-6 text-gray-400" />
                </div>
              {/if}
              <div>
                <p class="font-medium text-gray-900 dark:text-white">
                  {template.name}
                </p>
                <Badge color="gray" class="mt-1">{template.category}</Badge>
                {#if template.conversionRateAvg}
                  <p class="mt-1 text-xs text-gray-500">
                    Avg. conversion: {template.conversionRateAvg.toFixed(1)}%
                  </p>
                {/if}
              </div>
            </div>
          </button>
        {/each}
      </div>
    </div>
  </div>

  {#snippet footer()}
    <div class="flex w-full justify-end gap-3">
      <Button
        color="alternative"
        onclick={() => (showCreateLandingPageModal = false)}
      >
        Cancel
      </Button>
      <Button
        color="primary"
        onclick={createLandingPage}
        disabled={!selectedTemplateId || !newLandingPageName.trim() || isCreatingLandingPage}
      >
        {#if isCreatingLandingPage}
          <Spinner size="4" class="mr-2" />
        {/if}
        Create Landing Page
      </Button>
    </div>
  {/snippet}
</Modal>
