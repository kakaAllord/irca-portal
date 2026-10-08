import { expect, test } from '@playwright/test';

const DEV = { email: 'dev@irca.local', password: 'dev-password-123' };
const ADMIN = { email: 'admin@irca.local', password: 'admin-password-123' };

async function signIn(page: import('@playwright/test').Page, who: typeof DEV) {
  await page.goto('/login');
  await page.getByLabel('Email').fill(who.email);
  await page.getByLabel('Password').fill(who.password);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByRole('navigation', { name: 'Portals' })).toBeVisible();
}

test.describe('the dev console', () => {
  test('health and logs show real numbers, and the developer has no admin section', async ({
    page,
  }) => {
    await signIn(page, DEV);

    await page.getByRole('link', { name: 'Health', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Health', level: 1 })).toBeVisible();
    await expect(page.getByText('Database', { exact: true })).toBeVisible();

    await page.getByRole('link', { name: 'Logs', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Logs', level: 1 })).toBeVisible();

    // D43: viewing as someone covers what the developer needs to see.
    for (const name of ['Users', 'Departments', 'Activity', 'Requests']) {
      await expect(page.getByRole('link', { name, exact: true })).toHaveCount(0);
    }
    await page.goto('/admin/users');
    await expect(page.getByText("You don't have access")).toBeVisible();
  });

  test('the developer looks up an error', async ({ browser, page }) => {
    // Someone's page fails in their browser; the page sends it with the
    // reference it shows them (docs/plan/11, steps 11.3 to 11.5).
    const clerk = await browser.newPage();
    await signIn(clerk, { email: 'mhazini2@irca.local', password: 'manager-password-123' });
    const reference = `B${Date.now().toString().slice(-10)}`;
    const sent = await clerk.request.post('/api/errors', {
      headers: { 'x-irca-client': 'portal' },
      data: {
        source: 'browser',
        reference,
        message: "TypeError: Cannot read properties of undefined (reading 'amount')",
        path: '/finance/transactions',
      },
    });
    expect(sent.status()).toBe(204);
    await clerk.close();

    // They send the whole sentence; the developer pastes it as it came.
    await signIn(page, DEV);
    await page.getByRole('link', { name: 'Errors', exact: true }).click();
    await page
      .getByLabel('Reference')
      .fill(`Something went wrong. Send this to your developer: ${reference} Copy`);
    await page.getByRole('button', { name: 'Look up' }).click();
    await expect(page.getByRole('heading', { name: 'What they saw' })).toBeVisible();
    await expect(page.getByText('Neema Mollel <mhazini2@irca.local>')).toBeVisible();
    await expect(page.getByText(/reading 'amount'/).first()).toBeVisible();
    await expect(page.getByRole('link', { name: new RegExp(reference) })).toBeVisible();

    await page.getByLabel('Reference').fill('0000000001');
    await page.getByRole('button', { name: 'Look up' }).click();
    await expect(page.getByText(/No error with this reference/)).toBeVisible();
  });

  test('viewing as someone, then reading it back in the view-as log and the logs', async ({
    browser,
    page,
  }) => {
    // An administrator views as the finance clerk from her own page.
    const admin = await browser.newPage();
    await signIn(admin, ADMIN);
    await admin.getByRole('link', { name: 'Users', exact: true }).click();
    await admin.getByRole('link', { name: 'Neema Mollel mhazini2@irca.local' }).click();
    await admin.getByRole('button', { name: 'View as Neema' }).click();
    await expect(admin.getByText('Viewing as Neema Mollel', { exact: true })).toBeVisible();
    await admin.getByRole('status').getByRole('button', { name: 'Back to my view' }).click();
    await expect(admin.getByText('Viewing as Neema Mollel', { exact: true })).toHaveCount(0);
    await admin.close();

    await signIn(page, DEV);
    // The view-as log is the only place that session shows up: a list now,
    // each session opening to the pages seen in it (docs/plan/11, 11.6).
    await page.getByRole('link', { name: 'View-as log' }).click();
    const session = page.getByRole('button', { name: /IRCA Admin viewed as Neema Mollel/ });
    await session.first().click();
    const drawer = page.getByRole('dialog');
    await expect(drawer.getByText('Neema Mollel <mhazini2@irca.local>')).toBeVisible();
    await expect(drawer.getByText(/pages? seen, in order/)).toBeVisible();
    await page.keyboard.press('Escape');

    // The terminal moved to Logs, with commands of its own.
    await page.getByRole('link', { name: 'Logs', exact: true }).click();
    const field = page.getByLabel('Command');
    await field.fill('help');
    await field.press('Enter');
    await expect(page.getByText('what people did, newest first')).toBeVisible();

    // The suite's API writes only errors, so what tail can promise is its count.
    await field.fill('tail 20');
    await field.press('Enter');
    await expect(page.getByText(/^\d+ of \d+ lines held\.$/)).toBeVisible();

    await field.fill('sudo rm -rf /');
    await field.press('Enter');
    await expect(page.getByText('"sudo" is not a command. Type help.')).toBeVisible();

    // The last thing typed comes back on the up arrow.
    await field.press('ArrowUp');
    await expect(field).toHaveValue('sudo rm -rf /');
  });

  test('usage, tab by tab', async ({ page }) => {
    await signIn(page, DEV);
    await page.getByRole('link', { name: 'Usage', exact: true }).click();
    await expect(page.getByText('Staff active today')).toBeVisible();
    await expect(page.getByText('Requests by portal')).toBeVisible();

    const tabs = page.getByRole('navigation', { name: 'Usage' });
    await tabs.getByRole('link', { name: 'Every number' }).click();
    await page.getByRole('button', { name: 'Failed sign-ins' }).click();
    await expect(page).toHaveURL(/metrics=.*auth\.login_failures/);
    await expect(page.getByText('Failed sign-ins').last()).toBeVisible();

    // Counts reach the database once a minute, so this run's own requests may
    // not be there yet; the API tests check the numbers themselves.
    await tabs.getByRole('link', { name: 'API' }).click();
    await expect(page.getByRole('heading', { name: 'Busiest routes' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Slowest routes' })).toBeVisible();

    await tabs.getByRole('link', { name: 'Sign-ins' }).click();
    await expect(page.getByText('Wrong passwords', { exact: true }).first()).toBeVisible();
    await tabs.getByRole('link', { name: 'Email' }).click();
    await expect(page.getByText('The last 50')).toBeVisible();
    // No whole address ever reaches the page.
    await expect(page.getByText(/[a-z]{3,}@irca\.local/)).toHaveCount(0);
  });

  test('the church settings, email, texts and the log level', async ({ page }) => {
    await signIn(page, DEV);
    await page.getByRole('link', { name: 'Settings', exact: true }).click();

    await page.getByRole('button', { name: 'Edit' }).click();
    const drawer = page.getByRole('dialog');
    await drawer.getByLabel('Timezone').fill('Mars/Olympus');
    await drawer.getByRole('button', { name: 'Save' }).click();
    await expect(drawer.getByText(/not a timezone/).first()).toBeVisible();
    await drawer.getByLabel('Timezone').fill('Africa/Dar_es_Salaam');
    await drawer.getByLabel('Name').fill('IRCA, renamed for a moment');
    await drawer.getByRole('button', { name: 'Save' }).click();
    await expect(page.getByRole('main').getByText('IRCA, renamed for a moment')).toBeVisible();
    // Put it back, so other journeys read the name they expect.
    await page.getByRole('button', { name: 'Edit' }).click();
    await drawer.getByLabel('Name').fill('International Revival Church Arusha');
    await drawer.getByRole('button', { name: 'Save' }).click();
    await expect(
      page.getByRole('main').getByText('International Revival Church Arusha'),
    ).toBeVisible();

    // Email: an account saved, its password never shown again, and removed
    // so the next journey still finds emails going to the log (D52).
    const email = page.locator('section', { has: page.getByRole('heading', { name: 'Email' }) });
    await email.getByLabel('Server').fill('127.0.0.1');
    await email.getByLabel('Port').fill('1');
    await email.getByLabel('Username').fill('office@example.org');
    await email.getByLabel(/^Password/).fill('abcd efgh ijkl mnop');
    await email.getByLabel('From').fill('IRCA <office@example.org>');
    await email.getByRole('button', { name: 'Save' }).click();
    await expect(email.getByText('Saved. Send yourself a test to be sure.')).toBeVisible();
    await expect(page.getByText('abcd efgh ijkl mnop')).toHaveCount(0);
    await email.getByRole('button', { name: 'Remove the account' }).click();
    await expect(email.getByText(/No account yet/)).toBeVisible();

    // Texts: the link to give Beem, with its password in it.
    const texts = page.locator('section', {
      has: page.getByRole('heading', { name: 'Texts (Beem)' }),
    });
    await expect(texts.getByText(/\/v1\/public\/comms\/inbound\?key=\S{24,}/)).toBeVisible();

    // Google Drive (D58): the client saved, its secret never shown again, the
    // address to give Google, and an answer Google did not send refused.
    const drive = page.locator('section', {
      has: page.getByRole('heading', { name: 'Google Drive' }),
    });
    await expect(drive.getByText(/Not set up: uploads are refused/)).toBeVisible();
    await expect(drive.getByText(/\/dev\/settings\/google-drive$/)).toBeVisible();
    await drive.getByLabel('Client ID').fill('1234-abc.apps.googleusercontent.com');
    await drive.getByLabel(/^Client secret/).fill('GOCSPX-journey-secret');
    await drive.getByRole('button', { name: 'Save' }).click();
    await expect(drive.getByText('Saved. Now connect the church’s Google account.')).toBeVisible();
    await expect(page.getByText('GOCSPX-journey-secret')).toHaveCount(0);
    await expect(drive.getByRole('button', { name: 'Connect Google Drive' })).toBeVisible();
    await page.goto('/dev/settings/google-drive?code=made-up&state=forged');
    await page.waitForURL(/\/dev\/settings\?drive=failed/);
    await expect(drive.getByText(/does not match a connection started here/)).toBeVisible();
    await drive.getByRole('button', { name: 'Remove the client' }).click();
    await expect(drive.getByText(/Not set up: uploads are refused/)).toBeVisible();

    // The log level, changed and put back.
    const log = page.locator('section', { has: page.getByRole('heading', { name: 'Log level' }) });
    await log.getByLabel('Level').selectOption('debug');
    await log.getByRole('button', { name: 'Change' }).click();
    await expect(log.getByText('Changed. The next lines are written at this level.')).toBeVisible();
    await log.getByLabel('Level').selectOption('error');
    await log.getByRole('button', { name: 'Change' }).click();
  });

  test('alerts: who hears, the storage size, and a test sent on purpose', async ({ page }) => {
    await signIn(page, DEV);
    await page.getByRole('link', { name: 'Settings', exact: true }).click();
    const alerts = page.locator('section', { has: page.getByRole('heading', { name: 'Alerts' }) });

    // The developer may read the Health page, so they hear.
    await expect(alerts.getByText(DEV.email)).toBeVisible();

    await alerts.getByRole('button', { name: 'Set the size' }).click();
    const drawer = page.getByRole('dialog');
    await drawer.getByLabel('Storage (GB)').fill('0');
    await drawer.getByRole('button', { name: 'Save' }).click();
    await expect(drawer.getByText('More than 0')).toBeVisible();
    await drawer.getByLabel('Storage (GB)').fill('5');
    await drawer.getByRole('button', { name: 'Save' }).click();
    await expect(alerts.getByText('5 GB, alert past 80%')).toBeVisible();
    // Put it back, so the next run starts from nothing set.
    await alerts.getByRole('button', { name: 'Set the size' }).click();
    await drawer.getByLabel('Storage (GB)').fill('');
    await drawer.getByRole('button', { name: 'Save' }).click();
    await expect(alerts.getByText('not set, so not watched')).toBeVisible();

    await alerts.getByRole('button', { name: 'Send a test alert' }).click();
    await expect(
      alerts.getByText(/^Sent: \d+ emails? and \d+ texts?\. Check they arrived\.$/),
    ).toBeVisible();
  });

  test('who holds what, and every role, read-only on Dev → Access', async ({ page }) => {
    await signIn(page, DEV);
    await page.getByRole('link', { name: 'Access', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Access', level: 1 })).toBeVisible();
    await expect(page.getByText('Church administrator').first()).toBeVisible();
    await expect(page.getByText('admin.administrator')).toBeVisible();
    // Nothing on the page changes anything but where the developer is looking.
    await expect(page.getByRole('button', { name: /Save|Edit|New role/ })).toHaveCount(0);

    // The developer views as someone from here, since People is not theirs.
    await page.getByRole('button', { name: 'View as Neema Mollel' }).click();
    await expect(page.getByText('Viewing as Neema Mollel', { exact: true })).toBeVisible();
    await page.getByRole('status').getByRole('button', { name: 'Back to my view' }).click();
    await expect(page.getByText('Viewing as Neema Mollel', { exact: true })).toHaveCount(0);
  });

  test('the dev console is not for an ordinary administrator', async ({ page }) => {
    await signIn(page, ADMIN);
    await expect(page.getByRole('link', { name: 'Health', exact: true })).toHaveCount(0);
    await page.goto('/dev');
    await expect(page.getByText("You don't have access to the health page")).toBeVisible();

    // Roles left Admin (D43): no Roles in the sidebar, and an old link lands on the Overview.
    await expect(page.getByRole('link', { name: 'Roles', exact: true })).toHaveCount(0);
    await page.goto('/admin/roles');
    await expect(page).toHaveURL(/\/admin$/);

    // Their activity log never shows a view-as line; only the view-as log does.
    await page.goto('/admin/audit');
    await expect(page.getByRole('heading', { name: 'Activity', level: 1 })).toBeVisible();
    await expect(page.getByText(/impersonation\./)).toHaveCount(0);
  });
});
