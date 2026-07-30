import * as Sentry from '@sentry/bun';

import { ENV } from './shared/env';

Sentry.init({
  dsn: ENV.SENTRY_DSN,
  enabled: ENV.ENVIRONMENT === 'production',
  environment: ENV.ENVIRONMENT,
  tracesSampleRate: 0.25,
});

// This process runs both the HTTP server and every Bull worker, and neither of
// these used to be reported at all -- errors from background work just vanished,
// which is how the workers were able to stop consuming for weeks while the API
// kept looking perfectly healthy.

// Report but don't exit. There are deliberate fire-and-forget promises in the
// codebase, and a rejected analytics call shouldn't take the API down. The case
// we actually care about -- a worker's run loop dying -- is handled explicitly
// in `startBullWorkers`, which does exit.
process.on('unhandledRejection', (reason) => {
  console.error('Unhandled rejection!', reason);

  Sentry.captureException(reason);
});

// An uncaught exception leaves the process in genuinely unknown state, so here
// we do bail and let the platform restart us.
process.on('uncaughtException', (error) => {
  console.error('Uncaught exception! Exiting...', error);

  Sentry.captureException(error);
  Sentry.flush(2000).finally(() => process.exit(1));
});
