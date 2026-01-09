import { test, expect } from '@playwright/test';

test.describe('Weekday Game - Year Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should increment year when clicking next year button', async ({ page }) => {
    const initialYear = await page.locator('#yearDisplay').textContent();
    const initialYearNum = parseInt(initialYear);

    // Click next year button
    await page.locator('#nextYear').click();

    // Year should increment
    await expect(page.locator('#yearDisplay')).toHaveText((initialYearNum + 1).toString());

    // Date should update to show new year
    const dateText = await page.locator('#dateDisplay').textContent();
    expect(dateText).toContain((initialYearNum + 1).toString());
  });

  test('should decrement year when clicking previous year button', async ({ page }) => {
    const initialYear = await page.locator('#yearDisplay').textContent();
    const initialYearNum = parseInt(initialYear);

    // Click previous year button
    await page.locator('#prevYear').click();

    // Year should decrement
    await expect(page.locator('#yearDisplay')).toHaveText((initialYearNum - 1).toString());

    // Date should update to show new year
    const dateText = await page.locator('#dateDisplay').textContent();
    expect(dateText).toContain((initialYearNum - 1).toString());
  });

  test('should generate new date when changing year', async ({ page }) => {
    const initialDate = await page.locator('#dateDisplay').textContent();

    // Change year
    await page.locator('#nextYear').click();

    // Date should be different
    const newDate = await page.locator('#dateDisplay').textContent();
    expect(newDate).not.toBe(initialDate);
  });

  test('should reset game state when changing year', async ({ page }) => {
    // Answer a question first
    await page.getByRole('button', { name: 'Monday' }).click();

    // Next button should be visible
    await expect(page.locator('#nextButton')).toBeVisible();

    // Feedback should be present
    const feedback = await page.locator('#feedback').textContent();
    expect(feedback).toBeTruthy();

    // Change year
    await page.locator('#nextYear').click();

    // Next button should be hidden
    await expect(page.locator('#nextButton')).toBeHidden();

    // Feedback should be cleared
    await expect(page.locator('#feedback')).toHaveText('');

    // Buttons should be enabled
    const mondayButton = page.getByRole('button', { name: 'Monday' });
    await expect(mondayButton).toBeEnabled();
  });

  test('should handle multiple year changes', async ({ page }) => {
    const initialYear = await page.locator('#yearDisplay').textContent();
    const initialYearNum = parseInt(initialYear);

    // Go forward 3 years
    await page.locator('#nextYear').click();
    await page.locator('#nextYear').click();
    await page.locator('#nextYear').click();

    await expect(page.locator('#yearDisplay')).toHaveText((initialYearNum + 3).toString());

    // Go back 2 years
    await page.locator('#prevYear').click();
    await page.locator('#prevYear').click();

    await expect(page.locator('#yearDisplay')).toHaveText((initialYearNum + 1).toString());
  });
});
