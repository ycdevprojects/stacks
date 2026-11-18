<script lang="ts">
	// Add a habit to a stack, or edit / delete an existing one.
	import type { Habit, Stack } from '$lib/types';
	import Sheet from './Sheet.svelte';
	import { createHabit, updateHabit, removeHabit } from '$lib/stores/app.svelte';
	import { showToast } from '$lib/stores/toast.svelte';
	import { WEEKDAYS, WEEKDAYS_ONLY, normalizeDays, dayName, scheduleLabel } from '$lib/utils/schedule';
	import { haptic } from '$lib/utils/helpers';

	let {
		open = $bindable(false),
		stack,
		habit = null
	}: { open?: boolean; stack: Stack | null; habit?: Habit | null } = $props();

	let name = $state('');
	let description = $state('');
	let days = $state<number[]>([...WEEKDAYS]);
	let confirmDelete = $state(false);
	let saving = $state(false);

	$effect(() => {
		if (!open) return;
		name = habit?.name ?? '';
		description = habit?.description ?? '';
		days = habit?.days?.length ? [...habit.days] : [...WEEKDAYS];
		confirmDelete = false;
	});

	const valid = $derived(name.trim().length > 0 && days.length > 0);

	function toggleDay(d: number) {
		haptic(5);
		days = days.includes(d) ? days.filter((x) => x !== d) : [...days, d];
	}
	const preset = (set: readonly number[]) => days.length === set.length && set.every((d) => days.includes(d));

	async function save() {
		if (!valid || saving || !stack) return;
		saving = true;
		try {
			const desc = description.trim() || undefined;
			const schedule = normalizeDays(days);
			if (habit) {
				await updateHabit({ ...habit, name: name.trim(), description: desc, days: schedule });
				showToast('success', 'Habit saved', undefined, '✏️');
			} else {
				await createHabit(stack.id, name.trim(), desc, schedule);
				showToast('success', 'Habit added', stack.name, stack.icon);
			}
			open = false;
		} finally {
			saving = false;
		}
	}

	async function remove() {
		if (!habit) return;
		await removeHabit(habit.id);
		open = false;
		showToast('info', 'Habit deleted', habit.name, '🗑️');
	}
</script>

<Sheet bind:open title={habit ? 'Edit Habit' : 'New Habit'}>
	<form
		class="space-y-5"
		onsubmit={(e) => {
			e.preventDefault();
			save();
		}}
	>
		{#if stack}
			<p class="rounded-2xl bg-slate-800/60 px-4 py-3 text-sm text-slate-300">
				<span class="mr-1">{stack.icon}</span>{stack.trigger}, I will…
			</p>
		{/if}

		<div>
			<label for="habit-name" class="field-label">Habit</label>
			<input
				id="habit-name"
				data-autofocus={habit ? undefined : true}
				class="field"
				bind:value={name}
				placeholder="Drink a glass of water"
				maxlength="60"
				autocomplete="off"
				enterkeyhint="done"
			/>
		</div>

		<div>
			<label for="habit-desc" class="field-label">Note <span class="text-slate-500">(optional)</span></label>
			<input
				id="habit-desc"
				class="field"
				bind:value={description}
				placeholder="Keep it tiny — two minutes or less"
				maxlength="100"
				autocomplete="off"
				enterkeyhint="done"
			/>
		</div>

		<fieldset>
			<legend class="sr-only">Repeat on</legend>
			<div class="mb-1.5 flex items-baseline justify-between" aria-hidden="true">
				<span class="field-label mb-0">Repeat</span>
				<span class="text-xs text-slate-500">{days.length ? scheduleLabel(days) : 'Pick at least one day'}</span>
			</div>
			<div class="grid grid-cols-7 gap-1.5" data-test="habit-days">
				{#each WEEKDAYS as d (d)}
					{@const on = days.includes(d)}
					<button
						type="button"
						onclick={() => toggleDay(d)}
						class="pressable grid aspect-square place-items-center rounded-full text-[13px] font-semibold {on
							? 'bg-indigo-500 text-white'
							: 'bg-slate-800 text-slate-400'}"
						aria-pressed={on}
						aria-label={dayName(d, 'long')}>{dayName(d, 'narrow')}</button
					>
				{/each}
			</div>
			<div class="mt-2 flex gap-2">
				{#each [{ label: 'Every day', set: WEEKDAYS }, { label: 'Weekdays', set: WEEKDAYS_ONLY }] as p (p.label)}
					<button
						type="button"
						onclick={() => (days = [...p.set])}
						class="rounded-full px-3 py-1 text-xs font-medium {preset(p.set)
							? 'bg-indigo-500/20 text-indigo-200 ring-1 ring-indigo-400/40'
							: 'bg-slate-800 text-slate-400'}">{p.label}</button
					>
				{/each}
			</div>
		</fieldset>

		<button type="submit" class="btn-primary w-full" disabled={!valid || saving}>
			{habit ? 'Save Changes' : 'Add Habit'}
		</button>

		{#if habit}
			{#if confirmDelete}
				<div class="rounded-2xl bg-red-500/10 p-4 ring-1 ring-red-500/20">
					<p class="text-sm text-red-300">Delete “{habit.name}” and its history? XP you earned stays.</p>
					<div class="mt-3 grid grid-cols-2 gap-2">
						<button type="button" class="btn-secondary" onclick={() => (confirmDelete = false)}>Keep</button>
						<button type="button" class="btn-danger" onclick={remove}>Delete</button>
					</div>
				</div>
			{:else}
				<button type="button" class="btn-ghost-danger w-full" onclick={() => (confirmDelete = true)}>
					Delete Habit
				</button>
			{/if}
		{/if}
	</form>
</Sheet>
