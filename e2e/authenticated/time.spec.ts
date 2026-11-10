/**
 * Exemplar route. `/time` is the densest accessibility surface in the app — a log of days, each
 * holding a list of entries with their own edit, continue and menu controls — so it is the pattern
 * every other route should be measured against.
 *
 * What these specs pin down:
 *  - the log is readable as text: landmarks, one `h1`, a named region per ISO week and per day;
 *  - entry controls are addressable *within a day*, because the same description repeats across
 *    days and a page-wide locator would resolve to several elements;
 *  - the view is visible in the accessibility tree, not only on screen: a navigation named View
 *    whose current link is the open tab, and a period label between arrows that say the unit.
 *
 * Everything here holds for any signed-in member, so every role project runs it. The one part of
 * `/time` that cannot — the committed aria snapshot, which describes one role's frozen week —
 * lives in admin/time-week.spec.ts.
 */
import { expect, test, visit } from "../fixtures";
import { FROZEN_WEEK_PATH } from "../seed";

/** The frozen week's days, as their regions are named: the full date, newest first. */
const FROZEN_DAYS = [
  "Sunday, March 9, 2025",
  "Saturday, March 8, 2025",
  "Friday, March 7, 2025",
  "Thursday, March 6, 2025",
  "Wednesday, March 5, 2025",
  "Tuesday, March 4, 2025",
  "Monday, March 3, 2025",
] as const;

test.beforeEach(async ({ page }) => {
  await visit(page, "/time");
});

test("exposes the log as landmarks, one h1 and a region per week and day", async ({ page }) => {
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Time tracking");
  await expect(page.getByRole("navigation", { name: "Primary navigation" })).toBeVisible();
  await expect(page.getByRole("banner")).toBeVisible();

  // Two ISO weeks, newest first, each a region named by its heading.
  const weeks = page.getByRole("region", { name: /^Week \d+ · / });
  await expect(weeks).toHaveCount(2);

  // Today is always in the log and says so; it can be logged into unless a submitted month or a
  // full-day leave closes it.
  const today = page.getByRole("region", { name: /, Today$/ });
  await expect(today).toBeVisible();
  await expect(
    today
      .getByRole("button", { name: /^Add entry on / })
      .or(today.getByRole("img", { name: "Locked by a submitted timesheet" }))
      .or(today.getByText("On leave")),
  ).toBeVisible();
});

test("names the views as tabs and the period with its unit", async ({ page }) => {
  const views = page.getByRole("navigation", { name: "View" });
  await expect(views.getByRole("link")).toHaveCount(3);
  await expect(views.getByRole("link", { name: "Days" })).toHaveAttribute("aria-current", "page");
  await expect(views.getByRole("link", { name: "Weeks" })).not.toHaveAttribute("aria-current");

  // The header is the unit: a fortnight between arrows that name it as their step.
  await expect(page.getByRole("button", { name: /^\w{3} \d+ – .*\d{4}$/ })).toBeVisible();
  await expect(page.getByRole("button", { name: "Previous 2 weeks" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Next 2 weeks" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Today" })).toBeVisible();
  await expect(page.getByRole("combobox", { name: "What are you working on?" })).toBeVisible();
});

test("scopes entry controls to their day", async ({ page }) => {
  // The frozen week rather than today's, because this is the one test here that needs entries to
  // exist. An old `?week=` link opens the Days view anchored on that week.
  await visit(page, FROZEN_WEEK_PATH);

  const counts: number[] = [];

  for (const day of FROZEN_DAYS) {
    const entries = page.getByRole("region", { name: day }).getByRole("listitem");
    const count = await entries.count();

    if (count === 0) continue;

    counts.push(count);

    for (const entry of await entries.all()) {
      await expect(entry.getByRole("button", { name: /^Edit / })).toHaveCount(1);
      // Delete lives in the row's menu, so the menu trigger is what the row carries.
      await expect(entry.getByRole("button", { name: /^More actions for / })).toHaveCount(1);
      // Continue starts a timer with the row's project and description.
      await expect(entry.getByRole("button", { name: /^Continue / })).toHaveCount(1);
    }
  }

  expect(
    counts,
    `${FROZEN_WEEK_PATH} holds no entries at all — is the e2e database seeded? \`pnpm db:test\``,
  ).not.toEqual([]);

  // Scoping to a day only means something when a day holds more than one entry, and both frozen
  // weeks are built with such a day.
  expect(
    Math.max(...counts),
    "no day of the frozen week holds more than one entry",
  ).toBeGreaterThan(1);
});

test("switches views from the tabs and the digit keys", async ({ page }) => {
  // `/time` is `force-dynamic` and every view change is a navigation; a cold dev server can take
  // well over the default on the first render of each.
  test.setTimeout(90_000);

  const views = page.getByRole("navigation", { name: "View" });

  // The link is in the DOM before React hydrates; retrying the click-and-assert pair is the honest
  // wait, and opening a view is idempotent.
  await expect(async () => {
    await views.getByRole("link", { name: "Weeks" }).click();
    await expect(views.getByRole("link", { name: "Weeks" })).toHaveAttribute(
      "aria-current",
      "page",
    );
  }).toPass({ timeout: 60_000 });
  await expect(page).toHaveURL(/view=weeks/);
  // Weeks is one calendar month, so the arrows step a month.
  await expect(page.getByRole("button", { name: "Previous month" })).toBeVisible();
  await expect(page.getByRole("group", { name: /^Week \d+, / }).first()).toBeVisible();

  await page.getByRole("heading", { level: 1 }).click();
  await page.keyboard.press("3");
  await expect(views.getByRole("link", { name: "Months" })).toHaveAttribute(
    "aria-current",
    "page",
    { timeout: 60_000 },
  );
  await expect(page.getByRole("button", { name: "Previous year" })).toBeVisible();
  // The year calendar: twelve month cards, each a button named by its month and hours.
  await expect(page.getByRole("button", { name: /^January \d{4}, / })).toBeVisible();
  await expect(page.getByRole("group", { name: /^Days of December \d{4}$/ })).toBeVisible();
});

test("lands old scope and lens links on the matching tab", async ({ page }) => {
  for (const [path, tab] of [
    ["/time?scope=day", "Days"],
    ["/time?scope=week&lens=agenda", "Days"],
    ["/time?lens=grid", "Weeks"],
    ["/time?zoom=month", "Months"],
  ] as const) {
    await visit(page, path);
    await expect(
      page.getByRole("navigation", { name: "View" }).getByRole("link", { name: tab }),
    ).toHaveAttribute("aria-current", "page");
  }
});

test("has no WCAG 2.2 AA violations", { tag: "@a11y" }, async ({ makeAxeBuilder }, testInfo) => {
  const results = await makeAxeBuilder().analyze();

  // Attached so a failure is diagnosable from the report without re-running the suite.
  await testInfo.attach("axe-results.json", {
    body: JSON.stringify(results.violations, null, 2),
    contentType: "application/json",
  });

  expect(results.violations).toEqual([]);
});
