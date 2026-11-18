<script lang="ts">
	import { getAppState, isDone } from '$lib/stores/app.svelte';
	import { calculateStreak, longestStreak, xpProgressInLevel } from '$lib/utils/gamification';
	import { addDays, dateOf, formatDate } from '$lib/utils/helpers';
	import { BADGES } from '$lib/utils/badges';
	import PageHeader from '$lib/components/PageHeader.svelte';
	import ProgressRing from '$lib/components/ProgressRing.svelte';
	import SettingsSheet from '$lib/components/SettingsSheet.svelte';
	import Icon from '$lib/components/Icon.svelte';

	const app = getAppState();
	let showSettings = $state(false);

	const profile = $derived(app.profile);
	const progress = $derived(xpProgressInLevel(profile?.xp ?? 0));
	const habitCount = $derived(app.habits.length);

	const countByDate = $derived.by(() => {
		const m = new Map<string, number>();
		for (const c of app.completions) m.set(c.completed_at, (m.get(c.completed_at) ?? 0) + 1);
		return m;
	});

	const best = $derived(
		Math.max(profile?.longest_streak ?? 0, longestStreak(app.completions.map((c) => c.completed_at)))
	);

	const week = $derived(
		Array.from({ length: 7 }, (_, i) => {
			const date = addDays(app.today, i - 6);
			const count = countByDate.get(date) ?? 0;
			return { date, count, ratio: habitCount ? Math.min(1, count / habitCount) : 0 };
		})
	);
	const weekTotal = $derived(week.reduce((n, d) => n + d.count, 0));

	// 12-week heatmap: columns are weeks (Sun-Sat), newest on the right.
	const HEAT_WEEKS = 12;
	const heatmap = $derived.by(() => {
		const end = addDays(app.today, 6 - dateOf(app.today).getDay()); // Saturday of this week
		return Array.from({ length: HEAT_WEEKS }, (_, w) =>
			Array.from({ length: 7 }, (_, d) => {
				const date = addDays(end, -((HEAT_WEEKS - 1 - w) * 7 + (6 - d)));
				const count = countByDate.get(date) ?? 0;
				return { date, count, future: date > app.today };
			})
		);
	});

	function heatClass(count: number, future: boolean): string {
		if (future) return 'bg-transparent';
		if (count === 0 || habitCount === 0) return 'bg-slate-800/70';
		const r = count / habitCount;
		if (r < 0.34) return 'bg-indigo-900';
		if (r < 0.67) return 'bg-indigo-700';
		if (r < 1) return 'bg-indigo-500';
		return 'bg-indigo-300';
	}

	const habitStats = $derived(
		app.habits
			.map((h) => {
				const dates = app.completions.filter((c) => c.habit_id === h.id).map((c) => c.completed_at);
				// Rate window starts when the habit existed (creation or first check-in, whichever is earlier).
				const created = dates.reduce((min, d) => (d < min ? d : min), h.created_at.slice(0, 10));
				const window = Array.from({ length: 30 }, (_, i) => addDays(app.today, -i)).filter((d) => d >= created);
				const rate = window.length ? window.filter((d) => isDone(h.id, d)).length / window.length : 0;
				return {
					habit: h,
					stack: app.stacks.find((s) => s.id === h.stack_id),
					streak: calculateStreak(dates),
					best: longestStreak(dates),
					rate
				};
			})
			.sort((a, b) => b.streak - a.streak || b.rate - a.rate)
	);
</script>

<svelte:head><title>Stats · Stackr</title></svelte:head>

<PageHeader title="Stats">
	{#snippet actions()}
		<button
			type="button"
			onclick={() => (showSettings = true)}
			class="grid size-9 place-items-center rounded-full text-slate-300 active:bg-white/10"
			aria-label="Settings"
		>
			<Icon name="gear" class="size-6" />
		</button>
	{/snippet}
</PageHeader>

{#if profile}
	<section class="card mb-4 flex items-center gap-4 p-5">
		<ProgressRing value={progress.percent / 100} size={76} stroke={7}>
			<span class="flex flex-col items-center leading-none">
				<span class="text-[10px] font-semibold text-slate-400 uppercase">Lv</span>
				<span class="text-2xl font-bold text-white">{profile.level}</span>
			</span>
		</ProgressRing>
		<div class="min-w-0">
			<p class="text-2xl font-bold text-white tabular-nums">{profile.xp.toLocaleString()} <span class="text-base font-medium text-slate-400">XP</span></p>
			<p class="text-[13px] text-slate-400">{(progress.needed - progress.current).toLocaleString()} XP to level {profile.level + 1}</p>
		</div>
	</section>

	<div class="mb-6 grid grid-cols-2 gap-3">
		<div class="card p-4">
			<p class="text-2xl font-bold text-orange-400 tabular-nums">🔥 {profile.streak_days}</p>
			<p class="mt-0.5 text-[13px] text-slate-400">Current streak</p>
		</div>
		<div class="card p-4">
			<p class="text-2xl font-bold text-white tabular-nums">{best}</p>
			<p class="mt-0.5 text-[13px] text-slate-400">Best streak</p>
		</div>
		<div class="card p-4">
			<p class="text-2xl font-bold text-white tabular-nums">{app.completions.length.toLocaleString()}</p>
			<p class="mt-0.5 text-[13px] text-slate-400">Habits logged</p>
		</div>
		<a href="/room#badges" class="card pressable p-4">
			<p class="text-2xl font-bold text-white tabular-nums">{app.achievements.length}<span class="text-base text-slate-500">/{BADGES.length}</span></p>
			<p class="mt-0.5 text-[13px] text-slate-400">Badges ›</p>
		</a>
	</div>
{/if}

<h2 class="section-title">This week</h2>
<section class="card mb-6 p-4">
	<div class="flex h-36 items-end gap-2.5">
		{#each week as day (day.date)}
			{@const isToday = day.date === app.today}
			<div class="flex h-full flex-1 flex-col items-center gap-1.5">
				<span class="h-4 text-[11px] leading-4 font-semibold text-slate-400 tabular-nums">{day.count || ''}</span>
				<div class="relative w-full flex-1 overflow-hidden rounded-lg bg-slate-800/70">
					<div
						class="absolute inset-x-0 bottom-0 rounded-lg transition-[height] duration-500 {day.ratio >= 1
							? 'bg-emerald-400'
							: isToday
								? 'bg-indigo-400'
								: 'bg-indigo-500'}"
						style:height="{day.count ? Math.max(6, day.ratio * 100) : 0}%"
					></div>
				</div>
				<span class="text-[11px] {isToday ? 'font-bold text-indigo-400' : 'text-slate-500'}">
					{formatDate(day.date, { weekday: 'narrow' })}
				</span>
			</div>
		{/each}
	</div>
	<p class="mt-3 text-[13px] text-slate-400">{weekTotal} check-ins in the last 7 days</p>
</section>

<h2 class="section-title">Last 12 weeks</h2>
<section class="card mb-6 p-4">
	<div class="grid grid-flow-col grid-rows-7 gap-1" style:grid-template-columns="repeat({HEAT_WEEKS}, minmax(0, 1fr))">
		{#each heatmap as column, w (w)}
			{#each column as cell (cell.date)}
				<div
					class="aspect-square rounded-[4px] {heatClass(cell.count, cell.future)} {cell.date === app.today ? 'ring-1 ring-white/60' : ''}"
					title="{formatDate(cell.date, { month: 'short', day: 'numeric' })}: {cell.count}"
				></div>
			{/each}
		{/each}
	</div>
	<div class="mt-3 flex items-center justify-end gap-1.5 text-[11px] text-slate-500">
		Less
		<span class="size-2.5 rounded-[3px] bg-slate-800/70"></span>
		<span class="size-2.5 rounded-[3px] bg-indigo-900"></span>
		<span class="size-2.5 rounded-[3px] bg-indigo-700"></span>
		<span class="size-2.5 rounded-[3px] bg-indigo-500"></span>
		<span class="size-2.5 rounded-[3px] bg-indigo-300"></span>
		All
	</div>
</section>

{#if habitStats.length > 0}
	<h2 class="section-title">Habits</h2>
	<ul class="card divide-y divide-white/5 overflow-hidden">
		{#each habitStats as s (s.habit.id)}
			<li class="px-4 py-3">
				<div class="flex items-center gap-2">
					<span class="text-base">{s.stack?.icon}</span>
					<span class="min-w-0 flex-1 truncate text-[15px] text-white">{s.habit.name}</span>
					<span class="shrink-0 text-[13px] font-semibold tabular-nums {s.streak > 0 ? 'text-orange-400' : 'text-slate-600'}">
						🔥 {s.streak}
					</span>
				</div>
				<div class="mt-2 flex items-center gap-2">
					<div class="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-800">
						<div class="h-full rounded-full bg-indigo-500" style:width="{Math.round(s.rate * 100)}%"></div>
					</div>
					<span class="w-24 shrink-0 text-right text-[11px] text-slate-500 tabular-nums">
						{Math.round(s.rate * 100)}% · best {s.best}
					</span>
				</div>
			</li>
		{/each}
	</ul>
	<p class="mt-2 px-1 text-[11px] text-slate-600">Completion rate over the last 30 days (or since the habit was added).</p>
{/if}

<SettingsSheet bind:open={showSettings} />
