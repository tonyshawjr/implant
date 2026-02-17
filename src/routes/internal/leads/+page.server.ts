import type { PageServerLoad } from './$types';
import { prisma } from '$lib/server/db';
import type { LeadStatus, LeadSource, Prisma } from '@prisma/client';

export const load: PageServerLoad = async ({ url }) => {
  // Parse query parameters
  const page = Math.max(1, parseInt(url.searchParams.get('page') ?? '1'));
  const pageSize = Math.min(200, Math.max(20, parseInt(url.searchParams.get('pageSize') ?? '100')));
  const search = url.searchParams.get('search') ?? '';
  const status = url.searchParams.get('status') ?? '';
  const source = url.searchParams.get('source') ?? '';
  const organizationId = url.searchParams.get('organization') ?? '';
  const dateFrom = url.searchParams.get('dateFrom') ?? '';
  const dateTo = url.searchParams.get('dateTo') ?? '';
  const sortBy = url.searchParams.get('sortBy') ?? 'createdAt';
  const sortOrder = url.searchParams.get('sortOrder') === 'asc' ? 'asc' : 'desc';

  // Build where clause
  const where: Prisma.LeadWhereInput = {};

  // Organization filter
  if (organizationId) {
    where.organizationId = organizationId;
  }

  // Search filter (name, email, phone)
  if (search) {
    where.OR = [
      { firstName: { contains: search, mode: 'insensitive' } },
      { lastName: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
      { phone: { contains: search, mode: 'insensitive' } }
    ];
  }

  // Status filter
  if (status && ['new', 'contacted', 'qualified', 'appointment_set', 'consultation_completed', 'converted', 'lost'].includes(status)) {
    where.status = status as LeadStatus;
  }

  // Source filter
  if (source && ['google', 'facebook', 'instagram', 'website', 'referral', 'manual'].includes(source)) {
    where.source = source as LeadSource;
  }

  // Date range filter
  if (dateFrom) {
    const fromDate = new Date(dateFrom);
    if (!isNaN(fromDate.getTime())) {
      where.createdAt = { ...(where.createdAt as object ?? {}), gte: fromDate };
    }
  }

  if (dateTo) {
    const toDate = new Date(dateTo);
    toDate.setHours(23, 59, 59, 999);
    if (!isNaN(toDate.getTime())) {
      where.createdAt = { ...(where.createdAt as object ?? {}), lte: toDate };
    }
  }

  // Build order by clause
  const validSortFields = ['createdAt', 'firstName', 'lastName', 'email', 'status', 'temperature', 'source'];
  const orderByField = validSortFields.includes(sortBy) ? sortBy : 'createdAt';
  const orderBy = { [orderByField]: sortOrder };

  // Get total count, leads, and organizations
  const [totalCount, leads, organizations] = await Promise.all([
    prisma.lead.count({ where }),
    prisma.lead.findMany({
      where,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        status: true,
        temperature: true,
        score: true,
        source: true,
        createdAt: true,
        updatedAt: true,
        organizationId: true,
        organization: {
          select: {
            id: true,
            name: true,
            slug: true
          }
        },
        campaign: {
          select: {
            id: true,
            name: true
          }
        },
        assignedToUser: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatarUrl: true
          }
        },
        activities: {
          select: {
            createdAt: true
          },
          orderBy: {
            createdAt: 'desc'
          },
          take: 1
        }
      },
      orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize
    }),
    // Get all organizations for filter dropdown
    prisma.organization.findMany({
      where: {
        deletedAt: null,
        status: 'active'
      },
      select: {
        id: true,
        name: true,
        slug: true
      },
      orderBy: {
        name: 'asc'
      }
    })
  ]);

  const totalPages = Math.ceil(totalCount / pageSize);

  return {
    leads: leads.map(lead => ({
      id: lead.id,
      firstName: lead.firstName,
      lastName: lead.lastName,
      email: lead.email,
      phone: lead.phone,
      status: lead.status,
      temperature: lead.temperature,
      score: lead.score,
      source: lead.source,
      organizationId: lead.organizationId,
      organizationName: lead.organization?.name ?? 'Unknown',
      organizationSlug: lead.organization?.slug ?? null,
      campaignName: lead.campaign?.name ?? null,
      createdAt: lead.createdAt.toISOString(),
      lastActivityAt: lead.activities[0]?.createdAt?.toISOString() ?? null,
      assignedToUser: lead.assignedToUser ? {
        id: lead.assignedToUser.id,
        firstName: lead.assignedToUser.firstName,
        lastName: lead.assignedToUser.lastName,
        avatarUrl: lead.assignedToUser.avatarUrl
      } : null
    })),
    organizations,
    pagination: {
      page,
      pageSize,
      totalCount,
      totalPages
    },
    filters: {
      search,
      status,
      source,
      organizationId,
      dateFrom,
      dateTo,
      sortBy: orderByField,
      sortOrder
    }
  };
};
