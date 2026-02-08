<script lang="ts">
  import {
    Card,
    Badge,
    Button,
    Input,
    Label,
    Select,
    Modal,
    Table,
    TableHead,
    TableHeadCell,
    TableBody,
    TableBodyRow,
    TableBodyCell,
    Alert,
    Spinner,
    Avatar,
    Tabs,
    TabItem
  } from 'flowbite-svelte';
  import {
    UserSettingsOutline,
    UsersGroupOutline,
    BuildingOutline,
    LockOutline,
    PlusOutline,
    TrashBinOutline,
    CheckCircleOutline,
    ExclamationCircleOutline,
    EnvelopeOutline,
    PhoneOutline,
    GlobeOutline,
    ClockOutline,
    BellOutline
  } from 'flowbite-svelte-icons';
  import { formatDate, getInitials, formatPhone } from '$lib/utils';
  import { enhance } from '$app/forms';
  import type { PageData, ActionData } from './$types';
  import NotificationSettings from '$lib/components/settings/NotificationSettings.svelte';

  let { data, form }: { data: PageData; form: ActionData } = $props();

  // Modal states
  let showInviteModal = $state(false);
  let showRemoveModal = $state(false);
  let selectedMember = $state<typeof data.teamMembers[0] | null>(null);

  // Form submission states
  let isSubmitting = $state(false);

  // Form data for invite
  let inviteEmail = $state('');
  let inviteFirstName = $state('');
  let inviteLastName = $state('');
  let inviteRole = $state('client_staff');

  // Password form fields
  let currentPassword = $state('');
  let newPassword = $state('');
  let confirmPassword = $state('');

  // Available roles for team members
  const roleOptions = [
    { value: 'client_admin', name: 'Admin - Can manage team and view billing' },
    { value: 'client_staff', name: 'Staff - Lead management only' }
  ];

  // US States for address
  const usStates = [
    { value: '', name: 'Select State' },
    { value: 'AL', name: 'Alabama' },
    { value: 'AK', name: 'Alaska' },
    { value: 'AZ', name: 'Arizona' },
    { value: 'AR', name: 'Arkansas' },
    { value: 'CA', name: 'California' },
    { value: 'CO', name: 'Colorado' },
    { value: 'CT', name: 'Connecticut' },
    { value: 'DE', name: 'Delaware' },
    { value: 'FL', name: 'Florida' },
    { value: 'GA', name: 'Georgia' },
    { value: 'HI', name: 'Hawaii' },
    { value: 'ID', name: 'Idaho' },
    { value: 'IL', name: 'Illinois' },
    { value: 'IN', name: 'Indiana' },
    { value: 'IA', name: 'Iowa' },
    { value: 'KS', name: 'Kansas' },
    { value: 'KY', name: 'Kentucky' },
    { value: 'LA', name: 'Louisiana' },
    { value: 'ME', name: 'Maine' },
    { value: 'MD', name: 'Maryland' },
    { value: 'MA', name: 'Massachusetts' },
    { value: 'MI', name: 'Michigan' },
    { value: 'MN', name: 'Minnesota' },
    { value: 'MS', name: 'Mississippi' },
    { value: 'MO', name: 'Missouri' },
    { value: 'MT', name: 'Montana' },
    { value: 'NE', name: 'Nebraska' },
    { value: 'NV', name: 'Nevada' },
    { value: 'NH', name: 'New Hampshire' },
    { value: 'NJ', name: 'New Jersey' },
    { value: 'NM', name: 'New Mexico' },
    { value: 'NY', name: 'New York' },
    { value: 'NC', name: 'North Carolina' },
    { value: 'ND', name: 'North Dakota' },
    { value: 'OH', name: 'Ohio' },
    { value: 'OK', name: 'Oklahoma' },
    { value: 'OR', name: 'Oregon' },
    { value: 'PA', name: 'Pennsylvania' },
    { value: 'RI', name: 'Rhode Island' },
    { value: 'SC', name: 'South Carolina' },
    { value: 'SD', name: 'South Dakota' },
    { value: 'TN', name: 'Tennessee' },
    { value: 'TX', name: 'Texas' },
    { value: 'UT', name: 'Utah' },
    { value: 'VT', name: 'Vermont' },
    { value: 'VA', name: 'Virginia' },
    { value: 'WA', name: 'Washington' },
    { value: 'WV', name: 'West Virginia' },
    { value: 'WI', name: 'Wisconsin' },
    { value: 'WY', name: 'Wyoming' }
  ];

  // Get role badge color
  function getRoleBadgeColor(role: string): 'blue' | 'green' | 'gray' {
    if (role === 'client_owner') return 'green';
    if (role === 'client_admin') return 'blue';
    return 'gray';
  }

  // Open remove member modal
  function openRemoveModal(member: typeof data.teamMembers[0]) {
    selectedMember = member;
    showRemoveModal = true;
  }

  // Reset invite form
  function resetInviteForm() {
    inviteEmail = '';
    inviteFirstName = '';
    inviteLastName = '';
    inviteRole = 'client_staff';
  }

  // Reset password form
  function resetPasswordForm() {
    currentPassword = '';
    newPassword = '';
    confirmPassword = '';
  }
</script>

<div class="space-y-6">
  <!-- Page Header -->
  <div>
    <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Account Settings</h1>
    <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
      Manage your profile, team, and organization settings.
    </p>
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

  <Tabs style="underline" contentClass="p-0 mt-6">
    <!-- Profile Tab -->
    <TabItem open title="Profile">
      <div class="grid gap-6 lg:grid-cols-2">
        <!-- Profile Form -->
        <Card>
          <h3 class="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-white">
            <UserSettingsOutline class="h-5 w-5 text-primary-600" />
            Personal Information
          </h3>

          <form method="POST" action="?/updateProfile" use:enhance={() => {
            isSubmitting = true;
            return async ({ update }) => {
              await update();
              isSubmitting = false;
            };
          }}>
            <div class="space-y-4">
              <div class="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label for="firstName">First Name</Label>
                  <Input
                    id="firstName"
                    name="firstName"
                    value={data.profile?.firstName ?? ''}
                    required
                    class="mt-1"
                  />
                </div>
                <div>
                  <Label for="lastName">Last Name</Label>
                  <Input
                    id="lastName"
                    name="lastName"
                    value={data.profile?.lastName ?? ''}
                    required
                    class="mt-1"
                  />
                </div>
              </div>

              <div>
                <Label for="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  value={data.profile?.email ?? ''}
                  disabled
                  class="mt-1 bg-gray-50 dark:bg-gray-700"
                />
                <p class="mt-1 text-xs text-gray-500">Contact support to change your email</p>
              </div>

              <div>
                <Label for="phone">Phone Number</Label>
                <Input
                  id="phone"
                  name="phone"
                  type="tel"
                  value={data.profile?.phone ?? ''}
                  placeholder="(555) 123-4567"
                  class="mt-1"
                />
              </div>

              <div class="flex items-center justify-between pt-2">
                <div class="flex items-center gap-2">
                  <Badge color={getRoleBadgeColor(data.profile?.role ?? '')}>
                    {data.profile?.roleLabel}
                  </Badge>
                  {#if data.profile?.emailVerified}
                    <Badge color="green">Email Verified</Badge>
                  {/if}
                </div>
                <Button type="submit" color="primary" disabled={isSubmitting}>
                  {#if isSubmitting}
                    <Spinner size="4" class="mr-2" />
                  {/if}
                  Save Changes
                </Button>
              </div>
            </div>
          </form>
        </Card>

        <!-- Password Change Form -->
        <Card>
          <h3 class="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-white">
            <LockOutline class="h-5 w-5 text-primary-600" />
            Change Password
          </h3>

          <form method="POST" action="?/changePassword" use:enhance={() => {
            isSubmitting = true;
            return async ({ update }) => {
              await update();
              isSubmitting = false;
              resetPasswordForm();
            };
          }}>
            <div class="space-y-4">
              <div>
                <Label for="currentPassword">Current Password</Label>
                <Input
                  id="currentPassword"
                  name="currentPassword"
                  type="password"
                  bind:value={currentPassword}
                  required
                  class="mt-1"
                />
              </div>

              <div>
                <Label for="newPassword">New Password</Label>
                <Input
                  id="newPassword"
                  name="newPassword"
                  type="password"
                  bind:value={newPassword}
                  required
                  minlength={8}
                  class="mt-1"
                />
                <p class="mt-1 text-xs text-gray-500">Minimum 8 characters</p>
              </div>

              <div>
                <Label for="confirmPassword">Confirm New Password</Label>
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  bind:value={confirmPassword}
                  required
                  class="mt-1"
                />
              </div>

              <div class="flex justify-end pt-2">
                <Button type="submit" color="primary" disabled={isSubmitting}>
                  {#if isSubmitting}
                    <Spinner size="4" class="mr-2" />
                  {/if}
                  Update Password
                </Button>
              </div>
            </div>
          </form>
        </Card>
      </div>
    </TabItem>

    <!-- Team Tab -->
    <TabItem title="Team">
      <Card>
        <div class="mb-4 flex items-center justify-between">
          <h3 class="flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-white">
            <UsersGroupOutline class="h-5 w-5 text-primary-600" />
            Team Members
          </h3>
          {#if data.canManageTeam}
            <Button color="primary" size="sm" onclick={() => showInviteModal = true}>
              <PlusOutline class="mr-2 h-4 w-4" />
              Invite Member
            </Button>
          {/if}
        </div>

        <Table hoverable>
          <TableHead>
            <TableHeadCell>Member</TableHeadCell>
            <TableHeadCell>Role</TableHeadCell>
            <TableHeadCell>Status</TableHeadCell>
            <TableHeadCell>Last Active</TableHeadCell>
            {#if data.canManageTeam}
              <TableHeadCell class="text-center">Actions</TableHeadCell>
            {/if}
          </TableHead>
          <TableBody>
            {#each data.teamMembers as member}
              <TableBodyRow>
                <TableBodyCell>
                  <div class="flex items-center gap-3">
                    <Avatar size="sm" class="bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-300">
                      {getInitials(member.firstName, member.lastName)}
                    </Avatar>
                    <div>
                      <p class="font-medium text-gray-900 dark:text-white">
                        {member.firstName} {member.lastName}
                        {#if member.isCurrentUser}
                          <span class="text-xs text-gray-500">(You)</span>
                        {/if}
                      </p>
                      <p class="text-sm text-gray-500 dark:text-gray-400">{member.email}</p>
                    </div>
                  </div>
                </TableBodyCell>
                <TableBodyCell>
                  <Badge color={getRoleBadgeColor(member.role)}>
                    {member.roleLabel}
                  </Badge>
                </TableBodyCell>
                <TableBodyCell>
                  <Badge color={member.isActive ? 'green' : 'gray'}>
                    {member.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </TableBodyCell>
                <TableBodyCell class="text-sm text-gray-500">
                  {member.lastLoginAt ? formatDate(member.lastLoginAt, 'relative') : 'Never'}
                </TableBodyCell>
                {#if data.canManageTeam}
                  <TableBodyCell class="text-center">
                    {#if !member.isCurrentUser && member.role !== 'client_owner'}
                      <Button color="red" outline size="xs" onclick={() => openRemoveModal(member)}>
                        <TrashBinOutline class="h-4 w-4" />
                      </Button>
                    {:else}
                      <span class="text-gray-400">-</span>
                    {/if}
                  </TableBodyCell>
                {/if}
              </TableBodyRow>
            {/each}
          </TableBody>
        </Table>
      </Card>
    </TabItem>

    <!-- Organization Tab -->
    <TabItem title="Organization">
      <Card>
        <h3 class="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-white">
          <BuildingOutline class="h-5 w-5 text-primary-600" />
          Organization Settings
        </h3>

        <form method="POST" action="?/updateOrganization" use:enhance={() => {
          isSubmitting = true;
          return async ({ update }) => {
            await update();
            isSubmitting = false;
          };
        }}>
          <div class="space-y-6">
            <!-- Basic Info -->
            <div class="grid gap-4 sm:grid-cols-2">
              <div class="sm:col-span-2">
                <Label for="orgName">Organization Name</Label>
                <Input
                  id="orgName"
                  name="name"
                  value={data.organization?.name ?? ''}
                  required
                  disabled={!data.canEditOrganization}
                  class="mt-1"
                />
              </div>

              <div>
                <Label for="orgPhone">Phone</Label>
                <Input
                  id="orgPhone"
                  name="phone"
                  type="tel"
                  value={data.organization?.phone ?? ''}
                  disabled={!data.canEditOrganization}
                  class="mt-1"
                />
              </div>

              <div>
                <Label for="orgEmail">Email</Label>
                <Input
                  id="orgEmail"
                  name="email"
                  type="email"
                  value={data.organization?.email ?? ''}
                  disabled={!data.canEditOrganization}
                  class="mt-1"
                />
              </div>

              <div class="sm:col-span-2">
                <Label for="orgWebsite">Website</Label>
                <Input
                  id="orgWebsite"
                  name="website"
                  type="url"
                  value={data.organization?.website ?? ''}
                  placeholder="https://example.com"
                  disabled={!data.canEditOrganization}
                  class="mt-1"
                />
              </div>
            </div>

            <!-- Address -->
            <div class="border-t border-gray-200 pt-6 dark:border-gray-700">
              <h4 class="mb-4 text-sm font-medium text-gray-700 dark:text-gray-300">Address</h4>
              <div class="grid gap-4 sm:grid-cols-2">
                <div class="sm:col-span-2">
                  <Label for="addressLine1">Street Address</Label>
                  <Input
                    id="addressLine1"
                    name="addressLine1"
                    value={data.organization?.addressLine1 ?? ''}
                    disabled={!data.canEditOrganization}
                    class="mt-1"
                  />
                </div>

                <div class="sm:col-span-2">
                  <Label for="addressLine2">Address Line 2</Label>
                  <Input
                    id="addressLine2"
                    name="addressLine2"
                    value={data.organization?.addressLine2 ?? ''}
                    placeholder="Suite, Unit, Building, etc."
                    disabled={!data.canEditOrganization}
                    class="mt-1"
                  />
                </div>

                <div>
                  <Label for="city">City</Label>
                  <Input
                    id="city"
                    name="city"
                    value={data.organization?.city ?? ''}
                    disabled={!data.canEditOrganization}
                    class="mt-1"
                  />
                </div>

                <div>
                  <Label for="state">State</Label>
                  <Select
                    id="state"
                    name="state"
                    items={usStates}
                    value={data.organization?.state ?? ''}
                    disabled={!data.canEditOrganization}
                    class="mt-1"
                  />
                </div>

                <div>
                  <Label for="postalCode">ZIP Code</Label>
                  <Input
                    id="postalCode"
                    name="postalCode"
                    value={data.organization?.postalCode ?? ''}
                    disabled={!data.canEditOrganization}
                    class="mt-1"
                  />
                </div>

                <div>
                  <Label for="timezone">Timezone</Label>
                  <Select
                    id="timezone"
                    name="timezone"
                    items={data.timezones}
                    value={data.organization?.timezone ?? 'America/New_York'}
                    disabled={!data.canEditOrganization}
                    class="mt-1"
                  />
                </div>
              </div>
            </div>

            {#if data.canEditOrganization}
              <div class="flex justify-end border-t border-gray-200 pt-4 dark:border-gray-700">
                <Button type="submit" color="primary" disabled={isSubmitting}>
                  {#if isSubmitting}
                    <Spinner size="4" class="mr-2" />
                  {/if}
                  Save Organization Settings
                </Button>
              </div>
            {:else}
              <p class="text-sm text-gray-500 dark:text-gray-400">
                Only organization owners can edit these settings.
              </p>
            {/if}
          </div>
        </form>
      </Card>
    </TabItem>

    <!-- Notifications Tab -->
    <TabItem title="Notifications">
      <NotificationSettings
        preferences={data.notificationPreferences.preferences}
        typeInfo={data.notificationPreferences.typeInfo}
        phoneNumber={data.notificationPreferences.phoneNumber}
        phoneVerified={data.notificationPreferences.phoneVerified}
        quietHoursEnabled={data.notificationPreferences.quietHoursEnabled}
        quietHoursStart={data.notificationPreferences.quietHoursStart}
        quietHoursEnd={data.notificationPreferences.quietHoursEnd}
        timezone={data.notificationPreferences.timezone}
        {form}
      />
    </TabItem>
  </Tabs>
</div>

<!-- Invite Team Member Modal -->
<Modal bind:open={showInviteModal} size="md" title="Invite Team Member">
  <form method="POST" action="?/inviteTeamMember" use:enhance={() => {
    isSubmitting = true;
    return async ({ update }) => {
      await update();
      isSubmitting = false;
      showInviteModal = false;
      resetInviteForm();
    };
  }}>
    <div class="space-y-4">
      <div class="grid gap-4 sm:grid-cols-2">
        <div>
          <Label for="inviteFirstName">First Name</Label>
          <Input
            id="inviteFirstName"
            name="firstName"
            bind:value={inviteFirstName}
            required
            class="mt-1"
          />
        </div>
        <div>
          <Label for="inviteLastName">Last Name</Label>
          <Input
            id="inviteLastName"
            name="lastName"
            bind:value={inviteLastName}
            required
            class="mt-1"
          />
        </div>
      </div>

      <div>
        <Label for="inviteEmail">Email Address</Label>
        <Input
          id="inviteEmail"
          name="email"
          type="email"
          bind:value={inviteEmail}
          required
          class="mt-1"
        />
      </div>

      <div>
        <Label for="inviteRole">Role</Label>
        <Select
          id="inviteRole"
          name="role"
          items={roleOptions}
          bind:value={inviteRole}
          class="mt-1"
        />
      </div>
    </div>

    <div class="mt-6 flex gap-3">
      <Button type="button" color="light" class="flex-1" onclick={() => showInviteModal = false}>
        Cancel
      </Button>
      <Button type="submit" color="primary" class="flex-1" disabled={isSubmitting}>
        {#if isSubmitting}
          <Spinner size="4" class="mr-2" />
        {:else}
          <EnvelopeOutline class="mr-2 h-4 w-4" />
        {/if}
        Send Invitation
      </Button>
    </div>
  </form>
</Modal>

<!-- Remove Team Member Modal -->
<Modal bind:open={showRemoveModal} size="sm" title="Remove Team Member">
  {#if selectedMember}
    <p class="text-gray-500 dark:text-gray-400">
      Are you sure you want to remove <strong class="text-gray-900 dark:text-white">
        {selectedMember.firstName} {selectedMember.lastName}
      </strong> from the team?
    </p>
    <p class="mt-2 text-sm text-gray-500 dark:text-gray-400">
      They will no longer have access to the platform.
    </p>

    <form method="POST" action="?/removeTeamMember" use:enhance={() => {
      isSubmitting = true;
      return async ({ update }) => {
        await update();
        isSubmitting = false;
        showRemoveModal = false;
        selectedMember = null;
      };
    }} class="mt-6 flex gap-3">
      <input type="hidden" name="memberId" value={selectedMember.id} />
      <Button type="button" color="light" class="flex-1" onclick={() => showRemoveModal = false}>
        Cancel
      </Button>
      <Button type="submit" color="red" class="flex-1" disabled={isSubmitting}>
        {#if isSubmitting}
          <Spinner size="4" class="mr-2" />
        {:else}
          <TrashBinOutline class="mr-2 h-4 w-4" />
        {/if}
        Remove
      </Button>
    </form>
  {/if}
</Modal>
