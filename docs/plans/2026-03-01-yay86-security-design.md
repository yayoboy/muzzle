# YAY-86 Security Hardening — Design

## Problem

`app.ts` has login-only rate limiting and no body size cap or request timeout. An attacker who obtains a JWT can flood session/command endpoints or send oversized payloads without restriction.

## Already Done (not in scope)

| Item | Done via |
|---|---|
| `helmet()` security headers | YAY-84 |
| CORS restricted to configured origin | YAY-84 |
| Login rate limiting (10 req / 15 min) | YAY-84 |
| Audit log (login, session, commands) | YAY-88 |
| TTY AuthToken per session | YAY-89 |
| Input validation with Zod schemas | YAY-84 |
| HTTPS native | Out of scope — use Tailscale / nginx |

## Changes

All three changes go in `apps/server/src/app.ts`. No new files, no new dependencies.

### 1. Body size limit

```ts
app.use(express.json({ limit: '10kb' }));
```

Prevents payload bombing. Express default is 100kb; 10kb is generous for this API's largest expected body (session name + command string).

### 2. General API rate limiter

```ts
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: 'Too many requests, please try again later' },
});
app.use('/api/', apiLimiter);
```

Mounted before all routes. Login limiter (10 req/15 min) stays in place, giving login a tighter sub-limit.

### 3. Request timeout middleware

```ts
app.use((_req, res, next) => {
  res.setTimeout(30_000, () => {
    res.status(408).json({ error: 'Request timeout' });
  });
  next();
});
```

Custom Express middleware, zero new dependencies. 30 s is sufficient for tmux session creation (the slowest operation).

## Components modified

| File | Change |
|---|---|
| `apps/server/src/app.ts` | Add `apiLimiter`, body limit, timeout middleware |
