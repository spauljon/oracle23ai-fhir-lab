import { defineConfig } from 'vitest/config';
import * as path from 'node:path';

export default defineConfig({
  test: {
    testTimeout: 600000,
    environment: 'node',
    globals: true,
    silent: false,
    reporters: ['verbose'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
    },
    env: {
      EMBEDDINGS_DISABLED: 'true'
    },

  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@consumer': path.resolve(__dirname, './src/consumer'),
      '@handler': path.resolve(__dirname, './src/consumer/handler'),
      '@test': path.resolve(__dirname, './src/__tests__'),
    },
  },
});
