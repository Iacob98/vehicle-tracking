import { test, expect } from '@playwright/test';

test.describe('Penalties Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel(/email/i).fill(process.env.TEST_USER_EMAIL || 'test@example.com');
    await page.getByLabel(/пароль/i).fill(process.env.TEST_USER_PASSWORD || 'password');
    await page.getByRole('button', { name: /войти/i }).click();
    await expect(page).toHaveURL('/dashboard');
  });

  test('should display penalties list', async ({ page }) => {
    await page.goto('/dashboard/penalties');

    await expect(page.getByRole('heading', { name: /штрафы/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /добавить/i })).toBeVisible();
  });

  test('should create new penalty', async ({ page }) => {
    await page.goto('/dashboard/penalties/new');

    // Select vehicle
    await page.locator('select[name="vehicle_id"]').selectOption({ index: 1 });

    // Fill amount
    await page.getByLabel(/сумма/i).fill('50.00');

    // Fill date
    await page.getByLabel(/дата/i).fill('2025-10-01');

    await page.getByRole('button', { name: /создать/i }).click();

    // Should redirect to penalties list
    await expect(page).toHaveURL('/dashboard/penalties');
  });

  test('should view penalty details', async ({ page }) => {
    await page.goto('/dashboard/penalties');

    // Click on first penalty
    await page.locator('a[href*="/dashboard/penalties/"]').first().click();

    // Should show penalty details
    await expect(page.locator('text=/Сумма|Betrag/i')).toBeVisible();
    await expect(page.locator('text=/Статус|Status/i')).toBeVisible();
  });

  test('should edit penalty', async ({ page }) => {
    await page.goto('/dashboard/penalties');

    // Click on first penalty
    await page.locator('a[href*="/dashboard/penalties/"]').first().click();

    // Click edit button
    await page.getByRole('link', { name: /редактировать/i }).click();

    // Update amount
    const amountInput = page.getByLabel(/сумма/i);
    await amountInput.clear();
    await amountInput.fill('75.00');

    await page.getByRole('button', { name: /сохранить/i }).click();

    // Should show updated amount
    await expect(page.getByText('75')).toBeVisible();
  });

  test('should filter penalties by status', async ({ page }) => {
    await page.goto('/dashboard/penalties');

    // Filter by paid
    await page.locator('select').first().selectOption('paid');

    // Should show only paid penalties
    await expect(page.locator('text=/оплачен|bezahlt/i')).toBeVisible();
  });
});
