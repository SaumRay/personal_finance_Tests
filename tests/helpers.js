// tests/helpers.js
// Shared utilities used across all test files

import { expect } from '@playwright/test';

export const BASE_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
export const API_URL  = process.env.API_URL      || 'http://127.0.0.1:8000';

export const TEST_USER = {
  email   : process.env.TEST_EMAIL    || 'test@example.com',
  password: process.env.TEST_PASSWORD || 'password123',
};

const randomSuffix = Math.random().toString(36).substring(2, 8);

export const NEW_USER = {
  email   : `testuser_${randomSuffix}@gmail.com`,
  password: process.env.TEST_REGISTER_PASSWORD || 'TestPass@1234',
  name    : process.env.TEST_REGISTER_NAME     || 'Playwright Tester',
};

/**
 * Log in via the UI and wait for the dashboard to appear.
 * Returns the page for chaining.
 */
export async function loginViaUI(page, email = TEST_USER.email, password = TEST_USER.password) {
  await page.goto(BASE_URL);
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').first().fill(password);
  await page.getByRole('button', { name: /login/i }).click();
  // Dashboard landmark — nav tab "Home" becomes visible
  await expect(page.getByRole('button', { name: /home/i })).toBeVisible({ timeout: 10000 });
}

/**
 * Log in via the API directly and return the JWT token.
 * Faster than UI login — use for tests that don't test auth itself.
 */
export async function loginViaAPI(request, email = TEST_USER.email, password = TEST_USER.password) {
  const form = new URLSearchParams();
  form.set('username', email);
  form.set('password', password);

  const res = await request.post(`${API_URL}/auth/login`, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    data   : form.toString(),
  });
  expect(res.status()).toBe(200);
  const body = await res.json();
  expect(body.access_token).toBeTruthy();
  return body.access_token;
}

/**
 * Upload the demo CSV fixture via API (bypasses UI for speed).
 * Clears existing transactions first so tests are isolated.
 */
export async function seedTransactionsViaAPI(request, token) {
  // Clear first
  await request.delete(`${API_URL}/user/transactions`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  const csv = `date,description,debit,credit,balance,transaction_type,reference
01/02/2026,UPI SWIGGY FOOD,450.00,0.00,12500.00,DEBIT,TXN001
03/02/2026,ELECTRICITY BILL PAYMENT,1800.00,0.00,10700.00,DEBIT,TXN002
05/02/2026,SALARY CREDIT,0.00,50000.00,60700.00,CREDIT,TXN003
06/02/2026,UPI GROCERIES,2200.00,0.00,58500.00,DEBIT,TXN004
09/02/2026,ATM CASH WITHDRAWAL,2000.00,0.00,56500.00,DEBIT,TXN005
12/02/2026,INTEREST CREDIT,0.00,250.00,56750.00,CREDIT,TXN006
15/02/2026,RENT PAYMENT,18000.00,0.00,38750.00,DEBIT,TXN007
18/02/2026,UPI RESTAURANT,950.00,0.00,37800.00,DEBIT,TXN008
21/02/2026,FREELANCE CREDIT,0.00,12000.00,49800.00,CREDIT,TXN009
24/02/2026,ONLINE SHOPPING,3400.00,0.00,46400.00,DEBIT,TXN010`;

  const formData = new FormData();
  formData.append('file', new Blob([csv], { type: 'text/csv' }), 'transactions.csv');

  const res = await request.post(`${API_URL}/user/upload-csv`, {
    headers  : { Authorization: `Bearer ${token}` },
    multipart: {
      file: {
        name    : 'transactions.csv',
        mimeType: 'text/csv',
        buffer  : Buffer.from(csv),
      },
    },
  });
  expect(res.status()).toBe(200);
}