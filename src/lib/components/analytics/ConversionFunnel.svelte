<script lang="ts">
  import { Card } from 'flowbite-svelte';
  import { ArrowDownOutline } from 'flowbite-svelte-icons';

  interface FunnelStage {
    stage: string;
    count: number;
    percentage: number;
    color?: string;
  }

  export let stages: FunnelStage[] = [];
  export let title: string = 'Conversion Funnel';

  // Default colors if not provided
  const defaultColors = [
    'bg-blue-500',
    'bg-indigo-500',
    'bg-purple-500',
    'bg-green-500',
    'bg-emerald-500'
  ];

  // Calculate drop-off between stages
  function getDropOff(index: number): number {
    if (index === 0 || stages[index - 1].count === 0) return 0;
    const prevCount = stages[index - 1].count;
    const currentCount = stages[index].count;
    return Math.round(((prevCount - currentCount) / prevCount) * 100);
  }

  // Get width percentage for funnel visualization
  function getWidth(index: number): number {
    if (stages.length === 0 || stages[0].count === 0) return 100;
    const maxCount = stages[0].count;
    const currentCount = stages[index].count;
    // Minimum width of 20% for visibility
    return Math.max(20, Math.round((currentCount / maxCount) * 100));
  }
</script>

<Card class="p-4">
  <h3 class="mb-6 text-lg font-semibold text-gray-900 dark:text-white">
    {title}
  </h3>

  {#if stages.length > 0}
    <div class="space-y-2">
      {#each stages as stage, index}
        <div class="relative">
          <!-- Funnel Bar -->
          <div class="flex items-center gap-4">
            <!-- Stage Info (Left) -->
            <div class="w-32 flex-shrink-0 text-right">
              <p class="text-sm font-medium text-gray-900 dark:text-white">
                {stage.stage}
              </p>
            </div>

            <!-- Funnel Visualization -->
            <div class="flex-1">
              <div
                class="relative mx-auto h-12 rounded-lg transition-all duration-500 flex items-center justify-center {stage.color || defaultColors[index % defaultColors.length]}"
                style="width: {getWidth(index)}%"
              >
                <span class="text-white font-bold text-lg">
                  {stage.count.toLocaleString()}
                </span>
              </div>
            </div>

            <!-- Stats (Right) -->
            <div class="w-24 flex-shrink-0">
              {#if index === 0}
                <span class="text-sm font-medium text-gray-500 dark:text-gray-400">
                  100%
                </span>
              {:else}
                <div class="text-sm">
                  <span class="font-medium text-gray-900 dark:text-white">
                    {stage.percentage}%
                  </span>
                  {#if getDropOff(index) > 0}
                    <span class="ml-1 text-red-500">
                      (-{getDropOff(index)}%)
                    </span>
                  {/if}
                </div>
              {/if}
            </div>
          </div>

          <!-- Arrow between stages -->
          {#if index < stages.length - 1}
            <div class="flex items-center justify-center py-1">
              <ArrowDownOutline class="h-4 w-4 text-gray-400" />
            </div>
          {/if}
        </div>
      {/each}
    </div>

    <!-- Funnel Summary -->
    <div class="mt-6 grid grid-cols-2 gap-4 border-t border-gray-200 pt-4 dark:border-gray-700 md:grid-cols-4">
      <div class="text-center">
        <p class="text-2xl font-bold text-gray-900 dark:text-white">
          {stages[0]?.count.toLocaleString() || 0}
        </p>
        <p class="text-sm text-gray-500 dark:text-gray-400">
          Total {stages[0]?.stage || 'Entries'}
        </p>
      </div>
      {#if stages.length >= 2}
        <div class="text-center">
          <p class="text-2xl font-bold text-gray-900 dark:text-white">
            {stages[0]?.count > 0 ? Math.round((stages[1]?.count / stages[0]?.count) * 100) : 0}%
          </p>
          <p class="text-sm text-gray-500 dark:text-gray-400">
            View to {stages[1]?.stage || 'Submit'} Rate
          </p>
        </div>
      {/if}
      {#if stages.length >= 3}
        <div class="text-center">
          <p class="text-2xl font-bold text-gray-900 dark:text-white">
            {stages[1]?.count > 0 ? Math.round((stages[2]?.count / stages[1]?.count) * 100) : 0}%
          </p>
          <p class="text-sm text-gray-500 dark:text-gray-400">
            Submit to {stages[2]?.stage || 'Qualify'} Rate
          </p>
        </div>
      {/if}
      {#if stages.length >= 4}
        <div class="text-center">
          <p class="text-2xl font-bold text-green-600 dark:text-green-400">
            {stages[0]?.count > 0 ? Math.round((stages[stages.length - 1]?.count / stages[0]?.count) * 100) : 0}%
          </p>
          <p class="text-sm text-gray-500 dark:text-gray-400">
            Overall Conversion
          </p>
        </div>
      {/if}
    </div>
  {:else}
    <div class="flex h-48 items-center justify-center text-gray-500 dark:text-gray-400">
      No funnel data available
    </div>
  {/if}
</Card>

<style>
  /* Smooth funnel shape effect */
  .funnel-bar {
    clip-path: polygon(5% 0%, 95% 0%, 100% 100%, 0% 100%);
  }
</style>
