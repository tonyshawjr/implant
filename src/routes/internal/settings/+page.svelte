<script lang="ts">
  import type { PageData, ActionData } from './$types';
  import { enhance } from '$app/forms';
  import { invalidateAll } from '$app/navigation';

  let { data, form }: { data: PageData; form: ActionData } = $props();

  let activeTab = $state(data.activeTab || 'general');
  let showInviteModal = $state(false);
  let showEditModal = $state(false);
  let showCredentialsModal = $state(false);
  let showIntegrationModal = $state(false);
  let selectedIntegration = $state<any>(null);
  let integrationModalMode = $state<'connect' | 'configure'>('connect');
  let newUserCredentials = $state<{ email: string; password: string; name: string } | null>(null);
  let editingMember = $state<any>(null);
  let isSubmitting = $state(false);
  let feedbackMessage = $state<{ type: 'success' | 'error'; text: string } | null>(null);
  let copiedField = $state<string | null>(null);

  // Watch for form results
  $effect(() => {
    if (form?.success) {
      // Check if we have credentials to show (new user created)
      if (form.showCredentials && form.credentials) {
        newUserCredentials = form.credentials;
        showCredentialsModal = true;
        showInviteModal = false;
      } else {
        feedbackMessage = { type: 'success', text: form.message || 'Operation successful' };
        showInviteModal = false;
        showEditModal = false;
        setTimeout(() => feedbackMessage = null, 3000);
      }
    } else if (form?.message) {
      feedbackMessage = { type: 'error', text: form.message };
      setTimeout(() => feedbackMessage = null, 5000);
    }
  });

  async function copyToClipboard(text: string, field: string) {
    await navigator.clipboard.writeText(text);
    copiedField = field;
    setTimeout(() => copiedField = null, 2000);
  }

  function closeCredentialsModal() {
    showCredentialsModal = false;
    newUserCredentials = null;
    feedbackMessage = { type: 'success', text: 'Team member created successfully' };
    setTimeout(() => feedbackMessage = null, 3000);
  }

  // Form state for general settings
  let companyName = $state(data.platformSettings.companyName);
  let platformName = $state(data.platformSettings.platformName);
  let supportEmail = $state(data.platformSettings.supportEmail);
  let billingEmail = $state(data.platformSettings.billingEmail);
  let defaultTimezone = $state(data.platformSettings.defaultTimezone);
  let maintenanceMode = $state(data.platformSettings.maintenanceMode);

  // Form state for notification settings
  let emailNotifications = $state(data.notificationSettings.emailNotifications);
  let smsNotifications = $state(data.notificationSettings.smsNotifications);
  let slackIntegration = $state(data.notificationSettings.slackIntegration);
  let slackChannel = $state(data.notificationSettings.slackChannel);
  let notifyOnNewLead = $state(data.notificationSettings.notifyOnNewLead);
  let notifyOnNewClient = $state(data.notificationSettings.notifyOnNewClient);
  let notifyOnChurnRisk = $state(data.notificationSettings.notifyOnChurnRisk);
  let notifyOnPaymentFailed = $state(data.notificationSettings.notifyOnPaymentFailed);
  let notifyOnTicketCreated = $state(data.notificationSettings.notifyOnTicketCreated);
  let notifyOnAnomalyDetected = $state(data.notificationSettings.notifyOnAnomalyDetected);
  let dailyDigest = $state(data.notificationSettings.dailyDigest);
  let weeklyReport = $state(data.notificationSettings.weeklyReport);

  // Invite form state
  let inviteEmail = $state('');
  let inviteFirstName = $state('');
  let inviteLastName = $state('');
  let inviteRole = $state('support');

  // Default pricing config
  const defaultPricingConfig = {
    scoring: {
      senior: { weight: 30, thresholds: [{ min: 20, points: 30 }, { min: 15, points: 25 }, { min: 12, points: 20 }, { min: 8, points: 15 }, { min: 0, points: 10 }] },
      income: { weight: 25, thresholds: [{ min: 100000, points: 25 }, { min: 75000, points: 20 }, { min: 55000, points: 15 }, { min: 40000, points: 10 }, { min: 0, points: 5 }] },
      population: { weight: 25, thresholds: [{ min: 500000, points: 25 }, { min: 250000, points: 20 }, { min: 100000, points: 15 }, { min: 50000, points: 10 }, { min: 0, points: 5 }] },
      homeValue: { weight: 20, thresholds: [{ min: 500000, points: 20 }, { min: 350000, points: 16 }, { min: 250000, points: 12 }, { min: 150000, points: 8 }, { min: 0, points: 4 }] }
    },
    priceTiers: [
      { minScore: 80, price: 3500, label: 'Premium' },
      { minScore: 65, price: 2750, label: 'High' },
      { minScore: 50, price: 2000, label: 'Standard' },
      { minScore: 35, price: 1500, label: 'Moderate' },
      { minScore: 0, price: 1000, label: 'Entry' }
    ]
  };

  // Pricing config state - use data if available, otherwise use defaults
  let pricingConfig = $state(data.pricingConfig || defaultPricingConfig);
  let priceTiers = $state((data.pricingConfig?.priceTiers || defaultPricingConfig.priceTiers));

  function getIntegrationStatusClass(status: string): string {
    return status === 'connected' ? 'badge-success' : 'badge-gray';
  }

  function formatDate(dateStr: string | null): string {
    if (!dateStr) return 'Never';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  function formatRelativeTime(dateStr: string | null): string {
    if (!dateStr) return 'Never';
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  }

  function getRoleLabel(role: string): string {
    const labels: Record<string, string> = {
      'super_admin': 'Super Admin',
      'admin': 'Admin',
      'support': 'Support'
    };
    return labels[role] || role;
  }

  function getRoleBadgeClass(role: string): string {
    const classes: Record<string, string> = {
      'super_admin': 'badge-primary',
      'admin': 'badge-success',
      'support': 'badge-gray'
    };
    return classes[role] || 'badge-gray';
  }

  function getInitials(firstName: string, lastName: string): string {
    const first = firstName?.[0] || '?';
    const last = lastName?.[0] || '?';
    return `${first}${last}`.toUpperCase();
  }

  function closeInviteModal() {
    showInviteModal = false;
    inviteEmail = '';
    inviteFirstName = '';
    inviteLastName = '';
    inviteRole = 'support';
  }

  function openEditModal(member: any) {
    editingMember = { ...member };
    showEditModal = true;
  }

  function closeEditModal() {
    showEditModal = false;
    editingMember = null;
  }

  function openIntegrationModal(integration: any, mode: 'connect' | 'configure') {
    selectedIntegration = integration;
    integrationModalMode = mode;
    showIntegrationModal = true;
  }

  function closeIntegrationModal() {
    showIntegrationModal = false;
    selectedIntegration = null;
  }

  function getFieldsForIntegration(integrationId: string) {
    return data.integrationFields?.[integrationId] || [];
  }

  function handleFormSubmit() {
    isSubmitting = true;
    return async ({ result, update }: any) => {
      isSubmitting = false;
      if (result.type === 'success') {
        await invalidateAll();
      }
      await update();
    };
  }
</script>

<svelte:head>
  <title>Settings - SqueezMedia Operations</title>
</svelte:head>

<!-- Feedback Message -->
{#if feedbackMessage}
  <div class="feedback-message {feedbackMessage.type === 'success' ? 'success' : 'error'}">
    <span>{feedbackMessage.text}</span>
    <button onclick={() => feedbackMessage = null} class="close-btn">×</button>
  </div>
{/if}

<!-- Page Header -->
<div class="mb-6">
  <h1 class="text-2xl font-bold text-gray-900">Platform Settings</h1>
  <p class="text-gray-500">Manage your platform configuration, integrations, and team.</p>
</div>

<!-- Tabs -->
<div class="tabs-wrapper">
  <div class="tabs">
    <button
      class="tab"
      class:active={activeTab === 'general'}
      onclick={() => activeTab = 'general'}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="3"/>
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
      </svg>
      <span class="tab-label">General</span>
    </button>
    <button
      class="tab"
      class:active={activeTab === 'notifications'}
      onclick={() => activeTab = 'notifications'}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
        <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
      </svg>
      <span class="tab-label">Notifications</span>
    </button>
    <button
      class="tab"
      class:active={activeTab === 'integrations'}
      onclick={() => activeTab = 'integrations'}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M16 16v1a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h2m5.66 0H14a2 2 0 0 1 2 2v3.34"/>
        <path d="M23 11v-1a2 2 0 0 0-2-2h-2"/>
        <path d="M11 15l1.34-1.34"/>
        <path d="M14 18V9"/>
        <path d="M18 14h-9"/>
      </svg>
      <span class="tab-label">Integrations</span>
    </button>
    <button
      class="tab"
      class:active={activeTab === 'team'}
      onclick={() => activeTab = 'team'}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
        <circle cx="9" cy="7" r="4"/>
        <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
        <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
      </svg>
      <span class="tab-label">Team</span>
    </button>
    <button
      class="tab"
      class:active={activeTab === 'pricing'}
      onclick={() => activeTab = 'pricing'}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <line x1="12" y1="1" x2="12" y2="23"/>
        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
      </svg>
      <span class="tab-label">Pricing</span>
    </button>
  </div>
</div>

<!-- General Tab -->
{#if activeTab === 'general'}
  <div class="settings-grid">
    <div class="card">
      <div class="card-header">
        <h2 class="card-title">Platform Information</h2>
      </div>
      <div class="card-body">
        <form method="POST" action="?/updatePlatformSettings">
          <div class="form-group">
            <label class="form-label" for="companyName">Company Name</label>
            <input
              type="text"
              id="companyName"
              name="companyName"
              class="form-input"
              bind:value={companyName}
            >
          </div>

          <div class="form-group">
            <label class="form-label" for="platformName">Platform Name</label>
            <input
              type="text"
              id="platformName"
              name="platformName"
              class="form-input"
              bind:value={platformName}
            >
          </div>

          <div class="form-group">
            <label class="form-label" for="supportEmail">Support Email</label>
            <input
              type="email"
              id="supportEmail"
              name="supportEmail"
              class="form-input"
              bind:value={supportEmail}
            >
          </div>

          <div class="form-group">
            <label class="form-label" for="billingEmail">Billing Email</label>
            <input
              type="email"
              id="billingEmail"
              name="billingEmail"
              class="form-input"
              bind:value={billingEmail}
            >
          </div>

          <div class="form-group">
            <label class="form-label" for="timezone">Default Timezone</label>
            <select
              id="timezone"
              name="defaultTimezone"
              class="form-input form-select"
              bind:value={defaultTimezone}
            >
              <option value="America/New_York">Eastern Time (ET)</option>
              <option value="America/Chicago">Central Time (CT)</option>
              <option value="America/Denver">Mountain Time (MT)</option>
              <option value="America/Los_Angeles">Pacific Time (PT)</option>
            </select>
          </div>

          <div class="mt-6">
            <button type="submit" class="btn btn-primary">Save Changes</button>
          </div>
        </form>
      </div>
    </div>

    <div class="card">
      <div class="card-header">
        <h2 class="card-title">System Configuration</h2>
      </div>
      <div class="card-body">
        <div class="config-item">
          <div class="config-info">
            <div class="config-label">Default Currency</div>
            <div class="config-value">USD ($)</div>
          </div>
        </div>

        <div class="config-item">
          <div class="config-info">
            <div class="config-label">Max Territories per Client</div>
            <div class="config-value">{data.platformSettings.maxTerritoriesPerClient}</div>
          </div>
        </div>

        <div class="config-item">
          <div class="config-info">
            <div class="config-label">Default Trial Period</div>
            <div class="config-value">{data.platformSettings.defaultTrialDays} days</div>
          </div>
        </div>

        <div class="config-item">
          <div class="config-info">
            <div class="config-label">Maintenance Mode</div>
            <div class="config-description">Temporarily disable access for maintenance</div>
          </div>
          <label class="toggle">
            <input type="checkbox" bind:checked={maintenanceMode}>
            <span class="toggle-slider"></span>
          </label>
        </div>

        <div class="config-item">
          <div class="config-info">
            <div class="config-label">Debug Mode</div>
            <div class="config-description">Enable verbose logging for troubleshooting</div>
          </div>
          <label class="toggle">
            <input type="checkbox" checked={data.platformSettings.debugMode}>
            <span class="toggle-slider"></span>
          </label>
        </div>
      </div>
    </div>
  </div>
{/if}

<!-- Notifications Tab -->
{#if activeTab === 'notifications'}
  <div class="settings-grid">
    <div class="card">
      <div class="card-header">
        <h2 class="card-title">Notification Channels</h2>
      </div>
      <div class="card-body">
        <div class="notification-item">
          <div class="notification-info">
            <div class="notification-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                <polyline points="22,6 12,13 2,6"/>
              </svg>
            </div>
            <div>
              <div class="notification-label">Email Notifications</div>
              <div class="notification-description">Receive notifications via email</div>
            </div>
          </div>
          <label class="toggle">
            <input type="checkbox" bind:checked={emailNotifications}>
            <span class="toggle-slider"></span>
          </label>
        </div>

        <div class="notification-item">
          <div class="notification-info">
            <div class="notification-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
              </svg>
            </div>
            <div>
              <div class="notification-label">SMS Notifications</div>
              <div class="notification-description">Receive urgent alerts via SMS</div>
            </div>
          </div>
          <label class="toggle">
            <input type="checkbox" bind:checked={smsNotifications}>
            <span class="toggle-slider"></span>
          </label>
        </div>

        <div class="notification-item">
          <div class="notification-info">
            <div class="notification-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>
              </svg>
            </div>
            <div>
              <div class="notification-label">Slack Integration</div>
              <div class="notification-description">Send alerts to Slack channel: {slackChannel}</div>
            </div>
          </div>
          <label class="toggle">
            <input type="checkbox" bind:checked={slackIntegration}>
            <span class="toggle-slider"></span>
          </label>
        </div>
      </div>
    </div>

    <div class="card">
      <div class="card-header">
        <h2 class="card-title">Alert Preferences</h2>
      </div>
      <div class="card-body">
        <div class="notification-item">
          <div class="notification-info">
            <div>
              <div class="notification-label">New Lead Received</div>
              <div class="notification-description">Alert when a new lead comes in</div>
            </div>
          </div>
          <label class="toggle">
            <input type="checkbox" bind:checked={notifyOnNewLead}>
            <span class="toggle-slider"></span>
          </label>
        </div>

        <div class="notification-item">
          <div class="notification-info">
            <div>
              <div class="notification-label">New Client Signup</div>
              <div class="notification-description">Alert when a new client signs up</div>
            </div>
          </div>
          <label class="toggle">
            <input type="checkbox" bind:checked={notifyOnNewClient}>
            <span class="toggle-slider"></span>
          </label>
        </div>

        <div class="notification-item">
          <div class="notification-info">
            <div>
              <div class="notification-label">Churn Risk Detected</div>
              <div class="notification-description">Alert when a client health score drops</div>
            </div>
          </div>
          <label class="toggle">
            <input type="checkbox" bind:checked={notifyOnChurnRisk}>
            <span class="toggle-slider"></span>
          </label>
        </div>

        <div class="notification-item">
          <div class="notification-info">
            <div>
              <div class="notification-label">Payment Failed</div>
              <div class="notification-description">Alert when a payment fails</div>
            </div>
          </div>
          <label class="toggle">
            <input type="checkbox" bind:checked={notifyOnPaymentFailed}>
            <span class="toggle-slider"></span>
          </label>
        </div>

        <div class="notification-item">
          <div class="notification-info">
            <div>
              <div class="notification-label">Support Ticket Created</div>
              <div class="notification-description">Alert when a new ticket is created</div>
            </div>
          </div>
          <label class="toggle">
            <input type="checkbox" bind:checked={notifyOnTicketCreated}>
            <span class="toggle-slider"></span>
          </label>
        </div>

        <div class="notification-item">
          <div class="notification-info">
            <div>
              <div class="notification-label">AI Anomaly Detected</div>
              <div class="notification-description">Alert when AI detects a campaign anomaly</div>
            </div>
          </div>
          <label class="toggle">
            <input type="checkbox" bind:checked={notifyOnAnomalyDetected}>
            <span class="toggle-slider"></span>
          </label>
        </div>
      </div>
    </div>

    <div class="card">
      <div class="card-header">
        <h2 class="card-title">Scheduled Reports</h2>
      </div>
      <div class="card-body">
        <div class="notification-item">
          <div class="notification-info">
            <div>
              <div class="notification-label">Daily Digest</div>
              <div class="notification-description">Summary of daily platform activity at 8am</div>
            </div>
          </div>
          <label class="toggle">
            <input type="checkbox" bind:checked={dailyDigest}>
            <span class="toggle-slider"></span>
          </label>
        </div>

        <div class="notification-item">
          <div class="notification-info">
            <div>
              <div class="notification-label">Weekly Report</div>
              <div class="notification-description">Performance report every Monday morning</div>
            </div>
          </div>
          <label class="toggle">
            <input type="checkbox" bind:checked={weeklyReport}>
            <span class="toggle-slider"></span>
          </label>
        </div>

        <div class="mt-6">
          <button type="button" class="btn btn-primary">Save Notification Settings</button>
        </div>
      </div>
    </div>
  </div>
{/if}

<!-- Integrations Tab -->
{#if activeTab === 'integrations'}
  <div class="integration-grid">
    {#each data.integrations as integration}
      <div class="card integration-card">
        <div class="card-body">
          <div class="integration-header">
            <div class="integration-icon">
              {#if integration.icon === 'credit-card'}
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/>
                  <line x1="1" y1="10" x2="23" y2="10"/>
                </svg>
              {:else if integration.icon === 'phone'}
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
                </svg>
              {:else if integration.icon === 'megaphone'}
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M3 11l18-5v12L3 13v-2z"/>
                  <path d="M11.6 16.8a3 3 0 1 1-5.8-1.6"/>
                </svg>
              {:else if integration.icon === 'search'}
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="11" cy="11" r="8"/>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"/>
                </svg>
              {:else if integration.icon === 'map'}
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/>
                  <line x1="8" y1="2" x2="8" y2="18"/>
                  <line x1="16" y1="6" x2="16" y2="22"/>
                </svg>
              {:else if integration.icon === 'calendar'}
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                  <line x1="16" y1="2" x2="16" y2="6"/>
                  <line x1="8" y1="2" x2="8" y2="6"/>
                  <line x1="3" y1="10" x2="21" y2="10"/>
                </svg>
              {:else if integration.icon === 'chat'}
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>
                </svg>
              {:else if integration.icon === 'sparkles'}
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M12 2L15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2z"/>
                </svg>
              {:else if integration.icon === 'mail'}
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                  <polyline points="22,6 12,13 2,6"/>
                </svg>
              {:else}
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="10"/>
                </svg>
              {/if}
            </div>
            <span class="badge {getIntegrationStatusClass(integration.status)}">
              {integration.status === 'connected' ? 'Connected' : 'Not Connected'}
            </span>
          </div>

          <h3 class="integration-name">{integration.name}</h3>
          <p class="integration-description">{integration.description}</p>

          {#if integration.status === 'connected'}
            <div class="integration-meta">
              <span class="text-xs text-gray-500">Last sync: {formatDate(integration.lastSync)}</span>
              {#if integration.apiKeyMasked}
                <span class="text-xs text-gray-500">Key: <code class="api-key-mini">{integration.apiKeyMasked}</code></span>
              {/if}
            </div>
          {/if}

          <div class="integration-actions">
            {#if integration.status === 'connected'}
              <button
                class="btn btn-sm btn-outline"
                onclick={() => openIntegrationModal(integration, 'configure')}
              >
                Configure
              </button>
              <form method="POST" action="?/disconnectIntegration" style="display: inline;" use:enhance={handleFormSubmit}>
                <input type="hidden" name="integrationId" value={integration.id}>
                <button type="submit" class="btn btn-sm btn-danger" disabled={isSubmitting}>Disconnect</button>
              </form>
            {:else}
              <button
                class="btn btn-sm btn-primary"
                onclick={() => openIntegrationModal(integration, 'connect')}
              >
                Connect
              </button>
            {/if}
          </div>
        </div>
      </div>
    {/each}
  </div>
{/if}

<!-- Team Tab -->
{#if activeTab === 'team'}
  <div class="card">
    <div class="card-header card-header-mobile">
      <div>
        <h2 class="card-title">Team Members</h2>
        <p class="card-subtitle">Manage internal staff access to the platform</p>
      </div>
      <button class="btn btn-primary btn-sm" onclick={() => showInviteModal = true}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="12" y1="5" x2="12" y2="19"/>
          <line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
        <span class="btn-text">Invite Member</span>
      </button>
    </div>

    <!-- Desktop Table -->
    <div class="table-container desktop-table">
      <table class="table">
        <thead>
          <tr>
            <th>Member</th>
            <th>Role</th>
            <th>Status</th>
            <th>Last Login</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {#each data.teamMembers as member}
            <tr>
              <td>
                <div class="member-cell">
                  <div class="member-avatar">{getInitials(member.firstName, member.lastName)}</div>
                  <div class="member-info">
                    <div class="member-name">{member.firstName} {member.lastName}</div>
                    <div class="member-email">{member.email}</div>
                  </div>
                </div>
              </td>
              <td>
                <span class="badge {getRoleBadgeClass(member.role)}">
                  {getRoleLabel(member.role)}
                </span>
              </td>
              <td>
                <span class="status-indicator">
                  <span class="status-dot {member.status === 'active' ? 'green' : 'gray'}"></span>
                  {member.status === 'active' ? 'Active' : 'Inactive'}
                </span>
              </td>
              <td class="text-sm text-gray-500">
                {formatRelativeTime(member.lastLogin)}
              </td>
              <td>
                <div class="table-actions">
                  <button class="btn btn-sm btn-outline" title="Edit" onclick={() => openEditModal(member)}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                    </svg>
                  </button>
                  {#if member.role !== 'super_admin'}
                    <form method="POST" action="?/removeTeamMember" style="display: inline;" use:enhance={handleFormSubmit}>
                      <input type="hidden" name="memberId" value={member.id}>
                      <button type="submit" class="btn btn-sm btn-outline btn-danger-outline" title="Remove" disabled={isSubmitting}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <polyline points="3 6 5 6 21 6"/>
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                        </svg>
                      </button>
                    </form>
                  {/if}
                </div>
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>

    <!-- Mobile Card List -->
    <div class="mobile-card-list">
      {#each data.teamMembers as member}
        <div class="mobile-card-item team-member-card">
          <div class="mobile-card-header">
            <div class="member-cell">
              <div class="member-avatar">{getInitials(member.firstName, member.lastName)}</div>
              <div class="member-info">
                <div class="member-name">{member.firstName} {member.lastName}</div>
                <div class="member-email">{member.email}</div>
              </div>
            </div>
          </div>
          <div class="mobile-card-content">
            <div class="mobile-card-row">
              <span class="mobile-card-label">Role</span>
              <span class="badge {getRoleBadgeClass(member.role)}">
                {getRoleLabel(member.role)}
              </span>
            </div>
            <div class="mobile-card-row">
              <span class="mobile-card-label">Status</span>
              <span class="status-indicator">
                <span class="status-dot {member.status === 'active' ? 'green' : 'gray'}"></span>
                {member.status === 'active' ? 'Active' : 'Inactive'}
              </span>
            </div>
            <div class="mobile-card-row">
              <span class="mobile-card-label">Last Login</span>
              <span class="text-sm text-gray-500">{formatRelativeTime(member.lastLogin)}</span>
            </div>
          </div>
          <div class="mobile-card-actions">
            <button class="btn btn-sm btn-outline" onclick={() => openEditModal(member)}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
              Edit
            </button>
            {#if member.role !== 'super_admin'}
              <form method="POST" action="?/removeTeamMember" style="flex: 1;" use:enhance={handleFormSubmit}>
                <input type="hidden" name="memberId" value={member.id}>
                <button type="submit" class="btn btn-sm btn-outline btn-danger-outline" style="width: 100%;" disabled={isSubmitting}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="3 6 5 6 21 6"/>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                  </svg>
                  Remove
                </button>
              </form>
            {/if}
          </div>
        </div>
      {/each}
    </div>
  </div>

  <!-- API Keys Section -->
  <div class="card mt-6">
    <div class="card-header card-header-mobile">
      <div>
        <h2 class="card-title">API Keys</h2>
        <p class="card-subtitle">Manage API access for external integrations</p>
      </div>
      <button class="btn btn-primary btn-sm">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="12" y1="5" x2="12" y2="19"/>
          <line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
        <span class="btn-text">Generate Key</span>
      </button>
    </div>

    <!-- Desktop Table -->
    <div class="table-container desktop-table">
      <table class="table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Key</th>
            <th>Created</th>
            <th>Last Used</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {#each data.apiKeys as apiKey}
            <tr>
              <td class="font-medium">{apiKey.name}</td>
              <td>
                <code class="api-key-code">{apiKey.key}</code>
              </td>
              <td class="text-sm text-gray-500">{formatDate(apiKey.createdAt)}</td>
              <td class="text-sm text-gray-500">{formatDate(apiKey.lastUsed)}</td>
              <td>
                <form method="POST" action="?/revokeApiKey" style="display: inline;">
                  <input type="hidden" name="keyId" value={apiKey.id}>
                  <button type="submit" class="btn btn-sm btn-danger">Revoke</button>
                </form>
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>

    <!-- Mobile Card List -->
    <div class="mobile-card-list">
      {#each data.apiKeys as apiKey}
        <div class="mobile-card-item api-key-card">
          <div class="mobile-card-header">
            <span class="api-key-name">{apiKey.name}</span>
          </div>
          <div class="mobile-card-content">
            <div class="mobile-card-row">
              <span class="mobile-card-label">Key</span>
              <code class="api-key-code">{apiKey.key}</code>
            </div>
            <div class="mobile-card-row">
              <span class="mobile-card-label">Created</span>
              <span class="text-sm text-gray-500">{formatDate(apiKey.createdAt)}</span>
            </div>
            <div class="mobile-card-row">
              <span class="mobile-card-label">Last Used</span>
              <span class="text-sm text-gray-500">{formatDate(apiKey.lastUsed)}</span>
            </div>
          </div>
          <div class="mobile-card-actions">
            <form method="POST" action="?/revokeApiKey" style="width: 100%;">
              <input type="hidden" name="keyId" value={apiKey.id}>
              <button type="submit" class="btn btn-sm btn-danger" style="width: 100%;">Revoke</button>
            </form>
          </div>
        </div>
      {/each}
    </div>
  </div>
{/if}

<!-- Pricing Tab -->
{#if activeTab === 'pricing'}
  <div class="settings-grid">
    <div class="card">
      <div class="card-header">
        <h2 class="card-title">Territory Pricing Tiers</h2>
        <p class="card-subtitle">Set pricing based on market score</p>
      </div>
      <div class="card-body">
        <form method="POST" action="?/updatePricingConfig" use:enhance={handleFormSubmit}>
          <input type="hidden" name="pricingConfig" value={JSON.stringify(pricingConfig)}>

          <div class="pricing-tiers">
            {#each priceTiers as tier, index}
              <div class="pricing-tier-row">
                <div class="tier-score">
                  <label class="form-label">Min Score</label>
                  <input
                    type="number"
                    class="form-input form-input-sm"
                    bind:value={tier.minScore}
                    min="0"
                    max="100"
                    onchange={() => pricingConfig = { ...pricingConfig, priceTiers }}
                  >
                </div>
                <div class="tier-price">
                  <label class="form-label">Price</label>
                  <div class="input-with-prefix">
                    <span class="input-prefix">$</span>
                    <input
                      type="number"
                      class="form-input form-input-sm"
                      bind:value={tier.price}
                      min="0"
                      step="50"
                      onchange={() => pricingConfig = { ...pricingConfig, priceTiers }}
                    >
                  </div>
                </div>
                <div class="tier-label">
                  <label class="form-label">Label</label>
                  <input
                    type="text"
                    class="form-input form-input-sm"
                    bind:value={tier.label}
                    onchange={() => pricingConfig = { ...pricingConfig, priceTiers }}
                  >
                </div>
              </div>
            {/each}
          </div>

          <div class="pricing-preview">
            <h4 class="preview-title">Preview</h4>
            <div class="preview-tiers">
              {#each priceTiers.sort((a, b) => b.minScore - a.minScore) as tier}
                <div class="preview-tier">
                  <span class="preview-score">Score {tier.minScore}+</span>
                  <span class="preview-label">{tier.label}</span>
                  <span class="preview-price">${tier.price.toLocaleString()}/mo</span>
                </div>
              {/each}
            </div>
          </div>

          <div class="mt-6">
            <button type="submit" class="btn btn-primary" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save Pricing Configuration'}
            </button>
          </div>
        </form>
      </div>
    </div>

    <div class="card">
      <div class="card-header">
        <h2 class="card-title">Scoring Factors</h2>
        <p class="card-subtitle">How market scores are calculated</p>
      </div>
      <div class="card-body">
        <div class="scoring-factors">
          <div class="scoring-factor">
            <div class="factor-header">
              <span class="factor-name">65+ Population %</span>
              <span class="factor-weight">{pricingConfig.scoring?.senior?.weight || 30} pts max</span>
            </div>
            <p class="factor-description">Primary implant demographic - higher senior population = more potential patients</p>
          </div>

          <div class="scoring-factor">
            <div class="factor-header">
              <span class="factor-name">Median Household Income</span>
              <span class="factor-weight">{pricingConfig.scoring?.income?.weight || 25} pts max</span>
            </div>
            <p class="factor-description">Ability to pay for implant procedures (typically $3,000-$5,000+)</p>
          </div>

          <div class="scoring-factor">
            <div class="factor-header">
              <span class="factor-name">Population Size</span>
              <span class="factor-weight">{pricingConfig.scoring?.population?.weight || 25} pts max</span>
            </div>
            <p class="factor-description">Total market size - larger population = more lead potential</p>
          </div>

          <div class="scoring-factor">
            <div class="factor-header">
              <span class="factor-name">Median Home Value</span>
              <span class="factor-weight">{pricingConfig.scoring?.homeValue?.weight || 20} pts max</span>
            </div>
            <p class="factor-description">Wealth indicator - homeowners tend to have more disposable income</p>
          </div>
        </div>

        <div class="scoring-total">
          <span>Maximum Score</span>
          <span>100 pts</span>
        </div>
      </div>
    </div>
  </div>
{/if}

<!-- Invite Modal -->
{#if showInviteModal}
  <div class="modal-overlay open" onclick={closeInviteModal}>
    <div class="modal" onclick={(e) => e.stopPropagation()}>
      <div class="modal-header">
        <h3 class="modal-title">Invite Team Member</h3>
        <button class="modal-close" onclick={closeInviteModal}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>
      <form method="POST" action="?/inviteTeamMember" use:enhance={handleFormSubmit}>
        <div class="modal-body">
          <div class="form-group">
            <label class="form-label" for="inviteFirstName">First Name</label>
            <input
              type="text"
              id="inviteFirstName"
              name="firstName"
              class="form-input"
              bind:value={inviteFirstName}
              placeholder="John"
            >
          </div>

          <div class="form-group">
            <label class="form-label" for="inviteLastName">Last Name</label>
            <input
              type="text"
              id="inviteLastName"
              name="lastName"
              class="form-input"
              bind:value={inviteLastName}
              placeholder="Doe"
            >
          </div>

          <div class="form-group">
            <label class="form-label" for="inviteEmail">Email Address</label>
            <input
              type="email"
              id="inviteEmail"
              name="email"
              class="form-input"
              bind:value={inviteEmail}
              placeholder="john@squeezmedia.com"
              required
            >
          </div>

          <div class="form-group">
            <label class="form-label" for="inviteRole">Role</label>
            <select
              id="inviteRole"
              name="role"
              class="form-input form-select"
              bind:value={inviteRole}
            >
              <option value="support">Support</option>
              <option value="admin">Admin</option>
              <option value="super_admin">Super Admin</option>
            </select>
            <p class="form-help">
              {#if inviteRole === 'support'}
                Can view data and manage support tickets
              {:else if inviteRole === 'admin'}
                Full access to most operations
              {:else}
                Complete platform access including settings
              {/if}
            </p>
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" onclick={closeInviteModal} disabled={isSubmitting}>Cancel</button>
          <button type="submit" class="btn btn-primary" disabled={isSubmitting}>
            {isSubmitting ? 'Creating...' : 'Create Team Member'}
          </button>
        </div>
      </form>
    </div>
  </div>
{/if}

<!-- New User Credentials Modal -->
{#if showCredentialsModal && newUserCredentials}
  <div class="modal-overlay open" onclick={closeCredentialsModal}>
    <div class="modal credentials-modal" onclick={(e) => e.stopPropagation()}>
      <div class="modal-header success-header">
        <div class="success-icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
            <polyline points="22 4 12 14.01 9 11.01"/>
          </svg>
        </div>
        <h3 class="modal-title">Team Member Created!</h3>
      </div>
      <div class="modal-body">
        <p class="credentials-intro">Share these login credentials with <strong>{newUserCredentials.name}</strong>:</p>

        <div class="credential-row">
          <label>Email</label>
          <div class="credential-value">
            <code>{newUserCredentials.email}</code>
            <button
              type="button"
              class="copy-btn"
              onclick={() => copyToClipboard(newUserCredentials!.email, 'email')}
            >
              {copiedField === 'email' ? 'Copied!' : 'Copy'}
            </button>
          </div>
        </div>

        <div class="credential-row">
          <label>Temporary Password</label>
          <div class="credential-value">
            <code class="password">{newUserCredentials.password}</code>
            <button
              type="button"
              class="copy-btn"
              onclick={() => copyToClipboard(newUserCredentials!.password, 'password')}
            >
              {copiedField === 'password' ? 'Copied!' : 'Copy'}
            </button>
          </div>
        </div>

        <button
          type="button"
          class="copy-all-btn"
          onclick={() => copyToClipboard(`Email: ${newUserCredentials!.email}\nPassword: ${newUserCredentials!.password}`, 'all')}
        >
          {copiedField === 'all' ? 'Copied!' : 'Copy All Credentials'}
        </button>

        <p class="credentials-note">
          <strong>Note:</strong> The user should change their password after first login.
        </p>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-primary" onclick={closeCredentialsModal}>Done</button>
      </div>
    </div>
  </div>
{/if}

<!-- Integration Configuration Modal -->
{#if showIntegrationModal && selectedIntegration}
  <div class="modal-overlay open" onclick={closeIntegrationModal}>
    <div class="modal integration-modal" onclick={(e) => e.stopPropagation()}>
      <div class="modal-header">
        <div class="modal-header-content">
          <div class="integration-modal-icon">
            {#if selectedIntegration.icon === 'credit-card'}
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/>
                <line x1="1" y1="10" x2="23" y2="10"/>
              </svg>
            {:else if selectedIntegration.icon === 'phone'}
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
              </svg>
            {:else if selectedIntegration.icon === 'mail'}
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                <polyline points="22,6 12,13 2,6"/>
              </svg>
            {:else if selectedIntegration.icon === 'sparkles'}
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 2L15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2z"/>
              </svg>
            {:else}
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/>
              </svg>
            {/if}
          </div>
          <div>
            <h3 class="modal-title">
              {integrationModalMode === 'connect' ? 'Connect' : 'Configure'} {selectedIntegration.name}
            </h3>
            <p class="modal-subtitle">{selectedIntegration.description}</p>
          </div>
        </div>
        <button class="modal-close" onclick={closeIntegrationModal}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>
      <form
        method="POST"
        action={integrationModalMode === 'connect' ? '?/connectIntegration' : '?/configureIntegration'}
        use:enhance={handleFormSubmit}
      >
        <input type="hidden" name="integrationId" value={selectedIntegration.id}>
        <div class="modal-body">
          {#if integrationModalMode === 'configure' && selectedIntegration.apiKeyMasked}
            <div class="current-config-notice">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="16" x2="12" y2="12"/>
                <line x1="12" y1="8" x2="12.01" y2="8"/>
              </svg>
              <span>Current key: <code>{selectedIntegration.apiKeyMasked}</code>. Enter new credentials to update.</span>
            </div>
          {/if}

          {#each getFieldsForIntegration(selectedIntegration.id) as field}
            <div class="form-group">
              <label class="form-label" for={`field-${field.key}`}>
                {field.label}
                {#if field.required && integrationModalMode === 'connect'}
                  <span class="required-star">*</span>
                {/if}
              </label>

              {#if field.type === 'select' && field.options}
                <select
                  id={`field-${field.key}`}
                  name={field.key}
                  class="form-input form-select"
                  required={field.required && integrationModalMode === 'connect'}
                >
                  <option value="">Select an option</option>
                  {#each field.options as option}
                    <option value={option.value}>{option.label}</option>
                  {/each}
                </select>
              {:else}
                <input
                  type={field.type === 'password' ? 'password' : field.type === 'number' ? 'number' : field.type === 'email' ? 'email' : 'text'}
                  id={`field-${field.key}`}
                  name={field.key}
                  class="form-input"
                  placeholder={field.placeholder || ''}
                  required={field.required && integrationModalMode === 'connect'}
                  autocomplete={field.type === 'password' ? 'new-password' : 'off'}
                >
              {/if}

              {#if field.helpText}
                <p class="form-help">{field.helpText}</p>
              {/if}
            </div>
          {/each}

          {#if integrationModalMode === 'configure'}
            <p class="form-note">
              Leave fields blank to keep current values. Only filled fields will be updated.
            </p>
          {/if}
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" onclick={closeIntegrationModal} disabled={isSubmitting}>
            Cancel
          </button>
          <button type="submit" class="btn btn-primary" disabled={isSubmitting}>
            {#if isSubmitting}
              {integrationModalMode === 'connect' ? 'Connecting...' : 'Saving...'}
            {:else}
              {integrationModalMode === 'connect' ? 'Connect' : 'Save Changes'}
            {/if}
          </button>
        </div>
      </form>
    </div>
  </div>
{/if}

<!-- Edit Member Modal -->
{#if showEditModal && editingMember}
  <div class="modal-overlay open" onclick={closeEditModal}>
    <div class="modal" onclick={(e) => e.stopPropagation()}>
      <div class="modal-header">
        <h3 class="modal-title">Edit Team Member</h3>
        <button class="modal-close" onclick={closeEditModal}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>
      <form method="POST" action="?/updateTeamMember" use:enhance={handleFormSubmit}>
        <input type="hidden" name="memberId" value={editingMember.id}>
        <div class="modal-body">
          <div class="form-group">
            <label class="form-label" for="editFirstName">First Name</label>
            <input
              type="text"
              id="editFirstName"
              name="firstName"
              class="form-input"
              bind:value={editingMember.firstName}
            >
          </div>

          <div class="form-group">
            <label class="form-label" for="editLastName">Last Name</label>
            <input
              type="text"
              id="editLastName"
              name="lastName"
              class="form-input"
              bind:value={editingMember.lastName}
            >
          </div>

          <div class="form-group">
            <label class="form-label" for="editEmail">Email Address</label>
            <input
              type="email"
              id="editEmail"
              class="form-input"
              value={editingMember.email}
              disabled
            >
            <p class="form-help">Email cannot be changed</p>
          </div>

          <div class="form-group">
            <label class="form-label" for="editRole">Role</label>
            <select
              id="editRole"
              name="role"
              class="form-input form-select"
              bind:value={editingMember.role}
            >
              <option value="support">Support</option>
              <option value="admin">Admin</option>
              <option value="super_admin">Super Admin</option>
            </select>
          </div>

          <div class="form-group">
            <label class="form-label" for="editStatus">Status</label>
            <select
              id="editStatus"
              name="status"
              class="form-input form-select"
              bind:value={editingMember.status}
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" onclick={closeEditModal} disabled={isSubmitting}>Cancel</button>
          <button type="submit" class="btn btn-primary" disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  </div>
{/if}

<style>
  .settings-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: var(--spacing-6);
  }

  @media (max-width: 1024px) {
    .settings-grid {
      grid-template-columns: 1fr;
    }
  }

  .tab {
    display: flex;
    align-items: center;
    gap: var(--spacing-2);
  }

  .config-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--spacing-4);
    background: var(--gray-50);
    border-radius: var(--radius-lg);
    margin-bottom: var(--spacing-3);
  }

  .config-item:last-child {
    margin-bottom: 0;
  }

  .config-info {
    flex: 1;
  }

  .config-label {
    font-weight: 500;
    color: var(--gray-900);
  }

  .config-value {
    font-size: 0.875rem;
    color: var(--gray-500);
  }

  .config-description {
    font-size: 0.75rem;
    color: var(--gray-500);
    margin-top: 2px;
  }

  /* Toggle Switch */
  .toggle {
    position: relative;
    display: inline-block;
    width: 44px;
    height: 24px;
    flex-shrink: 0;
  }

  .toggle input {
    opacity: 0;
    width: 0;
    height: 0;
  }

  .toggle-slider {
    position: absolute;
    cursor: pointer;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: var(--gray-300);
    transition: 0.3s;
    border-radius: var(--radius-full);
  }

  .toggle-slider:before {
    position: absolute;
    content: "";
    height: 18px;
    width: 18px;
    left: 3px;
    bottom: 3px;
    background-color: white;
    transition: 0.3s;
    border-radius: 50%;
  }

  .toggle input:checked + .toggle-slider {
    background-color: var(--primary-600);
  }

  .toggle input:checked + .toggle-slider:before {
    transform: translateX(20px);
  }

  /* Notification Items */
  .notification-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--spacing-4);
    background: var(--gray-50);
    border-radius: var(--radius-lg);
    margin-bottom: var(--spacing-3);
  }

  .notification-item:last-child {
    margin-bottom: 0;
  }

  .notification-info {
    display: flex;
    align-items: center;
    gap: var(--spacing-3);
    flex: 1;
  }

  .notification-icon {
    width: 40px;
    height: 40px;
    border-radius: var(--radius-lg);
    background: white;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--gray-600);
    border: 1px solid var(--gray-200);
    flex-shrink: 0;
  }

  .notification-label {
    font-weight: 500;
    color: var(--gray-900);
  }

  .notification-description {
    font-size: 0.75rem;
    color: var(--gray-500);
    margin-top: 2px;
  }

  /* Integration Cards */
  .integration-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: var(--spacing-4);
  }

  @media (max-width: 1200px) {
    .integration-grid {
      grid-template-columns: repeat(2, 1fr);
    }
  }

  @media (max-width: 640px) {
    .integration-grid {
      grid-template-columns: 1fr;
    }
  }

  .integration-card .card-body {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-2);
  }

  .integration-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    margin-bottom: var(--spacing-2);
  }

  .integration-icon {
    width: 48px;
    height: 48px;
    border-radius: var(--radius-lg);
    background: var(--gray-100);
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--gray-600);
  }

  .integration-name {
    font-size: 1rem;
    font-weight: 600;
    color: var(--gray-900);
  }

  .integration-description {
    font-size: 0.8125rem;
    color: var(--gray-500);
    line-height: 1.4;
    flex: 1;
  }

  .integration-meta {
    margin-top: var(--spacing-2);
  }

  .integration-actions {
    display: flex;
    gap: var(--spacing-2);
    margin-top: var(--spacing-3);
    padding-top: var(--spacing-3);
    border-top: 1px solid var(--gray-100);
  }

  /* Team Members */
  .member-cell {
    display: flex;
    align-items: center;
    gap: var(--spacing-3);
  }

  .member-avatar {
    width: 36px;
    height: 36px;
    border-radius: var(--radius-full);
    background: var(--primary-100);
    color: var(--primary-700);
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 600;
    font-size: 0.8125rem;
    flex-shrink: 0;
  }

  .member-info {
    display: flex;
    flex-direction: column;
  }

  .member-name {
    font-weight: 500;
    color: var(--gray-900);
  }

  .member-email {
    font-size: 0.75rem;
    color: var(--gray-500);
  }

  /* API Key */
  .api-key-code {
    font-family: var(--font-mono);
    font-size: 0.75rem;
    background: var(--gray-100);
    padding: var(--spacing-1) var(--spacing-2);
    border-radius: var(--radius-md);
    color: var(--gray-700);
  }

  /* Form Help */
  .form-help {
    font-size: 0.75rem;
    color: var(--gray-500);
    margin-top: var(--spacing-1);
  }

  .mt-6 {
    margin-top: var(--spacing-6);
  }

  /* Feedback Message */
  .feedback-message {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--spacing-3) var(--spacing-4);
    border-radius: var(--radius-lg);
    margin-bottom: var(--spacing-4);
    font-size: 0.875rem;
  }

  .feedback-message.success {
    background: var(--success-100, #dcfce7);
    color: var(--success-800, #166534);
    border: 1px solid var(--success-200, #bbf7d0);
  }

  .feedback-message.error {
    background: var(--danger-100, #fee2e2);
    color: var(--danger-800, #991b1b);
    border: 1px solid var(--danger-200, #fecaca);
  }

  .feedback-message .close-btn {
    background: none;
    border: none;
    font-size: 1.25rem;
    cursor: pointer;
    color: inherit;
    opacity: 0.7;
    padding: 0;
    line-height: 1;
  }

  .feedback-message .close-btn:hover {
    opacity: 1;
  }

  /* Danger outline button */
  .btn-danger-outline {
    color: var(--danger-600, #dc2626);
    border-color: var(--danger-300, #fca5a5);
  }

  .btn-danger-outline:hover {
    background: var(--danger-50, #fef2f2);
    border-color: var(--danger-400, #f87171);
  }

  /* Credentials Modal */
  .credentials-modal {
    max-width: 480px;
  }

  .success-header {
    background: var(--success-50, #f0fdf4);
    border-bottom: 1px solid var(--success-200, #bbf7d0);
    display: flex;
    align-items: center;
    gap: var(--spacing-3);
  }

  .success-icon {
    width: 40px;
    height: 40px;
    border-radius: var(--radius-full);
    background: var(--success-100, #dcfce7);
    color: var(--success-600, #16a34a);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .credentials-intro {
    margin-bottom: var(--spacing-4);
    color: var(--gray-600);
  }

  .credential-row {
    margin-bottom: var(--spacing-4);
  }

  .credential-row label {
    display: block;
    font-size: 0.75rem;
    font-weight: 600;
    color: var(--gray-500);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin-bottom: var(--spacing-1);
  }

  .credential-value {
    display: flex;
    align-items: center;
    gap: var(--spacing-2);
    background: var(--gray-100);
    border-radius: var(--radius-lg);
    padding: var(--spacing-3);
  }

  .credential-value code {
    flex: 1;
    font-family: var(--font-mono, monospace);
    font-size: 0.9375rem;
    color: var(--gray-900);
    background: none;
  }

  .credential-value code.password {
    font-weight: 600;
    color: var(--primary-700);
  }

  .copy-btn {
    padding: var(--spacing-1) var(--spacing-3);
    font-size: 0.75rem;
    font-weight: 600;
    color: var(--primary-600);
    background: white;
    border: 1px solid var(--primary-200);
    border-radius: var(--radius-md);
    cursor: pointer;
    transition: all 0.15s;
  }

  .copy-btn:hover {
    background: var(--primary-50);
    border-color: var(--primary-300);
  }

  .copy-all-btn {
    width: 100%;
    padding: var(--spacing-3);
    font-size: 0.875rem;
    font-weight: 600;
    color: white;
    background: var(--primary-600);
    border: none;
    border-radius: var(--radius-lg);
    cursor: pointer;
    margin-top: var(--spacing-2);
    transition: background 0.15s;
  }

  .copy-all-btn:hover {
    background: var(--primary-700);
  }

  .credentials-note {
    margin-top: var(--spacing-4);
    padding: var(--spacing-3);
    background: var(--warning-50, #fffbeb);
    border: 1px solid var(--warning-200, #fde68a);
    border-radius: var(--radius-lg);
    font-size: 0.8125rem;
    color: var(--warning-800, #92400e);
  }

  /* Integration Modal Styles */
  .integration-modal {
    max-width: 520px;
  }

  .modal-header-content {
    display: flex;
    align-items: flex-start;
    gap: var(--spacing-3);
  }

  .integration-modal-icon {
    width: 48px;
    height: 48px;
    border-radius: var(--radius-lg);
    background: var(--primary-100);
    color: var(--primary-600);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .modal-subtitle {
    font-size: 0.8125rem;
    color: var(--gray-500);
    margin-top: 2px;
  }

  .current-config-notice {
    display: flex;
    align-items: flex-start;
    gap: var(--spacing-2);
    padding: var(--spacing-3);
    background: var(--primary-50, #eff6ff);
    border: 1px solid var(--primary-200, #bfdbfe);
    border-radius: var(--radius-lg);
    font-size: 0.8125rem;
    color: var(--primary-800, #1e40af);
    margin-bottom: var(--spacing-4);
  }

  .current-config-notice svg {
    flex-shrink: 0;
    margin-top: 2px;
  }

  .current-config-notice code {
    font-family: var(--font-mono, monospace);
    font-size: 0.75rem;
    background: white;
    padding: 2px 6px;
    border-radius: var(--radius-sm);
    color: var(--primary-700);
  }

  .required-star {
    color: var(--danger-500, #ef4444);
    margin-left: 2px;
  }

  .form-note {
    font-size: 0.75rem;
    color: var(--gray-500);
    margin-top: var(--spacing-4);
    padding-top: var(--spacing-3);
    border-top: 1px solid var(--gray-100);
    font-style: italic;
  }

  .api-key-mini {
    font-family: var(--font-mono, monospace);
    font-size: 0.6875rem;
    background: var(--gray-200);
    padding: 1px 4px;
    border-radius: var(--radius-sm);
    color: var(--gray-600);
  }

  .integration-meta {
    display: flex;
    flex-direction: column;
    gap: 4px;
    margin-top: var(--spacing-2);
  }

  /* Mobile Tabs Wrapper */
  .tabs-wrapper {
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
    margin: 0 calc(-1 * var(--spacing-4));
    padding: 0 var(--spacing-4);
    scrollbar-width: none;
    -ms-overflow-style: none;
  }

  .tabs-wrapper::-webkit-scrollbar {
    display: none;
  }

  /* Mobile Card List */
  .mobile-card-list {
    display: none;
  }

  .desktop-table {
    display: block;
  }

  @media (max-width: 768px) {
    .mobile-card-list {
      display: flex;
      flex-direction: column;
      gap: var(--spacing-3);
      padding: var(--spacing-4);
    }

    .desktop-table {
      display: none;
    }

    .tabs-wrapper {
      margin-bottom: var(--spacing-4);
    }

    .tabs {
      display: flex;
      gap: var(--spacing-1);
      min-width: max-content;
    }

    .tab {
      padding: var(--spacing-2) var(--spacing-3);
      white-space: nowrap;
      min-height: 44px;
    }

    .tab-label {
      display: inline;
    }

    /* Card header mobile adjustments */
    .card-header-mobile {
      flex-direction: column;
      align-items: stretch;
      gap: var(--spacing-3);
    }

    .card-header-mobile .btn {
      width: 100%;
      justify-content: center;
      min-height: 44px;
    }

    /* Mobile card item */
    .mobile-card-item {
      background: white;
      border: 1px solid var(--gray-200);
      border-radius: var(--radius-lg);
      padding: var(--spacing-4);
    }

    .mobile-card-header {
      margin-bottom: var(--spacing-3);
    }

    .mobile-card-content {
      display: flex;
      flex-direction: column;
      gap: var(--spacing-3);
      margin-bottom: var(--spacing-4);
      padding-top: var(--spacing-3);
      border-top: 1px solid var(--gray-100);
    }

    .mobile-card-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .mobile-card-label {
      font-size: 0.75rem;
      font-weight: 500;
      color: var(--gray-500);
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .mobile-card-actions {
      display: flex;
      gap: var(--spacing-2);
      padding-top: var(--spacing-3);
      border-top: 1px solid var(--gray-100);
    }

    .mobile-card-actions .btn {
      flex: 1;
      justify-content: center;
      min-height: 44px;
    }

    /* Team member card */
    .team-member-card .member-cell {
      width: 100%;
    }

    .team-member-card .member-avatar {
      width: 44px;
      height: 44px;
      font-size: 0.9375rem;
    }

    .team-member-card .member-name {
      font-size: 1rem;
    }

    .team-member-card .member-email {
      font-size: 0.8125rem;
    }

    /* API key card */
    .api-key-name {
      font-weight: 600;
      font-size: 1rem;
      color: var(--gray-900);
    }

    .api-key-card .api-key-code {
      font-size: 0.6875rem;
      max-width: 140px;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    /* Settings grid for notifications */
    .settings-grid {
      gap: var(--spacing-4);
    }

    .notification-item {
      flex-direction: column;
      align-items: flex-start;
      gap: var(--spacing-3);
    }

    .notification-info {
      width: 100%;
    }

    /* Config items */
    .config-item {
      flex-direction: column;
      align-items: flex-start;
      gap: var(--spacing-3);
    }

    /* Integration cards */
    .integration-card .card-body {
      padding: var(--spacing-4);
    }

    .integration-actions {
      flex-direction: column;
    }

    .integration-actions .btn {
      width: 100%;
      justify-content: center;
      min-height: 44px;
    }

    /* Modals */
    .modal {
      width: calc(100% - var(--spacing-8));
      max-width: none;
      max-height: calc(100vh - var(--spacing-8));
      margin: var(--spacing-4);
    }

    .modal-body {
      max-height: calc(100vh - 200px);
      overflow-y: auto;
    }

    .modal-footer {
      flex-direction: column;
      gap: var(--spacing-2);
    }

    .modal-footer .btn {
      width: 100%;
      min-height: 44px;
    }

    /* Credentials modal */
    .credentials-modal {
      max-width: none;
    }

    .credential-value {
      flex-direction: column;
      align-items: stretch;
      gap: var(--spacing-2);
    }

    .credential-value code {
      word-break: break-all;
    }

    .copy-btn {
      width: 100%;
      padding: var(--spacing-2);
    }

    /* Integration modal */
    .integration-modal {
      max-width: none;
    }

    .modal-header-content {
      flex-direction: column;
    }
  }

  /* Small screen tab adjustments */
  @media (max-width: 480px) {
    .tab {
      padding: var(--spacing-2);
    }

    .tab svg {
      width: 20px;
      height: 20px;
    }

    .tab-label {
      font-size: 0.8125rem;
    }
  }

  /* Pricing Tab Styles */
  .pricing-tiers {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-4);
  }

  .pricing-tier-row {
    display: grid;
    grid-template-columns: 120px 150px 1fr;
    gap: var(--spacing-4);
    align-items: end;
    padding: var(--spacing-4);
    background: var(--gray-50);
    border-radius: var(--radius-lg);
  }

  .tier-score,
  .tier-price,
  .tier-label {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-1);
  }

  .form-input-sm {
    padding: var(--spacing-2) var(--spacing-3);
    font-size: 0.875rem;
  }

  .pricing-preview {
    margin-top: var(--spacing-6);
    padding-top: var(--spacing-6);
    border-top: 1px solid var(--gray-200);
  }

  .preview-title {
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--gray-700);
    margin-bottom: var(--spacing-3);
  }

  .preview-tiers {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-2);
  }

  .preview-tier {
    display: flex;
    align-items: center;
    gap: var(--spacing-4);
    padding: var(--spacing-3);
    background: var(--gray-50);
    border-radius: var(--radius-md);
  }

  .preview-score {
    font-size: 0.8125rem;
    color: var(--gray-500);
    min-width: 80px;
  }

  .preview-label {
    flex: 1;
    font-weight: 500;
    color: var(--gray-900);
  }

  .preview-price {
    font-weight: 600;
    color: var(--primary-600);
  }

  .scoring-factors {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-4);
  }

  .scoring-factor {
    padding: var(--spacing-4);
    background: var(--gray-50);
    border-radius: var(--radius-lg);
  }

  .factor-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: var(--spacing-2);
  }

  .factor-name {
    font-weight: 600;
    color: var(--gray-900);
  }

  .factor-weight {
    font-size: 0.875rem;
    font-weight: 500;
    color: var(--primary-600);
    background: var(--primary-50);
    padding: 2px 8px;
    border-radius: var(--radius-full);
  }

  .factor-description {
    font-size: 0.8125rem;
    color: var(--gray-600);
    margin: 0;
  }

  .scoring-total {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: var(--spacing-4);
    padding-top: var(--spacing-4);
    border-top: 1px solid var(--gray-200);
    font-weight: 600;
    color: var(--gray-900);
  }

  @media (max-width: 768px) {
    .pricing-tier-row {
      grid-template-columns: 1fr;
      gap: var(--spacing-3);
    }
  }
</style>
