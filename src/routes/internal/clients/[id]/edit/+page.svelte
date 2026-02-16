<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PageData, ActionData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	// Modal states
	let showAssignTerritoryModal = $state(false);
	let showAddContactModal = $state(false);
	let showUnassignConfirm = $state(false);

	// Form states
	let selectedTerritoryId = $state('');
	let selectedTerritoryPrice = $state(0);
	let isSubmitting = $state(false);

	// Watch for territory selection
	function onTerritorySelect(e: Event) {
		const select = e.target as HTMLSelectElement;
		selectedTerritoryId = select.value;
		const territory = data.availableTerritories.find((t) => t.id === select.value);
		selectedTerritoryPrice = territory?.monthlyPrice ?? 0;
	}

	function formatCurrency(value: number): string {
		return new Intl.NumberFormat('en-US', {
			style: 'currency',
			currency: 'USD',
			minimumFractionDigits: 0,
			maximumFractionDigits: 0
		}).format(value);
	}
</script>

<div class="edit-page">
	<!-- Page Header -->
	<div class="page-header">
		<div class="header-left">
			<a href="/internal/clients/{data.organization.id}" class="back-link">
				<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<path d="M19 12H5M12 19l-7-7 7-7" />
				</svg>
				Back to Client
			</a>
			<h1 class="page-title">Edit Client</h1>
			<p class="page-subtitle">{data.organization.name}</p>
		</div>
	</div>

	<!-- Success/Error Messages -->
	{#if form?.error}
		<div class="alert alert-error">
			<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
				<circle cx="12" cy="12" r="10" />
				<line x1="15" y1="9" x2="9" y2="15" />
				<line x1="9" y1="9" x2="15" y2="15" />
			</svg>
			{form.error}
		</div>
	{/if}

	{#if form?.success}
		<div class="alert alert-success">
			<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
				<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
				<polyline points="22,4 12,14.01 9,11.01" />
			</svg>
			{form.message || 'Changes saved successfully'}
		</div>
	{/if}

	<div class="edit-grid">
		<!-- Left Column - Main Form -->
		<div class="main-column">
			<!-- Basic Information -->
			<div class="card">
				<div class="card-header">
					<h2 class="card-title">Basic Information</h2>
				</div>
				<form method="POST" action="?/updateClient" use:enhance class="card-body">
					<div class="form-group">
						<label for="name" class="form-label">Practice Name *</label>
						<input type="text" id="name" name="name" class="form-input" value={data.organization.name} required />
					</div>

					<div class="form-row">
						<div class="form-group">
							<label for="email" class="form-label">Email</label>
							<input type="email" id="email" name="email" class="form-input" value={data.organization.email || ''} />
						</div>
						<div class="form-group">
							<label for="phone" class="form-label">Phone</label>
							<input type="tel" id="phone" name="phone" class="form-input" value={data.organization.phone || ''} />
						</div>
					</div>

					<div class="form-group">
						<label for="website" class="form-label">Website</label>
						<input type="url" id="website" name="website" class="form-input" value={data.organization.website || ''} placeholder="https://" />
					</div>

					<div class="form-group">
						<label for="addressLine1" class="form-label">Address</label>
						<input type="text" id="addressLine1" name="addressLine1" class="form-input" value={data.organization.addressLine1 || ''} placeholder="Street address" />
					</div>

					<div class="form-group">
						<input type="text" id="addressLine2" name="addressLine2" class="form-input" value={data.organization.addressLine2 || ''} placeholder="Suite, unit, etc. (optional)" />
					</div>

					<div class="form-row form-row-3">
						<div class="form-group">
							<label for="city" class="form-label">City</label>
							<input type="text" id="city" name="city" class="form-input" value={data.organization.city || ''} />
						</div>
						<div class="form-group">
							<label for="state" class="form-label">State</label>
							<input type="text" id="state" name="state" class="form-input" value={data.organization.state || ''} maxlength="2" />
						</div>
						<div class="form-group">
							<label for="postalCode" class="form-label">ZIP</label>
							<input type="text" id="postalCode" name="postalCode" class="form-input" value={data.organization.postalCode || ''} />
						</div>
					</div>

					<div class="form-row">
						<div class="form-group">
							<label for="status" class="form-label">Status</label>
							<select id="status" name="status" class="form-input form-select">
								<option value="active" selected={data.organization.status === 'active'}>Active</option>
								<option value="onboarding" selected={data.organization.status === 'onboarding'}>Onboarding</option>
								<option value="paused" selected={data.organization.status === 'paused'}>Paused</option>
								<option value="churned" selected={data.organization.status === 'churned'}>Churned</option>
							</select>
						</div>
						<div class="form-group">
							<label for="avgCaseValue" class="form-label">Avg. Case Value</label>
							<input type="number" id="avgCaseValue" name="avgCaseValue" class="form-input" value={data.organization.avgCaseValue} min="0" step="100" />
						</div>
					</div>

					<div class="form-group">
						<label for="accountManagerId" class="form-label">Account Manager</label>
						<select id="accountManagerId" name="accountManagerId" class="form-input form-select">
							<option value="">No account manager</option>
							{#each data.accountManagers as manager}
								<option value={manager.id} selected={data.organization.accountManagerId === manager.id}>
									{manager.name}
								</option>
							{/each}
						</select>
					</div>

					<div class="form-actions">
						<a href="/internal/clients/{data.organization.id}" class="btn btn-secondary">Cancel</a>
						<button type="submit" class="btn btn-primary">Save Changes</button>
					</div>
				</form>
			</div>
		</div>

		<!-- Right Column - Territory & Contacts -->
		<div class="side-column">
			<!-- Territory Assignment -->
			<div class="card">
				<div class="card-header">
					<h2 class="card-title">Territory</h2>
				</div>
				<div class="card-body">
					{#if data.currentTerritory}
						<div class="current-territory">
							<div class="territory-info">
								<div class="territory-name">{data.currentTerritory.name}</div>
								<div class="territory-location">{data.currentTerritory.location}</div>
								<div class="territory-rate">{formatCurrency(data.currentTerritory.monthlyRate)}/month</div>
							</div>
							<div class="territory-actions">
								<a href="/internal/territories/{data.currentTerritory.id}/edit" class="btn btn-sm btn-secondary">Edit</a>
								<button type="button" class="btn btn-sm btn-danger" onclick={() => (showUnassignConfirm = true)}>Unassign</button>
							</div>
						</div>

						{#if showUnassignConfirm}
							<form method="POST" action="?/unassignTerritory" use:enhance class="unassign-confirm">
								<input type="hidden" name="assignmentId" value={data.currentTerritory.assignmentId} />
								<p class="confirm-text">Are you sure you want to unassign this territory?</p>
								<div class="confirm-actions">
									<button type="button" class="btn btn-sm btn-secondary" onclick={() => (showUnassignConfirm = false)}>Cancel</button>
									<button type="submit" class="btn btn-sm btn-danger">Unassign</button>
								</div>
							</form>
						{/if}
					{:else}
						<p class="no-territory">No territory assigned</p>
						<button type="button" class="btn btn-primary btn-block" onclick={() => (showAssignTerritoryModal = true)}>Assign Territory</button>
					{/if}
				</div>
			</div>

			<!-- Contacts -->
			<div class="card">
				<div class="card-header">
					<h2 class="card-title">Contacts</h2>
					<button type="button" class="btn btn-sm btn-secondary" onclick={() => (showAddContactModal = true)}>
						<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<line x1="12" y1="5" x2="12" y2="19" />
							<line x1="5" y1="12" x2="19" y2="12" />
						</svg>
						Add
					</button>
				</div>
				<div class="card-body">
					{#if data.contacts.length === 0}
						<p class="no-contacts">No contacts added</p>
					{:else}
						<div class="contacts-list">
							{#each data.contacts as contact}
								<div class="contact-item" class:primary={contact.isPrimary}>
									<div class="contact-info">
										<div class="contact-name">
											{contact.firstName} {contact.lastName}
											{#if contact.isPrimary}
												<span class="badge badge-primary">Primary</span>
											{/if}
										</div>
										{#if contact.title}
											<div class="contact-title">{contact.title}</div>
										{/if}
										{#if contact.email}
											<div class="contact-detail">{contact.email}</div>
										{/if}
										{#if contact.phone}
											<div class="contact-detail">{contact.phone}</div>
										{/if}
									</div>
									<form method="POST" action="?/deleteContact" use:enhance>
										<input type="hidden" name="contactId" value={contact.id} />
										<button type="submit" class="btn-icon danger" title="Delete contact">
											<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
												<polyline points="3,6 5,6 21,6" />
												<path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
											</svg>
										</button>
									</form>
								</div>
							{/each}
						</div>
					{/if}
				</div>
			</div>

			<!-- Contract Info (Read-only) -->
			{#if data.currentContract}
				<div class="card">
					<div class="card-header">
						<h2 class="card-title">Contract</h2>
						<span class="badge badge-{data.currentContract.status === 'active' ? 'success' : 'gray'}">
							{data.currentContract.status}
						</span>
					</div>
					<div class="card-body">
						<div class="info-row">
							<span class="info-label">Plan</span>
							<span class="info-value">{data.currentContract.planName}</span>
						</div>
						<div class="info-row">
							<span class="info-label">Monthly</span>
							<span class="info-value">{formatCurrency(data.currentContract.monthlyCommitment)}</span>
						</div>
						<div class="info-row">
							<span class="info-label">Term</span>
							<span class="info-value">{data.currentContract.termMonths} months</span>
						</div>
						<div class="info-row">
							<span class="info-label">End Date</span>
							<span class="info-value">{new Date(data.currentContract.endDate).toLocaleDateString()}</span>
						</div>
						<div class="info-row">
							<span class="info-label">Auto-Renew</span>
							<span class="info-value">{data.currentContract.autoRenew ? 'Yes' : 'No'}</span>
						</div>
					</div>
				</div>
			{/if}
		</div>
	</div>
</div>

<!-- Assign Territory Modal -->
{#if showAssignTerritoryModal}
	<div class="modal-overlay" onclick={(e) => e.target === e.currentTarget && (showAssignTerritoryModal = false)}>
		<div class="modal">
			<div class="modal-header">
				<h2 class="modal-title">Assign Territory</h2>
				<button type="button" class="modal-close" onclick={() => (showAssignTerritoryModal = false)}>
					<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<line x1="18" y1="6" x2="6" y2="18" />
						<line x1="6" y1="6" x2="18" y2="18" />
					</svg>
				</button>
			</div>
			<form method="POST" action="?/assignTerritory" use:enhance={() => {
				isSubmitting = true;
				return async ({ result, update }) => {
					isSubmitting = false;
					if (result.type === 'success') {
						showAssignTerritoryModal = false;
					}
					await update();
				};
			}}>
				<div class="modal-body">
					{#if data.availableTerritories.length === 0}
						<p class="empty-message">No available territories. All territories are currently assigned.</p>
					{:else}
						<div class="form-group">
							<label for="territoryId" class="form-label">Select Territory *</label>
							<select id="territoryId" name="territoryId" class="form-input form-select" onchange={onTerritorySelect} required>
								<option value="">Choose a territory...</option>
								{#each data.availableTerritories as territory}
									<option value={territory.id}>
										{territory.name} - {territory.location} ({territory.population?.toLocaleString() || 'N/A'} pop)
									</option>
								{/each}
							</select>
						</div>

						<div class="form-group">
							<label for="monthlyRate" class="form-label">Monthly Rate</label>
							<input type="number" id="monthlyRate" name="monthlyRate" class="form-input" value={selectedTerritoryPrice} min="0" step="50" />
							<p class="form-hint">Base price: {formatCurrency(selectedTerritoryPrice)}</p>
						</div>
					{/if}
				</div>
				<div class="modal-footer">
					<button type="button" class="btn btn-secondary" onclick={() => (showAssignTerritoryModal = false)}>Cancel</button>
					{#if data.availableTerritories.length > 0}
						<button type="submit" class="btn btn-primary" disabled={isSubmitting || !selectedTerritoryId}>
							{isSubmitting ? 'Assigning...' : 'Assign Territory'}
						</button>
					{/if}
				</div>
			</form>
		</div>
	</div>
{/if}

<!-- Add Contact Modal -->
{#if showAddContactModal}
	<div class="modal-overlay" onclick={(e) => e.target === e.currentTarget && (showAddContactModal = false)}>
		<div class="modal">
			<div class="modal-header">
				<h2 class="modal-title">Add Contact</h2>
				<button type="button" class="modal-close" onclick={() => (showAddContactModal = false)}>
					<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<line x1="18" y1="6" x2="6" y2="18" />
						<line x1="6" y1="6" x2="18" y2="18" />
					</svg>
				</button>
			</div>
			<form method="POST" action="?/addContact" use:enhance={() => {
				isSubmitting = true;
				return async ({ result, update }) => {
					isSubmitting = false;
					if (result.type === 'success') {
						showAddContactModal = false;
					}
					await update();
				};
			}}>
				<div class="modal-body">
					<div class="form-row">
						<div class="form-group">
							<label for="firstName" class="form-label">First Name *</label>
							<input type="text" id="firstName" name="firstName" class="form-input" required />
						</div>
						<div class="form-group">
							<label for="lastName" class="form-label">Last Name *</label>
							<input type="text" id="lastName" name="lastName" class="form-input" required />
						</div>
					</div>

					<div class="form-group">
						<label for="contactEmail" class="form-label">Email</label>
						<input type="email" id="contactEmail" name="email" class="form-input" />
					</div>

					<div class="form-group">
						<label for="contactPhone" class="form-label">Phone</label>
						<input type="tel" id="contactPhone" name="phone" class="form-input" />
					</div>

					<div class="form-group">
						<label for="title" class="form-label">Title</label>
						<input type="text" id="title" name="title" class="form-input" placeholder="e.g., Office Manager" />
					</div>

					<div class="form-row">
						<div class="form-group">
							<label for="contactType" class="form-label">Contact Type</label>
							<select id="contactType" name="contactType" class="form-input form-select">
								<option value="primary">Primary</option>
								<option value="billing">Billing</option>
								<option value="technical">Technical</option>
								<option value="other">Other</option>
							</select>
						</div>
						<div class="form-group">
							<label class="form-label">&nbsp;</label>
							<label class="checkbox-label">
								<input type="checkbox" name="isPrimary" value="true" />
								<span>Set as primary contact</span>
							</label>
						</div>
					</div>
				</div>
				<div class="modal-footer">
					<button type="button" class="btn btn-secondary" onclick={() => (showAddContactModal = false)}>Cancel</button>
					<button type="submit" class="btn btn-primary" disabled={isSubmitting}>
						{isSubmitting ? 'Adding...' : 'Add Contact'}
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}

<style>
	.edit-page {
		max-width: 1200px;
		margin: 0 auto;
	}

	.page-header {
		margin-bottom: var(--spacing-6);
	}

	.back-link {
		display: inline-flex;
		align-items: center;
		gap: var(--spacing-2);
		color: var(--gray-500);
		text-decoration: none;
		font-size: 0.875rem;
		margin-bottom: var(--spacing-2);
		transition: color 0.2s;
	}

	.back-link:hover {
		color: var(--primary-600);
	}

	.page-title {
		font-size: 1.5rem;
		font-weight: 700;
		color: var(--gray-900);
		margin: 0;
	}

	.page-subtitle {
		color: var(--gray-500);
		margin-top: var(--spacing-1);
	}

	.edit-grid {
		display: grid;
		grid-template-columns: 2fr 1fr;
		gap: var(--spacing-6);
	}

	@media (max-width: 1024px) {
		.edit-grid {
			grid-template-columns: 1fr;
		}
	}

	.main-column,
	.side-column {
		display: flex;
		flex-direction: column;
		gap: var(--spacing-6);
	}

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

	.form-hint {
		font-size: 0.75rem;
		color: var(--gray-500);
		margin-top: var(--spacing-1);
	}

	.form-row {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: var(--spacing-4);
	}

	.form-row-3 {
		grid-template-columns: 2fr 1fr 1fr;
	}

	@media (max-width: 640px) {
		.form-row,
		.form-row-3 {
			grid-template-columns: 1fr;
		}
	}

	.form-actions {
		display: flex;
		justify-content: flex-end;
		gap: var(--spacing-3);
		margin-top: var(--spacing-6);
		padding-top: var(--spacing-4);
		border-top: 1px solid var(--gray-200);
	}

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

	.btn-primary:disabled {
		background: var(--gray-300);
		cursor: not-allowed;
	}

	.btn-secondary {
		background: white;
		color: var(--gray-700);
		border-color: var(--gray-300);
	}

	.btn-secondary:hover {
		background: var(--gray-50);
	}

	.btn-danger {
		background: var(--danger-600);
		color: white;
	}

	.btn-danger:hover {
		background: var(--danger-700);
	}

	.btn-sm {
		padding: var(--spacing-1) var(--spacing-3);
		font-size: 0.8125rem;
	}

	.btn-block {
		width: 100%;
	}

	.btn-icon {
		width: 32px;
		height: 32px;
		padding: 0;
		border: none;
		background: transparent;
		color: var(--gray-400);
		border-radius: var(--radius-md);
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: all 0.2s;
	}

	.btn-icon:hover {
		background: var(--gray-100);
		color: var(--gray-600);
	}

	.btn-icon.danger:hover {
		background: var(--danger-50);
		color: var(--danger-600);
	}

	/* Territory Section */
	.current-territory {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		gap: var(--spacing-4);
	}

	.territory-name {
		font-weight: 600;
		color: var(--gray-900);
	}

	.territory-location {
		font-size: 0.875rem;
		color: var(--gray-500);
	}

	.territory-rate {
		font-size: 0.875rem;
		color: var(--primary-600);
		font-weight: 500;
		margin-top: var(--spacing-1);
	}

	.territory-actions {
		display: flex;
		gap: var(--spacing-2);
	}

	.no-territory {
		color: var(--gray-500);
		text-align: center;
		padding: var(--spacing-4) 0;
	}

	.unassign-confirm {
		margin-top: var(--spacing-4);
		padding: var(--spacing-4);
		background: var(--danger-50);
		border-radius: var(--radius-md);
	}

	.confirm-text {
		color: var(--danger-700);
		font-size: 0.875rem;
		margin-bottom: var(--spacing-3);
	}

	.confirm-actions {
		display: flex;
		gap: var(--spacing-2);
		justify-content: flex-end;
	}

	/* Contacts Section */
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

	.no-contacts {
		color: var(--gray-500);
		text-align: center;
		padding: var(--spacing-4) 0;
	}

	/* Contract Info */
	.info-row {
		display: flex;
		justify-content: space-between;
		padding: var(--spacing-2) 0;
		border-bottom: 1px solid var(--gray-100);
	}

	.info-row:last-child {
		border-bottom: none;
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

	/* Badges */
	.badge {
		display: inline-flex;
		align-items: center;
		padding: 2px 8px;
		border-radius: var(--radius-full);
		font-size: 0.75rem;
		font-weight: 500;
	}

	.badge-primary {
		background: var(--primary-100);
		color: var(--primary-700);
	}

	.badge-success {
		background: var(--success-100);
		color: var(--success-700);
	}

	.badge-gray {
		background: var(--gray-100);
		color: var(--gray-600);
	}

	/* Alerts */
	.alert {
		display: flex;
		align-items: center;
		gap: var(--spacing-3);
		padding: var(--spacing-4);
		border-radius: var(--radius-lg);
		margin-bottom: var(--spacing-6);
	}

	.alert-error {
		background: var(--danger-50);
		color: var(--danger-700);
		border: 1px solid var(--danger-200);
	}

	.alert-success {
		background: var(--success-50);
		color: var(--success-700);
		border: 1px solid var(--success-200);
	}

	/* Modal */
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

	.empty-message {
		color: var(--gray-500);
		text-align: center;
		padding: var(--spacing-4) 0;
	}

	.checkbox-label {
		display: flex;
		align-items: center;
		gap: var(--spacing-2);
		cursor: pointer;
		height: 100%;
		padding-top: var(--spacing-2);
	}

	.checkbox-label input {
		width: 18px;
		height: 18px;
		cursor: pointer;
	}
</style>
