# YAY-86 Security Hardening Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add body size limit, general API rate limiter, and request timeout to `app.ts`.

**Architecture:** All three changes are middleware additions in `apps/server/src/app.ts`. No new files, no new dependencies (`express-rate-limit` is already installed). One test file covers the observable behavior.

**Tech Stack:** Express, express-rate-limit, supertest, Jest/ts-jest.

---

## Task 1: Add body size limit, API rate limiter, and timeout middleware

**Files:**
- Modify: `apps/server/src/app.ts`
- Create: `tests/server/security.test.ts`

### Step 1: Write the failing test for body size limit

Create `tests/server/security.test.ts`:

```ts
import request = require('supertest');
import { createApp } from '../../apps/server/src/app';

const app = createApp();

test('POST with body > 10kb returns 413', async () => {
  const bigBody = { name: 'x'.repeat(11 * 1024) }; // 11 KB
  const res = await request(app)
    .post('/api/sessions')
    .set('Authorization', 'Bearer dummy-token')
    .send(bigBody);
  expect(res.status).toBe(413);
});
```

### Step 2: Run test to verify it fails

```bash
cd /Users/yayoboy/Desktop/GitHub/muzzle && npx jest tests/server/security.test.ts --no-coverage 2>&1
```

Expected: FAIL — currently Express accepts the large body and returns 401 (no auth), not 413.

### Step 3: Implement the 3 hardening changes in `app.ts`

Current `app.ts` (relevant section):
```ts
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Too many login attempts, please try again after 15 minutes' },
});

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(cors({ ... }));
  app.use(express.json());

  app.use('/api/auth/login', loginLimiter);
  app.use('/api/auth', authRouter);
  app.use('/api/sessions', sessionsRouter);
  app.use('/api/commands', commandsRouter);
  ...
}
```

Replace with this full updated `app.ts`:

```ts
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { authRouter } from './routes/auth';
import { sessionsRouter } from './routes/sessions';
import { commandsRouter } from './routes/commands';
import { errorHandler } from './middleware/error';

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Too many login attempts, please try again after 15 minutes' },
});

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: 'Too many requests, please try again later' },
});

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(cors({
    origin: (process.env.CORS_ORIGIN ?? 'http://localhost:3000')
      .split(',')
      .map(s => s.trim()),
    credentials: false,
  }));
  app.use(express.json({ limit: '10kb' }));

  // Timeout: 30 s for all requests
  app.use((_req, res, next) => {
    res.setTimeout(30_000, () => {
      res.status(408).json({ error: 'Request timeout' });
    });
    next();
  });

  app.use('/api/', apiLimiter);
  app.use('/api/auth/login', loginLimiter);
  app.use('/api/auth', authRouter);
  app.use('/api/sessions', sessionsRouter);
  app.use('/api/commands', commandsRouter);

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  app.use(errorHandler);

  return app;
}
```

### Step 4: Run test to verify it passes

```bash
cd /Users/yayoboy/Desktop/GitHub/muzzle && npx jest tests/server/security.test.ts --no-coverage 2>&1
```

Expected: PASS — 413 is returned for oversized body.

### Step 5: Also verify existing auth test still passes

```bash
cd /Users/yayoboy/Desktop/GitHub/muzzle && npx jest tests/server/auth.test.ts --no-coverage 2>&1
```

Expected: PASS.

### Step 6: Type-check

```bash
cd /Users/yayoboy/Desktop/GitHub/muzzle/apps/server && npx tsc --noEmit 2>&1
```

Expected: no errors.

### Step 7: Commit

```bash
cd /Users/yayoboy/Desktop/GitHub/muzzle
git add apps/server/src/app.ts tests/server/security.test.ts
git commit -m "feat(yay-86): add body size limit, API rate limiter, and request timeout"
```

---

## Task 2: Mark YAY-86 as Done on Linear

Mark https://linear.app/yayoboy/issue/YAY-86 as Done.
