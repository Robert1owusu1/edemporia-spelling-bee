// Vitest config — deliberately separate from vite.config.ts so this file and
// vite.config.ts can be edited independently (another agent owns vite.config.ts).
// Because vitest.config.ts exists, Vitest uses THIS file and ignores the
// `test` key vite.config.ts would otherwise provide, so the `@` alias and the
// frontend file scope are repeated here.

import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('.', import.meta.url)),
    },
  },
  test: {
    // Pure-module unit tests only for now — no jsdom / DOM testing stack.
    environment: 'node',
    // Frontend only: backend is CommonJS with its own e2e runner (test:e2e).
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    exclude: ['**/node_modules/**', 'dist/**', 'backend/**'],
  },
});
