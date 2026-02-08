<script lang="ts">
  import AppShell from '$lib/components/layout/AppShell.svelte';
  import type { LayoutData } from './$types';

  let { data, children } = $props<{ data: LayoutData; children: any }>();
</script>

<svelte:head>
  <title>{data.organization?.name ?? 'Dashboard'} - Implant Lead Engine</title>
</svelte:head>

<AppShell
  variant="client"
  user={data.user}
  organization={data.organization}
>
  {@render children()}
</AppShell>
