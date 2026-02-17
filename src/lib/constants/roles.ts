/**
 * Centralized Role Constants for SqueezMedia Platform
 *
 * This file defines all user roles used across the platform.
 * Roles are divided into two categories:
 * - Internal Roles: For SqueezMedia staff (super_admin, admin, support)
 * - Client Roles: For client organization users (client_owner, client_admin, client_staff)
 *
 * @module constants/roles
 */

// ============================================================================
// Internal Roles (SqueezMedia Staff)
// ============================================================================

/**
 * Super Admin role - Full platform access
 * - Can access all organizations and data
 * - Can manage system settings and configurations
 * - Can create/delete admin accounts
 * - Has unrestricted access to all features
 */
export const ROLE_SUPER_ADMIN = 'super_admin' as const;

/**
 * Admin role - Internal staff with most operations
 * - Can manage client accounts and territories
 * - Can access AI operations and campaign management
 * - Can view financial data and reports
 * - Cannot modify system-level settings
 */
export const ROLE_ADMIN = 'admin' as const;

/**
 * Support role - Read-only access plus support ticket management
 * - Can view client data (read-only)
 * - Can manage support tickets and communications
 * - Cannot modify campaigns, billing, or settings
 * - Ideal for customer support representatives
 */
export const ROLE_SUPPORT = 'support' as const;

// ============================================================================
// Client Roles (Organization Users)
// ============================================================================

/**
 * Client Owner role - Full access to their organization
 * - Can manage all aspects of their organization
 * - Can add/remove team members and assign roles
 * - Has full billing and subscription access
 * - Can approve AI-generated content and campaigns
 */
export const ROLE_CLIENT_OWNER = 'client_owner' as const;

/**
 * Client Admin role - Administrative access within organization
 * - Can manage team members (except owner)
 * - Can view billing information
 * - Can manage campaigns and brand voice settings
 * - Cannot modify subscription or payment methods
 */
export const ROLE_CLIENT_ADMIN = 'client_admin' as const;

/**
 * Client Staff role - Lead management only
 * - Can view and manage leads (calls, notes, status updates)
 * - Can view campaign performance metrics
 * - Cannot access billing, settings, or team management
 * - Ideal for sales staff or lead handlers
 */
export const ROLE_CLIENT_STAFF = 'client_staff' as const;

// ============================================================================
// Role Arrays
// ============================================================================

/**
 * Array of all internal (SqueezMedia staff) roles
 * Used for route guards and permission checks on internal dashboard
 */
export const INTERNAL_ROLES = [
	ROLE_SUPER_ADMIN,
	ROLE_ADMIN,
	ROLE_SUPPORT
] as const;

/**
 * Array of all client (organization) roles
 * Used for route guards and permission checks on client dashboard
 */
export const CLIENT_ROLES = [
	ROLE_CLIENT_OWNER,
	ROLE_CLIENT_ADMIN,
	ROLE_CLIENT_STAFF
] as const;

/**
 * Array of all roles in the system
 * Combines internal and client roles for comprehensive checks
 */
export const ALL_ROLES = [
	...INTERNAL_ROLES,
	...CLIENT_ROLES
] as const;

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Type representing any internal role
 */
export type InternalRole = (typeof INTERNAL_ROLES)[number];

/**
 * Type representing any client role
 */
export type ClientRole = (typeof CLIENT_ROLES)[number];

/**
 * Type representing any role in the system
 * Union of all possible role strings
 */
export type Role = (typeof ALL_ROLES)[number];

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Checks if a given role is an internal (SqueezMedia staff) role
 *
 * @param role - The role string to check
 * @returns true if the role is an internal role, false otherwise
 *
 * @example
 * ```typescript
 * isInternalRole('super_admin') // true
 * isInternalRole('client_owner') // false
 * ```
 */
export function isInternalRole(role: string): role is InternalRole {
	return (INTERNAL_ROLES as readonly string[]).includes(role);
}

/**
 * Checks if a given role is a client (organization) role
 *
 * @param role - The role string to check
 * @returns true if the role is a client role, false otherwise
 *
 * @example
 * ```typescript
 * isClientRole('client_owner') // true
 * isClientRole('admin') // false
 * ```
 */
export function isClientRole(role: string): role is ClientRole {
	return (CLIENT_ROLES as readonly string[]).includes(role);
}

/**
 * Checks if a given string is a valid role
 *
 * @param role - The string to check
 * @returns true if the string is a valid role, false otherwise
 *
 * @example
 * ```typescript
 * isValidRole('admin') // true
 * isValidRole('invalid_role') // false
 * ```
 */
export function isValidRole(role: string): role is Role {
	return (ALL_ROLES as readonly string[]).includes(role);
}

/**
 * Returns the display name for a role
 * Useful for UI rendering
 *
 * @param role - The role to get the display name for
 * @returns Human-readable display name
 *
 * @example
 * ```typescript
 * getRoleDisplayName('super_admin') // 'Super Admin'
 * getRoleDisplayName('client_staff') // 'Client Staff'
 * ```
 */
export function getRoleDisplayName(role: Role): string {
	const displayNames: Record<Role, string> = {
		super_admin: 'Super Admin',
		admin: 'Admin',
		support: 'Support',
		client_owner: 'Client Owner',
		client_admin: 'Client Admin',
		client_staff: 'Client Staff'
	};
	return displayNames[role];
}

/**
 * Returns the description for a role
 * Useful for tooltips and help text
 *
 * @param role - The role to get the description for
 * @returns Role description string
 */
export function getRoleDescription(role: Role): string {
	const descriptions: Record<Role, string> = {
		super_admin: 'Full platform access with system configuration privileges',
		admin: 'Internal staff with access to most operations',
		support: 'Read-only access with support ticket management',
		client_owner: 'Full access to organization settings and team management',
		client_admin: 'Can manage team and view billing information',
		client_staff: 'Lead management and campaign viewing only'
	};
	return descriptions[role];
}

// ============================================================================
// Role Hierarchy Helpers
// ============================================================================

/**
 * Role hierarchy levels for permission comparison
 * Higher number = more privileges
 */
const ROLE_HIERARCHY: Record<Role, number> = {
	super_admin: 100,
	admin: 80,
	support: 60,
	client_owner: 50,
	client_admin: 40,
	client_staff: 20
};

/**
 * Checks if one role has higher or equal privileges than another
 * Note: Internal and client roles are in separate hierarchies
 *
 * @param userRole - The role to check
 * @param requiredRole - The minimum required role
 * @returns true if userRole has sufficient privileges
 *
 * @example
 * ```typescript
 * hasRolePrivilege('admin', 'support') // true
 * hasRolePrivilege('client_staff', 'client_admin') // false
 * ```
 */
export function hasRolePrivilege(userRole: Role, requiredRole: Role): boolean {
	// Internal roles can access everything
	if (isInternalRole(userRole)) {
		return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole];
	}

	// Client roles can only be compared within their hierarchy
	if (isClientRole(userRole) && isClientRole(requiredRole)) {
		return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole];
	}

	// Client roles cannot access internal-only resources
	return false;
}
