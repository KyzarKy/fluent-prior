// The practice loop end to end, with an automated accessibility check on each screen.
// The API runs the fake grader (playwright.config.ts), so grades are canned, not real.

import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";

/** Fails on any WCAG 2.2 A or AA violation axe can detect on the page as it is now. */
async function expectNoAxeViolations(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .analyze();
  expect(results.violations).toEqual([]);
}

test("answering a scenario shows a grade and updates what you know", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Fluent Prior", level: 1 })).toBeVisible();
  await expectNoAxeViolations(page);

  await page.getByLabel("Your answer").fill("the room not ready yet, you can get coffee");
  await page.getByRole("button", { name: "Check my answer" }).click();

  const feedback = page.getByRole("region", { name: "Feedback" });
  await expect(feedback).toBeVisible();
  await expect(feedback).toContainText("Fake grader");
  await expectNoAxeViolations(page);

  // The answer was logged: it survives a reload and counts toward a task type.
  await page.reload();
  await expect(page.getByText(/· 1 answer$/).first()).toBeVisible();
});

test("a visitor can check a sample answer without writing one", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Try a sample answer" }).click();
  await expect(page.getByLabel("Your answer")).not.toHaveValue("");
  await expect(page.getByText("A real learner's answer")).toBeVisible();
  await expectNoAxeViolations(page);

  await page.getByRole("button", { name: "Check my answer" }).click();
  await expect(page.getByRole("region", { name: "Feedback" })).toBeVisible();
});

test("progress over time draws a line for each practiced row", async ({ page }) => {
  // Two days of practice, written before the app loads, in the stored log's format.
  await page.addInitScript(() => {
    const at = (daysAgo: number) => new Date(Date.now() - daysAgo * 86_400_000).toISOString();
    const entry = (daysAgo: number, outcome: string) => ({
      kind: "skill",
      skill: "articles",
      outcome,
      source: "app",
      scenarioId: "broken-lamp",
      at: at(daysAgo),
    });
    localStorage.setItem(
      "fluent-prior:log:v1",
      JSON.stringify([entry(3, "wrong"), entry(1, "right")]),
    );
  });
  await page.goto("/");

  // The radio itself is visually hidden; a learner taps its label.
  await page.locator("label", { hasText: "Over time" }).click();
  await expect(page.getByRole("radio", { name: "Over time" })).toBeChecked();
  const articles = page.getByRole("listitem").filter({ hasText: "A, an, the" });
  await expect(articles).toContainText("→");
  await expect(page.getByRole("listitem").filter({ hasText: "Plural -s" })).toContainText(
    "Not practiced yet",
  );
  await expectNoAxeViolations(page);
});
