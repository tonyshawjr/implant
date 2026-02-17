<script lang="ts">
	import { Card, Checkbox, Badge, Button, ButtonGroup, Helper } from 'flowbite-svelte';
	import {
		CheckCircleSolid,
		CloseCircleSolid,
		PenSolid,
		ArrowPathOutline,
		StarSolid
	} from 'flowbite-svelte-icons';

	interface Creative {
		id: string;
		headline: string | null;
		body: string | null;
		ctaText: string | null;
		status: string;
		aiGenerated: boolean;
		createdAt: string;
	}

	interface Props {
		creatives: Creative[];
		onApprove?: (id: string) => void;
		onReject?: (id: string) => void;
		onEdit?: (creative: Creative) => void;
		onRegenerate?: (id: string) => void;
		onBulkApprove?: (ids: string[]) => void;
		onBulkReject?: (ids: string[]) => void;
	}

	let {
		creatives = [],
		onApprove,
		onReject,
		onEdit,
		onRegenerate,
		onBulkApprove,
		onBulkReject
	}: Props = $props();

	// Selection state
	let selectedIds = $state<string[]>([]);

	// Check if all are selected
	let allSelected = $derived(
		creatives.length > 0 && selectedIds.length === creatives.length
	);

	// Check if some are selected (for indeterminate state)
	let someSelected = $derived(selectedIds.length > 0 && selectedIds.length < creatives.length);

	// Toggle individual selection
	function toggleSelection(id: string) {
		if (selectedIds.includes(id)) {
			selectedIds = selectedIds.filter((selectedId) => selectedId !== id);
		} else {
			selectedIds = [...selectedIds, id];
		}
	}

	// Toggle all selections
	function toggleAll() {
		if (allSelected) {
			selectedIds = [];
		} else {
			selectedIds = creatives.map((c) => c.id);
		}
	}

	// Clear selection
	function clearSelection() {
		selectedIds = [];
	}

	// Handle bulk approve
	function handleBulkApprove() {
		if (onBulkApprove && selectedIds.length > 0) {
			onBulkApprove(selectedIds);
			clearSelection();
		}
	}

	// Handle bulk reject
	function handleBulkReject() {
		if (onBulkReject && selectedIds.length > 0) {
			onBulkReject(selectedIds);
			clearSelection();
		}
	}

	// Format date to relative time
	function formatRelativeTime(dateStr: string): string {
		const date = new Date(dateStr);
		const now = new Date();
		const diffMs = now.getTime() - date.getTime();
		const diffMins = Math.floor(diffMs / (1000 * 60));
		const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
		const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

		if (diffMins < 1) return 'Just now';
		if (diffMins < 60) return `${diffMins}m ago`;
		if (diffHours < 24) return `${diffHours}h ago`;
		if (diffDays < 7) return `${diffDays}d ago`;
		return date.toLocaleDateString();
	}

	// Get status badge color
	function getStatusColor(
		status: string
	): 'yellow' | 'green' | 'red' | 'gray' | 'primary' | 'indigo' | 'purple' | 'pink' {
		switch (status) {
			case 'pending':
			case 'pending_review':
				return 'yellow';
			case 'approved':
				return 'green';
			case 'rejected':
				return 'red';
			case 'draft':
				return 'gray';
			default:
				return 'gray';
		}
	}

	// Format status label
	function formatStatus(status: string): string {
		return status
			.replace(/_/g, ' ')
			.replace(/\b\w/g, (c) => c.toUpperCase());
	}

	// Truncate body text
	function truncateText(text: string | null, maxLength: number = 120): string {
		if (!text) return '';
		if (text.length <= maxLength) return text;
		return text.substring(0, maxLength).trim() + '...';
	}
</script>

<div class="content-review-grid">
	<!-- Bulk Actions Bar -->
	{#if creatives.length > 0}
		<div class="bulk-actions-bar">
			<div class="selection-controls">
				<Checkbox
					checked={allSelected}
					indeterminate={someSelected}
					onchange={toggleAll}
				>
					{#if selectedIds.length > 0}
						{selectedIds.length} selected
					{:else}
						Select all
					{/if}
				</Checkbox>
			</div>

			{#if selectedIds.length > 0}
				<div class="bulk-buttons">
					<ButtonGroup>
						<Button size="sm" color="green" onclick={handleBulkApprove}>
							<CheckCircleSolid class="me-1.5 h-4 w-4" />
							Approve ({selectedIds.length})
						</Button>
						<Button size="sm" color="red" onclick={handleBulkReject}>
							<CloseCircleSolid class="me-1.5 h-4 w-4" />
							Reject ({selectedIds.length})
						</Button>
					</ButtonGroup>
					<Button size="sm" color="alternative" onclick={clearSelection}>
						Clear
					</Button>
				</div>
			{/if}
		</div>
	{/if}

	<!-- Grid of Content Cards -->
	{#if creatives.length === 0}
		<div class="empty-state">
			<StarSolid class="h-12 w-12 text-gray-300 dark:text-gray-600" />
			<p class="mt-2 text-gray-500 dark:text-gray-400">No content variants to review</p>
		</div>
	{:else}
		<div class="cards-grid">
			{#each creatives as creative (creative.id)}
				<Card
					class="creative-card {selectedIds.includes(creative.id) ? 'selected' : ''}"
					padding="none"
				>
					<!-- Card Header with Checkbox and Badges -->
					<div class="card-header">
						<div class="header-left">
							<Checkbox
								checked={selectedIds.includes(creative.id)}
								onchange={() => toggleSelection(creative.id)}
							/>
						</div>
						<div class="header-badges">
							{#if creative.aiGenerated}
								<Badge color="purple" class="text-xs">
									<StarSolid class="me-1 h-3 w-3" />
									AI
								</Badge>
							{/if}
							<Badge color={getStatusColor(creative.status)} class="text-xs">
								{formatStatus(creative.status)}
							</Badge>
						</div>
					</div>

					<!-- Card Content -->
					<div class="card-content">
						<!-- Headline -->
						{#if creative.headline}
							<h4 class="creative-headline">
								{creative.headline}
							</h4>
						{:else}
							<p class="no-headline">No headline</p>
						{/if}

						<!-- Body Preview -->
						{#if creative.body}
							<p class="creative-body">
								{truncateText(creative.body)}
							</p>
						{:else}
							<p class="no-body">No body text</p>
						{/if}

						<!-- CTA -->
						{#if creative.ctaText}
							<div class="creative-cta">
								<span class="cta-label">CTA:</span>
								<span class="cta-text">{creative.ctaText}</span>
							</div>
						{/if}
					</div>

					<!-- Card Footer with Timestamp and Actions -->
					<div class="card-footer">
						<Helper class="text-xs text-gray-400">
							{formatRelativeTime(creative.createdAt)}
						</Helper>

						<div class="card-actions">
							<ButtonGroup size="xs">
								<Button
									size="xs"
									color="green"
									onclick={() => onApprove?.(creative.id)}
									title="Approve"
								>
									<CheckCircleSolid class="h-3.5 w-3.5" />
								</Button>
								<Button
									size="xs"
									color="alternative"
									onclick={() => onEdit?.(creative)}
									title="Edit"
								>
									<PenSolid class="h-3.5 w-3.5" />
								</Button>
								<Button
									size="xs"
									color="red"
									onclick={() => onReject?.(creative.id)}
									title="Reject"
								>
									<CloseCircleSolid class="h-3.5 w-3.5" />
								</Button>
							</ButtonGroup>
							<Button
								size="xs"
								color="alternative"
								onclick={() => onRegenerate?.(creative.id)}
								title="Regenerate"
								class="ml-1"
							>
								<ArrowPathOutline class="h-3.5 w-3.5" />
							</Button>
						</div>
					</div>
				</Card>
			{/each}
		</div>
	{/if}
</div>

<style>
	.content-review-grid {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.bulk-actions-bar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0.75rem 1rem;
		background: var(--gray-50, #f9fafb);
		border-radius: 0.5rem;
		border: 1px solid var(--gray-200, #e5e7eb);
	}

	:global(.dark) .bulk-actions-bar {
		background: var(--gray-800, #1f2937);
		border-color: var(--gray-700, #374151);
	}

	.selection-controls {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.bulk-buttons {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.cards-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
		gap: 1rem;
	}

	@media (max-width: 640px) {
		.cards-grid {
			grid-template-columns: 1fr;
		}
	}

	:global(.creative-card) {
		display: flex;
		flex-direction: column;
		transition: all 0.2s ease;
		border: 2px solid transparent;
	}

	:global(.creative-card:hover) {
		border-color: var(--primary-200, #c7d2fe);
	}

	:global(.creative-card.selected) {
		border-color: var(--primary-500, #6366f1);
		background: var(--primary-50, #eef2ff);
	}

	:global(.dark .creative-card.selected) {
		background: rgba(99, 102, 241, 0.1);
	}

	.card-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0.75rem 1rem;
		border-bottom: 1px solid var(--gray-100, #f3f4f6);
	}

	:global(.dark) .card-header {
		border-bottom-color: var(--gray-700, #374151);
	}

	.header-left {
		display: flex;
		align-items: center;
	}

	.header-badges {
		display: flex;
		align-items: center;
		gap: 0.375rem;
	}

	.card-content {
		flex: 1;
		padding: 1rem;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.creative-headline {
		font-size: 0.9375rem;
		font-weight: 600;
		color: var(--gray-900, #111827);
		line-height: 1.3;
		margin: 0;
	}

	:global(.dark) .creative-headline {
		color: var(--gray-100, #f3f4f6);
	}

	.no-headline {
		font-size: 0.875rem;
		font-style: italic;
		color: var(--gray-400, #9ca3af);
		margin: 0;
	}

	.creative-body {
		font-size: 0.8125rem;
		color: var(--gray-600, #4b5563);
		line-height: 1.5;
		margin: 0;
	}

	:global(.dark) .creative-body {
		color: var(--gray-400, #9ca3af);
	}

	.no-body {
		font-size: 0.8125rem;
		font-style: italic;
		color: var(--gray-400, #9ca3af);
		margin: 0;
	}

	.creative-cta {
		display: inline-flex;
		align-items: center;
		gap: 0.375rem;
		margin-top: 0.25rem;
		padding: 0.25rem 0.5rem;
		background: var(--gray-100, #f3f4f6);
		border-radius: 0.25rem;
		width: fit-content;
	}

	:global(.dark) .creative-cta {
		background: var(--gray-700, #374151);
	}

	.cta-label {
		font-size: 0.6875rem;
		font-weight: 500;
		color: var(--gray-500, #6b7280);
		text-transform: uppercase;
		letter-spacing: 0.025em;
	}

	.cta-text {
		font-size: 0.75rem;
		font-weight: 500;
		color: var(--primary-600, #4f46e5);
	}

	:global(.dark) .cta-text {
		color: var(--primary-400, #818cf8);
	}

	.card-footer {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0.75rem 1rem;
		border-top: 1px solid var(--gray-100, #f3f4f6);
		background: var(--gray-50, #f9fafb);
	}

	:global(.dark) .card-footer {
		border-top-color: var(--gray-700, #374151);
		background: var(--gray-800, #1f2937);
	}

	.card-actions {
		display: flex;
		align-items: center;
	}

	.empty-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 3rem 1.5rem;
		text-align: center;
		background: var(--gray-50, #f9fafb);
		border-radius: 0.5rem;
		border: 1px dashed var(--gray-300, #d1d5db);
	}

	:global(.dark) .empty-state {
		background: var(--gray-800, #1f2937);
		border-color: var(--gray-600, #4b5563);
	}
</style>
