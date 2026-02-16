import type { PageServerLoad, Actions } from './$types';
import { prisma } from '$lib/server/db';
import { fail } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ url }) => {
  // Get query parameters for filtering
  const search = url.searchParams.get('search') || '';
  const status = url.searchParams.get('status') || '';
  const healthFilter = url.searchParams.get('health') || '';
  const page = parseInt(url.searchParams.get('page') || '1');
  const limit = 20;
  const offset = (page - 1) * limit;

  // Build where clause for filtering
  const where: any = {
    deletedAt: null
  };

  // Search filter
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
      { city: { contains: search, mode: 'insensitive' } }
    ];
  }

  // Status filter
  if (status) {
    where.status = status;
  }

  // Health score filter
  if (healthFilter) {
    if (healthFilter === 'excellent') {
      where.healthScore = { gte: 85 };
    } else if (healthFilter === 'good') {
      where.healthScore = { gte: 70, lt: 85 };
    } else if (healthFilter === 'warning') {
      where.healthScore = { gte: 50, lt: 70 };
    } else if (healthFilter === 'critical') {
      where.healthScore = { lt: 50 };
    }
  }

  // Current month date range
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

  // Fetch all data in parallel
  const [
    clients,
    totalClients,
    stats,
    clientsAtRisk,
    upcomingRenewals,
    recentLeadsCount,
    territories
  ] = await Promise.all([
    // Main clients query with related data
    prisma.organization.findMany({
      where,
      orderBy: [
        { healthScore: 'asc' }, // Show lowest health scores first
        { name: 'asc' }
      ],
      skip: offset,
      take: limit,
      include: {
        territoryAssignments: {
          where: { status: 'active' },
          include: {
            territory: {
              select: {
                id: true,
                name: true,
                city: true,
                state: true
              }
            }
          },
          take: 1
        },
        contracts: {
          where: { status: 'active' },
          orderBy: { endDate: 'asc' },
          take: 1,
          select: {
            id: true,
            status: true,
            monthlyCommitment: true,
            endDate: true,
            plan: {
              select: {
                name: true
              }
            }
          }
        },
        _count: {
          select: {
            leads: {
              where: {
                createdAt: {
                  gte: startOfMonth,
                  lte: endOfMonth
                }
              }
            },
            campaigns: {
              where: { status: 'active' }
            }
          }
        }
      }
    }),

    // Total count for pagination
    prisma.organization.count({ where }),

    // Summary stats
    prisma.organization.groupBy({
      by: ['status'],
      where: { deletedAt: null },
      _count: { status: true }
    }),

    // Clients at risk (health score < 50)
    prisma.organization.count({
      where: {
        deletedAt: null,
        status: 'active',
        healthScore: { lt: 50 }
      }
    }),

    // Contracts expiring in next 30 days
    prisma.contract.findMany({
      where: {
        status: 'active',
        endDate: {
          gte: now,
          lte: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
        },
        organization: {
          deletedAt: null
        }
      },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            healthScore: true
          }
        }
      },
      orderBy: { endDate: 'asc' },
      take: 5
    }),

    // Total leads this month across all orgs
    prisma.lead.count({
      where: {
        createdAt: {
          gte: startOfMonth,
          lte: endOfMonth
        }
      }
    }),

    // All territories for client creation
    prisma.territory.findMany({
      orderBy: [{ state: 'asc' }, { city: 'asc' }],
      select: {
        id: true,
        name: true,
        city: true,
        state: true,
        status: true,
        monthlyBasePrice: true,
        population: true
      }
    })
  ]);

  // Calculate MRR from active contracts
  const mrrData = await prisma.contract.aggregate({
    where: {
      status: 'active',
      organization: {
        deletedAt: null
      }
    },
    _sum: {
      monthlyCommitment: true
    }
  });

  // Process stats into summary
  const totalActive = stats.find(s => s.status === 'active')?._count.status || 0;
  const totalSuspended = stats.find(s => s.status === 'suspended')?._count.status || 0;
  const totalChurned = stats.find(s => s.status === 'churned')?._count.status || 0;
  const mrr = mrrData._sum.monthlyCommitment?.toNumber() || 0;

  // Calculate CPL for each client (simplified - would normally come from campaign metrics)
  const clientsWithCpl = await Promise.all(
    clients.map(async (client) => {
      const metrics = await prisma.campaignMetric.aggregate({
        where: {
          campaign: {
            organizationId: client.id,
            status: 'active'
          },
          date: {
            gte: startOfMonth,
            lte: endOfMonth
          }
        },
        _sum: {
          spend: true,
          leads: true
        }
      });

      const spend = metrics._sum.spend?.toNumber() || 0;
      const leads = metrics._sum.leads || 0;
      const cpl = leads > 0 ? spend / leads : 0;

      return {
        ...client,
        cpl,
        monthlySpend: spend
      };
    })
  );

  return {
    clients: clientsWithCpl.map(client => ({
      id: client.id,
      name: client.name,
      slug: client.slug,
      status: client.status,
      healthScore: client.healthScore?.toNumber() ?? 0,
      territory: client.territoryAssignments[0]?.territory ? {
        id: client.territoryAssignments[0].territory.id,
        name: client.territoryAssignments[0].territory.name,
        location: `${client.territoryAssignments[0].territory.city}, ${client.territoryAssignments[0].territory.state}`
      } : null,
      contract: client.contracts[0] ? {
        id: client.contracts[0].id,
        status: client.contracts[0].status,
        mrr: client.contracts[0].monthlyCommitment.toNumber(),
        endDate: client.contracts[0].endDate.toISOString(),
        planName: client.contracts[0].plan.name
      } : null,
      leadsThisMonth: client._count.leads,
      activeCampaigns: client._count.campaigns,
      cpl: client.cpl,
      monthlySpend: client.monthlySpend
    })),
    stats: {
      totalClients: totalActive + totalSuspended + totalChurned,
      activeClients: totalActive,
      suspendedClients: totalSuspended,
      churnedThisMonth: totalChurned,
      clientsAtRisk,
      mrr,
      totalLeadsThisMonth: recentLeadsCount
    },
    upcomingRenewals: upcomingRenewals.map(r => ({
      id: r.id,
      organizationId: r.organization.id,
      organizationName: r.organization.name,
      healthScore: r.organization.healthScore?.toNumber() ?? 0,
      endDate: r.endDate.toISOString()
    })),
    pagination: {
      page,
      limit,
      total: totalClients,
      totalPages: Math.ceil(totalClients / limit)
    },
    filters: {
      search,
      status,
      health: healthFilter
    },
    territories: territories.map(t => ({
      id: t.id,
      name: t.name,
      location: `${t.city}, ${t.state}`,
      status: t.status,
      monthlyPrice: t.monthlyBasePrice?.toNumber() ?? 0,
      population: t.population
    }))
  };
};

export const actions: Actions = {
  updateStatus: async ({ request }) => {
    const formData = await request.formData();
    const organizationId = formData.get('organizationId') as string;
    const newStatus = formData.get('status') as string;

    if (!organizationId || !newStatus) {
      return fail(400, { error: 'Organization ID and status are required' });
    }

    try {
      await prisma.organization.update({
        where: { id: organizationId },
        data: { status: newStatus as any }
      });

      return { success: true };
    } catch (error) {
      console.error('Failed to update organization status:', error);
      return fail(500, { error: 'Failed to update status' });
    }
  },

  addClient: async ({ request }) => {
    const formData = await request.formData();
    const name = formData.get('name') as string;
    const email = formData.get('email') as string;
    const phone = formData.get('phone') as string;
    const city = formData.get('city') as string;
    const state = formData.get('state') as string;
    const zip = formData.get('zip') as string;
    const website = formData.get('website') as string;
    const territoryId = formData.get('territoryId') as string;

    if (!name || !email || !city || !state) {
      return fail(400, { error: 'Name, email, city, and state are required' });
    }

    if (!territoryId) {
      return fail(400, { error: 'Please select a territory' });
    }

    try {
      // Get the territory to check availability and pricing
      const territory = await prisma.territory.findUnique({
        where: { id: territoryId },
        include: {
          waitlist: {
            where: { status: 'waiting' },
            orderBy: { position: 'desc' },
            take: 1
          }
        }
      });

      if (!territory) {
        return fail(400, { error: 'Territory not found' });
      }

      // Generate a slug from the name
      const slug = name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');

      // Create the organization
      const organization = await prisma.organization.create({
        data: {
          name,
          slug,
          email,
          phone: phone || null,
          city,
          state,
          postalCode: zip || null,
          website: website || null,
          status: territory.status === 'available' ? 'active' : 'onboarding',
          healthScore: 75,
          clientSince: new Date()
        }
      });

      // If territory is available, assign it and create contract
      if (territory.status === 'available') {
        // Assign territory to client
        await prisma.territoryAssignment.create({
          data: {
            organizationId: organization.id,
            territoryId: territory.id,
            monthlyRate: territory.monthlyBasePrice ?? 0,
            status: 'active',
            assignedAt: new Date()
          }
        });

        // Lock the territory
        await prisma.territory.update({
          where: { id: territory.id },
          data: { status: 'locked' }
        });

        // Find or create a default plan for contract (territory-based)
        let planRecord = await prisma.plan.findFirst({
          where: { slug: 'territory-standard' }
        });

        if (!planRecord) {
          planRecord = await prisma.plan.create({
            data: {
              name: 'Territory Standard',
              slug: 'territory-standard',
              basePrice: territory.monthlyBasePrice ?? 0,
              features: ['Lead generation', 'Territory exclusivity', 'AI brand voice'],
              isActive: true
            }
          });
        }

        // Generate unique contract number
        const contractNumber = `CNT-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

        // Create contract with territory pricing
        await prisma.contract.create({
          data: {
            organizationId: organization.id,
            planId: planRecord.id,
            contractNumber,
            status: 'active',
            monthlyCommitment: territory.monthlyBasePrice ?? 0,
            startDate: new Date(),
            endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year from now
            autoRenew: true
          }
        });

        return { success: true, organizationId: organization.id, message: 'Client created and territory assigned' };
      } else {
        // Territory is not available - add to waitlist
        const nextPosition = (territory.waitlist[0]?.position ?? 0) + 1;

        await prisma.territoryWaitlist.create({
          data: {
            territoryId: territory.id,
            contactName: name,
            contactEmail: email,
            contactPhone: phone || null,
            practiceName: name,
            position: nextPosition,
            joinedAt: new Date(),
            status: 'waiting'
          }
        });

        return {
          success: true,
          organizationId: organization.id,
          waitlisted: true,
          message: `Client created and added to waitlist (position #${nextPosition}) for ${territory.name}`
        };
      }
    } catch (error) {
      console.error('Failed to create client:', error);
      return fail(500, { error: 'Failed to create client' });
    }
  }
};
