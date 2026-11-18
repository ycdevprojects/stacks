<script lang="ts">
	import type { Habit } from '$lib/types';
	import { flip } from 'svelte/animate';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { getAppState, habitsOf, isDone, moveHabit } from '$lib/stores/app.svelte';
	import { calculateStreak } from '$lib/utils/gamification';
	import { addDays, dateOf, theme, haptic } from '$lib/utils/helpers';
	import { dueHabits, habitExcuse, isScheduled, scheduleLabel } from '$lib/utils/schedule';
	import { formatTime } from '$lib/services/reminders';
	import PageHeader from '$lib/components/PageHeader.svelte';
	import StackSheet from '$lib/components/StackSheet.svelte';
	import HabitSheet from '$lib/components/HabitSheet.svelte';
	import Icon from '$lib/components/Icon.svelte';

	const app = getAppState();

	const stack = $derived(app.stacks.find((s) => s.id === page.params.id) ?? null);
	const habits = $derived(stack ? habitsOf(stack.id) : []);
	const t = $derived(theme(stack?.color ?? 'indigo'));
	const week = $derived(Array.from({ length: 7 }, (_, i) => addDays(app.today, i - 6)));

	// Last 30 days: share of habit-days checked off, and days the whole stack was done.
	const summary = $derived.by(() => {
		if (!stack || habits.length === 0) return null;
		// Only count days since the stack existed (creation or first check-in, whichever is earlier).
		const ids = new Set(habits.map((h) => h.id));
		const start = app.completions.reduce(
			(min, c) => (ids.has(c.habit_id) && c.completed_at < min ? c.completed_at : min),
			stack.created_at.slice(0, 10)
		);
		const days = Array.from({ length: 30 }, (_, i) => addDays(app.today, -i)).filter((d) => d >= start);
		let checks = 0;
		let slots = 0;
		let fullDays = 0;
		for (const d of days) {
			const due = dueHabits(habits, d);
			// Rest days and days with nothing scheduled don't count against the rate.
			if (due.length === 0 || app.restDays.includes(d)) continue;
			const n = due.filter((h) => isDone(h.id, d)).length;
			checks += n;
			slots += due.length;
			if (n === due.length) fullDays++;
		}
		return { rate: slots ? Math.round((checks / slots) * 100) : 0, fullDays };
	});

	function streakOf(habit: Habit): number {
		return calculateStreak(
			app.completions.filter((c) => c.habit_id === habit.id).map((c) => c.completed_at),
			habitExcuse(habit, app.restDays)
		);
	}

	let showEdit = $state(false);
	let showHabit = $state(false);
	let editingHabit = $state<Habit | null>(null);
	let reorder = $state(false);

	function openHabit(habit: Habit | null) {
		editingHabit = habit;
		showHabit = true;
	}
</script>

<svelte:head><title>{stack?.name ?? 'Stack'} · Stackr</title></svelte:head>

<PageHeader title={stack?.name ?? 'Stack'} back={{ href: '/stacks', label: 'Stacks' }}>
	{#snippet actions()}
		{#if stack}
			<button type="button" onclick={() => (showEdit = true)} class="rounded-full px-3 py-1.5 text-[17px] text-indigo-400 active:opacity-60">
				Edit
			</button>
		{/if}
	{/snippet}
</PageHeader>

{#if stack}
	<section class="card mb-6 p-5">
		<div class="flex items-center gap-4">
			<span class="grid size-16 shrink-0 place-items-center rounded-2xl text-3xl {t.soft}">{stack.icon}</span>
			<div class="min-w-0">
				<p class="text-[15px] leading-snug text-slate-300">
					<span class="font-semibold text-white">{stack.trigger}</span>, I will…
				</p>
				{#if stack.reminder}
					<p class="mt-1.5 flex items-center gap-1 text-xs text-slate-500">
						<Icon name="bell" class="size-3.5" strokeWidth={2} /> Reminder at {formatTime(stack.reminder)}
					</p>
				{/if}
			</div>
		</div>
		{#if summary}
			<div class="mt-5 grid grid-cols-3 divide-x divide-white/5 text-center">
				<div>
					<p class="text-xl font-bold text-white tabular-nums">{habits.length}</p>
					<p class="text-[11px] text-slate-500">habits</p>
				</div>
				<div>
					<p class="text-xl font-bold text-white tabular-nums">{summary.rate}%</p>
					<p class="text-[11px] text-slate-500">done, 30 days</p>
				</div>
				<div>
					<p class="text-xl font-bold text-white tabular-nums">{summary.fullDays}</p>
					<p class="text-[11px] text-slate-500">full days</p>
				</div>
			</div>
		{/if}
	</section>

	<div class="mb-2 flex items-center justify-between px-1">
		<h2 class="section-title mb-0">Habits</h2>
		{#if habits.length > 1}
			<button type="button" onclick={() => (reorder = !reorder)} class="text-[15px] font-medium text-indigo-400 active:opacity-60">
				{reorder ? 'Done' : 'Reorder'}
			</button>
		{/if}
	</div>

	{#if habits.length > 0}
		<ul class="card divide-y divide-white/5 overflow-hidden">
			{#each habits as habit, i (habit.id)}
				<li animate:flip={{ duration: 220 }} class="bg-slate-900">
					{#if reorder}
						<div class="flex items-center gap-3 px-4 py-3">
							<span class="min-w-0 flex-1 truncate text-[15px] text-white">{habit.name}</span>
							<button
								type="button"
								class="grid size-10 place-items-center rounded-full bg-slate-800 text-slate-300 active:bg-slate-700 disabled:opacity-30"
								disabled={i === 0}
								onclick={() => (haptic(6), moveHabit(habit.id, -1))}
								aria-label="Move {habit.name} up"
							>
								<Icon name="chevron-up" class="size-5" strokeWidth={2.25} />
							</button>
							<button
								type="button"
								class="grid size-10 place-items-center rounded-full bg-slate-800 text-slate-300 active:bg-slate-700 disabled:opacity-30"
								disabled={i === habits.length - 1}
								onclick={() => (haptic(6), moveHabit(habit.id, 1))}
								aria-label="Move {habit.name} down"
							>
								<Icon name="chevron-down" class="size-5" strokeWidth={2.25} />
							</button>
						</div>
					{:else}
						{@const streak = streakOf(habit)}
						<button type="button" onclick={() => openHabit(habit)} class="flex w-full items-center gap-3 px-4 py-3.5 text-left active:bg-white/5">
							<span class="min-w-0 flex-1">
								<span class="block truncate text-[15px] text-white">{habit.name}</span>
								{#if habit.description}
									<span class="block truncate text-xs text-slate-500">{habit.description}</span>
								{/if}
								<span class="mt-2 flex items-center gap-1" aria-label="Last 7 days">
									{#each week as d (d)}
										<span
											class="size-2.5 rounded-full {isDone(habit.id, d)
												? t.solid
												: isScheduled(habit, d)
													? 'bg-slate-800'
													: 'ring-1 ring-slate-800 ring-inset'}"
											title={dateOf(d).toLocaleDateString(undefined, { weekday: 'short' })}
										></span>
									{/each}
									{#if habit.days?.length}
										<span class="ml-1.5 text-xs text-slate-500">{scheduleLabel(habit.days)}</span>
									{/if}
									{#if streak > 1}
										<span class="ml-1.5 text-xs font-semibold text-orange-400">🔥 {streak}</span>
									{/if}
								</span>
							</span>
							<Icon name="chevron-right" class="size-4 shrink-0 text-slate-600" strokeWidth={2.5} />
						</button>
					{/if}
				</li>
			{/each}
		</ul>
	{:else}
		<p class="card px-4 py-6 text-center text-[15px] text-slate-400">No habits yet. Keep each one under two minutes.</p>
	{/if}

	{#if !reorder}
		<button type="button" onclick={() => openHabit(null)} class="btn-secondary mt-4 flex w-full items-center justify-center gap-2">
			<Icon name="plus" class="size-5" strokeWidth={2.25} /> Add Habit
		</button>
	{/if}

	<StackSheet bind:open={showEdit} {stack} ondeleted={() => goto('/stacks', { replaceState: true })} />
	<HabitSheet bind:open={showHabit} {stack} habit={editingHabit} />
{:else}
	<div class="flex flex-col items-center py-16 text-center">
		<p class="text-[15px] text-slate-400">This stack doesn’t exist anymore.</p>
		<a href="/stacks" class="btn-secondary mt-4">Back to Stacks</a>
	</div>
{/if}
