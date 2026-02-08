<script lang="ts">
  import {
    Sidebar as FlowbiteSidebar,
    SidebarGroup,
    SidebarItem,
    SidebarBrand,
    CloseButton
  } from 'flowbite-svelte';
  import {
    ChartOutline,
    UsersGroupOutline,
    RocketOutline,
    MicrophoneOutline,
    MapPinOutline,
    CreditCardOutline,
    UserSettingsOutline,
    QuestionCircleOutline,
    BuildingOutline,
    GlobeOutline,
    ServerOutline,
    CashOutline,
    PhoneOutline,
    TicketOutline,
    ClipboardListOutline,
    CogOutline
  } from 'flowbite-svelte-icons';

  interface Props {
    variant?: 'client' | 'internal';
    activeUrl?: string;
    isSidebarOpen?: boolean;
    closeSidebar?: () => void;
    organization?: {
      id: string;
      name: string;
      logoUrl?: string | null;
    } | null;
  }

  let {
    variant = 'client',
    activeUrl = '',
    isSidebarOpen = false,
    closeSidebar = () => {},
    organization = null
  }: Props = $props();

  // Icon class for consistent styling
  const iconClass = 'h-5 w-5 text-gray-500 transition duration-75 group-hover:text-gray-900 dark:text-gray-400 dark:group-hover:text-white';

  // Client navigation items
  const clientNavItems = [
    { label: 'Overview', href: '/', icon: ChartOutline },
    { label: 'Leads', href: '/leads', icon: UsersGroupOutline },
    { label: 'Campaigns', href: '/campaigns', icon: RocketOutline },
    { label: 'Brand Voice', href: '/brand-voice', icon: MicrophoneOutline },
    { label: 'Territory', href: '/territory', icon: MapPinOutline },
    { label: 'Billing', href: '/billing', icon: CreditCardOutline },
    { label: 'Account', href: '/account', icon: UserSettingsOutline },
    { label: 'Support', href: '/support', icon: QuestionCircleOutline }
  ];

  // Internal navigation items (routes are under /internal path)
  const internalNavItems = [
    { label: 'Clients', href: '/internal', icon: BuildingOutline },
    { label: 'Territories', href: '/internal/territories', icon: GlobeOutline },
    { label: 'AI Ops', href: '/internal/ai-operations', icon: ServerOutline },
    { label: 'Financial', href: '/internal/financial', icon: CashOutline },
    { label: 'Sales', href: '/internal/sales', icon: PhoneOutline },
    { label: 'Support', href: '/internal/support', icon: TicketOutline },
    { label: 'Onboarding', href: '/internal/onboarding', icon: ClipboardListOutline },
    { label: 'Settings', href: '/internal/settings', icon: CogOutline }
  ];

  // Select nav items based on variant
  let navItems = $derived(variant === 'client' ? clientNavItems : internalNavItems);

  // Brand config - use $derived for reactivity
  let brandSite = $derived({
    name: organization?.name ?? 'SqueezMedia',
    href: variant === 'client' ? '/dashboard' : '/internal',
    img: organization?.logoUrl ?? '/logo.svg'
  });

  // Active and non-active classes for sidebar items
  const activeClass = 'flex items-center p-2 text-base font-normal text-primary-700 bg-primary-50 rounded-lg dark:text-primary-400 dark:bg-gray-700';
  const nonActiveClass = 'flex items-center p-2 text-base font-normal text-gray-900 rounded-lg dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700';
</script>

<FlowbiteSidebar
  {activeUrl}
  backdrop={true}
  isOpen={isSidebarOpen}
  {closeSidebar}
  params={{ x: -50, duration: 200 }}
  class="fixed left-0 top-16 z-40 h-[calc(100vh-4rem)] w-64 border-r border-gray-200 bg-white pt-4 dark:border-gray-700 dark:bg-gray-800"
  position="fixed"
  classes={{ nonactive: nonActiveClass, active: activeClass }}
>
  <!-- Close button for mobile -->
  <CloseButton
    onclick={closeSidebar}
    color="gray"
    class="absolute right-2 top-2 p-2 md:hidden"
  />

  <!-- Brand Logo - Mobile only, desktop shows in header -->
  <SidebarGroup class="md:hidden">
    <SidebarBrand site={brandSite} classes={{ img: 'h-8 w-8 rounded' }}>
      <span class="ml-3 self-center whitespace-nowrap text-xl font-semibold dark:text-white">
        {brandSite.name}
      </span>
    </SidebarBrand>
  </SidebarGroup>

  <!-- Navigation Items -->
  <SidebarGroup class="mt-4 space-y-1">
    {#each navItems as { label, href, icon: Icon }}
      <SidebarItem {label} {href}>
        {#snippet icon()}
          <Icon class={iconClass} />
        {/snippet}
      </SidebarItem>
    {/each}
  </SidebarGroup>

  <!-- Footer section with version/help -->
  <SidebarGroup border class="mt-auto">
    <div class="px-3 py-2 text-xs text-gray-500 dark:text-gray-400">
      {#if variant === 'client'}
        <p>Implant Lead Engine</p>
        <p class="mt-1">Territory-exclusive leads</p>
      {:else}
        <p>SqueezMedia Internal</p>
        <p class="mt-1">Admin Dashboard</p>
      {/if}
    </div>
  </SidebarGroup>
</FlowbiteSidebar>
