<script lang="ts">
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();

  let activeTab = $state(data.activeTab || 'general');
  let showInviteModal = $state(false);

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

  function formatRelativeTime(dateStr: string): string {
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
    return `${firstName[0]}${lastName[0]}`.toUpperCase();
  }

  function closeInviteModal() {
    showInviteModal = false;
    inviteEmail = '';
    inviteFirstName = '';
    inviteLastName = '';
    inviteRole = 'support';
  }
</script>

<svelte:head>
  <title>Settings - SqueezMedia Operations</title>
</svelte:head>

<!-- Page Header -->
<div class="mb-6">
  <h1 class="text-2xl font-bold text-gray-900">Platform Settings</h1>
  <p class="text-gray-500">Manage your platform configuration, integrations, and team.</p>
</div>

<!-- Tabs -->
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
    General
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
    Notifications
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
    Integrations
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
    Team
  </button>
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
            </div>
          {/if}

          <div class="integration-actions">
            {#if integration.status === 'connected'}
              <button class="btn btn-sm btn-outline">Configure</button>
              <form method="POST" action="?/disconnectIntegration" style="display: inline;">
                <input type="hidden" name="integrationId" value={integration.id}>
                <button type="submit" class="btn btn-sm btn-danger">Disconnect</button>
              </form>
            {:else}
              <form method="POST" action="?/connectIntegration">
                <input type="hidden" name="integrationId" value={integration.id}>
                <button type="submit" class="btn btn-sm btn-primary">Connect</button>
              </form>
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
    <div class="card-header">
      <div>
        <h2 class="card-title">Team Members</h2>
        <p class="card-subtitle">Manage internal staff access to the platform</p>
      </div>
      <button class="btn btn-primary btn-sm" onclick={() => showInviteModal = true}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="12" y1="5" x2="12" y2="19"/>
          <line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
        Invite Member
      </button>
    </div>
    <div class="table-container">
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
                  <button class="btn btn-sm btn-outline" title="Edit">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                    </svg>
                  </button>
                  {#if member.role !== 'super_admin'}
                    <form method="POST" action="?/removeTeamMember" style="display: inline;">
                      <input type="hidden" name="memberId" value={member.id}>
                      <button type="submit" class="btn btn-sm btn-outline" title="Remove">
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
  </div>

  <!-- API Keys Section -->
  <div class="card mt-6">
    <div class="card-header">
      <div>
        <h2 class="card-title">API Keys</h2>
        <p class="card-subtitle">Manage API access for external integrations</p>
      </div>
      <button class="btn btn-primary btn-sm">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="12" y1="5" x2="12" y2="19"/>
          <line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
        Generate Key
      </button>
    </div>
    <div class="table-container">
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
      <form method="POST" action="?/inviteTeamMember">
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
          <button type="button" class="btn btn-secondary" onclick={closeInviteModal}>Cancel</button>
          <button type="submit" class="btn btn-primary">Send Invitation</button>
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
</style>
