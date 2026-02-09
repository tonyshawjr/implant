<script lang="ts">
  import { Card, Button, Input, Label, Toggle, Select, Tabs, TabItem, Badge } from 'flowbite-svelte';
  import { CogOutline, BellOutline, ShieldCheckOutline, DatabaseOutline } from 'flowbite-svelte-icons';
</script>

<div class="space-y-6">
  <!-- Page Header -->
  <div>
    <h1 class="text-2xl font-bold text-gray-900 dark:text-white">System Settings</h1>
    <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
      Configure platform-wide settings and preferences
    </p>
  </div>

  <!-- Settings Tabs -->
  <Tabs style="underline" class="mt-4">
    <TabItem open title="General">
      <div class="mt-4 space-y-6">
        <Card class="p-6">
          <h3 class="mb-4 text-lg font-semibold text-gray-900 dark:text-white">Platform Settings</h3>

          <div class="space-y-4">
            <div>
              <Label for="platform-name" class="mb-2">Platform Name</Label>
              <Input id="platform-name" value="SqueezMedia" />
            </div>

            <div>
              <Label for="support-email" class="mb-2">Support Email</Label>
              <Input id="support-email" type="email" value="support@squeez.media" />
            </div>

            <div>
              <Label for="timezone" class="mb-2">Default Timezone</Label>
              <Select id="timezone">
                <option value="America/New_York">Eastern Time (ET)</option>
                <option value="America/Chicago">Central Time (CT)</option>
                <option value="America/Denver">Mountain Time (MT)</option>
                <option value="America/Los_Angeles">Pacific Time (PT)</option>
              </Select>
            </div>

            <div class="flex items-center justify-between">
              <div>
                <p class="font-medium text-gray-900 dark:text-white">Maintenance Mode</p>
                <p class="text-sm text-gray-500 dark:text-gray-400">Disable access for non-admin users</p>
              </div>
              <Toggle />
            </div>
          </div>

          <div class="mt-6">
            <Button>Save Changes</Button>
          </div>
        </Card>
      </div>
    </TabItem>

    <TabItem title="Notifications">
      <div class="mt-4 space-y-6">
        <Card class="p-6">
          <h3 class="mb-4 text-lg font-semibold text-gray-900 dark:text-white">Email Notifications</h3>

          <div class="space-y-4">
            <div class="flex items-center justify-between">
              <div>
                <p class="font-medium text-gray-900 dark:text-white">New Lead Alerts</p>
                <p class="text-sm text-gray-500 dark:text-gray-400">Send email when new leads come in</p>
              </div>
              <Toggle checked />
            </div>

            <div class="flex items-center justify-between">
              <div>
                <p class="font-medium text-gray-900 dark:text-white">Daily Summaries</p>
                <p class="text-sm text-gray-500 dark:text-gray-400">Send daily performance summaries</p>
              </div>
              <Toggle checked />
            </div>

            <div class="flex items-center justify-between">
              <div>
                <p class="font-medium text-gray-900 dark:text-white">Support Ticket Updates</p>
                <p class="text-sm text-gray-500 dark:text-gray-400">Notify on ticket status changes</p>
              </div>
              <Toggle checked />
            </div>

            <div class="flex items-center justify-between">
              <div>
                <p class="font-medium text-gray-900 dark:text-white">Billing Alerts</p>
                <p class="text-sm text-gray-500 dark:text-gray-400">Payment and invoice notifications</p>
              </div>
              <Toggle checked />
            </div>
          </div>

          <div class="mt-6">
            <Button>Save Preferences</Button>
          </div>
        </Card>
      </div>
    </TabItem>

    <TabItem title="Security">
      <div class="mt-4 space-y-6">
        <Card class="p-6">
          <h3 class="mb-4 text-lg font-semibold text-gray-900 dark:text-white">Security Settings</h3>

          <div class="space-y-4">
            <div class="flex items-center justify-between">
              <div>
                <p class="font-medium text-gray-900 dark:text-white">Two-Factor Authentication</p>
                <p class="text-sm text-gray-500 dark:text-gray-400">Require 2FA for all admin users</p>
              </div>
              <Toggle />
            </div>

            <div>
              <Label for="session-timeout" class="mb-2">Session Timeout (minutes)</Label>
              <Input id="session-timeout" type="number" value="60" />
            </div>

            <div class="flex items-center justify-between">
              <div>
                <p class="font-medium text-gray-900 dark:text-white">IP Whitelisting</p>
                <p class="text-sm text-gray-500 dark:text-gray-400">Restrict admin access by IP</p>
              </div>
              <Toggle />
            </div>
          </div>

          <div class="mt-6">
            <Button>Update Security</Button>
          </div>
        </Card>
      </div>
    </TabItem>

    <TabItem title="Integrations">
      <div class="mt-4 space-y-6">
        <Card class="p-6">
          <h3 class="mb-4 text-lg font-semibold text-gray-900 dark:text-white">API Integrations</h3>

          <div class="space-y-4">
            <div class="flex items-center justify-between rounded-lg border border-gray-200 p-4 dark:border-gray-700">
              <div class="flex items-center gap-3">
                <div class="rounded-lg bg-blue-100 p-2 dark:bg-blue-900">
                  <DatabaseOutline class="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p class="font-medium text-gray-900 dark:text-white">Stripe</p>
                  <p class="text-sm text-gray-500 dark:text-gray-400">Payment processing</p>
                </div>
              </div>
              <Badge color="green">Connected</Badge>
            </div>

            <div class="flex items-center justify-between rounded-lg border border-gray-200 p-4 dark:border-gray-700">
              <div class="flex items-center gap-3">
                <div class="rounded-lg bg-green-100 p-2 dark:bg-green-900">
                  <DatabaseOutline class="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p class="font-medium text-gray-900 dark:text-white">Twilio</p>
                  <p class="text-sm text-gray-500 dark:text-gray-400">SMS & voice</p>
                </div>
              </div>
              <Badge color="yellow">Not Configured</Badge>
            </div>

            <div class="flex items-center justify-between rounded-lg border border-gray-200 p-4 dark:border-gray-700">
              <div class="flex items-center gap-3">
                <div class="rounded-lg bg-indigo-100 p-2 dark:bg-indigo-900">
                  <DatabaseOutline class="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div>
                  <p class="font-medium text-gray-900 dark:text-white">Facebook Ads</p>
                  <p class="text-sm text-gray-500 dark:text-gray-400">Meta advertising</p>
                </div>
              </div>
              <Badge color="yellow">Not Configured</Badge>
            </div>

            <div class="flex items-center justify-between rounded-lg border border-gray-200 p-4 dark:border-gray-700">
              <div class="flex items-center gap-3">
                <div class="rounded-lg bg-red-100 p-2 dark:bg-red-900">
                  <DatabaseOutline class="h-5 w-5 text-red-600 dark:text-red-400" />
                </div>
                <div>
                  <p class="font-medium text-gray-900 dark:text-white">Google Ads</p>
                  <p class="text-sm text-gray-500 dark:text-gray-400">Google advertising</p>
                </div>
              </div>
              <Badge color="yellow">Not Configured</Badge>
            </div>
          </div>
        </Card>
      </div>
    </TabItem>
  </Tabs>
</div>
