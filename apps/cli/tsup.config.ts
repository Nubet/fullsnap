import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  clean: true,
  noExternal: [/@norbert-fila\/.*/],
  external: ['playwright', 'zod', 'commander', 'ora', 'cli-table3', 'picocolors', 'prompts']
});
