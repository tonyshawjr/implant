<script lang="ts">
  import { AppShell } from '$lib/components/layout';
  import type { LayoutData } from './$types';
  import type { Snippet } from 'svelte';

  let { data, children }: { data: LayoutData; children: Snippet } = $props();
</script>

<svelte:head>
  <title>Internal Dashboard - SqueezMedia</title>
</svelte:head>

<AppShell
  variant="internal"
  title="Client Overview"
  breadcrumbs={[{ label: 'Dashboard' }, { label: 'Clients' }]}
  user={data.user}
>
  {@render children()}
</AppShell>
