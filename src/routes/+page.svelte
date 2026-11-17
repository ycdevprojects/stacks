<script lang="ts">
	import type { Stack } from '$lib/types';
	import { getAppState, toggleCompletion, createStack, isDone, habitsOf } from '$lib/stores/app.svelte';
	import { calculateStreak, xpProgressInLevel } from '$lib/utils/gamification';
	import { formatDate, greeting, theme, addDays, haptic } from '$lib/utils/helpers';
	import { STACK_TEMPLATES, type StackTemplate } from '$lib/utils/templates';
	import { announceToggle, announceBadges } from '$lib/utils/feedback';
	import { showToast } from '$lib/stores/toast.svelte';
	import PageHeader from '$lib/components/PageHeader.svelte';
	import WeekStrip from '$lib/components/WeekStrip.svelte';
	import ProgressRing from '$lib/components/ProgressRing.svelte';
	import StackSheet from '$lib/components/StackSheet.svelte';
	import HabitSheet from '$lib/components/HabitSheet.svelte';
	import Icon from '$lib/components/Icon.svelte';

	const app = getAppState();

	let selectedDate = $state(app.today);
	let showNewStack = $state(false);
	let habitSheetStack = $state<Stack | null>(null);
	let showHabitSheet = $state(false);

	// Follow the calendar across midnight if the user was looking at "today".
	let lastToday = app.today;
	$effect(() => {
		const t = app.today;
		if (selectedDate === lastToday) selectedDate = t;
		lastToday = t;
	});

	const isToday = $derived(selectedDate === app.today);
	const title = $derived(
		isToday ? 'Today' : selectedDate === addDays(app.today, -1) ? 'Yesterday' : formatDate(selectedDate, { weekday: 'long' })
	);
	const eyebrow = $derived(
		isToday
			? `${greeting(new Date().getHours())} · ${formatDate(selectedDate, { month: 'long', day: 'numeric' })}`
			: formatDate(selectedDate, { month: 'long', day: 'numeric', year: 'numeric' })
	);

	const checklist = $derived(
		app.stacks.map((stack) => {
			const habits = habitsOf(stack.id);
			const done = habits.filter((h) => isDone(h.id, selectedDate)).length;
			return { stack, habits, done, total: habits.length };
		})
	);
	const totals = $derived(
		checklist.reduce((acc, s) => ({ done: acc.done + s.done, total: acc.total + s.total }), { done: 0, total: 0 })
	);

	const streaks = $derived.by(() => {
		const dates = new Map<string, string[]>();
		for (const c of app.completions) {
			const list = dates.get(c.habit_id);
			if (list) list.push(c.completed_at);
			else dates.set(c.habit_id, [c.completed_at]);
		}
		return new Map(app.habits.map((h) => [h.id, calculateStreak(dates.get(h.id) ?? [])]));
	});

	const atRisk = $derived(
		isToday ? app.habits.filter((h) => !isDone(h.id, app.today) && (streaks.get(h.id) ?? 0) >= 3) : []
	);

	const progress = $derived(xpProgressInLevel(app.profile?.xp ?? 0));

	function ratioFor(date: string): number {
		return app.habits.length ? app.habits.filter((h) => isDone(h.id, date)).length / app.habits.length : 0;
	}

	async function toggle(habitId: string) {
		const result = await toggleCompletion(habitId, selectedDate);
		if (result) announceToggle(result);
	}

	function addHabit(stack: Stack) {
		habitSheetStack = stack;
		showHabitSheet = true;
	}

	let creatingTemplate = $state(false);
	async function useTemplate(t: StackTemplate) {
		if (creatingTemplate) return;
		creatingTemplate = true;
		try {
			haptic(10);
			const { newBadges } = await createStack(
				{ name: t.name, trigger: t.trigger, color: t.color, icon: t.icon },
				t.habits
			);
			showToast('success', 'Stack created', t.name, t.icon);
			announceBadges(newBadges, 700);
		} finally {
			creatingTemplate = false;
		}
	}
</script>

<svelte:head><title>Today · Stackr</title></svelte:head>

<PageHeader {title} {eyebrow}>
	{#snippet actions()}
		{#if app.profile}
			<a href="/stats" class="pressable flex items-center gap-2 rounded-full bg-slate-900 py-1 pr-3 pl-1 ring-1 ring-white/5" aria-label="Level {app.profile.level}, view stats">
				<ProgressRing value={progress.percent / 100} size={30} stroke={3}>
					<span class="text-[11px] font-bold text-white">{app.profile.level}</span>
				</ProgressRing>
				<span class="text-[13px] font-semibold text-slate-200">
					{#if app.profile.streak_days > 0}🔥 {app.profile.streak_days}{:else}Lv {app.profile.level}{/if}
				</span>
			</a>
		{/if}
	{/snippet}
</PageHeader>

{#if app.stacks.length === 0}
	<!-- First run -->
	<section class="card mb-6 p-5">
		<div class="mb-3 grid size-12 place-items-center rounded-2xl bg-indigo-500/15 text-2xl">🧱</div>
		<h2 class="text-lg font-bold text-white">Stack tiny habits onto routines you already have</h2>
		<p class="mt-1.5 text-[15px] leading-relaxed text-slate-400">
			Pick a moment you never skip — pouring coffee, brushing your teeth — and attach a few two-minute habits to it.
			Check them off, earn XP, and watch your room fill up.
		</p>
	</section>

	<h2 class="section-title">Start with a template</h2>
	<div class="space-y-2.5">
		{#each STACK_TEMPLATES as t (t.name)}
			<button
				type="button"
				disabled={creatingTemplate}
				onclick={() => useTemplate(t)}
				class="card pressable flex w-full items-center gap-3.5 p-4 text-left"
			>
				<span class="grid size-12 shrink-0 place-items-center rounded-2xl text-2xl {theme(t.color).soft}">{t.icon}</span>
				<span class="min-w-0 flex-1">
					<span class="block font-semibold text-white">{t.name}</span>
					<span class="block truncate text-[13px] text-slate-400">{t.trigger}</span>
					<span class="mt-0.5 block truncate text-xs text-slate-500">{t.habits.join(' · ')}</span>
				</span>
				<Icon name="plus" class="size-5 shrink-0 text-indigo-400" strokeWidth={2.25} />
			</button>
		{/each}
	</div>

	<button type="button" class="btn-secondary mt-4 w-full" onclick={() => (showNewStack = true)}>
		Build my own stack
	</button>
{:else}
	<WeekStrip bind:selected={selectedDate} today={app.today} ratio={ratioFor} />

	<!-- Day summary -->
	{#if totals.total > 0}
		<section class="card mb-4 flex items-center gap-4 p-4">
			<ProgressRing
				value={totals.done / totals.total}
				size={64}
				stroke={6}
				class={totals.done === totals.total ? 'text-emerald-400' : 'text-indigo-400'}
			>
				<span class="text-sm font-bold text-white">{Math.round((totals.done / totals.total) * 100)}%</span>
			</ProgressRing>
			<div class="min-w-0 flex-1">
				{#if totals.done === totals.total}
					<p class="font-semibold text-white">All done{isToday ? ' for today' : ''} 🎉</p>
					<p class="text-[13px] text-slate-400">Every habit checked off. Nice stacking.</p>
				{:else}
					<p class="font-semibold text-white">{totals.done} of {totals.total} habits done</p>
					<p class="text-[13px] text-slate-400">
						{isToday ? `${totals.total - totals.done} to go today` : 'Missed one? You can still log it.'}
					</p>
				{/if}
				<div class="mt-2.5 flex items-center gap-2">
					<div class="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-800">
						<div
							class="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-400 transition-[width] duration-500"
							style:width="{progress.percent}%"
						></div>
					</div>
					<span class="text-[11px] font-medium text-slate-500 tabular-nums">Lv {app.profile?.level ?? 0} · {progress.current}/{progress.needed}</span>
				</div>
			</div>
		</section>
	{/if}

	{#if atRisk.length > 0}
		<div class="mb-4 flex items-center gap-3 rounded-2xl bg-amber-500/10 px-4 py-3 ring-1 ring-amber-500/20">
			<span class="text-xl">🔥</span>
			<p class="text-[13px] text-amber-200">
				{#if atRisk.length === 1}
					Keep your <b>{streaks.get(atRisk[0].id)}-day</b> streak on <b>{atRisk[0].name}</b> alive today.
				{:else}
					<b>{atRisk.length} streaks</b> are waiting on you today.
				{/if}
			</p>
		</div>
	{/if}

	<div class="space-y-4">
		{#each checklist as { stack, habits, done, total } (stack.id)}
			{@const t = theme(stack.color)}
			<section class="card overflow-hidden" aria-label={stack.name}>
				<a href="/stacks/{stack.id}" class="flex items-center gap-3 px-4 pt-4 pb-2 active:opacity-70">
					<span class="grid size-10 shrink-0 place-items-center rounded-xl text-xl {t.soft}">{stack.icon}</span>
					<span class="min-w-0 flex-1">
						<span class="block truncate font-semibold text-white">{stack.name}</span>
						<span class="block truncate text-[13px] text-slate-400">{stack.trigger}</span>
					</span>
					{#if total > 0}
						<ProgressRing value={done / total} size={32} stroke={3} class={t.text}>
							{#if done === total}
								<Icon name="check" class="size-4" strokeWidth={3} />
							{:else}
								<span class="text-[11px] font-semibold text-slate-300">{done}/{total}</span>
							{/if}
						</ProgressRing>
					{/if}
				</a>

				<ul class="px-2 pb-2">
					{#each habits as habit (habit.id)}
						{@const completed = isDone(habit.id, selectedDate)}
						{@const streak = streaks.get(habit.id) ?? 0}
						<li>
							<button
								type="button"
								onclick={() => toggle(habit.id)}
								aria-pressed={completed}
								class="flex min-h-14 w-full items-center gap-3 rounded-2xl px-2.5 py-2 text-left transition-colors active:bg-white/5"
							>
								<span
									class="grid size-7 shrink-0 place-items-center rounded-full transition-all duration-200 {completed
										? `${t.solid} check-pop`
										: 'ring-2 ring-slate-600 ring-inset'}"
								>
									{#if completed}<Icon name="check" class="size-4 text-white" strokeWidth={3} />{/if}
								</span>
								<span class="min-w-0 flex-1">
									<span
										class="block text-[15px] transition-colors {completed ? 'text-slate-500 line-through decoration-slate-600' : 'text-white'}"
										>{habit.name}</span
									>
									{#if habit.description}
										<span class="block truncate text-xs text-slate-500">{habit.description}</span>
									{/if}
								</span>
								{#if streak > 1}
									<span class="shrink-0 text-xs font-semibold text-orange-400 tabular-nums">🔥 {streak}</span>
								{/if}
							</button>
						</li>
					{:else}
						<li class="px-2.5 pb-1 text-[13px] text-slate-500">No habits yet — add a tiny one.</li>
					{/each}
				</ul>

				<button
					type="button"
					onclick={() => addHabit(stack)}
					class="flex w-full items-center gap-2 border-t border-white/5 px-5 py-3 text-[13px] font-medium text-slate-400 active:bg-white/5"
				>
					<Icon name="plus" class="size-4" strokeWidth={2.25} /> Add habit
				</button>
			</section>
		{/each}
	</div>

	<button
		type="button"
		onclick={() => (showNewStack = true)}
		class="pressable mt-4 flex w-full items-center justify-center gap-2 rounded-3xl border border-dashed border-slate-700 py-4 text-[15px] font-medium text-slate-400 active:border-indigo-500 active:text-white"
	>
		<Icon name="plus" class="size-5" strokeWidth={2} /> New Stack
	</button>
{/if}

<StackSheet bind:open={showNewStack} />
<HabitSheet bind:open={showHabitSheet} stack={habitSheetStack} />

<style>
	:global(.check-pop) {
		animation: check-pop 0.32s cubic-bezier(0.34, 1.56, 0.64, 1);
	}
	@keyframes check-pop {
		0% {
			transform: scale(0.6);
		}
		100% {
			transform: scale(1);
		}
	}
</style>
