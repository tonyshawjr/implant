<script lang="ts">
  interface Props {
    title?: string;
    breadcrumbs?: { label: string; href?: string }[];
    user?: {
      firstName: string;
      lastName: string;
    } | null;
  }

  let { title = 'Dashboard', breadcrumbs = [], user = null }: Props = $props();

  function getInitials(firstName: string, lastName: string): string {
    return `${firstName?.charAt(0) || ''}${lastName?.charAt(0) || ''}`.toUpperCase();
  }
</script>

<header class="header">
  <div class="header-left">
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
    <div class="header-search">
      <svg class="header-search-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="11" cy="11" r="8"/>
        <line x1="21" y1="21" x2="16.65" y2="16.65"/>
      </svg>
      <input type="text" placeholder="Search...">
    </div>

    <button class="header-icon-btn">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
        <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
      </svg>
      <span class="badge">3</span>
    </button>

    <div class="profile-dropdown">
      <div class="profile-avatar">
        {user ? getInitials(user.firstName, user.lastName) : 'U'}
      </div>
    </div>
  </div>
</header>
