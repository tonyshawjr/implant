<script lang="ts">
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
    { value: 'appointment_set', label: 'Appointment Set' },
    { value: 'consultation_completed', label: 'Consultation Completed' },
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
    open = false;
    onClose();
  }

  $effect(() => {
    if (open) {
      selectedStatus = currentStatus;
      lostReason = '';
    }
  });
</script>

{#if open}
  <div class="modal-overlay" onclick={handleClose} role="presentation">
    <div class="modal" onclick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
      <div class="modal-header">
        <h3>Update Lead Status</h3>
        <button class="modal-close" onclick={handleClose}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>
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
        <div class="modal-body">
          <div class="form-group">
            <label class="form-label" for="status">New Status</label>
            <select id="status" name="status" class="form-input form-select" bind:value={selectedStatus}>
              {#each statusOptions as option}
                <option value={option.value}>{option.label}</option>
              {/each}
            </select>
          </div>

          {#if selectedStatus === 'lost'}
            <div class="form-group">
              <label class="form-label" for="lostReason">Reason for Loss</label>
              <select id="lostReason" name="lostReason" class="form-input form-select" bind:value={lostReason}>
                <option value="">Select a reason...</option>
                {#each lostReasonOptions as option}
                  <option value={option.value}>{option.label}</option>
                {/each}
              </select>
            </div>
          {/if}

          <div class="form-group">
            <label class="form-label" for="notes">Notes (optional)</label>
            <textarea
              id="notes"
              name="notes"
              rows={3}
              class="form-input"
              placeholder="Add any notes about this status change..."
            ></textarea>
          </div>
        </div>

        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" onclick={handleClose} disabled={isSubmitting}>
            Cancel
          </button>
          <button type="submit" class="btn btn-primary" disabled={isSubmitting || selectedStatus === currentStatus}>
            {isSubmitting ? 'Updating...' : 'Update Status'}
          </button>
        </div>
      </form>
    </div>
  </div>
{/if}

<style>
  .form-group {
    margin-bottom: var(--spacing-4);
  }

  .form-group:last-child {
    margin-bottom: 0;
  }

  .form-label {
    display: block;
    font-size: 0.875rem;
    font-weight: 500;
    color: var(--gray-700);
    margin-bottom: var(--spacing-1);
  }
</style>
