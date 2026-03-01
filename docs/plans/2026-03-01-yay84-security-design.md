# YAY-84 Security Fix — Design

## Problema

Muzzle gira su LAN + Tailscale. Tre lacune di sicurezza concrete:

1. **ttyd bind su tutte le interfacce** — i port 7680+ sono accessibili da qualunque macchina in rete senza autenticazione JWT
2. **CORS aperto** — `cors()` senza config accetta richieste da qualunque origine
3. **`MUZZLE_PASSWORD` mancante non fail-fast** — se la variabile non è set, i login falliscono silenziosamente invece di bloccare l'avvio

## Approccio scelto: fix mirati (A)

Scope: 4 file modificati/creati, nessuna nuova dipendenza.

---

## Componenti

### 1. ttyd — bind a 127.0.0.1

**File:** `apps/server/src/services/ttyd.ts`

Aggiungere `--interface 127.0.0.1` agli argomenti di spawn. I port ttyd saranno raggiungibili solo dal processo locale, non dalla rete.

```ts
spawn('ttyd', [
  '--port', port.toString(),
  '--writable',
  '--interface', '127.0.0.1',
  'tmux', 'attach', '-t', sessionName
])
```

### 2. CORS ristretto

**File:** `apps/server/src/app.ts`

Sostituire `cors()` con config esplicita. L'origine è configurabile via `CORS_ORIGIN` (comma-separated per supportare più origini Tailscale):

```ts
cors({
  origin: (process.env.CORS_ORIGIN ?? 'http://localhost:3000')
    .split(',')
    .map(s => s.trim()),
  credentials: false,
})
```

### 3. Fail-fast su variabili d'ambiente mancanti

**File:** `apps/server/src/index.ts`

Validare entrambe le variabili critiche prima di avviare il server:

```ts
if (!process.env.MUZZLE_PASSWORD) {
  throw new Error('MUZZLE_PASSWORD environment variable is required');
}
if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required');
}
```

### 4. .env.example

**File:** `apps/server/.env.example`

Documentare tutte le variabili con valori di esempio e istruzioni per generare segreti sicuri.

---

## Fuori scope (YAY-86)

Rate limiting globale, body size limit, request timeout, HTTPS nativo, audit log, ttyd AuthToken.
