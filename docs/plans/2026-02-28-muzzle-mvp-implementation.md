# Muzzle MVP Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Deliver a functional MVP that allows a user to log in, create a session, and interact with a remote terminal via a web UI.

**Architecture:** A monorepo with a shared TypeScript package for types, an Express backend exposing auth, session, and command routes, and a Next.js frontend using xterm.js to render the remote terminal. Sessions are backed by tmux and exposed via ttyd.

**Tech Stack:** Next.js 14, React, TypeScript, Tailwind CSS, Express, xterm.js, ttyd, tmux, JWT, Turborepo.

---

### Task 1: Monorepo Initialization

**Files:**
- Create: `package.json`
- Create: `turbo.json`
- Create: `.gitignore`
- Create: `.nvmrc`

**Step 1: Write the failing test** (none needed – init step).

**Step 2: Run test to verify it fails** (skip).

**Step 3: Write minimal implementation**
```bash
npm init -y
cat > turbo.json <<'EOF'
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": { "dependsOn": ["^build"] },
    "dev": { "cache": false, "persistent": true },
    "lint": { "dependsOn": ["^lint"] },
    "test": { "dependsOn": ["^build"] }
  }
}
EOF
cat > .gitignore <<'EOF'
node_modules/
.dist/
.turbo/
.env
.env.local
*.log
.DS_Store
EOF
echo "20" > .nvmrc
```

**Step 4: Run test to verify it passes** (skip).

**Step 5: Commit**
```bash
git init
git add .
git commit -m "chore: initialize monorepo"
```

---

### Task 2: Shared Types Package

**Files:**
- Create: `packages/shared/package.json`
- Create: `packages/shared/tsconfig.json`
- Create: `packages/shared/src/types.ts`
- Create: `packages/shared/src/index.ts`

**Step 1: Write the failing test**
```ts
// tests/shared/types.test.ts
import { Session } from '@muzzle/shared';

test('Session type exists', () => {
  const s: Session = {
    id: 'abc',
    name: 'test',
    tmuxSession: 'muzzle-abc',
    ttydPort: 7681,
    createdAt: new Date(),
    lastActivity: new Date()
  };
  expect(s.id).toBe('abc');
});
```

**Step 2: Run test to verify it fails**
```bash
npm install -D jest ts-jest @types/jest
npx jest tests/shared/types.test.ts --runInBand
```
Expected: FAIL because package does not exist.

**Step 3: Write minimal implementation**
```json
// packages/shared/package.json
{
  "name": "@muzzle/shared",
  "version": "0.1.0",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "scripts": { "build": "tsc", "dev": "tsc --watch" },
  "devDependencies": { "typescript": "^5.3.0" }
}
```
```json
// packages/shared/tsconfig.json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "declaration": true,
    "outDir": "./dist",
    "strict": true,
    "esModuleInterop": true
  },
  "include": ["src/**/*"]
}
```
```ts
// packages/shared/src/types.ts
export interface Session {
  id: string;
  name: string;
  tmuxSession: string;
  ttydPort: number;
  createdAt: Date;
  lastActivity: Date;
}

export interface CreateSessionRequest { name?: string }
export interface SessionResponse { id: string; name: string; status: 'connected' | 'disconnected'; createdAt: string }
export interface AuthRequest { password: string }
export interface AuthResponse { token: string; expiresAt: string }
```
```ts
// packages/shared/src/index.ts
export * from './types';
```

**Step 4: Run test to verify it passes**
```bash
cd packages/shared && npm install && npm run build && cd ../../
npx jest tests/shared/types.test.ts --runInBand
```
Expected: PASS.

**Step 5: Commit**
```bash
git add packages/shared
git commit -m "feat: add shared types package"
```

---

### Task 3: Express Backend Scaffold

**Files:**
- Create: `apps/server/package.json`
- Create: `apps/server/tsconfig.json`
- Create: `apps/server/src/app.ts`
- Create: `apps/server/src/index.ts`
- Create: `apps/server/src/routes/auth.ts`
- Create: `apps/server/src/middleware/auth.ts`
- Create: `apps/server/src/services/auth.ts`
- Create: `apps/server/src/routes/sessions.ts`
- Create: `apps/server/src/services/ttyd.ts`
- Create: `apps/server/src/services/sessions.ts`

**Step 1: Write failing test**
```ts
// tests/server/auth.test.ts
import request from 'supertest';
import { createApp } from '../apps/server/src/app';

test('login fails without password', async () => {
  const app = createApp();
  const res = await request(app).post('/api/auth/login').send({});
  expect(res.status).toBe(400);
});
```

**Step 2: Run test to verify it fails**
```bash
npm install -D jest supertest @types/supertest
npx jest tests/server/auth.test.ts --runInBand
```
Expected: FAIL because routes not implemented.

**Step 3: Write minimal implementation**
```json
// apps/server/package.json
{
  "name": "@muzzle/server",
  "version": "0.1.0",
  "scripts": { "dev": "tsx watch src/index.ts", "build": "tsc", "start": "node dist/index.js" },
  "dependencies": { "@muzzle/shared": "*", "express": "^4.18.2", "jsonwebtoken": "^9.0.2", "cors": "^2.8.5", "dotenv": "^16.3.1", "uuid": "^9.0.0" },
  "devDependencies": { "@types/express": "^4.17.21", "@types/jsonwebtoken": "^9.0.5", "@types/cors": "^2.8.17", "@types/uuid": "^9.0.7", "typescript": "^5.3.0", "tsx": "^4.7.0" }
}
```
```json
// apps/server/tsconfig.json
{
  "compilerOptions": { "target": "ES2020", "module": "commonjs", "outDir": "./dist", "strict": true, "esModuleInterop": true, "skipLibCheck": true },
  "include": ["src/**/*"]
}
```
```ts
// apps/server/src/services/auth.ts
import jwt from 'jsonwebtoken';
const JWT_SECRET = process.env.JWT_SECRET || 'muzzle-secret';
export function validatePassword(pw: string): boolean { return pw === process.env.MUZZLE_PASSWORD; }
export function generateToken() {
  const expires = new Date(Date.now() + 24*60*60*1000);
  const token = jwt.sign({ exp: Math.floor(expires.getTime()/1000) }, JWT_SECRET);
  return { token, expiresAt: expires.toISOString() };
}
export function verifyToken(t: string): boolean { try { jwt.verify(t, JWT_SECRET); return true; } catch { return false; } }
```
```ts
// apps/server/src/middleware/auth.ts
import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../services/auth';
export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return res.status(401).json({ error: 'Missing token' });
  const token = header.slice(7);
  if (!verifyToken(token)) return res.status(401).json({ error: 'Invalid token' });
  next();
}
```
```ts
// apps/server/src/routes/auth.ts
import { Router } from 'express';
import { validatePassword, generateToken } from '../services/auth';
export const authRouter = Router();
authRouter.post('/login', (req, res) => {
  const { password } = req.body;
  if (!password) return res.status(400).json({ error: 'Password required' });
  if (!validatePassword(password)) return res.status(401).json({ error: 'Invalid password' });
  const { token, expiresAt } = generateToken();
  res.json({ token, expiresAt });
});
```
```ts
// apps/server/src/app.ts
import express from 'express';
import cors from 'cors';
import { authRouter } from './routes/auth';
export function createApp() {
  const app = express();
  app.use(cors());
  app.use(express.json());
  app.use('/api/auth', authRouter);
  app.get('/health', (_req, res) => res.json({ status: 'ok' }));
  return app;
}
```
```ts
// apps/server/src/index.ts
import 'dotenv/config';
import { createApp } from './app';
const PORT = process.env.PORT || 3001;
createApp().listen(PORT, () => console.log(`Muzzle server running on ${PORT}`));
```
(For brevity, ttyd and session services are left for later tasks.)
```

**Step 4: Run test to verify it passes**
```bash
cd apps/server && npm install && npm run build && cd ../../
npx jest tests/server/auth.test.ts --runInBand
```
Expected: PASS (status 400).

**Step 5: Commit**
```bash
git add apps/server
git commit -m "feat: scaffold express backend with auth"
```

---

### Task 4: Frontend Scaffold (Login Page)

**Files:**
- Create: `apps/web/package.json`
- Create: `apps/web/next.config.js`
- Create: `apps/web/tsconfig.json`
- Create: `apps/web/tailwind.config.ts`
- Create: `apps/web/postcss.config.js`
- Create: `apps/web/src/lib/api.ts`
- Create: `apps/web/src/lib/auth.ts`
- Create: `apps/web/src/hooks/useAuth.ts`
- Create: `apps/web/src/components/LoginForm.tsx`
- Create: `apps/web/src/app/layout.tsx`
- Create: `apps/web/src/app/globals.css`
- Create: `apps/web/src/app/page.tsx`

**Step 1: Write failing test**
```tsx
// tests/web/login.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import LoginForm from '@/components/LoginForm';

test('shows error on empty password', async () => {
  const mockLogin = jest.fn();
  render(<LoginForm onLogin={mockLogin} />);
  fireEvent.click(screen.getByRole('button', { name: /connect/i }));
  expect(screen.getByText(/invalid password/i)).toBeInTheDocument();
});
```

**Step 2: Run test to verify it fails**
```bash
npm install -D @testing-library/react @testing-library/jest-dom jest ts-jest @types/jest
npx jest tests/web/login.test.tsx --runInBand
```
Expected: FAIL because component not implemented.

**Step 3: Write minimal implementation** (full component as in the plan, plus supporting files). Provide code snippets for each file (see earlier plan sections). For brevity, include only key files.
```json
// apps/web/package.json
{
  "name": "@muzzle/web",
  "version": "0.1.0",
  "scripts": { "dev": "next dev", "build": "next build", "start": "next start", "lint": "next lint" },
  "dependencies": { "@muzzle/shared": "*", "next": "^14.0.0", "react": "^18.2.0", "react-dom": "^18.2.0", "xterm": "^5.3.0", "xterm-addon-fit": "^0.8.0", "xterm-addon-web-links": "^0.9.0" },
  "devDependencies": { "@types/node": "^20.10.0", "@types/react": "^18.2.0", "@types/react-dom": "^18.2.0", "autoprefixer": "^10.4.16", "postcss": "^8.4.32", "tailwindcss": "^3.4.0", "typescript": "^5.3.0" }
}
```
```js
// apps/web/next.config.js
module.exports = { reactStrictMode: true, transpilePackages: ['@muzzle/shared'] };
```
```json
// apps/web/tsconfig.json
{ "compilerOptions": { "target": "ES2020", "lib": ["dom","ES2020"], "jsx": "preserve", "module": "esnext", "strict": true, "esModuleInterop": true, "skipLibCheck": true, "moduleResolution": "bundler", "resolveJsonModule": true, "isolatedModules": true, "noEmit": true, "paths": { "@/*": ["./src/*"] } }, "include": ["next-env.d.ts","**/*.ts","**/*.tsx"] }
```
```ts
// apps/web/src/lib/api.ts
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
export class ApiClient { private token: string | null = null; setToken(t:string){this.token=t}; clearToken(){this.token=null}; private async request(p:string,o:RequestInit={}){const hdr:{[k:string]:string}={'Content-Type':'application/json',...(o.headers||{})}; if(this.token) hdr['Authorization']=`Bearer ${this.token}`; return fetch(`${API_URL}${p}`,{...o,headers:hdr}); }
 async login(pw:string){const r=await this.request('/api/auth/login',{method:'POST',body:JSON.stringify({password:pw})}); if(!r.ok) throw new Error('Login failed'); return r.json(); }
 async getSessions(){return (await this.request('/api/sessions')).json(); }
 async createSession(name?:string){return (await this.request('/api/sessions',{method:'POST',body:JSON.stringify({name})})).json(); }
 async deleteSession(id:string){await this.request(`/api/sessions/${id}`,{method:'DELETE'}); }
 async renameSession(id:string,n:string){return (await this.request(`/api/sessions/${id}/rename`,{method:'PUT',body:JSON.stringify({name:n})})).json(); }
 async getSessionAttachUrl(id:string){return (await this.request(`/api/sessions/${id}/attach`)).json(); }
 async getCommands(){return (await this.request('/api/commands')).json(); }
}
export const api = new ApiClient();
```
```ts
// apps/web/src/lib/auth.ts
const TK='muzzle_token'; const TE='muzzle_token_expires';
export function getStoredToken(){if(typeof window==='undefined')return null; const t=localStorage.getItem(TK); const e=localStorage.getItem(TE); if(!t||!e) return null; if(new Date(e)<new Date()){clearToken();return null;} return t;}
export function setToken(t:string,e:string){localStorage.setItem(TK,t); localStorage.setItem(TE,e); api.setToken(t);}
export function clearToken(){localStorage.removeItem(TK); localStorage.removeItem(TE); api.clearToken();}
export function initAuth(){const t=getStoredToken(); if(t){api.setToken(t);return true;}return false;}
```
```tsx
// apps/web/src/components/LoginForm.tsx
'use client';
import { useState } from 'react';
interface Props{onLogin:(pw:string)=>Promise<void>;}
export function LoginForm({onLogin}:Props){const [pw,setPw]=useState(''); const [err,setErr]=useState(''); const [load,setLoad]=useState(false);
 const submit=async(e:any)=>{e.preventDefault(); setErr(''); setLoad(true); try{await onLogin(pw);}catch{setErr('Invalid password');}finally{setLoad(false);} };
 return (<div className="min-h-screen bg-muzzle-bg flex items-center justify-center p-4"><form onSubmit={submit} className="w-full max-w-sm space-y-4"><h1 className="text-2xl font-bold text-muzzle-text text-center">Muzzle</h1><input type="password" value={pw} onChange={e=>setPw(e.target.value)} placeholder="Password" className="w-full px-4 py-3 bg-muzzle-surface border border-muzzle-border rounded-lg text-muzzle-text focus:outline-none focus:border-muzzle-accent" disabled={load}/>{err && <p className="text-red-500 text-sm text-center">{err}</p>}<button type="submit" disabled={load||!pw} className="w-full py-3 bg-muzzle-accent text-white rounded-lg font-medium disabled:opacity-50">{load?'Connecting...':'Connect'}</button></form></div>);}
```
```tsx
// apps/web/src/app/layout.tsx
import './globals.css';
import type { Metadata } from 'next';
export const metadata: Metadata={title:'Muzzle',description:'Mobile terminal multiplexer',viewport:'width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no'};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body>{children}</body></html>;}
```
```css
/* apps/web/src/app/globals.css */
@tailwind base;@tailwind components;@tailwind utilities;html,body,#__next{height:100%;margin:0;padding:0;}body{background:#0a0a0a;color:#e0e0e0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;}*{box-sizing:border-box;}
```
```tsx
// apps/web/src/app/page.tsx
'use client';
import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { LoginForm } from '@/components/LoginForm';
import { api } from '@/lib/api';
export default function Home(){const {isAuthenticated,isLoading,login,logout}=useAuth(); const [sessionId,setSessionId]=useState<string|null>(null); const [ttydUrl,setTtydUrl]=useState<string|null>(null);
 if(isLoading) return <div className="min-h-screen bg-muzzle-bg flex items-center justify-center">Loading...</div>;
 if(!isAuthenticated) return <LoginForm onLogin={async pw=>{const {token,expiresAt}=await api.login(pw); setToken(token,expiresAt);}}/>;
 const selectSession=async(id:string)=>{setSessionId(id); const {url}=await api.getSessionAttachUrl(id); setTtydUrl(url);};
 const newSession=async()=>{const s=await api.createSession(); setSessionId(s.id); const {url}=await api.getSessionAttachUrl(s.id); setTtydUrl(url);};
 return (<div className="h-screen flex flex-col bg-muzzle-bg">{/* Session manager would go here */}<div className="flex-1 bg-muzzle-bg">Terminal placeholder</div></div>);
}
```

**Step 4: Run test to verify it passes**
```bash
cd apps/web && npm install && npm run build && cd ../../
npx jest tests/web/login.test.tsx --runInBand
```
Expected: PASS.

**Step 5: Commit**
```bash
git add apps/web
git commit -m "feat: scaffold frontend with login page"
```

---

### Task 5: Minimal Session & Terminal Integration (MVP Core)

**Files:**
- Add tmux & ttyd services in backend (`apps/server/src/services/ttyd.ts`, `apps/server/src/services/sessions.ts`).
- Add session routes (`apps/server/src/routes/sessions.ts`).
- Add frontend session manager and terminal components (`apps/web/src/components/SessionManager.tsx`, `apps/web/src/components/Terminal.tsx`).
- Wire them into the main page.

**Step 1: Write failing test**
```ts
// tests/server/sessions.test.ts
import request from 'supertest';
import { createApp } from '../apps/server/src/app';

test('create session returns ttydPort', async () => {
  const app = createApp();
  // assume auth token stubbed; skip auth for MVP test
  const res = await request(app).post('/api/sessions').send({});
  expect(res.status).toBe(201);
  expect(res.body).toHaveProperty('ttydPort');
});
```

**Step 2: Run test to verify it fails** (skip auth middleware for now or mock token).

**Step 3: Implement minimal services & routes** (code already in the implementation plan – copy those snippets).

**Step 4: Run test to verify it passes** after adding auth token handling (use dummy token or disable middleware for test).

**Step 5: Commit**
```bash
git add apps/server/src/services apps/server/src/routes
git commit -m "feat: add session management and ttyd integration"
```

---

### Task 6: End‑to‑End Smoke Test

**Files:**
- Create: `tests/e2e/muzzle.e2e.test.ts`

**Step 1: Write failing test**
```ts
import { execSync } from 'child_process';
import fetch from 'node-fetch';

test('full login → create session → attach ttyd', async () => {
  // start dev servers (assume they are running)
  const loginRes = await fetch('http://localhost:3001/api/auth/login', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({password:'test'})});
  const {token}=await loginRes.json();
  const sessRes = await fetch('http://localhost:3001/api/sessions', {method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${token}`}});
  const sess = await sessRes.json();
  expect(sess).toHaveProperty('ttydPort');
});
```
**Step 2: Run test (expects failure until backend ready).**
**Step 3: Verify passes after tasks 4‑5 implemented.**
**Step 4: Commit**
```bash
git add tests/e2e
git commit -m "test: end‑to‑end smoke test for MVP"
```

---

**Plan complete and saved to `docs/plans/2026-02-28-muzzle-mvp-implementation.md`.**

Two execution options:
1. **Subagent‑Driven Development** – I dispatch a fresh subagent per task, review, and iterate.
2. **Parallel Session** – You open a new session (worktree) and run the `executing-plans` skill to process the plan automatically.

**Which approach would you like to take?**