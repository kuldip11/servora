import { defineConfig, devices } from "@playwright/test";

const externalBaseUrl = process.env.WEBSITE_E2E_BASE_URL;
const production = process.env.WEBSITE_E2E_MODE === "production";
const baseURL = externalBaseUrl ?? "http://127.0.0.1:3001";

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 30_000,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "html",
  use: {
    baseURL,
    trace: "retain-on-failure",
  },
  webServer: externalBaseUrl
    ? undefined
    : {
        command: production ? "npm run start" : "npm run dev",
        url: baseURL,
        reuseExistingServer: !production && !process.env.CI,
      },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
