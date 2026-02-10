<script lang="ts">
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();

  let activeTab = $state('general');

  function getIntegrationStatusColor(status: string): string {
    return status === 'connected' ? 'badge-success' : 'badge-gray';
  }

  function formatDate(dateStr: string | null): string {
    if (!dateStr) return 'Never';
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  }
</script>

<svelte:head>
  <title>Settings - ILE Operations</title>
</svelte:head>

<div class="page-content">
  <div class="mb-6">
    <h1 class="text-2xl font-bold text-gray-900">Platform Settings</h1>
    <p class="text-gray-500">Manage your platform configuration and integrations.</p>
  </div>

  <!-- Tabs -->
  <div class="tabs">
    <button
      class="tab {activeTab === 'general' ? 'active' : ''}"
      onclick={() => activeTab = 'general'}
    >
      General
    </button>
    <button
      class="tab {activeTab === 'notifications' ? 'active' : ''}"
      onclick={() => activeTab = 'notifications'}
    >
      Notifications
    </button>
    <button
      class="tab {activeTab === 'integrations' ? 'active' : ''}"
      onclick={() => activeTab = 'integrations'}
    >
      Integrations
    </button>
    <button
      class="tab {activeTab === 'team' ? 'active' : ''}"
      onclick={() => activeTab = 'team'}
    >
      Team
    </button>
  </div>

  <!-- General Tab -->
  {#if activeTab === 'general'}
    <div class="card">
      <div class="card-header">
        <h2 class="card-title">General Settings</h2>
      </div>
      <div class="card-body">
        <div class="form-group">
          <label class="form-label">Platform Name</label>
          <input type="text" class="form-input" value={data.settings.general.platformName} style="max-width: 400px;">
        </div>

        <div class="form-group">
          <label class="form-label">Support Email</label>
          <input type="email" class="form-input" value={data.settings.general.supportEmail} style="max-width: 400px;">
        </div>

        <div class="form-group">
          <label class="form-label">Timezone</label>
          <select class="form-input form-select" style="max-width: 400px;">
            <option value="America/New_York" selected={data.settings.general.timezone === 'America/New_York'}>Eastern Time</option>
            <option value="America/Chicago" selected={data.settings.general.timezone === 'America/Chicago'}>Central Time</option>
            <option value="America/Denver" selected={data.settings.general.timezone === 'America/Denver'}>Mountain Time</option>
            <option value="America/Los_Angeles" selected={data.settings.general.timezone === 'America/Los_Angeles'}>Pacific Time</option>
          </select>
        </div>

        <div class="mt-6">
          <button class="btn btn-primary">Save Changes</button>
        </div>
      </div>
    </div>
  {/if}

  <!-- Notifications Tab -->
  {#if activeTab === 'notifications'}
    <div class="card">
      <div class="card-header">
        <h2 class="card-title">Notification Preferences</h2>
      </div>
      <div class="card-body">
        <div class="flex flex-col gap-4">
          <label class="flex items-center justify-between p-4" style="background: var(--gray-50); border-radius: var(--radius-lg);">
            <div>
              <div class="font-medium text-gray-900">Email Alerts</div>
              <div class="text-sm text-gray-500">Receive email notifications for important events</div>
            </div>
            <input type="checkbox" checked={data.settings.notifications.emailAlerts} style="width: 20px; height: 20px; accent-color: var(--primary-600);">
          </label>

          <label class="flex items-center justify-between p-4" style="background: var(--gray-50); border-radius: var(--radius-lg);">
            <div>
              <div class="font-medium text-gray-900">Slack Integration</div>
              <div class="text-sm text-gray-500">Send notifications to Slack channels</div>
            </div>
            <input type="checkbox" checked={data.settings.notifications.slackIntegration} style="width: 20px; height: 20px; accent-color: var(--primary-600);">
          </label>

          <label class="flex items-center justify-between p-4" style="background: var(--gray-50); border-radius: var(--radius-lg);">
            <div>
              <div class="font-medium text-gray-900">Daily Digest</div>
              <div class="text-sm text-gray-500">Receive a daily summary of platform activity</div>
            </div>
            <input type="checkbox" checked={data.settings.notifications.dailyDigest} style="width: 20px; height: 20px; accent-color: var(--primary-600);">
          </label>

          <label class="flex items-center justify-between p-4" style="background: var(--gray-50); border-radius: var(--radius-lg);">
            <div>
              <div class="font-medium text-gray-900">Weekly Report</div>
              <div class="text-sm text-gray-500">Receive weekly performance reports</div>
            </div>
            <input type="checkbox" checked={data.settings.notifications.weeklyReport} style="width: 20px; height: 20px; accent-color: var(--primary-600);">
          </label>
        </div>

        <div class="mt-6">
          <button class="btn btn-primary">Save Changes</button>
        </div>
      </div>
    </div>
  {/if}

  <!-- Integrations Tab -->
  {#if activeTab === 'integrations'}
    <div class="card">
      <div class="card-header">
        <h2 class="card-title">Integrations</h2>
      </div>
      <div class="card-body">
        <div class="grid grid-cols-2">
          {#each data.settings.integrations as integration}
            <div class="card" style="border: 1px solid var(--gray-200);">
              <div class="card-body">
                <div class="flex justify-between items-start mb-4">
                  <div>
                    <h3 class="font-semibold text-gray-900">{integration.name}</h3>
                    <p class="text-sm text-gray-500">
                      Last sync: {formatDate(integration.lastSync)}
                    </p>
                  </div>
                  <span class="badge {getIntegrationStatusColor(integration.status)}">
                    {integration.status === 'connected' ? 'Connected' : 'Not Connected'}
                  </span>
                </div>
                <button class="btn btn-sm {integration.status === 'connected' ? 'btn-outline' : 'btn-primary'}">
                  {integration.status === 'connected' ? 'Configure' : 'Connect'}
                </button>
              </div>
            </div>
          {/each}
        </div>
      </div>
    </div>
  {/if}

  <!-- Team Tab -->
  {#if activeTab === 'team'}
    <div class="card">
      <div class="card-header">
        <h2 class="card-title">Team Members</h2>
        <button class="btn btn-primary btn-sm">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="12" y1="5" x2="12" y2="19"/>
            <line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Invite Member
        </button>
      </div>
      <div class="card-body">
        <div class="empty-state">
          <div class="empty-state-icon">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
          </div>
          <h3 class="empty-state-title">Manage team access</h3>
          <p class="empty-state-description">Invite team members to help manage the platform.</p>
          <button class="btn btn-primary">Invite First Member</button>
        </div>
      </div>
    </div>
  {/if}
</div>
