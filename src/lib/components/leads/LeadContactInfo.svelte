<script lang="ts">
  import { Card } from 'flowbite-svelte';
  import { PhoneOutline, EnvelopeOutline, HeartOutline, ClipboardOutline, ShieldCheckOutline } from 'flowbite-svelte-icons';

  interface Props {
    phone: string | null;
    email: string | null;
    interestLevel: string | null;
    procedureInterest: string | null;
    insuranceStatus: string | null;
    insuranceDetails: string | null;
  }

  let { phone, email, interestLevel, procedureInterest, insuranceStatus, insuranceDetails }: Props = $props();

  function formatInterestLevel(level: string | null): string {
    if (!level) return 'Unknown';
    return level.charAt(0).toUpperCase() + level.slice(1).replace(/_/g, ' ');
  }
</script>

<Card>
  <h3 class="mb-4 text-lg font-semibold text-gray-900 dark:text-white">Contact Information</h3>
  <div class="space-y-4">
    {#if phone}
      <div class="flex items-center gap-3">
        <PhoneOutline class="h-5 w-5 text-gray-400" />
        <div>
          <p class="text-sm text-gray-500 dark:text-gray-400">Phone</p>
          <a href="tel:{phone}" class="font-medium text-primary-600 hover:underline dark:text-primary-400">
            {phone}
          </a>
        </div>
      </div>
    {/if}

    {#if email}
      <div class="flex items-center gap-3">
        <EnvelopeOutline class="h-5 w-5 text-gray-400" />
        <div>
          <p class="text-sm text-gray-500 dark:text-gray-400">Email</p>
          <a href="mailto:{email}" class="font-medium text-primary-600 hover:underline dark:text-primary-400">
            {email}
          </a>
        </div>
      </div>
    {/if}

    {#if interestLevel}
      <div class="flex items-center gap-3">
        <HeartOutline class="h-5 w-5 text-gray-400" />
        <div>
          <p class="text-sm text-gray-500 dark:text-gray-400">Interest Level</p>
          <p class="font-medium text-gray-900 dark:text-white">{formatInterestLevel(interestLevel)}</p>
        </div>
      </div>
    {/if}

    {#if procedureInterest}
      <div class="flex items-center gap-3">
        <ClipboardOutline class="h-5 w-5 text-gray-400" />
        <div>
          <p class="text-sm text-gray-500 dark:text-gray-400">Procedure Interest</p>
          <p class="font-medium text-gray-900 dark:text-white">{procedureInterest}</p>
        </div>
      </div>
    {/if}

    {#if insuranceStatus}
      <div class="flex items-center gap-3">
        <ShieldCheckOutline class="h-5 w-5 text-gray-400" />
        <div>
          <p class="text-sm text-gray-500 dark:text-gray-400">Insurance Status</p>
          <p class="font-medium text-gray-900 dark:text-white">{formatInterestLevel(insuranceStatus)}</p>
          {#if insuranceDetails}
            <p class="text-sm text-gray-500 dark:text-gray-400">{insuranceDetails}</p>
          {/if}
        </div>
      </div>
    {/if}
  </div>
</Card>
