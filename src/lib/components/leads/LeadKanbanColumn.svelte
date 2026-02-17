<script lang="ts">
  import { Badge } from 'flowbite-svelte';
  import { flip } from 'svelte/animate';
  import { dndzone } from 'svelte-dnd-action';
  import LeadKanbanCard from './LeadKanbanCard.svelte';

  interface Lead {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string | null;
    phone: string | null;
    status: string;
    temperature: string | null;
    score: number | null;
    createdAt: string;
    lastActivityAt?: string | null;
    assignedToUser?: {
      id: string;
      firstName: string;
      lastName: string;
      avatarUrl?: string | null;
    } | null;
  }

  interface ColumnConfig {
    id: string;
    label: string;
    color: string;
    bgColor: string;
  }

  interface Props {
    column: ColumnConfig;
    leads: Lead[];
    onStatusChange?: (leadId: string, newStatus: string) => Promise<void>;
  }

  let { column, leads = [], onStatusChange }: Props = $props();

  // Local state for drag and drop
  let items = $state<Lead[]>([]);

  // Keep items in sync with leads prop
  $effect(() => {
    items = [...leads];
  });

  const flipDurationMs = 200;

  function handleDndConsider(e: CustomEvent<{ items: Lead[] }>) {
    items = e.detail.items;
  }

  async function handleDndFinalize(e: CustomEvent<{ items: Lead[]; info: { id: string; source: string; trigger: string } }>) {
    items = e.detail.items;

    // Find if any lead moved to this column from another
    const movedLead = items.find(item => item.status !== column.id);

    if (movedLead && onStatusChange) {
      try {
        await onStatusChange(movedLead.id, column.id);
        // Update the local lead status after successful API call
        movedLead.status = column.id;
      } catch (error) {
        // If API call fails, the parent component should handle reverting
        console.error('Failed to update lead status:', error);
      }
    }
  }

  const leadCount = $derived(items.length);
</script>

<div class="kanban-column">
  <!-- Column Header -->
  <div class="column-header" style="border-top-color: {column.color};">
    <div class="header-content">
      <h3 class="column-title">{column.label}</h3>
      <Badge color="gray" class="text-xs">{leadCount}</Badge>
    </div>
  </div>

  <!-- Column Body - Dropzone -->
  <div
    class="column-body"
    style="background-color: {column.bgColor};"
    use:dndzone={{
      items,
      flipDurationMs,
      type: 'leads',
      dropTargetStyle: {
        outline: `2px dashed ${column.color}`,
        outlineOffset: '-2px'
      }
    }}
    onconsider={handleDndConsider}
    onfinalize={handleDndFinalize}
  >
    {#each items as lead (lead.id)}
      <div animate:flip={{ duration: flipDurationMs }}>
        <LeadKanbanCard {lead} />
      </div>
    {/each}

    {#if items.length === 0}
      <div class="empty-column">
        <span>No leads</span>
      </div>
    {/if}
  </div>
</div>

<style>
  .kanban-column {
    display: flex;
    flex-direction: column;
    min-width: 280px;
    max-width: 320px;
    flex: 1;
  }

  .column-header {
    background: white;
    border-radius: 0.5rem 0.5rem 0 0;
    padding: 0.75rem 1rem;
    border-top: 3px solid;
    border-left: 1px solid #e5e7eb;
    border-right: 1px solid #e5e7eb;
  }

  .header-content {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
  }

  .column-title {
    font-weight: 600;
    font-size: 0.875rem;
    color: #374151;
    margin: 0;
  }

  .column-body {
    flex: 1;
    min-height: 400px;
    padding: 0.75rem;
    border-radius: 0 0 0.5rem 0.5rem;
    border: 1px solid #e5e7eb;
    border-top: none;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    overflow-y: auto;
    transition: outline 0.2s ease;
  }

  .empty-column {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 100px;
    color: #9ca3af;
    font-size: 0.875rem;
    border: 2px dashed #e5e7eb;
    border-radius: 0.375rem;
    flex: 1;
  }

  /* Dark mode support */
  :global(.dark) .column-header {
    background: #1f2937;
    border-left-color: #374151;
    border-right-color: #374151;
  }

  :global(.dark) .column-title {
    color: #f3f4f6;
  }

  :global(.dark) .column-body {
    border-color: #374151;
  }

  :global(.dark) .empty-column {
    border-color: #4b5563;
    color: #6b7280;
  }
</style>
