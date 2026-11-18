// Regenerates the README screenshots in docs/screenshots/.
// Usage: serve a node build on :4199 first
//   ADAPTER=node npm run build && PORT=4199 node build
// then `node scripts/screenshot-docs.mjs`. Set PW_CHANNEL=chrome to use an
// installed Chrome instead of Playwright's bundled Chromium.
import { chromium } from '@playwright/test';

const BASE = process.env.BASE_URL ?? 'http://localhost:4199';
const browser = await chromium.launch({ channel: process.env.PW_CHANNEL });

const SHOTS = [
	{ file: 'docs/screenshots/today-390x844.png', path: '/', xp: 920, hour: 9, done: ['h_m1'] },
	{ file: 'docs/screenshots/room-stage1-390x844.png', path: '/room', xp: 40, hour: 12 },
	{ file: 'docs/screenshots/room-stage4-night-390x844.png', path: '/room', xp: 900, hour: 21 },
	{ file: 'docs/screenshots/room-stage6-390x844.png', path: '/room', xp: 2400, hour: 15 },
	{
		file: 'docs/screenshots/room-decor-390x844.png',
		path: '/room',
		xp: 6100,
		hour: 11,
		profile: { longest_streak: 40, room_styles: { rug: 'blue', bed: 'green', poster: 'teal' } }
	},
	{ file: 'docs/screenshots/stats-390x844.png', path: '/stats', xp: 920, hour: 9 }
];

for (const shot of SHOTS) {
	const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
	const page = await context.newPage();

	// Pin the clock (mood is hour-based) before the app boots.
	const fixed = new Date();
	fixed.setHours(shot.hour, 30, 0, 0);
	await page.clock.setFixedTime(fixed);

	// First load creates the local user id + database.
	await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });
	await page.waitForFunction(() => localStorage.getItem('stackr_local_user_id') !== null, null, { timeout: 15000 });

	await page.evaluate(async ({ xp, done, profile: extra }) => {
		const uid = localStorage.getItem('stackr_local_user_id');
		const db = await new Promise((resolve, reject) => {
			const req = indexedDB.open('stackr');
			req.onsuccess = () => resolve(req.result);
			req.onerror = () => reject(req.error);
		});
		const day = (n) => {
			const d = new Date();
			d.setDate(d.getDate() - n);
			return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
		};
		const iso = new Date(Date.now() - 90 * 86400000).toISOString();
		const stacks = [
			{ id: 'st_morning', name: 'Morning Coffee', trigger: 'After I pour my morning coffee', color: 'amber', icon: '☕', sort_order: 0 },
			{ id: 'st_wind', name: 'Wind Down', trigger: 'After I brush my teeth at night', color: 'violet', icon: '🌙', sort_order: 1 }
		].map((s) => ({ ...s, user_id: uid, created_at: iso, updated_at: iso }));
		const habits = [
			{ id: 'h_m1', stack_id: 'st_morning', name: 'Drink a glass of water' },
			{ id: 'h_m2', stack_id: 'st_morning', name: 'Write my top 3 for today' },
			{ id: 'h_m3', stack_id: 'st_morning', name: 'Stretch for 2 minutes' },
			{ id: 'h_w1', stack_id: 'st_wind', name: 'Read 5 pages' },
			{ id: 'h_w2', stack_id: 'st_wind', name: 'Write one line in my journal' }
		].map((h, i) => ({ ...h, user_id: uid, sort_order: i, created_at: iso, updated_at: iso }));
		// ~7 weeks of mostly-consistent history, skipping a few days
		const completions = [];
		for (let n = 1; n <= 50; n++) {
			habits.forEach((h, i) => {
				if ((n * 7 + i * 3) % 11 < 8) completions.push({ id: `c_${h.id}_${n}`, habit_id: h.id, user_id: uid, completed_at: day(n), created_at: iso });
			});
		}
		for (const id of done ?? []) completions.push({ id: `c_${id}_0`, habit_id: id, user_id: uid, completed_at: day(0), created_at: iso });
		let level = 0;
		while (25 * (level + 1) * (level + 2) <= xp) level++;
		const profile = {
			id: uid, xp, level, streak_days: 6, longest_streak: 12, total_completions: completions.length,
			theme: 'default', created_at: iso, updated_at: iso, ...extra
		};
		await new Promise((resolve, reject) => {
			const tx = db.transaction(['profile', 'stacks', 'habits', 'completions'], 'readwrite');
			tx.objectStore('profile').put(profile);
			for (const s of stacks) tx.objectStore('stacks').put(s);
			for (const h of habits) tx.objectStore('habits').put(h);
			for (const c of completions) tx.objectStore('completions').put(c);
			tx.oncomplete = () => resolve();
			tx.onerror = () => reject(tx.error);
		});
		db.close();
	}, shot);

	await page.goto(`${BASE}${shot.path}`, { waitUntil: 'networkidle' });
	await page.waitForSelector('nav[aria-label="Main"]', { timeout: 15000 });
	await page.waitForTimeout(400); // let entry transitions settle
	await page.screenshot({ path: shot.file });
	console.log(shot.file);
	await context.close();
}

await browser.close();
