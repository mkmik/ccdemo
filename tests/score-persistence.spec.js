import { test, expect } from '@playwright/test';

test.describe('Weekday Game - Score Persistence', () => {
  test.beforeEach(async ({ page }) => {
    // Clear local storage before each test
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
  });

  test('should persist score across page reloads', async ({ page }) => {
    await page.goto('/');

    // Initial score should be 0/0
    await expect(page.locator('#scoreDisplay')).toHaveText('Score: 0 / 0');

    // Play a round
    await page.getByRole('button', { name: 'Monday' }).click();

    // Get the score after first round
    const scoreAfterFirstRound = await page.locator('#scoreDisplay').textContent();
    expect(scoreAfterFirstRound).toMatch(/Score: [01] \/ 1/);

    // Reload the page
    await page.reload();

    // Score should persist after reload
    const scoreAfterReload = await page.locator('#scoreDisplay').textContent();
    expect(scoreAfterReload).toBe(scoreAfterFirstRound);
  });

  test('should continue accumulating score after reload', async ({ page }) => {
    await page.goto('/');

    // Play first round
    await page.getByRole('button', { name: 'Monday' }).click();
    await page.locator('#nextButton').click();

    // Play second round
    await page.getByRole('button', { name: 'Tuesday' }).click();

    // Score should show 2 attempts
    const scoreBefore = await page.locator('#scoreDisplay').textContent();
    expect(scoreBefore).toMatch(/Score: [0-2] \/ 2/);

    // Reload the page
    await page.reload();

    // Score should still show 2 attempts
    await expect(page.locator('#scoreDisplay')).toHaveText(scoreBefore);

    // Play another round
    await page.getByRole('button', { name: 'Wednesday' }).click();

    // Score should now show 3 attempts
    const scoreAfter = await page.locator('#scoreDisplay').textContent();
    expect(scoreAfter).toMatch(/Score: [0-3] \/ 3/);
  });

  test('should handle fresh start when no saved data exists', async ({ page }) => {
    // Clear local storage
    await page.evaluate(() => localStorage.clear());

    await page.goto('/');

    // Should start with 0/0
    await expect(page.locator('#scoreDisplay')).toHaveText('Score: 0 / 0');
  });

  test('should save score to localStorage after each round', async ({ page }) => {
    await page.goto('/');

    // Play a round
    await page.getByRole('button', { name: 'Monday' }).click();

    // Check that data is saved in localStorage
    const savedData = await page.evaluate(() => {
      return localStorage.getItem('weekdayGameScore');
    });

    expect(savedData).not.toBeNull();

    const parsedData = JSON.parse(savedData);
    expect(parsedData.attempts).toBe(1);
    expect(parsedData.score).toBeGreaterThanOrEqual(0);
    expect(parsedData.score).toBeLessThanOrEqual(1);
  });

  test('should handle corrupted localStorage data gracefully', async ({ page }) => {
    await page.goto('/');

    // Set corrupted data in localStorage
    await page.evaluate(() => {
      localStorage.setItem('weekdayGameScore', 'corrupted data');
    });

    // Reload the page
    await page.reload();

    // Should fall back to 0/0
    await expect(page.locator('#scoreDisplay')).toHaveText('Score: 0 / 0');
  });
});
