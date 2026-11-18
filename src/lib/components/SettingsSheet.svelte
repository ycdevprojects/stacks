<script lang="ts">
	// Data controls: everything lives on this device, so backups matter.
	import Sheet from './Sheet.svelte';
	import Icon from './Icon.svelte';
	import { exportBackup, importBackup, resetAllData } from '$lib/stores/app.svelte';
	import { showToast } from '$lib/stores/toast.svelte';
	import { today } from '$lib/utils/helpers';

	let { open = $bindable(false) }: { open?: boolean } = $props();

	let fileInput: HTMLInputElement | undefined = $state();
	let confirmReset = $state(false);
	let pendingImport = $state<string | null>(null);
	let busy = $state(false);

	$effect(() => {
		if (open) {
			confirmReset = false;
			pendingImport = null;
		}
	});

	function download() {
		const blob = new Blob([JSON.stringify(exportBackup(), null, 2)], { type: 'application/json' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = `stackr-backup-${today()}.json`;
		a.click();
		setTimeout(() => URL.revokeObjectURL(url), 1000);
		showToast('success', 'Backup saved', 'Keep it somewhere safe', '💾');
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

	<p class="mt-6 text-center text-xs text-slate-600">Stackr · works offline · install it from your browser’s share menu</p>
</Sheet>
