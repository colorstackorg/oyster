import { vitePlugin as remix } from '@remix-run/dev';
import { defineConfig } from 'vite';
import tsconfigPaths from 'vite-tsconfig-paths';

declare module '@remix-run/server-runtime' {
  interface Future {
    v3_singleFetch: true;
  }
}

export default defineConfig((env) => {
  return {
    plugins: [
      remix({
        future: {
          v3_fetcherPersist: true,
          v3_lazyRouteDiscovery: true,
          v3_relativeSplatPath: true,
          v3_routeConfig: true,
          v3_singleFetch: true,
          v3_throwAbortReason: true,
        },
      }),
      tsconfigPaths(),
    ],
    server: { port: 3000 },

    // This is needed to support the top-level await for initializing feature
    // flags. We only change the target for the server build though, to avoid
    // any potential issues with browser compatibility.
    ...(env.isSsrBuild && { build: { target: 'esnext' } }),
  };
});
