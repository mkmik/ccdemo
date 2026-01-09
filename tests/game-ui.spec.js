import { test, expect } from '@playwright/test';

test.describe('Weekday Game - UI Elements', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should display all essential UI elements', async ({ page }) => {
    // Check page title
    await expect(page).toHaveTitle('Weekday Game');

    // Check main heading
    await expect(page.locator('h1')).toHaveText('📅 Weekday Game');

    // Check year selector elements
    await expect(page.locator('#prevYear')).toBeVisible();
    await expect(page.locator('#nextYear')).toBeVisible();
    await expect(page.locator('#yearDisplay')).toBeVisible();

    // Check date display
    await expect(page.locator('#dateDisplay')).toBeVisible();

    // Check all weekday buttons are present
    const weekdays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    for (const day of weekdays) {
      await expect(page.getByRole('button', { name: day })).toBeVisible();
    }

    // Check score display
    await expect(page.locator('#scoreDisplay')).toBeVisible();
    await expect(page.locator('#scoreDisplay')).toHaveText('Score: 0 / 0');

    // Next button should be hidden initially
    await expect(page.locator('#nextButton')).toBeHidden();
  });

  test('should display current year by default', async ({ page }) => {
    const currentYear = new Date().getFullYear();
    await expect(page.locator('#yearDisplay')).toHaveText(currentYear.toString());
  });

  test('should display a valid date', async ({ page }) => {
    const dateText = await page.locator('#dateDisplay').textContent();
    // Date format should be DD / MM / YYYY
    expect(dateText).toMatch(/\d{2} \/ \d{2} \/ \d{4}/);
  });
});
