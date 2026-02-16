<script lang="ts">
  import type { PageData } from './$types';
  import { enhance } from '$app/forms';

  let { data }: { data: PageData } = $props();

  // State for expanded cards
  let expandedCards = $state<Record<string, boolean>>({});

  // Helper functions
  function getInitials(name: string): string {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }

  function getPhaseStatusClass(status: string): string {
    switch (status) {
      case 'completed': return 'completed';
      case 'in_progress': return 'in-progress';
      case 'blocked': return 'blocked';
      default: return 'pending';
    }
  }

  function formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  }

  function getDaysRemaining(startedAt: string, daysInOnboarding: number): number {
    const targetDays = 14; // 14 day onboarding target
    return Math.max(0, targetDays - daysInOnboarding);
  }

  function getNextActions(onboarding: typeof data.onboardings[0]): string[] {
    const currentPhaseTasks = onboarding.tasks.filter(
      t => t.phase === onboarding.currentPhase && t.status !== 'completed'
    );
    return currentPhaseTasks.slice(0, 3).map(t => t.title);
  }

  function toggleCard(id: string): void {
    expandedCards[id] = !expandedCards[id];
  }

  function getProgressBarClass(progress: number): string {
    if (progress >= 75) return 'success';
    if (progress >= 50) return 'warning';
    if (progress >= 25) return 'primary';
    return 'primary';
  }
</script>

<svelte:head>
  <title>Onboarding Management | Internal</title>
</svelte:head>

<!-- Page Header -->
<div class="page-header">
  <div class="page-header-content">
    <h1 class="page-title">Onboarding Management</h1>
    <p class="page-subtitle">Track and manage client onboarding progress</p>
  </div>
</div>

<!-- Stats Row -->
<div class="stats-row">
  <div class="stat-card">
    <div class="stat-card-header">
      <div class="stat-card-icon primary">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
          <circle cx="8.5" cy="7" r="4"/>
          <line x1="20" y1="8" x2="20" y2="14"/>
          <line x1="23" y1="11" x2="17" y2="11"/>
        </svg>
      </div>
    </div>
    <div class="stat-card-label">Active Onboardings</div>
    <div class="stat-card-value">{data.stats.inProgress}</div>
    <div class="stat-card-change {data.stats.delayed > 0 ? 'negative' : 'neutral'}">
      {#if data.stats.delayed > 0}
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/>
          <line x1="12" y1="8" x2="12" y2="12"/>
          <line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
        {data.stats.delayed} delayed
      {:else}
        All on track
      {/if}
    </div>
  </div>

  <div class="stat-card">
    <div class="stat-card-header">
      <div class="stat-card-icon info">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
          <line x1="16" y1="2" x2="16" y2="6"/>
          <line x1="8" y1="2" x2="8" y2="6"/>
          <line x1="3" y1="10" x2="21" y2="10"/>
        </svg>
      </div>
    </div>
    <div class="stat-card-label">Phase 1 - Account Setup</div>
    <div class="stat-card-value">{data.stats.byPhase[1] ?? 0}</div>
    <div class="stat-card-change neutral">Days 1-2</div>
  </div>

  <div class="stat-card">
    <div class="stat-card-header">
      <div class="stat-card-icon warning">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polygon points="12 2 2 7 12 12 22 7 12 2"/>
          <polyline points="2 17 12 22 22 17"/>
          <polyline points="2 12 12 17 22 12"/>
        </svg>
      </div>
    </div>
    <div class="stat-card-label">Phase 2 - Voice Analysis</div>
    <div class="stat-card-value">{data.stats.byPhase[2] ?? 0}</div>
    <div class="stat-card-change neutral">Days 3-6</div>
  </div>

  <div class="stat-card">
    <div class="stat-card-header">
      <div class="stat-card-icon secondary">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
        </svg>
      </div>
    </div>
    <div class="stat-card-label">Phase 3 - Campaign Build</div>
    <div class="stat-card-value">{data.stats.byPhase[3] ?? 0}</div>
    <div class="stat-card-change neutral">Days 7-10</div>
  </div>

  <div class="stat-card">
    <div class="stat-card-header">
      <div class="stat-card-icon success">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
          <polyline points="22 4 12 14.01 9 11.01"/>
        </svg>
      </div>
    </div>
    <div class="stat-card-label">Completed This Month</div>
    <div class="stat-card-value">{data.stats.completedThisMonth}</div>
    <div class="stat-card-change positive">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/>
      </svg>
      Avg {data.stats.avgCompletionDays} days
    </div>
  </div>
</div>

<!-- Phase Pipeline View -->
<div class="pipeline-section">
  <div class="section-header">
    <h2 class="section-title">Onboarding Pipeline</h2>
    <span class="badge badge-primary">{data.onboardings.length} clients in progress</span>
  </div>

  <div class="pipeline-columns">
    {#each data.phaseDefinitions as phaseDef}
      {@const phaseOnboardings = data.onboardingsByPhase[phaseDef.phase as keyof typeof data.onboardingsByPhase]}
      <div class="pipeline-column">
        <div class="pipeline-column-header">
          <div class="pipeline-column-title">
            <span class="phase-number">Phase {phaseDef.phase}</span>
            <span class="phase-name">{phaseDef.name}</span>
          </div>
          <span class="pipeline-count">{phaseOnboardings.length}</span>
        </div>

        <div class="pipeline-cards">
          {#if phaseOnboardings.length === 0}
            <div class="pipeline-empty">No clients in this phase</div>
          {:else}
            {#each phaseOnboardings as onboarding}
              {@const daysRemaining = getDaysRemaining(onboarding.startedAt, onboarding.daysInOnboarding)}
              {@const nextActions = getNextActions(onboarding)}
              {@const currentPhaseData = onboarding.phases.find(p => p.phase === onboarding.currentPhase)}

              <div class="onboarding-card {onboarding.isDelayed ? 'delayed' : ''}">
                <div class="onboarding-card-header">
                  <div class="client-info-row">
                    <div class="client-avatar">{getInitials(onboarding.organization.name)}</div>
                    <div class="client-details">
                      <div class="client-name">{onboarding.organization.name}</div>
                      <div class="client-meta">
                        Started {formatDate(onboarding.startedAt)}
                      </div>
                    </div>
                  </div>
                  <button
                    class="expand-btn"
                    onclick={() => toggleCard(onboarding.id)}
                    aria-label="Toggle details"
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                      class="expand-icon {expandedCards[onboarding.id] ? 'expanded' : ''}"
                    >
                      <polyline points="6 9 12 15 18 9"/>
                    </svg>
                  </button>
                </div>

                <!-- Progress Bar -->
                <div class="progress-section">
                  <div class="progress-header">
                    <span class="progress-label">Overall Progress</span>
                    <span class="progress-value">{onboarding.overallProgress}%</span>
                  </div>
                  <div class="progress-bar">
                    <div
                      class="progress-bar-fill {getProgressBarClass(onboarding.overallProgress)}"
                      style="width: {onboarding.overallProgress}%"
                    ></div>
                  </div>
                </div>

                <!-- Days & Status Row -->
                <div class="status-row">
                  <div class="days-info">
                    <span class="days-count {onboarding.isDelayed ? 'delayed' : ''}">
                      {onboarding.daysInOnboarding}
                    </span>
                    <span class="days-label">days in</span>
                  </div>
                  {#if onboarding.isDelayed}
                    <span class="badge badge-danger">Delayed</span>
                  {:else if daysRemaining <= 3}
                    <span class="badge badge-warning">{daysRemaining} days left</span>
                  {:else}
                    <span class="badge badge-success">On Track</span>
                  {/if}
                </div>

                <!-- Phase Progress Dots -->
                <div class="phase-dots">
                  {#each onboarding.phases as phase}
                    <div
                      class="phase-dot {getPhaseStatusClass(phase.status)}"
                      title="Phase {phase.phase}: {phase.name} - {phase.status}"
                    >
                      {#if phase.status === 'completed'}
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                          <polyline points="20 6 9 17 4 12"/>
                        </svg>
                      {:else}
                        {phase.phase}
                      {/if}
                    </div>
                  {/each}
                </div>

                <!-- Expanded Details -->
                {#if expandedCards[onboarding.id]}
                  <div class="expanded-content">
                    <!-- Assigned Specialist -->
                    <div class="detail-section">
                      <div class="detail-label">Assigned To</div>
                      <form method="POST" action="?/assignSpecialist" use:enhance class="specialist-form">
                        <input type="hidden" name="onboardingId" value={onboarding.id} />
                        <select name="assignedTo" class="form-input form-select compact">
                          <option value="">Unassigned</option>
                          {#each data.specialists as specialist}
                            <option
                              value={specialist.id}
                              selected={onboarding.assignedTo?.id === specialist.id}
                            >
                              {specialist.name}
                            </option>
                          {/each}
                        </select>
                        <button type="submit" class="btn btn-sm btn-ghost">Save</button>
                      </form>
                    </div>

                    <!-- Next Actions -->
                    {#if nextActions.length > 0}
                      <div class="detail-section">
                        <div class="detail-label">Next Actions</div>
                        <ul class="action-list">
                          {#each nextActions as action}
                            <li class="action-item">
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <circle cx="12" cy="12" r="10"/>
                              </svg>
                              {action}
                            </li>
                          {/each}
                        </ul>
                      </div>
                    {/if}

                    <!-- Current Phase Tasks -->
                    <div class="detail-section">
                      <div class="detail-label">Phase {onboarding.currentPhase} Tasks</div>
                      <div class="tasks-list">
                        {#each onboarding.tasks.filter(t => t.phase === onboarding.currentPhase) as task}
                          <div class="task-item">
                            {#if task.status === 'completed'}
                              <form method="POST" action="?/uncompleteTask" use:enhance>
                                <input type="hidden" name="taskId" value={task.id} />
                                <input type="hidden" name="onboardingId" value={onboarding.id} />
                                <button type="submit" class="task-checkbox completed" title="Mark incomplete">
                                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                                    <polyline points="20 6 9 17 4 12"/>
                                  </svg>
                                </button>
                              </form>
                            {:else}
                              <form method="POST" action="?/completeTask" use:enhance>
                                <input type="hidden" name="taskId" value={task.id} />
                                <input type="hidden" name="onboardingId" value={onboarding.id} />
                                <button type="submit" class="task-checkbox" title="Mark complete"></button>
                              </form>
                            {/if}
                            <span class="task-title {task.status === 'completed' ? 'completed' : ''}">
                              {task.title}
                              {#if task.isRequired}
                                <span class="required-indicator">*</span>
                              {/if}
                            </span>
                          </div>
                        {/each}
                      </div>
                    </div>

                    <!-- Action Buttons -->
                    <div class="card-actions">
                      {#if onboarding.currentPhase < 4}
                        <form method="POST" action="?/advancePhase" use:enhance>
                          <input type="hidden" name="onboardingId" value={onboarding.id} />
                          <button type="submit" class="btn btn-sm btn-primary">
                            Advance to Phase {onboarding.currentPhase + 1}
                          </button>
                        </form>
                      {:else}
                        <form method="POST" action="?/completeOnboarding" use:enhance>
                          <input type="hidden" name="onboardingId" value={onboarding.id} />
                          <button type="submit" class="btn btn-sm btn-success">
                            Complete Onboarding
                          </button>
                        </form>
                      {/if}
                      <a href="/internal/clients/{onboarding.organization.id}" class="btn btn-sm btn-ghost">
                        View Client
                      </a>
                    </div>
                  </div>
                {/if}
              </div>
            {/each}
          {/if}
        </div>
      </div>
    {/each}
  </div>
</div>

<style>
  .page-header {
    margin-bottom: var(--spacing-6);
  }

  .page-header-content {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-1);
  }

  .page-title {
    font-size: 1.75rem;
    font-weight: 700;
    color: var(--gray-900);
    margin: 0;
  }

  .page-subtitle {
    font-size: 0.9375rem;
    color: var(--gray-500);
    margin: 0;
  }

  /* Stats Row - 5 columns for onboarding */
  .stats-row {
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    gap: var(--spacing-5);
    margin-bottom: var(--spacing-6);
  }

  @media (max-width: 1400px) {
    .stats-row {
      grid-template-columns: repeat(3, 1fr);
    }
  }

  @media (max-width: 900px) {
    .stats-row {
      grid-template-columns: repeat(2, 1fr);
    }
  }

  @media (max-width: 640px) {
    .stats-row {
      grid-template-columns: 1fr;
    }
  }

  .stat-card {
    background: white;
    border-radius: var(--radius-xl);
    padding: var(--spacing-5);
    border: 1px solid var(--gray-200);
  }

  .stat-card-header {
    margin-bottom: var(--spacing-3);
  }

  .stat-card-icon {
    width: 44px;
    height: 44px;
    border-radius: var(--radius-lg);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .stat-card-icon.primary {
    background: var(--primary-100);
    color: var(--primary-600);
  }

  .stat-card-icon.success {
    background: var(--success-100);
    color: var(--success-600);
  }

  .stat-card-icon.warning {
    background: var(--warning-100);
    color: var(--warning-600);
  }

  .stat-card-icon.info {
    background: #dbeafe;
    color: #2563eb;
  }

  .stat-card-icon.secondary {
    background: #f3e8ff;
    color: #9333ea;
  }

  .stat-card-label {
    font-size: 0.8125rem;
    color: var(--gray-500);
    margin-bottom: var(--spacing-1);
  }

  .stat-card-value {
    font-size: 1.75rem;
    font-weight: 700;
    color: var(--gray-900);
  }

  .stat-card-change {
    display: flex;
    align-items: center;
    gap: var(--spacing-1);
    font-size: 0.8125rem;
    margin-top: var(--spacing-2);
  }

  .stat-card-change.positive {
    color: var(--success-600);
  }

  .stat-card-change.negative {
    color: var(--danger-500);
  }

  .stat-card-change.neutral {
    color: var(--gray-500);
  }

  /* Section Header */
  .section-header {
    display: flex;
    align-items: center;
    gap: var(--spacing-3);
    margin-bottom: var(--spacing-4);
  }

  .section-title {
    font-size: 1.125rem;
    font-weight: 600;
    color: var(--gray-900);
    margin: 0;
  }

  /* Pipeline */
  .pipeline-section {
    background: white;
    border-radius: var(--radius-xl);
    border: 1px solid var(--gray-200);
    padding: var(--spacing-5);
  }

  .pipeline-columns {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: var(--spacing-4);
  }

  @media (max-width: 1200px) {
    .pipeline-columns {
      grid-template-columns: repeat(2, 1fr);
    }
  }

  @media (max-width: 768px) {
    .pipeline-columns {
      grid-template-columns: 1fr;
    }
  }

  .pipeline-column {
    background: var(--gray-50);
    border-radius: var(--radius-lg);
    padding: var(--spacing-3);
    min-height: 400px;
  }

  .pipeline-column-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--spacing-2) var(--spacing-3);
    margin-bottom: var(--spacing-3);
    background: white;
    border-radius: var(--radius-md);
    border: 1px solid var(--gray-200);
  }

  .pipeline-column-title {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .phase-number {
    font-size: 0.6875rem;
    font-weight: 600;
    color: var(--gray-400);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .phase-name {
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--gray-800);
  }

  .pipeline-count {
    width: 24px;
    height: 24px;
    border-radius: var(--radius-full);
    background: var(--primary-100);
    color: var(--primary-700);
    font-size: 0.75rem;
    font-weight: 600;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .pipeline-cards {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-3);
  }

  .pipeline-empty {
    text-align: center;
    padding: var(--spacing-6);
    color: var(--gray-400);
    font-size: 0.875rem;
  }

  /* Onboarding Card */
  .onboarding-card {
    background: white;
    border-radius: var(--radius-lg);
    border: 1px solid var(--gray-200);
    padding: var(--spacing-4);
    transition: all 0.2s ease;
  }

  .onboarding-card:hover {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
    border-color: var(--gray-300);
  }

  .onboarding-card.delayed {
    border-left: 3px solid var(--danger-500);
  }

  .onboarding-card-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: var(--spacing-3);
  }

  .client-info-row {
    display: flex;
    gap: var(--spacing-3);
    align-items: center;
  }

  .client-avatar {
    width: 36px;
    height: 36px;
    border-radius: var(--radius-lg);
    background: var(--primary-100);
    color: var(--primary-700);
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 600;
    font-size: 0.8125rem;
    flex-shrink: 0;
  }

  .client-details {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .client-name {
    font-weight: 600;
    font-size: 0.875rem;
    color: var(--gray-900);
    line-height: 1.2;
  }

  .client-meta {
    font-size: 0.75rem;
    color: var(--gray-500);
  }

  .expand-btn {
    width: 28px;
    height: 28px;
    border-radius: var(--radius-md);
    border: none;
    background: var(--gray-100);
    color: var(--gray-500);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s ease;
  }

  .expand-btn:hover {
    background: var(--gray-200);
    color: var(--gray-700);
  }

  .expand-icon {
    transition: transform 0.2s ease;
  }

  .expand-icon.expanded {
    transform: rotate(180deg);
  }

  /* Progress */
  .progress-section {
    margin-bottom: var(--spacing-3);
  }

  .progress-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: var(--spacing-2);
  }

  .progress-label {
    font-size: 0.75rem;
    color: var(--gray-500);
  }

  .progress-value {
    font-size: 0.75rem;
    font-weight: 600;
    color: var(--gray-700);
  }

  .progress-bar {
    height: 6px;
    background: var(--gray-200);
    border-radius: var(--radius-full);
    overflow: hidden;
  }

  .progress-bar-fill {
    height: 100%;
    border-radius: var(--radius-full);
    transition: width 0.3s ease;
  }

  .progress-bar-fill.primary {
    background: var(--primary-500);
  }

  .progress-bar-fill.warning {
    background: var(--warning-500);
  }

  .progress-bar-fill.success {
    background: var(--success-500);
  }

  /* Status Row */
  .status-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: var(--spacing-3);
  }

  .days-info {
    display: flex;
    align-items: baseline;
    gap: var(--spacing-1);
  }

  .days-count {
    font-size: 1.125rem;
    font-weight: 700;
    color: var(--gray-900);
  }

  .days-count.delayed {
    color: var(--danger-500);
  }

  .days-label {
    font-size: 0.75rem;
    color: var(--gray-500);
  }

  /* Badges */
  .badge {
    display: inline-flex;
    align-items: center;
    padding: 4px 10px;
    border-radius: var(--radius-full);
    font-size: 0.6875rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.025em;
  }

  .badge-primary {
    background: var(--primary-100);
    color: var(--primary-700);
  }

  .badge-success {
    background: var(--success-100);
    color: var(--success-700);
  }

  .badge-warning {
    background: var(--warning-100);
    color: var(--warning-600);
  }

  .badge-danger {
    background: var(--danger-100);
    color: var(--danger-600);
  }

  /* Phase Dots */
  .phase-dots {
    display: flex;
    gap: var(--spacing-2);
    justify-content: center;
    margin-bottom: var(--spacing-2);
  }

  .phase-dot {
    width: 24px;
    height: 24px;
    border-radius: var(--radius-full);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.6875rem;
    font-weight: 600;
    transition: all 0.2s ease;
  }

  .phase-dot.pending {
    background: var(--gray-200);
    color: var(--gray-500);
  }

  .phase-dot.in-progress {
    background: var(--primary-500);
    color: white;
  }

  .phase-dot.completed {
    background: var(--success-500);
    color: white;
  }

  .phase-dot.blocked {
    background: var(--danger-500);
    color: white;
  }

  /* Expanded Content */
  .expanded-content {
    border-top: 1px solid var(--gray-200);
    margin-top: var(--spacing-3);
    padding-top: var(--spacing-3);
  }

  .detail-section {
    margin-bottom: var(--spacing-4);
  }

  .detail-section:last-of-type {
    margin-bottom: var(--spacing-3);
  }

  .detail-label {
    font-size: 0.6875rem;
    font-weight: 600;
    color: var(--gray-400);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin-bottom: var(--spacing-2);
  }

  /* Specialist Form */
  .specialist-form {
    display: flex;
    gap: var(--spacing-2);
    align-items: center;
  }

  .form-input {
    padding: 8px 12px;
    border: 1px solid var(--gray-300);
    border-radius: var(--radius-md);
    font-size: 0.875rem;
    color: var(--gray-900);
    background: white;
    transition: all 0.2s ease;
  }

  .form-input:focus {
    outline: none;
    border-color: var(--primary-500);
    box-shadow: 0 0 0 3px var(--primary-100);
  }

  .form-select {
    cursor: pointer;
    appearance: none;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E");
    background-repeat: no-repeat;
    background-position: right 10px center;
    padding-right: 36px;
  }

  .form-input.compact {
    padding: 6px 10px;
    font-size: 0.8125rem;
    flex: 1;
  }

  /* Action List */
  .action-list {
    list-style: none;
    padding: 0;
    margin: 0;
  }

  .action-item {
    display: flex;
    align-items: center;
    gap: var(--spacing-2);
    padding: var(--spacing-2) 0;
    font-size: 0.8125rem;
    color: var(--gray-700);
    border-bottom: 1px solid var(--gray-100);
  }

  .action-item:last-child {
    border-bottom: none;
  }

  .action-item svg {
    color: var(--primary-500);
    flex-shrink: 0;
  }

  /* Tasks List */
  .tasks-list {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-2);
  }

  .task-item {
    display: flex;
    align-items: center;
    gap: var(--spacing-2);
  }

  .task-checkbox {
    width: 18px;
    height: 18px;
    border-radius: var(--radius-sm);
    border: 2px solid var(--gray-300);
    background: white;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    transition: all 0.2s ease;
  }

  .task-checkbox:hover {
    border-color: var(--primary-500);
    background: var(--primary-50);
  }

  .task-checkbox.completed {
    background: var(--success-500);
    border-color: var(--success-500);
    color: white;
  }

  .task-title {
    font-size: 0.8125rem;
    color: var(--gray-700);
  }

  .task-title.completed {
    text-decoration: line-through;
    color: var(--gray-400);
  }

  .required-indicator {
    color: var(--danger-500);
    font-weight: 600;
  }

  /* Card Actions */
  .card-actions {
    display: flex;
    gap: var(--spacing-2);
    margin-top: var(--spacing-3);
    padding-top: var(--spacing-3);
    border-top: 1px solid var(--gray-200);
  }

  /* Buttons */
  .btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: var(--spacing-2);
    padding: 10px 16px;
    border-radius: var(--radius-lg);
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    border: none;
    transition: all 0.2s ease;
    text-decoration: none;
  }

  .btn-sm {
    padding: 6px 12px;
    font-size: 0.8125rem;
    border-radius: var(--radius-md);
  }

  .btn-primary {
    background: var(--primary-600);
    color: white;
  }

  .btn-primary:hover {
    background: var(--primary-700);
  }

  .btn-success {
    background: var(--success-600);
    color: white;
  }

  .btn-success:hover {
    background: var(--success-700);
  }

  .btn-ghost {
    background: transparent;
    color: var(--gray-600);
    border: 1px solid var(--gray-200);
  }

  .btn-ghost:hover {
    background: var(--gray-50);
    border-color: var(--gray-300);
  }

  /* Mobile Responsive Styles */
  @media (max-width: 768px) {
    .page-header {
      margin-bottom: var(--spacing-4);
    }

    .page-title {
      font-size: 1.5rem;
    }

    /* Pipeline horizontal scroll on mobile */
    .pipeline-section {
      padding: var(--spacing-4);
    }

    .pipeline-columns {
      display: flex;
      overflow-x: auto;
      -webkit-overflow-scrolling: touch;
      scroll-snap-type: x mandatory;
      gap: var(--spacing-3);
      padding-bottom: var(--spacing-2);
      margin: 0 calc(-1 * var(--spacing-4));
      padding-left: var(--spacing-4);
      padding-right: var(--spacing-4);
    }

    .pipeline-column {
      flex: 0 0 280px;
      scroll-snap-align: start;
      min-height: 300px;
    }

    /* Onboarding card mobile */
    .onboarding-card {
      padding: var(--spacing-3);
    }

    .client-avatar {
      width: 44px;
      height: 44px;
      font-size: 0.9375rem;
    }

    .expand-btn {
      width: 44px;
      height: 44px;
      min-width: 44px;
    }

    /* Task checkboxes touch targets */
    .task-checkbox {
      width: 24px;
      height: 24px;
      min-width: 24px;
    }

    /* Button touch targets */
    .btn-sm {
      min-height: 44px;
      padding: 10px 16px;
    }

    .card-actions {
      flex-direction: column;
    }

    .card-actions .btn {
      width: 100%;
    }

    /* Specialist form mobile */
    .specialist-form {
      flex-direction: column;
      gap: var(--spacing-2);
    }

    .specialist-form .form-input {
      width: 100%;
    }

    .specialist-form .btn {
      width: 100%;
      min-height: 44px;
    }

    /* Section header mobile */
    .section-header {
      flex-direction: column;
      align-items: flex-start;
      gap: var(--spacing-2);
    }
  }

  @media (max-width: 480px) {
    .pipeline-column {
      flex: 0 0 260px;
    }

    .phase-dots {
      gap: var(--spacing-1);
    }

    .phase-dot {
      width: 20px;
      height: 20px;
      font-size: 0.625rem;
    }
  }
</style>
