/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: './',
  server: {
    port: 5174,
    // the simulator runner lives in ../engine
    fs: { allow: ['..'] },
  },
  worker: { format: 'es' },
  build: { target: 'es2022' },
  test: {
    environment: 'node',
    testTimeout: 60000,
  },
});
