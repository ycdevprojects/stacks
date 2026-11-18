<script lang="ts">
	// The past week as tappable day pills; each ring fills with that day's completion ratio.
	import ProgressRing from './ProgressRing.svelte';
	import { addDays, dateOf, haptic } from '$lib/utils/helpers';

	let {
		selected = $bindable(),
		today,
		ratio,
		rest = () => false
	}: { selected: string; today: string; ratio: (date: string) => number; rest?: (date: string) => boolean } = $props();

	const days = $derived(Array.from({ length: 7 }, (_, i) => addDays(today, i - 6)));
</script>

<div class="-mx-1 mb-5 grid grid-cols-7 gap-1" role="tablist" aria-label="Pick a day">
	{#each days as date (date)}
		{@const d = dateOf(date)}
		{@const isSel = date === selected}
		{@const r = ratio(date)}
		{@const resting = rest(date) && r < 1}
		<button
			type="button"
			role="tab"
			aria-selected={isSel}
			aria-label={d.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
			onclick={() => {
				if (!isSel) haptic(5);
				selected = date;
			}}
			class="pressable flex flex-col items-center gap-1 rounded-2xl py-2 transition-colors {isSel
				? 'bg-slate-800'
				: 'active:bg-slate-900'}"
		>
			<span class="text-[11px] font-medium {date === today ? 'text-indigo-400' : 'text-slate-500'}">
				{d.toLocaleDateString(undefined, { weekday: 'narrow' })}
			</span>
			<ProgressRing
				value={resting ? 1 : r}
				size={34}
				stroke={3}
				class={r >= 1 ? 'text-emerald-400' : resting ? 'text-sky-400/50' : 'text-indigo-400'}
			>
				<span class="text-[13px] font-semibold {isSel ? 'text-white' : 'text-slate-300'}">{d.getDate()}</span>
			</ProgressRing>
		</button>
	{/each}
</div>
