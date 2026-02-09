<script lang="ts">
  import Sidebar from './Sidebar.svelte';
  import Header from './Header.svelte';
  import type { Snippet } from 'svelte';

  interface Props {
    children: Snippet;
    variant?: 'client' | 'internal';
    title?: string;
    breadcrumbs?: { label: string; href?: string }[];
    user?: {
      id: string;
      firstName: string;
      lastName: string;
      email: string;
      role: string;
    } | null;
  }

  let {
    children,
    variant = 'internal',
    title = 'Dashboard',
    breadcrumbs = [],
    user = null
  }: Props = $props();
</script>

<div class="app-container">
  <Sidebar {variant} {user} />

  <Header {title} {breadcrumbs} {user} />

  <main class="main-content">
    <div class="page-content">
      {@render children()}
    </div>
  </main>
</div>
