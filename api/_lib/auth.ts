import type { Context } from 'hono';
import { createRemoteJWKSet, jwtVerify, type JWTPayload, type JWTVerifyGetKey } from 'jose';
import { auth0Issuer, getEnv, type Env } from './env.js';
import { HttpError } from './errors.js';

export interface Principal {
  subject: string;
  claims: JWTPayload & Record<string, unknown>;
}

/**
 * `jose` refreshes and caches the JWKS internally, so one set per issuer kept on
 * the module scope survives warm invocations without a hand-rolled cache.
 */
const jwksCache = new Map<string, JWTVerifyGetKey>();

function jwks(env: Env): JWTVerifyGetKey {
  const url = `${auth0Issuer(env)}.well-known/jwks.json`;
  let existing = jwksCache.get(url);
  if (!existing) {
    existing = createRemoteJWKSet(new URL(url), { cacheMaxAge: 3_600_000, timeoutDuration: 5_000 });
    jwksCache.set(url, existing);
  }
  return existing;
}

async function verifyBearer(token: string, env: Env): Promise<Principal> {
  if (!env.auth0Domain || !env.auth0Audience) {
    throw new HttpError(503, 'Identity provider is not configured');
  }
  let payload: JWTPayload;
  try {
    ({ payload } = await jwtVerify(token, jwks(env), {
      issuer: auth0Issuer(env),
      audience: env.auth0Audience,
      algorithms: env.auth0Algorithms,
      requiredClaims: ['exp', 'iat', 'iss', 'aud', 'sub'],
    }));
  } catch (error) {
    const code = (error as { code?: string }).code;
    // Key-set fetch problems are the provider's fault, not the caller's.
    if (code === 'ERR_JWKS_TIMEOUT' || code === 'ERR_JWKS_NO_MATCHING_KEY') {
      throw new HttpError(503, 'Identity provider is unavailable');
    }
    throw new HttpError(401, 'Invalid or expired credentials');
  }
  const subject = payload.sub ?? '';
  if (!subject || subject.length > 255) throw new HttpError(401, 'Invalid or expired credentials');
  return { subject, claims: payload as Principal['claims'] };
}

export async function currentPrincipal(c: Context): Promise<Principal> {
  const env = getEnv();

  if (env.devAuthBypass) {
    if (env.environment !== 'development' && env.environment !== 'test') {
      throw new HttpError(500, 'Development auth bypass is misconfigured');
    }
    const subject = c.req.header('x-dev-auth-sub')?.trim() || env.devAuthSub;
    if (!subject || subject.length > 255) throw new HttpError(401, 'Invalid development subject');
    return { subject, claims: { sub: subject, dev_bypass: true } };
  }

  const header = c.req.header('authorization') ?? '';
  if (!header.toLowerCase().startsWith('bearer ')) {
    throw new HttpError(401, 'Sign in to continue', { 'WWW-Authenticate': 'Bearer' });
  }
  const token = header.slice(7).trim();
  if (!token) throw new HttpError(401, 'Sign in to continue', { 'WWW-Authenticate': 'Bearer' });
  return verifyBearer(token, env);
}

/** Test seam: lets suites point at a stub key set without a live Auth0 tenant. */
export function __setJwksForTests(url: string, getKey: JWTVerifyGetKey): void {
  jwksCache.set(url, getKey);
}
