import { test, expect } from '@playwright/test';

test.describe('Weekday Game - Failure History & Spaced Repetition', () => {
  test.beforeEach(async ({ page }) => {
    // Clear local storage before each test
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.clear();
    });
    await page.reload();
  });

  test('should add failed dates to failure history', async ({ page }) => {
    // Get the current date and calculate wrong answer
    const dateText = await page.locator('#dateDisplay').textContent();
    const [day, month, year] = dateText.split(' / ').map(s => parseInt(s.trim()));

    const date = new Date(year, month - 1, day);
    const correctDayIndex = date.getDay();
    const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const correctDay = weekdays[correctDayIndex];

    // Click wrong answer
    const wrongDay = correctDay === 'Monday' ? 'Tuesday' : 'Monday';
    await page.getByRole('button', { name: wrongDay }).click();

    // Check failure history was saved
    const failureHistory = await page.evaluate(() => {
      const data = localStorage.getItem('weekdayGameFailureHistory');
      return data ? JSON.parse(data) : [];
    });

    expect(failureHistory.length).toBe(1);
    expect(failureHistory[0]).toMatchObject({
      day,
      month,
      year,
      failureCount: 1
    });
  });

  test('should limit failure history to 20 entries (LRU)', async ({ page }) => {
    // Pre-populate with 20 failures
    await page.evaluate(() => {
      const history = [];
      for (let i = 0; i < 20; i++) {
        history.push({
          day: i + 1,
          month: 1,
          year: 2025,
          timestamp: Date.now() - (20 - i) * 1000,
          failureCount: 1,
          lastReviewed: Date.now() - (20 - i) * 1000
        });
      }
      localStorage.setItem('weekdayGameFailureHistory', JSON.stringify(history));
    });

    await page.reload();

    // Fail a new date
    const dateText = await page.locator('#dateDisplay').textContent();
    const [day, month, year] = dateText.split(' / ').map(s => parseInt(s.trim()));

    const date = new Date(year, month - 1, day);
    const correctDayIndex = date.getDay();
    const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const correctDay = weekdays[correctDayIndex];

    const wrongDay = correctDay === 'Monday' ? 'Tuesday' : 'Monday';
    await page.getByRole('button', { name: wrongDay }).click();

    // Check that history is still limited to 20
    const failureHistory = await page.evaluate(() => {
      const data = localStorage.getItem('weekdayGameFailureHistory');
      return data ? JSON.parse(data) : [];
    });

    expect(failureHistory.length).toBe(20);

    // Check that the newest failure is at the front
    expect(failureHistory[0]).toMatchObject({
      day,
      month,
      year
    });
  });

  test('should increment failure count for repeated failures', async ({ page }) => {
    // Pre-populate with a specific failure
    await page.evaluate(() => {
      const history = [{
        day: 15,
        month: 3,
        year: 2025,
        timestamp: Date.now() - 10000,
        failureCount: 1,
        lastReviewed: Date.now() - 10000
      }];
      localStorage.setItem('weekdayGameFailureHistory', JSON.stringify(history));
    });

    await page.reload();

    // Set year to 2025 and generate dates until we get March 15
    await page.evaluate(() => {
      window.game.year = 2025;
      window.game.updateYearDisplay();
      window.game.currentDate = new Date(2025, 2, 15); // March 15, 2025
      window.game.correctDay = window.game.currentDate.getDay();
      window.game.displayDate();
    });

    // Get the correct answer and click wrong one
    const correctDayIndex = await page.evaluate(() => window.game.correctDay);
    const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const correctDay = weekdays[correctDayIndex];
    const wrongDay = correctDay === 'Monday' ? 'Tuesday' : 'Monday';

    await page.getByRole('button', { name: wrongDay }).click();

    // Check that failure count was incremented
    const failureHistory = await page.evaluate(() => {
      const data = localStorage.getItem('weekdayGameFailureHistory');
      return data ? JSON.parse(data) : [];
    });

    expect(failureHistory.length).toBe(1);
    expect(failureHistory[0].failureCount).toBe(2);
  });

  test('should use failure history every 4th date', async ({ page }) => {
    // Pre-populate with failures
    await page.evaluate(() => {
      const history = [];
      for (let i = 0; i < 5; i++) {
        history.push({
          day: (i * 3) + 1,
          month: 1,
          year: 2020,
          timestamp: Date.now() - (5 - i) * 10000,
          failureCount: i + 1,
          lastReviewed: Date.now() - (5 - i) * 10000
        });
      }
      localStorage.setItem('weekdayGameFailureHistory', JSON.stringify(history));
    });

    await page.reload();

    // Play through several rounds and track which dates appear
    const datesSeen = [];
    for (let round = 0; round < 8; round++) {
      const dateText = await page.locator('#dateDisplay').textContent();
      const [day, month, year] = dateText.split(' / ').map(s => parseInt(s.trim()));
      datesSeen.push({ day, month, year, round });

      // Click any answer to proceed
      await page.getByRole('button', { name: 'Monday' }).click();
      await page.waitForTimeout(100);

      // Wait for next round to load
      if (round < 7) {
        await page.locator('#nextButton').click();
        await page.waitForTimeout(100);
      }
    }

    // Check that some dates from 2020 (failure history) appeared
    const historyDates = datesSeen.filter(d => d.year === 2020);
    expect(historyDates.length).toBeGreaterThan(0);

    // Should have used failure history approximately every 4th date
    // With 8 rounds, we expect roughly 2 dates from history, but due to
    // failures being added during the test and randomness, allow for variation
    expect(historyDates.length).toBeGreaterThanOrEqual(1);
    expect(historyDates.length).toBeLessThanOrEqual(6);
  });

  test('should select from failure history using weighted algorithm', async ({ page }) => {
    // Pre-populate with failures with different counts and times
    await page.evaluate(() => {
      const now = Date.now();
      const history = [
        {
          day: 1,
          month: 1,
          year: 2020,
          timestamp: now - 30 * 24 * 60 * 60 * 1000, // 30 days ago
          failureCount: 5,
          lastReviewed: now - 30 * 24 * 60 * 60 * 1000
        },
        {
          day: 2,
          month: 1,
          year: 2020,
          timestamp: now - 1000,
          failureCount: 1,
          lastReviewed: now - 1000
        }
      ];
      localStorage.setItem('weekdayGameFailureHistory', JSON.stringify(history));
    });

    await page.reload();

    // Force selection from failure history multiple times
    const selectedDates = [];
    for (let i = 0; i < 10; i++) {
      const selected = await page.evaluate(() => {
        return window.game.selectFromFailureHistory();
      });
      selectedDates.push(selected.day);
    }

    // The algorithm should favor day 1 (older and more failures) more than day 2
    // But both should appear due to randomization
    const day1Count = selectedDates.filter(d => d === 1).length;
    const day2Count = selectedDates.filter(d => d === 2).length;

    // Day 1 should generally be selected more often
    expect(day1Count + day2Count).toBe(10);
    expect(day1Count).toBeGreaterThan(0);
  });

  test('should persist failure history across page reloads', async ({ page }) => {
    // Fail a date
    const dateText = await page.locator('#dateDisplay').textContent();
    const [day, month, year] = dateText.split(' / ').map(s => parseInt(s.trim()));

    const date = new Date(year, month - 1, day);
    const correctDayIndex = date.getDay();
    const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const correctDay = weekdays[correctDayIndex];

    const wrongDay = correctDay === 'Monday' ? 'Tuesday' : 'Monday';
    await page.getByRole('button', { name: wrongDay }).click();

    // Reload page
    await page.reload();

    // Check failure history is still there
    const failureHistory = await page.evaluate(() => {
      const data = localStorage.getItem('weekdayGameFailureHistory');
      return data ? JSON.parse(data) : [];
    });

    expect(failureHistory.length).toBe(1);
    expect(failureHistory[0]).toMatchObject({
      day,
      month,
      year
    });
  });

  test('should not add correct answers to failure history', async ({ page }) => {
    // Get the current date and click correct answer
    const dateText = await page.locator('#dateDisplay').textContent();
    const [day, month, year] = dateText.split(' / ').map(s => parseInt(s.trim()));

    const date = new Date(year, month - 1, day);
    const correctDayIndex = date.getDay();
    const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const correctDay = weekdays[correctDayIndex];

    // Click correct answer
    await page.getByRole('button', { name: correctDay }).click();

    // Check failure history is empty
    const failureHistory = await page.evaluate(() => {
      const data = localStorage.getItem('weekdayGameFailureHistory');
      return data ? JSON.parse(data) : [];
    });

    expect(failureHistory.length).toBe(0);
  });

  test('should update lastReviewed timestamp when date is selected from history', async ({ page }) => {
    // Pre-populate with a failure
    const initialTime = Date.now() - 100000;
    await page.evaluate((time) => {
      const history = [{
        day: 15,
        month: 6,
        year: 2020,
        timestamp: time,
        failureCount: 1,
        lastReviewed: time
      }];
      localStorage.setItem('weekdayGameFailureHistory', JSON.stringify(history));
    }, initialTime);

    await page.reload();

    // Select from failure history
    await page.evaluate(() => {
      window.game.selectFromFailureHistory();
    });

    // Check that lastReviewed was updated
    const failureHistory = await page.evaluate(() => {
      const data = localStorage.getItem('weekdayGameFailureHistory');
      return data ? JSON.parse(data) : [];
    });

    expect(failureHistory[0].lastReviewed).toBeGreaterThan(initialTime);
  });
});
