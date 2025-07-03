import * as Sentry from '@sentry/react-router';
import { startTransition, StrictMode } from 'react';
import { hydrateRoot } from 'react-dom/client';
import { HydratedRouter } from 'react-router/dom';

Sentry.init({
  dsn: window.env.SENTRY_DSN,
  enabled: window.env.ENVIRONMENT !== 'development',
  environment: window.env.ENVIRONMENT,
  tracesSampleRate: 0.25,
  integrations: [Sentry.reactRouterTracingIntegration()],
});

startTransition(() => {
  hydrateRoot(
    document,
    <StrictMode>
      <HydratedRouter />
    </StrictMode>
  );
});
