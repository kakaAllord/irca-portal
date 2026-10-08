import { expect, test, type Page } from '@playwright/test';

const DEV = { email: 'dev@irca.local', password: 'dev-password-123' };
/** Someone who exists, so a reset for them is really queued. */
const PERSON = 'comms@irca.local';

async function signIn(page: Page, who: typeof DEV) {
  await page.goto('/login');
  await page.getByLabel('Email').fill(who.email);
  await page.getByLabel('Password').fill(who.password);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByRole('navigation', { name: 'Portals' })).toBeVisible();
}

async function askForReset(page: Page) {
  await page.goto('/forgot-password');
  await page.getByLabel('Email').fill(PERSON);
  await page.getByRole('button', { name: /send/i }).click();
  await expect(page.getByText(/we have sent a link/)).toBeVisible();
}

/**
 * The Comms lab (Dev → Comms lab): a reset link nobody could email is read in
 * the portal, with a badge saying whether it went anywhere else, and the one
 * switch changes that for the whole app.
 */
test('the developer reads a reset email in the lab, and the switch decides where it goes', async ({
  browser,
  page,
}) => {
  await signIn(page, DEV);

  // The lab is a group in the Dev section, like Departments is elsewhere.
  await page.getByRole('button', { name: 'Show the Comms lab pages' }).click();
  await page
    .getByRole('navigation', { name: 'Portals' })
    .getByRole('link', { name: 'Email', exact: true })
    .click();
  await expect(page.getByRole('heading', { name: 'Comms lab: Email', level: 1 })).toBeVisible();

  const mine = page.locator('article', { hasText: `To ${PERSON}` });
  const before = await mine.count();

  // Start from the default: sent for real where possible, and kept here.
  await page.getByRole('radio', { name: 'Dev and live' }).click();
  await expect(page.getByRole('radio', { name: 'Dev and live' })).toHaveAttribute(
    'aria-checked',
    'true',
  );

  const visitor = await browser.newPage();
  await askForReset(visitor);

  // It turns up on its own, with its link ready to follow and a "both" badge.
  await expect(mine).toHaveCount(before + 1, { timeout: 30_000 });
  const latest = mine.first();
  await expect(latest.getByText('Dev + live')).toBeVisible();
  await expect(latest.getByRole('link', { name: /reset-password/ })).toBeVisible();
  await expect(latest.getByRole('button', { name: 'Copy' })).toBeVisible();

  // Dev only: the next one is kept and sent nowhere.
  await page.getByRole('radio', { name: 'Dev only' }).click();
  await expect(page.getByRole('radio', { name: 'Dev only' })).toHaveAttribute(
    'aria-checked',
    'true',
  );
  await askForReset(visitor);
  await expect(mine).toHaveCount(before + 2, { timeout: 30_000 });
  await expect(mine.first().getByText('Dev only', { exact: true })).toBeVisible();
  await expect(mine.first().getByText(/nothing was sent for real/)).toBeVisible();

  // The mode holds across pages, and the other channel is one click away.
  await page
    .getByRole('navigation', { name: 'Comms lab' })
    .getByRole('link', { name: /SMS/ })
    .click();
  await expect(page.getByRole('heading', { name: 'Comms lab: SMS', level: 1 })).toBeVisible();
  await expect(page.getByRole('radio', { name: 'Dev only' })).toHaveAttribute(
    'aria-checked',
    'true',
  );

  // Put it back, as the other journeys expect.
  await page.getByRole('radio', { name: 'Dev and live' }).click();
  await expect(page.getByRole('radio', { name: 'Dev and live' })).toHaveAttribute(
    'aria-checked',
    'true',
  );
});
