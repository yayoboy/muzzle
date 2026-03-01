# YAY-92 Diagnostics Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a `[i]` button to the top bar that opens a dropdown showing hostname, IP, RAM, uptime, and CPU info fetched from a new `/api/diagnostics` endpoint.

**Architecture:** New JWT-protected `GET /api/diagnostics` route uses Node.js `os` module (no new deps). Frontend has a new `DiagnosticsDropdown.tsx` component triggered from `SessionManager.tsx`. Data fetched once on open via `useQuery`.

**Tech Stack:** Node.js `os` module, Express, React Query (`@tanstack/react-query`), TypeScript, Tailwind CSS.

---

## Task 1: Shared type + backend route + register in app.ts

**Files:**
- Modify: `packages/shared/src/types.ts`
- Create: `apps/server/src/routes/diagnostics.ts`
- Modify: `apps/server/src/app.ts`
- Test: `tests/server/diagnostics.test.ts`

### Step 1: Write the failing test

Create `tests/server/diagnostics.test.ts`:

```ts
import request = require('supertest');
import { createApp } from '../../apps/server/src/app';
import { generateToken } from '../../apps/server/src/services/auth';

beforeAll(() => {
  process.env.JWT_SECRET = 'test-secret-diagnostics';
});

test('GET /api/diagnostics returns system info', async () => {
  const app = createApp();
  const { token } = generateToken();
  const res = await request(app)
    .get('/api/diagnostics')
    .set('Authorization', `Bearer ${token}`);
  expect(res.status).toBe(200);
  expect(res.body).toMatchObject({
    hostname: expect.any(String),
    ip: expect.any(String),
    ram: {
      used: expect.any(Number),
      total: expect.any(Number),
    },
    uptime: expect.any(Number),
    cpus: {
      count: expect.any(Number),
      model: expect.any(String),
    },
  });
});

test('GET /api/diagnostics returns 401 without token', async () => {
  const app = createApp();
  const res = await request(app).get('/api/diagnostics');
  expect(res.status).toBe(401);
});
```

### Step 2: Run test to verify it fails

```bash
cd /Users/yayoboy/Desktop/GitHub/muzzle && npx jest tests/server/diagnostics.test.ts --no-coverage 2>&1
```

Expected: FAIL — route doesn't exist yet, returns 404.

### Step 3: Add `DiagnosticsResponse` to shared types

In `packages/shared/src/types.ts`, add after the last interface:

```ts
export interface DiagnosticsResponse {
  hostname: string;
  ip: string;
  ram: { used: number; total: number };
  uptime: number;
  cpus: { count: number; model: string };
}
```

### Step 4: Create `apps/server/src/routes/diagnostics.ts`

```ts
import { Router } from 'express';
import os from 'os';
import { authMiddleware } from '../middleware/auth';
import type { DiagnosticsResponse } from '@muzzle/shared';

export const diagnosticsRouter = Router();

diagnosticsRouter.use(authMiddleware);

diagnosticsRouter.get('/', (_req, res) => {
  const ifaces = os.networkInterfaces();
  let ip = 'unknown';
  for (const iface of Object.values(ifaces)) {
    for (const addr of iface ?? []) {
      if (addr.family === 'IPv4' && !addr.internal) {
        ip = addr.address;
        break;
      }
    }
    if (ip !== 'unknown') break;
  }

  const totalMb = os.totalmem() / 1024 / 1024;
  const freeMb = os.freemem() / 1024 / 1024;
  const cpus = os.cpus();

  const body: DiagnosticsResponse = {
    hostname: os.hostname(),
    ip,
    ram: { used: Math.round(totalMb - freeMb), total: Math.round(totalMb) },
    uptime: Math.floor(os.uptime()),
    cpus: { count: cpus.length, model: cpus[0]?.model ?? 'unknown' },
  };

  res.json(body);
});
```

### Step 5: Register in `apps/server/src/app.ts`

Add import and route after the `commandsRouter` line.

Current imports block (top of file):
```ts
import { authRouter } from './routes/auth';
import { sessionsRouter } from './routes/sessions';
import { commandsRouter } from './routes/commands';
```

Add:
```ts
import { diagnosticsRouter } from './routes/diagnostics';
```

Current route registration:
```ts
  app.use('/api/commands', commandsRouter);
```

Add after it:
```ts
  app.use('/api/diagnostics', diagnosticsRouter);
```

### Step 6: Run test to verify it passes

```bash
cd /Users/yayoboy/Desktop/GitHub/muzzle && npx jest tests/server/diagnostics.test.ts --no-coverage 2>&1
```

Expected: 2 tests PASS.

### Step 7: Type-check

```bash
cd /Users/yayoboy/Desktop/GitHub/muzzle/apps/server && npx tsc --noEmit 2>&1
```

Expected: no errors.

### Step 8: Commit

```bash
cd /Users/yayoboy/Desktop/GitHub/muzzle
git add packages/shared/src/types.ts apps/server/src/routes/diagnostics.ts apps/server/src/app.ts tests/server/diagnostics.test.ts
git commit -m "feat(yay-92): add GET /api/diagnostics endpoint"
```

---

## Task 2: Frontend API method + DiagnosticsDropdown component + SessionManager wiring

**Files:**
- Modify: `apps/web/src/lib/api.ts`
- Create: `apps/web/src/components/DiagnosticsDropdown.tsx`
- Modify: `apps/web/src/components/SessionManager.tsx`

### Step 1: Add `getDiagnostics()` to `apps/web/src/lib/api.ts`

The current last method is:
```ts
  async getCommands(){return (await this.request('/api/commands')).json(); }
```

Add after it (before the closing `}`):
```ts
  async getDiagnostics(){return (await this.request('/api/diagnostics')).json(); }
```

### Step 2: Create `apps/web/src/components/DiagnosticsDropdown.tsx`

```tsx
'use client';
import { useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { DiagnosticsResponse } from '@muzzle/shared';

interface Props {
  onClose: () => void;
}

function formatUptime(seconds: number): string {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const parts: string[] = [];
  if (d > 0) parts.push(`${d}d`);
  if (h > 0) parts.push(`${h}h`);
  parts.push(`${m}m`);
  return parts.join(' ');
}

function formatRam(mb: number): string {
  return mb >= 1024 ? `${(mb / 1024).toFixed(1)} GB` : `${mb} MB`;
}

export function DiagnosticsDropdown({ onClose }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  const { data, isLoading } = useQuery<DiagnosticsResponse>({
    queryKey: ['diagnostics'],
    queryFn: () => api.getDiagnostics(),
    staleTime: 30_000,
  });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onClick);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onClick);
    };
  }, [onClose]);

  return (
    <div
      ref={ref}
      className="absolute right-0 top-full mt-1 z-50 bg-muzzle-surface border border-muzzle-border text-xs text-muzzle-text min-w-[240px]"
    >
      {isLoading ? (
        <div className="px-4 py-3 text-muzzle-muted animate-pulse">loading...</div>
      ) : data ? (
        <table className="w-full">
          <tbody>
            {[
              ['hostname', data.hostname],
              ['ip', data.ip],
              ['ram', `${formatRam(data.ram.used)} / ${formatRam(data.ram.total)}`],
              ['uptime', formatUptime(data.uptime)],
              ['cpu', `${data.cpus.count}× ${data.cpus.model}`],
            ].map(([label, value]) => (
              <tr key={label} className="border-b border-muzzle-border last:border-0">
                <td className="px-4 py-1.5 text-muzzle-muted w-20 select-none">{label}</td>
                <td className="px-4 py-1.5 text-muzzle-text font-mono truncate max-w-[160px]">{value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div className="px-4 py-3 text-red-400">failed to load</div>
      )}
    </div>
  );
}
```

### Step 3: Wire into `apps/web/src/components/SessionManager.tsx`

**Add import** at the top (after existing imports):
```ts
import { DiagnosticsDropdown } from './DiagnosticsDropdown';
```

**Add state** inside the component function (after `const queryClient = useQueryClient();`):
```ts
const [showDiagnostics, setShowDiagnostics] = useState(false);
```

**Add `useState` to the React import** — current first line is:
```ts
'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
```

Add after it:
```ts
import { useState } from 'react';
```

**Add the `[i]` button and dropdown** — find the "New session" div block:

```tsx
      {/* New session */}
      <div className="flex items-center px-2 border-l border-muzzle-border flex-shrink-0">
        <button
          onClick={() => createMutation.mutate()}
          disabled={createMutation.isPending}
          className="px-3 py-1 text-muzzle-muted hover:text-muzzle-accent text-xs transition-colors disabled:opacity-30"
          title="New session"
        >
          {createMutation.isPending ? '...' : '[+]'}
        </button>
      </div>
```

Replace with:

```tsx
      {/* Diagnostics */}
      <div className="relative flex items-center px-2 border-l border-muzzle-border flex-shrink-0">
        <button
          onClick={() => setShowDiagnostics(v => !v)}
          className={`px-3 py-1 text-xs transition-colors ${showDiagnostics ? 'text-muzzle-accent' : 'text-muzzle-muted hover:text-muzzle-accent'}`}
          title="System info"
        >
          [i]
        </button>
        {showDiagnostics && <DiagnosticsDropdown onClose={() => setShowDiagnostics(false)} />}
      </div>

      {/* New session */}
      <div className="flex items-center px-2 border-l border-muzzle-border flex-shrink-0">
        <button
          onClick={() => createMutation.mutate()}
          disabled={createMutation.isPending}
          className="px-3 py-1 text-muzzle-muted hover:text-muzzle-accent text-xs transition-colors disabled:opacity-30"
          title="New session"
        >
          {createMutation.isPending ? '...' : '[+]'}
        </button>
      </div>
```

### Step 4: Type-check web app

```bash
cd /Users/yayoboy/Desktop/GitHub/muzzle/apps/web && npx tsc --noEmit 2>&1
```

Expected: no errors.

### Step 5: Commit

```bash
cd /Users/yayoboy/Desktop/GitHub/muzzle
git add apps/web/src/lib/api.ts apps/web/src/components/DiagnosticsDropdown.tsx apps/web/src/components/SessionManager.tsx
git commit -m "feat(yay-92): add diagnostics dropdown to session manager"
```

---

## Task 3: Mark YAY-92 as Done on Linear

Mark https://linear.app/yayoboy/issue/YAY-92 as Done.
