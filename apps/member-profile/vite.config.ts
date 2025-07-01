import { vitePlugin as remix } from '@remix-run/dev';
import { defineConfig } from 'vite';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig((env) => {
  return {
    plugins: [remix(), tsconfigPaths()],
    server: { port: 3000 },

    // This is needed to support the top-level await for initializing feature
    // flags. We only change the target for the server build though, to avoid
    // any potential issues with browser compatibility.
    ...(env.isSsrBuild && { build: { target: 'esnext' } }),
  };
});
