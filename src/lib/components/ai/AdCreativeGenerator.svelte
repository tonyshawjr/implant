<script lang="ts">
	import { Button, Card, Textarea, Spinner, Alert, Badge } from 'flowbite-svelte';
	import {
		WandMagicSparklesSolid,
		ClipboardListOutline,
		CheckCircleSolid,
		ExclamationCircleOutline
	} from 'flowbite-svelte-icons';

	// Types
	type GenerationType = 'headlines' | 'primaryText' | 'adCopy' | 'cta';

	interface GenerationTypeOption {
		value: GenerationType;
		label: string;
		description: string;
	}

	interface Props {
		organizationId: string;
		voiceProfileId?: string;
		campaignContext?: string;
		onSelect?: (content: string) => void;
	}

	let {
		organizationId,
		voiceProfileId = '',
		campaignContext = '',
		onSelect = () => {}
	}: Props = $props();

	// State
	let prompt = $state('');
	let generationType = $state<GenerationType>('headlines');
	let generating = $state(false);
	let generatedOptions = $state<string[]>([]);
	let error = $state<string | null>(null);
	let copiedIndex = $state<number | null>(null);

	// Generation type options
	const generationTypes: GenerationTypeOption[] = [
		{
			value: 'headlines',
			label: 'Headlines',
			description: 'Short, attention-grabbing headlines for ads'
		},
		{
			value: 'primaryText',
			label: 'Primary Text',
			description: 'Main ad body text that describes your offer'
		},
		{
			value: 'adCopy',
			label: 'Ad Copy',
			description: 'Complete ad copy with headline and description'
		},
		{
			value: 'cta',
			label: 'CTA Options',
			description: 'Call-to-action button text variations'
		}
	];

	// Get current type description
	let currentTypeDescription = $derived(
		generationTypes.find((t) => t.value === generationType)?.description || ''
	);

	// Generate content
	async function generate() {
		if (!prompt.trim()) {
			error = 'Please enter a description of what you want to generate.';
			return;
		}

		generating = true;
		error = null;
		generatedOptions = [];

		try {
			const response = await fetch('/api/ai/generate-creative', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					type: generationType,
					prompt: prompt.trim(),
					voiceProfileId,
					organizationId,
					campaignContext
				})
			});

			const data = await response.json();

			if (!response.ok) {
				throw new Error(data.error || 'Failed to generate content');
			}

			if (data.success && data.options) {
				generatedOptions = data.options;
			} else {
				throw new Error('Invalid response from server');
			}
		} catch (err) {
			error = err instanceof Error ? err.message : 'An unexpected error occurred';
		} finally {
			generating = false;
		}
	}

	// Copy to clipboard
	async function copyToClipboard(text: string, index: number) {
		try {
			await navigator.clipboard.writeText(text);
			copiedIndex = index;
			setTimeout(() => {
				copiedIndex = null;
			}, 2000);
		} catch (err) {
			console.error('Failed to copy:', err);
		}
	}

	// Select option
	function selectOption(content: string) {
		onSelect(content);
	}

	// Get label for generation type
	function getTypeLabel(type: GenerationType): string {
		const found = generationTypes.find((t) => t.value === type);
		return found ? found.label : type;
	}

	// Clear error
	function clearError() {
		error = null;
	}
</script>

<Card class="w-full">
	<div class="space-y-6">
		<!-- Header -->
		<div class="flex items-center gap-3">
			<div
				class="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100 dark:bg-purple-900"
			>
				<WandMagicSparklesSolid class="h-5 w-5 text-purple-600 dark:text-purple-400" />
			</div>
			<div>
				<h3 class="text-lg font-semibold text-gray-900 dark:text-white">AI Creative Generator</h3>
				<p class="text-sm text-gray-500 dark:text-gray-400">
					Generate ad creative using your brand voice
				</p>
			</div>
		</div>

		<!-- Generation Type Buttons -->
		<div class="space-y-2">
			<span class="block text-sm font-medium text-gray-700 dark:text-gray-300">
				Creative Type
			</span>
			<div class="flex flex-wrap gap-2">
				{#each generationTypes as type}
					<Button
						size="sm"
						color={generationType === type.value ? 'primary' : 'alternative'}
						onclick={() => (generationType = type.value)}
					>
						{type.label}
					</Button>
				{/each}
			</div>
			<p class="text-xs text-gray-500 dark:text-gray-400">
				{currentTypeDescription}
			</p>
		</div>

		<!-- Prompt Input -->
		<div class="space-y-2">
			<label for="creative-prompt" class="block text-sm font-medium text-gray-700 dark:text-gray-300">
				Describe what you want to generate
			</label>
			<Textarea
				id="creative-prompt"
				bind:value={prompt}
				placeholder="E.g., Headlines for a dental implant special offer targeting seniors who want to restore their smile..."
				rows={4}
				class="w-full"
				disabled={generating}
			/>
		</div>

		<!-- Error Alert -->
		{#if error}
			<Alert color="red" dismissable onclose={clearError}>
				{#snippet icon()}
					<ExclamationCircleOutline class="h-5 w-5" />
				{/snippet}
				<span class="font-medium">Error:</span>
				{error}
			</Alert>
		{/if}

		<!-- Generate Button -->
		<Button
			color="purple"
			class="w-full"
			onclick={generate}
			disabled={generating || !prompt.trim()}
		>
			{#if generating}
				<Spinner class="me-3" size="4" color="gray" />
				Generating...
			{:else}
				<WandMagicSparklesSolid class="me-2 h-5 w-5" />
				Generate {getTypeLabel(generationType)}
			{/if}
		</Button>

		<!-- Generated Options -->
		{#if generatedOptions.length > 0}
			<div class="space-y-3">
				<div class="flex items-center justify-between">
					<h4 class="text-sm font-medium text-gray-700 dark:text-gray-300">
						Generated Options
					</h4>
					<Badge color="purple">{generatedOptions.length} suggestions</Badge>
				</div>

				<div class="space-y-2">
					{#each generatedOptions as option, index}
						<div
							class="group relative rounded-lg border border-gray-200 bg-gray-50 p-4 transition-colors hover:border-purple-300 hover:bg-purple-50 dark:border-gray-700 dark:bg-gray-800 dark:hover:border-purple-600 dark:hover:bg-purple-900/20"
						>
							<p class="pr-20 text-sm text-gray-900 dark:text-white whitespace-pre-wrap">
								{option}
							</p>

							<!-- Action Buttons -->
							<div
								class="absolute right-2 top-2 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100"
							>
								<Button
									size="xs"
									color="alternative"
									onclick={() => copyToClipboard(option, index)}
									title="Copy to clipboard"
								>
									{#if copiedIndex === index}
										<CheckCircleSolid class="h-4 w-4 text-green-500" />
									{:else}
										<ClipboardListOutline class="h-4 w-4" />
									{/if}
								</Button>
								<Button
									size="xs"
									color="purple"
									onclick={() => selectOption(option)}
									title="Use this option"
								>
									Use
								</Button>
							</div>
						</div>
					{/each}
				</div>
			</div>
		{/if}

		<!-- Voice Profile Info -->
		{#if voiceProfileId}
			<div
				class="flex items-center gap-2 rounded-lg bg-blue-50 p-3 text-sm text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
			>
				<CheckCircleSolid class="h-4 w-4" />
				<span>Using your brand voice profile for generation</span>
			</div>
		{/if}
	</div>
</Card>
