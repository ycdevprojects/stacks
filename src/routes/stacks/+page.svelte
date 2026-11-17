<script lang="ts">
	import { flip } from 'svelte/animate';
	import { getAppState, habitsOf, moveStack } from '$lib/stores/app.svelte';
	import { theme, plural, haptic } from '$lib/utils/helpers';
	import PageHeader from '$lib/components/PageHeader.svelte';
	import StackSheet from '$lib/components/StackSheet.svelte';
	import Icon from '$lib/components/Icon.svelte';

	const app = getAppState();

	let reorder = $state(false);
	let showNewStack = $state(false);

	function move(id: string, delta: -1 | 1) {
		haptic(6);
		moveStack(id, delta);
	}
</script>

<svelte:head><title>Stacks · Stackr</title></svelte:head>

<PageHeader title="Stacks">
	{#snippet actions()}
		{#if app.stacks.length > 1}
			<button
				type="button"
				onclick={() => (reorder = !reorder)}
				class="rounded-full px-3 py-1.5 text-[15px] font-medium active:opacity-60 {reorder ? 'bg-indigo-500 text-white' : 'text-indigo-400'}"
			>
				{reorder ? 'Done' : 'Reorder'}
			</button>
		{/if}
		{#if !reorder}
			<button
				type="button"
				onclick={() => (showNewStack = true)}
				class="grid size-9 place-items-center rounded-full bg-indigo-500 text-white active:opacity-70"
				aria-label="New stack"
			>
				<Icon name="plus" class="size-5" strokeWidth={2.5} />
			</button>
		{/if}
	{/snippet}
</PageHeader>

{#if app.stacks.length === 0}
	<div class="flex flex-col items-center px-6 py-16 text-center">
		<div class="mb-4 grid size-16 place-items-center rounded-3xl bg-indigo-500/15 text-3xl">🧱</div>
		<h2 class="text-lg font-semibold text-white">No stacks yet</h2>
		<p class="mt-1 text-[15px] text-slate-400">A stack is a routine you already do, with a few tiny habits attached.</p>
		<button type="button" class="btn-primary mt-6" onclick={() => (showNewStack = true)}>Create a Stack</button>
	</div>
{:else}
	<ul class="card divide-y divide-white/5 overflow-hidden">
		{#each app.stacks as stack, i (stack.id)}
			{@const count = habitsOf(stack.id).length}
			<li animate:flip={{ duration: 220 }} class="bg-slate-900">
				{#if reorder}
					<div class="flex items-center gap-3 px-4 py-3">
						<span class="grid size-11 shrink-0 place-items-center rounded-xl text-xl {theme(stack.color).soft}">{stack.icon}</span>
						<span class="min-w-0 flex-1 truncate font-semibold text-white">{stack.name}</span>
						<button
							type="button"
							class="grid size-10 place-items-center rounded-full bg-slate-800 text-slate-300 active:bg-slate-700 disabled:opacity-30"
							disabled={i === 0}
							onclick={() => move(stack.id, -1)}
							aria-label="Move {stack.name} up"
						>
							<Icon name="chevron-up" class="size-5" strokeWidth={2.25} />
						</button>
						<button
							type="button"
							class="grid size-10 place-items-center rounded-full bg-slate-800 text-slate-300 active:bg-slate-700 disabled:opacity-30"
							disabled={i === app.stacks.length - 1}
							onclick={() => move(stack.id, 1)}
							aria-label="Move {stack.name} down"
						>
							<Icon name="chevron-down" class="size-5" strokeWidth={2.25} />
						</button>
					</div>
				{:else}
					<a href="/stacks/{stack.id}" class="flex items-center gap-3 px-4 py-3 active:bg-white/5">
						<span class="grid size-11 shrink-0 place-items-center rounded-xl text-xl {theme(stack.color).soft}">{stack.icon}</span>
						<span class="min-w-0 flex-1">
							<span class="block truncate font-semibold text-white">{stack.name}</span>
							<span class="block truncate text-[13px] text-slate-400">{stack.trigger}</span>
						</span>
						<span class="shrink-0 text-[13px] text-slate-500">{plural(count, 'habit')}</span>
						<Icon name="chevron-right" class="size-4 shrink-0 text-slate-600" strokeWidth={2.5} />
					</a>
				{/if}
			</li>
		{/each}
	</ul>
	<p class="mt-3 px-1 text-[13px] text-slate-500">
		{reorder ? 'Order here is the order on your Today screen.' : 'Tap a stack to manage its habits.'}
	</p>
{/if}

<StackSheet bind:open={showNewStack} />
