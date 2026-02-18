<script lang="ts">
  import LeadHeader from '$lib/components/leads/LeadHeader.svelte';
  import LeadContactInfo from '$lib/components/leads/LeadContactInfo.svelte';
  import LeadSourceInfo from '$lib/components/leads/LeadSourceInfo.svelte';
  import LeadActivityTimeline from '$lib/components/leads/LeadActivityTimeline.svelte';
  import LeadNotes from '$lib/components/leads/LeadNotes.svelte';
  import UpdateStatusModal from '$lib/components/leads/UpdateStatusModal.svelte';
  import { formatCurrency, formatDate, getFriendlyRelativeTime } from '$lib/utils';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();

  let showStatusModal = $state(false);
</script>

<!-- Breadcrumb -->
<nav class="breadcrumb">
  <a href="/leads">Leads</a>
  <span class="sep">/</span>
  <span class="current">{data.lead.firstName} {data.lead.lastName}</span>
</nav>

<!-- Lead Header -->
<LeadHeader
  firstName={data.lead.firstName}
  lastName={data.lead.lastName}
  email={data.lead.email}
  phone={data.lead.phone}
  status={data.lead.status}
  temperature={data.lead.temperature}
  score={data.lead.score}
  onStatusChange={() => showStatusModal = true}
/>

<!-- Main content grid -->
<div class="detail-grid">
  <!-- Left column -->
  <div class="detail-sidebar">
    <LeadContactInfo
      phone={data.lead.phone}
      email={data.lead.email}
      interestLevel={data.lead.interestLevel}
      procedureInterest={data.lead.procedureInterest}
      insuranceStatus={data.lead.insuranceStatus}
      insuranceDetails={data.lead.insuranceDetails}
    />

    <LeadSourceInfo
      source={data.lead.source}
      sourceDetail={data.lead.sourceDetail}
      campaign={data.lead.campaign}
      territory={data.lead.territory}
      utmSource={data.lead.utmSource}
      utmMedium={data.lead.utmMedium}
      utmCampaign={data.lead.utmCampaign}
      utmContent={data.lead.utmContent}
    />

    <!-- Value Card -->
    {#if data.lead.estimatedRevenue || data.lead.conversionValue}
      <div class="card">
        <div class="card-header">
          <h3 class="card-title">Value</h3>
        </div>
        <div class="card-body">
          <div class="value-list">
            {#if data.lead.estimatedRevenue}
              <div class="value-row">
                <span class="value-label">Estimated Value</span>
                <span class="value-amount">{formatCurrency(data.lead.estimatedRevenue)}</span>
              </div>
            {/if}
            {#if data.lead.conversionValue}
              <div class="value-row">
                <span class="value-label">Conversion Value</span>
                <span class="value-amount success">{formatCurrency(data.lead.conversionValue)}</span>
              </div>
            {/if}
          </div>
        </div>
      </div>
    {/if}

    <!-- Timeline Card -->
    <div class="card">
      <div class="card-header">
        <h3 class="card-title">Timeline</h3>
      </div>
      <div class="card-body">
        <div class="timeline-info-list">
          <div class="timeline-info-row">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
              <line x1="16" y1="2" x2="16" y2="6"/>
              <line x1="8" y1="2" x2="8" y2="6"/>
              <line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
            <div>
              <div class="timeline-info-label">Created</div>
              <div class="timeline-info-value">{formatDate(data.lead.createdAt, 'medium')}</div>
              <div class="timeline-info-sub">{getFriendlyRelativeTime(data.lead.createdAt)}</div>
            </div>
          </div>

          {#if data.lead.convertedAt}
            <div class="timeline-info-row">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--success-500)" stroke-width="2">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                <polyline points="22 4 12 14.01 9 11.01"/>
              </svg>
              <div>
                <div class="timeline-info-label">Converted</div>
                <div class="timeline-info-value success">{formatDate(data.lead.convertedAt, 'medium')}</div>
              </div>
            </div>
          {/if}

          {#if data.lead.status === 'lost' && data.lead.lostReason}
            <div class="lost-reason-box">
              <div class="lost-reason-title">Lost Reason</div>
              <div class="lost-reason-text">{data.lead.lostReason}</div>
            </div>
          {/if}
        </div>
      </div>
    </div>

    <!-- Assigned To Card -->
    {#if data.lead.assignedToUser}
      <div class="card">
        <div class="card-header">
          <h3 class="card-title">Assigned To</h3>
        </div>
        <div class="card-body">
          <div class="assigned-row">
            <div class="assigned-avatar">
              {data.lead.assignedToUser.firstName.charAt(0)}{data.lead.assignedToUser.lastName.charAt(0)}
            </div>
            <div>
              <div class="assigned-name">{data.lead.assignedToUser.firstName} {data.lead.assignedToUser.lastName}</div>
              <div class="assigned-email">{data.lead.assignedToUser.email}</div>
            </div>
          </div>
        </div>
      </div>
    {/if}
  </div>

  <!-- Right column -->
  <div class="detail-main">
    <LeadNotes
      leadId={data.lead.id}
      notes={data.lead.notes}
    />

    <LeadActivityTimeline
      activities={data.lead.activities}
      title="Activity History"
    />
  </div>
</div>

<!-- Status Update Modal -->
<UpdateStatusModal
  bind:open={showStatusModal}
  currentStatus={data.lead.status}
  onClose={() => showStatusModal = false}
/>

<style>
  .breadcrumb {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.875rem;
    margin-bottom: var(--spacing-4);
    color: var(--gray-500);
  }

  .breadcrumb a {
    color: var(--gray-500);
    text-decoration: none;
  }

  .breadcrumb a:hover {
    color: var(--primary-600);
  }

  .breadcrumb .sep {
    color: var(--gray-300);
  }

  .breadcrumb .current {
    color: var(--gray-900);
    font-weight: 500;
  }

  .detail-grid {
    display: grid;
    grid-template-columns: 1fr 2fr;
    gap: var(--spacing-6);
    margin-top: var(--spacing-6);
  }

  .detail-sidebar {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-6);
  }

  .detail-main {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-6);
  }

  .value-list {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-3);
  }

  .value-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .value-label {
    font-size: 0.875rem;
    color: var(--gray-500);
  }

  .value-amount {
    font-weight: 600;
    color: var(--gray-900);
  }

  .value-amount.success {
    color: var(--success-600);
  }

  .timeline-info-list {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-4);
  }

  .timeline-info-row {
    display: flex;
    align-items: flex-start;
    gap: var(--spacing-3);
  }

  .timeline-info-row svg {
    color: var(--gray-400);
    flex-shrink: 0;
    margin-top: 2px;
  }

  .timeline-info-label {
    font-size: 0.75rem;
    color: var(--gray-500);
  }

  .timeline-info-value {
    font-weight: 500;
    color: var(--gray-900);
  }

  .timeline-info-value.success {
    color: var(--success-600);
  }

  .timeline-info-sub {
    font-size: 0.75rem;
    color: var(--gray-500);
  }

  .lost-reason-box {
    padding: var(--spacing-3);
    background: var(--danger-50, #fef2f2);
    border-radius: var(--radius-lg);
  }

  .lost-reason-title {
    font-size: 0.875rem;
    font-weight: 500;
    color: var(--danger-700);
    margin-bottom: var(--spacing-1);
  }

  .lost-reason-text {
    font-size: 0.875rem;
    color: var(--danger-600);
  }

  .assigned-row {
    display: flex;
    align-items: center;
    gap: var(--spacing-3);
  }

  .assigned-avatar {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background: var(--primary-100);
    color: var(--primary-700);
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 600;
    font-size: 0.875rem;
    flex-shrink: 0;
  }

  .assigned-name {
    font-weight: 500;
    color: var(--gray-900);
  }

  .assigned-email {
    font-size: 0.875rem;
    color: var(--gray-500);
  }

  @media (max-width: 1024px) {
    .detail-grid {
      grid-template-columns: 1fr;
    }
  }
</style>
