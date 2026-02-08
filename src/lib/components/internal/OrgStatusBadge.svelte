<script lang="ts">
  import { Badge, Indicator } from 'flowbite-svelte';

  type OrgStatus = 'active' | 'suspended' | 'churned';

  interface Props {
    status: OrgStatus | string;
    showDot?: boolean;
    size?: 'xs' | 'sm';
  }

  let { status, showDot = true, size = 'sm' }: Props = $props();

  // Map status to Flowbite badge color
  let badgeColor = $derived(
    status === 'active' ? 'green' as const :
    status === 'suspended' ? 'yellow' as const :
    status === 'churned' ? 'red' as const :
    'gray' as const
  );

  // Map status to indicator color
  let indicatorColor = $derived(
    status === 'active' ? 'green' as const :
    status === 'suspended' ? 'yellow' as const :
    status === 'churned' ? 'red' as const :
    'gray' as const
  );

  // Format status label
  let label = $derived(
    status === 'active' ? 'Active' :
    status === 'suspended' ? 'Suspended' :
    status === 'churned' ? 'Churned' :
    status.charAt(0).toUpperCase() + status.slice(1)
  );
</script>

<Badge color={badgeColor} class={size === 'xs' ? 'text-xs' : ''}>
  {#if showDot}
    <Indicator color={indicatorColor} size="xs" class="me-1.5" />
  {/if}
  {label}
</Badge>
