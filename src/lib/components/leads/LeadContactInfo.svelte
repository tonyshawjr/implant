<script lang="ts">
  import { Card } from 'flowbite-svelte';
  import {
    PhoneOutline,
    EnvelopeOutline,
    MapPinOutline,
    UserOutline,
    ShieldCheckOutline
  } from 'flowbite-svelte-icons';
  import { formatPhone } from '$lib/utils';

  interface Props {
    phone: string | null;
    email: string | null;
    interestLevel: string | null;
    procedureInterest: string | null;
    insuranceStatus: string | null;
    insuranceDetails: string | null;
  }

  let {
    phone,
    email,
    interestLevel,
    procedureInterest,
    insuranceStatus,
    insuranceDetails
  }: Props = $props();

  // Format insurance status
  function formatInsuranceStatus(status: string | null): string {
    if (!status) return 'Unknown';
    const statuses: Record<string, string> = {
      has_insurance: 'Has Insurance',
      no_insurance: 'No Insurance',
      unknown: 'Unknown'
    };
    return statuses[status] ?? status;
  }
</script>

<Card>
  <h3 class="mb-4 text-lg font-semibold text-gray-900 dark:text-white">Contact Information</h3>

  <div class="space-y-4">
    <!-- Phone -->
    <div class="flex items-start gap-3">
      <div class="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900">
        <PhoneOutline class="h-5 w-5 text-blue-600 dark:text-blue-300" />
      </div>
      <div>
        <p class="text-sm text-gray-500 dark:text-gray-400">Phone</p>
        {#if phone}
          <a
            href="tel:{phone.replace(/\D/g, '')}"
            class="font-medium text-primary-600 hover:underline dark:text-primary-400"
          >
            {formatPhone(phone)}
          </a>
        {:else}
          <p class="text-gray-700 dark:text-gray-300">Not provided</p>
        {/if}
      </div>
    </div>

    <!-- Email -->
    <div class="flex items-start gap-3">
      <div class="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900">
        <EnvelopeOutline class="h-5 w-5 text-green-600 dark:text-green-300" />
      </div>
      <div>
        <p class="text-sm text-gray-500 dark:text-gray-400">Email</p>
        {#if email}
          <a
            href="mailto:{email}"
            class="font-medium text-primary-600 hover:underline dark:text-primary-400"
          >
            {email}
          </a>
        {:else}
          <p class="text-gray-700 dark:text-gray-300">Not provided</p>
        {/if}
      </div>
    </div>

    <!-- Interest Level -->
    {#if interestLevel || procedureInterest}
      <div class="flex items-start gap-3">
        <div class="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-purple-100 dark:bg-purple-900">
          <UserOutline class="h-5 w-5 text-purple-600 dark:text-purple-300" />
        </div>
        <div>
          <p class="text-sm text-gray-500 dark:text-gray-400">Interest</p>
          <p class="font-medium text-gray-900 dark:text-white">
            {procedureInterest ?? 'General Interest'}
          </p>
          {#if interestLevel}
            <p class="text-sm text-gray-600 dark:text-gray-400">
              Level: {interestLevel}
            </p>
          {/if}
        </div>
      </div>
    {/if}

    <!-- Insurance -->
    <div class="flex items-start gap-3">
      <div class="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-yellow-100 dark:bg-yellow-900">
        <ShieldCheckOutline class="h-5 w-5 text-yellow-600 dark:text-yellow-300" />
      </div>
      <div>
        <p class="text-sm text-gray-500 dark:text-gray-400">Insurance</p>
        <p class="font-medium text-gray-900 dark:text-white">
          {formatInsuranceStatus(insuranceStatus)}
        </p>
        {#if insuranceDetails}
          <p class="text-sm text-gray-600 dark:text-gray-400">
            {insuranceDetails}
          </p>
        {/if}
      </div>
    </div>
  </div>
</Card>
