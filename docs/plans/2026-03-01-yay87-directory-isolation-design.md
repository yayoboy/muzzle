# YAY-87 Directory Isolation — Design

## Problem

tmux sessions created by Muzzle inherit the server process's CWD arbitrarily. There is no guarantee sessions start in a meaningful directory. The desired behavior (matching CLI tools like Claude Code or opencode) is: when muzzle is started in a directory, all sessions open in that directory.

## Approach chosen: `process.cwd()` at server start

Capture the server process's working directory at module initialization. Pass it as the tmux session start directory via `tmux new-session -c <dir>`. No configuration required — the launch directory is implicit.

## Components modified

| File | Change |
|---|---|
| `apps/server/src/services/tmux.ts` | Add `startDir: string` param to `createTmuxSession`, pass `-c startDir` to tmux |
| `apps/server/src/services/sessions.ts` | Add `const WORKDIR = process.cwd()` at module init, pass to `createTmuxSession` |

## Behavior

- `cd /projects/myapp && muzzle start` → all sessions open in `/projects/myapp`
- No frontend changes, no API changes, no env vars
- Users can still `cd` freely inside the terminal (no hard sandboxing)

## Out of scope

- Per-session custom directory (YAGNI)
- OS-level filesystem sandboxing (chroot/container)
- Env var override (`MUZZLE_WORKDIR`)
