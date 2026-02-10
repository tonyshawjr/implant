<script lang="ts">
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();
</script>

<svelte:head>
  <title>Brand Voice - Implant Lead Engine</title>
</svelte:head>

<div class="page-content">
  <div class="mb-6">
    <h1 class="text-2xl font-bold text-gray-900">Brand Voice Profile</h1>
    <p class="text-gray-500">Your AI-generated brand voice settings and content preferences.</p>
  </div>

  <div class="grid grid-cols-2">
    <!-- Voice Profile Summary -->
    <div class="card">
      <div class="card-header">
        <h2 class="card-title">Voice Profile</h2>
        <span class="badge {data.profile?.status === 'approved' ? 'badge-success' : 'badge-warning'}">
          {data.profile?.status || 'Pending'}
        </span>
      </div>
      <div class="card-body">
        {#if data.profile}
          <div class="mb-4">
            <div class="text-sm text-gray-500 mb-1">Tone</div>
            <div class="font-medium">{data.profile.tone || 'Professional & Friendly'}</div>
          </div>

          <div class="mb-4">
            <div class="text-sm text-gray-500 mb-1">Target Audience</div>
            <div class="font-medium">{data.profile.targetAudience || 'Adults 45-65 considering dental implants'}</div>
          </div>

          <div class="mb-4">
            <div class="text-sm text-gray-500 mb-1">Key Differentiators</div>
            <div class="flex flex-wrap gap-2 mt-2">
              {#each (data.profile.differentiators || ['Experience', 'Technology', 'Care']) as diff}
                <span class="badge badge-primary">{diff}</span>
              {/each}
            </div>
          </div>

          <div class="mb-4">
            <div class="text-sm text-gray-500 mb-1">Messaging Themes</div>
            <ul class="list-disc list-inside text-gray-700 mt-2">
              {#each (data.profile.themes || ['Restore confidence', 'Modern technology', 'Personalized care']) as theme}
                <li>{theme}</li>
              {/each}
            </ul>
          </div>
        {:else}
          <div class="empty-state">
            <p class="text-gray-500">Your brand voice profile is being generated...</p>
          </div>
        {/if}
      </div>
    </div>

    <!-- Content Samples -->
    <div class="card">
      <div class="card-header">
        <h2 class="card-title">Sample Content</h2>
        <button class="btn btn-sm btn-outline">Generate New</button>
      </div>
      <div class="card-body">
        {#if data.samples && data.samples.length > 0}
          <div class="flex flex-col gap-4">
            {#each data.samples as sample}
              <div class="p-4" style="background: var(--gray-50); border-radius: var(--radius-lg);">
                <div class="flex justify-between items-center mb-2">
                  <span class="badge badge-gray">{sample.type}</span>
                  <span class="text-xs text-gray-500">{sample.platform}</span>
                </div>
                <p class="text-gray-700 text-sm">{sample.content}</p>
              </div>
            {/each}
          </div>
        {:else}
          <div class="empty-state">
            <p class="text-gray-500">Sample content will appear here once your voice profile is approved.</p>
          </div>
        {/if}
      </div>
    </div>
  </div>

  <!-- Voice Adjustments -->
  <div class="card mt-6">
    <div class="card-header">
      <h2 class="card-title">Voice Adjustments</h2>
    </div>
    <div class="card-body">
      <p class="text-gray-500 mb-4">Fine-tune your brand voice with these adjustments:</p>

      <div class="grid grid-cols-2 gap-6">
        <div>
          <label class="form-label">Formality Level</label>
          <input type="range" min="1" max="5" value="3" class="w-full">
          <div class="flex justify-between text-xs text-gray-500 mt-1">
            <span>Casual</span>
            <span>Formal</span>
          </div>
        </div>

        <div>
          <label class="form-label">Emotional Appeal</label>
          <input type="range" min="1" max="5" value="4" class="w-full">
          <div class="flex justify-between text-xs text-gray-500 mt-1">
            <span>Logical</span>
            <span>Emotional</span>
          </div>
        </div>

        <div>
          <label class="form-label">Call-to-Action Strength</label>
          <input type="range" min="1" max="5" value="4" class="w-full">
          <div class="flex justify-between text-xs text-gray-500 mt-1">
            <span>Soft</span>
            <span>Direct</span>
          </div>
        </div>

        <div>
          <label class="form-label">Technical Detail</label>
          <input type="range" min="1" max="5" value="2" class="w-full">
          <div class="flex justify-between text-xs text-gray-500 mt-1">
            <span>Simple</span>
            <span>Technical</span>
          </div>
        </div>
      </div>

      <div class="mt-6">
        <button class="btn btn-primary">Save Adjustments</button>
      </div>
    </div>
  </div>
</div>
