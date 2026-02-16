import type { PageServerLoad, Actions } from './$types';
import { prisma } from '$lib/server/db';
import { error, fail, redirect } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ params }) => {
	const { id } = params;

	// Fetch organization with related data for editing
	const organization = await prisma.organization.findUnique({
		where: { id, deletedAt: null },
		include: {
			accountManager: {
				select: {
					id: true,
					firstName: true,
					lastName: true,
					email: true
				}
			},
			contacts: {
				orderBy: { isPrimary: 'desc' }
			},
			territoryAssignments: {
				where: { status: 'active' },
				include: {
					territory: {
						select: {
							id: true,
							name: true,
							city: true,
							state: true,
							monthlyBasePrice: true
						}
					}
				}
			},
			contracts: {
				orderBy: { startDate: 'desc' },
				take: 1,
				include: {
					plan: true
				}
			}
		}
	});

	if (!organization) {
		throw error(404, 'Client not found');
	}

	// Get all available territories for assignment
	const availableTerritories = await prisma.territory.findMany({
		where: {
			status: 'available'
		},
		orderBy: [{ state: 'asc' }, { city: 'asc' }],
		select: {
			id: true,
			name: true,
			city: true,
			state: true,
			monthlyBasePrice: true,
			population: true
		}
	});

	// Get all users who can be account managers (internal staff)
	const accountManagers = await prisma.user.findMany({
		where: {
			role: { in: ['admin', 'super_admin', 'support'] },
			isActive: true,
			deletedAt: null
		},
		select: {
			id: true,
			firstName: true,
			lastName: true,
			email: true
		},
		orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }]
	});

	// Get pricing plans
	const plans = await prisma.pricingPlan.findMany({
		where: { isActive: true },
		orderBy: { basePrice: 'asc' }
	});

	return {
		organization: {
			id: organization.id,
			name: organization.name,
			slug: organization.slug,
			logoUrl: organization.logoUrl,
			website: organization.website,
			phone: organization.phone,
			email: organization.email,
			addressLine1: organization.addressLine1,
			addressLine2: organization.addressLine2,
			city: organization.city,
			state: organization.state,
			postalCode: organization.postalCode,
			country: organization.country,
			status: organization.status,
			avgCaseValue: organization.avgCaseValue?.toNumber() ?? 4000,
			accountManagerId: organization.accountManagerId
		},
		currentTerritory: organization.territoryAssignments[0]?.territory
			? {
					id: organization.territoryAssignments[0].territory.id,
					name: organization.territoryAssignments[0].territory.name,
					location: `${organization.territoryAssignments[0].territory.city}, ${organization.territoryAssignments[0].territory.state}`,
					monthlyRate: organization.territoryAssignments[0].monthlyRate?.toNumber() ?? 0,
					assignmentId: organization.territoryAssignments[0].id
				}
			: null,
		currentContract: organization.contracts[0]
			? {
					id: organization.contracts[0].id,
					planId: organization.contracts[0].planId,
					planName: organization.contracts[0].plan.name,
					monthlyCommitment: organization.contracts[0].monthlyCommitment.toNumber(),
					termMonths: organization.contracts[0].termMonths,
					status: organization.contracts[0].status,
					autoRenew: organization.contracts[0].autoRenew,
					startDate: organization.contracts[0].startDate.toISOString().split('T')[0],
					endDate: organization.contracts[0].endDate.toISOString().split('T')[0]
				}
			: null,
		contacts: organization.contacts.map((c) => ({
			id: c.id,
			firstName: c.firstName,
			lastName: c.lastName,
			email: c.email,
			phone: c.phone,
			title: c.title,
			contactType: c.contactType,
			isPrimary: c.isPrimary
		})),
		availableTerritories: availableTerritories.map((t) => ({
			id: t.id,
			name: t.name,
			location: `${t.city}, ${t.state}`,
			monthlyPrice: t.monthlyBasePrice?.toNumber() ?? 0,
			population: t.population
		})),
		accountManagers: accountManagers.map((u) => ({
			id: u.id,
			name: `${u.firstName} ${u.lastName}`,
			email: u.email
		})),
		plans: plans.map((p) => ({
			id: p.id,
			name: p.name,
			basePrice: p.basePrice.toNumber()
		}))
	};
};

export const actions: Actions = {
	updateClient: async ({ params, request }) => {
		const { id } = params;
		const formData = await request.formData();

		const name = formData.get('name') as string;
		const email = formData.get('email') as string;
		const phone = formData.get('phone') as string;
		const website = formData.get('website') as string;
		const addressLine1 = formData.get('addressLine1') as string;
		const addressLine2 = formData.get('addressLine2') as string;
		const city = formData.get('city') as string;
		const state = formData.get('state') as string;
		const postalCode = formData.get('postalCode') as string;
		const status = formData.get('status') as string;
		const accountManagerId = formData.get('accountManagerId') as string;
		const avgCaseValue = parseFloat(formData.get('avgCaseValue') as string) || 4000;

		if (!name || name.trim().length === 0) {
			return fail(400, { error: 'Practice name is required' });
		}

		try {
			await prisma.organization.update({
				where: { id },
				data: {
					name: name.trim(),
					email: email || null,
					phone: phone || null,
					website: website || null,
					addressLine1: addressLine1 || null,
					addressLine2: addressLine2 || null,
					city: city || null,
					state: state || null,
					postalCode: postalCode || null,
					status: status as any,
					accountManagerId: accountManagerId || null,
					avgCaseValue
				}
			});

			throw redirect(303, `/internal/clients/${id}`);
		} catch (err) {
			if (err instanceof Response || (err && typeof err === 'object' && 'status' in err)) {
				throw err;
			}
			console.error('Failed to update client:', err);
			return fail(500, { error: 'Failed to update client' });
		}
	},

	assignTerritory: async ({ params, request }) => {
		const { id } = params;
		const formData = await request.formData();

		const territoryId = formData.get('territoryId') as string;
		const monthlyRate = parseFloat(formData.get('monthlyRate') as string);

		if (!territoryId) {
			return fail(400, { error: 'Territory is required' });
		}

		try {
			// End any existing active assignments for this organization
			await prisma.territoryAssignment.updateMany({
				where: {
					organizationId: id,
					status: 'active'
				},
				data: {
					status: 'ended',
					endDate: new Date()
				}
			});

			// Create new assignment
			await prisma.territoryAssignment.create({
				data: {
					organizationId: id,
					territoryId,
					monthlyRate: isNaN(monthlyRate) ? 0 : monthlyRate,
					status: 'active',
					startDate: new Date()
				}
			});

			// Update territory status to locked
			await prisma.territory.update({
				where: { id: territoryId },
				data: { status: 'locked' }
			});

			return { success: true, message: 'Territory assigned successfully' };
		} catch (err) {
			console.error('Failed to assign territory:', err);
			return fail(500, { error: 'Failed to assign territory' });
		}
	},

	unassignTerritory: async ({ params, request }) => {
		const { id } = params;
		const formData = await request.formData();
		const assignmentId = formData.get('assignmentId') as string;

		if (!assignmentId) {
			return fail(400, { error: 'Assignment ID is required' });
		}

		try {
			// Get the assignment to find the territory
			const assignment = await prisma.territoryAssignment.findUnique({
				where: { id: assignmentId }
			});

			if (!assignment) {
				return fail(404, { error: 'Assignment not found' });
			}

			// End the assignment
			await prisma.territoryAssignment.update({
				where: { id: assignmentId },
				data: {
					status: 'ended',
					endDate: new Date()
				}
			});

			// Set territory back to available
			await prisma.territory.update({
				where: { id: assignment.territoryId },
				data: { status: 'available' }
			});

			return { success: true, message: 'Territory unassigned successfully' };
		} catch (err) {
			console.error('Failed to unassign territory:', err);
			return fail(500, { error: 'Failed to unassign territory' });
		}
	},

	addContact: async ({ params, request }) => {
		const { id } = params;
		const formData = await request.formData();

		const firstName = formData.get('firstName') as string;
		const lastName = formData.get('lastName') as string;
		const email = formData.get('email') as string;
		const phone = formData.get('phone') as string;
		const title = formData.get('title') as string;
		const contactType = formData.get('contactType') as string;
		const isPrimary = formData.get('isPrimary') === 'true';

		if (!firstName || !lastName) {
			return fail(400, { error: 'First and last name are required' });
		}

		try {
			// If this is primary, unset other primary contacts
			if (isPrimary) {
				await prisma.contact.updateMany({
					where: { organizationId: id, isPrimary: true },
					data: { isPrimary: false }
				});
			}

			await prisma.contact.create({
				data: {
					organizationId: id,
					firstName,
					lastName,
					email: email || null,
					phone: phone || null,
					title: title || null,
					contactType: (contactType as any) || 'primary',
					isPrimary
				}
			});

			return { success: true, message: 'Contact added successfully' };
		} catch (err) {
			console.error('Failed to add contact:', err);
			return fail(500, { error: 'Failed to add contact' });
		}
	},

	deleteContact: async ({ request }) => {
		const formData = await request.formData();
		const contactId = formData.get('contactId') as string;

		if (!contactId) {
			return fail(400, { error: 'Contact ID is required' });
		}

		try {
			await prisma.contact.delete({
				where: { id: contactId }
			});

			return { success: true, message: 'Contact deleted' };
		} catch (err) {
			console.error('Failed to delete contact:', err);
			return fail(500, { error: 'Failed to delete contact' });
		}
	}
};
