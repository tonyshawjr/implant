import type { PageServerLoad, Actions } from './$types';
import { redirect, fail, error } from '@sveltejs/kit';
import { prisma } from '$lib/server/db';

// Default Pricing Configuration (same as create page)
const DEFAULT_PRICING_CONFIG = {
	scoring: {
		senior: { weight: 30, thresholds: [{ min: 20, points: 30 }, { min: 15, points: 25 }, { min: 12, points: 20 }, { min: 8, points: 15 }, { min: 0, points: 10 }] },
		income: { weight: 25, thresholds: [{ min: 100000, points: 25 }, { min: 75000, points: 20 }, { min: 55000, points: 15 }, { min: 40000, points: 10 }, { min: 0, points: 5 }] },
		population: { weight: 25, thresholds: [{ min: 500000, points: 25 }, { min: 250000, points: 20 }, { min: 100000, points: 15 }, { min: 50000, points: 10 }, { min: 0, points: 5 }] },
		homeValue: { weight: 20, thresholds: [{ min: 500000, points: 20 }, { min: 350000, points: 16 }, { min: 250000, points: 12 }, { min: 150000, points: 8 }, { min: 0, points: 4 }] }
	},
	priceTiers: [
		{ minScore: 80, price: 3500, label: 'Premium' },
		{ minScore: 65, price: 2750, label: 'High' },
		{ minScore: 50, price: 2000, label: 'Standard' },
		{ minScore: 35, price: 1500, label: 'Moderate' },
		{ minScore: 0, price: 1000, label: 'Entry' }
	]
};

export const load: PageServerLoad = async ({ params }) => {
	const { id } = params;

	// Load the territory with its zip codes, waitlist, and assignments
	const [territory, waitlist, organizations] = await Promise.all([
		prisma.territory.findUnique({
			where: { id },
			include: {
				zipCodes: true,
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
		}),
		prisma.territoryWaitlist.findMany({
			where: { territoryId: id },
			orderBy: { position: 'asc' }
		}),
		prisma.organization.findMany({
			where: { deletedAt: null },
			select: { id: true, name: true, status: true },
			orderBy: { name: 'asc' }
		})
	]);

	if (!territory) {
		throw error(404, 'Territory not found');
	}

	// Load pricing config
	let pricingConfig = DEFAULT_PRICING_CONFIG;
	try {
		const pricingConfigSetting = await prisma.systemSetting.findUnique({
			where: { key: 'territory_pricing' }
		});
		if (pricingConfigSetting?.value) {
			pricingConfig = pricingConfigSetting.value as typeof DEFAULT_PRICING_CONFIG;
		}
	} catch (dbError) {
		console.error('Failed to load pricing config from database:', dbError);
	}

	return {
		territory: {
			id: territory.id,
			name: territory.name,
			city: territory.city,
			state: territory.state,
			status: territory.status,
			boundaryType: territory.boundaryType,
			territoryType: territory.territoryType,
			msaCode: territory.msaCode,
			countyFips: territory.countyFips,
			placeFips: territory.placeFips,
			radiusMiles: territory.radiusMiles,
			centerLat: territory.centerLat.toNumber(),
			centerLng: territory.centerLng.toNumber(),
			population: territory.population,
			households: territory.households,
			medianIncome: territory.medianIncome,
			medianAge: territory.medianAge?.toNumber() ?? null,
			population65Plus: territory.population65Plus,
			population65Pct: territory.population65Pct?.toNumber() ?? null,
			medianHomeValue: territory.medianHomeValue,
			veteransCount: territory.veteransCount,
			ownerOccupiedPct: territory.ownerOccupiedPct?.toNumber() ?? null,
			monthlyBasePrice: territory.monthlyBasePrice?.toNumber() ?? null,
			zipCodes: territory.zipCodes.map(z => ({
				zipCode: z.zipCode,
				city: z.city || '',
				isPrimary: z.isPrimary
			})),
			hasActiveAssignment: territory.assignments.length > 0,
			assignedTo: territory.assignments[0]?.organization?.name || null,
			assignedToId: territory.assignments[0]?.organization?.id || null
		},
		waitlist: waitlist.map(w => ({
			id: w.id,
			position: w.position,
			contactName: w.contactName,
			contactEmail: w.contactEmail,
			practiceName: w.practiceName,
			status: w.status,
			joinedAt: w.joinedAt.toISOString()
		})),
		organizations: organizations.map(o => ({
			id: o.id,
			name: o.name,
			status: o.status
		})),
		pricingConfig
	};
};

interface ZipCodeEntry {
	zipCode: string;
	city: string;
}

interface TerritoryDemographics {
	population: number;
	households: number;
	medianIncome: number;
	medianAge: number;
	population65Plus?: number;
	population65PlusPercent?: number;
	medianHomeValue?: number;
	veteransCount?: number;
	ownerOccupiedPercent?: number;
}

export const actions: Actions = {
	/**
	 * Update an existing territory
	 */
	updateTerritory: async ({ params, request }) => {
		const { id } = params;
		const formData = await request.formData();

		// Extract required fields
		const name = formData.get('name') as string;
		const boundaryType = formData.get('boundaryType') as string;
		const state = formData.get('state') as string;
		const zipCodesJson = formData.get('zipCodes') as string;
		const demographicsJson = formData.get('demographics') as string;
		const monthlyBasePriceStr = formData.get('monthlyBasePrice') as string;
		const centerLatStr = formData.get('centerLat') as string;
		const centerLngStr = formData.get('centerLng') as string;
		const radiusMilesStr = formData.get('radiusMiles') as string;

		// Optional fields
		const msaCode = formData.get('msaCode') as string | null;
		const countyFips = formData.get('countyFips') as string | null;
		const placeFips = formData.get('placeFips') as string | null;
		const territoryType = (formData.get('territoryType') as string) || 'standard';
		const primaryCity = formData.get('primaryCity') as string || '';

		// Validation
		if (!name || name.trim().length === 0) {
			return fail(400, { error: 'Territory name is required' });
		}

		if (!boundaryType) {
			return fail(400, { error: 'Boundary type is required' });
		}

		if (!state) {
			return fail(400, { error: 'State is required' });
		}

		// Parse zip codes
		let zipCodes: ZipCodeEntry[] = [];
		try {
			zipCodes = JSON.parse(zipCodesJson || '[]');
		} catch {
			return fail(400, { error: 'Invalid zip codes format' });
		}

		// Parse demographics
		let demographics: TerritoryDemographics;
		try {
			demographics = JSON.parse(demographicsJson || '{}');
		} catch {
			return fail(400, { error: 'Invalid demographics format' });
		}

		// Parse numeric values
		const monthlyBasePrice = parseFloat(monthlyBasePriceStr);
		const centerLat = parseFloat(centerLatStr);
		const centerLng = parseFloat(centerLngStr);
		const radiusMiles = parseInt(radiusMilesStr) || 15;

		if (isNaN(centerLat) || isNaN(centerLng)) {
			return fail(400, { error: 'Valid coordinates are required' });
		}

		// Check for overlapping territories (excluding this one)
		try {
			const existingTerritories = await prisma.territory.findMany({
				where: {
					status: { in: ['available', 'locked', 'waitlist'] },
					id: { not: id }
				},
				select: {
					id: true,
					name: true,
					centerLat: true,
					centerLng: true,
					radiusMiles: true
				}
			});

			const overlapping = existingTerritories.filter((t) => {
				const tLat = t.centerLat.toNumber();
				const tLng = t.centerLng.toNumber();

				const latDiff = Math.abs(centerLat - tLat) * 69;
				const lngDiff = Math.abs(centerLng - tLng) * 69 * Math.cos(centerLat * (Math.PI / 180));
				const distance = Math.sqrt(latDiff * latDiff + lngDiff * lngDiff);

				return distance < radiusMiles + t.radiusMiles;
			});

			if (overlapping.length > 0) {
				return fail(400, {
					error: `Territory overlaps with existing territory: ${overlapping[0].name}`,
					overlapping: overlapping.map((t) => ({
						id: t.id,
						name: t.name
					}))
				});
			}
		} catch (error) {
			console.error('Failed to check for overlapping territories:', error);
		}

		// Update the territory
		try {
			await prisma.territory.update({
				where: { id },
				data: {
					name: name.trim(),
					city: primaryCity || zipCodes[0]?.city || '',
					state,
					boundaryType: boundaryType as 'metro' | 'county' | 'city' | 'zipcode' | 'custom',
					territoryType: territoryType as 'standard' | 'premium' | 'metro',
					centerLat,
					centerLng,
					radiusMiles,
					population: demographics.population || null,
					households: demographics.households || null,
					medianIncome: demographics.medianIncome || null,
					medianAge: demographics.medianAge || null,
					population65Plus: demographics.population65Plus || null,
					population65Pct: demographics.population65PlusPercent || null,
					medianHomeValue: demographics.medianHomeValue || null,
					veteransCount: demographics.veteransCount || null,
					ownerOccupiedPct: demographics.ownerOccupiedPercent || null,
					monthlyBasePrice: isNaN(monthlyBasePrice) ? null : monthlyBasePrice,
					msaCode: msaCode || null,
					countyFips: countyFips || null,
					placeFips: placeFips || null
				}
			});

			// Update zip codes: delete existing and re-add
			await prisma.territoryZipCode.deleteMany({
				where: { territoryId: id }
			});

			if (zipCodes.length > 0) {
				await prisma.territoryZipCode.createMany({
					data: zipCodes.map((z, index) => ({
						territoryId: id,
						zipCode: z.zipCode,
						city: z.city || null,
						isPrimary: index === 0
					}))
				});
			}

			// Redirect to territories list
			throw redirect(303, '/internal/territories');
		} catch (error) {
			// Re-throw redirect
			if (error instanceof Response || (error && typeof error === 'object' && 'status' in error)) {
				throw error;
			}

			console.error('Failed to update territory:', error);
			return fail(500, { error: 'Failed to update territory. Please try again.' });
		}
	},

	/**
	 * Delete a territory
	 */
	deleteTerritory: async ({ params }) => {
		const { id } = params;

		try {
			// Check if territory has active assignments
			const activeAssignment = await prisma.territoryAssignment.findFirst({
				where: { territoryId: id, status: 'active' }
			});

			if (activeAssignment) {
				return fail(400, { error: 'Cannot delete territory with active client assignment' });
			}

			// Delete related records first
			await prisma.territoryWaitlist.deleteMany({
				where: { territoryId: id }
			});

			await prisma.territoryAssignment.deleteMany({
				where: { territoryId: id }
			});

			await prisma.territoryZipCode.deleteMany({
				where: { territoryId: id }
			});

			// Delete the territory
			await prisma.territory.delete({
				where: { id }
			});

			throw redirect(303, '/internal/territories');
		} catch (error) {
			// Re-throw redirect
			if (error instanceof Response || (error && typeof error === 'object' && 'status' in error)) {
				throw error;
			}

			console.error('Failed to delete territory:', error);
			return fail(500, { error: 'Failed to delete territory' });
		}
	},

	/**
	 * Release a territory from its current client assignment
	 */
	releaseTerritory: async ({ params }) => {
		const { id } = params;

		try {
			// Cancel all active assignments for this territory
			await prisma.territoryAssignment.updateMany({
				where: { territoryId: id, status: 'active' },
				data: { status: 'cancelled' }
			});

			// Set territory status back to available
			await prisma.territory.update({
				where: { id },
				data: { status: 'available' }
			});

			return { success: true, message: 'Territory released successfully' };
		} catch (error) {
			console.error('Failed to release territory:', error);
			return fail(500, { error: 'Failed to release territory' });
		}
	},

	/**
	 * Clear all waitlist entries for this territory
	 */
	clearWaitlist: async ({ params }) => {
		const { id } = params;

		try {
			// Delete all waitlist entries for this territory
			const deleted = await prisma.territoryWaitlist.deleteMany({
				where: { territoryId: id }
			});

			// Update territory status to available if it was on waitlist
			const territory = await prisma.territory.findUnique({
				where: { id },
				select: { status: true }
			});

			if (territory?.status === 'waitlist') {
				await prisma.territory.update({
					where: { id },
					data: { status: 'available' }
				});
			}

			return { success: true, message: `Cleared ${deleted.count} waitlist entries` };
		} catch (error) {
			console.error('Failed to clear waitlist:', error);
			return fail(500, { error: 'Failed to clear waitlist' });
		}
	},

	/**
	 * Assign territory to an organization
	 */
	assignTerritory: async ({ params, request }) => {
		const { id } = params;
		const formData = await request.formData();
		const organizationId = formData.get('organizationId') as string;
		const monthlyRate = parseFloat(formData.get('monthlyRate') as string);
		const waitlistEntryId = formData.get('waitlistEntryId') as string | null;

		if (!organizationId) {
			return fail(400, { error: 'Organization ID is required' });
		}

		if (isNaN(monthlyRate) || monthlyRate <= 0) {
			return fail(400, { error: 'Valid monthly rate is required' });
		}

		try {
			// Check if organization exists and is not deleted
			const organization = await prisma.organization.findFirst({
				where: { id: organizationId, deletedAt: null }
			});

			if (!organization) {
				return fail(400, { error: 'Organization not found or has been deleted' });
			}

			// Cancel any existing active assignments for this territory
			await prisma.territoryAssignment.updateMany({
				where: { territoryId: id, status: 'active' },
				data: { status: 'cancelled' }
			});

			// Create new assignment
			await prisma.territoryAssignment.create({
				data: {
					territoryId: id,
					organizationId,
					monthlyRate,
					assignedAt: new Date(),
					isExclusive: true,
					status: 'active'
				}
			});

			// Update territory status to locked
			await prisma.territory.update({
				where: { id },
				data: { status: 'locked' }
			});

			// If assigning from waitlist, mark that entry as converted, delete others
			if (waitlistEntryId) {
				await prisma.territoryWaitlist.update({
					where: { id: waitlistEntryId },
					data: { status: 'converted' }
				});
				// Delete remaining waitlist entries
				await prisma.territoryWaitlist.deleteMany({
					where: { territoryId: id, id: { not: waitlistEntryId } }
				});
			} else {
				// Clear all waitlist entries
				await prisma.territoryWaitlist.deleteMany({
					where: { territoryId: id }
				});
			}

			return { success: true, message: `Territory assigned to ${organization.name}` };
		} catch (error) {
			console.error('Failed to assign territory:', error);
			return fail(500, { error: 'Failed to assign territory' });
		}
	},

	/**
	 * Remove a single waitlist entry
	 */
	removeWaitlistEntry: async ({ request }) => {
		const formData = await request.formData();
		const waitlistId = formData.get('waitlistId') as string;
		const territoryId = formData.get('territoryId') as string;

		if (!waitlistId) {
			return fail(400, { error: 'Waitlist entry ID is required' });
		}

		try {
			// Delete the waitlist entry
			await prisma.territoryWaitlist.delete({
				where: { id: waitlistId }
			});

			// Check if there are any remaining waitlist entries
			if (territoryId) {
				const remainingCount = await prisma.territoryWaitlist.count({
					where: { territoryId, status: 'waiting' }
				});

				// If no more waitlist entries and territory is in waitlist status, update to available
				if (remainingCount === 0) {
					const territory = await prisma.territory.findUnique({
						where: { id: territoryId },
						select: { status: true }
					});

					if (territory?.status === 'waitlist') {
						await prisma.territory.update({
							where: { id: territoryId },
							data: { status: 'available' }
						});
					}
				}
			}

			return { success: true, message: 'Waitlist entry removed' };
		} catch (error) {
			console.error('Failed to remove waitlist entry:', error);
			return fail(500, { error: 'Failed to remove waitlist entry' });
		}
	}
};
