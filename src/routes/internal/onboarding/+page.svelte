<script lang="ts">
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();

  function getPhaseColor(phase: string): string {
    switch (phase) {
      case 'account_setup': return 'badge-primary';
      case 'voice_analysis': return 'badge-warning';
      case 'campaign_build': return 'badge-warning';
      case 'launch': return 'badge-success';
      case 'complete': return 'badge-success';
      default: return 'badge-gray';
    }
  }

  function formatPhase(phase: string): string {
    return phase.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }

  function formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  function getProgressPercent(completed: number, total: number): number {
    return total > 0 ? Math.round((completed / total) * 100) : 0;
  }
</script>

<svelte:head>
  <title>Onboarding - ILE Operations</title>
</svelte:head>

<div class="page-content">
  <!-- Stats Row -->
  <div class="grid grid-cols-4 mb-6">
    <div class="stat-card">
      <div class="stat-card-header">
        <div class="stat-card-icon primary">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>
            <rect x="8" y="2" width="8" height="4" rx="1" ry="1"/>
          </svg>
        </div>
      </div>
      <div class="stat-card-label">Active Onboardings</div>
      <div class="stat-card-value">{data.stats?.active || 0}</div>
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
      <div class="stat-card-label">Behind Schedule</div>
      <div class="stat-card-value">{data.stats?.behindSchedule || 0}</div>
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
      <div class="stat-card-label">Completed This Month</div>
      <div class="stat-card-value">{data.stats?.completedThisMonth || 0}</div>
    </div>

    <div class="stat-card">
      <div class="stat-card-header">
        <div class="stat-card-icon primary">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="20" x2="18" y2="10"/>
            <line x1="12" y1="20" x2="12" y2="4"/>
            <line x1="6" y1="20" x2="6" y2="14"/>
          </svg>
        </div>
      </div>
      <div class="stat-card-label">Avg Completion</div>
      <div class="stat-card-value">{data.stats?.avgDays || 12} days</div>
    </div>
  </div>

  <!-- Filters -->
  <div class="card mb-6">
    <div class="card-body">
      <div class="flex gap-4 items-center">
        <div class="flex-1">
          <input type="text" class="form-input" placeholder="Search clients..." value={data.filters?.search || ''}>
        </div>
        <select class="form-input form-select" style="width: 180px;">
          <option value="">All Phases</option>
          <option value="account_setup">Account Setup</option>
          <option value="voice_analysis">Voice Analysis</option>
          <option value="campaign_build">Campaign Build</option>
          <option value="launch">Launch</option>
        </select>
        <select class="form-input form-select" style="width: 150px;">
          <option value="">All Status</option>
          <option value="on_track">On Track</option>
          <option value="behind">Behind</option>
          <option value="blocked">Blocked</option>
        </select>
      </div>
    </div>
  </div>

  <!-- Onboarding List -->
  <div class="card">
    <div class="card-header">
      <h2 class="card-title">Active Onboardings</h2>
      <span class="text-sm text-gray-500">{data.onboardings?.length || 0} clients</span>
    </div>
    <div class="card-body">
      {#if data.onboardings && data.onboardings.length > 0}
        <div class="flex flex-col gap-4">
          {#each data.onboardings as onboarding}
            <div class="card" style="border: 1px solid var(--gray-200);">
              <div class="card-body">
                <div class="flex justify-between items-start mb-4">
                  <div>
                    <h3 class="font-semibold text-gray-900">{onboarding.organizationName}</h3>
                    <p class="text-sm text-gray-500">Started {formatDate(onboarding.startedAt)}</p>
                  </div>
                  <span class="badge {getPhaseColor(onboarding.currentPhase)}">
                    {formatPhase(onboarding.currentPhase)}
                  </span>
                </div>

                <div class="mb-2 flex justify-between text-sm">
                  <span class="text-gray-600">Progress</span>
                  <span class="font-medium">{onboarding.completedSteps}/{onboarding.totalSteps} steps</span>
                </div>
                <div class="progress-bar mb-4">
                  <div
                    class="progress-bar-fill"
                    style="width: {getProgressPercent(onboarding.completedSteps, onboarding.totalSteps)}%"
                  ></div>
                </div>

                <div class="flex justify-between items-center">
                  <span class="text-sm text-gray-500">
                    Target: {formatDate(onboarding.targetDate)}
                  </span>
                  <a href="/internal/clients/{onboarding.organizationId}" class="btn btn-sm btn-outline">
                    View Details
                  </a>
                </div>
              </div>
            </div>
          {/each}
        </div>
      {:else}
        <div class="empty-state">
          <div class="empty-state-icon">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>
              <rect x="8" y="2" width="8" height="4" rx="1" ry="1"/>
            </svg>
          </div>
          <h3 class="empty-state-title">No active onboardings</h3>
          <p class="empty-state-description">New clients will appear here when they start onboarding.</p>
        </div>
      {/if}
    </div>
  </div>
</div>
