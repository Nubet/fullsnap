import { defineConfig } from 'tsup';
import fs from 'node:fs';

const pkg = JSON.parse(fs.readFileSync('./package.json', 'utf8'));

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  clean: true,
  noExternal: [/@norbert-fila\/.*/],
  external: ['playwright', 'zod', 'commander', 'ora', 'cli-table3', 'picocolors', 'prompts'],
  env: {
    CLI_VERSION: pkg.version
  }
});
