import * as Sentry from '@sentry/react-router';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  enabled: process.env.ENVIRONMENT !== 'development',
  environment: process.env.ENVIRONMENT,
  tracesSampleRate: 0.25,
});
