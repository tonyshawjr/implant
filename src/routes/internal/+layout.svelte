<script lang="ts">
  import AppShell from '$lib/components/layout/AppShell.svelte';
  import type { LayoutData } from './$types';

  let { data, children } = $props<{ data: LayoutData; children: any }>();
</script>

<svelte:head>
  <title>Internal Dashboard - SqueezMedia</title>
</svelte:head>

<AppShell
  variant="internal"
  user={data.user}
  organization={null}
>
  {@render children()}
</AppShell>
