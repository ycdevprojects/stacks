<script lang="ts">
	import type { BadgeDefinition } from '$lib/types';
	import { onMount } from 'svelte';
	import { getAppState } from '$lib/stores/app.svelte';
	import LofiRoom from '$lib/components/LofiRoom.svelte';
	import PageHeader from '$lib/components/PageHeader.svelte';
	import Sheet from '$lib/components/Sheet.svelte';
	import Icon from '$lib/components/Icon.svelte';
	import {
		stageFromXp,
		stageProgress,
		deriveRoomMood,
		STAGE_NAMES,
		STAGE_UNLOCKS,
		STAGE_THRESHOLDS,
		MAX_STAGE
	} from '$lib/room/room-stage';
	import { BADGES, badgeProgress } from '$lib/utils/badges';
	import { longestStreak, XP_PER_HABIT, XP_STACK_BONUS } from '$lib/utils/gamification';

	const app = getAppState();

	// Local hour drives the night/day mood.
	let hour = $state(new Date().getHours());

	onMount(() => {
		const timer = setInterval(() => (hour = new Date().getHours()), 60_000);
		return () => clearInterval(timer);
	});

	const xp = $derived(app.profile?.xp ?? 0);
	const stage = $derived(stageFromXp(xp));
	const bar = $derived(stageProgress(xp));
	const lastCompletion = $derived(app.completions.reduce<string | null>((max, c) => (!max || c.completed_at > max ? c.completed_at : max), null));
	const mood = $derived(deriveRoomMood(hour, lastCompletion, app.today));

	const unlocked = $derived(new Map(app.achievements.map((a) => [a.badge_key, a.unlocked_at])));
	const badgeStats = $derived({
		longestStreak: Math.max(app.profile?.longest_streak ?? 0, longestStreak(app.completions.map((c) => c.completed_at))),
		totalCompletions: app.profile?.total_completions ?? 0,
		level: app.profile?.level ?? 0,
		stackCount: app.stacks.length
	});
	const sortedBadges = $derived([...BADGES].sort((a, b) => Number(unlocked.has(b.key)) - Number(unlocked.has(a.key))));

	let openBadge = $state<BadgeDefinition | null>(null);
	let showBadge = $state(false);
	function viewBadge(b: BadgeDefinition) {
		openBadge = b;
		showBadge = true;
	}
	const openProgress = $derived(openBadge ? badgeProgress(openBadge.key, badgeStats) : null);
</script>

<svelte:head><title>Room · Stackr</title></svelte:head>

<PageHeader title="Your Room" eyebrow="Stage {stage} of {MAX_STAGE} · {STAGE_NAMES[stage - 1]}" />

<div class="mx-auto max-w-[min(100%,56dvh)]">
	<LofiRoom {stage} {mood} />
</div>
<p class="mt-2 text-center text-xs text-slate-500">
	{mood.sleepy ? 'Your room is sleepy — check off a habit to wake it up.' : 'Tap anything in your room.'}
</p>

<!-- Next unlock -->
<section class="card mt-5 p-4" data-test="stage-progress">
	{#if bar.nextAt !== null}
		<div class="flex items-start justify-between gap-3">
			<div class="min-w-0">
				<p class="text-[13px] font-medium text-violet-300">Next: Stage {stage + 1} · {STAGE_NAMES[stage]}</p>
				<p class="mt-0.5 text-[15px] text-white">{STAGE_UNLOCKS[stage]}</p>
			</div>
			<span class="shrink-0 rounded-full bg-violet-500/15 px-2.5 py-1 text-xs font-semibold text-violet-200 tabular-nums">
				{(bar.nextAt - xp).toLocaleString()} XP
			</span>
		</div>
		<div class="mt-3 h-2 overflow-hidden rounded-full bg-violet-950/80">
			<div class="h-full rounded-full bg-gradient-to-r from-amber-400 to-violet-500 transition-[width] duration-500" style:width="{bar.percent}%"></div>
		</div>
	{:else}
		<p class="text-[15px] font-semibold text-white">Your room is complete ✨</p>
		<p class="mt-0.5 text-[13px] text-slate-400">Every piece is unlocked. Keep stacking for levels and badges.</p>
	{/if}
	<p class="mt-3 text-xs text-slate-500" data-test="room-stats">
		⭐ {xp.toLocaleString()} XP · +{XP_PER_HABIT} per habit, +{XP_STACK_BONUS} for a full stack, bonus for streaks
	</p>
</section>

<!-- Badges -->
<div id="badges" class="mt-7 mb-2 flex items-baseline justify-between px-1">
	<h2 class="section-title mb-0">Badges</h2>
	<span class="text-[13px] text-slate-500">{unlocked.size} of {BADGES.length}</span>
</div>
<div class="card grid grid-cols-4 gap-y-4 p-4">
	{#each sortedBadges as badge (badge.key)}
		{@const has = unlocked.has(badge.key)}
		<button type="button" onclick={() => viewBadge(badge)} class="pressable flex flex-col items-center gap-1.5">
			<span
				class="relative grid size-14 place-items-center rounded-2xl text-2xl {has
					? 'bg-gradient-to-br from-amber-400/25 to-violet-500/25 ring-1 ring-amber-300/30'
					: 'bg-slate-800/70 grayscale'}"
			>
				<span class={has ? '' : 'opacity-30'}>{badge.icon}</span>
				{#if !has}
					<Icon name="lock" class="absolute -right-1 -bottom-1 size-5 rounded-full bg-slate-900 p-0.5 text-slate-500" strokeWidth={2} />
				{/if}
			</span>
			<span class="line-clamp-2 text-center text-[11px] leading-tight {has ? 'text-slate-200' : 'text-slate-500'}">{badge.name}</span>
		</button>
	{/each}
</div>

<!-- Stage track -->
<h2 class="section-title mt-7">Room stages</h2>
<ol class="card divide-y divide-white/5 overflow-hidden">
	{#each STAGE_NAMES as name, i (name)}
		{@const reached = stage > i}
		<li class="flex items-center gap-3 px-4 py-3">
			<span
				class="grid size-7 shrink-0 place-items-center rounded-full text-xs font-bold {reached
					? 'bg-violet-500 text-white'
					: 'bg-slate-800 text-slate-500'}"
			>
				{#if reached}<Icon name="check" class="size-4" strokeWidth={3} />{:else}{i + 1}{/if}
			</span>
			<span class="min-w-0 flex-1">
				<span class="block text-[15px] {reached ? 'text-white' : 'text-slate-400'}">{name}</span>
				<span class="block truncate text-xs text-slate-500">{STAGE_UNLOCKS[i]}</span>
			</span>
			<span class="shrink-0 text-xs text-slate-500 tabular-nums">{STAGE_THRESHOLDS[i].toLocaleString()} XP</span>
		</li>
	{/each}
</ol>

<Sheet bind:open={showBadge}>
	{#if openBadge}
		{@const date = unlocked.get(openBadge.key)}
		<div class="flex flex-col items-center pb-2 text-center">
			<span
				class="grid size-24 place-items-center rounded-[1.75rem] text-5xl {date
					? 'bg-gradient-to-br from-amber-400/25 to-violet-500/25 ring-1 ring-amber-300/30'
					: 'bg-slate-800 grayscale'}"
			>
				<span class={date ? '' : 'opacity-40'}>{openBadge.icon}</span>
			</span>
			<h3 class="mt-4 text-xl font-bold text-white">{openBadge.name}</h3>
			<p class="mt-1 text-[15px] text-slate-400">{openBadge.description}</p>
			{#if date}
				<p class="mt-4 rounded-full bg-emerald-500/15 px-3 py-1 text-[13px] font-medium text-emerald-300">
					Unlocked {new Date(date).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}
				</p>
			{:else if openProgress}
				<div class="mt-5 w-full max-w-xs">
					<div class="h-2 overflow-hidden rounded-full bg-slate-800">
						<div class="h-full rounded-full bg-indigo-500" style:width="{(openProgress.current / openProgress.target) * 100}%"></div>
					</div>
					<p class="mt-2 text-[13px] text-slate-400 tabular-nums">{openProgress.current} / {openProgress.target}</p>
				</div>
			{:else}
				<p class="mt-4 text-[13px] text-slate-500">Not unlocked yet</p>
			{/if}
		</div>
	{/if}
</Sheet>
