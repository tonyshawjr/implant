import type { PageServerLoad, Actions } from './$types';
import { prisma } from '$lib/server/db';
import { error, fail } from '@sveltejs/kit';
import { CLIENT_ROLES, isClientRole } from '$lib/constants/roles';

export const load: PageServerLoad = async ({ parent }) => {
  const { user, organization } = await parent();

  if (!organization) {
    throw error(404, 'Organization not found');
  }

  // Get user's support tickets
  const tickets = await prisma.supportTicket.findMany({
    where: {
      organizationId: organization.id
    },
    include: {
      submittedByUser: {
        select: {
          id: true,
          firstName: true,
          lastName: true
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
        orderBy: {
          createdAt: 'asc'
        },
        include: {
          sender: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              role: true
            }
          }
        }
      }
    },
    orderBy: {
      createdAt: 'desc'
    }
  });

  // Get knowledge base articles
  const articles = await prisma.knowledgeBaseArticle.findMany({
    where: {
      status: 'published',
      visibility: {
        in: ['public', 'client']
      }
    },
    select: {
      id: true,
      title: true,
      slug: true,
      category: true,
      excerpt: true,
      viewCount: true,
      helpfulCount: true
    },
    orderBy: [
      { helpfulCount: 'desc' },
      { viewCount: 'desc' }
    ],
    take: 10
  });

  // Get upcoming monthly review if any
  const upcomingReview = await prisma.monthlyReview.findFirst({
    where: {
      organizationId: organization.id,
      status: 'scheduled',
      scheduledDate: {
        gte: new Date()
      }
    },
    orderBy: {
      scheduledDate: 'asc'
    }
  });

  // Ticket category options
  const categoryOptions = [
    { value: 'billing', name: 'Billing & Payments' },
    { value: 'technical', name: 'Technical Issue' },
    { value: 'campaign', name: 'Campaign & Ads' },
    { value: 'leads', name: 'Leads & CRM' },
    { value: 'account', name: 'Account & Settings' },
    { value: 'other', name: 'Other' }
  ];

  // Priority options
  const priorityOptions = [
    { value: 'low', name: 'Low - General question' },
    { value: 'medium', name: 'Medium - Need assistance' },
    { value: 'high', name: 'High - Urgent issue' },
    { value: 'urgent', name: 'Urgent - Critical problem' }
  ];

  // Format tickets
  const ticketsData = tickets.map((ticket) => ({
    id: ticket.id,
    ticketNumber: ticket.ticketNumber,
    category: ticket.category,
    priority: ticket.priority,
    status: ticket.status,
    subject: ticket.subject,
    description: ticket.description,
    resolution: ticket.resolution,
    submittedBy: {
      id: ticket.submittedByUser.id,
      name: `${ticket.submittedByUser.firstName} ${ticket.submittedByUser.lastName}`
    },
    assignedTo: ticket.assignedToUser
      ? {
          id: ticket.assignedToUser.id,
          name: `${ticket.assignedToUser.firstName} ${ticket.assignedToUser.lastName}`
        }
      : null,
    messages: ticket.messages.map((msg) => ({
      id: msg.id,
      message: msg.message,
      isInternal: msg.isInternal,
      createdAt: msg.createdAt.toISOString(),
      sender: {
        id: msg.sender.id,
        name: `${msg.sender.firstName} ${msg.sender.lastName}`,
        isStaff: !isClientRole(msg.sender.role)
      }
    })),
    createdAt: ticket.createdAt.toISOString(),
    updatedAt: ticket.updatedAt.toISOString(),
    resolvedAt: ticket.resolvedAt?.toISOString() ?? null,
    firstResponseAt: ticket.firstResponseAt?.toISOString() ?? null
  }));

  // Format articles
  const articlesData = articles.map((article) => ({
    id: article.id,
    title: article.title,
    slug: article.slug,
    category: article.category,
    excerpt: article.excerpt,
    viewCount: article.viewCount,
    helpfulCount: article.helpfulCount
  }));

  // Format upcoming review
  const reviewData = upcomingReview
    ? {
        id: upcomingReview.id,
        reviewType: upcomingReview.reviewType,
        scheduledDate: upcomingReview.scheduledDate.toISOString(),
        scheduledTime: upcomingReview.scheduledTime?.toISOString() ?? null,
        durationMinutes: upcomingReview.durationMinutes,
        meetingLink: upcomingReview.meetingLink,
        status: upcomingReview.status
      }
    : null;

  // Get unique article categories
  const articleCategories = [...new Set(articles.map((a) => a.category))];

  return {
    tickets: ticketsData,
    articles: articlesData,
    articleCategories,
    upcomingReview: reviewData,
    categoryOptions,
    priorityOptions,
    openTicketCount: ticketsData.filter((t) => !['resolved', 'closed'].includes(t.status)).length
  };
};

export const actions: Actions = {
  createTicket: async ({ request, locals }) => {
    const user = locals.user;
    if (!user || !user.organizationId) {
      return fail(401, { error: 'Unauthorized' });
    }

    const formData = await request.formData();
    const category = formData.get('category') as string;
    const priority = formData.get('priority') as string;
    const subject = formData.get('subject') as string;
    const description = formData.get('description') as string;

    if (!category || !priority || !subject || !description) {
      return fail(400, { error: 'All fields are required' });
    }

    // Generate ticket number
    const ticketCount = await prisma.supportTicket.count();
    const ticketNumber = `TKT-${String(ticketCount + 1).padStart(6, '0')}`;

    const ticket = await prisma.supportTicket.create({
      data: {
        ticketNumber,
        organizationId: user.organizationId,
        submittedBy: user.id,
        category: category as any,
        priority: priority as any,
        status: 'open',
        subject: subject.trim(),
        description: description.trim()
      }
    });

    return { success: true, message: `Ticket ${ticket.ticketNumber} created successfully`, ticketId: ticket.id };
  },

  replyToTicket: async ({ request, locals }) => {
    const user = locals.user;
    if (!user || !user.organizationId) {
      return fail(401, { error: 'Unauthorized' });
    }

    const formData = await request.formData();
    const ticketId = formData.get('ticketId') as string;
    const message = formData.get('message') as string;

    if (!ticketId || !message) {
      return fail(400, { error: 'Ticket ID and message are required' });
    }

    // Verify ticket belongs to user's organization
    const ticket = await prisma.supportTicket.findFirst({
      where: {
        id: ticketId,
        organizationId: user.organizationId
      }
    });

    if (!ticket) {
      return fail(404, { error: 'Ticket not found' });
    }

    // Create message
    await prisma.ticketMessage.create({
      data: {
        ticketId,
        senderId: user.id,
        message: message.trim(),
        isInternal: false
      }
    });

    // Update ticket status if it was pending
    if (ticket.status === 'pending') {
      await prisma.supportTicket.update({
        where: { id: ticketId },
        data: { status: 'in_progress' }
      });
    }

    return { success: true, message: 'Reply sent' };
  },

  closeTicket: async ({ request, locals }) => {
    const user = locals.user;
    if (!user || !user.organizationId) {
      return fail(401, { error: 'Unauthorized' });
    }

    const formData = await request.formData();
    const ticketId = formData.get('ticketId') as string;

    if (!ticketId) {
      return fail(400, { error: 'Ticket ID is required' });
    }

    // Verify ticket belongs to user's organization
    const ticket = await prisma.supportTicket.findFirst({
      where: {
        id: ticketId,
        organizationId: user.organizationId
      }
    });

    if (!ticket) {
      return fail(404, { error: 'Ticket not found' });
    }

    await prisma.supportTicket.update({
      where: { id: ticketId },
      data: {
        status: 'closed',
        closedAt: new Date()
      }
    });

    return { success: true, message: 'Ticket closed' };
  },

  searchArticles: async ({ request }) => {
    const formData = await request.formData();
    const query = formData.get('query') as string;

    if (!query || query.length < 2) {
      return { articles: [] };
    }

    const articles = await prisma.knowledgeBaseArticle.findMany({
      where: {
        status: 'published',
        visibility: {
          in: ['public', 'client']
        },
        OR: [
          { title: { contains: query, mode: 'insensitive' } },
          { content: { contains: query, mode: 'insensitive' } },
          { category: { contains: query, mode: 'insensitive' } }
        ]
      },
      select: {
        id: true,
        title: true,
        slug: true,
        category: true,
        excerpt: true
      },
      take: 10
    });

    return {
      success: true,
      articles: articles.map((a) => ({
        id: a.id,
        title: a.title,
        slug: a.slug,
        category: a.category,
        excerpt: a.excerpt
      }))
    };
  }
};
