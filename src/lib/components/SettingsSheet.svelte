<script lang="ts">
	// Data controls: everything lives on this device, so backups matter.
	import Sheet from './Sheet.svelte';
	import Icon from './Icon.svelte';
	import { exportBackup, importBackup, resetAllData, getAppState } from '$lib/stores/app.svelte';
	import {
		notificationsSupported,
		remindersEnabled,
		enableReminders,
		disableReminders,
		buildCalendar,
		formatTime
	} from '$lib/services/reminders';
	import { showToast } from '$lib/stores/toast.svelte';
	import { today } from '$lib/utils/helpers';
	import { isNative, saveTextFile } from '$lib/services/native';

	let { open = $bindable(false) }: { open?: boolean } = $props();

	let fileInput: HTMLInputElement | undefined = $state();
	let confirmReset = $state(false);
	let pendingImport = $state<string | null>(null);
	let busy = $state(false);

	const app = getAppState();
	const withReminder = $derived(app.stacks.filter((s) => s.reminder));
	let notifyOn = $state(false);
	let denied = $state(false);

	async function toggleNotify() {
		if (notifyOn) {
			disableReminders();
			notifyOn = false;
			return;
		}
		notifyOn = await enableReminders();
		denied = !notifyOn && typeof Notification !== 'undefined' && Notification.permission === 'denied';
		if (notifyOn) showToast('success', 'Reminders on', 'While Stackr is open or in the background', '🔔');
	}


	async function addToCalendar() {
		try {
			const ics = buildCalendar(app.stacks, app.habits, app.today, isNative() ? '' : location.origin);
			await saveTextFile(ics, 'text/calendar', 'stackr-reminders.ics');
			if (!isNative()) showToast('success', 'Calendar file saved', 'Open it to add your reminders', '📅');
		} catch {
			// share sheet dismissed
		}
	}

	$effect(() => {
		if (open) {
			confirmReset = false;
			pendingImport = null;
			notifyOn = remindersEnabled();
			denied = false;
		}
	});

	async function download() {
		try {
			await saveTextFile(JSON.stringify(exportBackup(), null, 2), 'application/json', `stackr-backup-${today()}.json`);
			if (!isNative()) showToast('success', 'Backup saved', 'Keep it somewhere safe', '💾');
		} catch {
			// share sheet dismissed
		}
	}

	async function pickFile(e: Event) {
		const input = e.currentTarget as HTMLInputElement;
		const file = input.files?.[0];
		input.value = '';
		if (file) pendingImport = await file.text();
	}

	async function restore() {
		if (!pendingImport || busy) return;
		busy = true;
		try {
			await importBackup(pendingImport);
			open = false;
			showToast('success', 'Backup restored', undefined, '📦');
		} catch (e) {
			showToast('error', 'Couldn’t restore', e instanceof Error ? e.message : undefined, '⚠️');
		} finally {
			busy = false;
			pendingImport = null;
		}
	}

	async function reset() {
		if (busy) return;
		busy = true;
		try {
			await resetAllData();
			open = false;
			showToast('info', 'Everything was reset', 'Fresh start', '🧹');
		} finally {
			busy = false;
		}
	}
</script>

<Sheet bind:open title="Settings">
	<h3 class="section-title">Reminders</h3>
	{#if withReminder.length === 0}
		<p class="card bg-slate-800/50 px-4 py-3.5 text-[13px] leading-relaxed text-slate-400">
			Give a stack a reminder time (Stacks → a stack → Edit), then come back here to turn notifications on or add it to your
			calendar.
		</p>
	{:else}
		<div class="card divide-y divide-white/5 overflow-hidden bg-slate-800/50" data-test="reminder-settings">
			{#if notificationsSupported()}
				<button
					type="button"
					role="switch"
					aria-checked={notifyOn}
					onclick={toggleNotify}
					class="flex w-full items-center gap-3 px-4 py-3.5 text-left active:bg-white/5"
				>
					<Icon name="bell" class="size-5 text-indigo-400" />
					<span class="min-w-0 flex-1">
						<span class="block text-[15px] text-white">Notifications</span>
						<span class="block text-xs text-slate-500">While Stackr is open or in the background</span>
					</span>
					<span class="relative h-7 w-12 shrink-0 rounded-full transition-colors {notifyOn ? 'bg-emerald-500' : 'bg-slate-600'}">
						<span class="absolute top-0.5 size-6 rounded-full bg-white shadow transition-[left] {notifyOn ? 'left-[1.375rem]' : 'left-0.5'}"></span>
					</span>
				</button>
			{/if}
			<button type="button" onclick={addToCalendar} class="flex w-full items-center gap-3 px-4 py-3.5 text-left active:bg-white/5">
				<Icon name="calendar" class="size-5 text-indigo-400" />
				<span class="min-w-0 flex-1">
					<span class="block text-[15px] text-white">Add to my calendar</span>
					<span class="block text-xs text-slate-500">Alarms that work even when Stackr is closed</span>
				</span>
			</button>
		</div>
		{#if denied}
			<p class="mt-2 px-1 text-xs text-amber-300">Notifications are blocked for this site. Allow them in your browser settings, or use the calendar.</p>
		{/if}
		<p class="mt-2 px-1 text-xs text-slate-500">
			{withReminder.map((s) => `${s.icon} ${formatTime(s.reminder!)}`).join(' · ')}
		</p>
	{/if}

	<h3 class="section-title mt-6">Your data</h3>
	<p class="mb-4 text-[13px] leading-relaxed text-slate-400">
		Stackr keeps your data only on this device — no account, no cloud. Save a backup now and then so clearing your
		browser or switching phones doesn’t lose your progress.
	</p>

	<div class="card divide-y divide-white/5 overflow-hidden bg-slate-800/50">
		<button type="button" onclick={download} class="flex w-full items-center gap-3 px-4 py-3.5 text-left active:bg-white/5">
			<Icon name="download" class="size-5 text-indigo-400" />
			<span class="flex-1 text-[15px] text-white">Export backup</span>
		</button>
		<button type="button" onclick={() => fileInput?.click()} class="flex w-full items-center gap-3 px-4 py-3.5 text-left active:bg-white/5">
			<Icon name="upload" class="size-5 text-indigo-400" />
			<span class="flex-1 text-[15px] text-white">Restore from backup</span>
		</button>
	</div>
	<input bind:this={fileInput} type="file" accept="application/json,.json" class="hidden" onchange={pickFile} />

	{#if pendingImport}
		<div class="mt-3 rounded-2xl bg-amber-500/10 p-4 ring-1 ring-amber-500/20">
			<p class="text-sm text-amber-200">Restoring replaces everything currently in Stackr with the backup.</p>
			<div class="mt-3 grid grid-cols-2 gap-2">
				<button type="button" class="btn-secondary" onclick={() => (pendingImport = null)}>Cancel</button>
				<button type="button" class="btn-primary" disabled={busy} onclick={restore}>Restore</button>
			</div>
		</div>
	{/if}

	<div class="mt-6">
		{#if confirmReset}
			<div class="rounded-2xl bg-red-500/10 p-4 ring-1 ring-red-500/20">
				<p class="text-sm text-red-300">Delete all stacks, habits, history, XP and badges? This can’t be undone.</p>
				<div class="mt-3 grid grid-cols-2 gap-2">
					<button type="button" class="btn-secondary" onclick={() => (confirmReset = false)}>Cancel</button>
					<button type="button" class="btn-danger" disabled={busy} onclick={reset}>Erase All</button>
				</div>
			</div>
		{:else}
			<button type="button" class="btn-ghost-danger w-full" onclick={() => (confirmReset = true)}>Erase all data</button>
		{/if}
	</div>

	{#if !isNative()}
		<p class="mt-6 text-center text-xs text-slate-600">Stackr · works offline · install it from your browser’s share menu</p>
	{/if}
</Sheet>
