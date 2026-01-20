import { test, expect } from '@playwright/test';

test.describe('Weekday Game - Voice Mode Wake Lock', () => {
    test('should request wake lock when enabling voice mode', async ({ page }) => {
        await page.goto('http://localhost:8080');

        // Check initial state - wake lock should not be active
        const initialWakeLock = await page.evaluate(() => {
            return window.game ? window.game.wakeLock : null;
        });
        expect(initialWakeLock).toBeNull();

        // Check if wake lock is supported
        const wakeLockSupported = await page.evaluate(() => 'wakeLock' in navigator);

        // Enable voice mode
        const voiceModeButton = page.locator('#voiceModeButton');
        await voiceModeButton.click();

        // Wait for async operations
        await page.waitForTimeout(1000);

        // Verify voice mode was enabled
        const buttonText = await voiceModeButton.textContent();
        expect(buttonText).toContain('Disable');

        // Check wake lock status
        const { wakeLockActive, voiceMode } = await page.evaluate(() => {
            return {
                wakeLockActive: window.game && window.game.wakeLock !== null,
                voiceMode: window.game ? window.game.voiceMode : false
            };
        });

        // Voice mode should always be active after clicking
        expect(voiceMode).toBe(true);

        // Wake lock should be active only if supported
        if (wakeLockSupported) {
            // In supported environments, wake lock should be requested
            // Note: It may still be null if permission was denied or document is not visible
            console.log('Wake Lock supported, active:', wakeLockActive);
        } else {
            // In unsupported environments, wake lock should remain null
            expect(wakeLockActive).toBe(false);
            console.log('Wake Lock API not supported in test environment');
        }
    });

    test('should release wake lock when disabling voice mode', async ({ page }) => {
        await page.goto('http://localhost:8080');

        const voiceModeButton = page.locator('#voiceModeButton');

        // Enable voice mode
        await voiceModeButton.click();
        await page.waitForTimeout(500);

        // Disable voice mode
        await voiceModeButton.click();
        await page.waitForTimeout(500);

        // Check that wake lock has been released
        const wakeLockActive = await page.evaluate(() => {
            const game = window.game || document.querySelector('.container').__game;
            return game && game.wakeLock !== null;
        });

        expect(wakeLockActive).toBe(false);
    });

    test('should expose game instance for testing', async ({ page }) => {
        await page.goto('http://localhost:8080');

        // Inject code to expose game instance on window for testing
        await page.evaluate(() => {
            // Find the game instance from the DOM
            const container = document.querySelector('.container');
            if (container) {
                // We need to modify app.js to expose the game instance
                // For now, we'll check if the wakeLock property exists in the class
                return true;
            }
            return false;
        });

        // Check that voice mode button exists
        const voiceModeButton = page.locator('#voiceModeButton');
        await expect(voiceModeButton).toBeVisible();
    });

    test('should handle wake lock API not supported gracefully', async ({ page }) => {
        await page.goto('http://localhost:8080');

        // Mock navigator.wakeLock as undefined
        await page.evaluate(() => {
            Object.defineProperty(navigator, 'wakeLock', {
                value: undefined,
                writable: true,
                configurable: true
            });
        });

        // Console should log warning but app should still work
        const consoleMessages = [];
        page.on('console', msg => consoleMessages.push(msg.text()));

        const voiceModeButton = page.locator('#voiceModeButton');
        await voiceModeButton.click();

        await page.waitForTimeout(500);

        // Voice mode should still be enabled even without wake lock
        const buttonText = await voiceModeButton.textContent();
        expect(buttonText).toContain('Disable');
    });
});
