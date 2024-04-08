import { RemixBrowser, useLocation, useMatches } from '@remix-run/react';
import * as Sentry from '@sentry/remix';
import { startTransition, StrictMode, useEffect } from 'react';
import { hydrateRoot } from 'react-dom/client';

Sentry.init({
  dsn: window.env.SENTRY_DSN,
  enabled: window.env.ENVIRONMENT !== 'development',
  environment: window.env.ENVIRONMENT,
  replaysSessionSampleRate: 0.0,
  replaysOnErrorSampleRate: 1.0,
  tracesSampleRate: 0.25,
  integrations: [
    new Sentry.BrowserTracing({
      routingInstrumentation: Sentry.remixRouterInstrumentation(
        useEffect,
        useLocation,
        useMatches
      ),
    }),
    new Sentry.Replay({
      blockAllMedia: false,
      maskAllInputs: true,
      maskAllText: false,
    }),
  ],
});

startTransition(() => {
  hydrateRoot(
    document,
    <StrictMode>
      <RemixBrowser />
    </StrictMode>
  );
});
