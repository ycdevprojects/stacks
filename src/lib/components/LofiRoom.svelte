<script lang="ts">
	// Lofi room hero — one cozy pixel-art room built from 16px CC0 tiles plus original decor.
	// Furniture reveals by stage, decor by level, trophies by best streak, and a
	// seasonal piece by month. The next unlock shows as a silhouette. Tap any piece
	// to see what it is (and restyle it); tap the resident to say hi.
	import {
		ROOM_ITEMS,
		ROOM_GRID,
		TILE_URLS,
		LAMP_SPOT,
		WINDOW_SPOTS,
		DECOR_ORDER,
		isVisible,
		visibleItems,
		type RoomItem,
		type RoomContext
	} from '$lib/room/layout';
	import { kindOf } from '$lib/room/catalog';
	import { characterState } from '$lib/room/character';
	import { STAGE_NAMES, STAGE_THRESHOLDS, MAX_STAGE, type RoomMood } from '$lib/room/room-stage';
	import { haptic } from '$lib/utils/helpers';
	import characterUrl from '$lib/assets/room/character.png';
	import catSitA from '$lib/assets/room/decor/cat-sit-a.png';
	import catSitB from '$lib/assets/room/decor/cat-sit-b.png';

	let {
		ctx,
		mood,
		onstyle
	}: {
		ctx: RoomContext;
		mood: RoomMood;
		/** Called with a placement id when the player taps "Change style". */
		onstyle?: (placementId: string) => void;
	} = $props();

	const { cols, rows } = ROOM_GRID;

	const visible = $derived(visibleItems(ctx));

	// The next unlock as a silhouette: the next stage's pieces, then the next level decor.
	const nextDecor = $derived(DECOR_ORDER.find((p) => (p.level ?? 0) > ctx.level));
	const upcoming = $derived.by(() => {
		if (ctx.stage < MAX_STAGE) {
			const next = { ...ctx, stage: ctx.stage + 1 };
			return ROOM_ITEMS.filter((i) => i.stage === next.stage && i.level === undefined && isVisible(i, next));
		}
		return nextDecor ? ROOM_ITEMS.filter((i) => i.id === nextDecor.id) : [];
	});

	// Pop in pieces that appear while the room is on screen (not on first render).
	let fresh = $state(new Set<string>());
	let seen: Set<string> | null = null;
	$effect(() => {
		const ids = new Set(visible.map((i) => i.id));
		if (seen) {
			const added = [...ids].filter((id) => !seen!.has(id));
			if (added.length) {
				fresh = new Set(added);
				setTimeout(() => (fresh = new Set()), 1600);
			}
		}
		seen = ids;
	});

	// ---- Tapped piece label ----
	interface Tip {
		id: string;
		title: string;
		detail: string;
		x: number;
		y: number;
		styleable?: boolean;
		/** Show under the piece (animals: keeps the heart above them visible). */
		below?: boolean;
	}
	let selected = $state<Tip | null>(null);
	let hideTimer: ReturnType<typeof setTimeout> | undefined;

	function show(tip: Tip, ms = 2800) {
		haptic(5);
		clearTimeout(hideTimer);
		if (selected?.id === tip.id) {
			selected = null;
			return;
		}
		selected = tip;
		hideTimer = setTimeout(() => (selected = null), ms);
	}

	function rewardOf(item: RoomItem): string {
		if (item.streak) return `${item.streak}-day streak trophy`;
		if (item.months) return 'Seasonal visitor';
		if (item.level) return `Level ${item.level} reward`;
		return `${STAGE_NAMES[(item.stage ?? 1) - 1]} reward`;
	}

	function select(item: RoomItem, locked: boolean) {
		const kind = kindOf(item.kindId);
		const at = { x: item.x + item.w / 2, y: item.y };
		if (locked) {
			const s = item.stage ?? 1;
			const detail = item.level ? `Unlocks at level ${item.level}` : `Unlocks at ${STAGE_THRESHOLDS[s - 1].toLocaleString()} XP`;
			show({ id: item.id, title: '???', detail, ...at });
			return;
		}
		const styleable = !!kind.variants && !!onstyle;
		if (ANIMALS.has(item.kindId)) {
			// Keep the label clear of the heart floating up: under the animal, or (near the
			// bottom of the room, where it would be clipped) above with a gap.
			const fitsBelow = item.y + item.h + 1.1 < ROOM_GRID.rows;
			const y = fitsBelow ? item.y + item.h + 0.1 : item.y - 0.75;
			show({ id: item.id, title: kind.label, detail: rewardOf(item), x: at.x, y, below: fitsBelow });
			pet(item.id);
			return;
		}
		show({ id: item.id, title: kind.label, detail: rewardOf(item), styleable, ...at }, styleable ? 4000 : 2800);
	}

	// ---- Animals ----
	const ANIMALS = new Set(['pet', 'cat']);
	// They rest at night and when the room is sleepy.
	const animalsAsleep = $derived(mood.period === 'night' || mood.sleepy);
	// Tapping an animal makes it hop and float a heart.
	let petted = $state<{ id: string; n: number } | null>(null);
	let petTimer: ReturnType<typeof setTimeout> | undefined;
	function pet(id: string) {
		clearTimeout(petTimer);
		petted = { id, n: (petted?.n ?? 0) + 1 };
		petTimer = setTimeout(() => (petted = null), 900);
	}

	function openStyle() {
		// Read the id before clearing the tip: everything derived from `selected` goes null with it.
		const id = selected?.id;
		clearTimeout(hideTimer);
		selected = null;
		if (id) onstyle?.(id);
	}

	// ---- Lighting ----
	const isNight = $derived(mood.period === 'night');
	const isWinter = $derived([11, 0, 1].includes(ctx.month));
	const isAutumn = $derived([9, 10].includes(ctx.month));
	const hasStringLights = $derived(ctx.stage >= 6);
	const lamps = $derived([
		{ id: 'lamp', x: LAMP_SPOT.x, y: LAMP_SPOT.y, size: 1 },
		...visible
			.filter((i) => i.kindId === 'table-lamp' || i.kindId === 'floor-lamp')
			.map((i) => ({ id: i.id, x: i.x + i.w / 2, y: i.y + i.h * 0.2, size: 0.6 }))
	]);

	// The glass inside the 16px window sprite: columns 2-13, rows 1-13.
	const PANE = { x: 2 / 16, y: 1 / 16, w: 12 / 16, h: 13 / 16 };

	const pct = (v: number, of: number) => `${((v / of) * 100).toFixed(4)}%`;
	const pctX = (x: number) => pct(x, cols);
	const pctY = (y: number) => pct(y, rows);

	// ---- Resident ----
	let now = $state(new Date());
	$effect(() => {
		const timer = setInterval(() => (now = new Date()), 2000);
		return () => clearInterval(timer);
	});
	const resident = $derived(characterState(visible, mood, now));
	let hop = $state(false);
	function poke() {
		hop = false;
		requestAnimationFrame(() => (hop = true));
		show({ id: 'resident', title: 'Your roommate', detail: resident.activity, x: resident.x + 0.5, y: resident.y }, 2200);
	}
</script>

<section
	class="lofi-room relative w-full overflow-hidden rounded-3xl ring-1 ring-violet-400/15 shadow-2xl shadow-violet-950/40"
	aria-label={`Your room, stage ${ctx.stage} of ${MAX_STAGE}: ${STAGE_NAMES[ctx.stage - 1]}`}
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
				aria-label={item.level ? `Locked item, unlocks at level ${item.level}` : `Locked item, unlocks at stage ${item.stage}`}
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
				class:lofi-animal={ANIMALS.has(item.kindId)}
				class:lofi-petted={petted?.id === item.id}
				class:lofi-selected={selected?.id === item.id}
				data-test={`lofi-item-${item.id}`}
				style:left={pctX(item.x)}
				style:top={pctY(item.y)}
				style:width={pctX(item.w)}
				onclick={() => select(item, false)}
				aria-label={item.alt}
			>
				{#if item.kindId === 'pet'}
					<!-- Wanders across the rug and back; the face turns toward where it's going. -->
					<span class="lofi-wander" class:lofi-rest={animalsAsleep}>
						<span class="lofi-face">
							<img class="lofi-breathe" src={item.src} alt="" draggable="false" />
						</span>
						{#if petted?.id === item.id}
							{#key petted.n}<span class="lofi-heart" aria-hidden="true">♥</span>{/key}
						{/if}
					</span>
				{:else if item.kindId === 'cat'}
					<!-- Naps, then sits up for a while and swishes its tail. -->
					<span class="lofi-cat" class:lofi-rest={animalsAsleep}>
						<img class="lofi-cat-nap lofi-breathe" src={item.src} alt="" draggable="false" />
						<span class="lofi-cat-sit" aria-hidden="true">
							<img src={catSitA} alt="" draggable="false" />
							<img class="lofi-cat-tail" src={catSitB} alt="" draggable="false" />
						</span>
						{#if petted?.id === item.id}
							{#key petted.n}<span class="lofi-heart" aria-hidden="true">♥</span>{/key}
						{/if}
					</span>
				{:else}
					<img src={isNight ? (kindOf(item.kindId).nightSprite ?? item.src) : item.src} alt="" draggable="false" />
				{/if}
			</button>
		{/each}

		{#if resident.pose === 'sleep'}
			{#if resident.zzzAt}
				<div class="lofi-zzz" style:left={pctX(resident.zzzAt.x)} style:top={pctY(resident.zzzAt.y)} aria-hidden="true">
					<span>z</span><span>z</span><span>Z</span>
				</div>
			{/if}
		{:else}
			<button
				type="button"
				class="lofi-item lofi-char"
				class:lofi-char-walk={resident.pose === 'walk'}
				class:lofi-char-hop={hop}
				data-test="lofi-character"
				style:left={pctX(resident.x)}
				style:top={pctY(resident.y)}
				style:width={pctX(1)}
				style:background-image="url({characterUrl})"
				onclick={poke}
				onanimationend={() => (hop = false)}
				aria-label="Your roommate: {resident.activity}"
			></button>
		{/if}

		{#if hasStringLights}
			<div class="lofi-string" aria-hidden="true"></div>
			<div class="lofi-string lofi-string-blur" aria-hidden="true"></div>
		{/if}

		{#each lamps as lamp (lamp.id)}
			<div
				class="lofi-glow {mood.sleepy ? 'lofi-glow-dim' : isNight ? 'lofi-glow-night' : 'lofi-glow-day'}"
				style="--lamp-x: {pctX(lamp.x)}; --lamp-y: {pctY(lamp.y)}; --lamp-size: {lamp.size};"
				aria-hidden="true"
			></div>
		{/each}

		{#each WINDOW_SPOTS as win, w (w)}
			{#if isWinter}
				{#each ['a', 'b'] as layer (layer)}
					<div
						class="lofi-snow lofi-snow-{layer}"
						style:left={pctX(win.x + win.w * PANE.x)}
						style:top={pctY(win.y + win.h * PANE.y)}
						style:width={pctX(win.w * PANE.w)}
						style:height={pctY(win.h * PANE.h)}
						aria-hidden="true"
					></div>
				{/each}
			{:else if isAutumn && !isNight}
				<div
					class="lofi-leaves"
					style:left={pctX(win.x + win.w * PANE.x)}
					style:top={pctY(win.y + win.h * PANE.y)}
					style:width={pctX(win.w * PANE.w)}
					style:height={pctY(win.h * PANE.h)}
					aria-hidden="true"
				></div>
			{:else if isNight}
				{#each ['a', 'b'] as layer (layer)}
					<div
						class="lofi-rain lofi-rain-{layer}"
						style:left={pctX(win.x + win.w * PANE.x)}
						style:top={pctY(win.y + win.h * PANE.y)}
						style:width={pctX(win.w * PANE.w)}
						style:height={pctY(win.h * PANE.h)}
						aria-hidden="true"
					></div>
				{/each}
			{/if}
		{/each}

		{#if isNight}
			<div class="lofi-grain" aria-hidden="true"></div>
		{/if}

		<div class="lofi-tint {isNight ? 'lofi-tint-night' : 'lofi-tint-day'}" aria-hidden="true"></div>
		{#if mood.sleepy}
			<div class="lofi-sleepy" aria-hidden="true"></div>
		{/if}

		{#if selected}
			<div
				class="lofi-tip"
				class:lofi-tip-below={selected.below || selected.y < 2}
				style:left="clamp(18%, {pctX(selected.x)}, 82%)"
				style:top={selected.below ? pctY(selected.y) : selected.y < 2 ? pctY(selected.y + 1.6) : pctY(selected.y)}
				class:lofi-tip-interactive={selected.styleable}
				role="status"
			>
				<span class="block font-semibold">{selected.title}</span>
				<span class="block text-[11px] opacity-75">{selected.detail}</span>
				{#if selected.styleable}
					<button
						type="button"
						class="mt-1.5 rounded-full bg-white/15 px-2.5 py-0.5 text-[11px] font-semibold active:bg-white/25"
						data-test="change-style"
						onclick={openStyle}>Change style</button
					>
				{/if}
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
	/* ---- Animals ---- */
	/* The hit area travels with the wandering animal, not its home spot. */
	.lofi-animal {
		pointer-events: none;
	}
	.lofi-animal > span {
		pointer-events: auto;
	}
	.lofi-wander,
	.lofi-face,
	.lofi-cat {
		position: relative;
		display: block;
	}
	.lofi-item img.lofi-breathe {
		animation: lofi-breathe 2.4s steps(2, end) infinite;
		transform-origin: 50% 100%;
	}
	/* Pig: 26s loop — idle, walk right ~1 tile, sniff, walk back, idle. */
	.lofi-wander {
		animation: lofi-wander 26s linear infinite;
	}
	@keyframes lofi-wander {
		0%,
		18% {
			transform: none;
		}
		34%,
		58% {
			transform: translateX(110%);
		}
		74%,
		100% {
			transform: none;
		}
	}
	.lofi-face {
		transform-origin: 50% 100%;
		animation: lofi-face 26s linear infinite;
	}
	/* The sprite faces left: flip while heading right; bob on every step. */
	@keyframes lofi-face {
		0%,
		17.9% {
			transform: none;
		}
		18%,
		22%,
		26%,
		30%,
		34% {
			transform: scaleX(-1);
		}
		20%,
		24%,
		28%,
		32% {
			transform: scaleX(-1) translateY(-7%);
		}
		44% {
			transform: scaleX(-1);
		}
		46% {
			transform: scaleX(-1) rotate(-6deg);
		}
		48%,
		57.9% {
			transform: scaleX(-1);
		}
		58%,
		62%,
		66%,
		70%,
		74%,
		100% {
			transform: none;
		}
		60%,
		64%,
		68%,
		72% {
			transform: translateY(-7%);
		}
	}
	/* Cat: 30s loop — naps, then sits up from ~55% to ~95%. */
	.lofi-cat-nap {
		animation:
			lofi-breathe 2.4s steps(2, end) infinite,
			lofi-cat-nap 30s infinite;
	}
	.lofi-cat-sit {
		position: absolute;
		bottom: 0;
		/* sit frames are 14px wide vs the 17px nap sprite: same pixel scale, centred */
		left: 8.8%;
		width: 82.35%;
		opacity: 0;
		animation: lofi-cat-sit 30s infinite;
	}
	.lofi-cat-sit img {
		display: block;
		width: 100%;
	}
	.lofi-cat-sit img.lofi-cat-tail {
		position: absolute;
		inset: 0;
		animation: lofi-tail 1.4s steps(1, end) infinite;
	}
	@keyframes lofi-cat-nap {
		0%,
		54% {
			opacity: 1;
		}
		55%,
		95% {
			opacity: 0;
		}
		96%,
		100% {
			opacity: 1;
		}
	}
	@keyframes lofi-cat-sit {
		0%,
		54% {
			opacity: 0;
		}
		55%,
		95% {
			opacity: 1;
		}
		96%,
		100% {
			opacity: 0;
		}
	}
	@keyframes lofi-tail {
		0% {
			opacity: 0;
		}
		50% {
			opacity: 1;
		}
	}
	/* Night or a sleepy room: everyone settles down and breathes slowly. */
	.lofi-rest,
	.lofi-rest .lofi-face {
		animation: none;
	}
	.lofi-rest .lofi-cat-sit {
		display: none;
	}
	.lofi-item .lofi-rest img.lofi-breathe {
		animation: lofi-breathe 4s steps(2, end) infinite;
		opacity: 1;
	}
	/* Tapped: a hop and a heart. */
	.lofi-petted > span {
		animation-play-state: paused;
	}
	.lofi-petted {
		animation: lofi-hop 0.5s cubic-bezier(0.3, 0, 0.2, 1);
	}
	@keyframes lofi-hop {
		40% {
			transform: translateY(-22%);
		}
		100% {
			transform: none;
		}
	}
	.lofi-heart {
		position: absolute;
		left: 50%;
		top: -10%;
		color: #ff6b8b;
		font: 700 1.15rem/1 ui-monospace, monospace;
		text-shadow: 0 1px 0 #7a1f3a;
		pointer-events: none;
		animation: lofi-heart 0.9s ease-out forwards;
	}
	@keyframes lofi-heart {
		from {
			transform: translate(-50%, 0) scale(0.6);
			opacity: 1;
		}
		to {
			transform: translate(-50%, -140%) scale(1.15);
			opacity: 0;
		}
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
			rgba(255, 156, 64, 0.22) calc(18% * var(--lamp-size, 1)),
			rgba(255, 140, 60, 0.08) calc(34% * var(--lamp-size, 1)),
			transparent calc(58% * var(--lamp-size, 1))
		);
	}
	/* The resident: a 16x32 two-frame sheet (row 0 stand, row 1 walk). */
	.lofi-char {
		aspect-ratio: 1;
		background-repeat: no-repeat;
		background-size: 100% 200%;
		image-rendering: pixelated;
		transition:
			left 0.4s linear,
			top 0.4s linear;
	}
	.lofi-char-walk {
		animation: lofi-char-step 0.4s steps(1, end) infinite;
	}
	@keyframes lofi-char-step {
		0%,
		100% {
			background-position: 0 0;
		}
		50% {
			background-position: 0 100%;
		}
	}
	.lofi-char-hop {
		animation: lofi-char-hop 0.6s cubic-bezier(0.3, 0, 0.2, 1);
	}
	@keyframes lofi-char-hop {
		0%,
		100% {
			transform: none;
		}
		30% {
			transform: translateY(-28%);
		}
		60% {
			transform: none;
		}
		80% {
			transform: translateY(-10%);
		}
	}
	.lofi-snow {
		position: absolute;
		pointer-events: none;
		overflow: hidden;
		background-image: radial-gradient(circle, rgba(255, 255, 255, 0.95) 0 1px, transparent 1.4px);
	}
	.lofi-snow-a {
		background-size: 7px 9px;
		animation: lofi-snow-a 2.6s linear infinite;
	}
	.lofi-snow-b {
		background-size: 11px 13px;
		background-position: 3px 4px;
		opacity: 0.6;
		animation: lofi-snow-b 4s linear infinite;
	}
	.lofi-leaves {
		position: absolute;
		pointer-events: none;
		overflow: hidden;
		background-image:
			radial-gradient(ellipse 1.6px 1px, #e46d3a 0 90%, transparent 100%),
			radial-gradient(ellipse 1.6px 1px, #df9131 0 90%, transparent 100%);
		background-size:
			13px 17px,
			17px 23px;
		background-position:
			0 0,
			6px 9px;
		animation: lofi-leaves 5s linear infinite;
	}
	@keyframes lofi-leaves {
		to {
			background-position:
				-6px 17px,
				4px 32px;
		}
	}
	@keyframes lofi-snow-a {
		to {
			background-position: 3px 9px;
		}
	}
	@keyframes lofi-snow-b {
		to {
			background-position: 0 17px;
		}
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
	.lofi-tip-interactive {
		pointer-events: auto;
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
