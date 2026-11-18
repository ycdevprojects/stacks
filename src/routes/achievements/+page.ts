import { redirect } from '@sveltejs/kit';

// The rewards tab moved to /room; keep old links and installed shortcuts working.
export function load() {
	redirect(308, '/room');
}
