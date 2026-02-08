import { prisma } from '$lib/server/db';
import { fail } from '@sveltejs/kit';
import type { Actions } from './$types';
import { generateId } from 'lucia';

export const actions: Actions = {
  default: async ({ request }) => {
    const formData = await request.formData();
    const email = formData.get('email') as string;

    if (!email) {
      return fail(400, {
        error: 'Email is required',
        email
      });
    }

    try {
      const user = await prisma.user.findUnique({
        where: { email: email.toLowerCase() }
      });

      // Always return success to prevent email enumeration
      if (!user) {
        return { success: true, email };
      }

      // Generate reset token
      const token = generateId(40);
      const expiresAt = new Date(Date.now() + 1000 * 60 * 60); // 1 hour

      // Store reset token (hash it in production)
      await prisma.passwordReset.create({
        data: {
          userId: user.id,
          tokenHash: token, // In production, hash this
          expiresAt
        }
      });

      // TODO: Send email with reset link
      // await sendPasswordResetEmail(user.email, token);

      console.log(`Password reset token for ${email}: ${token}`);

      return { success: true, email };
    } catch (e) {
      console.error('Password reset error:', e);
      return fail(500, {
        error: 'An error occurred. Please try again.',
        email
      });
    }
  }
};
