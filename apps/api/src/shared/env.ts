// Importing this file ensures that our application has all of the environment
// variables necessary to run. If any are missing, this file will throw an error
// and crash the application.

import { config } from 'dotenv';
import { z } from 'zod';

import { Environment } from '@oyster/core/api';

// Loads the .env file into `process.env`.
config();

const EnvironmentVariable = z.string().trim().min(1);

const BaseEnvironmentConfig = z.object({
  AIRMEET_ACCESS_KEY: EnvironmentVariable,
  AIRMEET_SECRET_KEY: EnvironmentVariable,
  AIRTABLE_API_KEY: EnvironmentVariable,
  AIRTABLE_EVENT_REGISTRATIONS_BASE_ID: EnvironmentVariable,
  AIRTABLE_FAMILY_BASE_ID: EnvironmentVariable,
  AIRTABLE_MEMBERS_TABLE_ID: EnvironmentVariable,
  ANTHROPIC_API_KEY: EnvironmentVariable,
  API_URL: EnvironmentVariable,
  BROWSER_WS_ENDPOINT: EnvironmentVariable,
  COHERE_API_KEY: EnvironmentVariable,
  CRUNCHBASE_BASIC_API_KEY: EnvironmentVariable,
  DATABASE_URL: EnvironmentVariable,
  ENVIRONMENT: z.nativeEnum(Environment),
  GOOGLE_CLIENT_ID: EnvironmentVariable,
  GOOGLE_CLIENT_SECRET: EnvironmentVariable,
  INTERNAL_SLACK_BOT_TOKEN: EnvironmentVariable,
  INTERNAL_SLACK_NOTIFICATIONS_CHANNEL_ID: EnvironmentVariable,
  JWT_SECRET: EnvironmentVariable,
  MAILCHIMP_API_KEY: EnvironmentVariable,
  MAILCHIMP_AUDIENCE_ID: EnvironmentVariable,
  MAILCHIMP_SERVER_PREFIX: EnvironmentVariable,
  MIXPANEL_TOKEN: EnvironmentVariable,
  OPENAI_API_KEY: EnvironmentVariable,
  PINECONE_API_KEY: EnvironmentVariable,
  PORT: z.coerce.number(),
  POSTMARK_API_TOKEN: EnvironmentVariable,
  R2_ACCESS_KEY_ID: EnvironmentVariable,
  R2_ACCOUNT_ID: EnvironmentVariable,
  R2_BUCKET_NAME: EnvironmentVariable,
  R2_SECRET_ACCESS_KEY: EnvironmentVariable,
  REDIS_URL: EnvironmentVariable,
  SENTRY_DSN: EnvironmentVariable,
  SHOPIFY_ACCESS_TOKEN: EnvironmentVariable,
  SHOPIFY_STORE_NAME: EnvironmentVariable,
  SLACK_ANNOUNCEMENTS_CHANNEL_ID: EnvironmentVariable,
  SLACK_ADMIN_TOKEN: EnvironmentVariable,
  SLACK_BIRTHDATE_FIELD_ID: EnvironmentVariable,
  SLACK_BIRTHDAYS_CHANNEL_ID: EnvironmentVariable,
  SLACK_BOT_TOKEN: EnvironmentVariable,
  SLACK_CLIENT_ID: EnvironmentVariable,
  SLACK_CLIENT_SECRET: EnvironmentVariable,
  SLACK_FEED_CHANNEL_ID: EnvironmentVariable,
  SLACK_INTRODUCTIONS_CHANNEL_ID: EnvironmentVariable,
  SLACK_SIGNING_SECRET: EnvironmentVariable,
  STUDENT_PROFILE_URL: EnvironmentVariable,
  TWILIO_ACCOUNT_SID: EnvironmentVariable,
  TWILIO_AUTH_TOKEN: EnvironmentVariable,
  TWILIO_PHONE_NUMBER: EnvironmentVariable,
});

const EnvironmentConfig = z.discriminatedUnion('ENVIRONMENT', [
  BaseEnvironmentConfig.partial({
    AIRMEET_ACCESS_KEY: true,
    AIRMEET_SECRET_KEY: true,
    AIRTABLE_API_KEY: true,
    AIRTABLE_EVENT_REGISTRATIONS_BASE_ID: true,
    AIRTABLE_FAMILY_BASE_ID: true,
    AIRTABLE_MEMBERS_TABLE_ID: true,
    ANTHROPIC_API_KEY: true,
    BROWSER_WS_ENDPOINT: true,
    COHERE_API_KEY: true,
    CRUNCHBASE_BASIC_API_KEY: true,
    GOOGLE_CLIENT_ID: true,
    GOOGLE_CLIENT_SECRET: true,
    INTERNAL_SLACK_BOT_TOKEN: true,
    INTERNAL_SLACK_NOTIFICATIONS_CHANNEL_ID: true,
    MAILCHIMP_API_KEY: true,
    MAILCHIMP_AUDIENCE_ID: true,
    MAILCHIMP_SERVER_PREFIX: true,
    MIXPANEL_TOKEN: true,
    OPENAI_API_KEY: true,
    PINECONE_API_KEY: true,
    POSTMARK_API_TOKEN: true,
    R2_ACCESS_KEY_ID: true,
    R2_ACCOUNT_ID: true,
    R2_BUCKET_NAME: true,
    R2_SECRET_ACCESS_KEY: true,
    SENTRY_DSN: true,
    SHOPIFY_ACCESS_TOKEN: true,
    SHOPIFY_STORE_NAME: true,
    SLACK_ANNOUNCEMENTS_CHANNEL_ID: true,
    SLACK_ADMIN_TOKEN: true,
    SLACK_BIRTHDATE_FIELD_ID: true,
    SLACK_BIRTHDAYS_CHANNEL_ID: true,
    SLACK_BOT_TOKEN: true,
    SLACK_CLIENT_ID: true,
    SLACK_CLIENT_SECRET: true,
    SLACK_FEED_CHANNEL_ID: true,
    SLACK_INTRODUCTIONS_CHANNEL_ID: true,
    SLACK_SIGNING_SECRET: true,
    TWILIO_ACCOUNT_SID: true,
    TWILIO_AUTH_TOKEN: true,
    TWILIO_PHONE_NUMBER: true,
  }).extend({
    ENVIRONMENT: z.literal(Environment.DEVELOPMENT),
    SMTP_HOST: EnvironmentVariable.optional(),
    SMTP_PASSWORD: EnvironmentVariable.optional(),
    SMTP_USERNAME: EnvironmentVariable.optional(),
  }),
  BaseEnvironmentConfig.extend({
    ENVIRONMENT: z.literal(Environment.PRODUCTION),
  }),
]);

// Parse the environment variables into a type-safe object - will throw an
// error if it fails.
export const ENV = EnvironmentConfig.parse(process.env);
