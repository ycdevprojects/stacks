// Global toast queue, rendered by Toast.svelte in the root layout.

export type ToastType = 'success' | 'xp' | 'levelup' | 'achievement' | 'room' | 'info' | 'error';

export interface ToastItem {
	id: number;
	type: ToastType;
	message: string;
	detail?: string;
	icon?: string;
}

const MAX_VISIBLE = 3;
const DURATION_MS = 2600;

let toasts = $state<ToastItem[]>([]);
let nextId = 0;

export function getToasts(): ToastItem[] {
	return toasts;
}

export function dismissToast(id: number): void {
	toasts = toasts.filter((t) => t.id !== id);
}

export function showToast(type: ToastType, message: string, detail?: string, icon?: string, delayMs = 0): void {
	const push = () => {
		const id = nextId++;
		toasts = [...toasts, { id, type, message, detail, icon }].slice(-MAX_VISIBLE);
		setTimeout(() => dismissToast(id), DURATION_MS);
	};
	if (delayMs > 0) setTimeout(push, delayMs);
	else push();
}
