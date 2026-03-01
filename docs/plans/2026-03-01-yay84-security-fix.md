# YAY-84 Security Fix Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Chiudere tre lacune di sicurezza: ttyd esposto su tutte le interfacce, CORS aperto a tutti, variabili d'ambiente critiche senza fail-fast.

**Architecture:** Quattro modifiche indipendenti su file esistenti + un nuovo file `.env.example`. Nessuna nuova dipendenza. Ogni fix è atomico e committabile separatamente.

**Tech Stack:** Express 4, TypeScript 5, `cors` npm package, `express-rate-limit` (già presente), ttyd CLI.

---

## Task 1: ttyd — bind a 127.0.0.1

**Files:**
- Modify: `apps/server/src/services/ttyd.ts:5`

**Contesto:** `startTtyd` spawna ttyd senza specificare `--interface`, quindi ttyd si binda su `0.0.0.0` (tutte le interfacce). Chiunque sulla LAN o Tailscale può connettersi direttamente ai port 7680+ senza passare per l'auth JWT.

**Stato attuale del file** (`apps/server/src/services/ttyd.ts`):
```ts
import { spawn, ChildProcess } from 'child_process';

export function startTtyd(sessionName: string, port: number): Promise<ChildProcess> {
  return new Promise((resolve, reject) => {
    const ttyd = spawn('ttyd', ['--port', port.toString(), '--writable', 'tmux', 'attach', '-t', sessionName]);

    ttyd.on('error', reject);

    setTimeout(() => {
      resolve(ttyd);
    }, 200);
  });
}
```

**Step 1: Modificare l'array argomenti per aggiungere `--interface 127.0.0.1`**

```ts
import { spawn, ChildProcess } from 'child_process';

export function startTtyd(sessionName: string, port: number): Promise<ChildProcess> {
  return new Promise((resolve, reject) => {
    const ttyd = spawn('ttyd', [
      '--port', port.toString(),
      '--writable',
      '--interface', '127.0.0.1',
      'tmux', 'attach', '-t', sessionName,
    ]);

    ttyd.on('error', reject);

    setTimeout(() => {
      resolve(ttyd);
    }, 200);
  });
}
```

**Step 2: Verificare type-check**

```bash
cd /Users/yayoboy/Desktop/GitHub/muzzle/apps/server && npx tsc --noEmit
```

Expected: nessun errore.

**Step 3: Commit**

```bash
cd /Users/yayoboy/Desktop/GitHub/muzzle
git add apps/server/src/services/ttyd.ts
git commit -m "fix(yay-84): bind ttyd to 127.0.0.1 to prevent LAN exposure"
```

---

## Task 2: CORS — restringere alle origini note

**Files:**
- Modify: `apps/server/src/app.ts:1-35`

**Contesto:** `cors()` senza argomenti accetta richieste da qualunque origine (`*`). Va sostituito con una config esplicita. `CORS_ORIGIN` nell'`.env` permette di aggiungere origini Tailscale (comma-separated). Default sicuro: `http://localhost:3000`.

**Stato attuale** (riga rilevante in `app.ts`):
```ts
app.use(cors());
```

**Step 1: Sostituire `cors()` con config esplicita**

Il file completo risultante deve essere:

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

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(cors({
    origin: (process.env.CORS_ORIGIN ?? 'http://localhost:3000')
      .split(',')
      .map(s => s.trim()),
    credentials: false,
  }));
  app.use(express.json());

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

**Step 2: Verificare type-check**

```bash
cd /Users/yayoboy/Desktop/GitHub/muzzle/apps/server && npx tsc --noEmit
```

Expected: nessun errore.

**Step 3: Commit**

```bash
cd /Users/yayoboy/Desktop/GitHub/muzzle
git add apps/server/src/app.ts
git commit -m "fix(yay-84): restrict CORS to configured origins, default localhost:3000"
```

---

## Task 3: Fail-fast su variabili d'ambiente mancanti

**Files:**
- Modify: `apps/server/src/index.ts`

**Contesto:** `JWT_SECRET` mancante già lancia errore (in `auth.ts`), ma solo al primo uso, non all'avvio. `MUZZLE_PASSWORD` mancante fa fallire silenziosamente tutti i login senza errori visibili. Meglio validare entrambe all'avvio, prima di fare `listen`.

**Stato attuale** (`apps/server/src/index.ts`):
```ts
import 'dotenv/config';
import { createApp } from './app';
const PORT = process.env.PORT || 3001;
createApp().listen(PORT, () => console.log(`Muzzle server running on ${PORT}`));
```

**Step 1: Aggiungere validazione env prima del listen**

```ts
import 'dotenv/config';
import { createApp } from './app';

const required = ['JWT_SECRET', 'MUZZLE_PASSWORD'] as const;
for (const key of required) {
  if (!process.env[key]) {
    console.error(`Error: ${key} environment variable is required`);
    process.exit(1);
  }
}

const PORT = process.env.PORT || 3001;
createApp().listen(PORT, () => console.log(`Muzzle server running on ${PORT}`));
```

**Step 2: Verificare type-check**

```bash
cd /Users/yayoboy/Desktop/GitHub/muzzle/apps/server && npx tsc --noEmit
```

Expected: nessun errore.

**Step 3: Smoke test — verificare che il server rifiuta di partire senza le variabili**

Temporaneamente rinominare `.env` e verificare che il processo esca con errore:

```bash
cd /Users/yayoboy/Desktop/GitHub/muzzle/apps/server
mv .env .env.bak
npx tsx src/index.ts 2>&1 | head -5
mv .env.bak .env
```

Expected output (una delle due righe):
```
Error: JWT_SECRET environment variable is required
Error: MUZZLE_PASSWORD environment variable is required
```

**Step 4: Commit**

```bash
cd /Users/yayoboy/Desktop/GitHub/muzzle
git add apps/server/src/index.ts
git commit -m "fix(yay-84): fail-fast on missing JWT_SECRET or MUZZLE_PASSWORD at startup"
```

---

## Task 4: Creare `.env.example`

**Files:**
- Create: `apps/server/.env.example`

**Contesto:** Quando Muzzle viene installato su una nuova macchina (LAN, Tailscale), l'utente non sa quali variabili configurare. `.env.example` serve come template documentato.

**Step 1: Creare il file**

```bash
# apps/server/.env.example

# Password per accedere all'interfaccia web di Muzzle.
# Cambia questo con una password sicura prima di usare l'app.
MUZZLE_PASSWORD=change-me-before-use

# Secret per firmare i JWT. Deve essere una stringa casuale lunga almeno 32 caratteri.
# Genera con: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
JWT_SECRET=replace-with-random-hex-string

# Porta su cui il server API ascolta.
PORT=3001

# Origini CORS permesse (comma-separated).
# Aggiungi l'IP Tailscale del client se accedi da un altro dispositivo.
# Esempio: http://localhost:3000,http://100.64.0.1:3000
CORS_ORIGIN=http://localhost:3000
```

**Step 2: Verificare che `.env.example` non sia nel `.gitignore`**

Il `.gitignore` radice ignora `.env` ma non `.env.example`. Verificare:

```bash
cd /Users/yayoboy/Desktop/GitHub/muzzle
git check-ignore -v apps/server/.env.example
```

Expected: nessun output (= il file non è ignorato, verrà committato).

**Step 3: Verificare che `.env` reale sia ancora ignorato**

```bash
git check-ignore -v apps/server/.env
```

Expected: output che mostra quale regola lo ignora (es. `.gitignore:4:.env`).

**Step 4: Commit**

```bash
cd /Users/yayoboy/Desktop/GitHub/muzzle
git add apps/server/.env.example
git commit -m "docs(yay-84): add .env.example with setup instructions"
```

---

## Task 5: Aggiornare Linear YAY-84 a Done

Marcare https://linear.app/yayoboy/issue/YAY-84 come Done.
