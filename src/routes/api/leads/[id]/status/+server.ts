import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { prisma } from '$lib/server/db';
import type { LeadStatus } from '@prisma/client';

// Define valid status transitions
const validTransitions: Record<string, string[]> = {
  new: ['contacted', 'lost'],
  contacted: ['qualified', 'lost'],
  qualified: ['appointment_set', 'lost'],
  appointment_set: ['consultation_completed', 'lost'],
  consultation_completed: ['converted', 'lost'],
  converted: [], // Terminal state - no transitions allowed
  lost: ['new'] // Can resurrect a lost lead back to new
};

// Valid status values
const validStatuses: LeadStatus[] = [
  'new',
  'contacted',
  'qualified',
  'appointment_set',
  'consultation_completed',
  'converted',
  'lost'
];

export const PATCH: RequestHandler = async ({ params, request, locals }) => {
  try {
    // Get the lead ID from params
    const { id } = params;

    if (!id) {
      throw error(400, { message: 'Lead ID is required' });
    }

    // Parse request body
    const body = await request.json();
    const { status: newStatus } = body;

    // Validate new status
    if (!newStatus) {
      throw error(400, { message: 'Status is required' });
    }

    if (!validStatuses.includes(newStatus as LeadStatus)) {
      throw error(400, { message: `Invalid status: ${newStatus}. Valid statuses are: ${validStatuses.join(', ')}` });
    }

    // Find the lead
    const lead = await prisma.lead.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
        organizationId: true,
        firstName: true,
        lastName: true
      }
    });

    if (!lead) {
      throw error(404, { message: 'Lead not found' });
    }

    // Check if user has access to this lead (via organization)
    // Note: In a real implementation, you'd check locals.user and verify organization access
    // For now, we'll allow the update but this should be secured

    const currentStatus = lead.status;

    // Check if transition is valid
    const allowedNextStatuses = validTransitions[currentStatus] || [];

    if (!allowedNextStatuses.includes(newStatus)) {
      // Special case: same status is allowed (no-op)
      if (currentStatus === newStatus) {
        // Return the lead without updating
        const currentLead = await prisma.lead.findUnique({
          where: { id },
          include: {
            assignedToUser: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                avatarUrl: true
              }
            }
          }
        });

        return json(formatLeadResponse(currentLead));
      }

      throw error(400, {
        message: `Invalid status transition from '${formatStatus(currentStatus)}' to '${formatStatus(newStatus)}'. Allowed transitions: ${allowedNextStatuses.map(formatStatus).join(', ') || 'none'}`
      });
    }

    // Update the lead status and create activity log in a transaction
    const [updatedLead] = await prisma.$transaction([
      // Update lead status
      prisma.lead.update({
        where: { id },
        data: {
          status: newStatus as LeadStatus,
          // Set convertedAt if moving to converted
          ...(newStatus === 'converted' ? { convertedAt: new Date() } : {}),
          // Clear convertedAt if moving away from converted (resurrect scenario)
          ...(currentStatus === 'converted' && newStatus !== 'converted' ? { convertedAt: null } : {})
        },
        include: {
          assignedToUser: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              avatarUrl: true
            }
          }
        }
      }),
      // Create activity log for status change
      prisma.leadActivity.create({
        data: {
          leadId: id,
          activityType: 'status_change',
          subject: `Status changed from ${formatStatus(currentStatus)} to ${formatStatus(newStatus)}`,
          body: `Lead status was updated from "${formatStatus(currentStatus)}" to "${formatStatus(newStatus)}"`,
          outcome: 'completed',
          completedAt: new Date()
          // Note: performedBy would be set from locals.user.id in a secured implementation
        }
      })
    ]);

    return json(formatLeadResponse(updatedLead));
  } catch (err) {
    // Re-throw SvelteKit errors
    if (err && typeof err === 'object' && 'status' in err) {
      throw err;
    }

    console.error('Error updating lead status:', err);
    throw error(500, { message: 'Failed to update lead status' });
  }
};

// Helper to format status for display
function formatStatus(status: string): string {
  return status
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

// Helper to format lead response
function formatLeadResponse(lead: any) {
  if (!lead) return null;

  return {
    id: lead.id,
    firstName: lead.firstName,
    lastName: lead.lastName,
    email: lead.email,
    phone: lead.phone,
    status: lead.status,
    temperature: lead.temperature,
    score: lead.score,
    createdAt: lead.createdAt?.toISOString?.() || lead.createdAt,
    updatedAt: lead.updatedAt?.toISOString?.() || lead.updatedAt,
    assignedToUser: lead.assignedToUser
      ? {
          id: lead.assignedToUser.id,
          firstName: lead.assignedToUser.firstName,
          lastName: lead.assignedToUser.lastName,
          avatarUrl: lead.assignedToUser.avatarUrl
        }
      : null
  };
}
