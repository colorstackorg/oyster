import * as Sentry from '@sentry/remix';
import { startTransition, StrictMode, useEffect } from 'react';
import { hydrateRoot } from 'react-dom/client';
import { useLocation, useMatches } from 'react-router';
import { HydratedRouter } from 'react-router/dom';

Sentry.init({
  dsn: window.env.SENTRY_DSN,
  enabled: window.env.ENVIRONMENT !== 'development',
  environment: window.env.ENVIRONMENT,
  tracesSampleRate: 0.25,
  integrations: [
    new Sentry.BrowserTracing({
      routingInstrumentation: Sentry.remixRouterInstrumentation(
        useEffect,
        useLocation,
        useMatches
      ),
    }),
  ],
});

startTransition(() => {
  hydrateRoot(
    document,
    <StrictMode>
      <HydratedRouter />
    </StrictMode>
  );
});
