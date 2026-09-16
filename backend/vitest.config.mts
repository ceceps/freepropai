import { defineConfig } from 'vitest/config';
import fs from 'node:fs';
import dotenv from 'dotenv';

const testLocalEnv = fs.existsSync('.env.test.local')
  ? dotenv.parse(fs.readFileSync('.env.test.local'))
  : {};

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    env: {
      NODE_ENV: 'test',
      ...testLocalEnv,
    },
    fileParallelism: false,
    testTimeout: 10000,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
    },
    setupFiles: ['./src/__tests__/setup.ts'],
  },
});
