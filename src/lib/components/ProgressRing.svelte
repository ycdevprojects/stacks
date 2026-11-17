<script lang="ts">
	// Circular progress; the arc takes `currentColor`, so color it with a text-* class.
	import type { Snippet } from 'svelte';

	let {
		value,
		size = 40,
		stroke = 4,
		class: className = 'text-indigo-400',
		children
	}: { value: number; size?: number; stroke?: number; class?: string; children?: Snippet } = $props();

	const r = $derived((size - stroke) / 2);
	const c = $derived(2 * Math.PI * r);
	const clamped = $derived(Math.max(0, Math.min(1, value)));
</script>

<div class="relative inline-grid shrink-0 place-items-center {className}" style:width="{size}px" style:height="{size}px">
	<svg width={size} height={size} viewBox="0 0 {size} {size}" class="-rotate-90" aria-hidden="true">
		<circle cx={size / 2} cy={size / 2} {r} fill="none" stroke="currentColor" stroke-opacity="0.15" stroke-width={stroke} />
		<circle
			cx={size / 2}
			cy={size / 2}
			{r}
			fill="none"
			stroke="currentColor"
			stroke-width={stroke}
			stroke-linecap="round"
			stroke-dasharray={c}
			stroke-dashoffset={c * (1 - clamped)}
			style="transition: stroke-dashoffset 0.5s cubic-bezier(0.22, 1, 0.36, 1)"
		/>
	</svg>
	{#if children}
		<div class="absolute inset-0 grid place-items-center">{@render children()}</div>
	{/if}
</div>
