// Celebration toasts + haptics for the results of user actions.

import type { BadgeDefinition } from '$lib/types';
import type { ToggleResult } from '$lib/stores/app.svelte';
import { showToast } from '$lib/stores/toast.svelte';
import { STAGE_NAMES } from '$lib/room/room-stage';
import { haptic } from './helpers';

export function announceBadges(badges: BadgeDefinition[], delayMs = 0): void {
	badges.forEach((b, i) => showToast('achievement', `Badge unlocked: ${b.name}`, b.description, b.icon, delayMs + i * 700));
	if (badges.length) setTimeout(() => haptic([15, 60, 15]), delayMs);
}

export function announceToggle(result: ToggleResult): void {
	if (!result.completed) {
		haptic(8);
		return;
	}
	haptic(12);
	showToast('xp', `+${result.xpDelta} XP`, undefined, '✨');
	let delay = 450;
	if (result.stackCompleted) {
		showToast('success', `${result.stackCompleted.name} complete!`, 'Stack bonus included', result.stackCompleted.icon, delay);
		delay += 600;
	}
	if (result.levelUp) {
		showToast('levelup', `Level ${result.levelUp}!`, 'Keep stacking', '🎉', delay);
		setTimeout(() => haptic([20, 80, 20]), delay);
		delay += 700;
	}
	if (result.stageUp) {
		showToast('room', 'Your room grew!', `Stage ${result.stageUp} · ${STAGE_NAMES[result.stageUp - 1]}`, '🏠', delay);
		delay += 700;
	}
	announceBadges(result.newBadges, delay);
}
