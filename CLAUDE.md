# Sheet Happens

Internal, single-tenant time & timesheet app (time tracking → monthly timesheet revisions →
contractor invoice verification → reports/PDF export). Next.js App Router + React 19,
Prisma/Postgres, Better Auth, Tailwind v4, next-intl (HU/EN), Storybook.

## Commands

pnpm only — `packageManager: pnpm@11.5.3`, Node `24.14.0` (`.nvmrc`). Never npm or yarn.

Dependency specifiers are caret ranges on the major in use (`^4.5.4`), never `latest`: `pnpm
install` and `pnpm update` move minors and patches, a major only ever moves on a deliberate
`pnpm update --latest <pkg>` with the lockfile diff read. `latest` also resolved twice per install
and left two copies of react, zod and chromatic in the lockfile; the ranges dedupe the tree.

- `pnpm setup:git` — run once per clone: installs the pre-push guard and the push defaults that
  keep a feature branch off `develop`. Local git config only, never global.
- `pnpm dev` — Next dev server (Turbopack) on `:3000`
- `pnpm db:dev` — start Postgres 18 + MinIO in Docker, migrate, seed. Also `db:dev:reset`,
  `db:dev:seed`, `db:dev:stop`. Requires Docker running.
- `pnpm db:generate` — regenerate Prisma client after any schema edit
- `pnpm typecheck` · `pnpm lint` · `pnpm format` (check only; `pnpm format:write` fixes)
- `pnpm test` — Vitest/jsdom, picks up `src/**/*.test.{ts,tsx}` and `app/**/*.test.{ts,tsx}`
  (browser tests excluded). Filter while iterating:
  `pnpm test src/lib/duration.test.ts`
- `pnpm test:browser` — Vitest browser mode, `src/**/*.browser.{test,spec}.{ts,tsx}`
- `pnpm storybook` · `pnpm test-storybook`
- `pnpm test:visual` — rebuilds Storybook, compares checked-in screenshots
- `pnpm dev:e2e` — the dev server the e2e suite needs: same as `pnpm dev` but with auth emails
  written to `.mail/e2e-outbox.jsonl` instead of the console. Use it instead of `pnpm dev` when you
  intend to run e2e; Next refuses a second dev server for the same directory, so the suite cannot
  start its own alongside a plain `pnpm dev`.
- `pnpm db:test` — create/migrate/seed `sheet_happens_e2e`, the suite's own database, on the same
  Postgres as the dev one. Idempotent; `db:test:reset` drops and rebuilds it. Run once per clone
  before the first `pnpm e2e`. No Docker involved, so CI runs the same command. It needs object
  storage as well as Postgres and creates the bucket itself: the seed uploads a contractor invoice
  PDF per invoiced month, so without a reachable `S3_ENDPOINT` the whole seed rolls back.
- `pnpm e2e` — Playwright. Starts the server itself if nothing is on `:3000`, otherwise reuses what
  is there. The `setup` project requests a magic link over HTTP and reads it back out of the outbox
  — that is how authenticated specs get a session, and why the outbox matters. Also `e2e:a11y`
  (axe only), `e2e:failed` (re-run failures), `e2e:update` (refresh aria snapshots)
- `pnpm verify` — the full gate chain and the definition of done. Run it before calling a feature
  done. (Not `pnpm ci`: pnpm has a built-in `ci` that shadows package scripts and silently runs a
  clean install instead.) `pnpm verify:fast` (typecheck + lint + unit) is the mid-task loop.
- CI (`.github/workflows/ci.yml`) runs the same gates except `test:visual` — those baselines are
  `-darwin`-suffixed and can only be compared on macOS.

## Environment

- Copy `.env.example` → `.env.local`. Never edit or commit `.env`/`.env*.local`.
- PDF export (`src/server/pdf`) shells out to Typst: needs `typst` on PATH or `TYPST_BIN` set
  (pin 0.15.1 to match the Dockerfile). Production runs it from the Dockerfile image.
  `pnpm test:pdf` renders the templates for real; plain `pnpm test` never invokes Typst.
- Object storage is S3-compatible; local dev uses MinIO on `:9000` (console `:9001`).

## Architecture rules

- **Prisma schema is split** across `prisma/*.prisma` (`schema.prisma` + one file per domain);
  `prisma.config.ts` points at the `prisma/` folder, not a single file. The client is generated to
  `src/server/db/generated` (gitignored, ESLint-ignored) — run `pnpm db:generate` after schema
  edits. Deploys run `pnpm db:migrate:deploy`.
- **Server Components by default.** Add `"use client"` only for local state, effects, browser APIs,
  timers, overlays, rich forms, and Radix interactive primitives.
- **Server Actions stay thin**: authenticate → authorize → validate with Zod → call
  `src/server/<domain>` → return a typed result. Domain and DB logic lives in `src/server/*`,
  never in components or route files.
- **The MCP server is a registry of toolsets** (`src/server/mcp`, endpoint `app/api/mcp/route.ts`).
  The route authenticates and authorizes, the toolsets validate arguments with Zod and adapt shapes,
  and every business rule stays in `src/server/time-tracking` — which is what makes period locks,
  the 24-hour cap, tracking modes and audit logging apply to an agent automatically. No tool talks to
  Prisma. Adding a toolset is a folder under `toolsets/`, a scope, and one line in `registry.ts`.
  Read `docs/mcp-server.md` — especially §18, which records where the installed packages differ from
  their own documentation — before changing anything here.
- **PDF documents are Typst templates, never generated markup.** Layout lives in
  `src/server/pdf/templates/*.typ` (`lib/theme.typ` for tokens, `lib/components.typ` for blocks);
  TypeScript only builds a display-ready JSON payload (`report-pdf-payload.ts`) that the template
  reads via `json("/data.json")`. Never concatenate values into Typst markup — that is what the old
  hand-rolled escaping existed for. Do all number/money/date formatting in TS via
  `src/lib/formatting` so `Intl` stays the single authority; templates contain no locale logic.
- No Redux, Zustand, or TanStack Query in v1. Local React state for component UI state; URL search
  params for shareable table/filter state.
- Import alias `@/*` resolves to the repo root.
- `typedRoutes` is enabled — route strings are type-checked, so run `pnpm typecheck` after adding
  or renaming a route.
- Server Action body limit is 12 MB (file uploads); larger uploads need a different path.
- `website/` is the static landing page (sheethappens.rolloutit.net), not part of the app: no build
  step, published over FTPS by `.github/workflows/website.yml` when `main` moves. See its README.

## i18n is a completion requirement

Every user-facing string must exist in **both** `messages/hu.json` and `messages/en.json` — labels,
validation messages, empty/error states, toasts, dialogs, and auth emails. Server code localizes via
`getTranslations`. A feature is not done until both locales are complete.

**One exception, and only one:** the MCP layer's _model-facing_ text — tool names, tool and argument
descriptions, and the `McpErrorCode` messages in `src/server/mcp` — is English only. Those strings
are read by the model, which then answers the user in the user's own language; translating them
would fork the wire contract per locale for no reader. Every _human_-facing MCP surface (`/consent`,
the Connected apps section of `/settings`, the Help recipe) is fully HU/EN like everything else.

## Components

Follow `src/components/README.md`. In short:

- One PascalCase folder per component: `Name/Name.tsx`, `Name.types.ts`, `Name.variants.ts` (CVA),
  `index.ts` as the only public import surface; stories and tests colocated.
- `src/components/ui` = shadcn/Radix primitives · `sheet` = product blocks · `layout` = shell/nav.
- Model visual differences as typed variant props (`variant`, `size`, `tone`, `density`, `state`,
  `status`), not boolean clusters like `primary`/`danger`/`small`.
- Reusable components need Storybook coverage for variants, disabled/loading/error/empty, dark and
  light theme, and mobile states. Behavior needs a Storybook `play` test or a Vitest test.
- Theme is a light/dark/**system** preference (next-themes, `system` by default). `:root` is the
  dark palette, `.light` overrides it — check both.

## Browser verification

The accessibility tree is the machine-readable surface of this app: if every control has a stable,
unique accessible name, a change can be read back as text instead of eyeballed.

- `pnpm exec playwright cli` (ships with playwright-core, no install) drives a persistent headless
  session: `open <url>` → `find "text"` → `click e61`. Snapshots go to `.playwright-cli/*.yml`
  rather than into the transcript. The `/playwright-cli` skill has the full command set.
- Browse on `http://localhost`, never `127.0.0.1`: the Better Auth client posts to the origin in
  `authOrigin`, so the other host fails every auth call on a CORS preflight.
- A fresh browser has no locale cookie and renders **EN**, not the HU default. Committed aria
  snapshots pin `sheet-happens-locale` in `e2e/fixtures.ts` for exactly this reason.
- `/time` is the exemplar route (`e2e/authenticated/time.spec.ts`): landmarks, one `h1`, a named
  region per weekday, entry controls addressable within their day. Copy that shape.
- Aria baselines live in `e2e/__aria__/`. Date-derived values are matched with regexes, not
  literals — never "fix" a failing baseline by regenerating it without reading the diff first.
- The suite runs against **its own database** (`sheet_happens_e2e`, see `e2e/database.ts`), never
  the one you browse. It writes — onboarding flips member rows — and its aria fixture must not be
  editable by hand. `playwright.config.ts` pins `DATABASE_URL` for a server it starts; `pnpm dev:e2e`
  pins the same one for a server you start. So `pnpm db:dev:reset` is now safe to run freely.
- Two signed-in roles, each with its own `storageState` minted by `e2e/auth.setup.ts`: `admin`
  (`admin@example.com`) and `member` (`contractor@example.com`). Specs in `e2e/authenticated/` run
  under **both**; `authenticated/admin/` and `authenticated/member/` are the role-bound exceptions,
  and `playwright.config.ts` says why a spec belongs in one.
- Both roles have to be **onboarded**, not just logged in: the seed leaves every member row INVITED
  and unlinked, so a magic-link session alone gets bounced to `/account-status`. The setup accepts
  an invitation first — the admin from the seeded token, the member from a real admin-driven resend
  — and that is the only reason a fresh database can run the suite at all.
- Anything asserted **literally** must come from the **frozen week** (`e2e/seed.ts`,
  `FROZEN_WEEKS` in `scripts/dev-seed.mjs`), not from the generated data. The generator fills days
  only up to the day it runs — the current week holds one day of data on a Monday and five on a
  Friday — and its PRNG re-aligns when its twelve-month window slides, so nothing it produces can be
  pinned. The frozen week is fixed dates, durations and descriptions outside that window.
- `/sign-in/magic-link` allows **5 requests per 15 minutes per IP** and the whole suite shares one
  localhost budget. That is why the member session is reused while it still works. A 429 in the
  setup means the suite has been run too often, not that something broke.

## Testing conventions

- Unit and domain tests colocate as `*.test.ts` beside the source under `src/`. Route handler
  tests colocate beside the handler in `app/` (e.g. `app/api/notifications/route.test.ts`) — Next
  routes only `route`/`page` basenames, so they are never served.
- Visual baselines in `visual/storybook.spec.ts-snapshots/` are checked in and platform-suffixed
  (`-darwin`). Refresh with `pnpm test:visual:update` **only** for an intentional visual change, and
  say so in the commit.
- `vitest` and `@vitest/browser-playwright` are **pinned exactly to 4.1.11**, tighter than the
  caret range everything else gets. Not a compatibility problem in our code — the whole chain is green on 5.0.0 once
  `vitest.storybook.config.ts` declares a viewport, which it now does. The blocker is
  `@storybook/addon-vitest`: every published version, up to `11.0.0-alpha.0`, declares
  `vitest: ^3 || ^4` and `@vitest/browser-playwright: ^4`, so vitest 5 leaves a second
  `@vitest/browser@4` in the tree and the story runner peer-mismatched. Lift the pins when that
  addon ships a release accepting vitest 5, and check `pnpm peers check` before believing it.
- User-visible changes get a matching scenario appended to `docs/manual-qa-test-plan.md`, committed
  separately as `docs(qa): ...` (established repo convention).

## Git

Detailed workflow lives in the `/git-workflow` skill (`.claude/skills/git-workflow/`).

- Branch off `develop`; never commit directly on `develop` or `main`. Names: `feature/<topic>`,
  `fix/<topic>`, `chore/<topic>`, `docs/<topic>`.
- Create branches with `git switch -c <name> --no-track origin/develop`; push with
  `git push -u origin <branch>`, never a `HEAD:<other-branch>` refspec.
- Conventional Commits: `type(scope): imperative subject`, lowercase, no trailing period.
- **YOU MUST NEVER push to a remote** and never rewrite history that exists on `origin`. Commit
  locally, then hand the push and PR to the developer. `git push` is blocked by a deny rule in
  `.claude/settings.json`.

## Reference docs — read on demand, don't duplicate here

- `docs/domain-model.md` — entities, state machines, invariants, authorization boundaries. Read
  before changing timesheet, rate, or invoice logic.
- `docs/mcp-server.md` — the MCP/OAuth layer: scopes, the consent and login hand-off, the toolset
  registry, and §18's record of every place the installed Better Auth / MCP SDK behaviour differs
  from its docs. Read before touching `src/server/mcp`, `app/consent` or the auth plugin list.
- `docs/rest-api.md` — the `/api/v1` REST API: personal access tokens, scopes, endpoints, errors.
- `docs/database-schema.md` · `docs/auth-user-management.md` · `docs/frontend-stack.md`
- `docs/tokens.md` — design tokens · `docs/component-library-audit.md` — component inventory
- `docs/local-dev-db.md` · `docs/manual-qa-test-plan.md`
- `docs/railway-projects.md` — deploying on Railway: recommended project/environment layout, PR
  environments, domain moves, deployed-DB access, and why config lives in `railway.json` rather than
  Railway IaC. Read before changing anything on Railway.

## Working agreements

- For multi-file or unfamiliar changes: explore and plan first, then implement. Skip planning for
  one-line fixes.
- Verify with a real gate (`pnpm typecheck`, `pnpm test`, the failing test you just wrote) and show
  the output instead of asserting success. If a check fails, say so with the output.
- Match surrounding code style. Don't add a dependency, migration, or new top-level directory
  without asking first.
- Timesheet revisions are immutable financial snapshots — never make submitted revisions recompute
  from live time entries (see `docs/domain-model.md`).

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
