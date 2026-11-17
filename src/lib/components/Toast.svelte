<script lang="ts">
	import { fly } from 'svelte/transition';
	import { backOut } from 'svelte/easing';
	import { getToasts, dismissToast, type ToastType } from '$lib/stores/toast.svelte';

	const ACCENT: Record<ToastType, string> = {
		success: 'ring-emerald-400/30',
		xp: 'ring-indigo-400/30',
		levelup: 'ring-amber-400/40',
		achievement: 'ring-yellow-400/40',
		room: 'ring-violet-400/40',
		info: 'ring-white/10',
		error: 'ring-red-400/40'
	};
</script>

<div
	class="pointer-events-none fixed inset-x-0 top-0 z-[100] flex flex-col items-center gap-2 px-4 pt-[calc(env(safe-area-inset-top)+0.75rem)]"
	aria-live="polite"
>
	{#each getToasts() as toast (toast.id)}
		<button
			type="button"
			onclick={() => dismissToast(toast.id)}
			in:fly={{ y: -24, duration: 320, easing: backOut }}
			out:fly={{ y: -12, duration: 180 }}
			class="pointer-events-auto flex w-full max-w-sm items-center gap-3 rounded-2xl bg-slate-800/95 py-2.5 pl-3 pr-4 text-left text-sm text-white shadow-2xl shadow-black/40 ring-1 backdrop-blur-xl {ACCENT[toast.type]}"
		>
			{#if toast.icon}
				<span class="text-xl leading-none">{toast.icon}</span>
			{/if}
			<span class="flex flex-col">
				<span class="font-semibold">{toast.message}</span>
				{#if toast.detail}
					<span class="text-xs text-slate-300">{toast.detail}</span>
				{/if}
			</span>
		</button>
	{/each}
</div>
