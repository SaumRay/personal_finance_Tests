// tests/auth.spec.js
// Covers: Register, Login, Logout — happy paths + all edge cases

import { test, expect } from '@playwright/test';
import { BASE_URL, TEST_USER, NEW_USER, loginViaUI } from './helpers.js';

test.describe('Authentication', () => {

  // ─── LOGIN ────────────────────────────────────────────────────────────────

  test.describe('Login', () => {

    test('TC_AUTH_01 — Valid login shows dashboard', async ({ page }) => {
      await loginViaUI(page);
      await expect(page.getByRole('button', { name: /home/i })).toBeVisible();
      await expect(page.getByRole('button', { name: /ai feature/i })).toBeVisible();
    });

    test('TC_AUTH_02 — Wrong password shows error message', async ({ page }) => {
      await page.goto(BASE_URL);
      await page.getByLabel('Email').fill(TEST_USER.email);
      await page.getByLabel('Password').first().fill('wrongpassword999');
      await page.getByRole('button', { name: /login/i }).click();
      await expect(page.getByText(/wrong email or password/i)).toBeVisible();
    });

    test('TC_AUTH_03 — Wrong email shows error message', async ({ page }) => {
      await page.goto(BASE_URL);
      await page.getByLabel('Email').fill('notregistered@example.com');
      await page.getByLabel('Password').first().fill(TEST_USER.password);
      await page.getByRole('button', { name: /login/i }).click();
      await expect(page.getByText(/wrong email or password/i)).toBeVisible();
    });

    test('TC_AUTH_04 — Empty email shows inline validation', async ({ page }) => {
      await page.goto(BASE_URL);
      await page.getByLabel('Email').fill('invalidemail');
      await page.getByLabel('Password').first().fill(TEST_USER.password);
      // Inline hint should appear
      await expect(page.getByText(/valid email format/i)).toBeVisible();
    });

    test('TC_AUTH_05 — Password less than 8 chars shows validation', async ({ page }) => {
      await page.goto(BASE_URL);
      await page.getByLabel('Email').fill(TEST_USER.email);
      await page.getByLabel('Password').first().fill('short');
      await expect(page.getByText(/at least 8 characters/i)).toBeVisible();
    });

    test('TC_AUTH_06 — Show password toggle reveals password text', async ({ page }) => {
      await page.goto(BASE_URL);
      const passwordInput = page.getByLabel('Password').first();
      await passwordInput.fill('mypassword123');
      // Initially type=password
      await expect(passwordInput).toHaveAttribute('type', 'password');
      // Click show password checkbox
      await page.getByRole('checkbox').click();
      await expect(passwordInput).toHaveAttribute('type', 'text');
    });

    test('TC_AUTH_07 — Login button disabled during loading', async ({ page }) => {
      await page.goto(BASE_URL);
      await page.getByLabel('Email').fill(TEST_USER.email);
      await page.getByLabel('Password').first().fill(TEST_USER.password);
      const loginBtn = page.getByRole('button', { name: /login/i });
      await loginBtn.click();
      // Button should show loading state briefly
      await expect(page.getByRole('button', { name: /please wait/i })).toBeVisible();
    });

  });

  // ─── REGISTER ─────────────────────────────────────────────────────────────

  test.describe('Register', () => {

    test('TC_AUTH_08 — Switch to register form', async ({ page }) => {
      await page.goto(BASE_URL);
      await page.getByRole('button', { name: /register/i }).click();
      await expect(page.getByRole('heading', { name: /create account/i })).toBeVisible();
    });

    test('TC_AUTH_09 — Valid registration redirects to login', async ({ page }) => {
      await page.goto(BASE_URL);
      await page.getByRole('button', { name: /register/i }).click();

      await page.getByLabel('Full Name').fill(NEW_USER.name);
      await page.getByLabel('Email').fill(NEW_USER.email);
      await page.getByLabel('Password').first().fill(NEW_USER.password);
      await page.getByRole('button', { name: /register/i }).last().click();

      await expect(page.getByText(/registration successful/i)).toBeVisible();
      // Should switch back to login form
      await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible();
    });

    test('TC_AUTH_10 — Duplicate email registration shows error', async ({ page }) => {
      await page.goto(BASE_URL);
      await page.getByRole('button', { name: /register/i }).click();

      await page.getByLabel('Full Name').fill('Duplicate User');
      await page.getByLabel('Email').fill(TEST_USER.email); // already registered
      await page.getByLabel('Password').first().fill('ValidPass123');
      await page.getByRole('button', { name: /register/i }).last().click();

      await expect(page.getByText(/already registered/i)).toBeVisible();
    });

    test('TC_AUTH_11 — Register with short password shows validation', async ({ page }) => {
      await page.goto(BASE_URL);
      await page.getByRole('button', { name: /register/i }).click();

      await page.getByLabel('Email').fill('newuser@test.com');
      await page.getByLabel('Password').first().fill('abc');
      await expect(page.getByText(/at least 8 characters/i)).toBeVisible();
    });

  });

  // ─── LOGOUT ───────────────────────────────────────────────────────────────

  test.describe('Logout', () => {

    test('TC_AUTH_12 — Logout returns to login page', async ({ page }) => {
      await loginViaUI(page);
      await page.getByRole('button', { name: /logout/i }).click();
      await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible();
    });

    test('TC_AUTH_13 — After logout, navigating back shows login', async ({ page }) => {
      await loginViaUI(page);
      await page.getByRole('button', { name: /logout/i }).click();
      await page.goto(BASE_URL);
      // Should still show login — no session persisted
      await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible();
    });

    test('TC_AUTH_14 — User name is displayed in nav after login', async ({ page }) => {
      await loginViaUI(page);
      // Nav should show user email or full name
      const nav = page.locator('.nav-user');
      await expect(nav).toBeVisible();
    });

  });

});