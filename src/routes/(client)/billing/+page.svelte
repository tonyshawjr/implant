<script lang="ts">
  import type { PageData, ActionData } from './$types';
  import { enhance } from '$app/forms';

  let { data, form }: { data: PageData; form: ActionData } = $props();

  // Modal state
  let showCancelModal = $state(false);

  // Helper functions
  function formatCurrency(value: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  }

  function formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  }

  function getStatusBadgeClass(status: string): string {
    switch (status.toLowerCase()) {
      case 'paid':
        return 'badge-success';
      case 'pending':
      case 'draft':
        return 'badge-warning';
      case 'overdue':
      case 'failed':
        return 'badge-danger';
      case 'active':
        return 'badge-success';
      case 'cancelled':
      case 'canceled':
        return 'badge-gray';
      default:
        return 'badge-gray';
    }
  }

  function capitalizeFirst(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  }

  function getCardBrandIcon(brand: string | null): string {
    switch (brand?.toLowerCase()) {
      case 'visa':
        return 'Visa';
      case 'mastercard':
        return 'Mastercard';
      case 'amex':
        return 'Amex';
      case 'discover':
        return 'Discover';
      default:
        return 'Card';
    }
  }
</script>

<svelte:head>
  <title>Billing - Implant Lead Engine</title>
</svelte:head>

<div class="billing-page">
  <!-- Page Header -->
  <div class="page-header">
    <div>
      <h1 class="page-title">Billing</h1>
      <p class="page-subtitle">Manage your subscription, payment methods, and view invoices</p>
    </div>
  </div>

  <!-- Success/Error Messages -->
  {#if data.checkoutSuccess}
    <div class="alert alert-success">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
        <polyline points="22 4 12 14.01 9 11.01"/>
      </svg>
      <span>Payment method updated successfully!</span>
    </div>
  {/if}

  {#if data.checkoutCancelled}
    <div class="alert alert-warning">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10"/>
        <line x1="12" y1="8" x2="12" y2="12"/>
        <line x1="12" y1="16" x2="12.01" y2="16"/>
      </svg>
      <span>Payment setup was cancelled.</span>
    </div>
  {/if}

  {#if form?.error}
    <div class="alert alert-danger">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10"/>
        <line x1="15" y1="9" x2="9" y2="15"/>
        <line x1="9" y1="9" x2="15" y2="15"/>
      </svg>
      <span>{form.error}</span>
    </div>
  {/if}

  {#if form?.success && form?.message}
    <div class="alert alert-success">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
        <polyline points="22 4 12 14.01 9 11.01"/>
      </svg>
      <span>{form.message}</span>
    </div>
  {/if}

  <!-- Top Row: Subscription & Payment Method -->
  <div class="billing-grid">
    <!-- Current Subscription Card -->
    <div class="card">
      <div class="card-header">
        <h2 class="card-title">Current Subscription</h2>
        {#if data.contract}
          <span class="badge {getStatusBadgeClass(data.contract.status)}">
            {capitalizeFirst(data.contract.status)}
          </span>
        {/if}
      </div>
      <div class="card-body">
        {#if data.contract}
          <div class="subscription-details">
            <div class="plan-info">
              <div class="plan-name">{data.contract.plan.name}</div>
              <div class="plan-price">
                <span class="price-amount">{formatCurrency(data.contract.monthlyCommitment)}</span>
                <span class="price-period">/month</span>
              </div>
            </div>

            <div class="subscription-meta">
              <div class="meta-item">
                <span class="meta-label">Contract Term</span>
                <span class="meta-value">{data.contract.termMonths} months</span>
              </div>
              <div class="meta-item">
                <span class="meta-label">Start Date</span>
                <span class="meta-value">{formatDate(data.contract.startDate)}</span>
              </div>
              <div class="meta-item">
                <span class="meta-label">Next Billing Date</span>
                <span class="meta-value">
                  {#if data.stripeSubscription?.currentPeriodEnd}
                    {formatDate(data.stripeSubscription.currentPeriodEnd)}
                  {:else}
                    {formatDate(data.contract.endDate)}
                  {/if}
                </span>
              </div>
              <div class="meta-item">
                <span class="meta-label">Auto-Renew</span>
                <span class="meta-value">
                  {#if data.stripeSubscription?.cancelAtPeriodEnd}
                    <span class="text-danger">Cancels at period end</span>
                  {:else}
                    {data.contract.autoRenew ? 'Yes' : 'No'}
                  {/if}
                </span>
              </div>
            </div>

            {#if data.stripeSubscription?.cancelAtPeriodEnd}
              <div class="cancel-notice">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="12" y1="8" x2="12" y2="12"/>
                  <line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                <span>Your subscription will end on {formatDate(data.stripeSubscription.currentPeriodEnd)}</span>
              </div>
              <form method="POST" action="?/resumeSubscription" use:enhance>
                <button type="submit" class="btn btn-primary btn-sm mt-2">
                  Resume Subscription
                </button>
              </form>
            {/if}
          </div>
        {:else}
          <div class="empty-state-inline">
            <p>No active subscription found.</p>
            <a href="/contact" class="btn btn-primary">Contact Sales</a>
          </div>
        {/if}
      </div>
      {#if data.contract && !data.stripeSubscription?.cancelAtPeriodEnd}
        <div class="card-footer">
          <button class="btn btn-outline btn-sm" onclick={() => showCancelModal = true}>
            Cancel Subscription
          </button>
          {#if data.isStripeConfigured}
            <form method="POST" action="?/openBillingPortal" use:enhance>
              <button type="submit" class="btn btn-secondary btn-sm">
                Manage in Stripe
              </button>
            </form>
          {/if}
        </div>
      {/if}
    </div>

    <!-- Payment Method Card -->
    <div class="card">
      <div class="card-header">
        <h2 class="card-title">Payment Method</h2>
      </div>
      <div class="card-body">
        {#if data.paymentMethod}
          <div class="payment-method-display">
            <div class="card-icon">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/>
                <line x1="1" y1="10" x2="23" y2="10"/>
              </svg>
            </div>
            <div class="card-details">
              <div class="card-brand-number">
                <span class="card-brand">{getCardBrandIcon(data.paymentMethod.brand)}</span>
                <span class="card-number">**** **** **** {data.paymentMethod.lastFour}</span>
              </div>
              <div class="card-expiry">
                Expires {data.paymentMethod.expMonth?.toString().padStart(2, '0')}/{data.paymentMethod.expYear}
              </div>
            </div>
            {#if data.paymentMethod.isDefault}
              <span class="badge badge-primary">Default</span>
            {/if}
          </div>

          <!-- Additional Payment Methods -->
          {#if data.paymentMethods && data.paymentMethods.length > 1}
            <div class="additional-methods">
              <h4 class="additional-methods-title">Other Payment Methods</h4>
              {#each data.paymentMethods.filter(pm => !pm.isDefault) as pm}
                <div class="payment-method-item">
                  <div class="payment-method-info">
                    <span class="card-brand-small">{getCardBrandIcon(pm.brand)}</span>
                    <span>**** {pm.lastFour}</span>
                    <span class="text-gray-500">Exp {pm.expMonth?.toString().padStart(2, '0')}/{pm.expYear}</span>
                  </div>
                  <div class="payment-method-actions">
                    <form method="POST" action="?/setDefaultPaymentMethod" use:enhance>
                      <input type="hidden" name="paymentMethodId" value={pm.id} />
                      <button type="submit" class="btn btn-sm btn-outline">Set Default</button>
                    </form>
                    <form method="POST" action="?/removePaymentMethod" use:enhance>
                      <input type="hidden" name="paymentMethodId" value={pm.id} />
                      <button type="submit" class="btn btn-sm btn-danger">Remove</button>
                    </form>
                  </div>
                </div>
              {/each}
            </div>
          {/if}
        {:else}
          <div class="empty-state-inline">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="empty-icon">
              <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/>
              <line x1="1" y1="10" x2="23" y2="10"/>
            </svg>
            <p>No payment method on file.</p>
          </div>
        {/if}
      </div>
      <div class="card-footer">
        {#if data.isStripeConfigured}
          <form method="POST" action="?/openBillingPortal" use:enhance>
            <button type="submit" class="btn btn-primary btn-sm">
              {data.paymentMethod ? 'Update Payment Method' : 'Add Payment Method'}
            </button>
          </form>
        {:else}
          <p class="text-sm text-gray-500">Payment processing is not configured.</p>
        {/if}
      </div>
    </div>
  </div>

  <!-- Active Add-ons Section -->
  {#if data.addons && data.addons.length > 0}
    <div class="card mt-6">
      <div class="card-header">
        <h2 class="card-title">Add-ons</h2>
      </div>
      <div class="card-body">
        <div class="addons-grid">
          {#each data.addons as addon}
            <div class="addon-card {addon.isActive ? 'active' : ''}">
              <div class="addon-header">
                <h3 class="addon-name">{addon.name}</h3>
                <span class="addon-price">{formatCurrency(addon.price)}/mo</span>
              </div>
              <p class="addon-description">{addon.description}</p>
              <div class="addon-footer">
                {#if addon.isActive}
                  <span class="badge badge-success">Active</span>
                  <form method="POST" action="?/cancelAddon" use:enhance>
                    <input type="hidden" name="organizationAddonId" value={addon.organizationAddonId} />
                    <button type="submit" class="btn btn-sm btn-outline">Cancel</button>
                  </form>
                {:else}
                  <form method="POST" action="?/subscribeAddon" use:enhance>
                    <input type="hidden" name="addonId" value={addon.id} />
                    <button type="submit" class="btn btn-sm btn-primary">Add</button>
                  </form>
                {/if}
              </div>
            </div>
          {/each}
        </div>
      </div>
    </div>
  {/if}

  <!-- Ad Spend Summary -->
  {#if data.adSpend && data.adSpend.total > 0}
    <div class="card mt-6">
      <div class="card-header">
        <h2 class="card-title">Ad Spend - {data.adSpend.month}</h2>
        <span class="text-lg font-semibold">{formatCurrency(data.adSpend.total)}</span>
      </div>
      <div class="card-body">
        {#if data.adSpend.byPlatform && data.adSpend.byPlatform.length > 0}
          <div class="spend-breakdown">
            {#each data.adSpend.byPlatform as campaign}
              <div class="spend-item">
                <div class="spend-info">
                  <span class="spend-name">{campaign.name}</span>
                  <span class="badge badge-gray">{campaign.platform}</span>
                </div>
                <span class="spend-amount">{formatCurrency(campaign.spend)}</span>
              </div>
            {/each}
          </div>
        {:else}
          <p class="text-gray-500 text-sm">No active campaigns this month.</p>
        {/if}
      </div>
    </div>
  {/if}

  <!-- Invoice History Table -->
  <div class="card mt-6">
    <div class="card-header">
      <h2 class="card-title">Invoice History</h2>
    </div>
    <div class="table-container">
      <table class="table">
        <thead>
          <tr>
            <th>Invoice #</th>
            <th>Date</th>
            <th>Amount</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {#if data.invoices && data.invoices.length > 0}
            {#each data.invoices as invoice}
              <tr>
                <td class="font-medium">{invoice.invoiceNumber}</td>
                <td>{formatDate(invoice.issueDate)}</td>
                <td>{formatCurrency(invoice.totalAmount)}</td>
                <td>
                  <span class="badge {getStatusBadgeClass(invoice.status)}">
                    {capitalizeFirst(invoice.status)}
                  </span>
                </td>
                <td>
                  <div class="table-actions">
                    {#if data.isStripeConfigured}
                      <form method="POST" action="?/downloadInvoice" use:enhance={({ formData }) => {
                        return async ({ result }) => {
                          if (result.type === 'success' && result.data?.pdfUrl) {
                            window.open(result.data.pdfUrl, '_blank');
                          }
                        };
                      }}>
                        <input type="hidden" name="invoiceId" value={invoice.id} />
                        <button type="submit" class="btn btn-sm btn-outline" title="Download PDF">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                            <polyline points="7 10 12 15 17 10"/>
                            <line x1="12" y1="15" x2="12" y2="3"/>
                          </svg>
                          Download
                        </button>
                      </form>
                    {:else}
                      <span class="text-sm text-gray-500">PDF unavailable</span>
                    {/if}
                  </div>
                </td>
              </tr>
            {/each}
          {:else}
            <tr>
              <td colspan="5">
                <div class="empty-state">
                  <div class="empty-state-icon">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                      <polyline points="14 2 14 8 20 8"/>
                      <line x1="16" y1="13" x2="8" y2="13"/>
                      <line x1="16" y1="17" x2="8" y2="17"/>
                      <polyline points="10 9 9 9 8 9"/>
                    </svg>
                  </div>
                  <h3 class="empty-state-title">No invoices yet</h3>
                  <p class="empty-state-description">Your invoices will appear here once generated.</p>
                </div>
              </td>
            </tr>
          {/if}
        </tbody>
      </table>
    </div>
  </div>
</div>

<!-- Cancel Subscription Modal -->
{#if showCancelModal}
  <div class="modal-overlay open" onclick={() => showCancelModal = false} role="presentation">
    <div class="modal" onclick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
      <div class="modal-header">
        <h3 class="modal-title">Cancel Subscription</h3>
        <button class="modal-close" onclick={() => showCancelModal = false}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>
      <form method="POST" action="?/cancelSubscription" use:enhance={() => {
        return async ({ result }) => {
          if (result.type === 'success') {
            showCancelModal = false;
          }
        };
      }}>
        <div class="modal-body">
          <p class="mb-4">Are you sure you want to cancel your subscription?</p>
          <p class="text-sm text-gray-500 mb-4">
            Your subscription will remain active until the end of the current billing period.
          </p>
          <div class="form-group">
            <label for="reason" class="form-label">Reason for cancellation (optional)</label>
            <textarea
              id="reason"
              name="reason"
              class="form-input"
              rows="3"
              placeholder="Please let us know why you're cancelling..."
            ></textarea>
          </div>
          <input type="hidden" name="cancelAtPeriodEnd" value="true" />
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" onclick={() => showCancelModal = false}>
            Keep Subscription
          </button>
          <button type="submit" class="btn btn-danger">
            Cancel Subscription
          </button>
        </div>
      </form>
    </div>
  </div>
{/if}

<style>
  .billing-page {
    max-width: 1200px;
  }

  .page-header {
    margin-bottom: var(--spacing-6);
  }

  .page-title {
    font-size: 1.5rem;
    font-weight: 700;
    color: var(--gray-900);
  }

  .page-subtitle {
    font-size: 0.875rem;
    color: var(--gray-500);
    margin-top: var(--spacing-1);
  }

  /* Alerts */
  .alert {
    display: flex;
    align-items: center;
    gap: var(--spacing-3);
    padding: var(--spacing-4);
    border-radius: var(--radius-lg);
    margin-bottom: var(--spacing-4);
    font-size: 0.875rem;
  }

  .alert-success {
    background: var(--success-50);
    color: var(--success-700);
    border: 1px solid var(--success-100);
  }

  .alert-warning {
    background: var(--warning-50);
    color: var(--warning-600);
    border: 1px solid var(--warning-100);
  }

  .alert-danger {
    background: var(--danger-50);
    color: var(--danger-600);
    border: 1px solid var(--danger-100);
  }

  /* Billing Grid */
  .billing-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: var(--spacing-6);
  }

  @media (max-width: 1024px) {
    .billing-grid {
      grid-template-columns: 1fr;
    }
  }

  /* Subscription Details */
  .subscription-details {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-4);
  }

  .plan-info {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    padding-bottom: var(--spacing-4);
    border-bottom: 1px solid var(--gray-100);
  }

  .plan-name {
    font-size: 1.125rem;
    font-weight: 600;
    color: var(--gray-900);
  }

  .plan-price {
    text-align: right;
  }

  .price-amount {
    font-size: 1.5rem;
    font-weight: 700;
    color: var(--gray-900);
  }

  .price-period {
    font-size: 0.875rem;
    color: var(--gray-500);
  }

  .subscription-meta {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: var(--spacing-3);
  }

  .meta-item {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-1);
  }

  .meta-label {
    font-size: 0.75rem;
    font-weight: 500;
    color: var(--gray-500);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .meta-value {
    font-size: 0.875rem;
    font-weight: 500;
    color: var(--gray-900);
  }

  .cancel-notice {
    display: flex;
    align-items: center;
    gap: var(--spacing-2);
    padding: var(--spacing-3);
    background: var(--warning-50);
    border-radius: var(--radius-md);
    color: var(--warning-600);
    font-size: 0.875rem;
  }

  /* Payment Method Display */
  .payment-method-display {
    display: flex;
    align-items: center;
    gap: var(--spacing-4);
    padding: var(--spacing-4);
    background: var(--gray-50);
    border-radius: var(--radius-lg);
  }

  .card-icon {
    width: 56px;
    height: 40px;
    background: white;
    border: 1px solid var(--gray-200);
    border-radius: var(--radius-md);
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--gray-400);
  }

  .card-details {
    flex: 1;
  }

  .card-brand-number {
    display: flex;
    align-items: center;
    gap: var(--spacing-2);
  }

  .card-brand {
    font-weight: 600;
    color: var(--gray-900);
  }

  .card-number {
    font-family: var(--font-mono);
    font-size: 0.875rem;
    color: var(--gray-700);
  }

  .card-expiry {
    font-size: 0.75rem;
    color: var(--gray-500);
    margin-top: var(--spacing-1);
  }

  .additional-methods {
    margin-top: var(--spacing-4);
    padding-top: var(--spacing-4);
    border-top: 1px solid var(--gray-100);
  }

  .additional-methods-title {
    font-size: 0.75rem;
    font-weight: 600;
    color: var(--gray-500);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin-bottom: var(--spacing-3);
  }

  .payment-method-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--spacing-3);
    background: var(--gray-50);
    border-radius: var(--radius-md);
    margin-bottom: var(--spacing-2);
  }

  .payment-method-info {
    display: flex;
    align-items: center;
    gap: var(--spacing-2);
    font-size: 0.875rem;
  }

  .card-brand-small {
    font-weight: 500;
    color: var(--gray-700);
  }

  .payment-method-actions {
    display: flex;
    gap: var(--spacing-2);
  }

  /* Empty States */
  .empty-state-inline {
    text-align: center;
    padding: var(--spacing-6);
    color: var(--gray-500);
  }

  .empty-state-inline .empty-icon {
    margin: 0 auto var(--spacing-3);
    color: var(--gray-300);
  }

  .empty-state-inline p {
    margin-bottom: var(--spacing-3);
  }

  /* Add-ons Grid */
  .addons-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: var(--spacing-4);
  }

  .addon-card {
    padding: var(--spacing-4);
    border: 1px solid var(--gray-200);
    border-radius: var(--radius-lg);
    background: white;
    transition: all 0.2s ease;
  }

  .addon-card.active {
    border-color: var(--primary-200);
    background: var(--primary-50);
  }

  .addon-card:hover {
    border-color: var(--gray-300);
  }

  .addon-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: var(--spacing-2);
  }

  .addon-name {
    font-size: 0.9375rem;
    font-weight: 600;
    color: var(--gray-900);
  }

  .addon-price {
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--primary-600);
  }

  .addon-description {
    font-size: 0.8125rem;
    color: var(--gray-500);
    margin-bottom: var(--spacing-3);
    line-height: 1.5;
  }

  .addon-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  /* Spend Breakdown */
  .spend-breakdown {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-3);
  }

  .spend-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--spacing-3);
    background: var(--gray-50);
    border-radius: var(--radius-md);
  }

  .spend-info {
    display: flex;
    align-items: center;
    gap: var(--spacing-2);
  }

  .spend-name {
    font-weight: 500;
    color: var(--gray-900);
  }

  .spend-amount {
    font-weight: 600;
    color: var(--gray-700);
  }

  /* Utilities */
  .mt-2 {
    margin-top: var(--spacing-2);
  }

  .mt-6 {
    margin-top: var(--spacing-6);
  }

  .mb-4 {
    margin-bottom: var(--spacing-4);
  }

  .text-danger {
    color: var(--danger-500);
  }
</style>
