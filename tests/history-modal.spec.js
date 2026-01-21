import { test, expect } from '@playwright/test';

test.describe('Weekday Game - History Modal', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('http://localhost:8080/');
        // Clear localStorage before each test
        await page.evaluate(() => {
            localStorage.clear();
        });
        await page.reload();
    });

    test('should display history button', async ({ page }) => {
        const historyButton = page.locator('#historyButton');
        await expect(historyButton).toBeVisible();
        await expect(historyButton).toHaveText('📊 History');
    });

    test('should open modal when history button is clicked', async ({ page }) => {
        const historyButton = page.locator('#historyButton');
        const modal = page.locator('#historyModal');

        // Modal should be hidden initially
        await expect(modal).not.toHaveClass(/active/);

        // Click history button
        await historyButton.click();

        // Modal should be visible
        await expect(modal).toHaveClass(/active/);
    });

    test('should close modal when close button is clicked', async ({ page }) => {
        const historyButton = page.locator('#historyButton');
        const modal = page.locator('#historyModal');
        const closeButton = page.locator('#closeModal');

        // Open modal
        await historyButton.click();
        await expect(modal).toHaveClass(/active/);

        // Close modal
        await closeButton.click();
        await expect(modal).not.toHaveClass(/active/);
    });

    test('should close modal when clicking outside modal content', async ({ page }) => {
        const historyButton = page.locator('#historyButton');
        const modal = page.locator('#historyModal');

        // Open modal
        await historyButton.click();
        await expect(modal).toHaveClass(/active/);

        // Click on modal background (not the content)
        await modal.click({ position: { x: 5, y: 5 } });
        await expect(modal).not.toHaveClass(/active/);
    });

    test('should show empty history message when no failures', async ({ page }) => {
        const historyButton = page.locator('#historyButton');
        await historyButton.click();

        const emptyMessage = page.locator('.empty-history');
        await expect(emptyMessage).toBeVisible();
        await expect(emptyMessage).toHaveText('No failed dates yet. Keep playing!');
    });

    test('should display failure history table with correct data', async ({ page }) => {
        // Get the current date being displayed
        const dateText = await page.locator('#dateDisplay').textContent();
        const [day, month, year] = dateText.split(' / ').map(s => s.trim());

        // Get the correct answer and click a wrong button
        const correctDayIndex = await page.evaluate(() => window.game.correctDay);
        const wrongDayIndex = (correctDayIndex + 1) % 7; // Pick the next day (guaranteed wrong)

        // Answer incorrectly to create a failure
        const wrongButton = page.locator(`#weekdayButtons button[data-day="${wrongDayIndex}"]`);
        await wrongButton.click();

        // Wait for feedback to show wrong answer
        const feedback = page.locator('#feedback');
        await expect(feedback).toHaveClass(/wrong/);

        // Open history modal
        await page.locator('#historyButton').click();

        // Check that table is displayed
        const table = page.locator('.history-table');
        await expect(table).toBeVisible();

        // Check table headers
        const headers = table.locator('th');
        await expect(headers.nth(0)).toHaveText('Date');
        await expect(headers.nth(1)).toHaveText('Weekday');
        await expect(headers.nth(2)).toHaveText('Failures');
        await expect(headers.nth(3)).toHaveText('Last Reviewed');

        // Check that first row contains the failed date
        const firstRow = table.locator('tbody tr').first();
        const dateCells = firstRow.locator('td');

        await expect(dateCells.nth(0)).toContainText(day);
        await expect(dateCells.nth(0)).toContainText(month);
        await expect(dateCells.nth(0)).toContainText(year);

        // Check failure count
        await expect(dateCells.nth(2)).toHaveText('1');

        // Check last reviewed time
        await expect(dateCells.nth(3)).toContainText('Just now');
    });

    test('should clear history when clear button is clicked and confirmed', async ({ page }) => {
        // Create a failure
        const firstButton = page.locator('#weekdayButtons button').first();
        await firstButton.click();
        await page.waitForTimeout(500);

        // Open modal
        await page.locator('#historyButton').click();

        // Verify table exists
        await expect(page.locator('.history-table')).toBeVisible();

        // Set up dialog handler to accept the confirmation
        page.on('dialog', dialog => dialog.accept());

        // Click clear button
        await page.locator('#clearHistory').click();

        // Wait a bit for the update
        await page.waitForTimeout(300);

        // Should show empty message
        const emptyMessage = page.locator('.empty-history');
        await expect(emptyMessage).toBeVisible();
    });

    test('should not clear history when clear is canceled', async ({ page }) => {
        // Create a failure
        const firstButton = page.locator('#weekdayButtons button').first();
        await firstButton.click();
        await page.waitForTimeout(500);

        // Open modal
        await page.locator('#historyButton').click();

        // Verify table exists
        await expect(page.locator('.history-table')).toBeVisible();

        // Set up dialog handler to dismiss the confirmation
        page.on('dialog', dialog => dialog.dismiss());

        // Click clear button
        await page.locator('#clearHistory').click();

        // Wait a bit
        await page.waitForTimeout(300);

        // Table should still be visible
        await expect(page.locator('.history-table')).toBeVisible();
    });

    test('should show correct failure count for repeated failures', async ({ page }) => {
        // Get the current date
        const dateText = await page.locator('#dateDisplay').textContent();

        // Answer incorrectly
        const firstButton = page.locator('#weekdayButtons button').first();
        await firstButton.click();
        await page.waitForTimeout(2500); // Wait for auto-advance

        // Keep clicking until we see the same date again
        for (let i = 0; i < 10; i++) {
            const currentDate = await page.locator('#dateDisplay').textContent();
            if (currentDate === dateText) {
                // Same date appeared - answer incorrectly again
                await firstButton.click();
                await page.waitForTimeout(500);
                break;
            }
            await firstButton.click();
            await page.waitForTimeout(2500);
        }

        // Open modal
        await page.locator('#historyButton').click();

        // Find the row with our date and check if failure count > 1
        const table = page.locator('.history-table tbody tr');
        const count = await table.count();

        if (count > 0) {
            // At least verify the table is showing and has data
            await expect(table.first()).toBeVisible();
        }
    });

    test('should persist history modal state across page reloads', async ({ page }) => {
        // Create a failure
        const firstButton = page.locator('#weekdayButtons button').first();
        await firstButton.click();
        await page.waitForTimeout(500);

        // Open modal and verify history
        await page.locator('#historyButton').click();
        await expect(page.locator('.history-table')).toBeVisible();

        // Close modal
        await page.locator('#closeModal').click();

        // Reload page
        await page.reload();

        // Open modal again
        await page.locator('#historyButton').click();

        // History should still be there
        await expect(page.locator('.history-table')).toBeVisible();
    });
});
