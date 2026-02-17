<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PageData, ActionData } from './$types';
	import VoiceCharacteristicsDisplay from '$lib/components/ai/VoiceCharacteristicsDisplay.svelte';
	import ContentReviewGrid from '$lib/components/ai/ContentReviewGrid.svelte';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	// Refs for form submissions (for programmatic form submission)
	let approveCreativeForm: HTMLFormElement;
	let rejectCreativeForm: HTMLFormElement;
	let bulkApproveForm: HTMLFormElement;
	let bulkRejectForm: HTMLFormElement;

	// Hidden form values for programmatic submissions
	let approveCreativeId = $state('');
	let rejectCreativeId = $state('');
	let bulkApproveIds = $state<string[]>([]);
	let bulkRejectIds = $state<string[]>([]);

	// Handlers for ContentReviewGrid actions
	function handleApproveCreative(id: string) {
		approveCreativeId = id;
		// Use setTimeout to ensure the state is updated before form submission
		setTimeout(() => approveCreativeForm?.requestSubmit(), 0);
	}

	function handleRejectCreative(id: string) {
		rejectCreativeId = id;
		setTimeout(() => rejectCreativeForm?.requestSubmit(), 0);
	}

	function handleBulkApprove(ids: string[]) {
		bulkApproveIds = ids;
		setTimeout(() => bulkApproveForm?.requestSubmit(), 0);
	}

	function handleBulkReject(ids: string[]) {
		bulkRejectIds = ids;
		setTimeout(() => bulkRejectForm?.requestSubmit(), 0);
	}

	// Transform pendingCreatives data to match ContentReviewGrid interface
	let contentReviewCreatives = $derived(
		data.pendingCreatives.map((creative) => ({
			id: creative.id,
			headline: creative.headline,
			body: creative.body,
			ctaText: creative.ctaText,
			status: creative.status || 'pending_review',
			aiGenerated: creative.aiGenerated ?? true,
			createdAt: creative.createdAt
		}))
	);

	// Modal states
	let showAddNoteModal = $state(false);
	let showScheduleReviewModal = $state(false);
	let showPauseCampaignsModal = $state(false);
	let showCreateVoiceProfileModal = $state(false);
	let showVoiceProfileDetailModal = $state(false);
	let showGenerateContentModal = $state(false);
	let showEditCreativeModal = $state(false);

	// Form states
	let noteType = $state('note');
	let noteTitle = $state('');
	let noteBody = $state('');
	let noteDirection = $state('internal');

	let reviewType = $state('monthly_performance');
	let reviewDate = $state('');
	let reviewLink = $state('');

	// AI/Voice Profile states
	let activeAiTab = $state(data.activeAiTab || 'voice-profile');
	let websiteUrl = $state(data.organization.website || '');
	let profileName = $state('Primary');
	let selectedVoiceProfile = $state<typeof data.voiceProfiles[0] | null>(null);
	let selectedCreative = $state<typeof data.pendingCreatives[0] | null>(null);
	let generateCampaignId = $state('');
	let generateVoiceProfileId = $state('');
	let generateCreativeType = $state('text_ad');
	let generateTopic = $state('');
	let generateCount = $state(3);
	let editHeadline = $state('');
	let editBody = $state('');
	let editCtaText = $state('');

	// Helper functions
	function formatCurrency(value: number): string {
		return new Intl.NumberFormat('en-US', {
			style: 'currency',
			currency: 'USD',
			minimumFractionDigits: 0,
			maximumFractionDigits: 0
		}).format(value);
	}

	function formatDate(dateStr: string, format: 'short' | 'medium' | 'datetime' | 'relative' = 'short'): string {
		const date = new Date(dateStr);
		if (format === 'relative') {
			const now = new Date();
			const diffMs = now.getTime() - date.getTime();
			const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
			if (diffDays === 0) return 'Today';
			if (diffDays === 1) return 'Yesterday';
			if (diffDays < 7) return `${diffDays} days ago`;
			if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
			return date.toLocaleDateString();
		}
		if (format === 'datetime') {
			return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
		}
		if (format === 'medium') {
			return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
		}
		return date.toLocaleDateString();
	}

	function formatPercent(value: number): string {
		return value.toFixed(1) + '%';
	}

	function formatPhone(phone: string): string {
		const cleaned = phone.replace(/\D/g, '');
		if (cleaned.length === 10) {
			return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
		}
		return phone;
	}

	function getInitials(first: string, last: string): string {
		return ((first?.[0] || '') + (last?.[0] || '')).toUpperCase();
	}

	function getHealthClass(score: number): string {
		if (score >= 85) return 'excellent';
		if (score >= 70) return 'good';
		if (score >= 50) return 'warning';
		return 'critical';
	}

	function getHealthLabel(score: number): string {
		if (score >= 85) return 'Excellent';
		if (score >= 70) return 'Good';
		if (score >= 50) return 'Warning';
		return 'Critical';
	}

	function getDaysUntil(dateStr: string): number {
		const date = new Date(dateStr);
		const now = new Date();
		return Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
	}

	// Calculate health score breakdown max
	const healthScoreMax = 25;

	// Health score level
	let healthLevel = $derived(getHealthClass(data.organization.healthScore));
	let healthLabel = $derived(getHealthLabel(data.organization.healthScore));

	// Contract days remaining
	let contractDaysRemaining = $derived(data.contract ? getDaysUntil(data.contract.endDate) : null);

	// Active campaigns
	let activeCampaigns = $derived(data.campaigns.filter((c) => c.status === 'active'));

	// Reset form after submission
	function resetNoteForm() {
		noteTitle = '';
		noteBody = '';
		noteType = 'note';
		noteDirection = 'internal';
	}

	function resetReviewForm() {
		reviewType = 'monthly_performance';
		reviewDate = '';
		reviewLink = '';
	}

	// AI helper functions
	function getVoiceStatusClass(status: string): string {
		switch (status) {
			case 'approved':
				return 'success';
			case 'in_review':
				return 'primary';
			case 'analyzing':
				return 'info';
			case 'pending':
				return 'warning';
			case 'rejected':
				return 'danger';
			default:
				return 'gray';
		}
	}

	function getVoiceStatusLabel(status: string): string {
		return status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
	}

	function openVoiceProfileDetail(profile: typeof data.voiceProfiles[0]) {
		selectedVoiceProfile = profile;
		showVoiceProfileDetailModal = true;
	}

	function openEditCreative(creative: typeof data.pendingCreatives[0]) {
		selectedCreative = creative;
		editHeadline = creative.headline || '';
		editBody = creative.body || '';
		editCtaText = creative.ctaText || '';
		showEditCreativeModal = true;
	}

	function resetVoiceProfileForm() {
		websiteUrl = data.organization.website || '';
		profileName = 'Primary';
	}

	function resetGenerateForm() {
		generateCampaignId = '';
		generateVoiceProfileId = data.voiceProfiles.find((v) => v.status === 'approved')?.id || '';
		generateCreativeType = 'text_ad';
		generateTopic = '';
		generateCount = 3;
	}

	// Get the primary/active voice profile
	let primaryVoiceProfile = $derived(
		data.voiceProfiles.find((v) => v.status === 'approved') || data.voiceProfiles[0] || null
	);

	// Get approved voice profiles for content generation
	let approvedVoiceProfiles = $derived(data.voiceProfiles.filter((v) => v.status === 'approved'));

	// Active campaigns for content generation dropdown
	let campaignsForGeneration = $derived(data.campaigns.filter((c) => c.status === 'active' || c.status === 'draft'));
</script>

<!-- Breadcrumb -->
<a href="/internal" class="back-link">
	<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
		<path d="M19 12H5M12 19l-7-7 7-7" />
	</svg>
	Back to Clients
</a>

<!-- Page Header -->
<div class="page-header">
	<div class="header-left">
		<div class="client-info">
			<div class="client-name-row">
				<h1 class="client-name">{data.organization.name}</h1>
				<span class="status-badge {data.organization.status}">{data.organization.status}</span>
			</div>
			<div class="client-meta">
				{#if data.territory}
					<span class="meta-item">
						<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
							<circle cx="12" cy="10" r="3" />
						</svg>
						{data.territory.location}
					</span>
				{/if}
				{#if data.organization.phone}
					<span class="meta-item">
						<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
						</svg>
						{formatPhone(data.organization.phone)}
					</span>
				{/if}
				{#if data.organization.clientSince}
					<span class="meta-item">
						<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
							<line x1="16" y1="2" x2="16" y2="6" />
							<line x1="8" y1="2" x2="8" y2="6" />
							<line x1="3" y1="10" x2="21" y2="10" />
						</svg>
						Client since {formatDate(data.organization.clientSince, 'medium')}
					</span>
				{/if}
			</div>
		</div>
	</div>
	<div class="header-actions">
		<a href="/internal/clients/{data.organization.id}/edit" class="btn btn-secondary">
			<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
				<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
				<path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
			</svg>
			Edit Client
		</a>
		<button type="button" class="btn btn-secondary" onclick={() => (showScheduleReviewModal = true)}>
			<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
				<rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
				<line x1="16" y1="2" x2="16" y2="6" />
				<line x1="8" y1="2" x2="8" y2="6" />
				<line x1="3" y1="10" x2="21" y2="10" />
			</svg>
			Schedule Review
		</button>
		<button type="button" class="btn btn-secondary" onclick={() => (showAddNoteModal = true)}>
			<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
				<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
			</svg>
			Add Note
		</button>
		{#if activeCampaigns.length > 0}
			<button type="button" class="btn btn-warning" onclick={() => (showPauseCampaignsModal = true)}>
				<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<rect x="6" y="4" width="4" height="16" />
					<rect x="14" y="4" width="4" height="16" />
				</svg>
				Pause Campaigns
			</button>
		{/if}
	</div>
</div>

<!-- Metrics Row -->
<div class="stats-row">
	<div class="stat-card">
		<div class="stat-card-header">
			<div class="stat-card-icon primary">
				<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
					<circle cx="9" cy="7" r="4" />
					<path d="M23 21v-2a4 4 0 0 0-3-3.87" />
					<path d="M16 3.13a4 4 0 0 1 0 7.75" />
				</svg>
			</div>
		</div>
		<div class="stat-card-label">Leads This Month</div>
		<div class="stat-card-value">{data.metrics.leadsThisMonth}</div>
		{#if data.metrics.leadsTrend !== 0}
			<div class="stat-card-change {data.metrics.leadsTrend >= 0 ? 'positive' : 'negative'}">
				{data.metrics.leadsTrend >= 0 ? '+' : ''}{data.metrics.leadsTrend.toFixed(1)}% vs last month
			</div>
		{/if}
	</div>

	<div class="stat-card">
		<div class="stat-card-header">
			<div class="stat-card-icon success">
				<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
					<line x1="1" y1="10" x2="23" y2="10" />
				</svg>
			</div>
		</div>
		<div class="stat-card-label">Cost Per Lead</div>
		<div class="stat-card-value">{formatCurrency(data.metrics.cpl)}</div>
		{#if data.metrics.cplChange !== 0}
			<div class="stat-card-change {data.metrics.cplChange <= 0 ? 'positive' : 'negative'}">
				{data.metrics.cplChange >= 0 ? '+' : ''}{data.metrics.cplChange.toFixed(1)}% vs last month
			</div>
		{/if}
	</div>

	<div class="stat-card">
		<div class="stat-card-header">
			<div class="stat-card-icon warning">
				<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
				</svg>
			</div>
		</div>
		<div class="stat-card-label">Monthly Spend</div>
		<div class="stat-card-value">{formatCurrency(data.metrics.spend)}</div>
	</div>

	<div class="stat-card">
		<div class="stat-card-header">
			<div class="stat-card-icon info">
				<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
				</svg>
			</div>
		</div>
		<div class="stat-card-label">Conversion Rate</div>
		<div class="stat-card-value">{formatPercent(data.metrics.conversionRate)}</div>
	</div>
</div>

<!-- Main Content Grid -->
<div class="content-grid">
	<!-- Left Column -->
	<div class="content-main">
		<!-- Health Score Card -->
		<div class="card">
			<div class="card-header">
				<h2 class="card-title">Health Score</h2>
				<div class="health-display">
					<span class="health-score {healthLevel}">{data.organization.healthScore}</span>
					<span class="health-badge {healthLevel}">{healthLabel}</span>
				</div>
			</div>
			<div class="card-body">
				{#if data.healthScoreBreakdown}
					<div class="health-breakdown">
						<div class="breakdown-item">
							<div class="breakdown-header">
								<span class="breakdown-label">Lead Volume (0-25)</span>
								<span class="breakdown-value">{data.healthScoreBreakdown.leadVolume.toFixed(1)}</span>
							</div>
							<div class="progress-bar">
								<div class="progress-fill" style="width: {(data.healthScoreBreakdown.leadVolume / healthScoreMax) * 100}%"></div>
							</div>
						</div>
						<div class="breakdown-item">
							<div class="breakdown-header">
								<span class="breakdown-label">Cost Efficiency (0-25)</span>
								<span class="breakdown-value">{data.healthScoreBreakdown.costEfficiency.toFixed(1)}</span>
							</div>
							<div class="progress-bar blue">
								<div class="progress-fill" style="width: {(data.healthScoreBreakdown.costEfficiency / healthScoreMax) * 100}%"></div>
							</div>
						</div>
						<div class="breakdown-item">
							<div class="breakdown-header">
								<span class="breakdown-label">Engagement (0-20)</span>
								<span class="breakdown-value">{data.healthScoreBreakdown.engagement.toFixed(1)}</span>
							</div>
							<div class="progress-bar purple">
								<div class="progress-fill" style="width: {(data.healthScoreBreakdown.engagement / 20) * 100}%"></div>
							</div>
						</div>
						<div class="breakdown-item">
							<div class="breakdown-header">
								<span class="breakdown-label">Payment History (0-15)</span>
								<span class="breakdown-value">{data.healthScoreBreakdown.paymentHistory.toFixed(1)}</span>
							</div>
							<div class="progress-bar green">
								<div class="progress-fill" style="width: {(data.healthScoreBreakdown.paymentHistory / 15) * 100}%"></div>
							</div>
						</div>
						<div class="breakdown-item">
							<div class="breakdown-header">
								<span class="breakdown-label">Contract Tenure (0-15)</span>
								<span class="breakdown-value">{data.healthScoreBreakdown.contractTenure.toFixed(1)}</span>
							</div>
							<div class="progress-bar orange">
								<div class="progress-fill" style="width: {(data.healthScoreBreakdown.contractTenure / 15) * 100}%"></div>
							</div>
						</div>
					</div>
					<p class="breakdown-timestamp">Last calculated: {formatDate(data.healthScoreBreakdown.calculatedAt, 'datetime')}</p>
				{:else}
					<p class="empty-text">No health score data available</p>
				{/if}
			</div>
		</div>

		<!-- AI Operations Card -->
		<div class="card ai-operations-card">
			<div class="card-header">
				<h2 class="card-title">AI Operations</h2>
				<div class="ai-tabs">
					<button
						type="button"
						class="ai-tab"
						class:active={activeAiTab === 'voice-profile'}
						onclick={() => (activeAiTab = 'voice-profile')}
					>
						Voice Profile
					</button>
					<button
						type="button"
						class="ai-tab"
						class:active={activeAiTab === 'content'}
						onclick={() => (activeAiTab = 'content')}
					>
						Content
						{#if data.pendingCreatives.length > 0}
							<span class="ai-tab-badge">{data.pendingCreatives.length}</span>
						{/if}
					</button>
				</div>
			</div>

			<!-- Voice Profile Tab -->
			{#if activeAiTab === 'voice-profile'}
				<div class="card-body">
					{#if data.voiceProfiles.length === 0}
						<!-- No Voice Profile Yet -->
						<div class="empty-state-ai">
							<div class="empty-state-icon-ai">
								<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
									<path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
									<path d="M19 10v2a7 7 0 0 1-14 0v-2" />
									<line x1="12" y1="19" x2="12" y2="22" />
								</svg>
							</div>
							<h3 class="empty-state-title-ai">No Voice Profile Yet</h3>
							<p class="empty-state-description-ai">
								Create a voice profile to enable AI-powered content generation that matches this client's brand voice.
							</p>
							<button type="button" class="btn btn-primary" onclick={() => (showCreateVoiceProfileModal = true)}>
								<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
									<line x1="12" y1="5" x2="12" y2="19" />
									<line x1="5" y1="12" x2="19" y2="12" />
								</svg>
								Create Voice Profile
							</button>
						</div>
					{:else}
						<!-- Voice Profile List -->
						<div class="voice-profile-list">
							{#each data.voiceProfiles as profile}
								<div class="voice-profile-item" class:primary={profile.status === 'approved'}>
									<div class="voice-profile-header">
										<div class="voice-profile-info">
											<span class="voice-profile-name">{profile.name}</span>
											<span class="status-badge {getVoiceStatusClass(profile.status)}">
												{getVoiceStatusLabel(profile.status)}
											</span>
										</div>
										<button
											type="button"
											class="btn btn-sm btn-secondary"
											onclick={() => openVoiceProfileDetail(profile)}
										>
											View
										</button>
									</div>

									{#if profile.status === 'approved'}
										<div class="voice-profile-details">
											{#if profile.tone}
												<div class="voice-detail-item">
													<span class="voice-detail-label">Tone:</span>
													<span class="voice-detail-value">{profile.tone}</span>
												</div>
											{/if}
											{#if profile.formalityLevel}
												<div class="voice-detail-item">
													<span class="voice-detail-label">Formality:</span>
													<span class="voice-detail-value capitalize">{profile.formalityLevel}</span>
												</div>
											{/if}
											{#if profile.personality}
												<div class="voice-detail-item">
													<span class="voice-detail-label">Personality:</span>
													<span class="voice-detail-value">{profile.personality}</span>
												</div>
											{/if}
											{#if profile.qualityScore}
												<div class="voice-detail-item">
													<span class="voice-detail-label">Quality:</span>
													<span class="quality-score-badge" class:high={profile.qualityScore >= 80} class:medium={profile.qualityScore >= 60 && profile.qualityScore < 80} class:low={profile.qualityScore < 60}>
														{profile.qualityScore}
													</span>
												</div>
											{/if}
										</div>
										<!-- Voice Characteristics Display -->
										<div class="voice-characteristics-section">
											<VoiceCharacteristicsDisplay
												tone={profile.tone}
												personality={profile.personality}
												formalityLevel={profile.formalityLevel}
												keyDifferentiators={profile.keyDifferentiators}
												preferredTerms={profile.preferredTerms}
												avoidTerms={profile.avoidTerms}
												qualityScore={profile.qualityScore}
											/>
										</div>
									{:else if profile.status === 'pending'}
										<div class="voice-profile-actions">
											<form method="POST" action="?/startVoiceAnalysis" use:enhance>
												<input type="hidden" name="voiceProfileId" value={profile.id} />
												<button type="submit" class="btn btn-sm btn-primary">Start Analysis</button>
											</form>
											<span class="voice-source-count">{profile.sources.length} source(s)</span>
										</div>
									{:else if profile.status === 'analyzing'}
										<div class="voice-profile-status">
											<div class="analyzing-indicator">
												<div class="spinner-sm"></div>
												<span>Analysis in progress...</span>
											</div>
											<form method="POST" action="?/completeVoiceAnalysis" use:enhance>
												<input type="hidden" name="voiceProfileId" value={profile.id} />
												<input type="hidden" name="tone" value="Professional and Caring" />
												<input type="hidden" name="personality" value="Expert yet approachable" />
												<input type="hidden" name="formalityLevel" value="professional" />
												<input type="hidden" name="targetAudience" value="Adults 35-65 considering dental implants" />
												<button type="submit" class="btn btn-sm btn-success">Complete Analysis</button>
											</form>
										</div>
									{:else if profile.status === 'in_review'}
										<div class="voice-profile-review">
											<p class="review-text">Ready for approval</p>
											<div class="review-actions">
												<form method="POST" action="?/approveVoiceProfile" use:enhance>
													<input type="hidden" name="voiceProfileId" value={profile.id} />
													<button type="submit" class="btn btn-sm btn-success">Approve</button>
												</form>
												<form method="POST" action="?/rejectVoiceProfile" use:enhance>
													<input type="hidden" name="voiceProfileId" value={profile.id} />
													<button type="submit" class="btn btn-sm btn-danger">Reject</button>
												</form>
											</div>
										</div>
									{:else if profile.status === 'rejected'}
										<div class="voice-profile-rejected">
											<p class="rejection-text">Rejected: {profile.rejectionReason || 'No reason provided'}</p>
										</div>
									{/if}
								</div>
							{/each}
						</div>

						<!-- Add Another Profile Button -->
						<div class="add-profile-action">
							<button type="button" class="btn btn-sm btn-secondary" onclick={() => (showCreateVoiceProfileModal = true)}>
								<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
									<line x1="12" y1="5" x2="12" y2="19" />
									<line x1="5" y1="12" x2="19" y2="12" />
								</svg>
								Add Profile
							</button>
						</div>
					{/if}
				</div>
			{/if}

			<!-- Content Generation Tab -->
			{#if activeAiTab === 'content'}
				<div class="card-body">
					{#if approvedVoiceProfiles.length === 0}
						<!-- No Approved Voice Profile -->
						<div class="empty-state-ai">
							<div class="empty-state-icon-ai warning">
								<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
									<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
									<line x1="12" y1="9" x2="12" y2="13" />
									<line x1="12" y1="17" x2="12.01" y2="17" />
								</svg>
							</div>
							<h3 class="empty-state-title-ai">Voice Profile Required</h3>
							<p class="empty-state-description-ai">
								An approved voice profile is required before generating AI content. Please create and approve a voice profile first.
							</p>
							<button type="button" class="btn btn-secondary" onclick={() => (activeAiTab = 'voice-profile')}>
								Go to Voice Profile
							</button>
						</div>
					{:else}
						<!-- Content Generation Available -->
						<div class="content-generation-section">
							<!-- Generate Button -->
							<div class="generate-header">
								<h4 class="generate-title">Generate AI Content</h4>
								<button type="button" class="btn btn-primary" onclick={() => (showGenerateContentModal = true)}>
									<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
										<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
									</svg>
									Generate Content
								</button>
							</div>

							<!-- Content Review Grid -->
							{#if data.pendingCreatives.length > 0}
								<div class="pending-creatives-section">
									<h5 class="section-subtitle">Pending Review ({data.pendingCreatives.length})</h5>
									<ContentReviewGrid
										creatives={contentReviewCreatives}
										onApprove={handleApproveCreative}
										onReject={handleRejectCreative}
										onEdit={openEditCreative}
										onBulkApprove={handleBulkApprove}
										onBulkReject={handleBulkReject}
									/>
								</div>
							{/if}

							<!-- Hidden forms for programmatic submissions -->
							<form
								bind:this={approveCreativeForm}
								method="POST"
								action="?/approveCreative"
								use:enhance
								class="hidden"
							>
								<input type="hidden" name="creativeId" value={approveCreativeId} />
							</form>

							<form
								bind:this={rejectCreativeForm}
								method="POST"
								action="?/rejectCreative"
								use:enhance
								class="hidden"
							>
								<input type="hidden" name="creativeId" value={rejectCreativeId} />
							</form>

							<form
								bind:this={bulkApproveForm}
								method="POST"
								action="?/bulkApproveCreatives"
								use:enhance
								class="hidden"
							>
								<input type="hidden" name="creativeIds" value={JSON.stringify(bulkApproveIds)} />
							</form>

							<form
								bind:this={bulkRejectForm}
								method="POST"
								action="?/bulkRejectCreatives"
								use:enhance
								class="hidden"
							>
								<input type="hidden" name="creativeIds" value={JSON.stringify(bulkRejectIds)} />
							</form>

							<!-- Recent Creatives Section -->
							{#if data.recentCreatives.length > 0}
								<div class="recent-creatives-section">
									<h5 class="section-subtitle">Recent Creatives</h5>
									<div class="recent-creatives-list">
										{#each data.recentCreatives as creative}
											<div class="recent-creative-item">
												<div class="recent-creative-info">
													<span class="recent-creative-headline">{creative.headline || 'No headline'}</span>
													<span class="recent-creative-campaign">{creative.campaign.name}</span>
												</div>
												<span class="status-badge {creative.status === 'approved' ? 'success' : 'danger'}">
													{creative.status}
												</span>
											</div>
										{/each}
									</div>
								</div>
							{/if}
						</div>
					{/if}
				</div>
			{/if}
		</div>

		<!-- Campaigns Card -->
		<div class="card">
			<div class="card-header">
				<h2 class="card-title">Campaigns</h2>
				<span class="badge">{data.campaigns.length}</span>
			</div>
			<div class="table-container">
				<table class="table">
					<thead>
						<tr>
							<th>Campaign</th>
							<th>Platform</th>
							<th>Status</th>
							<th>Budget</th>
							<th>Leads</th>
						</tr>
					</thead>
					<tbody>
						{#if data.campaigns.length === 0}
							<tr>
								<td colspan="5">
									<div class="empty-state">
										<p>No campaigns yet</p>
									</div>
								</td>
							</tr>
						{:else}
							{#each data.campaigns as campaign}
								<tr>
									<td>
										<div class="campaign-name">{campaign.name}</div>
										<div class="campaign-type">{campaign.type}</div>
									</td>
									<td><span class="badge gray">{campaign.platform}</span></td>
									<td>
										<span class="status-badge {campaign.status}">{campaign.status}</span>
									</td>
									<td>{campaign.dailyBudget ? formatCurrency(campaign.dailyBudget) + '/day' : '-'}</td>
									<td><span class="lead-count">{campaign.leadCount}</span></td>
								</tr>
							{/each}
						{/if}
					</tbody>
				</table>
			</div>
		</div>

		<!-- Recent Leads Card -->
		<div class="card">
			<div class="card-header">
				<h2 class="card-title">Recent Leads</h2>
				<span class="badge">{data.metrics.totalLeads} total</span>
			</div>
			<div class="table-container">
				<table class="table">
					<thead>
						<tr>
							<th>Name</th>
							<th>Contact</th>
							<th>Status</th>
							<th>Source</th>
							<th>Date</th>
						</tr>
					</thead>
					<tbody>
						{#if data.recentLeads.length === 0}
							<tr>
								<td colspan="5">
									<div class="empty-state">
										<p>No leads yet</p>
									</div>
								</td>
							</tr>
						{:else}
							{#each data.recentLeads as lead}
								<tr>
									<td><span class="lead-name">{lead.name}</span></td>
									<td>
										<div class="lead-contact">
											{#if lead.email}<div class="lead-email">{lead.email}</div>{/if}
											{#if lead.phone}<div class="lead-phone">{formatPhone(lead.phone)}</div>{/if}
										</div>
									</td>
									<td><span class="status-badge {lead.status}">{lead.status}</span></td>
									<td><span class="badge gray">{lead.source}</span></td>
									<td><span class="date-text">{formatDate(lead.createdAt, 'short')}</span></td>
								</tr>
							{/each}
						{/if}
					</tbody>
				</table>
			</div>
		</div>

		<!-- Communication Log Card -->
		<div class="card">
			<div class="card-header">
				<h2 class="card-title">Communication Log</h2>
				<button type="button" class="btn btn-sm btn-secondary" onclick={() => (showAddNoteModal = true)}>
					<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<line x1="12" y1="5" x2="12" y2="19" />
						<line x1="5" y1="12" x2="19" y2="12" />
					</svg>
					Add Entry
				</button>
			</div>
			<div class="card-body">
				{#if data.communicationLog.length === 0}
					<div class="empty-state">
						<p>No communication logs yet</p>
					</div>
				{:else}
					<div class="timeline">
						{#each data.communicationLog as entry}
							<div class="timeline-item">
								<div class="timeline-marker"></div>
								<div class="timeline-content">
									<div class="timeline-header">
										<span class="timeline-title">{entry.title}</span>
										<span class="timeline-date">{formatDate(entry.createdAt, 'datetime')}</span>
									</div>
									<div class="timeline-badges">
										<span class="badge gray">{entry.type}</span>
										{#if entry.direction}
											<span class="badge {entry.direction === 'inbound' ? 'blue' : entry.direction === 'outbound' ? 'green' : 'gray'}">
												{entry.direction}
											</span>
										{/if}
									</div>
									{#if entry.body}
										<p class="timeline-body">{entry.body}</p>
									{/if}
									<p class="timeline-author">By {entry.createdBy}</p>
								</div>
							</div>
						{/each}
					</div>
				{/if}
			</div>
		</div>
	</div>

	<!-- Right Column -->
	<div class="content-sidebar">
		<!-- Contract Card -->
		<div class="card">
			<div class="card-header">
				<h2 class="card-title">Contract</h2>
			</div>
			<div class="card-body">
				{#if data.contract}
					<div class="info-list">
						<div class="info-row">
							<span class="info-label">Status</span>
							<span class="status-badge {data.contract.status}">{data.contract.status}</span>
						</div>
						<div class="info-row">
							<span class="info-label">Plan</span>
							<span class="info-value">{data.contract.plan}</span>
						</div>
						<div class="info-row">
							<span class="info-label">Monthly</span>
							<span class="info-value">{formatCurrency(data.contract.monthlyCommitment)}</span>
						</div>
						<div class="info-row">
							<span class="info-label">Term</span>
							<span class="info-value">{data.contract.termMonths} months</span>
						</div>
						<div class="info-row">
							<span class="info-label">Ends</span>
							<span class="info-value">{formatDate(data.contract.endDate, 'medium')}</span>
						</div>
						{#if contractDaysRemaining !== null}
							<div class="contract-countdown {contractDaysRemaining <= 30 ? 'danger' : contractDaysRemaining <= 60 ? 'warning' : 'success'}">
								{contractDaysRemaining} days remaining
							</div>
						{/if}
						<div class="info-row">
							<span class="info-label">Auto-renew</span>
							<span class="info-value">{data.contract.autoRenew ? 'Yes' : 'No'}</span>
						</div>
					</div>
				{:else}
					<p class="empty-text">No active contract</p>
				{/if}
			</div>
		</div>

		<!-- Territory Card -->
		<div class="card">
			<div class="card-header">
				<h2 class="card-title">Territory</h2>
			</div>
			<div class="card-body">
				{#if data.territory}
					<div class="info-list">
						<div class="info-row">
							<span class="info-label">Name</span>
							<span class="info-value">{data.territory.name}</span>
						</div>
						<div class="info-row">
							<span class="info-label">Location</span>
							<span class="info-value">{data.territory.location}</span>
						</div>
						<div class="info-row">
							<span class="info-label">Radius</span>
							<span class="info-value">{data.territory.radiusMiles} miles</span>
						</div>
						<div class="info-row">
							<span class="info-label">Type</span>
							<span class="badge gray">{data.territory.type}</span>
						</div>
						{#if data.territory.population}
							<div class="info-row">
								<span class="info-label">Population</span>
								<span class="info-value">{data.territory.population.toLocaleString()}</span>
							</div>
						{/if}
						{#if data.territory.medianIncome}
							<div class="info-row">
								<span class="info-label">Median Income</span>
								<span class="info-value">{formatCurrency(data.territory.medianIncome)}</span>
							</div>
						{/if}
						<div class="info-row">
							<span class="info-label">Monthly Rate</span>
							<span class="info-value">{formatCurrency(data.territory.monthlyRate)}</span>
						</div>
					</div>
				{:else}
					<p class="empty-text">No territory assigned</p>
				{/if}
			</div>
		</div>

		<!-- Account Manager Card -->
		<div class="card">
			<div class="card-header">
				<h2 class="card-title">Account Manager</h2>
			</div>
			<div class="card-body">
				{#if data.accountManager}
					<div class="manager-card">
						<div class="manager-avatar">{getInitials(data.accountManager.name.split(' ')[0], data.accountManager.name.split(' ')[1] || '')}</div>
						<div class="manager-info">
							<div class="manager-name">{data.accountManager.name}</div>
							<div class="manager-email">{data.accountManager.email}</div>
						</div>
					</div>
				{:else}
					<p class="empty-text">No account manager assigned</p>
				{/if}
			</div>
		</div>

		<!-- Contacts Card -->
		<div class="card">
			<div class="card-header">
				<h2 class="card-title">Contacts</h2>
			</div>
			<div class="card-body">
				{#if data.contacts.length === 0}
					<p class="empty-text">No contacts</p>
				{:else}
					<div class="contacts-list">
						{#each data.contacts as contact}
							<div class="contact-item" class:primary={contact.isPrimary}>
								<div class="contact-main">
									<div class="contact-name">
										{contact.name}
										{#if contact.isPrimary}
											<span class="badge primary">Primary</span>
										{/if}
									</div>
									{#if contact.title}
										<div class="contact-title">{contact.title}</div>
									{/if}
									{#if contact.email}
										<div class="contact-detail">{contact.email}</div>
									{/if}
									{#if contact.phone}
										<div class="contact-detail">{formatPhone(contact.phone)}</div>
									{/if}
								</div>
								<span class="badge gray">{contact.type}</span>
							</div>
						{/each}
					</div>
				{/if}
			</div>
		</div>

		<!-- Recent Invoices Card -->
		<div class="card">
			<div class="card-header">
				<h2 class="card-title">Recent Invoices</h2>
			</div>
			<div class="card-body">
				{#if data.recentInvoices.length === 0}
					<p class="empty-text">No invoices</p>
				{:else}
					<div class="invoices-list">
						{#each data.recentInvoices as invoice}
							<div class="invoice-item">
								<div class="invoice-main">
									<div class="invoice-number">{invoice.invoiceNumber}</div>
									<div class="invoice-date">{formatDate(invoice.issueDate, 'short')}</div>
								</div>
								<div class="invoice-right">
									<div class="invoice-amount">{formatCurrency(invoice.totalAmount)}</div>
									<span class="status-badge {invoice.status}">{invoice.status}</span>
								</div>
							</div>
						{/each}
					</div>
				{/if}
			</div>
		</div>

		<!-- Team Members Card -->
		<div class="card">
			<div class="card-header">
				<h2 class="card-title">Team ({data.teamMembers.length})</h2>
			</div>
			<div class="card-body">
				{#if data.teamMembers.length === 0}
					<p class="empty-text">No team members</p>
				{:else}
					<div class="team-list">
						{#each data.teamMembers as member}
							<div class="team-item" class:inactive={!member.isActive}>
								<div class="team-avatar">{getInitials(member.name.split(' ')[0], member.name.split(' ')[1] || '')}</div>
								<div class="team-info">
									<div class="team-name">{member.name}</div>
									<div class="team-role">{member.role.replace('_', ' ')}</div>
								</div>
								{#if member.lastLoginAt}
									<span class="team-login">{formatDate(member.lastLoginAt, 'relative')}</span>
								{:else}
									<span class="badge gray">Never</span>
								{/if}
							</div>
						{/each}
					</div>
				{/if}
			</div>
		</div>
	</div>
</div>

<!-- Add Note Modal -->
{#if showAddNoteModal}
	<div class="modal-overlay" onclick={(e) => e.target === e.currentTarget && (showAddNoteModal = false)}>
		<div class="modal">
			<div class="modal-header">
				<h2 class="modal-title">Add Communication Entry</h2>
				<button type="button" class="modal-close" onclick={() => (showAddNoteModal = false)}>
					<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<line x1="18" y1="6" x2="6" y2="18" />
						<line x1="6" y1="6" x2="18" y2="18" />
					</svg>
				</button>
			</div>
			<form
				method="POST"
				action="?/addCommunicationLog"
				use:enhance={() => {
					return async ({ result }) => {
						if (result.type === 'success') {
							showAddNoteModal = false;
							resetNoteForm();
						}
					};
				}}
			>
				<div class="modal-body">
					<div class="form-group">
						<label for="entryType" class="form-label">Entry Type</label>
						<select id="entryType" name="entryType" class="form-input form-select" bind:value={noteType} required>
							<option value="note">Note</option>
							<option value="call">Call</option>
							<option value="email">Email</option>
							<option value="meeting">Meeting</option>
							<option value="alert">Alert</option>
						</select>
					</div>
					<div class="form-group">
						<label for="direction" class="form-label">Direction</label>
						<select id="direction" name="direction" class="form-input form-select" bind:value={noteDirection}>
							<option value="internal">Internal</option>
							<option value="inbound">Inbound</option>
							<option value="outbound">Outbound</option>
						</select>
					</div>
					<div class="form-group">
						<label for="title" class="form-label">Title</label>
						<input type="text" id="title" name="title" class="form-input" bind:value={noteTitle} required placeholder="Brief summary..." />
					</div>
					<div class="form-group">
						<label for="body" class="form-label">Details</label>
						<textarea id="body" name="body" class="form-input form-textarea" bind:value={noteBody} rows="4" placeholder="Additional details..."></textarea>
					</div>
				</div>
				<div class="modal-footer">
					<button type="button" class="btn btn-secondary" onclick={() => (showAddNoteModal = false)}>Cancel</button>
					<button type="submit" class="btn btn-primary">Add Entry</button>
				</div>
			</form>
		</div>
	</div>
{/if}

<!-- Schedule Review Modal -->
{#if showScheduleReviewModal}
	<div class="modal-overlay" onclick={(e) => e.target === e.currentTarget && (showScheduleReviewModal = false)}>
		<div class="modal">
			<div class="modal-header">
				<h2 class="modal-title">Schedule Review</h2>
				<button type="button" class="modal-close" onclick={() => (showScheduleReviewModal = false)}>
					<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<line x1="18" y1="6" x2="6" y2="18" />
						<line x1="6" y1="6" x2="18" y2="18" />
					</svg>
				</button>
			</div>
			<form
				method="POST"
				action="?/scheduleReview"
				use:enhance={() => {
					return async ({ result }) => {
						if (result.type === 'success') {
							showScheduleReviewModal = false;
							resetReviewForm();
						}
					};
				}}
			>
				<div class="modal-body">
					<div class="form-group">
						<label for="reviewType" class="form-label">Review Type</label>
						<select id="reviewType" name="reviewType" class="form-input form-select" bind:value={reviewType} required>
							<option value="monthly_performance">Monthly Performance</option>
							<option value="quarterly_business">Quarterly Business Review</option>
							<option value="contract_renewal">Contract Renewal</option>
						</select>
					</div>
					<div class="form-group">
						<label for="scheduledDate" class="form-label">Date</label>
						<input type="date" id="scheduledDate" name="scheduledDate" class="form-input" bind:value={reviewDate} required />
					</div>
					<div class="form-group">
						<label for="meetingLink" class="form-label">Meeting Link (optional)</label>
						<input type="url" id="meetingLink" name="meetingLink" class="form-input" bind:value={reviewLink} placeholder="https://..." />
					</div>
				</div>
				<div class="modal-footer">
					<button type="button" class="btn btn-secondary" onclick={() => (showScheduleReviewModal = false)}>Cancel</button>
					<button type="submit" class="btn btn-primary">Schedule</button>
				</div>
			</form>
		</div>
	</div>
{/if}

<!-- Pause Campaigns Modal -->
{#if showPauseCampaignsModal}
	<div class="modal-overlay" onclick={(e) => e.target === e.currentTarget && (showPauseCampaignsModal = false)}>
		<div class="modal modal-sm">
			<div class="modal-header">
				<h2 class="modal-title">Pause All Campaigns?</h2>
				<button type="button" class="modal-close" onclick={() => (showPauseCampaignsModal = false)}>
					<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<line x1="18" y1="6" x2="6" y2="18" />
						<line x1="6" y1="6" x2="18" y2="18" />
					</svg>
				</button>
			</div>
			<form
				method="POST"
				action="?/pauseCampaigns"
				use:enhance={() => {
					return async ({ result }) => {
						if (result.type === 'success') {
							showPauseCampaignsModal = false;
						}
					};
				}}
			>
				<div class="modal-body">
					<p class="confirm-text">This will pause all {activeCampaigns.length} active campaigns for {data.organization.name}.</p>
				</div>
				<div class="modal-footer">
					<button type="button" class="btn btn-secondary" onclick={() => (showPauseCampaignsModal = false)}>Cancel</button>
					<button type="submit" class="btn btn-warning">Pause Campaigns</button>
				</div>
			</form>
		</div>
	</div>
{/if}

<style>
	/* Utility */
	.hidden {
		display: none !important;
	}

	/* Breadcrumb */
	.back-link {
		display: inline-flex;
		align-items: center;
		gap: var(--spacing-2);
		color: var(--gray-500);
		text-decoration: none;
		font-size: 0.875rem;
		margin-bottom: var(--spacing-4);
		transition: color 0.2s;
	}

	.back-link:hover {
		color: var(--primary-600);
	}

	/* Page Header */
	.page-header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		gap: var(--spacing-6);
		margin-bottom: var(--spacing-6);
		flex-wrap: wrap;
	}

	.client-name-row {
		display: flex;
		align-items: center;
		gap: var(--spacing-3);
	}

	.client-name {
		font-size: 1.5rem;
		font-weight: 700;
		color: var(--gray-900);
		margin: 0;
	}

	.client-meta {
		display: flex;
		flex-wrap: wrap;
		gap: var(--spacing-4);
		margin-top: var(--spacing-2);
	}

	.meta-item {
		display: flex;
		align-items: center;
		gap: var(--spacing-1);
		font-size: 0.875rem;
		color: var(--gray-500);
	}

	.header-actions {
		display: flex;
		flex-wrap: wrap;
		gap: var(--spacing-2);
	}

	@media (max-width: 768px) {
		.page-header {
			flex-direction: column;
		}

		.header-actions {
			width: 100%;
		}

		.header-actions .btn {
			flex: 1;
			justify-content: center;
		}
	}

	/* Stats Row */
	.stats-row {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: var(--spacing-6);
		margin-bottom: var(--spacing-6);
	}

	@media (max-width: 1200px) {
		.stats-row {
			grid-template-columns: repeat(2, 1fr);
		}
	}

	@media (max-width: 640px) {
		.stats-row {
			grid-template-columns: 1fr;
		}
	}

	/* Content Grid */
	.content-grid {
		display: grid;
		grid-template-columns: 2fr 1fr;
		gap: var(--spacing-6);
	}

	@media (max-width: 1024px) {
		.content-grid {
			grid-template-columns: 1fr;
		}
	}

	.content-main,
	.content-sidebar {
		display: flex;
		flex-direction: column;
		gap: var(--spacing-6);
	}

	/* Card Styles */
	.card {
		background: white;
		border-radius: var(--radius-xl);
		border: 1px solid var(--gray-200);
		overflow: hidden;
	}

	.card-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: var(--spacing-4) var(--spacing-5);
		border-bottom: 1px solid var(--gray-200);
	}

	.card-title {
		font-size: 1rem;
		font-weight: 600;
		color: var(--gray-900);
		margin: 0;
	}

	.card-body {
		padding: var(--spacing-5);
	}

	/* Health Score Display */
	.health-display {
		display: flex;
		align-items: center;
		gap: var(--spacing-2);
	}

	.health-score {
		font-size: 1.5rem;
		font-weight: 700;
	}

	.health-score.excellent {
		color: var(--success-600);
	}
	.health-score.good {
		color: var(--primary-600);
	}
	.health-score.warning {
		color: var(--warning-600);
	}
	.health-score.critical {
		color: var(--danger-600);
	}

	.health-badge {
		padding: 4px 10px;
		border-radius: var(--radius-full);
		font-size: 0.75rem;
		font-weight: 500;
	}

	.health-badge.excellent {
		background: var(--success-100);
		color: var(--success-700);
	}
	.health-badge.good {
		background: var(--primary-100);
		color: var(--primary-700);
	}
	.health-badge.warning {
		background: var(--warning-100);
		color: var(--warning-700);
	}
	.health-badge.critical {
		background: var(--danger-100);
		color: var(--danger-700);
	}

	/* Health Breakdown */
	.health-breakdown {
		display: flex;
		flex-direction: column;
		gap: var(--spacing-4);
	}

	.breakdown-item {
		display: flex;
		flex-direction: column;
		gap: var(--spacing-1);
	}

	.breakdown-header {
		display: flex;
		justify-content: space-between;
		font-size: 0.875rem;
	}

	.breakdown-label {
		color: var(--gray-600);
	}

	.breakdown-value {
		font-weight: 500;
		color: var(--gray-900);
	}

	.progress-bar {
		height: 6px;
		background: var(--gray-100);
		border-radius: var(--radius-full);
		overflow: hidden;
	}

	.progress-fill {
		height: 100%;
		background: var(--primary-500);
		border-radius: var(--radius-full);
		transition: width 0.3s ease;
	}

	.progress-bar.blue .progress-fill {
		background: var(--info-500);
	}
	.progress-bar.purple .progress-fill {
		background: #8b5cf6;
	}
	.progress-bar.green .progress-fill {
		background: var(--success-500);
	}
	.progress-bar.orange .progress-fill {
		background: var(--warning-500);
	}

	.breakdown-timestamp {
		font-size: 0.75rem;
		color: var(--gray-400);
		margin-top: var(--spacing-4);
	}

	/* Info List */
	.info-list {
		display: flex;
		flex-direction: column;
		gap: var(--spacing-3);
	}

	.info-row {
		display: flex;
		justify-content: space-between;
		align-items: center;
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

	.contract-countdown {
		text-align: center;
		padding: var(--spacing-2);
		border-radius: var(--radius-md);
		font-size: 0.875rem;
		font-weight: 500;
		margin-top: var(--spacing-2);
	}

	.contract-countdown.success {
		background: var(--success-100);
		color: var(--success-700);
	}
	.contract-countdown.warning {
		background: var(--warning-100);
		color: var(--warning-700);
	}
	.contract-countdown.danger {
		background: var(--danger-100);
		color: var(--danger-700);
	}

	/* Manager Card */
	.manager-card {
		display: flex;
		align-items: center;
		gap: var(--spacing-3);
	}

	.manager-avatar {
		width: 40px;
		height: 40px;
		border-radius: var(--radius-lg);
		background: var(--primary-100);
		color: var(--primary-700);
		display: flex;
		align-items: center;
		justify-content: center;
		font-weight: 600;
		font-size: 0.875rem;
	}

	.manager-name {
		font-weight: 500;
		color: var(--gray-900);
	}

	.manager-email {
		font-size: 0.875rem;
		color: var(--gray-500);
	}

	/* Contacts List */
	.contacts-list {
		display: flex;
		flex-direction: column;
		gap: var(--spacing-3);
	}

	.contact-item {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		padding: var(--spacing-3);
		border-radius: var(--radius-md);
		background: var(--gray-50);
	}

	.contact-item.primary {
		background: var(--primary-50);
	}

	.contact-name {
		font-weight: 500;
		color: var(--gray-900);
		display: flex;
		align-items: center;
		gap: var(--spacing-2);
	}

	.contact-title {
		font-size: 0.8125rem;
		color: var(--gray-500);
	}

	.contact-detail {
		font-size: 0.8125rem;
		color: var(--gray-600);
	}

	/* Invoices List */
	.invoices-list {
		display: flex;
		flex-direction: column;
		gap: var(--spacing-2);
	}

	.invoice-item {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: var(--spacing-3);
		border-radius: var(--radius-md);
		transition: background 0.2s;
	}

	.invoice-item:hover {
		background: var(--gray-50);
	}

	.invoice-number {
		font-size: 0.875rem;
		font-weight: 500;
		color: var(--gray-900);
	}

	.invoice-date {
		font-size: 0.75rem;
		color: var(--gray-500);
	}

	.invoice-right {
		text-align: right;
	}

	.invoice-amount {
		font-size: 0.875rem;
		font-weight: 500;
		color: var(--gray-900);
	}

	/* Team List */
	.team-list {
		display: flex;
		flex-direction: column;
		gap: var(--spacing-2);
	}

	.team-item {
		display: flex;
		align-items: center;
		gap: var(--spacing-3);
		padding: var(--spacing-3);
		border-radius: var(--radius-md);
		transition: background 0.2s;
	}

	.team-item:hover {
		background: var(--gray-50);
	}

	.team-item.inactive {
		opacity: 0.5;
	}

	.team-avatar {
		width: 32px;
		height: 32px;
		border-radius: var(--radius-md);
		background: var(--primary-100);
		color: var(--primary-700);
		display: flex;
		align-items: center;
		justify-content: center;
		font-weight: 600;
		font-size: 0.75rem;
		flex-shrink: 0;
	}

	.team-info {
		flex: 1;
		min-width: 0;
	}

	.team-name {
		font-size: 0.875rem;
		font-weight: 500;
		color: var(--gray-900);
	}

	.team-role {
		font-size: 0.75rem;
		color: var(--gray-500);
		text-transform: capitalize;
	}

	.team-login {
		font-size: 0.75rem;
		color: var(--gray-500);
	}

	/* Timeline */
	.timeline {
		display: flex;
		flex-direction: column;
		gap: var(--spacing-4);
	}

	.timeline-item {
		display: flex;
		gap: var(--spacing-4);
		position: relative;
	}

	.timeline-item::before {
		content: '';
		position: absolute;
		left: 4px;
		top: 16px;
		bottom: -16px;
		width: 2px;
		background: var(--gray-200);
	}

	.timeline-item:last-child::before {
		display: none;
	}

	.timeline-marker {
		width: 10px;
		height: 10px;
		border-radius: 50%;
		background: var(--primary-500);
		flex-shrink: 0;
		margin-top: 4px;
		z-index: 1;
	}

	.timeline-content {
		flex: 1;
	}

	.timeline-header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		gap: var(--spacing-2);
		margin-bottom: var(--spacing-1);
	}

	.timeline-title {
		font-weight: 500;
		color: var(--gray-900);
	}

	.timeline-date {
		font-size: 0.75rem;
		color: var(--gray-500);
	}

	.timeline-badges {
		display: flex;
		gap: var(--spacing-1);
		margin-bottom: var(--spacing-2);
	}

	.timeline-body {
		font-size: 0.875rem;
		color: var(--gray-600);
		margin-bottom: var(--spacing-1);
	}

	.timeline-author {
		font-size: 0.75rem;
		color: var(--gray-400);
	}

	/* Badges */
	.badge {
		display: inline-flex;
		align-items: center;
		padding: 2px 8px;
		border-radius: var(--radius-full);
		font-size: 0.75rem;
		font-weight: 500;
		background: var(--gray-100);
		color: var(--gray-700);
	}

	.badge.primary {
		background: var(--primary-100);
		color: var(--primary-700);
	}
	.badge.blue {
		background: var(--info-100);
		color: var(--info-700);
	}
	.badge.green {
		background: var(--success-100);
		color: var(--success-700);
	}
	.badge.gray {
		background: var(--gray-100);
		color: var(--gray-600);
	}

	/* Status Badges */
	.status-badge {
		display: inline-flex;
		align-items: center;
		padding: 4px 10px;
		border-radius: var(--radius-full);
		font-size: 0.75rem;
		font-weight: 500;
		text-transform: capitalize;
	}

	.status-badge.active {
		background: var(--success-100);
		color: var(--success-700);
	}
	.status-badge.onboarding {
		background: var(--info-100);
		color: var(--info-700);
	}
	.status-badge.paused {
		background: var(--warning-100);
		color: var(--warning-600);
	}
	.status-badge.churned {
		background: var(--danger-100);
		color: var(--danger-700);
	}
	.status-badge.new {
		background: var(--info-100);
		color: var(--info-700);
	}
	.status-badge.contacted {
		background: var(--primary-100);
		color: var(--primary-700);
	}
	.status-badge.qualified {
		background: var(--success-100);
		color: var(--success-700);
	}
	.status-badge.converted {
		background: var(--success-100);
		color: var(--success-700);
	}
	.status-badge.lost {
		background: var(--danger-100);
		color: var(--danger-700);
	}
	.status-badge.paid {
		background: var(--success-100);
		color: var(--success-700);
	}
	.status-badge.pending {
		background: var(--warning-100);
		color: var(--warning-600);
	}
	.status-badge.overdue {
		background: var(--danger-100);
		color: var(--danger-700);
	}

	/* Table styles */
	.table-container {
		overflow-x: auto;
	}

	.table {
		width: 100%;
		border-collapse: collapse;
	}

	.table th,
	.table td {
		padding: var(--spacing-3) var(--spacing-4);
		text-align: left;
		border-bottom: 1px solid var(--gray-100);
	}

	.table th {
		font-size: 0.75rem;
		font-weight: 600;
		color: var(--gray-500);
		text-transform: uppercase;
		letter-spacing: 0.05em;
		background: var(--gray-50);
	}

	.table td {
		font-size: 0.875rem;
		color: var(--gray-700);
	}

	.campaign-name {
		font-weight: 500;
		color: var(--gray-900);
	}

	.campaign-type {
		font-size: 0.75rem;
		color: var(--gray-500);
	}

	.lead-name {
		font-weight: 500;
		color: var(--gray-900);
	}

	.lead-contact {
		font-size: 0.8125rem;
	}

	.lead-email {
		color: var(--gray-600);
	}

	.lead-phone {
		color: var(--gray-500);
	}

	.lead-count {
		font-weight: 500;
	}

	.date-text {
		color: var(--gray-500);
	}

	/* Empty State */
	.empty-state {
		text-align: center;
		padding: var(--spacing-6);
		color: var(--gray-500);
	}

	.empty-text {
		color: var(--gray-500);
		text-align: center;
	}

	.confirm-text {
		color: var(--gray-600);
	}

	/* Buttons */
	.btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: var(--spacing-2);
		padding: var(--spacing-2) var(--spacing-4);
		border-radius: var(--radius-md);
		font-size: 0.875rem;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.2s;
		text-decoration: none;
		border: 1px solid transparent;
	}

	.btn-primary {
		background: var(--primary-600);
		color: white;
	}

	.btn-primary:hover {
		background: var(--primary-700);
	}

	.btn-secondary {
		background: white;
		color: var(--gray-700);
		border-color: var(--gray-300);
	}

	.btn-secondary:hover {
		background: var(--gray-50);
	}

	.btn-warning {
		background: var(--warning-500);
		color: white;
	}

	.btn-warning:hover {
		background: var(--warning-600);
	}

	.btn-sm {
		padding: var(--spacing-1) var(--spacing-3);
		font-size: 0.8125rem;
	}

	/* Form Styles */
	.form-group {
		margin-bottom: var(--spacing-4);
	}

	.form-group:last-child {
		margin-bottom: 0;
	}

	.form-label {
		display: block;
		font-size: 0.875rem;
		font-weight: 500;
		color: var(--gray-700);
		margin-bottom: var(--spacing-1);
	}

	.form-input {
		width: 100%;
		padding: var(--spacing-2) var(--spacing-3);
		border: 1px solid var(--gray-300);
		border-radius: var(--radius-md);
		font-size: 0.9375rem;
		transition: border-color 0.2s, box-shadow 0.2s;
	}

	.form-input:focus {
		outline: none;
		border-color: var(--primary-500);
		box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1);
	}

	.form-select {
		appearance: none;
		background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e");
		background-position: right 0.5rem center;
		background-repeat: no-repeat;
		background-size: 1.5em 1.5em;
		padding-right: 2.5rem;
	}

	.form-textarea {
		resize: vertical;
		min-height: 100px;
	}

	/* Modal Styles */
	.modal-overlay {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.5);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 100;
		padding: var(--spacing-4);
	}

	.modal {
		background: white;
		border-radius: var(--radius-xl);
		width: 100%;
		max-width: 500px;
		max-height: 90vh;
		overflow: auto;
		box-shadow: var(--shadow-xl);
	}

	.modal-sm {
		max-width: 400px;
	}

	.modal-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: var(--spacing-4) var(--spacing-5);
		border-bottom: 1px solid var(--gray-200);
	}

	.modal-title {
		font-size: 1.125rem;
		font-weight: 600;
		color: var(--gray-900);
		margin: 0;
	}

	.modal-close {
		width: 32px;
		height: 32px;
		border: none;
		background: transparent;
		color: var(--gray-400);
		cursor: pointer;
		border-radius: var(--radius-md);
		display: flex;
		align-items: center;
		justify-content: center;
		transition: all 0.2s;
	}

	.modal-close:hover {
		background: var(--gray-100);
		color: var(--gray-600);
	}

	.modal-body {
		padding: var(--spacing-5);
	}

	.modal-footer {
		display: flex;
		justify-content: flex-end;
		gap: var(--spacing-3);
		padding: var(--spacing-4) var(--spacing-5);
		border-top: 1px solid var(--gray-200);
		background: var(--gray-50);
	}

	/* Voice Characteristics Section */
	.voice-characteristics-section {
		margin-top: var(--spacing-4);
		padding-top: var(--spacing-4);
		border-top: 1px solid var(--gray-100);
	}
</style>
