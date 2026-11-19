import { defineConfig, devices } from "@playwright/test";

// Every test runs in Chromium, Firefox and WebKit.
export default defineConfig({
  testDir: "tests",
  fullyParallel: true,
  reporter: "list",
  use: { baseURL: "http://127.0.0.1:4173" },
  webServer: { command: "node tests/serve.mjs", url: "http://127.0.0.1:4173/tests/fixture.html", reuseExistingServer: true },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "firefox", use: { ...devices["Desktop Firefox"] } },
    { name: "webkit", use: { ...devices["Desktop Safari"] } },
  ],
});
