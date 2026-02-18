<script lang="ts">
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
    dotClass: string;
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
        movedLead.status = column.id;
      } catch (error) {
        console.error('Failed to update lead status:', error);
      }
    }
  }

  let leadCount = $derived(items.length);
</script>

<div class="pipeline-column">
  <div class="pipeline-column-header">
    <div class="pipeline-column-title">
      <span class="stage-dot {column.dotClass}"></span>
      {column.label}
      <span class="stage-count">{leadCount}</span>
    </div>
  </div>
  <div
    class="pipeline-column-body"
    use:dndzone={{
      items,
      flipDurationMs,
      type: 'leads',
      dropTargetStyle: {
        outline: '2px dashed var(--primary-300)',
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
      <div class="pipeline-empty">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/>
          <line x1="12" y1="8" x2="12" y2="12"/>
          <line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
        <span>No leads</span>
      </div>
    {/if}
  </div>
</div>

<style>
  .pipeline-column {
    background: var(--gray-50);
    border-radius: var(--radius-xl);
    min-height: 400px;
    display: flex;
    flex-direction: column;
    min-width: 260px;
    flex: 1;
  }

  .pipeline-column-header {
    padding: var(--spacing-4);
    border-bottom: 1px solid var(--gray-200);
  }

  .pipeline-column-title {
    display: flex;
    align-items: center;
    gap: var(--spacing-2);
    font-weight: 600;
    color: var(--gray-900);
  }

  .stage-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
  }

  .stage-dot.new { background: var(--primary-500); }
  .stage-dot.contacted { background: var(--warning-500); }
  .stage-dot.qualified { background: #8b5cf6; }
  .stage-dot.appointment_set { background: #f97316; }
  .stage-dot.consultation_completed { background: #6366f1; }
  .stage-dot.converted { background: var(--success-500); }
  .stage-dot.lost { background: var(--danger-500); }

  .stage-count {
    margin-left: auto;
    background: var(--gray-200);
    color: var(--gray-700);
    font-size: 0.75rem;
    font-weight: 600;
    padding: 2px 8px;
    border-radius: var(--radius-full);
  }

  .pipeline-column-body {
    padding: var(--spacing-3);
    flex: 1;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: var(--spacing-3);
    transition: outline 0.2s ease;
  }

  .pipeline-empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: var(--spacing-2);
    padding: var(--spacing-8);
    color: var(--gray-400);
    font-size: 0.875rem;
  }
</style>
