import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright E2E test configuration.
 *
 * LOCAL DEVELOPMENT (Windows):
 *   Start the dev server BEFORE running tests:
 *     npm run dev
 *   Then run tests:
 *     npm run test:e2e
 *
 * CI (Linux/Debian):
 *   Server starts automatically with headless browser.
 */
export default defineConfig({
  testDir: "./playwright",
  fullyParallel: false, // Run tests sequentially to maintain game state
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1, // Single worker for sequential test execution
  reporter: process.env.CI ? [["junit", { outputFile: "test-results/e2e-results.xml" }], ["list"]] : [["html"], ["list"]],
  timeout: process.env.CI ? 90000 : 60000, // Longer timeout for CI
  use: {
    // Use Remix dev server (Vite proxies /api to port 3002)
    baseURL: "https://localhost:3000",
    // Accept self-signed SSL certificate from Vite dev server
    ignoreHTTPSErrors: true,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "on-first-retry",
    // Headless mode for CI
    headless: !!process.env.CI,
    // Fixed viewport for consistent screenshots in headless mode
    viewport: { width: 1280, height: 720 },
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        // Override viewport for Desktop Chrome to ensure consistent size in CI headless mode
        viewport: { width: 1280, height: 720 },
      },
    },
    // Note: Mobile and tablet device emulation is handled in tests via browser.newContext()
  ],
  webServer: {
    command: "npm run dev",
    // Use Vite server health check (proxies to API health endpoint)
    url: "https://localhost:3000/api/v1/health",
    ignoreHTTPSErrors: true,
    // CI: start server automatically; Local: reuse existing server (start manually first)
    reuseExistingServer: !process.env.CI,
    // CI needs longer timeout for server startup
    timeout: process.env.CI ? 180000 : 30000,
    // Pass CI environment to the dev server
    env: {
      ...process.env,
      NODE_ENV: "test",
    },
  },
});
