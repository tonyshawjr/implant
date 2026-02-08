/**
 * Organization Store
 * Manages the current organization context for client users
 */

import { writable, derived, type Readable } from 'svelte/store';

/**
 * Organization status types matching the Prisma schema
 */
export type OrgStatus = 'active' | 'suspended' | 'churned';

/**
 * Territory data associated with the organization
 */
export interface OrgTerritory {
  id: string;
  name: string;
  city: string;
  state: string;
  radiusMiles: number;
  status: string;
}

/**
 * Current organization data structure
 */
export interface CurrentOrganization {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  website: string | null;
  phone: string | null;
  email: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  country: string;
  timezone: string;
  status: OrgStatus;
  healthScore: number | null;
  avgCaseValue: number | null;
  clientSince: Date | null;
  accountManagerId: string | null;
  createdAt: Date;
  // Optional relations
  territories?: OrgTerritory[];
  planName?: string;
  contractStatus?: string;
  userCount?: number;
}

/**
 * Organization store state
 */
interface OrganizationState {
  organization: CurrentOrganization | null;
  isLoading: boolean;
  error: string | null;
}

/**
 * Initial state
 */
const initialState: OrganizationState = {
  organization: null,
  isLoading: true,
  error: null
};

/**
 * Create the organization store
 */
function createOrganizationStore() {
  const { subscribe, set, update } = writable<OrganizationState>(initialState);

  return {
    subscribe,

    /**
     * Set the current organization
     */
    setOrganization: (organization: CurrentOrganization) => {
      update((state) => ({
        ...state,
        organization,
        isLoading: false,
        error: null
      }));
    },

    /**
     * Clear the current organization
     */
    clearOrganization: () => {
      set({
        organization: null,
        isLoading: false,
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
     * Update organization data
     */
    updateOrganization: (updates: Partial<CurrentOrganization>) => {
      update((state) => ({
        ...state,
        organization: state.organization ? { ...state.organization, ...updates } : null
      }));
    },

    /**
     * Update health score
     */
    updateHealthScore: (healthScore: number) => {
      update((state) => ({
        ...state,
        organization: state.organization ? { ...state.organization, healthScore } : null
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
 * The organization store instance
 */
export const organizationStore = createOrganizationStore();

/**
 * Derived store for just the organization object
 */
export const currentOrganization: Readable<CurrentOrganization | null> = derived(
  organizationStore,
  ($store) => $store.organization
);

/**
 * Derived store for organization ID
 */
export const organizationId: Readable<string | null> = derived(
  organizationStore,
  ($store) => $store.organization?.id || null
);

/**
 * Derived store for organization name
 */
export const organizationName: Readable<string> = derived(
  organizationStore,
  ($store) => $store.organization?.name || ''
);

/**
 * Derived store for loading status
 */
export const isOrganizationLoading: Readable<boolean> = derived(
  organizationStore,
  ($store) => $store.isLoading
);

/**
 * Derived store for organization status
 */
export const organizationStatus: Readable<OrgStatus | null> = derived(
  organizationStore,
  ($store) => $store.organization?.status || null
);

/**
 * Derived store for health score
 */
export const healthScore: Readable<number | null> = derived(
  organizationStore,
  ($store) => $store.organization?.healthScore || null
);

/**
 * Check if organization is active
 */
export const isOrganizationActive: Readable<boolean> = derived(
  organizationStore,
  ($store) => $store.organization?.status === 'active'
);

/**
 * Check if organization is suspended
 */
export const isOrganizationSuspended: Readable<boolean> = derived(
  organizationStore,
  ($store) => $store.organization?.status === 'suspended'
);

/**
 * Get organization territories
 */
export const organizationTerritories: Readable<OrgTerritory[]> = derived(
  organizationStore,
  ($store) => $store.organization?.territories || []
);

/**
 * Get organization's primary territory
 */
export const primaryTerritory: Readable<OrgTerritory | null> = derived(
  organizationStore,
  ($store) => $store.organization?.territories?.[0] || null
);

/**
 * Get organization's formatted address
 */
export const organizationAddress: Readable<string> = derived(
  organizationStore,
  ($store) => {
    const org = $store.organization;
    if (!org) return '';

    const parts = [
      org.addressLine1,
      org.addressLine2,
      org.city,
      org.state,
      org.postalCode
    ].filter(Boolean);

    return parts.join(', ');
  }
);

/**
 * Get organization's location (city, state)
 */
export const organizationLocation: Readable<string> = derived(
  organizationStore,
  ($store) => {
    const org = $store.organization;
    if (!org) return '';

    const parts = [org.city, org.state].filter(Boolean);
    return parts.join(', ');
  }
);

/**
 * Get health score level
 */
export type HealthLevel = 'excellent' | 'good' | 'warning' | 'critical' | 'unknown';

export const healthScoreLevel: Readable<HealthLevel> = derived(
  organizationStore,
  ($store) => {
    const score = $store.organization?.healthScore;
    if (score === null || score === undefined) return 'unknown';
    if (score >= 85) return 'excellent';
    if (score >= 70) return 'good';
    if (score >= 50) return 'warning';
    return 'critical';
  }
);

/**
 * Check if organization has health concerns
 */
export const hasHealthConcerns: Readable<boolean> = derived(
  healthScoreLevel,
  ($level) => $level === 'warning' || $level === 'critical'
);

/**
 * Get days since client started
 */
export const daysSinceClientStarted: Readable<number | null> = derived(
  organizationStore,
  ($store) => {
    const clientSince = $store.organization?.clientSince;
    if (!clientSince) return null;

    const startDate = new Date(clientSince);
    const now = new Date();
    const diffMs = now.getTime() - startDate.getTime();
    return Math.floor(diffMs / (1000 * 60 * 60 * 24));
  }
);

/**
 * Status display names for UI
 */
export const statusDisplayNames: Record<OrgStatus, string> = {
  active: 'Active',
  suspended: 'Suspended',
  churned: 'Churned'
};

/**
 * Get display name for a status
 */
export function getStatusDisplayName(status: OrgStatus): string {
  return statusDisplayNames[status] || status;
}
