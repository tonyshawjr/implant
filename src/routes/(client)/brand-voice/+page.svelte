<script lang="ts">
  import { enhance } from '$app/forms';
  import {
    Card,
    Badge,
    Button,
    Modal,
    Tabs,
    TabItem,
    Progressbar,
    Textarea,
    Label,
    Select,
    Input,
    Spinner,
    Toggle,
    Alert,
    Helper
  } from 'flowbite-svelte';
  import {
    MicrophoneOutline,
    CheckOutline,
    CloseOutline,
    RefreshOutline,
    FileLinesOutline,
    GlobeOutline,
    ClockOutline,
    LightbulbOutline,
    ExclamationCircleOutline,
    PlusOutline,
    TrashBinOutline,
    PenOutline,
    SparklesOutline,
    ChartMixedOutline,
    ThumbsUpOutline,
    ThumbsDownOutline
  } from 'flowbite-svelte-icons';
  import type { PageData, ActionData } from './$types';
  import { formatDate, formatFileSize } from '$lib/utils';

  let { data, form }: { data: PageData; form: ActionData } = $props();

  // State
  let showRegenModal = $state(false);
  let showAdjustmentsModal = $state(false);
  let showAnalyzeModal = $state(false);
  let showGenerateModal = $state(false);
  let isSubmitting = $state(false);
  let activeTab = $state('overview');

  // Analysis form state
  let websiteUrl = $state('');
  let facebookUrl = $state('');
  let instagramUrl = $state('');
  let googleBusinessUrl = $state('');

  // Local state for adjustments form
  let adjustedFormalityLevel = $state(data.voiceProfile?.formalityLevel || 'professional');
  let adjustedPreferredTerms = $state(data.voiceProfile?.preferredTerms?.join(', ') || '');
  let adjustedAvoidTerms = $state(data.voiceProfile?.avoidTerms?.join(', ') || '');

  // Sample content approval tracking (local state)
  let approvedItems = $state<Set<string>>(new Set());
  let rejectedItems = $state<Set<string>>(new Set());
  let feedbackMessage = $state<string | null>(null);

  // Status display config
  const statusConfig: Record<string, { label: string; color: 'green' | 'yellow' | 'gray' | 'blue' | 'red'; description: string }> = {
    pending: {
      label: 'Pending Analysis',
      color: 'gray',
      description: 'Waiting for voice analysis to begin'
    },
    analyzing: {
      label: 'Analyzing',
      color: 'blue',
      description: 'AI is analyzing your brand sources'
    },
    in_review: {
      label: 'In Review',
      color: 'yellow',
      description: 'Voice profile is ready for your review'
    },
    approved: {
      label: 'Approved',
      color: 'green',
      description: 'Voice profile is active and being used for content generation'
    },
    rejected: {
      label: 'Needs Revision',
      color: 'red',
      description: 'Voice profile requires adjustments'
    }
  };

  // Formality level labels
  const formalityLabels: Record<string, { label: string; description: string }> = {
    formal: { label: 'Formal', description: 'Professional, corporate tone' },
    professional: { label: 'Professional', description: 'Business-appropriate, clear and direct' },
    casual: { label: 'Casual', description: 'Relaxed, conversational approach' },
    friendly: { label: 'Friendly', description: 'Warm, approachable, personable' }
  };

  // Source type icons
  const sourceTypeConfig: Record<string, { label: string; icon: any }> = {
    website: { label: 'Website', icon: GlobeOutline },
    document: { label: 'Document', icon: FileLinesOutline },
    audio: { label: 'Audio', icon: MicrophoneOutline },
    video: { label: 'Video', icon: MicrophoneOutline },
    text: { label: 'Text', icon: FileLinesOutline },
    facebook: { label: 'Facebook', icon: GlobeOutline },
    instagram: { label: 'Instagram', icon: GlobeOutline },
    google_business: { label: 'Google Business', icon: GlobeOutline }
  };

  let status = $derived(data.voiceProfile ? statusConfig[data.voiceProfile.status] || statusConfig.pending : null);
  let formality = $derived(data.voiceProfile?.formalityLevel ? formalityLabels[data.voiceProfile.formalityLevel] : null);
  let canGenerateContent = $derived(data.voiceProfile && data.voiceProfile.tone && data.voiceProfile.personality);
  let hasNoSampleContent = $derived(
    data.sampleContent.headlines.length === 0 &&
    data.sampleContent.adCopy.length === 0 &&
    data.sampleContent.ctas.length === 0
  );

  // Handle sample approval with learning
  async function approveContent(type: string, index: number, content: string) {
    const key = `${type}-${index}`;
    approvedItems.add(key);
    rejectedItems.delete(key);
    approvedItems = new Set(approvedItems);
    rejectedItems = new Set(rejectedItems);

    // Submit to learning system
    if (data.voiceProfile) {
      try {
        const formData = new FormData();
        formData.append('profileId', data.voiceProfile.id);
        formData.append('contentType', type === 'headline' ? 'headline' : type === 'adCopy' ? 'ad_copy' : 'cta');
        formData.append('content', content);

        await fetch('?/approveForLearning', {
          method: 'POST',
          body: formData
        });

        feedbackMessage = 'Content approved and saved for learning!';
        setTimeout(() => feedbackMessage = null, 3000);
      } catch (e) {
        console.error('Failed to record approval:', e);
      }
    }
  }

  // Handle sample rejection with learning
  async function rejectContent(type: string, index: number, content: string) {
    const key = `${type}-${index}`;
    rejectedItems.add(key);
    approvedItems.delete(key);
    approvedItems = new Set(approvedItems);
    rejectedItems = new Set(rejectedItems);

    // Submit to learning system
    if (data.voiceProfile) {
      try {
        const formData = new FormData();
        formData.append('profileId', data.voiceProfile.id);
        formData.append('contentType', type === 'headline' ? 'headline' : type === 'adCopy' ? 'ad_copy' : 'cta');
        formData.append('content', content);
        formData.append('reason', 'User rejected');

        await fetch('?/rejectForLearning', {
          method: 'POST',
          body: formData
        });

        feedbackMessage = 'Feedback recorded for improvement!';
        setTimeout(() => feedbackMessage = null, 3000);
      } catch (e) {
        console.error('Failed to record rejection:', e);
      }
    }
  }

  // Get item status
  function getItemStatus(type: string, index: number): 'approved' | 'rejected' | null {
    const key = `${type}-${index}`;
    if (approvedItems.has(key)) return 'approved';
    if (rejectedItems.has(key)) return 'rejected';
    return null;
  }

  // Reset form when modal closes
  function resetAdjustmentsForm() {
    adjustedFormalityLevel = data.voiceProfile?.formalityLevel || 'professional';
    adjustedPreferredTerms = data.voiceProfile?.preferredTerms?.join(', ') || '';
    adjustedAvoidTerms = data.voiceProfile?.avoidTerms?.join(', ') || '';
  }

  function resetAnalysisForm() {
    websiteUrl = '';
    facebookUrl = '';
    instagramUrl = '';
    googleBusinessUrl = '';
  }

  // Handle form success
  $effect(() => {
    if (form?.success) {
      if (form.message) {
        showRegenModal = false;
        showAdjustmentsModal = false;
        showAnalyzeModal = false;
        showGenerateModal = false;
      }
      isSubmitting = false;
    }
  });
</script>

<div class="space-y-6">
  <!-- Page Header -->
  <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
    <div>
      <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Brand Voice</h1>
      <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
        Your AI-powered brand voice profile for consistent, on-brand content generation.
      </p>
    </div>
    <div class="flex gap-2">
      {#if !data.voiceProfile}
        <Button color="primary" onclick={() => showAnalyzeModal = true}>
          <SparklesOutline class="mr-2 h-4 w-4" />
          Analyze Brand
        </Button>
      {:else}
        <Button color="light" size="sm" onclick={() => {
          resetAdjustmentsForm();
          showAdjustmentsModal = true;
        }}>
          <PenOutline class="mr-2 h-4 w-4" />
          Adjust Voice
        </Button>
        {#if canGenerateContent && hasNoSampleContent}
          <Button color="primary" size="sm" onclick={() => showGenerateModal = true}>
            <SparklesOutline class="mr-2 h-4 w-4" />
            Generate Content
          </Button>
        {/if}
        <Button color="light" size="sm" onclick={() => showAnalyzeModal = true}>
          <RefreshOutline class="mr-2 h-4 w-4" />
          Re-Analyze
        </Button>
      {/if}
    </div>
  </div>

  <!-- Feedback Message -->
  {#if feedbackMessage}
    <Alert color="green" dismissable>
      <span class="font-medium">{feedbackMessage}</span>
    </Alert>
  {/if}

  <!-- Form Success/Error Messages -->
  {#if form?.success && form?.message}
    <Alert color="green" dismissable>
      <span class="font-medium">{form.message}</span>
    </Alert>
  {/if}
  {#if form && !form.success && form.message}
    <Alert color="red" dismissable>
      <span class="font-medium">{form.message}</span>
    </Alert>
  {/if}

  {#if !data.voiceProfile}
    <!-- No Voice Profile State -->
    <Card class="p-8 text-center">
      <SparklesOutline class="mx-auto h-16 w-16 text-primary-500" />
      <h2 class="mt-4 text-xl font-semibold text-gray-900 dark:text-white">Create Your Brand Voice Profile</h2>
      <p class="mt-2 max-w-md mx-auto text-gray-500 dark:text-gray-400">
        Let our AI analyze your website, social media, and Google Business profile to capture your unique brand voice.
        This enables consistent, on-brand content generation across all your marketing materials.
      </p>
      <div class="mt-6">
        <Button color="primary" size="lg" onclick={() => showAnalyzeModal = true}>
          <SparklesOutline class="mr-2 h-5 w-5" />
          Start Brand Analysis
        </Button>
      </div>
      <div class="mt-6 grid gap-4 md:grid-cols-3 max-w-2xl mx-auto text-left">
        <div class="flex items-start gap-3 p-4 rounded-lg bg-gray-50 dark:bg-gray-800">
          <GlobeOutline class="h-5 w-5 text-primary-500 flex-shrink-0 mt-0.5" />
          <div>
            <p class="font-medium text-gray-900 dark:text-white">Website</p>
            <p class="text-sm text-gray-500 dark:text-gray-400">Analyze your homepage and key pages</p>
          </div>
        </div>
        <div class="flex items-start gap-3 p-4 rounded-lg bg-gray-50 dark:bg-gray-800">
          <GlobeOutline class="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
          <div>
            <p class="font-medium text-gray-900 dark:text-white">Social Media</p>
            <p class="text-sm text-gray-500 dark:text-gray-400">Extract voice from Facebook & Instagram</p>
          </div>
        </div>
        <div class="flex items-start gap-3 p-4 rounded-lg bg-gray-50 dark:bg-gray-800">
          <ChartMixedOutline class="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
          <div>
            <p class="font-medium text-gray-900 dark:text-white">Reviews</p>
            <p class="text-sm text-gray-500 dark:text-gray-400">Learn from your Google reviews</p>
          </div>
        </div>
      </div>
    </Card>
  {:else}
    <!-- Voice Profile Overview Card -->
    <Card class="overflow-hidden p-0">
      <div class="border-b border-gray-200 bg-gray-50 p-5 dark:border-gray-700 dark:bg-gray-800">
        <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div class="flex items-center gap-4">
            <div class="flex h-14 w-14 items-center justify-center rounded-xl bg-primary-100 dark:bg-primary-900/30">
              <MicrophoneOutline class="h-7 w-7 text-primary-600 dark:text-primary-400" />
            </div>
            <div>
              <div class="flex items-center gap-3">
                <h2 class="text-xl font-bold text-gray-900 dark:text-white">{data.voiceProfile.name}</h2>
                {#if status}
                  <Badge color={status.color}>{status.label}</Badge>
                {/if}
              </div>
              <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {status?.description || 'Voice profile status'}
              </p>
            </div>
          </div>

          <div class="flex items-center gap-4">
            {#if data.voiceProfile.status === 'in_review'}
              <form method="POST" action="?/approveProfile" use:enhance={() => {
                isSubmitting = true;
                return async ({ update }) => {
                  await update();
                  isSubmitting = false;
                };
              }}>
                <input type="hidden" name="profileId" value={data.voiceProfile.id} />
                <Button type="submit" color="green" disabled={isSubmitting}>
                  {#if isSubmitting}
                    <Spinner size="4" class="mr-2" />
                  {:else}
                    <CheckOutline class="mr-2 h-4 w-4" />
                  {/if}
                  Approve Profile
                </Button>
              </form>
            {/if}

            {#if data.voiceProfile.qualityScore !== null}
              <div class="flex items-center gap-4">
                <div class="text-right">
                  <p class="text-sm text-gray-500 dark:text-gray-400">Quality Score</p>
                  <p class="text-2xl font-bold text-gray-900 dark:text-white">
                    {data.voiceProfile.qualityScore}<span class="text-sm font-normal text-gray-500">/100</span>
                  </p>
                </div>
                <div class="h-12 w-12">
                  <svg class="h-12 w-12 -rotate-90 transform" viewBox="0 0 36 36">
                    <path
                      d="M18 2.0845
                        a 15.9155 15.9155 0 0 1 0 31.831
                        a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="3"
                      class="text-gray-200 dark:text-gray-700"
                    />
                    <path
                      d="M18 2.0845
                        a 15.9155 15.9155 0 0 1 0 31.831
                        a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="3"
                      stroke-dasharray={`${data.voiceProfile.qualityScore}, 100`}
                      class={data.voiceProfile.qualityScore >= 70 ? 'text-green-500' : data.voiceProfile.qualityScore >= 40 ? 'text-yellow-500' : 'text-red-500'}
                    />
                  </svg>
                </div>
              </div>
            {/if}
          </div>
        </div>
      </div>

      <div class="p-5">
        <div class="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <!-- Tone -->
          <div>
            <p class="text-sm font-medium text-gray-500 dark:text-gray-400">Tone</p>
            <p class="mt-1 text-lg font-semibold text-gray-900 dark:text-white">
              {data.voiceProfile.tone || 'Not defined'}
            </p>
          </div>

          <!-- Personality -->
          <div>
            <p class="text-sm font-medium text-gray-500 dark:text-gray-400">Personality</p>
            <p class="mt-1 text-lg font-semibold text-gray-900 dark:text-white">
              {data.voiceProfile.personality || 'Not defined'}
            </p>
          </div>

          <!-- Formality -->
          <div>
            <p class="text-sm font-medium text-gray-500 dark:text-gray-400">Formality Level</p>
            <p class="mt-1 text-lg font-semibold text-gray-900 dark:text-white">
              {formality?.label || 'Not defined'}
            </p>
            {#if formality?.description}
              <p class="text-xs text-gray-500 dark:text-gray-400">{formality.description}</p>
            {/if}
          </div>

          <!-- Target Audience -->
          <div>
            <p class="text-sm font-medium text-gray-500 dark:text-gray-400">Target Audience</p>
            <p class="mt-1 text-lg font-semibold text-gray-900 dark:text-white">
              {data.voiceProfile.targetAudience || 'Not defined'}
            </p>
          </div>
        </div>

        <!-- Key Differentiators -->
        {#if data.voiceProfile.keyDifferentiators && data.voiceProfile.keyDifferentiators.length > 0}
          <div class="mt-6 border-t border-gray-100 pt-6 dark:border-gray-700">
            <p class="mb-3 text-sm font-medium text-gray-500 dark:text-gray-400">Key Differentiators</p>
            <div class="flex flex-wrap gap-2">
              {#each data.voiceProfile.keyDifferentiators as diff}
                <Badge color="indigo" large>{diff}</Badge>
              {/each}
            </div>
          </div>
        {/if}

        <!-- Approval Info -->
        {#if data.voiceProfile.approvedAt}
          <div class="mt-6 rounded-lg bg-green-50 p-4 dark:bg-green-900/20">
            <div class="flex items-center gap-2">
              <CheckOutline class="h-5 w-5 text-green-600 dark:text-green-400" />
              <span class="text-sm font-medium text-green-800 dark:text-green-300">
                Approved on {formatDate(data.voiceProfile.approvedAt, 'medium')}
              </span>
              {#if data.voiceProfile.approvedBy}
                <span class="text-sm text-green-600 dark:text-green-400">
                  by {data.voiceProfile.approvedBy}
                </span>
              {/if}
            </div>
          </div>
        {/if}

        <!-- Rejection Info -->
        {#if data.voiceProfile.status === 'rejected' && data.voiceProfile.rejectionReason}
          <div class="mt-6 rounded-lg bg-red-50 p-4 dark:bg-red-900/20">
            <div class="flex items-start gap-2">
              <ExclamationCircleOutline class="mt-0.5 h-5 w-5 text-red-600 dark:text-red-400" />
              <div>
                <p class="text-sm font-medium text-red-800 dark:text-red-300">Revision Required</p>
                <p class="mt-1 text-sm text-red-600 dark:text-red-400">{data.voiceProfile.rejectionReason}</p>
              </div>
            </div>
          </div>
        {/if}

        <!-- Generate Content CTA -->
        {#if canGenerateContent && hasNoSampleContent}
          <div class="mt-6 rounded-lg border-2 border-dashed border-primary-200 bg-primary-50 p-6 text-center dark:border-primary-800 dark:bg-primary-900/20">
            <SparklesOutline class="mx-auto h-10 w-10 text-primary-500" />
            <h3 class="mt-3 text-lg font-semibold text-gray-900 dark:text-white">Ready to Generate Content</h3>
            <p class="mt-1 text-sm text-gray-600 dark:text-gray-400">
              Your brand voice has been analyzed. Generate sample content to review and approve.
            </p>
            <form method="POST" action="?/generateContent" class="mt-4" use:enhance={() => {
              isSubmitting = true;
              return async ({ update }) => {
                await update();
                isSubmitting = false;
              };
            }}>
              <input type="hidden" name="profileId" value={data.voiceProfile.id} />
              <Button type="submit" color="primary" disabled={isSubmitting}>
                {#if isSubmitting}
                  <Spinner size="4" class="mr-2" />
                  Generating...
                {:else}
                  <SparklesOutline class="mr-2 h-4 w-4" />
                  Generate Sample Content
                {/if}
              </Button>
            </form>
          </div>
        {/if}
      </div>
    </Card>

    <!-- Tabbed Content -->
    <Tabs style="underline">
      <!-- Sample Content Tab -->
      <TabItem open title="Sample Content">
        <div class="mt-4 space-y-6">
          {#if hasNoSampleContent}
            <Card class="p-8 text-center">
              <SparklesOutline class="mx-auto h-12 w-12 text-gray-400" />
              <p class="mt-4 text-gray-500 dark:text-gray-400">
                No sample content generated yet. Click "Generate Sample Content" above to create AI-generated samples.
              </p>
            </Card>
          {:else}
            <!-- Headlines -->
            <Card class="p-5">
              <div class="mb-4 flex items-center justify-between">
                <h3 class="text-lg font-semibold text-gray-900 dark:text-white">Sample Headlines</h3>
                <p class="text-sm text-gray-500 dark:text-gray-400">
                  Rate content to improve future generations
                </p>
              </div>

              {#if data.sampleContent.headlines.length === 0}
                <p class="py-8 text-center text-gray-500 dark:text-gray-400">
                  No sample headlines generated yet.
                </p>
              {:else}
                <div class="space-y-3">
                  {#each data.sampleContent.headlines as headline, i}
                    {@const itemStatus = getItemStatus('headline', i)}
                    <div class="flex items-center gap-3 rounded-lg border p-4 transition-colors
                      {itemStatus === 'approved' ? 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20' :
                       itemStatus === 'rejected' ? 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20' :
                       'border-gray-200 dark:border-gray-700'}">
                      <p class="flex-1 text-gray-900 dark:text-white">{headline}</p>
                      <div class="flex gap-2">
                        <button
                          class="rounded-lg p-2 transition-colors {itemStatus === 'approved' ? 'bg-green-100 text-green-600 dark:bg-green-900/50' : 'hover:bg-gray-100 text-gray-400 hover:text-green-600 dark:hover:bg-gray-700'}"
                          onclick={() => approveContent('headline', i, headline)}
                          title="Approve"
                        >
                          <ThumbsUpOutline class="h-5 w-5" />
                        </button>
                        <button
                          class="rounded-lg p-2 transition-colors {itemStatus === 'rejected' ? 'bg-red-100 text-red-600 dark:bg-red-900/50' : 'hover:bg-gray-100 text-gray-400 hover:text-red-600 dark:hover:bg-gray-700'}"
                          onclick={() => rejectContent('headline', i, headline)}
                          title="Reject"
                        >
                          <ThumbsDownOutline class="h-5 w-5" />
                        </button>
                      </div>
                    </div>
                  {/each}
                </div>
              {/if}
            </Card>

            <!-- Ad Copy -->
            <Card class="p-5">
              <div class="mb-4 flex items-center justify-between">
                <h3 class="text-lg font-semibold text-gray-900 dark:text-white">Sample Ad Copy</h3>
                <p class="text-sm text-gray-500 dark:text-gray-400">
                  Advertisement text in your brand voice
                </p>
              </div>

              {#if data.sampleContent.adCopy.length === 0}
                <p class="py-8 text-center text-gray-500 dark:text-gray-400">
                  No sample ad copy generated yet.
                </p>
              {:else}
                <div class="space-y-3">
                  {#each data.sampleContent.adCopy as copy, i}
                    {@const itemStatus = getItemStatus('adCopy', i)}
                    <div class="rounded-lg border p-4 transition-colors
                      {itemStatus === 'approved' ? 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20' :
                       itemStatus === 'rejected' ? 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20' :
                       'border-gray-200 dark:border-gray-700'}">
                      <p class="text-gray-900 dark:text-white whitespace-pre-line">{copy}</p>
                      <div class="mt-3 flex justify-end gap-2">
                        <button
                          class="flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm transition-colors {itemStatus === 'approved' ? 'bg-green-100 text-green-700 dark:bg-green-900/50' : 'bg-gray-100 text-gray-600 hover:bg-green-100 hover:text-green-700 dark:bg-gray-700 dark:hover:bg-green-900/50'}"
                          onclick={() => approveContent('adCopy', i, copy)}
                        >
                          <ThumbsUpOutline class="h-4 w-4" />
                          Approve
                        </button>
                        <button
                          class="flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm transition-colors {itemStatus === 'rejected' ? 'bg-red-100 text-red-700 dark:bg-red-900/50' : 'bg-gray-100 text-gray-600 hover:bg-red-100 hover:text-red-700 dark:bg-gray-700 dark:hover:bg-red-900/50'}"
                          onclick={() => rejectContent('adCopy', i, copy)}
                        >
                          <ThumbsDownOutline class="h-4 w-4" />
                          Reject
                        </button>
                      </div>
                    </div>
                  {/each}
                </div>
              {/if}
            </Card>

            <!-- CTAs -->
            <Card class="p-5">
              <div class="mb-4 flex items-center justify-between">
                <h3 class="text-lg font-semibold text-gray-900 dark:text-white">Sample CTAs</h3>
                <p class="text-sm text-gray-500 dark:text-gray-400">
                  Call-to-action phrases for your ads
                </p>
              </div>

              {#if data.sampleContent.ctas.length === 0}
                <p class="py-8 text-center text-gray-500 dark:text-gray-400">
                  No sample CTAs generated yet.
                </p>
              {:else}
                <div class="flex flex-wrap gap-3">
                  {#each data.sampleContent.ctas as cta, i}
                    {@const itemStatus = getItemStatus('cta', i)}
                    <div class="flex items-center gap-2 rounded-lg border px-4 py-2 transition-colors
                      {itemStatus === 'approved' ? 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20' :
                       itemStatus === 'rejected' ? 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20' :
                       'border-gray-200 dark:border-gray-700'}">
                      <Button size="xs" color="primary" class="pointer-events-none">
                        {cta}
                      </Button>
                      <button
                        class="rounded p-1 hover:bg-green-100 dark:hover:bg-green-900/30"
                        onclick={() => approveContent('cta', i, cta)}
                        title="Approve"
                      >
                        <ThumbsUpOutline class="h-4 w-4 {itemStatus === 'approved' ? 'text-green-600' : 'text-gray-400'}" />
                      </button>
                      <button
                        class="rounded p-1 hover:bg-red-100 dark:hover:bg-red-900/30"
                        onclick={() => rejectContent('cta', i, cta)}
                        title="Reject"
                      >
                        <ThumbsDownOutline class="h-4 w-4 {itemStatus === 'rejected' ? 'text-red-600' : 'text-gray-400'}" />
                      </button>
                    </div>
                  {/each}
                </div>
              {/if}
            </Card>
          {/if}
        </div>
      </TabItem>

      <!-- Keyword Preferences Tab -->
      <TabItem title="Keywords">
        <div class="mt-4 grid gap-6 md:grid-cols-2">
          <!-- Preferred Terms -->
          <Card class="p-5">
            <div class="mb-4 flex items-center gap-2">
              <CheckOutline class="h-5 w-5 text-green-600 dark:text-green-400" />
              <h3 class="text-lg font-semibold text-gray-900 dark:text-white">Preferred Terms</h3>
            </div>
            <p class="mb-4 text-sm text-gray-500 dark:text-gray-400">
              Words and phrases to use in your marketing content
            </p>

            {#if data.voiceProfile.preferredTerms && data.voiceProfile.preferredTerms.length > 0}
              <div class="flex flex-wrap gap-2">
                {#each data.voiceProfile.preferredTerms as term}
                  <Badge color="green" large>{term}</Badge>
                {/each}
              </div>
            {:else}
              <p class="py-4 text-center text-gray-400 dark:text-gray-500">
                No preferred terms defined yet.
              </p>
            {/if}
          </Card>

          <!-- Avoid Terms -->
          <Card class="p-5">
            <div class="mb-4 flex items-center gap-2">
              <CloseOutline class="h-5 w-5 text-red-600 dark:text-red-400" />
              <h3 class="text-lg font-semibold text-gray-900 dark:text-white">Terms to Avoid</h3>
            </div>
            <p class="mb-4 text-sm text-gray-500 dark:text-gray-400">
              Words and phrases to exclude from your content
            </p>

            {#if data.voiceProfile.avoidTerms && data.voiceProfile.avoidTerms.length > 0}
              <div class="flex flex-wrap gap-2">
                {#each data.voiceProfile.avoidTerms as term}
                  <Badge color="red" large>{term}</Badge>
                {/each}
              </div>
            {:else}
              <p class="py-4 text-center text-gray-400 dark:text-gray-500">
                No terms to avoid defined yet.
              </p>
            {/if}
          </Card>
        </div>
      </TabItem>

      <!-- Sources Tab -->
      <TabItem title="Sources">
        <div class="mt-4 space-y-4">
          {#if data.sources.length === 0}
            <Card class="p-8 text-center">
              <FileLinesOutline class="mx-auto h-12 w-12 text-gray-400" />
              <p class="mt-4 text-gray-500 dark:text-gray-400">
                No source materials analyzed yet.
              </p>
            </Card>
          {:else}
            {#each data.sources as source}
              {@const typeConfig = sourceTypeConfig[source.type] || sourceTypeConfig.document}
              {@const SourceIcon = typeConfig.icon}
              <Card class="p-5">
                <div class="flex items-start gap-4">
                  <div class="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-700">
                    <SourceIcon class="h-5 w-5 text-gray-600 dark:text-gray-400" />
                  </div>
                  <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-2">
                      <Badge color="gray">{typeConfig.label}</Badge>
                      {#if source.processedAt}
                        <Badge color="green">Processed</Badge>
                      {:else}
                        <Badge color="yellow">Pending</Badge>
                      {/if}
                    </div>

                    {#if source.url}
                      <a
                        href={source.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        class="mt-2 block truncate text-primary-600 hover:underline dark:text-primary-400"
                      >
                        {source.url}
                      </a>
                    {/if}

                    {#if source.fileName}
                      <p class="mt-2 text-gray-900 dark:text-white">
                        {source.fileName}
                        {#if source.fileSize}
                          <span class="text-sm text-gray-500 dark:text-gray-400">
                            ({formatFileSize(source.fileSize)})
                          </span>
                        {/if}
                      </p>
                    {/if}

                    {#if source.analysisNotes}
                      <p class="mt-2 text-sm text-gray-600 dark:text-gray-400">
                        {source.analysisNotes}
                      </p>
                    {/if}

                    <p class="mt-2 text-xs text-gray-500 dark:text-gray-400">
                      Added {formatDate(source.createdAt, 'medium')}
                      {#if source.processedAt}
                        - Processed {formatDate(source.processedAt, 'medium')}
                      {/if}
                    </p>
                  </div>
                </div>
              </Card>
            {/each}
          {/if}
        </div>
      </TabItem>
    </Tabs>
  {/if}
</div>

<!-- Brand Analysis Modal -->
<Modal title="Analyze Your Brand Voice" bind:open={showAnalyzeModal} size="lg" outsideclose>
  <form
    method="POST"
    action="?/analyzeBrand"
    use:enhance={() => {
      isSubmitting = true;
      return async ({ update }) => {
        await update();
        isSubmitting = false;
        if (form?.success) {
          resetAnalysisForm();
        }
      };
    }}
  >
    <p class="mb-6 text-sm text-gray-600 dark:text-gray-400">
      Enter your online presence URLs. Our AI will analyze the content to extract your unique brand voice.
      At least one source is required.
    </p>

    <div class="space-y-5">
      <div>
        <Label for="websiteUrl" class="mb-2">Website URL</Label>
        <Input
          id="websiteUrl"
          name="websiteUrl"
          type="url"
          bind:value={websiteUrl}
          placeholder="https://www.yourpractice.com"
        />
        <Helper class="mt-1">Your practice homepage or about page</Helper>
      </div>

      <div>
        <Label for="facebookUrl" class="mb-2">Facebook Page URL (optional)</Label>
        <Input
          id="facebookUrl"
          name="facebookUrl"
          type="url"
          bind:value={facebookUrl}
          placeholder="https://www.facebook.com/yourpractice"
        />
      </div>

      <div>
        <Label for="instagramUrl" class="mb-2">Instagram Profile URL (optional)</Label>
        <Input
          id="instagramUrl"
          name="instagramUrl"
          type="url"
          bind:value={instagramUrl}
          placeholder="https://www.instagram.com/yourpractice"
        />
      </div>

      <div>
        <Label for="googleBusinessUrl" class="mb-2">Google Business URL (optional)</Label>
        <Input
          id="googleBusinessUrl"
          name="googleBusinessUrl"
          type="url"
          bind:value={googleBusinessUrl}
          placeholder="https://business.google.com/..."
        />
      </div>
    </div>

    <div class="mt-8 flex justify-end gap-3">
      <Button color="light" onclick={() => { showAnalyzeModal = false; resetAnalysisForm(); }}>
        Cancel
      </Button>
      <Button type="submit" color="primary" disabled={isSubmitting || (!websiteUrl && !facebookUrl && !instagramUrl && !googleBusinessUrl)}>
        {#if isSubmitting}
          <Spinner size="4" class="mr-2" />
          Analyzing...
        {:else}
          <SparklesOutline class="mr-2 h-4 w-4" />
          Start Analysis
        {/if}
      </Button>
    </div>
  </form>
</Modal>

<!-- Voice Adjustments Modal -->
{#if data.voiceProfile}
  <Modal title="Adjust Voice Parameters" bind:open={showAdjustmentsModal} size="md" outsideclose>
    <form
      method="POST"
      action="?/updateAdjustments"
      use:enhance={() => {
        isSubmitting = true;
        return async ({ update }) => {
          await update();
          isSubmitting = false;
        };
      }}
    >
      <input type="hidden" name="profileId" value={data.voiceProfile.id} />

      <div class="space-y-6">
        <div>
          <Label for="formalityLevel" class="mb-2">Formality Level</Label>
          <Select
            id="formalityLevel"
            name="formalityLevel"
            bind:value={adjustedFormalityLevel}
            items={[
              { value: 'formal', name: 'Formal - Professional, corporate tone' },
              { value: 'professional', name: 'Professional - Business-appropriate, clear' },
              { value: 'casual', name: 'Casual - Relaxed, conversational' },
              { value: 'friendly', name: 'Friendly - Warm, approachable' }
            ]}
          />
        </div>

        <div>
          <Label for="preferredTerms" class="mb-2">Preferred Terms</Label>
          <Textarea
            id="preferredTerms"
            name="preferredTerms"
            bind:value={adjustedPreferredTerms}
            rows={3}
            placeholder="Enter terms separated by commas (e.g., implant specialist, comfortable, pain-free)"
          />
          <Helper class="mt-1">Comma-separated list of words/phrases to include in content</Helper>
        </div>

        <div>
          <Label for="avoidTerms" class="mb-2">Terms to Avoid</Label>
          <Textarea
            id="avoidTerms"
            name="avoidTerms"
            bind:value={adjustedAvoidTerms}
            rows={3}
            placeholder="Enter terms separated by commas (e.g., cheap, discount, painful)"
          />
          <Helper class="mt-1">Comma-separated list of words/phrases to exclude from content</Helper>
        </div>
      </div>

      <div class="mt-6 flex justify-end gap-3">
        <Button color="light" onclick={() => (showAdjustmentsModal = false)}>Cancel</Button>
        <Button type="submit" disabled={isSubmitting}>
          {#if isSubmitting}
            <Spinner size="4" class="mr-2" />
            Saving...
          {:else}
            Save Changes
          {/if}
        </Button>
      </div>
    </form>
  </Modal>

  <!-- Request Regeneration Modal -->
  <Modal title="Request Voice Profile Update" bind:open={showRegenModal} size="md" outsideclose>
    <form
      method="POST"
      action="?/requestRegeneration"
      use:enhance={() => {
        isSubmitting = true;
        return async ({ update }) => {
          await update();
          isSubmitting = false;
        };
      }}
    >
      <input type="hidden" name="profileId" value={data.voiceProfile.id} />

      <p class="mb-4 text-sm text-gray-600 dark:text-gray-400">
        Request our team to review and update your brand voice profile. Provide any feedback or
        specific changes you'd like to see.
      </p>

      <div>
        <Label for="feedback" class="mb-2">Feedback & Requested Changes</Label>
        <Textarea
          id="feedback"
          name="feedback"
          rows={5}
          placeholder="Describe what you'd like to change about your voice profile..."
        />
      </div>

      <div class="mt-6 flex justify-end gap-3">
        <Button color="light" onclick={() => (showRegenModal = false)}>Cancel</Button>
        <Button type="submit" disabled={isSubmitting}>
          {#if isSubmitting}
            <Spinner size="4" class="mr-2" />
            Submitting...
          {:else}
            Submit Request
          {/if}
        </Button>
      </div>
    </form>
  </Modal>
{/if}
