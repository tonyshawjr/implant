<script lang="ts">
  import { Card, Button, Textarea } from 'flowbite-svelte';
  import { PlusOutline, PaperPlaneOutline } from 'flowbite-svelte-icons';
  import { enhance } from '$app/forms';

  interface Props {
    leadId: string;
    notes: string | null;
  }

  let { leadId, notes }: Props = $props();

  let newNote = $state('');
  let isSubmitting = $state(false);
  let showForm = $state(false);
</script>

<Card>
  <div class="mb-4 flex items-center justify-between">
    <h3 class="text-lg font-semibold text-gray-900 dark:text-white">Notes</h3>
    {#if !showForm}
      <Button color="light" size="sm" onclick={() => (showForm = true)}>
        <PlusOutline class="mr-2 h-4 w-4" />
        Add Note
      </Button>
    {/if}
  </div>

  <!-- Existing notes from lead record -->
  {#if notes}
    <div class="mb-4 rounded-lg bg-gray-50 p-4 dark:bg-gray-700">
      <p class="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{notes}</p>
    </div>
  {/if}

  <!-- Add note form -->
  {#if showForm}
    <form
      method="POST"
      action="?/addNote"
      use:enhance={() => {
        isSubmitting = true;
        return async ({ result, update }) => {
          isSubmitting = false;
          if (result.type === 'success') {
            newNote = '';
            showForm = false;
          }
          await update();
        };
      }}
    >
      <div class="space-y-3">
        <Textarea
          name="note"
          bind:value={newNote}
          placeholder="Add a note about this lead..."
          rows={4}
          required
        />
        <div class="flex justify-end gap-2">
          <Button
            type="button"
            color="light"
            size="sm"
            onclick={() => {
              showForm = false;
              newNote = '';
            }}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            color="primary"
            size="sm"
            disabled={isSubmitting || !newNote.trim()}
          >
            <PaperPlaneOutline class="mr-2 h-4 w-4" />
            {isSubmitting ? 'Saving...' : 'Save Note'}
          </Button>
        </div>
      </div>
    </form>
  {/if}

  {#if !notes && !showForm}
    <p class="text-center text-gray-500 dark:text-gray-400">
      No notes yet. Add one to keep track of important information.
    </p>
  {/if}
</Card>
