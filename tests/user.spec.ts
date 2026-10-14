import { Page } from '@playwright/test';
import { test, expect } from './testSetup';
import { mockBackend, admin, diner, franchisee } from './mocks';

test('updateUser', async ({ page }) => {
  await mockBackend(page);
  const email = `user${Math.floor(Math.random() * 10000)}@jwt.com`;
  await page.goto('/');
  await page.getByRole('link', { name: 'Register' }).click();
  await page.getByRole('textbox', { name: 'Full name' }).fill('pizza diner');
  await page.getByRole('textbox', { name: 'Email address' }).fill(email);
  await page.getByRole('textbox', { name: 'Password' }).fill('diner');
  await page.getByRole('button', { name: 'Register' }).click();

  await page.getByRole('link', { name: 'pd' }).click();

  await expect(page.getByRole('main')).toContainText('pizza diner');

  await page.getByRole('button', { name: 'Edit' }).click();
  await expect(page.locator('h3')).toContainText('Edit user');
  await page.getByRole('textbox').first().fill('pizza dinerx');
  await page.getByRole('button', { name: 'Update' }).click();

  await page.waitForSelector('[role="dialog"].hidden', { state: 'attached' });

  await expect(page.getByRole('main')).toContainText('pizza dinerx');

  await page.getByRole('link', { name: 'Logout' }).click();
  await page.getByRole('link', { name: 'Login' }).click();

  await page.getByRole('textbox', { name: 'Email address' }).fill(email);
  await page.getByRole('textbox', { name: 'Password' }).fill('diner');
  await page.getByRole('button', { name: 'Login' }).click();

  await page.getByRole('link', { name: 'pd' }).click();

  await expect(page.getByRole('main')).toContainText('pizza dinerx');
});

async function login(page: Page, email: string, password: string) {
  await page.getByRole('link', { name: 'Login' }).click();
  await page.getByRole('textbox', { name: 'Email address' }).fill(email);
  await page.getByRole('textbox', { name: 'Password' }).fill(password);
  await page.getByRole('button', { name: 'Login' }).click();
}

async function editUser(page: Page, fields: { name?: string; email?: string; password?: string }) {
  await page.getByRole('button', { name: 'Edit' }).click();
  await expect(page.locator('h3')).toContainText('Edit user');
  const dialog = page.getByRole('dialog');
  if (fields.name !== undefined) await dialog.getByRole('textbox').nth(0).fill(fields.name);
  if (fields.email !== undefined) await dialog.getByRole('textbox').nth(1).fill(fields.email);
  if (fields.password !== undefined) await dialog.getByRole('textbox').nth(2).fill(fields.password);
  await page.getByRole('button', { name: 'Update' }).click();
  await page.waitForSelector('[role="dialog"].hidden', { state: 'attached' });
}

test('update email and password, then log in with the new credentials', async ({ page }) => {
  await mockBackend(page, { loggedInAs: diner });
  await page.goto('/diner-dashboard');
  await expect(page.getByRole('main')).toContainText('d@jwt.com');

  await editUser(page, { email: 'new@jwt.com', password: 'newpass' });
  await expect(page.getByRole('main')).toContainText('new@jwt.com');

  await page.getByRole('link', { name: 'Logout' }).click();

  await login(page, 'd@jwt.com', 'a');
  await expect(page.getByRole('main')).toContainText('unknown user');

  await page.getByRole('textbox', { name: 'Email address' }).fill('new@jwt.com');
  await page.getByRole('textbox', { name: 'Password' }).fill('a');
  await page.getByRole('button', { name: 'Login' }).click();
  await expect(page.getByRole('main')).toContainText('unknown user');

  await page.getByRole('textbox', { name: 'Password' }).fill('newpass');
  await page.getByRole('button', { name: 'Login' }).click();
  await page.goto('/diner-dashboard');
  await expect(page.getByRole('main')).toContainText('new@jwt.com');
  await expect(page.getByRole('main')).toContainText('Kai Chen');
});

test('leaving the password blank keeps the old password', async ({ page }) => {
  await mockBackend(page, { loggedInAs: diner });
  await page.goto('/diner-dashboard');

  await editUser(page, { name: 'Kai Changed' });
  await expect(page.getByRole('main')).toContainText('Kai Changed');

  await page.getByRole('link', { name: 'Logout' }).click();
  await login(page, 'd@jwt.com', 'a');
  await page.goto('/diner-dashboard');
  await expect(page.getByRole('main')).toContainText('Kai Changed');
});

test('admin can update their own user', async ({ page }) => {
  await mockBackend(page, { loggedInAs: admin });
  await page.goto('/diner-dashboard');
  await expect(page.getByRole('main')).toContainText('admin');

  await editUser(page, { name: 'Admin Renamed' });
  await expect(page.getByRole('main')).toContainText('Admin Renamed');
  await expect(page.getByRole('main')).toContainText('admin');
});

test('franchisee keeps their roles after updating', async ({ page }) => {
  await mockBackend(page, { loggedInAs: franchisee });
  await page.goto('/diner-dashboard');

  await editUser(page, { name: 'Fran Renamed' });
  await expect(page.getByRole('main')).toContainText('Fran Renamed');
  await expect(page.getByRole('main')).toContainText('Franchisee on 2');
});

test('closing the dialog with the X button does not change the user', async ({ page }) => {
  await mockBackend(page, { loggedInAs: diner });
  await page.goto('/diner-dashboard');

  await page.getByRole('button', { name: 'Edit' }).click();
  await expect(page.locator('h3')).toContainText('Edit user');
  await page.getByRole('dialog').getByRole('textbox').first().fill('Not Saved');
  // Wait for preline to finish opening, otherwise the close gets lost mid-transition
  await expect(page.getByRole('dialog')).toHaveClass(/opened/);
  await page.locator('[data-hs-overlay="#hs-jwt-modal"]').click();
  await page.waitForSelector('[role="dialog"].hidden', { state: 'attached' });

  await expect(page.getByRole('main')).toContainText('Kai Chen');
  await expect(page.getByRole('main')).not.toContainText('Not Saved');
});

test('updated user survives navigating away and refreshing the page', async ({ page }) => {
  await mockBackend(page, { loggedInAs: diner });
  await page.goto('/diner-dashboard');

  await editUser(page, { name: 'Kai Refreshed', email: 'refreshed@jwt.com' });
  await expect(page.getByRole('main')).toContainText('Kai Refreshed');

  await page.getByRole('link', { name: 'Order' }).click();
  await expect(page).toHaveURL(/\/menu$/);
  await page.getByRole('link', { name: 'KR' }).click();
  await expect(page.getByRole('main')).toContainText('Kai Refreshed');
  await expect(page.getByRole('main')).toContainText('refreshed@jwt.com');

  await page.reload();
  await expect(page.getByRole('main')).toContainText('Kai Refreshed');
  await expect(page.getByRole('main')).toContainText('refreshed@jwt.com');
});
