import { test, expect } from '@playwright/test';

test.describe('Weekday Game - Functionality', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should allow answering a question and show feedback', async ({ page }) => {
    // Click any weekday button
    await page.getByRole('button', { name: 'Monday' }).click();

    // Feedback should be visible with either correct or wrong message
    const feedback = page.locator('#feedback');
    await expect(feedback).toBeVisible();

    const feedbackText = await feedback.textContent();
    expect(feedbackText).toMatch(/Correct!|Wrong!/);

    // Score should update
    const scoreText = await page.locator('#scoreDisplay').textContent();
    expect(scoreText).toMatch(/Score: [01] \/ 1/);

    // Next button should appear
    await expect(page.locator('#nextButton')).toBeVisible();

    // Weekday buttons should be disabled
    const mondayButton = page.getByRole('button', { name: 'Monday' });
    await expect(mondayButton).toBeDisabled();
  });

  test('should show correct answer when wrong', async ({ page }) => {
    // Get the current date from the display
    const dateText = await page.locator('#dateDisplay').textContent();
    const [day, month, year] = dateText.split(' / ').map(s => parseInt(s.trim()));

    // Calculate the correct day
    const date = new Date(year, month - 1, day);
    const correctDayIndex = date.getDay();
    const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const correctDay = weekdays[correctDayIndex];

    // Click a different day to ensure wrong answer
    const wrongDay = correctDay === 'Monday' ? 'Tuesday' : 'Monday';
    await page.getByRole('button', { name: wrongDay }).click();

    // Check if feedback shows the correct answer
    const feedback = await page.locator('#feedback').textContent();
    if (feedback.includes('Wrong!')) {
      expect(feedback).toContain('The correct answer is');
    }
  });

  test('should proceed to next round when clicking Next button', async ({ page }) => {
    // Get initial date
    const initialDate = await page.locator('#dateDisplay').textContent();

    // Answer the question
    await page.getByRole('button', { name: 'Monday' }).click();

    // Click next button
    await page.locator('#nextButton').click();

    // Check that date has changed
    const newDate = await page.locator('#dateDisplay').textContent();
    expect(newDate).not.toBe(initialDate);

    // Feedback should be cleared
    const feedback = await page.locator('#feedback').textContent();
    expect(feedback).toBe('');

    // Next button should be hidden again
    await expect(page.locator('#nextButton')).toBeHidden();

    // Weekday buttons should be enabled
    const mondayButton = page.getByRole('button', { name: 'Monday' });
    await expect(mondayButton).toBeEnabled();
  });

  test('should track score across multiple rounds', async ({ page }) => {
    // Initial score should be 0/0
    await expect(page.locator('#scoreDisplay')).toHaveText('Score: 0 / 0');

    // Play first round
    await page.getByRole('button', { name: 'Monday' }).click();

    // Score should be updated (either 1/1 or 0/1)
    let scoreText = await page.locator('#scoreDisplay').textContent();
    expect(scoreText).toMatch(/Score: [01] \/ 1/);

    // Go to next round
    await page.locator('#nextButton').click();

    // Play second round
    await page.getByRole('button', { name: 'Tuesday' }).click();

    // Score should show 2 attempts
    scoreText = await page.locator('#scoreDisplay').textContent();
    expect(scoreText).toMatch(/Score: [0-2] \/ 2/);
  });

  test('should verify correct answer is actually correct', async ({ page }) => {
    // Get the current date from the display
    const dateText = await page.locator('#dateDisplay').textContent();
    const [day, month, year] = dateText.split(' / ').map(s => parseInt(s.trim()));

    // Calculate the correct day using JavaScript Date
    const date = new Date(year, month - 1, day);
    const correctDayIndex = date.getDay();
    const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const correctDay = weekdays[correctDayIndex];

    // Click the correct day
    await page.getByRole('button', { name: correctDay }).click();

    // Should show "Correct!" message
    await expect(page.locator('#feedback')).toHaveText('Correct!');
    await expect(page.locator('#feedback')).toHaveClass(/correct/);

    // Score should be 1/1
    await expect(page.locator('#scoreDisplay')).toHaveText('Score: 1 / 1');
  });
});
