<script lang="ts">
	// Sticky app bar: a compact title fades in once the large title scrolls away.
	import type { Snippet } from 'svelte';
	import Icon from './Icon.svelte';

	let {
		title,
		eyebrow,
		back,
		actions
	}: {
		title: string;
		/** Small line above the large title ("Good morning"). */
		eyebrow?: string;
		/** Back button target + label (detail pages). */
		back?: { href: string; label: string };
		actions?: Snippet;
	} = $props();

	let scrolled = $state(false);

	$effect(() => {
		const onscroll = () => (scrolled = window.scrollY > 44);
		onscroll();
		window.addEventListener('scroll', onscroll, { passive: true });
		return () => window.removeEventListener('scroll', onscroll);
	});
</script>

<header
	class="sticky top-0 z-30 -mx-4 px-4 pt-[env(safe-area-inset-top)] transition-colors duration-200 {scrolled
		? 'border-b border-white/5 bg-slate-950/80 backdrop-blur-xl'
		: 'border-b border-transparent'}"
>
	<div class="relative flex h-12 items-center justify-between gap-2">
		<div class="flex min-w-0 flex-1 items-center">
			{#if back}
				<a
					href={back.href}
					class="-ml-2 flex items-center gap-0.5 rounded-lg py-2 pr-2 text-[17px] text-indigo-400 active:opacity-60"
				>
					<Icon name="chevron-left" class="size-6" strokeWidth={2.25} />
					<span class="truncate">{back.label}</span>
				</a>
			{/if}
		</div>
		<span
			class="pointer-events-none absolute left-1/2 max-w-[55%] -translate-x-1/2 truncate text-[17px] font-semibold text-white transition-opacity duration-200 {scrolled
				? 'opacity-100'
				: 'opacity-0'}"
			aria-hidden="true">{title}</span
		>
		<div class="flex flex-1 items-center justify-end gap-1">
			{@render actions?.()}
		</div>
	</div>
</header>

<div class="mb-4 pt-1">
	{#if eyebrow}
		<p class="text-sm font-medium text-slate-400">{eyebrow}</p>
	{/if}
	<h1 class="truncate text-[2rem] leading-tight font-bold tracking-tight text-white">{title}</h1>
</div>
