# Feature Flags

Feature flags live in Postgres (`feature_flags`), not in env vars or a
third-party service. Toggle them in the **Admin Dashboard → Feature Flags**
(`/feature-flags`, owner role).

The **Name** field must match the snake_case string in the tables below
exactly (`send_slack_messages`, not `Send Slack Messages`). Display name and
description are UI-only.

Seed data does **not** insert these rows. A fresh local DB has none, so every
flag is off until you create it and enable it.

`isFeatureFlagEnabled`
(`packages/core/src/modules/feature-flags/queries/is-feature-flag-enabled.ts`)
returns `false` if the row is missing or `enabled` is false.

The allowed names live in
`packages/core/src/modules/feature-flags/feature-flags.types.ts`
(`FeatureFlagName`).

## Flags the code actually checks

| Name | When **on** | When **off** | Code |
|---|---|---|---|
| `send_slack_messages` | `chat.postMessage` and `chat.postEphemeral` actually send (community + internal workspaces) | Those helpers return immediately — **silent no-op**. Slack tokens can be valid and nothing posts | `packages/core/src/modules/notifications/use-cases/send-slack-notification.ts`, `send-ephemeral-slack-notification.ts` |
| `slack_emoji_updates` | New custom emoji events post to `SLACK_EMOJI_CHANNEL_ID` | Emoji-added jobs do nothing | `packages/core/src/modules/slack/use-cases/send-emoji-update.ts` |
| `family_application` | Public ColorStack application (`/apply`) is open | Applicants see "application is temporarily closed" | `apps/member-profile/app/routes/_public.apply.tsx` |
| `points_page` | "Points" appears in the member-profile sidebar | Nav link is hidden. `/points` is **not** blocked if someone hits the URL | `apps/member-profile/app/routes/_profile.tsx` |

For local Slack work, you almost always need `send_slack_messages` created and
enabled. Without it, bot replies, feed alerts, birthday posts, and internal
ops notifications will not send.

## Names in the type union that are not checked

These exist on `FeatureFlagName` but **no** `isFeatureFlagEnabled(...)` call
uses them. Creating/enabling them in the admin UI does nothing today:

| Name | Likely original intent | What actually happens |
|---|---|---|
| `chatbot` | Gate Ask AI / Slack DM chatbot | `/ask-ai` and Slack chatbot jobs always run (Slack answers still need `send_slack_messages` to post) |
| `compensation` | Gate the Offers page | Offers nav and `/offers` are always available |
| `peer_help` | Gate Peer Help | Peer Help nav and `/peer-help` are always available |

Do not assume toggling these three will hide a feature.

## How to create one locally

1. Log into the admin dashboard as an **owner**.
2. Open `/feature-flags` → **Create Flag**.
3. Set **Name** to one of the snake_case values above.
4. Leave it enabled if you want the feature on.

## Cross-references

- Slack tokens, events, and Redis session:
  [`how-to-enable-integrations.md`](./how-to-enable-integrations.md#slack)
- Architecture and admin tooling:
  [`architecture-and-environments.md`](./architecture-and-environments.md)
