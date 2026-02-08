<script lang="ts">
  import {
    Card, Badge, Button, Modal, Input, Textarea, Select, Label,
    Table, TableHead, TableHeadCell, TableBody, TableBodyRow, TableBodyCell,
    Drawer, Timeline, TimelineItem, Tabs, TabItem, Avatar
  } from 'flowbite-svelte';
  import {
    TicketOutline,
    ClockOutline,
    MessagesOutline,
    StarOutline,
    ExclamationCircleOutline,
    CheckCircleOutline,
    SearchOutline,
    FilterOutline,
    CloseOutline,
    PaperPlaneOutline,
    CalendarMonthOutline,
    ArrowUpRightFromSquareOutline,
    FlagOutline,
    UserOutline,
    BuildingOutline
  } from 'flowbite-svelte-icons';
  import { enhance } from '$app/forms';
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import {
    formatDate,
    getRelativeTime,
    getTicketStatusColor,
    getTicketPriorityColor,
    getHealthScoreColor
  } from '$lib/utils';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();

  // UI State
  let showTicketDrawer = $state(false);
  let showResolveModal = $state(false);
  let selectedTicket = $state<any>(null);
  let replyMessage = $state('');
  let isInternalReply = $state(false);
  let isSubmitting = $state(false);

  // Filter state
  let searchQuery = $state('');
  let statusFilter = $state(data.filters.status);
  let priorityFilter = $state(data.filters.priority);
  let categoryFilter = $state(data.filters.category);

  // Labels
  const statusLabels: Record<string, string> = {
    open: 'Open',
    pending: 'Pending',
    in_progress: 'In Progress',
    escalated: 'Escalated',
    resolved: 'Resolved',
    closed: 'Closed'
  };

  const priorityLabels: Record<string, string> = {
    low: 'Low',
    medium: 'Medium',
    high: 'High',
    urgent: 'Urgent'
  };

  const categoryLabels: Record<string, string> = {
    billing: 'Billing',
    technical: 'Technical',
    campaign: 'Campaign',
    leads: 'Leads',
    account: 'Account',
    other: 'Other'
  };

  const alertSeverityColors: Record<string, string> = {
    info: 'blue',
    warning: 'yellow',
    critical: 'red'
  };

  const reviewTypeLabels: Record<string, string> = {
    monthly_performance: 'Monthly Performance',
    quarterly_business: 'Quarterly Business',
    contract_renewal: 'Contract Renewal'
  };

  // Open ticket detail
  function openTicketDetail(ticket: any) {
    selectedTicket = ticket;
    showTicketDrawer = true;
    replyMessage = '';
    isInternalReply = false;
  }

  // Apply filters
  function applyFilters() {
    const params = new URLSearchParams();
    if (statusFilter) params.set('status', statusFilter);
    if (priorityFilter) params.set('priority', priorityFilter);
    if (categoryFilter) params.set('category', categoryFilter);
    goto(`/support?${params.toString()}`);
  }

  // Clear filters
  function clearFilters() {
    statusFilter = '';
    priorityFilter = '';
    categoryFilter = '';
    goto('/support');
  }

  // Format age display
  function formatAge(hours: number): string {
    if (hours < 1) return 'Just now';
    if (hours < 24) return `${Math.round(hours)}h`;
    if (hours < 168) return `${Math.round(hours / 24)}d`;
    return `${Math.round(hours / 168)}w`;
  }

  // Get priority badge color
  function getPriorityBadgeColor(priority: string): 'gray' | 'blue' | 'yellow' | 'red' {
    const colors: Record<string, 'gray' | 'blue' | 'yellow' | 'red'> = {
      low: 'gray',
      medium: 'blue',
      high: 'yellow',
      urgent: 'red'
    };
    return colors[priority] || 'gray';
  }

  // Get status badge color
  function getStatusBadgeColor(status: string): 'blue' | 'yellow' | 'purple' | 'red' | 'green' | 'gray' {
    const colors: Record<string, 'blue' | 'yellow' | 'purple' | 'red' | 'green' | 'gray'> = {
      open: 'blue',
      pending: 'yellow',
      in_progress: 'purple',
      escalated: 'red',
      resolved: 'green',
      closed: 'gray'
    };
    return colors[status] || 'gray';
  }
</script>

<div class="space-y-6">
  <!-- Page Header -->
  <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
    <div>
      <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Support Center</h1>
      <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
        Manage support tickets and proactive client outreach
      </p>
    </div>
  </div>

  <!-- Stats Cards -->
  <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
    <Card class="p-4">
      <div class="flex items-center gap-3">
        <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900">
          <TicketOutline class="h-5 w-5 text-blue-600 dark:text-blue-300" />
        </div>
        <div>
          <p class="text-sm text-gray-500 dark:text-gray-400">Open Tickets</p>
          <p class="text-xl font-bold text-gray-900 dark:text-white">{data.stats.openTickets}</p>
        </div>
      </div>
    </Card>

    <Card class="p-4">
      <div class="flex items-center gap-3">
        <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-red-100 dark:bg-red-900">
          <ExclamationCircleOutline class="h-5 w-5 text-red-600 dark:text-red-300" />
        </div>
        <div>
          <p class="text-sm text-gray-500 dark:text-gray-400">Urgent/High</p>
          <p class="text-xl font-bold text-red-600 dark:text-red-400">{data.stats.urgentHighPriority}</p>
        </div>
      </div>
    </Card>

    <Card class="p-4">
      <div class="flex items-center gap-3">
        <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-100 dark:bg-orange-900">
          <FlagOutline class="h-5 w-5 text-orange-600 dark:text-orange-300" />
        </div>
        <div>
          <p class="text-sm text-gray-500 dark:text-gray-400">Escalated</p>
          <p class="text-xl font-bold text-orange-600 dark:text-orange-400">{data.stats.escalatedCount}</p>
        </div>
      </div>
    </Card>

    <Card class="p-4">
      <div class="flex items-center gap-3">
        <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100 dark:bg-purple-900">
          <ClockOutline class="h-5 w-5 text-purple-600 dark:text-purple-300" />
        </div>
        <div>
          <p class="text-sm text-gray-500 dark:text-gray-400">Avg Response</p>
          <p class="text-xl font-bold text-gray-900 dark:text-white">{data.stats.avgResponseTimeHours}h</p>
        </div>
      </div>
    </Card>

    <Card class="p-4">
      <div class="flex items-center gap-3">
        <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900">
          <CheckCircleOutline class="h-5 w-5 text-green-600 dark:text-green-300" />
        </div>
        <div>
          <p class="text-sm text-gray-500 dark:text-gray-400">Resolution Rate</p>
          <p class="text-xl font-bold text-gray-900 dark:text-white">{data.stats.resolutionRate}%</p>
        </div>
      </div>
    </Card>

    <Card class="p-4">
      <div class="flex items-center gap-3">
        <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-yellow-100 dark:bg-yellow-900">
          <StarOutline class="h-5 w-5 text-yellow-600 dark:text-yellow-300" />
        </div>
        <div>
          <p class="text-sm text-gray-500 dark:text-gray-400">Satisfaction</p>
          <p class="text-xl font-bold text-gray-900 dark:text-white">
            {data.stats.avgSatisfaction ?? 'N/A'}{data.stats.avgSatisfaction ? '/5' : ''}
          </p>
        </div>
      </div>
    </Card>
  </div>

  <!-- Tabs for different sections -->
  <Tabs style="underline">
    <TabItem open title="Ticket Queue">
      <!-- Filters -->
      <Card class="mb-4 p-4">
        <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div class="flex flex-1 flex-wrap gap-3">
            <Select class="w-36" bind:value={statusFilter} onchange={applyFilters}>
              <option value="">All Status</option>
              <option value="open">Open</option>
              <option value="pending">Pending</option>
              <option value="in_progress">In Progress</option>
              <option value="escalated">Escalated</option>
              <option value="resolved">Resolved</option>
              <option value="closed">Closed</option>
            </Select>
            <Select class="w-32" bind:value={priorityFilter} onchange={applyFilters}>
              <option value="">All Priority</option>
              <option value="urgent">Urgent</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </Select>
            <Select class="w-32" bind:value={categoryFilter} onchange={applyFilters}>
              <option value="">All Category</option>
              <option value="billing">Billing</option>
              <option value="technical">Technical</option>
              <option value="campaign">Campaign</option>
              <option value="leads">Leads</option>
              <option value="account">Account</option>
              <option value="other">Other</option>
            </Select>
          </div>
          {#if statusFilter || priorityFilter || categoryFilter}
            <Button color="light" size="sm" onclick={clearFilters}>
              <CloseOutline class="mr-1 h-4 w-4" />
              Clear Filters
            </Button>
          {/if}
        </div>
      </Card>

      <!-- Tickets Table -->
      <Card class="overflow-hidden p-0">
        <Table striped>
          <TableHead>
            <TableHeadCell class="w-24">Ticket</TableHeadCell>
            <TableHeadCell>Subject</TableHeadCell>
            <TableHeadCell>Client</TableHeadCell>
            <TableHeadCell>Category</TableHeadCell>
            <TableHeadCell>Priority</TableHeadCell>
            <TableHeadCell>Status</TableHeadCell>
            <TableHeadCell>Assignee</TableHeadCell>
            <TableHeadCell>Age</TableHeadCell>
            <TableHeadCell>Actions</TableHeadCell>
          </TableHead>
          <TableBody>
            {#each data.tickets as ticket}
              <TableBodyRow class="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800" onclick={() => openTicketDetail(ticket)}>
                <TableBodyCell class="font-mono text-xs">{ticket.ticketNumber}</TableBodyCell>
                <TableBodyCell>
                  <div class="max-w-xs truncate font-medium text-gray-900 dark:text-white">
                    {ticket.subject}
                  </div>
                </TableBodyCell>
                <TableBodyCell>
                  <div class="flex items-center gap-2">
                    <div class="flex h-7 w-7 items-center justify-center rounded-full bg-primary-100 text-xs font-medium text-primary-600 dark:bg-primary-900 dark:text-primary-300">
                      {ticket.organization.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                    </div>
                    <span class="text-sm">{ticket.organization.name}</span>
                  </div>
                </TableBodyCell>
                <TableBodyCell>
                  <Badge color="gray">{categoryLabels[ticket.category]}</Badge>
                </TableBodyCell>
                <TableBodyCell>
                  <Badge color={getPriorityBadgeColor(ticket.priority)}>
                    {priorityLabels[ticket.priority]}
                  </Badge>
                </TableBodyCell>
                <TableBodyCell>
                  <Badge color={getStatusBadgeColor(ticket.status)}>
                    {statusLabels[ticket.status]}
                  </Badge>
                </TableBodyCell>
                <TableBodyCell>
                  {#if ticket.assignedTo}
                    <span class="text-sm">{ticket.assignedTo.name}</span>
                  {:else}
                    <span class="text-sm text-gray-400">Unassigned</span>
                  {/if}
                </TableBodyCell>
                <TableBodyCell>
                  <span class="text-sm {ticket.ageHours > 48 ? 'font-medium text-red-600 dark:text-red-400' : ticket.ageHours > 24 ? 'text-yellow-600 dark:text-yellow-400' : 'text-gray-500'}">
                    {formatAge(ticket.ageHours)}
                  </span>
                </TableBodyCell>
                <TableBodyCell>
                  <Button size="xs" color="light" onclick={(e: MouseEvent) => { e.stopPropagation(); openTicketDetail(ticket); }}>
                    View
                  </Button>
                </TableBodyCell>
              </TableBodyRow>
            {:else}
              <TableBodyRow>
                <TableBodyCell colspan={9} class="text-center text-gray-500">
                  No tickets found matching the current filters.
                </TableBodyCell>
              </TableBodyRow>
            {/each}
          </TableBody>
        </Table>

        <!-- Pagination -->
        {#if data.pagination.totalPages > 1}
          <div class="flex items-center justify-between border-t border-gray-200 px-4 py-3 dark:border-gray-700">
            <p class="text-sm text-gray-500 dark:text-gray-400">
              Showing {(data.pagination.page - 1) * data.pagination.pageSize + 1} to {Math.min(data.pagination.page * data.pagination.pageSize, data.pagination.totalCount)} of {data.pagination.totalCount}
            </p>
            <div class="flex gap-2">
              <Button
                color="light"
                size="sm"
                disabled={data.pagination.page === 1}
                onclick={() => {
                  const params = new URLSearchParams($page.url.searchParams);
                  params.set('page', String(data.pagination.page - 1));
                  goto(`/support?${params.toString()}`);
                }}
              >
                Previous
              </Button>
              <Button
                color="light"
                size="sm"
                disabled={data.pagination.page === data.pagination.totalPages}
                onclick={() => {
                  const params = new URLSearchParams($page.url.searchParams);
                  params.set('page', String(data.pagination.page + 1));
                  goto(`/support?${params.toString()}`);
                }}
              >
                Next
              </Button>
            </div>
          </div>
        {/if}
      </Card>
    </TabItem>

    <TabItem title="Proactive Outreach">
      <div class="grid gap-6 lg:grid-cols-2">
        <!-- Health Alerts -->
        <Card>
          <h3 class="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-white">
            <ExclamationCircleOutline class="h-5 w-5 text-red-500" />
            Health Alerts Requiring Action
          </h3>

          {#if data.healthAlerts.length > 0}
            <div class="space-y-3">
              {#each data.healthAlerts as alert}
                <div class="rounded-lg border border-gray-200 p-3 dark:border-gray-700">
                  <div class="flex items-start justify-between">
                    <div class="flex-1">
                      <div class="flex items-center gap-2">
                        <Badge color={alertSeverityColors[alert.severity] as any}>
                          {alert.severity}
                        </Badge>
                        <span class="text-sm font-medium text-gray-900 dark:text-white">
                          {alert.title}
                        </span>
                      </div>
                      <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
                        {alert.organization.name}
                      </p>
                      <p class="mt-1 text-xs text-gray-400">
                        {alert.description}
                      </p>
                      {#if alert.metricName && alert.metricValue !== null}
                        <p class="mt-1 text-xs text-gray-500">
                          {alert.metricName}: {alert.metricValue} (threshold: {alert.thresholdValue})
                        </p>
                      {/if}
                    </div>
                    <div class="flex gap-2">
                      {#if !alert.isAcknowledged}
                        <form
                          method="POST"
                          action="?/acknowledgeAlert"
                          use:enhance={() => {
                            return async ({ update }) => {
                              await update();
                            };
                          }}
                        >
                          <input type="hidden" name="alertId" value={alert.id} />
                          <Button type="submit" size="xs" color="light">Acknowledge</Button>
                        </form>
                      {/if}
                      <form
                        method="POST"
                        action="?/resolveAlert"
                        use:enhance={() => {
                          return async ({ update }) => {
                            await update();
                          };
                        }}
                      >
                        <input type="hidden" name="alertId" value={alert.id} />
                        <Button type="submit" size="xs" color="green">Resolve</Button>
                      </form>
                    </div>
                  </div>
                  <p class="mt-2 text-xs text-gray-400">
                    {getRelativeTime(alert.createdAt)}
                  </p>
                </div>
              {/each}
            </div>
          {:else}
            <div class="py-8 text-center text-gray-500 dark:text-gray-400">
              <CheckCircleOutline class="mx-auto mb-2 h-10 w-10 text-green-500" />
              <p>No active health alerts</p>
            </div>
          {/if}
        </Card>

        <!-- Upcoming Reviews -->
        <Card>
          <h3 class="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-white">
            <CalendarMonthOutline class="h-5 w-5 text-blue-500" />
            Upcoming Monthly Reviews
          </h3>

          {#if data.upcomingReviews.length > 0}
            <div class="space-y-3">
              {#each data.upcomingReviews as review}
                <div class="rounded-lg border border-gray-200 p-3 dark:border-gray-700">
                  <div class="flex items-start justify-between">
                    <div>
                      <p class="font-medium text-gray-900 dark:text-white">
                        {review.organization.name}
                      </p>
                      <p class="text-sm text-gray-500 dark:text-gray-400">
                        {reviewTypeLabels[review.reviewType]}
                      </p>
                      <div class="mt-2 flex items-center gap-3 text-xs text-gray-500">
                        <span class="flex items-center gap-1">
                          <CalendarMonthOutline class="h-3 w-3" />
                          {formatDate(review.scheduledDate)}
                        </span>
                        <span class="flex items-center gap-1">
                          <ClockOutline class="h-3 w-3" />
                          {review.durationMinutes} min
                        </span>
                      </div>
                      {#if review.conductedBy}
                        <p class="mt-1 text-xs text-gray-400">
                          Conducted by: {review.conductedBy.name}
                        </p>
                      {/if}
                    </div>
                    {#if review.meetingLink}
                      <Button size="xs" color="light" href={review.meetingLink} target="_blank">
                        <ArrowUpRightFromSquareOutline class="h-3 w-3" />
                      </Button>
                    {/if}
                  </div>
                </div>
              {/each}
            </div>
          {:else}
            <div class="py-8 text-center text-gray-500 dark:text-gray-400">
              <CalendarMonthOutline class="mx-auto mb-2 h-10 w-10 text-gray-300" />
              <p>No reviews scheduled in the next 14 days</p>
            </div>
          {/if}
        </Card>
      </div>
    </TabItem>
  </Tabs>
</div>

<!-- Ticket Detail Drawer -->
<Drawer
  bind:open={showTicketDrawer}
  placement="right"
  class="w-full p-0 sm:w-[560px]"
>
  {#if selectedTicket}
    <div class="flex h-full flex-col">
      <!-- Header -->
      <div class="flex items-center justify-between border-b border-gray-200 p-4 dark:border-gray-700">
        <div>
          <div class="flex items-center gap-2">
            <span class="font-mono text-sm text-gray-500">{selectedTicket.ticketNumber}</span>
            <Badge color={getStatusBadgeColor(selectedTicket.status)}>
              {statusLabels[selectedTicket.status]}
            </Badge>
            <Badge color={getPriorityBadgeColor(selectedTicket.priority)}>
              {priorityLabels[selectedTicket.priority]}
            </Badge>
          </div>
          <h2 class="mt-1 text-lg font-semibold text-gray-900 dark:text-white">
            {selectedTicket.subject}
          </h2>
        </div>
        <Button color="light" size="sm" onclick={() => showTicketDrawer = false}>
          <CloseOutline class="h-5 w-5" />
        </Button>
      </div>

      <!-- Content -->
      <div class="flex-1 overflow-y-auto">
        <!-- Ticket Info -->
        <div class="border-b border-gray-200 p-4 dark:border-gray-700">
          <div class="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p class="text-gray-500 dark:text-gray-400">Client</p>
              <p class="font-medium text-gray-900 dark:text-white">{selectedTicket.organization.name}</p>
            </div>
            <div>
              <p class="text-gray-500 dark:text-gray-400">Category</p>
              <p class="font-medium text-gray-900 dark:text-white">{categoryLabels[selectedTicket.category]}</p>
            </div>
            <div>
              <p class="text-gray-500 dark:text-gray-400">Submitted By</p>
              <p class="font-medium text-gray-900 dark:text-white">{selectedTicket.submittedBy.name}</p>
            </div>
            <div>
              <p class="text-gray-500 dark:text-gray-400">Created</p>
              <p class="font-medium text-gray-900 dark:text-white">{formatDate(selectedTicket.createdAt)}</p>
            </div>
          </div>

          <div class="mt-4">
            <p class="mb-2 text-sm text-gray-500 dark:text-gray-400">Description</p>
            <p class="text-sm text-gray-900 dark:text-white">{selectedTicket.description}</p>
          </div>
        </div>

        <!-- Quick Actions -->
        <div class="border-b border-gray-200 p-4 dark:border-gray-700">
          <div class="flex flex-wrap gap-2">
            <!-- Assign -->
            <form
              method="POST"
              action="?/assignTicket"
              use:enhance={() => {
                return async ({ update }) => {
                  await update();
                };
              }}
              class="flex items-center gap-2"
            >
              <input type="hidden" name="ticketId" value={selectedTicket.id} />
              <Select name="assignedTo" size="sm" class="w-40">
                <option value="">Assign to...</option>
                {#each data.supportUsers as user}
                  <option value={user.id} selected={selectedTicket.assignedTo?.id === user.id}>
                    {user.name}
                  </option>
                {/each}
              </Select>
              <Button type="submit" size="xs">Assign</Button>
            </form>

            <!-- Priority -->
            <form
              method="POST"
              action="?/updatePriority"
              use:enhance={() => {
                return async ({ update }) => {
                  await update();
                };
              }}
              class="flex items-center gap-2"
            >
              <input type="hidden" name="ticketId" value={selectedTicket.id} />
              <Select name="priority" size="sm" class="w-28">
                {#each ['low', 'medium', 'high', 'urgent'] as p}
                  <option value={p} selected={selectedTicket.priority === p}>
                    {priorityLabels[p]}
                  </option>
                {/each}
              </Select>
              <Button type="submit" size="xs" color="light">Update</Button>
            </form>

            <!-- Status -->
            {#if selectedTicket.status !== 'resolved' && selectedTicket.status !== 'closed'}
              <Button size="xs" color="green" onclick={() => showResolveModal = true}>
                <CheckCircleOutline class="mr-1 h-3 w-3" />
                Resolve
              </Button>
            {/if}
          </div>
        </div>

        <!-- Messages -->
        <div class="p-4">
          <h3 class="mb-4 font-medium text-gray-900 dark:text-white">Conversation</h3>

          <div class="space-y-4">
            {#each selectedTicket.messages as message}
              <div class="flex gap-3 {message.isInternal ? 'opacity-75' : ''}">
                <Avatar size="sm">
                  {message.sender.name.split(' ').map((n: string) => n[0]).join('')}
                </Avatar>
                <div class="flex-1">
                  <div class="flex items-center gap-2">
                    <span class="font-medium text-gray-900 dark:text-white">
                      {message.sender.name}
                    </span>
                    {#if message.isInternal}
                      <Badge color="yellow" class="text-xs">Internal</Badge>
                    {/if}
                    <span class="text-xs text-gray-500">
                      {getRelativeTime(message.createdAt)}
                    </span>
                  </div>
                  <div class="mt-1 rounded-lg bg-gray-50 p-3 text-sm dark:bg-gray-800 {message.isInternal ? 'border border-yellow-200 dark:border-yellow-800' : ''}">
                    {message.message}
                  </div>
                </div>
              </div>
            {/each}

            {#if selectedTicket.messages.length === 0}
              <p class="text-center text-sm text-gray-500">No messages yet.</p>
            {/if}
          </div>
        </div>
      </div>

      <!-- Reply Form -->
      {#if selectedTicket.status !== 'closed'}
        <div class="border-t border-gray-200 p-4 dark:border-gray-700">
          <form
            method="POST"
            action="?/replyToTicket"
            use:enhance={() => {
              isSubmitting = true;
              return async ({ result, update }) => {
                isSubmitting = false;
                if (result.type === 'success') {
                  replyMessage = '';
                  await update();
                }
              };
            }}
            class="space-y-3"
          >
            <input type="hidden" name="ticketId" value={selectedTicket.id} />
            <input type="hidden" name="isInternal" value={isInternalReply.toString()} />

            <Textarea
              name="message"
              rows={3}
              placeholder="Type your reply..."
              bind:value={replyMessage}
              required
            />

            <div class="flex items-center justify-between">
              <label class="flex items-center gap-2 text-sm">
                <input type="checkbox" bind:checked={isInternalReply} class="rounded" />
                <span class="text-gray-600 dark:text-gray-400">Internal note (not visible to client)</span>
              </label>

              <Button type="submit" disabled={isSubmitting || !replyMessage.trim()}>
                <PaperPlaneOutline class="mr-1 h-4 w-4" />
                {isSubmitting ? 'Sending...' : 'Send Reply'}
              </Button>
            </div>
          </form>
        </div>
      {/if}
    </div>
  {/if}
</Drawer>

<!-- Resolve Modal -->
<Modal title="Resolve Ticket" bind:open={showResolveModal} size="md">
  {#if selectedTicket}
    <form
      method="POST"
      action="?/updateTicketStatus"
      use:enhance={() => {
        isSubmitting = true;
        return async ({ result, update }) => {
          isSubmitting = false;
          if (result.type === 'success') {
            showResolveModal = false;
            showTicketDrawer = false;
            await update();
          }
        };
      }}
      class="space-y-4"
    >
      <input type="hidden" name="ticketId" value={selectedTicket.id} />
      <input type="hidden" name="status" value="resolved" />

      <div>
        <Label for="resolution">Resolution Summary</Label>
        <Textarea
          id="resolution"
          name="resolution"
          rows={4}
          placeholder="Describe how the issue was resolved..."
          required
        />
      </div>

      <div class="flex justify-end gap-3">
        <Button color="light" onclick={() => showResolveModal = false}>Cancel</Button>
        <Button type="submit" color="green" disabled={isSubmitting}>
          {isSubmitting ? 'Resolving...' : 'Resolve Ticket'}
        </Button>
      </div>
    </form>
  {/if}
</Modal>
