<script lang="ts">
  import { Badge, Indicator } from 'flowbite-svelte';

  type TerritoryStatus = 'locked' | 'available' | 'waitlist';

  interface Props {
    status: TerritoryStatus | string;
    showDot?: boolean;
    size?: 'xs' | 'sm';
  }

  let { status, showDot = true, size = 'sm' }: Props = $props();

  // Map status to Flowbite badge color
  let badgeColor = $derived(
    status === 'locked' ? 'red' as const :
    status === 'available' ? 'green' as const :
    status === 'waitlist' ? 'yellow' as const :
    'gray' as const
  );

  // Map status to indicator color
  let indicatorColor = $derived(
    status === 'locked' ? 'red' as const :
    status === 'available' ? 'green' as const :
    status === 'waitlist' ? 'yellow' as const :
    'gray' as const
  );

  // Format status label
  let label = $derived(
    status === 'locked' ? 'Locked' :
    status === 'available' ? 'Available' :
    status === 'waitlist' ? 'Waitlist' :
    status.charAt(0).toUpperCase() + status.slice(1)
  );
</script>

<Badge color={badgeColor} class={size === 'xs' ? 'text-xs' : ''}>
  {#if showDot}
    <Indicator color={indicatorColor} size="xs" class="me-1.5" />
  {/if}
  {label}
</Badge>
