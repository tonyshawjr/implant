import type { PageServerLoad } from './$types';
import { prisma } from '$lib/server/db';
import { error } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ parent }) => {
  const { user, organization } = await parent();

  if (!organization) {
    throw error(404, 'Organization not found');
  }

  // Get the organization's active territory assignment
  const territoryAssignment = await prisma.territoryAssignment.findFirst({
    where: {
      organizationId: organization.id,
      status: 'active'
    },
    include: {
      territory: {
        include: {
          zipCodes: {
            orderBy: {
              isPrimary: 'desc'
            }
          }
        }
      }
    }
  });

  if (!territoryAssignment) {
    return {
      territory: null,
      zipCodes: [],
      assignment: null
    };
  }

  const territory = territoryAssignment.territory;

  // Format territory data for the client
  const territoryData = {
    id: territory.id,
    name: territory.name,
    city: territory.city,
    state: territory.state,
    centerLat: Number(territory.centerLat),
    centerLng: Number(territory.centerLng),
    radiusMiles: territory.radiusMiles,
    territoryType: territory.territoryType,
    status: territory.status,
    population: territory.population,
    households: territory.households,
    medianAge: territory.medianAge ? Number(territory.medianAge) : null,
    medianIncome: territory.medianIncome,
    implantCandidates: territory.implantCandidates,
    competitionCount: territory.competitionCount,
    monthlyBasePrice: territory.monthlyBasePrice ? Number(territory.monthlyBasePrice) : null,
    performanceScore: territory.performanceScore ? Number(territory.performanceScore) : null
  };

  // Format assignment data
  const assignmentData = {
    id: territoryAssignment.id,
    assignedAt: territoryAssignment.assignedAt.toISOString(),
    expiresAt: territoryAssignment.expiresAt?.toISOString() ?? null,
    isExclusive: territoryAssignment.isExclusive,
    monthlyRate: Number(territoryAssignment.monthlyRate),
    status: territoryAssignment.status
  };

  // Format zip codes
  const zipCodesData = territory.zipCodes.map((zc) => ({
    id: zc.id,
    zipCode: zc.zipCode,
    city: zc.city,
    isPrimary: zc.isPrimary
  }));

  return {
    territory: territoryData,
    zipCodes: zipCodesData,
    assignment: assignmentData
  };
};
