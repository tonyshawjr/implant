import { lucia } from '$lib/server/auth';
import { prisma } from '$lib/server/db';
import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { Argon2id } from 'oslo/password';
import { INTERNAL_ROLES, isInternalRole } from '$lib/constants/roles';

export const load: PageServerLoad = async ({ locals }) => {
  if (locals.user) {
    // Redirect based on role
    if (isInternalRole(locals.user.role)) {
      throw redirect(302, '/internal');
    }
    throw redirect(302, '/');
  }
  return {};
};

export const actions: Actions = {
  default: async ({ request, cookies }) => {
    const formData = await request.formData();
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    if (!email || !password) {
      return fail(400, {
        error: 'Email and password are required',
        email
      });
    }

    try {
      const user = await prisma.user.findUnique({
        where: { email: email.toLowerCase() }
      });

      if (!user) {
        return fail(400, {
          error: 'Invalid email or password',
          email
        });
      }

      const validPassword = await new Argon2id().verify(user.passwordHash, password);

      if (!validPassword) {
        return fail(400, {
          error: 'Invalid email or password',
          email
        });
      }

      if (!user.isActive) {
        return fail(400, {
          error: 'Your account has been deactivated',
          email
        });
      }

      // Create session
      const session = await lucia.createSession(user.id, {});
      const sessionCookie = lucia.createSessionCookie(session.id);
      cookies.set(sessionCookie.name, sessionCookie.value, {
        path: '.',
        ...sessionCookie.attributes
      });

      // Update last login
      await prisma.user.update({
        where: { id: user.id },
        data: {
          lastLoginAt: new Date(),
          loginCount: { increment: 1 }
        }
      });

      // Redirect based on role
      if (isInternalRole(user.role)) {
        throw redirect(302, '/internal');
      }
      throw redirect(302, '/dashboard');

    } catch (e) {
      // If it's a redirect, rethrow it
      if (e && typeof e === 'object' && 'status' in e) {
        throw e;
      }
      console.error('Login error:', e);
      return fail(500, {
        error: 'An error occurred during login',
        email
      });
    }
  }
};
