import tsconfigPaths from 'vite-tsconfig-paths';
import { defineConfig } from 'vitest/config';

// When we run `vitest`, this is the first file that's loaded and thus `dotenv`
// hasn't processed any environment variables, so `process.env.DATABASE_URL` is
// empty. When we run this locally, that's expected, so we'll use the
// "colorstack-test" database. However, in our CI pipeline, we already inject
// the `DATABASE_URL` environment variable, so we'll use that instead of having
// to create a separate database (and thus connection) for testing.
const DATABASE_URL =
  process.env.DATABASE_URL || 'postgresql://localhost:5432/colorstack-test';

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    clearMocks: true,
    env: {
      DATABASE_URL,
      ENVIRONMENT: 'test',
    },
    environment: './src/infrastructure/database/vitest-environment-kysely.ts',
    globals: true,
    mockReset: true,
    restoreMocks: true,
  },
});
