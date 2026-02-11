<script lang="ts">
  import { Card, Button, Textarea } from 'flowbite-svelte';
  import { PlusOutline, UserOutline } from 'flowbite-svelte-icons';
  import { formatDate, getFriendlyRelativeTime } from '$lib/utils';
  import { enhance } from '$app/forms';

  interface Note {
    id: string;
    content: string;
    createdAt: string | Date;
    createdBy?: { firstName: string; lastName: string } | null;
  }

  interface Props {
    leadId: string;
    notes: Note[];
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

<Card>
  <div class="mb-4 flex items-center justify-between">
    <h3 class="text-lg font-semibold text-gray-900 dark:text-white">Notes</h3>
    <Button color="light" size="sm" onclick={toggleAddNote}>
      <PlusOutline class="mr-2 h-4 w-4" />
      Add Note
    </Button>
  </div>

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
      class="mb-4"
    >
      <input type="hidden" name="leadId" value={leadId} />
      <Textarea
        name="content"
        bind:value={newNoteContent}
        rows={3}
        placeholder="Add a note about this lead..."
        class="mb-2"
      />
      <div class="flex justify-end gap-2">
        <Button color="light" size="sm" onclick={toggleAddNote} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button color="primary" size="sm" type="submit" disabled={isSubmitting || !newNoteContent.trim()}>
          {isSubmitting ? 'Saving...' : 'Save Note'}
        </Button>
      </div>
    </form>
  {/if}

  {#if notes.length === 0}
    <p class="py-8 text-center text-gray-500 dark:text-gray-400">No notes yet</p>
  {:else}
    <div class="space-y-4">
      {#each notes as note (note.id)}
        <div class="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800">
          <div class="mb-2 flex items-center justify-between">
            <div class="flex items-center gap-2">
              {#if note.createdBy}
                <div class="flex h-6 w-6 items-center justify-center rounded-full bg-primary-100 text-xs font-medium text-primary-700 dark:bg-primary-900 dark:text-primary-300">
                  {note.createdBy.firstName.charAt(0)}{note.createdBy.lastName.charAt(0)}
                </div>
                <span class="text-sm font-medium text-gray-900 dark:text-white">
                  {note.createdBy.firstName} {note.createdBy.lastName}
                </span>
              {:else}
                <UserOutline class="h-5 w-5 text-gray-400" />
                <span class="text-sm text-gray-500 dark:text-gray-400">System</span>
              {/if}
            </div>
            <time class="text-xs text-gray-500 dark:text-gray-400" title={formatDate(note.createdAt, 'long')}>
              {getFriendlyRelativeTime(note.createdAt)}
            </time>
          </div>
          <p class="whitespace-pre-wrap text-sm text-gray-700 dark:text-gray-300">{note.content}</p>
        </div>
      {/each}
    </div>
  {/if}
</Card>
