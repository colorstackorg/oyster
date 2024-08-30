import { z } from 'zod';

import { Environment } from '@oyster/core/admin-dashboard/ui';

const EnvironmentVariable = z.string().trim().min(1);

const BaseEnvironmentConfig = z.object({
  ADMIN_DASHBOARD_URL: EnvironmentVariable,
  AIRTABLE_API_KEY: EnvironmentVariable,
  AIRTABLE_FAMILY_BASE_ID: EnvironmentVariable,
  AIRTABLE_MEMBERS_TABLE_ID: EnvironmentVariable,
  AIRTABLE_RESUME_BOOKS_BASE_ID: EnvironmentVariable,
  API_URL: EnvironmentVariable,
  DATABASE_URL: EnvironmentVariable,
  ENVIRONMENT: z.nativeEnum(Environment),
  GITHUB_TOKEN: EnvironmentVariable,
  GOOGLE_CLIENT_ID: EnvironmentVariable,
  GOOGLE_CLIENT_SECRET: EnvironmentVariable,
  GOOGLE_DRIVE_RESUME_BOOKS_FOLDER_ID: EnvironmentVariable,
  JWT_SECRET: EnvironmentVariable,
  MEMBER_PROFILE_URL: EnvironmentVariable,
  REDIS_URL: EnvironmentVariable,
  SENTRY_DSN: EnvironmentVariable,
  SESSION_SECRET: EnvironmentVariable,
});

const EnvironmentConfig = z.discriminatedUnion('ENVIRONMENT', [
  BaseEnvironmentConfig.partial({
    AIRTABLE_API_KEY: true,
    AIRTABLE_FAMILY_BASE_ID: true,
    AIRTABLE_MEMBERS_TABLE_ID: true,
    AIRTABLE_RESUME_BOOKS_BASE_ID: true,
    GITHUB_TOKEN: true,
    GOOGLE_CLIENT_ID: true,
    GOOGLE_CLIENT_SECRET: true,
    GOOGLE_DRIVE_RESUME_BOOKS_FOLDER_ID: true,
    MEMBER_PROFILE_URL: true,
    SENTRY_DSN: true,
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
