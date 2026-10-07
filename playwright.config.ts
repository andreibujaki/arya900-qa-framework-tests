import {defineConfig} from "@playwright/test";

/**
 * Playwright projects map to adapters.
 * Live Arya must use workers: 1 (single CDP session).
 */
export default defineConfig({
  testDir: "./tests",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"], ["junit", {outputFile: "sessions/latest/playwright-junit.xml"}]],
  projects: [
    {name: "stub", testMatch: /stub\.spec\.ts/, workers: 2},
    {name: "example-echo", testMatch: /echo\.spec\.ts/, workers: 2},
    {name: "arya", testMatch: /arya\.spec\.ts/, workers: 1}
  ]
});
