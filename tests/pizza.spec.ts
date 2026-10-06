import { test, expect } from './testSetup';
import { mockBackend } from './mocks';

test('home page', async ({ page }) => {
  await mockBackend(page);
  await page.goto('/');

  expect(await page.title()).toBe('JWT Pizza');
});

test('login', async ({ page }) => {
  await mockBackend(page);
  await page.goto('/');
  await page.getByRole('link', { name: 'Login' }).click();
  await page.getByRole('textbox', { name: 'Email address' }).fill('d@jwt.com');
  await page.getByRole('textbox', { name: 'Password' }).fill('a');
  await page.getByRole('button', { name: 'Login' }).click();

  await expect(page.getByRole('link', { name: 'KC' })).toBeVisible();
});
