<script lang="ts">
  interface Props {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    status: string;
    temperature: string;
    score: number;
    onStatusChange?: () => void;
  }

  let { firstName, lastName, email, phone, status, temperature, score, onStatusChange }: Props = $props();

  function getStatusBadgeClass(s: string): string {
    const map: Record<string, string> = {
      new: 'badge-primary',
      contacted: 'badge-warning',
      qualified: 'badge-purple',
      appointment_set: 'badge-primary',
      consultation_completed: 'badge-success',
      converted: 'badge-success',
      lost: 'badge-danger'
    };
    return map[s] || 'badge-gray';
  }

  function getTempClass(t: string): string {
    if (t === 'hot') return 'temp-hot';
    if (t === 'warm') return 'temp-warm';
    return 'temp-cold';
  }

  function formatStatus(s: string): string {
    return s.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  }
</script>

<div class="card lead-header-card">
  <div class="lead-header-row">
    <div class="lead-header-left">
      <div class="lead-avatar-lg">
        {firstName?.charAt(0) || ''}{lastName?.charAt(0) || ''}
      </div>
      <div>
        <h1 class="lead-header-name">{firstName} {lastName}</h1>
        <div class="lead-header-badges">
          <span class="badge {getStatusBadgeClass(status)}">{formatStatus(status)}</span>
          <span class="badge {getTempClass(temperature)}">{formatStatus(temperature)}</span>
          <span class="lead-score-text">Score: {score ?? '-'}</span>
        </div>
      </div>
    </div>

    <div class="lead-header-actions">
      {#if phone}
        <a href="tel:{phone}" class="btn btn-secondary btn-sm">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
          </svg>
          Call
        </a>
      {/if}
      {#if email}
        <a href="mailto:{email}" class="btn btn-secondary btn-sm">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
            <polyline points="22,6 12,13 2,6"/>
          </svg>
          Email
        </a>
      {/if}
      {#if onStatusChange}
        <button class="btn btn-primary btn-sm" onclick={onStatusChange}>
          Update Status
        </button>
      {/if}
    </div>
  </div>
</div>

<style>
  .lead-header-card {
    padding: var(--spacing-6);
  }

  .lead-header-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--spacing-4);
    flex-wrap: wrap;
  }

  .lead-header-left {
    display: flex;
    align-items: center;
    gap: var(--spacing-4);
  }

  .lead-avatar-lg {
    width: 64px;
    height: 64px;
    border-radius: 50%;
    background: var(--primary-100);
    color: var(--primary-700);
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 600;
    font-size: 1.25rem;
    flex-shrink: 0;
  }

  .lead-header-name {
    font-size: 1.5rem;
    font-weight: 700;
    color: var(--gray-900);
    margin-bottom: var(--spacing-2);
  }

  .lead-header-badges {
    display: flex;
    align-items: center;
    gap: var(--spacing-2);
    flex-wrap: wrap;
  }

  .lead-score-text {
    font-size: 0.875rem;
    color: var(--gray-500);
  }

  .lead-header-actions {
    display: flex;
    align-items: center;
    gap: var(--spacing-2);
    flex-wrap: wrap;
  }

  .badge-purple {
    background: #ede9fe;
    color: #6d28d9;
  }

  .badge-gray {
    background: var(--gray-100);
    color: var(--gray-700);
  }

  .temp-hot {
    background: var(--danger-100);
    color: var(--danger-700);
  }

  .temp-warm {
    background: var(--warning-100);
    color: var(--warning-700);
  }

  .temp-cold {
    background: var(--primary-100);
    color: var(--primary-700);
  }
</style>
