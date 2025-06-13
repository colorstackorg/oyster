# How to Enable Integrations

## Context

We have integrations with the following platforms:

- Airmeet (Virtual Events)
- Airtable (CRM)
- Cloudflare R2 (Object Storage)
- Crunchbase (Company Database)
- Google (Authentication)
- Mailchimp (Email Marketing)
- Pinecone (Vector Database)
- Sentry (Error Monitoring)
- Slack (Community Home, Authentication)
- SwagUp (Swag Packs)

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

To enable the **Slack** integration:

1.
2. In `/api/.env`, set the following variables:
   ```
   SLACK_ANNOUNCEMENTS_CHANNEL_ID
   SLACK_ADMIN_TOKEN
   SLACK_BIRTHDAYS_CHANNEL_ID
   SLACK_BOT_TOKEN
   SLACK_CLIENT_ID
   SLACK_CLIENT_SECRET
   SLACK_INTRODUCTIONS_CHANNEL_ID
   SLACK_SIGNING_SECRET
   ```
3. In `/member-profile/.env`, set the following variables:
   ```
   SLACK_CLIENT_ID
   SLACK_TEAM_ID
   ```
