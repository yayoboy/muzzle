# YAY-87 Directory Isolation Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make every tmux session start in the directory where the muzzle server was launched.

**Architecture:** Add a `startDir: string` param to `createTmuxSession` that passes `-c <dir>` to `tmux new-session`. In `sessions.ts`, capture `process.cwd()` at module init as `WORKDIR` and pass it through. No API or frontend changes.

**Tech Stack:** Node.js `process.cwd()`, tmux `-c` flag (sets start directory for new session).

---

## Task 1: `services/tmux.ts` — add `startDir` param

**Files:**
- Modify: `apps/server/src/services/tmux.ts`

**Stato attuale:**
```ts
export function createTmuxSession(sessionName: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const tmux = spawn('tmux', ['new-session', '-d', '-s', sessionName]);
    ...
  });
}
```

**Step 1: Sostituire la firma e gli args con:**

```ts
export function createTmuxSession(sessionName: string, startDir: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const tmux = spawn('tmux', ['new-session', '-d', '-s', sessionName, '-c', startDir]);
    tmux.on('error', reject);
    tmux.on('close', (code: number) => {
      if (code === 0) resolve(sessionName);
      else reject(new Error('Failed to create tmux session'));
    });
  });
}
```

Note: `-c <dir>` deve venire PRIMA del comando tmux (non c'è subcommand qui, è già `new-session`). Posizionarlo dopo `-s sessionName` è corretto.

**Step 2: Type-check**

```bash
cd /Users/yayoboy/Desktop/GitHub/muzzle/apps/server && npx tsc --noEmit 2>&1
```

Expected: errore in `sessions.ts` perché `createTmuxSession` ora richiede 2 argomenti (corretto, lo fix nel Task 2).

**Step 3: Commit**

```bash
cd /Users/yayoboy/Desktop/GitHub/muzzle
git add apps/server/src/services/tmux.ts
git commit -m "feat(yay-87): createTmuxSession accepts startDir parameter"
```

---

## Task 2: `services/sessions.ts` — aggiungere WORKDIR

**Files:**
- Modify: `apps/server/src/services/sessions.ts`

**Step 1: Aggiungere `WORKDIR` dopo le costanti esistenti**

Dopo la riga `const TOKENS: Map<string, string> = new Map();`, aggiungere:
```ts
const WORKDIR = process.cwd();
```

**Step 2: Aggiornare la chiamata a `createTmuxSession`**

```ts
// PRIMA:
await createTmuxSession(tmuxSession);

// DOPO:
await createTmuxSession(tmuxSession, WORKDIR);
```

**Step 3: Type-check**

```bash
cd /Users/yayoboy/Desktop/GitHub/muzzle/apps/server && npx tsc --noEmit 2>&1
```

Expected: nessun errore.

**Step 4: Eseguire i test esistenti**

```bash
cd /Users/yayoboy/Desktop/GitHub/muzzle && npx jest tests/server/sessions.test.ts --no-coverage 2>&1
```

Expected: tutti i test passano (il mock-bin/tmux ignora gli argomenti extra e ritorna exit 0).

**Step 5: Commit**

```bash
cd /Users/yayoboy/Desktop/GitHub/muzzle
git add apps/server/src/services/sessions.ts
git commit -m "feat(yay-87): sessions start in server launch directory"
```

---

## Task 3: Aggiornare Linear YAY-87 a Done

Marcare https://linear.app/yayoboy/issue/YAY-87 come Done su Linear.
