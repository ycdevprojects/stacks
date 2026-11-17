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
		['Stacks', /\/stacks$/, 'Stacks'],
		['Stats', /\/stats$/, 'Stats'],
		['Room', /\/room$/, 'Your Room'],
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
	await expect(page.getByRole('heading', { name: 'Badges' })).toBeVisible();

	await page.getByRole('button', { name: /sleeping bag/i }).click();
	await expect(page.getByRole('status')).toContainText('Sleeping bag');
});
