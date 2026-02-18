import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';
import { prisma } from '$lib/server/db';
import { isClientRole } from '$lib/constants/roles';

export const load: LayoutServerLoad = async ({ locals }) => {
  // Auth guard: redirect to login if not authenticated
  if (!locals.user) {
    throw redirect(302, '/login');
  }

  const user = locals.user;

  // Check if user has a client role (not internal staff)
  if (!isClientRole(user.role)) {
    // Internal users should go to internal dashboard
    throw redirect(302, '/internal');
  }

  try {
    // Get organization data if user belongs to one
    let organization = null;
    if (user.organizationId) {
      organization = await prisma.organization.findUnique({
        where: {
          id: user.organizationId,
          deletedAt: null
        },
        select: {
          id: true,
          name: true,
          slug: true,
          logoUrl: true,
          website: true,
          phone: true,
          email: true,
          status: true,
          healthScore: true,
          timezone: true
        }
      });

      // If organization not found or inactive, redirect to error
      if (!organization) {
        throw redirect(302, '/login?error=organization_not_found');
      }

      if (organization.status !== 'active' && organization.status !== 'onboarding') {
        throw redirect(302, '/login?error=organization_suspended');
      }
    }

    // Get unread notification count (with fallback)
    let unreadNotificationCount = 0;
    try {
      unreadNotificationCount = await prisma.notification.count({
        where: {
          userId: user.id,
          readAt: null
        }
      });
    } catch {
      // Notification table might not exist yet
      console.log('Could not count notifications');
    }

    // Return user and organization data for the layout
    return {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        avatarUrl: null // Would come from user profile in real implementation
      },
      organization: organization
        ? {
            id: organization.id,
            name: organization.name,
            slug: organization.slug,
            logoUrl: organization.logoUrl,
            healthScore: organization.healthScore ? Number(organization.healthScore) : null,
            timezone: organization.timezone
          }
        : null,
      unreadNotificationCount
    };
  } catch (e) {
    // If it's a redirect, rethrow
    if (e && typeof e === 'object' && 'status' in e) {
      throw e;
    }
    console.error('Client layout load error:', e);
    throw redirect(302, '/login?error=load_failed');
  }
};
