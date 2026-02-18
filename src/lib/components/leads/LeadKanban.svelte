<script lang="ts">
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

  // Column configurations matching lead statuses
  const columns = [
    { id: 'new', label: 'New', dotClass: 'new' },
    { id: 'contacted', label: 'Contacted', dotClass: 'contacted' },
    { id: 'qualified', label: 'Qualified', dotClass: 'qualified' },
    { id: 'appointment_set', label: 'Appointment Set', dotClass: 'appointment_set' },
    { id: 'consultation_completed', label: 'Consultation', dotClass: 'consultation_completed' },
    { id: 'converted', label: 'Converted', dotClass: 'converted' },
    { id: 'lost', label: 'Lost', dotClass: 'lost' }
  ];

  // Group leads by status
  const leadsByStatus = $derived(() => {
    const grouped: Record<string, Lead[]> = {};

    for (const col of columns) {
      grouped[col.id] = [];
    }

    for (const lead of leads) {
      if (grouped[lead.status]) {
        grouped[lead.status].push(lead);
      } else {
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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update status');
      }

      const updatedLead = await response.json();
      showToast(`Lead moved to ${formatStatus(newStatus)}`, 'success');

      if (onLeadUpdated) {
        onLeadUpdated(updatedLead);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update status';
      showToast(message, 'error');
      throw error;
    }
  }

  function showToast(message: string, type: 'success' | 'error') {
    toastMessage = message;
    toastType = type;
    toastVisible = true;
    setTimeout(() => { toastVisible = false; }, 3000);
  }

  function formatStatus(status: string): string {
    return status.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  }
</script>

<div class="pipeline-container">
  {#each columns as column (column.id)}
    <LeadKanbanColumn
      {column}
      leads={leadsByStatus()[column.id]}
      onStatusChange={handleStatusChange}
    />
  {/each}
</div>

<!-- Toast Notification -->
{#if toastVisible}
  <div class="toast-notification {toastType}">
    {#if toastType === 'success'}
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
        <polyline points="22 4 12 14.01 9 11.01"/>
      </svg>
    {:else}
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10"/>
        <line x1="15" y1="9" x2="9" y2="15"/>
        <line x1="9" y1="9" x2="15" y2="15"/>
      </svg>
    {/if}
    <span>{toastMessage}</span>
    <button class="toast-close" onclick={() => toastVisible = false}>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <line x1="18" y1="6" x2="6" y2="18"/>
        <line x1="6" y1="6" x2="18" y2="18"/>
      </svg>
    </button>
  </div>
{/if}

<style>
  .pipeline-container {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    gap: var(--spacing-4);
    overflow-x: auto;
    padding-bottom: var(--spacing-4);
  }

  @media (max-width: 1400px) {
    .pipeline-container {
      grid-template-columns: repeat(7, minmax(260px, 1fr));
    }
  }

  @media (max-width: 768px) {
    .pipeline-container {
      display: flex;
      overflow-x: auto;
      -webkit-overflow-scrolling: touch;
      scroll-snap-type: x mandatory;
      gap: var(--spacing-3);
      padding: var(--spacing-2);
      margin: 0 calc(-1 * var(--spacing-4));
      padding-left: var(--spacing-4);
      padding-right: var(--spacing-4);
    }
  }

  /* Custom scrollbar */
  .pipeline-container::-webkit-scrollbar {
    height: 8px;
  }

  .pipeline-container::-webkit-scrollbar-track {
    background: var(--gray-100);
    border-radius: 4px;
  }

  .pipeline-container::-webkit-scrollbar-thumb {
    background: var(--gray-300);
    border-radius: 4px;
  }

  .pipeline-container::-webkit-scrollbar-thumb:hover {
    background: var(--gray-400);
  }

  /* Toast */
  .toast-notification {
    position: fixed;
    bottom: 1.5rem;
    right: 1.5rem;
    z-index: 1000;
    display: flex;
    align-items: center;
    gap: var(--spacing-3);
    padding: var(--spacing-3) var(--spacing-4);
    border-radius: var(--radius-lg);
    font-size: 0.875rem;
    font-weight: 500;
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
    animation: slideIn 0.3s ease;
  }

  .toast-notification.success {
    background: var(--success-600);
    color: white;
  }

  .toast-notification.error {
    background: var(--danger-600);
    color: white;
  }

  .toast-close {
    background: transparent;
    border: none;
    color: inherit;
    opacity: 0.7;
    cursor: pointer;
    padding: 2px;
    display: flex;
  }

  .toast-close:hover {
    opacity: 1;
  }

  @keyframes slideIn {
    from {
      transform: translateY(1rem);
      opacity: 0;
    }
    to {
      transform: translateY(0);
      opacity: 1;
    }
  }
</style>
