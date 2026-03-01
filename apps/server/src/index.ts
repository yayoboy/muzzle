import 'dotenv/config';
import { createApp } from './app';
import { log } from './logger';

const required = ['JWT_SECRET', 'MUZZLE_PASSWORD'] as const;
for (const key of required) {
  if (!process.env[key]) {
    console.error(`Error: ${key} environment variable is required`);
    process.exit(1);
  }
}

const PORT = process.env.PORT || 3001;
createApp().listen(PORT, () => log.startup(PORT, process.cwd()));
