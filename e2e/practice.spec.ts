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

  // One answer per situation: it's frozen, and Check is off until the next one.
  await expect(page.getByLabel("Your answer")).not.toBeEditable();
  await expect(page.getByRole("button", { name: "Check my answer" })).toBeDisabled();
  await page.getByRole("button", { name: "Next situation" }).click();
  await expect(page.getByLabel("Your answer")).toBeEditable();
  await expect(page.getByLabel("Your answer")).toHaveValue("");
  await expect(feedback).toHaveCount(0);

  // The answer was logged: it survives a reload and counts toward a task type.
  await page.reload();
  await page.getByRole("tab", { name: "Progress" }).click();
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

test("a new visitor can look at a sample learner's progress and come back", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("tab", { name: "Progress" }).click();
  await page.getByRole("button", { name: "See a sample learner's two weeks" }).click();

  await expect(page.getByRole("heading", { name: "What a sample learner knows" })).toBeVisible();
  await expect(page.getByRole("radio", { name: "Over time" })).toBeChecked();
  await expect(
    page.getByRole("listitem").filter({ hasText: "Irregular past tense" }),
  ).toContainText("→");
  await expectNoAxeViolations(page);

  await page.getByRole("button", { name: "Back to your progress" }).click();
  await expect(page.getByRole("heading", { name: "What you know" })).toBeVisible();
  // The sample was never saved as the visitor's own.
  await page.reload();
  await page.getByRole("tab", { name: "Progress" }).click();
  await expect(page.getByText(/· 0 answers$/).first()).toBeVisible();
});

test("how it works is a link that opens a modal, and closes", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "How it works" }).click();
  await expect(page).toHaveURL(/#how-it-works$/);
  const dialog = page.getByRole("dialog", { name: "How it works" });
  await expect(dialog.getByRole("heading", { name: 'Why "prior"' })).toBeVisible();
  await expectNoAxeViolations(page);

  // The title and close button stay in view while the body scrolls.
  await dialog.getByRole("heading", { name: "Your data" }).scrollIntoViewIfNeeded();
  await expect(dialog.getByRole("button", { name: "Close" })).toBeInViewport();

  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(page).not.toHaveURL(/#how-it-works$/);
  await page.getByRole("link", { name: "How it works" }).click();
  await dialog.getByRole("button", { name: "Close" }).click();
  await expect(dialog).toBeHidden();

  // The URL opens it directly.
  await page.goto("/#how-it-works");
  await expect(dialog).toBeVisible();
});

test("check and next are always on screen, and next skips a situation", async ({ page }) => {
  await page.goto("/");
  const check = page.getByRole("button", { name: "Check my answer" });
  const next = page.getByRole("button", { name: "Next situation" });
  await expect(check).toBeDisabled();
  await expect(check).toBeInViewport();
  await expect(next).toBeInViewport();

  await page.getByLabel("Your answer").fill("one");
  await expect(check).toBeEnabled();
  const situation = await page.locator("#scenario-heading").textContent();
  await next.click();
  await expect(page.locator("#scenario-heading")).not.toHaveText(situation ?? "");
  await expect(page.getByLabel("Your answer")).toHaveValue("");

  // With feedback the page scrolls. Scrolled to the end, the buttons are the last thing on
  // it: nothing blank scrolls into view below them.
  await page.getByLabel("Your answer").fill("i can clean you room later");
  await check.click();
  await expect(page.getByRole("region", { name: "Feedback" })).toBeVisible();
  await expectNoAxeViolations(page);
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
  const barEnd = await next.evaluate(
    (button) => button.parentElement?.getBoundingClientRect().bottom,
  );
  expect(barEnd).toBeCloseTo(page.viewportSize()?.height ?? 0, 0);
});

test("the tabs switch views and follow the arrow keys", async ({ page }) => {
  await page.goto("/");
  const practice = page.getByRole("tab", { name: "Practice" });
  await expect(practice).toHaveAttribute("aria-selected", "true");
  await expect(page.getByLabel("Your answer")).toBeVisible();
  await expect(page.getByRole("heading", { name: "What you know" })).toBeHidden();

  await practice.focus();
  await page.keyboard.press("ArrowRight");
  await expect(page.getByRole("tab", { name: "Progress" })).toBeFocused();
  await expect(page.getByRole("heading", { name: "What you know" })).toBeVisible();
  await expect(page.getByLabel("Your answer")).toBeHidden();
  await expectNoAxeViolations(page);
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
  await page.getByRole("tab", { name: "Progress" }).click();

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
