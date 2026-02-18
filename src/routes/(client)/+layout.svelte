<script lang="ts">
  import { page } from '$app/stores';
  import { AppShell } from '$lib/components/layout';
  import type { LayoutData } from './$types';
  import type { Snippet } from 'svelte';

  let { data, children }: { data: LayoutData; children: Snippet } = $props();

  // Derive page title from current route
  const pageTitles: Record<string, string> = {
    '/': 'Overview',
    '/leads': 'Leads',
    '/campaigns': 'Campaigns',
    '/landing-pages': 'Landing Pages',
    '/brand-voice': 'Brand Voice',
    '/territory': 'Territory',
    '/billing': 'Billing',
    '/account': 'Account',
    '/support': 'Support'
  };

  let pageTitle = $derived(() => {
    const path = $page.url.pathname;

    // Exact match first
    if (pageTitles[path]) return pageTitles[path];

    // Check for sub-routes (e.g., /leads/abc123 → Leads)
    for (const [route, title] of Object.entries(pageTitles)) {
      if (route !== '/' && path.startsWith(route + '/')) {
        return title;
      }
    }

    return 'Dashboard';
  });
</script>

<svelte:head>
  <title>{pageTitle()} - Implant Lead Engine</title>
</svelte:head>

<AppShell
  variant="client"
  title={pageTitle()}
  user={data.user}
>
  {@render children()}
</AppShell>
