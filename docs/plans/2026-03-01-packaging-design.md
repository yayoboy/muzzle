# Packaging — Design

## Problem

The curl-pipe installer (`scripts/install.sh`) is functionally correct but the repo has 4 issues that prevent a clean distribution:

1. **Build artifacts committed** — `apps/server/dist/` (5 files) and `packages/shared/dist/` (4 files) are tracked in git. The installer builds from source, so these should not be in the repo.
2. **Incomplete `.gitignore`** — dist dirs, `.next/`, and TypeScript build info files are missing.
3. **Root `package.json` has no scripts** — no `build`, `dev`, or `test` commands at the root.
4. **No README** — no install instructions for users who find the repo.

## Changes

### 1. Untrack and gitignore build artifacts

```bash
git rm --cached \
  apps/server/dist/app.js \
  apps/server/dist/index.js \
  apps/server/dist/middleware/auth.js \
  apps/server/dist/routes/auth.js \
  apps/server/dist/services/auth.js \
  packages/shared/dist/index.js \
  packages/shared/dist/index.d.ts \
  packages/shared/dist/types.js \
  packages/shared/dist/types.d.ts
```

Add to `.gitignore`:
```
apps/server/dist/
packages/shared/dist/
apps/web/.next/
apps/web/next-env.d.ts
apps/web/tsconfig.tsbuildinfo
```

### 2. Root `package.json` scripts + workspaces

```json
{
  "workspaces": ["apps/*", "packages/*"],
  "scripts": {
    "build": "turbo run build",
    "dev":   "turbo run dev",
    "test":  "jest"
  }
}
```

### 3. README.md

Essential sections:
- What is Muzzle (1 sentence)
- Prerequisites (Node.js, tmux, ttyd)
- Install (one-liner curl command)
- First run (set password, `muzzle start`)
- CLI reference (start/stop/status/logs/service)
- Configuration (`.env` fields)

## Out of scope

- Changing the installer logic (already correct)
- npm publish
- Docker
- Changelog / versioning
