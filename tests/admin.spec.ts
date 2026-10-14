import { test, expect } from './testSetup';
import { mockBackend, admin, diner } from './mocks';
import { Role, User } from '../src/service/pizzaService';

// Enough extra diners that the user list needs more than one page
const extraUsers: User[] = Array.from({ length: 10 }, (_, i) => ({
  id: String(200 + i),
  name: `Extra Diner ${i}`,
  email: `extra${i}@jwt.com`,
  password: 'a',
  roles: [{ role: Role.Diner }],
}));

test.describe('admin user list', () => {
  test('admin sees each user name, email, and role', async ({ page }) => {
    await mockBackend(page, { loggedInAs: admin });
    await page.goto('/admin-dashboard');

    const users = page.getByRole('table', { name: 'Users' });
    await expect(page.getByRole('heading', { name: 'Users' })).toBeVisible();
    await expect(users.getByRole('row', { name: /Kai Chen/ })).toContainText('d@jwt.com');
    await expect(users.getByRole('row', { name: /Kai Chen/ })).toContainText('diner');
    await expect(users.getByRole('row', { name: /Admin Pizza/ })).toContainText('admin');
    await expect(users.getByRole('row', { name: /Fran Chisee/ })).toContainText('franchisee');
  });

  test('user list is paginated', async ({ page }) => {
    await mockBackend(page, { loggedInAs: admin, users: extraUsers });
    await page.goto('/admin-dashboard');

    const users = page.getByRole('table', { name: 'Users' });
    const prev = users.getByRole('button', { name: '«' });
    const next = users.getByRole('button', { name: '»' });

    await expect(users).toContainText('Kai Chen');
    await expect(users).not.toContainText('Extra Diner 9');
    await expect(prev).toBeDisabled();
    await expect(next).toBeEnabled();

    await next.click();
    await expect(users).toContainText('Extra Diner 9');
    await expect(users).not.toContainText('Kai Chen');
    await expect(next).toBeDisabled();

    await prev.click();
    await expect(users).toContainText('Kai Chen');
    await expect(prev).toBeDisabled();
  });

  test('user list can be filtered by name', async ({ page }) => {
    await mockBackend(page, { loggedInAs: admin, users: extraUsers });
    await page.goto('/admin-dashboard');

    const users = page.getByRole('table', { name: 'Users' });
    await users.getByPlaceholder('Filter users').fill('kai');
    await users.getByRole('button', { name: 'Submit' }).click();

    await expect(users).toContainText('Kai Chen');
    await expect(users).not.toContainText('Admin Pizza');
    await expect(users).not.toContainText('Extra Diner');
  });

  test('admin can delete a user', async ({ page }) => {
    await mockBackend(page, { loggedInAs: admin });
    await page.goto('/admin-dashboard');

    const users = page.getByRole('table', { name: 'Users' });
    await users.getByRole('row', { name: /Kai Chen/ }).getByRole('button', { name: 'Delete' }).click();

    await expect(users).not.toContainText('Kai Chen');
    await expect(users).toContainText('Admin Pizza');
  });

  test('a deleted user can no longer log in', async ({ page }) => {
    await mockBackend(page, { loggedInAs: admin });
    await page.goto('/admin-dashboard');

    const users = page.getByRole('table', { name: 'Users' });
    await users.getByRole('row', { name: /Kai Chen/ }).getByRole('button', { name: 'Delete' }).click();
    await expect(users).not.toContainText('Kai Chen');

    await page.getByRole('link', { name: 'Logout' }).click();
    await page.getByRole('link', { name: 'Login' }).click();
    await page.getByRole('textbox', { name: 'Email address' }).fill(diner.email!);
    await page.getByRole('textbox', { name: 'Password' }).fill(diner.password!);
    await page.getByRole('button', { name: 'Login' }).click();
    await expect(page.getByRole('main')).toContainText('unknown user');
  });

  test('diners cannot see the user list', async ({ page }) => {
    await mockBackend(page, { loggedInAs: diner });
    await page.goto('/admin-dashboard');

    await expect(page.getByRole('table', { name: 'Users' })).toHaveCount(0);
  });
});
