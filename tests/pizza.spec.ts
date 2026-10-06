import { Page } from '@playwright/test';
import { test, expect } from './testSetup';
import { mockBackend, diner, franchisee } from './mocks';

async function login(page: Page, email: string, password: string) {
  await page.getByPlaceholder('Email address').fill(email);
  await page.getByPlaceholder('Password').fill(password);
  await page.getByRole('button', { name: 'Login' }).click();
}

async function addTwoPizzasAndCheckout(page: Page) {
  await page.getByRole('combobox').selectOption('4');
  await page.getByRole('button', { name: /Veggie/ }).click();
  await page.getByRole('button', { name: /Pepperoni/ }).click();
  await expect(page.locator('form')).toContainText('Selected pizzas: 2');
  await page.getByRole('button', { name: 'Checkout' }).click();
}

test.describe('public pages', () => {
  test('home page', async ({ page }) => {
    await mockBackend(page);
    await page.goto('/');

    expect(await page.title()).toBe('JWT Pizza');
    await expect(page.getByRole('button', { name: 'Order now' })).toBeVisible();
  });

  test('order now button opens the menu', async ({ page }) => {
    await mockBackend(page);
    await page.goto('/');
    await page.getByRole('button', { name: 'Order now' }).click();

    await expect(page).toHaveURL(/\/menu$/);
    await expect(page.locator('h2')).toContainText('Awesome is a click away');
  });

  test('footer links navigate to about and history', async ({ page }) => {
    await mockBackend(page);
    await page.goto('/');

    await page.getByRole('link', { name: 'About' }).click();
    await expect(page).toHaveURL(/\/about$/);
    await expect(page.getByRole('main')).toContainText('The secret sauce');

    await page.getByRole('link', { name: 'History' }).click();
    await expect(page).toHaveURL(/\/history$/);
    await expect(page.getByRole('main')).toContainText('Mama Rucci, my my');
  });

  test('unknown route shows not found', async ({ page }) => {
    await mockBackend(page);
    await page.goto('/this/does/not/exist');

    await expect(page.getByRole('main')).toContainText('Oops');
  });

  test('service docs', async ({ page }) => {
    await mockBackend(page);
    await page.goto('/docs/service');

    await expect(page.getByRole('main')).toContainText('[GET] /api/test');
    await expect(page.getByRole('main')).toContainText('A mocked endpoint');
  });

  test('factory docs', async ({ page }) => {
    await mockBackend(page);
    await page.goto('/docs/factory');

    await expect(page.getByRole('main')).toContainText('[GET] /api/test');
  });
});

test.describe('authentication', () => {
  test('login', async ({ page }) => {
    await mockBackend(page);
    await page.goto('/');
    await page.getByRole('link', { name: 'Login' }).click();
    await expect(page.getByRole('main')).toContainText('Welcome back');
    await login(page, 'd@jwt.com', 'a');

    await expect(page.getByRole('link', { name: 'KC' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Login' })).toBeHidden();
    await expect(page.getByRole('link', { name: 'Logout' })).toBeVisible();
  });

  test('login with bad credentials shows an error', async ({ page }) => {
    await mockBackend(page);
    await page.goto('/login');
    await login(page, 'd@jwt.com', 'wrong');

    await expect(page.getByRole('main')).toContainText('unknown user');
    await expect(page.getByRole('link', { name: 'KC' })).toBeHidden();
  });

  test('register', async ({ page }) => {
    await mockBackend(page);
    await page.goto('/');
    await page.getByRole('link', { name: 'Register' }).click();
    await expect(page.getByRole('main')).toContainText('Welcome to the party');
    await page.getByPlaceholder('Full name').fill('Pizza Lover');
    await page.getByPlaceholder('Email address').fill('lover@jwt.com');
    await page.getByPlaceholder('Password').fill('secret');
    await page.getByRole('button', { name: 'Register' }).click();

    await expect(page.getByRole('link', { name: 'PL' })).toBeVisible();
  });

  test('register with an existing email shows an error', async ({ page }) => {
    await mockBackend(page);
    await page.goto('/register');
    await page.getByPlaceholder('Full name').fill('Kai Chen');
    await page.getByPlaceholder('Email address').fill('d@jwt.com');
    await page.getByPlaceholder('Password').fill('a');
    await page.getByRole('button', { name: 'Register' }).click();

    await expect(page.getByRole('main')).toContainText('user already exists');
  });

  test('switch between login and register', async ({ page }) => {
    await mockBackend(page);
    await page.goto('/login');
    await page.getByRole('main').getByText('Register', { exact: true }).click();
    await expect(page).toHaveURL(/\/register$/);
    await page.getByRole('main').getByText('Login', { exact: true }).click();
    await expect(page).toHaveURL(/\/login$/);
  });

  test('logout', async ({ page }) => {
    await mockBackend(page, { loggedInAs: diner });
    await page.goto('/');
    await expect(page.getByRole('link', { name: 'KC' })).toBeVisible();
    await page.getByRole('link', { name: 'Logout' }).click();

    await expect(page).toHaveURL('/');
    await expect(page.getByRole('link', { name: 'Login' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'KC' })).toBeHidden();
  });
});

test.describe('ordering', () => {
  test('menu requires a store and pizza before checkout', async ({ page }) => {
    await mockBackend(page);
    await page.goto('/menu');

    await expect(page.getByRole('button', { name: 'Checkout' })).toBeDisabled();
    await expect(page.locator('form')).toContainText('What are you waiting for?');
    await page.getByRole('combobox').selectOption('4');
    await expect(page.getByRole('button', { name: 'Checkout' })).toBeDisabled();
    await page.getByRole('button', { name: /Margarita/ }).click();
    await expect(page.getByRole('button', { name: 'Checkout' })).toBeEnabled();
  });

  test('purchase with login', async ({ page }) => {
    await mockBackend(page);
    await page.goto('/');
    await page.getByRole('button', { name: 'Order now' }).click();
    await addTwoPizzasAndCheckout(page);

    // not logged in, so payment redirects to login
    await expect(page).toHaveURL(/\/payment\/login$/);
    await login(page, 'd@jwt.com', 'a');

    await expect(page).toHaveURL(/\/payment$/);
    await expect(page.getByRole('main')).toContainText('Send me those 2 pizzas right now!');
    await expect(page.locator('tbody')).toContainText('Veggie');
    await expect(page.locator('tbody')).toContainText('Pepperoni');
    await expect(page.locator('tfoot')).toContainText('2 pies');
    await expect(page.locator('tfoot')).toContainText('0.008 ₿');
    await page.getByRole('button', { name: 'Pay now' }).click();

    await expect(page).toHaveURL(/\/delivery$/);
    await expect(page.getByText('0.008')).toBeVisible();
    await expect(page.getByText('eyJpYXQ')).toBeVisible();
  });

  test('purchase a single pizza while logged in', async ({ page }) => {
    await mockBackend(page, { loggedInAs: diner });
    await page.goto('/menu');
    await page.getByRole('combobox').selectOption('7');
    await page.getByRole('button', { name: /Margarita/ }).click();
    await page.getByRole('button', { name: 'Checkout' }).click();

    await expect(page.getByRole('main')).toContainText('Send me that pizza right now!');
    await expect(page.locator('tfoot')).toContainText('1 pie');
    await page.getByRole('button', { name: 'Pay now' }).click();
    await expect(page).toHaveURL(/\/delivery$/);
  });

  test('cancel payment returns to the menu with the order intact', async ({ page }) => {
    await mockBackend(page, { loggedInAs: diner });
    await page.goto('/menu');
    await addTwoPizzasAndCheckout(page);
    await page.getByRole('button', { name: 'Cancel' }).click();

    await expect(page).toHaveURL(/\/menu$/);
    await expect(page.locator('form')).toContainText('Selected pizzas: 2');
  });

  test('verify a delivered pizza', async ({ page }) => {
    await mockBackend(page, { loggedInAs: diner });
    await page.goto('/menu');
    await addTwoPizzasAndCheckout(page);
    await page.getByRole('button', { name: 'Pay now' }).click();
    await page.getByRole('button', { name: 'Verify' }).click();

    await expect(page.getByRole('heading', { name: /JWT Pizza - valid/ })).toBeVisible();
    await expect(page.getByText('Test Vendor')).toBeVisible();
  });

  test('verify reports an invalid pizza', async ({ page }) => {
    await mockBackend(page, { loggedInAs: diner, invalidJwt: true });
    await page.goto('/menu');
    await addTwoPizzasAndCheckout(page);
    await page.getByRole('button', { name: 'Pay now' }).click();
    await page.getByRole('button', { name: 'Verify' }).click();

    await expect(page.getByRole('heading', { name: /JWT Pizza - invalid/ })).toBeVisible();
    await expect(page.getByText('bad pizza')).toBeVisible();
  });

  test('order more returns to the menu', async ({ page }) => {
    await mockBackend(page, { loggedInAs: diner });
    await page.goto('/menu');
    await addTwoPizzasAndCheckout(page);
    await page.getByRole('button', { name: 'Pay now' }).click();
    await page.getByRole('button', { name: 'Order more' }).click();

    await expect(page).toHaveURL(/\/menu$/);
  });
});

test.describe('diner dashboard', () => {
  test('shows user details and an empty history', async ({ page }) => {
    await mockBackend(page, { loggedInAs: diner });
    await page.goto('/');
    await page.getByRole('link', { name: 'KC' }).click();

    await expect(page).toHaveURL(/\/diner-dashboard$/);
    await expect(page.getByRole('main')).toContainText('Kai Chen');
    await expect(page.getByRole('main')).toContainText('d@jwt.com');
    await expect(page.getByRole('main')).toContainText('diner');
    await expect(page.getByRole('main')).toContainText('How have you lived this long without having a pizza?');
  });

  test('shows order history after a purchase', async ({ page }) => {
    await mockBackend(page, { loggedInAs: diner });
    await page.goto('/menu');
    await addTwoPizzasAndCheckout(page);
    await page.getByRole('button', { name: 'Pay now' }).click();
    await page.getByRole('link', { name: 'KC' }).click();

    await expect(page.getByRole('main')).toContainText('Here is your history of all the good times.');
    await expect(page.locator('tbody tr')).toHaveCount(1);
    await expect(page.locator('tbody')).toContainText('0.008 ₿');
  });

  test('shows franchisee role details', async ({ page }) => {
    await mockBackend(page, { loggedInAs: franchisee });
    await page.goto('/diner-dashboard');

    await expect(page.getByRole('main')).toContainText('Fran Chisee');
    await expect(page.getByRole('main')).toContainText('Franchisee on 2');
  });
});
