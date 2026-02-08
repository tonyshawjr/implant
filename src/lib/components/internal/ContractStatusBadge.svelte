<script lang="ts">
  import { Badge, Indicator } from 'flowbite-svelte';

  type ContractStatus = 'active' | 'pending' | 'expired' | 'cancelled';

  interface Props {
    status: ContractStatus | string;
    showDot?: boolean;
    size?: 'xs' | 'sm';
  }

  let { status, showDot = true, size = 'sm' }: Props = $props();

  // Map status to Flowbite badge color
  let badgeColor = $derived(
    status === 'active' ? 'green' as const :
    status === 'pending' ? 'yellow' as const :
    status === 'expired' ? 'red' as const :
    status === 'cancelled' ? 'gray' as const :
    'gray' as const
  );

  // Map status to indicator color
  let indicatorColor = $derived(
    status === 'active' ? 'green' as const :
    status === 'pending' ? 'yellow' as const :
    status === 'expired' ? 'red' as const :
    status === 'cancelled' ? 'gray' as const :
    'gray' as const
  );

  // Format status label
  let label = $derived(
    status === 'active' ? 'Active' :
    status === 'pending' ? 'Pending' :
    status === 'expired' ? 'Expired' :
    status === 'cancelled' ? 'Cancelled' :
    status.charAt(0).toUpperCase() + status.slice(1)
  );
</script>

<Badge color={badgeColor} class={size === 'xs' ? 'text-xs' : ''}>
  {#if showDot}
    <Indicator color={indicatorColor} size="xs" class="me-1.5" />
  {/if}
  {label}
</Badge>
