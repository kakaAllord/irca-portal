import { expect, test } from '@playwright/test';

test('anyone signed in can open the guides, whatever their role', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Email').fill('clerk@irca.local');
  await page.getByLabel('Password').fill('clerk-password-123');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByRole('navigation', { name: 'Portals' })).toBeVisible();

  // The ? in the top bar opens the guide for the portal you are in.
  await page.goto('/finance');
  await page.getByRole('link', { name: 'Help', exact: true }).click();
  await expect(page).toHaveURL(/\/help\/finance$/);

  await page.goto('/help');
  await page.getByRole('link', { name: /Getting started/ }).click();
  await expect(page.getByRole('heading', { name: 'Getting started', level: 1 })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Print or save as PDF' })).toBeVisible();

  await page.goto('/help/finance');
  await expect(page.getByRole('heading', { name: 'Void a mistake' })).toBeVisible();
});
