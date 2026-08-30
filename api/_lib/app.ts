import { randomUUID } from 'node:crypto';
import { Hono } from 'hono';
import { getEnv, MAX_BODY_BYTES } from './env.js';
import { problem, toResponse } from './errors.js';
import { awardRoutes } from './routes/awards.js';
import { gameRoutes } from './routes/games.js';
import { meRoutes } from './routes/me.js';
import { publicRoutes } from './routes/public.js';
import { uploadRoutes } from './routes/uploads.js';

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH']);

export function createApp(): Hono {
  const app = new Hono().basePath('/api/v1');

  app.use('*', async (c, next) => {
    // Echoing a request id makes a client-reported failure traceable in logs
    // without exposing anything about the infrastructure that served it.
    const requestId = c.req.header('x-request-id')?.slice(0, 64) || randomUUID();

    await next();

    c.header('X-Request-ID', requestId);
    c.header('X-Content-Type-Options', 'nosniff');
    c.header('X-Frame-Options', 'DENY');
    c.header('Cross-Origin-Opener-Policy', 'same-origin');
    c.header('Cross-Origin-Resource-Policy', 'same-origin');
    c.header('Referrer-Policy', 'no-referrer');
    c.header('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), interest-cohort=()');

    if (getEnv().environment !== 'development') {
      c.header('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
    }
    // Authenticated and third-party-backed responses must never reach a shared cache.
    const path = c.req.path;
    if (path.includes('/me/') || path.includes('/igdb/') || path.endsWith('/guide')) {
      c.header('Cache-Control', 'private, no-store');
    }
  });

  app.use('*', async (c, next) => {
    if (MUTATING_METHODS.has(c.req.method)) {
      const contentType = c.req.header('content-type')?.split(';')[0].trim().toLowerCase();
      if (contentType !== 'application/json') {
        return problem(c, 415, 'Request body must be application/json');
      }
      // Fast path only: a chunked request carries no Content-Length, so the
      // authoritative ceiling is enforced against the decoded body in `body()`.
      const declared = Number(c.req.header('content-length') ?? '0');
      if (Number.isFinite(declared) && declared > MAX_BODY_BYTES) {
        return problem(c, 413, 'Request body is too large');
      }
    }
    return next();
  });

  app.route('/', publicRoutes);
  app.route('/', meRoutes);
  app.route('/', gameRoutes);
  app.route('/', awardRoutes);
  app.route('/', uploadRoutes);

  app.notFound(c => problem(c, 404, 'That endpoint does not exist'));
  app.onError((error, c) => toResponse(c, error));

  return app;
}
