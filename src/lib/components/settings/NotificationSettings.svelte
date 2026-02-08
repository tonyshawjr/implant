<script lang="ts">
  import {
    Card,
    Toggle,
    Input,
    Button,
    Label,
    Alert,
    Spinner,
    Badge,
    Hr
  } from 'flowbite-svelte';
  import {
    BellOutline,
    EnvelopeOutline,
    MobilePhoneOutline,
    CheckCircleOutline,
    ExclamationCircleOutline,
    ClockOutline,
    PaperPlaneOutline
  } from 'flowbite-svelte-icons';
  import { enhance } from '$app/forms';

  interface NotificationPreference {
    type: string;
    email: boolean;
    sms: boolean;
    push: boolean;
  }

  interface NotificationTypeInfo {
    label: string;
    description: string;
  }

  interface FormResult {
    success?: boolean;
    error?: string;
    message?: string;
  }

  interface Props {
    preferences: NotificationPreference[];
    typeInfo: Record<string, NotificationTypeInfo>;
    phoneNumber: string | null;
    phoneVerified: boolean;
    quietHoursEnabled: boolean;
    quietHoursStart: string | null;
    quietHoursEnd: string | null;
    timezone: string;
    form?: FormResult | null;
  }

  let {
    preferences,
    typeInfo,
    phoneNumber,
    phoneVerified,
    quietHoursEnabled,
    quietHoursStart,
    quietHoursEnd,
    timezone,
    form
  }: Props = $props();

  // Local state
  let isSubmitting = $state(false);
  let localPreferences = $state<NotificationPreference[]>([...preferences]);
  let localPhone = $state(phoneNumber || '');
  let localQuietHoursEnabled = $state(quietHoursEnabled);
  let localQuietHoursStart = $state(quietHoursStart || '22:00');
  let localQuietHoursEnd = $state(quietHoursEnd || '07:00');
  let verificationCode = $state('');
  let showVerificationInput = $state(false);
  let isVerifying = $state(false);
  let isSendingCode = $state(false);

  // Update preference
  function updatePreference(type: string, channel: 'email' | 'sms' | 'push', value: boolean) {
    localPreferences = localPreferences.map(pref => {
      if (pref.type === type) {
        return { ...pref, [channel]: value };
      }
      return pref;
    });
  }

  // Get preference value
  function getPreference(type: string, channel: 'email' | 'sms' | 'push'): boolean {
    const pref = localPreferences.find(p => p.type === type);
    return pref ? pref[channel] : false;
  }

  // Format phone for display
  function formatPhoneDisplay(phone: string): string {
    const digits = phone.replace(/\D/g, '');
    if (digits.length === 10) {
      return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
    }
    if (digits.length === 11 && digits.startsWith('1')) {
      return `+1 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
    }
    return phone;
  }

  // Check if phone number is valid
  function isValidPhone(phone: string): boolean {
    const digits = phone.replace(/\D/g, '');
    return digits.length === 10 || (digits.length === 11 && digits.startsWith('1'));
  }

  // Check if any SMS notifications are enabled
  const hasSmsEnabled = $derived(localPreferences.some(p => p.sms));
</script>

<div class="space-y-6">
  <!-- Phone Number Section -->
  <Card>
    <h3 class="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-white">
      <MobilePhoneOutline class="h-5 w-5 text-primary-600" />
      SMS Notifications
    </h3>

    <div class="space-y-4">
      <div>
        <Label for="phone">Phone Number</Label>
        <div class="mt-1 flex gap-3">
          <Input
            id="phone"
            type="tel"
            bind:value={localPhone}
            placeholder="(555) 123-4567"
            class="flex-1"
          />
          {#if phoneVerified}
            <Badge color="green" class="flex items-center gap-1 self-center">
              <CheckCircleOutline class="h-3 w-3" />
              Verified
            </Badge>
          {:else if localPhone && isValidPhone(localPhone)}
            {#if showVerificationInput}
              <div class="flex gap-2">
                <Input
                  type="text"
                  bind:value={verificationCode}
                  placeholder="123456"
                  maxlength={6}
                  class="w-24"
                />
                <form method="POST" action="?/verifyPhone" use:enhance={() => {
                  isVerifying = true;
                  return async ({ update }) => {
                    await update();
                    isVerifying = false;
                    if (form?.success) {
                      showVerificationInput = false;
                      verificationCode = '';
                    }
                  };
                }}>
                  <input type="hidden" name="code" value={verificationCode} />
                  <Button type="submit" size="sm" color="green" disabled={isVerifying || verificationCode.length !== 6}>
                    {#if isVerifying}
                      <Spinner size="4" class="mr-1" />
                    {/if}
                    Verify
                  </Button>
                </form>
              </div>
            {:else}
              <form method="POST" action="?/sendVerificationCode" use:enhance={() => {
                isSendingCode = true;
                return async ({ update }) => {
                  await update();
                  isSendingCode = false;
                  if (form?.success) {
                    showVerificationInput = true;
                  }
                };
              }}>
                <input type="hidden" name="phone" value={localPhone} />
                <Button type="submit" size="sm" color="primary" outline disabled={isSendingCode}>
                  {#if isSendingCode}
                    <Spinner size="4" class="mr-1" />
                  {:else}
                    <PaperPlaneOutline class="mr-1 h-4 w-4" />
                  {/if}
                  Send Code
                </Button>
              </form>
            {/if}
          {/if}
        </div>
        <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
          Verify your phone number to receive SMS notifications
        </p>
      </div>

      {#if hasSmsEnabled && !phoneVerified}
        <Alert color="yellow" border>
          {#snippet icon()}<ExclamationCircleOutline class="h-5 w-5" />{/snippet}
          <span class="font-medium">Phone verification required.</span>
          You have SMS notifications enabled but your phone number is not verified.
          Please verify your phone number to receive SMS alerts.
        </Alert>
      {/if}
    </div>
  </Card>

  <!-- Notification Preferences -->
  <Card>
    <h3 class="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-white">
      <BellOutline class="h-5 w-5 text-primary-600" />
      Notification Preferences
    </h3>

    <p class="mb-6 text-sm text-gray-500 dark:text-gray-400">
      Choose how you want to be notified for each type of event.
    </p>

    <form method="POST" action="?/updatePreferences" use:enhance={() => {
      isSubmitting = true;
      return async ({ update }) => {
        await update();
        isSubmitting = false;
      };
    }}>
      <!-- Hidden input to pass preferences as JSON -->
      <input type="hidden" name="preferences" value={JSON.stringify(localPreferences)} />
      <input type="hidden" name="quietHoursEnabled" value={localQuietHoursEnabled.toString()} />
      <input type="hidden" name="quietHoursStart" value={localQuietHoursStart} />
      <input type="hidden" name="quietHoursEnd" value={localQuietHoursEnd} />

      <div class="space-y-4">
        <!-- Header Row -->
        <div class="hidden sm:grid sm:grid-cols-[1fr,80px,80px,80px] gap-4 pb-2 border-b border-gray-200 dark:border-gray-700">
          <div class="text-sm font-medium text-gray-700 dark:text-gray-300">Notification Type</div>
          <div class="text-center text-sm font-medium text-gray-700 dark:text-gray-300">
            <EnvelopeOutline class="h-4 w-4 mx-auto mb-1" />
            Email
          </div>
          <div class="text-center text-sm font-medium text-gray-700 dark:text-gray-300">
            <MobilePhoneOutline class="h-4 w-4 mx-auto mb-1" />
            SMS
          </div>
          <div class="text-center text-sm font-medium text-gray-700 dark:text-gray-300">
            <BellOutline class="h-4 w-4 mx-auto mb-1" />
            Push
          </div>
        </div>

        <!-- Preference Rows -->
        {#each localPreferences as pref}
          {@const info = typeInfo[pref.type]}
          <div class="sm:grid sm:grid-cols-[1fr,80px,80px,80px] gap-4 py-3 border-b border-gray-100 dark:border-gray-800 last:border-b-0">
            <div class="mb-3 sm:mb-0">
              <p class="font-medium text-gray-900 dark:text-white">{info?.label || pref.type}</p>
              <p class="text-sm text-gray-500 dark:text-gray-400">{info?.description || ''}</p>
            </div>

            <!-- Mobile labels -->
            <div class="flex gap-6 sm:contents">
              <div class="flex items-center gap-2 sm:justify-center">
                <span class="text-sm text-gray-500 sm:hidden">Email</span>
                <Toggle
                  size="small"
                  checked={getPreference(pref.type, 'email')}
                  onchange={(e: Event) => updatePreference(pref.type, 'email', (e.target as HTMLInputElement).checked)}
                />
              </div>
              <div class="flex items-center gap-2 sm:justify-center">
                <span class="text-sm text-gray-500 sm:hidden">SMS</span>
                <Toggle
                  size="small"
                  checked={getPreference(pref.type, 'sms')}
                  onchange={(e: Event) => updatePreference(pref.type, 'sms', (e.target as HTMLInputElement).checked)}
                  disabled={!phoneVerified}
                />
              </div>
              <div class="flex items-center gap-2 sm:justify-center">
                <span class="text-sm text-gray-500 sm:hidden">Push</span>
                <Toggle
                  size="small"
                  checked={getPreference(pref.type, 'push')}
                  onchange={(e: Event) => updatePreference(pref.type, 'push', (e.target as HTMLInputElement).checked)}
                />
              </div>
            </div>
          </div>
        {/each}
      </div>

      <Hr class="my-6" />

      <!-- Quiet Hours -->
      <div class="space-y-4">
        <div class="flex items-center justify-between">
          <div>
            <h4 class="flex items-center gap-2 font-medium text-gray-900 dark:text-white">
              <ClockOutline class="h-4 w-4 text-gray-500" />
              Quiet Hours
            </h4>
            <p class="text-sm text-gray-500 dark:text-gray-400">
              Pause SMS and push notifications during specific hours
            </p>
          </div>
          <Toggle
            bind:checked={localQuietHoursEnabled}
          />
        </div>

        {#if localQuietHoursEnabled}
          <div class="flex flex-wrap gap-4 pl-6">
            <div class="flex items-center gap-2">
              <Label for="quietStart" class="text-sm whitespace-nowrap">From</Label>
              <Input
                id="quietStart"
                type="time"
                bind:value={localQuietHoursStart}
                class="w-32"
              />
            </div>
            <div class="flex items-center gap-2">
              <Label for="quietEnd" class="text-sm whitespace-nowrap">To</Label>
              <Input
                id="quietEnd"
                type="time"
                bind:value={localQuietHoursEnd}
                class="w-32"
              />
            </div>
            <p class="w-full text-xs text-gray-500 dark:text-gray-400">
              Times are in your timezone: {timezone}
            </p>
          </div>
        {/if}
      </div>

      <div class="mt-6 flex justify-end">
        <Button type="submit" color="primary" disabled={isSubmitting}>
          {#if isSubmitting}
            <Spinner size="4" class="mr-2" />
          {/if}
          Save Preferences
        </Button>
      </div>
    </form>
  </Card>

  <!-- Test Notification -->
  <Card>
    <h3 class="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-white">
      <PaperPlaneOutline class="h-5 w-5 text-primary-600" />
      Test Notifications
    </h3>

    <p class="mb-4 text-sm text-gray-500 dark:text-gray-400">
      Send a test notification to verify your settings are working correctly.
    </p>

    <div class="flex flex-wrap gap-3">
      <form method="POST" action="?/sendTestEmail" use:enhance>
        <Button type="submit" color="light" size="sm">
          <EnvelopeOutline class="mr-2 h-4 w-4" />
          Send Test Email
        </Button>
      </form>

      {#if phoneVerified}
        <form method="POST" action="?/sendTestSms" use:enhance>
          <Button type="submit" color="light" size="sm">
            <MobilePhoneOutline class="mr-2 h-4 w-4" />
            Send Test SMS
          </Button>
        </form>
      {:else}
        <Button color="light" size="sm" disabled>
          <MobilePhoneOutline class="mr-2 h-4 w-4" />
          Send Test SMS
        </Button>
      {/if}
    </div>
  </Card>
</div>
