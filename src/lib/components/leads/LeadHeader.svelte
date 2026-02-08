<script lang="ts">
  import { Button, Badge } from 'flowbite-svelte';
  import {
    ArrowLeftOutline,
    PhoneOutline,
    EnvelopeOutline,
    EditOutline
  } from 'flowbite-svelte-icons';
  import LeadStatusBadge from './LeadStatusBadge.svelte';
  import LeadScoreBadge from './LeadScoreBadge.svelte';
  import { formatFullName, getInitials } from '$lib/utils';
  import type { LeadStatus, LeadTemperature } from '$lib/utils';

  interface Props {
    firstName: string | null;
    lastName: string | null;
    email: string | null;
    phone: string | null;
    status: LeadStatus | string;
    temperature: LeadTemperature | string;
    score: number | null;
    onStatusChange?: () => void;
    onCall?: () => void;
    onEmail?: () => void;
  }

  let {
    firstName,
    lastName,
    email,
    phone,
    status,
    temperature,
    score,
    onStatusChange,
    onCall,
    onEmail
  }: Props = $props();

  let fullName = $derived(formatFullName(firstName, lastName));
  let initials = $derived(getInitials(firstName, lastName));
</script>

<div class="flex flex-col gap-4 rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800 md:flex-row md:items-center md:justify-between">
  <!-- Left side: Back button + Avatar + Name + Badges -->
  <div class="flex items-center gap-4">
    <Button href="/leads" color="light" size="sm" class="flex-shrink-0">
      <ArrowLeftOutline class="h-4 w-4" />
    </Button>

    <div class="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-full bg-primary-100 text-xl font-semibold text-primary-700 dark:bg-primary-900 dark:text-primary-300">
      {initials}
    </div>

    <div>
      <h1 class="text-2xl font-bold text-gray-900 dark:text-white">{fullName}</h1>
      <div class="mt-2 flex flex-wrap items-center gap-2">
        <LeadStatusBadge {status} />
        <LeadScoreBadge {temperature} {score} />
      </div>
    </div>
  </div>

  <!-- Right side: Action buttons -->
  <div class="flex flex-wrap gap-2">
    {#if phone}
      <Button
        color="light"
        href="tel:{phone.replace(/\D/g, '')}"
        onclick={onCall}
      >
        <PhoneOutline class="mr-2 h-4 w-4" />
        Call
      </Button>
    {/if}

    {#if email}
      <Button
        color="light"
        href="mailto:{email}"
        onclick={onEmail}
      >
        <EnvelopeOutline class="mr-2 h-4 w-4" />
        Email
      </Button>
    {/if}

    <Button color="primary" onclick={onStatusChange}>
      <EditOutline class="mr-2 h-4 w-4" />
      Update Status
    </Button>
  </div>
</div>
