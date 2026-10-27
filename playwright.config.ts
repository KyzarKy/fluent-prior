// End-to-end tests run against the dev servers at phone width, since learners answer on
// their phones. The API runs with the fake grader: tests never spend Groq's free quota.
import { defineConfig, devices } from "@playwright/test";

const isCI = Boolean(process.env.CI);

export default defineConfig({
  testDir: "e2e",
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 1 : 0,
  reporter: isCI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: "http://localhost:5180",
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "phone",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 375, height: 812 },
        isMobile: true,
        hasTouch: true,
      },
    },
  ],
  // Never reuse a running dev server: one started by hand uses the real grader, and a test
  // run against it would spend the free quota. A busy port fails the run instead.
  webServer: [
    {
      command: "npm run dev:server",
      url: "http://localhost:8790/api/health",
      env: { GRADER: "fake" },
      reuseExistingServer: false,
      timeout: 60_000,
    },
    {
      command: "npm run dev:web",
      url: "http://localhost:5180",
      reuseExistingServer: false,
      timeout: 60_000,
    },
  ],
});
