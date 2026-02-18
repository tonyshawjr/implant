<script lang="ts">
  interface Props {
    phone: string | null;
    email: string | null;
    interestLevel: string | null;
    procedureInterest: string | null;
    insuranceStatus: string | null;
    insuranceDetails: string | null;
  }

  let { phone, email, interestLevel, procedureInterest, insuranceStatus, insuranceDetails }: Props = $props();

  function formatLabel(level: string | null): string {
    if (!level) return 'Unknown';
    return level.charAt(0).toUpperCase() + level.slice(1).replace(/_/g, ' ');
  }
</script>

<div class="card">
  <div class="card-header">
    <h3 class="card-title">Contact Information</h3>
  </div>
  <div class="card-body">
    <div class="info-list">
      {#if phone}
        <div class="info-row">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
          </svg>
          <div>
            <div class="info-label">Phone</div>
            <a href="tel:{phone}" class="info-link">{phone}</a>
          </div>
        </div>
      {/if}

      {#if email}
        <div class="info-row">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
            <polyline points="22,6 12,13 2,6"/>
          </svg>
          <div>
            <div class="info-label">Email</div>
            <a href="mailto:{email}" class="info-link">{email}</a>
          </div>
        </div>
      {/if}

      {#if interestLevel}
        <div class="info-row">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
          </svg>
          <div>
            <div class="info-label">Interest Level</div>
            <div class="info-value">{formatLabel(interestLevel)}</div>
          </div>
        </div>
      {/if}

      {#if procedureInterest}
        <div class="info-row">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>
            <rect x="8" y="2" width="8" height="4" rx="1" ry="1"/>
          </svg>
          <div>
            <div class="info-label">Procedure Interest</div>
            <div class="info-value">{procedureInterest}</div>
          </div>
        </div>
      {/if}

      {#if insuranceStatus}
        <div class="info-row">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
          </svg>
          <div>
            <div class="info-label">Insurance Status</div>
            <div class="info-value">{formatLabel(insuranceStatus)}</div>
            {#if insuranceDetails}
              <div class="info-sub">{insuranceDetails}</div>
            {/if}
          </div>
        </div>
      {/if}
    </div>
  </div>
</div>

<style>
  .info-list {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-4);
  }

  .info-row {
    display: flex;
    align-items: flex-start;
    gap: var(--spacing-3);
  }

  .info-row svg {
    color: var(--gray-400);
    flex-shrink: 0;
    margin-top: 2px;
  }

  .info-label {
    font-size: 0.75rem;
    color: var(--gray-500);
    margin-bottom: 2px;
  }

  .info-value {
    font-weight: 500;
    color: var(--gray-900);
  }

  .info-link {
    font-weight: 500;
    color: var(--primary-600);
    text-decoration: none;
  }

  .info-link:hover {
    text-decoration: underline;
  }

  .info-sub {
    font-size: 0.875rem;
    color: var(--gray-500);
  }
</style>
