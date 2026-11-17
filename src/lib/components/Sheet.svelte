<script lang="ts">
	// Bottom sheet: slides up over a dimmed backdrop, drag the handle (or tap
	// the backdrop / press Escape) to dismiss. Focus is kept inside while open.
	import type { Snippet } from 'svelte';
	import { fade, fly } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';

	let {
		open = $bindable(false),
		title,
		onclose,
		children,
		footer
	}: {
		open?: boolean;
		title?: string;
		onclose?: () => void;
		children: Snippet;
		footer?: Snippet;
	} = $props();

	let panel: HTMLDivElement | undefined = $state();
	let dragY = $state(0);
	let dragging = $state(false);
	let startY = 0;
	let startT = 0;

	function close() {
		open = false;
		onclose?.();
	}

	// Lock page scroll and move focus into the sheet while it is open.
	$effect(() => {
		if (!open) return;
		const previous = document.activeElement as HTMLElement | null;
		const { overflow } = document.body.style;
		document.body.style.overflow = 'hidden';
		queueMicrotask(() => {
			const target = panel?.querySelector<HTMLElement>('[data-autofocus]') ?? panel;
			target?.focus({ preventScroll: true });
		});
		return () => {
			document.body.style.overflow = overflow;
			previous?.focus?.({ preventScroll: true });
		};
	});

	function focusables(): HTMLElement[] {
		return [
			...(panel?.querySelectorAll<HTMLElement>(
				'button:not([disabled]), input:not([disabled]), textarea, select, [href], [tabindex]:not([tabindex="-1"])'
			) ?? [])
		];
	}

	function onkeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			e.stopPropagation();
			close();
			return;
		}
		if (e.key !== 'Tab') return;
		const list = focusables();
		if (list.length === 0) return;
		const first = list[0];
		const last = list[list.length - 1];
		if (e.shiftKey && (document.activeElement === first || document.activeElement === panel)) {
			e.preventDefault();
			last.focus();
		} else if (!e.shiftKey && document.activeElement === last) {
			e.preventDefault();
			first.focus();
		}
	}

	function onpointerdown(e: PointerEvent) {
		dragging = true;
		startY = e.clientY;
		startT = performance.now();
		(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
	}

	function onpointermove(e: PointerEvent) {
		if (dragging) dragY = Math.max(0, e.clientY - startY);
	}

	function onpointerup() {
		if (!dragging) return;
		dragging = false;
		const velocity = dragY / Math.max(1, performance.now() - startT);
		if (dragY > 120 || velocity > 0.6) close();
		dragY = 0;
	}
</script>

{#if open}
	<div class="fixed inset-0 z-50 flex items-end justify-center">
		<button
			type="button"
			class="absolute inset-0 bg-black/60 backdrop-blur-[2px]"
			aria-label="Close"
			tabindex="-1"
			onclick={close}
			transition:fade={{ duration: 200 }}
		></button>

		<div
			bind:this={panel}
			role="dialog"
			aria-modal="true"
			aria-label={title}
			tabindex="-1"
			{onkeydown}
			class="relative flex max-h-[92dvh] w-full max-w-lg flex-col rounded-t-[1.75rem] bg-slate-900 shadow-2xl ring-1 ring-white/5 outline-none"
			style:transform="translateY({dragY}px)"
			style:transition={dragging ? 'none' : 'transform 0.2s ease-out'}
			transition:fly={{ y: 480, duration: 280, easing: cubicOut, opacity: 1 }}
		>
			<!-- Drag handle: pointer-only affordance; Escape and the backdrop also close. -->
			<!-- svelte-ignore a11y_no_static_element_interactions -->
			<div
				class="flex shrink-0 cursor-grab touch-none flex-col items-center px-5 pt-2.5 active:cursor-grabbing"
				{onpointerdown}
				{onpointermove}
				{onpointerup}
				onpointercancel={onpointerup}
			>
				<div class="h-1.5 w-10 rounded-full bg-slate-700" aria-hidden="true"></div>
				{#if title}
					<h2 class="mt-3 w-full text-center text-[17px] font-semibold text-white">{title}</h2>
				{/if}
			</div>

			<div class="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pt-4 pb-4">
				{@render children()}
			</div>

			{#if footer}
				<div class="shrink-0 border-t border-white/5 px-5 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
					{@render footer()}
				</div>
			{:else}
				<div class="shrink-0 pb-[env(safe-area-inset-bottom)]"></div>
			{/if}
		</div>
	</div>
{/if}
