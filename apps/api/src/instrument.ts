import * as Sentry from '@sentry/bun';

import { ENV } from './shared/env';

Sentry.init({
  dsn: ENV.SENTRY_DSN,
  enabled: ENV.ENVIRONMENT === 'production',
  environment: ENV.ENVIRONMENT,
  tracesSampleRate: 0.25,
});
