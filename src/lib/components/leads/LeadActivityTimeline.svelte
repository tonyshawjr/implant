<script lang="ts">
  import { Card, Timeline, TimelineItem } from 'flowbite-svelte';
  import {
    PhoneOutline,
    EnvelopeOutline,
    MessageDotsOutline,
    CalendarMonthOutline,
    CheckCircleOutline,
    ExclamationCircleOutline,
    UserOutline
  } from 'flowbite-svelte-icons';
  import { formatDate, getFriendlyRelativeTime } from '$lib/utils';

  interface Activity {
    id: string;
    type: string;
    description: string;
    createdAt: string | Date;
    createdBy?: { firstName: string; lastName: string } | null;
  }

  interface Props {
    activities: Activity[];
    title?: string;
  }

  let { activities, title = 'Activity Timeline' }: Props = $props();

  const activityIcons: Record<string, typeof PhoneOutline> = {
    call: PhoneOutline,
    email: EnvelopeOutline,
    sms: MessageDotsOutline,
    appointment: CalendarMonthOutline,
    status_change: CheckCircleOutline,
    note: MessageDotsOutline,
    alert: ExclamationCircleOutline
  };

  function getActivityIcon(type: string) {
    return activityIcons[type] || UserOutline;
  }

  function formatActivityType(type: string): string {
    return type.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  }
</script>

<Card>
  <h3 class="mb-4 text-lg font-semibold text-gray-900 dark:text-white">{title}</h3>

  {#if activities.length === 0}
    <p class="text-center text-gray-500 dark:text-gray-400 py-8">No activities recorded yet</p>
  {:else}
    <Timeline>
      {#each activities as activity (activity.id)}
        {@const IconComponent = getActivityIcon(activity.type)}
        <TimelineItem>
          <svelte:fragment slot="icon">
            <span class="flex absolute -left-3 justify-center items-center w-6 h-6 bg-primary-100 rounded-full ring-8 ring-white dark:ring-gray-900 dark:bg-primary-900">
              <IconComponent class="w-3 h-3 text-primary-600 dark:text-primary-400" />
            </span>
          </svelte:fragment>
          <div class="p-3 bg-gray-50 rounded-lg border border-gray-200 dark:bg-gray-800 dark:border-gray-700">
            <div class="flex justify-between items-center mb-1">
              <span class="text-sm font-medium text-gray-900 dark:text-white">
                {formatActivityType(activity.type)}
              </span>
              <time class="text-xs text-gray-500 dark:text-gray-400" title={formatDate(activity.createdAt, 'long')}>
                {getFriendlyRelativeTime(activity.createdAt)}
              </time>
            </div>
            <p class="text-sm text-gray-600 dark:text-gray-300">{activity.description}</p>
            {#if activity.createdBy}
              <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
                by {activity.createdBy.firstName} {activity.createdBy.lastName}
              </p>
            {/if}
          </div>
        </TimelineItem>
      {/each}
    </Timeline>
  {/if}
</Card>
