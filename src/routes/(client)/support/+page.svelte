<script lang="ts">
  import type { PageData, ActionData } from './$types';
  import { enhance } from '$app/forms';

  let { data, form }: { data: PageData; form: ActionData } = $props();

  // Modal state
  let showNewTicketModal = $state(false);
  let showTicketDetailModal = $state(false);
  let selectedTicket = $state<(typeof data.tickets)[0] | null>(null);
  let replyMessage = $state('');
  let expandedFaq = $state<string | null>(null);

  // Form state
  let ticketCategory = $state('');
  let ticketPriority = $state('medium');
  let ticketSubject = $state('');
  let ticketDescription = $state('');

  // FAQ data
  const faqItems = [
    {
      id: 'leads',
      question: 'How do I manage and respond to my leads?',
      answer: 'Navigate to the Leads Center from your dashboard sidebar. You can view all your leads, filter by status or temperature, and click on any lead to see full details. Use the notes section to track your conversations and update the lead status as you progress through your sales process.'
    },
    {
      id: 'campaigns',
      question: 'How can I track my campaign performance?',
      answer: 'Visit the Campaigns page to see real-time metrics including impressions, clicks, conversions, and cost per lead. Each campaign shows detailed analytics, and you can view the AI optimization log to see how we are continuously improving your ad performance.'
    },
    {
      id: 'territory',
      question: 'What is territory exclusivity and how does it work?',
      answer: 'Your territory is exclusively yours - no other provider on our platform will receive leads from your geographic area. This means all qualified leads in your territory come directly to you without competition from other platform users. You can view your exact territory boundaries on the Territory Map page.'
    },
    {
      id: 'billing',
      question: 'How do I update my payment method or view invoices?',
      answer: 'Go to the Billing page in your dashboard. Here you can update your payment method, view past invoices, manage add-ons, and see your subscription details. All invoices are available for download as PDF.'
    },
    {
      id: 'brand-voice',
      question: 'What is the Brand Voice Engine?',
      answer: 'Our AI analyzes your website, reviews, and existing marketing materials to create a unique brand voice profile for your practice. This ensures all ad copy and landing page content sounds authentically like your brand. You can review and adjust your voice profile on the Brand Voice page.'
    },
    {
      id: 'response-time',
      question: 'What is the expected response time for support tickets?',
      answer: 'We aim to respond to all support tickets within 4 business hours during regular business hours (Monday-Friday, 9 AM - 6 PM EST). Urgent issues are prioritized and typically receive a response within 1 hour.'
    }
  ];

  // Helper functions
  function formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  }

  function formatDateTime(dateString: string): string {
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  }

  function getStatusBadgeClass(status: string): string {
    switch (status) {
      case 'open':
        return 'badge-primary';
      case 'in_progress':
        return 'badge-warning';
      case 'pending':
        return 'badge-gray';
      case 'resolved':
        return 'badge-success';
      case 'closed':
        return 'badge-gray';
      default:
        return 'badge-gray';
    }
  }

  function getPriorityBadgeClass(priority: string): string {
    switch (priority) {
      case 'urgent':
        return 'badge-danger';
      case 'high':
        return 'badge-warning';
      case 'medium':
        return 'badge-primary';
      case 'low':
        return 'badge-gray';
      default:
        return 'badge-gray';
    }
  }

  function formatStatus(status: string): string {
    return status.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
  }

  function formatPriority(priority: string): string {
    return priority.charAt(0).toUpperCase() + priority.slice(1);
  }

  function openNewTicketModal() {
    showNewTicketModal = true;
  }

  function closeNewTicketModal() {
    showNewTicketModal = false;
    // Reset form
    ticketCategory = '';
    ticketPriority = 'medium';
    ticketSubject = '';
    ticketDescription = '';
  }

  function openTicketDetail(ticket: (typeof data.tickets)[0]) {
    selectedTicket = ticket;
    showTicketDetailModal = true;
    replyMessage = '';
  }

  function closeTicketDetail() {
    showTicketDetailModal = false;
    selectedTicket = null;
    replyMessage = '';
  }

  function toggleFaq(id: string) {
    expandedFaq = expandedFaq === id ? null : id;
  }

  // Handle form success
  $effect(() => {
    if (form?.success) {
      closeNewTicketModal();
      closeTicketDetail();
    }
  });
</script>

<svelte:head>
  <title>Support - Implant Lead Engine</title>
</svelte:head>

<!-- Page Header with New Ticket Button -->
<div class="page-header">
  <div class="page-header-content">
    <h1 class="page-title">Support Center</h1>
    <p class="page-subtitle">Get help, submit tickets, and find answers to common questions</p>
  </div>
  <button class="btn btn-primary" onclick={openNewTicketModal}>
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
    New Ticket
  </button>
</div>

<!-- Stats Row -->
<div class="stats-row">
  <div class="stat-card">
    <div class="stat-card-header">
      <div class="stat-card-icon primary">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
          <polyline points="14 2 14 8 20 8" />
        </svg>
      </div>
    </div>
    <div class="stat-card-label">Open Tickets</div>
    <div class="stat-card-value">{data.openTicketCount}</div>
  </div>

  <div class="stat-card">
    <div class="stat-card-header">
      <div class="stat-card-icon success">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
          <polyline points="22 4 12 14.01 9 11.01" />
        </svg>
      </div>
    </div>
    <div class="stat-card-label">Resolved</div>
    <div class="stat-card-value">{data.tickets.filter((t) => t.status === 'resolved' || t.status === 'closed').length}</div>
  </div>

  <div class="stat-card">
    <div class="stat-card-header">
      <div class="stat-card-icon warning">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
      </div>
    </div>
    <div class="stat-card-label">Avg Response</div>
    <div class="stat-card-value">&lt; 4hrs</div>
  </div>

  {#if data.upcomingReview}
    <div class="stat-card">
      <div class="stat-card-header">
        <div class="stat-card-icon primary">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
        </div>
      </div>
      <div class="stat-card-label">Next Review</div>
      <div class="stat-card-value text-lg">{formatDate(data.upcomingReview.scheduledDate)}</div>
    </div>
  {/if}
</div>

<!-- Main Content Grid -->
<div class="support-grid">
  <!-- Left Column: Tickets Table + FAQ -->
  <div class="support-main">
    <!-- Your Tickets -->
    <div class="card">
      <div class="card-header">
        <div>
          <h2 class="card-title">Your Tickets</h2>
          <p class="card-subtitle">Track and manage your support requests</p>
        </div>
      </div>
      <div class="table-container">
        <table class="table">
          <thead>
            <tr>
              <th>Ticket #</th>
              <th>Subject</th>
              <th>Status</th>
              <th>Priority</th>
              <th>Created</th>
              <th>Last Update</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {#if data.tickets && data.tickets.length > 0}
              {#each data.tickets as ticket}
                <tr>
                  <td>
                    <span class="ticket-number">{ticket.ticketNumber}</span>
                  </td>
                  <td>
                    <div class="ticket-subject">
                      <span class="subject-text">{ticket.subject}</span>
                      <span class="category-label">{ticket.category}</span>
                    </div>
                  </td>
                  <td>
                    <span class="badge {getStatusBadgeClass(ticket.status)}">
                      {formatStatus(ticket.status)}
                    </span>
                  </td>
                  <td>
                    <span class="badge {getPriorityBadgeClass(ticket.priority)}">
                      {formatPriority(ticket.priority)}
                    </span>
                  </td>
                  <td>{formatDate(ticket.createdAt)}</td>
                  <td>{formatDate(ticket.updatedAt)}</td>
                  <td>
                    <div class="quick-actions">
                      <button class="action-btn" title="View Details" onclick={() => openTicketDetail(ticket)}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              {/each}
            {:else}
              <tr>
                <td colspan="7">
                  <div class="empty-state">
                    <div class="empty-state-icon">
                      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                        <polyline points="14 2 14 8 20 8" />
                        <line x1="12" y1="18" x2="12" y2="12" />
                        <line x1="9" y1="15" x2="15" y2="15" />
                      </svg>
                    </div>
                    <h3 class="empty-state-title">No support tickets</h3>
                    <p class="empty-state-description">You haven't submitted any support tickets yet.</p>
                    <button class="btn btn-primary" onclick={openNewTicketModal}>Create Your First Ticket</button>
                  </div>
                </td>
              </tr>
            {/if}
          </tbody>
        </table>
      </div>
    </div>

    <!-- Knowledge Base / FAQ Section -->
    <div class="card">
      <div class="card-header">
        <div>
          <h2 class="card-title">Knowledge Base</h2>
          <p class="card-subtitle">Find answers to frequently asked questions</p>
        </div>
      </div>
      <div class="card-body">
        <div class="faq-list">
          {#each faqItems as item}
            <div class="faq-item {expandedFaq === item.id ? 'expanded' : ''}">
              <button class="faq-question" onclick={() => toggleFaq(item.id)}>
                <span>{item.question}</span>
                <svg
                  class="faq-chevron"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>
              {#if expandedFaq === item.id}
                <div class="faq-answer">
                  <p>{item.answer}</p>
                </div>
              {/if}
            </div>
          {/each}
        </div>

        {#if data.articles && data.articles.length > 0}
          <div class="articles-section">
            <h3 class="articles-title">Popular Articles</h3>
            <div class="articles-list">
              {#each data.articles as article}
                <a href="/support/articles/{article.slug}" class="article-link">
                  <div class="article-info">
                    <span class="article-title">{article.title}</span>
                    <span class="article-category">{article.category}</span>
                  </div>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </a>
              {/each}
            </div>
          </div>
        {/if}
      </div>
    </div>
  </div>

  <!-- Right Column: Contact Info Card -->
  <div class="support-sidebar">
    <!-- Contact Information Card -->
    <div class="card contact-card">
      <div class="card-header">
        <h2 class="card-title">Contact Us</h2>
      </div>
      <div class="card-body">
        <div class="contact-item">
          <div class="contact-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
              <polyline points="22,6 12,13 2,6" />
            </svg>
          </div>
          <div class="contact-details">
            <span class="contact-label">Email Support</span>
            <a href="mailto:support@implantleadengine.com" class="contact-value">support@implantleadengine.com</a>
          </div>
        </div>

        <div class="contact-item">
          <div class="contact-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path
                d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"
              />
            </svg>
          </div>
          <div class="contact-details">
            <span class="contact-label">Phone Support</span>
            <a href="tel:+18005551234" class="contact-value">(800) 555-1234</a>
          </div>
        </div>

        <div class="contact-item">
          <div class="contact-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          </div>
          <div class="contact-details">
            <span class="contact-label">Business Hours</span>
            <span class="contact-value">Mon - Fri: 9 AM - 6 PM EST</span>
          </div>
        </div>

        <div class="contact-divider"></div>

        <div class="emergency-notice">
          <div class="emergency-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path
                d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"
              />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          </div>
          <div class="emergency-text">
            <span class="emergency-title">Urgent Issues?</span>
            <span class="emergency-description">For critical campaign issues, select "Urgent" priority when creating a ticket.</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Upcoming Review Card -->
    {#if data.upcomingReview}
      <div class="card review-card">
        <div class="card-header">
          <h2 class="card-title">Upcoming Review</h2>
        </div>
        <div class="card-body">
          <div class="review-info">
            <div class="review-date">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
              <span>{formatDateTime(data.upcomingReview.scheduledDate)}</span>
            </div>
            <div class="review-type">
              <span class="badge badge-primary">{data.upcomingReview.reviewType.replace(/_/g, ' ')}</span>
            </div>
            {#if data.upcomingReview.meetingLink}
              <a href={data.upcomingReview.meetingLink} target="_blank" rel="noopener noreferrer" class="btn btn-outline btn-sm">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M15 3h6v6" />
                  <path d="M10 14L21 3" />
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                </svg>
                Join Meeting
              </a>
            {/if}
          </div>
        </div>
      </div>
    {/if}
  </div>
</div>

<!-- New Ticket Modal -->
{#if showNewTicketModal}
  <div class="modal-overlay open" onclick={closeNewTicketModal}>
    <div class="modal modal-lg" onclick={(e) => e.stopPropagation()}>
      <div class="modal-header">
        <h2 class="modal-title">Create New Ticket</h2>
        <button class="modal-close" onclick={closeNewTicketModal}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
      <form method="POST" action="?/createTicket" use:enhance>
        <div class="modal-body">
          {#if form?.error}
            <div class="form-error">{form.error}</div>
          {/if}

          <div class="form-row">
            <div class="form-group">
              <label class="form-label" for="category">Category</label>
              <select class="form-input form-select" id="category" name="category" bind:value={ticketCategory} required>
                <option value="">Select a category</option>
                {#each data.categoryOptions as option}
                  <option value={option.value}>{option.name}</option>
                {/each}
              </select>
            </div>

            <div class="form-group">
              <label class="form-label" for="priority">Priority</label>
              <select class="form-input form-select" id="priority" name="priority" bind:value={ticketPriority} required>
                {#each data.priorityOptions as option}
                  <option value={option.value}>{option.name}</option>
                {/each}
              </select>
            </div>
          </div>

          <div class="form-group">
            <label class="form-label" for="subject">Subject</label>
            <input
              type="text"
              class="form-input"
              id="subject"
              name="subject"
              placeholder="Brief summary of your issue"
              bind:value={ticketSubject}
              required
            />
          </div>

          <div class="form-group">
            <label class="form-label" for="description">Description</label>
            <textarea
              class="form-input form-textarea"
              id="description"
              name="description"
              rows="5"
              placeholder="Please describe your issue in detail..."
              bind:value={ticketDescription}
              required
            ></textarea>
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" onclick={closeNewTicketModal}>Cancel</button>
          <button type="submit" class="btn btn-primary">Submit Ticket</button>
        </div>
      </form>
    </div>
  </div>
{/if}

<!-- Ticket Detail Modal -->
{#if showTicketDetailModal && selectedTicket}
  <div class="modal-overlay open" onclick={closeTicketDetail}>
    <div class="modal modal-lg" onclick={(e) => e.stopPropagation()}>
      <div class="modal-header">
        <div>
          <h2 class="modal-title">{selectedTicket.ticketNumber}</h2>
          <p class="modal-subtitle">{selectedTicket.subject}</p>
        </div>
        <button class="modal-close" onclick={closeTicketDetail}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
      <div class="modal-body">
        <div class="ticket-meta">
          <span class="badge {getStatusBadgeClass(selectedTicket.status)}">{formatStatus(selectedTicket.status)}</span>
          <span class="badge {getPriorityBadgeClass(selectedTicket.priority)}">{formatPriority(selectedTicket.priority)}</span>
          <span class="ticket-meta-date">Created {formatDateTime(selectedTicket.createdAt)}</span>
        </div>

        <div class="ticket-description">
          <h4>Description</h4>
          <p>{selectedTicket.description}</p>
        </div>

        {#if selectedTicket.messages && selectedTicket.messages.length > 0}
          <div class="ticket-messages">
            <h4>Conversation</h4>
            <div class="messages-list">
              {#each selectedTicket.messages as message}
                <div class="message {message.sender.isStaff ? 'staff' : 'client'}">
                  <div class="message-header">
                    <span class="message-sender">{message.sender.name}</span>
                    {#if message.sender.isStaff}
                      <span class="badge badge-primary badge-sm">Staff</span>
                    {/if}
                    <span class="message-time">{formatDateTime(message.createdAt)}</span>
                  </div>
                  <div class="message-body">
                    <p>{message.message}</p>
                  </div>
                </div>
              {/each}
            </div>
          </div>
        {/if}

        {#if !['resolved', 'closed'].includes(selectedTicket.status)}
          <form method="POST" action="?/replyToTicket" use:enhance class="reply-form">
            <input type="hidden" name="ticketId" value={selectedTicket.id} />
            <div class="form-group">
              <label class="form-label" for="reply-message">Add Reply</label>
              <textarea
                class="form-input form-textarea"
                id="reply-message"
                name="message"
                rows="3"
                placeholder="Type your reply..."
                bind:value={replyMessage}
                required
              ></textarea>
            </div>
            <button type="submit" class="btn btn-primary">Send Reply</button>
          </form>
        {/if}
      </div>
      <div class="modal-footer">
        {#if !['resolved', 'closed'].includes(selectedTicket.status)}
          <form method="POST" action="?/closeTicket" use:enhance>
            <input type="hidden" name="ticketId" value={selectedTicket.id} />
            <button type="submit" class="btn btn-secondary">Close Ticket</button>
          </form>
        {/if}
        <button type="button" class="btn btn-outline" onclick={closeTicketDetail}>Close</button>
      </div>
    </div>
  </div>
{/if}

<style>
  /* Page Header */
  .page-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: var(--spacing-6);
    flex-wrap: wrap;
    gap: var(--spacing-4);
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

  /* Stats Row */
  .stats-row {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: var(--spacing-6);
    margin-bottom: var(--spacing-6);
  }

  .stat-card-value.text-lg {
    font-size: 1.25rem;
  }

  /* Support Grid Layout */
  .support-grid {
    display: grid;
    grid-template-columns: 1fr 320px;
    gap: var(--spacing-6);
  }

  @media (max-width: 1024px) {
    .support-grid {
      grid-template-columns: 1fr;
    }
  }

  .support-main {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-6);
  }

  .support-sidebar {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-6);
  }

  /* Ticket Table Styles */
  .ticket-number {
    font-family: var(--font-mono);
    font-size: 0.8125rem;
    font-weight: 500;
    color: var(--primary-600);
  }

  .ticket-subject {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-1);
  }

  .subject-text {
    font-weight: 500;
    color: var(--gray-900);
  }

  .category-label {
    font-size: 0.75rem;
    color: var(--gray-500);
    text-transform: capitalize;
  }

  .quick-actions {
    display: flex;
    gap: var(--spacing-2);
  }

  .action-btn {
    width: 32px;
    height: 32px;
    border-radius: var(--radius-md);
    display: flex;
    align-items: center;
    justify-content: center;
    border: 1px solid var(--gray-200);
    background: white;
    color: var(--gray-500);
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .action-btn:hover {
    background: var(--gray-50);
    color: var(--gray-700);
    border-color: var(--gray-300);
  }

  /* FAQ Styles */
  .faq-list {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-2);
  }

  .faq-item {
    border: 1px solid var(--gray-200);
    border-radius: var(--radius-lg);
    overflow: hidden;
  }

  .faq-item.expanded {
    border-color: var(--primary-200);
  }

  .faq-question {
    width: 100%;
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--spacing-4);
    background: white;
    border: none;
    cursor: pointer;
    text-align: left;
    font-size: 0.875rem;
    font-weight: 500;
    color: var(--gray-900);
    transition: background 0.2s ease;
  }

  .faq-question:hover {
    background: var(--gray-50);
  }

  .faq-chevron {
    color: var(--gray-400);
    transition: transform 0.2s ease;
    flex-shrink: 0;
  }

  .faq-item.expanded .faq-chevron {
    transform: rotate(180deg);
  }

  .faq-answer {
    padding: 0 var(--spacing-4) var(--spacing-4);
    font-size: 0.875rem;
    color: var(--gray-600);
    line-height: 1.6;
  }

  /* Articles Section */
  .articles-section {
    margin-top: var(--spacing-6);
    padding-top: var(--spacing-6);
    border-top: 1px solid var(--gray-200);
  }

  .articles-title {
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--gray-900);
    margin-bottom: var(--spacing-4);
  }

  .articles-list {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-2);
  }

  .article-link {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--spacing-3) var(--spacing-4);
    border: 1px solid var(--gray-200);
    border-radius: var(--radius-lg);
    color: var(--gray-700);
    transition: all 0.2s ease;
  }

  .article-link:hover {
    background: var(--gray-50);
    border-color: var(--primary-200);
    color: var(--primary-600);
  }

  .article-info {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .article-title {
    font-weight: 500;
    font-size: 0.875rem;
  }

  .article-category {
    font-size: 0.75rem;
    color: var(--gray-500);
    text-transform: capitalize;
  }

  /* Contact Card Styles */
  .contact-card {
    position: sticky;
    top: calc(var(--header-height) + var(--spacing-6));
  }

  .contact-item {
    display: flex;
    gap: var(--spacing-3);
    padding: var(--spacing-3) 0;
  }

  .contact-item:first-child {
    padding-top: 0;
  }

  .contact-icon {
    width: 40px;
    height: 40px;
    border-radius: var(--radius-lg);
    background: var(--primary-50);
    color: var(--primary-600);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .contact-details {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .contact-label {
    font-size: 0.75rem;
    font-weight: 500;
    color: var(--gray-500);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .contact-value {
    font-size: 0.875rem;
    font-weight: 500;
    color: var(--gray-900);
  }

  a.contact-value:hover {
    color: var(--primary-600);
  }

  .contact-divider {
    height: 1px;
    background: var(--gray-200);
    margin: var(--spacing-4) 0;
  }

  .emergency-notice {
    display: flex;
    gap: var(--spacing-3);
    padding: var(--spacing-3);
    background: var(--warning-50);
    border-radius: var(--radius-lg);
    border: 1px solid var(--warning-100);
  }

  .emergency-icon {
    color: var(--warning-600);
    flex-shrink: 0;
  }

  .emergency-text {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .emergency-title {
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--warning-700);
  }

  .emergency-description {
    font-size: 0.75rem;
    color: var(--warning-600);
  }

  /* Review Card */
  .review-info {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-3);
  }

  .review-date {
    display: flex;
    align-items: center;
    gap: var(--spacing-2);
    font-size: 0.875rem;
    font-weight: 500;
    color: var(--gray-900);
  }

  .review-date svg {
    color: var(--primary-600);
  }

  .review-type {
    display: flex;
  }

  /* Modal Styles */
  .modal-lg {
    max-width: 640px;
  }

  .modal-subtitle {
    font-size: 0.875rem;
    color: var(--gray-500);
    margin-top: var(--spacing-1);
  }

  .form-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--spacing-4);
  }

  @media (max-width: 640px) {
    .form-row {
      grid-template-columns: 1fr;
    }
  }

  .form-textarea {
    resize: vertical;
    min-height: 100px;
  }

  .form-error {
    background: var(--danger-50);
    border: 1px solid var(--danger-100);
    border-radius: var(--radius-lg);
    padding: var(--spacing-3) var(--spacing-4);
    margin-bottom: var(--spacing-4);
    color: var(--danger-600);
    font-size: 0.875rem;
  }

  /* Ticket Detail Modal */
  .ticket-meta {
    display: flex;
    align-items: center;
    gap: var(--spacing-3);
    flex-wrap: wrap;
    margin-bottom: var(--spacing-4);
  }

  .ticket-meta-date {
    font-size: 0.75rem;
    color: var(--gray-500);
  }

  .ticket-description {
    margin-bottom: var(--spacing-6);
  }

  .ticket-description h4,
  .ticket-messages h4 {
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--gray-900);
    margin-bottom: var(--spacing-2);
  }

  .ticket-description p {
    font-size: 0.875rem;
    color: var(--gray-700);
    line-height: 1.6;
    white-space: pre-wrap;
  }

  .ticket-messages {
    margin-bottom: var(--spacing-6);
  }

  .messages-list {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-3);
    max-height: 300px;
    overflow-y: auto;
  }

  .message {
    padding: var(--spacing-3);
    border-radius: var(--radius-lg);
    border: 1px solid var(--gray-200);
  }

  .message.staff {
    background: var(--primary-50);
    border-color: var(--primary-100);
  }

  .message.client {
    background: white;
  }

  .message-header {
    display: flex;
    align-items: center;
    gap: var(--spacing-2);
    margin-bottom: var(--spacing-2);
  }

  .message-sender {
    font-size: 0.875rem;
    font-weight: 500;
    color: var(--gray-900);
  }

  .badge-sm {
    padding: 1px 6px;
    font-size: 0.625rem;
  }

  .message-time {
    font-size: 0.75rem;
    color: var(--gray-500);
    margin-left: auto;
  }

  .message-body p {
    font-size: 0.875rem;
    color: var(--gray-700);
    line-height: 1.5;
  }

  .reply-form {
    padding-top: var(--spacing-4);
    border-top: 1px solid var(--gray-200);
  }

  .reply-form .form-group {
    margin-bottom: var(--spacing-3);
  }
</style>
