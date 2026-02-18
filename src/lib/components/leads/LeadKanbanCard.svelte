<script lang="ts">
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

  function getInitials(firstName: string | null, lastName: string | null): string {
    const first = firstName?.charAt(0) || '';
    const last = lastName?.charAt(0) || '';
    return (first + last).toUpperCase() || '?';
  }

  function getFullName(firstName: string | null, lastName: string | null): string {
    const parts = [firstName, lastName].filter(Boolean);
    return parts.length > 0 ? parts.join(' ') : 'Unknown Lead';
  }

  function getTemperatureClass(temperature: string | null, score: number | null): string {
    if (temperature === 'hot' || (score && score >= 80)) return 'hot';
    if (temperature === 'warm' || (score && score >= 50)) return 'warm';
    return 'cold';
  }

  function getTemperatureLabel(temperature: string | null, score: number | null): string {
    if (temperature === 'hot' || (score && score >= 80)) return 'Hot';
    if (temperature === 'warm' || (score && score >= 50)) return 'Warm';
    return 'Cold';
  }

  function formatRelativeTime(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  // Check if lead is stale (no activity in 3+ days)
  let isStale = $derived(() => {
    const checkDate = lead.lastActivityAt || lead.createdAt;
    const diffDays = (Date.now() - new Date(checkDate).getTime()) / (1000 * 60 * 60 * 24);
    return diffDays >= 3;
  });
</script>

<a href="/leads/{lead.id}" class="lead-card" class:stale={isStale()}>
  <div class="lead-card-header">
    <div class="lead-avatar">{getInitials(lead.firstName, lead.lastName)}</div>
    <div class="lead-info">
      <div class="lead-name">{getFullName(lead.firstName, lead.lastName)}</div>
      <div class="lead-temp-row">
        <span class="temp-dot {getTemperatureClass(lead.temperature, lead.score)}"></span>
        <span class="temp-label">{getTemperatureLabel(lead.temperature, lead.score)}</span>
        {#if lead.score}
          <span class="lead-score-val">{lead.score}</span>
        {/if}
      </div>
    </div>
  </div>

  {#if lead.phone}
    <div class="lead-detail">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
      </svg>
      {lead.phone}
    </div>
  {/if}

  {#if lead.email}
    <div class="lead-detail">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
        <polyline points="22,6 12,13 2,6"/>
      </svg>
      <span class="detail-truncate">{lead.email}</span>
    </div>
  {/if}

  <div class="lead-card-footer">
    {#if lead.assignedToUser}
      <span class="assigned-name">{lead.assignedToUser.firstName} {lead.assignedToUser.lastName}</span>
    {:else}
      <span class="assigned-name unassigned">Unassigned</span>
    {/if}
    <span class="lead-time">{formatRelativeTime(lead.lastActivityAt || lead.createdAt)}</span>
  </div>
</a>

<style>
  .lead-card {
    background: white;
    border-radius: var(--radius-lg);
    padding: var(--spacing-4);
    border: 1px solid var(--gray-200);
    cursor: move;
    transition: all 0.2s ease;
    display: block;
    text-decoration: none;
    color: inherit;
  }

  .lead-card:hover {
    border-color: var(--primary-300);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  }

  .lead-card.stale {
    border-left: 3px solid var(--danger-500);
  }

  .lead-card-header {
    display: flex;
    gap: var(--spacing-3);
    margin-bottom: var(--spacing-3);
  }

  .lead-avatar {
    width: 36px;
    height: 36px;
    border-radius: var(--radius-lg);
    background: var(--primary-100);
    color: var(--primary-700);
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 600;
    font-size: 0.75rem;
    flex-shrink: 0;
  }

  .lead-info {
    flex: 1;
    min-width: 0;
  }

  .lead-name {
    font-weight: 600;
    color: var(--gray-900);
    font-size: 0.875rem;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .lead-temp-row {
    display: flex;
    align-items: center;
    gap: var(--spacing-1);
    margin-top: 2px;
  }

  .temp-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
  }

  .temp-dot.hot { background: var(--danger-500); }
  .temp-dot.warm { background: var(--warning-500); }
  .temp-dot.cold { background: var(--primary-500); }

  .temp-label {
    font-size: 0.75rem;
    color: var(--gray-500);
  }

  .lead-score-val {
    font-size: 0.75rem;
    font-weight: 600;
    color: var(--gray-600);
    margin-left: var(--spacing-1);
  }

  .lead-detail {
    display: flex;
    align-items: center;
    gap: var(--spacing-2);
    font-size: 0.75rem;
    color: var(--gray-600);
    margin-bottom: var(--spacing-2);
  }

  .lead-detail svg {
    flex-shrink: 0;
    color: var(--gray-400);
  }

  .detail-truncate {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .lead-card-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding-top: var(--spacing-3);
    border-top: 1px solid var(--gray-100);
    margin-top: var(--spacing-2);
  }

  .assigned-name {
    font-size: 0.75rem;
    color: var(--gray-700);
    font-weight: 500;
  }

  .assigned-name.unassigned {
    color: var(--gray-400);
    font-style: italic;
  }

  .lead-time {
    font-size: 0.75rem;
    color: var(--gray-400);
  }
</style>
