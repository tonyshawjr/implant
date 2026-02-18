<script lang="ts">
  import { formatDate, getFriendlyRelativeTime } from '$lib/utils';

  interface Activity {
    id: string;
    activityType: string;
    direction?: string | null;
    subject: string | null;
    body: string | null;
    outcome: string | null;
    durationSeconds: number | null;
    scheduledAt: string | null;
    completedAt: string | null;
    createdAt: string;
    performedByUser?: { id: string; firstName: string; lastName: string } | null;
  }

  interface Props {
    activities: Activity[];
    title?: string;
  }

  let { activities, title = 'Activity Timeline' }: Props = $props();

  function getActivityIconPath(type: string): string {
    const icons: Record<string, string> = {
      call: 'M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z',
      email: 'M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z M22 6l-10 7L2 6',
      status_change: 'M22 11.08V12a10 10 0 1 1-5.93-9.14 M22 4l-10 10.01-3-3.01',
      note: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6 M16 13H8 M16 17H8 M10 9H8'
    };
    return icons[type] || icons.note;
  }

  function formatActivityType(type: string): string {
    return type.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  }
</script>

<div class="card">
  <div class="card-header">
    <h3 class="card-title">{title}</h3>
  </div>
  <div class="card-body">
    {#if activities.length === 0}
      <p class="empty-text">No activities recorded yet</p>
    {:else}
      <div class="timeline">
        {#each activities as activity (activity.id)}
          <div class="timeline-item">
            <div class="timeline-dot">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d={getActivityIconPath(activity.activityType)}/>
              </svg>
            </div>
            <div class="timeline-content">
              <div class="timeline-header">
                <span class="timeline-type">{formatActivityType(activity.activityType)}</span>
                <time class="timeline-time" title={formatDate(activity.createdAt, 'long')}>
                  {getFriendlyRelativeTime(activity.createdAt)}
                </time>
              </div>
              {#if activity.subject}
                <p class="timeline-subject">{activity.subject}</p>
              {/if}
              {#if activity.body}
                <p class="timeline-body">{activity.body}</p>
              {/if}
              {#if activity.performedByUser}
                <p class="timeline-meta">
                  by {activity.performedByUser.firstName} {activity.performedByUser.lastName}
                </p>
              {/if}
            </div>
          </div>
        {/each}
      </div>
    {/if}
  </div>
</div>

<style>
  .timeline {
    display: flex;
    flex-direction: column;
    gap: 0;
    position: relative;
  }

  .timeline::before {
    content: '';
    position: absolute;
    left: 15px;
    top: 0;
    bottom: 0;
    width: 2px;
    background: var(--gray-200);
  }

  .timeline-item {
    display: flex;
    gap: var(--spacing-4);
    padding-bottom: var(--spacing-4);
    position: relative;
  }

  .timeline-item:last-child {
    padding-bottom: 0;
  }

  .timeline-dot {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background: var(--primary-100);
    color: var(--primary-600);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    z-index: 1;
    border: 3px solid white;
  }

  .timeline-content {
    flex: 1;
    padding: var(--spacing-3);
    background: var(--gray-50);
    border-radius: var(--radius-lg);
    border: 1px solid var(--gray-200);
  }

  .timeline-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: var(--spacing-1);
  }

  .timeline-type {
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--gray-900);
  }

  .timeline-time {
    font-size: 0.75rem;
    color: var(--gray-400);
  }

  .timeline-subject {
    font-size: 0.875rem;
    color: var(--gray-700);
    margin-bottom: var(--spacing-1);
  }

  .timeline-body {
    font-size: 0.875rem;
    color: var(--gray-600);
  }

  .timeline-meta {
    font-size: 0.75rem;
    color: var(--gray-500);
    margin-top: var(--spacing-1);
  }

  .empty-text {
    text-align: center;
    color: var(--gray-500);
    padding: var(--spacing-8) 0;
  }
</style>
