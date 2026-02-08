<script lang="ts">
  import { page } from '$app/state';
  import { DarkMode, uiHelpers, CloseButton } from 'flowbite-svelte';
  import Sidebar from './Sidebar.svelte';
  import Header from './Header.svelte';
  import type { Snippet } from 'svelte';

  interface Props {
    children: Snippet;
    variant?: 'client' | 'internal';
    user?: {
      id: string;
      firstName: string;
      lastName: string;
      email: string;
      avatarUrl?: string | null;
      role: string;
    } | null;
    organization?: {
      id: string;
      name: string;
      logoUrl?: string | null;
    } | null;
  }

  let { children, variant = 'client', user = null, organization = null }: Props = $props();

  // Sidebar state management
  const sidebarUi = uiHelpers();
  let isSidebarOpen = $state(false);

  const toggleSidebar = () => {
    sidebarUi.toggle();
    isSidebarOpen = sidebarUi.isOpen;
  };

  const closeSidebar = () => {
    sidebarUi.close();
    isSidebarOpen = false;
  };

  // Track active URL for sidebar highlighting
  let activeUrl = $derived(page.url.pathname);
</script>

<div class="min-h-screen bg-gray-50 dark:bg-gray-900">
  <!-- Header -->
  <Header
    {user}
    {organization}
    onMenuToggle={toggleSidebar}
    {variant}
  />

  <div class="flex pt-16">
    <!-- Sidebar -->
    <Sidebar
      {variant}
      {activeUrl}
      {isSidebarOpen}
      {closeSidebar}
      {organization}
    />

    <!-- Main Content Area -->
    <main class="flex-1 p-4 md:ml-64 lg:p-6">
      <div class="mx-auto max-w-7xl">
        {@render children()}
      </div>
    </main>
  </div>
</div>
