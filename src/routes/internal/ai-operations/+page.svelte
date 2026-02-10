<script lang="ts">
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();

  function getStatusColor(status: string): string {
    switch (status) {
      case 'completed': return 'badge-success';
      case 'processing': return 'badge-primary';
      case 'pending': return 'badge-warning';
      case 'failed': return 'badge-danger';
      default: return 'badge-gray';
    }
  }

  function formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  }
</script>

<svelte:head>
  <title>AI Operations - ILE Operations</title>
</svelte:head>

<div class="page-content">
  <!-- Stats Row -->
  <div class="grid grid-cols-4 mb-6">
    <div class="stat-card">
      <div class="stat-card-header">
        <div class="stat-card-icon primary">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="4" y="4" width="16" height="16" rx="2" ry="2"/>
            <rect x="9" y="9" width="6" height="6"/>
            <line x1="9" y1="1" x2="9" y2="4"/>
            <line x1="15" y1="1" x2="15" y2="4"/>
          </svg>
        </div>
      </div>
      <div class="stat-card-label">Voice Queue</div>
      <div class="stat-card-value">{data.voiceQueue?.length || 0}</div>
    </div>

    <div class="stat-card">
      <div class="stat-card-header">
        <div class="stat-card-icon success">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
            <polyline points="22 4 12 14.01 9 11.01"/>
          </svg>
        </div>
      </div>
      <div class="stat-card-label">Completed Today</div>
      <div class="stat-card-value">{data.stats?.completedToday || 0}</div>
    </div>

    <div class="stat-card">
      <div class="stat-card-header">
        <div class="stat-card-icon warning">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <polyline points="12 6 12 12 16 14"/>
          </svg>
        </div>
      </div>
      <div class="stat-card-label">Processing</div>
      <div class="stat-card-value">{data.stats?.processing || 0}</div>
    </div>

    <div class="stat-card">
      <div class="stat-card-header">
        <div class="stat-card-icon danger">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
        </div>
      </div>
      <div class="stat-card-label">Failed</div>
      <div class="stat-card-value">{data.stats?.failed || 0}</div>
    </div>
  </div>

  <div class="grid grid-cols-2">
    <!-- Voice Profile Queue -->
    <div class="card">
      <div class="card-header">
        <h2 class="card-title">Voice Profile Queue</h2>
        <span class="badge badge-primary">{data.voiceQueue?.length || 0} pending</span>
      </div>
      <div class="card-body">
        {#if data.voiceQueue && data.voiceQueue.length > 0}
          <div class="activity-feed">
            {#each data.voiceQueue as item}
              <div class="activity-item">
                <div class="activity-icon" style="background: var(--primary-100); color: var(--primary-600);">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                    <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                  </svg>
                </div>
                <div class="activity-content">
                  <div class="activity-title">{item.organizationName}</div>
                  <div class="activity-time">
                    <span class="badge {getStatusColor(item.status)}">{item.status}</span>
                    <span class="ml-2">{formatDate(item.createdAt)}</span>
                  </div>
                </div>
                <button class="btn btn-sm btn-primary">Process</button>
              </div>
            {/each}
          </div>
        {:else}
          <div class="empty-state">
            <p class="text-gray-500">No items in voice queue</p>
          </div>
        {/if}
      </div>
    </div>

    <!-- Campaign Factory -->
    <div class="card">
      <div class="card-header">
        <h2 class="card-title">Campaign Factory</h2>
        <span class="badge badge-success">{data.campaignQueue?.length || 0} ready</span>
      </div>
      <div class="card-body">
        {#if data.campaignQueue && data.campaignQueue.length > 0}
          <div class="activity-feed">
            {#each data.campaignQueue as item}
              <div class="activity-item">
                <div class="activity-icon" style="background: var(--success-100); color: var(--success-600);">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M3 11l18-5v12L3 13v-2z"/>
                    <path d="M11.6 16.8a3 3 0 1 1-5.8-1.6"/>
                  </svg>
                </div>
                <div class="activity-content">
                  <div class="activity-title">{item.name}</div>
                  <div class="activity-time">{item.organizationName}</div>
                </div>
                <button class="btn btn-sm btn-outline">View</button>
              </div>
            {/each}
          </div>
        {:else}
          <div class="empty-state">
            <p class="text-gray-500">No campaigns pending</p>
          </div>
        {/if}
      </div>
    </div>
  </div>

  <!-- Recent Activity -->
  <div class="card mt-6">
    <div class="card-header">
      <h2 class="card-title">Recent AI Activity</h2>
    </div>
    <div class="table-container">
      <table class="table">
        <thead>
          <tr>
            <th>Task</th>
            <th>Client</th>
            <th>Type</th>
            <th>Status</th>
            <th>Started</th>
            <th>Duration</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {#if data.recentTasks && data.recentTasks.length > 0}
            {#each data.recentTasks as task}
              <tr>
                <td class="font-medium">{task.name}</td>
                <td>{task.organizationName}</td>
                <td><span class="badge badge-gray">{task.type}</span></td>
                <td><span class="badge {getStatusColor(task.status)}">{task.status}</span></td>
                <td class="text-gray-500">{formatDate(task.startedAt)}</td>
                <td class="text-gray-500">{task.duration || '--'}</td>
                <td>
                  <button class="btn btn-sm btn-outline">View</button>
                </td>
              </tr>
            {/each}
          {:else}
            <tr>
              <td colspan="7" class="text-center text-gray-500 py-8">No recent AI activity</td>
            </tr>
          {/if}
        </tbody>
      </table>
    </div>
  </div>
</div>
