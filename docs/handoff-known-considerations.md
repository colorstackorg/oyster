# Key Dependencies, Known Technical Considerations & Escalation Areas

This document is intended for the incoming team taking over Oyster
development. It covers what the codebase depends on, what has caused problems
in the past, and what to be careful with as usage grows (particularly with
the planned student-contribution feature).

## Key Dependencies

### Runtime & data layer

- **Node.js / Bun** — Bun is used for scripts and package management; apps run
  on Node.
- **TypeScript** across the whole monorepo (Turborepo-managed workspaces).
- **PostgreSQL** — primary datastore, queried via **Kysely** (type-safe SQL
  builder, not a full ORM). Migrations live in `packages/db`.
- **Redis** — backs **BullMQ**, which handles all background/async job
  processing (emails, Slack sync, onboarding, gamification, etc.).

### Hosting

- **Railway** hosts all three apps (`api`, `admin-dashboard`, `member-profile`)
  plus the Postgres and Redis instances. Deploys are automatic on push to
  `main` — there is no separate staging gate visible in the repo config
  (`apps/*/railway.json`). `api` runs 3 replicas, `member-profile` runs 2.

### External integrations

| Service | Purpose | Status |
|---|---|---|
| Airmeet | Virtual events | Documented, active |
| Airtable | CRM (event registrations, family/members) | Documented, active |
| Cloudflare R2 | Object storage | Documented, active |
| Google OAuth | Authentication | Documented, active |
| Mailchimp | Email marketing | Documented, active |
| Pinecone | Vector database | Documented, active |
| Slack | Community home + auth + internal notifications | Documented, active — setup is credential-type-sensitive (see below) |
| Sentry | Error monitoring | Documented, optional |
| Anthropic / OpenAI / Cohere | AI features (e.g. resume review) | Env vars present, not in the integrations doc — confirm which are live in prod |
| Apify, Google Maps, LinkedIn, Mixpanel, Postmark, SMTP, Twilio | Various | Env vars present in `apps/api/.env.example` but undocumented — likely partial/legacy; **confirm which are actually load-bearing in production before assuming any are safe to ignore** |

The last group above is the biggest documentation gap: they have config
surface but no write-up in `docs/how-to-enable-integrations.md`, so their
current production status needs to be confirmed directly with the outgoing
team rather than assumed from the code alone.

## Known Technical Considerations

- **Slack credentials are not one key.** Production needs a bot token
  (`xoxb-` → `SLACK_BOT_TOKEN`), a workspace-admin *user* token (`xoxp-` →
  `SLACK_ADMIN_TOKEN`), a signing secret, and OpenID client id/secret. Putting
  the bot token in `SLACK_ADMIN_TOKEN` (or using an `xapp-` Socket Mode token)
  is the usual failure mode. See
  [`how-to-enable-integrations.md`](./how-to-enable-integrations.md#slack).
- **Slack invite / deactivate depends on a browser session, not the Slack
  app.** `users.admin.invite` / `setInactive` / `setRegular` read
  `slack:legacy_token` (`xoxc-`) and `slack:legacy_cookie` from Redis. Nothing
  in the codebase writes those keys, and they die when the admin's Slack web
  session expires — invites can stop working with no env-var change. Confirm
  with the outgoing team how those Redis keys are currently populated and
  rotated.

## Known Issues / Candidate Follow-Up Work
as of September 29, 2026
These are not outage-level, but they make day-to-day use annoying. Flag them
during handoff so the new team can decide what to fix first.

- **Admin dashboard error handling** — some failures surface as an
  unhandled 500 / crash rather than a friendly error state. A common case
  is missing env vars: in development those keys are optional so the app
  still boots, but hitting a screen that needs them (resume books →
  Airtable / Google Drive, GitHub contributors → `GITHUB_TOKEN`, student
  Airtable links, etc.) throws instead of saying the integration isn't
  configured. Worth an audit of error boundaries across
  `apps/admin-dashboard` routes.
- **Stale UI state after mutations** — some admin actions don't reflect
  their result until the page is manually reloaded, suggesting a loader/data
  revalidation isn't being triggered after certain form submissions or
  actions.
- **"Ask AI" feature reliability** — the member-profile Ask AI feature
  (`apps/member-profile/app/routes/_profile.ask-ai.tsx`, live at
  `/ask-ai`) works correctly roughly 90% of the time; the remaining failure
  cases haven't been root-caused yet.

## Areas That May Require Escalation

- **Worker health monitoring** — currently absent; needs design input before
  scaling job volume.

