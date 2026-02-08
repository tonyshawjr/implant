import type { PageServerLoad } from './$types';
import { prisma } from '$lib/server/db';
import { startOfMonth, endOfMonth, addMonths, getDatesBetween, startOfDay } from '$lib/utils';

export const load: PageServerLoad = async ({ parent }) => {
  const { organization } = await parent();

  if (!organization) {
    return {
      leadsBySource: [],
      leadsByStatus: [],
      leadsOverTime: [],
      conversionFunnel: [],
      temperatureDistribution: []
    };
  }

  const organizationId = organization.id;
  const now = new Date();
  const thirtyDaysAgo = startOfDay(addMonths(now, -1));

  // Get all leads for analytics
  const leads = await prisma.lead.findMany({
    where: {
      organizationId
    },
    select: {
      id: true,
      source: true,
      status: true,
      temperature: true,
      score: true,
      createdAt: true,
      convertedAt: true
    }
  });

  // Leads by source
  const sourceMap = new Map<string, number>();
  const sourceLabelMap: Record<string, string> = {
    google: 'Google',
    facebook: 'Facebook',
    instagram: 'Instagram',
    website: 'Website',
    referral: 'Referral',
    manual: 'Manual'
  };

  leads.forEach(lead => {
    const source = lead.source;
    sourceMap.set(source, (sourceMap.get(source) ?? 0) + 1);
  });

  const leadsBySource = Array.from(sourceMap.entries())
    .map(([source, count]) => ({
      source,
      label: sourceLabelMap[source] ?? source,
      count
    }))
    .sort((a, b) => b.count - a.count);

  // Leads by status
  const statusMap = new Map<string, number>();
  const statusLabelMap: Record<string, string> = {
    new: 'New',
    contacted: 'Contacted',
    qualified: 'Qualified',
    appointment_set: 'Appointment Set',
    consultation_completed: 'Consultation Completed',
    converted: 'Converted',
    lost: 'Lost'
  };

  leads.forEach(lead => {
    const status = lead.status;
    statusMap.set(status, (statusMap.get(status) ?? 0) + 1);
  });

  const leadsByStatus = Array.from(statusMap.entries())
    .map(([status, count]) => ({
      status,
      label: statusLabelMap[status] ?? status,
      count
    }));

  // Leads over time (last 30 days)
  const dates = getDatesBetween(thirtyDaysAgo, now);
  const dateCountMap = new Map<string, number>();

  // Initialize all dates with 0
  dates.forEach(date => {
    const dateKey = date.toISOString().split('T')[0];
    dateCountMap.set(dateKey, 0);
  });

  // Count leads per day
  leads.forEach(lead => {
    const dateKey = lead.createdAt.toISOString().split('T')[0];
    if (dateCountMap.has(dateKey)) {
      dateCountMap.set(dateKey, (dateCountMap.get(dateKey) ?? 0) + 1);
    }
  });

  const leadsOverTime = Array.from(dateCountMap.entries())
    .map(([date, count]) => ({
      date,
      count
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

  // Conversion funnel
  const totalLeads = leads.length;
  const contactedLeads = leads.filter(l => l.status !== 'new').length;
  const qualifiedLeads = leads.filter(l =>
    ['qualified', 'appointment_set', 'consultation_completed', 'converted'].includes(l.status)
  ).length;
  const appointmentLeads = leads.filter(l =>
    ['appointment_set', 'consultation_completed', 'converted'].includes(l.status)
  ).length;
  const convertedLeads = leads.filter(l => l.status === 'converted').length;

  const conversionFunnel = [
    { stage: 'Total Leads', count: totalLeads, percentage: 100 },
    { stage: 'Contacted', count: contactedLeads, percentage: totalLeads > 0 ? (contactedLeads / totalLeads) * 100 : 0 },
    { stage: 'Qualified', count: qualifiedLeads, percentage: totalLeads > 0 ? (qualifiedLeads / totalLeads) * 100 : 0 },
    { stage: 'Appointment', count: appointmentLeads, percentage: totalLeads > 0 ? (appointmentLeads / totalLeads) * 100 : 0 },
    { stage: 'Converted', count: convertedLeads, percentage: totalLeads > 0 ? (convertedLeads / totalLeads) * 100 : 0 }
  ];

  // Temperature distribution
  const tempMap = new Map<string, number>();
  const tempLabelMap: Record<string, string> = {
    hot: 'Hot',
    warm: 'Warm',
    cold: 'Cold'
  };

  leads.forEach(lead => {
    const temp = lead.temperature;
    tempMap.set(temp, (tempMap.get(temp) ?? 0) + 1);
  });

  const temperatureDistribution = Array.from(tempMap.entries())
    .map(([temperature, count]) => ({
      temperature,
      label: tempLabelMap[temperature] ?? temperature,
      count,
      percentage: totalLeads > 0 ? (count / totalLeads) * 100 : 0
    }));

  return {
    leadsBySource,
    leadsByStatus,
    leadsOverTime,
    conversionFunnel,
    temperatureDistribution,
    totalLeads
  };
};
