// tests/upload.spec.js
// Covers: CSV upload, Text upload — happy paths + all edge cases

import { test, expect } from '@playwright/test';
import { loginViaUI, loginViaAPI, BASE_URL, API_URL } from './helpers.js';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import os from 'os';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ── CSV helpers ────────────────────────────────────────────────────────────

function writeTempCsv(filename, content) {
  const filePath = path.join(os.tmpdir(), filename);
  fs.writeFileSync(filePath, content);
  return filePath;
}

const VALID_CSV = `date,description,debit,credit,balance,transaction_type,reference
01/02/2026,UPI SWIGGY FOOD,450.00,0.00,12500.00,DEBIT,TXN001
05/02/2026,SALARY CREDIT,0.00,50000.00,60700.00,CREDIT,TXN003
15/02/2026,RENT PAYMENT,18000.00,0.00,38750.00,DEBIT,TXN007`;

const MISSING_COLUMNS_CSV = `amount,narration
450.00,Swiggy
1800.00,Electricity`;

const EMPTY_CSV = `date,description,debit,credit,balance,transaction_type,reference`;

const VALID_STATEMENT_TEXT = `01/02/2026 UPI SWIGGY FOOD DR 450.00 12500.00
05/02/2026 SALARY CREDIT CR 50000.00 60700.00
15/02/2026 RENT PAYMENT DR 18000.00 38750.00`;

const MALFORMED_TEXT = `no dates here at all
just random lines of text
nothing parseable as transactions`;

// ── Tests ──────────────────────────────────────────────────────────────────

test.describe('Upload', () => {

  test.beforeEach(async ({ request }) => {
    // Clear transactions before each upload test for isolation
    const token = await loginViaAPI(request);
    await request.delete(`${API_URL}/user/transactions`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  });

  // ─── CSV UPLOAD ───────────────────────────────────────────────────────────

  test.describe('CSV Upload', () => {

    test('TC_UPLOAD_01 — Valid CSV uploads and shows success message', async ({ page }) => {
      await loginViaUI(page);

      const csvPath = writeTempCsv('valid_test.csv', VALID_CSV);
      const fileInput = page.locator('input[type="file"]');
      await fileInput.setInputFiles(csvPath);

      await page.getByRole('button', { name: /upload csv/i }).click();
      await expect(page.getByText(/inserted \d+ transactions/i)).toBeVisible({ timeout: 10000 });
    });

    test('TC_UPLOAD_02 — Valid CSV inserts correct transaction count', async ({ page }) => {
      await loginViaUI(page);

      const csvPath = writeTempCsv('valid_test2.csv', VALID_CSV);
      await page.locator('input[type="file"]').setInputFiles(csvPath);
      await page.getByRole('button', { name: /upload csv/i }).click();

      // VALID_CSV has 3 data rows
      await expect(page.getByText(/inserted 3 transactions/i)).toBeVisible({ timeout: 10000 });
    });

    test('TC_UPLOAD_03 — CSV missing required columns shows error', async ({ page }) => {
      await loginViaUI(page);

      const csvPath = writeTempCsv('missing_cols.csv', MISSING_COLUMNS_CSV);
      await page.locator('input[type="file"]').setInputFiles(csvPath);
      await page.getByRole('button', { name: /upload csv/i }).click();

      await expect(page.getByText(/upload failed/i)).toBeVisible({ timeout: 10000 });
    });

    test('TC_UPLOAD_04 — Empty CSV (headers only) shows 0 inserted', async ({ page }) => {
      await loginViaUI(page);

      const csvPath = writeTempCsv('empty.csv', EMPTY_CSV);
      await page.locator('input[type="file"]').setInputFiles(csvPath);
      await page.getByRole('button', { name: /upload csv/i }).click();

      await expect(page.getByText(/inserted 0 transactions/i)).toBeVisible({ timeout: 10000 });
    });

    test('TC_UPLOAD_05 — Upload CSV button disabled with no file selected', async ({ page }) => {
      await loginViaUI(page);
      const uploadBtn = page.getByRole('button', { name: /upload csv/i });
      await expect(uploadBtn).toBeDisabled();
    });

    test('TC_UPLOAD_06 — After CSV upload dashboard metrics update', async ({ page }) => {
      await loginViaUI(page);

      const csvPath = writeTempCsv('dashboard_test.csv', VALID_CSV);
      await page.locator('input[type="file"]').setInputFiles(csvPath);
      await page.getByRole('button', { name: /upload csv/i }).click();
      await expect(page.getByText(/inserted \d+ transactions/i)).toBeVisible({ timeout: 10000 });

      // Dashboard should now show non-zero values
      const totalIn = page.locator('.metric-card').filter({ hasText: 'Total In' });
      await expect(totalIn).not.toContainText('₹0');
    });

  });

  // ─── TEXT UPLOAD ──────────────────────────────────────────────────────────

  test.describe('Text Upload', () => {

    test('TC_UPLOAD_07 — Valid statement text uploads successfully', async ({ page }) => {
      await loginViaUI(page);

      await page.locator('textarea').fill(VALID_STATEMENT_TEXT);
      await page.getByRole('button', { name: /upload text/i }).click();
      await expect(page.getByText(/inserted \d+ transactions/i)).toBeVisible({ timeout: 10000 });
    });

    test('TC_UPLOAD_08 — Malformed text shows parsing error and tips', async ({ page }) => {
      await loginViaUI(page);

      await page.locator('textarea').fill(MALFORMED_TEXT);
      await page.getByRole('button', { name: /upload text/i }).click();

      await expect(page.getByText(/upload failed/i)).toBeVisible({ timeout: 10000 });
      // Tips section should appear
      await expect(page.getByText(/parsing tips/i)).toBeVisible();
    });

    test('TC_UPLOAD_09 — Empty textarea keeps Upload Text button disabled', async ({ page }) => {
      await loginViaUI(page);
      const uploadTextBtn = page.getByRole('button', { name: /upload text/i });
      await expect(uploadTextBtn).toBeDisabled();
    });

    test('TC_UPLOAD_10 — Text upload button enabled after typing', async ({ page }) => {
      await loginViaUI(page);
      await page.locator('textarea').fill('some text');
      const uploadTextBtn = page.getByRole('button', { name: /upload text/i });
      await expect(uploadTextBtn).toBeEnabled();
    });

    test('TC_UPLOAD_11 — Textarea clears after successful text upload', async ({ page }) => {
      await loginViaUI(page);
      await page.locator('textarea').fill(VALID_STATEMENT_TEXT);
      await page.getByRole('button', { name: /upload text/i }).click();
      await expect(page.getByText(/inserted \d+ transactions/i)).toBeVisible({ timeout: 10000 });
      // Textarea should be cleared
      await expect(page.locator('textarea')).toHaveValue('');
    });

  });

  // ─── API UPLOAD (Direct) ──────────────────────────────────────────────────

  test.describe('Upload API — Direct', () => {

    test('TC_UPLOAD_12 — CSV upload API returns 401 without token', async ({ request }) => {
      const csv = Buffer.from(VALID_CSV);
      const res = await request.post(`${API_URL}/user/upload-csv`, {
        multipart: {
          file: { name: 'test.csv', mimeType: 'text/csv', buffer: csv },
        },
      });
      expect(res.status()).toBe(401);
    });

    test('TC_UPLOAD_13 — Text upload API returns 400 for empty text', async ({ request }) => {
      const token = await loginViaAPI(request);
      const res = await request.post(`${API_URL}/user/upload-text`, {
        headers: {
          Authorization : `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        data: JSON.stringify({ text: '' }),
      });
      expect(res.status()).toBe(400);
    });

    test('TC_UPLOAD_14 — Text upload API returns 400 for unparseable text', async ({ request }) => {
      const token = await loginViaAPI(request);
      const res = await request.post(`${API_URL}/user/upload-text`, {
        headers: {
          Authorization : `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        data: JSON.stringify({ text: MALFORMED_TEXT }),
      });
      expect(res.status()).toBe(400);
      const body = await res.json();
      expect(body.detail.tips).toBeDefined();
    });

  });

});