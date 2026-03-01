import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/app/**/*.{js,ts,jsx,tsx}',
    './src/components/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        'muzzle-bg':         '#0a0a0a',
        'muzzle-surface':    '#111111',
        'muzzle-surface2':   '#161616',
        'muzzle-border':     '#1e1e1e',
        'muzzle-border2':    '#2a2a2a',
        'muzzle-text':       '#e0e0e0',
        'muzzle-muted':      '#4a4a4a',
        'muzzle-muted2':     '#666666',
        'muzzle-accent':     '#00ff88',
        'muzzle-accent-dim': '#00cc66',
      },
      fontFamily: {
        mono: ['Menlo', 'Monaco', '"Courier New"', 'monospace'],
      },
    },
  },
  plugins: [],
};

export default config;
