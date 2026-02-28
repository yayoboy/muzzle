import { defineConfig } from 'tailwindcss';
export default defineConfig({
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx}',
    './src/components/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        'muzzle-bg': '#0a0a0a',
        'muzzle-surface': '#1a1a1a',
        'muzzle-border': '#2a2a2a',
        'muzzle-text': '#e0e0e0',
        'muzzle-accent': '#007acc',
      },
    },
  },
});