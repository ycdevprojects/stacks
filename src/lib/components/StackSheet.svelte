<script lang="ts">
	// Create or edit a stack. In edit mode it also offers deletion.
	import type { Stack } from '$lib/types';
	import Sheet from './Sheet.svelte';
	import Icon from './Icon.svelte';
	import { createStack, updateStack, removeStack } from '$lib/stores/app.svelte';
	import { STACK_COLORS, STACK_ICONS, randomColor, randomIcon, theme } from '$lib/utils/helpers';
	import { showToast } from '$lib/stores/toast.svelte';
	import { announceBadges } from '$lib/utils/feedback';
	import { remindersEnabled } from '$lib/services/reminders';

	let {
		open = $bindable(false),
		stack = null,
		ondeleted
	}: { open?: boolean; stack?: Stack | null; ondeleted?: () => void } = $props();

	let name = $state('');
	let trigger = $state('');
	let color = $state<string>('indigo');
	let icon = $state('☕');
	let firstHabit = $state('');
	let reminder = $state('');
	let confirmDelete = $state(false);
	let saving = $state(false);

	// Reset the form each time the sheet opens.
	$effect(() => {
		if (!open) return;
		name = stack?.name ?? '';
		trigger = stack?.trigger ?? '';
		color = stack?.color ?? randomColor();
		icon = stack?.icon ?? randomIcon();
		firstHabit = '';
		reminder = stack?.reminder ?? '';
		confirmDelete = false;
	});

	const valid = $derived(name.trim().length > 0 && trigger.trim().length > 0);

	async function save() {
		if (!valid || saving) return;
		saving = true;
		try {
			const fields = { name: name.trim(), trigger: trigger.trim(), color, icon, reminder: reminder || undefined };
			if (stack) {
				await updateStack({ ...stack, ...fields });
				showToast('success', 'Stack saved', undefined, icon);
			} else {
				const habit = firstHabit.trim();
				const { newBadges } = await createStack(fields, habit ? [habit] : []);
				showToast('success', 'Stack created', fields.name, icon);
				announceBadges(newBadges, 700);
			}
			open = false;
		} finally {
			saving = false;
		}
	}

	// Point people at Settings the first time they set a time without notifications on.
	const reminderHint = () =>
		reminder && reminder !== stack?.reminder && !remindersEnabled() ? 'Turn on reminders in Stats → ⚙︎' : undefined;

	async function remove() {
		if (!stack) return;
		// Capture before deleting: the parent may unmount this sheet once the stack is gone.
		const { id, name: deletedName } = stack;
		const done = ondeleted;
		open = false;
		await removeStack(id);
		showToast('info', 'Stack deleted', deletedName, '🗑️');
		done?.();
	}
</script>

<Sheet bind:open title={stack ? 'Edit Stack' : 'New Stack'}>
	<form
		class="space-y-5"
		onsubmit={(e) => {
			e.preventDefault();
			save();
		}}
	>
		<div class="flex items-center gap-3">
			<div class="grid size-14 shrink-0 place-items-center rounded-2xl text-3xl {theme(color).soft}">{icon}</div>
			<div class="min-w-0 flex-1">
				<label for="stack-name" class="field-label">Name</label>
				<input
					id="stack-name"
					data-autofocus={stack ? undefined : true}
					class="field"
					bind:value={name}
					placeholder="Morning Routine"
					maxlength="40"
					autocomplete="off"
					enterkeyhint="next"
				/>
			</div>
		</div>

		<div>
			<label for="stack-trigger" class="field-label">Trigger — the routine you already do</label>
			<input
				id="stack-trigger"
				class="field"
				bind:value={trigger}
				placeholder="After I pour my morning coffee"
				maxlength="80"
				autocomplete="off"
				enterkeyhint={stack ? 'done' : 'next'}
			/>
		</div>

		{#if !stack}
			<div>
				<label for="stack-first-habit" class="field-label">First habit <span class="text-slate-500">(optional)</span></label>
				<input
					id="stack-first-habit"
					class="field"
					bind:value={firstHabit}
					placeholder="Drink a glass of water"
					maxlength="60"
					autocomplete="off"
					enterkeyhint="done"
				/>
			</div>
		{/if}

		<div>
			<label for="stack-reminder" class="field-label">Reminder <span class="text-slate-500">(optional)</span></label>
			<div class="flex gap-2">
				<input id="stack-reminder" type="time" class="field flex-1" bind:value={reminder} />
				{#if reminder}
					<button type="button" class="btn-secondary px-4" onclick={() => (reminder = '')}>Clear</button>
				{/if}
			</div>
		</div>

		<fieldset>
			<legend class="field-label">Icon</legend>
			<div class="grid grid-cols-8 gap-1.5">
				{#each STACK_ICONS as i (i)}
					<button
						type="button"
						onclick={() => (icon = i)}
						class="pressable grid aspect-square place-items-center rounded-xl text-xl {icon === i
							? 'bg-slate-700 ring-2 ring-indigo-400'
							: 'bg-slate-800'}"
						aria-label="Icon {i}"
						aria-pressed={icon === i}>{i}</button
					>
				{/each}
			</div>
		</fieldset>

		<fieldset>
			<legend class="field-label">Color</legend>
			<div class="grid grid-cols-8 gap-2.5">
				{#each STACK_COLORS as c (c)}
					<button
						type="button"
						onclick={() => (color = c)}
						class="pressable grid aspect-square place-items-center rounded-full {theme(c).solid} {color === c
							? 'ring-2 ring-white ring-offset-2 ring-offset-slate-900'
							: ''}"
						aria-label="Color {c}"
						aria-pressed={color === c}
					>
						{#if color === c}<Icon name="check" class="size-4 text-white" strokeWidth={3} />{/if}
					</button>
				{/each}
			</div>
		</fieldset>

		<button type="submit" class="btn-primary w-full" disabled={!valid || saving}>
			{stack ? 'Save Changes' : 'Create Stack'}
		</button>

		{#if stack}
			{#if confirmDelete}
				<div class="rounded-2xl bg-red-500/10 p-4 ring-1 ring-red-500/20">
					<p class="text-sm text-red-300">Delete “{stack.name}”, its habits and their history? This can’t be undone.</p>
					<div class="mt-3 grid grid-cols-2 gap-2">
						<button type="button" class="btn-secondary" onclick={() => (confirmDelete = false)}>Keep</button>
						<button type="button" class="btn-danger" onclick={remove}>Delete</button>
					</div>
				</div>
			{:else}
				<button type="button" class="btn-ghost-danger w-full" onclick={() => (confirmDelete = true)}>
					Delete Stack
				</button>
			{/if}
		{/if}
	</form>
</Sheet>
