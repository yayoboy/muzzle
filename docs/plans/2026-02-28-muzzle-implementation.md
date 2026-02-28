# Muzzle Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a mobile-first remote terminal multiplexer with session persistence for CLI clients (Claude, Qwen, Gemini, OpenCode).

**Architecture:** Next.js frontend (xterm.js terminal) + Express backend orchestrating ttyd instances per session. Each session uses tmux for persistence. JWT auth, Tailscale HTTPS.

**Tech Stack:** Next.js 14, React, TypeScript, Tailwind CSS, Express, xterm.js, ttyd, tmux

---

## Task 1: Project Setup (Monorepo)

**Files:**
- Create: `package.json`
- Create: `turbo.json`
- Create: `.gitignore`
- Create: `.nvmrc`

**Step 1: Initialize monorepo**
```bash
cd /Users/yayoboy/Desktop/GitHub/muzzle
npm init -y
```

**Step 2: Create package.json**
```json
{
  "name": "muzzle",
  "version": "0.1.0",
  "private": true,
  "workspaces": ["apps/*", "packages/*"],
  "scripts": {
    "dev": "turbo run dev",
    "build": "turbo run build",
    "lint": "turbo run lint",
    "test": "turbo run test"
  },
  "devDependencies": {
    "turbo": "^2.0.0",
    "typescript": "^5.3.0"
  }
}
```

**Step 3: Create turbo.json**
```json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": { "dependsOn": ["^build"] },
    "dev": { "cache": false, "persistent": true },
    "lint": { "dependsOn": ["^lint"] },
    "test": { "dependsOn": ["^build"] }
  }
}
```

**Step 4: Create .gitignore**
```
node_modules/
dist/
.turbo/
.env
.env.local
*.log
.DS_Store
```

**Step 5: Create .nvmrc**
```
20
```

**Step 6: Commit**
```bash
git init
git add .
git commit -m "chore: initialize monorepo"
```

---

## Task 2: Shared Package Setup

**Files:**
- Create: `packages/shared/package.json`
- Create: `packages/shared/tsconfig.json`
- Create: `packages/shared/src/index.ts`
- Create: `packages/shared/src/types.ts`

**Step 1: Create directory**
```bash
mkdir -p packages/shared/src
```

**Step 2: Create packages/shared/package.json**
```json
{
  "name": "@muzzle/shared",
  "version": "0.1.0",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch"
  },
  "devDependencies": {
    "typescript": "^5.3.0"
  }
}
```

**Step 3: Create packages/shared/tsconfig.json**
```json
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

**Step 4: Create packages/shared/src/types.ts**
```typescript
export interface Session {
  id: string;
  name: string;
  tmuxSession: string;
  ttydPort: number;
  createdAt: Date;
  lastActivity: Date;
}

export interface CreateSessionRequest {
  name?: string;
}

export interface SessionResponse {
  id: string;
  name: string;
  status: 'connected' | 'disconnected';
  createdAt: string;
}

export interface AuthRequest {
  password: string;
}

export interface AuthResponse {
  token: string;
  expiresAt: string;
}

export interface SlashCommand {
  name: string;
  command: string;
}

export interface CLIProfile {
  name: string;
  detect: string;
  commands: string[];
}
```

**Step 5: Create packages/shared/src/index.ts**
```typescript
export * from './types';
```

**Step 6: Build and verify**
```bash
cd packages/shared && npm install && npm run build
```

**Step 7: Commit**
```bash
git add .
git commit -m "feat: add shared types package"
```

---

## Task 3: Express Backend Setup

**Files:**
- Create: `apps/server/package.json`
- Create: `apps/server/tsconfig.json`
- Create: `apps/server/src/index.ts`
- Create: `apps/server/src/app.ts`

**Step 1: Create directory**
```bash
mkdir -p apps/server/src
```

**Step 2: Create apps/server/package.json**
```json
{
  "name": "@muzzle/server",
  "version": "0.1.0",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js"
  },
  "dependencies": {
    "@muzzle/shared": "*",
    "express": "^4.18.2",
    "jsonwebtoken": "^9.0.2",
    "cors": "^2.8.5",
    "dotenv": "^16.3.1",
    "yaml": "^2.3.4",
    "uuid": "^9.0.0"
  },
  "devDependencies": {
    "@types/express": "^4.17.21",
    "@types/jsonwebtoken": "^9.0.5",
    "@types/cors": "^2.8.17",
    "@types/uuid": "^9.0.7",
    "typescript": "^5.3.0",
    "tsx": "^4.7.0"
  }
}
```

**Step 3: Create apps/server/tsconfig.json**
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "outDir": "./dist",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true
  },
  "include": ["src/**/*"]
}
```

**Step 4: Create apps/server/src/app.ts**
```typescript
import express from 'express';
import cors from 'cors';
import { authRouter } from './routes/auth';
import { sessionsRouter } from './routes/sessions';
import { commandsRouter } from './routes/commands';

export function createApp() {
  const app = express();
  
  app.use(cors());
  app.use(express.json());
  
  app.use('/api/auth', authRouter);
  app.use('/api/sessions', sessionsRouter);
  app.use('/api/commands', commandsRouter);
  
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });
  
  return app;
}
```

**Step 5: Create apps/server/src/index.ts**
```typescript
import 'dotenv/config';
import { createApp } from './app';

const PORT = process.env.PORT || 3001;

const app = createApp();

app.listen(PORT, () => {
  console.log(`Muzzle server running on port ${PORT}`);
});
```

**Step 6: Install and build**
```bash
cd apps/server && npm install
```

**Step 7: Commit**
```bash
git add .
git commit -m "feat: setup express backend"
```

---

## Task 4: Auth Routes

**Files:**
- Create: `apps/server/src/routes/auth.ts`
- Create: `apps/server/src/middleware/auth.ts`
- Create: `apps/server/src/services/auth.ts`

**Step 1: Create apps/server/src/services/auth.ts**
```typescript
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'muzzle-secret-change-in-production';
const JWT_EXPIRES_IN = '24h';

export function validatePassword(password: string): boolean {
  const validPassword = process.env.MUZZLE_PASSWORD;
  if (!validPassword) {
    console.warn('MUZZLE_PASSWORD not set, authentication disabled');
    return true;
  }
  return password === validPassword;
}

export function generateToken(): { token: string; expiresAt: string } {
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const token = jwt.sign({ exp: Math.floor(expiresAt.getTime() / 1000) }, JWT_SECRET);
  return { token, expiresAt: expiresAt.toISOString() };
}

export function verifyToken(token: string): boolean {
  try {
    jwt.verify(token, JWT_SECRET);
    return true;
  } catch {
    return false;
  }
}
```

**Step 2: Create apps/server/src/middleware/auth.ts**
```typescript
import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../services/auth';

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing token' });
  }
  
  const token = authHeader.slice(7);
  if (!verifyToken(token)) {
    return res.status(401).json({ error: 'Invalid token' });
  }
  
  next();
}
```

**Step 3: Create apps/server/src/routes/auth.ts**
```typescript
import { Router } from 'express';
import { validatePassword, generateToken } from '../services/auth';

export const authRouter = Router();

authRouter.post('/login', (req, res) => {
  const { password } = req.body;
  
  if (!password) {
    return res.status(400).json({ error: 'Password required' });
  }
  
  if (!validatePassword(password)) {
    return res.status(401).json({ error: 'Invalid password' });
  }
  
  const { token, expiresAt } = generateToken();
  res.json({ token, expiresAt });
});

authRouter.post('/logout', (_req, res) => {
  res.json({ message: 'Logged out' });
});
```

**Step 4: Commit**
```bash
git add .
git commit -m "feat: add auth routes and middleware"
```

---

## Task 5: Session Management Service

**Files:**
- Create: `apps/server/src/services/sessions.ts`
- Create: `apps/server/src/services/ttyd.ts`

**Step 1: Create apps/server/src/services/ttyd.ts**
```typescript
import { spawn, ChildProcess } from 'child_process';

const BASE_PORT = 7681;
const MAX_PORTS = 100;

interface TtydInstance {
  port: number;
  process: ChildProcess;
  tmuxSession: string;
}

const instances: Map<string, TtydInstance> = new Map();
const usedPorts: Set<number> = new Set();

export function findAvailablePort(): number {
  for (let port = BASE_PORT; port < BASE_PORT + MAX_PORTS; port++) {
    if (!usedPorts.has(port)) {
      return port;
    }
  }
  throw new Error('No available ports');
}

export async function startTtyd(sessionId: string, tmuxSession: string): Promise<number> {
  const port = findAvailablePort();
  
  const proc = spawn('ttyd', [
    '--port', String(port),
    '--once',
    'tmux', 'attach', '-t', tmuxSession
  ], { stdio: 'ignore' });
  
  instances.set(sessionId, {
    port,
    process: proc,
    tmuxSession
  });
  usedPorts.add(port);
  
  proc.on('exit', () => {
    instances.delete(sessionId);
    usedPorts.delete(port);
  });
  
  return port;
}

export function stopTtyd(sessionId: string): void {
  const instance = instances.get(sessionId);
  if (instance) {
    instance.process.kill();
    instances.delete(sessionId);
    usedPorts.delete(instance.port);
  }
}

export function getTtydPort(sessionId: string): number | undefined {
  return instances.get(sessionId)?.port;
}

export function getAllInstances(): Map<string, TtydInstance> {
  return instances;
}
```

**Step 2: Create apps/server/src/services/sessions.ts**
```typescript
import { spawn } from 'child_process';
import { v4 as uuidv4 } from 'uuid';
import { Session } from '@muzzle/shared';
import { startTtyd, stopTtyd, getTtydPort } from './ttyd';

const sessions: Map<string, Session> = new Map();

function execTmux(args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const proc = spawn('tmux', args, { stdio: 'ignore' });
    proc.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`tmux exited with code ${code}`));
    });
  });
}

export async function createSession(name?: string): Promise<Session> {
  const id = uuidv4().slice(0, 8);
  const sessionName = name || `session-${id}`;
  const tmuxSession = `muzzle-${id}`;
  
  await execTmux(['new-session', '-d', '-s', tmuxSession]);
  
  const ttydPort = await startTtyd(id, tmuxSession);
  
  const session: Session = {
    id,
    name: sessionName,
    tmuxSession,
    ttydPort,
    createdAt: new Date(),
    lastActivity: new Date()
  };
  
  sessions.set(id, session);
  return session;
}

export async function deleteSession(id: string): Promise<void> {
  const session = sessions.get(id);
  if (!session) throw new Error('Session not found');
  
  stopTtyd(id);
  await execTmux(['kill-session', '-t', session.tmuxSession]).catch(() => {});
  
  sessions.delete(id);
}

export function getSession(id: string): Session | undefined {
  return sessions.get(id);
}

export function getAllSessions(): Session[] {
  return Array.from(sessions.values());
}

export function renameSession(id: string, newName: string): Session {
  const session = sessions.get(id);
  if (!session) throw new Error('Session not found');
  session.name = newName;
  session.lastActivity = new Date();
  return session;
}

export function getTtydUrl(sessionId: string): string | undefined {
  const port = getTtydPort(sessionId);
  if (!port) return undefined;
  return `http://localhost:${port}`;
}
```

**Step 3: Commit**
```bash
git add .
git commit -m "feat: add session management service"
```

---

## Task 6: Sessions Routes

**Files:**
- Create: `apps/server/src/routes/sessions.ts`

**Step 1: Create apps/server/src/routes/sessions.ts**
```typescript
import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import * as sessionsService from '../services/sessions';

export const sessionsRouter = Router();

sessionsRouter.use(authMiddleware);

sessionsRouter.get('/', (_req, res) => {
  const sessions = sessionsService.getAllSessions();
  res.json(sessions.map(s => ({
    id: s.id,
    name: s.name,
    status: 'connected',
    createdAt: s.createdAt.toISOString()
  })));
});

sessionsRouter.post('/', async (req, res) => {
  try {
    const { name } = req.body;
    const session = await sessionsService.createSession(name);
    res.status(201).json({
      id: session.id,
      name: session.name,
      ttydPort: session.ttydPort,
      createdAt: session.createdAt.toISOString()
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create session' });
  }
});

sessionsRouter.delete('/:id', async (req, res) => {
  try {
    await sessionsService.deleteSession(req.params.id);
    res.status(204).send();
  } catch (error) {
    res.status(404).json({ error: 'Session not found' });
  }
});

sessionsRouter.put('/:id/rename', (req, res) => {
  try {
    const { name } = req.body;
    const session = sessionsService.renameSession(req.params.id, name);
    res.json({
      id: session.id,
      name: session.name,
      createdAt: session.createdAt.toISOString()
    });
  } catch (error) {
    res.status(404).json({ error: 'Session not found' });
  }
});

sessionsRouter.get('/:id/attach', (req, res) => {
  const url = sessionsService.getTtydUrl(req.params.id);
  if (!url) {
    return res.status(404).json({ error: 'Session not found' });
  }
  res.json({ url });
});
```

**Step 2: Commit**
```bash
git add .
git commit -m "feat: add sessions routes"
```

---

## Task 7: Commands Routes

**Files:**
- Create: `apps/server/src/routes/commands.ts`
- Create: `apps/server/src/services/commands.ts`

**Step 1: Create apps/server/src/services/commands.ts**
```typescript
import { parse } from 'yaml';
import { readFile } from 'fs/promises';
import { homedir } from 'os';
import { join } from 'path';
import { CLIProfile } from '@muzzle/shared';

const DEFAULT_PROFILES: CLIProfile[] = [
  {
    name: 'claude',
    detect: 'claude',
    commands: ['help', 'compact', 'model', 'cost', 'clear', 'config', 'doctor', 'permissions', 'mcp', 'init', 'logout', 'resume', 'terminal-setup']
  },
  {
    name: 'qwen',
    detect: 'qwen',
    commands: ['help', 'clear', 'reset', 'model', 'exit', 'save', 'load', 'system', 'temperature']
  },
  {
    name: 'gemini',
    detect: 'gemini',
    commands: ['help', 'clear', 'reset', 'model', 'history', 'save', 'load', 'settings']
  },
  {
    name: 'opencode',
    detect: 'opencode',
    commands: ['help', 'model', 'clear', 'config', 'status', 'exit', 'history']
  }
];

let cachedProfiles: CLIProfile[] | null = null;

export async function loadProfiles(): Promise<CLIProfile[]> {
  if (cachedProfiles) return cachedProfiles;
  
  const configPath = join(homedir(), '.config', 'muzzle', 'commands.yaml');
  
  try {
    const content = await readFile(configPath, 'utf-8');
    const config = parse(content);
    cachedProfiles = [...DEFAULT_PROFILES, ...(config.custom_profiles || [])];
  } catch {
    cachedProfiles = DEFAULT_PROFILES;
  }
  
  return cachedProfiles;
}

export function getDefaultProfiles(): CLIProfile[] {
  return DEFAULT_PROFILES;
}
```

**Step 2: Create apps/server/src/routes/commands.ts**
```typescript
import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import { loadProfiles } from '../services/commands';

export const commandsRouter = Router();

commandsRouter.use(authMiddleware);

commandsRouter.get('/', async (_req, res) => {
  const profiles = await loadProfiles();
  res.json(profiles);
});
```

**Step 3: Commit**
```bash
git add .
git commit -m "feat: add commands routes"
```

---

## Task 8: Next.js Frontend Setup

**Files:**
- Create: `apps/web/package.json`
- Create: `apps/web/next.config.js`
- Create: `apps/web/tsconfig.json`
- Create: `apps/web/tailwind.config.ts`
- Create: `apps/web/postcss.config.js`

**Step 1: Create directory**
```bash
mkdir -p apps/web
```

**Step 2: Create apps/web/package.json**
```json
{
  "name": "@muzzle/web",
  "version": "0.1.0",
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint"
  },
  "dependencies": {
    "@muzzle/shared": "*",
    "next": "^14.0.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "xterm": "^5.3.0",
    "xterm-addon-fit": "^0.8.0",
    "xterm-addon-web-links": "^0.9.0"
  },
  "devDependencies": {
    "@types/node": "^20.10.0",
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "autoprefixer": "^10.4.16",
    "postcss": "^8.4.32",
    "tailwindcss": "^3.4.0",
    "typescript": "^5.3.0"
  }
}
```

**Step 3: Create apps/web/next.config.js**
```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@muzzle/shared']
};

module.exports = nextConfig;
```

**Step 4: Create apps/web/tsconfig.json**
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["dom", "ES2020"],
    "jsx": "preserve",
    "module": "esnext",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx"]
}
```

**Step 5: Create apps/web/tailwind.config.ts**
```typescript
import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        muzzle: {
          bg: '#0a0a0a',
          surface: '#1a1a1a',
          border: '#2a2a2a',
          text: '#e0e0e0',
          muted: '#808080',
          accent: '#3b82f6'
        }
      }
    }
  },
  plugins: []
};

export default config;
```

**Step 6: Create apps/web/postcss.config.js**
```javascript
module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {}
  }
};
```

**Step 7: Install**
```bash
cd apps/web && npm install
```

**Step 8: Commit**
```bash
git add .
git commit -m "feat: setup next.js frontend"
```

---

## Task 9: Frontend Auth Context

**Files:**
- Create: `apps/web/src/lib/auth.ts`
- Create: `apps/web/src/lib/api.ts`
- Create: `apps/web/src/hooks/useAuth.ts`
- Create: `apps/web/src/components/LoginForm.tsx`

**Step 1: Create directories**
```bash
mkdir -p apps/web/src/lib apps/web/src/hooks apps/web/src/components
```

**Step 2: Create apps/web/src/lib/api.ts**
```typescript
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export class ApiClient {
  private token: string | null = null;
  
  setToken(token: string) {
    this.token = token;
  }
  
  clearToken() {
    this.token = null;
  }
  
  private async request(path: string, options: RequestInit = {}): Promise<Response> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>)
    };
    
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }
    
    return fetch(`${API_URL}${path}`, { ...options, headers });
  }
  
  async login(password: string): Promise<{ token: string; expiresAt: string }> {
    const res = await this.request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ password })
    });
    
    if (!res.ok) throw new Error('Login failed');
    return res.json();
  }
  
  async getSessions() {
    const res = await this.request('/api/sessions');
    return res.json();
  }
  
  async createSession(name?: string) {
    const res = await this.request('/api/sessions', {
      method: 'POST',
      body: JSON.stringify({ name })
    });
    return res.json();
  }
  
  async deleteSession(id: string) {
    await this.request(`/api/sessions/${id}`, { method: 'DELETE' });
  }
  
  async renameSession(id: string, name: string) {
    const res = await this.request(`/api/sessions/${id}/rename`, {
      method: 'PUT',
      body: JSON.stringify({ name })
    });
    return res.json();
  }
  
  async getSessionAttachUrl(id: string) {
    const res = await this.request(`/api/sessions/${id}/attach`);
    return res.json();
  }
  
  async getCommands() {
    const res = await this.request('/api/commands');
    return res.json();
  }
}

export const api = new ApiClient();
```

**Step 3: Create apps/web/src/lib/auth.ts**
```typescript
import { api } from './api';

const TOKEN_KEY = 'muzzle_token';
const TOKEN_EXPIRES_KEY = 'muzzle_token_expires';

export function getStoredToken(): string | null {
  if (typeof window === 'undefined') return null;
  
  const token = localStorage.getItem(TOKEN_KEY);
  const expires = localStorage.getItem(TOKEN_EXPIRES_KEY);
  
  if (!token || !expires) return null;
  if (new Date(expires) < new Date()) {
    clearToken();
    return null;
  }
  
  return token;
}

export function setToken(token: string, expiresAt: string) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(TOKEN_EXPIRES_KEY, expiresAt);
  api.setToken(token);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(TOKEN_EXPIRES_KEY);
  api.clearToken();
}

export function initAuth() {
  const token = getStoredToken();
  if (token) {
    api.setToken(token);
    return true;
  }
  return false;
}
```

**Step 4: Create apps/web/src/hooks/useAuth.ts**
```typescript
'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { initAuth } from '@/lib/auth';

export function useAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    const authenticated = initAuth();
    setIsAuthenticated(authenticated);
    setIsLoading(false);
  }, []);
  
  const login = async (password: string) => {
    const { token, expiresAt } = await api.login(password);
    api.setToken(token);
    localStorage.setItem('muzzle_token', token);
    localStorage.setItem('muzzle_token_expires', expiresAt);
    setIsAuthenticated(true);
  };
  
  const logout = () => {
    api.clearToken();
    localStorage.removeItem('muzzle_token');
    localStorage.removeItem('muzzle_token_expires');
    setIsAuthenticated(false);
  };
  
  return { isAuthenticated, isLoading, login, logout };
}
```

**Step 5: Create apps/web/src/components/LoginForm.tsx**
```typescript
'use client';

import { useState } from 'react';

interface LoginFormProps {
  onLogin: (password: string) => Promise<void>;
}

export function LoginForm({ onLogin }: LoginFormProps) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    try {
      await onLogin(password);
    } catch {
      setError('Invalid password');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="min-h-screen bg-muzzle-bg flex items-center justify-center p-4">
      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4">
        <h1 className="text-2xl font-bold text-muzzle-text text-center">Muzzle</h1>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          className="w-full px-4 py-3 bg-muzzle-surface border border-muzzle-border rounded-lg text-muzzle-text focus:outline-none focus:border-muzzle-accent"
          disabled={loading}
        />
        {error && <p className="text-red-500 text-sm text-center">{error}</p>}
        <button
          type="submit"
          disabled={loading || !password}
          className="w-full py-3 bg-muzzle-accent text-white rounded-lg font-medium disabled:opacity-50"
        >
          {loading ? 'Connecting...' : 'Connect'}
        </button>
      </form>
    </div>
  );
}
```

**Step 6: Commit**
```bash
git add .
git commit -m "feat: add auth context and login form"
```

---

## Task 10: Session Manager Component

**Files:**
- Create: `apps/web/src/components/SessionManager.tsx`

**Step 1: Create apps/web/src/components/SessionManager.tsx**
```typescript
'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';

interface Session {
  id: string;
  name: string;
  status: string;
  createdAt: string;
}

interface SessionManagerProps {
  activeSessionId: string | null;
  onSelectSession: (id: string) => void;
  onNewSession: () => void;
}

export function SessionManager({ activeSessionId, onSelectSession, onNewSession }: SessionManagerProps) {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  
  useEffect(() => {
    const loadSessions = async () => {
      const data = await api.getSessions();
      setSessions(data);
    };
    loadSessions();
    const interval = setInterval(loadSessions, 5000);
    return () => clearInterval(interval);
  }, []);
  
  const handleRename = async (id: string, newName: string) => {
    await api.renameSession(id, newName);
    setSessions(sessions.map(s => s.id === id ? { ...s, name: newName } : s));
    setMenuOpen(null);
  };
  
  const handleDelete = async (id: string) => {
    await api.deleteSession(id);
    setSessions(sessions.filter(s => s.id !== id));
    setMenuOpen(null);
  };
  
  return (
    <div className="flex items-center gap-2 overflow-x-auto px-2 py-2 bg-muzzle-surface border-b border-muzzle-border">
      {sessions.map((session) => (
        <div key={session.id} className="relative">
          <button
            onClick={() => onSelectSession(session.id)}
            onContextMenu={(e) => { e.preventDefault(); setMenuOpen(session.id); }}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap ${
              activeSessionId === session.id
                ? 'bg-muzzle-accent text-white'
                : 'bg-muzzle-bg text-muzzle-text hover:bg-muzzle-border'
            }`}
          >
            {session.name}
            <span className="ml-2 w-2 h-2 rounded-full bg-green-500 inline-block" />
          </button>
          {menuOpen === session.id && (
            <div className="absolute top-full left-0 mt-1 bg-muzzle-surface border border-muzzle-border rounded-lg shadow-lg z-10">
              <button
                onClick={() => { const name = prompt('New name:', session.name); if (name) handleRename(session.id, name); }}
                className="block w-full px-4 py-2 text-left text-sm text-muzzle-text hover:bg-muzzle-border"
              >
                Rename
              </button>
              <button
                onClick={() => handleDelete(session.id)}
                className="block w-full px-4 py-2 text-left text-sm text-red-500 hover:bg-muzzle-border"
              >
                Close
              </button>
            </div>
          )}
        </div>
      ))}
      <button
        onClick={onNewSession}
        className="px-3 py-1.5 rounded-lg text-sm font-medium bg-muzzle-bg text-muzzle-muted hover:bg-muzzle-border"
      >
        + New
      </button>
      {menuOpen && <div className="fixed inset-0 z-0" onClick={() => setMenuOpen(null)} />}
    </div>
  );
}
```

**Step 2: Commit**
```bash
git add .
git commit -m "feat: add session manager component"
```

---

## Task 11: Terminal Component

**Files:**
- Create: `apps/web/src/components/Terminal.tsx`

**Step 1: Create apps/web/src/components/Terminal.tsx**
```typescript
'use client';

import { useEffect, useRef, useState } from 'react';
import { Terminal as XTerm } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { WebLinksAddon } from 'xterm-addon-web-links';
import 'xterm/css/xterm.css';

interface TerminalProps {
  sessionTtydUrl: string | null;
}

export function Terminal({ sessionTtydUrl }: TerminalProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const terminalRef = useRef<XTerm | null>(null);
  const [connected, setConnected] = useState(false);
  
  useEffect(() => {
    if (!containerRef.current || !sessionTtydUrl) return;
    
    const term = new XTerm({
      theme: {
        background: '#0a0a0a',
        foreground: '#e0e0e0',
        cursor: '#3b82f6'
      },
      fontSize: 14,
      fontFamily: 'Menlo, Monaco, monospace'
    });
    
    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    term.loadAddon(new WebLinksAddon());
    
    term.open(containerRef.current);
    fitAddon.fit();
    
    const ws = new WebSocket(sessionTtydUrl.replace('http', 'ws'));
    
    ws.onopen = () => setConnected(true);
    ws.onclose = () => setConnected(false);
    
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'output') {
        term.write(data.data);
      }
    };
    
    term.onData((data) => {
      ws.send(JSON.stringify({ type: 'input', data }));
    });
    
    terminalRef.current = term;
    
    const handleResize = () => fitAddon.fit();
    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
      ws.close();
      term.dispose();
    };
  }, [sessionTtydUrl]);
  
  if (!sessionTtydUrl) {
    return (
      <div className="flex-1 flex items-center justify-center bg-muzzle-bg text-muzzle-muted">
        Select or create a session
      </div>
    );
  }
  
  return (
    <div className="flex-1 bg-muzzle-bg relative">
      <div ref={containerRef} className="absolute inset-0 p-2" />
      {!connected && (
        <div className="absolute inset-0 flex items-center justify-center bg-muzzle-bg/80">
          Connecting...
        </div>
      )}
    </div>
  );
}
```

**Step 2: Commit**
```bash
git add .
git commit -m "feat: add terminal component with xterm.js"
```

---

## Task 12: Quick Commands Bar

**Files:**
- Create: `apps/web/src/components/QuickCommands.tsx`
- Create: `apps/web/src/components/SlashCommandsPopup.tsx`

**Step 1: Create apps/web/src/components/QuickCommands.tsx**
```typescript
'use client';

import { useState } from 'react';

interface QuickCommandsProps {
  onCommand: (cmd: string) => void;
  onOpenSlashCommands: () => void;
}

export function QuickCommands({ onCommand, onOpenSlashCommands }: QuickCommandsProps) {
  const [showInput, setShowInput] = useState(false);
  const [customCmd, setCustomCmd] = useState('');
  
  const commands = [
    { key: 'Ctrl+C', label: 'Ctrl+C', cmd: '\x03' },
    { key: 'Ctrl+D', label: 'Ctrl+D', cmd: '\x04' },
    { key: 'Ctrl+Z', label: 'Ctrl+Z', cmd: '\x1a' },
    { key: 'Tab', label: 'Tab', cmd: '\t' },
    { key: 'Esc', label: 'Esc', cmd: '\x1b' },
  ];
  
  return (
    <div className="flex items-center gap-1 px-2 py-2 bg-muzzle-surface border-t border-muzzle-border overflow-x-auto">
      {commands.map((cmd) => (
        <button
          key={cmd.key}
          onClick={() => onCommand(cmd.cmd)}
          className="px-3 py-1.5 rounded-lg text-sm font-medium bg-muzzle-bg text-muzzle-text hover:bg-muzzle-border whitespace-nowrap"
        >
          {cmd.label}
        </button>
      ))}
      <button
        onClick={onOpenSlashCommands}
        className="px-3 py-1.5 rounded-lg text-sm font-medium bg-muzzle-bg text-muzzle-text hover:bg-muzzle-border"
      >
        /
      </button>
      <button
        onClick={() => setShowInput(!showInput)}
        className="px-3 py-1.5 rounded-lg text-sm font-medium bg-muzzle-bg text-muzzle-text hover:bg-muzzle-border"
      >
        ⌨
      </button>
      <button
        className="px-3 py-1.5 rounded-lg text-sm font-medium bg-muzzle-bg text-muzzle-text hover:bg-muzzle-border"
      >
        ⚙
      </button>
      {showInput && (
        <div className="fixed inset-0 bg-muzzle-bg/80 flex items-center justify-center z-50" onClick={() => setShowInput(false)}>
          <div className="w-full max-w-md p-4" onClick={e => e.stopPropagation()}>
            <input
              type="text"
              value={customCmd}
              onChange={(e) => setCustomCmd(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && customCmd) {
                  onCommand(customCmd + '\n');
                  setCustomCmd('');
                  setShowInput(false);
                }
              }}
              placeholder="Enter command..."
              className="w-full px-4 py-3 bg-muzzle-surface border border-muzzle-border rounded-lg text-muzzle-text focus:outline-none focus:border-muzzle-accent"
              autoFocus
            />
          </div>
        </div>
      )}
    </div>
  );
}
```

**Step 2: Create apps/web/src/components/SlashCommandsPopup.tsx**
```typescript
'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';

interface CLIProfile {
  name: string;
  commands: string[];
}

interface SlashCommandsPopupProps {
  onSelect: (cmd: string) => void;
  onClose: () => void;
}

export function SlashCommandsPopup({ onSelect, onClose }: SlashCommandsPopupProps) {
  const [profiles, setProfiles] = useState<CLIProfile[]>([]);
  const [filter, setFilter] = useState('');
  
  useEffect(() => {
    api.getCommands().then(setProfiles);
  }, []);
  
  const allCommands = profiles.flatMap(p => p.commands.map(c => ({ cli: p.name, cmd: c })));
  const filtered = allCommands.filter(c => 
    c.cmd.toLowerCase().includes(filter.toLowerCase()) ||
    c.cli.toLowerCase().includes(filter.toLowerCase())
  );
  
  return (
    <div className="fixed inset-0 bg-muzzle-bg/80 flex items-end justify-center z-50" onClick={onClose}>
      <div className="w-full max-w-md bg-muzzle-surface border border-muzzle-border rounded-t-2xl p-4 max-h-[60vh] overflow-hidden" onClick={e => e.stopPropagation()}>
        <input
          type="text"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Search commands..."
          className="w-full px-4 py-3 bg-muzzle-bg border border-muzzle-border rounded-lg text-muzzle-text focus:outline-none focus:border-muzzle-accent mb-4"
          autoFocus
        />
        <div className="overflow-y-auto space-y-1">
          {filtered.map((item, i) => (
            <button
              key={`${item.cli}-${item.cmd}-${i}`}
              onClick={() => { onSelect(`/${item.cmd}`); onClose(); }}
              className="w-full px-4 py-2 text-left rounded-lg hover:bg-muzzle-border flex items-center justify-between"
            >
              <span className="text-muzzle-text">/{item.cmd}</span>
              <span className="text-muzzle-muted text-xs">{item.cli}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
```

**Step 3: Commit**
```bash
git add .
git commit -m "feat: add quick commands bar and slash commands popup"
```

---

## Task 13: Main Page

**Files:**
- Create: `apps/web/src/app/layout.tsx`
- Create: `apps/web/src/app/page.tsx`
- Create: `apps/web/src/app/globals.css`

**Step 1: Create apps/web/src/app directory**
```bash
mkdir -p apps/web/src/app
```

**Step 2: Create apps/web/src/app/globals.css**
```css
@tailwind base;
@tailwind components;
@tailwind utilities;

html, body, #__next {
  height: 100%;
  margin: 0;
  padding: 0;
}

body {
  background-color: #0a0a0a;
  color: #e0e0e0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

* {
  box-sizing: border-box;
}
```

**Step 3: Create apps/web/src/app/layout.tsx**
```typescript
import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Muzzle',
  description: 'Mobile terminal multiplexer',
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
```

**Step 4: Create apps/web/src/app/page.tsx**
```typescript
'use client';

import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { LoginForm } from '@/components/LoginForm';
import { SessionManager } from '@/components/SessionManager';
import { Terminal } from '@/components/Terminal';
import { QuickCommands } from '@/components/QuickCommands';
import { SlashCommandsPopup } from '@/components/SlashCommandsPopup';
import { api } from '@/lib/api';

export default function Home() {
  const { isAuthenticated, isLoading, login, logout } = useAuth();
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [ttydUrl, setTtydUrl] = useState<string | null>(null);
  const [showSlashCommands, setShowSlashCommands] = useState(false);
  
  if (isLoading) {
    return <div className="min-h-screen bg-muzzle-bg flex items-center justify-center">Loading...</div>;
  }
  
  if (!isAuthenticated) {
    return <LoginForm onLogin={login} />;
  }
  
  const handleSelectSession = async (id: string) => {
    setActiveSessionId(id);
    const { url } = await api.getSessionAttachUrl(id);
    setTtydUrl(url);
  };
  
  const handleNewSession = async () => {
    const session = await api.createSession();
    setActiveSessionId(session.id);
    const { url } = await api.getSessionAttachUrl(session.id);
    setTtydUrl(url);
  };
  
  const handleCommand = (cmd: string) => {
    // Send command to terminal
    console.log('Command:', cmd);
  };
  
  return (
    <div className="h-screen flex flex-col bg-muzzle-bg">
      <SessionManager
        activeSessionId={activeSessionId}
        onSelectSession={handleSelectSession}
        onNewSession={handleNewSession}
      />
      <Terminal sessionTtydUrl={ttydUrl} />
      <QuickCommands
        onCommand={handleCommand}
        onOpenSlashCommands={() => setShowSlashCommands(true)}
      />
      {showSlashCommands && (
        <SlashCommandsPopup
          onSelect={handleCommand}
          onClose={() => setShowSlashCommands(false)}
        />
      )}
    </div>
  );
}
```

**Step 5: Commit**
```bash
git add .
git commit -m "feat: add main page layout"
```

---

## Task 14: Root Package and Scripts

**Files:**
- Modify: `package.json`
- Create: `docker-compose.yml`
- Create: `.env.example`

**Step 1: Update root package.json**
```json
{
  "name": "muzzle",
  "version": "0.1.0",
  "private": true,
  "workspaces": ["apps/*", "packages/*"],
  "scripts": {
    "dev": "turbo run dev",
    "build": "turbo run build",
    "start": "turbo run start",
    "lint": "turbo run lint"
  },
  "devDependencies": {
    "turbo": "^2.0.0",
    "typescript": "^5.3.0"
  }
}
```

**Step 2: Create .env.example**
```
MUZZLE_PASSWORD=your-secure-password
JWT_SECRET=your-jwt-secret
PORT=3001
```

**Step 3: Create docker-compose.yml**
```yaml
version: '3.8'
services:
  muzzle:
    build: .
    ports:
      - "3000:3000"
      - "3001:3001"
    environment:
      - MUZZLE_PASSWORD=${MUZZLE_PASSWORD}
      - JWT_SECRET=${JWT_SECRET}
    volumes:
      - ~/.config/muzzle:/root/.config/muzzle
    restart: unless-stopped
```

**Step 4: Install root dependencies**
```bash
npm install
```

**Step 5: Commit**
```bash
git add .
git commit -m "feat: add root package config and docker"
```

---

## Task 15: README and Documentation

**Files:**
- Create: `README.md`

**Step 1: Create README.md**
```markdown
# Muzzle

Mobile-first remote terminal multiplexer for CLI clients (Claude, Qwen, Gemini, OpenCode).

## Features

- Session persistence via tmux
- Mobile-optimized UI with touch support
- Quick command bar (Ctrl+C, Ctrl+D, etc.)
- Slash commands for CLI clients
- JWT authentication
- Tailscale integration

## Quick Start

```bash
# Install dependencies
npm install

# Build
npm run build

# Start
MUZZLE_PASSWORD=your-password npm start
```

## Requirements

- Node.js 20+
- tmux
- ttyd

## Configuration

Edit `~/.config/muzzle/commands.yaml` to customize slash commands.
```

**Step 2: Commit**
```bash
git add .
git commit -m "docs: add README"
```

---

## Summary

This implementation plan covers:
1. Monorepo setup with Turborepo
2. Shared types package
3. Express backend with auth, sessions, commands
4. ttyd integration for terminal streaming
5. tmux session persistence
6. Next.js frontend with xterm.js
7. Session manager UI
8. Quick commands bar
9. Slash commands popup

Run `npm run dev` to start development.
