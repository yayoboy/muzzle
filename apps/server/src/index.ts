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
