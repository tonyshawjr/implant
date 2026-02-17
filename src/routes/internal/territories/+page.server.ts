import type { PageServerLoad, Actions } from './$types';
import { prisma } from '$lib/server/db';
import { fail } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ url }) => {
  // Get query parameters for filtering
  const search = url.searchParams.get('search') || '';
  const status = url.searchParams.get('status') || '';
  const state = url.searchParams.get('state') || '';
  const type = url.searchParams.get('type') || '';
  const page = parseInt(url.searchParams.get('page') || '1');
  const limit = 20;
  const offset = (page - 1) * limit;

  // Build where clause for filtering
  const where: any = {};

  // Search filter
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { city: { contains: search, mode: 'insensitive' } },
      { state: { contains: search, mode: 'insensitive' } },
      { zipCodes: { some: { zipCode: { contains: search } } } }
    ];
  }

  // Status filter
  if (status) {
    where.status = status;
  }

  // State filter
  if (state) {
    where.state = state;
  }

  // Type filter
  if (type) {
    where.territoryType = type;
  }

  // Fetch all data in parallel
  const [
    territories,
    totalTerritories,
    stats,
    waitlistByTerritory,
    states
  ] = await Promise.all([
    // Main territories query with related data
    prisma.territory.findMany({
      where,
      orderBy: [
        { status: 'asc' },
        { state: 'asc' },
        { city: 'asc' }
      ],
      skip: offset,
      take: limit,
      include: {
        assignments: {
          where: {
            status: 'active',
            organization: {
              deletedAt: null
            }
          },
          include: {
            organization: {
              select: {
                id: true,
                name: true,
                healthScore: true,
                status: true
              }
            }
          },
          take: 1
        },
        waitlist: {
          where: { status: 'waiting' },
          orderBy: { position: 'asc' },
          take: 3
        },
        _count: {
          select: {
            leads: true,
            campaigns: true,
            waitlist: {
              where: { status: 'waiting' }
            }
          }
        }
      }
    }),

    // Total count for pagination
    prisma.territory.count({ where }),

    // Summary stats
    prisma.territory.groupBy({
      by: ['status'],
      _count: { status: true },
      _sum: { monthlyBasePrice: true }
    }),

    // Waitlist counts by territory
    prisma.territoryWaitlist.groupBy({
      by: ['territoryId'],
      where: { status: 'waiting' },
      _count: { id: true }
    }),

    // Get unique states for filter
    prisma.territory.findMany({
      distinct: ['state'],
      select: { state: true },
      orderBy: { state: 'asc' }
    })
  ]);

  // Calculate revenue from locked territories
  const lockedTerritories = await prisma.territoryAssignment.findMany({
    where: { status: 'active' },
    select: { monthlyRate: true }
  });

  const totalMonthlyRevenue = lockedTerritories.reduce(
    (sum, t) => sum + (t.monthlyRate?.toNumber() || 0),
    0
  );

  // Process stats into summary
  const lockedCount = stats.find(s => s.status === 'locked')?._count.status || 0;
  const availableCount = stats.find(s => s.status === 'available')?._count.status || 0;
  const waitlistCount = stats.find(s => s.status === 'waitlist')?._count.status || 0;

  // Calculate total waitlist entries
  const totalWaitlistEntries = waitlistByTerritory.reduce(
    (sum, w) => sum + w._count.id,
    0
  );

  return {
    territories: territories.map(territory => ({
      id: territory.id,
      name: territory.name,
      city: territory.city,
      state: territory.state,
      location: `${territory.city}, ${territory.state}`,
      status: territory.status,
      type: territory.territoryType,
      boundaryType: territory.boundaryType,
      msaCode: territory.msaCode,
      countyFips: territory.countyFips,
      placeFips: territory.placeFips,
      radiusMiles: territory.radiusMiles,
      population: territory.population,
      households: territory.households,
      medianAge: territory.medianAge?.toNumber() ?? null,
      medianIncome: territory.medianIncome,
      implantCandidates: territory.implantCandidates,
      competitionCount: territory.competitionCount,
      monthlyBasePrice: territory.monthlyBasePrice?.toNumber() ?? null,
      performanceScore: territory.performanceScore?.toNumber() ?? null,
      centerLat: territory.centerLat.toNumber(),
      centerLng: territory.centerLng.toNumber(),
      client: territory.assignments[0]?.organization ? {
        id: territory.assignments[0].organization.id,
        name: territory.assignments[0].organization.name,
        healthScore: territory.assignments[0].organization.healthScore?.toNumber() ?? 0,
        status: territory.assignments[0].organization.status,
        monthlyRate: territory.assignments[0].monthlyRate.toNumber()
      } : null,
      waitlist: territory.waitlist.map(w => ({
        id: w.id,
        position: w.position,
        contactName: w.contactName,
        contactEmail: w.contactEmail,
        practiceName: w.practiceName,
        joinedAt: w.joinedAt.toISOString()
      })),
      counts: {
        leads: territory._count.leads,
        campaigns: territory._count.campaigns,
        waitlist: territory._count.waitlist
      }
    })),
    stats: {
      total: lockedCount + availableCount + waitlistCount,
      locked: lockedCount,
      available: availableCount,
      waitlist: waitlistCount,
      totalWaitlistEntries,
      monthlyRevenue: totalMonthlyRevenue
    },
    states: states.map(s => s.state),
    pagination: {
      page,
      limit,
      total: totalTerritories,
      totalPages: Math.ceil(totalTerritories / limit)
    },
    filters: {
      search,
      status,
      state,
      type
    }
  };
};

export const actions: Actions = {
  updateStatus: async ({ request }) => {
    const formData = await request.formData();
    const territoryId = formData.get('territoryId') as string;
    const newStatus = formData.get('status') as string;

    if (!territoryId || !newStatus) {
      return fail(400, { error: 'Territory ID and status are required' });
    }

    try {
      await prisma.territory.update({
        where: { id: territoryId },
        data: { status: newStatus as any }
      });

      return { success: true };
    } catch (error) {
      console.error('Failed to update territory status:', error);
      return fail(500, { error: 'Failed to update status' });
    }
  },

  addToWaitlist: async ({ request }) => {
    const formData = await request.formData();
    const territoryId = formData.get('territoryId') as string;
    const contactName = formData.get('contactName') as string;
    const contactEmail = formData.get('contactEmail') as string;
    const contactPhone = formData.get('contactPhone') as string;
    const practiceName = formData.get('practiceName') as string;

    if (!territoryId || !contactName || !contactEmail) {
      return fail(400, { error: 'Territory ID, contact name, and email are required' });
    }

    try {
      // Get the next position in the waitlist
      const lastEntry = await prisma.territoryWaitlist.findFirst({
        where: { territoryId, status: 'waiting' },
        orderBy: { position: 'desc' }
      });

      const nextPosition = (lastEntry?.position || 0) + 1;

      await prisma.territoryWaitlist.create({
        data: {
          territoryId,
          contactName,
          contactEmail,
          contactPhone: contactPhone || null,
          practiceName: practiceName || null,
          position: nextPosition,
          joinedAt: new Date()
        }
      });

      // Update territory status to waitlist if it was available
      await prisma.territory.update({
        where: { id: territoryId },
        data: { status: 'waitlist' }
      });

      return { success: true };
    } catch (error) {
      console.error('Failed to add to waitlist:', error);
      return fail(500, { error: 'Failed to add to waitlist' });
    }
  },

  removeFromWaitlist: async ({ request }) => {
    const formData = await request.formData();
    const waitlistId = formData.get('waitlistId') as string;
    const territoryId = formData.get('territoryId') as string;

    if (!waitlistId) {
      return fail(400, { error: 'Waitlist entry ID is required' });
    }

    try {
      await prisma.territoryWaitlist.update({
        where: { id: waitlistId },
        data: { status: 'expired' }
      });

      // Check if there are any remaining waitlist entries
      const remainingCount = await prisma.territoryWaitlist.count({
        where: { territoryId, status: 'waiting' }
      });

      // If no more waitlist entries, update territory status to available
      if (remainingCount === 0) {
        await prisma.territory.update({
          where: { id: territoryId },
          data: { status: 'available' }
        });
      }

      return { success: true };
    } catch (error) {
      console.error('Failed to remove from waitlist:', error);
      return fail(500, { error: 'Failed to remove from waitlist' });
    }
  },

  checkOverlap: async ({ request }) => {
    const formData = await request.formData();
    const lat = parseFloat(formData.get('lat') as string);
    const lng = parseFloat(formData.get('lng') as string);
    const radius = parseInt(formData.get('radius') as string);
    const excludeId = formData.get('excludeId') as string;

    if (isNaN(lat) || isNaN(lng) || isNaN(radius)) {
      return fail(400, { error: 'Invalid coordinates or radius' });
    }

    try {
      // Simple distance calculation - in production would use PostGIS
      const territories = await prisma.territory.findMany({
        where: excludeId ? { id: { not: excludeId } } : {},
        select: {
          id: true,
          name: true,
          city: true,
          state: true,
          centerLat: true,
          centerLng: true,
          radiusMiles: true,
          status: true
        }
      });

      // Calculate overlap using Haversine formula approximation
      const overlapping = territories.filter(t => {
        const tLat = t.centerLat.toNumber();
        const tLng = t.centerLng.toNumber();

        // Approximate distance in miles (simplified)
        const latDiff = Math.abs(lat - tLat) * 69; // ~69 miles per degree lat
        const lngDiff = Math.abs(lng - tLng) * 69 * Math.cos(lat * Math.PI / 180);
        const distance = Math.sqrt(latDiff * latDiff + lngDiff * lngDiff);

        // Check if territories overlap
        return distance < (radius + t.radiusMiles);
      });

      return {
        overlapping: overlapping.map(t => ({
          id: t.id,
          name: t.name,
          location: `${t.city}, ${t.state}`,
          status: t.status
        }))
      };
    } catch (error) {
      console.error('Failed to check overlap:', error);
      return fail(500, { error: 'Failed to check overlap' });
    }
  },

  addTerritory: async ({ request }) => {
    const formData = await request.formData();

    const name = formData.get('name') as string;
    const city = formData.get('city') as string;
    const state = formData.get('state') as string;
    const territoryType = formData.get('territoryType') as string;
    const radiusMiles = parseInt(formData.get('radiusMiles') as string);
    const centerLat = parseFloat(formData.get('centerLat') as string);
    const centerLng = parseFloat(formData.get('centerLng') as string);
    const monthlyBasePrice = parseFloat(formData.get('monthlyBasePrice') as string) || null;
    const population = parseInt(formData.get('population') as string) || null;

    // Validation
    if (!name || !city || !state) {
      return fail(400, { error: 'Name, city, and state are required' });
    }

    if (isNaN(radiusMiles) || radiusMiles <= 0) {
      return fail(400, { error: 'Valid radius is required' });
    }

    if (isNaN(centerLat) || isNaN(centerLng)) {
      return fail(400, { error: 'Valid coordinates are required' });
    }

    try {
      await prisma.territory.create({
        data: {
          name,
          city,
          state,
          territoryType: (territoryType as 'standard' | 'premium' | 'metro') || 'standard',
          radiusMiles,
          centerLat,
          centerLng,
          monthlyBasePrice,
          population,
          status: 'available'
        }
      });

      return { success: true, message: 'Territory created successfully' };
    } catch (error) {
      console.error('Failed to create territory:', error);
      return fail(500, { error: 'Failed to create territory' });
    }
  },

  updateTerritory: async ({ request }) => {
    const formData = await request.formData();

    const territoryId = formData.get('territoryId') as string;
    const name = formData.get('name') as string;
    const city = formData.get('city') as string;
    const state = formData.get('state') as string;
    const territoryType = formData.get('territoryType') as string;
    const radiusMiles = parseInt(formData.get('radiusMiles') as string);
    const monthlyBasePrice = parseFloat(formData.get('monthlyBasePrice') as string) || null;
    const population = parseInt(formData.get('population') as string) || null;

    if (!territoryId) {
      return fail(400, { error: 'Territory ID is required' });
    }

    try {
      await prisma.territory.update({
        where: { id: territoryId },
        data: {
          name,
          city,
          state,
          territoryType: (territoryType as 'standard' | 'premium' | 'metro') || 'standard',
          radiusMiles,
          monthlyBasePrice,
          population
        }
      });

      return { success: true, message: 'Territory updated successfully' };
    } catch (error) {
      console.error('Failed to update territory:', error);
      return fail(500, { error: 'Failed to update territory' });
    }
  },

  deleteTerritory: async ({ request }) => {
    const formData = await request.formData();
    const territoryId = formData.get('territoryId') as string;

    if (!territoryId) {
      return fail(400, { error: 'Territory ID is required' });
    }

    try {
      // Check if territory has active assignments
      const activeAssignment = await prisma.territoryAssignment.findFirst({
        where: { territoryId, status: 'active' }
      });

      if (activeAssignment) {
        return fail(400, { error: 'Cannot delete territory with active client assignment' });
      }

      // Delete related records first
      await prisma.territoryWaitlist.deleteMany({
        where: { territoryId }
      });

      await prisma.territoryAssignment.deleteMany({
        where: { territoryId }
      });

      // Delete the territory
      await prisma.territory.delete({
        where: { id: territoryId }
      });

      return { success: true, message: 'Territory deleted successfully' };
    } catch (error) {
      console.error('Failed to delete territory:', error);
      return fail(500, { error: 'Failed to delete territory' });
    }
  }
};
