<script lang="ts">
  import {
    Card,
    Badge,
    Button,
    Input,
    Label,
    Select,
    Textarea,
    Modal,
    Alert,
    Spinner,
    Tabs,
    TabItem,
    Search
  } from 'flowbite-svelte';
  import {
    QuestionCircleOutline,
    TicketOutline,
    BookOutline,
    CalendarMonthOutline,
    PlusOutline,
    CloseOutline,
    PaperPlaneOutline,
    SearchOutline,
    ClockOutline,
    CheckCircleOutline,
    ExclamationCircleOutline,
    ChevronRightOutline,
    UserOutline,
    ArrowRightOutline
  } from 'flowbite-svelte-icons';
  import { formatDate, getTicketStatusColor, getTicketPriorityColor, getFriendlyRelativeTime } from '$lib/utils';
  import { enhance } from '$app/forms';
  import type { PageData, ActionData } from './$types';

  let { data, form }: { data: PageData; form: ActionData } = $props();

  // Modal states
  let showNewTicketModal = $state(false);
  let showTicketDetailModal = $state(false);
  let selectedTicket = $state<typeof data.tickets[0] | null>(null);

  // Form states
  let isSubmitting = $state(false);
  let replyMessage = $state('');
  let searchQuery = $state('');

  // New ticket form
  let newTicketCategory = $state('');
  let newTicketPriority = $state('medium');
  let newTicketSubject = $state('');
  let newTicketDescription = $state('');

  // Category labels
  const categoryLabels: Record<string, string> = {
    billing: 'Billing & Payments',
    technical: 'Technical Issue',
    campaign: 'Campaign & Ads',
    leads: 'Leads & CRM',
    account: 'Account & Settings',
    other: 'Other'
  };

  // Status labels
  const statusLabels: Record<string, string> = {
    open: 'Open',
    pending: 'Awaiting Response',
    in_progress: 'In Progress',
    escalated: 'Escalated',
    resolved: 'Resolved',
    closed: 'Closed'
  };

  // Priority labels
  const priorityLabels: Record<string, string> = {
    low: 'Low',
    medium: 'Medium',
    high: 'High',
    urgent: 'Urgent'
  };

  // Open ticket detail
  function openTicketDetail(ticket: typeof data.tickets[0]) {
    selectedTicket = ticket;
    replyMessage = '';
    showTicketDetailModal = true;
  }

  // Reset new ticket form
  function resetNewTicketForm() {
    newTicketCategory = '';
    newTicketPriority = 'medium';
    newTicketSubject = '';
    newTicketDescription = '';
  }

  // Filter open tickets
  let openTickets = $derived(
    data.tickets.filter((t) => !['resolved', 'closed'].includes(t.status))
  );

  // Filter closed tickets
  let closedTickets = $derived(
    data.tickets.filter((t) => ['resolved', 'closed'].includes(t.status))
  );

  // Filtered articles based on search
  let filteredArticles = $derived(
    searchQuery.length >= 2
      ? data.articles.filter(
          (a) =>
            a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            a.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (a.excerpt && a.excerpt.toLowerCase().includes(searchQuery.toLowerCase()))
        )
      : data.articles
  );
</script>

<div class="space-y-6">
  <!-- Page Header -->
  <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
    <div>
      <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Support</h1>
      <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
        Get help, browse articles, or contact our support team.
      </p>
    </div>
    <Button color="primary" onclick={() => showNewTicketModal = true}>
      <PlusOutline class="mr-2 h-4 w-4" />
      New Ticket
    </Button>
  </div>

  <!-- Success/Error Messages -->
  {#if form?.success}
    <Alert color="green" class="border">
      <div class="flex items-center gap-3">
        <CheckCircleOutline class="h-5 w-5 flex-shrink-0" />
        <span>{form.message}</span>
      </div>
    </Alert>
  {/if}

  {#if form?.error}
    <Alert color="red" class="border">
      <div class="flex items-center gap-3">
        <ExclamationCircleOutline class="h-5 w-5 flex-shrink-0" />
        <span>{form.error}</span>
      </div>
    </Alert>
  {/if}

  <!-- Quick Stats -->
  <div class="grid gap-4 sm:grid-cols-3">
    <Card class="p-4">
      <div class="flex items-center gap-3">
        <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30">
          <TicketOutline class="h-5 w-5 text-blue-600 dark:text-blue-400" />
        </div>
        <div>
          <p class="text-2xl font-bold text-gray-900 dark:text-white">{data.openTicketCount}</p>
          <p class="text-sm text-gray-500 dark:text-gray-400">Open Tickets</p>
        </div>
      </div>
    </Card>

    <Card class="p-4">
      <div class="flex items-center gap-3">
        <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900/30">
          <BookOutline class="h-5 w-5 text-green-600 dark:text-green-400" />
        </div>
        <div>
          <p class="text-2xl font-bold text-gray-900 dark:text-white">{data.articles.length}</p>
          <p class="text-sm text-gray-500 dark:text-gray-400">Help Articles</p>
        </div>
      </div>
    </Card>

    <Card class="p-4">
      {#if data.upcomingReview}
        <div class="flex items-center gap-3">
          <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100 dark:bg-purple-900/30">
            <CalendarMonthOutline class="h-5 w-5 text-purple-600 dark:text-purple-400" />
          </div>
          <div>
            <p class="text-sm font-medium text-gray-900 dark:text-white">Next Review</p>
            <p class="text-sm text-gray-500 dark:text-gray-400">
              {formatDate(data.upcomingReview.scheduledDate, 'medium')}
            </p>
          </div>
        </div>
      {:else}
        <div class="flex items-center gap-3">
          <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-700">
            <CalendarMonthOutline class="h-5 w-5 text-gray-500" />
          </div>
          <div>
            <p class="text-sm font-medium text-gray-900 dark:text-white">Monthly Review</p>
            <Button color="light" size="xs" class="mt-1">Schedule</Button>
          </div>
        </div>
      {/if}
    </Card>
  </div>

  <div class="grid gap-6 lg:grid-cols-3">
    <!-- Tickets Section -->
    <div class="lg:col-span-2">
      <Card>
        <Tabs style="underline" contentClass="p-0 mt-4">
          <!-- Open Tickets Tab -->
          <TabItem open title="Open ({openTickets.length})">
            {#if openTickets.length > 0}
              <div class="space-y-3">
                {#each openTickets as ticket}
                  <button
                    type="button"
                    class="w-full rounded-lg border border-gray-200 p-4 text-left transition-colors hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-700"
                    onclick={() => openTicketDetail(ticket)}
                  >
                    <div class="flex items-start justify-between gap-4">
                      <div class="flex-1 min-w-0">
                        <div class="flex items-center gap-2 mb-1">
                          <span class="font-mono text-xs text-gray-500">{ticket.ticketNumber}</span>
                          <Badge color={
                            ticket.status === 'open' ? 'blue' :
                            ticket.status === 'pending' ? 'yellow' :
                            ticket.status === 'in_progress' ? 'purple' :
                            ticket.status === 'escalated' ? 'red' :
                            'gray'
                          }>
                            {statusLabels[ticket.status]}
                          </Badge>
                          <Badge color={
                            ticket.priority === 'urgent' ? 'red' :
                            ticket.priority === 'high' ? 'orange' :
                            ticket.priority === 'medium' ? 'blue' :
                            'gray'
                          }>
                            {priorityLabels[ticket.priority]}
                          </Badge>
                        </div>
                        <h4 class="font-medium text-gray-900 dark:text-white truncate">
                          {ticket.subject}
                        </h4>
                        <p class="mt-1 text-sm text-gray-500 dark:text-gray-400 line-clamp-2">
                          {ticket.description}
                        </p>
                        <div class="mt-2 flex items-center gap-4 text-xs text-gray-500">
                          <span class="flex items-center gap-1">
                            <ClockOutline class="h-3 w-3" />
                            {getFriendlyRelativeTime(ticket.createdAt)}
                          </span>
                          <span>{categoryLabels[ticket.category]}</span>
                          {#if ticket.messages.length > 0}
                            <span>{ticket.messages.length} message{ticket.messages.length === 1 ? '' : 's'}</span>
                          {/if}
                        </div>
                      </div>
                      <ChevronRightOutline class="h-5 w-5 flex-shrink-0 text-gray-400" />
                    </div>
                  </button>
                {/each}
              </div>
            {:else}
              <div class="flex flex-col items-center justify-center py-8 text-center">
                <TicketOutline class="mb-2 h-12 w-12 text-gray-300 dark:text-gray-600" />
                <p class="text-gray-500 dark:text-gray-400">No open tickets</p>
                <Button color="primary" size="sm" class="mt-4" onclick={() => showNewTicketModal = true}>
                  Create New Ticket
                </Button>
              </div>
            {/if}
          </TabItem>

          <!-- Closed Tickets Tab -->
          <TabItem title="Closed ({closedTickets.length})">
            {#if closedTickets.length > 0}
              <div class="space-y-3">
                {#each closedTickets as ticket}
                  <button
                    type="button"
                    class="w-full rounded-lg border border-gray-200 p-4 text-left opacity-75 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-700"
                    onclick={() => openTicketDetail(ticket)}
                  >
                    <div class="flex items-start justify-between gap-4">
                      <div class="flex-1 min-w-0">
                        <div class="flex items-center gap-2 mb-1">
                          <span class="font-mono text-xs text-gray-500">{ticket.ticketNumber}</span>
                          <Badge color="green">{statusLabels[ticket.status]}</Badge>
                        </div>
                        <h4 class="font-medium text-gray-900 dark:text-white truncate">
                          {ticket.subject}
                        </h4>
                        <div class="mt-2 flex items-center gap-4 text-xs text-gray-500">
                          <span>{formatDate(ticket.createdAt, 'medium')}</span>
                          <span>{categoryLabels[ticket.category]}</span>
                        </div>
                      </div>
                      <ChevronRightOutline class="h-5 w-5 flex-shrink-0 text-gray-400" />
                    </div>
                  </button>
                {/each}
              </div>
            {:else}
              <div class="flex flex-col items-center justify-center py-8 text-center">
                <CheckCircleOutline class="mb-2 h-12 w-12 text-gray-300 dark:text-gray-600" />
                <p class="text-gray-500 dark:text-gray-400">No closed tickets</p>
              </div>
            {/if}
          </TabItem>
        </Tabs>
      </Card>
    </div>

    <!-- Knowledge Base Section -->
    <div>
      <Card>
        <div class="mb-4">
          <h3 class="flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-white">
            <BookOutline class="h-5 w-5 text-primary-600" />
            Knowledge Base
          </h3>
        </div>

        <div class="mb-4">
          <Search
            size="md"
            placeholder="Search articles..."
            bind:value={searchQuery}
          />
        </div>

        <div class="space-y-3 max-h-96 overflow-y-auto">
          {#each filteredArticles as article}
            <a
              href="/support/articles/{article.slug}"
              class="block rounded-lg border border-gray-100 p-3 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-700"
            >
              <div class="flex items-start gap-3">
                <QuestionCircleOutline class="h-5 w-5 flex-shrink-0 text-primary-500 mt-0.5" />
                <div class="flex-1 min-w-0">
                  <h4 class="font-medium text-gray-900 dark:text-white text-sm">
                    {article.title}
                  </h4>
                  {#if article.excerpt}
                    <p class="mt-1 text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
                      {article.excerpt}
                    </p>
                  {/if}
                  <div class="mt-1">
                    <Badge color="blue" class="text-xs">{article.category}</Badge>
                  </div>
                </div>
              </div>
            </a>
          {/each}

          {#if filteredArticles.length === 0}
            <div class="text-center py-4 text-gray-500 dark:text-gray-400">
              {#if searchQuery.length >= 2}
                No articles found for "{searchQuery}"
              {:else}
                No articles available
              {/if}
            </div>
          {/if}
        </div>

        {#if data.articles.length > 0}
          <div class="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <a
              href="/support/articles"
              class="flex items-center justify-center gap-2 text-sm font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400"
            >
              View All Articles
              <ArrowRightOutline class="h-4 w-4" />
            </a>
          </div>
        {/if}
      </Card>

      <!-- Monthly Review Card -->
      {#if data.upcomingReview}
        <Card class="mt-6">
          <h3 class="mb-3 flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-white">
            <CalendarMonthOutline class="h-5 w-5 text-primary-600" />
            Upcoming Review
          </h3>
          <div class="rounded-lg bg-primary-50 p-4 dark:bg-primary-900/20">
            <p class="font-medium text-gray-900 dark:text-white">
              {data.upcomingReview.reviewType === 'monthly_performance' ? 'Monthly Performance Review' :
               data.upcomingReview.reviewType === 'quarterly_business' ? 'Quarterly Business Review' :
               'Contract Renewal Review'}
            </p>
            <p class="mt-1 text-sm text-gray-600 dark:text-gray-300">
              {formatDate(data.upcomingReview.scheduledDate, 'full')}
            </p>
            <p class="text-sm text-gray-500 dark:text-gray-400">
              Duration: {data.upcomingReview.durationMinutes} minutes
            </p>
            {#if data.upcomingReview.meetingLink}
              <Button color="primary" size="sm" class="mt-3" href={data.upcomingReview.meetingLink} target="_blank">
                Join Meeting
              </Button>
            {/if}
          </div>
        </Card>
      {:else}
        <Card class="mt-6">
          <h3 class="mb-3 flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-white">
            <CalendarMonthOutline class="h-5 w-5 text-primary-600" />
            Monthly Review
          </h3>
          <p class="text-sm text-gray-500 dark:text-gray-400">
            Schedule a monthly review with your account manager to discuss performance and strategy.
          </p>
          <Button color="primary" outline size="sm" class="mt-3">
            Schedule Review
          </Button>
        </Card>
      {/if}
    </div>
  </div>
</div>

<!-- New Ticket Modal -->
<Modal bind:open={showNewTicketModal} size="lg" title="Create Support Ticket">
  <form method="POST" action="?/createTicket" use:enhance={() => {
    isSubmitting = true;
    return async ({ update }) => {
      await update();
      isSubmitting = false;
      showNewTicketModal = false;
      resetNewTicketForm();
    };
  }}>
    <div class="space-y-4">
      <div class="grid gap-4 sm:grid-cols-2">
        <div>
          <Label for="category">Category</Label>
          <Select
            id="category"
            name="category"
            items={data.categoryOptions}
            bind:value={newTicketCategory}
            required
            class="mt-1"
          />
        </div>
        <div>
          <Label for="priority">Priority</Label>
          <Select
            id="priority"
            name="priority"
            items={data.priorityOptions}
            bind:value={newTicketPriority}
            class="mt-1"
          />
        </div>
      </div>

      <div>
        <Label for="subject">Subject</Label>
        <Input
          id="subject"
          name="subject"
          bind:value={newTicketSubject}
          placeholder="Brief description of your issue"
          required
          class="mt-1"
        />
      </div>

      <div>
        <Label for="description">Description</Label>
        <Textarea
          id="description"
          name="description"
          bind:value={newTicketDescription}
          placeholder="Please provide as much detail as possible..."
          rows={5}
          required
          class="mt-1"
        />
      </div>
    </div>

    <div class="mt-6 flex gap-3">
      <Button type="button" color="light" class="flex-1" onclick={() => showNewTicketModal = false}>
        Cancel
      </Button>
      <Button type="submit" color="primary" class="flex-1" disabled={isSubmitting}>
        {#if isSubmitting}
          <Spinner size="4" class="mr-2" />
        {:else}
          <PlusOutline class="mr-2 h-4 w-4" />
        {/if}
        Create Ticket
      </Button>
    </div>
  </form>
</Modal>

<!-- Ticket Detail Modal -->
<Modal bind:open={showTicketDetailModal} size="xl" title={selectedTicket?.ticketNumber ?? 'Ticket'}>
  {#if selectedTicket}
    <div class="space-y-4">
      <!-- Ticket Header -->
      <div class="flex flex-wrap items-center gap-2">
        <Badge color={
          selectedTicket.status === 'open' ? 'blue' :
          selectedTicket.status === 'pending' ? 'yellow' :
          selectedTicket.status === 'in_progress' ? 'purple' :
          selectedTicket.status === 'escalated' ? 'red' :
          selectedTicket.status === 'resolved' ? 'green' :
          'gray'
        }>
          {statusLabels[selectedTicket.status]}
        </Badge>
        <Badge color={
          selectedTicket.priority === 'urgent' ? 'red' :
          selectedTicket.priority === 'high' ? 'orange' :
          selectedTicket.priority === 'medium' ? 'blue' :
          'gray'
        }>
          {priorityLabels[selectedTicket.priority]}
        </Badge>
        <Badge color="gray">{categoryLabels[selectedTicket.category]}</Badge>
        {#if selectedTicket.assignedTo}
          <span class="text-sm text-gray-500">
            Assigned to: {selectedTicket.assignedTo.name}
          </span>
        {/if}
      </div>

      <!-- Subject & Description -->
      <div class="rounded-lg bg-gray-50 p-4 dark:bg-gray-700">
        <h4 class="font-semibold text-gray-900 dark:text-white">{selectedTicket.subject}</h4>
        <p class="mt-2 text-sm text-gray-600 dark:text-gray-300 whitespace-pre-wrap">
          {selectedTicket.description}
        </p>
        <div class="mt-3 flex items-center gap-4 text-xs text-gray-500">
          <span>Submitted by {selectedTicket.submittedBy.name}</span>
          <span>{formatDate(selectedTicket.createdAt, 'datetime')}</span>
        </div>
      </div>

      <!-- Messages Thread -->
      {#if selectedTicket.messages.length > 0}
        <div class="space-y-3 max-h-64 overflow-y-auto">
          {#each selectedTicket.messages.filter(m => !m.isInternal) as message}
            <div class={`rounded-lg p-3 ${message.sender.isStaff ? 'bg-primary-50 dark:bg-primary-900/20 ml-4' : 'bg-gray-50 dark:bg-gray-700 mr-4'}`}>
              <div class="flex items-center gap-2 mb-1">
                <UserOutline class="h-4 w-4 text-gray-400" />
                <span class="text-sm font-medium text-gray-900 dark:text-white">
                  {message.sender.name}
                </span>
                {#if message.sender.isStaff}
                  <Badge color="blue" class="text-xs">Support</Badge>
                {/if}
                <span class="text-xs text-gray-500">
                  {formatDate(message.createdAt, 'datetime')}
                </span>
              </div>
              <p class="text-sm text-gray-600 dark:text-gray-300 whitespace-pre-wrap">
                {message.message}
              </p>
            </div>
          {/each}
        </div>
      {/if}

      <!-- Reply Form -->
      {#if !['resolved', 'closed'].includes(selectedTicket.status)}
        <form method="POST" action="?/replyToTicket" use:enhance={() => {
          isSubmitting = true;
          return async ({ update }) => {
            await update();
            isSubmitting = false;
            replyMessage = '';
          };
        }}>
          <input type="hidden" name="ticketId" value={selectedTicket.id} />
          <div class="flex gap-2">
            <Textarea
              name="message"
              bind:value={replyMessage}
              placeholder="Type your reply..."
              rows={2}
              required
              class="flex-1"
            />
            <Button type="submit" color="primary" disabled={isSubmitting || !replyMessage.trim()}>
              {#if isSubmitting}
                <Spinner size="4" />
              {:else}
                <PaperPlaneOutline class="h-5 w-5" />
              {/if}
            </Button>
          </div>
        </form>
      {/if}

      <!-- Resolution -->
      {#if selectedTicket.resolution}
        <div class="rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-900/20">
          <h5 class="flex items-center gap-2 font-medium text-green-800 dark:text-green-400">
            <CheckCircleOutline class="h-4 w-4" />
            Resolution
          </h5>
          <p class="mt-1 text-sm text-green-700 dark:text-green-300">
            {selectedTicket.resolution}
          </p>
        </div>
      {/if}
    </div>

    <!-- Footer Actions -->
    <div class="mt-6 flex justify-between">
      <Button color="light" onclick={() => showTicketDetailModal = false}>
        Close
      </Button>
      {#if !['resolved', 'closed'].includes(selectedTicket.status)}
        <form method="POST" action="?/closeTicket" use:enhance>
          <input type="hidden" name="ticketId" value={selectedTicket.id} />
          <Button type="submit" color="red" outline>
            <CloseOutline class="mr-2 h-4 w-4" />
            Close Ticket
          </Button>
        </form>
      {/if}
    </div>
  {/if}
</Modal>
