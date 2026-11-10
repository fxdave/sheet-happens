/**
 * Description suggestions on `/time` (`docs/time-entry-suggestions.md`).
 *
 * Three things are worth an end-to-end assertion rather than a component test, because all three
 * cross a boundary a component test cannot see:
 *
 *  - the list is **preloaded**: the server payload already carries this member's own descriptions,
 *    so focusing an empty field offers them with no round-trip and no keystroke;
 *  - accepting with `Enter` **does not submit**, all the way through the real form;
 *  - `Escape` closes the list and leaves the dialog open — the one behaviour that depends on how
 *    React delegates events in the App Router, which is a property of the running app.
 *
 * Everything asserted literally comes from the **frozen week**, never from the generated data.
 * That is also what makes the list itself predictable here: the suggestion window is 90 days back
 * from the *visible* week's end (`SUGGESTION_LOOKBACK_DAYS`), the frozen week sits at
 * `FROZEN_WEEK_START`, and the dev seed only generates entries from twelve months before today
 * forward — so on the frozen week the window contains the frozen entries and nothing else, and the
 * gap only widens as time passes. Even so no test names a description: each one reads what the
 * list actually offered and asserts what the field does with it, because the list is scoped to the
 * project the dialog opens on, and a literal would be pinning that choice rather than the feature.
 */
import type { Page } from "@playwright/test";

import { expect, test, visit } from "../fixtures";
import { FROZEN_WEEK_PATH } from "../seed";

/* One test at a time within this file, and room for a cold `/time` render on top.
 *
 * Every test here needs a hydrated page, which the aria-snapshot specs do not. Run fully parallel,
 * all of them load `/time` in the same instant, and the Turbopack dev server leaves some of the
 * page's chunk requests hanging (the failure `visit` in fixtures.ts describes): the page renders,
 * never hydrates, and `New entry` never gets a handler however often it is clicked. In order, each
 * one hydrates in about a second. The budget is `time.spec.ts`'s reasoning for its own navigation
 * test: a cold first render of a `force-dynamic` page can take well over the default. */
test.describe.configure({ mode: "default", timeout: 60_000 });

test.beforeEach(async ({ page }) => {
  await visit(page, FROZEN_WEEK_PATH);
});

/**
 * Opens the entry dialog from the header's `New entry` button.
 *
 * The button is in the DOM before React hydrates, so a click can land on markup that has no
 * handler yet and silently do nothing — the race `time.spec.ts` names. Retrying the click-and-assert
 * pair is the honest wait. The click is skipped once a dialog is showing: a retry fired at a dialog
 * that was merely slow to appear would otherwise wait on the modal overlay until the test timed out.
 */
async function openEntryDialog(page: Page) {
  const dialog = page.getByRole("dialog");

  await expect(async () => {
    if (!(await dialog.isVisible())) {
      await page.getByRole("button", { name: "New entry" }).click();
    }
    await expect(dialog).toBeVisible({ timeout: 2_000 });
  }).toPass({ timeout: 30_000 });
}

test("preloads the member's own descriptions into the entry dialog", async ({ page }) => {
  await openEntryDialog(page);

  const description = page.getByRole("combobox", { name: /Description/ });

  // The dialog opens with the description empty, so it takes focus and the list is already there:
  // no query typed, nothing fetched.
  await expect(description).toBeFocused();
  await expect(description).toHaveAttribute("aria-expanded", "true");

  const list = page.getByRole("listbox", { name: "Recent descriptions" });
  await expect(list).toBeVisible();
  await expect(list.getByRole("option").first()).toBeVisible();

  // Only the count is announced; the option text reaches a screen reader through
  // `aria-activedescendant` instead, and saying both is the classic combobox double-speak.
  // Inside the dialog: the day log's composer carries a live region of its own.
  await expect(page.getByRole("dialog").getByRole("status")).toHaveText(/\d+ suggestions?/);
});

test("accepts a suggestion with the keyboard without logging the entry", async ({ page }) => {
  await openEntryDialog(page);

  const description = page.getByRole("combobox", { name: /Description/ });
  await expect(description).toBeFocused();

  /* Whatever the list offers first, not a named description: the list is scoped to the project the
     dialog opens on, and which project that is follows the member's recent chips, so a literal
     would be asserting the chip order rather than the keyboard. `ArrowDown` from a fresh list lands
     on the first option, which is the one read here. */
  const option = page
    .getByRole("listbox", { name: "Recent descriptions" })
    .getByRole("option")
    .first();

  await expect(
    option,
    `the frozen week offered no description — is the e2e database seeded? \`pnpm db:test\``,
  ).toBeVisible();

  // The row's first span is the description itself; the second is the `12 times · last used …`
  // meta line, and `textContent` would run the two together.
  const accepted = ((await option.locator("span").first().textContent()) ?? "").trim();

  await description.press("ArrowDown");
  await expect(description).toHaveAttribute("aria-activedescendant", /option-0$/);
  await expect(option).toHaveAttribute("aria-selected", "true");
  await description.press("Enter");

  // Accepted verbatim into the field, list closed — and the dialog is still open, because a
  // half-picked description must never also log an entry.
  await expect(description).toHaveValue(accepted);
  await expect(page.getByRole("listbox", { name: "Recent descriptions" })).toHaveCount(0);
  await expect(page.getByRole("dialog")).toBeVisible();
});

test("closes the list on Escape and the dialog only on the second one", async ({ page }) => {
  await openEntryDialog(page);

  const description = page.getByRole("combobox", { name: /Description/ });
  await expect(description).toBeFocused();
  await expect(page.getByRole("listbox", { name: "Recent descriptions" })).toBeVisible();

  await description.press("Escape");

  await expect(page.getByRole("listbox", { name: "Recent descriptions" })).toHaveCount(0);
  await expect(page.getByRole("dialog")).toBeVisible();

  await description.press("Escape");

  await expect(page.getByRole("dialog")).toHaveCount(0);
});

test("filters the list as a query is typed, and says when nothing matches", async ({ page }) => {
  await openEntryDialog(page);

  const description = page.getByRole("combobox", { name: /Description/ });
  await expect(description).toBeFocused();

  const list = page.getByRole("listbox", { name: "Recent descriptions" });
  const first = list.getByRole("option").first();
  await expect(first).toBeVisible();

  /* Taken from whatever the list actually offered rather than hardcoded, because the two roles
     have different frozen weeks — the assertion is that a prefix of an offered description finds
     it again, which holds for either. */
  const offered = ((await first.locator("span").first().textContent()) ?? "").trim();

  await description.fill("zzz-nothing-like-this");

  await expect(list).toHaveCount(0);
  await expect(page.getByText("No matching description")).toBeVisible();

  await description.fill(offered.slice(0, 4));

  await expect(list.getByRole("option").first()).toBeVisible();
  await expect(
    list.getByRole("option", { name: new RegExp(escapeForRegExp(offered)) }),
  ).toHaveCount(1);
});

/** A description is data: it may hold `(`, `.` or `+`, none of which may act as a pattern. */
function escapeForRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

test(
  "has no WCAG 2.2 AA violations with the list open",
  { tag: "@a11y" },
  async ({ page, makeAxeBuilder }, testInfo) => {
    await openEntryDialog(page);
    await expect(page.getByRole("listbox", { name: "Recent descriptions" })).toBeVisible();

    const results = await makeAxeBuilder().analyze();

    await testInfo.attach("axe-results.json", {
      body: JSON.stringify(results.violations, null, 2),
      contentType: "application/json",
    });

    expect(results.violations).toEqual([]);
  },
);
