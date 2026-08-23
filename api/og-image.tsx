interface ProfilePayload {
  profile: { handle: string; display_name: string; bio: string | null };
  rig: { hero_photo_url: string | null } | null;
  games: Array<{ game: { cover_url: string | null }; hours_played: number | null }>;
}

const API_URL = process.env.SAVEPOINT_API_URL?.replace(/\/$/, '') ?? '';
const FALLBACK = '/og-card.png';

/**
 * 1200x630 share card. Dynamic generation needs SAVEPOINT_API_URL; until the
 * FastAPI service is live (or if generation fails for any reason) we serve the
 * branded static card so shared links never break.
 */
async function dynamicCard(handle: string): Promise<Response | null> {
  if (!API_URL || !handle) return null;
  let data: ProfilePayload;
  try {
    const response = await fetch(`${API_URL}/profiles/${encodeURIComponent(handle)}`, {
      signal: AbortSignal.timeout(4000),
    });
    if (!response.ok) return null;
    data = (await response.json()) as ProfilePayload;
  } catch {
    return null;
  }

  try {
    // Dynamic import keeps the satori/wasm bundle off the critical path, so a
    // tracing failure degrades to the static card instead of a 500.
    const { ImageResponse } = await import('@vercel/og');
    const name = data.profile.display_name;
    const bio = (data.profile.bio ?? '').slice(0, 90);
    const games = data.games.length;
    const hours = Math.round(data.games.reduce((sum, g) => sum + (g.hours_played ?? 0), 0));
    const cover = data.games.find(game => game.game.cover_url)?.game.cover_url ?? null;
    return new ImageResponse(
      (
        <div
          style={{
            width: '100%', height: '100%', display: 'flex', color: '#F5F7FB',
            background: 'linear-gradient(120deg, #080A0F 0%, #101628 55%, #1A1233 100%)',
            padding: 64,
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
              <div style={{ width: 56, height: 56, borderRadius: 18, background: 'rgba(88,232,255,0.14)', border: '2px solid rgba(88,232,255,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 30 }}>▶</div>
              <div>
                <div style={{ fontSize: 26, letterSpacing: 8, color: '#58E8FF', fontWeight: 700 }}>SAVEPOINT</div>
                <div style={{ fontSize: 22, color: '#8B93A7', marginTop: 6 }}>@{data.profile.handle}</div>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ fontSize: name.length > 16 ? 64 : 84, fontWeight: 800, lineHeight: 1 }}>{name}</div>
              {bio ? <div style={{ fontSize: 28, color: '#B2BAC9' }}>{bio}</div> : null}
              <div style={{ display: 'flex', gap: 14 }}>
                {[['GAMES', String(games)], ['HOURS', String(hours)]].map(([label, value]) => (
                  <div key={label} style={{ display: 'flex', alignItems: 'baseline', gap: 10, padding: '12px 24px', borderRadius: 16, border: '2px solid rgba(255,255,255,0.14)', background: 'rgba(17,21,31,0.72)' }}>
                    <span style={{ fontSize: 40, fontWeight: 700 }}>{value}</span>
                    <span style={{ fontSize: 20, letterSpacing: 4, color: '#7F899A' }}>{label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          {cover ? (
            <img src={cover} width={380} height={502} alt="" style={{ borderRadius: 28, border: '2px solid rgba(255,255,255,0.16)', objectFit: 'cover', alignSelf: 'center', marginLeft: 40 }} />
          ) : null}
        </div>
      ),
      { width: 1200, height: 630 },
    );
  } catch {
    return null;
  }
}

/** 1200x630 share card endpoint (plan §3.5). */
export default async function handler(req: Request): Promise<Response> {
  const handle = new URL(req.url).searchParams.get('handle')?.replace(/[^a-z0-9_-]/gi, '').toLowerCase() ?? '';
  const card = await dynamicCard(handle);
  if (card) return card;
  return new Response(null, {
    status: 302,
    headers: { Location: FALLBACK, 'Cache-Control': 'public, max-age=300' },
  });
}
