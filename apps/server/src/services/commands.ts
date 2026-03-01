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
