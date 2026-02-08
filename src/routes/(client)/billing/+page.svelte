<script lang="ts">
  import {
    Card,
    Badge,
    Button,
    Table,
    TableHead,
    TableHeadCell,
    TableBody,
    TableBodyRow,
    TableBodyCell,
    Alert,
    Progressbar,
    Modal,
    Spinner
  } from 'flowbite-svelte';
  import {
    CreditCardOutline,
    CashOutline,
    FileDocOutline,
    PlusOutline,
    CloseOutline,
    CheckCircleOutline,
    CalendarMonthOutline,
    DownloadOutline,
    ExclamationCircleOutline,
    RefreshOutline,
    RocketOutline
  } from 'flowbite-svelte-icons';
  import { formatCurrency, formatDate, getInvoiceStatusColor, getDaysUntil } from '$lib/utils';
  import { enhance } from '$app/forms';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();

  // Modal state
  let showAddonModal = $state(false);
  let selectedAddon = $state<typeof data.addons[0] | null>(null);
  let isSubmitting = $state(false);

  // Get card brand display name
  function getCardBrandDisplay(brand: string | null): string {
    const brands: Record<string, string> = {
      visa: 'Visa',
      mastercard: 'Mastercard',
      amex: 'American Express',
      discover: 'Discover'
    };
    return brand ? brands[brand.toLowerCase()] || brand : 'Card';
  }

  // Get card brand icon color
  function getCardBrandColor(brand: string | null): string {
    const colors: Record<string, string> = {
      visa: 'text-blue-600',
      mastercard: 'text-red-500',
      amex: 'text-blue-400',
      discover: 'text-orange-500'
    };
    return brand ? colors[brand.toLowerCase()] || 'text-gray-500' : 'text-gray-500';
  }

  // Open addon modal
  function openAddonModal(addon: typeof data.addons[0]) {
    selectedAddon = addon;
    showAddonModal = true;
  }

  // Calculate contract progress
  let contractProgress = $derived(() => {
    if (!data.contract) return 0;
    const start = new Date(data.contract.startDate).getTime();
    const end = new Date(data.contract.endDate).getTime();
    const now = Date.now();
    return Math.min(100, Math.max(0, ((now - start) / (end - start)) * 100));
  });

  // Days until contract renewal
  let daysUntilRenewal = $derived(
    data.contract ? getDaysUntil(data.contract.endDate) : null
  );
</script>

<div class="space-y-6">
  <!-- Page Header -->
  <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
    <div>
      <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Billing</h1>
      <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
        Manage your subscription, invoices, and payment methods.
      </p>
    </div>
  </div>

  {#if !data.contract}
    <Alert color="yellow" class="border">
      <div class="flex items-center gap-3">
        <ExclamationCircleOutline class="h-5 w-5 flex-shrink-0" />
        <span><span class="font-medium">No active subscription.</span> Contact your account manager to set up your subscription.</span>
      </div>
    </Alert>
  {:else}
    <div class="grid gap-6 lg:grid-cols-2">
      <!-- Subscription Card -->
      <Card>
        <div class="mb-4 flex items-center justify-between">
          <h3 class="flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-white">
            <RocketOutline class="h-5 w-5 text-primary-600" />
            Subscription
          </h3>
          <Badge color="green">Active</Badge>
        </div>

        <div class="space-y-4">
          <div class="rounded-lg bg-primary-50 p-4 dark:bg-primary-900/20">
            <div class="flex items-baseline justify-between">
              <span class="text-xl font-bold text-gray-900 dark:text-white">
                {data.contract.plan.name}
              </span>
              <span class="text-2xl font-bold text-primary-600 dark:text-primary-400">
                {formatCurrency(data.contract.monthlyCommitment)}
                <span class="text-sm font-normal text-gray-500">/mo</span>
              </span>
            </div>
          </div>

          <dl class="space-y-3">
            <div class="flex justify-between">
              <dt class="text-sm text-gray-500 dark:text-gray-400">Contract Term</dt>
              <dd class="text-sm font-medium text-gray-900 dark:text-white">
                {data.contract.termMonths} months
              </dd>
            </div>
            <div class="flex justify-between">
              <dt class="text-sm text-gray-500 dark:text-gray-400">Start Date</dt>
              <dd class="text-sm font-medium text-gray-900 dark:text-white">
                {formatDate(data.contract.startDate, 'medium')}
              </dd>
            </div>
            <div class="flex justify-between">
              <dt class="text-sm text-gray-500 dark:text-gray-400">Renewal Date</dt>
              <dd class="flex items-center gap-2">
                <span class="text-sm font-medium text-gray-900 dark:text-white">
                  {formatDate(data.contract.endDate, 'medium')}
                </span>
                {#if daysUntilRenewal !== null && daysUntilRenewal <= 30}
                  <Badge color="yellow">{daysUntilRenewal} days</Badge>
                {/if}
              </dd>
            </div>
            <div class="flex justify-between">
              <dt class="text-sm text-gray-500 dark:text-gray-400">Auto-Renew</dt>
              <dd>
                <Badge color={data.contract.autoRenew ? 'green' : 'gray'}>
                  {data.contract.autoRenew ? 'Enabled' : 'Disabled'}
                </Badge>
              </dd>
            </div>
          </dl>

          <div class="pt-2">
            <div class="mb-2 flex justify-between text-sm">
              <span class="text-gray-500 dark:text-gray-400">Contract Progress</span>
              <span class="text-gray-900 dark:text-white">{contractProgress().toFixed(0)}%</span>
            </div>
            <Progressbar progress={contractProgress()} color="primary" size="h-2" />
          </div>
        </div>
      </Card>

      <!-- Ad Spend Card -->
      <Card>
        <div class="mb-4 flex items-center justify-between">
          <h3 class="flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-white">
            <CashOutline class="h-5 w-5 text-primary-600" />
            Ad Spend - {data.adSpend.month}
          </h3>
        </div>

        <div class="mb-4 rounded-lg bg-gray-50 p-4 dark:bg-gray-700">
          <div class="text-center">
            <p class="text-sm text-gray-500 dark:text-gray-400">Total Spend</p>
            <p class="text-3xl font-bold text-gray-900 dark:text-white">
              {formatCurrency(data.adSpend.total)}
            </p>
          </div>
        </div>

        {#if data.adSpend.byPlatform.length > 0}
          <div class="space-y-3">
            <h4 class="text-sm font-medium text-gray-700 dark:text-gray-300">By Campaign</h4>
            {#each data.adSpend.byPlatform as campaign}
              <div class="flex items-center justify-between rounded-lg border border-gray-100 p-3 dark:border-gray-600">
                <div>
                  <p class="font-medium text-gray-900 dark:text-white">{campaign.name}</p>
                  <p class="text-sm text-gray-500 dark:text-gray-400 capitalize">{campaign.platform}</p>
                </div>
                <span class="font-semibold text-gray-900 dark:text-white">
                  {formatCurrency(campaign.spend)}
                </span>
              </div>
            {/each}
          </div>
        {:else}
          <p class="text-center text-sm text-gray-500 dark:text-gray-400">
            No campaign spend this month
          </p>
        {/if}
      </Card>
    </div>
  {/if}

  <div class="grid gap-6 lg:grid-cols-3">
    <!-- Payment Method Card -->
    <Card>
      <div class="mb-4 flex items-center justify-between">
        <h3 class="flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-white">
          <CreditCardOutline class="h-5 w-5 text-primary-600" />
          Payment Method
        </h3>
      </div>

      {#if data.paymentMethod}
        <div class="rounded-lg border border-gray-200 p-4 dark:border-gray-600">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-3">
              <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-700">
                <CreditCardOutline class={`h-6 w-6 ${getCardBrandColor(data.paymentMethod.brand)}`} />
              </div>
              <div>
                <p class="font-medium text-gray-900 dark:text-white">
                  {getCardBrandDisplay(data.paymentMethod.brand)} ending in {data.paymentMethod.lastFour}
                </p>
                <p class="text-sm text-gray-500 dark:text-gray-400">
                  Expires {data.paymentMethod.expMonth}/{data.paymentMethod.expYear}
                </p>
              </div>
            </div>
            {#if data.paymentMethod.isDefault}
              <Badge color="blue">Default</Badge>
            {/if}
          </div>
        </div>
        <div class="mt-4">
          <Button color="light" size="sm" class="w-full">
            <RefreshOutline class="mr-2 h-4 w-4" />
            Update Payment Method
          </Button>
        </div>
      {:else}
        <div class="flex flex-col items-center justify-center py-6 text-center">
          <CreditCardOutline class="mb-2 h-12 w-12 text-gray-300 dark:text-gray-600" />
          <p class="text-gray-500 dark:text-gray-400">No payment method on file</p>
          <Button color="primary" size="sm" class="mt-4">
            <PlusOutline class="mr-2 h-4 w-4" />
            Add Payment Method
          </Button>
        </div>
      {/if}
    </Card>

    <!-- Add-ons Grid -->
    <Card class="lg:col-span-2">
      <div class="mb-4 flex items-center justify-between">
        <h3 class="flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-white">
          <PlusOutline class="h-5 w-5 text-primary-600" />
          Add-ons
        </h3>
      </div>

      <div class="grid gap-4 sm:grid-cols-2">
        {#each data.addons as addon}
          <div
            class="rounded-lg border p-4 transition-colors {addon.isActive
              ? 'border-primary-200 bg-primary-50 dark:border-primary-800 dark:bg-primary-900/20'
              : 'border-gray-200 dark:border-gray-600'}"
          >
            <div class="mb-2 flex items-start justify-between">
              <div>
                <h4 class="font-semibold text-gray-900 dark:text-white">{addon.name}</h4>
                <p class="text-sm text-gray-500 dark:text-gray-400">{addon.description}</p>
              </div>
              {#if addon.isActive}
                <Badge color="green">Active</Badge>
              {/if}
            </div>
            <div class="flex items-center justify-between">
              <span class="text-lg font-bold text-gray-900 dark:text-white">
                {formatCurrency(addon.price)}
                <span class="text-xs font-normal text-gray-500">
                  /{addon.addonType === 'recurring' ? 'mo' : 'once'}
                </span>
              </span>
              {#if addon.isActive}
                <form method="POST" action="?/cancelAddon" use:enhance={() => {
                  isSubmitting = true;
                  return async ({ update }) => {
                    await update();
                    isSubmitting = false;
                  };
                }}>
                  <input type="hidden" name="organizationAddonId" value={addon.organizationAddonId} />
                  <Button type="submit" color="red" outline size="xs" disabled={isSubmitting}>
                    <CloseOutline class="mr-1 h-3 w-3" />
                    Cancel
                  </Button>
                </form>
              {:else}
                <Button color="primary" size="xs" onclick={() => openAddonModal(addon)}>
                  <PlusOutline class="mr-1 h-3 w-3" />
                  Add
                </Button>
              {/if}
            </div>
          </div>
        {/each}
      </div>
    </Card>
  </div>

  <!-- Invoices Table -->
  <Card>
    <div class="mb-4 flex items-center justify-between">
      <h3 class="flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-white">
        <FileDocOutline class="h-5 w-5 text-primary-600" />
        Invoice History
      </h3>
    </div>

    {#if data.invoices.length > 0}
      <Table hoverable>
        <TableHead>
          <TableHeadCell>Invoice #</TableHeadCell>
          <TableHeadCell>Date</TableHeadCell>
          <TableHeadCell>Due Date</TableHeadCell>
          <TableHeadCell class="text-right">Amount</TableHeadCell>
          <TableHeadCell>Status</TableHeadCell>
          <TableHeadCell class="text-center">Actions</TableHeadCell>
        </TableHead>
        <TableBody>
          {#each data.invoices as invoice}
            {@const statusColor = getInvoiceStatusColor(invoice.status)}
            <TableBodyRow>
              <TableBodyCell class="font-mono font-medium">{invoice.invoiceNumber}</TableBodyCell>
              <TableBodyCell>{formatDate(invoice.issueDate, 'medium')}</TableBodyCell>
              <TableBodyCell>
                {formatDate(invoice.dueDate, 'medium')}
                {#if invoice.status === 'pending' && getDaysUntil(invoice.dueDate) <= 7 && getDaysUntil(invoice.dueDate) >= 0}
                  <Badge color="yellow" class="ml-2">Due soon</Badge>
                {/if}
              </TableBodyCell>
              <TableBodyCell class="text-right font-medium">
                {formatCurrency(invoice.totalAmount)}
              </TableBodyCell>
              <TableBodyCell>
                <Badge color={
                  invoice.status === 'paid' ? 'green' :
                  invoice.status === 'pending' ? 'yellow' :
                  invoice.status === 'overdue' ? 'red' :
                  'gray'
                }>
                  {invoice.status}
                </Badge>
              </TableBodyCell>
              <TableBodyCell class="text-center">
                <Button color="light" size="xs">
                  <DownloadOutline class="h-4 w-4" />
                </Button>
              </TableBodyCell>
            </TableBodyRow>
          {/each}
        </TableBody>
      </Table>
    {:else}
      <div class="flex flex-col items-center justify-center py-8 text-center">
        <FileDocOutline class="mb-2 h-12 w-12 text-gray-300 dark:text-gray-600" />
        <p class="text-gray-500 dark:text-gray-400">No invoices yet</p>
      </div>
    {/if}
  </Card>
</div>

<!-- Add-on Subscription Modal -->
<Modal bind:open={showAddonModal} size="sm" title="Subscribe to Add-on">
  {#if selectedAddon}
    <div class="space-y-4">
      <div class="rounded-lg bg-gray-50 p-4 dark:bg-gray-700">
        <h4 class="text-lg font-semibold text-gray-900 dark:text-white">{selectedAddon.name}</h4>
        <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">{selectedAddon.description}</p>
        <p class="mt-2 text-xl font-bold text-primary-600 dark:text-primary-400">
          {formatCurrency(selectedAddon.price)}
          <span class="text-sm font-normal text-gray-500">
            /{selectedAddon.addonType === 'recurring' ? 'month' : 'one-time'}
          </span>
        </p>
      </div>

      <p class="text-sm text-gray-500 dark:text-gray-400">
        {#if selectedAddon.addonType === 'recurring'}
          This add-on will be billed monthly along with your subscription.
        {:else}
          This is a one-time purchase that will be billed immediately.
        {/if}
      </p>
    </div>

    <form method="POST" action="?/subscribeAddon" use:enhance={() => {
      isSubmitting = true;
      return async ({ update }) => {
        await update();
        isSubmitting = false;
        showAddonModal = false;
      };
    }} class="mt-4 flex gap-3">
      <input type="hidden" name="addonId" value={selectedAddon.id} />
      <Button type="button" color="light" class="flex-1" onclick={() => showAddonModal = false}>
        Cancel
      </Button>
      <Button type="submit" color="primary" class="flex-1" disabled={isSubmitting}>
        {#if isSubmitting}
          <Spinner size="4" class="mr-2" />
        {:else}
          <CheckCircleOutline class="mr-2 h-4 w-4" />
        {/if}
        Subscribe
      </Button>
    </form>
  {/if}
</Modal>
