import { z } from 'zod';

import { Environment } from './core.ui';

const EnvironmentVariable = z.string().trim().min(1);

const BaseEnvironmentConfig = z.object({
  ADMIN_DASHBOARD_URL: EnvironmentVariable,
  API_URL: EnvironmentVariable,
  DATABASE_URL: EnvironmentVariable,
  ENVIRONMENT: z.nativeEnum(Environment),
  GOOGLE_CLIENT_ID: EnvironmentVariable,
  JWT_SECRET: EnvironmentVariable,
  POSTMARK_API_TOKEN: EnvironmentVariable,
  REDIS_URL: EnvironmentVariable,
  SENTRY_DSN: EnvironmentVariable,
  SESSION_SECRET: EnvironmentVariable,
});

const EnvironmentConfig = z.discriminatedUnion('ENVIRONMENT', [
  BaseEnvironmentConfig.partial({
    GOOGLE_CLIENT_ID: true,
    SENTRY_DSN: true,
  }).extend({
    ENVIRONMENT: z.literal(Environment.DEVELOPMENT),
  }),
  BaseEnvironmentConfig.extend({
    ENVIRONMENT: z.literal(Environment.PRODUCTION),
  }),
]);

export const ENV = EnvironmentConfig.parse(process.env);
