# Component Library Inventory And API Audit

Date: 2026-06-24

## Sources

- Design inventory: the original design brief (kept outside this repository).
- Library rules: `src/components/README.md`.
- Implemented source: `src/components/ui`, `src/components/sheet`, `src/components/layout`.
- Story coverage: colocated `*.stories.tsx` files.
- Test coverage: colocated `*.test.tsx` files and Storybook play functions.

## Summary

The component library has broad visual coverage now: 35 UI primitive folders, 50 Sheet Happens product component folders, 8 layout folders, 92 Storybook story files, 253 Storybook interaction-rendered tests, 25 Playwright Storybook visual baselines, and one colocated unit test. This is a strong visual and API-contract baseline.

It is not yet a complete production app foundation. The main remaining gaps are real backend query/mutation contracts, route-specific form submission paths, and deeper edge-case behavior coverage once production screens exist.

The next work should move from component-library hardening into real app screens, data contracts, and route-specific flows.

## Readiness Scale

- Ready: API and story coverage are close enough for app use.
- Harden: component exists, but needs API, accessibility, behavior, or story work before real app use.
- Prototype: useful as a visual reference, but mostly static or fixture-driven.
- Missing: present in the design inventory but not implemented as a standalone component.

## High-Priority Findings

### 1. Behavior Test Coverage Still Needs Depth

Current explicit behavior coverage:

- Storybook play tests: AppShell mobile navigation, BulkBar, Button, Checkbox, ChipButton, Combobox, CommandPill, DashboardCards, DayAgenda, DatePicker, Dialog, DocumentPreview, Drawer, Dropdown, Dropzone, Field, FlaggedUserList, InvoiceUploadPanel, LanguageToggle, ListRow, MobileBottomBar, MonthRow, NotificationButton, NotificationPreferences, Pager, PayslipAdminTable, PayslipMonthList, Payslips, PayslipSummaryCard, PayslipUploadPanel, PayslipViewer, PeopleTable, Popover, PreferenceControls, ProfileSettingsPanel, ProjectDrawer, RateDrawer, ReportExportDialog, ReportFilterBar, Reports, RejectDialog, ReviewActionBar, ReviewDiffList, ReviewQueueTable, SecurityMethodList, SegmentedControl, Select, SettingsPanels, StatCard, StatusOverview, SubmitTimesheetDialog, Switch, Table, Tabs, TimeGridTimer, TimesheetStepper, TimesheetSummaryCard, Toast, Tooltip, TotpSetupDialog, TweaksPanel, UserMenu, WeekAgenda, WeeklyTimeGrid.
- Playwright visual baselines: Button variants, Field error, WeeklyTimeGrid cell states, Dashboard admin cards, AppShell desktop, AppShell mobile drawer, CommandPill, CommandPalette, LanguageToggle, NotificationButton menu, UserMenu, MobileBottomBar, TimeEntryForm, DayAgenda, WeekAgenda (desktop dark, desktop light, mobile accordion), TimeBreakdownDialog, PdfViewer, ChartPrimitives, and InfoPageEditor across scoped desktop/mobile viewports.
- Unit tests: StatusPill, TimesheetStepper, ProjectPicker, WeekAgenda.

No item from the original high-priority behavior list is completely untested anymore. Remaining behavior work is deeper coverage:

- Add production route-level Playwright flows once backend-backed app routes exist.
- Add Server Action and form-submission coverage once real mutation contracts exist.

Recommendation: keep Storybook play tests as the first line of defense for reusable components, then add route-level Playwright for each backend-backed app workflow as it appears.

### 2. Custom Composite Accessibility Status

Current composite accessibility status:

- `Combobox`: now exposes combobox/listbox/option/searchbox semantics, active-descendant announcements, arrow navigation, escape handling, disabled-option guards, empty-search behavior, and play tests.
- `DatePicker`: now exposes grid/gridcell semantics, localized labels, disabled trigger support, arrow-key day movement, Home/End/PageUp/PageDown navigation, disabled-date skipping, and play tests.
- `SegmentedControl`: now uses `radiogroup`/`radio` semantics with arrow-key movement, vertical orientation, full-width mobile layout, and play tests.
- `Table`: clickable rows now have keyboard activation, controlled server-sort contracts, captions, mobile card rendering, row action slots, and play tests.
- `Dropzone`: now wires description/error IDs, file list semantics, upload progress, invalid state, drag/drop state, accept validation, accepted/rejected callbacks, and play tests.

Recommendation: treat these as the first hardening batch.

### 3. Product Components Are Mostly Static Showcase Surfaces

The `src/components/sheet` components are now useful Storybook compositions and typed app-route contracts. Storybook is the component-library inspection surface for the large product compositions. Examples:

- `DashboardCards` has been decomposed into data-driven `StatCard`, `FlaggedUserList`, and `StatusOverview` pieces while preserving the visual fixture defaults.
- `WeeklyTimeGrid` now models week navigation, selected project, day metadata, cell state, editing, keyboard movement, mobile day cards, totals, timer state, and save callbacks.
- `TimesheetComponents` now composes smaller typed pieces for the summary card, workflow stepper, invoice upload, month row, and submit confirmation dialog.
- `AdminReview` now composes smaller typed pieces for the queue table, action bar, invoice diff, and reject dialog. `PdfViewer` is available as the standalone document viewer shell.
- `ManagementViews` now composes typed people table, project drawer, and rate drawer pieces. Group-management behavior remains app-specific future work.
- `Reports` now composes typed filter, KPI, chart, export, document preview, and table pieces while preserving visual fixture defaults.
- `Payslips` now composes typed summary, month list, upload panel, admin table, and viewer pieces while preserving visual fixture defaults.
- `SettingsPanels` now composes typed profile, security method, TOTP setup, preference, and notification pieces while preserving visual fixture defaults.
- `AuthScreens` now has typed form/callback contracts and full mode story coverage for sign-in, 2FA, invite, password setup, passkey, reset sent, and done.

Recommendation: use these as app-ready UI contracts for v1 screens, but keep real backend contracts thin and explicit. When a real screen exposes new complexity, extract smaller data-driven components instead of expanding giant props objects.

### 4. Variant API Is Good In Spirit But Inconsistent In Depth

Good patterns:

- `Button`, `Badge`, `Card`, `ChipButton`, `IconButton`, `Avatar`, `StatusPill`, and `EmptyState` have explicit typed visual variants.
- Status-heavy components use unions, especially `StatusPill`.
- Most public props are exported from `*.types.ts`.

Needs normalization:

- Some state booleans are acceptable (`disabled`, `loading`, `checked`, `open`), but visual booleans should be avoided or documented. Current examples to review: `clickable`, `selected`, `removable`, `dot`, `locked`, `showTimer`, `open`.
- Product components use `mode`, `view`, `section`, `role`, and `status`; this is fine, but each should be documented as visual mode vs app state.
- `Toast` exports `ToastKind`, `SheetToaster`, and `notify`, but no exported `ToastProps` because it delegates to Sonner. Treat this as a service-style component.

Recommendation: add an API conventions section to `src/components/README.md` after hardening the primitive APIs.

### 5. Some Design Inventory Items Are Missing As Standalone Components

Missing or folded into larger components:

- `Icon` wrapper: not needed if Lucide components are passed directly, but this should be an explicit decision.
- `LinkButton`: covered by `Button` with `variant="link"` and `asChild`; link usage is now documented in Storybook.
- Route-level command palette wiring should be covered through production workflows instead of a component-library app route.

Recommendation: do not implement all immediately. Add them only when real screens need them, except form primitives and behavior primitives, which are foundational.

## UI Primitive Inventory

| Component        | Status | Notes                                                                                                                                                          |
| ---------------- | ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Avatar           | Ready  | Typed size/tone API. Add image error fallback before profile uploads.                                                                                          |
| Badge            | Ready  | Tone API is simple and good.                                                                                                                                   |
| BulkBar          | Ready  | Has region/live semantics, localized label hooks, and behavior story coverage for selected and empty states.                                                   |
| Button           | Ready  | Good typed variants, loading, `asChild`, icon support.                                                                                                         |
| Card             | Ready  | Variant/density API is useful. `clickable` should be documented as state, not variant sprawl.                                                                  |
| Checkbox         | Ready  | Radix base with checked/disabled states, interaction tests, and Field integration story.                                                                       |
| ChipButton       | Ready  | Good visual API. Removable chips now use a separate labeled remove button and callback.                                                                        |
| CodeInput        | Ready  | Numeric verification-code primitive with paste distribution, arrow/backspace movement, invalid state, and Field integration stories.                           |
| Combobox         | Ready  | Exposes combobox/listbox/searchbox semantics, active-descendant announcements, disabled option guards, empty search, and keyboard selection tests.             |
| DatePicker       | Ready  | Calendar grid with locale labels, disabled trigger/dates, arrow/Home/End/PageUp/PageDown navigation, disabled-date skipping, and play tests.                   |
| Dialog           | Ready  | Radix base with basic and destructive confirm stories, escape close, focus return, focus-containment assertion, and cancel-close coverage.                     |
| Drawer           | Ready  | Radix base with right, left, and bottom variants plus opening, escape close, focus return, and mobile viewport story coverage.                                 |
| Dropdown         | Ready  | Radix base with standard, destructive, checkbox, and radio items plus opening, escape close, focus return, and menu item interaction coverage.                 |
| Dropzone         | Ready  | Accept/error/status semantics, drag state, accepted/rejected callback split, upload progress, and drag/drop play tests.                                        |
| ErrorState       | Ready  | Good static feedback primitive.                                                                                                                                |
| Field            | Ready  | Generates control/message IDs, supports render-prop wiring, and uses `FormMessage` for hint/error output.                                                      |
| FormMessage      | Ready  | Standalone hint/error/success message primitive.                                                                                                               |
| FormSection      | Ready  | Standalone form grouping primitive with title, description, actions, and content.                                                                              |
| IconButton       | Ready  | Good label/icon/active/dot API. Add tooltip examples for unfamiliar icons.                                                                                     |
| Input            | Ready  | Minimal and useful. Needs Field examples for labels/errors.                                                                                                    |
| ListRow          | Ready  | Good mobile/list primitive. Clickable rows render as labeled buttons with selected/disabled semantics and behavior coverage.                                   |
| LockedState      | Ready  | Good static locked-state primitive.                                                                                                                            |
| Pager            | Ready  | Clamps page movement, renders a navigation landmark, accepts label overrides, supports sibling page ranges with ellipses, and has play tests.                  |
| PasswordInput    | Ready  | Password field primitive with typed reveal labels, controlled/uncontrolled visibility, invalid state, and Field integration story coverage.                    |
| Popover          | Ready  | Radix base with basic and aligned stories, escape close, focus return, and keyboard focus movement inside the content.                                         |
| SectionHead      | Ready  | Good composition primitive.                                                                                                                                    |
| SegmentedControl | Ready  | Radio semantics, arrow-key tests, disabled items, vertical orientation, and full-width mobile layout are covered.                                              |
| Select           | Ready  | Replaced native select with a Radix-backed select while preserving the simple `options` API.                                                                   |
| Skeleton         | Ready  | Useful variants. Add reduced-motion visual check later.                                                                                                        |
| StrengthMeter    | Ready  | Password-strength primitive with exported evaluator, progressbar semantics, requirement list, custom labels, and stories.                                      |
| Switch           | Ready  | Radix base with on/off/disabled states, interaction tests, and Field integration story.                                                                        |
| Table            | Ready  | Supports density, loading, empty, selected rows, keyboard row activation, row labels, captions, controlled server sorting, row action slots, and mobile cards. |
| Tabs             | Ready  | Radix base with click, arrow movement, disabled tab, and vertical orientation story coverage.                                                                  |
| Textarea         | Ready  | Minimal and useful. Needs Field examples for labels/errors.                                                                                                    |
| Tooltip          | Ready  | Radix base with hover, keyboard focus, side placement, zero-delay test stories, and icon-button pairing examples.                                              |

## Product Component Inventory

| Component               | Status | Notes                                                                                                                                                   |
| ----------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AuthScreens             | Ready  | Full auth-mode story coverage, typed form/callback contracts, and reusable PasswordInput, StrengthMeter, and CodeInput wiring.                          |
| ChartPrimitives         | Ready  | ChartFrame, TrendChart, and DistributionBarList provide reusable report/chart building blocks beyond the bar chart card.                                |
| DashboardCards          | Ready  | Composes data-driven stats, checklist, flagged-user, hero action, and status APIs; covered by Storybook and the app audit route.                        |
| DayAgenda               | Ready  | The `/time` Day scope: one day's cards, a rail with the target ring, the per-project split and the quick composer slot; edit/delete/continue callbacks. |
| DayRibbon               | Ready  | The week as seven chips with a travelling thumb; the Day scope's navigator and the phone's day picker.                                                  |
| EntryCard               | Ready  | One time entry at two densities: project rail, hover-revealed edit/continue/delete, timer glyph, locked and admin-modified states, saved pulse.         |
| MonthCalendar           | Ready  | The `/time` Weeks tab: a month by ISO week with day cells, entry chips and week totals; a newest-first week list on phones.                             |
| PeriodNavigator         | Ready  | `‹ label › Today` with unit-bound names, a direction-aware label slide, and a month grid under the label.                                               |
| PeriodTotal             | Ready  | One figure, one unit, one caption; settles in the direction of change and never rolls; status as icon + words.                                          |
| QuickEntryComposer      | Ready  | Project chips, a duration and a description; validated on submit, Enter adds, More options hands off to the full dialog.                                |
| ShortcutSheet           | Ready  | Every `/time` shortcut as tables grouped View · Move · Add · Timer, in a dialog on `?`.                                                                 |
| TimeScopeBar            | Ready  | The scope control with `⊖ ⊕` caps and `kbd` chips, the week-only lens toggle, and the two global actions.                                               |
| WeekAgenda              | Ready  | The `/time` Week scope's Agenda lens: seven columns headed by `DayColumnHeader`, an accordion on mobile, contextual empty states, composer slot.        |
| StatCard                | Ready  | Dashboard KPI primitive with typed tone, trend, loading, and sparkline props.                                                                           |
| FlaggedUserList         | Ready  | Controlled flagged-user panel with selection, reminder callback, sent/empty states, and Storybook interaction coverage.                                 |
| StatusOverview          | Ready  | Data-driven distribution/legend primitive with empty state, formatter hook, and action slot.                                                            |
| WeeklyTimeGrid          | Ready  | Typed day/cell/timer APIs, editable cells, arrow-key movement, callbacks, totals, locked/warning/future states, mobile cards, and route proof.          |
| TimeGridTimer           | Ready  | Timer control split from weekly grid with project combobox, description input, elapsed badge, and start/stop/reset callbacks.                           |
| TimesheetComponents     | Ready  | Composes typed summary, stepper, invoice upload, and breakdown data; rejection banner can still be extracted when review flows mature.                  |
| TimesheetSummaryCard    | Ready  | Current-month summary card with status, meta, and typed action API.                                                                                     |
| MonthRow                | Ready  | Data-driven month row built on `ListRow`, with status and optional row action semantics.                                                                |
| TimesheetStepper        | Ready  | Data-driven workflow stepper with status-derived or custom step states.                                                                                 |
| InvoiceUploadPanel      | Ready  | Invoice upload panel with enabled/locked states and Dropzone-backed file props.                                                                         |
| TimeEntryForm           | Ready  | Typed single-entry form with project/date/hours/note/billable fields, draft state, submit/cancel/change callbacks, and Storybook coverage.              |
| SubmitTimesheetDialog   | Ready  | Radix dialog wrapper for submit confirmation with trigger, details, and confirm callback.                                                               |
| TimeBreakdownDialog     | Ready  | Timesheet breakdown modal with row totals, amount display, export callback, and dialog interaction coverage.                                            |
| AdminReview             | Ready  | Composes queue table, diff list, review action bar, and reject dialog APIs; route proof pairs it with `PdfViewer` for document preview.                 |
| ReviewQueueTable        | Ready  | Data-driven admin queue table with selection, sorting, row-open callback, loading, and empty states.                                                    |
| ReviewDiffList          | Ready  | Data-driven invoice/timesheet diff list with match/mismatch badges, totals, status, and footer slot.                                                    |
| ReviewActionBar         | Ready  | Bulk review action bar built on `BulkBar`, with approve, clear, reject action, and label hooks.                                                         |
| RejectDialog            | Ready  | Radix dialog wrapper with reason textarea, disabled confirm until reason exists, and reject callback.                                                   |
| ManagementViews         | Ready  | Composes typed people table, project drawer, and rate drawer APIs. Group manager remains future app-specific work.                                      |
| PeopleTable             | Ready  | Data-driven people table with sortable columns and edit/delete callbacks.                                                                               |
| ProjectDrawer           | Ready  | Project settings drawer with active switch, members, tags, date range, notes, rate source, and save callback.                                           |
| RateDrawer              | Ready  | Rate editor drawer with amount, currency, unit, effective date, status badge, and save callback.                                                        |
| Reports                 | Ready  | Composes typed filter, stat, chart, export dialog, document preview, and table row APIs; real query/export contracts remain app work.                   |
| ReportFilterBar         | Ready  | Data-driven period/project filters, view segmented control, export callback, and Storybook interaction coverage.                                        |
| ReportStatTile          | Ready  | KPI tile with typed tone and Lucide icon API.                                                                                                           |
| ReportChartCard         | Ready  | Recharts-backed bar chart card with data, distribution, value label, and empty-state props.                                                             |
| ReportExportDialog      | Ready  | Export dialog with configurable formats, document preview, controlled open props, and export callback.                                                  |
| DocumentPreview         | Ready  | Cost-free/internal document preview that filters internal rows by mode.                                                                                 |
| InfoPageEditor          | Ready  | Markdown-backed info-page editor with edit/preview tabs, title/slug/body fields, save/publish callbacks, and Storybook coverage.                        |
| SettingsPanels          | Ready  | Composes typed profile, security method, TOTP setup, preference, notification, and tweak-control APIs; real account contracts remain app work.          |
| ProfileSettingsPanel    | Ready  | Profile form section with avatar, read-only fields, and optional action callback.                                                                       |
| SecurityMethodList      | Ready  | Data-driven sign-in method cards with typed states, badges, icons, and action callback.                                                                 |
| TotpSetupDialog         | Ready  | Radix dialog for authenticator setup with QR placeholder, secret, code input, and verify callback.                                                      |
| PreferenceControls      | Ready  | Avatar action, timezone combobox, and language segmented control with callbacks.                                                                        |
| NotificationPreferences | Ready  | Data-driven notification toggles, reset action, cadence segmented control, and callback coverage.                                                       |
| Payslips                | Ready  | Composes typed summary, month list, upload panel, admin table, and viewer APIs; real payroll query/upload contracts remain app work.                    |
| PayslipSummaryCard      | Ready  | Latest payslip card with typed status and action APIs.                                                                                                  |
| PayslipMonthList        | Ready  | Data-driven employee month list with preview/download callbacks, selected state, empty state, and status badges.                                        |
| PayslipUploadPanel      | Ready  | Admin upload panel with selected employee/month context, Dropzone wiring, disabled state, and upload callback.                                          |
| PayslipAdminTable       | Ready  | Data-driven admin table with status badges, sort, preview/download/upload row actions, loading, empty, and responsive card mode.                        |
| PayslipViewer           | Ready  | Document preview shell with loading skeleton, ready actions, error state, and empty state.                                                              |
| PdfViewer               | Ready  | Generic PDF viewer shell with loading/ready/error/empty states, page controls, zoom, download/open hooks, and Storybook coverage.                       |
| TweaksPanel             | Ready  | Typed draft value, accent/radius/density/font/width controls, reset/apply/change callbacks, closed trigger, and Storybook interaction coverage.         |
| Toast                   | Ready  | Sonner wrapper supports standard action/cancel options, action callback assertions, and auto-dismiss lifecycle coverage.                                |
| StatusPill              | Ready  | Best product primitive so far: status union, variant mapping, stories, unit test.                                                                       |
| EmptyState              | Ready  | Good reusable product feedback component.                                                                                                               |

## Storybook Coverage Audit

Current strengths:

- Every implemented UI and product folder has at least one story, except `ThemeProvider`, which is infrastructure.
- Dark/light and HU/EN globals exist.
- Recent visual baselines set correct light/dark defaults for key product stories.
- Storybook test suite currently exercises all stories and 253 interaction-rendered test cases.
- Playwright visual regression now protects 25 Storybook screenshots from the static Storybook build.

Coverage gaps:

- Most stories are visual only.
- Many components do not explicitly show loading, error, empty, disabled, mobile, dark, and light states.
- Product components mostly have mode stories, not data-state stories. Dashboard and timesheet components now have data-state stories; the rest still need this treatment.
- No per-component MDX docs yet for usage rules.

Recommended story additions:

- Combobox: default, search result, empty, disabled option, keyboard select, active descendant. Current coverage exists.
- DatePicker: default, selected, disabled dates, locale labels, keyboard date selection, Home/End/PageUp/PageDown navigation, disabled-date skipping. Current coverage exists.
- Select: Radix replacement stories exist.
- Dropzone: empty, dragging, files ready/uploading/done/error, disabled, invalid file, accept rejection. Current coverage exists.
- Table: empty, loading skeleton, selected rows, row action, server sorted, mobile. Empty/loading/row-action/server-sort/mobile coverage exists.
- Drawer/Dialog/Dropdown: Dialog focus/escape/destructive coverage exists. Drawer side variants and Dropdown checkbox/radio/destructive item coverage exist.
- Auth screens: sign-in, 2FA, invite, password setup, passkey, reset sent, done, and callback contracts are covered.
- Dashboard: stat loading/warning, flagged-user controlled selection, status empty/value formatting, and data-driven dashboard action stories exist.
- Timesheets: summary action, month row action, stepper states, invoice enabled/locked states, and submit-confirm dialog interaction stories exist.
- Admin review: queue selection/sort/open, bulk approve/clear, diff display, and reject dialog interaction stories exist.
- Management: people table edit/delete/sort, project drawer active/save, rate drawer save, and composed management callback stories exist.
- Reports: filter bar select/view/export, document preview visibility, export dialog callback, chart empty state, and composed report export stories exist.
- Payslips: summary actions, month preview/download, upload panel browse/upload, admin table sort/actions, viewer states, and composed employee/admin callback stories exist.
- Settings: profile action, security method action, TOTP dialog verify, timezone/language preference changes, notification toggles/reset/cadence, and composed settings callback stories exist.
- WeeklyTimeGrid: edit start/change, arrow-key cell movement, locked grid, warning cells, future days, mobile day grid, and timer controls exist.
- New app surfaces: CommandPalette, TimeEntryForm, DayAgenda, WeekAgenda, TimeBreakdownDialog, PdfViewer, ChartPrimitives, and InfoPageEditor now have typed stories and interaction coverage where behavior exists.

## API Guidelines To Enforce Next

1. Export named prop types from every reusable component. Keep this rule.
2. Prefer `VariantProps<typeof xVariants>` when a component has visual variants.
3. Use discriminated unions for status/workflow components.
4. Keep `className` on primitives and composition roots, but avoid threading it into internal subparts until there is a concrete need.
5. Avoid app-data fixture props on product components. Split smaller components with explicit data types instead.
6. All clickable non-button elements must become buttons/links or implement keyboard semantics.
7. Client Components must be deliberate. Current client usage is mostly correct, but future product state should stay local or URL-driven until app data flow exists.

## Current Quality Gates

- `pnpm typecheck`
- `pnpm lint`
- `pnpm format`
- `pnpm test`
- `pnpm build-storybook`
- `pnpm test-storybook`
- `pnpm test:visual`
- `pnpm e2e`

Visual baseline maintenance:

- Use `pnpm test:visual` to rebuild Storybook and compare the checked-in Playwright screenshots.
- Use `pnpm test:visual:update` only when an intentional visual change should update the baseline.

## Recommended Next Work

### Batch 1: Primitive Hardening

Start with the components most likely to be reused by real screens:

1. Done: Field/Input/Textarea form wiring with generated IDs, descriptions, `FormMessage`, and `FormSection`.
2. Done: Select decision resolved by replacing native select with a Radix-backed `Select` preserving the simple options API.
3. Done: Combobox accessibility and tests now cover combobox/listbox/searchbox semantics, active descendant, disabled options, empty search, and keyboard selection.
4. Done: DatePicker accessibility, locale, and tests now cover grid semantics, disabled dates, arrow movement, Home/End/PageUp/PageDown navigation, and disabled-date skipping.
5. Done: Table/Pager state and keyboard-accessible row actions. Server-sort, caption, row-label, mobile card, page-range, and row-action contracts now exist; richer filtering remains screen-level.
6. Done: Dropzone file-state API and tests now cover upload progress, errors, drag state, accept validation, and accepted/rejected callbacks.

Additional primitive behavior progress:

- Done: AppShell mobile navigation opens a drawer and closes on navigation selection.
- Done: BulkBar region/live semantics, localized labels, and selected/empty story coverage.
- Done: ChipButton removable action API with a separate labeled remove button.
- Done: Drawer open, escape close, focus return, and bottom side story coverage.
- Done: Dropdown open, menu item exposure, escape close, focus return, destructive item, checkbox item, and radio item coverage.
- Done: Dialog basic/destructive confirm stories, escape close, focus return, and focus-containment coverage.
- Done: Popover aligned content, escape close, focus return, and keyboard focus movement coverage.
- Done: Tabs disabled tab, arrow movement, and vertical orientation coverage.
- Done: Tooltip hover, keyboard focus, side placement, and zero-delay deterministic coverage.
- Done: Auth form primitives added for password reveal, password strength, and verification code entry.
- Done: ListRow clickable mode uses labeled button semantics with selected/disabled state handling.
- Done: Checkbox and Switch Field integration stories cover label/description wiring.
- Done: Toast action/cancel option API, callback assertions, and auto-dismiss lifecycle coverage.
- Done: CommandPill, LanguageToggle, NotificationButton, UserMenu, and MobileBottomBar are extracted from the shell as typed layout controls with Storybook coverage.
- Done: SegmentedControl vertical orientation and full-width mobile layout are covered.
- Done: TweaksPanel has a typed value/persistence contract with reset/apply/change callbacks.
- Done: CommandPalette content, TimeEntryForm, DayAgenda, WeekAgenda, TimeBreakdownDialog, PdfViewer, ChartPrimitives, and InfoPageEditor are implemented as standalone typed components.

### Batch 2: Product Component Decomposition

Extract smaller app-ready components from product showcases:

1. Done: Dashboard extracted `StatCard`, `FlaggedUserList`, and `StatusOverview`; `DashboardCards` now accepts typed data and action props.
2. Done: Timesheets extracted current month summary, month row, stepper, invoice upload panel, and submit confirm dialog.
3. Done: Admin review extracted review queue table, diff badge/list, reject dialog, and review action bar.
4. Done: Management extracted people table, project drawer, and rate drawer.
5. Done: Reports extracted filter bar, stat tile, chart card, export modal, and document preview.
6. Done: Payslips extracted summary card, month list, upload panel, admin table, and viewer.
7. Done: Settings extracted profile panel, security method list, TOTP setup dialog, preference controls, and notification preferences.
8. Done: Weekly time grid added typed day/cell/timer APIs, keyboard movement, editable cells, mobile day cards, and split timer controls.

### Batch 3: Visual Regression Baseline

Done: Storybook is now protected with a local Playwright visual baseline:

- `playwright.visual.config.ts` runs a dedicated visual suite against the static Storybook build.
- `visual/storybook.spec.ts` captures core primitive, form, weekly grid, dashboard, desktop shell, mobile drawer, shell-control, mobile bottom bar, command palette, time-entry, document, chart, and info-page stories.
- `visual/storybook.spec.ts-snapshots` contains 25 checked-in baseline PNGs.
- Chromatic remains available through `pnpm chromatic` if hosted visual review is later approved.

### Batch 4: Route-Level API Audit

Retired: the internal `/component-library` route has been removed. Storybook remains the component-library surface, and route-level Playwright coverage should target real backend-backed workflows:

- Storybook covers DashboardCards, WeeklyTimeGrid, TimeEntryForm, DayAgenda, WeekAgenda, TimeBreakdownDialog, TimesheetComponents, AdminReview, PdfViewer, ManagementViews, Reports, SettingsPanels, TweaksPanel, Payslips, and InfoPageEditor.
- `visual/storybook.spec.ts` protects the visual baseline for key primitive and product compositions.
- Production routes should add E2E coverage when they wire these components to real data and actions.

## Bottom Line

The component library is visually useful, structurally organized, and covered through Storybook. The next quality jump is production screen implementation: backend-backed data contracts, Server Actions, auth/RBAC paths, real query/export flows, and route-level E2E for each workflow.
