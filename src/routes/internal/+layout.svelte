<script lang="ts">
  import { page } from '$app/stores';
  import { AppShell } from '$lib/components/layout';
  import type { LayoutData } from './$types';
  import type { Snippet } from 'svelte';

  let { data, children }: { data: LayoutData; children: Snippet } = $props();

  // Define page configurations for each route
  const pageConfigs: Record<string, { title: string; breadcrumbs: { label: string; href?: string }[] }> = {
    '/internal': {
      title: 'Client Overview',
      breadcrumbs: [{ label: 'Dashboard' }, { label: 'Clients' }]
    },
    '/internal/territories': {
      title: 'Territory Management',
      breadcrumbs: [{ label: 'Dashboard', href: '/internal' }, { label: 'Territories' }]
    },
    '/internal/territories/create': {
      title: 'Create Territory',
      breadcrumbs: [{ label: 'Dashboard', href: '/internal' }, { label: 'Territories', href: '/internal/territories' }, { label: 'Create' }]
    },
    '/internal/clients': {
      title: 'Clients',
      breadcrumbs: [{ label: 'Dashboard', href: '/internal' }, { label: 'Clients' }]
    },
    '/internal/ai-operations': {
      title: 'AI Operations',
      breadcrumbs: [{ label: 'Dashboard', href: '/internal' }, { label: 'AI Operations' }]
    },
    '/internal/financial': {
      title: 'Financial',
      breadcrumbs: [{ label: 'Dashboard', href: '/internal' }, { label: 'Financial' }]
    },
    '/internal/sales': {
      title: 'Sales Pipeline',
      breadcrumbs: [{ label: 'Dashboard', href: '/internal' }, { label: 'Sales' }]
    },
    '/internal/support': {
      title: 'Support Center',
      breadcrumbs: [{ label: 'Dashboard', href: '/internal' }, { label: 'Support' }]
    },
    '/internal/onboarding': {
      title: 'Onboarding',
      breadcrumbs: [{ label: 'Dashboard', href: '/internal' }, { label: 'Onboarding' }]
    },
    '/internal/settings': {
      title: 'Settings',
      breadcrumbs: [{ label: 'Dashboard', href: '/internal' }, { label: 'Settings' }]
    },
    '/internal/users': {
      title: 'User Management',
      breadcrumbs: [{ label: 'Dashboard', href: '/internal' }, { label: 'Users' }]
    },
    '/internal/landing-pages': {
      title: 'Landing Pages',
      breadcrumbs: [{ label: 'Dashboard', href: '/internal' }, { label: 'Landing Pages' }]
    },
    '/internal/landing-pages/create': {
      title: 'Create Landing Page',
      breadcrumbs: [{ label: 'Dashboard', href: '/internal' }, { label: 'Landing Pages', href: '/internal/landing-pages' }, { label: 'Create' }]
    }
  };

  // Get current page config based on path
  let currentPath = $derived($page.url.pathname);
  let currentConfig = $derived(
    pageConfigs[currentPath] ||
    // Try to match parent path for nested routes
    Object.entries(pageConfigs)
      .filter(([path]) => currentPath.startsWith(path) && path !== '/internal')
      .sort((a, b) => b[0].length - a[0].length)[0]?.[1] ||
    pageConfigs['/internal']
  );

  let pageTitle = $derived(currentConfig.title);
  let pageBreadcrumbs = $derived(currentConfig.breadcrumbs);
</script>

<svelte:head>
  <title>{pageTitle} - SqueezMedia Operations</title>
</svelte:head>

<AppShell
  variant="internal"
  title={pageTitle}
  breadcrumbs={pageBreadcrumbs}
  user={data.user}
>
  {@render children()}
</AppShell>
