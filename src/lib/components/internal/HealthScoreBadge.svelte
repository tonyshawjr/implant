<script lang="ts">
  import { Badge } from 'flowbite-svelte';

  interface Props {
    score: number;
    size?: 'xs' | 'sm';
  }

  let { score, size = 'sm' }: Props = $props();

  function getLevel(s: number): 'excellent' | 'good' | 'warning' | 'critical' {
    if (s >= 85) return 'excellent';
    if (s >= 70) return 'good';
    if (s >= 50) return 'warning';
    return 'critical';
  }

  function getColor(level: string): 'green' | 'blue' | 'yellow' | 'red' {
    switch (level) {
      case 'excellent': return 'green';
      case 'good': return 'blue';
      case 'warning': return 'yellow';
      default: return 'red';
    }
  }

  function getLabel(level: string): string {
    switch (level) {
      case 'excellent': return 'Excellent';
      case 'good': return 'Good';
      case 'warning': return 'Warning';
      default: return 'Critical';
    }
  }

  let level = $derived(getLevel(score));
  let color = $derived(getColor(level));
  let label = $derived(getLabel(level));
</script>

<Badge {color} class={size === 'xs' ? 'text-xs px-2 py-0.5' : ''}>
  {score} - {label}
</Badge>
