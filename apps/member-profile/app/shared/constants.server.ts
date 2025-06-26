import { z } from 'zod';

import { Environment } from '@oyster/core/member-profile/ui';

const EnvironmentVariable = z.string().trim().min(1);

const BaseEnvironmentConfig = z.object({
  AIRTABLE_API_KEY: EnvironmentVariable,
  AIRTABLE_FAMILY_BASE_ID: EnvironmentVariable,
  AIRTABLE_MEMBERS_TABLE_ID: EnvironmentVariable,
  ANTHROPIC_API_KEY: EnvironmentVariable,
  API_URL: EnvironmentVariable,
  APIFY_API_TOKEN: EnvironmentVariable,
  BROWSER_WS_ENDPOINT: EnvironmentVariable,
  COHERE_API_KEY: EnvironmentVariable,
  DATABASE_URL: EnvironmentVariable,
  ENVIRONMENT: z.nativeEnum(Environment),
  GITHUB_OAUTH_CLIENT_ID: EnvironmentVariable,
  GITHUB_OAUTH_CLIENT_SECRET: EnvironmentVariable,
  GOOGLE_CLIENT_ID: EnvironmentVariable,
  GOOGLE_CLIENT_SECRET: EnvironmentVariable,
  GOOGLE_MAPS_API_KEY: EnvironmentVariable,
  JWT_SECRET: EnvironmentVariable,
  MIXPANEL_TOKEN: EnvironmentVariable,
  OPENAI_API_KEY: EnvironmentVariable,
  PINECONE_API_KEY: EnvironmentVariable,
  R2_ACCESS_KEY_ID: EnvironmentVariable,
  R2_ACCOUNT_ID: EnvironmentVariable,
  R2_BUCKET_NAME: EnvironmentVariable,
  R2_PUBLIC_BUCKET_NAME: EnvironmentVariable,
  R2_SECRET_ACCESS_KEY: EnvironmentVariable,
  REDIS_URL: EnvironmentVariable,
  SENTRY_DSN: EnvironmentVariable,
  SESSION_SECRET: EnvironmentVariable,
  SLACK_ANNOUNCEMENTS_CHANNEL_ID: EnvironmentVariable,
  SLACK_BOT_TOKEN: EnvironmentVariable,
  SLACK_CLIENT_ID: EnvironmentVariable,
  SLACK_FEED_CHANNEL_ID: EnvironmentVariable,
  SLACK_TEAM_ID: EnvironmentVariable,
  STUDENT_PROFILE_URL: EnvironmentVariable,
});

const EnvironmentConfig = z.discriminatedUnion('ENVIRONMENT', [
  BaseEnvironmentConfig.partial({
    AIRTABLE_API_KEY: true,
    AIRTABLE_FAMILY_BASE_ID: true,
    AIRTABLE_MEMBERS_TABLE_ID: true,
    ANTHROPIC_API_KEY: true,
    APIFY_API_TOKEN: true,
    BROWSER_WS_ENDPOINT: true,
    COHERE_API_KEY: true,
    GITHUB_OAUTH_CLIENT_ID: true,
    GITHUB_OAUTH_CLIENT_SECRET: true,
    GOOGLE_CLIENT_ID: true,
    GOOGLE_CLIENT_SECRET: true,
    GOOGLE_MAPS_API_KEY: true,
    MIXPANEL_TOKEN: true,
    OPENAI_API_KEY: true,
    PINECONE_API_KEY: true,
    R2_ACCESS_KEY_ID: true,
    R2_ACCOUNT_ID: true,
    R2_BUCKET_NAME: true,
    R2_PUBLIC_BUCKET_NAME: true,
    R2_SECRET_ACCESS_KEY: true,
    SENTRY_DSN: true,
    SLACK_ANNOUNCEMENTS_CHANNEL_ID: true,
    SLACK_BOT_TOKEN: true,
    SLACK_CLIENT_ID: true,
    SLACK_FEED_CHANNEL_ID: true,
    SLACK_TEAM_ID: true,
  }).extend({
    ENVIRONMENT: z.literal(Environment.DEVELOPMENT),
    SMTP_HOST: EnvironmentVariable.optional(),
    SMTP_PASSWORD: EnvironmentVariable.optional(),
    SMTP_USERNAME: EnvironmentVariable.optional(),
  }),
  BaseEnvironmentConfig.extend({
    ENVIRONMENT: z.literal(Environment.PRODUCTION),
    POSTMARK_API_TOKEN: EnvironmentVariable,
  }),
]);

export const ENV = EnvironmentConfig.parse(process.env);
