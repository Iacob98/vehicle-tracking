import { test, expect } from '@playwright/test';

test.describe('Vehicles CRUD', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('/login');
    await page.getByLabel(/email/i).fill(process.env.TEST_USER_EMAIL || 'test@example.com');
    await page.getByLabel(/пароль/i).fill(process.env.TEST_USER_PASSWORD || 'password');
    await page.getByRole('button', { name: /войти/i }).click();
    await expect(page).toHaveURL('/dashboard');
  });

  test('should display vehicles list', async ({ page }) => {
    await page.goto('/dashboard/vehicles');

    await expect(page.getByRole('heading', { name: /автомобили/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /добавить/i })).toBeVisible();
  });

  test('should create new vehicle', async ({ page }) => {
    await page.goto('/dashboard/vehicles/new');

    await page.getByLabel(/название/i).fill('Test Vehicle');
    await page.getByLabel(/номер/i).fill('TEST-123');
    await page.getByLabel(/марка/i).fill('Mercedes');
    await page.getByLabel(/модель/i).fill('Sprinter');
    await page.getByLabel(/год/i).fill('2023');
    await page.getByLabel(/цвет/i).fill('White');

    await page.getByRole('button', { name: /создать/i }).click();

    // Should redirect to vehicles list
    await expect(page).toHaveURL('/dashboard/vehicles');
    await expect(page.locator('text=Test Vehicle')).toBeVisible();
  });

  test('should view vehicle details', async ({ page }) => {
    await page.goto('/dashboard/vehicles');

    // Click on first vehicle
    await page.locator('a[href*="/dashboard/vehicles/"]').first().click();

    // Should show vehicle details
    await expect(page.getByRole('heading')).toBeVisible();
    await expect(page.locator('text=/Документы|Обслуживание/i')).toBeVisible();
  });

  test('should edit vehicle', async ({ page }) => {
    await page.goto('/dashboard/vehicles');

    // Click on first vehicle
    await page.locator('a[href*="/dashboard/vehicles/"]').first().click();

    // Click edit button
    await page.getByRole('link', { name: /редактировать/i }).click();

    // Update vehicle name
    const nameInput = page.getByLabel(/название/i);
    await nameInput.clear();
    await nameInput.fill('Updated Vehicle Name');

    await page.getByRole('button', { name: /сохранить/i }).click();

    // Should show updated name
    await expect(page.getByText('Updated Vehicle Name')).toBeVisible();
  });

  test('should delete vehicle', async ({ page }) => {
    await page.goto('/dashboard/vehicles');

    // Click on first vehicle
    await page.locator('a[href*="/dashboard/vehicles/"]').first().click();

    // Click delete button
    page.on('dialog', dialog => dialog.accept());
    await page.getByRole('button', { name: /удалить/i }).click();

    // Should redirect to vehicles list
    await expect(page).toHaveURL('/dashboard/vehicles');
  });
});
