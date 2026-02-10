<script lang="ts">
  import type { PageData, ActionData } from './$types';
  import { enhance } from '$app/forms';

  let { data, form }: { data: PageData; form: ActionData } = $props();

  // Tab state
  let activeTab = $state('profile');

  // Form state for profile
  let profileFirstName = $state(data.profile?.firstName || '');
  let profileLastName = $state(data.profile?.lastName || '');
  let profilePhone = $state(data.profile?.phone || '');

  // Form state for organization
  let orgName = $state(data.organization?.name || '');
  let orgPhone = $state(data.organization?.phone || '');
  let orgEmail = $state(data.organization?.email || '');
  let orgWebsite = $state(data.organization?.website || '');
  let orgAddressLine1 = $state(data.organization?.addressLine1 || '');
  let orgAddressLine2 = $state(data.organization?.addressLine2 || '');
  let orgCity = $state(data.organization?.city || '');
  let orgState = $state(data.organization?.state || '');
  let orgPostalCode = $state(data.organization?.postalCode || '');
  let orgTimezone = $state(data.organization?.timezone || 'America/New_York');

  // Password form state
  let currentPassword = $state('');
  let newPassword = $state('');
  let confirmPassword = $state('');

  // Team invite modal state
  let showInviteModal = $state(false);
  let inviteFirstName = $state('');
  let inviteLastName = $state('');
  let inviteEmail = $state('');
  let inviteRole = $state('client_staff');

  // Remove member modal state
  let showRemoveModal = $state(false);
  let memberToRemove = $state<{ id: string; firstName: string; lastName: string } | null>(null);

  // Notification preferences state
  let notificationPrefs = $state(
    data.notificationPreferences?.preferences || []
  );
  let quietHoursEnabled = $state(data.notificationPreferences?.quietHoursEnabled || false);
  let quietHoursStart = $state(data.notificationPreferences?.quietHoursStart || '22:00');
  let quietHoursEnd = $state(data.notificationPreferences?.quietHoursEnd || '08:00');

  // Phone verification state
  let notificationPhone = $state(data.notificationPreferences?.phoneNumber || '');
  let verificationCode = $state('');
  let showVerificationInput = $state(false);

  // Loading states
  let isProfileSaving = $state(false);
  let isOrgSaving = $state(false);
  let isPasswordSaving = $state(false);
  let isInviting = $state(false);
  let isRemoving = $state(false);
  let isPreferencesSaving = $state(false);
  let isSendingVerification = $state(false);
  let isVerifyingPhone = $state(false);
  let isSendingTestEmail = $state(false);
  let isSendingTestSms = $state(false);

  // Toast state
  let toastMessage = $state('');
  let toastType = $state<'success' | 'error'>('success');
  let showToast = $state(false);

  function displayToast(message: string, type: 'success' | 'error') {
    toastMessage = message;
    toastType = type;
    showToast = true;
    setTimeout(() => {
      showToast = false;
    }, 4000);
  }

  function getInitials(firstName: string, lastName: string): string {
    return `${firstName?.charAt(0) || ''}${lastName?.charAt(0) || ''}`.toUpperCase();
  }

  function formatDate(dateString: string | null): string {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  }

  function openRemoveModal(member: { id: string; firstName: string; lastName: string }) {
    memberToRemove = member;
    showRemoveModal = true;
  }

  function closeRemoveModal() {
    showRemoveModal = false;
    memberToRemove = null;
  }

  function togglePreference(typeKey: string, channel: 'email' | 'sms' | 'push') {
    notificationPrefs = notificationPrefs.map((pref) => {
      if (pref.type === typeKey) {
        return { ...pref, [channel]: !pref[channel] };
      }
      return pref;
    });
  }

  // Show toast when form result comes back
  $effect(() => {
    if (form?.success && form?.message) {
      displayToast(form.message, 'success');
    } else if (form?.error) {
      displayToast(form.error, 'error');
    }
  });
</script>

<svelte:head>
  <title>Account Settings - Implant Lead Engine</title>
</svelte:head>

<!-- Toast Notification -->
{#if showToast}
  <div class="toast-container">
    <div class="toast {toastType === 'success' ? 'success' : 'error'}">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        {#if toastType === 'success'}
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
          <polyline points="22 4 12 14.01 9 11.01"/>
        {:else}
          <circle cx="12" cy="12" r="10"/>
          <line x1="15" y1="9" x2="9" y2="15"/>
          <line x1="9" y1="9" x2="15" y2="15"/>
        {/if}
      </svg>
      <span>{toastMessage}</span>
    </div>
  </div>
{/if}

<div class="page-content">
  <!-- Page Header -->
  <div class="page-header">
    <div>
      <h1 class="text-2xl font-bold text-gray-900">Account Settings</h1>
      <p class="text-gray-500 mt-1">Manage your profile, team, and preferences</p>
    </div>
  </div>

  <!-- Tabs -->
  <div class="tabs">
    <button
      class="tab"
      class:active={activeTab === 'profile'}
      onclick={() => activeTab = 'profile'}
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
        <circle cx="12" cy="7" r="4"/>
      </svg>
      Profile
    </button>
    <button
      class="tab"
      class:active={activeTab === 'team'}
      onclick={() => activeTab = 'team'}
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
        <circle cx="9" cy="7" r="4"/>
        <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
        <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
      </svg>
      Team
      {#if data.teamMembers && data.teamMembers.length > 0}
        <span class="tab-badge">{data.teamMembers.length}</span>
      {/if}
    </button>
    <button
      class="tab"
      class:active={activeTab === 'notifications'}
      onclick={() => activeTab = 'notifications'}
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
        <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
      </svg>
      Notifications
    </button>
    <button
      class="tab"
      class:active={activeTab === 'security'}
      onclick={() => activeTab = 'security'}
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
        <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
      </svg>
      Security
    </button>
  </div>

  <!-- Profile Tab -->
  {#if activeTab === 'profile'}
    <div class="content-grid">
      <!-- Profile Information -->
      <div class="card main-card">
        <div class="card-header">
          <div>
            <h2 class="card-title">Profile Information</h2>
            <p class="card-subtitle">Update your personal information</p>
          </div>
        </div>
        <form
          method="POST"
          action="?/updateProfile"
          use:enhance={() => {
            isProfileSaving = true;
            return async ({ update }) => {
              await update();
              isProfileSaving = false;
            };
          }}
        >
          <div class="card-body">
            <div class="profile-header">
              <div class="avatar avatar-xl" style="background: var(--primary-100); color: var(--primary-600);">
                {getInitials(data.profile?.firstName || '', data.profile?.lastName || '')}
              </div>
              <div class="profile-meta">
                <div class="profile-name">{data.profile?.firstName} {data.profile?.lastName}</div>
                <div class="profile-role badge badge-primary">{data.profile?.roleLabel}</div>
                <div class="profile-email">{data.profile?.email}</div>
              </div>
            </div>

            <div class="form-grid">
              <div class="form-group">
                <label class="form-label" for="firstName">First Name</label>
                <input
                  type="text"
                  id="firstName"
                  name="firstName"
                  class="form-input"
                  bind:value={profileFirstName}
                  required
                />
              </div>
              <div class="form-group">
                <label class="form-label" for="lastName">Last Name</label>
                <input
                  type="text"
                  id="lastName"
                  name="lastName"
                  class="form-input"
                  bind:value={profileLastName}
                  required
                />
              </div>
              <div class="form-group">
                <label class="form-label" for="email">Email Address</label>
                <input
                  type="email"
                  id="email"
                  class="form-input"
                  value={data.profile?.email || ''}
                  disabled
                />
                <span class="form-hint">Email cannot be changed</span>
              </div>
              <div class="form-group">
                <label class="form-label" for="phone">Phone Number</label>
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  class="form-input"
                  bind:value={profilePhone}
                  placeholder="(555) 123-4567"
                />
              </div>
            </div>
          </div>
          <div class="card-footer">
            <button type="submit" class="btn btn-primary" disabled={isProfileSaving}>
              {#if isProfileSaving}
                <span class="spinner"></span>
                Saving...
              {:else}
                Save Changes
              {/if}
            </button>
          </div>
        </form>
      </div>

      <!-- Organization Info -->
      <div class="card side-card">
        <div class="card-header">
          <div>
            <h2 class="card-title">Organization</h2>
            <p class="card-subtitle">{data.organization?.name}</p>
          </div>
        </div>
        <form
          method="POST"
          action="?/updateOrganization"
          use:enhance={() => {
            isOrgSaving = true;
            return async ({ update }) => {
              await update();
              isOrgSaving = false;
            };
          }}
        >
          <div class="card-body">
            {#if data.canEditOrganization}
              <div class="form-group">
                <label class="form-label" for="orgName">Organization Name</label>
                <input
                  type="text"
                  id="orgName"
                  name="name"
                  class="form-input"
                  bind:value={orgName}
                  required
                />
              </div>
              <div class="form-group">
                <label class="form-label" for="orgPhone">Phone</label>
                <input
                  type="tel"
                  id="orgPhone"
                  name="phone"
                  class="form-input"
                  bind:value={orgPhone}
                />
              </div>
              <div class="form-group">
                <label class="form-label" for="orgEmail">Email</label>
                <input
                  type="email"
                  id="orgEmail"
                  name="email"
                  class="form-input"
                  bind:value={orgEmail}
                />
              </div>
              <div class="form-group">
                <label class="form-label" for="orgWebsite">Website</label>
                <input
                  type="url"
                  id="orgWebsite"
                  name="website"
                  class="form-input"
                  bind:value={orgWebsite}
                  placeholder="https://example.com"
                />
              </div>
              <div class="form-group">
                <label class="form-label" for="orgAddressLine1">Address</label>
                <input
                  type="text"
                  id="orgAddressLine1"
                  name="addressLine1"
                  class="form-input"
                  bind:value={orgAddressLine1}
                  placeholder="Street address"
                />
              </div>
              <div class="form-group">
                <input
                  type="text"
                  id="orgAddressLine2"
                  name="addressLine2"
                  class="form-input"
                  bind:value={orgAddressLine2}
                  placeholder="Suite, unit, etc. (optional)"
                />
              </div>
              <div class="form-row">
                <div class="form-group">
                  <label class="form-label" for="orgCity">City</label>
                  <input
                    type="text"
                    id="orgCity"
                    name="city"
                    class="form-input"
                    bind:value={orgCity}
                  />
                </div>
                <div class="form-group">
                  <label class="form-label" for="orgState">State</label>
                  <input
                    type="text"
                    id="orgState"
                    name="state"
                    class="form-input"
                    bind:value={orgState}
                  />
                </div>
                <div class="form-group">
                  <label class="form-label" for="orgPostalCode">ZIP</label>
                  <input
                    type="text"
                    id="orgPostalCode"
                    name="postalCode"
                    class="form-input"
                    bind:value={orgPostalCode}
                  />
                </div>
              </div>
              <div class="form-group">
                <label class="form-label" for="orgTimezone">Timezone</label>
                <select
                  id="orgTimezone"
                  name="timezone"
                  class="form-input form-select"
                  bind:value={orgTimezone}
                >
                  {#each data.timezones as tz}
                    <option value={tz.value}>{tz.name}</option>
                  {/each}
                </select>
              </div>
            {:else}
              <div class="info-list">
                <div class="info-item">
                  <span class="info-label">Name</span>
                  <span class="info-value">{data.organization?.name || '-'}</span>
                </div>
                <div class="info-item">
                  <span class="info-label">Phone</span>
                  <span class="info-value">{data.organization?.phone || '-'}</span>
                </div>
                <div class="info-item">
                  <span class="info-label">Email</span>
                  <span class="info-value">{data.organization?.email || '-'}</span>
                </div>
                <div class="info-item">
                  <span class="info-label">Website</span>
                  <span class="info-value">{data.organization?.website || '-'}</span>
                </div>
                <div class="info-item">
                  <span class="info-label">Address</span>
                  <span class="info-value">
                    {data.organization?.addressLine1 || ''}
                    {data.organization?.city ? `, ${data.organization.city}` : ''}
                    {data.organization?.state || ''}
                    {data.organization?.postalCode || ''}
                  </span>
                </div>
              </div>
              <p class="text-sm text-gray-500 mt-4">Contact your account owner to update organization settings.</p>
            {/if}
          </div>
          {#if data.canEditOrganization}
            <div class="card-footer">
              <button type="submit" class="btn btn-primary w-full" disabled={isOrgSaving}>
                {#if isOrgSaving}
                  <span class="spinner"></span>
                  Saving...
                {:else}
                  Update Organization
                {/if}
              </button>
            </div>
          {/if}
        </form>
      </div>
    </div>
  {/if}

  <!-- Team Tab -->
  {#if activeTab === 'team'}
    <div class="card">
      <div class="card-header">
        <div>
          <h2 class="card-title">Team Members</h2>
          <p class="card-subtitle">{data.teamMembers?.length || 0} members in your organization</p>
        </div>
        {#if data.canManageTeam}
          <button class="btn btn-primary" onclick={() => showInviteModal = true}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="12" y1="5" x2="12" y2="19"/>
              <line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Invite Member
          </button>
        {/if}
      </div>
      <div class="table-container">
        <table class="table">
          <thead>
            <tr>
              <th>Member</th>
              <th>Role</th>
              <th>Status</th>
              <th>Last Login</th>
              <th>Joined</th>
              {#if data.canManageTeam}
                <th>Actions</th>
              {/if}
            </tr>
          </thead>
          <tbody>
            {#if data.teamMembers && data.teamMembers.length > 0}
              {#each data.teamMembers as member}
                <tr class:current-user={member.isCurrentUser}>
                  <td>
                    <div class="member-cell">
                      <div class="avatar" style="background: var(--primary-100); color: var(--primary-600);">
                        {getInitials(member.firstName, member.lastName)}
                      </div>
                      <div class="member-info">
                        <div class="member-name">
                          {member.firstName} {member.lastName}
                          {#if member.isCurrentUser}
                            <span class="badge badge-gray" style="margin-left: 8px;">You</span>
                          {/if}
                        </div>
                        <div class="member-email">{member.email}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span class="badge {member.role === 'client_owner' ? 'badge-primary' : member.role === 'client_admin' ? 'badge-warning' : 'badge-gray'}">
                      {member.roleLabel}
                    </span>
                  </td>
                  <td>
                    <span class="status-indicator">
                      <span class="status-dot {member.isActive ? 'green' : 'gray'}"></span>
                      {member.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td class="text-gray-500">{formatDate(member.lastLoginAt)}</td>
                  <td class="text-gray-500">{formatDate(member.createdAt)}</td>
                  {#if data.canManageTeam}
                    <td>
                      <div class="table-actions">
                        {#if !member.isCurrentUser && member.role !== 'client_owner'}
                          <button
                            class="btn btn-sm btn-outline btn-danger"
                            onclick={() => openRemoveModal(member)}
                          >
                            Remove
                          </button>
                        {/if}
                      </div>
                    </td>
                  {/if}
                </tr>
              {/each}
            {:else}
              <tr>
                <td colspan={data.canManageTeam ? 6 : 5}>
                  <div class="empty-state">
                    <div class="empty-state-icon">
                      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                        <circle cx="9" cy="7" r="4"/>
                        <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                        <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                      </svg>
                    </div>
                    <h3 class="empty-state-title">No team members yet</h3>
                    <p class="empty-state-description">Invite your team to collaborate on lead management.</p>
                    {#if data.canManageTeam}
                      <button class="btn btn-primary" onclick={() => showInviteModal = true}>
                        Invite First Member
                      </button>
                    {/if}
                  </div>
                </td>
              </tr>
            {/if}
          </tbody>
        </table>
      </div>
    </div>
  {/if}

  <!-- Notifications Tab -->
  {#if activeTab === 'notifications'}
    <div class="content-grid notifications-grid">
      <!-- Notification Preferences -->
      <div class="card main-card">
        <div class="card-header">
          <div>
            <h2 class="card-title">Notification Preferences</h2>
            <p class="card-subtitle">Choose how you want to receive notifications</p>
          </div>
        </div>
        <form
          method="POST"
          action="?/updatePreferences"
          use:enhance={() => {
            isPreferencesSaving = true;
            return async ({ update }) => {
              await update();
              isPreferencesSaving = false;
            };
          }}
        >
          <input type="hidden" name="preferences" value={JSON.stringify(notificationPrefs)} />
          <input type="hidden" name="quietHoursEnabled" value={quietHoursEnabled.toString()} />
          <input type="hidden" name="quietHoursStart" value={quietHoursStart} />
          <input type="hidden" name="quietHoursEnd" value={quietHoursEnd} />

          <div class="card-body">
            <div class="notification-table">
              <div class="notification-table-header">
                <div class="notification-type-col">Notification Type</div>
                <div class="notification-channel-col">Email</div>
                <div class="notification-channel-col">SMS</div>
                <div class="notification-channel-col">Push</div>
              </div>
              {#each notificationPrefs as pref}
                {@const typeInfo = data.notificationPreferences?.typeInfo?.[pref.type]}
                <div class="notification-row">
                  <div class="notification-type-col">
                    <div class="notification-type-name">{typeInfo?.name || pref.type}</div>
                    <div class="notification-type-desc">{typeInfo?.description || ''}</div>
                  </div>
                  <div class="notification-channel-col">
                    <label class="toggle">
                      <input
                        type="checkbox"
                        checked={pref.email}
                        onchange={() => togglePreference(pref.type, 'email')}
                      />
                      <span class="toggle-slider"></span>
                    </label>
                  </div>
                  <div class="notification-channel-col">
                    <label class="toggle">
                      <input
                        type="checkbox"
                        checked={pref.sms}
                        onchange={() => togglePreference(pref.type, 'sms')}
                      />
                      <span class="toggle-slider"></span>
                    </label>
                  </div>
                  <div class="notification-channel-col">
                    <label class="toggle">
                      <input
                        type="checkbox"
                        checked={pref.push}
                        onchange={() => togglePreference(pref.type, 'push')}
                      />
                      <span class="toggle-slider"></span>
                    </label>
                  </div>
                </div>
              {/each}
            </div>

            <!-- Quiet Hours -->
            <div class="quiet-hours-section">
              <label class="toggle-option">
                <div class="toggle-option-content">
                  <div class="toggle-option-label">Quiet Hours</div>
                  <div class="toggle-option-desc">Pause non-urgent notifications during specific times</div>
                </div>
                <label class="toggle">
                  <input
                    type="checkbox"
                    bind:checked={quietHoursEnabled}
                  />
                  <span class="toggle-slider"></span>
                </label>
              </label>

              {#if quietHoursEnabled}
                <div class="quiet-hours-times">
                  <div class="form-group">
                    <label class="form-label">Start Time</label>
                    <input
                      type="time"
                      class="form-input"
                      bind:value={quietHoursStart}
                    />
                  </div>
                  <div class="form-group">
                    <label class="form-label">End Time</label>
                    <input
                      type="time"
                      class="form-input"
                      bind:value={quietHoursEnd}
                    />
                  </div>
                </div>
              {/if}
            </div>
          </div>
          <div class="card-footer">
            <button type="submit" class="btn btn-primary" disabled={isPreferencesSaving}>
              {#if isPreferencesSaving}
                <span class="spinner"></span>
                Saving...
              {:else}
                Save Preferences
              {/if}
            </button>
          </div>
        </form>
      </div>

      <!-- Phone Verification & Test Notifications -->
      <div class="card side-card">
        <div class="card-header">
          <div>
            <h2 class="card-title">SMS Settings</h2>
            <p class="card-subtitle">Manage your SMS notification number</p>
          </div>
        </div>
        <div class="card-body">
          <!-- Phone Number -->
          <div class="form-group">
            <label class="form-label">Phone Number for SMS</label>
            <div class="phone-input-group">
              <input
                type="tel"
                class="form-input"
                bind:value={notificationPhone}
                placeholder="(555) 123-4567"
              />
              {#if data.notificationPreferences?.phoneVerified}
                <span class="verified-badge">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                    <polyline points="22 4 12 14.01 9 11.01"/>
                  </svg>
                  Verified
                </span>
              {/if}
            </div>
          </div>

          {#if !data.notificationPreferences?.phoneVerified && notificationPhone}
            <form
              method="POST"
              action="?/sendVerificationCode"
              use:enhance={() => {
                isSendingVerification = true;
                return async ({ update }) => {
                  await update();
                  isSendingVerification = false;
                  showVerificationInput = true;
                };
              }}
            >
              <input type="hidden" name="phone" value={notificationPhone} />
              <button type="submit" class="btn btn-outline w-full mb-4" disabled={isSendingVerification}>
                {#if isSendingVerification}
                  <span class="spinner"></span>
                  Sending...
                {:else}
                  Send Verification Code
                {/if}
              </button>
            </form>

            {#if showVerificationInput}
              <form
                method="POST"
                action="?/verifyPhone"
                use:enhance={() => {
                  isVerifyingPhone = true;
                  return async ({ update }) => {
                    await update();
                    isVerifyingPhone = false;
                  };
                }}
              >
                <div class="form-group">
                  <label class="form-label">Verification Code</label>
                  <input
                    type="text"
                    name="code"
                    class="form-input"
                    bind:value={verificationCode}
                    placeholder="Enter 6-digit code"
                    maxlength="6"
                  />
                </div>
                <button type="submit" class="btn btn-primary w-full" disabled={isVerifyingPhone}>
                  {#if isVerifyingPhone}
                    <span class="spinner"></span>
                    Verifying...
                  {:else}
                    Verify Phone
                  {/if}
                </button>
              </form>
            {/if}
          {/if}

          <!-- Test Notifications -->
          <div class="test-notifications">
            <h3 class="text-sm font-semibold text-gray-700 mb-3">Test Notifications</h3>
            <div class="flex gap-3">
              <form
                method="POST"
                action="?/sendTestEmail"
                use:enhance={() => {
                  isSendingTestEmail = true;
                  return async ({ update }) => {
                    await update();
                    isSendingTestEmail = false;
                  };
                }}
                class="flex-1"
              >
                <button type="submit" class="btn btn-outline w-full" disabled={isSendingTestEmail}>
                  {#if isSendingTestEmail}
                    <span class="spinner"></span>
                  {:else}
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                      <polyline points="22,6 12,13 2,6"/>
                    </svg>
                    Test Email
                  {/if}
                </button>
              </form>
              <form
                method="POST"
                action="?/sendTestSms"
                use:enhance={() => {
                  isSendingTestSms = true;
                  return async ({ update }) => {
                    await update();
                    isSendingTestSms = false;
                  };
                }}
                class="flex-1"
              >
                <button
                  type="submit"
                  class="btn btn-outline w-full"
                  disabled={isSendingTestSms || !data.notificationPreferences?.phoneVerified}
                >
                  {#if isSendingTestSms}
                    <span class="spinner"></span>
                  {:else}
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                    </svg>
                    Test SMS
                  {/if}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  {/if}

  <!-- Security Tab -->
  {#if activeTab === 'security'}
    <div class="content-grid">
      <div class="card main-card">
        <div class="card-header">
          <div>
            <h2 class="card-title">Change Password</h2>
            <p class="card-subtitle">Update your account password</p>
          </div>
        </div>
        <form
          method="POST"
          action="?/changePassword"
          use:enhance={() => {
            isPasswordSaving = true;
            return async ({ update }) => {
              await update();
              isPasswordSaving = false;
              currentPassword = '';
              newPassword = '';
              confirmPassword = '';
            };
          }}
        >
          <div class="card-body">
            <div class="security-form">
              <div class="form-group">
                <label class="form-label" for="currentPassword">Current Password</label>
                <input
                  type="password"
                  id="currentPassword"
                  name="currentPassword"
                  class="form-input"
                  bind:value={currentPassword}
                  required
                />
              </div>
              <div class="form-group">
                <label class="form-label" for="newPassword">New Password</label>
                <input
                  type="password"
                  id="newPassword"
                  name="newPassword"
                  class="form-input"
                  bind:value={newPassword}
                  required
                  minlength="8"
                />
                <span class="form-hint">Must be at least 8 characters</span>
              </div>
              <div class="form-group">
                <label class="form-label" for="confirmPassword">Confirm New Password</label>
                <input
                  type="password"
                  id="confirmPassword"
                  name="confirmPassword"
                  class="form-input"
                  bind:value={confirmPassword}
                  required
                />
                {#if newPassword && confirmPassword && newPassword !== confirmPassword}
                  <span class="form-error">Passwords do not match</span>
                {/if}
              </div>
            </div>
          </div>
          <div class="card-footer">
            <button
              type="submit"
              class="btn btn-primary"
              disabled={isPasswordSaving || !currentPassword || !newPassword || !confirmPassword || newPassword !== confirmPassword}
            >
              {#if isPasswordSaving}
                <span class="spinner"></span>
                Updating...
              {:else}
                Update Password
              {/if}
            </button>
          </div>
        </form>
      </div>

      <!-- Account Info -->
      <div class="card side-card">
        <div class="card-header">
          <div>
            <h2 class="card-title">Account Information</h2>
          </div>
        </div>
        <div class="card-body">
          <div class="info-list">
            <div class="info-item">
              <span class="info-label">Account Created</span>
              <span class="info-value">{formatDate(data.profile?.createdAt || null)}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Last Login</span>
              <span class="info-value">{formatDate(data.profile?.lastLoginAt || null)}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Email Verified</span>
              <span class="info-value">
                {#if data.profile?.emailVerified}
                  <span class="status-indicator">
                    <span class="status-dot green"></span>
                    Verified
                  </span>
                {:else}
                  <span class="status-indicator">
                    <span class="status-dot gray"></span>
                    Not verified
                  </span>
                {/if}
              </span>
            </div>
            <div class="info-item">
              <span class="info-label">Role</span>
              <span class="info-value">{data.profile?.roleLabel}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  {/if}
</div>

<!-- Invite Team Member Modal -->
{#if showInviteModal}
  <div class="modal-overlay open" onclick={() => showInviteModal = false}>
    <div class="modal" onclick={(e) => e.stopPropagation()}>
      <div class="modal-header">
        <h3 class="modal-title">Invite Team Member</h3>
        <button class="modal-close" onclick={() => showInviteModal = false}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>
      <form
        method="POST"
        action="?/inviteTeamMember"
        use:enhance={() => {
          isInviting = true;
          return async ({ update, result }) => {
            await update();
            isInviting = false;
            if (result.type === 'success') {
              showInviteModal = false;
              inviteFirstName = '';
              inviteLastName = '';
              inviteEmail = '';
              inviteRole = 'client_staff';
            }
          };
        }}
      >
        <div class="modal-body">
          <div class="form-group">
            <label class="form-label" for="inviteFirstName">First Name</label>
            <input
              type="text"
              id="inviteFirstName"
              name="firstName"
              class="form-input"
              bind:value={inviteFirstName}
              required
            />
          </div>
          <div class="form-group">
            <label class="form-label" for="inviteLastName">Last Name</label>
            <input
              type="text"
              id="inviteLastName"
              name="lastName"
              class="form-input"
              bind:value={inviteLastName}
              required
            />
          </div>
          <div class="form-group">
            <label class="form-label" for="inviteEmail">Email Address</label>
            <input
              type="email"
              id="inviteEmail"
              name="email"
              class="form-input"
              bind:value={inviteEmail}
              required
            />
          </div>
          <div class="form-group">
            <label class="form-label" for="inviteRole">Role</label>
            <select
              id="inviteRole"
              name="role"
              class="form-input form-select"
              bind:value={inviteRole}
            >
              <option value="client_staff">Staff - Lead management only</option>
              <option value="client_admin">Admin - Manage team, view billing</option>
            </select>
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" onclick={() => showInviteModal = false}>
            Cancel
          </button>
          <button type="submit" class="btn btn-primary" disabled={isInviting}>
            {#if isInviting}
              <span class="spinner"></span>
              Sending...
            {:else}
              Send Invitation
            {/if}
          </button>
        </div>
      </form>
    </div>
  </div>
{/if}

<!-- Remove Member Confirmation Modal -->
{#if showRemoveModal && memberToRemove}
  <div class="modal-overlay open" onclick={closeRemoveModal}>
    <div class="modal" onclick={(e) => e.stopPropagation()}>
      <div class="modal-header">
        <h3 class="modal-title">Remove Team Member</h3>
        <button class="modal-close" onclick={closeRemoveModal}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>
      <form
        method="POST"
        action="?/removeTeamMember"
        use:enhance={() => {
          isRemoving = true;
          return async ({ update, result }) => {
            await update();
            isRemoving = false;
            if (result.type === 'success') {
              closeRemoveModal();
            }
          };
        }}
      >
        <input type="hidden" name="memberId" value={memberToRemove.id} />
        <div class="modal-body">
          <p class="text-gray-600">
            Are you sure you want to remove <strong>{memberToRemove.firstName} {memberToRemove.lastName}</strong> from your team?
          </p>
          <p class="text-sm text-gray-500 mt-2">
            They will no longer have access to your organization's leads and data.
          </p>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" onclick={closeRemoveModal}>
            Cancel
          </button>
          <button type="submit" class="btn btn-danger" disabled={isRemoving}>
            {#if isRemoving}
              <span class="spinner"></span>
              Removing...
            {:else}
              Remove Member
            {/if}
          </button>
        </div>
      </form>
    </div>
  </div>
{/if}

<style>
  .page-header {
    margin-bottom: var(--spacing-6);
  }

  .tabs {
    display: flex;
    gap: var(--spacing-1);
    border-bottom: 1px solid var(--gray-200);
    margin-bottom: var(--spacing-6);
    overflow-x: auto;
  }

  .tab {
    display: flex;
    align-items: center;
    gap: var(--spacing-2);
    padding: var(--spacing-3) var(--spacing-4);
    font-size: 0.875rem;
    font-weight: 500;
    color: var(--gray-500);
    background: transparent;
    border: none;
    border-bottom: 2px solid transparent;
    cursor: pointer;
    transition: all 0.2s ease;
    white-space: nowrap;
  }

  .tab:hover {
    color: var(--gray-700);
  }

  .tab.active {
    color: var(--primary-600);
    border-bottom-color: var(--primary-600);
  }

  .tab-badge {
    background: var(--gray-200);
    color: var(--gray-600);
    font-size: 0.75rem;
    padding: 2px 6px;
    border-radius: var(--radius-full);
  }

  .tab.active .tab-badge {
    background: var(--primary-100);
    color: var(--primary-600);
  }

  .content-grid {
    display: grid;
    grid-template-columns: 2fr 1fr;
    gap: var(--spacing-6);
  }

  .notifications-grid {
    grid-template-columns: 1fr 380px;
  }

  @media (max-width: 1024px) {
    .content-grid {
      grid-template-columns: 1fr;
    }
  }

  .main-card {
    grid-column: 1;
  }

  .side-card {
    grid-column: 2;
  }

  @media (max-width: 1024px) {
    .main-card,
    .side-card {
      grid-column: 1;
    }
  }

  .profile-header {
    display: flex;
    align-items: center;
    gap: var(--spacing-4);
    padding-bottom: var(--spacing-5);
    margin-bottom: var(--spacing-5);
    border-bottom: 1px solid var(--gray-100);
  }

  .profile-meta {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-1);
  }

  .profile-name {
    font-size: 1.125rem;
    font-weight: 600;
    color: var(--gray-900);
  }

  .profile-role {
    width: fit-content;
  }

  .profile-email {
    font-size: 0.875rem;
    color: var(--gray-500);
  }

  .form-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: var(--spacing-4);
  }

  @media (max-width: 640px) {
    .form-grid {
      grid-template-columns: 1fr;
    }
  }

  .form-row {
    display: grid;
    grid-template-columns: 2fr 1fr 1fr;
    gap: var(--spacing-3);
  }

  @media (max-width: 640px) {
    .form-row {
      grid-template-columns: 1fr;
    }
  }

  .form-hint {
    display: block;
    font-size: 0.75rem;
    color: var(--gray-500);
    margin-top: var(--spacing-1);
  }

  .form-error {
    display: block;
    font-size: 0.75rem;
    color: var(--danger-500);
    margin-top: var(--spacing-1);
  }

  .info-list {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-3);
  }

  .info-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--spacing-3) 0;
    border-bottom: 1px solid var(--gray-100);
  }

  .info-item:last-child {
    border-bottom: none;
  }

  .info-label {
    font-size: 0.875rem;
    color: var(--gray-500);
  }

  .info-value {
    font-size: 0.875rem;
    font-weight: 500;
    color: var(--gray-900);
  }

  /* Team Table Styles */
  .member-cell {
    display: flex;
    align-items: center;
    gap: var(--spacing-3);
  }

  .member-info {
    display: flex;
    flex-direction: column;
  }

  .member-name {
    font-weight: 500;
    color: var(--gray-900);
    display: flex;
    align-items: center;
  }

  .member-email {
    font-size: 0.75rem;
    color: var(--gray-500);
  }

  .current-user {
    background: var(--primary-50);
  }

  /* Notification Styles */
  .notification-table {
    border: 1px solid var(--gray-200);
    border-radius: var(--radius-lg);
    overflow: hidden;
  }

  .notification-table-header {
    display: grid;
    grid-template-columns: 1fr 80px 80px 80px;
    gap: var(--spacing-4);
    padding: var(--spacing-3) var(--spacing-4);
    background: var(--gray-50);
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--gray-500);
  }

  .notification-row {
    display: grid;
    grid-template-columns: 1fr 80px 80px 80px;
    gap: var(--spacing-4);
    padding: var(--spacing-4);
    border-top: 1px solid var(--gray-100);
    align-items: center;
  }

  .notification-type-name {
    font-weight: 500;
    color: var(--gray-900);
    font-size: 0.875rem;
  }

  .notification-type-desc {
    font-size: 0.75rem;
    color: var(--gray-500);
    margin-top: 2px;
  }

  .notification-channel-col {
    display: flex;
    justify-content: center;
  }

  /* Toggle Switch */
  .toggle {
    position: relative;
    display: inline-block;
    width: 44px;
    height: 24px;
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
    border-radius: 24px;
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

  .toggle input:disabled + .toggle-slider {
    opacity: 0.5;
    cursor: not-allowed;
  }

  /* Quiet Hours */
  .quiet-hours-section {
    margin-top: var(--spacing-6);
    padding-top: var(--spacing-6);
    border-top: 1px solid var(--gray-100);
  }

  .toggle-option {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--spacing-4);
    background: var(--gray-50);
    border-radius: var(--radius-lg);
    cursor: pointer;
  }

  .toggle-option-label {
    font-weight: 500;
    color: var(--gray-900);
  }

  .toggle-option-desc {
    font-size: 0.875rem;
    color: var(--gray-500);
    margin-top: 2px;
  }

  .quiet-hours-times {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--spacing-4);
    margin-top: var(--spacing-4);
  }

  /* Phone Verification */
  .phone-input-group {
    display: flex;
    align-items: center;
    gap: var(--spacing-3);
  }

  .phone-input-group .form-input {
    flex: 1;
  }

  .verified-badge {
    display: inline-flex;
    align-items: center;
    gap: var(--spacing-1);
    padding: var(--spacing-1) var(--spacing-2);
    background: var(--success-100);
    color: var(--success-700);
    font-size: 0.75rem;
    font-weight: 500;
    border-radius: var(--radius-full);
    white-space: nowrap;
  }

  .test-notifications {
    margin-top: var(--spacing-6);
    padding-top: var(--spacing-6);
    border-top: 1px solid var(--gray-100);
  }

  /* Security Form */
  .security-form {
    max-width: 400px;
  }

  /* Spinner */
  .spinner {
    width: 16px;
    height: 16px;
    border: 2px solid transparent;
    border-top-color: currentColor;
    border-radius: 50%;
    animation: spin 0.6s linear infinite;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  /* Utility */
  .w-full {
    width: 100%;
  }

  .mb-4 {
    margin-bottom: var(--spacing-4);
  }

  .mt-4 {
    margin-top: var(--spacing-4);
  }

  .flex-1 {
    flex: 1;
  }

  .btn-danger {
    background: var(--danger-500);
    color: white;
  }

  .btn-danger:hover {
    background: var(--danger-600);
  }

  .btn-outline.btn-danger {
    background: transparent;
    border: 1px solid var(--danger-300);
    color: var(--danger-600);
  }

  .btn-outline.btn-danger:hover {
    background: var(--danger-50);
    border-color: var(--danger-400);
  }

  /* Toast positioning fix */
  :global(.toast-container) {
    position: fixed;
    top: calc(var(--header-height) + var(--spacing-4));
    right: var(--spacing-4);
    z-index: 300;
  }
</style>
