import { isNative, nativeHaptic } from '$lib/services/native';

// Date, color, id and device utilities.

/** A Date's local calendar date as YYYY-MM-DD. */
export function toDateStr(d: Date): string {
	return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Today's local date as YYYY-MM-DD. */
export function today(): string {
	return toDateStr(new Date());
}

/** Shift a YYYY-MM-DD date by `n` days (negative = past). */
export function addDays(date: string, n: number): string {
	const [y, m, d] = date.split('-').map(Number);
	return toDateStr(new Date(y, m - 1, d + n));
}

export function daysAgo(n: number): string {
	return addDays(today(), -n);
}

/** Noon local time on a YYYY-MM-DD date — safe for weekday/month formatting. */
export function dateOf(date: string): Date {
	return new Date(date + 'T12:00:00');
}

export function formatDate(date: string, opts: Intl.DateTimeFormatOptions): string {
	return dateOf(date).toLocaleDateString(undefined, opts);
}

export function greeting(hour: number): string {
	if (hour < 5) return 'Up late';
	if (hour < 12) return 'Good morning';
	if (hour < 17) return 'Good afternoon';
	return 'Good evening';
}

export function plural(n: number, word: string): string {
	return `${n} ${word}${n === 1 ? '' : 's'}`;
}

// ============ STACK COLORS & ICONS ============

export const STACK_COLORS = [
	'indigo', 'violet', 'fuchsia', 'pink', 'rose', 'red', 'orange', 'amber',
	'yellow', 'lime', 'green', 'emerald', 'teal', 'cyan', 'sky', 'blue'
] as const;

export type StackColor = (typeof STACK_COLORS)[number];

export const STACK_ICONS = [
	'☕', '🌅', '🚿', '🪥', '🍳', '🏃', '💪', '🧘',
	'📚', '✍️', '💻', '📧', '🎵', '🧹', '🌙', '💤'
] as const;

export function randomColor(): StackColor {
	return STACK_COLORS[Math.floor(Math.random() * STACK_COLORS.length)];
}

export function randomIcon(): string {
	return STACK_ICONS[Math.floor(Math.random() * STACK_ICONS.length)];
}

export interface ColorTheme {
	/** solid fill: swatches, completed checks, dots */
	solid: string;
	/** tinted surface for icon tiles */
	soft: string;
	/** accent text / currentColor for SVG strokes */
	text: string;
}

// Full class strings (never interpolated) so Tailwind can see them.
const THEMES: Record<StackColor, ColorTheme> = {
	indigo: { solid: 'bg-indigo-500', soft: 'bg-indigo-500/15', text: 'text-indigo-400' },
	violet: { solid: 'bg-violet-500', soft: 'bg-violet-500/15', text: 'text-violet-400' },
	fuchsia: { solid: 'bg-fuchsia-500', soft: 'bg-fuchsia-500/15', text: 'text-fuchsia-400' },
	pink: { solid: 'bg-pink-500', soft: 'bg-pink-500/15', text: 'text-pink-400' },
	rose: { solid: 'bg-rose-500', soft: 'bg-rose-500/15', text: 'text-rose-400' },
	red: { solid: 'bg-red-500', soft: 'bg-red-500/15', text: 'text-red-400' },
	orange: { solid: 'bg-orange-500', soft: 'bg-orange-500/15', text: 'text-orange-400' },
	amber: { solid: 'bg-amber-500', soft: 'bg-amber-500/15', text: 'text-amber-400' },
	yellow: { solid: 'bg-yellow-500', soft: 'bg-yellow-500/15', text: 'text-yellow-400' },
	lime: { solid: 'bg-lime-500', soft: 'bg-lime-500/15', text: 'text-lime-400' },
	green: { solid: 'bg-green-500', soft: 'bg-green-500/15', text: 'text-green-400' },
	emerald: { solid: 'bg-emerald-500', soft: 'bg-emerald-500/15', text: 'text-emerald-400' },
	teal: { solid: 'bg-teal-500', soft: 'bg-teal-500/15', text: 'text-teal-400' },
	cyan: { solid: 'bg-cyan-500', soft: 'bg-cyan-500/15', text: 'text-cyan-400' },
	sky: { solid: 'bg-sky-500', soft: 'bg-sky-500/15', text: 'text-sky-400' },
	blue: { solid: 'bg-blue-500', soft: 'bg-blue-500/15', text: 'text-blue-400' }
};

export function theme(color: string): ColorTheme {
	return THEMES[color as StackColor] ?? THEMES.indigo;
}

// ============ IDS & DEVICE ============

export function generateId(): string {
	return crypto.randomUUID();
}

/** Short tap: native haptics in the app, vibration in Android browsers, nothing elsewhere. */
export function haptic(pattern: number | number[] = 10): void {
	if (isNative()) {
		nativeHaptic(pattern);
		return;
	}
	try {
		navigator.vibrate?.(pattern);
	} catch {
		// unsupported
	}
}
