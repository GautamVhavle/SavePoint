import path from 'node:path';
import { config as loadEnv } from 'dotenv';
import { defineConfig } from 'prisma/config';

// Vercel injects env vars directly; locally they come from the CLI-managed
// .env.local that `vercel env pull` writes.
loadEnv({ path: ['.env.local', '.env'], quiet: true });

export default defineConfig({
  schema: path.join('prisma', 'schema.prisma'),
  migrations: {
    path: path.join('prisma', 'migrations'),
    seed: 'tsx prisma/seed.ts',
  },
  datasource: {
    // CLI-only connection. Migrations take advisory locks and run DDL, so they
    // use Neon's direct endpoint; the runtime client uses the pooled URL.
    url: process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL ?? '',
  },
});
