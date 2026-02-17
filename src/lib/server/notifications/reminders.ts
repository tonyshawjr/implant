import { prisma } from '../db';
import { sendLeadFollowUpReminder } from './sms';
import { shouldNotify, getNotifiableUsers } from './preferences';
import type { EmailResult } from './email';

/**
 * Configuration for stale lead detection
 */
const STALE_LEAD_DAYS = 3; // Days without activity before a lead is considered stale
const MAX_LEADS_PER_REMINDER = 5; // Maximum leads to include in a single reminder
const REMINDER_COOLDOWN_HOURS = 24; // Don't send another reminder for same leads within this period

/**
 * Lead with activity information for reminder processing
 */
interface StaleLead {
  id: string;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  email: string | null;
  organizationId: string;
  assignedTo: string | null;
  createdAt: Date;
  lastActivityAt: Date | null;
  daysSinceActivity: number;
}

/**
 * Result of the reminder job
 */
export interface ReminderJobResult {
  staleLeadsFound: number;
  remindersAttempted: number;
  remindersSent: number;
  remindersFailed: number;
  errors: string[];
}

/**
 * Get lead's full name for display
 */
function getLeadDisplayName(lead: { firstName: string | null; lastName: string | null }): string {
  if (lead.firstName && lead.lastName) {
    return `${lead.firstName} ${lead.lastName}`;
  }
  if (lead.firstName) {
    return lead.firstName;
  }
  if (lead.lastName) {
    return lead.lastName;
  }
  return 'Unnamed Lead';
}

/**
 * Find all stale leads across all organizations
 * A lead is stale if:
 * - Status is not 'converted' or 'lost'
 * - No activity in the last X days
 */
export async function findStaleLeads(): Promise<StaleLead[]> {
  const staleDate = new Date();
  staleDate.setDate(staleDate.getDate() - STALE_LEAD_DAYS);

  // Find leads that need follow-up
  const leads = await prisma.lead.findMany({
    where: {
      status: {
        notIn: ['converted', 'lost']
      },
      organization: {
        status: 'active',
        deletedAt: null
      }
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      phone: true,
      email: true,
      organizationId: true,
      assignedTo: true,
      createdAt: true,
      activities: {
        orderBy: { createdAt: 'desc' },
        take: 1,
        select: {
          createdAt: true
        }
      }
    }
  });

  const staleLeads: StaleLead[] = [];

  for (const lead of leads) {
    const lastActivityAt = lead.activities[0]?.createdAt || null;
    const referenceDate = lastActivityAt || lead.createdAt;
    const daysSinceActivity = Math.floor(
      (Date.now() - referenceDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    // Only include if stale
    if (daysSinceActivity >= STALE_LEAD_DAYS) {
      staleLeads.push({
        id: lead.id,
        firstName: lead.firstName,
        lastName: lead.lastName,
        phone: lead.phone,
        email: lead.email,
        organizationId: lead.organizationId,
        assignedTo: lead.assignedTo,
        createdAt: lead.createdAt,
        lastActivityAt,
        daysSinceActivity
      });
    }
  }

  return staleLeads;
}

/**
 * Check if a reminder was already sent for this lead today
 */
async function wasReminderSentToday(leadId: string): Promise<boolean> {
  const cooldownTime = new Date();
  cooldownTime.setHours(cooldownTime.getHours() - REMINDER_COOLDOWN_HOURS);

  // Check audit log for recent reminders for this lead
  const recentReminder = await prisma.auditLog.findFirst({
    where: {
      action: 'stale_lead_reminder_sent',
      entityType: 'lead',
      entityId: leadId,
      createdAt: {
        gte: cooldownTime
      }
    }
  });

  return recentReminder !== null;
}

/**
 * Mark a lead as having been reminded
 */
async function markLeadReminded(leadId: string, organizationId: string, userId: string): Promise<void> {
  await prisma.auditLog.create({
    data: {
      action: 'stale_lead_reminder_sent',
      entityType: 'lead',
      entityId: leadId,
      organizationId,
      newValues: {
        userId,
        remindedAt: new Date().toISOString()
      }
    }
  });
}

/**
 * Send reminders to users about stale leads
 * Groups leads by organization and assigned user
 */
export async function sendStaleLeadReminders(): Promise<ReminderJobResult> {
  const result: ReminderJobResult = {
    staleLeadsFound: 0,
    remindersAttempted: 0,
    remindersSent: 0,
    remindersFailed: 0,
    errors: []
  };

  try {
    // Find all stale leads
    const staleLeads = await findStaleLeads();
    result.staleLeadsFound = staleLeads.length;

    if (staleLeads.length === 0) {
      return result;
    }

    // Group leads by organization
    const leadsByOrg = new Map<string, StaleLead[]>();
    for (const lead of staleLeads) {
      const orgLeads = leadsByOrg.get(lead.organizationId) || [];
      orgLeads.push(lead);
      leadsByOrg.set(lead.organizationId, orgLeads);
    }

    // Process each organization
    for (const [organizationId, orgLeads] of leadsByOrg) {
      try {
        // Filter out leads that already received a reminder today
        const leadsToRemind: StaleLead[] = [];
        for (const lead of orgLeads) {
          if (!(await wasReminderSentToday(lead.id))) {
            leadsToRemind.push(lead);
          }
        }

        if (leadsToRemind.length === 0) {
          continue;
        }

        // Group by assigned user
        const leadsByUser = new Map<string | null, StaleLead[]>();
        for (const lead of leadsToRemind) {
          const userId = lead.assignedTo || null;
          const userLeads = leadsByUser.get(userId) || [];
          userLeads.push(lead);
          leadsByUser.set(userId, userLeads);
        }

        // Get users who should receive follow-up reminders
        const smsUsers = await getNotifiableUsers(organizationId, 'follow_up_reminder', 'sms');

        for (const [assignedUserId, userLeads] of leadsByUser) {
          try {
            // If leads are assigned to a specific user, send to that user
            // Otherwise, send to org owner or all staff with notification enabled
            let targetUsers = smsUsers;

            if (assignedUserId) {
              // Only send to the assigned user if they have notifications enabled
              targetUsers = smsUsers.filter(u => u.userId === assignedUserId);
            }

            // Limit leads per reminder message
            const leadsForReminder = userLeads.slice(0, MAX_LEADS_PER_REMINDER);

            for (const user of targetUsers) {
              if (!user.phone) continue;

              result.remindersAttempted++;

              try {
                // Send reminder for each lead (or batch message)
                for (const lead of leadsForReminder) {
                  const leadName = getLeadDisplayName(lead);
                  const smsResult = await sendLeadFollowUpReminder(
                    user.phone,
                    leadName,
                    lead.daysSinceActivity
                  );

                  if (smsResult.success) {
                    result.remindersSent++;
                    // Mark lead as reminded
                    await markLeadReminded(lead.id, organizationId, user.userId);
                  } else {
                    result.remindersFailed++;
                    result.errors.push(
                      `Failed to send reminder for lead ${lead.id} to user ${user.userId}: ${smsResult.error}`
                    );
                  }
                }
              } catch (userError) {
                result.remindersFailed++;
                const errorMsg = userError instanceof Error ? userError.message : 'Unknown error';
                result.errors.push(`Error sending to user ${user.userId}: ${errorMsg}`);
              }
            }
          } catch (userGroupError) {
            const errorMsg = userGroupError instanceof Error ? userGroupError.message : 'Unknown error';
            result.errors.push(`Error processing user group in org ${organizationId}: ${errorMsg}`);
          }
        }
      } catch (orgError) {
        const errorMsg = orgError instanceof Error ? orgError.message : 'Unknown error';
        result.errors.push(`Error processing organization ${organizationId}: ${errorMsg}`);
      }
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    result.errors.push(`General error in reminder job: ${errorMsg}`);
  }

  // Log the job result
  try {
    await prisma.auditLog.create({
      data: {
        action: 'stale_lead_reminder_job_completed',
        entityType: 'system',
        newValues: {
          staleLeadsFound: result.staleLeadsFound,
          remindersAttempted: result.remindersAttempted,
          remindersSent: result.remindersSent,
          remindersFailed: result.remindersFailed,
          errorCount: result.errors.length,
          completedAt: new Date().toISOString()
        }
      }
    });
  } catch (auditError) {
    console.error('Failed to log reminder job result:', auditError);
  }

  return result;
}

/**
 * Get a summary of stale leads for monitoring/dashboard
 */
export async function getStaleLeadsSummary(): Promise<{
  totalStaleLeads: number;
  byOrganization: Array<{ organizationId: string; organizationName: string; count: number }>;
  byTemperature: Array<{ temperature: string; count: number }>;
}> {
  const staleLeads = await findStaleLeads();

  // Get organization names
  const orgIds = [...new Set(staleLeads.map(l => l.organizationId))];
  const organizations = await prisma.organization.findMany({
    where: { id: { in: orgIds } },
    select: { id: true, name: true }
  });
  const orgNameMap = new Map(organizations.map(o => [o.id, o.name]));

  // Group by organization
  const byOrg = new Map<string, number>();
  const byTemp = new Map<string, number>();

  for (const lead of staleLeads) {
    byOrg.set(lead.organizationId, (byOrg.get(lead.organizationId) || 0) + 1);
  }

  // Get temperature counts - we need to fetch this separately
  const leadIds = staleLeads.map(l => l.id);
  const leadsWithTemp = await prisma.lead.findMany({
    where: { id: { in: leadIds } },
    select: { id: true, temperature: true }
  });

  for (const lead of leadsWithTemp) {
    byTemp.set(lead.temperature, (byTemp.get(lead.temperature) || 0) + 1);
  }

  return {
    totalStaleLeads: staleLeads.length,
    byOrganization: Array.from(byOrg.entries()).map(([organizationId, count]) => ({
      organizationId,
      organizationName: orgNameMap.get(organizationId) || 'Unknown',
      count
    })),
    byTemperature: Array.from(byTemp.entries()).map(([temperature, count]) => ({
      temperature,
      count
    }))
  };
}
