import { sentryVitePlugin } from '@sentry/vite-plugin';
import { reactRouter } from '@react-router/dev/vite';
import { defineConfig } from 'vite';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [
    reactRouter(),
    tsconfigPaths(),
    sentryVitePlugin({
      org: 'colorstack',
      project: 'admin-dashboard',
      release: { name: process.env.SENTRY_RELEASE },
      sourcemaps: { filesToDeleteAfterUpload: ['**/*.map'] },
    }),
  ],
  build: { sourcemap: true },
  server: { port: 3001 },
});
