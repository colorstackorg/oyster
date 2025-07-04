import { reactRouter } from '@react-router/dev/vite';
import { defineConfig } from 'vite';
import tsconfigPaths from 'vite-tsconfig-paths';
import { sentryReactRouter } from '@sentry/react-router';

export default defineConfig((config) => {
  return {
    plugins: [
      reactRouter(),
      tsconfigPaths(),
      sentryReactRouter(
        {
          authToken: process.env.SENTRY_AUTH_TOKEN,
          org: process.env.SENTRY_ORG,
          project: process.env.SENTRY_PROJECT,
          sourceMapsUploadOptions: {
            enabled: !!process.env.SENTRY_AUTH_TOKEN,
            filesToDeleteAfterUpload: ['**/*.map'],
          },
        },
        config
      ),
    ],
    server: { port: 3001 },
  };
});
