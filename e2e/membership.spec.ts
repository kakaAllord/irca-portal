import { expect, test, type Page } from '@playwright/test';
import pg from 'pg';
import { formDatabaseUrl } from '../playwright.config';

const FORM = 'http://localhost:3101';
const PASTOR = { email: 'pastor@irca.local', password: 'pastor-password-123' };
const ADMIN = { email: 'admin@irca.local', password: 'admin-password-123' };

async function signIn(page: Page, who: { email: string; password: string }) {
  await page.goto('/login');
  await page.getByLabel(/Email/).fill(who.email);
  await page.getByLabel(/Password/).fill(who.password);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByRole('navigation', { name: 'Portals' })).toBeVisible();
}

test.describe('from the registration form to the Membership portal', () => {
  // The second journey looks at the person the first one registered.
  test.describe.configure({ mode: 'serial' });
  // A name and number nobody else in the shared test database has.
  const stamp = Date.now().toString().slice(-6);
  const name = `Visitor ${stamp}`;
  const phone = `71${stamp}0`;
  const prayer = `Please pray for my exams ${stamp}`;

  test('a visitor registers, and the pastor finds them and reads their prayer', async ({
    page,
    browser,
  }) => {
    // The visitor, on the form itself, which writes the database directly.
    const phoneCtx = await browser.newContext({ viewport: { width: 400, height: 860 } });
    const visitor = await phoneCtx.newPage();
    await visitor.goto(FORM);
    await visitor.getByRole('button', { name: /^English/ }).click();
    await visitor.waitForURL(/\/r\/[a-f0-9]{32}\/who/);
    const token = /\/r\/([a-f0-9]{32})\//.exec(visitor.url())![1]!;

    // Typing the name is saved by the form's own autosave, straight to the
    // database as irca_form (D49).
    await visitor.getByLabel(/full name/i).fill(name);
    const form = new pg.Client({ connectionString: formDatabaseUrl() });
    await form.connect();
    try {
      await expect
        .poll(
          async () =>
            (await form.query(`select fullname from registrations where token = $1`, [token]))
              .rows[0]?.fullname,
          { timeout: 15_000 },
        )
        .toBe(name);
      await phoneCtx.close();

      // The rest of the form, written as the form writes it.
      await form.query(
        `update registrations
         set gender = 'Female', age = '19–35', occ = 'Professional', dial_cc = 'TZ',
             dial = '+255', phone = $2, heard = '{A friend}', friend_name = 'Joyce',
             visit = '{First time visitor}', where_at = 'arusha', ward = 'Njiro',
             often = 'Every week', liked = 'The singing', want_more = true,
             interest = '{Salvation}', prayer = $3,
             status = 'submitted', submitted_at = now(), current_step = 'done',
             updated_at = now()
         where token = $1`,
        [token, phone, prayer],
      );
    } finally {
      await form.end();
    }

    // The pastor finds them, opens the row, and reads the prayer. Nothing
    // has run since the form wrote: the API catches up with it on the
    // pastor's own requests (D51), so the first page already has them.
    await signIn(page, PASTOR);
    // Registrations opens on those wanting to join; this visitor is on All.
    await page.goto('/membership/people?tab=all');
    await page.getByPlaceholder('Search name or phone…').fill(name);
    const row = page.getByRole('button', { name: `Open ${name}` });
    await expect(row).toBeVisible({ timeout: 15_000 });
    await row.click();
    await expect(page.getByRole('heading', { name: 'Prayer request' })).toBeVisible();
    await expect(page.getByText(prayer)).toBeVisible();
  });

  test('an administrator sees the same person, but never the prayer request (D34)', async ({
    page,
  }) => {
    await signIn(page, ADMIN);
    await page.goto('/membership/people?tab=all');
    await page.getByPlaceholder('Search name or phone…').fill(name);
    const row = page.getByRole('button', { name: `Open ${name}` });
    await expect(row).toBeVisible({ timeout: 15_000 });
    await row.click();

    await expect(page.getByRole('heading', { name: 'Spiritual status' })).toBeVisible();
    // Not hidden: never sent. The page says whose it is.
    await expect(page.getByText('Prayer requests are only shown to the pastors.')).toBeVisible();
    await expect(page.getByText(prayer)).toHaveCount(0);
  });
});
