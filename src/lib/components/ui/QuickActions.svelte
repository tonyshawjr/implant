<script lang="ts">
  import { Button } from 'flowbite-svelte';
  import {
    PlusOutline,
    ChartOutline,
    DownloadOutline,
    PhoneOutline
  } from 'flowbite-svelte-icons';

  interface Action {
    label: string;
    href?: string;
    onClick?: () => void;
    icon?: 'plus' | 'chart' | 'download' | 'phone';
    variant?: 'primary' | 'light';
  }

  interface Props {
    actions?: Action[];
  }

  let { actions = [] }: Props = $props();

  // Default actions if none provided
  let displayActions = $derived(actions.length > 0 ? actions : [
    { label: 'Download Report', icon: 'download' as const, variant: 'light' as const },
    { label: 'View Leads', href: '/leads', icon: 'chart' as const, variant: 'primary' as const }
  ]);

  function getIcon(iconName: string | undefined) {
    switch (iconName) {
      case 'plus':
        return PlusOutline;
      case 'chart':
        return ChartOutline;
      case 'download':
        return DownloadOutline;
      case 'phone':
        return PhoneOutline;
      default:
        return null;
    }
  }
</script>

<div class="flex flex-wrap gap-2">
  {#each displayActions as action}
    {@const Icon = getIcon(action.icon)}
    {#if action.href}
      <Button
        href={action.href}
        color={action.variant === 'light' ? 'light' : 'primary'}
        size="sm"
      >
        {#if Icon}
          <Icon class="mr-2 h-4 w-4" />
        {/if}
        {action.label}
      </Button>
    {:else}
      <Button
        color={action.variant === 'light' ? 'light' : 'primary'}
        size="sm"
        onclick={action.onClick}
      >
        {#if Icon}
          <Icon class="mr-2 h-4 w-4" />
        {/if}
        {action.label}
      </Button>
    {/if}
  {/each}
</div>
