<script lang="ts">
  import { goto } from '$app/navigation';

  interface Props {
    variant?: 'client' | 'internal';
    open?: boolean;
  }

  let { variant = 'client', open = $bindable(false) }: Props = $props();
  let query = $state('');
  let selectedIndex = $state(0);
  let inputEl: HTMLInputElement;

  interface CommandItem {
    id: string;
    label: string;
    description: string;
    href: string;
    icon: string;
    section: string;
  }

  const clientCommands: CommandItem[] = [
    { id: 'overview', label: 'Overview', description: 'Dashboard overview & KPIs', href: '/', icon: 'home', section: 'Pages' },
    { id: 'leads', label: 'Leads', description: 'View and manage leads', href: '/leads', icon: 'users', section: 'Pages' },
    { id: 'campaigns', label: 'Campaigns', description: 'Campaign performance', href: '/campaigns', icon: 'megaphone', section: 'Pages' },
    { id: 'landing-pages', label: 'Landing Pages', description: 'Manage lead capture pages', href: '/landing-pages', icon: 'file-text', section: 'Pages' },
    { id: 'brand-voice', label: 'Brand Voice', description: 'AI voice profile', href: '/brand-voice', icon: 'mic', section: 'Pages' },
    { id: 'territory', label: 'Territory', description: 'Your territory map', href: '/territory', icon: 'map', section: 'Pages' },
    { id: 'billing', label: 'Billing', description: 'Subscription & invoices', href: '/billing', icon: 'credit-card', section: 'Account' },
    { id: 'account', label: 'Account', description: 'Team & settings', href: '/account', icon: 'user', section: 'Account' },
    { id: 'support', label: 'Support', description: 'Get help', href: '/support', icon: 'help', section: 'Account' },
  ];

  const internalCommands: CommandItem[] = [
    { id: 'clients', label: 'Clients', description: 'All clients & health scores', href: '/internal', icon: 'users', section: 'Management' },
    { id: 'territories', label: 'Territories', description: 'Territory management', href: '/internal/territories', icon: 'map', section: 'Management' },
    { id: 'lp-internal', label: 'Landing Pages', description: 'All landing pages', href: '/internal/landing-pages', icon: 'file-text', section: 'Management' },
    { id: 'ai-ops', label: 'AI Operations', description: 'AI queue & monitoring', href: '/internal/ai-operations', icon: 'cpu', section: 'Management' },
    { id: 'financial', label: 'Financials', description: 'Revenue & metrics', href: '/internal/financial', icon: 'credit-card', section: 'Business' },
    { id: 'sales', label: 'Sales Pipeline', description: 'Sales leads & pipeline', href: '/internal/sales', icon: 'trending-up', section: 'Business' },
    { id: 'support-int', label: 'Support', description: 'Support tickets', href: '/internal/support', icon: 'help', section: 'Business' },
    { id: 'onboarding', label: 'Onboarding', description: 'Client onboarding', href: '/internal/onboarding', icon: 'clipboard', section: 'Business' },
    { id: 'settings', label: 'Settings', description: 'System settings', href: '/internal/settings', icon: 'settings', section: 'System' },
  ];

  let commands = $derived(variant === 'internal' ? internalCommands : clientCommands);

  let filteredCommands = $derived(() => {
    if (!query.trim()) return commands;
    const q = query.toLowerCase();
    return commands.filter(cmd =>
      cmd.label.toLowerCase().includes(q) ||
      cmd.description.toLowerCase().includes(q)
    );
  });

  // Group by section
  let groupedCommands = $derived(() => {
    const items = filteredCommands();
    const groups: Record<string, CommandItem[]> = {};
    for (const cmd of items) {
      if (!groups[cmd.section]) groups[cmd.section] = [];
      groups[cmd.section].push(cmd);
    }
    return groups;
  });

  let flatFiltered = $derived(filteredCommands());

  function openPalette() {
    open = true;
    query = '';
    selectedIndex = 0;
    // Focus input after mount
    requestAnimationFrame(() => inputEl?.focus());
  }

  function closePalette() {
    open = false;
    query = '';
  }

  function selectCommand(cmd: CommandItem) {
    closePalette();
    goto(cmd.href);
  }

  function handleKeydown(e: KeyboardEvent) {
    if (!open) {
      // Open with Cmd+K or Ctrl+K
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        openPalette();
      }
      return;
    }

    switch (e.key) {
      case 'Escape':
        e.preventDefault();
        closePalette();
        break;
      case 'ArrowDown':
        e.preventDefault();
        selectedIndex = Math.min(selectedIndex + 1, flatFiltered.length - 1);
        break;
      case 'ArrowUp':
        e.preventDefault();
        selectedIndex = Math.max(selectedIndex - 1, 0);
        break;
      case 'Enter':
        e.preventDefault();
        if (flatFiltered[selectedIndex]) {
          selectCommand(flatFiltered[selectedIndex]);
        }
        break;
    }
  }

  // Reset selection when query changes
  $effect(() => {
    query;
    selectedIndex = 0;
  });
</script>

<svelte:window onkeydown={handleKeydown} />

{#if open}
  <div class="cmd-overlay" onclick={closePalette} role="presentation">
    <div class="cmd-palette" onclick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
      <!-- Search Input -->
      <div class="cmd-input-wrap">
        <svg class="cmd-search-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        <input
          bind:this={inputEl}
          bind:value={query}
          class="cmd-input"
          type="text"
          placeholder="Search pages..."
          autocomplete="off"
          spellcheck="false"
        />
        <kbd class="cmd-esc">ESC</kbd>
      </div>

      <!-- Results -->
      <div class="cmd-results">
        {#if flatFiltered.length === 0}
          <div class="cmd-empty">No results for "{query}"</div>
        {:else}
          {#each Object.entries(groupedCommands()) as [section, items]}
            <div class="cmd-section">
              <div class="cmd-section-title">{section}</div>
              {#each items as cmd}
                {@const index = flatFiltered.indexOf(cmd)}
                <button
                  class="cmd-item {index === selectedIndex ? 'selected' : ''}"
                  onclick={() => selectCommand(cmd)}
                  onmouseenter={() => selectedIndex = index}
                >
                  <svg class="cmd-item-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    {#if cmd.icon === 'home'}
                      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
                    {:else if cmd.icon === 'users'}
                      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
                    {:else if cmd.icon === 'megaphone'}
                      <path d="M3 11l18-5v12L3 13v-2z"/><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6"/>
                    {:else if cmd.icon === 'file-text'}
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
                    {:else if cmd.icon === 'mic'}
                      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                    {:else if cmd.icon === 'map'}
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
                    {:else if cmd.icon === 'credit-card'}
                      <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/>
                    {:else if cmd.icon === 'user'}
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
                    {:else if cmd.icon === 'help'}
                      <circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/>
                    {:else if cmd.icon === 'cpu'}
                      <rect x="4" y="4" width="16" height="16" rx="2" ry="2"/><rect x="9" y="9" width="6" height="6"/>
                    {:else if cmd.icon === 'trending-up'}
                      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/>
                    {:else if cmd.icon === 'clipboard'}
                      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/>
                    {:else if cmd.icon === 'settings'}
                      <circle cx="12" cy="12" r="3"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
                    {:else}
                      <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/>
                    {/if}
                  </svg>
                  <div class="cmd-item-text">
                    <span class="cmd-item-label">{cmd.label}</span>
                    <span class="cmd-item-desc">{cmd.description}</span>
                  </div>
                  <svg class="cmd-item-arrow" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="9 18 15 12 9 6"/>
                  </svg>
                </button>
              {/each}
            </div>
          {/each}
        {/if}
      </div>

      <!-- Footer -->
      <div class="cmd-footer">
        <div class="cmd-hint"><kbd>↑↓</kbd> navigate</div>
        <div class="cmd-hint"><kbd>↵</kbd> select</div>
        <div class="cmd-hint"><kbd>esc</kbd> close</div>
      </div>
    </div>
  </div>
{/if}

<style>
  .cmd-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.5);
    backdrop-filter: blur(4px);
    z-index: 1000;
    display: flex;
    align-items: flex-start;
    justify-content: center;
    padding-top: 15vh;
  }

  .cmd-palette {
    width: 560px;
    max-height: 480px;
    background: white;
    border-radius: var(--radius-xl, 12px);
    box-shadow: 0 25px 50px rgba(0, 0, 0, 0.25);
    display: flex;
    flex-direction: column;
    overflow: hidden;
    animation: cmdSlideIn 0.15s ease-out;
  }

  @keyframes cmdSlideIn {
    from {
      opacity: 0;
      transform: scale(0.98) translateY(-8px);
    }
    to {
      opacity: 1;
      transform: scale(1) translateY(0);
    }
  }

  .cmd-input-wrap {
    display: flex;
    align-items: center;
    gap: var(--spacing-3, 12px);
    padding: var(--spacing-4, 16px) var(--spacing-5, 20px);
    border-bottom: 1px solid var(--gray-200, #e5e7eb);
  }

  .cmd-search-icon {
    color: var(--gray-400, #9ca3af);
    flex-shrink: 0;
  }

  .cmd-input {
    flex: 1;
    border: none;
    outline: none;
    font-size: 1rem;
    color: var(--gray-900, #111827);
    background: transparent;
  }

  .cmd-input::placeholder {
    color: var(--gray-400, #9ca3af);
  }

  .cmd-esc {
    font-size: 0.625rem;
    padding: 2px 6px;
    background: var(--gray-100, #f3f4f6);
    border: 1px solid var(--gray-200, #e5e7eb);
    border-radius: 4px;
    color: var(--gray-500, #6b7280);
    font-family: inherit;
  }

  .cmd-results {
    flex: 1;
    overflow-y: auto;
    padding: var(--spacing-2, 8px);
  }

  .cmd-empty {
    padding: var(--spacing-8, 32px);
    text-align: center;
    color: var(--gray-400, #9ca3af);
    font-size: 0.875rem;
  }

  .cmd-section {
    margin-bottom: var(--spacing-2, 8px);
  }

  .cmd-section:last-child {
    margin-bottom: 0;
  }

  .cmd-section-title {
    font-size: 0.6875rem;
    font-weight: 600;
    color: var(--gray-400, #9ca3af);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    padding: var(--spacing-2, 8px) var(--spacing-3, 12px);
  }

  .cmd-item {
    display: flex;
    align-items: center;
    gap: var(--spacing-3, 12px);
    width: 100%;
    padding: var(--spacing-3, 12px);
    border: none;
    background: transparent;
    border-radius: var(--radius-lg, 8px);
    cursor: pointer;
    text-align: left;
    transition: background 0.1s;
  }

  .cmd-item:hover,
  .cmd-item.selected {
    background: var(--gray-100, #f3f4f6);
  }

  .cmd-item.selected {
    background: var(--primary-50, #eff6ff);
  }

  .cmd-item-icon {
    color: var(--gray-400, #9ca3af);
    flex-shrink: 0;
  }

  .cmd-item.selected .cmd-item-icon {
    color: var(--primary-600, #2563eb);
  }

  .cmd-item-text {
    flex: 1;
    min-width: 0;
  }

  .cmd-item-label {
    display: block;
    font-size: 0.875rem;
    font-weight: 500;
    color: var(--gray-900, #111827);
  }

  .cmd-item-desc {
    display: block;
    font-size: 0.75rem;
    color: var(--gray-500, #6b7280);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .cmd-item-arrow {
    color: var(--gray-300, #d1d5db);
    flex-shrink: 0;
    opacity: 0;
    transition: opacity 0.1s;
  }

  .cmd-item.selected .cmd-item-arrow {
    opacity: 1;
    color: var(--primary-600, #2563eb);
  }

  .cmd-footer {
    display: flex;
    align-items: center;
    gap: var(--spacing-4, 16px);
    padding: var(--spacing-3, 12px) var(--spacing-5, 20px);
    border-top: 1px solid var(--gray-200, #e5e7eb);
    background: var(--gray-50, #f9fafb);
  }

  .cmd-hint {
    display: flex;
    align-items: center;
    gap: var(--spacing-1, 4px);
    font-size: 0.6875rem;
    color: var(--gray-400, #9ca3af);
  }

  .cmd-hint kbd {
    font-size: 0.625rem;
    padding: 1px 5px;
    background: white;
    border: 1px solid var(--gray-200, #e5e7eb);
    border-radius: 3px;
    font-family: inherit;
    color: var(--gray-500, #6b7280);
  }

  @media (max-width: 640px) {
    .cmd-palette {
      width: calc(100vw - 32px);
      max-height: 60vh;
    }

    .cmd-overlay {
      padding-top: 10vh;
    }
  }
</style>
