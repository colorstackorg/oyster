import { config } from 'dotenv';
import tsconfigPaths from 'vite-tsconfig-paths';
import { defineConfig } from 'vitest/config';

const env = config({ path: './.env.test' }).parsed;

// If there is no ".env.test" file found, then we'll throw error, except in the
// CI environment because in CI we manually set the environment variables
// instead of using .env files.
if (!env && !process.env.CI) {
  throw new Error(
    'Please create an ".env.test" file and copy the contents from ".env.test.example" over to it.'
  );
}

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    env,
    globals: true,
    poolOptions: {
      threads: {
        // This is important because we are using a database for integration
        // tests, and we reset the database (data) before each test. If
        // ran in parallel, the tests would interfere with each other.
        // See: https://vitest.dev/config/#pooloptions-threads-singlethread
        singleThread: true,
      },
    },

    // Setup

    // The global setup file is only run once before ALL test suites.
    // See: https://vitest.dev/config/#globalsetup
    globalSetup: ['@oyster/db/test/setup.global.ts'],

    // The setup files are run before EACH test suite.
    // See: https://vitest.dev/config/#setupfiles
    setupFiles: ['@oyster/db/test/setup.ts'],

    // Mocking

    clearMocks: true,
    mockReset: true,
    restoreMocks: true,
  },
});
