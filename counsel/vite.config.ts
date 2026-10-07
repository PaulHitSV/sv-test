import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test-setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    // Node 25+ ships its own localStorage, which shadows jsdom's in tests.
    execArgv: ['--no-experimental-webstorage'],
  },
});
