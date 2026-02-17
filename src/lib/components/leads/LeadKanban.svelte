<script lang="ts">
  import { Toast } from 'flowbite-svelte';
  import { CheckCircleSolid, CloseCircleSolid } from 'flowbite-svelte-icons';
  import LeadKanbanColumn from './LeadKanbanColumn.svelte';

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

  interface Props {
    leads: Lead[];
    onLeadUpdated?: (lead: Lead) => void;
  }

  let { leads, onLeadUpdated }: Props = $props();

  // Toast state
  let toastVisible = $state(false);
  let toastMessage = $state('');
  let toastType = $state<'success' | 'error'>('success');

  // Column configurations with colors matching LeadStatusBadge
  const columns = [
    { id: 'new', label: 'New', color: '#3b82f6', bgColor: '#eff6ff' },
    { id: 'contacted', label: 'Contacted', color: '#eab308', bgColor: '#fefce8' },
    { id: 'qualified', label: 'Qualified', color: '#a855f7', bgColor: '#faf5ff' },
    { id: 'appointment_set', label: 'Appointment Set', color: '#f97316', bgColor: '#fff7ed' },
    { id: 'consultation_completed', label: 'Consultation', color: '#6366f1', bgColor: '#eef2ff' },
    { id: 'converted', label: 'Converted', color: '#22c55e', bgColor: '#f0fdf4' },
    { id: 'lost', label: 'Lost', color: '#ef4444', bgColor: '#fef2f2' }
  ];

  // Group leads by status
  const leadsByStatus = $derived(() => {
    const grouped: Record<string, Lead[]> = {};

    // Initialize all columns with empty arrays
    for (const col of columns) {
      grouped[col.id] = [];
    }

    // Populate with leads
    for (const lead of leads) {
      if (grouped[lead.status]) {
        grouped[lead.status].push(lead);
      } else {
        // If status doesn't match any column, put in 'new'
        grouped['new'].push(lead);
      }
    }

    return grouped;
  });

  // Handle status change from drag and drop
  async function handleStatusChange(leadId: string, newStatus: string): Promise<void> {
    try {
      const response = await fetch(`/api/leads/${leadId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: newStatus })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update status');
      }

      const updatedLead = await response.json();

      // Show success toast
      showToast(`Lead moved to ${formatStatus(newStatus)}`, 'success');

      // Notify parent if callback provided
      if (onLeadUpdated) {
        onLeadUpdated(updatedLead);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update status';
      showToast(message, 'error');
      throw error; // Re-throw so column can handle reverting
    }
  }

  function showToast(message: string, type: 'success' | 'error') {
    toastMessage = message;
    toastType = type;
    toastVisible = true;

    // Auto-hide after 3 seconds
    setTimeout(() => {
      toastVisible = false;
    }, 3000);
  }

  function formatStatus(status: string): string {
    return status
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }
</script>

<div class="kanban-container">
  <div class="kanban-board">
    {#each columns as column (column.id)}
      <LeadKanbanColumn
        {column}
        leads={leadsByStatus()[column.id]}
        onStatusChange={handleStatusChange}
      />
    {/each}
  </div>
</div>

<!-- Toast Notification -->
{#if toastVisible}
  <div class="toast-container">
    <Toast color={toastType === 'success' ? 'green' : 'red'} dismissable bind:toastStatus={toastVisible}>
      {#snippet icon()}
        {#if toastType === 'success'}
          <CheckCircleSolid class="w-5 h-5" />
        {:else}
          <CloseCircleSolid class="w-5 h-5" />
        {/if}
      {/snippet}
      {toastMessage}
    </Toast>
  </div>
{/if}

<style>
  .kanban-container {
    width: 100%;
    overflow-x: auto;
    padding-bottom: 1rem;
  }

  .kanban-board {
    display: flex;
    gap: 1rem;
    min-width: max-content;
    padding: 0.25rem;
  }

  .toast-container {
    position: fixed;
    bottom: 1.5rem;
    right: 1.5rem;
    z-index: 50;
  }

  /* Custom scrollbar for horizontal scroll */
  .kanban-container::-webkit-scrollbar {
    height: 8px;
  }

  .kanban-container::-webkit-scrollbar-track {
    background: #f1f5f9;
    border-radius: 4px;
  }

  .kanban-container::-webkit-scrollbar-thumb {
    background: #cbd5e1;
    border-radius: 4px;
  }

  .kanban-container::-webkit-scrollbar-thumb:hover {
    background: #94a3b8;
  }

  /* Dark mode scrollbar */
  :global(.dark) .kanban-container::-webkit-scrollbar-track {
    background: #1e293b;
  }

  :global(.dark) .kanban-container::-webkit-scrollbar-thumb {
    background: #475569;
  }

  :global(.dark) .kanban-container::-webkit-scrollbar-thumb:hover {
    background: #64748b;
  }
</style>
