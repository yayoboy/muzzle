# YAY-92 Diagnostics — Design

## Problem

No visibility into host system resources from the Muzzle UI. Users have no way to check IP, RAM, or uptime without leaving the browser.

## Approach: Separate component, fetch on demand

A `[i]` button in the `SessionManager` top bar opens a `DiagnosticsDropdown` component. Data is fetched once on open via a new JWT-protected API endpoint. No polling — system info changes slowly.

## Backend

### New endpoint: `GET /api/diagnostics`

JWT-protected. Uses Node.js built-in `os` module (no new dependencies).

**Response shape:**
```json
{
  "hostname": "macbook-pro.local",
  "ip": "192.168.1.10",
  "ram": { "used": 8192, "total": 16384 },
  "uptime": 86400,
  "cpus": { "count": 8, "model": "Apple M1" }
}
```

**Fields:**
- `hostname` — `os.hostname()`
- `ip` — first non-internal IPv4 from `os.networkInterfaces()`; fallback `"unknown"`
- `ram.used` — `(os.totalmem() - os.freemem()) / 1024 / 1024` (MB)
- `ram.total` — `os.totalmem() / 1024 / 1024` (MB)
- `uptime` — `os.uptime()` (seconds)
- `cpus.count` — `os.cpus().length`
- `cpus.model` — `os.cpus()[0]?.model ?? "unknown"`

**Files:**
- Create: `apps/server/src/routes/diagnostics.ts`
- Modify: `apps/server/src/app.ts` — register `diagnosticsRouter` on `/api/diagnostics`

### Shared type

- Modify: `packages/shared/src/types.ts` — add `DiagnosticsResponse` interface

## Frontend

### `[i]` button in `SessionManager.tsx`

Added to the right side of the top bar, between session tabs and `[+]`.

```tsx
<button onClick={() => setShowDiagnostics(v => !v)} title="System info">
  [i]
</button>
```

State: `const [showDiagnostics, setShowDiagnostics] = useState(false)`

### New `DiagnosticsDropdown.tsx`

Positioned absolutely below the `[i]` button. Fetches `GET /api/diagnostics` with `useQuery` (enabled only when open). Shows a loading state, then the data table. Closes on `Escape` or click outside.

**Display format:**
```
hostname   macbook-pro.local
ip         192.168.1.10
ram        8.0 / 16.0 GB
uptime     1d 2h 3m
cpu        8× Apple M1
```

### `api.ts`

Add `getDiagnostics()` method.

## Files summary

| File | Change |
|---|---|
| `apps/server/src/routes/diagnostics.ts` | Create — GET /api/diagnostics handler |
| `apps/server/src/app.ts` | Register diagnosticsRouter |
| `packages/shared/src/types.ts` | Add DiagnosticsResponse type |
| `apps/web/src/lib/api.ts` | Add getDiagnostics() |
| `apps/web/src/components/DiagnosticsDropdown.tsx` | Create — dropdown component |
| `apps/web/src/components/SessionManager.tsx` | Add [i] button + showDiagnostics state |

## Out of scope

- Live polling / auto-refresh
- CPU usage % (requires sampling, not a snapshot)
- Disk usage
- Docker/container info
