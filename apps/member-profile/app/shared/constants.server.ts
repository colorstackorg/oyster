import { z } from 'zod';

import { Environment } from './core.ui';

const EnvironmentVariable = z.string().trim().min(1);

const BaseEnvironmentConfig = z.object({
  API_URL: EnvironmentVariable,
  CRUNCHBASE_BASIC_API_KEY: EnvironmentVariable,
  DATABASE_URL: EnvironmentVariable,
  ENVIRONMENT: z.nativeEnum(Environment),
  GITHUB_OAUTH_CLIENT_ID: EnvironmentVariable,
  GITHUB_OAUTH_CLIENT_SECRET: EnvironmentVariable,
  GOOGLE_CLIENT_ID: EnvironmentVariable,
  GOOGLE_MAPS_API_KEY: EnvironmentVariable,
  JWT_SECRET: EnvironmentVariable,
  MIXPANEL_TOKEN: EnvironmentVariable,
  REDIS_URL: EnvironmentVariable,
  SENTRY_DSN: EnvironmentVariable,
  SESSION_SECRET: EnvironmentVariable,
  SLACK_CLIENT_ID: EnvironmentVariable,
  SLACK_TEAM_ID: EnvironmentVariable,
  STUDENT_PROFILE_URL: EnvironmentVariable,
  SWAG_UP_CLIENT_ID: EnvironmentVariable,
  SWAG_UP_CLIENT_SECRET: EnvironmentVariable,
});

const EnvironmentConfig = z.discriminatedUnion('ENVIRONMENT', [
  BaseEnvironmentConfig.partial({
    CRUNCHBASE_BASIC_API_KEY: true,
    GITHUB_OAUTH_CLIENT_ID: true,
    GITHUB_OAUTH_CLIENT_SECRET: true,
    GOOGLE_CLIENT_ID: true,
    GOOGLE_MAPS_API_KEY: true,
    MIXPANEL_TOKEN: true,
    SENTRY_DSN: true,
    SLACK_CLIENT_ID: true,
    SLACK_TEAM_ID: true,
    SWAG_UP_CLIENT_ID: true,
    SWAG_UP_CLIENT_SECRET: true,
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
