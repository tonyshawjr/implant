<script lang="ts">
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();

  function formatNumber(num: number): string {
    return new Intl.NumberFormat('en-US').format(num);
  }

  function formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(amount);
  }
</script>

<svelte:head>
  <title>Territory - Implant Lead Engine</title>
</svelte:head>

<div class="page-content">
  <div class="mb-6">
    <h1 class="text-2xl font-bold text-gray-900">Your Territory</h1>
    <p class="text-gray-500">View your exclusive territory and market demographics.</p>
  </div>

  <div class="grid grid-cols-3 mb-6">
    <!-- Territory Info -->
    <div class="card" style="grid-column: span 2;">
      <div class="card-header">
        <h2 class="card-title">Territory Map</h2>
        <span class="badge badge-success">Exclusive</span>
      </div>
      <div class="card-body">
        <div class="chart-placeholder" style="height: 400px;">
          Interactive territory map will render here
        </div>
      </div>
    </div>

    <!-- Territory Details -->
    <div class="card">
      <div class="card-header">
        <h2 class="card-title">Territory Details</h2>
      </div>
      <div class="card-body">
        {#if data.territory}
          <div class="flex flex-col gap-4">
            <div>
              <div class="text-sm text-gray-500">Territory Name</div>
              <div class="font-semibold text-gray-900">{data.territory.name}</div>
            </div>

            <div>
              <div class="text-sm text-gray-500">Location</div>
              <div class="font-semibold text-gray-900">{data.territory.city}, {data.territory.state}</div>
            </div>

            <div>
              <div class="text-sm text-gray-500">Radius</div>
              <div class="font-semibold text-gray-900">{data.territory.radiusMiles} miles</div>
            </div>

            <div>
              <div class="text-sm text-gray-500">Territory Type</div>
              <div class="font-semibold text-gray-900">{data.territory.type || 'Standard'}</div>
            </div>

            <div>
              <div class="text-sm text-gray-500">Monthly Rate</div>
              <div class="font-semibold text-primary">{formatCurrency(data.territory.monthlyRate || 0)}</div>
            </div>
          </div>
        {:else}
          <div class="empty-state">
            <p class="text-gray-500">Territory information loading...</p>
          </div>
        {/if}
      </div>
    </div>
  </div>

  <!-- Demographics -->
  <div class="card">
    <div class="card-header">
      <h2 class="card-title">Market Demographics</h2>
    </div>
    <div class="card-body">
      <div class="grid grid-cols-4">
        <div class="text-center p-4">
          <div class="text-3xl font-bold text-gray-900">{formatNumber(data.demographics?.population || 0)}</div>
          <div class="text-sm text-gray-500 mt-1">Total Population</div>
        </div>

        <div class="text-center p-4">
          <div class="text-3xl font-bold text-gray-900">{formatNumber(data.demographics?.households || 0)}</div>
          <div class="text-sm text-gray-500 mt-1">Households</div>
        </div>

        <div class="text-center p-4">
          <div class="text-3xl font-bold text-gray-900">{data.demographics?.medianAge || 0}</div>
          <div class="text-sm text-gray-500 mt-1">Median Age</div>
        </div>

        <div class="text-center p-4">
          <div class="text-3xl font-bold text-gray-900">{formatCurrency(data.demographics?.medianIncome || 0)}</div>
          <div class="text-sm text-gray-500 mt-1">Median Income</div>
        </div>
      </div>

      <hr style="border-color: var(--gray-100); margin: 1.5rem 0;">

      <div class="grid grid-cols-3">
        <div class="text-center p-4">
          <div class="text-2xl font-bold text-success">{formatNumber(data.demographics?.implantCandidates || 0)}</div>
          <div class="text-sm text-gray-500 mt-1">Estimated Implant Candidates</div>
        </div>

        <div class="text-center p-4">
          <div class="text-2xl font-bold text-warning">{data.demographics?.competitorCount || 0}</div>
          <div class="text-sm text-gray-500 mt-1">Competing Providers</div>
        </div>

        <div class="text-center p-4">
          <div class="text-2xl font-bold text-primary">{data.demographics?.marketPotential || 'High'}</div>
          <div class="text-sm text-gray-500 mt-1">Market Potential</div>
        </div>
      </div>
    </div>
  </div>
</div>
