<script lang="ts">
  import { Card, Progressbar } from 'flowbite-svelte';

  // Props
  export let viewsByDay: Array<{ date: string; views: number; submissions: number }> = [];
  export let trafficSources: Array<{ source: string; count: number; percentage: number }> = [];
  export let temperatureDistribution: { hot: number; warm: number; cold: number } = { hot: 0, warm: 0, cold: 0 };

  // Transform data for charts
  $: chartData = viewsByDay.map(d => ({
    date: new Date(d.date),
    dateLabel: formatDateLabel(d.date),
    views: d.views,
    submissions: d.submissions
  }));

  // Get max values for scaling
  $: maxViews = Math.max(...chartData.map(d => d.views), 1);
  $: maxSubmissions = Math.max(...chartData.map(d => d.submissions), 1);
  $: maxValue = Math.max(maxViews, maxSubmissions, 1);

  // Traffic sources for bar chart
  $: trafficData = trafficSources.slice(0, 6).map(s => ({
    source: s.source.charAt(0).toUpperCase() + s.source.slice(1),
    count: s.count,
    percentage: s.percentage
  }));

  $: maxTrafficCount = Math.max(...trafficData.map(d => d.count), 1);

  // Temperature data
  $: tempData = [
    { label: 'Hot', count: temperatureDistribution.hot, color: 'bg-red-500', textColor: 'text-red-500' },
    { label: 'Warm', count: temperatureDistribution.warm, color: 'bg-yellow-500', textColor: 'text-yellow-500' },
    { label: 'Cold', count: temperatureDistribution.cold, color: 'bg-blue-500', textColor: 'text-blue-500' }
  ];

  $: totalTemp = tempData.reduce((sum, d) => sum + d.count, 0);

  // Color mapping for traffic sources
  const sourceColorMap: Record<string, string> = {
    Google: 'bg-blue-500',
    Facebook: 'bg-indigo-600',
    Instagram: 'bg-pink-500',
    Website: 'bg-green-500',
    Referral: 'bg-purple-500',
    Direct: 'bg-gray-500',
    Other: 'bg-gray-400'
  };

  function getSourceColor(source: string): string {
    return sourceColorMap[source] || 'bg-gray-400';
  }

  function formatDateLabel(dateStr: string): string {
    const date = new Date(dateStr);
    return `${date.getMonth() + 1}/${date.getDate()}`;
  }

  // Calculate bar height percentage
  function getBarHeight(value: number, max: number): number {
    return max > 0 ? (value / max) * 100 : 0;
  }
</script>

<div class="grid gap-6 lg:grid-cols-2">
  <!-- Views vs Submissions Over Time -->
  <Card class="p-4">
    <h3 class="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
      Views vs Submissions (Last 30 Days)
    </h3>
    {#if chartData.length > 0}
      <div class="h-[300px] flex flex-col">
        <!-- Chart Area -->
        <div class="flex-1 flex items-end gap-1 border-b border-l border-gray-200 dark:border-gray-700 relative">
          <!-- Y-axis labels -->
          <div class="absolute left-0 top-0 bottom-0 w-8 flex flex-col justify-between text-xs text-gray-500 -ml-10">
            <span>{maxValue}</span>
            <span>{Math.round(maxValue / 2)}</span>
            <span>0</span>
          </div>

          {#each chartData as day, i}
            {#if i % 3 === 0}
              <div class="flex-1 flex flex-col items-center gap-1 h-full justify-end group">
                <!-- Views bar -->
                <div
                  class="w-2 bg-blue-500 rounded-t transition-all duration-300 hover:bg-blue-600"
                  style="height: {getBarHeight(day.views, maxValue)}%"
                  title="Views: {day.views}"
                ></div>
                <!-- Submissions bar -->
                <div
                  class="w-2 bg-green-500 rounded-t transition-all duration-300 hover:bg-green-600 -mt-1"
                  style="height: {getBarHeight(day.submissions, maxValue)}%"
                  title="Submissions: {day.submissions}"
                ></div>
                <!-- Tooltip on hover -->
                <div class="absolute bottom-full mb-2 hidden group-hover:block bg-gray-900 text-white text-xs rounded px-2 py-1 whitespace-nowrap z-10">
                  {day.dateLabel}: {day.views} views, {day.submissions} submissions
                </div>
              </div>
            {/if}
          {/each}
        </div>

        <!-- X-axis labels -->
        <div class="flex justify-between text-xs text-gray-500 mt-2 px-2">
          {#if chartData.length > 0}
            <span>{chartData[0]?.dateLabel || ''}</span>
            <span>{chartData[Math.floor(chartData.length / 2)]?.dateLabel || ''}</span>
            <span>{chartData[chartData.length - 1]?.dateLabel || ''}</span>
          {/if}
        </div>
      </div>

      <!-- Legend -->
      <div class="mt-4 flex items-center justify-center gap-6">
        <div class="flex items-center gap-2">
          <div class="h-3 w-3 rounded-full bg-blue-500"></div>
          <span class="text-sm text-gray-600 dark:text-gray-400">Views</span>
        </div>
        <div class="flex items-center gap-2">
          <div class="h-3 w-3 rounded-full bg-green-500"></div>
          <span class="text-sm text-gray-600 dark:text-gray-400">Submissions</span>
        </div>
      </div>
    {:else}
      <div class="flex h-[300px] items-center justify-center text-gray-500 dark:text-gray-400">
        No data available for the selected period
      </div>
    {/if}
  </Card>

  <!-- Traffic Sources -->
  <Card class="p-4">
    <h3 class="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
      Traffic Sources
    </h3>
    {#if trafficData.length > 0}
      <div class="space-y-4">
        {#each trafficData as source}
          <div>
            <div class="flex justify-between mb-1">
              <span class="text-sm font-medium text-gray-700 dark:text-gray-300">
                {source.source}
              </span>
              <span class="text-sm text-gray-500 dark:text-gray-400">
                {source.count} ({source.percentage}%)
              </span>
            </div>
            <div class="h-3 w-full rounded-full bg-gray-200 dark:bg-gray-700">
              <div
                class="{getSourceColor(source.source)} h-full rounded-full transition-all duration-500"
                style="width: {(source.count / maxTrafficCount) * 100}%"
              ></div>
            </div>
          </div>
        {/each}
      </div>

      <!-- Traffic Source Summary -->
      <div class="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
        <div class="flex justify-between text-sm">
          <span class="text-gray-500 dark:text-gray-400">Total Leads by Source:</span>
          <span class="font-medium text-gray-900 dark:text-white">
            {trafficData.reduce((sum, s) => sum + s.count, 0)}
          </span>
        </div>
      </div>
    {:else}
      <div class="flex h-[200px] items-center justify-center text-gray-500 dark:text-gray-400">
        No traffic source data available
      </div>
    {/if}
  </Card>

  <!-- Lead Temperature Distribution -->
  <Card class="p-4 lg:col-span-2">
    <h3 class="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
      Lead Temperature Distribution
    </h3>
    <div class="flex flex-col items-center gap-6 md:flex-row md:justify-around">
      {#each tempData as temp}
        <div class="flex flex-col items-center">
          <div
            class="flex h-24 w-24 items-center justify-center rounded-full text-white text-2xl font-bold {temp.color}"
          >
            {temp.count}
          </div>
          <div class="mt-2 text-lg font-medium text-gray-900 dark:text-white">
            {temp.label}
          </div>
          <div class="text-sm text-gray-500 dark:text-gray-400">
            {totalTemp > 0 ? Math.round((temp.count / totalTemp) * 100) : 0}% of leads
          </div>
        </div>
      {/each}
    </div>

    <!-- Temperature Progress Bar -->
    {#if totalTemp > 0}
      <div class="mt-6">
        <div class="flex h-4 overflow-hidden rounded-full">
          {#each tempData as temp}
            {#if temp.count > 0}
              <div
                class="{temp.color} transition-all duration-300"
                style="width: {(temp.count / totalTemp) * 100}%"
              ></div>
            {/if}
          {/each}
        </div>
        <div class="flex justify-between mt-2 text-xs text-gray-500">
          <span>Hot: {temperatureDistribution.hot}</span>
          <span>Warm: {temperatureDistribution.warm}</span>
          <span>Cold: {temperatureDistribution.cold}</span>
        </div>
      </div>
    {:else}
      <div class="mt-6 text-center text-gray-500 dark:text-gray-400">
        No leads to display
      </div>
    {/if}
  </Card>
</div>
