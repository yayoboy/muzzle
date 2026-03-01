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

export interface SlashCommand {
  name: string;
  command: string;
}

export interface CLIProfile {
  name: string;
  detect: string;
  commands: string[];
}

export interface DiagnosticsResponse {
  hostname: string;
  ip: string;
  ram: { used: number; total: number };
  uptime: number;
  cpus: { count: number; model: string };
}