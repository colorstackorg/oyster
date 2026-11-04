# How to Enable Integrations

## Context

We have integrations with the following platforms:

- Airmeet (Virtual Events)
- Airtable (CRM)
- Cloudflare R2 (Object Storage)
- Google (Authentication)
- Mailchimp (Email Marketing)
- Pinecone (Vector Database)
- Sentry (Error Monitoring)
- Slack (Community Home, Authentication)

## Airmeet

To enable the **Airmeet** integration:

1. See Section 3.1 of
   [this](https://help.airmeet.com/support/solutions/articles/82000467794-airmeet-public-api)
   Airmeet documentation to generate an access token/key.
2. In `/api/.env`, set the following variables:

   ```
   AIRMEET_ACCESS_KEY
   AIRMEET_SECRET_KEY
   ```

## Airtable

To enable the **Airtable** integration:

1. See [this](https://support.airtable.com/docs/creating-personal-access-tokens)
   Airtable documentation to generate a personal access token.
2. Create an Airtable base and grab the base ID. You can read
   [this](https://support.airtable.com/docs/finding-airtable-ids) documentation
   for instructions on how to do so.
3. In `/api/.env`, set the following variable:
   ```
   AIRTABLE_API_KEY
   AIRTABLE_EVENT_REGISTRATIONS_BASE_ID
   AIRTABLE_FAMILY_BASE_ID
   ```

## Cloudflare R2

To enable the **Cloudflare R2** integration:

1. See [this](https://developers.cloudflare.com/r2/get-started/) Cloudflare R2
   documentation to get started.
2. In `/api/.env`, set the following variables:
   ```
   R2_ACCESS_KEY_ID
   R2_ACCOUNT_ID
   R2_BUCKET_NAME
   R2_SECRET_ACCESS_KEY
   ```

## Google

To enable the **Google** integration:

1. In the Google Cloud Console, create an OAuth 2.0 Client ID.
   - For the "Authorized JavaScript Origins", you can set:
     - `http://localhost:3000`
     - `http://localhost:3001`
   - For the "Authorized Redirect URIs", you can set:
     - `http://localhost:8080/oauth/google`
2. In `/api/.env`, the following variables:
   ```
   GOOGLE_CLIENT_ID
   GOOGLE_CLIENT_SECRET
   ```
3. In `/admin-dashboard/.env`, the following variables:
   ```
   GOOGLE_CLIENT_ID
   ```
4. In `/member-profile/.env`, the following variables:
   ```
   GOOGLE_CLIENT_ID
   ```

## Mailchimp

To enable the **Mailchimp** integration:

1. See [this](https://mailchimp.com/help/about-api-keys) Mailchimp documentation
   to generate an API key.
2. In `/api/.env`, set the following variables:
   ```
   MAILCHIMP_API_KEY
   MAILCHIMP_AUDIENCE_ID
   MAILCHIMP_SERVER_PREFIX
   ```

## Pinecone

To enable the **Pinecone** integration:

1. See
   [this](https://docs.pinecone.io/guides/get-started/quickstart#2-get-an-api-key)
   Pinecone documentation to generate an API key.
2. In `/api/.env`, set the following variables:
   ```
   PINECONE_API_KEY
   ```

## Sentry

To enable the **Sentry** integration:

1. You probably don't need to enable this integration but in case you want to,
   proceed with the following steps.
2. See
   [this](https://docs.sentry.io/product/sentry-basics/concepts/dsn-explainer)
   Sentry documentation on how to get your DSN.
3. In `/api/.env`, set the following variable:
   ```
   SENTRY_DSN
   ```
4. In `/member-profile/.env`, set the following variable:
   ```
   SENTRY_DSN
   ```
5. In `/admin-dashboard/.env`, set the following variable:
   ```
   SENTRY_DSN
   ```

## Slack

Slack is the integration people mix up most. The Slack dashboard shows several
credentials that look interchangeable, and **they are not**. Oyster needs
specific token *types* (the prefix tells you which is which), plus a handful of
channel/field IDs.

Oyster talks to **two workspaces**:

1. **Community workspace** (members) — login, events, chatbot, channel sync,
   birthday posts, profile updates.
2. **Internal workspace** (staff) — ops notifications (member removed, huge
   threads, etc.). This is a *separate* Slack app / bot token.

For local development, create a throwaway Slack workspace and a new Slack app.
Do not point Event Subscriptions from the production ColorStack app at your
laptop.

Official references:

- [Creating a Slack app](https://api.slack.com/authentication/basics)
- [Token types](https://docs.slack.dev/authentication/tokens)
- [Sign in with Slack (OpenID Connect)](https://docs.slack.dev/authentication/sign-in-with-slack)
- [Verifying requests from Slack](https://api.slack.com/authentication/verifying-requests-from-slack)

### Which credential is which

This is the part that usually goes wrong. Copy the value whose **name and
prefix** match the row — not whichever token is listed first on the page.

| Env var | Must start with / look like | Where in the Slack app | Used for |
|---|---|---|---|
| `SLACK_BOT_TOKEN` | `xoxb-` | **OAuth & Permissions** → **Bot User OAuth Token** | Almost all Web API calls: post messages, read history, join channels, look up users, add reactions |
| `SLACK_ADMIN_TOKEN` | `xoxp-` | **OAuth & Permissions** → **User OAuth Token** | `users.profile.set` (update a member's Slack email / directory-link custom field). Must belong to a **workspace admin**. A bot token (`xoxb-`) will fail here |
| `SLACK_SIGNING_SECRET` | long hex string, **no** `xox` prefix | **Basic Information** → **App Credentials** → **Signing Secret** | HMAC-verifying that `/slack/events` and `/slack/shortcuts` requests actually came from Slack |
| `SLACK_CLIENT_ID` | numeric / alphanumeric, no `xox` prefix | **Basic Information** → **App Credentials** → **Client ID** | Sign in with Slack (OpenID) |
| `SLACK_CLIENT_SECRET` | hex string, no `xox` prefix | **Basic Information** → **App Credentials** → **Client Secret** | Exchanging the Slack login `code` for a token |
| `INTERNAL_SLACK_BOT_TOKEN` | `xoxb-` | Bot User OAuth Token of the **internal** Slack app | Staff-workspace notifications |

Do **not** use:

- **App-level tokens** (`xapp-`) — those are for Socket Mode. This app uses HTTP
  webhooks, not Socket Mode.
- A bot token in `SLACK_ADMIN_TOKEN`, or a user token in `SLACK_BOT_TOKEN`.
- An incoming-webhook URL. Messages are posted via `chat.postMessage` with the
  bot token.

### 1. Create the Slack app (community workspace)

1. Go to [https://api.slack.com/apps](https://api.slack.com/apps) →
   **Create New App** → **From scratch**.
2. Name it something like `Oyster (dev)` and pick **your** workspace (not
   ColorStack production, unless you are configuring prod).
3. Under **App Home**, enable the bot user (display name can be `ColorStack` /
   `StackBot`).

### 2. Bot token (`xoxb-`) — `SLACK_BOT_TOKEN`

1. Open **OAuth & Permissions**.
2. Under **Bot Token Scopes**, add:

   - `channels:history`
   - `channels:join`
   - `channels:read`
   - `chat:write`
   - `emoji:read`
   - `groups:history`
   - `groups:read`
   - `im:history`
   - `im:read`
   - `im:write`
   - `mpim:history`
   - `mpim:read`
   - `reactions:write`
   - `users:read`
   - `users:read.email`
   - `users.profile:read`

3. Click **Install to Workspace** (or **Reinstall** if you added scopes after
   a previous install). Scopes do nothing until you reinstall.
4. Copy **Bot User OAuth Token** — it must start with `xoxb-`. That is
   `SLACK_BOT_TOKEN`.

Invite the bot into any channel it needs to post in (feed, birthdays, emoji
updates, announcements). `conversations.join` only works for *public*
channels; private channels need a manual `/invite`.

### 3. User / admin token (`xoxp-`) — `SLACK_ADMIN_TOKEN`

This is **not** the same as the bot token. `users.profile.set` for *other*
users requires a **user token from a workspace admin** with
`users.profile:write`.

1. Still on **OAuth & Permissions**, under **User Token Scopes**, add
   `users.profile:write`.
2. Reinstall the app. The installing user must be a **Workspace Admin or
   Owner**.
3. Copy **User OAuth Token** — it must start with `xoxp-`. That is
   `SLACK_ADMIN_TOKEN`.

If this value starts with `xoxb-`, profile updates (directory link, email
change) will fail.

### 4. Signing secret + OAuth client credentials

From **Basic Information** → **App Credentials**:

- **Signing Secret** → `SLACK_SIGNING_SECRET` (used to verify Slack HTTP
  requests; see `apps/api/src/handlers/slack.ts`)
- **Client ID** → `SLACK_CLIENT_ID`
- **Client Secret** → `SLACK_CLIENT_SECRET`

### 5. Sign in with Slack (OpenID Connect)

Login uses OpenID (`https://slack.com/openid/connect/authorize`), **not** the
legacy `identity.*` scopes and **not** the bot-install OAuth URL.

1. On **OAuth & Permissions**, add these **User Token Scopes** (in addition to
   `users.profile:write` above):

   - `openid`
   - `profile`
   - `email`

2. Add a **Redirect URL**:

   - Local: `http://localhost:8080/oauth/slack`
   - Production: `{API_URL}/oauth/slack`

   It must match `API_URL` exactly (see
   `packages/core/src/modules/authentication/shared/oauth.utils.ts`).

3. Reinstall after adding the OpenID scopes.

If `SLACK_CLIENT_ID` is unset, the "Log in with Slack" button is hidden.

### 6. Event Subscriptions

Slack must be able to **POST** to the API. `localhost` is not reachable from
Slack's servers — for local events you need a tunnel (ngrok, Cloudflare
Tunnel, etc.) whose HTTPS origin is what you paste here. Login (step 5) works
on localhost without a tunnel; events do not.

1. Open **Event Subscriptions** → turn **Enable Events** on.
2. **Request URL**: `{API_URL}/slack/events`
   - Local-with-tunnel example: `https://<your-tunnel>/slack/events`
   - Production: `https://<api-host>/slack/events`
3. Slack will send a `url_verification` challenge; the API echoes it back
   (`handleSlackEvent`). Keep the API running while you save this URL.
4. Under **Subscribe to bot events**, add:

   - `channel_archive`
   - `channel_created`
   - `channel_deleted`
   - `channel_rename`
   - `channel_unarchive`
   - `emoji_changed`
   - `message.channels`
   - `message.groups`
   - `message.im`
   - `message.mpim`
   - `reaction_added`
   - `reaction_removed`
   - `team_join`
   - `user_profile_changed`

These map 1:1 to `apps/api/src/handlers/slack.ts`.

### 7. Interactivity (Ask ColorStack AI shortcut)

1. Open **Interactivity & Shortcuts** → turn **Interactivity** on.
2. **Request URL**: `{API_URL}/slack/shortcuts` (note: this is **not** the
   events URL).
3. Create a **Message Shortcut** whose **Callback ID** is exactly
   `ask_colorstack_ai`.

### 8. Channel IDs, Team ID, custom profile fields

These are not tokens. In Slack, right-click a channel → **View channel
details** → copy **Channel ID** at the bottom (`C…`). Enable Slack's
developer mode if you don't see IDs.

| Env var | Shape | Where it is used |
|---|---|---|
| `SLACK_TEAM_ID` | `T…` | Deep links (`slack://user?team=…`). From a channel URL (`app.slack.com/client/T…/C…`) or `auth.test` on the bot token |
| `SLACK_FEED_CHANNEL_ID` | `C…` | New-channel alerts, 250-reply alerts, event/peer-help posts |
| `SLACK_BIRTHDAYS_CHANNEL_ID` | `C…` | Daily birthday shout-outs |
| `SLACK_ANNOUNCEMENTS_CHANNEL_ID` | `C…` | Member Profile recap → announcements |
| `SLACK_EMOJI_CHANNEL_ID` | `C…` | "new emoji added" posts (also needs the `slack_emoji_updates` feature flag) |
| `INTERNAL_SLACK_NOTIFICATIONS_CHANNEL_ID` | `C…` in the **internal** workspace | Default destination for `workspace: 'internal'` notifications |
| `SLACK_BIRTHDATE_FIELD_ID` | `Xf…` | Custom Slack profile field used to backfill member birthdates |
| `SLACK_MEMBER_DIRECTORY_FIELD_ID` | `Xf…` | Custom Slack profile field that stores the Member Directory URL |

Custom field IDs live under the workspace's **Configure profiles** / custom
fields settings, not in the Slack *app* dashboard.

### 9. Internal workspace bot

Create a **second** Slack app in the staff workspace (or reuse the existing
internal one in production). You only need a bot token with `chat:write` and
a notifications channel ID:

```
INTERNAL_SLACK_BOT_TOKEN   # xoxb-… from the *internal* app
INTERNAL_SLACK_NOTIFICATIONS_CHANNEL_ID
```

### 10. Workspace admin APIs (invite / activate / deactivate)

Inviting members and activating/deactivating Slack users does **not** use
`SLACK_BOT_TOKEN` or `SLACK_ADMIN_TOKEN`. Those flows call undocumented
Slack admin methods (`users.admin.invite`, `users.admin.setInactive`,
`users.admin.setRegular`) with a **browser session** from a workspace
admin.

See `packages/core/src/modules/slack/services/slack-admin.service.ts`. The
values live in **Redis**, not `.env`. Nothing in the app writes them — you
set them by hand. You can skip this entire step in local development unless
you are working on invite/activation.

These expire when that admin's Slack web session ends (logout, password
change, "sign out of all sessions"). Invites then fail with
`Slack legacy token or cookie not found` or Slack `invalid_auth`, with no
env-var change. Treat them like passwords: never commit them, never paste
them into Slack/GitHub.

#### How to get the token and cookie

You need **both**, from the **same** browser session, as a **Workspace
Admin or Owner**. Use the Slack **website** (`app.slack.com`), not the
desktop app (the desktop app does not expose these in DevTools).

1. In Chrome (or another Chromium browser), log into the community Slack
   workspace as an admin.
2. Open DevTools (`Cmd+Option+I` on Mac, `F12` on Windows) → **Network**.
3. Check **Preserve log**. Filter by `slack.com/api` (or just `api`).
4. Click around in Slack so requests fire (open a channel, load the home
   tab, etc.).
5. Click any `POST` to `https://slack.com/api/...`.
6. **Token:** in **Payload** / **Form Data** / **Request**, find `token`.
   It must start with `xoxc-`. Copy the whole value.
7. **Cookie:** DevTools → **Application** → **Cookies** →
   `https://app.slack.com` (or `https://<workspace>.slack.com`). Find the
   cookie named `d`. Its value starts with `xoxd-`. Copy the value.

The Redis cookie value is sent as the entire `Cookie` header, so it must
include the cookie **name**:

```
d=xoxd-...your value...
```

If Slack still returns `invalid_auth` / `not_authed`, also include the
`d-s` cookie from the same list:

```
d=xoxd-...; d-s=...
```

Token and cookie must be a pair from one session. If you log in again,
re-copy **both**.

#### How to set them in Redis

Local Redis is the `oyster-redis` Docker container (`REDIS_URL=redis://localhost:6380`).
From the repo root, with `bun dx:up` already running:

```sh
docker exec oyster-redis redis-cli SET slack:legacy_token "xoxc-..."
docker exec oyster-redis redis-cli SET slack:legacy_cookie "d=xoxd-..."
```

Paste the real `xoxc-` token and `d=xoxd-...` cookie inside the quotes. Both
are `SET` — `GET` is only for checking afterwards.

**Production** is Railway-managed Redis. Use the Redis URL from the
Railway dashboard (the `REDIS_URL` on the `api` service):

```sh
redis-cli -u "$REDIS_URL" SET slack:legacy_token "xoxc-..."
redis-cli -u "$REDIS_URL" SET slack:legacy_cookie "d=xoxd-..."
```

Do not set a TTL — the code does not refresh these keys. Overwrite them
with a fresh pair whenever the session dies.

#### Verify

```sh
# local
docker exec oyster-redis redis-cli GET slack:legacy_token
docker exec oyster-redis redis-cli GET slack:legacy_cookie

# production
redis-cli -u "$REDIS_URL" GET slack:legacy_token
redis-cli -u "$REDIS_URL" GET slack:legacy_cookie
```

You should see `xoxc-` and `d=xoxd-` respectively. Then trigger an invite
(or a deactivate) and confirm the job succeeds.

References already in the code:

- [users.admin.invite](https://github.com/ErikKalkoken/slackApiDoc/blob/master/users.admin.invite.md)
- [How xoxc tokens work with the `d` cookie](https://stackoverflow.com/questions/62759949/accessing-slack-api-with-chrome-authentication-token-xoxc/62777057#62777057)


### 11. Feature flags

Even with valid Slack tokens, outbound messages are a silent no-op unless
these Postgres flags exist and are **enabled** (Admin Dashboard → Feature
Flags, owner role). A missing row counts as off. Seed data does not create
them.

| Name | What it gates |
|---|---|
| `send_slack_messages` | All `chat.postMessage` / `chat.postEphemeral` (bot replies, feed, birthdays, internal notifications) |
| `slack_emoji_updates` | Posts to `SLACK_EMOJI_CHANNEL_ID` when a custom emoji is added |

`chatbot` is listed in the TypeScript flag-name union but is **not** checked
anywhere — Ask AI / Slack DMs are not turned off by that flag. Replies still
need `send_slack_messages` on, or the bot "answers" without posting.

Full flag list (including `family_application`, `points_page`, and unused
names): [`feature-flags.md`](./feature-flags.md).

### 12. Env files

In `apps/api/.env`:

```
INTERNAL_SLACK_BOT_TOKEN
INTERNAL_SLACK_NOTIFICATIONS_CHANNEL_ID
SLACK_ADMIN_TOKEN
SLACK_BIRTHDATE_FIELD_ID
SLACK_BIRTHDAYS_CHANNEL_ID
SLACK_BOT_TOKEN
SLACK_CLIENT_ID
SLACK_CLIENT_SECRET
SLACK_EMOJI_CHANNEL_ID
SLACK_FEED_CHANNEL_ID
SLACK_MEMBER_DIRECTORY_FIELD_ID
SLACK_SIGNING_SECRET
```

In `apps/member-profile/.env`:

```
SLACK_ANNOUNCEMENTS_CHANNEL_ID
SLACK_BOT_TOKEN
SLACK_CLIENT_ID
SLACK_FEED_CHANNEL_ID
SLACK_TEAM_ID
```

All of these are optional in development (`ENVIRONMENT=development`). Only
set the ones for the Slack feature you are actually testing. In production
they are required (see `apps/api/src/shared/env.ts`).
