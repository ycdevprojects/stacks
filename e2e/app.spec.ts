// End-to-end tests against the production build (adapter-node preview).
import { test, expect, type Page } from '@playwright/test';

test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });

async function openApp(page: Page, path = '/') {
	await page.goto(path);
	await page.waitForSelector('nav[aria-label="Main"]', { timeout: 15000 });
}

async function createStack(page: Page, name: string, trigger: string, firstHabit?: string) {
	await page.getByRole('button', { name: /New Stack|Build my own stack/ }).first().click();
	const sheet = page.getByRole('dialog', { name: 'New Stack' });
	await sheet.getByLabel('Name').fill(name);
	await sheet.getByLabel(/Trigger/).fill(trigger);
	if (firstHabit) await sheet.getByLabel(/First habit/).fill(firstHabit);
	await sheet.getByRole('button', { name: 'Create Stack' }).click();
	await expect(sheet).toBeHidden();
}

test('first run shows onboarding and starter templates', async ({ page }) => {
	await openApp(page);
	await expect(page.getByText('Stack tiny habits onto routines you already have')).toBeVisible();
	await expect(page.getByRole('button', { name: /Morning Coffee/ })).toBeVisible();
});

test('a template creates a stack with habits', async ({ page }) => {
	await openApp(page);
	await page.getByRole('button', { name: /Morning Coffee/ }).click();
	await expect(page.getByRole('region', { name: 'Morning Coffee' })).toBeVisible();
	await expect(page.getByRole('button', { name: 'Drink a glass of water' })).toBeVisible();
	await expect(page.getByText('0 of 3 habits done')).toBeVisible();
});

test('create a custom stack, add a habit, check it off', async ({ page }) => {
	await openApp(page);
	await createStack(page, 'Evening', 'After I brush my teeth', 'Read 5 pages');

	const stack = page.getByRole('region', { name: 'Evening' });
	await stack.getByRole('button', { name: 'Add habit' }).click();
	const sheet = page.getByRole('dialog', { name: 'New Habit' });
	await sheet.getByLabel('Habit').fill('Journal one line');
	await sheet.getByRole('button', { name: 'Add Habit' }).click();
	await expect(sheet).toBeHidden();

	const habit = stack.getByRole('button', { name: 'Read 5 pages' });
	await habit.click();
	await expect(habit).toHaveAttribute('aria-pressed', 'true');
	// +10 per habit, plus the first-check-in-of-the-day streak bonus
	await expect(page.getByText(/^\+\d+ XP$/)).toBeVisible();
	await expect(page.getByText('1 of 2 habits done')).toBeVisible();

	// unchecking takes it back
	await habit.click();
	await expect(habit).toHaveAttribute('aria-pressed', 'false');
});

test('completions persist across reloads', async ({ page }) => {
	await openApp(page);
	await page.getByRole('button', { name: /Wind Down/ }).click();
	const habit = page.getByRole('button', { name: 'Read 5 pages' });
	await habit.click();
	await expect(habit).toHaveAttribute('aria-pressed', 'true');
	await page.reload();
	await page.waitForSelector('nav[aria-label="Main"]');
	await expect(page.getByRole('button', { name: 'Read 5 pages' })).toHaveAttribute('aria-pressed', 'true');
});

test('deleting a stack removes it and its habits for good', async ({ page }) => {
	await openApp(page);
	await page.getByRole('button', { name: /Desk Reset/ }).click();
	await page.getByRole('button', { name: 'Clear my desk' }).click();

	await page.getByRole('link', { name: 'Stacks', exact: true }).click();
	await page.getByRole('link', { name: /Desk Reset/ }).click();
	await page.getByRole('button', { name: 'Edit' }).click();
	await page.getByRole('button', { name: 'Delete Stack' }).click();
	await page.getByRole('button', { name: 'Delete', exact: true }).click();
	await expect(page).toHaveURL(/\/stacks$/);

	await page.reload();
	await page.waitForSelector('nav[aria-label="Main"]');
	await expect(page.getByText('Desk Reset')).toHaveCount(0);
	await page.getByRole('link', { name: 'Stats', exact: true }).click();
	await expect(page.getByText('Clear my desk')).toHaveCount(0);
});

test('tab bar reaches every screen', async ({ page }) => {
	await openApp(page);
	for (const [tab, url, heading] of [
		['Room', /\/room$/, 'Your Room'],
		['Stacks', /\/stacks$/, 'Stacks'],
		['Stats', /\/stats$/, 'Stats'],
		['Today', /\/$/, 'Today']
	] as const) {
		await page.getByRole('link', { name: tab, exact: true }).click();
		await expect(page).toHaveURL(url);
		await expect(page.getByRole('heading', { level: 1, name: heading })).toBeVisible();
	}
});

test('room shows furniture and badges, and old links redirect', async ({ page }) => {
	await openApp(page, '/achievements');
	await expect(page).toHaveURL(/\/room$/);
	await expect(page.getByTestId('lofi-room-hero')).toBeVisible();
	await expect(page.getByText('Next: Stage 2 · First Desk')).toBeVisible();
	await page.getByRole('tab', { name: /Badges/ }).click();
	await expect(page).toHaveURL(/tab=badges/);
	await expect(page.getByRole('button', { name: /First Step/ })).toBeVisible();
	await page.getByRole('tab', { name: /Progress/ }).click();

	await page.getByTestId('lofi-item-floorbed').click();
	await expect(page.getByRole('status')).toContainText('Sleeping bag');
});

test('a habit scheduled for other days leaves Today', async ({ page }) => {
	await openApp(page);
	await createStack(page, 'Gym', 'After work', 'Lift weights');
	await page.getByRole('link', { name: /Gym/ }).first().click();
	await page.getByRole('button', { name: /Lift weights/ }).click();

	const sheet = page.getByRole('dialog', { name: 'Edit Habit' });
	const todayName = new Date().toLocaleDateString('en-US', { weekday: 'long' });
	await sheet.getByRole('button', { name: todayName, exact: true }).click();
	await expect(sheet.getByRole('button', { name: todayName, exact: true })).toHaveAttribute('aria-pressed', 'false');
	await sheet.getByRole('button', { name: 'Save Changes' }).click();
	await expect(sheet).toBeHidden();

	await page.getByRole('link', { name: 'Today', exact: true }).click();
	await expect(page.getByText(/Nothing due today in .*Gym/)).toBeVisible();
	await expect(page.getByRole('button', { name: 'Lift weights' })).toHaveCount(0);
});

test('a rest day can be taken and undone', async ({ page }) => {
	await openApp(page);
	await page.getByRole('button', { name: /Wind Down/ }).click();
	await page.getByTestId('take-rest-day').click();
	await expect(page.getByTestId('rest-banner')).toBeVisible();
	// one per week: the offer goes away while a rest day is nearby
	await expect(page.getByTestId('take-rest-day')).toHaveCount(0);

	await page.reload();
	await page.waitForSelector('nav[aria-label="Main"]');
	await expect(page.getByTestId('rest-banner')).toBeVisible();
	await page.getByTestId('rest-banner').getByRole('button', { name: 'Undo' }).click();
	await expect(page.getByTestId('rest-banner')).toHaveCount(0);
});

test('a stack reminder shows on the stack and exports to the calendar', async ({ page }) => {
	await openApp(page);
	await page.getByRole('button', { name: /Morning Coffee/ }).click();
	await page.getByRole('link', { name: 'Stacks', exact: true }).click();
	await page.getByRole('link', { name: /Morning Coffee/ }).click();
	await page.getByRole('button', { name: 'Edit' }).click();
	const sheet = page.getByRole('dialog', { name: 'Edit Stack' });
	await sheet.getByLabel(/Reminder/).fill('08:15');
	await sheet.getByRole('button', { name: 'Save Changes' }).click();
	await expect(sheet).toBeHidden();
	await expect(page.getByText(/Reminder at 8:15/)).toBeVisible();

	await page.getByRole('link', { name: 'Stats', exact: true }).click();
	await page.getByRole('button', { name: 'Settings' }).click();
	const download = page.waitForEvent('download');
	await page.getByRole('button', { name: /Add to my calendar/ }).click();
	const file = await download;
	expect(file.suggestedFilename()).toBe('stackr-reminders.ics');
});

/** Seed a finished room: level 15, a 40-day best streak. */
async function seedFinishedRoom(page: Page) {
	await openApp(page);
	await page.evaluate(async () => {
		const uid = localStorage.getItem('stackr_local_user_id');
		const db = await new Promise<IDBDatabase>((resolve, reject) => {
			const req = indexedDB.open('stackr');
			req.onsuccess = () => resolve(req.result);
			req.onerror = () => reject(req.error);
		});
		const now = new Date().toISOString();
		await new Promise<void>((resolve, reject) => {
			const tx = db.transaction('profile', 'readwrite');
			tx.objectStore('profile').put({
				id: uid, xp: 6100, level: 15, streak_days: 0, longest_streak: 40, total_completions: 300,
				theme: 'default', created_at: now, updated_at: now
			});
			tx.oncomplete = () => resolve();
			tx.onerror = () => reject(tx.error);
		});
		db.close();
	});
	await page.goto('/room');
	await page.waitForSelector('nav[aria-label="Main"]');
}

test('a finished room keeps rewarding: decor, trophies and styles', async ({ page }) => {
	await seedFinishedRoom(page);
	await expect(page.getByText(/Next decoration · Level 16/)).toBeVisible();
	await expect(page.getByTestId('lofi-item-cat')).toBeVisible();
	await expect(page.getByTestId('lofi-item-trophy-silver')).toBeVisible();
	await expect(page.getByTestId('lofi-item-trophy-gold')).toHaveCount(0);

	await page.getByTestId('pick-styles').click();
	const sheet = page.getByRole('dialog', { name: /Style your/ });
	await expect(sheet).toBeVisible();
	const second = sheet.getByTestId('style-options').getByRole('button').nth(1);
	await second.click();
	// the next unpicked piece follows
	await expect(page.getByRole('dialog', { name: /Style your/ })).toBeVisible();
});

test('tapping a room piece offers its styles', async ({ page }) => {
	await seedFinishedRoom(page);
	await page.getByTestId('lofi-item-rug').click({ position: { x: 12, y: 12 } }); // a corner, clear of the pets
	await page.getByTestId('change-style').click();
	const sheet = page.getByRole('dialog', { name: 'Style your woven rug' });
	await expect(sheet).toBeVisible();
	const lake = sheet.getByRole('button', { name: /Lake/ });
	await lake.click();
	await expect(sheet).toBeHidden();
	// picked from a single piece: no follow-up sheet
	await expect(page.getByRole('dialog')).toHaveCount(0);
	await page.getByTestId('lofi-item-rug').click({ position: { x: 12, y: 12 } }); // a corner, clear of the pets
	await page.getByTestId('change-style').click();
	await expect(page.getByRole('dialog', { name: 'Style your woven rug' }).getByRole('button', { name: /Lake/ })).toHaveAttribute(
		'aria-pressed',
		'true'
	);
});

test('petting an animal floats a heart', async ({ page }) => {
	await seedFinishedRoom(page);
	await page.locator('[data-test="lofi-item-cat"] > span').click();
	await expect(page.locator('[data-test="lofi-item-cat"] .lofi-heart')).toBeVisible();
	await expect(page.getByRole('status')).toContainText('Cat');
});

// Regression: room styles and rest days are nested profile fields, which once made the
// profile unsavable — check-offs stuck but XP silently never updated.
test('XP still saves for a profile with room styles and a rest day', async ({ page }) => {
	await openApp(page);
	await page.getByRole('button', { name: /Wind Down/ }).click();
	// The stack shows once it's saved; only then is it safe to reload.
	await expect(page.getByRole('region', { name: 'Wind Down' })).toBeVisible();
	const readXp = () =>
		page.evaluate(async () => {
			const uid = localStorage.getItem('stackr_local_user_id')!;
			const db = await new Promise<IDBDatabase>((r) => {
				const q = indexedDB.open('stackr');
				q.onsuccess = () => r(q.result);
			});
			const p = await new Promise<{ xp: number }>((r) => {
				const g = db.transaction('profile').objectStore('profile').get(uid);
				g.onsuccess = () => r(g.result);
			});
			db.close();
			return p.xp;
		});

	// Give the profile a room style and a rest day through the app itself.
	await page.goto('/room');
	await page.getByTestId('pick-styles').click();
	await page.getByRole('dialog', { name: /Style your/ }).getByTestId('style-options').getByRole('button').nth(1).click();
	await expect(page.getByRole('dialog')).toHaveCount(0);
	await page.goto('/');
	await page.waitForSelector('nav[aria-label="Main"]');
	await page.getByTestId('take-rest-day').click();
	await expect(page.getByTestId('rest-banner')).toBeVisible();

	const before = await readXp();
	await page.getByRole('button', { name: 'Read 5 pages' }).click();
	await expect(page.getByText(/^\+\d+ XP$/)).toBeVisible();
	await expect.poll(readXp).toBeGreaterThan(before);
	await page.getByRole('button', { name: 'Read 5 pages' }).click();
	await expect(page.getByText(/^-\d+ XP$/)).toBeVisible();
	await expect.poll(readXp).toBe(before);
});
