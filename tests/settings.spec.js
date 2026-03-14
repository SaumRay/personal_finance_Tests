// tests/settings.spec.js
// Covers: Save settings, Target savings, Clear history, Download reports

import { test, expect } from '@playwright/test';
import { loginViaUI, loginViaAPI, seedTransactionsViaAPI, BASE_URL, API_URL } from './helpers.js';

test.describe('Settings & Reports', () => {

  // ─── SETTINGS ─────────────────────────────────────────────────────────────

  test.describe('Save Settings', () => {

    test('TC_SET_01 — Save Settings button is visible', async ({ page }) => {
      await loginViaUI(page);
      await expect(page.getByRole('button', { name: /save settings/i })).toBeVisible();
    });

    test('TC_SET_02 — Target savings input accepts value', async ({ page }) => {
      await loginViaUI(page);
      const input = page.getByLabel(/target savings/i);
      await input.fill('75000');
      await expect(input).toHaveValue('75000');
    });

    test('TC_SET_03 — Saving settings shows confirmation message', async ({ page }) => {
      await loginViaUI(page);
      await page.getByLabel(/target savings/i).fill('60000');
      await page.getByRole('button', { name: /save settings/i }).click();
      await expect(page.getByText(/settings saved/i)).toBeVisible({ timeout: 8000 });
    });

    test('TC_SET_04 — Settings persist after page reload', async ({ page, request }) => {
    // Save via API directly — more reliable than UI for persistence test
      const token = await loginViaAPI(request);
      await request.put(`${API_URL}/user/settings`, {
      headers: {
       Authorization : `Bearer ${token}`,
       'Content-Type': 'application/json',
      },
      data: JSON.stringify({ default_target_savings: 80000 }),
    });

    // Now login fresh and verify the value loaded from backend
      await loginViaUI(page);
      await expect(page.getByLabel(/target savings/i)).toHaveValue('80000');
    });

    test('TC_SET_05 — Settings API returns updated values', async ({ request }) => {
      const token = await loginViaAPI(request);
      const res = await request.put(`${API_URL}/user/settings`, {
        headers: {
          Authorization : `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        data: JSON.stringify({
          default_target_savings    : 90000,
          default_income_growth_pct : 7,
          ollama_model              : 'llama3.2:3b',
        }),
      });
      expect(res.status()).toBe(200);
      const body = await res.json();
      expect(body.ok).toBe(true);
      expect(body.default_target_savings).toBe(90000);
    });

    test('TC_SET_06 — Settings API returns 401 without token', async ({ request }) => {
      const res = await request.put(`${API_URL}/user/settings`, {
        headers: { 'Content-Type': 'application/json' },
        data   : JSON.stringify({ default_target_savings: 50000 }),
      });
      expect(res.status()).toBe(401);
    });

  });

  // ─── CLEAR HISTORY ────────────────────────────────────────────────────────

  test.describe('Clear History', () => {

    test('TC_SET_07 — Clear History button is visible', async ({ page }) => {
      await loginViaUI(page);
      await expect(page.getByRole('button', { name: /clear history/i })).toBeVisible();
    });

    test('TC_SET_08 — Clear history resets dashboard to zero', async ({ page, request }) => {
      const token = await loginViaAPI(request);
      await seedTransactionsViaAPI(request, token);

      await loginViaUI(page);
      // Confirm data is loaded
      await expect(page.getByText(/transactions \(10\)/i)).toBeVisible();

      await page.getByRole('button', { name: /clear history/i }).click();
      await expect(page.getByText(/transaction history cleared/i)).toBeVisible({ timeout: 8000 });
      await expect(page.getByText(/transactions \(0\)/i)).toBeVisible();
    });

    test('TC_SET_09 — Clear transactions API deletes all records', async ({ request }) => {
      const token = await loginViaAPI(request);
      await seedTransactionsViaAPI(request, token);

      const deleteRes = await request.delete(`${API_URL}/user/transactions`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      expect(deleteRes.status()).toBe(200);

      // Verify empty
      const getRes = await request.get(`${API_URL}/user/transactions`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const body = await getRes.json();
      expect(body.count).toBe(0);
    });

  });

  // ─── REPORTS ──────────────────────────────────────────────────────────────

  test.describe('Download Reports', () => {

    test.beforeEach(async ({ request }) => {
      const token = await loginViaAPI(request);
      await seedTransactionsViaAPI(request, token);
    });

    test('TC_SET_10 — Download CSV button is visible', async ({ page }) => {
      await loginViaUI(page);
      await expect(page.getByRole('button', { name: /download csv/i })).toBeVisible();
    });

    test('TC_SET_11 — Download PDF Report button is visible', async ({ page }) => {
      await loginViaUI(page);
      await expect(page.getByRole('button', { name: /download full pdf report/i })).toBeVisible();
    });

    test('TC_SET_12 — CSV report API returns valid CSV content', async ({ request }) => {
      const token = await loginViaAPI(request);
      const res = await request.get(`${API_URL}/user/reports/transactions.csv`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      expect(res.status()).toBe(200);
      expect(res.headers()['content-type']).toContain('text/csv');

      const text = await res.text();
      // Should contain CSV headers
      expect(text).toContain('date');
      expect(text).toContain('description');
      expect(text).toContain('debit');
      expect(text).toContain('credit');
    });

    test('TC_SET_13 — PDF report API returns PDF content type', async ({ request }) => {
      const token = await loginViaAPI(request);
      const res = await request.get(`${API_URL}/user/reports/summary.pdf`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      expect(res.status()).toBe(200);
      expect(res.headers()['content-type']).toContain('application/pdf');
    });

    test('TC_SET_14 — CSV report API returns 401 without token', async ({ request }) => {
      const res = await request.get(`${API_URL}/user/reports/transactions.csv`);
      expect(res.status()).toBe(401);
    });

    test('TC_SET_15 — PDF report API returns 400 with no transactions', async ({ request }) => {
      const token = await loginViaAPI(request);
      await request.delete(`${API_URL}/user/transactions`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const res = await request.get(`${API_URL}/user/reports/summary.pdf`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      expect(res.status()).toBe(400);
    });

  });

});