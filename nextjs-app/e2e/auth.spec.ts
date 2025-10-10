import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test('should display login page', async ({ page }) => {
    await page.goto('/login');

    await expect(page.getByRole('heading', { name: /вход/i })).toBeVisible();
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/пароль/i)).toBeVisible();
  });

  test('should show error with invalid credentials', async ({ page }) => {
    await page.goto('/login');

    await page.getByLabel(/email/i).fill('invalid@example.com');
    await page.getByLabel(/пароль/i).fill('wrongpassword');
    await page.getByRole('button', { name: /войти/i }).click();

    // Wait for error message
    await expect(page.locator('text=/ошибка|error/i')).toBeVisible();
  });

  test('should redirect to dashboard after login', async ({ page }) => {
    await page.goto('/login');

    // Use test credentials from environment
    await page.getByLabel(/email/i).fill(process.env.TEST_USER_EMAIL || 'test@example.com');
    await page.getByLabel(/пароль/i).fill(process.env.TEST_USER_PASSWORD || 'password');
    await page.getByRole('button', { name: /войти/i }).click();

    // Should redirect to dashboard
    await expect(page).toHaveURL('/dashboard');
  });

  test('should sign out successfully', async ({ page }) => {
    // First login
    await page.goto('/login');
    await page.getByLabel(/email/i).fill(process.env.TEST_USER_EMAIL || 'test@example.com');
    await page.getByLabel(/пароль/i).fill(process.env.TEST_USER_PASSWORD || 'password');
    await page.getByRole('button', { name: /войти/i }).click();

    await expect(page).toHaveURL('/dashboard');

    // Then sign out
    await page.getByRole('button', { name: /выход/i }).click();

    // Should redirect to login
    await expect(page).toHaveURL('/login');
  });
});
