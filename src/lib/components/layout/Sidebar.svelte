<script lang="ts">
  import { page } from '$app/stores';

  interface Props {
    variant?: 'client' | 'internal';
    user?: {
      firstName: string;
      lastName: string;
      role: string;
    } | null;
    isOpen?: boolean;
    onClose?: () => void;
  }

  let { variant = 'internal', user = null, isOpen = false, onClose }: Props = $props();

  // Close sidebar when navigating on mobile
  function handleNavClick() {
    if (onClose && window.innerWidth < 1024) {
      onClose();
    }
  }

  // Get initials from user name
  function getInitials(firstName: string, lastName: string): string {
    return `${firstName?.charAt(0) || ''}${lastName?.charAt(0) || ''}`.toUpperCase();
  }

  // Internal navigation items
  const internalNavItems = {
    management: [
      { label: 'Clients', href: '/internal', icon: 'users' },
      { label: 'Territories', href: '/internal/territories', icon: 'map' },
      { label: 'Landing Pages', href: '/internal/landing-pages', icon: 'file-text' },
      { label: 'AI Operations', href: '/internal/ai-operations', icon: 'cpu', badge: 3 }
    ],
    business: [
      { label: 'Financials', href: '/internal/financial', icon: 'credit-card' },
      { label: 'Sales Pipeline', href: '/internal/sales', icon: 'trending-up' },
      { label: 'Support', href: '/internal/support', icon: 'help-circle', badge: 12 },
      { label: 'Onboarding', href: '/internal/onboarding', icon: 'clipboard' }
    ],
    system: [
      { label: 'Users', href: '/internal/users', icon: 'user-cog' },
      { label: 'Settings', href: '/internal/settings', icon: 'settings' }
    ]
  };

  // Client navigation items
  const clientNavItems = {
    main: [
      { label: 'Overview', href: '/', icon: 'home' },
      { label: 'Leads', href: '/leads', icon: 'users' },
      { label: 'Campaigns', href: '/campaigns', icon: 'megaphone' },
      { label: 'Landing Pages', href: '/landing-pages', icon: 'file-text' },
      { label: 'Brand Voice', href: '/brand-voice', icon: 'mic' },
      { label: 'Territory', href: '/territory', icon: 'map' }
    ],
    account: [
      { label: 'Billing', href: '/billing', icon: 'credit-card' },
      { label: 'Account', href: '/account', icon: 'user' },
      { label: 'Support', href: '/support', icon: 'help-circle' }
    ]
  };

  let currentPath = $derived($page.url.pathname);

  function isActive(href: string): boolean {
    if (href === '/internal' || href === '/') {
      return currentPath === href;
    }
    return currentPath.startsWith(href);
  }
</script>

<aside class="sidebar {variant === 'internal' ? 'sidebar-internal' : ''} {isOpen ? 'open' : ''}">
  <div class="sidebar-logo">
    <div class="sidebar-logo-icon {variant === 'internal' ? 'sidebar-logo-icon-internal' : ''}">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
        <path d="M12 2L2 7l10 5 10-5-10-5z"/>
        <path d="M2 17l10 5 10-5"/>
        <path d="M2 12l10 5 10-5"/>
      </svg>
    </div>
    <div class="sidebar-logo-text">
      {#if variant === 'internal'}
        ILE <span>Operations</span>
      {:else}
        Implant <span>Lead Engine</span>
      {/if}
    </div>
  </div>

  <nav class="sidebar-nav">
    {#if variant === 'internal'}
      <div class="nav-section">
        <div class="nav-section-title">Management</div>
        {#each internalNavItems.management as item}
          <a href={item.href} class="nav-item {isActive(item.href) ? 'active' : ''}" onclick={handleNavClick}>
            <svg class="nav-item-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              {#if item.icon === 'users'}
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
              {:else if item.icon === 'map'}
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                <circle cx="12" cy="10" r="3"/>
              {:else if item.icon === 'file-text'}
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
                <line x1="16" y1="13" x2="8" y2="13"/>
                <line x1="16" y1="17" x2="8" y2="17"/>
                <polyline points="10 9 9 9 8 9"/>
              {:else if item.icon === 'cpu'}
                <rect x="4" y="4" width="16" height="16" rx="2" ry="2"/>
                <rect x="9" y="9" width="6" height="6"/>
                <line x1="9" y1="1" x2="9" y2="4"/>
                <line x1="15" y1="1" x2="15" y2="4"/>
                <line x1="9" y1="20" x2="9" y2="23"/>
                <line x1="15" y1="20" x2="15" y2="23"/>
                <line x1="20" y1="9" x2="23" y2="9"/>
                <line x1="20" y1="14" x2="23" y2="14"/>
                <line x1="1" y1="9" x2="4" y2="9"/>
                <line x1="1" y1="14" x2="4" y2="14"/>
              {/if}
            </svg>
            {item.label}
            {#if item.badge}
              <span class="nav-item-badge">{item.badge}</span>
            {/if}
          </a>
        {/each}
      </div>

      <div class="nav-section">
        <div class="nav-section-title">Business</div>
        {#each internalNavItems.business as item}
          <a href={item.href} class="nav-item {isActive(item.href) ? 'active' : ''}" onclick={handleNavClick}>
            <svg class="nav-item-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              {#if item.icon === 'credit-card'}
                <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/>
                <line x1="1" y1="10" x2="23" y2="10"/>
              {:else if item.icon === 'trending-up'}
                <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/>
                <polyline points="17 6 23 6 23 12"/>
              {:else if item.icon === 'help-circle'}
                <circle cx="12" cy="12" r="10"/>
                <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
                <line x1="12" y1="17" x2="12.01" y2="17"/>
              {:else if item.icon === 'clipboard'}
                <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>
                <rect x="8" y="2" width="8" height="4" rx="1" ry="1"/>
              {/if}
            </svg>
            {item.label}
            {#if item.badge}
              <span class="nav-item-badge">{item.badge}</span>
            {/if}
          </a>
        {/each}
      </div>

      <div class="nav-section">
        <div class="nav-section-title">System</div>
        {#each internalNavItems.system as item}
          <a href={item.href} class="nav-item {isActive(item.href) ? 'active' : ''}" onclick={handleNavClick}>
            <svg class="nav-item-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              {#if item.icon === 'user-cog'}
                <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                <circle cx="8.5" cy="7" r="4"/>
                <circle cx="18" cy="16" r="2"/>
                <path d="M18 12v1.5"/>
                <path d="M18 18.5V20"/>
                <path d="M14.5 15.5l1.3.7"/>
                <path d="M20.2 17.8l1.3.7"/>
                <path d="M14.5 18.5l1.3-.7"/>
                <path d="M20.2 14.2l1.3-.7"/>
              {:else if item.icon === 'settings'}
                <circle cx="12" cy="12" r="3"/>
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
              {/if}
            </svg>
            {item.label}
          </a>
        {/each}
      </div>
    {:else}
      <!-- Client sidebar -->
      <div class="nav-section">
        <div class="nav-section-title">Dashboard</div>
        {#each clientNavItems.main as item}
          <a href={item.href} class="nav-item {isActive(item.href) ? 'active' : ''}" onclick={handleNavClick}>
            <svg class="nav-item-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              {#if item.icon === 'home'}
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                <polyline points="9 22 9 12 15 12 15 22"/>
              {:else if item.icon === 'users'}
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
              {:else if item.icon === 'megaphone'}
                <path d="M3 11l18-5v12L3 13v-2z"/>
                <path d="M11.6 16.8a3 3 0 1 1-5.8-1.6"/>
              {:else if item.icon === 'file-text'}
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
                <line x1="16" y1="13" x2="8" y2="13"/>
                <line x1="16" y1="17" x2="8" y2="17"/>
                <polyline points="10 9 9 9 8 9"/>
              {:else if item.icon === 'mic'}
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                <line x1="12" y1="19" x2="12" y2="23"/>
                <line x1="8" y1="23" x2="16" y2="23"/>
              {:else if item.icon === 'map'}
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                <circle cx="12" cy="10" r="3"/>
              {/if}
            </svg>
            {item.label}
          </a>
        {/each}
      </div>

      <div class="nav-section">
        <div class="nav-section-title">Account</div>
        {#each clientNavItems.account as item}
          <a href={item.href} class="nav-item {isActive(item.href) ? 'active' : ''}" onclick={handleNavClick}>
            <svg class="nav-item-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              {#if item.icon === 'credit-card'}
                <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/>
                <line x1="1" y1="10" x2="23" y2="10"/>
              {:else if item.icon === 'user'}
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                <circle cx="12" cy="7" r="4"/>
              {:else if item.icon === 'help-circle'}
                <circle cx="12" cy="12" r="10"/>
                <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
                <line x1="12" y1="17" x2="12.01" y2="17"/>
              {/if}
            </svg>
            {item.label}
          </a>
        {/each}
      </div>
    {/if}
  </nav>

  <div class="sidebar-footer">
    <div class="sidebar-user">
      <div class="sidebar-user-avatar">
        {user ? getInitials(user.firstName, user.lastName) : 'U'}
      </div>
      <div class="sidebar-user-info">
        <div class="sidebar-user-name">{user ? `${user.firstName} ${user.lastName}` : 'User'}</div>
        <div class="sidebar-user-role">{user?.role?.replace('_', ' ') || 'User'}</div>
      </div>
      <a href="/logout" style="color: var(--gray-400); cursor: pointer;" title="Logout">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
          <polyline points="16 17 21 12 16 7"/>
          <line x1="21" y1="12" x2="9" y2="12"/>
        </svg>
      </a>
    </div>
  </div>
</aside>

<style>
  /* Internal dashboard gradient */
  .sidebar-internal {
    background: linear-gradient(180deg, #0f172a 0%, #1e293b 100%);
  }

  .sidebar-logo-icon-internal {
    background: linear-gradient(135deg, #6366f1, #4f46e5);
  }

  /* Mobile sidebar transitions */
  @media (max-width: 1024px) {
    .sidebar {
      transform: translateX(-100%);
      transition: transform 0.3s ease;
    }

    .sidebar.open {
      transform: translateX(0);
    }
  }
</style>
