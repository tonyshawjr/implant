<script lang="ts">
  import { Modal, Button, Label, Select, Textarea } from 'flowbite-svelte';
  import { enhance } from '$app/forms';

  interface Props {
    open: boolean;
    currentStatus: string;
    onClose: () => void;
  }

  let { open = $bindable(), currentStatus, onClose }: Props = $props();

  let selectedStatus = $state(currentStatus);
  let lostReason = $state('');
  let isSubmitting = $state(false);

  const statusOptions = [
    { value: 'new', label: 'New' },
    { value: 'contacted', label: 'Contacted' },
    { value: 'qualified', label: 'Qualified' },
    { value: 'appointment', label: 'Appointment Scheduled' },
    { value: 'converted', label: 'Converted' },
    { value: 'lost', label: 'Lost' }
  ];

  const lostReasonOptions = [
    { value: 'not_interested', label: 'Not Interested' },
    { value: 'chose_competitor', label: 'Chose Competitor' },
    { value: 'no_budget', label: 'No Budget' },
    { value: 'no_response', label: 'No Response' },
    { value: 'timing', label: 'Bad Timing' },
    { value: 'other', label: 'Other' }
  ];

  function handleClose() {
    selectedStatus = currentStatus;
    lostReason = '';
    onClose();
  }

  $effect(() => {
    if (open) {
      selectedStatus = currentStatus;
      lostReason = '';
    }
  });
</script>

<Modal title="Update Lead Status" bind:open size="md" autoclose={false}>
  <form
    method="POST"
    action="?/updateStatus"
    use:enhance={() => {
      isSubmitting = true;
      return async ({ update }) => {
        await update();
        isSubmitting = false;
        handleClose();
      };
    }}
  >
    <div class="space-y-4">
      <div>
        <Label for="status" class="mb-2">New Status</Label>
        <Select id="status" name="status" bind:value={selectedStatus}>
          {#each statusOptions as option}
            <option value={option.value}>{option.label}</option>
          {/each}
        </Select>
      </div>

      {#if selectedStatus === 'lost'}
        <div>
          <Label for="lostReason" class="mb-2">Reason for Loss</Label>
          <Select id="lostReason" name="lostReason" bind:value={lostReason}>
            <option value="">Select a reason...</option>
            {#each lostReasonOptions as option}
              <option value={option.value}>{option.label}</option>
            {/each}
          </Select>
        </div>
      {/if}

      <div>
        <Label for="notes" class="mb-2">Notes (optional)</Label>
        <Textarea
          id="notes"
          name="notes"
          rows={3}
          placeholder="Add any notes about this status change..."
        />
      </div>
    </div>

    <div class="mt-6 flex justify-end gap-3">
      <Button color="light" onclick={handleClose} disabled={isSubmitting}>
        Cancel
      </Button>
      <Button color="primary" type="submit" disabled={isSubmitting || selectedStatus === currentStatus}>
        {isSubmitting ? 'Updating...' : 'Update Status'}
      </Button>
    </div>
  </form>
</Modal>
