/**
 * Utility functions for determining colors and styles based on status values
 */

/**
 * Health score thresholds
 * 85+ Excellent, 70-84 Good, 50-69 Warning, <50 Critical
 */
export type HealthScoreLevel = 'excellent' | 'good' | 'warning' | 'critical';

/**
 * Get the health score level based on numeric value
 * @param score - Health score (0-100)
 * @returns Health score level
 */
export function getHealthScoreLevel(score: number | null | undefined): HealthScoreLevel {
  if (score === null || score === undefined) {
    return 'warning';
  }

  if (score >= 85) return 'excellent';
  if (score >= 70) return 'good';
  if (score >= 50) return 'warning';
  return 'critical';
}

/**
 * Get Tailwind CSS classes for health score colors
 * @param score - Health score (0-100)
 * @returns Object with background, text, and border color classes
 */
export function getHealthScoreColor(score: number | null | undefined): {
  bg: string;
  text: string;
  border: string;
  bgLight: string;
} {
  const level = getHealthScoreLevel(score);

  const colors: Record<HealthScoreLevel, { bg: string; text: string; border: string; bgLight: string }> = {
    excellent: {
      bg: 'bg-green-500',
      text: 'text-green-600 dark:text-green-400',
      border: 'border-green-500',
      bgLight: 'bg-green-100 dark:bg-green-900/30'
    },
    good: {
      bg: 'bg-blue-500',
      text: 'text-blue-600 dark:text-blue-400',
      border: 'border-blue-500',
      bgLight: 'bg-blue-100 dark:bg-blue-900/30'
    },
    warning: {
      bg: 'bg-yellow-500',
      text: 'text-yellow-600 dark:text-yellow-400',
      border: 'border-yellow-500',
      bgLight: 'bg-yellow-100 dark:bg-yellow-900/30'
    },
    critical: {
      bg: 'bg-red-500',
      text: 'text-red-600 dark:text-red-400',
      border: 'border-red-500',
      bgLight: 'bg-red-100 dark:bg-red-900/30'
    }
  };

  return colors[level];
}

/**
 * Get the health score label text
 * @param score - Health score (0-100)
 * @returns Label string
 */
export function getHealthScoreLabel(score: number | null | undefined): string {
  const level = getHealthScoreLevel(score);

  const labels: Record<HealthScoreLevel, string> = {
    excellent: 'Excellent',
    good: 'Good',
    warning: 'Needs Attention',
    critical: 'Critical'
  };

  return labels[level];
}

/**
 * Lead temperature types
 */
export type LeadTemperature = 'hot' | 'warm' | 'cold';

/**
 * Get lead temperature from numeric score
 * 80+ Hot, 50-79 Warm, <50 Cold
 * @param score - Lead score (0-100)
 * @returns Lead temperature
 */
export function getLeadTemperatureFromScore(score: number | null | undefined): LeadTemperature {
  if (score === null || score === undefined) {
    return 'cold';
  }

  if (score >= 80) return 'hot';
  if (score >= 50) return 'warm';
  return 'cold';
}

/**
 * Get Tailwind CSS classes for lead temperature colors
 * @param temperature - Lead temperature ('hot' | 'warm' | 'cold') or score number
 * @returns Object with background, text, and badge color classes
 */
export function getLeadTemperatureColor(temperature: LeadTemperature | number | null | undefined): {
  bg: string;
  text: string;
  badge: string;
  icon: string;
} {
  const temp = typeof temperature === 'number'
    ? getLeadTemperatureFromScore(temperature)
    : (temperature || 'cold');

  const colors: Record<LeadTemperature, { bg: string; text: string; badge: string; icon: string }> = {
    hot: {
      bg: 'bg-red-500',
      text: 'text-red-600 dark:text-red-400',
      badge: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
      icon: 'text-red-500'
    },
    warm: {
      bg: 'bg-orange-500',
      text: 'text-orange-600 dark:text-orange-400',
      badge: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
      icon: 'text-orange-500'
    },
    cold: {
      bg: 'bg-blue-500',
      text: 'text-blue-600 dark:text-blue-400',
      badge: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
      icon: 'text-blue-500'
    }
  };

  return colors[temp];
}

/**
 * Lead status types
 */
export type LeadStatus = 'new' | 'contacted' | 'qualified' | 'appointment_set' | 'consultation_completed' | 'converted' | 'lost';

/**
 * Get Tailwind CSS classes for lead status badge colors
 * @param status - Lead status
 * @returns Object with badge color classes
 */
export function getLeadStatusColor(status: LeadStatus | string | null | undefined): {
  bg: string;
  text: string;
  badge: string;
} {
  const statusColors: Record<string, { bg: string; text: string; badge: string }> = {
    new: {
      bg: 'bg-gray-500',
      text: 'text-gray-600 dark:text-gray-400',
      badge: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
    },
    contacted: {
      bg: 'bg-blue-500',
      text: 'text-blue-600 dark:text-blue-400',
      badge: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
    },
    qualified: {
      bg: 'bg-indigo-500',
      text: 'text-indigo-600 dark:text-indigo-400',
      badge: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400'
    },
    appointment_set: {
      bg: 'bg-purple-500',
      text: 'text-purple-600 dark:text-purple-400',
      badge: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400'
    },
    consultation_completed: {
      bg: 'bg-cyan-500',
      text: 'text-cyan-600 dark:text-cyan-400',
      badge: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-400'
    },
    converted: {
      bg: 'bg-green-500',
      text: 'text-green-600 dark:text-green-400',
      badge: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
    },
    lost: {
      bg: 'bg-red-500',
      text: 'text-red-600 dark:text-red-400',
      badge: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
    }
  };

  return statusColors[status || 'new'] || statusColors.new;
}

/**
 * Get human-readable label for lead status
 * @param status - Lead status
 * @returns Formatted status label
 */
export function getLeadStatusLabel(status: LeadStatus | string | null | undefined): string {
  const labels: Record<string, string> = {
    new: 'New',
    contacted: 'Contacted',
    qualified: 'Qualified',
    appointment_set: 'Appointment Set',
    consultation_completed: 'Consultation Completed',
    converted: 'Converted',
    lost: 'Lost'
  };

  return labels[status || 'new'] || 'Unknown';
}

/**
 * Campaign status types
 */
export type CampaignStatus = 'draft' | 'pending_review' | 'active' | 'paused' | 'completed';

/**
 * Get Tailwind CSS classes for campaign status badge colors
 * @param status - Campaign status
 * @returns Object with badge color classes
 */
export function getCampaignStatusColor(status: CampaignStatus | string | null | undefined): {
  bg: string;
  text: string;
  badge: string;
} {
  const statusColors: Record<string, { bg: string; text: string; badge: string }> = {
    draft: {
      bg: 'bg-gray-500',
      text: 'text-gray-600 dark:text-gray-400',
      badge: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
    },
    pending_review: {
      bg: 'bg-yellow-500',
      text: 'text-yellow-600 dark:text-yellow-400',
      badge: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
    },
    active: {
      bg: 'bg-green-500',
      text: 'text-green-600 dark:text-green-400',
      badge: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
    },
    paused: {
      bg: 'bg-orange-500',
      text: 'text-orange-600 dark:text-orange-400',
      badge: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400'
    },
    completed: {
      bg: 'bg-blue-500',
      text: 'text-blue-600 dark:text-blue-400',
      badge: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
    }
  };

  return statusColors[status || 'draft'] || statusColors.draft;
}

/**
 * Ticket status types
 */
export type TicketStatus = 'open' | 'pending' | 'in_progress' | 'escalated' | 'resolved' | 'closed';

/**
 * Get Tailwind CSS classes for ticket status badge colors
 * @param status - Ticket status
 * @returns Object with badge color classes
 */
export function getTicketStatusColor(status: TicketStatus | string | null | undefined): {
  bg: string;
  text: string;
  badge: string;
} {
  const statusColors: Record<string, { bg: string; text: string; badge: string }> = {
    open: {
      bg: 'bg-blue-500',
      text: 'text-blue-600 dark:text-blue-400',
      badge: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
    },
    pending: {
      bg: 'bg-yellow-500',
      text: 'text-yellow-600 dark:text-yellow-400',
      badge: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
    },
    in_progress: {
      bg: 'bg-purple-500',
      text: 'text-purple-600 dark:text-purple-400',
      badge: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400'
    },
    escalated: {
      bg: 'bg-red-500',
      text: 'text-red-600 dark:text-red-400',
      badge: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
    },
    resolved: {
      bg: 'bg-green-500',
      text: 'text-green-600 dark:text-green-400',
      badge: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
    },
    closed: {
      bg: 'bg-gray-500',
      text: 'text-gray-600 dark:text-gray-400',
      badge: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
    }
  };

  return statusColors[status || 'open'] || statusColors.open;
}

/**
 * Ticket priority types
 */
export type TicketPriority = 'low' | 'medium' | 'high' | 'urgent';

/**
 * Get Tailwind CSS classes for ticket priority badge colors
 * @param priority - Ticket priority
 * @returns Object with badge color classes
 */
export function getTicketPriorityColor(priority: TicketPriority | string | null | undefined): {
  bg: string;
  text: string;
  badge: string;
} {
  const priorityColors: Record<string, { bg: string; text: string; badge: string }> = {
    low: {
      bg: 'bg-gray-500',
      text: 'text-gray-600 dark:text-gray-400',
      badge: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
    },
    medium: {
      bg: 'bg-blue-500',
      text: 'text-blue-600 dark:text-blue-400',
      badge: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
    },
    high: {
      bg: 'bg-orange-500',
      text: 'text-orange-600 dark:text-orange-400',
      badge: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400'
    },
    urgent: {
      bg: 'bg-red-500',
      text: 'text-red-600 dark:text-red-400',
      badge: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
    }
  };

  return priorityColors[priority || 'medium'] || priorityColors.medium;
}

/**
 * Invoice status types
 */
export type InvoiceStatus = 'draft' | 'pending' | 'paid' | 'overdue' | 'cancelled';

/**
 * Get Tailwind CSS classes for invoice status badge colors
 * @param status - Invoice status
 * @returns Object with badge color classes
 */
export function getInvoiceStatusColor(status: InvoiceStatus | string | null | undefined): {
  bg: string;
  text: string;
  badge: string;
} {
  const statusColors: Record<string, { bg: string; text: string; badge: string }> = {
    draft: {
      bg: 'bg-gray-500',
      text: 'text-gray-600 dark:text-gray-400',
      badge: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
    },
    pending: {
      bg: 'bg-yellow-500',
      text: 'text-yellow-600 dark:text-yellow-400',
      badge: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
    },
    paid: {
      bg: 'bg-green-500',
      text: 'text-green-600 dark:text-green-400',
      badge: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
    },
    overdue: {
      bg: 'bg-red-500',
      text: 'text-red-600 dark:text-red-400',
      badge: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
    },
    cancelled: {
      bg: 'bg-gray-500',
      text: 'text-gray-600 dark:text-gray-400',
      badge: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
    }
  };

  return statusColors[status || 'draft'] || statusColors.draft;
}

/**
 * Prospect/Sales pipeline stage types
 */
export type ProspectStage = 'new' | 'qualified' | 'demo_scheduled' | 'demo_complete' | 'proposal_sent' | 'negotiation' | 'closed_won' | 'closed_lost';

/**
 * Get Tailwind CSS classes for prospect stage badge colors
 * @param stage - Prospect stage
 * @returns Object with badge color classes
 */
export function getProspectStageColor(stage: ProspectStage | string | null | undefined): {
  bg: string;
  text: string;
  badge: string;
} {
  const stageColors: Record<string, { bg: string; text: string; badge: string }> = {
    new: {
      bg: 'bg-gray-500',
      text: 'text-gray-600 dark:text-gray-400',
      badge: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
    },
    qualified: {
      bg: 'bg-blue-500',
      text: 'text-blue-600 dark:text-blue-400',
      badge: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
    },
    demo_scheduled: {
      bg: 'bg-indigo-500',
      text: 'text-indigo-600 dark:text-indigo-400',
      badge: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400'
    },
    demo_complete: {
      bg: 'bg-purple-500',
      text: 'text-purple-600 dark:text-purple-400',
      badge: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400'
    },
    proposal_sent: {
      bg: 'bg-cyan-500',
      text: 'text-cyan-600 dark:text-cyan-400',
      badge: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-400'
    },
    negotiation: {
      bg: 'bg-orange-500',
      text: 'text-orange-600 dark:text-orange-400',
      badge: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400'
    },
    closed_won: {
      bg: 'bg-green-500',
      text: 'text-green-600 dark:text-green-400',
      badge: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
    },
    closed_lost: {
      bg: 'bg-red-500',
      text: 'text-red-600 dark:text-red-400',
      badge: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
    }
  };

  return stageColors[stage || 'new'] || stageColors.new;
}

/**
 * Organization status types
 */
export type OrgStatus = 'active' | 'suspended' | 'churned';

/**
 * Get Tailwind CSS classes for organization status badge colors
 * @param status - Organization status
 * @returns Object with badge color classes
 */
export function getOrgStatusColor(status: OrgStatus | string | null | undefined): {
  bg: string;
  text: string;
  badge: string;
} {
  const statusColors: Record<string, { bg: string; text: string; badge: string }> = {
    active: {
      bg: 'bg-green-500',
      text: 'text-green-600 dark:text-green-400',
      badge: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
    },
    suspended: {
      bg: 'bg-yellow-500',
      text: 'text-yellow-600 dark:text-yellow-400',
      badge: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
    },
    churned: {
      bg: 'bg-red-500',
      text: 'text-red-600 dark:text-red-400',
      badge: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
    }
  };

  return statusColors[status || 'active'] || statusColors.active;
}

/**
 * Generic status badge color helper
 * Maps common status patterns to appropriate colors
 * @param status - Any status string
 * @returns Object with badge color classes
 */
export function getStatusBadgeColor(status: string | null | undefined): {
  bg: string;
  text: string;
  badge: string;
} {
  const normalizedStatus = (status || '').toLowerCase();

  // Success/positive states
  if (['active', 'completed', 'paid', 'approved', 'converted', 'closed_won', 'resolved', 'success', 'published'].includes(normalizedStatus)) {
    return {
      bg: 'bg-green-500',
      text: 'text-green-600 dark:text-green-400',
      badge: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
    };
  }

  // Warning/pending states
  if (['pending', 'pending_review', 'waiting', 'paused', 'suspended', 'in_review', 'analyzing'].includes(normalizedStatus)) {
    return {
      bg: 'bg-yellow-500',
      text: 'text-yellow-600 dark:text-yellow-400',
      badge: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
    };
  }

  // Error/negative states
  if (['failed', 'error', 'overdue', 'rejected', 'lost', 'closed_lost', 'cancelled', 'churned', 'critical'].includes(normalizedStatus)) {
    return {
      bg: 'bg-red-500',
      text: 'text-red-600 dark:text-red-400',
      badge: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
    };
  }

  // In-progress states
  if (['in_progress', 'processing', 'running', 'working'].includes(normalizedStatus)) {
    return {
      bg: 'bg-blue-500',
      text: 'text-blue-600 dark:text-blue-400',
      badge: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
    };
  }

  // Default/neutral states
  return {
    bg: 'bg-gray-500',
    text: 'text-gray-600 dark:text-gray-400',
    badge: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
  };
}

/**
 * Trend direction helper
 */
export type TrendDirection = 'up' | 'down' | 'neutral';

/**
 * Get color for trend direction
 * @param direction - Trend direction
 * @param positiveIsUp - Whether 'up' is positive (default true, set false for metrics like cost)
 * @returns Object with color classes
 */
export function getTrendColor(
  direction: TrendDirection,
  positiveIsUp: boolean = true
): {
  text: string;
  bg: string;
} {
  if (direction === 'neutral') {
    return {
      text: 'text-gray-500 dark:text-gray-400',
      bg: 'bg-gray-100 dark:bg-gray-700'
    };
  }

  const isPositive = positiveIsUp ? direction === 'up' : direction === 'down';

  if (isPositive) {
    return {
      text: 'text-green-600 dark:text-green-400',
      bg: 'bg-green-100 dark:bg-green-900/30'
    };
  }

  return {
    text: 'text-red-600 dark:text-red-400',
    bg: 'bg-red-100 dark:bg-red-900/30'
  };
}
