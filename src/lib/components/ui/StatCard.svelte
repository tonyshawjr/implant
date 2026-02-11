<script lang="ts">
  import { Card } from 'flowbite-svelte';
  import { ArrowUpOutline, ArrowDownOutline } from 'flowbite-svelte-icons';
  import type { Snippet } from 'svelte';

  interface Props {
    title: string;
    value: string;
    change?: number;
    changeLabel?: string;
    positiveIsUp?: boolean;
    iconBgColor?: string;
    icon?: Snippet;
  }

  let {
    title,
    value,
    change,
    changeLabel = 'vs last period',
    positiveIsUp = true,
    iconBgColor = 'bg-primary-100 dark:bg-primary-900',
    icon
  }: Props = $props();

  let isPositive = $derived(change !== undefined && (positiveIsUp ? change >= 0 : change <= 0));
  let changeColor = $derived(
    change === undefined
      ? ''
      : isPositive
        ? 'text-green-600 dark:text-green-400'
        : 'text-red-600 dark:text-red-400'
  );
</script>

<Card class="p-4">
  <div class="flex items-center gap-4">
    {#if icon}
      <div class="flex h-12 w-12 items-center justify-center rounded-lg {iconBgColor}">
        {@render icon()}
      </div>
    {/if}
    <div class="flex-1">
      <p class="text-sm text-gray-500 dark:text-gray-400">{title}</p>
      <p class="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
      {#if change !== undefined}
        <div class="flex items-center gap-1 text-sm {changeColor}">
          {#if isPositive}
            <ArrowUpOutline class="h-3 w-3" />
          {:else}
            <ArrowDownOutline class="h-3 w-3" />
          {/if}
          <span>{Math.abs(change).toFixed(1)}% {changeLabel}</span>
        </div>
      {/if}
    </div>
  </div>
</Card>
