import type { PageServerLoad, Actions } from './$types';
import { prisma } from '$lib/server/db';
import { error, fail } from '@sveltejs/kit';
import { Argon2id } from 'oslo/password';
import {
  getUserNotificationPreferences,
  updateUserNotificationPreferences,
  storeVerificationCode,
  verifyCode,
  generateVerificationCode,
  updateNotificationPhone,
  NOTIFICATION_TYPE_INFO,
  type NotificationPreference
} from '$lib/server/notifications';
import { sendVerificationCode as sendSmsVerificationCode, sendSMS } from '$lib/server/twilio';
import { sendLeadEmail, isEmailConfigured } from '$lib/server/notifications/email';

export const load: PageServerLoad = async ({ parent }) => {
  const { user, organization } = await parent();

  if (!organization) {
    throw error(404, 'Organization not found');
  }

  // Get current user's full profile
  const userProfile = await prisma.user.findUnique({
    where: { id: user.id },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      phone: true,
      avatarUrl: true,
      role: true,
      isActive: true,
      emailVerifiedAt: true,
      lastLoginAt: true,
      createdAt: true
    }
  });

  // Get organization details
  const organizationDetails = await prisma.organization.findUnique({
    where: { id: organization.id },
    select: {
      id: true,
      name: true,
      slug: true,
      logoUrl: true,
      website: true,
      phone: true,
      email: true,
      addressLine1: true,
      addressLine2: true,
      city: true,
      state: true,
      postalCode: true,
      country: true,
      timezone: true
    }
  });

  // Get all team members for this organization
  const teamMembers = await prisma.user.findMany({
    where: {
      organizationId: organization.id,
      deletedAt: null
    },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      phone: true,
      avatarUrl: true,
      role: true,
      isActive: true,
      lastLoginAt: true,
      createdAt: true
    },
    orderBy: [
      { role: 'asc' },
      { firstName: 'asc' }
    ]
  });

  // Get role display labels
  const roleLabels: Record<string, string> = {
    super_admin: 'Super Admin',
    admin: 'Admin',
    support: 'Support',
    client_owner: 'Owner',
    client_admin: 'Admin',
    client_staff: 'Staff'
  };

  // Format user profile
  const profileData = userProfile
    ? {
        id: userProfile.id,
        email: userProfile.email,
        firstName: userProfile.firstName,
        lastName: userProfile.lastName,
        phone: userProfile.phone,
        avatarUrl: userProfile.avatarUrl,
        role: userProfile.role,
        roleLabel: roleLabels[userProfile.role] || userProfile.role,
        isActive: userProfile.isActive,
        emailVerified: !!userProfile.emailVerifiedAt,
        lastLoginAt: userProfile.lastLoginAt?.toISOString() ?? null,
        createdAt: userProfile.createdAt.toISOString()
      }
    : null;

  // Format organization details
  const orgData = organizationDetails
    ? {
        id: organizationDetails.id,
        name: organizationDetails.name,
        slug: organizationDetails.slug,
        logoUrl: organizationDetails.logoUrl,
        website: organizationDetails.website,
        phone: organizationDetails.phone,
        email: organizationDetails.email,
        addressLine1: organizationDetails.addressLine1,
        addressLine2: organizationDetails.addressLine2,
        city: organizationDetails.city,
        state: organizationDetails.state,
        postalCode: organizationDetails.postalCode,
        country: organizationDetails.country,
        timezone: organizationDetails.timezone
      }
    : null;

  // Format team members
  const teamData = teamMembers.map((member) => ({
    id: member.id,
    email: member.email,
    firstName: member.firstName,
    lastName: member.lastName,
    phone: member.phone,
    avatarUrl: member.avatarUrl,
    role: member.role,
    roleLabel: roleLabels[member.role] || member.role,
    isActive: member.isActive,
    lastLoginAt: member.lastLoginAt?.toISOString() ?? null,
    createdAt: member.createdAt.toISOString(),
    isCurrentUser: member.id === user.id
  }));

  // Available timezones (common US timezones)
  const timezones = [
    { value: 'America/New_York', name: 'Eastern Time (ET)' },
    { value: 'America/Chicago', name: 'Central Time (CT)' },
    { value: 'America/Denver', name: 'Mountain Time (MT)' },
    { value: 'America/Los_Angeles', name: 'Pacific Time (PT)' },
    { value: 'America/Phoenix', name: 'Arizona Time (AZ)' },
    { value: 'Pacific/Honolulu', name: 'Hawaii Time (HT)' },
    { value: 'America/Anchorage', name: 'Alaska Time (AKT)' }
  ];

  // Get notification preferences
  const notificationPrefs = await getUserNotificationPreferences(user.id);

  return {
    profile: profileData,
    organization: orgData,
    teamMembers: teamData,
    timezones,
    canManageTeam: ['client_owner', 'client_admin'].includes(user.role),
    canEditOrganization: user.role === 'client_owner',
    notificationPreferences: {
      preferences: notificationPrefs.preferences,
      typeInfo: NOTIFICATION_TYPE_INFO,
      phoneNumber: notificationPrefs.phoneNumber,
      phoneVerified: notificationPrefs.phoneVerified,
      quietHoursEnabled: notificationPrefs.quietHoursEnabled,
      quietHoursStart: notificationPrefs.quietHoursStart,
      quietHoursEnd: notificationPrefs.quietHoursEnd,
      timezone: notificationPrefs.timezone
    }
  };
};

export const actions: Actions = {
  updateProfile: async ({ request, locals }) => {
    const user = locals.user;
    if (!user) {
      return fail(401, { error: 'Unauthorized' });
    }

    const formData = await request.formData();
    const firstName = formData.get('firstName') as string;
    const lastName = formData.get('lastName') as string;
    const phone = formData.get('phone') as string;

    if (!firstName || !lastName) {
      return fail(400, { error: 'First name and last name are required' });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: phone?.trim() || null
      }
    });

    return { success: true, message: 'Profile updated successfully' };
  },

  changePassword: async ({ request, locals }) => {
    const user = locals.user;
    if (!user) {
      return fail(401, { error: 'Unauthorized' });
    }

    const formData = await request.formData();
    const currentPassword = formData.get('currentPassword') as string;
    const newPassword = formData.get('newPassword') as string;
    const confirmPassword = formData.get('confirmPassword') as string;

    if (!currentPassword || !newPassword || !confirmPassword) {
      return fail(400, { error: 'All password fields are required' });
    }

    if (newPassword !== confirmPassword) {
      return fail(400, { error: 'New passwords do not match' });
    }

    if (newPassword.length < 8) {
      return fail(400, { error: 'Password must be at least 8 characters' });
    }

    // Get current user's password hash
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { passwordHash: true }
    });

    if (!dbUser) {
      return fail(404, { error: 'User not found' });
    }

    // Verify current password
    const argon2id = new Argon2id();
    const isValid = await argon2id.verify(dbUser.passwordHash, currentPassword);
    if (!isValid) {
      return fail(400, { error: 'Current password is incorrect' });
    }

    // Hash new password
    const newHash = await argon2id.hash(newPassword);

    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: newHash }
    });

    return { success: true, message: 'Password changed successfully' };
  },

  updateOrganization: async ({ request, locals }) => {
    const user = locals.user;
    if (!user || !user.organizationId) {
      return fail(401, { error: 'Unauthorized' });
    }

    if (user.role !== 'client_owner') {
      return fail(403, { error: 'Only organization owners can update organization settings' });
    }

    const formData = await request.formData();
    const name = formData.get('name') as string;
    const phone = formData.get('phone') as string;
    const email = formData.get('email') as string;
    const website = formData.get('website') as string;
    const addressLine1 = formData.get('addressLine1') as string;
    const addressLine2 = formData.get('addressLine2') as string;
    const city = formData.get('city') as string;
    const state = formData.get('state') as string;
    const postalCode = formData.get('postalCode') as string;
    const timezone = formData.get('timezone') as string;

    if (!name) {
      return fail(400, { error: 'Organization name is required' });
    }

    await prisma.organization.update({
      where: { id: user.organizationId },
      data: {
        name: name.trim(),
        phone: phone?.trim() || null,
        email: email?.trim() || null,
        website: website?.trim() || null,
        addressLine1: addressLine1?.trim() || null,
        addressLine2: addressLine2?.trim() || null,
        city: city?.trim() || null,
        state: state?.trim() || null,
        postalCode: postalCode?.trim() || null,
        timezone: timezone || 'America/New_York'
      }
    });

    return { success: true, message: 'Organization settings updated' };
  },

  inviteTeamMember: async ({ request, locals }) => {
    const user = locals.user;
    if (!user || !user.organizationId) {
      return fail(401, { error: 'Unauthorized' });
    }

    if (!['client_owner', 'client_admin'].includes(user.role)) {
      return fail(403, { error: 'You do not have permission to invite team members' });
    }

    const formData = await request.formData();
    const email = formData.get('email') as string;
    const firstName = formData.get('firstName') as string;
    const lastName = formData.get('lastName') as string;
    const role = formData.get('role') as string;

    if (!email || !firstName || !lastName || !role) {
      return fail(400, { error: 'All fields are required' });
    }

    // Validate role
    const allowedRoles = ['client_admin', 'client_staff'];
    if (!allowedRoles.includes(role)) {
      return fail(400, { error: 'Invalid role selected' });
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() }
    });

    if (existingUser) {
      return fail(400, { error: 'A user with this email already exists' });
    }

    // Create user with temporary password (they would need to reset)
    const tempPassword = await new Argon2id().hash(crypto.randomUUID());

    await prisma.user.create({
      data: {
        email: email.toLowerCase().trim(),
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        passwordHash: tempPassword,
        role: role as any,
        organizationId: user.organizationId,
        isActive: true
      }
    });

    // In a real app, send an email invitation here

    return { success: true, message: `Invitation sent to ${email}` };
  },

  removeTeamMember: async ({ request, locals }) => {
    const user = locals.user;
    if (!user || !user.organizationId) {
      return fail(401, { error: 'Unauthorized' });
    }

    if (!['client_owner', 'client_admin'].includes(user.role)) {
      return fail(403, { error: 'You do not have permission to remove team members' });
    }

    const formData = await request.formData();
    const memberId = formData.get('memberId') as string;

    if (!memberId) {
      return fail(400, { error: 'Member ID is required' });
    }

    if (memberId === user.id) {
      return fail(400, { error: 'You cannot remove yourself' });
    }

    // Verify member belongs to same organization
    const member = await prisma.user.findFirst({
      where: {
        id: memberId,
        organizationId: user.organizationId,
        deletedAt: null
      }
    });

    if (!member) {
      return fail(404, { error: 'Team member not found' });
    }

    // Cannot remove owner if you're not owner
    if (member.role === 'client_owner' && user.role !== 'client_owner') {
      return fail(403, { error: 'Only owners can remove other owners' });
    }

    // Soft delete the user
    await prisma.user.update({
      where: { id: memberId },
      data: {
        deletedAt: new Date(),
        isActive: false
      }
    });

    return { success: true, message: 'Team member removed' };
  },

  updatePreferences: async ({ request, locals }) => {
    const user = locals.user;
    if (!user) {
      return fail(401, { error: 'Unauthorized' });
    }

    const formData = await request.formData();
    const preferencesJson = formData.get('preferences') as string;
    const quietHoursEnabled = formData.get('quietHoursEnabled') === 'true';
    const quietHoursStart = formData.get('quietHoursStart') as string;
    const quietHoursEnd = formData.get('quietHoursEnd') as string;

    let preferences: NotificationPreference[];
    try {
      preferences = JSON.parse(preferencesJson);
    } catch {
      return fail(400, { error: 'Invalid preferences format' });
    }

    await updateUserNotificationPreferences(user.id, {
      preferences,
      quietHoursEnabled,
      quietHoursStart: quietHoursStart || null,
      quietHoursEnd: quietHoursEnd || null
    });

    return { success: true, message: 'Notification preferences updated' };
  },

  sendVerificationCode: async ({ request, locals }) => {
    const user = locals.user;
    if (!user) {
      return fail(401, { error: 'Unauthorized' });
    }

    const formData = await request.formData();
    const phone = formData.get('phone') as string;

    if (!phone) {
      return fail(400, { error: 'Phone number is required' });
    }

    // Update the phone number
    await updateNotificationPhone(user.id, phone);

    // Generate and store verification code
    const code = generateVerificationCode();
    await storeVerificationCode(user.id, code);

    // Send the verification code via SMS
    const result = await sendSmsVerificationCode(phone, code);

    if (!result.success) {
      return fail(500, { error: result.error || 'Failed to send verification code' });
    }

    return { success: true, message: 'Verification code sent to your phone' };
  },

  verifyPhone: async ({ request, locals }) => {
    const user = locals.user;
    if (!user) {
      return fail(401, { error: 'Unauthorized' });
    }

    const formData = await request.formData();
    const code = formData.get('code') as string;

    if (!code || code.length !== 6) {
      return fail(400, { error: 'Please enter a valid 6-digit code' });
    }

    const isValid = await verifyCode(user.id, code);

    if (!isValid) {
      return fail(400, { error: 'Invalid or expired verification code' });
    }

    return { success: true, message: 'Phone number verified successfully' };
  },

  sendTestEmail: async ({ locals }) => {
    const user = locals.user;
    if (!user) {
      return fail(401, { error: 'Unauthorized' });
    }

    if (!await isEmailConfigured()) {
      return fail(500, { error: 'Email service is not configured. Please configure SendGrid, Resend, or SMTP in Settings > Integrations.' });
    }

    const dashboardUrl = process.env.PUBLIC_APP_URL || 'https://app.squeezmedia.com';

    const result = await sendLeadEmail(user.email, {
      id: 'test-lead',
      firstName: 'John',
      lastName: 'Doe',
      phone: '(555) 123-4567',
      email: 'john.doe@example.com',
      source: 'google',
      temperature: 'hot',
      procedureInterest: 'Dental Implants',
      notes: 'This is a test notification email.',
      organizationName: 'Your Practice',
      dashboardUrl: `${dashboardUrl}/leads/test-lead`
    });

    if (!result.success) {
      return fail(500, { error: result.error || 'Failed to send test email' });
    }

    return { success: true, message: 'Test email sent successfully' };
  },

  sendTestSms: async ({ locals }) => {
    const user = locals.user;
    if (!user) {
      return fail(401, { error: 'Unauthorized' });
    }

    // Get user's phone number
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { phone: true }
    });

    if (!dbUser?.phone) {
      return fail(400, { error: 'No phone number on file' });
    }

    const message = `Test Notification

This is a test SMS notification from SqueezMedia. Your notification settings are working correctly!`;

    const result = await sendSMS(dbUser.phone, message);

    if (!result.success) {
      return fail(500, { error: result.error || 'Failed to send test SMS' });
    }

    return { success: true, message: 'Test SMS sent successfully' };
  }
};
