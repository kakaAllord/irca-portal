import { expect, test, type Page } from '@playwright/test';

const CLERK = { email: 'mhazini2@irca.local', password: 'manager-password-123' };
const MANAGER = { email: 'mhazini@irca.local', password: 'manager-password-123' };
const ADMIN = { email: 'admin@irca.local', password: 'admin-password-123' };

async function signIn(page: Page, who: { email: string; password: string }) {
  await page.goto('/login');
  await page.getByLabel('Email').fill(who.email);
  await page.getByLabel('Password').fill(who.password);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByRole('navigation', { name: 'Portals' })).toBeVisible();
}

/** Chooses the option starting with this text, whatever the picker adds after it. */
async function choose(select: ReturnType<Page['getByLabel']>, start: string) {
  await expect(select).toBeEnabled();
  const value = await select.evaluate(
    (s: HTMLSelectElement, text: string) =>
      [...s.options].find((o) => o.text.startsWith(text))?.value ?? '',
    start,
  );
  await select.selectOption(value);
}

/** A name nothing else in the database uses, so runs cannot collide. */
const unique = (prefix: string) => `${prefix} ${Date.now().toString().slice(-6)}`;

/**
 * Types a name into the item field and creates it.
 *
 * Runs share a database, so by the second run the name is close to the last
 * run's and the near-duplicate guard asks about it. That is the guard working:
 * the answer here is that this one really is different.
 */
async function createItem(page: Page, field: string, name: string) {
  await page.getByRole('combobox', { name: field }).fill(name);
  await page.getByRole('button', { name: /Create expense item|Create income source/ }).click();
  await page.getByRole('button', { name: 'Create and use' }).click();

  // While a dialog is open the field behind it is out of reach, so this waits
  // for whichever comes back: the field filled in, or the question to answer.
  const different = page.getByRole('button', { name: /is different/ });
  await expect
    .poll(
      async () => {
        if (await different.isVisible().catch(() => false)) await different.click();
        return page
          .getByRole('combobox', { name: field })
          .inputValue({ timeout: 1000 })
          .catch(() => null);
      },
      { timeout: 20_000, message: `${name} was never selected` },
    )
    .toBe(name);
}

test.describe('recording money', () => {
  test('a clerk records an expense, creating the item on the way', async ({ page }) => {
    const item = unique('Generator fuel');
    await signIn(page, CLERK);

    await page.getByRole('link', { name: 'Transactions' }).click();
    // The form is the right-hand drawer, as every other form in the portal is.
    // A click that lands before the page has hydrated opens nothing, so it is
    // tried again the way a person would, until the drawer is there.
    await expect(async () => {
      await page.getByRole('button', { name: '+ Record expense' }).click();
      await expect(page.getByRole('dialog')).toContainText('Record an expense', { timeout: 1_000 });
    }).toPass();

    // Typing a name nothing matches offers to create it, without leaving the form.
    await createItem(page, 'Expense item', item);

    await page.getByLabel(/^Amount/).fill('150000');
    // The account, inside the drawer: the list behind it names accounts too.
    await page.getByRole('dialog').getByLabel('Paid from').selectOption({ label: 'Cash (TZS)' });
    await page.getByLabel('Paid to').fill('Total Energies Njiro');
    await page.getByRole('button', { name: 'Save expense' }).click();

    await expect(page.getByText(/Saved as IRCA-EXP-\d{4}-\d{2}-\d{6}/)).toBeVisible();
  });

  test('someone without the permission is offered no way to add an item', async ({ page }) => {
    // Everyone in Finance may create items; an administrator, who is not in
    // Finance, cannot open the page at all.
    await signIn(page, ADMIN);
    await page.goto('/finance/transactions/new?kind=expense');
    await expect(page.getByText("You don't have access to")).toBeVisible();
  });

  test('a manager asks for a void and an administrator approves it', async ({ page, browser }) => {
    const item = unique('Church tent hire');
    await signIn(page, MANAGER);

    // Record something to void.
    await page.goto('/finance/transactions/new?kind=expense');
    await createItem(page, 'Expense item', item);
    await page.getByLabel(/^Amount/).fill('86500');
    await page.getByRole('button', { name: 'Save expense' }).click();

    const saved = await page.getByText(/Saved as IRCA-EXP-\d{4}-\d{2}-\d{6}/).textContent();
    const code = /IRCA-EXP-\d{4}-\d{2}-\d{6}/.exec(saved ?? '')![0];

    await page.goto(`/finance/transactions/${code}`);
    await page.getByRole('button', { name: /Request a change/ }).click();
    await page.getByRole('menuitem', { name: 'Void this entry' }).click();
    await page.getByLabel('Why?').fill('Entered twice — duplicate receipt');
    await page.getByRole('button', { name: 'Send request' }).click();
    await expect(page.getByText('A change is already waiting for approval.')).toBeVisible();

    // Nothing has changed yet: the entry is still posted.
    await page.reload();
    await expect(page.getByText('Posted')).toBeVisible();

    // An administrator decides it; nobody in Finance can, and nobody approves
    // their own request.
    const theirs = await browser.newContext();
    const adminPage = await theirs.newPage();
    await signIn(adminPage, ADMIN);
    await adminPage.getByRole('link', { name: 'Requests' }).first().click();
    await expect(adminPage.getByText(code)).toBeVisible();
    await adminPage.getByRole('button', { name: 'Approve' }).first().click();
    await adminPage.getByRole('button', { name: 'Approve', exact: true }).last().click();
    await expect(adminPage.getByText(code)).toHaveCount(0);
    await theirs.close();

    await page.reload();
    await expect(page.getByText('Voided', { exact: true })).toBeVisible();
    await expect(page.getByText(/Entered twice/).first()).toBeVisible();
  });

  test('viewing as a clerk shows the books with no way to change them', async ({ page }) => {
    await signIn(page, ADMIN);
    await page.goto('/admin/users');
    await page.getByPlaceholder('Search name or email…').fill(CLERK.email);
    const row = page.getByRole('link', { name: new RegExp(CLERK.email) });
    await expect(row).toBeVisible({ timeout: 15_000 });
    await row.click();
    // Their own page: People's rows each carry an arrow too.
    await page.waitForURL(/\/admin\/users\/[0-9a-f-]+$/);
    await page.getByRole('button', { name: /^View as/ }).click();
    await expect(page.getByText('Viewing as Neema Mollel', { exact: true })).toBeVisible();

    await page.goto('/finance/transactions');
    await expect(page.getByRole('heading', { name: 'Transactions' })).toBeVisible();
    await expect(page.getByRole('button', { name: '+ Record expense' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: '+ Record income' })).toHaveCount(0);

    await page.getByRole('status').getByRole('button', { name: 'Back to my view' }).click();
    await expect(page.getByText('Viewing as Neema Mollel', { exact: true })).toHaveCount(0);
  });

  test('money moves between accounts, and a budget warns without refusing', async ({ page }) => {
    const account = unique('M-PESA');
    await signIn(page, MANAGER);

    // An account to move money into, from Finance → Accounts.
    await page.goto('/finance/accounts');
    await expect(async () => {
      await page.getByRole('button', { name: '+ Account' }).click();
      await expect(page.getByRole('dialog')).toContainText('Add an account', { timeout: 1_000 });
    }).toPass();
    await page.getByLabel('Payment method').selectOption({ label: 'Mobile money' });
    await page.getByRole('textbox', { name: /^Name/ }).fill(account);
    await page.getByLabel('Counted on').fill('2020-01-01');
    await page.getByRole('button', { name: /Add account|Add it anyway/ }).click();
    const anyway = page.getByRole('button', { name: 'Add it anyway' });
    if (await anyway.isVisible().catch(() => false)) await anyway.click();
    await expect(page.getByText(account)).toBeVisible();

    // A transfer: both balances move, neither income nor expense.
    await page.goto('/finance/transactions');
    await expect(async () => {
      await page.getByRole('button', { name: '⇄ Transfer' }).click();
      await expect(page.getByRole('dialog')).toContainText('Move money', { timeout: 1_000 });
    }).toPass();
    const dialog = page.getByRole('dialog');
    await choose(dialog.getByLabel('From'), 'Cash (TZS)');
    await choose(dialog.getByLabel('To'), account);
    await dialog.getByLabel(/Amount that left/).fill('50000');
    await dialog.getByRole('button', { name: 'Save transfer' }).click();
    await expect(dialog.getByText(/Saved as IRCA-TRF-\d{4}-\d{2}-\d{6}/)).toBeVisible();

    // A small budget for Outreach this month, then an expense that takes it over.
    await page.goto('/finance/budgets');
    const row = page.locator('li', { hasText: 'Outreach' });
    await row.getByRole('button', { name: /Set budget|Change/ }).click();
    await page.getByLabel(/Budget for/).fill('1000');
    const why = page.getByLabel('Why it changes');
    if (await why.isVisible().catch(() => false)) await why.fill('The browser suite resets it');
    await page.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(row.getByText(/TZS 1,000/)).toBeVisible();

    await page.goto('/finance/transactions/new?kind=expense');
    await createItem(page, 'Expense item', unique('Tracts'));
    await page.getByLabel(/^Amount/).fill('25000');
    await page.getByRole('dialog').getByLabel('Department').selectOption({ label: 'Outreach' });
    await expect(page.getByText(/This takes the Outreach .* over its budget/)).toBeVisible();
    await page.getByRole('button', { name: 'Save expense' }).click();
    await expect(page.getByText(/Saved as IRCA-EXP-\d{4}-\d{2}-\d{6}/)).toBeVisible();

    await page.goto('/finance/budgets');
    await expect(
      page.locator('li', { hasText: 'Outreach' }).getByText('Over', { exact: true }),
    ).toBeVisible();
  });

  test('the monthly report downloads as a PDF', async ({ page }) => {
    await signIn(page, CLERK);
    await page.goto('/finance/reports');
    await expect(page.getByRole('heading', { name: /Monthly report/ })).toBeVisible();
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('link', { name: 'Download PDF' }).click(),
    ]);
    expect(download.suggestedFilename()).toMatch(/^IRCA-finance-monthly-\d{4}-\d{2}\.pdf$/);
    const file = await download.path();
    const { readFileSync } = await import('node:fs');
    expect(readFileSync(file).subarray(0, 5).toString()).toBe('%PDF-');
  });
});
