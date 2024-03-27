import dts from 'rollup-plugin-dts';
import esbuild from 'rollup-plugin-esbuild';
import postcss from 'rollup-plugin-postcss';

/** @type {import('rollup').RollupOptions[]} */
const config = [
  {
    external: ['react'],
    input: './src/index.ts',
    output: [
      { file: './dist/index.cjs', format: 'cjs' },
      { file: './dist/index.js', format: 'esm' },
    ],
    plugins: [
      esbuild({ jsx: 'automatic' }),
      postcss({
        extensions: ['.css', '.scss'],
        extract: true,
      }),
    ],
  },
  {
    external: [/\.css$/],
    input: './src/index.ts',
    output: [{ file: './dist/index.d.ts', format: 'es' }],
    plugins: [dts()],
  },
];

export default config;
