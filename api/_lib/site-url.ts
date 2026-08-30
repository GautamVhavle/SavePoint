/**
 * Base URL for the public API. The OG-card and bot-HTML functions live in the
 * same deployment as the API, so they resolve it from Vercel's own environment
 * instead of a hand-maintained variable that can drift per environment.
 *
 * The stable production domain is preferred over `VERCEL_URL` because preview
 * deployment URLs sit behind deployment protection and would reject a self-call.
 */
export function apiBaseUrl(): string {
  const explicit = process.env.SAVEPOINT_API_URL?.replace(/\/$/, '');
  if (explicit) return explicit;

  const host =
    process.env.VERCEL_PROJECT_PRODUCTION_URL ??
    process.env.SITE_URL?.replace(/^https?:\/\//, '').replace(/\/$/, '') ??
    process.env.VERCEL_URL;
  return host ? `https://${host}/api/v1` : '';
}
