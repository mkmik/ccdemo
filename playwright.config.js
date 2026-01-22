import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for Weekday Game UI tests
 */
export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined, // Increased from 1 to speed up CI
  reporter: 'html',
  timeout: 30000, // 30 seconds per test
  globalTimeout: process.env.CI ? 50 * 60 * 1000 : undefined, // 50 minutes in CI

  use: {
    baseURL: 'http://localhost:8080',
    trace: 'on-first-retry',
    actionTimeout: 10000, // 10 seconds for actions
    navigationTimeout: 15000, // 15 seconds for page loads
    launchOptions: {
      args: [
        '--mute-audio',
        '--autoplay-policy=no-user-gesture-required',
      ],
    },
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  webServer: {
    command: 'npx http-server . -p 8080',
    url: 'http://localhost:8080',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
});
