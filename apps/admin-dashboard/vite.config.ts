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
      sourcemaps: { filesToDeleteAfterUpload: ['**/*.map'] },

      ...(process.env.RAILWAY_GIT_COMMIT_SHA && {
        release: {
          name: `admin-dashboard@${process.env.RAILWAY_GIT_COMMIT_SHA}`,
        },
      }),
    }),
  ],
  build: { sourcemap: true },
  server: { port: 3001 },
});
