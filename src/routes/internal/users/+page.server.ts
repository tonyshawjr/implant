import type { PageServerLoad, Actions } from './$types';
import { prisma } from '$lib/server/db';
import { fail } from '@sveltejs/kit';
import { hash } from '@node-rs/argon2';

export const load: PageServerLoad = async ({ url }) => {
  const search = url.searchParams.get('search') || '';
  const status = url.searchParams.get('status') || ''; // active, inactive, deleted
  const orgFilter = url.searchParams.get('org') || ''; // all, orphaned, assigned
  const page = parseInt(url.searchParams.get('page') || '1');
  const limit = 50;
  const offset = (page - 1) * limit;

  // Build where clause
  const where: any = {};

  // Search filter
  if (search) {
    where.OR = [
      { email: { contains: search, mode: 'insensitive' } },
      { firstName: { contains: search, mode: 'insensitive' } },
      { lastName: { contains: search, mode: 'insensitive' } }
    ];
  }

  // Status filter
  if (status === 'active') {
    where.isActive = true;
    where.deletedAt = null;
  } else if (status === 'inactive') {
    where.isActive = false;
    where.deletedAt = null;
  } else if (status === 'deleted') {
    where.deletedAt = { not: null };
  }

  // Organization filter
  if (orgFilter === 'orphaned') {
    where.organizationId = null;
  } else if (orgFilter === 'assigned') {
    where.organizationId = { not: null };
  }

  // Fetch users with organization info
  const [users, totalUsers, stats] = await Promise.all([
    prisma.user.findMany({
      where,
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            status: true,
            deletedAt: true
          }
        }
      },
      orderBy: [
        { deletedAt: 'asc' }, // Active users first
        { createdAt: 'desc' }
      ],
      skip: offset,
      take: limit
    }),
    prisma.user.count({ where }),
    // Get stats
    Promise.all([
      prisma.user.count({ where: { isActive: true, deletedAt: null } }),
      prisma.user.count({ where: { isActive: false, deletedAt: null } }),
      prisma.user.count({ where: { deletedAt: { not: null } } }),
      prisma.user.count({ where: { organizationId: null, deletedAt: null } })
    ])
  ]);

  return {
    users: users.map(u => ({
      id: u.id,
      email: u.email,
      name: `${u.firstName} ${u.lastName}`,
      firstName: u.firstName,
      lastName: u.lastName,
      role: u.role,
      isActive: u.isActive,
      deletedAt: u.deletedAt?.toISOString() ?? null,
      lastLoginAt: u.lastLoginAt?.toISOString() ?? null,
      createdAt: u.createdAt.toISOString(),
      organization: u.organization ? {
        id: u.organization.id,
        name: u.organization.name,
        status: u.organization.status,
        isDeleted: u.organization.deletedAt !== null
      } : null
    })),
    stats: {
      active: stats[0],
      inactive: stats[1],
      deleted: stats[2],
      orphaned: stats[3]
    },
    pagination: {
      page,
      limit,
      total: totalUsers,
      totalPages: Math.ceil(totalUsers / limit)
    },
    filters: {
      search,
      status,
      orgFilter
    }
  };
};

export const actions: Actions = {
  deleteUser: async ({ request }) => {
    const formData = await request.formData();
    const userId = formData.get('userId') as string;
    const hardDelete = formData.get('hardDelete') === 'true';

    if (!userId) {
      return fail(400, { error: 'User ID is required' });
    }

    try {
      if (hardDelete) {
        // Permanently delete the user
        await prisma.user.delete({
          where: { id: userId }
        });
      } else {
        // Soft delete
        await prisma.user.update({
          where: { id: userId },
          data: { deletedAt: new Date(), isActive: false }
        });
      }

      return { success: true };
    } catch (err) {
      console.error('Failed to delete user:', err);
      return fail(500, { error: 'Failed to delete user' });
    }
  },

  reactivateUser: async ({ request }) => {
    const formData = await request.formData();
    const userId = formData.get('userId') as string;

    if (!userId) {
      return fail(400, { error: 'User ID is required' });
    }

    try {
      await prisma.user.update({
        where: { id: userId },
        data: { deletedAt: null, isActive: true }
      });

      return { success: true };
    } catch (err) {
      console.error('Failed to reactivate user:', err);
      return fail(500, { error: 'Failed to reactivate user' });
    }
  },

  bulkDelete: async ({ request }) => {
    const formData = await request.formData();
    const userIds = formData.get('userIds') as string;
    const hardDelete = formData.get('hardDelete') === 'true';

    if (!userIds) {
      return fail(400, { error: 'User IDs are required' });
    }

    try {
      const ids = JSON.parse(userIds) as string[];

      if (hardDelete) {
        await prisma.user.deleteMany({
          where: { id: { in: ids } }
        });
      } else {
        await prisma.user.updateMany({
          where: { id: { in: ids } },
          data: { deletedAt: new Date(), isActive: false }
        });
      }

      return { success: true, count: ids.length };
    } catch (err) {
      console.error('Failed to bulk delete users:', err);
      return fail(500, { error: 'Failed to delete users' });
    }
  },

  resetPassword: async ({ request }) => {
    const formData = await request.formData();
    const userId = formData.get('userId') as string;

    if (!userId) {
      return fail(400, { error: 'User ID is required' });
    }

    try {
      const user = await prisma.user.findUnique({
        where: { id: userId }
      });

      if (!user) {
        return fail(404, { error: 'User not found' });
      }

      // Generate new temporary password
      const tempPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-4).toUpperCase();
      const passwordHash = await hash(tempPassword, {
        memoryCost: 19456,
        timeCost: 2,
        outputLen: 32,
        parallelism: 1
      });

      await prisma.user.update({
        where: { id: userId },
        data: { passwordHash }
      });

      return {
        success: true,
        credentials: {
          email: user.email,
          password: tempPassword
        }
      };
    } catch (err) {
      console.error('Failed to reset password:', err);
      return fail(500, { error: 'Failed to reset password' });
    }
  }
};
