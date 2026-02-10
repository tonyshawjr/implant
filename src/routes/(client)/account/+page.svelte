<script lang="ts">
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();

  let activeTab = $state('profile');
</script>

<svelte:head>
  <title>Account - Implant Lead Engine</title>
</svelte:head>

<div class="page-content">
  <div class="mb-6">
    <h1 class="text-2xl font-bold text-gray-900">Account Settings</h1>
    <p class="text-gray-500">Manage your profile, team, and preferences.</p>
  </div>

  <!-- Tabs -->
  <div class="tabs">
    <button
      class="tab {activeTab === 'profile' ? 'active' : ''}"
      onclick={() => activeTab = 'profile'}
    >
      Profile
    </button>
    <button
      class="tab {activeTab === 'team' ? 'active' : ''}"
      onclick={() => activeTab = 'team'}
    >
      Team
    </button>
    <button
      class="tab {activeTab === 'security' ? 'active' : ''}"
      onclick={() => activeTab = 'security'}
    >
      Security
    </button>
    <button
      class="tab {activeTab === 'notifications' ? 'active' : ''}"
      onclick={() => activeTab = 'notifications'}
    >
      Notifications
    </button>
  </div>

  <!-- Profile Tab -->
  {#if activeTab === 'profile'}
    <div class="grid grid-cols-3">
      <div class="card" style="grid-column: span 2;">
        <div class="card-header">
          <h2 class="card-title">Profile Information</h2>
        </div>
        <div class="card-body">
          <div class="grid grid-cols-2 gap-4">
            <div class="form-group">
              <label class="form-label">First Name</label>
              <input type="text" class="form-input" value={data.user?.firstName || ''}>
            </div>
            <div class="form-group">
              <label class="form-label">Last Name</label>
              <input type="text" class="form-input" value={data.user?.lastName || ''}>
            </div>
            <div class="form-group">
              <label class="form-label">Email Address</label>
              <input type="email" class="form-input" value={data.user?.email || ''}>
            </div>
            <div class="form-group">
              <label class="form-label">Phone Number</label>
              <input type="tel" class="form-input" value={data.user?.phone || ''}>
            </div>
          </div>

          <div class="mt-6">
            <button class="btn btn-primary">Save Changes</button>
          </div>
        </div>
      </div>

      <div class="card">
        <div class="card-header">
          <h2 class="card-title">Practice Info</h2>
        </div>
        <div class="card-body">
          <div class="form-group">
            <label class="form-label">Practice Name</label>
            <input type="text" class="form-input" value={data.organization?.name || ''}>
          </div>
          <div class="form-group">
            <label class="form-label">Website</label>
            <input type="url" class="form-input" value={data.organization?.website || ''}>
          </div>
          <div class="form-group">
            <label class="form-label">Address</label>
            <textarea class="form-input" rows="2">{data.organization?.address || ''}</textarea>
          </div>

          <div class="mt-4">
            <button class="btn btn-outline w-full">Update Practice Info</button>
          </div>
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
      <div class="table-container">
        <table class="table">
          <thead>
            <tr>
              <th>Member</th>
              <th>Role</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {#if data.teamMembers && data.teamMembers.length > 0}
              {#each data.teamMembers as member}
                <tr>
                  <td>
                    <div class="flex items-center gap-3">
                      <div class="avatar" style="background: var(--primary-100); color: var(--primary-600);">
                        {member.firstName?.charAt(0) || 'U'}
                      </div>
                      <div>
                        <div class="font-medium">{member.firstName} {member.lastName}</div>
                        <div class="text-sm text-gray-500">{member.email}</div>
                      </div>
                    </div>
                  </td>
                  <td><span class="badge badge-gray">{member.role}</span></td>
                  <td><span class="badge badge-success">Active</span></td>
                  <td>
                    <button class="btn btn-sm btn-outline">Edit</button>
                  </td>
                </tr>
              {/each}
            {:else}
              <tr>
                <td colspan="4" class="text-center text-gray-500 py-8">No team members yet</td>
              </tr>
            {/if}
          </tbody>
        </table>
      </div>
    </div>
  {/if}

  <!-- Security Tab -->
  {#if activeTab === 'security'}
    <div class="card">
      <div class="card-header">
        <h2 class="card-title">Security Settings</h2>
      </div>
      <div class="card-body">
        <div class="form-group">
          <label class="form-label">Current Password</label>
          <input type="password" class="form-input" style="max-width: 400px;">
        </div>
        <div class="form-group">
          <label class="form-label">New Password</label>
          <input type="password" class="form-input" style="max-width: 400px;">
        </div>
        <div class="form-group">
          <label class="form-label">Confirm New Password</label>
          <input type="password" class="form-input" style="max-width: 400px;">
        </div>

        <div class="mt-6">
          <button class="btn btn-primary">Update Password</button>
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
              <div class="font-medium text-gray-900">New Lead Alerts</div>
              <div class="text-sm text-gray-500">Get notified when a new lead comes in</div>
            </div>
            <input type="checkbox" checked style="width: 20px; height: 20px; accent-color: var(--primary-600);">
          </label>

          <label class="flex items-center justify-between p-4" style="background: var(--gray-50); border-radius: var(--radius-lg);">
            <div>
              <div class="font-medium text-gray-900">Weekly Report</div>
              <div class="text-sm text-gray-500">Receive a weekly summary of campaign performance</div>
            </div>
            <input type="checkbox" checked style="width: 20px; height: 20px; accent-color: var(--primary-600);">
          </label>

          <label class="flex items-center justify-between p-4" style="background: var(--gray-50); border-radius: var(--radius-lg);">
            <div>
              <div class="font-medium text-gray-900">Billing Notifications</div>
              <div class="text-sm text-gray-500">Get notified about invoices and payment updates</div>
            </div>
            <input type="checkbox" checked style="width: 20px; height: 20px; accent-color: var(--primary-600);">
          </label>
        </div>

        <div class="mt-6">
          <button class="btn btn-primary">Save Preferences</button>
        </div>
      </div>
    </div>
  {/if}
</div>
