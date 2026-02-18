<script lang="ts">
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let search = $state(data.filters.search);
	let statusFilter = $state(data.filters.status);
	let orgFilter = $state(data.filters.orgFilter);
	let selectedUsers = $state<string[]>([]);
	let showBulkDeleteModal = $state(false);
	let showCredentialsModal = $state(false);
	let credentials = $state<{ email: string; password: string } | null>(null);

	function applyFilters() {
		const params = new URLSearchParams();
		if (search) params.set('search', search);
		if (statusFilter) params.set('status', statusFilter);
		if (orgFilter) params.set('org', orgFilter);
		goto(`/internal/users?${params.toString()}`);
	}

	function clearFilters() {
		search = '';
		statusFilter = '';
		orgFilter = '';
		goto('/internal/users');
	}

	function toggleSelectAll() {
		if (selectedUsers.length === data.users.length) {
			selectedUsers = [];
		} else {
			selectedUsers = data.users.map(u => u.id);
		}
	}

	function toggleUser(id: string) {
		if (selectedUsers.includes(id)) {
			selectedUsers = selectedUsers.filter(u => u !== id);
		} else {
			selectedUsers = [...selectedUsers, id];
		}
	}

	function formatDate(dateStr: string | null): string {
		if (!dateStr) return 'Never';
		const date = new Date(dateStr);
		return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
	}

	function formatRole(role: string): string {
		return role.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
	}

	function getStatusBadge(user: typeof data.users[0]): { class: string; label: string } {
		if (user.deletedAt) {
			return { class: 'deleted', label: 'Deleted' };
		}
		if (!user.isActive) {
			return { class: 'inactive', label: 'Inactive' };
		}
		return { class: 'active', label: 'Active' };
	}
</script>

<svelte:head>
	<title>User Management - SqueezMedia Operations</title>
</svelte:head>

<div class="page-header">
	<div class="page-header-left">
		<h1 class="page-title">User Management</h1>
		<p class="page-subtitle">Manage all platform users and their access</p>
	</div>
</div>

<!-- Stats Cards -->
<div class="stats-grid">
	<div class="stat-card">
		<div class="stat-value">{data.stats.active}</div>
		<div class="stat-label">Active Users</div>
	</div>
	<div class="stat-card">
		<div class="stat-value">{data.stats.inactive}</div>
		<div class="stat-label">Inactive</div>
	</div>
	<div class="stat-card">
		<div class="stat-value">{data.stats.deleted}</div>
		<div class="stat-label">Deleted</div>
	</div>
	<div class="stat-card warning">
		<div class="stat-value">{data.stats.orphaned}</div>
		<div class="stat-label">No Organization</div>
	</div>
</div>

<!-- Filters -->
<div class="filters-bar">
	<div class="search-box">
		<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
			<circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
		</svg>
		<input
			type="text"
			placeholder="Search by name or email..."
			bind:value={search}
			onkeydown={(e) => e.key === 'Enter' && applyFilters()}
		/>
	</div>

	<select class="filter-select" bind:value={statusFilter} onchange={applyFilters}>
		<option value="">All Statuses</option>
		<option value="active">Active</option>
		<option value="inactive">Inactive</option>
		<option value="deleted">Deleted</option>
	</select>

	<select class="filter-select" bind:value={orgFilter} onchange={applyFilters}>
		<option value="">All Organizations</option>
		<option value="assigned">Has Organization</option>
		<option value="orphaned">No Organization</option>
	</select>

	<button class="btn btn-secondary" onclick={applyFilters}>
		<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
			<polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
		</svg>
		Filter
	</button>

	{#if search || statusFilter || orgFilter}
		<button class="btn btn-ghost" onclick={clearFilters}>Clear</button>
	{/if}

	{#if selectedUsers.length > 0}
		<button class="btn btn-danger" onclick={() => showBulkDeleteModal = true}>
			Delete {selectedUsers.length} Selected
		</button>
	{/if}
</div>

<!-- Users Table -->
<div class="card">
	<div class="table-container">
		<table class="table">
			<thead>
				<tr>
					<th class="checkbox-col">
						<input
							type="checkbox"
							checked={selectedUsers.length === data.users.length && data.users.length > 0}
							onchange={toggleSelectAll}
						/>
					</th>
					<th>User</th>
					<th>Role</th>
					<th>Organization</th>
					<th>Status</th>
					<th>Last Login</th>
					<th>Created</th>
					<th class="actions-col">Actions</th>
				</tr>
			</thead>
			<tbody>
				{#each data.users as user}
					{@const status = getStatusBadge(user)}
					<tr class:deleted={user.deletedAt}>
						<td class="checkbox-col">
							<input
								type="checkbox"
								checked={selectedUsers.includes(user.id)}
								onchange={() => toggleUser(user.id)}
							/>
						</td>
						<td>
							<div class="user-cell">
								<div class="user-avatar">{user.firstName[0]}{user.lastName[0]}</div>
								<div class="user-info">
									<div class="user-name">{user.name}</div>
									<div class="user-email">{user.email}</div>
								</div>
							</div>
						</td>
						<td>
							<span class="role-badge">{formatRole(user.role)}</span>
						</td>
						<td>
							{#if user.organization}
								<a href="/internal/clients/{user.organization.id}" class="org-link" class:deleted={user.organization.isDeleted}>
									{user.organization.name}
									{#if user.organization.isDeleted}
										<span class="deleted-tag">(Deleted)</span>
									{/if}
								</a>
							{:else}
								<span class="no-org">No organization</span>
							{/if}
						</td>
						<td>
							<span class="status-badge {status.class}">{status.label}</span>
						</td>
						<td class="date-cell">{formatDate(user.lastLoginAt)}</td>
						<td class="date-cell">{formatDate(user.createdAt)}</td>
						<td class="actions-col">
							<div class="action-buttons">
								{#if user.deletedAt}
									<form method="POST" action="?/reactivateUser" use:enhance={() => {
										return async ({ result }) => {
											if (result.type === 'success') window.location.reload();
										};
									}}>
										<input type="hidden" name="userId" value={user.id} />
										<button type="submit" class="btn-icon" title="Reactivate user">
											<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
												<path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/>
												<path d="M21 3v5h-5"/>
												<path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/>
												<path d="M8 16H3v5"/>
											</svg>
										</button>
									</form>
								{:else}
									<form method="POST" action="?/resetPassword" use:enhance={() => {
										return async ({ result }) => {
											if (result.type === 'success') {
												const resultData = result.data as { credentials?: { email: string; password: string } };
												if (resultData?.credentials) {
													credentials = resultData.credentials;
													showCredentialsModal = true;
												}
											}
										};
									}}>
										<input type="hidden" name="userId" value={user.id} />
										<button type="submit" class="btn-icon" title="Reset Password">
											<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
												<rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
											</svg>
										</button>
									</form>
								{/if}
								<form method="POST" action="?/deleteUser" use:enhance={() => {
									return async ({ result }) => {
										if (result.type === 'success') window.location.reload();
									};
								}}>
									<input type="hidden" name="userId" value={user.id} />
									<input type="hidden" name="hardDelete" value={user.deletedAt ? 'true' : 'false'} />
									<button
										type="submit"
										class="btn-icon danger"
										title={user.deletedAt ? 'Permanently delete' : 'Delete user'}
										onclick={(e) => {
											const msg = user.deletedAt
												? `PERMANENTLY delete ${user.name}? This cannot be undone.`
												: `Delete ${user.name}?`;
											if (!confirm(msg)) e.preventDefault();
										}}
									>
										<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
											<polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
										</svg>
									</button>
								</form>
							</div>
						</td>
					</tr>
				{:else}
					<tr>
						<td colspan="8" class="empty-state">
							<p>No users found</p>
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
</div>

<!-- Pagination -->
{#if data.pagination.totalPages > 1}
	<div class="pagination">
		<span class="pagination-info">
			Showing {(data.pagination.page - 1) * data.pagination.limit + 1} - {Math.min(data.pagination.page * data.pagination.limit, data.pagination.total)} of {data.pagination.total}
		</span>
		<div class="pagination-buttons">
			{#if data.pagination.page > 1}
				<a href="/internal/users?page={data.pagination.page - 1}" class="btn btn-secondary btn-sm">Previous</a>
			{/if}
			{#if data.pagination.page < data.pagination.totalPages}
				<a href="/internal/users?page={data.pagination.page + 1}" class="btn btn-secondary btn-sm">Next</a>
			{/if}
		</div>
	</div>
{/if}

<!-- Bulk Delete Modal -->
{#if showBulkDeleteModal}
	<div class="modal-overlay" onclick={() => showBulkDeleteModal = false}>
		<div class="modal" onclick={(e) => e.stopPropagation()}>
			<div class="modal-header">
				<h2>Delete {selectedUsers.length} Users</h2>
				<button class="modal-close" onclick={() => showBulkDeleteModal = false}>
					<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
					</svg>
				</button>
			</div>
			<form method="POST" action="?/bulkDelete" use:enhance={() => {
				return async ({ result }) => {
					if (result.type === 'success') {
						showBulkDeleteModal = false;
						selectedUsers = [];
						window.location.reload();
					}
				};
			}}>
				<div class="modal-body">
					<p>Are you sure you want to delete {selectedUsers.length} users?</p>
					<label class="checkbox-label">
						<input type="checkbox" name="hardDelete" value="true" />
						Permanently delete (cannot be undone)
					</label>
					<input type="hidden" name="userIds" value={JSON.stringify(selectedUsers)} />
				</div>
				<div class="modal-footer">
					<button type="button" class="btn btn-secondary" onclick={() => showBulkDeleteModal = false}>Cancel</button>
					<button type="submit" class="btn btn-danger">Delete Users</button>
				</div>
			</form>
		</div>
	</div>
{/if}

<!-- Credentials Modal -->
{#if showCredentialsModal && credentials}
	<div class="modal-overlay" onclick={() => { showCredentialsModal = false; credentials = null; }}>
		<div class="modal" onclick={(e) => e.stopPropagation()}>
			<div class="modal-header">
				<h2>Password Reset</h2>
				<button class="modal-close" onclick={() => { showCredentialsModal = false; credentials = null; }}>
					<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
					</svg>
				</button>
			</div>
			<div class="modal-body">
				<p>New login credentials:</p>
				<div class="credentials-box">
					<div class="credential-row">
						<span class="credential-label">Email</span>
						<span class="credential-value">{credentials.email}</span>
					</div>
					<div class="credential-row">
						<span class="credential-label">Password</span>
						<span class="credential-value" style="font-family: monospace;">{credentials.password}</span>
					</div>
				</div>
				<p style="font-size: 0.75rem; color: var(--gray-500); margin-top: var(--spacing-3);">
					Share these credentials with the user. They should change their password after logging in.
				</p>
			</div>
			<div class="modal-footer">
				<button
					type="button"
					class="btn btn-secondary"
					onclick={() => {
						if (credentials) {
							navigator.clipboard.writeText(`Email: ${credentials.email}\nPassword: ${credentials.password}`);
							alert('Credentials copied to clipboard!');
						}
					}}
				>
					Copy to Clipboard
				</button>
				<button type="button" class="btn btn-primary" onclick={() => { showCredentialsModal = false; credentials = null; }}>Done</button>
			</div>
		</div>
	</div>
{/if}

<style>
	.page-header {
		margin-bottom: var(--spacing-6);
	}

	.page-title {
		font-size: 1.5rem;
		font-weight: 600;
		color: var(--gray-900);
		margin: 0;
	}

	.page-subtitle {
		color: var(--gray-500);
		margin: var(--spacing-1) 0 0 0;
	}

	/* Stats */
	.stats-grid {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: var(--spacing-4);
		margin-bottom: var(--spacing-6);
	}

	@media (max-width: 768px) {
		.stats-grid {
			grid-template-columns: repeat(2, 1fr);
		}
	}

	.stat-card {
		background: white;
		border: 1px solid var(--gray-200);
		border-radius: var(--radius-lg);
		padding: var(--spacing-4);
	}

	.stat-card.warning {
		border-color: var(--warning-300);
		background: var(--warning-50);
	}

	.stat-value {
		font-size: 1.5rem;
		font-weight: 600;
		color: var(--gray-900);
	}

	.stat-card.warning .stat-value {
		color: var(--warning-700);
	}

	.stat-label {
		font-size: 0.875rem;
		color: var(--gray-500);
	}

	/* Filters */
	.filters-bar {
		display: flex;
		gap: var(--spacing-3);
		margin-bottom: var(--spacing-4);
		flex-wrap: wrap;
		align-items: center;
	}

	.search-box {
		display: flex;
		align-items: center;
		gap: var(--spacing-2);
		background: white;
		border: 1px solid var(--gray-300);
		border-radius: var(--radius-md);
		padding: var(--spacing-2) var(--spacing-3);
		flex: 1;
		min-width: 250px;
		max-width: 400px;
	}

	.search-box svg {
		color: var(--gray-400);
		flex-shrink: 0;
	}

	.search-box input {
		border: none;
		outline: none;
		width: 100%;
		font-size: 0.875rem;
	}

	.filter-select {
		padding: var(--spacing-2) var(--spacing-3);
		border: 1px solid var(--gray-300);
		border-radius: var(--radius-md);
		font-size: 0.875rem;
		background: white;
		cursor: pointer;
	}

	/* Table */
	.card {
		background: white;
		border: 1px solid var(--gray-200);
		border-radius: var(--radius-lg);
		overflow: hidden;
	}

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
		background: var(--gray-50);
		font-weight: 500;
		font-size: 0.75rem;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--gray-600);
	}

	.table tr.deleted {
		background: var(--gray-50);
		opacity: 0.7;
	}

	.checkbox-col {
		width: 40px;
	}

	.actions-col {
		width: 100px;
	}

	/* User cell */
	.user-cell {
		display: flex;
		align-items: center;
		gap: var(--spacing-3);
	}

	.user-avatar {
		width: 36px;
		height: 36px;
		border-radius: var(--radius-full);
		background: var(--primary-100);
		color: var(--primary-700);
		display: flex;
		align-items: center;
		justify-content: center;
		font-weight: 600;
		font-size: 0.75rem;
		flex-shrink: 0;
	}

	.user-info {
		min-width: 0;
	}

	.user-name {
		font-weight: 500;
		color: var(--gray-900);
	}

	.user-email {
		font-size: 0.75rem;
		color: var(--gray-500);
	}

	/* Role badge */
	.role-badge {
		display: inline-block;
		padding: 2px 8px;
		background: var(--gray-100);
		color: var(--gray-700);
		border-radius: var(--radius-full);
		font-size: 0.75rem;
		font-weight: 500;
	}

	/* Org link */
	.org-link {
		color: var(--primary-600);
		text-decoration: none;
	}

	.org-link:hover {
		text-decoration: underline;
	}

	.org-link.deleted {
		color: var(--gray-500);
	}

	.deleted-tag {
		font-size: 0.75rem;
		color: var(--danger-500);
	}

	.no-org {
		color: var(--gray-400);
		font-style: italic;
	}

	/* Status badge */
	.status-badge {
		display: inline-block;
		padding: 2px 8px;
		border-radius: var(--radius-full);
		font-size: 0.75rem;
		font-weight: 500;
	}

	.status-badge.active {
		background: var(--success-100);
		color: var(--success-700);
	}

	.status-badge.inactive {
		background: var(--warning-100);
		color: var(--warning-700);
	}

	.status-badge.deleted {
		background: var(--danger-100);
		color: var(--danger-700);
	}

	.date-cell {
		font-size: 0.875rem;
		color: var(--gray-500);
		white-space: nowrap;
	}

	/* Action buttons */
	.action-buttons {
		display: flex;
		gap: var(--spacing-1);
	}

	.btn-icon {
		width: 32px;
		height: 32px;
		display: flex;
		align-items: center;
		justify-content: center;
		border: none;
		background: transparent;
		color: var(--gray-500);
		cursor: pointer;
		border-radius: var(--radius-md);
		transition: all 0.15s ease;
	}

	.btn-icon:hover {
		background: var(--gray-100);
		color: var(--gray-700);
	}

	.btn-icon.danger:hover {
		background: var(--danger-100);
		color: var(--danger-600);
	}

	.empty-state {
		text-align: center;
		padding: var(--spacing-8) !important;
		color: var(--gray-500);
	}

	/* Pagination */
	.pagination {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-top: var(--spacing-4);
	}

	.pagination-info {
		font-size: 0.875rem;
		color: var(--gray-500);
	}

	.pagination-buttons {
		display: flex;
		gap: var(--spacing-2);
	}

	/* Buttons */
	.btn {
		display: inline-flex;
		align-items: center;
		gap: var(--spacing-2);
		padding: var(--spacing-2) var(--spacing-4);
		border: none;
		border-radius: var(--radius-md);
		font-size: 0.875rem;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.15s ease;
		text-decoration: none;
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
		border: 1px solid var(--gray-300);
		color: var(--gray-700);
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

	.btn-ghost {
		background: transparent;
		color: var(--gray-600);
	}

	.btn-ghost:hover {
		background: var(--gray-100);
	}

	.btn-sm {
		padding: var(--spacing-1) var(--spacing-3);
		font-size: 0.8125rem;
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
	}

	.modal {
		background: white;
		border-radius: var(--radius-lg);
		width: 90%;
		max-width: 450px;
		box-shadow: var(--shadow-xl);
	}

	.modal-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: var(--spacing-4);
		border-bottom: 1px solid var(--gray-200);
	}

	.modal-header h2 {
		font-size: 1.125rem;
		font-weight: 600;
		margin: 0;
	}

	.modal-close {
		background: none;
		border: none;
		color: var(--gray-500);
		cursor: pointer;
		padding: var(--spacing-1);
		border-radius: var(--radius-sm);
	}

	.modal-close:hover {
		background: var(--gray-100);
	}

	.modal-body {
		padding: var(--spacing-4);
	}

	.modal-footer {
		display: flex;
		justify-content: flex-end;
		gap: var(--spacing-3);
		padding: var(--spacing-4);
		border-top: 1px solid var(--gray-200);
		background: var(--gray-50);
	}

	.checkbox-label {
		display: flex;
		align-items: center;
		gap: var(--spacing-2);
		margin-top: var(--spacing-3);
		font-size: 0.875rem;
		cursor: pointer;
	}

	.credentials-box {
		background: var(--gray-100);
		border-radius: var(--radius-md);
		padding: var(--spacing-4);
		margin-top: var(--spacing-3);
	}

	.credential-row {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: var(--spacing-2) 0;
	}

	.credential-row:not(:last-child) {
		border-bottom: 1px solid var(--gray-200);
	}

	.credential-label {
		font-size: 0.75rem;
		font-weight: 500;
		color: var(--gray-500);
		text-transform: uppercase;
	}

	.credential-value {
		font-weight: 500;
		color: var(--gray-900);
	}

	.btn-primary {
		background: var(--primary-600);
		color: white;
	}

	.btn-primary:hover {
		background: var(--primary-700);
	}
</style>
