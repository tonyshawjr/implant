<script lang="ts">
  import { AppShell } from '$lib/components/layout';
  import type { LayoutData } from './$types';
  import type { Snippet } from 'svelte';

  let { data, children }: { data: LayoutData; children: Snippet } = $props();
</script>

<svelte:head>
  <title>Dashboard - Implant Lead Engine</title>
</svelte:head>

<AppShell
  variant="client"
  title="Dashboard"
  user={data.user}
>
  {@render children()}
</AppShell>
