import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const { version } = JSON.parse(readFileSync('apps/cli/package.json', 'utf8'));
const tag = `v${version}`;

try {
  execFileSync('git', ['rev-parse', '--verify', `refs/tags/${tag}`], { stdio: 'ignore' });
  console.error(`Git tag ${tag} already exists.`);
  process.exit(1);
} catch {
  execFileSync('git', ['tag', tag], { stdio: 'inherit' });
  console.log(`Created Git tag ${tag}.`);
}
