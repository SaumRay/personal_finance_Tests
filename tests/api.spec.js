// tests/api.spec.js
// Covers: All FastAPI endpoints — auth, health, user routes
// Pure API tests — no browser required

import { test, expect } from '@playwright/test';
import { loginViaAPI, seedTransactionsViaAPI, API_URL, TEST_USER } from './helpers.js';

test.describe('API — Direct Endpoint Tests', () => {

  // ─── HEALTH ───────────────────────────────────────────────────────────────

  test.describe('Health', () => {

    test('TC_API_01 — /health returns status ok', async ({ request }) => {
      const res = await request.get(`${API_URL}/health`);
      expect(res.status()).toBe(200);
      const body = await res.json();
      expect(body.status).toBe('ok');
    });

  });

  // ─── AUTH ENDPOINTS ───────────────────────────────────────────────────────

  test.describe('Auth Endpoints', () => {

    test('TC_API_02 — /auth/login with valid credentials returns token', async ({ request }) => {
      const form = new URLSearchParams();
      form.set('username', TEST_USER.email);
      form.set('password', TEST_USER.password);

      const res = await request.post(`${API_URL}/auth/login`, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        data   : form.toString(),
      });
      expect(res.status()).toBe(200);
      const body = await res.json();
      expect(body.access_token).toBeTruthy();
      expect(body.token_type).toBe('bearer');
      expect(body.user.email).toBe(TEST_USER.email);
    });

    test('TC_API_03 — /auth/login with wrong password returns 401', async ({ request }) => {
      const form = new URLSearchParams();
      form.set('username', TEST_USER.email);
      form.set('password', 'completelywrongpassword');

      const res = await request.post(`${API_URL}/auth/login`, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        data   : form.toString(),
      });
      expect(res.status()).toBe(401);
    });

    test('TC_API_04 — /auth/login with non-existent email returns 401', async ({ request }) => {
      const form = new URLSearchParams();
      form.set('username', 'ghost@nowhere.com');
      form.set('password', 'somepassword123');

      const res = await request.post(`${API_URL}/auth/login`, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        data   : form.toString(),
      });
      expect(res.status()).toBe(401);
    });

    test('TC_API_05 — /auth/register with duplicate email returns 400', async ({ request }) => {
      const res = await request.post(`${API_URL}/auth/register`, {
        headers: { 'Content-Type': 'application/json' },
        data   : JSON.stringify({
          email    : TEST_USER.email,
          password : 'SomePass123',
          full_name: 'Duplicate',
        }),
      });
      expect(res.status()).toBe(400);
      const body = await res.json();
      expect(body.detail).toMatch(/already registered/i);
    });

    test('TC_API_06 — /auth/register with invalid email format returns 422', async ({ request }) => {
      const res = await request.post(`${API_URL}/auth/register`, {
        headers: { 'Content-Type': 'application/json' },
        data   : JSON.stringify({
          email    : 'notanemail',
          password : 'ValidPass123',
          full_name: 'Test',
        }),
      });
      expect(res.status()).toBe(422);
    });

  });

  // ─── USER ENDPOINTS ───────────────────────────────────────────────────────

  test.describe('User Endpoints', () => {

    test('TC_API_07 — /user/me returns current user info', async ({ request }) => {
      const token = await loginViaAPI(request);
      const res = await request.get(`${API_URL}/user/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      expect(res.status()).toBe(200);
      const body = await res.json();
      expect(body.email).toBe(TEST_USER.email);
      expect(body).toHaveProperty('id');
    });

    test('TC_API_08 — /user/me returns 401 without token', async ({ request }) => {
      const res = await request.get(`${API_URL}/user/me`);
      expect(res.status()).toBe(401);
    });

    test('TC_API_09 — /user/me returns 401 with invalid token', async ({ request }) => {
      const res = await request.get(`${API_URL}/user/me`, {
        headers: { Authorization: 'Bearer invalidtoken123' },
      });
      expect(res.status()).toBe(401);
    });

    test('TC_API_10 — /user/settings GET returns default values', async ({ request }) => {
      const token = await loginViaAPI(request);
      const res = await request.get(`${API_URL}/user/settings`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      expect(res.status()).toBe(200);
      const body = await res.json();
      expect(body).toHaveProperty('default_target_savings');
      expect(body).toHaveProperty('default_income_growth_pct');
      expect(body).toHaveProperty('ollama_model');
    });

    test('TC_API_11 — /user/transactions returns items array', async ({ request }) => {
      const token = await loginViaAPI(request);
      const res = await request.get(`${API_URL}/user/transactions`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      expect(res.status()).toBe(200);
      const body = await res.json();
      expect(Array.isArray(body.items)).toBe(true);
      expect(typeof body.count).toBe('number');
    });

    test('TC_API_12 — /user/transactions limit param works', async ({ request }) => {
      const token = await loginViaAPI(request);
      await seedTransactionsViaAPI(request, token);

      const res = await request.get(`${API_URL}/user/transactions?limit=3`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      expect(res.status()).toBe(200);
      const body = await res.json();
      expect(body.items.length).toBeLessThanOrEqual(3);
    });

    test('TC_API_13 — /user/top-expenses returns sorted results', async ({ request }) => {
      const token = await loginViaAPI(request);
      await seedTransactionsViaAPI(request, token);

      const res = await request.get(`${API_URL}/user/top-expenses?limit=5`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      expect(res.status()).toBe(200);
      const body = await res.json();
      expect(Array.isArray(body.items)).toBe(true);
      // Verify sorted descending
      for (let i = 1; i < body.items.length; i++) {
        expect(body.items[i - 1].amount).toBeGreaterThanOrEqual(body.items[i].amount);
      }
    });

    test('TC_API_14 — /user/monthly returns monthly breakdown', async ({ request }) => {
      const token = await loginViaAPI(request);
      await seedTransactionsViaAPI(request, token);

      const res = await request.get(`${API_URL}/user/monthly`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      expect(res.status()).toBe(200);
      const body = await res.json();
      expect(Array.isArray(body.items)).toBe(true);
      body.items.forEach(item => {
        expect(item).toHaveProperty('month');
        expect(item).toHaveProperty('total_in');
        expect(item).toHaveProperty('total_out');
        expect(item).toHaveProperty('net_savings');
      });
    });

    test('TC_API_15 — /user/forecast boundary: income_growth_pct=-100', async ({ request }) => {
      const token = await loginViaAPI(request);
      await seedTransactionsViaAPI(request, token);

      const res = await request.get(
        `${API_URL}/user/forecast?income_growth_pct=-100`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      expect(res.status()).toBe(200);
    });

    test('TC_API_16 — /user/forecast boundary: income_growth_pct=200', async ({ request }) => {
      const token = await loginViaAPI(request);
      await seedTransactionsViaAPI(request, token);

      const res = await request.get(
        `${API_URL}/user/forecast?income_growth_pct=200`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      expect(res.status()).toBe(200);
    });

    test('TC_API_17 — /user/forecast rejects income_growth_pct > 200', async ({ request }) => {
      const token = await loginViaAPI(request);
      const res = await request.get(
        `${API_URL}/user/forecast?income_growth_pct=201`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      expect(res.status()).toBe(422);
    });

    test('TC_API_18 — /user/savings-plan with valid target returns plan', async ({ request }) => {
      const token = await loginViaAPI(request);
      await seedTransactionsViaAPI(request, token);

      const res = await request.get(
        `${API_URL}/user/savings-plan?target_savings=50000`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      expect(res.status()).toBe(200);
      const body = await res.json();
      expect(body.ok).toBe(true);
      expect(body).toHaveProperty('cut_needed');
      expect(body).toHaveProperty('suggested_category_plan');
    });

  });

});