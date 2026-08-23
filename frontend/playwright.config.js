import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  retries: 0,
  reporter: 'list',
  use: {
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:3000',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: {
    command: 'npm run dev',
    // F-28 / project-plans/06-execution-plan.md P1.5: `use.baseURL` above
    // already read E2E_BASE_URL, but this readiness-wait url was still
    // hardcoded to :3000 -- targeting the isolated stack's frontend_e2e
    // (port 3001) meant Playwright's own "is the server up yet" check
    // watched the wrong port (the shared dev frontend, already up on 3000),
    // so tests could start navigating to :3001 before frontend_e2e was
    // actually ready.
    url: process.env.E2E_BASE_URL || 'http://localhost:3000',
    reuseExistingServer: true,
    timeout: 30_000,
  },
});
