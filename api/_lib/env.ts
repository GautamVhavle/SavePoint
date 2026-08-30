import { z } from 'zod';

/**
 * Hard ceiling for any JSON request body, enforced before and after decoding.
 * Sized for the largest legitimate payload (an IGDB snapshot) with room to spare.
 */
export const MAX_BODY_BYTES = 256 * 1024;

/**
 * Vercel exposes VERCEL_ENV (production | preview | development). APP_ENV lets
 * tests and local runs override it without pretending to be a Vercel build.
 */
function resolveEnvironment(): 'development' | 'test' | 'staging' | 'production' {
  const explicit = process.env.APP_ENV ?? process.env.ENVIRONMENT;
  if (explicit === 'development' || explicit === 'test' || explicit === 'staging' || explicit === 'production') {
    return explicit;
  }
  if (process.env.NODE_ENV === 'test') return 'test';
  if (process.env.VERCEL_ENV === 'production') return 'production';
  if (process.env.VERCEL_ENV === 'preview') return 'staging';
  return 'development';
}

const bool = (value: string | undefined, fallback = false) =>
  value === undefined || value === '' ? fallback : ['1', 'true', 'yes', 'on'].includes(value.toLowerCase());

const int = (value: string | undefined, fallback: number) => {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const schema = z.object({
  environment: z.enum(['development', 'test', 'staging', 'production']),
  databaseUrl: z.string(),
  auth0Domain: z.string(),
  auth0Audience: z.string(),
  auth0Algorithms: z.array(z.string()).min(1),
  devAuthBypass: z.boolean(),
  devAuthSub: z.string(),
  twitchClientId: z.string(),
  twitchClientSecret: z.string(),
  twitchUserToken: z.string(),
  geminiApiKey: z.string(),
  geminiModel: z.string(),
  blobToken: z.string(),
  ipHashSecret: z.string().min(32),
  guideRateLimit: z.number().int().min(1).max(1000),
  guideRateWindowSeconds: z.number().int().min(60).max(86400),
  igdbRateLimit: z.number().int().min(1).max(10000),
  uploadRateLimit: z.number().int().min(1).max(1000),
  maxUploadBytes: z.number().int().min(1).max(100 * 1024 * 1024),
  siteUrl: z.string(),
});

export type Env = z.infer<typeof schema>;

let cached: Env | undefined;

export function getEnv(): Env {
  if (cached) return cached;
  const environment = resolveEnvironment();
  const parsed = schema.parse({
    environment,
    databaseUrl: process.env.DATABASE_URL ?? '',
    auth0Domain: (process.env.AUTH0_DOMAIN ?? '').replace(/\/$/, ''),
    auth0Audience: process.env.AUTH0_AUDIENCE ?? '',
    auth0Algorithms: (process.env.AUTH0_ALGORITHMS ?? 'RS256').split(',').map(v => v.trim()).filter(Boolean),
    devAuthBypass: bool(process.env.DEV_AUTH_BYPASS),
    devAuthSub: process.env.DEV_AUTH_SUB ?? 'auth0|local-developer',
    twitchClientId: process.env.TWITCH_CLIENT_ID ?? '',
    twitchClientSecret: process.env.TWITCH_CLIENT_SECRET ?? '',
    twitchUserToken: process.env.TWITCH_USER_TOKEN ?? '',
    geminiApiKey: process.env.GEMINI_API_KEY ?? '',
    geminiModel: process.env.GEMINI_MODEL ?? 'gemini-2.0-flash',
    blobToken: process.env.BLOB_READ_WRITE_TOKEN ?? '',
    ipHashSecret: process.env.IP_HASH_SECRET || 'development-only-ip-hash-secret-change-me',
    guideRateLimit: int(process.env.GUIDE_RATE_LIMIT, 10),
    guideRateWindowSeconds: int(process.env.GUIDE_RATE_WINDOW_SECONDS, 3600),
    igdbRateLimit: int(process.env.IGDB_RATE_LIMIT, 60),
    uploadRateLimit: int(process.env.UPLOAD_RATE_LIMIT, 30),
    maxUploadBytes: int(process.env.MAX_UPLOAD_BYTES, 10 * 1024 * 1024),
    siteUrl: (process.env.SITE_URL ?? 'https://savepointarchive.vercel.app').replace(/\/$/, ''),
  });

  // Guardrails that must never be silently downgraded on a live deployment.
  if (parsed.environment === 'staging' || parsed.environment === 'production') {
    if (parsed.devAuthBypass) throw new Error('DEV_AUTH_BYPASS is forbidden outside development/test');
    if (parsed.ipHashSecret.includes('development-only')) {
      throw new Error('IP_HASH_SECRET must be set to a unique value outside development');
    }
  }

  cached = parsed;
  return cached;
}

/** Test-only hook so suites can mutate process.env between cases. */
export function resetEnvCache(): void {
  cached = undefined;
}

export const auth0Issuer = (env: Env) => `https://${env.auth0Domain}/`;
