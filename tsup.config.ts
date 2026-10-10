import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  outDir: 'dist',
  format: ['esm', 'cjs'],
  dts: true,
  sourcemap: true,
  splitting: false,
  // Not minified: the app's bundler minifies anyway.
  minify: false,
  // tsup's treeshake pass (rollup) strips module directives, and every export needs `'use client'`
  // on the first line. scripts/check-dist.mjs fails the build when it is gone.
  treeshake: false,
  external: ['react', 'react-dom', '@bugdump/sdk'],
});
