<script lang="ts">
  import { Card, Badge, Progressbar } from 'flowbite-svelte';
  import { RocketOutline, PauseOutline, CheckCircleOutline, ExclamationCircleOutline } from 'flowbite-svelte-icons';
  import { formatCurrency, formatNumber, getCampaignStatusColor, type CampaignStatus } from '$lib/utils';

  interface Campaign {
    id: string;
    name: string;
    platform: string;
    status: CampaignStatus | string;
    leadsThisMonth: number;
    spend: number;
    budget: number;
    cpl: number | null;
  }

  interface Props {
    campaigns: Campaign[];
    title?: string;
    showViewAll?: boolean;
    viewAllHref?: string;
  }

  let {
    campaigns,
    title = 'Campaign Health',
    showViewAll = true,
    viewAllHref = '/campaigns'
  }: Props = $props();

  // Get appropriate icon for campaign status
  function getStatusIcon(status: string) {
    switch (status) {
      case 'active':
        return RocketOutline;
      case 'paused':
        return PauseOutline;
      case 'completed':
        return CheckCircleOutline;
      default:
        return ExclamationCircleOutline;
    }
  }

  // Map status to Flowbite badge color
  function getBadgeColor(status: string) {
    switch (status) {
      case 'active':
        return 'green' as const;
      case 'paused':
        return 'yellow' as const;
      case 'completed':
        return 'blue' as const;
      case 'pending_review':
        return 'yellow' as const;
      default:
        return 'gray' as const;
    }
  }

  // Calculate budget usage percentage
  function getBudgetUsage(spend: number, budget: number): number {
    if (budget === 0) return 0;
    return Math.min(100, (spend / budget) * 100);
  }

  // Get progress bar color based on usage
  function getProgressColor(usage: number): 'green' | 'yellow' | 'red' | 'primary' {
    if (usage >= 90) return 'red';
    if (usage >= 75) return 'yellow';
    return 'primary';
  }
</script>

<Card>
  <div class="mb-4 flex items-center justify-between">
    <h2 class="text-lg font-semibold text-gray-900 dark:text-white">{title}</h2>
    {#if showViewAll}
      <a href={viewAllHref} class="text-sm font-medium text-primary-600 hover:underline dark:text-primary-400">
        View all
      </a>
    {/if}
  </div>

  {#if campaigns.length === 0}
    <div class="py-8 text-center text-gray-500 dark:text-gray-400">
      <p>No active campaigns. Create a campaign to get started!</p>
    </div>
  {:else}
    <div class="space-y-4">
      {#each campaigns as campaign (campaign.id)}
        {@const budgetUsage = getBudgetUsage(campaign.spend, campaign.budget)}
        {@const StatusIcon = getStatusIcon(campaign.status)}
        <a
          href="/campaigns/{campaign.id}"
          class="block rounded-lg border border-gray-100 p-4 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-700/50"
        >
          <div class="mb-3 flex items-center justify-between">
            <div class="flex items-center gap-2">
              <div class="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-100 dark:bg-primary-900">
                <StatusIcon class="h-4 w-4 text-primary-600 dark:text-primary-300" />
              </div>
              <div>
                <p class="font-medium text-gray-900 dark:text-white">{campaign.name}</p>
                <p class="text-xs text-gray-500 dark:text-gray-400">{campaign.platform}</p>
              </div>
            </div>
            <Badge color={getBadgeColor(campaign.status)}>
              {campaign.status === 'pending_review' ? 'Pending' : campaign.status.charAt(0).toUpperCase() + campaign.status.slice(1)}
            </Badge>
          </div>

          <div class="mb-2 grid grid-cols-3 gap-2 text-sm">
            <div>
              <p class="text-gray-500 dark:text-gray-400">Leads</p>
              <p class="font-medium text-gray-900 dark:text-white">{formatNumber(campaign.leadsThisMonth)}</p>
            </div>
            <div>
              <p class="text-gray-500 dark:text-gray-400">Spend</p>
              <p class="font-medium text-gray-900 dark:text-white">{formatCurrency(campaign.spend, { showCents: false })}</p>
            </div>
            <div>
              <p class="text-gray-500 dark:text-gray-400">CPL</p>
              <p class="font-medium text-gray-900 dark:text-white">
                {campaign.cpl !== null ? formatCurrency(campaign.cpl) : '-'}
              </p>
            </div>
          </div>

          <div class="mt-3">
            <div class="mb-1 flex justify-between text-xs">
              <span class="text-gray-500 dark:text-gray-400">Budget used</span>
              <span class="text-gray-700 dark:text-gray-300">{budgetUsage.toFixed(0)}%</span>
            </div>
            <Progressbar progress={budgetUsage} color={getProgressColor(budgetUsage)} size="h-1.5" />
          </div>
        </a>
      {/each}
    </div>
  {/if}
</Card>
