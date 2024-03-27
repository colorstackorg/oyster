import type { Environment } from './app/shared/core.ui';

declare global {
  interface Window {
    // Defines the "browser" environment variables that we are setting at
    // the root of the application.
    env: {
      ENVIRONMENT: Environment;
      SENTRY_DSN?: string;
    };
  }
}
