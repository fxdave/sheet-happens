import { expect, test, type Page } from "@playwright/test";

type VisualProject = "desktop" | "mobile";

type StoryVisualCase = {
  id: string;
  slug: string;
  theme: "dark" | "light";
  locale: "en" | "hu";
  projects?: VisualProject[];
  prepare?: (page: Page) => Promise<void>;
};

const storyCases: StoryVisualCase[] = [
  {
    id: "ui-button--variants",
    slug: "button-variants-dark",
    theme: "dark",
    locale: "en",
  },
  {
    id: "ui-field--error",
    slug: "field-error-light",
    theme: "light",
    locale: "en",
  },
  {
    id: "sheet-weeklytimegrid--cell-states",
    slug: "weekly-grid-cell-states-light",
    theme: "light",
    locale: "hu",
  },
  {
    id: "sheet-dashboardcards--data-driven-admin",
    slug: "dashboard-admin-dark",
    theme: "dark",
    locale: "hu",
  },
  /**
   * The leave calendar's ribbons, lanes, half days and holiday tint are layout that no unit test
   * sees: a ribbon riding over the day numbers passed every assertion before it was caught here.
   */
  {
    id: "sheet-leavecalendar--employee-view",
    slug: "leave-calendar-employee-dark",
    theme: "dark",
    locale: "en",
  },
  {
    id: "sheet-leavecalendar--crowded-week",
    slug: "leave-calendar-crowded-light",
    theme: "light",
    locale: "en",
    projects: ["desktop"],
  },
  {
    id: "sheet-leavecalendar--admin-view",
    slug: "leave-calendar-admin-light",
    theme: "light",
    locale: "en",
    projects: ["desktop"],
  },
  {
    id: "layout-appshell--foundation-page",
    slug: "app-shell-desktop-dark",
    theme: "dark",
    locale: "hu",
    projects: ["desktop"],
  },
  {
    id: "layout-atmosphere--over-canvas",
    slug: "atmosphere-over-canvas-dark",
    theme: "dark",
    locale: "en",
    projects: ["desktop"],
  },
  /**
   * The three light cases below mirror the dark ones directly above and in the block after.
   * Until the light relight there was no full-screen light baseline at all — the ten light
   * snapshots were single components — so the chassis, the sidebar plane and the whole
   * atmosphere layer shipped with no visual regression cover on the side of the theme where
   * they differ most.
   *
   * Two of them point at a `*Light` story rather than reusing the dark story's id with a
   * different `theme` here. `AppShell` and `DashboardCards` pin `globals: { theme: "dark" }` on
   * their meta, and a story-level global outranks the URL — so the `globals` this file writes
   * are silently ignored for those two and the screenshot comes back dark. The `theme` field is
   * still set to `light` below because it also drives the locale/theme pair the story loads with;
   * it simply is not what selects the theme in those two cases.
   */
  {
    id: "layout-appshell--foundation-page-light",
    slug: "app-shell-desktop-light",
    theme: "light",
    locale: "hu",
    projects: ["desktop"],
  },
  {
    id: "layout-atmosphere--over-canvas",
    slug: "atmosphere-over-canvas-light",
    theme: "light",
    locale: "en",
    projects: ["desktop"],
  },
  {
    id: "sheet-dashboardcards--data-driven-admin-light",
    slug: "dashboard-admin-light",
    theme: "light",
    locale: "hu",
  },
  {
    id: "layout-appshell--mobile-navigation",
    slug: "app-shell-mobile-drawer-dark",
    theme: "dark",
    locale: "hu",
    projects: ["mobile"],
    prepare: async (page) => {
      await page.getByRole("button", { name: /navigáció megnyitása/i }).click();
      await expect(page.getByRole("dialog")).toBeVisible();
    },
  },
  {
    id: "layout-commandpill--default",
    slug: "command-pill-dark",
    theme: "dark",
    locale: "en",
  },
  {
    id: "layout-languagetoggle--default",
    slug: "language-toggle-dark",
    theme: "dark",
    locale: "en",
  },
  {
    id: "layout-notificationbutton--unread",
    slug: "notification-menu-dark",
    theme: "dark",
    locale: "en",
    projects: ["desktop"],
    prepare: async (page) => {
      await page.getByRole("button", { name: /notifications/i }).click();
      await expect(page.getByRole("menu")).toBeVisible();
    },
  },
  {
    id: "layout-usermenu--default",
    slug: "user-menu-dark",
    theme: "dark",
    locale: "en",
    projects: ["desktop"],
    prepare: async (page) => {
      await page.getByRole("button", { name: /user menu/i }).click();
      await expect(page.getByRole("menu")).toBeVisible();
    },
  },
  {
    id: "layout-runningtimerpill--running",
    slug: "running-timer-pill-dark",
    theme: "dark",
    locale: "en",
    projects: ["desktop"],
  },
  {
    /*
      Points at the `*Light` story rather than flipping `theme` here, for the same reason the
      AppShell cases above do: the meta pins `theme: "dark"` and a story-level global outranks the
      URL. The pill sits on the header plane, which is the surface the two themes differ on most.
    */
    id: "layout-runningtimerpill--running-light",
    slug: "running-timer-pill-light",
    theme: "light",
    locale: "en",
    projects: ["desktop"],
  },
  {
    id: "layout-runningtimerpill--compact-mobile",
    slug: "running-timer-pill-compact-mobile",
    theme: "dark",
    locale: "en",
    projects: ["mobile"],
  },
  {
    id: "layout-mobilebottombar--default",
    slug: "mobile-bottom-bar-dark",
    theme: "dark",
    locale: "en",
    projects: ["mobile"],
  },
  {
    id: "layout-commandpalette--default",
    slug: "command-palette-dark",
    theme: "dark",
    locale: "en",
    projects: ["desktop"],
    prepare: async (page) => {
      await expect(page.getByRole("dialog")).toBeVisible();
    },
  },
  {
    id: "sheet-timeentryform--default",
    slug: "time-entry-form-light",
    theme: "light",
    locale: "en",
    projects: ["desktop", "mobile"],
  },
  /**
   * The `/time` chrome: the period navigator heads every view and the heat navigator is the Months
   * view's top half. The Days view's blocks have no baseline yet: they are darwin-only screenshots.
   */
  {
    id: "sheet-periodnavigator--week",
    slug: "period-navigator-dark",
    theme: "dark",
    locale: "en",
    projects: ["desktop"],
  },
  {
    id: "sheet-monthheatnavigator--september",
    slug: "month-heat-navigator-dark",
    theme: "dark",
    locale: "en",
    projects: ["desktop"],
  },
  {
    id: "sheet-monthheatnavigator--september-light",
    slug: "month-heat-navigator-light",
    theme: "light",
    locale: "en",
    projects: ["desktop"],
  },
  /**
   * The month level. `ForgottenProject` rather than `TrackedBand` because it carries both row
   * states — a project with hours and a live one with none — and because `TrackedBand` has a `play`
   * function that Storybook runs on load, which would leave a focus ring inside the baseline.
   */
  {
    id: "sheet-monthoverview--forgotten-project",
    slug: "month-overview-dark",
    theme: "dark",
    locale: "en",
    projects: ["desktop"],
  },
  {
    id: "sheet-monthoverview--forgotten-project",
    slug: "month-overview-light",
    theme: "light",
    locale: "hu",
    projects: ["desktop"],
  },
  {
    id: "sheet-monthoverview--empty-month",
    slug: "month-overview-empty-dark",
    theme: "dark",
    locale: "en",
    projects: ["desktop"],
  },
  {
    id: "sheet-monthoverview--mobile-rows",
    slug: "month-overview-mobile-dark",
    theme: "dark",
    locale: "en",
    projects: ["mobile"],
  },
  /**
   * The three L4 member shapes, which is what §16 asks the baselines to cover. Hybrid is both
   * bands with their headings; declared-only is the one case that drops both headings and the
   * tracked band entirely; locked is the read-only form a submitted month leaves behind.
   */
  {
    id: "sheet-monthoverview--hybrid-month",
    slug: "month-overview-hybrid-dark",
    theme: "dark",
    locale: "en",
    projects: ["desktop"],
  },
  {
    id: "sheet-monthoverview--hybrid-month-light",
    slug: "month-overview-hybrid-light",
    theme: "light",
    locale: "hu",
    projects: ["desktop"],
  },
  {
    id: "sheet-monthoverview--declared-only",
    slug: "month-overview-declared-only-dark",
    theme: "dark",
    locale: "en",
    projects: ["desktop"],
  },
  {
    id: "sheet-monthoverview--declared-locked",
    slug: "month-overview-declared-locked-dark",
    theme: "dark",
    locale: "en",
    projects: ["desktop"],
  },
  {
    id: "sheet-monthoverview--hybrid-month-mobile",
    slug: "month-overview-hybrid-mobile-dark",
    theme: "dark",
    locale: "en",
    projects: ["mobile"],
  },
  {
    id: "sheet-timerstartdialog--open",
    slug: "timer-start-dialog-dark",
    theme: "dark",
    locale: "en",
    projects: ["desktop"],
    prepare: async (page) => {
      await expect(page.getByRole("dialog")).toBeVisible();
    },
  },
  {
    id: "sheet-timerstartdialog--open-light",
    slug: "timer-start-dialog-light",
    theme: "light",
    locale: "en",
    projects: ["desktop"],
    prepare: async (page) => {
      await expect(page.getByRole("dialog")).toBeVisible();
    },
  },
  {
    id: "sheet-timebreakdowndialog--default",
    slug: "time-breakdown-dialog-dark",
    theme: "dark",
    locale: "en",
    projects: ["desktop"],
    prepare: async (page) => {
      await expect(page.getByRole("dialog")).toBeVisible();
    },
  },
  {
    id: "sheet-pdfviewer--ready",
    slug: "pdf-viewer-light",
    theme: "light",
    locale: "en",
    projects: ["desktop"],
  },
  {
    id: "sheet-chartprimitives--trend",
    slug: "chart-primitives-trend-dark",
    theme: "dark",
    locale: "en",
    projects: ["desktop"],
  },
  {
    id: "sheet-infopageeditor--default",
    slug: "info-page-editor-light",
    theme: "light",
    locale: "en",
    projects: ["desktop"],
  },
  /**
   * The brand form controls. The interesting pixels are all inside a popover, so each of
   * these has to be captured open.
   *
   * The two below ride on their story's own `play` function, which Storybook runs on load
   * and which already leaves the control open. Clicking again from `prepare` cannot work:
   * these popovers are modal, so while one is open the trigger sits in an `aria-hidden`
   * subtree and no role query will find it.
   */
  {
    id: "ui-select--threshold-boundary",
    slug: "select-search-dark",
    theme: "dark",
    locale: "en",
    projects: ["desktop"],
    prepare: async (page) => {
      await expect(page.getByRole("combobox", { name: /search/i })).toBeVisible();
    },
  },
  {
    id: "ui-combobox--empty-results",
    slug: "combobox-empty-light",
    theme: "light",
    locale: "en",
    projects: ["desktop"],
    prepare: async (page) => {
      await expect(page.getByText(/no projects found/i)).toBeVisible();
    },
  },
  /**
   * The suggestion list is a new panel surface with its own emphasis colour on the matched slice
   * and its own active row, so it earns a baseline on both sides of the theme. Both stories are
   * left open by their own `play` function, like the two controls above.
   */
  {
    id: "ui-suggestinput--filtered",
    slug: "suggest-input-filtered-dark",
    theme: "dark",
    locale: "en",
    projects: ["desktop"],
    prepare: async (page) => {
      await expect(page.getByRole("option", { name: /code review/i })).toBeVisible();
    },
  },
  {
    id: "ui-suggestinput--zero-keystroke-light",
    slug: "suggest-input-zero-keystroke-light",
    theme: "light",
    locale: "en",
    projects: ["desktop"],
    prepare: async (page) => {
      await expect(page.getByRole("listbox", { name: /recent descriptions/i })).toBeVisible();
    },
  },
  {
    // Hungarian weekday abbreviations and month name are the highest-risk locale detail
    // in the calendar, and mobile is where the popover width is tightest.
    id: "ui-datepicker--hungarian",
    slug: "date-picker-open-dark-hu",
    theme: "dark",
    locale: "hu",
    projects: ["desktop", "mobile"],
    prepare: async (page) => {
      await page.getByRole("button", { name: /entry date/i }).click();
      await expect(page.getByRole("grid")).toBeVisible();
    },
  },
  {
    id: "ui-daterangepicker--default",
    slug: "date-range-picker-open-dark",
    theme: "dark",
    locale: "en",
    projects: ["desktop"],
    prepare: async (page) => {
      await page.getByRole("button", { name: /period/i }).click();
      await expect(page.getByRole("grid").first()).toBeVisible();
    },
  },
  {
    id: "ui-monthpicker--default",
    slug: "month-picker-open-light",
    theme: "light",
    locale: "en",
    projects: ["desktop"],
    prepare: async (page) => {
      await page.getByRole("button", { name: /^month$/i }).click();
      await expect(page.getByRole("grid", { name: /select month/i })).toBeVisible();
    },
  },
];

async function openStory(page: Page, story: StoryVisualCase) {
  const globals = new URLSearchParams({
    globals: `theme:${story.theme};locale:${story.locale}`,
  });

  await page.goto(`/iframe.html?id=${story.id}&${globals.toString()}`);
  await page.locator("#storybook-root").waitFor({ state: "visible" });
  await page.addStyleTag({
    content: `
      *, *::before, *::after {
        animation-delay: 0s !important;
        animation-duration: 0s !important;
        caret-color: transparent !important;
        scroll-behavior: auto !important;
        transition-delay: 0s !important;
        transition-duration: 0s !important;
      }
    `,
  });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForLoadState("networkidle");
}

for (const story of storyCases) {
  test(`${story.slug}`, async ({ page }, testInfo) => {
    const project = testInfo.project.name as VisualProject;
    if (story.projects && !story.projects.includes(project)) {
      test.skip(true, `${story.slug} is scoped to ${story.projects.join(", ")}`);
    }

    await openStory(page, story);
    await story.prepare?.(page);
    await expect(page).toHaveScreenshot(`${story.slug}.png`, {
      fullPage: true,
    });
  });
}
