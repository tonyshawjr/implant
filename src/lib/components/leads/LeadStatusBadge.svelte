<script lang="ts">
  import { Badge } from 'flowbite-svelte';

  interface Props {
    status: string;
    size?: 'xs' | 'sm';
  }

  let { status, size = 'sm' }: Props = $props();

  const statusConfig: Record<string, { color: 'blue' | 'yellow' | 'purple' | 'indigo' | 'green' | 'red' | 'gray'; label: string }> = {
    new: { color: 'blue', label: 'New' },
    contacted: { color: 'yellow', label: 'Contacted' },
    qualified: { color: 'purple', label: 'Qualified' },
    appointment: { color: 'indigo', label: 'Appointment' },
    converted: { color: 'green', label: 'Converted' },
    lost: { color: 'red', label: 'Lost' }
  };

  let config = $derived(statusConfig[status] || { color: 'gray' as const, label: status });
</script>

<Badge color={config.color} class={size === 'xs' ? 'text-xs px-2 py-0.5' : ''}>
  {config.label}
</Badge>
