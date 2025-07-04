import * as Sentry from '@sentry/react-router';

/* eslint-disable no-undef */
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  enabled: process.env.ENVIRONMENT !== 'development',
  environment: process.env.ENVIRONMENT,
  tracesSampleRate: 0.25,
});
