import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';
import { prisma } from '$lib/server/db';
import { INTERNAL_ROLES, isInternalRole } from '$lib/constants/roles';

export const load: LayoutServerLoad = async ({ locals }) => {
  // Auth guard: redirect to login if not authenticated
  if (!locals.user) {
    throw redirect(302, '/login');
  }

  const user = locals.user;

  // Admin role guard: only internal staff can access
  if (!isInternalRole(user.role)) {
    // Client users should go to client dashboard
    throw redirect(302, '/dashboard');
  }

  // Get dashboard stats for internal users
  const [
    totalClients,
    activeClients,
    totalLeadsThisMonth,
    pendingTickets,
    unreadNotificationCount
  ] = await Promise.all([
    // Total organizations
    prisma.organization.count({
      where: { deletedAt: null }
    }),
    // Active organizations
    prisma.organization.count({
      where: {
        deletedAt: null,
        status: 'active'
      }
    }),
    // Leads this month
    prisma.lead.count({
      where: {
        createdAt: {
          gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
        }
      }
    }),
    // Pending support tickets
    prisma.supportTicket.count({
      where: {
        status: {
          in: ['open', 'pending', 'in_progress']
        }
      }
    }),
    // Unread notifications for this user
    prisma.notification.count({
      where: {
        userId: user.id,
        readAt: null
      }
    })
  ]);

  // Return user and stats data for the layout
  return {
    user: {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      avatarUrl: null // Would come from user profile in real implementation
    },
    stats: {
      totalClients,
      activeClients,
      totalLeadsThisMonth,
      pendingTickets
    },
    unreadNotificationCount
  };
};
