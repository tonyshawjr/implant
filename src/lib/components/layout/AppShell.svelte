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

  // Mobile sidebar state
  let sidebarOpen = $state(false);

  function toggleSidebar() {
    sidebarOpen = !sidebarOpen;
  }

  function closeSidebar() {
    sidebarOpen = false;
  }
</script>

<div class="app-container">
  <!-- Mobile sidebar overlay -->
  <button
    class="sidebar-overlay {sidebarOpen ? 'visible' : ''}"
    onclick={closeSidebar}
    aria-label="Close sidebar"
  ></button>

  <Sidebar {variant} {user} isOpen={sidebarOpen} onClose={closeSidebar} />

  <Header {title} {breadcrumbs} {variant} {user} onMenuToggle={toggleSidebar} />

  <main class="main-content">
    <div class="page-content">
      {@render children()}
    </div>
  </main>
</div>

<style>
  .sidebar-overlay {
    display: none;
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.5);
    z-index: 99;
    opacity: 0;
    transition: opacity 0.3s ease;
    border: none;
    cursor: pointer;
  }

  .sidebar-overlay.visible {
    display: block;
    opacity: 1;
  }

  @media (min-width: 1025px) {
    .sidebar-overlay {
      display: none !important;
    }
  }
</style>
