<script lang="ts">
	import { Button, Card, Input, Label, Badge, Alert, Spinner } from 'flowbite-svelte';
	import { CheckCircleSolid, ExclamationCircleSolid, LockSolid, TrashBinSolid, RedoOutline } from 'flowbite-svelte-icons';
	import { enhance } from '$app/forms';

	let { data, form } = $props();

	// State for editing each key
	let editingKey = $state<string | null>(null);
	let newKeyValue = $state('');
	let testing = $state<string | null>(null);

	const apiKeyConfigs = [
		{
			key: 'claude_api_key',
			label: 'Claude API Key',
			placeholder: 'sk-ant-api03-...',
			link: 'https://console.anthropic.com',
			linkText: 'Get key from Anthropic Console'
		},
		{
			key: 'openai_api_key',
			label: 'OpenAI API Key',
			placeholder: 'sk-...',
			link: 'https://platform.openai.com/api-keys',
			linkText: 'Get key from OpenAI'
		},
		{
			key: 'census_api_key',
			label: 'Census Bureau API Key',
			placeholder: 'Your Census API key',
			link: 'https://api.census.gov/data/key_signup.html',
			linkText: 'Request Census API key'
		},
		{
			key: 'mapbox_api_key',
			label: 'Mapbox Access Token',
			placeholder: 'pk.ey...',
			link: 'https://account.mapbox.com/access-tokens/',
			linkText: 'Get token from Mapbox'
		}
	];

	function startEditing(key: string) {
		editingKey = key;
		newKeyValue = '';
	}

	function cancelEditing() {
		editingKey = null;
		newKeyValue = '';
	}
</script>

<svelte:head>
	<title>Settings | SqueezMedia</title>
</svelte:head>

<div class="p-6 max-w-4xl mx-auto">
	<div class="mb-8">
		<h1 class="text-2xl font-bold text-gray-900 dark:text-white">System Settings</h1>
		<p class="text-gray-600 dark:text-gray-400 mt-1">Configure API keys and integrations</p>
	</div>

	{#if form?.success}
		<Alert color="green" class="mb-6">
			<CheckCircleSolid slot="icon" class="w-5 h-5" />
			{form.message}
		</Alert>
	{/if}

	{#if form?.error}
		<Alert color="red" class="mb-6">
			<ExclamationCircleSolid slot="icon" class="w-5 h-5" />
			{form.error}
		</Alert>
	{/if}

	<Card size="xl" class="mb-6">
		<h2 class="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
			<LockSolid class="w-5 h-5" />
			API Keys
		</h2>
		<p class="text-sm text-gray-600 dark:text-gray-400 mb-6">
			Configure API keys for AI services and external integrations. Keys are stored securely and encrypted.
		</p>

		<div class="space-y-6">
			{#each apiKeyConfigs as config}
				{@const keyData = data.apiKeys?.[config.key]}
				<div class="border-b border-gray-200 dark:border-gray-700 pb-6 last:border-0 last:pb-0">
					<div class="flex items-start justify-between">
						<div class="flex-1">
							<div class="flex items-center gap-2 mb-1">
								<span class="font-medium text-gray-900 dark:text-white">{config.label}</span>
								{#if keyData?.configured}
									<Badge color="green">Configured</Badge>
								{:else}
									<Badge color="yellow">Not configured</Badge>
								{/if}
							</div>
							<p class="text-sm text-gray-500 dark:text-gray-400">{keyData?.description}</p>
							<a href={config.link} target="_blank" rel="noopener" class="text-sm text-primary-600 hover:underline mt-1 inline-block">
								{config.linkText} &rarr;
							</a>
						</div>

						<div class="flex items-center gap-2 ml-4">
							{#if keyData?.configured}
								<code class="text-sm bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded font-mono">
									{keyData.masked}
								</code>
								
								<form method="POST" action="?/testApiKey" use:enhance={() => {
									testing = config.key;
									return async ({ update }) => {
										testing = null;
										await update();
									};
								}}>
									<input type="hidden" name="keyName" value={config.key} />
									<Button type="submit" color="light" size="xs" disabled={testing === config.key}>
										{#if testing === config.key}
											<Spinner size="4" class="mr-1" />
										{:else}
											<RedoOutline class="w-4 h-4 mr-1" />
										{/if}
										Test
									</Button>
								</form>

								<form method="POST" action="?/deleteApiKey" use:enhance>
									<input type="hidden" name="keyName" value={config.key} />
									<Button type="submit" color="red" size="xs" outline>
										<TrashBinSolid class="w-4 h-4" />
									</Button>
								</form>
							{/if}

							{#if editingKey !== config.key}
								<Button color="primary" size="xs" onclick={() => startEditing(config.key)}>
									{keyData?.configured ? 'Update' : 'Add Key'}
								</Button>
							{/if}
						</div>
					</div>

					{#if editingKey === config.key}
						<form method="POST" action="?/saveApiKey" use:enhance={() => {
							return async ({ update }) => {
								editingKey = null;
								newKeyValue = '';
								await update();
							};
						}} class="mt-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
							<input type="hidden" name="keyName" value={config.key} />
							<div class="flex gap-2">
								<div class="flex-1">
									<Label for="keyValue" class="sr-only">API Key</Label>
									<Input
										type="password"
										name="keyValue"
										id="keyValue"
										placeholder={config.placeholder}
										bind:value={newKeyValue}
										class="font-mono"
									/>
								</div>
								<Button type="submit" color="primary">Save</Button>
								<Button type="button" color="light" onclick={cancelEditing}>Cancel</Button>
							</div>
							<p class="text-xs text-gray-500 mt-2">
								Paste your full API key. It will be stored securely and masked in the UI.
							</p>
						</form>
					{/if}
				</div>
			{/each}
		</div>
	</Card>

	<Card size="xl">
		<h2 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">AI Feature Status</h2>
		<div class="space-y-3">
			<div class="flex items-center justify-between">
				<span class="text-gray-700 dark:text-gray-300">Voice Analysis</span>
				{#if data.apiKeys?.claude_api_key?.configured || data.apiKeys?.openai_api_key?.configured}
					<Badge color="green">Ready</Badge>
				{:else}
					<Badge color="red">Requires Claude or OpenAI key</Badge>
				{/if}
			</div>
			<div class="flex items-center justify-between">
				<span class="text-gray-700 dark:text-gray-300">Content Generation</span>
				{#if data.apiKeys?.claude_api_key?.configured || data.apiKeys?.openai_api_key?.configured}
					<Badge color="green">Ready</Badge>
				{:else}
					<Badge color="red">Requires Claude or OpenAI key</Badge>
				{/if}
			</div>
			<div class="flex items-center justify-between">
				<span class="text-gray-700 dark:text-gray-300">Territory Demographics</span>
				{#if data.apiKeys?.census_api_key?.configured}
					<Badge color="green">Ready</Badge>
				{:else}
					<Badge color="yellow">Using limited public API</Badge>
				{/if}
			</div>
			<div class="flex items-center justify-between">
				<span class="text-gray-700 dark:text-gray-300">Interactive Maps</span>
				{#if data.apiKeys?.mapbox_api_key?.configured}
					<Badge color="green">Ready</Badge>
				{:else}
					<Badge color="yellow">Using basic maps</Badge>
				{/if}
			</div>
		</div>
	</Card>
</div>
