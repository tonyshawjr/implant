import type { PageServerLoad, Actions } from './$types';
import { prisma } from '$lib/server/db';
import { fail } from '@sveltejs/kit';
import type { TicketStatus, TicketPriority, TicketCategory, Prisma } from '@prisma/client';
import { INTERNAL_ROLES } from '$lib/constants/roles';

export const load: PageServerLoad = async ({ url }) => {
  // Parse filter parameters
  const statusFilter = url.searchParams.get('status') ?? '';
  const priorityFilter = url.searchParams.get('priority') ?? '';
  const categoryFilter = url.searchParams.get('category') ?? '';
  const clientFilter = url.searchParams.get('client') ?? '';
  const assigneeFilter = url.searchParams.get('assignee') ?? '';
  const page = Math.max(1, parseInt(url.searchParams.get('page') ?? '1'));
  const pageSize = 20;

  // Build where clause for tickets
  const ticketWhere: Prisma.SupportTicketWhereInput = {};

  if (statusFilter && ['open', 'pending', 'in_progress', 'escalated', 'resolved', 'closed'].includes(statusFilter)) {
    ticketWhere.status = statusFilter as TicketStatus;
  } else {
    // By default, show open tickets
    ticketWhere.status = {
      in: ['open', 'pending', 'in_progress', 'escalated']
    };
  }

  if (priorityFilter && ['low', 'medium', 'high', 'urgent'].includes(priorityFilter)) {
    ticketWhere.priority = priorityFilter as TicketPriority;
  }

  if (categoryFilter && ['billing', 'technical', 'campaign', 'leads', 'account', 'other'].includes(categoryFilter)) {
    ticketWhere.category = categoryFilter as TicketCategory;
  }

  if (clientFilter) {
    ticketWhere.organizationId = clientFilter;
  }

  if (assigneeFilter) {
    ticketWhere.assignedTo = assigneeFilter;
  }

  // Get tickets, stats, and related data
  const [
    tickets,
    totalTicketCount,
    ticketStats,
    supportUsers,
    organizations,
    healthAlerts,
    upcomingReviews
  ] = await Promise.all([
    // Tickets with pagination
    prisma.supportTicket.findMany({
      where: ticketWhere,
      select: {
        id: true,
        ticketNumber: true,
        subject: true,
        description: true,
        category: true,
        priority: true,
        status: true,
        resolution: true,
        firstResponseAt: true,
        resolvedAt: true,
        closedAt: true,
        satisfactionRating: true,
        createdAt: true,
        updatedAt: true,
        organization: {
          select: {
            id: true,
            name: true,
            healthScore: true
          }
        },
        submittedByUser: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        },
        assignedToUser: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        },
        messages: {
          select: {
            id: true,
            message: true,
            isInternal: true,
            createdAt: true,
            sender: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                role: true
              }
            }
          },
          orderBy: {
            createdAt: 'asc'
          }
        }
      },
      orderBy: [
        { priority: 'desc' },
        { createdAt: 'desc' }
      ],
      skip: (page - 1) * pageSize,
      take: pageSize
    }),

    // Total count for pagination
    prisma.supportTicket.count({ where: ticketWhere }),

    // Statistics
    prisma.$transaction([
      // Open tickets
      prisma.supportTicket.count({
        where: { status: { in: ['open', 'pending', 'in_progress', 'escalated'] } }
      }),
      // Urgent/High priority open tickets
      prisma.supportTicket.count({
        where: {
          status: { in: ['open', 'pending', 'in_progress', 'escalated'] },
          priority: { in: ['urgent', 'high'] }
        }
      }),
      // Average first response time (in hours)
      prisma.supportTicket.findMany({
        where: {
          firstResponseAt: { not: null },
          createdAt: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
          }
        },
        select: {
          createdAt: true,
          firstResponseAt: true
        }
      }),
      // Resolution rate (last 30 days)
      prisma.supportTicket.count({
        where: {
          status: { in: ['resolved', 'closed'] },
          resolvedAt: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
          }
        }
      }),
      // Total tickets last 30 days
      prisma.supportTicket.count({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
          }
        }
      }),
      // Average satisfaction rating
      prisma.supportTicket.aggregate({
        _avg: {
          satisfactionRating: true
        },
        where: {
          satisfactionRating: { not: null }
        }
      }),
      // Escalated tickets
      prisma.supportTicket.count({
        where: { status: 'escalated' }
      })
    ]),

    // Support team members for assignment
    prisma.user.findMany({
      where: {
        role: {
          in: [...INTERNAL_ROLES]
        },
        isActive: true,
        deletedAt: null
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true
      }
    }),

    // Organizations for filtering
    prisma.organization.findMany({
      where: {
        deletedAt: null,
        status: 'active'
      },
      select: {
        id: true,
        name: true
      },
      orderBy: {
        name: 'asc'
      }
    }),

    // Active health alerts (for proactive outreach)
    prisma.clientHealthAlert.findMany({
      where: {
        resolvedAt: null
      },
      select: {
        id: true,
        alertType: true,
        severity: true,
        title: true,
        description: true,
        metricName: true,
        metricValue: true,
        thresholdValue: true,
        acknowledgedAt: true,
        createdAt: true,
        organization: {
          select: {
            id: true,
            name: true,
            healthScore: true
          }
        }
      },
      orderBy: [
        { severity: 'desc' },
        { createdAt: 'desc' }
      ],
      take: 20
    }),

    // Upcoming monthly reviews
    prisma.monthlyReview.findMany({
      where: {
        status: 'scheduled',
        scheduledDate: {
          gte: new Date(),
          lte: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) // Next 14 days
        }
      },
      select: {
        id: true,
        reviewType: true,
        scheduledDate: true,
        scheduledTime: true,
        durationMinutes: true,
        meetingLink: true,
        agenda: true,
        organization: {
          select: {
            id: true,
            name: true
          }
        },
        conductedByUser: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        }
      },
      orderBy: {
        scheduledDate: 'asc'
      }
    })
  ]);

  // Calculate average first response time
  const responseTimes = ticketStats[2];
  let avgResponseTimeHours = 0;
  if (responseTimes.length > 0) {
    const totalMs = responseTimes.reduce((acc, t) => {
      if (t.firstResponseAt) {
        return acc + (t.firstResponseAt.getTime() - t.createdAt.getTime());
      }
      return acc;
    }, 0);
    avgResponseTimeHours = totalMs / responseTimes.length / (1000 * 60 * 60);
  }

  // Calculate resolution rate
  const resolvedCount = ticketStats[3];
  const totalLast30Days = ticketStats[4];
  const resolutionRate = totalLast30Days > 0 ? (resolvedCount / totalLast30Days) * 100 : 0;

  // Map tickets to response format
  const ticketData = tickets.map(t => ({
    id: t.id,
    ticketNumber: t.ticketNumber,
    subject: t.subject,
    description: t.description,
    category: t.category,
    priority: t.priority,
    status: t.status,
    resolution: t.resolution,
    firstResponseAt: t.firstResponseAt?.toISOString() ?? null,
    resolvedAt: t.resolvedAt?.toISOString() ?? null,
    closedAt: t.closedAt?.toISOString() ?? null,
    satisfactionRating: t.satisfactionRating,
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
    organization: {
      id: t.organization.id,
      name: t.organization.name,
      healthScore: t.organization.healthScore ? Number(t.organization.healthScore) : null
    },
    submittedBy: {
      id: t.submittedByUser.id,
      name: `${t.submittedByUser.firstName} ${t.submittedByUser.lastName}`,
      email: t.submittedByUser.email
    },
    assignedTo: t.assignedToUser ? {
      id: t.assignedToUser.id,
      name: `${t.assignedToUser.firstName} ${t.assignedToUser.lastName}`
    } : null,
    messages: t.messages.map(m => ({
      id: m.id,
      message: m.message,
      isInternal: m.isInternal,
      createdAt: m.createdAt.toISOString(),
      sender: {
        id: m.sender.id,
        name: `${m.sender.firstName} ${m.sender.lastName}`,
        role: m.sender.role
      }
    })),
    // Calculate age in hours
    ageHours: Math.floor((Date.now() - t.createdAt.getTime()) / (1000 * 60 * 60))
  }));

  return {
    tickets: ticketData,
    pagination: {
      page,
      pageSize,
      totalCount: totalTicketCount,
      totalPages: Math.ceil(totalTicketCount / pageSize)
    },
    filters: {
      status: statusFilter,
      priority: priorityFilter,
      category: categoryFilter,
      client: clientFilter,
      assignee: assigneeFilter
    },
    stats: {
      openTickets: ticketStats[0],
      urgentHighPriority: ticketStats[1],
      avgResponseTimeHours: Math.round(avgResponseTimeHours * 10) / 10,
      resolutionRate: Math.round(resolutionRate),
      avgSatisfaction: ticketStats[5]._avg.satisfactionRating
        ? Math.round(ticketStats[5]._avg.satisfactionRating * 10) / 10
        : null,
      escalatedCount: ticketStats[6]
    },
    supportUsers: supportUsers.map(u => ({
      id: u.id,
      name: `${u.firstName} ${u.lastName}`,
      email: u.email,
      role: u.role
    })),
    organizations: organizations.map(o => ({
      id: o.id,
      name: o.name
    })),
    healthAlerts: healthAlerts.map(a => ({
      id: a.id,
      alertType: a.alertType,
      severity: a.severity,
      title: a.title,
      description: a.description,
      metricName: a.metricName,
      metricValue: a.metricValue ? Number(a.metricValue) : null,
      thresholdValue: a.thresholdValue ? Number(a.thresholdValue) : null,
      isAcknowledged: !!a.acknowledgedAt,
      createdAt: a.createdAt.toISOString(),
      organization: {
        id: a.organization.id,
        name: a.organization.name,
        healthScore: a.organization.healthScore ? Number(a.organization.healthScore) : null
      }
    })),
    upcomingReviews: upcomingReviews.map(r => ({
      id: r.id,
      reviewType: r.reviewType,
      scheduledDate: r.scheduledDate.toISOString(),
      scheduledTime: r.scheduledTime?.toISOString() ?? null,
      durationMinutes: r.durationMinutes,
      meetingLink: r.meetingLink,
      agenda: r.agenda,
      organization: {
        id: r.organization.id,
        name: r.organization.name
      },
      conductedBy: r.conductedByUser ? {
        id: r.conductedByUser.id,
        name: `${r.conductedByUser.firstName} ${r.conductedByUser.lastName}`
      } : null
    }))
  };
};

export const actions: Actions = {
  // Reply to ticket
  replyToTicket: async ({ request, locals }) => {
    const formData = await request.formData();

    const ticketId = formData.get('ticketId') as string;
    const message = formData.get('message') as string;
    const isInternal = formData.get('isInternal') === 'true';

    if (!ticketId || !message) {
      return fail(400, { error: 'Missing required fields' });
    }

    if (!locals.user) {
      return fail(401, { error: 'Unauthorized' });
    }

    try {
      // Get the ticket to check if this is first response
      const ticket = await prisma.supportTicket.findUnique({
        where: { id: ticketId },
        select: { firstResponseAt: true, status: true }
      });

      if (!ticket) {
        return fail(404, { error: 'Ticket not found' });
      }

      // Create the message
      await prisma.ticketMessage.create({
        data: {
          ticketId,
          senderId: locals.user.id,
          message,
          isInternal
        }
      });

      // Update ticket if this is first response (and not internal)
      const updateData: Prisma.SupportTicketUpdateInput = {};

      if (!isInternal && !ticket.firstResponseAt) {
        updateData.firstResponseAt = new Date();
      }

      // If status is 'open', move to 'in_progress'
      if (ticket.status === 'open' && !isInternal) {
        updateData.status = 'in_progress';
      }

      if (Object.keys(updateData).length > 0) {
        await prisma.supportTicket.update({
          where: { id: ticketId },
          data: updateData
        });
      }

      return { success: true };
    } catch (error) {
      console.error('Failed to reply to ticket:', error);
      return fail(500, { error: 'Failed to send reply' });
    }
  },

  // Update ticket status
  updateTicketStatus: async ({ request }) => {
    const formData = await request.formData();

    const ticketId = formData.get('ticketId') as string;
    const status = formData.get('status') as TicketStatus;
    const resolution = formData.get('resolution') as string | null;

    if (!ticketId || !status) {
      return fail(400, { error: 'Missing required fields' });
    }

    try {
      const updateData: Prisma.SupportTicketUpdateInput = {
        status
      };

      if (status === 'resolved') {
        updateData.resolvedAt = new Date();
        if (resolution) {
          updateData.resolution = resolution;
        }
      }

      if (status === 'closed') {
        updateData.closedAt = new Date();
      }

      await prisma.supportTicket.update({
        where: { id: ticketId },
        data: updateData
      });

      return { success: true };
    } catch (error) {
      console.error('Failed to update ticket status:', error);
      return fail(500, { error: 'Failed to update status' });
    }
  },

  // Assign ticket
  assignTicket: async ({ request }) => {
    const formData = await request.formData();

    const ticketId = formData.get('ticketId') as string;
    const assignedTo = formData.get('assignedTo') as string | null;

    if (!ticketId) {
      return fail(400, { error: 'Missing ticket ID' });
    }

    try {
      await prisma.supportTicket.update({
        where: { id: ticketId },
        data: {
          assignedTo: assignedTo || null
        }
      });

      return { success: true };
    } catch (error) {
      console.error('Failed to assign ticket:', error);
      return fail(500, { error: 'Failed to assign ticket' });
    }
  },

  // Update ticket priority
  updatePriority: async ({ request }) => {
    const formData = await request.formData();

    const ticketId = formData.get('ticketId') as string;
    const priority = formData.get('priority') as TicketPriority;

    if (!ticketId || !priority) {
      return fail(400, { error: 'Missing required fields' });
    }

    try {
      await prisma.supportTicket.update({
        where: { id: ticketId },
        data: { priority }
      });

      return { success: true };
    } catch (error) {
      console.error('Failed to update priority:', error);
      return fail(500, { error: 'Failed to update priority' });
    }
  },

  // Acknowledge health alert
  acknowledgeAlert: async ({ request, locals }) => {
    const formData = await request.formData();

    const alertId = formData.get('alertId') as string;

    if (!alertId) {
      return fail(400, { error: 'Missing alert ID' });
    }

    if (!locals.user) {
      return fail(401, { error: 'Unauthorized' });
    }

    try {
      await prisma.clientHealthAlert.update({
        where: { id: alertId },
        data: {
          acknowledgedBy: locals.user.id,
          acknowledgedAt: new Date()
        }
      });

      return { success: true };
    } catch (error) {
      console.error('Failed to acknowledge alert:', error);
      return fail(500, { error: 'Failed to acknowledge alert' });
    }
  },

  // Resolve health alert
  resolveAlert: async ({ request }) => {
    const formData = await request.formData();

    const alertId = formData.get('alertId') as string;

    if (!alertId) {
      return fail(400, { error: 'Missing alert ID' });
    }

    try {
      await prisma.clientHealthAlert.update({
        where: { id: alertId },
        data: {
          resolvedAt: new Date()
        }
      });

      return { success: true };
    } catch (error) {
      console.error('Failed to resolve alert:', error);
      return fail(500, { error: 'Failed to resolve alert' });
    }
  }
};
