# External Integrations — What Each One Actually Does

This document explains what each external service is *used for* in the app —
the feature it powers and where it lives in the code. For setup instructions
(generating keys, which env vars to set), see
[`how-to-enable-integrations.md`](./how-to-enable-integrations.md).

Services are listed alphabetically.

### Airmeet

**Powers:** virtual event registration and attendance sync for
Airmeet-hosted ColorStack events.

**Code:** `packages/core/src/modules/events/airmeet.ts`

### Airtable

**Powers:** CRM sync — pushes event registration data and "family"
(mentorship program) data into Airtable bases used by the ops team outside
the app.

**Code:** `packages/core/src/modules/airtable.ts`

### Anthropic (Claude)

**Powers:** the LLM behind several AI features —
1. the Slack "Ask AI" chatbot's answer generation (RAG over past Slack threads)
2. resume review AI feedback
3. parsing scraped job postings into structured tags
4. parsing free-text compensation offers shared in Slack into structured records

**Code:** `packages/core/src/infrastructure/ai.ts` (`getChatCompletion`), called
from `slack/slack.ts`, `resume-reviews.ts`, `opportunities.ts`,
`compensation/offers.ts`.

### Apify

**Powers:** LinkedIn scraping for three features —
1. auto-filling a new "Company" record's name/logo/description when an admin
   creates one from a LinkedIn slug
2. auto-filling a new "School" record the same way
3. a periodic job that syncs a member's work experience/education from their
   LinkedIn profile

**Code:** `packages/core/src/modules/apify.ts` (`isApifyConfigured()`,
`runActor`), consumers: `employment/use-cases/create-company.ts`,
`education/use-cases/save-school-if-necessary.ts`, `linkedin.ts`.

The company-creation flow has a `isApifyConfigured()` check with a manual
fallback in the admin UI. The LinkedIn profile-sync background job doesn't
have that fallback — it throws a `ColorStackError` if the token is missing.

### Cloudflare R2

**Powers:** object storage — profile photos, resumes, and other uploaded
files.

**Code:** `packages/core/src/infrastructure/s3.ts` (`putObject`, `getObject`,
`deleteObject`), referenced from many modules across the app.

### Cohere

**Powers:** reranks candidate Slack threads for relevance before they're fed
to Claude as chatbot context.

**Code:** `packages/core/src/infrastructure/ai.ts` (`rerankDocuments`,
`rerank-english-v3.0`), used in `slack/slack.ts`. A required step in the same
chatbot pipeline as Anthropic/OpenAI/Pinecone.

### Google Maps

**Powers:** city/location autocomplete and place-details lookup (onboarding
location field, event locations, etc.), cached in Redis for 30-90 days.

**Code:** `packages/core/src/modules/location/location.ts`
(`getAutocompletedPlaces`, `getPlaceDetails`, `getMostRelevantLocation`).

### Google OAuth

**Powers:** member and admin login.

**Code:** `packages/core/src/modules/authentication/services/google-oauth.service.ts`

### LinkedIn (OAuth)

**Powers:** "Sign in / apply with LinkedIn" on the public application form, as
an alternative to email/Google.

**Code:** `packages/core/src/modules/authentication/services/linkedin-oauth.service.ts`,
callback handled in `apps/api/src/handlers/oauth.ts`. If credentials are
missing, `getLinkedInAuthUri` returns `null` and the "Login with LinkedIn"
button is hidden.

### Mailchimp

**Powers:** email marketing list sync — keeps members synced to a Mailchimp
audience for newsletters/campaigns.

**Code:** `packages/core/src/modules/mailchimp.ts`

### Mixpanel

**Powers:** product analytics only (page views, opportunity views, LinkedIn
syncs, help requests, logins, etc.) — not a functional dependency for any
user-facing feature.

**Code:** `packages/core/src/infrastructure/mixpanel.ts` (`track`,
`setMixpanelProfile`), called from `opportunities.ts`, `linkedin.ts`,
`resume-reviews.ts`, `peer-help.ts`, `slack/slack.ts`.

### OpenAI

**Powers:** text embeddings for the Slack chatbot's vector search step (embeds
the question and candidate Slack messages before retrieval).

**Code:** `packages/core/src/infrastructure/ai.ts` (`createEmbedding`,
`text-embedding-3-small`), used in `slack/slack.ts`.

This step is a likely contributor to the ~90% reliability issue already
flagged in [`handoff-known-considerations.md`](./handoff-known-considerations.md) —
worth checking rate limits/quota on this key.

### Pinecone

**Powers:** the vector store backing the Slack "Ask AI" chatbot's semantic
search over past Slack threads — stores the embeddings created via OpenAI
and is queried at answer time before results are reranked (Cohere) and
answered (Anthropic).

**Code:** `packages/core/src/infrastructure/pinecone.ts`. Part of the same
chatbot pipeline as Anthropic/OpenAI/Cohere above.

### Postmark

**Powers:** production transactional email — application accepted/rejected,
one-time login codes, referral emails, resume-submission confirmations,
student anniversary/graduation/removal notices, email-changed notices. Also
used to check whether a member's email has bounced, which gates certain
application flows.

**Code:** `packages/core/src/infrastructure/postmark.ts` (`sendEmail`,
`hasEmailBounced`), dispatched from
`notifications/use-cases/send-email.ts`.

Worth noting: a failed send just logs to Sentry and swallows the error
rather than throwing, so emails can quietly stop sending with no loud
failure signal — the same blind spot pattern behind the BullMQ outage
already documented in
[`handoff-known-considerations.md`](./handoff-known-considerations.md).

### Sentry

**Powers:** error reporting sink used throughout the codebase — captures
unhandled errors/exceptions across `api`, `admin-dashboard`, and
`member-profile` for debugging production issues.

**Code:** `packages/core/src/infrastructure/sentry.ts` (`reportException`),
called from most modules in `packages/core`.

### Slack

**Powers:** the community home for ColorStack members (channels, DMs),
Slack-based login, and the engine behind the "Ask AI" chatbot (ingesting
messages, triggering embeddings, and answering member questions). Also
posts staff-facing ops notifications to a **separate internal workspace**.

**Code:** `packages/core/src/modules/slack/` (`slack.ts`, `slack.worker.ts`,
`slack-profile.ts`, `slack.utils.ts`, `slack.types.ts`), webhook handlers in
`apps/api/src/handlers/slack.ts`, Sign in with Slack in
`packages/core/src/modules/authentication/services/slack-oauth.service.ts`.

Setup is easy to get wrong because several different credential types are
required — they are **not** interchangeable. In particular:

- `SLACK_BOT_TOKEN` must be a **Bot User OAuth Token** (`xoxb-`)
- `SLACK_ADMIN_TOKEN` must be a **User OAuth Token** (`xoxp-`) from a
  workspace admin (used only for `users.profile.set`)
- `SLACK_SIGNING_SECRET` is the app's signing secret, not a token
- Invite / activate / deactivate members use an undocumented Slack admin API
  with an `xoxc-` browser session token stored in Redis
  (`slack:legacy_token` + `slack:legacy_cookie`), not `.env`

Full key-type table, scopes, event URLs, and Redis notes:
[`how-to-enable-integrations.md`](./how-to-enable-integrations.md#slack).

### SMTP

**Powers:** dev-only substitute for Postmark, so contributors can test the
email flow without a verified Postmark domain.

**Code:** `packages/core/src/modules/notifications/shared/email.utils.ts`
(`getNodemailerTransporter`), selected only when `ENVIRONMENT === 'development'`.
Dev-experience dependency only — never invoked in production or test.

### Twilio

**Powers:** SMS notifications — a `notification.sms.send` job type and
worker handler exist and are fully wired up
(`packages/core/src/modules/notifications/twilio.ts`,
`notifications.worker.ts`, `bull.types.ts`).

**However:** no code path anywhere in the app currently enqueues a
`notification.sms.send` job — it's built but not called from anywhere. This
looks like a dormant/shelved feature rather than dead config, but it's worth
confirming with the outgoing team whether it was intentionally shelved or a
caller was removed at some point, since the infrastructure to bring it back
already exists.

## Cross-references

- Setup/enablement steps: [`how-to-enable-integrations.md`](./how-to-enable-integrations.md)
- Outage risk, job backlog, and other known considerations:
  [`handoff-known-considerations.md`](./handoff-known-considerations.md)
