import type { PageServerLoad } from './$types';
import { prisma } from '$lib/server/db';
import type { LeadStatus, LeadSource, Prisma } from '@prisma/client';

export const load: PageServerLoad = async ({ parent, url }) => {
  const { organization } = await parent();

  if (!organization) {
    return {
      leads: [],
      pagination: { page: 1, pageSize: 20, totalCount: 0, totalPages: 0 },
      filters: { search: '', status: '', source: '', dateFrom: '', dateTo: '' }
    };
  }

  const organizationId = organization.id;

  // Parse query parameters
  const page = Math.max(1, parseInt(url.searchParams.get('page') ?? '1'));
  const pageSize = Math.min(100, Math.max(10, parseInt(url.searchParams.get('pageSize') ?? '20')));
  const search = url.searchParams.get('search') ?? '';
  const status = url.searchParams.get('status') ?? '';
  const source = url.searchParams.get('source') ?? '';
  const dateFrom = url.searchParams.get('dateFrom') ?? '';
  const dateTo = url.searchParams.get('dateTo') ?? '';
  const sortBy = url.searchParams.get('sortBy') ?? 'createdAt';
  const sortOrder = url.searchParams.get('sortOrder') === 'asc' ? 'asc' : 'desc';

  // Build where clause
  const where: Prisma.LeadWhereInput = {
    organizationId
  };

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

  // Get total count and leads
  const [totalCount, leads] = await Promise.all([
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
        campaign: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize
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
      campaignName: lead.campaign?.name ?? null,
      createdAt: lead.createdAt.toISOString()
    })),
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
      dateFrom,
      dateTo,
      sortBy: orderByField,
      sortOrder
    }
  };
};
