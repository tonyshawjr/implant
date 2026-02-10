<script lang="ts">
  import type { PageData, ActionData } from './$types';
  import { enhance } from '$app/forms';

  let { data, form }: { data: PageData; form: ActionData } = $props();

  // Local state
  let activeTab = $state<'profile' | 'samples' | 'adjustments'>('profile');
  let showRegenerationModal = $state(false);
  let regenerationFeedback = $state('');
  let isSubmitting = $state(false);

  // Sample content feedback state
  let feedbackStates = $state<Record<string, 'approved' | 'rejected' | null>>({});

  // Helper functions
  function getStatusBadgeClass(status: string | null): string {
    switch (status) {
      case 'approved':
        return 'badge-success';
      case 'in_review':
        return 'badge-primary';
      case 'analyzing':
        return 'badge-warning';
      case 'rejected':
        return 'badge-danger';
      default:
        return 'badge-gray';
    }
  }

  function getStatusLabel(status: string | null): string {
    switch (status) {
      case 'approved':
        return 'Approved';
      case 'in_review':
        return 'In Review';
      case 'analyzing':
        return 'Analyzing';
      case 'rejected':
        return 'Rejected';
      case 'pending':
        return 'Pending';
      default:
        return 'Not Started';
    }
  }

  function getFormalityLabel(level: string | null): string {
    switch (level) {
      case 'formal':
        return 'Formal';
      case 'professional':
        return 'Professional';
      case 'casual':
        return 'Casual';
      case 'friendly':
        return 'Friendly';
      default:
        return 'Professional';
    }
  }

  function getFormalityValue(level: string | null): number {
    switch (level) {
      case 'formal':
        return 5;
      case 'professional':
        return 4;
      case 'casual':
        return 2;
      case 'friendly':
        return 3;
      default:
        return 3;
    }
  }

  function formatDate(dateString: string | null): string {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  }

  function handleFeedback(contentType: string, index: number, action: 'approve' | 'reject') {
    const key = `${contentType}-${index}`;
    feedbackStates[key] = action === 'approve' ? 'approved' : 'rejected';
  }

  function getFeedbackState(contentType: string, index: number): 'approved' | 'rejected' | null {
    return feedbackStates[`${contentType}-${index}`] || null;
  }
</script>

<svelte:head>
  <title>Brand Voice - Implant Lead Engine</title>
</svelte:head>

<!-- Page Header -->
<div class="page-header">
  <div class="page-header-content">
    <h1 class="page-title">Brand Voice</h1>
    <p class="page-subtitle">Your AI-generated brand voice profile and content preferences</p>
  </div>
  {#if data.voiceProfile && data.voiceProfile.status === 'in_review'}
    <form method="POST" action="?/approveProfile" use:enhance>
      <input type="hidden" name="profileId" value={data.voiceProfile.id} />
      <button type="submit" class="btn btn-success">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="20 6 9 17 4 12" />
        </svg>
        Approve Profile
      </button>
    </form>
  {/if}
</div>

<!-- Success/Error Messages -->
{#if form?.success}
  <div class="alert alert-success">
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
    <span>{form.message || 'Action completed successfully!'}</span>
  </div>
{/if}

{#if form?.message && !form.success}
  <div class="alert alert-error">
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <circle cx="12" cy="12" r="10" />
      <line x1="15" y1="9" x2="9" y2="15" />
      <line x1="9" y1="9" x2="15" y2="15" />
    </svg>
    <span>{form.message}</span>
  </div>
{/if}

<!-- Tabs Navigation -->
<div class="tabs">
  <button
    class="tab"
    class:active={activeTab === 'profile'}
    onclick={() => (activeTab = 'profile')}
  >
    Voice Profile
  </button>
  <button
    class="tab"
    class:active={activeTab === 'samples'}
    onclick={() => (activeTab = 'samples')}
  >
    Sample Content
  </button>
  <button
    class="tab"
    class:active={activeTab === 'adjustments'}
    onclick={() => (activeTab = 'adjustments')}
  >
    Adjustments
  </button>
</div>

<!-- Profile Tab -->
{#if activeTab === 'profile'}
  <div class="grid grid-cols-3 gap-6">
    <!-- Main Profile Card -->
    <div class="col-span-2">
      <div class="card">
        <div class="card-header">
          <div>
            <h2 class="card-title">{data.voiceProfile?.name || 'Brand Voice Profile'}</h2>
            <p class="card-subtitle">AI-analyzed voice characteristics for your brand</p>
          </div>
          <span class="badge {getStatusBadgeClass(data.voiceProfile?.status || null)}">
            {getStatusLabel(data.voiceProfile?.status || null)}
          </span>
        </div>

        <div class="card-body">
          {#if data.voiceProfile}
            <!-- Quality Score -->
            {#if data.voiceProfile.qualityScore}
              <div class="quality-score-section">
                <div class="quality-score-header">
                  <span class="text-sm font-medium text-gray-700">Profile Quality Score</span>
                  <span class="quality-score-value">{data.voiceProfile.qualityScore}%</span>
                </div>
                <div class="progress-bar">
                  <div
                    class="progress-bar-fill {data.voiceProfile.qualityScore >= 80 ? 'success' : data.voiceProfile.qualityScore >= 60 ? 'warning' : 'danger'}"
                    style="width: {data.voiceProfile.qualityScore}%"
                  ></div>
                </div>
              </div>
            {/if}

            <!-- Voice Characteristics Grid -->
            <div class="voice-grid">
              <!-- Tone -->
              <div class="voice-item">
                <div class="voice-item-icon primary">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                    <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                    <line x1="12" y1="19" x2="12" y2="23" />
                    <line x1="8" y1="23" x2="16" y2="23" />
                  </svg>
                </div>
                <div class="voice-item-content">
                  <span class="voice-item-label">Tone</span>
                  <span class="voice-item-value">{data.voiceProfile.tone || 'Not analyzed'}</span>
                </div>
              </div>

              <!-- Personality -->
              <div class="voice-item">
                <div class="voice-item-icon success">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10" />
                    <path d="M8 14s1.5 2 4 2 4-2 4-2" />
                    <line x1="9" y1="9" x2="9.01" y2="9" />
                    <line x1="15" y1="9" x2="15.01" y2="9" />
                  </svg>
                </div>
                <div class="voice-item-content">
                  <span class="voice-item-label">Personality</span>
                  <span class="voice-item-value">{data.voiceProfile.personality || 'Not analyzed'}</span>
                </div>
              </div>

              <!-- Formality -->
              <div class="voice-item">
                <div class="voice-item-icon warning">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                    <line x1="3" y1="9" x2="21" y2="9" />
                    <line x1="9" y1="21" x2="9" y2="9" />
                  </svg>
                </div>
                <div class="voice-item-content">
                  <span class="voice-item-label">Formality</span>
                  <span class="voice-item-value">{getFormalityLabel(data.voiceProfile.formalityLevel)}</span>
                </div>
              </div>

              <!-- Target Audience -->
              <div class="voice-item">
                <div class="voice-item-icon danger">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                  </svg>
                </div>
                <div class="voice-item-content">
                  <span class="voice-item-label">Target Audience</span>
                  <span class="voice-item-value">{data.voiceProfile.targetAudience || 'Not defined'}</span>
                </div>
              </div>
            </div>

            <!-- Key Differentiators -->
            {#if data.voiceProfile.keyDifferentiators && data.voiceProfile.keyDifferentiators.length > 0}
              <div class="section-block">
                <h3 class="section-title">Key Differentiators</h3>
                <div class="tag-list">
                  {#each data.voiceProfile.keyDifferentiators as diff}
                    <span class="badge badge-primary">{diff}</span>
                  {/each}
                </div>
              </div>
            {/if}

            <!-- Preferred Terms -->
            {#if data.voiceProfile.preferredTerms && data.voiceProfile.preferredTerms.length > 0}
              <div class="section-block">
                <h3 class="section-title">Preferred Terms</h3>
                <div class="tag-list">
                  {#each data.voiceProfile.preferredTerms as term}
                    <span class="badge badge-success">{term}</span>
                  {/each}
                </div>
              </div>
            {/if}

            <!-- Terms to Avoid -->
            {#if data.voiceProfile.avoidTerms && data.voiceProfile.avoidTerms.length > 0}
              <div class="section-block">
                <h3 class="section-title">Terms to Avoid</h3>
                <div class="tag-list">
                  {#each data.voiceProfile.avoidTerms as term}
                    <span class="badge badge-danger">{term}</span>
                  {/each}
                </div>
              </div>
            {/if}

            <!-- Rejection Reason (if rejected) -->
            {#if data.voiceProfile.status === 'rejected' && data.voiceProfile.rejectionReason}
              <div class="rejection-notice">
                <div class="rejection-icon">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                </div>
                <div>
                  <strong>Rejection Reason:</strong>
                  <p>{data.voiceProfile.rejectionReason}</p>
                </div>
              </div>
            {/if}
          {:else}
            <!-- Empty State -->
            <div class="empty-state">
              <div class="empty-state-icon">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                  <line x1="12" y1="19" x2="12" y2="23" />
                  <line x1="8" y1="23" x2="16" y2="23" />
                </svg>
              </div>
              <h3 class="empty-state-title">No Voice Profile Yet</h3>
              <p class="empty-state-description">
                Add your website and social media URLs below to generate your AI brand voice profile.
              </p>
            </div>
          {/if}
        </div>

        {#if data.voiceProfile}
          <div class="card-footer">
            <div class="flex items-center gap-4 text-sm text-gray-500">
              {#if data.voiceProfile.approvedBy}
                <span>Approved by {data.voiceProfile.approvedBy} on {formatDate(data.voiceProfile.approvedAt)}</span>
              {:else}
                <span>Created {formatDate(data.voiceProfile.createdAt)}</span>
              {/if}
            </div>
            <button class="btn btn-outline" onclick={() => (showRegenerationModal = true)}>
              Request Changes
            </button>
          </div>
        {/if}
      </div>

      <!-- Brand Analysis Form (if no profile) -->
      {#if !data.voiceProfile || data.voiceProfile.status === 'pending'}
        <div class="card mt-6">
          <div class="card-header">
            <h2 class="card-title">Analyze Your Brand</h2>
            <p class="card-subtitle">Provide URLs to generate your voice profile</p>
          </div>
          <div class="card-body">
            <form method="POST" action="?/analyzeBrand" use:enhance={() => {
              isSubmitting = true;
              return async ({ update }) => {
                await update();
                isSubmitting = false;
              };
            }}>
              <div class="form-grid">
                <div class="form-group">
                  <label class="form-label" for="websiteUrl">Website URL</label>
                  <input
                    type="url"
                    id="websiteUrl"
                    name="websiteUrl"
                    class="form-input"
                    placeholder="https://yourpractice.com"
                  />
                </div>
                <div class="form-group">
                  <label class="form-label" for="facebookUrl">Facebook Page URL</label>
                  <input
                    type="url"
                    id="facebookUrl"
                    name="facebookUrl"
                    class="form-input"
                    placeholder="https://facebook.com/yourpractice"
                  />
                </div>
                <div class="form-group">
                  <label class="form-label" for="instagramUrl">Instagram URL</label>
                  <input
                    type="url"
                    id="instagramUrl"
                    name="instagramUrl"
                    class="form-input"
                    placeholder="https://instagram.com/yourpractice"
                  />
                </div>
                <div class="form-group">
                  <label class="form-label" for="googleBusinessUrl">Google Business URL</label>
                  <input
                    type="url"
                    id="googleBusinessUrl"
                    name="googleBusinessUrl"
                    class="form-input"
                    placeholder="https://g.page/yourpractice"
                  />
                </div>
              </div>
              <div class="mt-4">
                <button type="submit" class="btn btn-primary" disabled={isSubmitting}>
                  {#if isSubmitting}
                    <svg class="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <circle cx="12" cy="12" r="10" stroke-dasharray="60" stroke-dashoffset="20" />
                    </svg>
                    Analyzing...
                  {:else}
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <circle cx="11" cy="11" r="8" />
                      <line x1="21" y1="21" x2="16.65" y2="16.65" />
                    </svg>
                    Analyze Brand Voice
                  {/if}
                </button>
              </div>
            </form>
          </div>
        </div>
      {/if}
    </div>

    <!-- Sidebar -->
    <div class="col-span-1">
      <!-- Profile Timeline -->
      <div class="card">
        <div class="card-header">
          <h3 class="card-title">Profile Timeline</h3>
        </div>
        <div class="card-body">
          <div class="timeline">
            <div class="timeline-item {data.voiceProfile ? 'completed' : 'pending'}">
              <div class="timeline-dot"></div>
              <div class="timeline-content">
                <span class="timeline-title">Profile Created</span>
                <span class="timeline-date">{data.voiceProfile ? formatDate(data.voiceProfile.createdAt) : 'Pending'}</span>
              </div>
            </div>
            <div class="timeline-item {data.voiceProfile?.analysisStartedAt ? 'completed' : 'pending'}">
              <div class="timeline-dot"></div>
              <div class="timeline-content">
                <span class="timeline-title">Analysis Started</span>
                <span class="timeline-date">{data.voiceProfile?.analysisStartedAt ? formatDate(data.voiceProfile.analysisStartedAt) : 'Pending'}</span>
              </div>
            </div>
            <div class="timeline-item {data.voiceProfile?.analysisCompletedAt ? 'completed' : 'pending'}">
              <div class="timeline-dot"></div>
              <div class="timeline-content">
                <span class="timeline-title">Analysis Complete</span>
                <span class="timeline-date">{data.voiceProfile?.analysisCompletedAt ? formatDate(data.voiceProfile.analysisCompletedAt) : 'Pending'}</span>
              </div>
            </div>
            <div class="timeline-item {data.voiceProfile?.status === 'approved' ? 'completed' : 'pending'}">
              <div class="timeline-dot"></div>
              <div class="timeline-content">
                <span class="timeline-title">Profile Approved</span>
                <span class="timeline-date">{data.voiceProfile?.approvedAt ? formatDate(data.voiceProfile.approvedAt) : 'Pending'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Sources Used -->
      {#if data.sources && data.sources.length > 0}
        <div class="card mt-6">
          <div class="card-header">
            <h3 class="card-title">Sources Analyzed</h3>
          </div>
          <div class="card-body">
            <div class="sources-list">
              {#each data.sources as source}
                <div class="source-item">
                  <div class="source-icon {source.type}">
                    {#if source.type === 'website'}
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="12" cy="12" r="10" />
                        <line x1="2" y1="12" x2="22" y2="12" />
                        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                      </svg>
                    {:else if source.type === 'facebook'}
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
                      </svg>
                    {:else if source.type === 'instagram'}
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                        <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                        <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
                      </svg>
                    {:else}
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                        <circle cx="12" cy="10" r="3" />
                      </svg>
                    {/if}
                  </div>
                  <div class="source-info">
                    <span class="source-type">{source.type}</span>
                    <a href={source.url} target="_blank" rel="noopener noreferrer" class="source-url truncate">
                      {source.url}
                    </a>
                  </div>
                  {#if source.processedAt}
                    <span class="badge badge-success badge-sm">Processed</span>
                  {/if}
                </div>
              {/each}
            </div>
          </div>
        </div>
      {/if}
    </div>
  </div>
{/if}

<!-- Samples Tab -->
{#if activeTab === 'samples'}
  <div class="card">
    <div class="card-header">
      <div>
        <h2 class="card-title">Sample Content</h2>
        <p class="card-subtitle">AI-generated content examples based on your brand voice</p>
      </div>
      {#if data.voiceProfile && data.voiceProfile.status !== 'pending'}
        <form method="POST" action="?/generateContent" use:enhance={() => {
          isSubmitting = true;
          return async ({ update }) => {
            await update();
            isSubmitting = false;
          };
        }}>
          <input type="hidden" name="profileId" value={data.voiceProfile.id} />
          <button type="submit" class="btn btn-primary" disabled={isSubmitting}>
            {#if isSubmitting}
              <svg class="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10" stroke-dasharray="60" stroke-dashoffset="20" />
              </svg>
              Generating...
            {:else}
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              Generate New Content
            {/if}
          </button>
        </form>
      {/if}
    </div>
    <div class="card-body">
      {#if data.sampleContent && (data.sampleContent.headlines.length > 0 || data.sampleContent.adCopy.length > 0 || data.sampleContent.ctas.length > 0)}
        <!-- Headlines -->
        {#if data.sampleContent.headlines.length > 0}
          <div class="sample-section">
            <h3 class="sample-section-title">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M4 7V4h16v3" />
                <path d="M9 20h6" />
                <path d="M12 4v16" />
              </svg>
              Headlines
            </h3>
            <div class="sample-grid">
              {#each data.sampleContent.headlines as headline, i}
                <div class="sample-card {getFeedbackState('headline', i)}">
                  <p class="sample-text">{headline}</p>
                  <div class="sample-actions">
                    <form method="POST" action="?/approveForLearning" use:enhance>
                      <input type="hidden" name="profileId" value={data.voiceProfile?.id} />
                      <input type="hidden" name="contentType" value="headline" />
                      <input type="hidden" name="content" value={headline} />
                      <button
                        type="submit"
                        class="sample-action-btn approve"
                        onclick={() => handleFeedback('headline', i, 'approve')}
                        disabled={getFeedbackState('headline', i) !== null}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      </button>
                    </form>
                    <form method="POST" action="?/rejectForLearning" use:enhance>
                      <input type="hidden" name="profileId" value={data.voiceProfile?.id} />
                      <input type="hidden" name="contentType" value="headline" />
                      <input type="hidden" name="content" value={headline} />
                      <button
                        type="submit"
                        class="sample-action-btn reject"
                        onclick={() => handleFeedback('headline', i, 'reject')}
                        disabled={getFeedbackState('headline', i) !== null}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <line x1="18" y1="6" x2="6" y2="18" />
                          <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                      </button>
                    </form>
                  </div>
                </div>
              {/each}
            </div>
          </div>
        {/if}

        <!-- Ad Copy -->
        {#if data.sampleContent.adCopy.length > 0}
          <div class="sample-section">
            <h3 class="sample-section-title">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
                <polyline points="10 9 9 9 8 9" />
              </svg>
              Ad Copy
            </h3>
            <div class="sample-list">
              {#each data.sampleContent.adCopy as copy, i}
                <div class="sample-card large {getFeedbackState('ad_copy', i)}">
                  <p class="sample-text">{copy}</p>
                  <div class="sample-actions">
                    <form method="POST" action="?/approveForLearning" use:enhance>
                      <input type="hidden" name="profileId" value={data.voiceProfile?.id} />
                      <input type="hidden" name="contentType" value="ad_copy" />
                      <input type="hidden" name="content" value={copy} />
                      <button
                        type="submit"
                        class="sample-action-btn approve"
                        onclick={() => handleFeedback('ad_copy', i, 'approve')}
                        disabled={getFeedbackState('ad_copy', i) !== null}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                        Approve
                      </button>
                    </form>
                    <form method="POST" action="?/rejectForLearning" use:enhance>
                      <input type="hidden" name="profileId" value={data.voiceProfile?.id} />
                      <input type="hidden" name="contentType" value="ad_copy" />
                      <input type="hidden" name="content" value={copy} />
                      <button
                        type="submit"
                        class="sample-action-btn reject"
                        onclick={() => handleFeedback('ad_copy', i, 'reject')}
                        disabled={getFeedbackState('ad_copy', i) !== null}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <line x1="18" y1="6" x2="6" y2="18" />
                          <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                        Reject
                      </button>
                    </form>
                  </div>
                </div>
              {/each}
            </div>
          </div>
        {/if}

        <!-- CTAs -->
        {#if data.sampleContent.ctas.length > 0}
          <div class="sample-section">
            <h3 class="sample-section-title">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                <line x1="9" y1="12" x2="15" y2="12" />
              </svg>
              Calls to Action
            </h3>
            <div class="cta-grid">
              {#each data.sampleContent.ctas as cta, i}
                <div class="cta-card {getFeedbackState('cta', i)}">
                  <span class="cta-text">{cta}</span>
                  <div class="sample-actions">
                    <form method="POST" action="?/approveForLearning" use:enhance>
                      <input type="hidden" name="profileId" value={data.voiceProfile?.id} />
                      <input type="hidden" name="contentType" value="cta" />
                      <input type="hidden" name="content" value={cta} />
                      <button
                        type="submit"
                        class="sample-action-btn approve small"
                        onclick={() => handleFeedback('cta', i, 'approve')}
                        disabled={getFeedbackState('cta', i) !== null}
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      </button>
                    </form>
                    <form method="POST" action="?/rejectForLearning" use:enhance>
                      <input type="hidden" name="profileId" value={data.voiceProfile?.id} />
                      <input type="hidden" name="contentType" value="cta" />
                      <input type="hidden" name="content" value={cta} />
                      <button
                        type="submit"
                        class="sample-action-btn reject small"
                        onclick={() => handleFeedback('cta', i, 'reject')}
                        disabled={getFeedbackState('cta', i) !== null}
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <line x1="18" y1="6" x2="6" y2="18" />
                          <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                      </button>
                    </form>
                  </div>
                </div>
              {/each}
            </div>
          </div>
        {/if}
      {:else}
        <div class="empty-state">
          <div class="empty-state-icon">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
            </svg>
          </div>
          <h3 class="empty-state-title">No Sample Content Yet</h3>
          <p class="empty-state-description">
            {#if data.voiceProfile}
              Click "Generate New Content" to create AI-generated content samples based on your brand voice.
            {:else}
              Complete your voice profile first to generate sample content.
            {/if}
          </p>
        </div>
      {/if}
    </div>
  </div>
{/if}

<!-- Adjustments Tab -->
{#if activeTab === 'adjustments'}
  <div class="card">
    <div class="card-header">
      <div>
        <h2 class="card-title">Voice Adjustments</h2>
        <p class="card-subtitle">Fine-tune your brand voice preferences</p>
      </div>
    </div>
    <div class="card-body">
      {#if data.voiceProfile}
        <form method="POST" action="?/updateAdjustments" use:enhance={() => {
          isSubmitting = true;
          return async ({ update }) => {
            await update();
            isSubmitting = false;
          };
        }}>
          <input type="hidden" name="profileId" value={data.voiceProfile.id} />

          <div class="adjustments-grid">
            <!-- Formality Level -->
            <div class="adjustment-card">
              <div class="adjustment-header">
                <h4 class="adjustment-title">Formality Level</h4>
                <span class="adjustment-value">{getFormalityLabel(data.voiceProfile.formalityLevel)}</span>
              </div>
              <div class="adjustment-control">
                <select name="formalityLevel" class="form-input form-select">
                  <option value="casual" selected={data.voiceProfile.formalityLevel === 'casual'}>Casual</option>
                  <option value="friendly" selected={data.voiceProfile.formalityLevel === 'friendly'}>Friendly</option>
                  <option value="professional" selected={data.voiceProfile.formalityLevel === 'professional'}>Professional</option>
                  <option value="formal" selected={data.voiceProfile.formalityLevel === 'formal'}>Formal</option>
                </select>
              </div>
              <p class="adjustment-description">
                Controls the overall tone from casual and conversational to formal and authoritative.
              </p>
            </div>

            <!-- Preferred Terms -->
            <div class="adjustment-card full-width">
              <div class="adjustment-header">
                <h4 class="adjustment-title">Preferred Terms</h4>
              </div>
              <div class="adjustment-control">
                <input
                  type="text"
                  name="preferredTerms"
                  class="form-input"
                  placeholder="Enter comma-separated terms..."
                  value={data.voiceProfile.preferredTerms?.join(', ') || ''}
                />
              </div>
              <p class="adjustment-description">
                Words and phrases that should be used in your content. Separate multiple terms with commas.
              </p>
            </div>

            <!-- Terms to Avoid -->
            <div class="adjustment-card full-width">
              <div class="adjustment-header">
                <h4 class="adjustment-title">Terms to Avoid</h4>
              </div>
              <div class="adjustment-control">
                <input
                  type="text"
                  name="avoidTerms"
                  class="form-input"
                  placeholder="Enter comma-separated terms..."
                  value={data.voiceProfile.avoidTerms?.join(', ') || ''}
                />
              </div>
              <p class="adjustment-description">
                Words and phrases that should never appear in your content. Separate multiple terms with commas.
              </p>
            </div>
          </div>

          <div class="mt-6 flex gap-3">
            <button type="submit" class="btn btn-primary" disabled={isSubmitting}>
              {#if isSubmitting}
                Saving...
              {:else}
                Save Adjustments
              {/if}
            </button>
            <button type="button" class="btn btn-outline" onclick={() => (showRegenerationModal = true)}>
              Request Profile Regeneration
            </button>
          </div>
        </form>
      {:else}
        <div class="empty-state">
          <div class="empty-state-icon">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </div>
          <h3 class="empty-state-title">No Voice Profile to Adjust</h3>
          <p class="empty-state-description">
            Create your brand voice profile first, then you can fine-tune the settings here.
          </p>
        </div>
      {/if}
    </div>
  </div>
{/if}

<!-- Regeneration Request Modal -->
{#if showRegenerationModal}
  <div class="modal-overlay open" onclick={() => (showRegenerationModal = false)}>
    <div class="modal" onclick={(e) => e.stopPropagation()}>
      <div class="modal-header">
        <h3 class="modal-title">Request Profile Changes</h3>
        <button class="modal-close" onclick={() => (showRegenerationModal = false)}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
      <form method="POST" action="?/requestRegeneration" use:enhance={() => {
        isSubmitting = true;
        return async ({ update }) => {
          await update();
          isSubmitting = false;
          showRegenerationModal = false;
        };
      }}>
        <div class="modal-body">
          <input type="hidden" name="profileId" value={data.voiceProfile?.id} />
          <div class="form-group">
            <label class="form-label" for="feedback">
              What would you like changed about your brand voice profile?
            </label>
            <textarea
              id="feedback"
              name="feedback"
              class="form-input"
              rows="4"
              placeholder="Describe what you'd like adjusted, e.g., 'Make the tone more casual' or 'Include more emphasis on technology'..."
              bind:value={regenerationFeedback}
            ></textarea>
          </div>
          <p class="text-sm text-gray-500">
            Our team will review your request and update your voice profile accordingly. You'll be notified when the changes are ready for review.
          </p>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" onclick={() => (showRegenerationModal = false)}>
            Cancel
          </button>
          <button type="submit" class="btn btn-primary" disabled={isSubmitting}>
            {#if isSubmitting}
              Submitting...
            {:else}
              Submit Request
            {/if}
          </button>
        </div>
      </form>
    </div>
  </div>
{/if}

<style>
  /* Page Header */
  .page-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: var(--spacing-6);
  }

  .page-title {
    font-size: 1.5rem;
    font-weight: 700;
    color: var(--gray-900);
  }

  .page-subtitle {
    font-size: 0.875rem;
    color: var(--gray-500);
    margin-top: var(--spacing-1);
  }

  /* Alerts */
  .alert {
    display: flex;
    align-items: center;
    gap: var(--spacing-3);
    padding: var(--spacing-4);
    border-radius: var(--radius-lg);
    margin-bottom: var(--spacing-6);
  }

  .alert-success {
    background: var(--success-50);
    color: var(--success-700);
    border: 1px solid var(--success-100);
  }

  .alert-error {
    background: var(--danger-50);
    color: var(--danger-600);
    border: 1px solid var(--danger-100);
  }

  /* Grid Layouts */
  .grid-cols-3 {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: var(--spacing-6);
  }

  .col-span-2 {
    grid-column: span 2;
  }

  .col-span-1 {
    grid-column: span 1;
  }

  @media (max-width: 1024px) {
    .grid-cols-3 {
      grid-template-columns: 1fr;
    }

    .col-span-2,
    .col-span-1 {
      grid-column: span 1;
    }
  }

  /* Quality Score Section */
  .quality-score-section {
    margin-bottom: var(--spacing-6);
    padding: var(--spacing-4);
    background: var(--gray-50);
    border-radius: var(--radius-lg);
  }

  .quality-score-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: var(--spacing-2);
  }

  .quality-score-value {
    font-size: 1.25rem;
    font-weight: 700;
    color: var(--gray-900);
  }

  /* Voice Grid */
  .voice-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: var(--spacing-4);
    margin-bottom: var(--spacing-6);
  }

  @media (max-width: 640px) {
    .voice-grid {
      grid-template-columns: 1fr;
    }
  }

  .voice-item {
    display: flex;
    align-items: flex-start;
    gap: var(--spacing-3);
    padding: var(--spacing-4);
    background: var(--gray-50);
    border-radius: var(--radius-lg);
  }

  .voice-item-icon {
    width: 40px;
    height: 40px;
    border-radius: var(--radius-lg);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .voice-item-icon.primary {
    background: var(--primary-100);
    color: var(--primary-600);
  }

  .voice-item-icon.success {
    background: var(--success-100);
    color: var(--success-600);
  }

  .voice-item-icon.warning {
    background: var(--warning-100);
    color: var(--warning-600);
  }

  .voice-item-icon.danger {
    background: var(--danger-100);
    color: var(--danger-600);
  }

  .voice-item-content {
    display: flex;
    flex-direction: column;
  }

  .voice-item-label {
    font-size: 0.75rem;
    color: var(--gray-500);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .voice-item-value {
    font-weight: 600;
    color: var(--gray-900);
    margin-top: 2px;
  }

  /* Section Blocks */
  .section-block {
    margin-bottom: var(--spacing-5);
  }

  .section-title {
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--gray-700);
    margin-bottom: var(--spacing-3);
  }

  .tag-list {
    display: flex;
    flex-wrap: wrap;
    gap: var(--spacing-2);
  }

  /* Rejection Notice */
  .rejection-notice {
    display: flex;
    gap: var(--spacing-3);
    padding: var(--spacing-4);
    background: var(--danger-50);
    border-radius: var(--radius-lg);
    color: var(--danger-700);
    margin-top: var(--spacing-4);
  }

  .rejection-icon {
    flex-shrink: 0;
  }

  /* Timeline */
  .timeline {
    position: relative;
  }

  .timeline-item {
    display: flex;
    gap: var(--spacing-3);
    padding-bottom: var(--spacing-4);
    position: relative;
  }

  .timeline-item:not(:last-child)::before {
    content: '';
    position: absolute;
    left: 5px;
    top: 16px;
    width: 2px;
    height: calc(100% - 8px);
    background: var(--gray-200);
  }

  .timeline-item.completed::before {
    background: var(--success-500);
  }

  .timeline-dot {
    width: 12px;
    height: 12px;
    border-radius: var(--radius-full);
    background: var(--gray-200);
    flex-shrink: 0;
    margin-top: 4px;
  }

  .timeline-item.completed .timeline-dot {
    background: var(--success-500);
  }

  .timeline-content {
    display: flex;
    flex-direction: column;
  }

  .timeline-title {
    font-size: 0.875rem;
    font-weight: 500;
    color: var(--gray-900);
  }

  .timeline-date {
    font-size: 0.75rem;
    color: var(--gray-500);
  }

  /* Sources List */
  .sources-list {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-3);
  }

  .source-item {
    display: flex;
    align-items: center;
    gap: var(--spacing-3);
    padding: var(--spacing-3);
    background: var(--gray-50);
    border-radius: var(--radius-lg);
  }

  .source-icon {
    width: 32px;
    height: 32px;
    border-radius: var(--radius-md);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .source-icon.website {
    background: var(--primary-100);
    color: var(--primary-600);
  }

  .source-icon.facebook {
    background: #e7f3ff;
    color: #1877f2;
  }

  .source-icon.instagram {
    background: #fce7f3;
    color: #e1306c;
  }

  .source-icon.google_business {
    background: var(--warning-100);
    color: var(--warning-600);
  }

  .source-info {
    flex: 1;
    min-width: 0;
  }

  .source-type {
    font-size: 0.75rem;
    text-transform: capitalize;
    color: var(--gray-500);
  }

  .source-url {
    display: block;
    font-size: 0.8125rem;
    color: var(--primary-600);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  /* Form Grid */
  .form-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: var(--spacing-4);
  }

  @media (max-width: 640px) {
    .form-grid {
      grid-template-columns: 1fr;
    }
  }

  /* Sample Content Styles */
  .sample-section {
    margin-bottom: var(--spacing-8);
  }

  .sample-section:last-child {
    margin-bottom: 0;
  }

  .sample-section-title {
    display: flex;
    align-items: center;
    gap: var(--spacing-2);
    font-size: 1rem;
    font-weight: 600;
    color: var(--gray-900);
    margin-bottom: var(--spacing-4);
    padding-bottom: var(--spacing-3);
    border-bottom: 1px solid var(--gray-100);
  }

  .sample-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: var(--spacing-4);
  }

  @media (max-width: 768px) {
    .sample-grid {
      grid-template-columns: 1fr;
    }
  }

  .sample-list {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-4);
  }

  .sample-card {
    padding: var(--spacing-4);
    background: var(--gray-50);
    border-radius: var(--radius-lg);
    border: 1px solid var(--gray-200);
    transition: all 0.2s ease;
  }

  .sample-card.large {
    padding: var(--spacing-5);
  }

  .sample-card.approved {
    background: var(--success-50);
    border-color: var(--success-200);
  }

  .sample-card.rejected {
    background: var(--danger-50);
    border-color: var(--danger-200);
    opacity: 0.7;
  }

  .sample-text {
    font-size: 0.9375rem;
    color: var(--gray-800);
    line-height: 1.6;
    margin-bottom: var(--spacing-3);
  }

  .sample-actions {
    display: flex;
    gap: var(--spacing-2);
    justify-content: flex-end;
  }

  .sample-action-btn {
    display: inline-flex;
    align-items: center;
    gap: var(--spacing-1);
    padding: var(--spacing-2) var(--spacing-3);
    font-size: 0.8125rem;
    font-weight: 500;
    border-radius: var(--radius-md);
    border: none;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .sample-action-btn.small {
    padding: var(--spacing-1) var(--spacing-2);
  }

  .sample-action-btn.approve {
    background: var(--success-100);
    color: var(--success-700);
  }

  .sample-action-btn.approve:hover:not(:disabled) {
    background: var(--success-200);
  }

  .sample-action-btn.reject {
    background: var(--gray-100);
    color: var(--gray-600);
  }

  .sample-action-btn.reject:hover:not(:disabled) {
    background: var(--danger-100);
    color: var(--danger-600);
  }

  .sample-action-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  /* CTA Grid */
  .cta-grid {
    display: flex;
    flex-wrap: wrap;
    gap: var(--spacing-3);
  }

  .cta-card {
    display: flex;
    align-items: center;
    gap: var(--spacing-3);
    padding: var(--spacing-3) var(--spacing-4);
    background: var(--primary-50);
    border: 1px solid var(--primary-200);
    border-radius: var(--radius-lg);
  }

  .cta-card.approved {
    background: var(--success-50);
    border-color: var(--success-200);
  }

  .cta-card.rejected {
    background: var(--gray-100);
    border-color: var(--gray-200);
    opacity: 0.7;
  }

  .cta-text {
    font-weight: 500;
    color: var(--primary-700);
  }

  /* Adjustments */
  .adjustments-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: var(--spacing-4);
  }

  @media (max-width: 768px) {
    .adjustments-grid {
      grid-template-columns: 1fr;
    }
  }

  .adjustment-card {
    padding: var(--spacing-4);
    background: var(--gray-50);
    border-radius: var(--radius-lg);
    border: 1px solid var(--gray-200);
  }

  .adjustment-card.full-width {
    grid-column: span 2;
  }

  @media (max-width: 768px) {
    .adjustment-card.full-width {
      grid-column: span 1;
    }
  }

  .adjustment-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: var(--spacing-3);
  }

  .adjustment-title {
    font-weight: 600;
    color: var(--gray-900);
  }

  .adjustment-value {
    font-size: 0.875rem;
    color: var(--primary-600);
    font-weight: 500;
  }

  .adjustment-control {
    margin-bottom: var(--spacing-2);
  }

  .adjustment-description {
    font-size: 0.8125rem;
    color: var(--gray-500);
  }

  /* Card Footer Override */
  .card-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  /* Badge SM */
  .badge-sm {
    font-size: 0.625rem;
    padding: 2px 6px;
  }

  /* Animation */
  .animate-spin {
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }

  /* Textarea */
  textarea.form-input {
    resize: vertical;
    min-height: 100px;
  }
</style>
