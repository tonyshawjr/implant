<script lang="ts">
  import { Badge } from 'flowbite-svelte';
  import { getLeadStatusColor, getLeadStatusLabel, type LeadStatus } from '$lib/utils';

  interface Props {
    status: LeadStatus | string;
    size?: 'xs' | 'sm';
  }

  let { status, size = 'sm' }: Props = $props();

  let colors = $derived(getLeadStatusColor(status));
  let label = $derived(getLeadStatusLabel(status));

  // Map status to Flowbite badge color
  let badgeColor = $derived(
    status === 'new' ? 'gray' as const :
    status === 'contacted' ? 'blue' as const :
    status === 'qualified' ? 'indigo' as const :
    status === 'appointment_set' ? 'purple' as const :
    status === 'consultation_completed' ? 'primary' as const :
    status === 'converted' ? 'green' as const :
    status === 'lost' ? 'red' as const :
    'gray' as const
  );
</script>

<Badge color={badgeColor} class={size === 'xs' ? 'text-xs' : ''}>
  {label}
</Badge>
