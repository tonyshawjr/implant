/**
 * User Store
 * Manages the current authenticated user state
 */

import { writable, derived, type Readable } from 'svelte/store';

/**
 * User role types matching the Prisma schema
 */
export type UserRole =
  | 'super_admin'
  | 'admin'
  | 'support'
  | 'client_owner'
  | 'client_admin'
  | 'client_staff';

/**
 * Current user data structure
 */
export interface CurrentUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  avatarUrl: string | null;
  role: UserRole;
  organizationId: string | null;
  isActive: boolean;
  emailVerifiedAt: Date | null;
  lastLoginAt: Date | null;
  loginCount: number;
  createdAt: Date;
}

/**
 * User store state
 */
interface UserState {
  user: CurrentUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;
}

/**
 * Initial state
 */
const initialState: UserState = {
  user: null,
  isLoading: true,
  isAuthenticated: false,
  error: null
};

/**
 * Create the user store
 */
function createUserStore() {
  const { subscribe, set, update } = writable<UserState>(initialState);

  return {
    subscribe,

    /**
     * Set the current user (typically called after login or session restore)
     */
    setUser: (user: CurrentUser) => {
      update((state) => ({
        ...state,
        user,
        isLoading: false,
        isAuthenticated: true,
        error: null
      }));
    },

    /**
     * Clear the current user (typically called after logout)
     */
    clearUser: () => {
      set({
        user: null,
        isLoading: false,
        isAuthenticated: false,
        error: null
      });
    },

    /**
     * Set loading state
     */
    setLoading: (isLoading: boolean) => {
      update((state) => ({ ...state, isLoading }));
    },

    /**
     * Set error state
     */
    setError: (error: string | null) => {
      update((state) => ({ ...state, error, isLoading: false }));
    },

    /**
     * Update user profile data
     */
    updateProfile: (updates: Partial<CurrentUser>) => {
      update((state) => ({
        ...state,
        user: state.user ? { ...state.user, ...updates } : null
      }));
    },

    /**
     * Reset to initial state
     */
    reset: () => {
      set(initialState);
    }
  };
}

/**
 * The user store instance
 */
export const userStore = createUserStore();

/**
 * Derived store for just the user object
 */
export const currentUser: Readable<CurrentUser | null> = derived(
  userStore,
  ($userStore) => $userStore.user
);

/**
 * Derived store for authentication status
 */
export const isAuthenticated: Readable<boolean> = derived(
  userStore,
  ($userStore) => $userStore.isAuthenticated
);

/**
 * Derived store for loading status
 */
export const isUserLoading: Readable<boolean> = derived(
  userStore,
  ($userStore) => $userStore.isLoading
);

/**
 * Derived store for user's full name
 */
export const userFullName: Readable<string> = derived(
  userStore,
  ($userStore) => {
    if (!$userStore.user) return '';
    return `${$userStore.user.firstName} ${$userStore.user.lastName}`.trim();
  }
);

/**
 * Derived store for user's initials
 */
export const userInitials: Readable<string> = derived(
  userStore,
  ($userStore) => {
    if (!$userStore.user) return '?';
    const first = $userStore.user.firstName?.charAt(0).toUpperCase() || '';
    const last = $userStore.user.lastName?.charAt(0).toUpperCase() || '';
    return `${first}${last}` || '?';
  }
);

/**
 * Derived store for user's role
 */
export const userRole: Readable<UserRole | null> = derived(
  userStore,
  ($userStore) => $userStore.user?.role || null
);

/**
 * Check if the current user has one of the specified roles
 */
export function hasRole(allowedRoles: UserRole[]): Readable<boolean> {
  return derived(userStore, ($userStore) => {
    if (!$userStore.user) return false;
    return allowedRoles.includes($userStore.user.role);
  });
}

/**
 * Check if the current user is an internal user (super_admin, admin, or support)
 */
export const isInternalUser: Readable<boolean> = derived(
  userStore,
  ($userStore) => {
    if (!$userStore.user) return false;
    return ['super_admin', 'admin', 'support'].includes($userStore.user.role);
  }
);

/**
 * Check if the current user is a client user (client_owner, client_admin, or client_staff)
 */
export const isClientUser: Readable<boolean> = derived(
  userStore,
  ($userStore) => {
    if (!$userStore.user) return false;
    return ['client_owner', 'client_admin', 'client_staff'].includes($userStore.user.role);
  }
);

/**
 * Check if the current user is an admin (super_admin or admin)
 */
export const isAdmin: Readable<boolean> = derived(
  userStore,
  ($userStore) => {
    if (!$userStore.user) return false;
    return ['super_admin', 'admin'].includes($userStore.user.role);
  }
);

/**
 * Check if the current user is a super admin
 */
export const isSuperAdmin: Readable<boolean> = derived(
  userStore,
  ($userStore) => $userStore.user?.role === 'super_admin'
);

/**
 * Check if the current user can manage their organization
 */
export const canManageOrganization: Readable<boolean> = derived(
  userStore,
  ($userStore) => {
    if (!$userStore.user) return false;
    return ['super_admin', 'admin', 'client_owner', 'client_admin'].includes($userStore.user.role);
  }
);

/**
 * Check if the current user can view billing
 */
export const canViewBilling: Readable<boolean> = derived(
  userStore,
  ($userStore) => {
    if (!$userStore.user) return false;
    return ['super_admin', 'admin', 'client_owner', 'client_admin'].includes($userStore.user.role);
  }
);

/**
 * Check if the current user can manage leads
 */
export const canManageLeads: Readable<boolean> = derived(
  userStore,
  ($userStore) => {
    if (!$userStore.user) return false;
    // All roles can manage leads except support (read-only)
    return $userStore.user.role !== 'support';
  }
);

/**
 * Role display names for UI
 */
export const roleDisplayNames: Record<UserRole, string> = {
  super_admin: 'Super Admin',
  admin: 'Admin',
  support: 'Support',
  client_owner: 'Owner',
  client_admin: 'Admin',
  client_staff: 'Staff'
};

/**
 * Get display name for a role
 */
export function getRoleDisplayName(role: UserRole): string {
  return roleDisplayNames[role] || role;
}
