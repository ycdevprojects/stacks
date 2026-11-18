<script lang="ts">
	import type { BadgeDefinition } from '$lib/types';
	import { onMount } from 'svelte';
	import { getAppState, setRoomStyle } from '$lib/stores/app.svelte';
	import { ROOM_PLACEMENTS, DECOR_ORDER, isVisible, type RoomContext, type RoomPlacement } from '$lib/room/layout';
	import { kindOf, spriteFor } from '$lib/room/catalog';
	import { haptic } from '$lib/utils/helpers';
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
	import { overallExcuse } from '$lib/utils/schedule';
	import { longestStreak, xpForLevel, XP_PER_HABIT, XP_STACK_BONUS } from '$lib/utils/gamification';

	const app = getAppState();

	// Local hour drives the night/day mood; the month picks the seasonal piece.
	let clock = $state(new Date());
	const hour = $derived(clock.getHours());

	onMount(() => {
		const timer = setInterval(() => (clock = new Date()), 60_000);
		return () => clearInterval(timer);
	});

	const xp = $derived(app.profile?.xp ?? 0);
	const stage = $derived(stageFromXp(xp));
	const bar = $derived(stageProgress(xp));
	// Rest days count as activity, so resting doesn't make the room sleepy.
	const lastCompletion = $derived(
		[...app.completions.map((c) => c.completed_at), ...app.restDays.filter((d) => d <= app.today)].reduce<string | null>(
			(max, d) => (!max || d > max ? d : max),
			null
		)
	);
	const mood = $derived(deriveRoomMood(hour, lastCompletion, app.today));

	const unlocked = $derived(new Map(app.achievements.map((a) => [a.badge_key, a.unlocked_at])));
	const badgeStats = $derived({
		longestStreak: Math.max(app.profile?.longest_streak ?? 0, longestStreak(app.completions.map((c) => c.completed_at), overallExcuse(app.habits, app.restDays))),
		totalCompletions: app.profile?.total_completions ?? 0,
		level: app.profile?.level ?? 0,
		stackCount: app.stacks.length
	});
	const level = $derived(app.profile?.level ?? 0);
	const ctx = $derived<RoomContext>({
		stage,
		level,
		month: clock.getMonth(),
		bestStreak: badgeStats.longestStreak,
		styles: app.profile?.room_styles ?? {}
	});

	// ---- Decor after the room is complete ----
	const nextDecor = $derived(DECOR_ORDER.find((p) => (p.level ?? 0) > level) ?? null);
	const decorBar = $derived.by(() => {
		if (!nextDecor) return null;
		const from = xpForLevel(level);
		const to = xpForLevel(nextDecor.level ?? 0);
		return { left: to - xp, percent: Math.max(0, Math.min(100, Math.floor(((xp - from) / (to - from)) * 100))) };
	});

	// ---- Collection: decor, trophies, seasonal ----
	const collection = $derived(
		ROOM_PLACEMENTS.filter((p) => p.level !== undefined || p.streak !== undefined || p.months !== undefined)
			.filter((p) => p.kindId !== 'trophy-shelf')
			.map((p) => ({ p, kind: kindOf(p.kindId), has: isVisible(p, ctx) }))
	);
	function unlockText(p: RoomPlacement): string {
		if (p.level) return `Level ${p.level}`;
		if (p.streak) return `${p.streak}-day`;
		if (p.months) {
			const name = (m: number) => new Date(2026, m, 1).toLocaleDateString(undefined, { month: 'short' });
			const first = p.months[0];
			const last = p.months[p.months.length - 1];
			return first === last ? name(first) : `${name(first)}–${name(last)}`;
		}
		return '';
	}
	const collected = $derived(collection.filter((c) => c.has && !c.p.months).length);
	const collectible = $derived(collection.filter((c) => !c.p.months).length);

	// ---- Styles ----
	const styleable = $derived(ROOM_PLACEMENTS.filter((p) => kindOf(p.kindId).variants && isVisible(p, ctx)));
	const unstyled = $derived(styleable.filter((p) => !app.profile?.room_styles?.[p.id]));
	let styleTarget = $state<RoomPlacement | null>(null);
	let showStyle = $state(false);
	function openStyle(id: string) {
		styleTarget = ROOM_PLACEMENTS.find((p) => p.id === id) ?? null;
		showStyle = !!styleTarget;
	}
	async function pickStyle(variant: string) {
		if (!styleTarget) return;
		haptic(8);
		await setRoomStyle(styleTarget.id, variant);
		const next = unstyled.find((p) => p.id !== styleTarget!.id);
		showStyle = false;
		// Walk through the remaining unpicked pieces one at a time.
		if (next && pickingAll) setTimeout(() => openStyle(next.id), 350);
		else pickingAll = false;
	}
	let pickingAll = false;
	function pickAll() {
		pickingAll = true;
		if (unstyled[0]) openStyle(unstyled[0].id);
	}

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
	<LofiRoom {ctx} {mood} onstyle={openStyle} />
</div>
<p class="mt-2 text-center text-xs text-slate-500">
	{mood.sleepy
		? 'Your room is sleepy — check off a habit to wake it up.'
		: mood.period === 'night'
			? 'Your roommate is asleep until 6 AM. 🌙 Tap anything in your room.'
			: 'Tap anything in your room — or your roommate.'}
</p>

{#if unstyled.length > 0}
	<button type="button" onclick={pickAll} class="card pressable mt-4 flex w-full items-center gap-3 p-4 text-left" data-test="pick-styles">
		<span class="grid size-10 shrink-0 place-items-center rounded-xl bg-fuchsia-500/15 text-xl">🎨</span>
		<span class="min-w-0 flex-1">
			<span class="block text-[15px] font-semibold text-white">Make it yours</span>
			<span class="block truncate text-[13px] text-slate-400">
				Pick colors for your {unstyled.map((p) => kindOf(p.kindId).label.toLowerCase()).join(', ')}
			</span>
		</span>
		<Icon name="chevron-right" class="size-4 shrink-0 text-slate-600" strokeWidth={2.5} />
	</button>
{/if}

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
	{:else if nextDecor && decorBar}
		{@const kind = kindOf(nextDecor.kindId)}
		<div class="flex items-start justify-between gap-3">
			<div class="flex min-w-0 items-center gap-3">
				<span class="grid size-11 shrink-0 place-items-center rounded-xl bg-slate-800/80">
					<img src={kind.sprite} alt="" class="max-h-7 max-w-7 opacity-30 brightness-0 invert [image-rendering:pixelated]" />
				</span>
				<div class="min-w-0">
					<p class="text-[13px] font-medium text-violet-300">Next decoration · Level {nextDecor.level}</p>
					<p class="mt-0.5 text-[15px] text-white">A surprise for your room</p>
				</div>
			</div>
			<span class="shrink-0 rounded-full bg-violet-500/15 px-2.5 py-1 text-xs font-semibold text-violet-200 tabular-nums">
				{decorBar.left.toLocaleString()} XP
			</span>
		</div>
		<div class="mt-3 h-2 overflow-hidden rounded-full bg-violet-950/80">
			<div class="h-full rounded-full bg-gradient-to-r from-amber-400 to-violet-500 transition-[width] duration-500" style:width="{decorBar.percent}%"></div>
		</div>
	{:else}
		<p class="text-[15px] font-semibold text-white">Your room is complete ✨</p>
		<p class="mt-0.5 text-[13px] text-slate-400">Every piece and decoration is unlocked. Keep your streak going for trophies.</p>
	{/if}
	<p class="mt-3 text-xs text-slate-500" data-test="room-stats">
		⭐ {xp.toLocaleString()} XP · +{XP_PER_HABIT} per habit, +{XP_STACK_BONUS} for a full stack, bonus for streaks
	</p>
</section>

<!-- Collection -->
<div class="mt-7 mb-2 flex items-baseline justify-between px-1">
	<h2 class="section-title mb-0">Collection</h2>
	<span class="text-[13px] text-slate-500">{collected} of {collectible}</span>
</div>
<div class="card grid grid-cols-4 gap-y-4 p-4" data-test="collection">
	{#each collection as { p, kind, has } (p.id)}
		<div class="flex flex-col items-center gap-1.5" title={kind.label}>
			<span class="grid size-14 place-items-center rounded-2xl {has ? 'bg-slate-800' : 'bg-slate-800/50'}">
				<img
					src={spriteFor(kind, app.profile?.room_styles?.[p.id])}
					alt=""
					class="max-h-9 max-w-9 [image-rendering:pixelated] {has ? '' : 'opacity-25 brightness-0 invert'}"
					style:width="{Math.min(36, kind.spritePx.w * 2.5)}px"
				/>
			</span>
			<span class="line-clamp-1 text-center text-[11px] leading-tight {has ? 'text-slate-200' : 'text-slate-500'}">
				{has ? kind.label : unlockText(p)}
			</span>
		</div>
	{/each}
</div>
<p class="mt-2 px-1 text-[11px] text-slate-600">A new decoration every level after the room is complete; trophies for 7, 30 and 100-day streaks; and a seasonal visitor every month.</p>

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

<Sheet bind:open={showStyle} title={styleTarget ? `Style your ${kindOf(styleTarget.kindId).label.toLowerCase()}` : 'Style'}>
	{#if styleTarget}
		{@const kind = kindOf(styleTarget.kindId)}
		{@const current = app.profile?.room_styles?.[styleTarget.id] ?? kind.variants?.[0].id}
		<div class="grid grid-cols-3 gap-3 pb-2" data-test="style-options">
			{#each kind.variants ?? [] as v (v.id)}
				<button
					type="button"
					onclick={() => pickStyle(v.id)}
					aria-pressed={current === v.id}
					class="pressable flex flex-col items-center gap-2 rounded-2xl p-3 {current === v.id
						? 'bg-slate-700 ring-2 ring-indigo-400'
						: 'bg-slate-800'}"
				>
					<span class="grid h-20 w-full place-items-center rounded-xl bg-[#b4a78c]">
						<img src={v.sprite} alt="" class="max-h-16 max-w-[80%] [image-rendering:pixelated]" style:width="{kind.spritePx.w * 3}px" />
					</span>
					<span class="flex items-center gap-1.5 text-[13px] font-medium text-white">
						<span class="size-2.5 rounded-full" style:background={v.swatch}></span>{v.label}
					</span>
				</button>
			{/each}
		</div>
	{/if}
</Sheet>

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
