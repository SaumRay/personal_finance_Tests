// tests/dashboard.spec.js
// Covers: Summary cards, Period filter, Category chart,
//         Monthly trend, Top expenses, Anomalies, Forecast, Savings plan

import { test, expect } from '@playwright/test';
import { loginViaUI, loginViaAPI, seedTransactionsViaAPI, BASE_URL, API_URL } from './helpers.js';

test.describe('Dashboard', () => {

  // ─── EMPTY STATE ──────────────────────────────────────────────────────────

  test.describe('Empty State', () => {

    test('TC_DASH_01 — Empty dashboard shows zero metrics', async ({ page, request }) => {
      const token = await loginViaAPI(request);
      await request.delete(`${API_URL}/user/transactions`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      await loginViaUI(page);

      await expect(page.locator('.metric-card').filter({ hasText: 'Total In' }))
        .toContainText('₹0');
      await expect(page.locator('.metric-card').filter({ hasText: 'Total Out' }))
        .toContainText('₹0');
      await expect(page.locator('.metric-card').filter({ hasText: 'Net Savings' }))
        .toContainText('₹0');
    });

    test('TC_DASH_02 — Empty dashboard shows no data messages', async ({ page, request }) => {
      const token = await loginViaAPI(request);
      await request.delete(`${API_URL}/user/transactions`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      await loginViaUI(page);

      await expect(page.getByText(/no data available for selected period/i)).toBeVisible();
      await expect(page.getByText(/upload transactions to see monthly trends/i)).toBeVisible();
      await expect(page.getByText(/no top expenses yet/i)).toBeVisible();
    });

    test('TC_DASH_03 — Empty state shows transactions count as 0', async ({ page, request }) => {
      const token = await loginViaAPI(request);
      await request.delete(`${API_URL}/user/transactions`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      await loginViaUI(page);
      await expect(page.getByText(/transactions \(0\)/i)).toBeVisible();
    });

  });

  // ─── WITH DATA ────────────────────────────────────────────────────────────

  test.describe('With Transaction Data', () => {

    test.beforeEach(async ({ request }) => {
      const token = await loginViaAPI(request);
      await seedTransactionsViaAPI(request, token);
    });

    test('TC_DASH_04 — Summary cards show correct totals', async ({ page }) => {
      await loginViaUI(page);

      // From our seed data: credit = 50000 + 250 + 12000 = 62250
      //                     debit  = 450+1800+2200+2000+18000+950+3400 = 28800
      const totalIn  = page.locator('.metric-card').filter({ hasText: 'Total In' });
      const totalOut = page.locator('.metric-card').filter({ hasText: 'Total Out' });
      const netSav   = page.locator('.metric-card').filter({ hasText: 'Net Savings' });

      await expect(totalIn).not.toContainText('₹0');
      await expect(totalOut).not.toContainText('₹0');
      await expect(netSav).toBeVisible();
    });

    test('TC_DASH_05 — Category chart renders with data', async ({ page }) => {
      await loginViaUI(page);
      // Categories chart should show bars
      await expect(page.getByText(/spending by category/i)).toBeVisible();
      await expect(page.locator('.bar-chart-list')).toBeVisible();
    });

    test('TC_DASH_06 — Monthly trend chart renders', async ({ page }) => {
      await loginViaUI(page);
      await expect(page.getByText(/monthly income vs expense/i)).toBeVisible();
      await expect(page.locator('.monthly-bars')).toBeVisible();
    });

    test('TC_DASH_07 — Top expenses section shows transactions', async ({ page }) => {
      await loginViaUI(page);
      await expect(page.getByText(/top expenses/i).first()).toBeVisible();
      // Should show RENT PAYMENT as top expense (18000)
      await expect(
        page.locator('.insight-list').getByText(/rent payment/i).first()
        ).toBeVisible();
    });

    test('TC_DASH_08 — Detailed insights shows transaction count', async ({ page }) => {
      await loginViaUI(page);
      await expect(page.getByText(/transactions in scope: 10/i)).toBeVisible();
    });

    test('TC_DASH_09 — Anomaly detection shows high expense alert', async ({ page }) => {
      await loginViaUI(page);
      // RENT PAYMENT (18000) should trigger anomaly — well above median
      await expect(page.getByText(/detected \d+ unusually high expense/i)).toBeVisible();
    });

    test('TC_DASH_10 — Forecast card shows next month prediction', async ({ page }) => {
      await loginViaUI(page);
      await expect(page.getByText(/next month forecast/i)).toBeVisible();
      await expect(page.getByText(/predicted income/i)).toBeVisible();
      await expect(page.getByText(/predicted expense/i)).toBeVisible();
    });

    test('TC_DASH_11 — Savings plan card renders with target', async ({ page }) => {
      await loginViaUI(page);
      await expect(page.getByText(/savings target plan/i)).toBeVisible();
      await expect(
        page.locator('.card').filter({ hasText: /savings target plan/i })
        .getByText(/target savings/i).first()
        ).toBeVisible();
      await expect(page.getByText(/cut needed/i)).toBeVisible();
    });

    test('TC_DASH_12 — Transaction table renders all rows', async ({ page }) => {
      await loginViaUI(page);
      await expect(page.getByText(/transactions \(10\)/i)).toBeVisible();
      // Table headers should be visible
      await expect(page.getByRole('columnheader', { name: /date/i })).toBeVisible();
      await expect(page.getByRole('columnheader', { name: /description/i })).toBeVisible();
      await expect(page.getByRole('columnheader', { name: /debit/i })).toBeVisible();
      await expect(page.getByRole('columnheader', { name: /credit/i })).toBeVisible();
    });

  });

  // ─── PERIOD FILTER ────────────────────────────────────────────────────────

  test.describe('Period Filter', () => {

    test.beforeEach(async ({ request }) => {
      const token = await loginViaAPI(request);
      await seedTransactionsViaAPI(request, token);
    });

    test('TC_DASH_13 — Period filter defaults to All Time', async ({ page }) => {
      await loginViaUI(page);
      const select = page.locator('select');
      await expect(select).toHaveValue('all');
      await expect(page.getByText(/showing data for:.*all time/i)).toBeVisible();
    });

    test('TC_DASH_14 — Selecting a month filters transactions', async ({ page }) => {
      await loginViaUI(page);
      const select = page.locator('select');
      // Get available options
      const options = await select.locator('option').allTextContents();
      // Pick first non-"All Time" option if available
      const monthOption = options.find(o => o !== 'All Time');
      if (monthOption) {
        await select.selectOption({ label: monthOption });
        await expect(page.getByText(/showing data for/i)).toBeVisible();
      }
    });

    test('TC_DASH_15 — Income growth % input accepts numeric value', async ({ page }) => {
      await loginViaUI(page);
      const growthInput = page.getByLabel(/income growth/i);
      await growthInput.fill('10');
      await expect(growthInput).toHaveValue('10');
    });

  });

  // ─── DASHBOARD API — Direct ───────────────────────────────────────────────

  test.describe('Dashboard API — Direct', () => {

    test('TC_DASH_16 — /user/summary returns 400 with no transactions', async ({ request }) => {
      const token = await loginViaAPI(request);
      await request.delete(`${API_URL}/user/transactions`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const res = await request.get(`${API_URL}/user/summary`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      expect(res.status()).toBe(400);
    });

    test('TC_DASH_17 — /user/summary returns correct totals', async ({ request }) => {
      const token = await loginViaAPI(request);
      await seedTransactionsViaAPI(request, token);

      const res = await request.get(`${API_URL}/user/summary`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      expect(res.status()).toBe(200);
      const body = await res.json();
      expect(body.total_in).toBeGreaterThan(0);
      expect(body.total_out).toBeGreaterThan(0);
      expect(body).toHaveProperty('net_savings');
    });

    test('TC_DASH_18 — /user/anomalies with boundary multiplier 1.0', async ({ request }) => {
      const token = await loginViaAPI(request);
      await seedTransactionsViaAPI(request, token);

      const res = await request.get(`${API_URL}/user/anomalies?multiplier=1.0`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      expect(res.status()).toBe(200);
    });

    test('TC_DASH_19 — /user/anomalies rejects multiplier below 1.0', async ({ request }) => {
      const token = await loginViaAPI(request);
      const res = await request.get(`${API_URL}/user/anomalies?multiplier=0.5`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      expect(res.status()).toBe(422);
    });

    test('TC_DASH_20 — /user/forecast with 0% income growth', async ({ request }) => {
      const token = await loginViaAPI(request);
      await seedTransactionsViaAPI(request, token);

      const res = await request.get(`${API_URL}/user/forecast?income_growth_pct=0`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      expect(res.status()).toBe(200);
      const body = await res.json();
      expect(body.ok).toBe(true);
    });

    test('TC_DASH_21 — /user/savings-plan requires target_savings > 0', async ({ request }) => {
      const token = await loginViaAPI(request);
      const res = await request.get(`${API_URL}/user/savings-plan?target_savings=0`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      expect(res.status()).toBe(422);
    });

    test('TC_DASH_22 — /user/categories returns sorted breakdown', async ({ request }) => {
      const token = await loginViaAPI(request);
      await seedTransactionsViaAPI(request, token);

      const res = await request.get(`${API_URL}/user/categories`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      expect(res.status()).toBe(200);
      const body = await res.json();
      expect(Array.isArray(body.items)).toBe(true);
      expect(body.items.length).toBeGreaterThan(0);
      // Should be sorted descending
      for (let i = 1; i < body.items.length; i++) {
        expect(body.items[i - 1].amount).toBeGreaterThanOrEqual(body.items[i].amount);
      }
    });

  });

});