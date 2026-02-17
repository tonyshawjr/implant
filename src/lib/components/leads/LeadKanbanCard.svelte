<script lang="ts">
  import { Badge, Avatar } from 'flowbite-svelte';
  import { PhoneOutline, EnvelopeOutline } from 'flowbite-svelte-icons';
  import { formatDistanceToNow } from 'date-fns';

  interface Lead {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string | null;
    phone: string | null;
    status: string;
    temperature: string | null;
    score: number | null;
    createdAt: string;
    lastActivityAt?: string | null;
    assignedToUser?: {
      id: string;
      firstName: string;
      lastName: string;
      avatarUrl?: string | null;
    } | null;
  }

  interface Props {
    lead: Lead;
  }

  let { lead }: Props = $props();

  // Check if lead is stale (no activity in 3+ days)
  const isStale = $derived(() => {
    const checkDate = lead.lastActivityAt || lead.createdAt;
    const dateToCheck = new Date(checkDate);
    const now = new Date();
    const diffDays = (now.getTime() - dateToCheck.getTime()) / (1000 * 60 * 60 * 24);
    return diffDays >= 3;
  });

  // Get temperature badge color
  const temperatureConfig = $derived(() => {
    const temp = lead.temperature;
    const score = lead.score;

    if (temp === 'hot' || (score && score >= 80)) {
      return { color: 'red' as const, label: 'Hot' };
    }
    if (temp === 'warm' || (score && score >= 50)) {
      return { color: 'yellow' as const, label: 'Warm' };
    }
    return { color: 'blue' as const, label: 'Cold' };
  });

  // Get initials for avatar fallback
  const initials = $derived(() => {
    const first = lead.firstName?.charAt(0) || '';
    const last = lead.lastName?.charAt(0) || '';
    return (first + last).toUpperCase() || '?';
  });

  // Format time since created
  const timeSinceCreated = $derived(() => {
    try {
      return formatDistanceToNow(new Date(lead.createdAt), { addSuffix: true });
    } catch {
      return 'Unknown';
    }
  });

  // Get full name
  const fullName = $derived(() => {
    const parts = [lead.firstName, lead.lastName].filter(Boolean);
    return parts.length > 0 ? parts.join(' ') : 'Unknown Lead';
  });

  // Get assigned user initials
  const assignedUserInitials = $derived(() => {
    if (!lead.assignedToUser) return null;
    const first = lead.assignedToUser.firstName?.charAt(0) || '';
    const last = lead.assignedToUser.lastName?.charAt(0) || '';
    return (first + last).toUpperCase();
  });
</script>

<div
  class="kanban-card group"
  class:stale={isStale()}
>
  <!-- Header: Name and Temperature -->
  <div class="card-header">
    <span class="lead-name">{fullName()}</span>
    <Badge color={temperatureConfig().color} class="text-xs px-1.5 py-0.5">
      {temperatureConfig().label}
    </Badge>
  </div>

  <!-- Contact Info -->
  <div class="contact-info">
    {#if lead.phone}
      <a href="tel:{lead.phone}" class="contact-link" onclick={(e) => e.stopPropagation()}>
        <PhoneOutline class="w-3.5 h-3.5" />
        <span>{lead.phone}</span>
      </a>
    {/if}
    {#if lead.email}
      <a href="mailto:{lead.email}" class="contact-link" onclick={(e) => e.stopPropagation()}>
        <EnvelopeOutline class="w-3.5 h-3.5" />
        <span class="truncate">{lead.email}</span>
      </a>
    {/if}
  </div>

  <!-- Footer: Time and Assigned User -->
  <div class="card-footer">
    <span class="time-ago">{timeSinceCreated()}</span>
    {#if lead.assignedToUser}
      <Avatar
        size="xs"
        src={lead.assignedToUser.avatarUrl || undefined}
        class="ring-2 ring-white"
      >
        {assignedUserInitials()}
      </Avatar>
    {/if}
  </div>
</div>

<style>
  .kanban-card {
    background: white;
    border-radius: 0.5rem;
    padding: 0.75rem;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    cursor: move;
    transition: all 0.2s ease;
    border-left: 3px solid transparent;
  }

  .kanban-card:hover {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    transform: translateY(-1px);
  }

  .kanban-card.stale {
    border-left-color: #ef4444;
  }

  .card-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
    margin-bottom: 0.5rem;
  }

  .lead-name {
    font-weight: 500;
    font-size: 0.875rem;
    color: #111827;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    flex: 1;
  }

  .contact-info {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    margin-bottom: 0.5rem;
  }

  .contact-link {
    display: flex;
    align-items: center;
    gap: 0.375rem;
    font-size: 0.75rem;
    color: #6b7280;
    text-decoration: none;
    transition: color 0.15s ease;
    overflow: hidden;
  }

  .contact-link:hover {
    color: #2563eb;
  }

  .contact-link span {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .card-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding-top: 0.5rem;
    border-top: 1px solid #f3f4f6;
  }

  .time-ago {
    font-size: 0.6875rem;
    color: #9ca3af;
  }

  /* Dark mode support */
  :global(.dark) .kanban-card {
    background: #1f2937;
  }

  :global(.dark) .lead-name {
    color: #f9fafb;
  }

  :global(.dark) .contact-link {
    color: #9ca3af;
  }

  :global(.dark) .contact-link:hover {
    color: #60a5fa;
  }

  :global(.dark) .card-footer {
    border-top-color: #374151;
  }

  :global(.dark) .time-ago {
    color: #6b7280;
  }
</style>
