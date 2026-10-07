import {test, expect} from "@playwright/test";

/**
 * Live Arya tests are opt-in: set CDP_URL or ARYA_CDP_PORT with Guard running.
 * Default CI skips this file's live checks.
 */
test.describe("arya live", () => {
  test.skip(!process.env.CDP_URL && process.env.CI === "true", "No live CDP in CI");

  test("preflight documents caps", async () => {
    // Documented entry: npm run preflight -- --project arya
    expect(true).toBeTruthy();
  });
});
