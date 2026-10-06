import { Page, Route } from '@playwright/test';
import { Franchise, Role, User } from '../src/service/pizzaService';

export const diner: User = { id: '3', name: 'Kai Chen', email: 'd@jwt.com', password: 'a', roles: [{ role: Role.Diner }] };
export const admin: User = { id: '1', name: 'Admin Pizza', email: 'a@jwt.com', password: 'admin', roles: [{ role: Role.Admin }] };
export const franchisee: User = { id: '4', name: 'Fran Chisee', email: 'f@jwt.com', password: 'franchisee', roles: [{ role: Role.Diner }, { role: Role.Franchisee, objectId: '2' }] };

export const menu = [
  { id: 1, title: 'Veggie', image: 'pizza1.png', price: 0.0038, description: 'A garden of delight' },
  { id: 2, title: 'Pepperoni', image: 'pizza2.png', price: 0.0042, description: 'Spicy treat' },
  { id: 3, title: 'Margarita', image: 'pizza3.png', price: 0.0014, description: 'Essential classic' },
];

function initialFranchises(): Franchise[] {
  return [
    {
      id: '2',
      name: 'LotaPizza',
      admins: [{ email: 'f@jwt.com', id: '4', name: 'Fran Chisee' }],
      stores: [
        { id: '4', name: 'Lehi', totalRevenue: 0.5 },
        { id: '5', name: 'Springville', totalRevenue: 0.25 },
        { id: '6', name: 'American Fork', totalRevenue: 0.125 },
      ],
    },
    { id: '3', name: 'PizzaCorp', admins: [{ email: 'p@jwt.com' }], stores: [{ id: '7', name: 'Spanish Fork', totalRevenue: 1 }] },
    { id: '4', name: 'topSpot', admins: [{ email: 't@jwt.com' }], stores: [] },
    { id: '5', name: 'SlicePie', admins: [{ email: 's@jwt.com' }], stores: [] },
  ];
}

export interface MockOptions {
  /** User that is already logged in when the page loads (a token is placed in localStorage). */
  loggedInAs?: User;
  /** Extra users that can log in, in addition to diner, admin and franchisee. */
  users?: User[];
  /** Make POST /api/order/verify fail so the "bad pizza" path can be tested. */
  invalidJwt?: boolean;
}

/**
 * Mocks every JWT Pizza Service and Pizza Factory endpoint the frontend calls.
 * State (logged in user, franchises, orders) lives in this closure so a test can
 * create/close things and then see them reflected on later requests.
 */
export async function mockBackend(page: Page, options: MockOptions = {}) {
  const users: Record<string, User> = {};
  for (const u of [diner, admin, franchisee, ...(options.users ?? [])]) users[u.email!] = u;

  let loggedInUser: User | undefined = options.loggedInAs;
  let franchises = initialFranchises();
  let nextId = 100;
  const orders: any[] = [];

  if (options.loggedInAs) {
    await page.addInitScript(() => localStorage.setItem('token', 'abcdef'));
  }

  const json = (route: Route, body: any, status = 200) => route.fulfill({ status, json: body });

  await page.route((url) => url.pathname.startsWith('/api/'), async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    const method = req.method();
    const path = url.pathname;
    const body = method === 'GET' || method === 'DELETE' ? null : req.postDataJSON();

    // Auth
    if (path === '/api/auth') {
      if (method === 'PUT') {
        const user = users[body.email];
        if (!user || user.password !== body.password) return json(route, { message: 'unknown user' }, 404);
        loggedInUser = user;
        return json(route, { user, token: 'abcdef' });
      }
      if (method === 'POST') {
        if (users[body.email]) return json(route, { message: 'user already exists' }, 409);
        const user: User = { id: String(nextId++), name: body.name, email: body.email, password: body.password, roles: [{ role: Role.Diner }] };
        users[body.email] = user;
        loggedInUser = user;
        return json(route, { user, token: 'abcdef' });
      }
      if (method === 'DELETE') {
        loggedInUser = undefined;
        return json(route, { message: 'logout successful' });
      }
    }

    if (path === '/api/user/me') {
      return loggedInUser ? json(route, loggedInUser) : json(route, { message: 'unauthorized' }, 401);
    }

    // Orders
    if (path === '/api/order/menu') return json(route, menu);
    if (path === '/api/order/verify') {
      if (options.invalidJwt) return json(route, { message: 'invalid' }, 400);
      return json(route, { message: 'valid', payload: { vendor: { id: 'tester', name: 'Test Vendor' }, diner: loggedInUser?.name } });
    }
    if (path === '/api/order') {
      if (method === 'GET') return json(route, { id: 'order-history', dinerId: loggedInUser?.id, orders });
      const order = { ...body, id: nextId++, date: '2024-06-05T05:14:40.000Z' };
      orders.push(order);
      return json(route, { order, jwt: 'eyJpYXQ' });
    }

    // Franchises
    const storeMatch = path.match(/^\/api\/franchise\/(\w+)\/store(?:\/(\w+))?$/);
    if (storeMatch) {
      const franchise = franchises.find((f) => f.id === storeMatch[1]);
      if (!franchise) return json(route, { message: 'unknown franchise' }, 404);
      if (method === 'POST') {
        const store = { id: String(nextId++), name: body.name, totalRevenue: 0 };
        franchise.stores.push(store);
        return json(route, store);
      }
      franchise.stores = franchise.stores.filter((s) => s.id !== storeMatch[2]);
      return json(route, { message: 'store deleted' });
    }

    const franchiseMatch = path.match(/^\/api\/franchise\/(\w+)$/);
    if (franchiseMatch) {
      if (method === 'DELETE') {
        franchises = franchises.filter((f) => f.id !== franchiseMatch[1]);
        return json(route, { message: 'franchise deleted' });
      }
      // GET: franchises administered by the given user id
      return json(route, franchises.filter((f) => f.admins?.some((a) => a.id === franchiseMatch[1])));
    }

    if (path === '/api/franchise') {
      if (method === 'POST') {
        const franchise = { id: String(nextId++), name: body.name, admins: body.admins, stores: [] };
        franchises.push(franchise);
        return json(route, franchise);
      }
      const page = Number(url.searchParams.get('page') ?? 0);
      const limit = Number(url.searchParams.get('limit') ?? 10);
      const filter = (url.searchParams.get('name') ?? '*').replace(/\*/g, '').toLowerCase();
      const matches = franchises.filter((f) => f.name.toLowerCase().includes(filter));
      const start = page * limit;
      return json(route, { franchises: matches.slice(start, start + limit), more: matches.length > start + limit });
    }

    // Docs
    if (path === '/api/docs') {
      return json(route, {
        endpoints: [{ requiresAuth: true, method: 'GET', path: '/api/test', description: 'A mocked endpoint', example: 'curl localhost/api/test', response: { ok: true } }],
      });
    }

    return json(route, { message: `unmocked endpoint ${method} ${path}` }, 404);
  });
}
