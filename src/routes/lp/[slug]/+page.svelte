<script lang="ts">
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<!-- Render the full funnel HTML directly - no wrapper needed -->
{@html data.html}
