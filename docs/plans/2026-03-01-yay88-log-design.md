# YAY-88 Logging — Design

## Problem

Muzzle produces no structured output. The operator running `muzzle start` has no visibility into logins, sessions, or commands. The only console output is the raw startup message and unformatted error stack traces.

## Approach chosen: custom `logger.ts` with ANSI codes (no new deps)

A single `logger.ts` module in `apps/server/src/` using ANSI escape codes for colors and formatting. Exposes event-specific functions called at the relevant points in the codebase. No new npm dependencies.

## Output format

```
⚡ muzzle  ›  port 3001  ›  /projects/myapp

[14:30:00] →  login    muzzle  127.0.0.1      ✓
[14:30:05] →  session  muzzle  "My Session"   + created
[14:30:10] →  cmd      muzzle  "My Session"   $ ls -la
[14:30:15] →  session  muzzle  "My Session"   - deleted
[14:31:00] →  login    muzzle  192.168.1.5    ✗ failed
```

Colors:
- Timestamp `[HH:MM:SS]`: dim/gray
- Arrow `→`: cyan
- Event label: bold white
- `muzzle`: yellow
- `✓` success: green
- `✗` failure: red
- `$` command prefix: dim
- `+` / `-` session markers: green / red

## Components modified

| File | Change |
|---|---|
| `apps/server/src/logger.ts` | Create — ANSI helpers + `log.startup()`, `log.login()`, `log.sessionCreated()`, `log.sessionDeleted()`, `log.command()` |
| `apps/server/src/index.ts` | Call `log.startup(port, workdir)` instead of bare `console.log` |
| `apps/server/src/routes/auth.ts` | Call `log.login(ip, true/false)` on login attempt |
| `apps/server/src/services/sessions.ts` | Call `log.sessionCreated(name)` and `log.sessionDeleted(name)` |
| `apps/server/src/services/sessions.ts` | Call `log.command(sessionName, command)` in `sendCommand` |

## Out of scope

- File-based log persistence (only stdout)
- Log levels / verbosity flags
- Structured JSON output
- Request logging for every HTTP endpoint (only meaningful events)
