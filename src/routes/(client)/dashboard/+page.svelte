<script lang="ts">
  import { Card, Badge, Button } from 'flowbite-svelte';
  import {
    UsersGroupOutline,
    ChartOutline,
    CashOutline,
    ArrowUpOutline,
    ArrowRightOutline
  } from 'flowbite-svelte-icons';
</script>

<div class="space-y-6">
  <!-- Page Header -->
  <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
    <div>
      <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
      <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
        Welcome back! Here's an overview of your lead generation performance.
      </p>
    </div>
    <div class="flex gap-2">
      <Button color="light" size="sm">
        Download Report
      </Button>
      <Button size="sm">
        View Leads
        <ArrowRightOutline class="ml-2 h-4 w-4" />
      </Button>
    </div>
  </div>

  <!-- Stats Grid -->
  <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
    <!-- Total Leads -->
    <Card class="p-4">
      <div class="flex items-center justify-between">
        <div>
          <p class="text-sm font-medium text-gray-500 dark:text-gray-400">Total Leads</p>
          <p class="mt-1 text-2xl font-bold text-gray-900 dark:text-white">1,234</p>
        </div>
        <div class="flex h-12 w-12 items-center justify-center rounded-lg bg-primary-100 dark:bg-primary-900">
          <UsersGroupOutline class="h-6 w-6 text-primary-600 dark:text-primary-300" />
        </div>
      </div>
      <div class="mt-3 flex items-center text-sm">
        <Badge color="green" class="mr-2">
          <ArrowUpOutline class="mr-1 h-3 w-3" />
          12%
        </Badge>
        <span class="text-gray-500 dark:text-gray-400">vs last month</span>
      </div>
    </Card>

    <!-- Conversion Rate -->
    <Card class="p-4">
      <div class="flex items-center justify-between">
        <div>
          <p class="text-sm font-medium text-gray-500 dark:text-gray-400">Conversion Rate</p>
          <p class="mt-1 text-2xl font-bold text-gray-900 dark:text-white">24.5%</p>
        </div>
        <div class="flex h-12 w-12 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900">
          <ChartOutline class="h-6 w-6 text-green-600 dark:text-green-300" />
        </div>
      </div>
      <div class="mt-3 flex items-center text-sm">
        <Badge color="green" class="mr-2">
          <ArrowUpOutline class="mr-1 h-3 w-3" />
          3.2%
        </Badge>
        <span class="text-gray-500 dark:text-gray-400">vs last month</span>
      </div>
    </Card>

    <!-- Revenue Generated -->
    <Card class="p-4">
      <div class="flex items-center justify-between">
        <div>
          <p class="text-sm font-medium text-gray-500 dark:text-gray-400">Revenue Generated</p>
          <p class="mt-1 text-2xl font-bold text-gray-900 dark:text-white">$48,250</p>
        </div>
        <div class="flex h-12 w-12 items-center justify-center rounded-lg bg-yellow-100 dark:bg-yellow-900">
          <CashOutline class="h-6 w-6 text-yellow-600 dark:text-yellow-300" />
        </div>
      </div>
      <div class="mt-3 flex items-center text-sm">
        <Badge color="green" class="mr-2">
          <ArrowUpOutline class="mr-1 h-3 w-3" />
          8.1%
        </Badge>
        <span class="text-gray-500 dark:text-gray-400">vs last month</span>
      </div>
    </Card>

    <!-- Cost Per Lead -->
    <Card class="p-4">
      <div class="flex items-center justify-between">
        <div>
          <p class="text-sm font-medium text-gray-500 dark:text-gray-400">Cost Per Lead</p>
          <p class="mt-1 text-2xl font-bold text-gray-900 dark:text-white">$42.50</p>
        </div>
        <div class="flex h-12 w-12 items-center justify-center rounded-lg bg-purple-100 dark:bg-purple-900">
          <ChartOutline class="h-6 w-6 text-purple-600 dark:text-purple-300" />
        </div>
      </div>
      <div class="mt-3 flex items-center text-sm">
        <Badge color="green" class="mr-2">
          <ArrowUpOutline class="mr-1 h-3 w-3" />
          -5.2%
        </Badge>
        <span class="text-gray-500 dark:text-gray-400">vs last month</span>
      </div>
    </Card>
  </div>

  <!-- Content Grid -->
  <div class="grid gap-6 lg:grid-cols-2">
    <!-- Recent Leads -->
    <Card>
      <div class="mb-4 flex items-center justify-between">
        <h2 class="text-lg font-semibold text-gray-900 dark:text-white">Recent Leads</h2>
        <a href="/leads" class="text-sm font-medium text-primary-600 hover:underline dark:text-primary-400">
          View all
        </a>
      </div>
      <div class="space-y-4">
        {#each [
          { name: 'John Smith', email: 'john@example.com', status: 'new', time: '2 min ago' },
          { name: 'Sarah Johnson', email: 'sarah@example.com', status: 'contacted', time: '15 min ago' },
          { name: 'Mike Davis', email: 'mike@example.com', status: 'qualified', time: '1 hour ago' },
          { name: 'Emily Brown', email: 'emily@example.com', status: 'new', time: '2 hours ago' }
        ] as lead}
          <div class="flex items-center justify-between rounded-lg border border-gray-100 p-3 dark:border-gray-700">
            <div class="flex items-center gap-3">
              <div class="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-sm font-medium text-gray-600 dark:bg-gray-700 dark:text-gray-300">
                {lead.name.split(' ').map(n => n[0]).join('')}
              </div>
              <div>
                <p class="font-medium text-gray-900 dark:text-white">{lead.name}</p>
                <p class="text-sm text-gray-500 dark:text-gray-400">{lead.email}</p>
              </div>
            </div>
            <div class="text-right">
              <Badge color={lead.status === 'new' ? 'blue' : lead.status === 'contacted' ? 'yellow' : 'green'}>
                {lead.status}
              </Badge>
              <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">{lead.time}</p>
            </div>
          </div>
        {/each}
      </div>
    </Card>

    <!-- Campaign Performance -->
    <Card>
      <div class="mb-4 flex items-center justify-between">
        <h2 class="text-lg font-semibold text-gray-900 dark:text-white">Campaign Performance</h2>
        <a href="/campaigns" class="text-sm font-medium text-primary-600 hover:underline dark:text-primary-400">
          View all
        </a>
      </div>
      <div class="space-y-4">
        {#each [
          { name: 'Google Ads - Implants', platform: 'Google', leads: 45, spend: '$1,250', status: 'active' },
          { name: 'Facebook Lead Gen', platform: 'Facebook', leads: 32, spend: '$890', status: 'active' },
          { name: 'Instagram Stories', platform: 'Instagram', leads: 18, spend: '$450', status: 'paused' }
        ] as campaign}
          <div class="rounded-lg border border-gray-100 p-3 dark:border-gray-700">
            <div class="flex items-center justify-between">
              <div>
                <p class="font-medium text-gray-900 dark:text-white">{campaign.name}</p>
                <p class="text-sm text-gray-500 dark:text-gray-400">{campaign.platform}</p>
              </div>
              <Badge color={campaign.status === 'active' ? 'green' : 'yellow'}>
                {campaign.status}
              </Badge>
            </div>
            <div class="mt-3 flex items-center justify-between text-sm">
              <div>
                <span class="text-gray-500 dark:text-gray-400">Leads: </span>
                <span class="font-medium text-gray-900 dark:text-white">{campaign.leads}</span>
              </div>
              <div>
                <span class="text-gray-500 dark:text-gray-400">Spend: </span>
                <span class="font-medium text-gray-900 dark:text-white">{campaign.spend}</span>
              </div>
            </div>
          </div>
        {/each}
      </div>
    </Card>
  </div>
</div>
