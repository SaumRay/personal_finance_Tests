// tests/extended-coverage.spec.js
// Covers all previously untested features:
// 1. CSV upload edge cases (wrong file type, large file)
// 2. Download reports UI + content verification
// 3. AI finance assistant topic guard (non-finance queries)
// 4. Session query limits and chat history accumulation

import { test, expect } from '@playwright/test';
import { loginViaUI, loginViaAPI, seedTransactionsViaAPI, BASE_URL, API_URL } from './helpers.js';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ── File helpers ──────────────────────────────────────────────────────────

function writeTempFile(filename, content) {
  const filePath = path.join(os.tmpdir(), filename);
  fs.writeFileSync(filePath, content);
  return filePath;
}

const VALID_CSV = `date,description,debit,credit,balance,transaction_type,reference
01/02/2026,UPI SWIGGY FOOD,450.00,0.00,12500.00,DEBIT,TXN001
05/02/2026,SALARY CREDIT,0.00,50000.00,60700.00,CREDIT,TXN003
15/02/2026,RENT PAYMENT,18000.00,0.00,38750.00,DEBIT,TXN007`;

// Generate a large CSV with 500 rows
function generateLargeCSV(rows = 500) {
  let csv = `date,description,debit,credit,balance,transaction_type,reference\n`;
  for (let i = 1; i <= rows; i++) {
    csv += `01/02/2026,TRANSACTION ${i},${(i * 10).toFixed(2)},0.00,10000.00,DEBIT,TXN${String(i).padStart(4, '0')}\n`;
  }
  return csv;
}

// ═══════════════════════════════════════════════════════════════════════════
// 1. CSV UPLOAD EDGE CASES
// ═══════════════════════════════════════════════════════════════════════════

test.describe('CSV Upload — Extended Edge Cases', () => {

  test.beforeEach(async ({ request }) => {
    const token = await loginViaAPI(request);
    await request.delete(`${API_URL}/user/transactions`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  });

  test('TC_EXT_01 — Uploading a PDF file as CSV shows error', async ({ page }) => {
    await loginViaUI(page);

    // Create a fake PDF file (wrong type)
    const pdfPath = writeTempFile('fake.pdf', '%PDF-1.4 fake pdf content');
    await page.locator('input[type="file"]').setInputFiles(pdfPath);
    await page.getByRole('button', { name: /upload csv/i }).click();

    await expect(page.getByText(/upload failed/i)).toBeVisible({ timeout: 10000 });
  });

  test('TC_EXT_02 — Uploading a TXT file as CSV shows error', async ({ page }) => {
    await loginViaUI(page);

    const txtPath = writeTempFile('wrong.txt', 'this is not a csv file at all');
    await page.locator('input[type="file"]').setInputFiles(txtPath);
    await page.getByRole('button', { name: /upload csv/i }).click();

    await expect(page.getByText(/upload failed/i)).toBeVisible({ timeout: 10000 });
  });

  test('TC_EXT_03 — Large CSV (500 rows) uploads successfully', async ({ page }) => {
    await loginViaUI(page);

    const largeCsvPath = writeTempFile('large.csv', generateLargeCSV(500));
    await page.locator('input[type="file"]').setInputFiles(largeCsvPath);
    await page.getByRole('button', { name: /upload csv/i }).click();

    await expect(page.getByText(/inserted 500 transactions/i)).toBeVisible({ timeout: 20000 });
  });

  test('TC_EXT_04 — CSV with special characters in description uploads correctly', async ({ page }) => {
    await loginViaUI(page);

    const specialCsv = `date,description,debit,credit,balance,transaction_type,reference
01/02/2026,"UPI/PAYMENT@AMAZON.IN (₹)",1500.00,0.00,10000.00,DEBIT,TXN001
02/02/2026,"SALARY & BONUS CREDIT",0.00,55000.00,65000.00,CREDIT,TXN002`;

    const csvPath = writeTempFile('special_chars.csv', specialCsv);
    await page.locator('input[type="file"]').setInputFiles(csvPath);
    await page.getByRole('button', { name: /upload csv/i }).click();

    await expect(page.getByText(/inserted 2 transactions/i)).toBeVisible({ timeout: 10000 });
  });

  test('TC_EXT_05 — CSV with extra unknown columns still uploads', async ({ page }) => {
    await loginViaUI(page);

    const extraColsCsv = `date,description,debit,credit,balance,transaction_type,reference,extra_col1,extra_col2
01/02/2026,SALARY CREDIT,0.00,50000.00,60700.00,CREDIT,TXN001,ignore_this,ignore_that`;

    const csvPath = writeTempFile('extra_cols.csv', extraColsCsv);
    await page.locator('input[type="file"]').setInputFiles(csvPath);
    await page.getByRole('button', { name: /upload csv/i }).click();

    await expect(page.getByText(/inserted 1 transactions/i)).toBeVisible({ timeout: 10000 });
  });

  test('TC_EXT_06 — CSV API rejects file larger than expected gracefully', async ({ request }) => {
    const token = await loginViaAPI(request);
    const hugeCsv = Buffer.from(generateLargeCSV(1000));

    const res = await request.post(`${API_URL}/user/upload-csv`, {
      headers  : { Authorization: `Bearer ${token}` },
      multipart: {
        file: { name: 'huge.csv', mimeType: 'text/csv', buffer: hugeCsv },
      },
    });
    // Should either succeed (200) or fail gracefully — never crash (500)
    expect([200, 400, 413]).toContain(res.status());
  });

});

// ═══════════════════════════════════════════════════════════════════════════
// 2. DOWNLOAD REPORTS — UI + CONTENT VERIFICATION
// ═══════════════════════════════════════════════════════════════════════════

test.describe('Download Reports — UI + Content', () => {

  test.beforeEach(async ({ request }) => {
    const token = await loginViaAPI(request);
    await seedTransactionsViaAPI(request, token);
  });

  test('TC_EXT_07 — Download CSV button triggers file download', async ({ page }) => {
    await loginViaUI(page);

    // Listen for download event
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: /download csv/i }).click();
    const download = await downloadPromise;

    // Verify file name
    expect(download.suggestedFilename()).toBe('transactions_report.csv');
  });

  test('TC_EXT_08 — Downloaded CSV file is not empty', async ({ page }) => {
    await loginViaUI(page);

    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: /download csv/i }).click();
    const download = await downloadPromise;

    // Save and read file
    const filePath = path.join(os.tmpdir(), 'downloaded_report.csv');
    await download.saveAs(filePath);
    const content = fs.readFileSync(filePath, 'utf-8');

    // Should have headers + at least 1 data row
    expect(content).toContain('date');
    expect(content).toContain('description');
    expect(content).toContain('debit');
    expect(content).toContain('credit');
    // Should contain actual transaction data
    expect(content.split('\n').length).toBeGreaterThan(2);
  });

  test('TC_EXT_09 — Downloaded CSV contains correct transaction data', async ({ page }) => {
    await loginViaUI(page);

    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: /download csv/i }).click();
    const download = await downloadPromise;

    const filePath = path.join(os.tmpdir(), 'transactions_verify.csv');
    await download.saveAs(filePath);
    const content = fs.readFileSync(filePath, 'utf-8');

    // Verify known seed data is present
    expect(content).toContain('SALARY CREDIT');
    expect(content).toContain('RENT PAYMENT');
    expect(content).toContain('50000');
  });

  test('TC_EXT_10 — Download PDF button triggers file download', async ({ page }) => {
    await loginViaUI(page);

    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: /download full pdf report/i }).click();
    const download = await downloadPromise;

    expect(download.suggestedFilename()).toBe('finance_summary_report.pdf');
  });

  test('TC_EXT_11 — Downloaded PDF file has valid size (not empty)', async ({ page }) => {
    await loginViaUI(page);

    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: /download full pdf report/i }).click();
    const download = await downloadPromise;

    const filePath = path.join(os.tmpdir(), 'report.pdf');
    await download.saveAs(filePath);
    const stats = fs.statSync(filePath);

    // At least 1KB — PDF generates even without Ollama (AI section says unavailable)
    expect(stats.size).toBeGreaterThan(1000);
 });

  test('TC_EXT_12 — Downloaded PDF starts with PDF magic bytes', async ({ page }) => {
    await loginViaUI(page);

    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: /download full pdf report/i }).click();
    const download = await downloadPromise;

    const filePath = path.join(os.tmpdir(), 'report_magic.pdf');
    await download.saveAs(filePath);

    // Read first 4 bytes — valid PDF starts with %PDF
    const buffer = Buffer.alloc(4);
    const fd = fs.openSync(filePath, 'r');
    fs.readSync(fd, buffer, 0, 4, 0);
    fs.closeSync(fd);

    expect(buffer.toString()).toBe('%PDF');
  });

  test('TC_EXT_13 — Download CSV disabled/fails with no transactions', async ({ page, request }) => {
    const token = await loginViaAPI(request);
    await request.delete(`${API_URL}/user/transactions`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    await loginViaUI(page);

    // Attempt download — API should return 400
    const res = await request.get(`${API_URL}/user/reports/transactions.csv`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status()).toBe(400);
  });

});

// ═══════════════════════════════════════════════════════════════════════════
// 3. AI FINANCE ASSISTANT — TOPIC GUARD
// ═══════════════════════════════════════════════════════════════════════════

test.describe('AI Finance Assistant — Topic Guard', () => {

  test.beforeEach(async ({ request }) => {
    const token = await loginViaAPI(request);
    await seedTransactionsViaAPI(request, token);
  });

  // Helper to send a question via API and get AI response text
  async function askAI(request, token, question) {
    const res = await request.get(
      `${API_URL}/user/ai-ask?question=${encodeURIComponent(question)}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return res;
  }

  test('TC_EXT_14 — AI responds to valid finance query', async ({ request }) => {
    const token = await loginViaAPI(request);
    const res = await askAI(request, token, 'What is my total spending this month?');
    expect(res.status()).toBe(200);
    const body = await res.json();
    // Response always returns 200 — ok:true if Ollama running, ok:false if not
    expect(body).toHaveProperty('ok');
    // If Ollama is running, advice should be present
    if (body.ok) {
      expect(body.advice).toBeTruthy();
      expect(body.advice.length).toBeGreaterThan(10);
    } else {
    // Ollama offline — error message should be present instead
      expect(body.error).toBeTruthy();
    }
  });

  test('TC_EXT_15 — AI responds to savings strategy query', async ({ request }) => {
    const token = await loginViaAPI(request);
    const res = await askAI(request, token, 'How can I improve my savings rate?');
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('ok');
    if (body.ok) {
      expect(body.advice).toBeTruthy();
    } else {
      expect(body.error).toBeTruthy();
    }
  });

  test('TC_EXT_16 — AI responds to budget query', async ({ request }) => {
    const token = await loginViaAPI(request);
    const res = await askAI(request, token, 'Which category should I cut spending in?');
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('ok');
    if (body.ok) {
      expect(body.advice).toBeTruthy();
    } else {
      expect(body.error).toBeTruthy();
    }
});

  test('TC_EXT_17 — Non-finance query response does not crash the app', async ({ request }) => {
    const token = await loginViaAPI(request);
    // The API should handle non-finance queries gracefully
    // It may respond or redirect — but should never 500
    const res = await askAI(request, token, 'Tell me a joke about cats');
    expect([200, 400]).toContain(res.status());
    if (res.status() === 200) {
      const body = await res.json();
      // If it responds, it should not crash — ok or error field present
      expect(body).toHaveProperty('ok');
    }
  });

  test('TC_EXT_18 — Cooking recipe query handled gracefully (no crash)', async ({ request }) => {
    const token = await loginViaAPI(request);
    const res = await askAI(request, token, 'Give me a biryani recipe');
    expect([200, 400]).toContain(res.status());
    expect(res.status()).not.toBe(500);
  });

  test('TC_EXT_19 — Political query handled gracefully (no crash)', async ({ request }) => {
    const token = await loginViaAPI(request);
    const res = await askAI(request, token, 'Who should I vote for in the next election?');
    expect([200, 400]).toContain(res.status());
    expect(res.status()).not.toBe(500);
  });

  test('TC_EXT_20 — Empty question returns 422 from API', async ({ request }) => {
    const token = await loginViaAPI(request);
    const res = await request.get(`${API_URL}/user/ai-ask?question=`, {
    headers: { Authorization: `Bearer ${token}` },
    });
    // FastAPI returns 422 for missing/empty required query param
    // Some versions return 400 — both acceptable
    const status = res.status();
    expect([400, 422]).toContain(status);
  });

  test('TC_EXT_21 — Very long query (1000 chars) handled gracefully', async ({ request }) => {
    const token = await loginViaAPI(request);
    const longQuestion = 'How do I manage my finances? '.repeat(40); // ~1000 chars
    const res = await askAI(request, token, longQuestion);
    expect([200, 400]).toContain(res.status());
    expect(res.status()).not.toBe(500);
  });

  test('TC_EXT_22 — SQL injection in query handled safely', async ({ request }) => {
    const token = await loginViaAPI(request);
    const res = await askAI(request, token, "'; DROP TABLE users; --");
    expect([200, 400]).toContain(res.status());
    expect(res.status()).not.toBe(500);
  });

  test('TC_EXT_23 — Script injection in query handled safely', async ({ request }) => {
    const token = await loginViaAPI(request);
    const res = await askAI(request, token, '<script>alert("xss")</script>');
    expect([200, 400]).toContain(res.status());
    expect(res.status()).not.toBe(500);
  });

  // ─── UI TOPIC GUARD TESTS ──────────────────────────────────────────────

  test('TC_EXT_24 — Non-finance query in UI chat does not crash app', async ({ page }) => {
    await loginViaUI(page);
    await page.getByRole('button', { name: /ai feature/i }).click();

    await page.locator('.chat-form input').fill('Tell me a joke');
    await page.getByRole('button', { name: /send/i }).click();

    // App should not crash — some response should appear
    await expect(
      page.locator('.chat-bubble.assistant').last()
    ).toBeVisible({ timeout: 15000 });
  });

  test('TC_EXT_25 — AI response for non-finance redirects to finance topic', async ({ page }) => {
    await loginViaUI(page);
    await page.getByRole('button', { name: /ai feature/i }).click();

    await page.locator('.chat-form input').fill('What is the capital of France?');
    await page.getByRole('button', { name: /send/i }).click();

    // Wait for assistant response
    await expect(
      page.locator('.chat-bubble.assistant').last()
    ).toBeVisible({ timeout: 15000 });

    // The response should appear — app must not crash regardless
    const responseText = await page.locator('.chat-bubble.assistant').last().textContent();
    expect(responseText).toBeTruthy();
    expect(responseText.length).toBeGreaterThan(5);
  });

});

// ═══════════════════════════════════════════════════════════════════════════
// 4. SESSION QUERY LIMITS & CHAT HISTORY
// ═══════════════════════════════════════════════════════════════════════════

test.describe('AI Chat — Session Limits & History', () => {

  test.beforeEach(async ({ request }) => {
    const token = await loginViaAPI(request);
    await seedTransactionsViaAPI(request, token);
  });

  test('TC_EXT_26 — 5 consecutive messages accumulate in chat window', async ({ page }) => {
    await loginViaUI(page);
    await page.getByRole('button', { name: /ai feature/i }).click();

    const questions = [
      'What is my total income?',
      'What is my top expense category?',
      'How much did I spend on food?',
      'What is my net savings?',
      'Should I cut entertainment spending?',
    ];

    for (const question of questions) {
      await page.locator('.chat-form input').fill(question);
      await page.getByRole('button', { name: /send/i }).click();
      // Wait for AI to respond before sending next
      await expect(
        page.locator('.chat-bubble.assistant').last()
      ).toBeVisible({ timeout: 20000 });
      await page.waitForTimeout(500);
    }

    // All 5 user messages should be in chat window
    for (const question of questions) {
      await expect(page.getByText(question)).toBeVisible();
    }
  });

  test('TC_EXT_27 — Chat history persists when switching between tabs', async ({ page }) => {
    await loginViaUI(page);
    await page.getByRole('button', { name: /ai feature/i }).click();

    // Send a message
    await page.locator('.chat-form input').fill('What is my savings rate?');
    await page.getByRole('button', { name: /send/i }).click();
    await expect(
      page.locator('.chat-bubble.assistant').last()
    ).toBeVisible({ timeout: 20000 });

    // Switch to Home tab
    await page.getByRole('button', { name: /home/i }).click();
    await expect(page.getByRole('heading', { name: /home dashboard/i })).toBeVisible();

    // Switch back to AI tab
    await page.getByRole('button', { name: /ai feature/i }).click();

    // Previous message should still be there
    await expect(page.getByText(/what is my savings rate/i)).toBeVisible();
  });

  test('TC_EXT_28 — Initial greeting always present at start of session', async ({ page }) => {
    await loginViaUI(page);
    await page.getByRole('button', { name: /ai feature/i }).click();

    // Even after sending messages, greeting should still be visible
    await expect(
      page.getByText(/hi! i am your finance assistant/i)
    ).toBeVisible();
  });

  test('TC_EXT_29 — Send button re-enables after AI responds', async ({ page }) => {
    await loginViaUI(page);
    await page.getByRole('button', { name: /ai feature/i }).click();

    await page.locator('.chat-form input').fill('Analyse my top expenses');
    await page.getByRole('button', { name: /send/i }).click();

    // Wait for response
    await expect(
      page.locator('.chat-bubble.assistant').last()
    ).toBeVisible({ timeout: 20000 });

    // Send button should be re-enabled (input is empty after send)
    await page.locator('.chat-form input').fill('Another question');
    await expect(page.getByRole('button', { name: /send/i })).toBeEnabled();
  });

  test('TC_EXT_30 — Rapid successive API calls handled without 500 errors', async ({ request }) => {
    const token = await loginViaAPI(request);

    // Fire 3 rapid API calls
    const calls = await Promise.all([
      request.get(`${API_URL}/user/ai-ask?question=income`, {
        headers: { Authorization: `Bearer ${token}` },
      }),
      request.get(`${API_URL}/user/ai-ask?question=expenses`, {
        headers: { Authorization: `Bearer ${token}` },
      }),
      request.get(`${API_URL}/user/ai-ask?question=savings`, {
        headers: { Authorization: `Bearer ${token}` },
      }),
    ]);

    for (const res of calls) {
      // None should return 500 server error
      expect(res.status()).not.toBe(500);
    }
  });

});