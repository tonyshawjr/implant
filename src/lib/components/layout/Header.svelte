<script lang="ts">
  import CommandPalette from './CommandPalette.svelte';

  interface Props {
    title?: string;
    breadcrumbs?: { label: string; href?: string }[];
    variant?: 'client' | 'internal';
    user?: {
      firstName: string;
      lastName: string;
    } | null;
    onMenuToggle?: () => void;
  }

  let { title = 'Dashboard', breadcrumbs = [], variant = 'client', user = null, onMenuToggle }: Props = $props();

  let paletteOpen = $state(false);

  function getInitials(firstName: string, lastName: string): string {
    return `${firstName?.charAt(0) || ''}${lastName?.charAt(0) || ''}`.toUpperCase();
  }

  // Detect OS for shortcut display
  const isMac = typeof navigator !== 'undefined' && navigator.platform?.includes('Mac');
</script>

<header class="header">
  <div class="header-left">
    <!-- Mobile hamburger menu button -->
    <button class="mobile-menu-btn" onclick={onMenuToggle} aria-label="Toggle menu">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
        <line x1="3" y1="6" x2="21" y2="6"/>
        <line x1="3" y1="12" x2="21" y2="12"/>
        <line x1="3" y1="18" x2="21" y2="18"/>
      </svg>
    </button>

    <h1 class="header-title">{title}</h1>
    {#if breadcrumbs.length > 0}
      <div class="header-breadcrumb">
        {#each breadcrumbs as crumb, i}
          {#if i > 0}
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          {/if}
          {#if crumb.href}
            <a href={crumb.href}>{crumb.label}</a>
          {:else}
            <span>{crumb.label}</span>
          {/if}
        {/each}
      </div>
    {/if}
  </div>

  <div class="header-right">
    <!-- Search trigger (opens Cmd+K palette) -->
    <button class="header-search-trigger" onclick={() => paletteOpen = true}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
      </svg>
      <span class="search-text">Search...</span>
      <kbd class="search-shortcut">{isMac ? '⌘' : 'Ctrl+'}K</kbd>
    </button>

    <button class="header-icon-btn">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
        <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
      </svg>
    </button>

    <div class="profile-dropdown">
      <div class="profile-avatar">
        {user ? getInitials(user.firstName, user.lastName) : 'U'}
      </div>
    </div>
  </div>
</header>

<CommandPalette {variant} bind:open={paletteOpen} />

<style>
  .header-search-trigger {
    display: flex;
    align-items: center;
    gap: var(--spacing-2, 8px);
    padding: var(--spacing-2, 8px) var(--spacing-3, 12px);
    background: var(--gray-100, #f3f4f6);
    border: 1px solid var(--gray-200, #e5e7eb);
    border-radius: var(--radius-lg, 8px);
    cursor: pointer;
    color: var(--gray-400, #9ca3af);
    transition: all 0.15s;
    min-width: 220px;
  }

  .header-search-trigger:hover {
    background: var(--gray-50, #f9fafb);
    border-color: var(--gray-300, #d1d5db);
    color: var(--gray-500, #6b7280);
  }

  .search-text {
    flex: 1;
    font-size: 0.875rem;
    text-align: left;
  }

  .search-shortcut {
    font-size: 0.6875rem;
    padding: 2px 6px;
    background: white;
    border: 1px solid var(--gray-200, #e5e7eb);
    border-radius: 4px;
    color: var(--gray-400, #9ca3af);
    font-family: inherit;
  }

  @media (max-width: 768px) {
    .header-search-trigger {
      min-width: auto;
    }

    .search-text,
    .search-shortcut {
      display: none;
    }
  }
</style>
