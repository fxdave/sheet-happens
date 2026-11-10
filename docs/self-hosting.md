# Self-hosting Sheet Happens

This guide takes you from an empty server to a running production instance. It covers the Docker
route (any host that runs containers) and the Railway route, then lists every environment variable
the app reads and what to do on day one and on upgrade day.

Sheet Happens is free software (AGPL-3.0). If you would rather not run it yourself, Rollout IT offers
support, hosting and setup: <https://rolloutit.net>.

## 1. What you need

| Piece               | Requirement                                                                                                                                                                                                                                        |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| PostgreSQL          | 17 or 18 (CI runs 17; the local dev compose file and Railway use 18). The migrations create the `citext` and `pgcrypto` extensions, both of which a database owner may create on PostgreSQL 13+.                                                   |
| Object storage      | Any S3-compatible service: AWS S3, Cloudflare R2, Backblaze B2, MinIO, … It holds contractor invoices, payslips and avatars. The bucket must exist before the first upload; the app does not create it.                                            |
| SMTP server         | Required in production. Sign-in is by magic link, invitations and password resets are e-mails, so without working mail nobody can log in. (`console` and `file` delivery modes exist for development and are described in the table in section 5.) |
| A domain with HTTPS | Passkeys (WebAuthn) are bound to the hostname, and the OAuth/MCP endpoints publish absolute URLs. Pick the public hostname once and keep it (see below).                                                                                           |
| Typst 0.15.1        | Used for PDF export. Already installed in the Docker image; you only need it yourself if you run the app outside Docker (`TYPST_BIN`).                                                                                                             |
| Google OAuth        | Optional. Adds "Sign in with Google" for the Workspace domains you allow.                                                                                                                                                                          |
| Docker              | Docker Engine 24+ with Compose v2 for Option A.                                                                                                                                                                                                    |

**One origin, three variables.** `BETTER_AUTH_URL`, `NEXT_PUBLIC_APP_URL` and
`NEXT_PUBLIC_BETTER_AUTH_URL` should all be the exact public origin, for example
`https://sheet.example.com` (scheme and host, no trailing slash, no path).

- `BETTER_AUTH_URL` is read at runtime on the server: the auth base URL, the passkey relying-party
  ID (its hostname), the OAuth issuer and the base of every link in an e-mail.
- `NEXT_PUBLIC_APP_URL` and `NEXT_PUBLIC_BETTER_AUTH_URL` are inlined into the browser bundle **at
  build time**. Changing them means rebuilding the image; changing the runtime variable alone does
  nothing for an image that is already built.
- The server falls back from `BETTER_AUTH_URL` to `NEXT_PUBLIC_APP_URL`, and the bootstrap script
  builds its invitation link from `NEXT_PUBLIC_APP_URL`, so setting all three keeps them from
  drifting apart.

Changing the hostname later invalidates every registered passkey and the Google redirect URI, so
decide it before inviting people.

## 2. Option A: Docker

The repository ships a `Dockerfile` (multi-stage: dependencies, build, Typst, runtime). The image runs
`pnpm start`, which starts the Next.js standalone server on port 3000 (`PORT` overrides it), and
exposes `GET /api/health` for health checks. The image contains the app, the Prisma CLI and Typst, so
the same image runs migrations and the bootstrap script.

### 2.1 Build the image

```bash
git clone https://github.com/rolloutit/sheet-happens.git
cd sheet-happens

docker build -t sheet-happens \
  --build-arg BETTER_AUTH_URL=https://sheet.example.com \
  --build-arg NEXT_PUBLIC_APP_URL=https://sheet.example.com \
  --build-arg NEXT_PUBLIC_BETTER_AUTH_URL=https://sheet.example.com \
  .
```

Without the build arguments the bundle is built for `http://localhost:3000`, which is only right for
a trial run on your own machine. `BETTER_AUTH_SECRET` is also accepted as a build arg but is not
needed for the build to succeed (a placeholder is used), and it should not be baked into the image;
supply it at runtime.

### 2.2 A minimal production `docker-compose.yml`

This is an **example** to adapt, not a file in the repository. It runs the app, PostgreSQL and MinIO
on one host. Replace every `change-me` and every `example.com` value, and put it in an empty directory
next to a clone of the repository (or point `build.context` at your clone).

```yaml
# docker-compose.yml: example only. Put real values in a `.env` file next to it
# (Compose reads that file for ${...} interpolation; keep it out of version control).
services:
  db:
    image: postgres:18-alpine
    restart: unless-stopped
    environment:
      POSTGRES_DB: sheet_happens
      POSTGRES_USER: sheet_happens
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U sheet_happens -d sheet_happens"]
      interval: 5s
      timeout: 5s
      retries: 10
    volumes:
      # Postgres 18 images keep data in a major-version subdirectory, so mount one level up.
      - db_data:/var/lib/postgresql

  minio:
    # MinIO withdrew its own images; this is the image the project's dev compose file uses.
    image: pgsty/minio:RELEASE.2026-08-04T00-00-00Z
    restart: unless-stopped
    command: server /data --console-address ":9001"
    environment:
      MINIO_ROOT_USER: ${S3_ACCESS_KEY_ID}
      MINIO_ROOT_PASSWORD: ${S3_SECRET_ACCESS_KEY}
    ports:
      # Publish the S3 API on loopback and put your reverse proxy in front of it (see below).
      - "127.0.0.1:9000:9000"
    volumes:
      - minio_data:/data

  minio-init:
    image: pgsty/mc:RELEASE.2026-09-16T00-00-00Z
    depends_on:
      - minio
    restart: "no"
    entrypoint:
      [
        "/bin/sh",
        "-c",
        "until mc alias set local http://minio:9000 $${S3_ACCESS_KEY_ID} $${S3_SECRET_ACCESS_KEY}; do sleep 1; done; mc mb -p local/sheet-happens || true",
      ]
    environment:
      S3_ACCESS_KEY_ID: ${S3_ACCESS_KEY_ID}
      S3_SECRET_ACCESS_KEY: ${S3_SECRET_ACCESS_KEY}

  app:
    build:
      context: ./sheet-happens
      args:
        BETTER_AUTH_URL: ${APP_URL}
        NEXT_PUBLIC_APP_URL: ${APP_URL}
        NEXT_PUBLIC_BETTER_AUTH_URL: ${APP_URL}
    restart: unless-stopped
    depends_on:
      db:
        condition: service_healthy
    ports:
      - "127.0.0.1:3000:3000"
    environment:
      DATABASE_URL: postgresql://sheet_happens:${POSTGRES_PASSWORD}@db:5432/sheet_happens?schema=public
      BETTER_AUTH_SECRET: ${BETTER_AUTH_SECRET}
      BETTER_AUTH_URL: ${APP_URL}
      NEXT_PUBLIC_APP_URL: ${APP_URL}
      NEXT_PUBLIC_BETTER_AUTH_URL: ${APP_URL}
      AUTH_EMAIL_DELIVERY_MODE: smtp
      AUTH_EMAIL_FROM: ${AUTH_EMAIL_FROM}
      SMTP_HOST: ${SMTP_HOST}
      SMTP_PORT: ${SMTP_PORT:-587}
      SMTP_USER: ${SMTP_USER}
      SMTP_PASSWORD: ${SMTP_PASSWORD}
      SMTP_SECURE: ${SMTP_SECURE:-false}
      # Must be reachable from the app container AND from users' browsers (see the notes below).
      S3_ENDPOINT: ${S3_PUBLIC_ENDPOINT}
      S3_REGION: us-east-1
      S3_BUCKET: sheet-happens
      S3_ACCESS_KEY_ID: ${S3_ACCESS_KEY_ID}
      S3_SECRET_ACCESS_KEY: ${S3_SECRET_ACCESS_KEY}
      S3_FORCE_PATH_STYLE: "true"
      BOOTSTRAP_ADMIN_EMAIL: ${BOOTSTRAP_ADMIN_EMAIL}
      BOOTSTRAP_ADMIN_FIRST_NAME: ${BOOTSTRAP_ADMIN_FIRST_NAME:-Admin}
      BOOTSTRAP_ADMIN_LAST_NAME: ${BOOTSTRAP_ADMIN_LAST_NAME:-User}
      BOOTSTRAP_ADMIN_TIMEZONE: ${BOOTSTRAP_ADMIN_TIMEZONE:-UTC}
      BOOTSTRAP_ADMIN_LOCALE: ${BOOTSTRAP_ADMIN_LOCALE:-en}
      BOOTSTRAP_ADMIN_CURRENCY: ${BOOTSTRAP_ADMIN_CURRENCY:-EUR}
      BOOTSTRAP_ADMIN_SEND_EMAIL: "true"

volumes:
  db_data:
  minio_data:
```

And the matching `.env` (every value is a placeholder):

```bash
APP_URL=https://sheet.example.com
POSTGRES_PASSWORD=change-me
BETTER_AUTH_SECRET=change-me   # openssl rand -base64 32
AUTH_EMAIL_FROM="Sheet Happens <no-reply@example.com>"
SMTP_HOST=smtp.example.com
SMTP_USER=change-me
SMTP_PASSWORD=change-me
S3_ACCESS_KEY_ID=change-me
S3_SECRET_ACCESS_KEY=change-me-too-at-least-8-chars
S3_PUBLIC_ENDPOINT=https://files.example.com
BOOTSTRAP_ADMIN_EMAIL=you@example.com
```

Notes on the example:

- **The S3 endpoint must be public.** Invoices, payslips and avatars are not proxied through the app:
  it redirects the browser to a short-lived signed URL on `S3_ENDPOINT`. So the same URL has to work
  from the app container (uploads) and from users' browsers (downloads). With the bundled MinIO that
  means a second hostname (`files.example.com` above) behind your reverse proxy. With AWS S3, R2 or
  B2, drop the `minio` and `minio-init` services and use the provider's endpoint, region and keys
  (`S3_FORCE_PATH_STYLE` is usually `false` for AWS S3).
- **TLS comes from a reverse proxy**, not from the app. Any proxy works; with Caddy it is two sites:

  ```caddyfile
  sheet.example.com {
    reverse_proxy 127.0.0.1:3000
  }
  files.example.com {
    reverse_proxy 127.0.0.1:9000
  }
  ```

  Make sure the proxy forwards `X-Forwarded-For` (Caddy does by default); the sign-in rate limits and
  the audit log use it, and without it every visitor looks like one client.

- Run exactly one `app` replica per database unless you have thought about section 6; the in-process
  notification scheduler is safe with several (it takes a PostgreSQL advisory lock), but nothing else
  has been load-tested that way.

### 2.3 Migrate, start, bootstrap the first admin

```bash
# 1. Start the database and storage, wait for them to be healthy.
docker compose up -d db minio minio-init

# 2. Apply the database migrations (idempotent; also the command to run on every upgrade).
docker compose run --rm app pnpm db:migrate:deploy

# 3. Start the app.
docker compose up -d app

# 4. Create the first admin invitation (see "First run" below). Safe to re-run.
docker compose run --rm app pnpm railway:bootstrap-admin
```

`pnpm db:migrate:deploy` is `prisma migrate deploy`: it only applies committed migrations from
`prisma/migrations`, never generates one and never touches data it did not create. The script is named
`railway:bootstrap-admin` because Railway was the first target; it is a plain Node script
(`scripts/bootstrap-admin.mjs`) that works anywhere with `DATABASE_URL` set.

Check it is up: `curl -fsS https://sheet.example.com/api/health` returns `{"ok":true}`. After you
sign in, the admin **System** page (`/admin/system`) runs live checks for configuration, database,
object storage, e-mail, Google sign-in, Typst and the notification dispatcher. Use it as your
post-deploy checklist.

### 2.4 Without Docker

Possible but not the supported path: Node 24 (`.nvmrc`), pnpm 11 (`packageManager` in `package.json`),
Typst 0.15.1 on `PATH` or in `TYPST_BIN`, then `pnpm install --frozen-lockfile`, `pnpm build` (with the
three `*_URL` variables set), `pnpm db:migrate:deploy`, `pnpm start`. `pnpm build` copies the static
assets into `.next/standalone` (`scripts/copy-standalone-assets.mjs`) and `pnpm start` runs from
there, so run both from the repository root.

## 3. Option B: Railway

The repository's `railway.json` is the whole deploy configuration. It selects the Dockerfile builder
and sets:

- **pre-deploy command** `pnpm db:migrate:deploy && pnpm railway:bootstrap-admin`: every deploy
  applies migrations first and (re-)ensures the first admin invitation, in the private network, before
  traffic switches over;
- **start command** `pnpm start`, **health check** `/api/health` (100 s timeout) and a restart policy
  of `ON_FAILURE` with up to 10 retries.

Create three things in a Railway project: a **PostgreSQL** database, an **object bucket** (Railway's
or any S3-compatible one) and one **app service** connected to your fork of the repository. Then set
the app service's variables:

| Variable                                                                                                   | Value                                                           |
| ---------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| `DATABASE_URL`                                                                                             | the reference `${{Postgres.DATABASE_URL}}` (use your DB's name) |
| `BETTER_AUTH_SECRET`                                                                                       | a fresh `openssl rand -base64 32`                               |
| `BETTER_AUTH_URL`, `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_BETTER_AUTH_URL`                                    | the public URL; set **before** the first build                  |
| `AUTH_EMAIL_DELIVERY_MODE`, `AUTH_EMAIL_FROM`, `SMTP_*`                                                    | your SMTP provider                                              |
| `S3_ENDPOINT`, `S3_REGION`, `S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_FORCE_PATH_STYLE` | the bucket's credentials                                        |
| `BOOTSTRAP_ADMIN_EMAIL` and friends                                                                        | the first admin (section 5)                                     |

Railway injects `PORT=8080`, so route the domain to port 8080 (or leave the target port on
auto-detect). The `railway.json` pre-deploy command prints the admin accept URL in the deploy logs.
Everything else (PR environments, moving a domain, database access, build-time variables) is in
[`docs/railway-projects.md`](railway-projects.md).

## 4. Other platforms

Anything that can build a Dockerfile, run a command before starting a new version, inject
environment variables and probe `GET /api/health` will do (Fly.io, Render, a Kubernetes `Job` for the
migration, …). Reproduce `railway.json`: build the `Dockerfile` with the three `*_URL` build args, run
`pnpm db:migrate:deploy` (and optionally `pnpm railway:bootstrap-admin`) before each rollout, then
`pnpm start`.

## 5. Environment reference

`.env.example` is the annotated template and lists exactly these variables. "Required" means the
app will not work in production without it. The Dockerfile sets `NODE_ENV=production`, so the
production rules apply to every container.

### Core

| Variable                          | Required | Default                 | Description                                                                                                                                                                        |
| --------------------------------- | -------- | ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`                    | yes      | none                    | PostgreSQL connection string. Read by the app, `prisma migrate deploy` and the bootstrap script.                                                                                   |
| `BETTER_AUTH_URL`                 | yes      | `NEXT_PUBLIC_APP_URL`   | Public origin of the app, read at runtime. See section 1.                                                                                                                          |
| `NEXT_PUBLIC_APP_URL`             | yes      | `http://localhost:3000` | Public origin baked into the browser bundle at **build** time (and used for bootstrap invitation links).                                                                           |
| `NEXT_PUBLIC_BETTER_AUTH_URL`     | yes      | `http://localhost:3000` | Origin the browser auth client posts to; baked in at **build** time. Must equal the other two.                                                                                     |
| `PORT`                            | no       | `3000`                  | Port the standalone server listens on (set by the image; platforms such as Railway override it). `HOSTNAME` is `0.0.0.0` in the image.                                             |
| `NOTIFICATION_SCHEDULER_DISABLED` | no       | `false`                 | `true` turns off the in-process notification scheduler (15-second polling) in this instance. Several instances are safe regardless: the dispatcher takes a Postgres advisory lock. |

### Auth

| Variable                      | Required | Default              | Description                                                                                                                                                                            |
| ----------------------------- | -------- | -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `BETTER_AUTH_SECRET`          | yes      | none (dev fallback)  | Signs sessions and encrypts stored OAuth tokens. `openssl rand -base64 32`. Production refuses to start without it. Never share it between deployments; see section 7 before rotating. |
| `AUTH_LOGIN_ATTEMPT_SECRET`   | no       | `BETTER_AUTH_SECRET` | Separate HMAC secret for password-login attempt identifiers.                                                                                                                           |
| `AUTH_TRUSTED_ORIGINS`        | no       | empty                | Comma-separated extra origins Better Auth should trust (the app's own origin is always trusted). Only needed if the same instance is served under another hostname.                    |
| `AUTH_GOOGLE_CLIENT_ID`       | no       | empty                | Google OAuth client ID. Google sign-in is on only when this, the secret and the domain list are all set.                                                                               |
| `AUTH_GOOGLE_CLIENT_SECRET`   | no       | empty                | Google OAuth client secret. Authorized redirect URI: `<BETTER_AUTH_URL>/api/auth/callback/google`.                                                                                     |
| `AUTH_GOOGLE_ALLOWED_DOMAINS` | no       | empty                | Comma-separated Google Workspace domains allowed to sign in. Both the e-mail domain and Google's `hd` claim must match.                                                                |
| `AUTH_SECURITY_SETUP_MODE`    | dev only | unset                | `optional` skips the 2FA/passkey setup gate. **Ignored when `NODE_ENV=production`**, so it has no effect on a deployment.                                                              |

### E-mail

| Variable                   | Required     | Default                                   | Description                                                                                                                                                                                                               |
| -------------------------- | ------------ | ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `AUTH_EMAIL_DELIVERY_MODE` | yes (`smtp`) | `console`                                 | `smtp` sends real mail. `console` prints messages, including magic links, to the server log: development only. `file` writes an outbox file: dev/e2e only, refused in production. Any other value behaves like `console`. |
| `AUTH_EMAIL_FROM`          | recommended  | `Sheet Happens <auth@sheethappens.local>` | The From header. The default is not a deliverable address; use one your SMTP provider is allowed to send as.                                                                                                              |
| `SMTP_HOST`                | with `smtp`  | none                                      | SMTP server host name.                                                                                                                                                                                                    |
| `SMTP_PORT`                | no           | `587`                                     | SMTP port.                                                                                                                                                                                                                |
| `SMTP_USER`                | no           | none                                      | SMTP user. Authentication is used only if both user and password are set.                                                                                                                                                 |
| `SMTP_PASSWORD`            | no           | none                                      | SMTP password.                                                                                                                                                                                                            |
| `SMTP_SECURE`              | no           | `false`                                   | `true` for implicit TLS (usually port 465); `false` for STARTTLS (port 587).                                                                                                                                              |
| `AUTH_EMAIL_FILE`          | dev/e2e only | `.mail/outbox.jsonl`                      | Outbox path for `AUTH_EMAIL_DELIVERY_MODE=file`.                                                                                                                                                                          |

### Object storage

| Variable                  | Required | Default | Description                                                                                                    |
| ------------------------- | -------- | ------- | -------------------------------------------------------------------------------------------------------------- |
| `OBJECT_STORAGE_PROVIDER` | no       | `s3`    | Only `s3` (any S3-compatible service) is supported.                                                            |
| `S3_ENDPOINT`             | yes      | none    | Endpoint URL. Must be reachable from the app **and** from users' browsers (signed download URLs).              |
| `S3_REGION`               | no       | `auto`  | Region. `auto` suits Cloudflare R2; AWS S3 needs the bucket's real region.                                     |
| `S3_BUCKET`               | yes      | none    | Bucket name. Must already exist.                                                                               |
| `S3_ACCESS_KEY_ID`        | yes      | none    | Access key.                                                                                                    |
| `S3_SECRET_ACCESS_KEY`    | yes      | none    | Secret key.                                                                                                    |
| `S3_FORCE_PATH_STYLE`     | no       | `false` | `true` (also `1`, `yes`, `on`) addresses the bucket in the path; needed for MinIO and most self-hosted stores. |

### PDF export

| Variable              | Required | Default                              | Description                                                                                   |
| --------------------- | -------- | ------------------------------------ | --------------------------------------------------------------------------------------------- |
| `TYPST_BIN`           | no       | `typst` on `PATH`                    | Path to the Typst 0.15.1 binary. The image sets `/usr/local/bin/typst`.                       |
| `TYPST_TEMPLATES_DIR` | no       | `src/server/pdf/templates` under cwd | Override the Typst template directory. Correct by default in dev and in the standalone build. |
| `TYPST_FONTS_DIR`     | no       | `src/server/pdf/fonts` under cwd     | Override the bundled font directory.                                                          |

### Branding

Out of the box the app presents itself as plain **Sheet Happens**: its own pictogram, no organisation
name, a generic tagline under the wordmark and a neutral PDF letterhead. To show your organisation
instead, set the variables below. They are read in one place, `src/lib/branding.ts`, and nothing
else in the code names an organisation.

| Variable                    | Required | Default | Description                                                                                                                                                     |
| --------------------------- | -------- | ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_ORG_NAME`      | no       | none    | Shown under the wordmark in the app and on the sign-in screens, as the logo's alt text, and appended to the PDF letterhead (`Sheet Happens - <name>`).          |
| `NEXT_PUBLIC_ORG_LOGO`      | no       | none    | Logo for light surfaces: a path under `public/` (for example `/brand/acme.svg`) or an absolute `https://` URL. Square works best. Empty keeps the default mark. |
| `NEXT_PUBLIC_ORG_LOGO_DARK` | no       | none    | Logo for dark surfaces and the sign-in panel. Falls back to `NEXT_PUBLIC_ORG_LOGO` (and the other way round), so a single logo that reads on both is enough.    |
| `ORG_LOGO_PDF_PATH`         | no       | none    | File the PDF letterhead uses: `.png`, `.jpg`, `.gif`, `.webp` or `.svg`, absolute or relative to the server's working directory (`/app` in the image). Runtime. |

The three `NEXT_PUBLIC_*` variables are baked into the client bundle at build time, like the URLs in
§2.1: pass them as `--build-arg`s (the `Dockerfile` accepts all three) or have them in the
environment of `pnpm build`, and rebuild to change them. `ORG_LOGO_PDF_PATH` is read on every
export, so it can point at a mounted file. A missing or unsupported file silently falls back to a
letterhead without a logo.

To ship a logo inside the image, put the files under `public/brand/` before building and use
`/brand/<file>` for the app and `public/brand/<file>` for the PDF:

```bash
docker build -t sheet-happens \
  --build-arg NEXT_PUBLIC_ORG_NAME="Acme Corp" \
  --build-arg NEXT_PUBLIC_ORG_LOGO=/brand/acme.svg \
  --build-arg NEXT_PUBLIC_ORG_LOGO_DARK=/brand/acme-light.svg \
  …
# at runtime: ORG_LOGO_PDF_PATH=public/brand/acme.png
```

Two things stay as they are because they are the product, not the organisation: the "Sheet Happens"
wordmark and the colour palette. The welcome page in the in-app manual is editable by admins at
`/admin/info`, so rewrite it for your team there.

### First admin bootstrap

Read only by `scripts/bootstrap-admin.mjs`.

| Variable                     | Required  | Default           | Description                                                                                                                     |
| ---------------------------- | --------- | ----------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `BOOTSTRAP_ADMIN_EMAIL`      | first run | empty (skips)     | E-mail address of the first admin. With it empty, the script does nothing.                                                      |
| `BOOTSTRAP_ADMIN_FIRST_NAME` | no        | `QA`              | First name of the admin.                                                                                                        |
| `BOOTSTRAP_ADMIN_LAST_NAME`  | no        | `Admin`           | Last name of the admin.                                                                                                         |
| `BOOTSTRAP_ADMIN_CURRENCY`   | no        | `EUR`             | ISO 4217 default currency code of the admin's profile.                                                                          |
| `BOOTSTRAP_ADMIN_TIMEZONE`   | no        | `Europe/Budapest` | IANA time zone of the admin.                                                                                                    |
| `BOOTSTRAP_ADMIN_LOCALE`     | no        | `en`              | UI language of the admin: `en` or `hu`.                                                                                         |
| `BOOTSTRAP_ADMIN_SEND_EMAIL` | no        | `false`           | `true` also e-mails the invitation (needs `AUTH_EMAIL_DELIVERY_MODE=smtp`). The accept URL is always printed to the script log. |

The defaults (`QA`, `Admin`, `Europe/Budapest`) are developer conveniences; set your own.

### MCP / OAuth

| Variable                                | Required | Default                                 | Description                                                                                                                                      |
| --------------------------------------- | -------- | --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `MCP_ALLOW_DYNAMIC_CLIENT_REGISTRATION` | no       | `false` in production, `true` elsewhere | `true`/`false` forces OAuth Dynamic Client Registration on or off. Leave unset in production; turn on temporarily only to try the MCP Inspector. |

The MCP endpoint is `<BETTER_AUTH_URL>/api/mcp`; the OAuth issuer is `<BETTER_AUTH_URL>/api/auth`.
Everything else about it is in [`mcp-server.md`](mcp-server.md).

The REST API at `<BETTER_AUTH_URL>/api/v1` needs no configuration: members create personal access
tokens under _Settings → API tokens_. Your reverse proxy must pass the `Authorization` header
through and accept request bodies of at least 11 MB (invoice PDFs are capped at 10 MB). See
[`rest-api.md`](rest-api.md).

### Leave calendar

| Variable               | Required | Default                        | Description                                                                                                     |
| ---------------------- | -------- | ------------------------------ | --------------------------------------------------------------------------------------------------------------- |
| `HOLIDAY_API_BASE_URL` | no       | `https://date.nager.at/api/v3` | Base URL of a [Nager.Date](https://date.nager.at)-compatible API the leave calendar reads public holidays from. |

Unlike SMTP, object storage and Google sign-in, which only reach services you configure, this call
is on by default: the free, keyless Nager.Date API, asked for Hungarian public holidays
(`/PublicHolidays/<year>/HU`; the country is not configurable). Each year is fetched once, stored
in the database and refreshed in the background by the notification dispatcher. If the API is
unreachable the calendar shows no holidays for that year and the failure is logged; recording leave
never depends on it. To keep the instance off the internet, point the variable at a mirror that
serves the same paths.

### Observability

There is no built-in telemetry, tracing or error-reporting integration and no variable for one. Logs
go to stdout/stderr (collect them with your platform), `GET /api/health` is the liveness probe and
`/admin/system` the in-app diagnostics page. `NEXT_TELEMETRY_DISABLED=1` is already set in the image.

### Development and test only

Not read by a production deployment: `AUTH_SECURITY_SETUP_MODE`, `AUTH_EMAIL_FILE`, the `file` mail
mode, `E2E_PORT` (Playwright server port), `RUN_TYPST_SMOKE` and `REPORT_PDF_SMOKE_DIR` (`pnpm
test:pdf`), `UPDATE_MCP_CONTRACT` (refresh the MCP contract snapshot test), and `CI`, `NODE_ENV`,
`NEXT_PHASE`, `NEXT_RUNTIME`, which the tooling sets itself.

## 6. First run

1. **Bootstrap the admin.** With `BOOTSTRAP_ADMIN_EMAIL` set, the pre-deploy/bootstrap step creates the
   member row (role `admin`, status `invited`) and an invitation valid for **72 hours**. The accept
   URL (`<app>/accept-invite?token=…`) is printed in the script output, and e-mailed too if
   `BOOTSTRAP_ADMIN_SEND_EMAIL=true` with SMTP. Treat that URL as a secret until used. Missed the
   window? Run the script again: it revokes the pending invitation and issues a fresh one. Once the
   admin is active it logs that and skips, so leaving it in a pre-deploy command is harmless.
2. **Open the accept URL** and sign in. Registration is invite-only; there is no public sign-up.
3. **Finish the security setup.** In production every account goes through a first-run security gate,
   and admins must enable authenticator-app TOTP (with backup codes) before they can use the back
   office. Register a passkey as well. Store the backup codes.
4. **Invite people** from _People_ (`/admin/people`): e-mail, name, role (admin or member) and
   profile type. Invitations expire after 72 hours and can be resent from the same screen; resending
   rotates the token.
5. **Language, time zone and currency.** The UI language is stored in a cookie by the language
   switcher; without one it follows the browser's `Accept-Language`, then falls back to Hungarian
   (the default locale), so English-speaking users should switch once. Time zones are per member (the
   bootstrap admin gets `BOOTSTRAP_ADMIN_TIMEZONE`; an admin can edit a member's locale, time zone,
   role and profile type), and money is handled per member rate in that member's currency (EUR and
   HUF are the ones the seed data exercises). Rates, projects and assignments are configured in the
   admin area.
6. **Verify** on `/admin/system` that every check is green; a Google or Typst warning only matters if
   you use that feature.
7. **Connect an AI client over MCP (optional).** Members can connect Claude and other MCP clients to
   `<your-url>/api/mcp` and manage connections under _Settings → Connected apps_. Steps, scopes and
   the security model are in [`mcp-server.md`](mcp-server.md) (section 12).

The product's domain rules (timesheet revisions, locks, rates, invoices) are in
[`domain-model.md`](domain-model.md); the auth and invitation model is in
[`auth-user-management.md`](auth-user-management.md).

## 7. Upgrading, backups and security

### Upgrading

```bash
# From the directory that holds docker-compose.yml, next to the clone (section 2.2):
git -C sheet-happens pull
docker compose build app
docker compose run --rm app pnpm db:migrate:deploy   # apply new migrations
docker compose up -d app
```

On Railway, a deploy does the same: it rebuilds and runs the pre-deploy migration. Read the release
notes before a major jump, take a backup first (below), and rebuild whenever any `NEXT_PUBLIC_*`
value changes. Migrations only move forward; to go back, restore the backup taken before upgrading.

### Backups

Back up the two stores together, because documents in the bucket are referenced by rows in the
database:

- **PostgreSQL:** `docker compose exec -T db pg_dump -U sheet_happens -Fc sheet_happens > sheet_happens-$(date +%F).dump`,
  restored with `pg_restore`. Use a client of the same major version as the server. Managed databases
  usually offer scheduled snapshots, which is better still.
- **Object storage:** enable versioning or replication at the provider, or mirror the bucket with
  `mc mirror` / `rclone`.
- **Secrets:** keep `BETTER_AUTH_SECRET` and the S3 keys in your password manager; a database
  restored without its secret loses its sessions and linked Google accounts (below).

Timesheet revisions are immutable financial snapshots; treat the database as the system of record.

### Security notes

- **`BETTER_AUTH_SECRET`.** Sessions are signed with it and stored Google OAuth tokens are encrypted
  with it, and Better Auth derives other secrets from it (its documentation covers two-factor
  secrets too). Rotating it signs everyone out and breaks linked Google accounts, and may require
  users to redo two-factor setup, so plan a rotation like a maintenance window and try it on a copy
  first. Restoring a database into another environment needs the same secret byte for byte, or the
  same breakage applies. Never reuse a secret between environments, and never commit one.
- **Two-factor gate.** Admins must use TOTP in production; sign-in methods (magic link, passkey,
  password, Google) do not count as the second factor. `AUTH_SECURITY_SETUP_MODE=optional` cannot
  weaken this on a deployed instance.
- **Invite-only.** There is no public sign-up. Magic-link and password-reset requests for unknown
  addresses return the same neutral success response and send nothing. Google sign-in only works for
  members who already activated their invitation and belong to an allowed Workspace domain.
- **Rate limits** (Better Auth, stored in the database, per client IP): 100 requests per minute in
  general; per 15 minutes: 5 magic-link requests, 5 password-reset requests, 20 e-mail sign-ins,
  10 social sign-ins, 10 passkey attempts per step, 10 two-factor attempts. The MCP endpoint allows
  120 requests per minute per member, the REST API (`/api/v1`) 120 per minute per token. All of these depend on the proxy forwarding the real client IP
  in `X-Forwarded-For`.
- **Network exposure.** Publish only the reverse proxy. Keep PostgreSQL on a private network and
  the MinIO console (`:9001`) unpublished or behind authentication.
- **MCP dynamic client registration** is off in production by default; leave it that way.
- **Reporting a vulnerability:** see [`SECURITY.md`](../SECURITY.md).

## 8. Troubleshooting

| Symptom                                                             | Likely cause                                                                                                                                    |
| ------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Container exits with `BETTER_AUTH_SECRET is required in production` | The variable is not set at runtime.                                                                                                             |
| No sign-in e-mail arrives, link visible in the container log        | `AUTH_EMAIL_DELIVERY_MODE` is not `smtp` (the fallback is `console`).                                                                           |
| Sign-in or passkey calls fail with a CORS or origin error           | The URL in the browser differs from `BETTER_AUTH_URL`/`NEXT_PUBLIC_*`, or the bundle was built for another origin: rebuild with the right args. |
| Passkeys stopped working after a domain change                      | The relying-party ID is the hostname; passkeys must be re-registered.                                                                           |
| Downloads of invoices/payslips fail or point at `minio:9000`        | `S3_ENDPOINT` is not a URL the browser can reach.                                                                                               |
| PDF export fails                                                    | Typst missing or the wrong version (`TYPST_BIN`); check `/admin/system`.                                                                        |
| `429` on sign-in                                                    | Rate limit hit (5 magic links per 15 minutes per IP); wait, and check that the proxy forwards the client IP.                                    |
| 502 on Railway                                                      | The domain is pinned to port 3000; route it to 8080.                                                                                            |
