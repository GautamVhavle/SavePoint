interface ProfilePayload {
  profile: { handle: string; display_name: string };
  rig: { hero_photo_url: string | null } | null;
  games: Array<{ game: { cover_url: string | null }; featured: boolean }>;
}

const API_URL = process.env.SAVEPOINT_API_URL?.replace(/\/$/, '') ?? '';
const FALLBACK = '/og-card.png';

/**
 * 1200x630 share-card endpoint.
 *
 * Today it redirects to the best available artwork: the profile's hero or
 * featured game cover once SAVEPOINT_API_URL points at the FastAPI service,
 * otherwise the branded static card. Per-profile rendered typography cards
 * (satori/edge runtime) are tracked in the README roadmap and will replace
 * the redirect target once the function runtime supports the WASM bundle.
 */
async function bestArtwork(handle: string): Promise<string | null> {
  if (!API_URL || !handle) return null;
  try {
    const response = await fetch(`${API_URL}/profiles/${encodeURIComponent(handle)}`, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(4000),
    });
    if (!response.ok) return null;
    const data = (await response.json()) as ProfilePayload;
    const featured =
      data.games.find(game => game.featured)?.game.cover_url ?? data.games[0]?.game.cover_url ?? null;
    return data.rig?.hero_photo_url ?? featured;
  } catch {
    return null;
  }
}

export default async function handler(req: Request): Promise<Response> {
  // req.url can arrive without an origin on some Vercel routings; a base
  // keeps new URL() from throwing before query parsing.
  const handle = new URL(req.url, 'https://savepointarchive.vercel.app').searchParams.get('handle')?.replace(/[^a-z0-9_-]/gi, '').toLowerCase() ?? '';
  const artwork = await bestArtwork(handle);
  const target = artwork ?? FALLBACK;
  return new Response(null, {
    status: 302,
    headers: { Location: target, 'Cache-Control': 'public, max-age=300' },
  });
}
