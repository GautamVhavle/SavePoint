import { ImageResponse } from '@vercel/og';

export const runtime = 'edge';

interface ProfilePayload {
  profile: { handle: string; display_name: string; bio: string | null };
  rig: { hero_photo_url: string | null } | null;
  games: Array<{ game: { cover_url: string | null }; hours_played: number | null }>;
}

const API_URL = process.env.SAVEPOINT_API_URL?.replace(/\/$/, '') ?? '';

/** 1200x630 share card rendered per profile (plan §3.5). */
export default async function handler(req: Request): Promise<Response> {
  const handle = new URL(req.url).searchParams.get('handle')?.replace(/[^a-z0-9_-]/gi, '').toLowerCase() ?? '';
  let data: ProfilePayload | null = null;
  if (API_URL && handle) {
    try {
      const response = await fetch(`${API_URL}/profiles/${encodeURIComponent(handle)}`, {
        signal: AbortSignal.timeout(4000),
      });
      data = response.ok ? ((await response.json()) as ProfilePayload) : null;
    } catch {
      data = null;
    }
  }

  const name = data?.profile.display_name ?? 'SavePoint';
  const handleLine = data ? `@${data.profile.handle}` : 'Your gaming legacy';
  const bio = (data?.profile.bio ?? '').slice(0, 90);
  const games = data?.games.length ?? 0;
  const hours = Math.round(data?.games.reduce((sum, game) => sum + (game.hours_played ?? 0), 0) ?? 0);
  const cover =
    data?.games.find(game => game.game.cover_url)?.game.cover_url ?? null;

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%', height: '100%', display: 'flex', color: '#F5F7FB',
          background: 'linear-gradient(120deg, #080A0F 0%, #101628 55%, #1A1233 100%)',
          padding: 64, position: 'relative',
        }}
      >
        <div style={{ position: 'absolute', top: -160, right: -120, width: 480, height: 480, borderRadius: 999, background: 'radial-gradient(circle, rgba(88,232,255,0.22), transparent 65%)' }} />
        <div style={{ position: 'absolute', bottom: -180, left: 140, width: 520, height: 520, borderRadius: 999, background: 'radial-gradient(circle, rgba(167,139,250,0.20), transparent 65%)' }} />
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', flex: 1, paddingRight: cover ? 48 : 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
            <div style={{ width: 56, height: 56, borderRadius: 18, background: 'rgba(88,232,255,0.14)', border: '2px solid rgba(88,232,255,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 30 }}>▶</div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: 26, letterSpacing: 6, color: '#58E8FF' }}>SAVEPOINT</span>
              <span style={{ fontSize: 24, color: '#8B93A7' }}>{handleLine}</span>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div style={{ fontSize: name.length > 16 ? 68 : 88, fontWeight: 700, lineHeight: 1 }}>{name}</div>
            {bio ? <div style={{ fontSize: 30, color: '#B2BAC9', lineHeight: 1.4 }}>{bio}</div> : null}
            <div style={{ display: 'flex', gap: 16 }}>
              {[['GAMES', String(games)], ['HOURS', String(hours)]].map(([label, value]) => (
                <div key={label} style={{ display: 'flex', alignItems: 'baseline', gap: 12, padding: '14px 26px', borderRadius: 18, border: '2px solid rgba(255,255,255,0.14)', background: 'rgba(17,21,31,0.72)' }}>
                  <span style={{ fontSize: 44, fontWeight: 700 }}>{value}</span>
                  <span style={{ fontSize: 22, letterSpacing: 4, color: '#7F899A' }}>{label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
        {cover ? (
          <img
            src={cover} width={420} height={560}
            style={{ borderRadius: 32, border: '2px solid rgba(255,255,255,0.16)', objectFit: 'cover', alignSelf: 'center' }}
          />
        ) : null}
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
