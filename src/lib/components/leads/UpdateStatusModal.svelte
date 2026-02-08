<script lang="ts">
  import { Modal, Button, Radio, Label, Textarea } from 'flowbite-svelte';
  import { enhance } from '$app/forms';
  import type { LeadStatus } from '$lib/utils';

  interface Props {
    open: boolean;
    currentStatus: LeadStatus | string;
    onClose: () => void;
  }

  let { open = $bindable(), currentStatus, onClose }: Props = $props();

  let selectedStatus = $state(currentStatus);
  let lostReason = $state('');
  let isSubmitting = $state(false);

  // Reset form when modal opens
  $effect(() => {
    if (open) {
      selectedStatus = currentStatus;
      lostReason = '';
    }
  });

  // Status options with descriptions
  const statusOptions = [
    { value: 'new', label: 'New', description: 'Lead just received, not yet contacted' },
    { value: 'contacted', label: 'Contacted', description: 'Initial contact has been made' },
    { value: 'qualified', label: 'Qualified', description: 'Lead is a good fit and interested' },
    { value: 'appointment_set', label: 'Appointment Set', description: 'Consultation scheduled' },
    { value: 'consultation_completed', label: 'Consultation Completed', description: 'Has had initial consultation' },
    { value: 'converted', label: 'Converted', description: 'Lead became a patient' },
    { value: 'lost', label: 'Lost', description: 'Lead is no longer interested' }
  ];

  // Get color for status option
  function getStatusColor(status: string): string {
    const colors: Record<string, string> = {
      new: 'text-gray-600',
      contacted: 'text-blue-600',
      qualified: 'text-indigo-600',
      appointment_set: 'text-purple-600',
      consultation_completed: 'text-cyan-600',
      converted: 'text-green-600',
      lost: 'text-red-600'
    };
    return colors[status] ?? 'text-gray-600';
  }
</script>

<Modal bind:open title="Update Lead Status" size="md" class="w-full">
  <form
    method="POST"
    action="?/updateStatus"
    use:enhance={() => {
      isSubmitting = true;
      return async ({ result, update }) => {
        isSubmitting = false;
        if (result.type === 'success') {
          onClose();
        }
        await update();
      };
    }}
  >
    <div class="space-y-4">
      <p class="text-sm text-gray-600 dark:text-gray-400">
        Select the new status for this lead. This action will be logged in the activity timeline.
      </p>

      <div class="space-y-3">
        {#each statusOptions as option}
          <label
            class="flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors hover:bg-gray-50 dark:hover:bg-gray-700 {selectedStatus === option.value ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20' : 'border-gray-200 dark:border-gray-700'}"
          >
            <Radio
              name="status"
              value={option.value}
              bind:group={selectedStatus}
              class="mt-0.5"
            />
            <div class="flex-1">
              <div class="flex items-center gap-2">
                <span class="font-medium {getStatusColor(option.value)}">{option.label}</span>
                {#if option.value === currentStatus}
                  <span class="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-600 dark:bg-gray-700 dark:text-gray-400">
                    Current
                  </span>
                {/if}
              </div>
              <p class="text-sm text-gray-500 dark:text-gray-400">{option.description}</p>
            </div>
          </label>
        {/each}
      </div>

      {#if selectedStatus === 'lost'}
        <div>
          <Label for="lostReason" class="mb-2">Reason for Lost (optional)</Label>
          <Textarea
            id="lostReason"
            name="lostReason"
            bind:value={lostReason}
            placeholder="Why did this lead not convert?"
            rows={2}
          />
        </div>
      {/if}
    </div>

    <div class="mt-6 flex justify-end gap-3">
      <Button type="button" color="light" onclick={onClose}>
        Cancel
      </Button>
      <Button
        type="submit"
        color="primary"
        disabled={isSubmitting || selectedStatus === currentStatus}
      >
        {isSubmitting ? 'Updating...' : 'Update Status'}
      </Button>
    </div>
  </form>
</Modal>
