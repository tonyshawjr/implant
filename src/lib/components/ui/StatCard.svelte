<script lang="ts">
  import { Card, Badge } from 'flowbite-svelte';
  import { ArrowUpOutline, ArrowDownOutline } from 'flowbite-svelte-icons';
  import type { Snippet } from 'svelte';
  import { formatPercent } from '$lib/utils';

  interface Props {
    title: string;
    value: string | number;
    change?: number | null;
    changeLabel?: string;
    positiveIsUp?: boolean;
    icon?: Snippet;
    iconBgColor?: string;
  }

  let {
    title,
    value,
    change = null,
    changeLabel = 'vs last month',
    positiveIsUp = true,
    icon,
    iconBgColor = 'bg-primary-100 dark:bg-primary-900'
  }: Props = $props();

  // Determine if the change is positive
  let isPositive = $derived(
    change !== null && (positiveIsUp ? change >= 0 : change <= 0)
  );

  // Format the change value
  let formattedChange = $derived(
    change !== null ? formatPercent(Math.abs(change), { showSign: false }) : null
  );
</script>

<Card class="p-4">
  <div class="flex items-center justify-between">
    <div>
      <p class="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</p>
      <p class="mt-1 text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
    </div>
    {#if icon}
      <div class="flex h-12 w-12 items-center justify-center rounded-lg {iconBgColor}">
        {@render icon()}
      </div>
    {/if}
  </div>
  {#if change !== null}
    <div class="mt-3 flex items-center text-sm">
      <Badge color={isPositive ? 'green' : 'red'} class="mr-2">
        {#if change >= 0}
          <ArrowUpOutline class="mr-1 h-3 w-3" />
        {:else}
          <ArrowDownOutline class="mr-1 h-3 w-3" />
        {/if}
        {formattedChange}
      </Badge>
      <span class="text-gray-500 dark:text-gray-400">{changeLabel}</span>
    </div>
  {/if}
</Card>
