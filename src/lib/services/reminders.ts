// Reminders without a server.
// - In-app notifications: timers fire while Stackr is open or backgrounded.
// - Calendar export: an .ics file with a repeating alarm per stack, which the
//   phone's calendar delivers even when Stackr is closed.
// - App badge: the installed icon shows how many habits are left today.

import type { Habit, Stack } from '$lib/types';
import { dueHabits } from '$lib/utils/schedule';
import { addDays } from '$lib/utils/helpers';

const ENABLED_KEY = 'stackr_reminders';

const listeners = new Set<() => void>();
/** Subscribe to reminders being switched on or off. Returns an unsubscribe. */
export function onRemindersChange(cb: () => void): () => void {
	listeners.add(cb);
	return () => listeners.delete(cb);
}
const changed = () => listeners.forEach((cb) => cb());

export function notificationsSupported(): boolean {
	return typeof window !== 'undefined' && 'Notification' in window;
}

export function remindersEnabled(): boolean {
	try {
		return notificationsSupported() && Notification.permission === 'granted' && localStorage.getItem(ENABLED_KEY) === '1';
	} catch {
		return false;
	}
}

/** Ask for permission and turn reminders on. Resolves to whether they're on. */
export async function enableReminders(): Promise<boolean> {
	if (!notificationsSupported()) return false;
	const permission = Notification.permission === 'granted' ? 'granted' : await Notification.requestPermission();
	const on = permission === 'granted';
	try {
		localStorage.setItem(ENABLED_KEY, on ? '1' : '0');
	} catch {
		// storage blocked
	}
	changed();
	return on;
}

export function disableReminders(): void {
	try {
		localStorage.setItem(ENABLED_KEY, '0');
	} catch {
		// storage blocked
	}
	changed();
}

/** Minutes since midnight for "HH:MM", or null when malformed. */
export function parseTime(time: string | undefined): number | null {
	const m = time?.match(/^(\d{1,2}):(\d{2})$/);
	if (!m) return null;
	const h = Number(m[1]);
	const min = Number(m[2]);
	return h < 24 && min < 60 ? h * 60 + min : null;
}

export function formatTime(time: string): string {
	const mins = parseTime(time);
	if (mins === null) return time;
	return new Date(2026, 0, 1, Math.floor(mins / 60), mins % 60).toLocaleTimeString(undefined, {
		hour: 'numeric',
		minute: '2-digit'
	});
}

export interface DueReminder {
	stack: Stack;
	/** Milliseconds from `now` until it fires. */
	inMs: number;
	left: number;
}

/** Stacks whose reminder is still ahead today and that have habits left to do. */
export function upcomingReminders(
	stacks: Stack[],
	habits: Habit[],
	isDone: (habitId: string, date: string) => boolean,
	today: string,
	now: Date
): DueReminder[] {
	const minutes = now.getHours() * 60 + now.getMinutes() + now.getSeconds() / 60;
	const out: DueReminder[] = [];
	for (const stack of stacks) {
		const at = parseTime(stack.reminder);
		if (at === null || at <= minutes) continue;
		const due = dueHabits(
			habits.filter((h) => h.stack_id === stack.id),
			today
		);
		const left = due.filter((h) => !isDone(h.id, today)).length;
		if (left > 0) out.push({ stack, inMs: Math.round((at - minutes) * 60_000), left });
	}
	return out;
}

let timers: ReturnType<typeof setTimeout>[] = [];

/**
 * (Re)schedule today's reminders. `check` re-reads state when a timer fires so
 * a stack finished in the meantime stays quiet.
 */
export function scheduleReminders(
	reminders: DueReminder[],
	check: (stackId: string) => { left: number } | null
): void {
	for (const t of timers) clearTimeout(t);
	timers = [];
	if (!remindersEnabled()) return;
	for (const r of reminders) {
		timers.push(
			setTimeout(() => {
				const state = check(r.stack.id);
				if (state && state.left > 0) notify(r.stack, state.left);
			}, r.inMs)
		);
	}
}

async function notify(stack: Stack, left: number): Promise<void> {
	const title = `${stack.icon} ${stack.name}`;
	const options: NotificationOptions = {
		body: `${stack.trigger} — ${left} habit${left === 1 ? '' : 's'} to go.`,
		icon: '/icon-192.png',
		badge: '/icon-192.png',
		tag: `stack-${stack.id}`,
		data: { url: '/' }
	};
	try {
		const reg = await navigator.serviceWorker?.getRegistration();
		if (reg) await reg.showNotification(title, options);
		else new Notification(title, options);
	} catch {
		// notifications blocked
	}
}

/** Badge the installed app icon with habits left today (no-op where unsupported). */
export function setAppBadge(count: number): void {
	const nav = navigator as Navigator & {
		setAppBadge?: (n?: number) => Promise<void>;
		clearAppBadge?: () => Promise<void>;
	};
	try {
		if (count > 0) nav.setAppBadge?.(count)?.catch(() => {});
		else nav.clearAppBadge?.()?.catch(() => {});
	} catch {
		// unsupported
	}
}

// ============ CALENDAR (.ics) ============

const ICS_DAYS = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];

function icsEscape(text: string): string {
	return text.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/([,;])/g, '\\$1');
}

/** Fold lines longer than 75 octets, as RFC 5545 asks. */
function fold(line: string): string {
	const out: string[] = [];
	let rest = line;
	while (new TextEncoder().encode(rest).length > 75) {
		let cut = 74;
		while (new TextEncoder().encode(rest.slice(0, cut)).length > 74) cut--;
		out.push(rest.slice(0, cut));
		rest = ' ' + rest.slice(cut);
	}
	out.push(rest);
	return out.join('\r\n');
}

/** Weekdays a stack has anything due, or null for every day. */
export function stackDays(stack: Stack, habits: Habit[]): number[] | null {
	const own = habits.filter((h) => h.stack_id === stack.id);
	if (own.length === 0 || own.some((h) => !h.days?.length)) return null;
	const days = [...new Set(own.flatMap((h) => h.days ?? []))].sort();
	return days.length === 7 ? null : days;
}

/** An iCalendar file with one repeating, alarmed event per stack that has a reminder. */
export function buildCalendar(stacks: Stack[], habits: Habit[], today: string, origin: string): string {
	const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');
	const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Stackr//Habit reminders//EN', 'CALSCALE:GREGORIAN', 'X-WR-CALNAME:Stackr'];
	for (const stack of stacks) {
		const at = parseTime(stack.reminder);
		if (at === null) continue;
		const days = stackDays(stack, habits);
		// Start on the next day the stack is due so the first event isn't a stray one.
		let start = today;
		if (days) for (let i = 0; i < 7 && !days.includes(new Date(start + 'T12:00:00').getDay()); i++) start = addDays(start, 1);
		const hh = String(Math.floor(at / 60)).padStart(2, '0');
		const mm = String(at % 60).padStart(2, '0');
		const names = habits
			.filter((h) => h.stack_id === stack.id)
			.map((h) => `• ${h.name}`)
			.join('\n');
		lines.push(
			'BEGIN:VEVENT',
			`UID:stackr-${stack.id}@stackr`,
			`DTSTAMP:${stamp}`,
			// Floating local time: the reminder follows you across time zones.
			`DTSTART:${start.replace(/-/g, '')}T${hh}${mm}00`,
			'DURATION:PT5M',
			days ? `RRULE:FREQ=WEEKLY;BYDAY=${days.map((d) => ICS_DAYS[d]).join(',')}` : 'RRULE:FREQ=DAILY',
			`SUMMARY:${icsEscape(`${stack.icon} ${stack.name}`)}`,
			`DESCRIPTION:${icsEscape(`${stack.trigger}, I will…\n${names}\n\n${origin}`)}`,
			'TRANSP:TRANSPARENT',
			'BEGIN:VALARM',
			'ACTION:DISPLAY',
			`DESCRIPTION:${icsEscape(stack.name)}`,
			'TRIGGER:PT0M',
			'END:VALARM',
			'END:VEVENT'
		);
	}
	lines.push('END:VCALENDAR');
	return lines.map(fold).join('\r\n') + '\r\n';
}
