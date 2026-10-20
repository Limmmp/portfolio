import { defineConfig } from 'vite';

export default defineConfig({
  server: { port: 4180, open: false },
  build: {
    target: 'es2020',
    assetsInlineLimit: 2048,
  },
});
