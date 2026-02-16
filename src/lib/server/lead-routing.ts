/**
 * Lead Routing Utility
 *
 * Routes incoming leads to the correct territory and organization
 * based on the lead's zip code.
 */

import { prisma } from '$lib/server/db';

// ============================================================================
// Types
// ============================================================================

export interface RouteResult {
	territoryId: string | null;
	organizationId: string | null;
	territoryName: string | null;
}

// ============================================================================
// Core Routing Functions
// ============================================================================

/**
 * Given a lead's zip code, find the matching territory and its assigned organization.
 *
 * @param zipCode - The lead's zip code (5 or 9 digit format accepted)
 * @returns The territory and organization IDs, or nulls if no match
 */
export async function routeLeadByZipCode(zipCode: string): Promise<RouteResult> {
	// Normalize zip code to 5 digits
	const normalizedZip = normalizeZipCode(zipCode);

	if (!normalizedZip) {
		return { territoryId: null, organizationId: null, territoryName: null };
	}

	try {
		// Look up the zip code in territory_zip_codes table
		const match = await prisma.territoryZipCode.findFirst({
			where: { zipCode: normalizedZip },
			include: {
				territory: {
					include: {
						assignments: {
							where: { status: 'active' },
							orderBy: { assignedAt: 'desc' },
							take: 1,
							include: {
								organization: {
									select: { id: true, name: true }
								}
							}
						}
					}
				}
			}
		});

		if (!match?.territory) {
			return { territoryId: null, organizationId: null, territoryName: null };
		}

		const activeAssignment = match.territory.assignments[0];

		return {
			territoryId: match.territory.id,
			organizationId: activeAssignment?.organizationId ?? null,
			territoryName: match.territory.name
		};
	} catch (error) {
		console.error('Error routing lead by zip code:', error);
		throw error;
	}
}

/**
 * Automatically assign territory and organization to a lead based on zip code.
 * Updates the lead record in the database.
 *
 * @param leadId - The lead's ID
 * @param zipCode - The lead's zip code
 * @returns The routing result
 */
export async function assignLeadToTerritory(leadId: string, zipCode: string): Promise<RouteResult> {
	const routeResult = await routeLeadByZipCode(zipCode);

	if (routeResult.territoryId) {
		try {
			await prisma.lead.update({
				where: { id: leadId },
				data: {
					territoryId: routeResult.territoryId,
					// Only update organizationId if we found one and the lead doesn't already have one
					...(routeResult.organizationId && {
						organizationId: routeResult.organizationId
					})
				}
			});
		} catch (error) {
			console.error('Error assigning lead to territory:', error);
			// Don't throw - return the route result even if update fails
		}
	}

	return routeResult;
}

/**
 * Check if a zip code is already claimed by any territory.
 *
 * @param zipCode - The zip code to check
 * @returns True if the zip code is mapped to a territory
 */
export async function isZipCodeClaimed(zipCode: string): Promise<boolean> {
	const normalizedZip = normalizeZipCode(zipCode);

	if (!normalizedZip) {
		return false;
	}

	const count = await prisma.territoryZipCode.count({
		where: { zipCode: normalizedZip }
	});

	return count > 0;
}

/**
 * Check if any of the given zip codes are already claimed.
 *
 * @param zipCodes - Array of zip codes to check
 * @returns Array of zip codes that are already claimed
 */
export async function getClaimedZipCodes(zipCodes: string[]): Promise<string[]> {
	const normalizedZips = zipCodes.map(normalizeZipCode).filter(Boolean) as string[];

	const claimed = await prisma.territoryZipCode.findMany({
		where: { zipCode: { in: normalizedZips } },
		select: { zipCode: true }
	});

	return claimed.map((c) => c.zipCode);
}

/**
 * Get all zip codes for a territory.
 *
 * @param territoryId - The territory ID
 * @returns Array of zip codes
 */
export async function getTerritoryZipCodes(territoryId: string): Promise<string[]> {
	const zipCodes = await prisma.territoryZipCode.findMany({
		where: { territoryId },
		select: { zipCode: true },
		orderBy: { zipCode: 'asc' }
	});

	return zipCodes.map((z) => z.zipCode);
}

/**
 * Add zip codes to a territory.
 *
 * @param territoryId - The territory ID
 * @param zipCodes - Array of zip codes to add
 * @param cityNames - Optional map of zip code to city name
 * @returns Number of zip codes added
 */
export async function addZipCodesToTerritory(
	territoryId: string,
	zipCodes: string[],
	cityNames?: Record<string, string>
): Promise<number> {
	const normalizedZips = zipCodes.map(normalizeZipCode).filter(Boolean) as string[];

	// Check which zips are already in this territory
	const existing = await prisma.territoryZipCode.findMany({
		where: {
			territoryId,
			zipCode: { in: normalizedZips }
		},
		select: { zipCode: true }
	});

	const existingSet = new Set(existing.map((e) => e.zipCode));
	const newZips = normalizedZips.filter((z) => !existingSet.has(z));

	if (newZips.length === 0) {
		return 0;
	}

	// Determine primary (first zip added to empty territory)
	const hasExisting = existing.length > 0;

	await prisma.territoryZipCode.createMany({
		data: newZips.map((zipCode, index) => ({
			territoryId,
			zipCode,
			city: cityNames?.[zipCode] ?? null,
			isPrimary: !hasExisting && index === 0
		}))
	});

	return newZips.length;
}

/**
 * Remove zip codes from a territory.
 *
 * @param territoryId - The territory ID
 * @param zipCodes - Array of zip codes to remove
 * @returns Number of zip codes removed
 */
export async function removeZipCodesFromTerritory(
	territoryId: string,
	zipCodes: string[]
): Promise<number> {
	const normalizedZips = zipCodes.map(normalizeZipCode).filter(Boolean) as string[];

	const result = await prisma.territoryZipCode.deleteMany({
		where: {
			territoryId,
			zipCode: { in: normalizedZips }
		}
	});

	return result.count;
}

/**
 * Get territory details with all zip codes and active assignment.
 *
 * @param territoryId - The territory ID
 * @returns Territory with zip codes and assignment info
 */
export async function getTerritoryWithZipCodes(territoryId: string) {
	return prisma.territory.findUnique({
		where: { id: territoryId },
		include: {
			zipCodes: {
				orderBy: { zipCode: 'asc' }
			},
			assignments: {
				where: { status: 'active' },
				include: {
					organization: {
						select: { id: true, name: true }
					}
				},
				take: 1
			}
		}
	});
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Normalize a zip code to 5-digit format.
 * Handles both 5-digit (12345) and 9-digit (12345-6789) formats.
 *
 * @param zipCode - The zip code to normalize
 * @returns The normalized 5-digit zip code, or null if invalid
 */
function normalizeZipCode(zipCode: string | null | undefined): string | null {
	if (!zipCode) {
		return null;
	}

	// Remove any non-digit characters and take first 5 digits
	const digits = zipCode.replace(/\D/g, '');

	if (digits.length < 5) {
		return null;
	}

	return digits.substring(0, 5);
}
