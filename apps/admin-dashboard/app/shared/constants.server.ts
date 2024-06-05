import { z } from 'zod';

import { Environment } from '@/admin-dashboard.ui';

const EnvironmentVariable = z.string().trim().min(1);

const BaseEnvironmentConfig = z.object({
  ADMIN_DASHBOARD_URL: EnvironmentVariable,
  AIRTABLE_FAMILY_BASE_ID: EnvironmentVariable,
  AIRTABLE_MEMBERS_TABLE_ID: EnvironmentVariable,
  API_URL: EnvironmentVariable,
  DATABASE_URL: EnvironmentVariable,
  ENVIRONMENT: z.nativeEnum(Environment),
  GOOGLE_CLIENT_ID: EnvironmentVariable,
  JWT_SECRET: EnvironmentVariable,
  REDIS_URL: EnvironmentVariable,
  SENTRY_DSN: EnvironmentVariable,
  SESSION_SECRET: EnvironmentVariable,
});

const EnvironmentConfig = z.discriminatedUnion('ENVIRONMENT', [
  BaseEnvironmentConfig.partial({
    AIRTABLE_FAMILY_BASE_ID: true,
    AIRTABLE_MEMBERS_TABLE_ID: true,
    GOOGLE_CLIENT_ID: true,
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
