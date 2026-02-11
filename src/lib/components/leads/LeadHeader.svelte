<script lang="ts">
  import { Card, Badge, Button } from 'flowbite-svelte';
  import { PhoneOutline, EnvelopeOutline, ChevronDownOutline } from 'flowbite-svelte-icons';

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

  const statusColors: Record<string, string> = {
    new: 'blue',
    contacted: 'yellow',
    qualified: 'purple',
    appointment: 'indigo',
    converted: 'green',
    lost: 'red'
  };

  const temperatureColors: Record<string, string> = {
    hot: 'red',
    warm: 'yellow',
    cold: 'blue'
  };

  function getStatusColor(s: string): 'blue' | 'yellow' | 'purple' | 'indigo' | 'green' | 'red' {
    return (statusColors[s] || 'gray') as 'blue' | 'yellow' | 'purple' | 'indigo' | 'green' | 'red';
  }

  function getTemperatureColor(t: string): 'red' | 'yellow' | 'blue' {
    return (temperatureColors[t] || 'gray') as 'red' | 'yellow' | 'blue';
  }

  function formatStatus(s: string): string {
    return s.charAt(0).toUpperCase() + s.slice(1);
  }
</script>

<Card class="p-6">
  <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
    <div class="flex items-center gap-4">
      <div class="flex h-16 w-16 items-center justify-center rounded-full bg-primary-100 text-xl font-semibold text-primary-700 dark:bg-primary-900 dark:text-primary-300">
        {firstName.charAt(0)}{lastName.charAt(0)}
      </div>
      <div>
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white">
          {firstName} {lastName}
        </h1>
        <div class="mt-1 flex flex-wrap items-center gap-2">
          <Badge color={getStatusColor(status)}>{formatStatus(status)}</Badge>
          <Badge color={getTemperatureColor(temperature)}>{formatStatus(temperature)}</Badge>
          <span class="text-sm text-gray-500 dark:text-gray-400">Score: {score}</span>
        </div>
      </div>
    </div>

    <div class="flex flex-wrap items-center gap-2">
      {#if phone}
        <Button color="light" size="sm" href="tel:{phone}">
          <PhoneOutline class="mr-2 h-4 w-4" />
          Call
        </Button>
      {/if}
      {#if email}
        <Button color="light" size="sm" href="mailto:{email}">
          <EnvelopeOutline class="mr-2 h-4 w-4" />
          Email
        </Button>
      {/if}
      {#if onStatusChange}
        <Button color="primary" size="sm" onclick={onStatusChange}>
          Update Status
          <ChevronDownOutline class="ml-2 h-4 w-4" />
        </Button>
      {/if}
    </div>
  </div>
</Card>
