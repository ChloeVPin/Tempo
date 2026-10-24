import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  root: '.',
  server: {
    host: '127.0.0.1',
    port: 3100,
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@chloevpin/tempo/format': fileURLToPath(new URL('../dist/format/index.js', import.meta.url)),
      '@chloevpin/tempo/compat/moment': fileURLToPath(new URL('../dist/compat/moment/index.js', import.meta.url)),
      '@chloevpin/tempo': fileURLToPath(new URL('../dist/index.js', import.meta.url)),
    },
  },
});
