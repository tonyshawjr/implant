<script lang="ts">
	import { Badge, Progressbar, Card } from 'flowbite-svelte';

	type FormalityLevelType = 'formal' | 'professional' | 'casual' | 'friendly' | null;

	interface Props {
		tone: string | null;
		personality: string | null;
		formalityLevel: FormalityLevelType;
		keyDifferentiators: string[] | null;
		preferredTerms: string[] | null;
		avoidTerms: string[] | null;
		qualityScore: number | null;
	}

	let {
		tone,
		personality,
		formalityLevel,
		keyDifferentiators,
		preferredTerms,
		avoidTerms,
		qualityScore
	}: Props = $props();

	// Map string formality levels to numeric values for the progress bar
	function getFormalityNumeric(level: FormalityLevelType): number {
		switch (level) {
			case 'casual':
				return 1;
			case 'friendly':
				return 2;
			case 'professional':
				return 4;
			case 'formal':
				return 5;
			default:
				return 0;
		}
	}

	// Convert formality level to percentage for progressbar (scale 1-5)
	let formalityPercent = $derived(formalityLevel ? (getFormalityNumeric(formalityLevel) / 5) * 100 : 0);

	// Parse tone values if comma-separated
	let toneValues = $derived(tone ? tone.split(',').map((t) => t.trim()).filter(Boolean) : []);

	// Parse personality traits if comma-separated
	let personalityTraits = $derived(
		personality ? personality.split(',').map((p) => p.trim()).filter(Boolean) : []
	);

	// Formality labels for display
	function getFormalityLabel(level: FormalityLevelType): string {
		if (!level) return 'Not set';
		switch (level) {
			case 'casual':
				return 'Casual';
			case 'friendly':
				return 'Friendly';
			case 'professional':
				return 'Professional';
			case 'formal':
				return 'Formal';
			default:
				return 'Unknown';
		}
	}

	// Quality score color
	function getQualityColor(score: number | null): 'green' | 'yellow' | 'red' | 'gray' {
		if (!score) return 'gray';
		if (score >= 80) return 'green';
		if (score >= 60) return 'yellow';
		return 'red';
	}

	// Formality bar color based on string level
	function getFormalityColor(
		level: FormalityLevelType
	): 'gray' | 'blue' | 'green' | 'yellow' | 'indigo' | 'purple' {
		if (!level) return 'gray';
		switch (level) {
			case 'casual':
				return 'blue';
			case 'friendly':
				return 'green';
			case 'professional':
				return 'indigo';
			case 'formal':
				return 'purple';
			default:
				return 'gray';
		}
	}
</script>

<Card class="p-0">
	<div class="p-4 sm:p-5">
		<!-- Header with Quality Score -->
		<div class="mb-4 flex items-center justify-between">
			<h3 class="text-lg font-semibold text-gray-900 dark:text-white">Voice Characteristics</h3>
			{#if qualityScore !== null}
				<Badge color={getQualityColor(qualityScore)} class="text-sm">
					Quality: {qualityScore}/100
				</Badge>
			{/if}
		</div>

		<!-- Voice Tone -->
		{#if toneValues.length > 0}
			<div class="mb-4">
				<p class="mb-2 text-sm font-medium text-gray-600 dark:text-gray-400">Voice Tone</p>
				<div class="flex flex-wrap gap-2">
					{#each toneValues as toneValue}
						<Badge color="primary" rounded>{toneValue}</Badge>
					{/each}
				</div>
			</div>
		{/if}

		<!-- Formality Level -->
		{#if formalityLevel}
			<div class="mb-4">
				<div class="mb-2 flex items-center justify-between">
					<p class="text-sm font-medium text-gray-600 dark:text-gray-400">Formality Level</p>
					<span class="text-sm font-medium text-gray-900 dark:text-white">
						{getFormalityLabel(formalityLevel)}
					</span>
				</div>
				<Progressbar
					progress={formalityPercent.toString()}
					color={getFormalityColor(formalityLevel)}
					size="h-2"
				/>
				<div class="mt-1 flex justify-between text-xs text-gray-500 dark:text-gray-400">
					<span>Casual</span>
					<span>Formal</span>
				</div>
			</div>
		{/if}

		<!-- Personality Traits -->
		{#if personalityTraits.length > 0}
			<div class="mb-4">
				<p class="mb-2 text-sm font-medium text-gray-600 dark:text-gray-400">Personality Traits</p>
				<div class="flex flex-wrap gap-2">
					{#each personalityTraits as trait}
						<Badge color="purple" border>{trait}</Badge>
					{/each}
				</div>
			</div>
		{/if}

		<!-- Key Differentiators -->
		{#if keyDifferentiators && keyDifferentiators.length > 0}
			<div class="mb-4">
				<p class="mb-2 text-sm font-medium text-gray-600 dark:text-gray-400">Key Differentiators</p>
				<ul class="space-y-1 text-sm text-gray-700 dark:text-gray-300">
					{#each keyDifferentiators as differentiator}
						<li class="flex items-start gap-2">
							<svg
								class="mt-0.5 h-4 w-4 shrink-0 text-green-500"
								fill="currentColor"
								viewBox="0 0 20 20"
							>
								<path
									fill-rule="evenodd"
									d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
									clip-rule="evenodd"
								/>
							</svg>
							{differentiator}
						</li>
					{/each}
				</ul>
			</div>
		{/if}

		<!-- Preferred Terms and Avoid Terms -->
		<div class="grid gap-4 sm:grid-cols-2">
			<!-- Preferred Terms -->
			{#if preferredTerms && preferredTerms.length > 0}
				<div>
					<p class="mb-2 text-sm font-medium text-gray-600 dark:text-gray-400">Preferred Terms</p>
					<div class="flex flex-wrap gap-1.5">
						{#each preferredTerms as term}
							<Badge color="green" class="text-xs">{term}</Badge>
						{/each}
					</div>
				</div>
			{/if}

			<!-- Avoid Terms -->
			{#if avoidTerms && avoidTerms.length > 0}
				<div>
					<p class="mb-2 text-sm font-medium text-gray-600 dark:text-gray-400">Avoid Terms</p>
					<div class="flex flex-wrap gap-1.5">
						{#each avoidTerms as term}
							<Badge color="red" class="text-xs">{term}</Badge>
						{/each}
					</div>
				</div>
			{/if}
		</div>

		<!-- Empty State if no data -->
		{#if !tone && !personality && !formalityLevel && !keyDifferentiators?.length && !preferredTerms?.length && !avoidTerms?.length}
			<p class="text-center text-sm text-gray-500 dark:text-gray-400">
				No voice characteristics data available
			</p>
		{/if}
	</div>
</Card>
