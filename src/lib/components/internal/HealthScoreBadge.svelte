<script lang="ts">
  import { Badge, Tooltip } from 'flowbite-svelte';
  import { getHealthScoreLevel, getHealthScoreLabel } from '$lib/utils';

  interface Props {
    score: number | null | undefined;
    showLabel?: boolean;
    showBar?: boolean;
    size?: 'sm' | 'md' | 'lg';
  }

  let { score, showLabel = false, showBar = true, size = 'md' }: Props = $props();

  let level = $derived(getHealthScoreLevel(score ?? 0));
  let label = $derived(getHealthScoreLabel(score ?? 0));
  let displayScore = $derived(score ?? 0);

  // Map level to Flowbite badge color
  let badgeColor = $derived(
    level === 'excellent' ? 'green' as const :
    level === 'good' ? 'blue' as const :
    level === 'warning' ? 'yellow' as const :
    'red' as const
  );

  // Map level to bar color
  let barColor = $derived(
    level === 'excellent' ? 'bg-green-500' :
    level === 'good' ? 'bg-blue-500' :
    level === 'warning' ? 'bg-yellow-500' :
    'bg-red-500'
  );

  // Size classes
  let sizeClasses = $derived(
    size === 'sm' ? 'text-xs' :
    size === 'lg' ? 'text-base' :
    'text-sm'
  );

  let barWidth = $derived(
    size === 'sm' ? 'w-12' :
    size === 'lg' ? 'w-24' :
    'w-16'
  );
</script>

<div class="flex items-center gap-2">
  {#if showBar}
    <div class="h-2 {barWidth} overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
      <div
        class="h-full rounded-full transition-all duration-300 {barColor}"
        style="width: {displayScore}%"
      ></div>
    </div>
  {/if}
  <span class="font-medium {sizeClasses} {badgeColor === 'green' ? 'text-green-600 dark:text-green-400' : badgeColor === 'blue' ? 'text-blue-600 dark:text-blue-400' : badgeColor === 'yellow' ? 'text-yellow-600 dark:text-yellow-400' : 'text-red-600 dark:text-red-400'}">
    {displayScore}
  </span>
  {#if showLabel}
    <Badge color={badgeColor} class={size === 'sm' ? 'text-xs' : ''}>
      {label}
    </Badge>
  {/if}
</div>
