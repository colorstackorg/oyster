# Architecture, Environments & Maintenance

This document covers what each app does, how local development differs from
production, and the day-to-day maintenance workflows (migrations, queue
inspection). For integration details, see
[`integrations-overview.md`](./integrations-overview.md). For known risks,
see [`handoff-known-considerations.md`](./handoff-known-considerations.md).

## Core services

Oyster is a Turborepo monorepo with three deployable apps sharing a
`packages/core` business-logic layer.

### `apps/member-profile`

The member-facing app. This is where ColorStack members manage their
profile, browse/apply to opportunities, use the "Ask AI" Slack chatbot
integration, do resume reviews, track gamification points, and go through
onboarding. Runs 2 replicas in production.

### `apps/admin-dashboard`

The internal ops tool used by the ColorStack team — reviewing member
applications, managing companies/schools, running events, editing gamification
activities, managing feature flags, and inspecting/managing BullMQ queues
directly (`/bull` route, owner-role only). This is the main place an
engineer would go to operate the system without touching the database or
Redis directly.

### `apps/api`

No user-facing UI. Runs all background job processing (BullMQ workers) and
handles webhook callbacks from external services (e.g. the LinkedIn/Google
OAuth callback, Slack events). Runs 3 replicas in production — this is the
service most directly implicated in the BullMQ outage documented in
`handoff-known-considerations.md`, since more replicas means more workers
pulling from the same queues.

### `packages/core`

Shared business logic used by all three apps — this is where most feature
code actually lives (modules like `slack/`, `apify.ts`, `location/`,
`notifications/`, etc., referenced throughout `integrations-overview.md`).

## Environments

| | Local development | Production |
|---|---|---|
| Postgres | Docker container (`docker-compose.yml`), port 5433, throwaway data | Railway-managed Postgres |
| Redis | Docker container, port 6380 | Railway-managed Redis (`roundhouse.proxy.rlwy.net` per last incident review) |
| Apps | Run directly via `bun dev` on your machine | Deployed to Railway, 1 service per app |
| Auth | OTP login is bypassed — any 6-digit code works | Real OTP delivery via Postmark/SMTP |
| Integrations | Mostly unconfigured by default (see `.env.example` files); only enable what a feature you're working on needs | Fully configured (assuming credentials are valid — some are unverified, see `integrations-overview.md`) |

Full local setup steps are in [`CONTRIBUTING.md`](../CONTRIBUTING.md)
("Getting Started") — `bun install` → `bun env:setup` → `bun dx:up` →
`bun db:migrate` → `bun db:seed` → `bun dev`. There's also a `postgres-test`
container (port 5434) used for the test suite, separate from the dev
database.

## Deployment

All three apps deploy to **Railway**, auto-triggered on push to `main` — there
is no separate staging environment visible in the repo's config
(`apps/*/railway.json`). Each app's `railway.json` defines its build command
(which includes running `bun db:migrate` against `DATABASE_PUBLIC_URL` as
part of the build step) and start command. Since migrations run as part of
every app's build, **a migration only needs to exist in one deploy** — it'll
run whichever app happens to build/deploy first after being merged.

## Maintenance workflows

- **Running a migration:** `bun db:migrate` locally; in production this
  happens automatically as part of the Railway build step above. See
  [`how-to-implement-a-database-migration.md`](./how-to-implement-a-database-migration.md)
  for how to write one.
- **Inspecting/managing BullMQ queues:** the admin dashboard has a built-in
  UI for this at `/bull` (owner role required) — lists queues, lets you view
  individual jobs, manually add jobs, and manage repeatable jobs
  (`apps/admin-dashboard/app/routes/_dashboard.bull.*`). This is the
  first place to check when investigating the job backlog described in
  `handoff-known-considerations.md`, rather than needing direct Redis
  access.
- **Inspecting the database directly:** `bun prisma:studio` opens Prisma
  Studio against your local database for browsing/editing rows.
- **Feature flags:** managed through the admin dashboard's feature-flags
  route, not via a config file or third-party service.

## Cross-references

- Local dev setup (already documented): [`CONTRIBUTING.md`](../CONTRIBUTING.md)
- Integration details: [`integrations-overview.md`](./integrations-overview.md)
- Known risks/escalation areas: [`handoff-known-considerations.md`](./handoff-known-considerations.md)
