<script lang="ts">
  import { Badge } from 'flowbite-svelte';

  interface Props {
    status: string;
    size?: 'xs' | 'sm';
  }

  let { status, size = 'sm' }: Props = $props();

  const statusConfig: Record<string, { color: 'green' | 'blue' | 'yellow' | 'red' | 'gray'; label: string }> = {
    active: { color: 'green', label: 'Active' },
    pending: { color: 'yellow', label: 'Pending' },
    expired: { color: 'red', label: 'Expired' },
    cancelled: { color: 'gray', label: 'Cancelled' },
    renewed: { color: 'blue', label: 'Renewed' }
  };

  let config = $derived(statusConfig[status] || { color: 'gray' as const, label: status });
</script>

<Badge color={config.color} class={size === 'xs' ? 'text-xs px-2 py-0.5' : ''}>
  {config.label}
</Badge>
