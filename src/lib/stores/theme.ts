/**
 * Theme Store
 * Manages dark mode and theme preferences across the application
 */

import { writable, derived, type Readable } from 'svelte/store';
import { browser } from '$app/environment';

/**
 * Theme mode options
 */
export type ThemeMode = 'light' | 'dark' | 'system';

/**
 * Resolved theme (always light or dark)
 */
export type ResolvedTheme = 'light' | 'dark';

/**
 * Theme store state
 */
interface ThemeState {
  mode: ThemeMode;
  resolvedTheme: ResolvedTheme;
  systemPrefersDark: boolean;
}

/**
 * Local storage key for theme preference
 */
const STORAGE_KEY = 'squeez-theme';

/**
 * Get the initial theme from localStorage or default to system
 */
function getInitialTheme(): ThemeMode {
  if (!browser) return 'system';

  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === 'light' || stored === 'dark' || stored === 'system') {
    return stored;
  }

  return 'system';
}

/**
 * Check if the system prefers dark mode
 */
function getSystemPreference(): boolean {
  if (!browser) return false;
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

/**
 * Resolve the actual theme based on mode and system preference
 */
function resolveTheme(mode: ThemeMode, systemPrefersDark: boolean): ResolvedTheme {
  if (mode === 'system') {
    return systemPrefersDark ? 'dark' : 'light';
  }
  return mode;
}

/**
 * Apply the theme to the document
 */
function applyTheme(theme: ResolvedTheme): void {
  if (!browser) return;

  if (theme === 'dark') {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }

  // Also set the color-scheme for native elements
  document.documentElement.style.colorScheme = theme;
}

/**
 * Initial state
 */
const initialSystemPrefersDark = getSystemPreference();
const initialMode = getInitialTheme();
const initialResolvedTheme = resolveTheme(initialMode, initialSystemPrefersDark);

const initialState: ThemeState = {
  mode: initialMode,
  resolvedTheme: initialResolvedTheme,
  systemPrefersDark: initialSystemPrefersDark
};

/**
 * Create the theme store
 */
function createThemeStore() {
  const { subscribe, set, update } = writable<ThemeState>(initialState);

  // Apply initial theme on creation
  if (browser) {
    applyTheme(initialResolvedTheme);

    // Listen for system preference changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      update((state) => {
        const newState = {
          ...state,
          systemPrefersDark: e.matches,
          resolvedTheme: resolveTheme(state.mode, e.matches)
        };
        applyTheme(newState.resolvedTheme);
        return newState;
      });
    };

    // Use addEventListener with fallback for older browsers
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange);
    } else {
      // Fallback for older browsers - addListener is deprecated but still works
      (mediaQuery as MediaQueryList & { addListener: typeof mediaQuery.addEventListener }).addListener(handleChange);
    }
  }

  return {
    subscribe,

    /**
     * Set the theme mode
     */
    setMode: (mode: ThemeMode): void => {
      update((state) => {
        const newResolvedTheme = resolveTheme(mode, state.systemPrefersDark);

        // Save to localStorage
        if (browser) {
          localStorage.setItem(STORAGE_KEY, mode);
          applyTheme(newResolvedTheme);
        }

        return {
          ...state,
          mode,
          resolvedTheme: newResolvedTheme
        };
      });
    },

    /**
     * Toggle between light and dark mode
     * If currently in system mode, will switch to the opposite of current system preference
     */
    toggle: (): void => {
      update((state) => {
        let newMode: ThemeMode;

        if (state.mode === 'system') {
          // If in system mode, switch to opposite of current resolved theme
          newMode = state.resolvedTheme === 'dark' ? 'light' : 'dark';
        } else {
          // Otherwise just toggle between light and dark
          newMode = state.mode === 'dark' ? 'light' : 'dark';
        }

        const newResolvedTheme = resolveTheme(newMode, state.systemPrefersDark);

        // Save to localStorage
        if (browser) {
          localStorage.setItem(STORAGE_KEY, newMode);
          applyTheme(newResolvedTheme);
        }

        return {
          ...state,
          mode: newMode,
          resolvedTheme: newResolvedTheme
        };
      });
    },

    /**
     * Set to light mode
     */
    setLight: (): void => {
      update((state) => {
        if (browser) {
          localStorage.setItem(STORAGE_KEY, 'light');
          applyTheme('light');
        }
        return { ...state, mode: 'light', resolvedTheme: 'light' };
      });
    },

    /**
     * Set to dark mode
     */
    setDark: (): void => {
      update((state) => {
        if (browser) {
          localStorage.setItem(STORAGE_KEY, 'dark');
          applyTheme('dark');
        }
        return { ...state, mode: 'dark', resolvedTheme: 'dark' };
      });
    },

    /**
     * Set to system mode
     */
    setSystem: (): void => {
      update((state) => {
        const newResolvedTheme = resolveTheme('system', state.systemPrefersDark);

        if (browser) {
          localStorage.setItem(STORAGE_KEY, 'system');
          applyTheme(newResolvedTheme);
        }

        return {
          ...state,
          mode: 'system',
          resolvedTheme: newResolvedTheme
        };
      });
    },

    /**
     * Reset to default (system mode)
     */
    reset: (): void => {
      const systemPrefersDark = getSystemPreference();
      const resolvedTheme = resolveTheme('system', systemPrefersDark);

      if (browser) {
        localStorage.removeItem(STORAGE_KEY);
        applyTheme(resolvedTheme);
      }

      set({
        mode: 'system',
        resolvedTheme,
        systemPrefersDark
      });
    }
  };
}

/**
 * The theme store instance
 */
export const themeStore = createThemeStore();

/**
 * Derived store for the current mode setting
 */
export const themeMode: Readable<ThemeMode> = derived(
  themeStore,
  ($store) => $store.mode
);

/**
 * Derived store for the resolved (actual) theme
 */
export const resolvedTheme: Readable<ResolvedTheme> = derived(
  themeStore,
  ($store) => $store.resolvedTheme
);

/**
 * Derived store for dark mode status
 */
export const isDarkMode: Readable<boolean> = derived(
  themeStore,
  ($store) => $store.resolvedTheme === 'dark'
);

/**
 * Derived store for light mode status
 */
export const isLightMode: Readable<boolean> = derived(
  themeStore,
  ($store) => $store.resolvedTheme === 'light'
);

/**
 * Derived store for system mode status
 */
export const isSystemMode: Readable<boolean> = derived(
  themeStore,
  ($store) => $store.mode === 'system'
);

/**
 * Derived store for system preference
 */
export const systemPrefersDark: Readable<boolean> = derived(
  themeStore,
  ($store) => $store.systemPrefersDark
);

/**
 * Mode display names for UI
 */
export const modeDisplayNames: Record<ThemeMode, string> = {
  light: 'Light',
  dark: 'Dark',
  system: 'System'
};

/**
 * Get display name for a mode
 */
export function getModeDisplayName(mode: ThemeMode): string {
  return modeDisplayNames[mode];
}

/**
 * Get the icon name for a mode (for use with icon libraries)
 */
export function getModeIcon(mode: ThemeMode): string {
  const icons: Record<ThemeMode, string> = {
    light: 'sun',
    dark: 'moon',
    system: 'computer-desktop'
  };
  return icons[mode];
}

/**
 * Get all available theme modes
 */
export function getThemeModes(): ThemeMode[] {
  return ['light', 'dark', 'system'];
}
