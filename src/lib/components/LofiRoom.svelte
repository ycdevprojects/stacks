<script lang="ts">
	// Lofi room hero — one cozy pixel-art room built from 16px CC0 tiles.
	// Furniture reveals by stage; the next stage's pieces show as silhouettes.
	// Tap any piece to see what it is. Mood (night/day + sleepy) is pure CSS.
	import { ROOM_ITEMS, ROOM_GRID, TILE_URLS, LAMP_SPOT, WINDOW_SPOT, type RoomItem } from '$lib/room/layout';
	import { kindOf } from '$lib/room/catalog';
	import { STAGE_NAMES, STAGE_THRESHOLDS, MAX_STAGE, type RoomMood } from '$lib/room/room-stage';
	import { haptic } from '$lib/utils/helpers';

	let { stage, mood }: { stage: number; mood: RoomMood } = $props();

	const { cols, rows } = ROOM_GRID;

	const visibleAt = (item: RoomItem, s: number) =>
		item.source === 'user' || (s >= (item.stage ?? 1) && (item.until === undefined || s < item.until));

	const visible = $derived(ROOM_ITEMS.filter((item) => visibleAt(item, stage)));
	const upcoming = $derived(
		stage < MAX_STAGE ? ROOM_ITEMS.filter((item) => item.stage === stage + 1 && visibleAt(item, stage + 1)) : []
	);

	// Pop in the pieces a stage-up just revealed (not on first render).
	let fresh = $state(new Set<string>());
	let lastStage: number | null = null;
	$effect(() => {
		const s = stage;
		if (lastStage !== null && s > lastStage) {
			fresh = new Set(ROOM_ITEMS.filter((i) => i.stage === s).map((i) => i.id));
			setTimeout(() => (fresh = new Set()), 1600);
		}
		lastStage = s;
	});

	// Tapped piece label.
	let selected = $state<{ id: string; title: string; detail: string; x: number; y: number } | null>(null);
	let hideTimer: ReturnType<typeof setTimeout> | undefined;

	function select(item: RoomItem, locked: boolean) {
		haptic(5);
		clearTimeout(hideTimer);
		if (selected?.id === item.id) {
			selected = null;
			return;
		}
		const s = item.stage ?? 1;
		selected = {
			id: item.id,
			title: locked ? '???' : kindOf(item.kindId).label,
			detail: locked ? `Unlocks at ${STAGE_THRESHOLDS[s - 1].toLocaleString()} XP` : `${STAGE_NAMES[s - 1]} reward`,
			x: item.x + item.w / 2,
			y: item.y
		};
		hideTimer = setTimeout(() => (selected = null), 2800);
	}

	const isNight = $derived(mood.period === 'night');
	const hasStringLights = $derived(stage >= 6);

	const pct = (v: number, of: number) => `${((v / of) * 100).toFixed(4)}%`;
	const pctX = (x: number) => pct(x, cols);
	const pctY = (y: number) => pct(y, rows);

	// Sleepy z's float over whichever bed is out.
	const bed = $derived(visible.find((i) => i.kindId === 'bed') ?? visible.find((i) => i.kindId === 'floorbed'));
</script>

<section
	class="lofi-room relative w-full overflow-hidden rounded-3xl ring-1 ring-violet-400/15 shadow-2xl shadow-violet-950/40"
	aria-label={`Your room, stage ${stage} of ${MAX_STAGE}: ${STAGE_NAMES[stage - 1]}`}
	data-test="lofi-room-hero"
	style="--wall-tile: url({TILE_URLS.wall}); --wall-base-tile: url({TILE_URLS.wallBase}); --floor-tile: url({TILE_URLS.floor});"
>
	<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
	<div class="lofi-scene relative aspect-square w-full" onclick={(e) => e.target === e.currentTarget && (selected = null)}>
		<div class="lofi-wall" aria-hidden="true"></div>
		<div class="lofi-wall-base" aria-hidden="true"></div>
		<div class="lofi-floor" aria-hidden="true"></div>

		{#each upcoming as item (item.id)}
			<button
				type="button"
				class="lofi-item lofi-locked"
				style:left={pctX(item.x)}
				style:top={pctY(item.y)}
				style:width={pctX(item.w)}
				onclick={() => select(item, true)}
				aria-label="Locked item, unlocks at stage {item.stage}"
			>
				<img src={item.src} alt="" draggable="false" />
			</button>
		{/each}

		<!-- array order = painter order -->
		{#each visible as item (item.id)}
			<button
				type="button"
				class="lofi-item"
				class:lofi-fresh={fresh.has(item.id)}
				class:lofi-pet={item.kindId === 'pet'}
				class:lofi-selected={selected?.id === item.id}
				data-test={`lofi-item-${item.id}`}
				style:left={pctX(item.x)}
				style:top={pctY(item.y)}
				style:width={pctX(item.w)}
				onclick={() => select(item, false)}
				aria-label={item.alt}
			>
				<img src={item.src} alt="" draggable="false" />
			</button>
		{/each}

		{#if hasStringLights}
			<div class="lofi-string" aria-hidden="true"></div>
			<div class="lofi-string lofi-string-blur" aria-hidden="true"></div>
		{/if}

		<div
			class="lofi-glow {mood.sleepy ? 'lofi-glow-dim' : isNight ? 'lofi-glow-night' : 'lofi-glow-day'}"
			style="--lamp-x: {pctX(LAMP_SPOT.x)}; --lamp-y: {pctY(LAMP_SPOT.y)};"
			aria-hidden="true"
		></div>

		{#if isNight}
			{#each ['a', 'b'] as layer (layer)}
				<div
					class="lofi-rain lofi-rain-{layer}"
					style:left={pctX(WINDOW_SPOT.x + 0.15)}
					style:top={pctY(WINDOW_SPOT.y + 0.15)}
					style:width={pctX(WINDOW_SPOT.w - 0.3)}
					style:height={pctY(WINDOW_SPOT.h - 0.275)}
					aria-hidden="true"
				></div>
			{/each}
			<div class="lofi-grain" aria-hidden="true"></div>
		{/if}

		<div class="lofi-tint {isNight ? 'lofi-tint-night' : 'lofi-tint-day'}" aria-hidden="true"></div>
		{#if mood.sleepy}
			<div class="lofi-sleepy" aria-hidden="true"></div>
			{#if bed}
				<div class="lofi-zzz" style:left={pctX(bed.x + bed.w * 0.6)} style:top={pctY(bed.y - 0.2)} aria-hidden="true">
					<span>z</span><span>z</span><span>Z</span>
				</div>
			{/if}
		{/if}

		{#if selected}
			<div
				class="lofi-tip"
				class:lofi-tip-below={selected.y < 2}
				style:left="clamp(18%, {pctX(selected.x)}, 82%)"
				style:top={selected.y < 2 ? pctY(selected.y + 1.6) : pctY(selected.y)}
				role="status"
			>
				<span class="block font-semibold">{selected.title}</span>
				<span class="block text-[11px] opacity-75">{selected.detail}</span>
			</div>
		{/if}
	</div>
</section>

<style>
	.lofi-scene {
		image-rendering: pixelated;
		background: #b4a78c;
	}
	.lofi-wall,
	.lofi-wall-base,
	.lofi-floor {
		position: absolute;
		left: 0;
		width: 100%;
		image-rendering: pixelated;
		pointer-events: none;
	}
	/* wall body + baseboard fill the 1.5-row wall band; floor fills the rest */
	.lofi-wall {
		top: 0;
		height: 10%;
		background-image: var(--wall-tile);
		background-size: 10% 100%;
	}
	.lofi-wall-base {
		top: 10%;
		height: 5%;
		background-image: var(--wall-base-tile);
		background-size: 10% 100%;
	}
	.lofi-floor {
		top: 15%;
		height: 85%;
		background-image: var(--floor-tile);
		background-size: 10% 11.7647%;
	}
	.lofi-item {
		position: absolute;
		display: block;
		padding: 0;
		border: 0;
		background: none;
		-webkit-tap-highlight-color: transparent;
	}
	.lofi-item img {
		display: block;
		width: 100%;
		height: auto;
		image-rendering: pixelated;
		pointer-events: none;
		user-select: none;
	}
	.lofi-item:focus-visible {
		outline: 2px solid #c4b5fd;
		outline-offset: 2px;
	}
	.lofi-selected img {
		filter: drop-shadow(0 0 2px #fff) drop-shadow(0 0 1px #fff);
	}
	.lofi-locked img {
		filter: brightness(0);
		opacity: 0.16;
	}
	.lofi-fresh {
		animation: lofi-pop 0.7s cubic-bezier(0.34, 1.56, 0.64, 1) both;
	}
	@keyframes lofi-pop {
		0% {
			transform: translateY(-30%) scale(0.4);
			opacity: 0;
		}
		60% {
			opacity: 1;
		}
		100% {
			transform: none;
		}
	}
	.lofi-pet img {
		animation: lofi-breathe 2.4s steps(2, end) infinite;
		transform-origin: 50% 100%;
	}
	@keyframes lofi-breathe {
		50% {
			transform: scaleY(0.94);
		}
	}
	.lofi-glow {
		position: absolute;
		inset: 0;
		pointer-events: none;
		mix-blend-mode: screen;
		background: radial-gradient(
			circle at var(--lamp-x, 90%) var(--lamp-y, 45%),
			rgba(255, 176, 86, 0.55) 0%,
			rgba(255, 156, 64, 0.22) 18%,
			rgba(255, 140, 60, 0.08) 34%,
			transparent 58%
		);
	}
	.lofi-glow-night {
		opacity: 0.9;
	}
	.lofi-glow-day {
		opacity: 0.28;
	}
	.lofi-glow-dim {
		opacity: 0.4;
	}
	.lofi-rain {
		position: absolute;
		pointer-events: none;
		overflow: hidden;
	}
	.lofi-rain-a {
		background-image: linear-gradient(
			180deg,
			transparent 0%,
			transparent 42%,
			rgba(196, 212, 238, 0.55) 42%,
			rgba(196, 212, 238, 0.55) 58%,
			transparent 58%
		);
		background-size: 6px 18px;
		animation: lofi-rain-fall-a 0.66s steps(2, end) infinite;
	}
	.lofi-rain-b {
		background-image: linear-gradient(
			180deg,
			transparent 0%,
			transparent 20%,
			rgba(196, 212, 238, 0.32) 20%,
			rgba(196, 212, 238, 0.32) 40%,
			transparent 40%
		);
		background-size: 9px 26px;
		animation: lofi-rain-fall-b 1.06s steps(3, end) infinite;
	}
	@keyframes lofi-rain-fall-a {
		to {
			background-position: 0 18px;
		}
	}
	@keyframes lofi-rain-fall-b {
		to {
			background-position: 0 26px;
		}
	}
	.lofi-grain {
		position: absolute;
		inset: 0;
		pointer-events: none;
		mix-blend-mode: overlay;
		opacity: 0.09;
		background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.55'/%3E%3C/svg%3E");
	}
	.lofi-string {
		position: absolute;
		left: 3%;
		right: 3%;
		top: 4.5%;
		height: 0.4rem;
		pointer-events: none;
		background-image: radial-gradient(circle, rgba(255, 206, 122, 0.95) 0 1px, rgba(255, 206, 122, 0) 1.6px);
		background-size: 1.1rem 0.4rem;
		background-repeat: repeat-x;
	}
	.lofi-string-blur {
		filter: blur(2.5px);
		opacity: 0.85;
	}
	.lofi-tint {
		position: absolute;
		inset: 0;
		pointer-events: none;
		mix-blend-mode: multiply;
	}
	.lofi-tint-night {
		background: linear-gradient(
			180deg,
			rgba(58, 36, 88, 0.5) 0%,
			rgba(66, 40, 96, 0.38) 34%,
			rgba(52, 30, 76, 0.3) 60%,
			rgba(30, 18, 50, 0.4) 100%
		);
	}
	.lofi-tint-day {
		mix-blend-mode: soft-light;
		background: linear-gradient(180deg, rgba(255, 216, 150, 0.5) 0%, rgba(255, 200, 130, 0.22) 60%);
	}
	.lofi-sleepy {
		position: absolute;
		inset: 0;
		pointer-events: none;
		background: radial-gradient(ellipse at 50% 46%, rgba(44, 26, 72, 0.18) 0%, rgba(24, 14, 44, 0.55) 100%);
	}
	.lofi-zzz {
		position: absolute;
		pointer-events: none;
		font: 700 0.85rem/1 ui-monospace, monospace;
		color: #e9e3ff;
		text-shadow: 0 1px 0 #3b2a63;
	}
	.lofi-zzz span {
		position: absolute;
		opacity: 0;
		animation: lofi-z 3s ease-in infinite;
	}
	.lofi-zzz span:nth-child(2) {
		animation-delay: 1s;
		font-size: 1.05em;
	}
	.lofi-zzz span:nth-child(3) {
		animation-delay: 2s;
		font-size: 1.25em;
	}
	@keyframes lofi-z {
		0% {
			transform: translate(0, 0);
			opacity: 0;
		}
		20% {
			opacity: 1;
		}
		100% {
			transform: translate(0.9rem, -1.6rem);
			opacity: 0;
		}
	}
	.lofi-tip {
		position: absolute;
		z-index: 2;
		transform: translate(-50%, calc(-100% - 6px));
		white-space: nowrap;
		padding: 0.35rem 0.65rem;
		border-radius: 0.75rem;
		background: rgba(15, 12, 30, 0.88);
		color: #fff;
		font-size: 0.8rem;
		line-height: 1.2;
		text-align: center;
		box-shadow: 0 6px 20px rgba(0, 0, 0, 0.35);
		backdrop-filter: blur(6px);
		pointer-events: none;
		image-rendering: auto;
		animation: lofi-tip-in 0.18s ease-out;
	}
	.lofi-tip-below {
		transform: translate(-50%, 6px);
	}
	@keyframes lofi-tip-in {
		from {
			opacity: 0;
		}
	}
</style>
