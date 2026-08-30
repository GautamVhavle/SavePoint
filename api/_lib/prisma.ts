import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from './generated/prisma/client.js';

/**
 * Serverless invocations reuse a warm Node process, so the client is cached on
 * globalThis to avoid opening a fresh Postgres pool per request.
 */
const globalForPrisma = globalThis as unknown as { savepointPrisma?: PrismaClient };

/**
 * `sslmode=require` only guarantees encryption, not that the server is really
 * Neon. Pinning `verify-full` keeps certificate and hostname validation on even
 * after node-postgres changes its default to libpq semantics. A URL with no
 * `sslmode` at all is left alone so plaintext local databases still connect.
 */
function requireVerifiedTls(connectionString: string): string {
  const url = new URL(connectionString);
  const mode = url.searchParams.get('sslmode');
  if (mode === 'require' || mode === 'prefer' || mode === 'verify-ca') {
    url.searchParams.set('sslmode', 'verify-full');
  }
  return url.toString();
}

function createClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error('DATABASE_URL is not configured');
  return new PrismaClient({
    // One connection per lambda: Neon's pooler multiplexes across instances.
    adapter: new PrismaPg({ connectionString: requireVerifiedTls(connectionString), max: 1 }),
    log: process.env.PRISMA_LOG === 'query' ? ['query', 'warn', 'error'] : ['warn', 'error'],
  });
}

export const prisma: PrismaClient = globalForPrisma.savepointPrisma ?? createClient();
globalForPrisma.savepointPrisma = prisma;
