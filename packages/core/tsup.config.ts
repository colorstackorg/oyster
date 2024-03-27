import { defineConfig } from 'tsup';

export default defineConfig([
  {
    clean: true,
    dts: true,
    entry: ['src/api.ts'],
    format: ['cjs', 'esm'],
    outDir: 'dist',
    skipNodeModulesBundle: true,
  },
]);
