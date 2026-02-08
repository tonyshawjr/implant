<script lang="ts">
  import { Card, Badge, Timeline, TimelineItem } from 'flowbite-svelte';
  import {
    PhoneOutline,
    EnvelopeOutline,
    MessageDotsOutline,
    CalendarMonthOutline,
    FileLinesOutline,
    RefreshOutline
  } from 'flowbite-svelte-icons';
  import { formatDate, formatFullName, formatDuration } from '$lib/utils';

  interface Activity {
    id: string;
    activityType: string;
    direction: string | null;
    subject: string | null;
    body: string | null;
    outcome: string | null;
    durationSeconds: number | null;
    scheduledAt: string | null;
    completedAt: string | null;
    createdAt: string;
    performedByUser: {
      id: string;
      firstName: string;
      lastName: string;
    } | null;
  }

  interface Props {
    activities: Activity[];
    title?: string;
  }

  let {
    activities,
    title = 'Activity Timeline'
  }: Props = $props();

  // Get icon for activity type
  function getActivityIcon(type: string) {
    switch (type) {
      case 'call':
        return PhoneOutline;
      case 'email':
        return EnvelopeOutline;
      case 'sms':
        return MessageDotsOutline;
      case 'appointment':
        return CalendarMonthOutline;
      case 'note':
        return FileLinesOutline;
      case 'status_change':
        return RefreshOutline;
      default:
        return FileLinesOutline;
    }
  }

  // Get activity type label
  function getActivityLabel(type: string): string {
    const labels: Record<string, string> = {
      call: 'Phone Call',
      email: 'Email',
      sms: 'SMS',
      appointment: 'Appointment',
      note: 'Note',
      status_change: 'Status Change'
    };
    return labels[type] ?? type;
  }

  // Get badge color for activity type
  function getActivityColor(type: string): 'blue' | 'green' | 'yellow' | 'purple' | 'red' | 'gray' {
    const colors: Record<string, 'blue' | 'green' | 'yellow' | 'purple' | 'red' | 'gray'> = {
      call: 'blue',
      email: 'green',
      sms: 'yellow',
      appointment: 'purple',
      note: 'gray',
      status_change: 'red'
    };
    return colors[type] ?? 'gray';
  }

  // Get direction label
  function getDirectionLabel(direction: string | null): string {
    if (!direction) return '';
    return direction === 'inbound' ? 'Inbound' : 'Outbound';
  }
</script>

<Card>
  <h3 class="mb-4 text-lg font-semibold text-gray-900 dark:text-white">{title}</h3>

  {#if activities.length === 0}
    <div class="py-8 text-center text-gray-500 dark:text-gray-400">
      <FileLinesOutline class="mx-auto mb-2 h-8 w-8" />
      <p>No activity yet. Add a note or log a call to get started.</p>
    </div>
  {:else}
    <Timeline>
      {#each activities as activity (activity.id)}
        {@const Icon = getActivityIcon(activity.activityType)}
        <TimelineItem
          title={activity.subject ?? getActivityLabel(activity.activityType)}
          date={formatDate(activity.createdAt, 'datetime')}
        >
          {#snippet orientationSlot()}
            <span class="flex h-6 w-6 items-center justify-center rounded-full bg-primary-100 ring-8 ring-white dark:bg-primary-900 dark:ring-gray-800">
              <Icon class="h-3 w-3 text-primary-600 dark:text-primary-300" />
            </span>
          {/snippet}

          <div class="space-y-2">
            <div class="flex flex-wrap items-center gap-2">
              <Badge color={getActivityColor(activity.activityType)} class="text-xs">
                {getActivityLabel(activity.activityType)}
              </Badge>
              {#if activity.direction}
                <Badge color="gray" class="text-xs">
                  {getDirectionLabel(activity.direction)}
                </Badge>
              {/if}
              {#if activity.durationSeconds}
                <span class="text-xs text-gray-500 dark:text-gray-400">
                  Duration: {formatDuration(activity.durationSeconds)}
                </span>
              {/if}
            </div>

            {#if activity.body}
              <p class="text-sm text-gray-600 dark:text-gray-400">
                {activity.body}
              </p>
            {/if}

            {#if activity.outcome}
              <p class="text-sm">
                <span class="font-medium text-gray-700 dark:text-gray-300">Outcome:</span>
                <span class="text-gray-600 dark:text-gray-400">{activity.outcome}</span>
              </p>
            {/if}

            {#if activity.performedByUser}
              <p class="text-xs text-gray-500 dark:text-gray-400">
                By {formatFullName(activity.performedByUser.firstName, activity.performedByUser.lastName)}
              </p>
            {/if}
          </div>
        </TimelineItem>
      {/each}
    </Timeline>
  {/if}
</Card>
