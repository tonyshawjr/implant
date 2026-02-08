<script lang="ts">
  import { enhance } from '$app/forms';
  import { goto } from '$app/navigation';
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
    Avatar,
    Tabs,
    TabItem,
    Modal,
    Label,
    Input,
    Textarea,
    Select,
    Progressbar,
    Timeline,
    TimelineItem,
    Tooltip
  } from 'flowbite-svelte';
  import {
    ArrowLeftOutline,
    BuildingOutline,
    MapPinOutline,
    PhoneOutline,
    EnvelopeOutline,
    GlobeAltOutline,
    CalendarOutline,
    CashOutline,
    ChartOutline,
    UsersGroupOutline,
    RocketOutline,
    TicketOutline,
    DocumentTextOutline,
    PauseOutline,
    PlayOutline,
    ClockOutline,
    PlusOutline,
    EditOutline,
    ChatBubbleLeftRightOutline,
    ExclamationCircleOutline
  } from 'flowbite-svelte-icons';
  import { HealthScoreBadge, OrgStatusBadge, ContractStatusBadge } from '$lib/components/internal';
  import { LeadStatusBadge } from '$lib/components/leads';
  import { StatCard } from '$lib/components/ui';
  import {
    formatCurrency,
    formatDate,
    formatPercent,
    formatPhone,
    getInitials,
    formatFullName,
    getDaysUntil,
    getHealthScoreLevel,
    getHealthScoreLabel
  } from '$lib/utils';
  import type { PageData, ActionData } from './$types';

  let { data, form }: { data: PageData; form: ActionData } = $props();

  // Modal states
  let showAddNoteModal = $state(false);
  let showScheduleReviewModal = $state(false);
  let showPauseCampaignsModal = $state(false);

  // Form states
  let noteType = $state('note');
  let noteTitle = $state('');
  let noteBody = $state('');
  let noteDirection = $state('internal');

  let reviewType = $state('monthly_performance');
  let reviewDate = $state('');
  let reviewLink = $state('');

  // Calculate health score breakdown max
  const healthScoreMax = 25;

  // Health score level
  let healthLevel = $derived(getHealthScoreLevel(data.organization.healthScore));
  let healthLabel = $derived(getHealthScoreLabel(data.organization.healthScore));

  // Contract days remaining
  let contractDaysRemaining = $derived(
    data.contract ? getDaysUntil(new Date(data.contract.endDate)) : null
  );

  // Reset form after submission
  function resetNoteForm() {
    noteTitle = '';
    noteBody = '';
    noteType = 'note';
    noteDirection = 'internal';
  }

  function resetReviewForm() {
    reviewType = 'monthly_performance';
    reviewDate = '';
    reviewLink = '';
  }
</script>

<div class="space-y-6">
  <!-- Page Header -->
  <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
    <div class="flex items-start gap-4">
      <Button color="light" size="sm" href="/internal">
        <ArrowLeftOutline class="h-4 w-4" />
      </Button>
      <div class="flex items-center gap-4">
        {#if data.organization.logoUrl}
          <Avatar src={data.organization.logoUrl} size="lg" />
        {:else}
          <Avatar size="lg" class="bg-primary-100 text-primary-600 dark:bg-primary-900 dark:text-primary-300">
            {getInitials(data.organization.name.split(' ')[0], data.organization.name.split(' ')[1] || '')}
          </Avatar>
        {/if}
        <div>
          <div class="flex items-center gap-2">
            <h1 class="text-2xl font-bold text-gray-900 dark:text-white">{data.organization.name}</h1>
            <OrgStatusBadge status={data.organization.status} />
          </div>
          <div class="mt-1 flex flex-wrap items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
            {#if data.territory}
              <span class="flex items-center gap-1">
                <MapPinOutline class="h-4 w-4" />
                {data.territory.location}
              </span>
            {/if}
            {#if data.organization.phone}
              <span class="flex items-center gap-1">
                <PhoneOutline class="h-4 w-4" />
                {formatPhone(data.organization.phone)}
              </span>
            {/if}
            {#if data.organization.clientSince}
              <span class="flex items-center gap-1">
                <CalendarOutline class="h-4 w-4" />
                Client since {formatDate(data.organization.clientSince, 'medium')}
              </span>
            {/if}
          </div>
        </div>
      </div>
    </div>
    <div class="flex flex-wrap gap-2">
      <Button color="light" size="sm" onclick={() => showScheduleReviewModal = true}>
        <CalendarOutline class="mr-2 h-4 w-4" />
        Schedule Review
      </Button>
      <Button color="light" size="sm" onclick={() => showAddNoteModal = true}>
        <ChatBubbleLeftRightOutline class="mr-2 h-4 w-4" />
        Add Note
      </Button>
      {#if data.campaigns.filter(c => c.status === 'active').length > 0}
        <Button color="yellow" size="sm" onclick={() => showPauseCampaignsModal = true}>
          <PauseOutline class="mr-2 h-4 w-4" />
          Pause Campaigns
        </Button>
      {/if}
    </div>
  </div>

  <!-- Metrics Grid -->
  <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
    <StatCard
      title="Leads This Month"
      value={data.metrics.leadsThisMonth.toString()}
      change={data.metrics.leadsTrend}
      changeLabel="vs last month"
    >
      {#snippet icon()}
        <UsersGroupOutline class="h-6 w-6 text-primary-600 dark:text-primary-400" />
      {/snippet}
    </StatCard>

    <StatCard
      title="Cost Per Lead"
      value={formatCurrency(data.metrics.cpl)}
      change={data.metrics.cplChange}
      changeLabel="vs last month"
      positiveIsUp={false}
    >
      {#snippet icon()}
        <CashOutline class="h-6 w-6 text-blue-600 dark:text-blue-400" />
      {/snippet}
    </StatCard>

    <StatCard
      title="Monthly Spend"
      value={formatCurrency(data.metrics.spend)}
      iconBgColor="bg-green-100 dark:bg-green-900"
    >
      {#snippet icon()}
        <ChartOutline class="h-6 w-6 text-green-600 dark:text-green-400" />
      {/snippet}
    </StatCard>

    <StatCard
      title="Conversion Rate"
      value={formatPercent(data.metrics.conversionRate)}
      iconBgColor="bg-purple-100 dark:bg-purple-900"
    >
      {#snippet icon()}
        <RocketOutline class="h-6 w-6 text-purple-600 dark:text-purple-400" />
      {/snippet}
    </StatCard>
  </div>

  <!-- Main Content Grid -->
  <div class="grid gap-6 xl:grid-cols-3">
    <!-- Left Column (2/3) -->
    <div class="space-y-6 xl:col-span-2">
      <!-- Health Score Breakdown -->
      <Card class="p-6">
        <div class="mb-4 flex items-center justify-between">
          <h3 class="text-lg font-semibold text-gray-900 dark:text-white">Health Score</h3>
          <div class="flex items-center gap-2">
            <span class="text-2xl font-bold {healthLevel === 'excellent' ? 'text-green-600' : healthLevel === 'good' ? 'text-blue-600' : healthLevel === 'warning' ? 'text-yellow-600' : 'text-red-600'}">
              {data.organization.healthScore}
            </span>
            <Badge color={healthLevel === 'excellent' ? 'green' : healthLevel === 'good' ? 'blue' : healthLevel === 'warning' ? 'yellow' : 'red'}>
              {healthLabel}
            </Badge>
          </div>
        </div>

        {#if data.healthScoreBreakdown}
          <div class="space-y-4">
            <div>
              <div class="mb-1 flex items-center justify-between text-sm">
                <span class="text-gray-600 dark:text-gray-400">Lead Volume (0-25)</span>
                <span class="font-medium text-gray-900 dark:text-white">{data.healthScoreBreakdown.leadVolume.toFixed(1)}</span>
              </div>
              <Progressbar progress={(data.healthScoreBreakdown.leadVolume / healthScoreMax) * 100} size="h-2" />
            </div>
            <div>
              <div class="mb-1 flex items-center justify-between text-sm">
                <span class="text-gray-600 dark:text-gray-400">Cost Efficiency (0-25)</span>
                <span class="font-medium text-gray-900 dark:text-white">{data.healthScoreBreakdown.costEfficiency.toFixed(1)}</span>
              </div>
              <Progressbar progress={(data.healthScoreBreakdown.costEfficiency / healthScoreMax) * 100} size="h-2" color="blue" />
            </div>
            <div>
              <div class="mb-1 flex items-center justify-between text-sm">
                <span class="text-gray-600 dark:text-gray-400">Engagement (0-20)</span>
                <span class="font-medium text-gray-900 dark:text-white">{data.healthScoreBreakdown.engagement.toFixed(1)}</span>
              </div>
              <Progressbar progress={(data.healthScoreBreakdown.engagement / 20) * 100} size="h-2" color="indigo" />
            </div>
            <div>
              <div class="mb-1 flex items-center justify-between text-sm">
                <span class="text-gray-600 dark:text-gray-400">Payment History (0-15)</span>
                <span class="font-medium text-gray-900 dark:text-white">{data.healthScoreBreakdown.paymentHistory.toFixed(1)}</span>
              </div>
              <Progressbar progress={(data.healthScoreBreakdown.paymentHistory / 15) * 100} size="h-2" color="green" />
            </div>
            <div>
              <div class="mb-1 flex items-center justify-between text-sm">
                <span class="text-gray-600 dark:text-gray-400">Contract Tenure (0-15)</span>
                <span class="font-medium text-gray-900 dark:text-white">{data.healthScoreBreakdown.contractTenure.toFixed(1)}</span>
              </div>
              <Progressbar progress={(data.healthScoreBreakdown.contractTenure / 15) * 100} size="h-2" color="purple" />
            </div>
          </div>
          <p class="mt-4 text-xs text-gray-500 dark:text-gray-400">
            Last calculated: {formatDate(data.healthScoreBreakdown.calculatedAt, 'datetime')}
          </p>
        {:else}
          <p class="text-gray-500 dark:text-gray-400">No health score data available</p>
        {/if}
      </Card>

      <!-- Campaigns -->
      <Card class="p-0 overflow-hidden">
        <div class="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h3 class="text-lg font-semibold text-gray-900 dark:text-white">Campaigns</h3>
          <Badge>{data.campaigns.length}</Badge>
        </div>
        <Table striped>
          <TableHead>
            <TableHeadCell>Campaign</TableHeadCell>
            <TableHeadCell>Platform</TableHeadCell>
            <TableHeadCell>Status</TableHeadCell>
            <TableHeadCell>Budget</TableHeadCell>
            <TableHeadCell>Leads</TableHeadCell>
          </TableHead>
          <TableBody>
            {#if data.campaigns.length === 0}
              <TableBodyRow>
                <TableBodyCell colspan={5} class="text-center py-8">
                  <p class="text-gray-500 dark:text-gray-400">No campaigns</p>
                </TableBodyCell>
              </TableBodyRow>
            {:else}
              {#each data.campaigns as campaign}
                <TableBodyRow>
                  <TableBodyCell>
                    <div>
                      <p class="font-medium text-gray-900 dark:text-white">{campaign.name}</p>
                      <p class="text-xs text-gray-500">{campaign.type}</p>
                    </div>
                  </TableBodyCell>
                  <TableBodyCell>
                    <Badge color="dark">{campaign.platform}</Badge>
                  </TableBodyCell>
                  <TableBodyCell>
                    <Badge color={campaign.status === 'active' ? 'green' : campaign.status === 'paused' ? 'yellow' : 'dark'}>
                      {campaign.status}
                    </Badge>
                  </TableBodyCell>
                  <TableBodyCell>
                    {campaign.dailyBudget ? formatCurrency(campaign.dailyBudget) + '/day' : '-'}
                  </TableBodyCell>
                  <TableBodyCell>
                    <span class="font-medium">{campaign.leadCount}</span>
                  </TableBodyCell>
                </TableBodyRow>
              {/each}
            {/if}
          </TableBody>
        </Table>
      </Card>

      <!-- Recent Leads -->
      <Card class="p-0 overflow-hidden">
        <div class="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h3 class="text-lg font-semibold text-gray-900 dark:text-white">Recent Leads</h3>
          <Badge>{data.metrics.totalLeads} total</Badge>
        </div>
        <Table striped>
          <TableHead>
            <TableHeadCell>Name</TableHeadCell>
            <TableHeadCell>Contact</TableHeadCell>
            <TableHeadCell>Status</TableHeadCell>
            <TableHeadCell>Source</TableHeadCell>
            <TableHeadCell>Date</TableHeadCell>
          </TableHead>
          <TableBody>
            {#if data.recentLeads.length === 0}
              <TableBodyRow>
                <TableBodyCell colspan={5} class="text-center py-8">
                  <p class="text-gray-500 dark:text-gray-400">No leads yet</p>
                </TableBodyCell>
              </TableBodyRow>
            {:else}
              {#each data.recentLeads as lead}
                <TableBodyRow>
                  <TableBodyCell>
                    <span class="font-medium text-gray-900 dark:text-white">{lead.name}</span>
                  </TableBodyCell>
                  <TableBodyCell>
                    <div class="text-sm">
                      {#if lead.email}
                        <p class="text-gray-600 dark:text-gray-400">{lead.email}</p>
                      {/if}
                      {#if lead.phone}
                        <p class="text-gray-500">{formatPhone(lead.phone)}</p>
                      {/if}
                    </div>
                  </TableBodyCell>
                  <TableBodyCell>
                    <LeadStatusBadge status={lead.status} size="xs" />
                  </TableBodyCell>
                  <TableBodyCell>
                    <Badge color="dark">{lead.source}</Badge>
                  </TableBodyCell>
                  <TableBodyCell>
                    <span class="text-sm text-gray-500">{formatDate(lead.createdAt, 'short')}</span>
                  </TableBodyCell>
                </TableBodyRow>
              {/each}
            {/if}
          </TableBody>
        </Table>
      </Card>

      <!-- Communication Log -->
      <Card class="p-4">
        <div class="mb-4 flex items-center justify-between">
          <h3 class="text-lg font-semibold text-gray-900 dark:text-white">Communication Log</h3>
          <Button size="xs" color="light" onclick={() => showAddNoteModal = true}>
            <PlusOutline class="mr-1 h-3 w-3" />
            Add Entry
          </Button>
        </div>

        {#if data.communicationLog.length === 0}
          <p class="text-center py-8 text-gray-500 dark:text-gray-400">No communication logs yet</p>
        {:else}
          <Timeline>
            {#each data.communicationLog as entry}
              <TimelineItem title={entry.title} date={formatDate(entry.createdAt, 'datetime')}>
                {#snippet icon()}
                  <div class="flex h-3 w-3 items-center justify-center rounded-full bg-primary-200 ring-8 ring-white dark:bg-primary-900 dark:ring-gray-900">
                  </div>
                {/snippet}
                <div class="flex items-center gap-2 mb-1">
                  <Badge color="dark">{entry.type}</Badge>
                  {#if entry.direction}
                    <Badge color={entry.direction === 'inbound' ? 'blue' : entry.direction === 'outbound' ? 'green' : 'dark'}>
                      {entry.direction}
                    </Badge>
                  {/if}
                </div>
                {#if entry.body}
                  <p class="text-sm text-gray-600 dark:text-gray-400">{entry.body}</p>
                {/if}
                <p class="mt-1 text-xs text-gray-500">By {entry.createdBy}</p>
              </TimelineItem>
            {/each}
          </Timeline>
        {/if}
      </Card>
    </div>

    <!-- Right Column (1/3) -->
    <div class="space-y-6 xl:col-span-1">
      <!-- Contract Info -->
      <Card class="p-4">
        <h3 class="mb-4 text-lg font-semibold text-gray-900 dark:text-white">Contract</h3>
        {#if data.contract}
          <div class="space-y-3">
            <div class="flex items-center justify-between">
              <span class="text-sm text-gray-500">Status</span>
              <ContractStatusBadge status={data.contract.status} />
            </div>
            <div class="flex items-center justify-between">
              <span class="text-sm text-gray-500">Plan</span>
              <span class="font-medium text-gray-900 dark:text-white">{data.contract.plan}</span>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-sm text-gray-500">Monthly</span>
              <span class="font-medium text-gray-900 dark:text-white">{formatCurrency(data.contract.monthlyCommitment)}</span>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-sm text-gray-500">Term</span>
              <span class="font-medium text-gray-900 dark:text-white">{data.contract.termMonths} months</span>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-sm text-gray-500">Ends</span>
              <span class="font-medium text-gray-900 dark:text-white">{formatDate(data.contract.endDate, 'medium')}</span>
            </div>
            {#if contractDaysRemaining !== null}
              <div class="pt-2 border-t border-gray-200 dark:border-gray-700">
                <Badge color={contractDaysRemaining <= 30 ? 'red' : contractDaysRemaining <= 60 ? 'yellow' : 'green'} class="w-full justify-center">
                  {contractDaysRemaining} days remaining
                </Badge>
              </div>
            {/if}
            <div class="flex items-center justify-between text-sm">
              <span class="text-gray-500">Auto-renew</span>
              <Badge color={data.contract.autoRenew ? 'green' : 'dark'}>
                {data.contract.autoRenew ? 'Yes' : 'No'}
              </Badge>
            </div>
          </div>
        {:else}
          <p class="text-gray-500 dark:text-gray-400">No active contract</p>
        {/if}
      </Card>

      <!-- Territory Info -->
      <Card class="p-4">
        <h3 class="mb-4 text-lg font-semibold text-gray-900 dark:text-white">Territory</h3>
        {#if data.territory}
          <div class="space-y-3">
            <div class="flex items-center justify-between">
              <span class="text-sm text-gray-500">Name</span>
              <span class="font-medium text-gray-900 dark:text-white">{data.territory.name}</span>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-sm text-gray-500">Location</span>
              <span class="font-medium text-gray-900 dark:text-white">{data.territory.location}</span>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-sm text-gray-500">Radius</span>
              <span class="font-medium text-gray-900 dark:text-white">{data.territory.radiusMiles} miles</span>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-sm text-gray-500">Type</span>
              <Badge color="dark">{data.territory.type}</Badge>
            </div>
            {#if data.territory.population}
              <div class="flex items-center justify-between">
                <span class="text-sm text-gray-500">Population</span>
                <span class="font-medium text-gray-900 dark:text-white">{data.territory.population.toLocaleString()}</span>
              </div>
            {/if}
            {#if data.territory.medianIncome}
              <div class="flex items-center justify-between">
                <span class="text-sm text-gray-500">Median Income</span>
                <span class="font-medium text-gray-900 dark:text-white">{formatCurrency(data.territory.medianIncome, { showCents: false })}</span>
              </div>
            {/if}
            <div class="flex items-center justify-between">
              <span class="text-sm text-gray-500">Monthly Rate</span>
              <span class="font-medium text-gray-900 dark:text-white">{formatCurrency(data.territory.monthlyRate)}</span>
            </div>
          </div>
        {:else}
          <p class="text-gray-500 dark:text-gray-400">No territory assigned</p>
        {/if}
      </Card>

      <!-- Account Manager -->
      <Card class="p-4">
        <h3 class="mb-4 text-lg font-semibold text-gray-900 dark:text-white">Account Manager</h3>
        {#if data.accountManager}
          <div class="flex items-center gap-3">
            <Avatar size="md">
              {getInitials(data.accountManager.name.split(' ')[0], data.accountManager.name.split(' ')[1] || '')}
            </Avatar>
            <div>
              <p class="font-medium text-gray-900 dark:text-white">{data.accountManager.name}</p>
              <p class="text-sm text-gray-500">{data.accountManager.email}</p>
            </div>
          </div>
        {:else}
          <p class="text-gray-500 dark:text-gray-400">No account manager assigned</p>
        {/if}
      </Card>

      <!-- Contacts -->
      <Card class="p-4">
        <h3 class="mb-4 text-lg font-semibold text-gray-900 dark:text-white">Contacts</h3>
        {#if data.contacts.length === 0}
          <p class="text-gray-500 dark:text-gray-400">No contacts</p>
        {:else}
          <div class="space-y-3">
            {#each data.contacts as contact}
              <div class="flex items-start justify-between p-2 rounded-lg {contact.isPrimary ? 'bg-primary-50 dark:bg-primary-900/20' : ''}">
                <div>
                  <div class="flex items-center gap-2">
                    <p class="font-medium text-gray-900 dark:text-white">{contact.name}</p>
                    {#if contact.isPrimary}
                      <Badge color="primary">Primary</Badge>
                    {/if}
                  </div>
                  {#if contact.title}
                    <p class="text-sm text-gray-500">{contact.title}</p>
                  {/if}
                  {#if contact.email}
                    <p class="text-sm text-gray-600 dark:text-gray-400">{contact.email}</p>
                  {/if}
                  {#if contact.phone}
                    <p class="text-sm text-gray-500">{formatPhone(contact.phone)}</p>
                  {/if}
                </div>
                <Badge color="dark">{contact.type}</Badge>
              </div>
            {/each}
          </div>
        {/if}
      </Card>

      <!-- Recent Invoices -->
      <Card class="p-4">
        <h3 class="mb-4 text-lg font-semibold text-gray-900 dark:text-white">Recent Invoices</h3>
        {#if data.recentInvoices.length === 0}
          <p class="text-gray-500 dark:text-gray-400">No invoices</p>
        {:else}
          <div class="space-y-2">
            {#each data.recentInvoices as invoice}
              <div class="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700">
                <div>
                  <p class="text-sm font-medium text-gray-900 dark:text-white">{invoice.invoiceNumber}</p>
                  <p class="text-xs text-gray-500">{formatDate(invoice.issueDate, 'short')}</p>
                </div>
                <div class="text-right">
                  <p class="text-sm font-medium text-gray-900 dark:text-white">{formatCurrency(invoice.totalAmount)}</p>
                  <Badge color={invoice.status === 'paid' ? 'green' : invoice.status === 'overdue' ? 'red' : 'yellow'}>
                    {invoice.status}
                  </Badge>
                </div>
              </div>
            {/each}
          </div>
        {/if}
      </Card>

      <!-- Team Members -->
      <Card class="p-4">
        <h3 class="mb-4 text-lg font-semibold text-gray-900 dark:text-white">Team ({data.teamMembers.length})</h3>
        {#if data.teamMembers.length === 0}
          <p class="text-gray-500 dark:text-gray-400">No team members</p>
        {:else}
          <div class="space-y-2">
            {#each data.teamMembers as member}
              <div class="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700">
                <div class="flex items-center gap-2">
                  <Avatar size="xs" class={member.isActive ? '' : 'opacity-50'}>
                    {getInitials(member.name.split(' ')[0], member.name.split(' ')[1] || '')}
                  </Avatar>
                  <div>
                    <p class="text-sm font-medium text-gray-900 dark:text-white">{member.name}</p>
                    <p class="text-xs text-gray-500">{member.role.replace('_', ' ')}</p>
                  </div>
                </div>
                {#if member.lastLoginAt}
                  <span class="text-xs text-gray-500">{formatDate(member.lastLoginAt, 'relative')}</span>
                {:else}
                  <Badge color="dark">Never</Badge>
                {/if}
              </div>
            {/each}
          </div>
        {/if}
      </Card>
    </div>
  </div>
</div>

<!-- Add Note Modal -->
<Modal bind:open={showAddNoteModal} size="md" title="Add Communication Entry">
  <form method="POST" action="?/addCommunicationLog" use:enhance={() => {
    return async ({ result }) => {
      if (result.type === 'success') {
        showAddNoteModal = false;
        resetNoteForm();
      }
    };
  }}>
    <div class="space-y-4">
      <div>
        <Label for="entryType">Entry Type</Label>
        <Select id="entryType" name="entryType" bind:value={noteType} required>
          <option value="note">Note</option>
          <option value="call">Call</option>
          <option value="email">Email</option>
          <option value="meeting">Meeting</option>
          <option value="alert">Alert</option>
        </Select>
      </div>
      <div>
        <Label for="direction">Direction</Label>
        <Select id="direction" name="direction" bind:value={noteDirection}>
          <option value="internal">Internal</option>
          <option value="inbound">Inbound</option>
          <option value="outbound">Outbound</option>
        </Select>
      </div>
      <div>
        <Label for="title">Title</Label>
        <Input id="title" name="title" bind:value={noteTitle} required placeholder="Brief summary..." />
      </div>
      <div>
        <Label for="body">Details</Label>
        <Textarea id="body" name="body" bind:value={noteBody} rows={4} placeholder="Additional details..." />
      </div>
    </div>
    <div class="mt-6 flex justify-end gap-2">
      <Button color="light" onclick={() => showAddNoteModal = false}>Cancel</Button>
      <Button type="submit">Add Entry</Button>
    </div>
  </form>
</Modal>

<!-- Schedule Review Modal -->
<Modal bind:open={showScheduleReviewModal} size="md" title="Schedule Review">
  <form method="POST" action="?/scheduleReview" use:enhance={() => {
    return async ({ result }) => {
      if (result.type === 'success') {
        showScheduleReviewModal = false;
        resetReviewForm();
      }
    };
  }}>
    <div class="space-y-4">
      <div>
        <Label for="reviewType">Review Type</Label>
        <Select id="reviewType" name="reviewType" bind:value={reviewType} required>
          <option value="monthly_performance">Monthly Performance</option>
          <option value="quarterly_business">Quarterly Business Review</option>
          <option value="contract_renewal">Contract Renewal</option>
        </Select>
      </div>
      <div>
        <Label for="scheduledDate">Date</Label>
        <Input id="scheduledDate" name="scheduledDate" type="date" bind:value={reviewDate} required />
      </div>
      <div>
        <Label for="meetingLink">Meeting Link (optional)</Label>
        <Input id="meetingLink" name="meetingLink" bind:value={reviewLink} placeholder="https://..." />
      </div>
    </div>
    <div class="mt-6 flex justify-end gap-2">
      <Button color="light" onclick={() => showScheduleReviewModal = false}>Cancel</Button>
      <Button type="submit">Schedule</Button>
    </div>
  </form>
</Modal>

<!-- Pause Campaigns Modal -->
<Modal bind:open={showPauseCampaignsModal} size="sm" title="Pause All Campaigns?">
  <p class="text-gray-600 dark:text-gray-400">
    This will pause all {data.campaigns.filter(c => c.status === 'active').length} active campaigns for {data.organization.name}.
  </p>
  <form method="POST" action="?/pauseCampaigns" use:enhance={() => {
    return async ({ result }) => {
      if (result.type === 'success') {
        showPauseCampaignsModal = false;
      }
    };
  }}>
    <div class="mt-6 flex justify-end gap-2">
      <Button color="light" onclick={() => showPauseCampaignsModal = false}>Cancel</Button>
      <Button type="submit" color="yellow">
        <PauseOutline class="mr-2 h-4 w-4" />
        Pause Campaigns
      </Button>
    </div>
  </form>
</Modal>
