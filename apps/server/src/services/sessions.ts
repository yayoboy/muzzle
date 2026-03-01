import { v4 as uuidv4 } from 'uuid';
import { ChildProcess } from 'child_process';
import { createTmuxSession, killTmuxSession, sendTmuxKeys } from './tmux';
import { startTtyd } from './ttyd';
import { Session, SessionResponse } from '@muzzle/shared';

const SESSIONS: Map<string, Session> = new Map();
const TTYD_PROCESSES: Map<string, ChildProcess> = new Map();
const PORT_START = 7680;

function getNextAvailablePort(): number {
  const usedPorts = new Set(Array.from(SESSIONS.values()).map(s => s.ttydPort));
  let port = PORT_START;
  while (usedPorts.has(port)) {
    port++;
  }
  return port;
}

export class SessionManager {
  static async createSession(name?: string): Promise<SessionResponse> {
    const id = uuidv4();
    const tmuxSession = `muzzle-${id}`;
    const port = getNextAvailablePort();

    await createTmuxSession(tmuxSession);
    const ttydProcess = await startTtyd(tmuxSession, port);

    const session: Session = {
      id,
      name: name || `Session ${SESSIONS.size + 1}`,
      tmuxSession,
      ttydPort: port,
      createdAt: new Date(),
      lastActivity: new Date()
    };

    SESSIONS.set(id, session);
    TTYD_PROCESSES.set(id, ttydProcess);

    ttydProcess.on('close', () => {
      console.log(`ttyd process for session ${id} closed`);
    });

    return {
      id,
      name: session.name,
      status: 'connected',
      createdAt: session.createdAt.toISOString()
    };
  }

  static async getSession(id: string): Promise<Session> {
    const session = SESSIONS.get(id);
    if (!session) throw new Error('Session not found');
    return session;
  }

  static async deleteSession(id: string): Promise<void> {
    const session = SESSIONS.get(id);
    if (!session) throw new Error('Session not found');

    const ttydProcess = TTYD_PROCESSES.get(id);
    if (ttydProcess) {
      ttydProcess.kill();
      TTYD_PROCESSES.delete(id);
    }

    await killTmuxSession(session.tmuxSession).catch(console.error);
    SESSIONS.delete(id);
  }

  static async listSessions(): Promise<SessionResponse[]> {
    return Array.from(SESSIONS.values()).map(s => ({
      id: s.id,
      name: s.name,
      status: 'connected',
      createdAt: s.createdAt.toISOString()
    }));
  }

  static async getSessionAttachUrl(id: string): Promise<{ url: string }> {
    const session = SESSIONS.get(id);
    if (!session) throw new Error('Session not found');
    return {
      url: `http://localhost:${session.ttydPort}`
    };
  }

  static async sendCommand(id: string, command: string): Promise<void> {
    const session = SESSIONS.get(id);
    if (!session) throw new Error('Session not found');
    await sendTmuxKeys(session.tmuxSession, command);
  }
}