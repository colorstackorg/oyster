import { type Config } from '@react-router/dev/config';
import { sentryOnBuildEnd } from '@sentry/react-router';

const config: Config = {
  async buildEnd({ buildManifest, reactRouterConfig, viteConfig }) {
    await sentryOnBuildEnd({
      buildManifest,
      reactRouterConfig,
      viteConfig,
    });
  },
};

export default config;
