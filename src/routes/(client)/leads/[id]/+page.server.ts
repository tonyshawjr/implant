import type { PageServerLoad, Actions } from './$types';
import { prisma } from '$lib/server/db';
import { error, fail } from '@sveltejs/kit';
import type { LeadStatus } from '@prisma/client';

export const load: PageServerLoad = async ({ parent, params }) => {
  const { organization } = await parent();

  if (!organization) {
    throw error(404, 'Organization not found');
  }

  const lead = await prisma.lead.findFirst({
    where: {
      id: params.id,
      organizationId: organization.id
    },
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
      sourceDetail: true,
      interestLevel: true,
      procedureInterest: true,
      insuranceStatus: true,
      insuranceDetails: true,
      estimatedRevenue: true,
      notes: true,
      utmSource: true,
      utmMedium: true,
      utmCampaign: true,
      utmContent: true,
      createdAt: true,
      convertedAt: true,
      conversionValue: true,
      lostReason: true,
      campaign: {
        select: {
          id: true,
          name: true,
          platform: true
        }
      },
      territory: {
        select: {
          id: true,
          name: true,
          city: true,
          state: true
        }
      },
      assignedToUser: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true
        }
      },
      activities: {
        select: {
          id: true,
          activityType: true,
          direction: true,
          subject: true,
          body: true,
          outcome: true,
          durationSeconds: true,
          scheduledAt: true,
          completedAt: true,
          createdAt: true,
          performedByUser: {
            select: {
              id: true,
              firstName: true,
              lastName: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      }
    }
  });

  if (!lead) {
    throw error(404, 'Lead not found');
  }

  return {
    lead: {
      ...lead,
      estimatedRevenue: lead.estimatedRevenue ? Number(lead.estimatedRevenue) : null,
      conversionValue: lead.conversionValue ? Number(lead.conversionValue) : null,
      createdAt: lead.createdAt.toISOString(),
      convertedAt: lead.convertedAt?.toISOString() ?? null,
      activities: lead.activities.map(activity => ({
        ...activity,
        scheduledAt: activity.scheduledAt?.toISOString() ?? null,
        completedAt: activity.completedAt?.toISOString() ?? null,
        createdAt: activity.createdAt.toISOString()
      }))
    }
  };
};

export const actions: Actions = {
  updateStatus: async ({ request, params, locals }) => {
    if (!locals.user) {
      return fail(401, { message: 'Unauthorized' });
    }

    const formData = await request.formData();
    const newStatus = formData.get('status') as LeadStatus;

    const validStatuses: LeadStatus[] = [
      'new', 'contacted', 'qualified', 'appointment_set',
      'consultation_completed', 'converted', 'lost'
    ];

    if (!validStatuses.includes(newStatus)) {
      return fail(400, { message: 'Invalid status' });
    }

    try {
      const lead = await prisma.lead.findFirst({
        where: {
          id: params.id,
          organizationId: locals.user.organizationId ?? undefined
        }
      });

      if (!lead) {
        return fail(404, { message: 'Lead not found' });
      }

      const oldStatus = lead.status;

      // Update the lead status
      await prisma.lead.update({
        where: { id: params.id },
        data: {
          status: newStatus,
          convertedAt: newStatus === 'converted' ? new Date() : lead.convertedAt
        }
      });

      // Create activity log for status change
      await prisma.leadActivity.create({
        data: {
          leadId: params.id,
          activityType: 'status_change',
          subject: `Status changed from ${oldStatus} to ${newStatus}`,
          performedBy: locals.user.id,
          completedAt: new Date()
        }
      });

      return { success: true };
    } catch (e) {
      console.error('Error updating lead status:', e);
      return fail(500, { message: 'Failed to update status' });
    }
  },

  addNote: async ({ request, params, locals }) => {
    if (!locals.user) {
      return fail(401, { message: 'Unauthorized' });
    }

    const formData = await request.formData();
    const noteContent = formData.get('note') as string;

    if (!noteContent?.trim()) {
      return fail(400, { message: 'Note content is required' });
    }

    try {
      const lead = await prisma.lead.findFirst({
        where: {
          id: params.id,
          organizationId: locals.user.organizationId ?? undefined
        }
      });

      if (!lead) {
        return fail(404, { message: 'Lead not found' });
      }

      // Create activity for the note
      await prisma.leadActivity.create({
        data: {
          leadId: params.id,
          activityType: 'note',
          body: noteContent.trim(),
          performedBy: locals.user.id,
          completedAt: new Date()
        }
      });

      return { success: true };
    } catch (e) {
      console.error('Error adding note:', e);
      return fail(500, { message: 'Failed to add note' });
    }
  }
};
