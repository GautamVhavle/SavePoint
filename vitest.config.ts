import { config as loadEnv } from 'dotenv';
import { defineConfig, type Plugin } from 'vitest/config';

loadEnv({ path: ['.env.local', '.env'], quiet: true });

/**
 * The API uses ESM-correct ".js" specifiers that point at ".ts" sources, which
 * is what Node and esbuild expect. Vite resolves extensionless paths instead,
 * so the extension is dropped before its resolver runs.
 */
const tsSpecifiers: Plugin = {
  name: 'savepoint:ts-specifiers',
  enforce: 'pre',
  resolveId(source, importer, options) {
    if (!importer || !source.startsWith('.') || !source.endsWith('.js')) return null;
    return this.resolve(source.slice(0, -3), importer, { ...options, skipSelf: true });
  },
};

export default defineConfig({
  plugins: [tsSpecifiers],
  test: {
    include: ['api/**/*.test.ts'],
    environment: 'node',
    // Suites share one Neon database, so they must not interleave writes.
    fileParallelism: false,
    testTimeout: 30_000,
    env: {
      APP_ENV: 'test',
      DEV_AUTH_BYPASS: 'true',
      IP_HASH_SECRET: 'test-only-ip-hash-secret-value-0123456789',
    },
  },
});
