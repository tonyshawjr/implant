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

  // Parse quiz answers from notes (handles old JSON format for backwards compatibility)
  let parsedNotes = $derived(parseNotes(notes));

  function parseNotes(raw: string | null): { quizAnswers: { label: string; value: string }[] | null; text: string | null } {
    if (!raw) return { quizAnswers: null, text: null };

    // Check for old JSON format: "Quiz Answers: { ... }"
    const jsonMatch = raw.match(/^Quiz Answers:\s*(\{[\s\S]*\})$/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[1]);
        const answers = Object.entries(parsed).map(([key, value]) => ({
          label: key.replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
          value: String(value).replace(/[-_]/g, ' ')
        }));
        return { quizAnswers: answers, text: null };
      } catch {
        // Fall through to plain text
      }
    }

    // Check for new readable format: "Quiz Answers:\nKey: Value\n..."
    if (raw.startsWith('Quiz Answers:\n')) {
      const lines = raw.split('\n').slice(1);
      const answers = lines
        .filter(l => l.includes(':'))
        .map(l => {
          const idx = l.indexOf(':');
          return { label: l.slice(0, idx).trim(), value: l.slice(idx + 1).trim() };
        });
      if (answers.length > 0) {
        return { quizAnswers: answers, text: null };
      }
    }

    return { quizAnswers: null, text: raw };
  }

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

    {#if parsedNotes.quizAnswers}
      <div class="notes-content">
        <div class="quiz-header">Quiz Answers</div>
        <div class="quiz-answers">
          {#each parsedNotes.quizAnswers as answer}
            <div class="quiz-row">
              <span class="quiz-label">{answer.label}</span>
              <span class="quiz-value">{answer.value}</span>
            </div>
          {/each}
        </div>
      </div>
    {:else if parsedNotes.text}
      <div class="notes-content">
        <p class="note-text">{parsedNotes.text}</p>
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

  .quiz-header {
    font-size: 0.75rem;
    font-weight: 600;
    color: var(--gray-500);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin-bottom: var(--spacing-3);
  }

  .quiz-answers {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-2);
  }

  .quiz-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--spacing-2) var(--spacing-3);
    background: white;
    border-radius: var(--radius-md);
    border: 1px solid var(--gray-100);
  }

  .quiz-label {
    font-size: 0.875rem;
    color: var(--gray-500);
  }

  .quiz-value {
    font-size: 0.875rem;
    font-weight: 500;
    color: var(--gray-900);
    text-transform: capitalize;
  }

  .empty-text {
    text-align: center;
    color: var(--gray-500);
    padding: var(--spacing-8) 0;
  }
</style>
