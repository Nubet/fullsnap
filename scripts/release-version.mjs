import { readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const packagePath = 'apps/cli/package.json';
const bump = process.argv[2];

if (!['patch', 'minor', 'major'].includes(bump)) {
  console.error('Usage: pnpm release:version <patch|minor|major>');
  process.exit(1);
}

const packageJson = JSON.parse(readFileSync(packagePath, 'utf8'));
const previousVersion = packageJson.version;
const [major, minor, patch] = previousVersion.split('.').map(Number);
const nextVersion = bump === 'major'
  ? `${major + 1}.0.0`
  : bump === 'minor'
    ? `${major}.${minor + 1}.0`
    : `${major}.${minor}.${patch + 1}`;

packageJson.version = nextVersion;
writeFileSync(packagePath, `${JSON.stringify(packageJson, null, 2)}\n`);

execFileSync('git', [
  'commit',
  '--only',
  packagePath,
  '-m',
  `chore: release v${nextVersion}`
], { stdio: 'inherit' });

console.log(`Version bumped: ${previousVersion} -> ${nextVersion}`);
