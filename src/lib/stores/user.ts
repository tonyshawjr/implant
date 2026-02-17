/**
 * User Store
 * Manages the current authenticated user state
 */

import { writable, derived, type Readable } from 'svelte/store';
import {
  ROLE_SUPER_ADMIN,
  ROLE_ADMIN,
  ROLE_SUPPORT,
  ROLE_CLIENT_OWNER,
  ROLE_CLIENT_ADMIN,
  ROLE_CLIENT_STAFF,
  INTERNAL_ROLES,
  CLIENT_ROLES,
  isInternalRole,
  isClientRole,
  getRoleDisplayName as getDisplayName,
  type Role
} from '$lib/constants/roles';

/**
 * User role types - re-exported from constants for backwards compatibility
 */
export type UserRole = Role;

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
    return isInternalRole($userStore.user.role);
  }
);

/**
 * Check if the current user is a client user (client_owner, client_admin, or client_staff)
 */
export const isClientUser: Readable<boolean> = derived(
  userStore,
  ($userStore) => {
    if (!$userStore.user) return false;
    return isClientRole($userStore.user.role);
  }
);

/**
 * Check if the current user is an admin (super_admin or admin)
 */
export const isAdmin: Readable<boolean> = derived(
  userStore,
  ($userStore) => {
    if (!$userStore.user) return false;
    return $userStore.user.role === ROLE_SUPER_ADMIN || $userStore.user.role === ROLE_ADMIN;
  }
);

/**
 * Check if the current user is a super admin
 */
export const isSuperAdmin: Readable<boolean> = derived(
  userStore,
  ($userStore) => $userStore.user?.role === ROLE_SUPER_ADMIN
);

/**
 * Check if the current user can manage their organization
 */
export const canManageOrganization: Readable<boolean> = derived(
  userStore,
  ($userStore) => {
    if (!$userStore.user) return false;
    const role = $userStore.user.role;
    return role === ROLE_SUPER_ADMIN || role === ROLE_ADMIN || role === ROLE_CLIENT_OWNER || role === ROLE_CLIENT_ADMIN;
  }
);

/**
 * Check if the current user can view billing
 */
export const canViewBilling: Readable<boolean> = derived(
  userStore,
  ($userStore) => {
    if (!$userStore.user) return false;
    const role = $userStore.user.role;
    return role === ROLE_SUPER_ADMIN || role === ROLE_ADMIN || role === ROLE_CLIENT_OWNER || role === ROLE_CLIENT_ADMIN;
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
    return $userStore.user.role !== ROLE_SUPPORT;
  }
);

/**
 * Role display names for UI
 * @deprecated Use getRoleDisplayName from '$lib/constants/roles' instead
 */
export const roleDisplayNames: Record<UserRole, string> = {
  [ROLE_SUPER_ADMIN]: 'Super Admin',
  [ROLE_ADMIN]: 'Admin',
  [ROLE_SUPPORT]: 'Support',
  [ROLE_CLIENT_OWNER]: 'Owner',
  [ROLE_CLIENT_ADMIN]: 'Admin',
  [ROLE_CLIENT_STAFF]: 'Staff'
};

/**
 * Get display name for a role
 * @deprecated Use getRoleDisplayName from '$lib/constants/roles' instead
 */
export function getRoleDisplayName(role: UserRole): string {
  return getDisplayName(role);
}
