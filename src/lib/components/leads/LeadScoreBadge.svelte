<script lang="ts">
  import { Badge } from 'flowbite-svelte';
  import { FireOutline, FireSolid } from 'flowbite-svelte-icons';
  import { getLeadTemperatureFromScore, type LeadTemperature } from '$lib/utils';

  interface Props {
    temperature?: LeadTemperature | string;
    score?: number | null;
    showIcon?: boolean;
    size?: 'xs' | 'sm';
  }

  let {
    temperature,
    score = null,
    showIcon = true,
    size = 'sm'
  }: Props = $props();

  // Determine temperature from score if not provided directly
  let computedTemperature = $derived(
    temperature ?? (score !== null ? getLeadTemperatureFromScore(score) : 'cold')
  );

  // Map temperature to Flowbite badge color
  let badgeColor = $derived(
    computedTemperature === 'hot' ? 'red' as const :
    computedTemperature === 'warm' ? 'yellow' as const :
    'blue' as const
  );

  // Temperature label
  let label = $derived(
    computedTemperature === 'hot' ? 'Hot' :
    computedTemperature === 'warm' ? 'Warm' :
    'Cold'
  );
</script>

<Badge color={badgeColor} class={size === 'xs' ? 'text-xs' : ''}>
  {#if showIcon}
    {#if computedTemperature === 'hot'}
      <FireSolid class="mr-1 h-3 w-3" />
    {:else if computedTemperature === 'warm'}
      <FireOutline class="mr-1 h-3 w-3" />
    {/if}
  {/if}
  {label}
</Badge>
