<script lang="ts">
  import { Badge } from 'flowbite-svelte';

  interface Props {
    status: string;
    size?: 'xs' | 'sm';
  }

  let { status, size = 'sm' }: Props = $props();

  const statusConfig: Record<string, { color: 'green' | 'blue' | 'yellow' | 'red' | 'gray'; label: string }> = {
    active: { color: 'green', label: 'Active' },
    onboarding: { color: 'blue', label: 'Onboarding' },
    paused: { color: 'yellow', label: 'Paused' },
    churned: { color: 'red', label: 'Churned' },
    prospect: { color: 'gray', label: 'Prospect' }
  };

  let config = $derived(statusConfig[status] || { color: 'gray' as const, label: status });
</script>

<Badge color={config.color} class={size === 'xs' ? 'text-xs px-2 py-0.5' : ''}>
  {config.label}
</Badge>
