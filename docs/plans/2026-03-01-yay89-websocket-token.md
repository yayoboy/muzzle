# YAY-89 WebSocket Token Authentication — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Proteggere il WebSocket ttyd con un token per-sessione: senza il token (ottenibile solo con JWT valido) nessuno può aprire una sessione terminale.

**Architecture:** `--credential muzzle:<rawToken>` su ogni processo ttyd. Express genera il token alla creazione sessione, lo restituisce via endpoint JWT-protetto. Il frontend costruisce il WebSocket URL con URL credentials (`ws://muzzle:<token>@host/ws`) e invia `{ AuthToken: btoa('muzzle:' + token) }` nel primo messaggio.

**Tech Stack:** Node.js `crypto`, ttyd `--credential`, Browser WebSocket URL credentials.

---

## Task 1: `services/ttyd.ts` — aggiungere parametro `credential`

**Files:**
- Modify: `apps/server/src/services/ttyd.ts`

**Stato attuale del file:**
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

**Step 1: Sostituire il contenuto con:**

```ts
import { spawn, ChildProcess } from 'child_process';

export function startTtyd(sessionName: string, port: number, credential: string): Promise<ChildProcess> {
  return new Promise((resolve, reject) => {
    const ttyd = spawn('ttyd', [
      '--port', port.toString(),
      '--writable',
      '--interface', '127.0.0.1',
      '--credential', credential,
      'tmux', 'attach', '-t', sessionName,
    ]);

    ttyd.on('error', reject);

    setTimeout(() => {
      resolve(ttyd);
    }, 200);
  });
}
```

**Step 2: Type-check**

```bash
cd /Users/yayoboy/Desktop/GitHub/muzzle/apps/server && npx tsc --noEmit
```

Expected: errore in `sessions.ts` perché `startTtyd` ora richiede 3 argomenti (corretto, lo fix nel Task 2).

**Step 3: Commit**

```bash
cd /Users/yayoboy/Desktop/GitHub/muzzle
git add apps/server/src/services/ttyd.ts
git commit -m "feat(yay-89): startTtyd accepts credential parameter"
```

---

## Task 2: `services/sessions.ts` — generare e gestire il token

**Files:**
- Modify: `apps/server/src/services/sessions.ts`

**Contesto:**
- `SESSIONS` map: `Map<string, Session>` — dati sessione
- `TTYD_PROCESSES` map: `Map<string, ChildProcess>` — processi ttyd
- Serve una nuova `TOKENS` map: `Map<string, string>` — rawToken per sessione
- `randomBytes(32).toString('hex')` genera 64 caratteri hex casuali
- `credential` = `'muzzle:' + rawToken` (passato a ttyd)
- `rawToken` (solo il token, non il prefisso `muzzle:`) viene esposto al frontend

**Step 1: Aggiungere import crypto e la TOKENS map**

All'inizio del file, dopo gli import esistenti, aggiungere:
```ts
import { randomBytes } from 'crypto';
```

Dopo la riga `const PORT_START = 7680;`, aggiungere:
```ts
const TOKENS: Map<string, string> = new Map();
```

**Step 2: Aggiornare `createSession` — generare token e passarlo a ttyd**

Sostituire la chiamata a `startTtyd` e le righe successive:

```ts
// PRIMA:
await createTmuxSession(tmuxSession);
const ttydProcess = await startTtyd(tmuxSession, port);

// DOPO:
const rawToken = randomBytes(32).toString('hex');
const credential = `muzzle:${rawToken}`;
await createTmuxSession(tmuxSession);
const ttydProcess = await startTtyd(tmuxSession, port, credential);
```

Dopo `TTYD_PROCESSES.set(id, ttydProcess);`, aggiungere:
```ts
TOKENS.set(id, rawToken);
```

**Step 3: Aggiornare `deleteSession` — rimuovere il token**

Dopo `SESSIONS.delete(id);`, aggiungere:
```ts
TOKENS.delete(id);
```

**Step 4: Aggiornare `getSessionAttachUrl` — restituire il token**

```ts
// PRIMA:
static async getSessionAttachUrl(id: string): Promise<{ url: string }> {
  const session = SESSIONS.get(id);
  if (!session) throw new Error('Session not found');
  return {
    url: `http://localhost:${session.ttydPort}`
  };
}

// DOPO:
static async getSessionAttachUrl(id: string): Promise<{ url: string; token: string }> {
  const session = SESSIONS.get(id);
  if (!session) throw new Error('Session not found');
  return {
    url: `http://127.0.0.1:${session.ttydPort}`,
    token: TOKENS.get(id) ?? '',
  };
}
```

Nota: cambiato anche `localhost` in `127.0.0.1` per coerenza con il binding di ttyd.

**Step 5: Type-check**

```bash
cd /Users/yayoboy/Desktop/GitHub/muzzle/apps/server && npx tsc --noEmit
```

Expected: nessun errore.

**Step 6: Commit**

```bash
cd /Users/yayoboy/Desktop/GitHub/muzzle
git add apps/server/src/services/sessions.ts
git commit -m "feat(yay-89): generate per-session token, pass to ttyd --credential"
```

---

## Task 3: `app/page.tsx` — gestire il token nel frontend

**Files:**
- Modify: `apps/web/src/app/page.tsx`

**Contesto:**
- `ttydUrl` è già uno stato React (`string | null`)
- Serve un nuovo stato `ttydToken` affiancato
- `api.getSessionAttachUrl(id)` ora restituisce `{ url, token }` invece di `{ url }`

**Step 1: Aggiungere stato `ttydToken`**

Dopo `const [ttydUrl, setTtydUrl] = useState<string | null>(null);`, aggiungere:
```ts
const [ttydToken, setTtydToken] = useState<string | null>(null);
```

**Step 2: Aggiornare `handleSelectSession`**

```ts
// PRIMA:
const handleSelectSession = async (id: string) => {
  setActiveId(id);
  try {
    const { url } = await api.getSessionAttachUrl(id);
    setTtydUrl(url);
  } catch (error) {
    console.error('Failed to attach to session', error);
  }
};

// DOPO:
const handleSelectSession = async (id: string) => {
  setActiveId(id);
  try {
    const { url, token } = await api.getSessionAttachUrl(id);
    setTtydUrl(url);
    setTtydToken(token);
  } catch (error) {
    console.error('Failed to attach to session', error);
  }
};
```

**Step 3: Aggiornare `handleDeleteSession`**

```ts
// PRIMA:
const handleDeleteSession = (deletedId: string) => {
  if (deletedId === activeId) {
    setActiveId(null);
    setTtydUrl(null);
  }
};

// DOPO:
const handleDeleteSession = (deletedId: string) => {
  if (deletedId === activeId) {
    setActiveId(null);
    setTtydUrl(null);
    setTtydToken(null);
  }
};
```

**Step 4: Passare `token` a `<Terminal>`**

```tsx
// PRIMA:
<Terminal url={ttydUrl} />

// DOPO:
<Terminal url={ttydUrl} token={ttydToken ?? ''} />
```

**Step 5: Type-check**

```bash
cd /Users/yayoboy/Desktop/GitHub/muzzle/apps/web && npx tsc --noEmit
```

Expected: errore in `Terminal.tsx` per la prop mancante (corretto, lo fix nel Task 4).

**Step 6: Commit**

```bash
cd /Users/yayoboy/Desktop/GitHub/muzzle
git add apps/web/src/app/page.tsx
git commit -m "feat(yay-89): pass ttyd token from attach response to Terminal"
```

---

## Task 4: `components/Terminal.tsx` — usare il token nel WebSocket

**Files:**
- Modify: `apps/web/src/components/Terminal.tsx`

**Contesto:**
- Attuale WS URL: `url.replace(/^http/, 'ws') + '/ws'` — senza auth
- URL con credentials: `ws://muzzle:<rawToken>@<host>:<port>/ws`
- Il browser converte automaticamente le URL credentials in `Authorization: Basic base64('muzzle:<rawToken>')`
- Il primo messaggio deve anche includere `{ AuthToken: btoa('muzzle:' + token) }` (formato atteso da ttyd)

**Step 1: Aggiungere `token` alle Props**

```tsx
// PRIMA:
interface Props {
  url: string;
}

// DOPO:
interface Props {
  url: string;
  token: string;
}
```

**Step 2: Aggiornare la firma del componente**

```tsx
// PRIMA:
export function Terminal({ url }: Props) {

// DOPO:
export function Terminal({ url, token }: Props) {
```

**Step 3: Aggiornare la costruzione del WS URL**

```tsx
// PRIMA (dentro useEffect, dentro il setTimeout):
const wsUrl = url.replace(/^http/, 'ws') + '/ws';
socket = new WebSocket(wsUrl, ['tty']);

// DOPO:
const host = url.replace(/^https?:\/\//, '');
const wsUrl = `ws://muzzle:${token}@${host}/ws`;
socket = new WebSocket(wsUrl, ['tty']);
```

**Step 4: Aggiornare il primo messaggio con AuthToken**

```tsx
// PRIMA:
socket.onopen = () => {
  socket!.send(JSON.stringify({ AuthToken: '' }));
  xterm.focus();
};

// DOPO:
socket.onopen = () => {
  socket!.send(JSON.stringify({ AuthToken: btoa('muzzle:' + token) }));
  xterm.focus();
};
```

**Step 5: Aggiungere `token` alle dipendenze del useEffect**

```tsx
// PRIMA:
  }, [url]);

// DOPO:
  }, [url, token]);
```

**Step 6: Type-check**

```bash
cd /Users/yayoboy/Desktop/GitHub/muzzle/apps/web && npx tsc --noEmit
```

Expected: nessun errore.

**Step 7: Commit**

```bash
cd /Users/yayoboy/Desktop/GitHub/muzzle
git add apps/web/src/components/Terminal.tsx
git commit -m "fix(yay-89): authenticate WebSocket with per-session token"
```

---

## Task 5: Smoke test manuale

**Step 1: Avviare il server**

```bash
cd /Users/yayoboy/Desktop/GitHub/muzzle/apps/server && npm run dev
```

**Step 2: Avviare il frontend**

```bash
cd /Users/yayoboy/Desktop/GitHub/muzzle/apps/web && npm run dev
```

**Step 3: Verifica funzionamento normale**

1. Aprire http://localhost:3000
2. Login con la password configurata in `.env`
3. Creare una nuova sessione
4. Verificare che il terminale si apra e funzioni (digitare `echo hello`)

**Step 4: Verifica che ttyd senza token venga rifiutato**

In un altro tab del browser, aprire la console DevTools e provare:

```js
// Deve fallire — nessun token
const ws = new WebSocket('ws://127.0.0.1:7680/ws', ['tty']);
ws.onopen = () => console.log('OPEN — PROBLEMA: dovrebbe essere rifiutato');
ws.onerror = () => console.log('ERROR — OK: connessione rifiutata');
ws.onclose = (e) => console.log('CLOSE code:', e.code, '— OK se code!=101');
```

Expected: `onerror` o `onclose` con codice di errore (non `onopen`).

**Step 5: Verifica nei log del server**

Nel terminale del server, per ogni sessione creata deve apparire:
```
ttyd process for session <id> closed
```
e al suo posto l'attivazione con credential.

---

## Task 6: Aggiornare Linear YAY-89 a Done

Marcare https://linear.app/yayoboy/issue/YAY-89 come Done su Linear.
