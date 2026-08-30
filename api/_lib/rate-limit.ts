import { createHmac } from 'node:crypto';
import type { Context } from 'hono';
import { getEnv } from './env.js';
import { HttpError } from './errors.js';
import { prisma } from './prisma.js';

/**
 * Vercel's proxy rewrites x-forwarded-for, so the left-most entry is the real
 * client. Falling back to a constant keeps the limiter closed rather than open.
 */
export function clientIp(c: Context): string {
  const forwarded = c.req.header('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return c.req.header('x-real-ip')?.trim() || 'unknown';
}

function hashIp(ip: string): string {
  return createHmac('sha256', getEnv().ipHashSecret).update(ip).digest('hex').slice(0, 64);
}

/**
 * Sliding window counted in Postgres: stateless functions cannot hold counters
 * in memory, and the row churn is bounded by the per-request stale-row sweep.
 */
export async function enforceScopeLimit(
  c: Context,
  scope: string,
  profileId: string,
  limit: number,
): Promise<void> {
  const env = getEnv();
  const windowMs = env.guideRateWindowSeconds * 1000;
  const now = new Date();
  const windowStart = new Date(now.getTime() - windowMs);
  const ipHash = hashIp(clientIp(c));

  await prisma.rateLimitEvent.deleteMany({ where: { createdAt: { lt: windowStart } } });

  const where = { scope, profileId, ipHash, createdAt: { gte: windowStart } };
  const used = await prisma.rateLimitEvent.count({ where });
  if (used >= limit) {
    const oldest = await prisma.rateLimitEvent.findFirst({ where, orderBy: { createdAt: 'asc' } });
    const elapsed = oldest ? now.getTime() - oldest.createdAt.getTime() : 0;
    const retryAfter = Math.max(1, Math.ceil((windowMs - elapsed) / 1000));
    throw new HttpError(429, 'Rate limit exceeded. Try again later.', {
      'Retry-After': String(retryAfter),
    });
  }

  await prisma.rateLimitEvent.create({ data: { scope, profileId, ipHash } });
}

export function enforceGuideLimit(c: Context, profileId: string): Promise<void> {
  return enforceScopeLimit(c, 'guide', profileId, getEnv().guideRateLimit);
}
