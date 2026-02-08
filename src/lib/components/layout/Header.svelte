<script lang="ts">
  import {
    Navbar,
    NavBrand,
    Avatar,
    Dropdown,
    DropdownHeader,
    DropdownItem,
    DropdownGroup,
    DarkMode,
    Button,
    Badge
  } from 'flowbite-svelte';
  import {
    BarsOutline,
    BellOutline,
    UserOutline,
    CogOutline,
    ArrowRightToBracketOutline,
    QuestionCircleOutline
  } from 'flowbite-svelte-icons';

  interface Props {
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
    onMenuToggle?: () => void;
    variant?: 'client' | 'internal';
  }

  let {
    user = null,
    organization = null,
    onMenuToggle = () => {},
    variant = 'client'
  }: Props = $props();

  // User initials for avatar fallback
  let userInitials = $derived(
    user
      ? `${user.firstName?.charAt(0) ?? ''}${user.lastName?.charAt(0) ?? ''}`
      : 'U'
  );

  // Full name for display
  let userFullName = $derived(
    user ? `${user.firstName} ${user.lastName}` : 'User'
  );

  // Role display name
  let roleDisplayName = $derived(() => {
    if (!user?.role) return 'User';
    const roleMap: Record<string, string> = {
      super_admin: 'Super Admin',
      admin: 'Admin',
      support: 'Support',
      client_owner: 'Owner',
      client_admin: 'Admin',
      client_staff: 'Staff'
    };
    return roleMap[user.role] ?? user.role;
  });

  // Mock notification count (in real app, this would come from props/store)
  let notificationCount = $state(3);

  // Brand name and link based on variant
  let brandName = $derived(variant === 'client' ? (organization?.name ?? 'Dashboard') : 'SqueezMedia');
  let brandHref = $derived(variant === 'client' ? '/dashboard' : '/internal/clients');
</script>

<Navbar
  class="fixed left-0 right-0 top-0 z-50 border-b border-gray-200 bg-white px-4 py-2.5 dark:border-gray-700 dark:bg-gray-800"
>
  <div class="flex w-full items-center justify-between">
    <!-- Left side: Menu button + Brand -->
    <div class="flex items-center">
      <!-- Mobile menu button -->
      <Button
        color="light"
        class="mr-2 p-2 md:hidden"
        onclick={onMenuToggle}
      >
        <BarsOutline class="h-5 w-5" />
        <span class="sr-only">Toggle sidebar</span>
      </Button>

      <!-- Brand -->
      <NavBrand href={brandHref} class="flex items-center">
        {#if organization?.logoUrl}
          <img
            src={organization.logoUrl}
            class="mr-3 h-8 w-8 rounded object-cover"
            alt={brandName}
          />
        {:else}
          <div class="mr-3 flex h-8 w-8 items-center justify-center rounded bg-primary-600 text-sm font-bold text-white">
            {brandName.charAt(0)}
          </div>
        {/if}
        <span class="self-center whitespace-nowrap text-xl font-semibold dark:text-white">
          {brandName}
        </span>
        {#if variant === 'internal'}
          <Badge color="gray" class="ml-2">Internal</Badge>
        {/if}
      </NavBrand>
    </div>

    <!-- Right side: Dark mode, Notifications, User menu -->
    <div class="flex items-center gap-2">
      <!-- Dark Mode Toggle -->
      <DarkMode class="rounded-lg p-2.5 text-sm text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-4 focus:ring-gray-200 dark:text-gray-400 dark:hover:bg-gray-700 dark:focus:ring-gray-700" />

      <!-- Notifications -->
      <div class="relative">
        <Button
          id="notifications-button"
          color="light"
          class="relative p-2.5"
        >
          <BellOutline class="h-5 w-5" />
          {#if notificationCount > 0}
            <span class="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white">
              {notificationCount > 9 ? '9+' : notificationCount}
            </span>
          {/if}
          <span class="sr-only">Notifications</span>
        </Button>
        <Dropdown triggeredBy="#notifications-button" class="w-80">
          <div class="py-2 text-center font-semibold text-gray-900 dark:text-white">
            Notifications
          </div>
          <DropdownGroup class="max-h-64 overflow-y-auto">
            <DropdownItem class="flex items-start gap-3 py-3">
              <div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-100 text-primary-600 dark:bg-primary-900 dark:text-primary-300">
                <BellOutline class="h-4 w-4" />
              </div>
              <div class="flex-1">
                <p class="text-sm font-medium text-gray-900 dark:text-white">
                  New lead received
                </p>
                <p class="text-xs text-gray-500 dark:text-gray-400">
                  John Smith requested a consultation
                </p>
                <p class="mt-1 text-xs text-primary-600 dark:text-primary-400">
                  2 minutes ago
                </p>
              </div>
            </DropdownItem>
            <DropdownItem class="flex items-start gap-3 py-3">
              <div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-300">
                <BellOutline class="h-4 w-4" />
              </div>
              <div class="flex-1">
                <p class="text-sm font-medium text-gray-900 dark:text-white">
                  Campaign performance update
                </p>
                <p class="text-xs text-gray-500 dark:text-gray-400">
                  Your Google Ads campaign hit 150% of target
                </p>
                <p class="mt-1 text-xs text-primary-600 dark:text-primary-400">
                  1 hour ago
                </p>
              </div>
            </DropdownItem>
            <DropdownItem class="flex items-start gap-3 py-3">
              <div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-yellow-100 text-yellow-600 dark:bg-yellow-900 dark:text-yellow-300">
                <BellOutline class="h-4 w-4" />
              </div>
              <div class="flex-1">
                <p class="text-sm font-medium text-gray-900 dark:text-white">
                  Invoice reminder
                </p>
                <p class="text-xs text-gray-500 dark:text-gray-400">
                  Your February invoice is ready
                </p>
                <p class="mt-1 text-xs text-primary-600 dark:text-primary-400">
                  Yesterday
                </p>
              </div>
            </DropdownItem>
          </DropdownGroup>
          <a
            href={variant === 'client' ? '/notifications' : '/internal/notifications'}
            class="block border-t border-gray-100 py-2 text-center text-sm font-medium text-primary-600 hover:bg-gray-50 dark:border-gray-600 dark:text-primary-500 dark:hover:bg-gray-700"
          >
            View all notifications
          </a>
        </Dropdown>
      </div>

      <!-- User Menu -->
      <div>
        {#if user?.avatarUrl}
          <Avatar
            id="user-menu-button"
            src={user.avatarUrl}
            class="cursor-pointer"
            size="sm"
          />
        {:else}
          <Avatar
            id="user-menu-button"
            class="cursor-pointer bg-primary-600 text-white"
            size="sm"
          >
            {userInitials}
          </Avatar>
        {/if}
        <Dropdown triggeredBy="#user-menu-button" class="w-56">
          <DropdownHeader>
            <span class="block text-sm font-medium text-gray-900 dark:text-white">
              {userFullName}
            </span>
            <span class="block truncate text-sm text-gray-500 dark:text-gray-400">
              {user?.email ?? 'user@example.com'}
            </span>
            <Badge color="gray" class="mt-2">
              {roleDisplayName()}
            </Badge>
          </DropdownHeader>
          <DropdownGroup>
            <DropdownItem href={variant === 'client' ? '/account' : '/internal/profile'}>
              <UserOutline class="mr-2 h-4 w-4" />
              My Profile
            </DropdownItem>
            <DropdownItem href={variant === 'client' ? '/account/settings' : '/internal/settings'}>
              <CogOutline class="mr-2 h-4 w-4" />
              Settings
            </DropdownItem>
            <DropdownItem href={variant === 'client' ? '/support' : '/internal/help'}>
              <QuestionCircleOutline class="mr-2 h-4 w-4" />
              Help & Support
            </DropdownItem>
          </DropdownGroup>
          <DropdownGroup>
            <DropdownItem href="/logout" class="text-red-600 dark:text-red-400">
              <ArrowRightToBracketOutline class="mr-2 h-4 w-4" />
              Sign Out
            </DropdownItem>
          </DropdownGroup>
        </Dropdown>
      </div>
    </div>
  </div>
</Navbar>
