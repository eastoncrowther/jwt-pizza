import { test, expect } from './testSetup';
import { mockBackend, admin, diner, franchisee } from './mocks';

test.describe('franchisee dashboard', () => {
  test('logged out visitors are told how to become a franchisee', async ({ page }) => {
    await mockBackend(page);
    await page.goto('/');
    await page.getByRole('link', { name: 'Franchise' }).first().click();

    await expect(page.getByRole('main')).toContainText('So you want a piece of the pie?');
    await expect(page.getByRole('main')).toContainText('800-555-5555');
  });

  test('franchisee logs in and sees their stores', async ({ page }) => {
    await mockBackend(page);
    await page.goto('/franchise-dashboard/login');
    await page.getByPlaceholder('Email address').fill('f@jwt.com');
    await page.getByPlaceholder('Password').fill('franchisee');
    await page.getByRole('button', { name: 'Login' }).click();

    await expect(page).toHaveURL(/\/franchise-dashboard$/);
    await expect(page.getByRole('heading', { name: 'LotaPizza' })).toBeVisible();
    await expect(page.locator('tbody')).toContainText('Lehi');
    await expect(page.locator('tbody')).toContainText('Springville');
    await expect(page.locator('tbody')).toContainText('American Fork');
  });

  test('a diner without a franchise sees the franchise pitch', async ({ page }) => {
    await mockBackend(page, { loggedInAs: diner });
    await page.goto('/franchise-dashboard');

    await expect(page.getByRole('main')).toContainText('So you want a piece of the pie?');
  });

  test('create a store', async ({ page }) => {
    await mockBackend(page, { loggedInAs: franchisee });
    await page.goto('/franchise-dashboard');
    await page.getByRole('button', { name: 'Create store' }).click();

    await expect(page).toHaveURL(/\/franchise-dashboard\/create-store$/);
    await page.getByPlaceholder('store name').fill('Provo');
    await page.getByRole('button', { name: 'Create' }).click();

    await expect(page).toHaveURL(/\/franchise-dashboard$/);
    await expect(page.getByRole('row', { name: /Provo/ })).toBeVisible();
  });

  test('cancel creating a store', async ({ page }) => {
    await mockBackend(page, { loggedInAs: franchisee });
    await page.goto('/franchise-dashboard');
    await page.getByRole('button', { name: 'Create store' }).click();
    await page.getByRole('button', { name: 'Cancel' }).click();

    await expect(page).toHaveURL(/\/franchise-dashboard$/);
  });

  test('close a store', async ({ page }) => {
    await mockBackend(page, { loggedInAs: franchisee });
    await page.goto('/franchise-dashboard');
    await page.getByRole('row', { name: /Lehi/ }).getByRole('button', { name: 'Close' }).click();

    await expect(page.getByRole('main')).toContainText('Are you sure you want to close the LotaPizza store Lehi');
    await page.getByRole('button', { name: 'Close' }).click();

    await expect(page).toHaveURL(/\/franchise-dashboard$/);
    await expect(page.getByRole('row', { name: /Lehi/ })).toBeHidden();
    await expect(page.getByRole('row', { name: /Springville/ })).toBeVisible();
  });

  test('cancel closing a store', async ({ page }) => {
    await mockBackend(page, { loggedInAs: franchisee });
    await page.goto('/franchise-dashboard');
    await page.getByRole('row', { name: /Lehi/ }).getByRole('button', { name: 'Close' }).click();
    await page.getByRole('button', { name: 'Cancel' }).click();

    await expect(page).toHaveURL(/\/franchise-dashboard$/);
    await expect(page.getByRole('row', { name: /Lehi/ })).toBeVisible();
  });
});

test.describe('admin dashboard', () => {
  test('admin logs in and sees franchises', async ({ page }) => {
    await mockBackend(page);
    await page.goto('/');
    await page.getByRole('link', { name: 'Login' }).click();
    await page.getByPlaceholder('Email address').fill('a@jwt.com');
    await page.getByPlaceholder('Password').fill('admin');
    await page.getByRole('button', { name: 'Login' }).click();
    await page.getByRole('link', { name: 'Admin' }).click();

    await expect(page.getByRole('main')).toContainText("Mama Ricci's kitchen");
    await expect(page.getByRole('main')).toContainText('LotaPizza');
    await expect(page.getByRole('main')).toContainText('Fran Chisee');
    await expect(page.getByRole('row', { name: /Lehi/ })).toContainText('0.5 ₿');
    await expect(page.getByRole('main')).toContainText('PizzaCorp');
  });

  test('non-admins cannot view the admin dashboard', async ({ page }) => {
    await mockBackend(page, { loggedInAs: diner });
    await page.goto('/admin-dashboard');

    await expect(page.getByRole('main')).toContainText('Oops');
    await expect(page.getByRole('link', { name: 'Admin', exact: true })).toBeHidden();
  });

  test('paginate franchises', async ({ page }) => {
    await mockBackend(page, { loggedInAs: admin });
    await page.goto('/admin-dashboard');

    await expect(page.getByRole('main')).not.toContainText('SlicePie');
    await expect(page.getByRole('button', { name: '«' })).toBeDisabled();
    await page.getByRole('button', { name: '»' }).click();

    await expect(page.getByRole('main')).toContainText('SlicePie');
    await expect(page.getByRole('main')).not.toContainText('LotaPizza');
    await expect(page.getByRole('button', { name: '»' })).toBeDisabled();
    await page.getByRole('button', { name: '«' }).click();
    await expect(page.getByRole('main')).toContainText('LotaPizza');
  });

  test('filter franchises', async ({ page }) => {
    await mockBackend(page, { loggedInAs: admin });
    await page.goto('/admin-dashboard');
    await page.getByPlaceholder('Filter franchises').fill('corp');
    await page.getByRole('button', { name: 'Submit' }).click();

    await expect(page.getByRole('main')).toContainText('PizzaCorp');
    await expect(page.getByRole('main')).not.toContainText('LotaPizza');
    await expect(page.getByRole('main')).not.toContainText('topSpot');
  });

  test('create a franchise', async ({ page }) => {
    await mockBackend(page, { loggedInAs: admin });
    await page.goto('/admin-dashboard');
    await page.getByRole('button', { name: 'Add Franchise' }).click();

    await expect(page).toHaveURL(/\/admin-dashboard\/create-franchise$/);
    await page.getByPlaceholder('franchise name').fill('NewPizza');
    await page.getByPlaceholder('franchisee admin email').fill('new@jwt.com');
    await page.getByRole('button', { name: 'Create' }).click();

    await expect(page).toHaveURL(/\/admin-dashboard$/);
    await page.getByRole('button', { name: '»' }).click();
    await expect(page.getByRole('main')).toContainText('NewPizza');
  });

  test('cancel creating a franchise', async ({ page }) => {
    await mockBackend(page, { loggedInAs: admin });
    await page.goto('/admin-dashboard/create-franchise');
    await page.getByRole('button', { name: 'Cancel' }).click();

    await expect(page).toHaveURL(/\/admin-dashboard$/);
  });

  test('close a franchise', async ({ page }) => {
    await mockBackend(page, { loggedInAs: admin });
    await page.goto('/admin-dashboard');
    await page.getByRole('row', { name: /^topSpot/ }).getByRole('button', { name: 'Close' }).click();

    await expect(page.getByRole('main')).toContainText('Are you sure you want to close the topSpot franchise?');
    await page.getByRole('button', { name: 'Close' }).click();

    await expect(page).toHaveURL(/\/admin-dashboard$/);
    await expect(page.getByRole('main')).not.toContainText('topSpot');
    await expect(page.getByRole('main')).toContainText('SlicePie');
  });

  test('cancel closing a franchise', async ({ page }) => {
    await mockBackend(page, { loggedInAs: admin });
    await page.goto('/admin-dashboard');
    await page.getByRole('row', { name: /^topSpot/ }).getByRole('button', { name: 'Close' }).click();
    await page.getByRole('button', { name: 'Cancel' }).click();

    await expect(page).toHaveURL(/\/admin-dashboard$/);
    await expect(page.getByRole('main')).toContainText('topSpot');
  });

  test('close a store from the admin dashboard', async ({ page }) => {
    await mockBackend(page, { loggedInAs: admin });
    await page.goto('/admin-dashboard');
    await page.getByRole('row', { name: /Spanish Fork/ }).getByRole('button', { name: 'Close' }).click();

    await expect(page.getByRole('main')).toContainText('PizzaCorp store Spanish Fork');
    await page.getByRole('button', { name: 'Close' }).click();

    await expect(page).toHaveURL(/\/admin-dashboard$/);
    await expect(page.getByRole('row', { name: /Spanish Fork/ })).toBeHidden();
  });
});
