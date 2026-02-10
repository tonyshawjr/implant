<script lang="ts">
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();

  function formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(amount);
  }

  function formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  }

  function getStatusColor(status: string): string {
    switch (status) {
      case 'paid': return 'badge-success';
      case 'pending': return 'badge-warning';
      case 'overdue': return 'badge-danger';
      default: return 'badge-gray';
    }
  }
</script>

<svelte:head>
  <title>Billing - Implant Lead Engine</title>
</svelte:head>

<div class="page-content">
  <div class="mb-6">
    <h1 class="text-2xl font-bold text-gray-900">Billing & Subscription</h1>
    <p class="text-gray-500">Manage your subscription, payment methods, and invoices.</p>
  </div>

  <div class="grid grid-cols-3 mb-6">
    <!-- Current Plan -->
    <div class="card" style="grid-column: span 2;">
      <div class="card-header">
        <h2 class="card-title">Current Plan</h2>
        <span class="badge badge-success">Active</span>
      </div>
      <div class="card-body">
        <div class="flex justify-between items-center">
          <div>
            <div class="text-2xl font-bold text-gray-900">{data.subscription?.planName || 'Growth Plan'}</div>
            <div class="text-gray-500 mt-1">Billed monthly</div>
          </div>
          <div class="text-right">
            <div class="text-3xl font-bold text-primary">{formatCurrency(data.subscription?.amount || 2500)}</div>
            <div class="text-gray-500">per month</div>
          </div>
        </div>

        <hr style="border-color: var(--gray-100); margin: 1.5rem 0;">

        <div class="flex justify-between items-center">
          <div>
            <div class="text-sm text-gray-500">Next billing date</div>
            <div class="font-medium">{formatDate(data.subscription?.nextBillingDate || new Date().toISOString())}</div>
          </div>
          <button class="btn btn-outline">Change Plan</button>
        </div>
      </div>
    </div>

    <!-- Payment Method -->
    <div class="card">
      <div class="card-header">
        <h2 class="card-title">Payment Method</h2>
      </div>
      <div class="card-body">
        {#if data.paymentMethod}
          <div class="flex items-center gap-3 p-3" style="background: var(--gray-50); border-radius: var(--radius-lg);">
            <div class="avatar" style="background: var(--gray-200);">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/>
                <line x1="1" y1="10" x2="23" y2="10"/>
              </svg>
            </div>
            <div>
              <div class="font-medium">{data.paymentMethod.brand} ****{data.paymentMethod.last4}</div>
              <div class="text-sm text-gray-500">Expires {data.paymentMethod.expMonth}/{data.paymentMethod.expYear}</div>
            </div>
          </div>
        {:else}
          <p class="text-gray-500">No payment method on file</p>
        {/if}

        <button class="btn btn-outline btn-sm w-full mt-4">Update Payment Method</button>
      </div>
    </div>
  </div>

  <!-- Add-ons -->
  <div class="card mb-6">
    <div class="card-header">
      <h2 class="card-title">Active Add-ons</h2>
      <button class="btn btn-sm btn-outline">Browse Add-ons</button>
    </div>
    <div class="card-body">
      {#if data.addons && data.addons.length > 0}
        <div class="flex flex-col gap-3">
          {#each data.addons as addon}
            <div class="flex justify-between items-center p-3" style="background: var(--gray-50); border-radius: var(--radius-lg);">
              <div>
                <div class="font-medium">{addon.name}</div>
                <div class="text-sm text-gray-500">{addon.description}</div>
              </div>
              <div class="text-right">
                <div class="font-semibold">{formatCurrency(addon.price)}/mo</div>
              </div>
            </div>
          {/each}
        </div>
      {:else}
        <div class="empty-state">
          <p class="text-gray-500">No active add-ons. Explore available add-ons to enhance your campaigns.</p>
        </div>
      {/if}
    </div>
  </div>

  <!-- Invoice History -->
  <div class="card">
    <div class="card-header">
      <h2 class="card-title">Invoice History</h2>
    </div>
    <div class="table-container">
      <table class="table">
        <thead>
          <tr>
            <th>Invoice</th>
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
                <td class="font-medium">{invoice.number}</td>
                <td>{formatDate(invoice.date)}</td>
                <td class="font-semibold">{formatCurrency(invoice.amount)}</td>
                <td>
                  <span class="badge {getStatusColor(invoice.status)}">{invoice.status}</span>
                </td>
                <td>
                  <button class="btn btn-sm btn-outline">Download</button>
                </td>
              </tr>
            {/each}
          {:else}
            <tr>
              <td colspan="5" class="text-center text-gray-500 py-8">No invoices yet</td>
            </tr>
          {/if}
        </tbody>
      </table>
    </div>
  </div>
</div>
