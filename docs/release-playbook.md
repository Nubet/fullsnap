# Release Playbook

Run these commands from the repository root.

`release:version` targets the npm package in `apps/cli`.

## Patch

For `v0.1.5` -> `v0.1.6`:

```bash
pnpm release:version patch
pnpm release:tag
git push
git push --tags
```

## Minor

For `v0.1.5` -> `v0.2.0`:

```bash
pnpm release:version minor
pnpm release:tag
git push
git push --tags
```

## Major

For `v0.1.5` -> `v1.0.0`:

```bash
pnpm release:version major
pnpm release:tag
git push
git push --tags
```
