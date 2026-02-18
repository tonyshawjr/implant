<script lang="ts">
  import { enhance } from '$app/forms';
  import { formatDate, getFriendlyRelativeTime } from '$lib/utils';

  interface Props {
    leadId: string;
    notes: string | null;
  }

  let { leadId, notes }: Props = $props();

  let showAddNote = $state(false);
  let newNoteContent = $state('');
  let isSubmitting = $state(false);

  function toggleAddNote() {
    showAddNote = !showAddNote;
    if (!showAddNote) {
      newNoteContent = '';
    }
  }
</script>

<div class="card">
  <div class="card-header" style="display: flex; justify-content: space-between; align-items: center;">
    <h3 class="card-title">Notes</h3>
    <button class="btn btn-secondary btn-sm" onclick={toggleAddNote}>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <line x1="12" y1="5" x2="12" y2="19"/>
        <line x1="5" y1="12" x2="19" y2="12"/>
      </svg>
      Add Note
    </button>
  </div>
  <div class="card-body">
    {#if showAddNote}
      <form
        method="POST"
        action="?/addNote"
        use:enhance={() => {
          isSubmitting = true;
          return async ({ update }) => {
            await update();
            isSubmitting = false;
            showAddNote = false;
            newNoteContent = '';
          };
        }}
        class="note-form"
      >
        <textarea
          name="note"
          bind:value={newNoteContent}
          rows={3}
          class="form-input"
          placeholder="Add a note about this lead..."
        ></textarea>
        <div class="note-form-actions">
          <button type="button" class="btn btn-secondary btn-sm" onclick={toggleAddNote} disabled={isSubmitting}>
            Cancel
          </button>
          <button type="submit" class="btn btn-primary btn-sm" disabled={isSubmitting || !newNoteContent.trim()}>
            {isSubmitting ? 'Saving...' : 'Save Note'}
          </button>
        </div>
      </form>
    {/if}

    {#if notes}
      <div class="notes-content">
        <p class="note-text">{notes}</p>
      </div>
    {:else if !showAddNote}
      <p class="empty-text">No notes yet</p>
    {/if}
  </div>
</div>

<style>
  .note-form {
    margin-bottom: var(--spacing-4);
  }

  .note-form textarea {
    width: 100%;
    margin-bottom: var(--spacing-2);
    resize: vertical;
  }

  .note-form-actions {
    display: flex;
    justify-content: flex-end;
    gap: var(--spacing-2);
  }

  .notes-content {
    padding: var(--spacing-4);
    background: var(--gray-50);
    border-radius: var(--radius-lg);
    border: 1px solid var(--gray-200);
  }

  .note-text {
    font-size: 0.875rem;
    color: var(--gray-700);
    white-space: pre-wrap;
  }

  .empty-text {
    text-align: center;
    color: var(--gray-500);
    padding: var(--spacing-8) 0;
  }
</style>
