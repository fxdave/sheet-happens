# Documentation

Start here if you want to run, use or contribute to Sheet Happens. The first group is written for
operators and users; the rest are design notes that explain why the code looks the way it does.
Some design notes are partly in Hungarian, the product's first language.

## Running and using it

- [Self-hosting](self-hosting.md): requirements, Docker and Railway setup, the full environment
  variable reference, first run, upgrades, backups and security notes.
- [Deploying on Railway](railway-projects.md): project layout, PR environments, domains, database
  access and the constraints that shape a Railway deploy.
- [Auth and user management](auth-user-management.md): invite-only accounts, sign-in methods, 2FA and
  passkey rules.
- [MCP server](mcp-server.md): how AI agents (Claude and other MCP clients) connect, the scopes they
  get and the security model.
- [REST API](rest-api.md): personal access tokens, scopes and the `/api/v1` endpoints for scripts
  and integrations (hours, timesheet submission, invoice upload).

## Contributing

- [Local dev database](local-dev-db.md): start Postgres and MinIO with Docker, migrate and seed.
- [Manual QA test plan](manual-qa-test-plan.md): scenarios to click through before a release.
- [Frontend stack](frontend-stack.md): the libraries and conventions the UI is built on.
- [Design tokens](tokens.md): colors, spacing and typography tokens.
- [Component library audit](component-library-audit.md): inventory of the component library and its
  API rules (the rules live in [`src/components/README.md`](../src/components/README.md)).

## Design notes

Internal design and planning documents. They record decisions and the reasoning behind them, and may
describe work that has since shipped or changed.

- [Domain model](domain-model.md): entities, state machines, invariants and authorization boundaries.
  Read before changing timesheet, rate or invoice logic.
- [Database schema](database-schema.md): the PostgreSQL schema design derived from the domain model.
- [Passkey-first security plan](passkey-first-security-plan.md): the sign-in security design.
- [Dark mode redesign](dark-mode-redesign.md) and [light mode redesign](light-mode-redesign.md): the
  two theme designs.
- [Time view redesign](time-view-redesign.md), [zoom axis scope](time-view-zoom-axis.md) and
  [zoom axis implementation steps](time-view-zoom-axis-implementation.md): the time tracking view.
- [Time tracking UX upgrades](time-tracking-ux-upgrades.md) and
  [time entry suggestions](time-entry-suggestions.md): research and plans for quality-of-life
  improvements to time entry.
