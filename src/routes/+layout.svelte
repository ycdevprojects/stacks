<script lang="ts">
	import '../app.css';
	import { onMount } from 'svelte';
	import { fade } from 'svelte/transition';
	import { page } from '$app/state';
	import { dev } from '$app/environment';
	import { initializeState, refreshToday } from '$lib/stores/app.svelte';
	import { registerServiceWorker } from '$lib/services/pwa';
	import { haptic } from '$lib/utils/helpers';
	import Toast from '$lib/components/Toast.svelte';
	import Icon, { type IconName } from '$lib/components/Icon.svelte';

	let { children } = $props();

	let status = $state<'loading' | 'ready' | 'error'>('loading');

	onMount(() => {
		initializeState()
			.then(() => (status = 'ready'))
			.catch((e) => {
				console.error('Initialization failed:', e);
				status = 'error';
			});

		if (!dev) registerServiceWorker();

		// Keep "today" correct when the app resumes after midnight.
		const onresume = () => document.visibilityState === 'visible' && refreshToday();
		document.addEventListener('visibilitychange', onresume);
		const timer = setInterval(refreshToday, 60_000);
		return () => {
			document.removeEventListener('visibilitychange', onresume);
			clearInterval(timer);
		};
	});

	const TABS: { href: string; label: string; icon: IconName }[] = [
		{ href: '/', label: 'Today', icon: 'today' },
		{ href: '/stacks', label: 'Stacks', icon: 'stacks' },
		{ href: '/stats', label: 'Stats', icon: 'stats' },
		{ href: '/room', label: 'Room', icon: 'room' }
	];

	const path = $derived(page.url.pathname);
	const isActive = (href: string) => (href === '/' ? path === '/' : path.startsWith(href));
</script>

<Toast />

{#if status === 'loading'}
	<div class="grid min-h-dvh place-items-center" aria-busy="true">
		<div class="flex flex-col items-center gap-3 opacity-0 [animation:fadein_0.3s_0.4s_forwards]">
			<div class="grid size-16 place-items-center rounded-3xl bg-indigo-500/15 text-3xl">🧱</div>
			<p class="text-sm text-slate-500">Loading your stacks…</p>
		</div>
	</div>
{:else if status === 'error'}
	<div class="grid min-h-dvh place-items-center px-8 text-center">
		<div>
			<div class="mb-4 text-5xl">😵</div>
			<h1 class="text-xl font-bold text-white">Couldn’t open your data</h1>
			<p class="mt-2 text-sm text-slate-400">
				Stackr stores everything on this device. Private browsing or blocked site storage can prevent that.
			</p>
			<button class="btn-primary mt-6" onclick={() => location.reload()}>Try Again</button>
		</div>
	</div>
{:else}
	<main class="mx-auto w-full max-w-lg px-4 pb-[calc(5.5rem+env(safe-area-inset-bottom))]">
		{#key path}
			<div in:fade={{ duration: 160 }}>
				{@render children()}
			</div>
		{/key}
	</main>

	<nav
		class="fixed inset-x-0 bottom-0 z-40 border-t border-white/5 bg-slate-950/85 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl"
		aria-label="Main"
	>
		<div class="mx-auto flex max-w-lg items-stretch justify-around px-2">
			{#each TABS as tab (tab.href)}
				{@const active = isActive(tab.href)}
				<a
					href={tab.href}
					onclick={() => !active && haptic(6)}
					aria-current={active ? 'page' : undefined}
					class="flex flex-1 flex-col items-center gap-0.5 pt-2 pb-1.5 text-[11px] font-medium transition-colors {active
						? 'text-indigo-400'
						: 'text-slate-500 active:text-slate-300'}"
				>
					<span
						class="grid h-8 w-14 place-items-center rounded-full transition-colors duration-200 {active
							? 'bg-indigo-500/15'
							: ''}"
					>
						<Icon name={tab.icon} class="size-6" strokeWidth={active ? 2 : 1.6} />
					</span>
					{tab.label}
				</a>
			{/each}
		</div>
	</nav>
{/if}

<style>
	@keyframes -global-fadein {
		to {
			opacity: 1;
		}
	}
</style>
