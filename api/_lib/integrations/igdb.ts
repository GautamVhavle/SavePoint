import { getEnv } from '../env.js';
import { HttpError } from '../errors.js';

const FIELDS =
  'id,name,slug,summary,first_release_date,cover.image_id,' +
  'artworks.image_id,screenshots.image_id,genres.name,platforms.name';

export interface IgdbGame {
  igdb_id: number;
  name: string;
  slug: string;
  summary: string | null;
  cover_url: string | null;
  banner_url: string | null;
  release_date: string | null;
  genres: string[];
  platforms: string[];
  snapshot: Record<string, unknown>;
}

interface IgdbRow {
  id: number;
  name: string;
  slug?: string;
  summary?: string;
  first_release_date?: number;
  cover?: { image_id?: string };
  artworks?: Array<{ image_id?: string }>;
  screenshots?: Array<{ image_id?: string }>;
  genres?: Array<{ name: string }>;
  platforms?: Array<{ name: string }>;
}

// Cached on the module scope so a warm lambda reuses the Twitch token.
let token: { value: string; expiresAt: number } | null = null;
let inFlight: Promise<string> | null = null;

async function fetchAppToken(): Promise<string> {
  const env = getEnv();
  if (env.twitchUserToken) return env.twitchUserToken;
  if (!env.twitchClientId || !env.twitchClientSecret) {
    throw new HttpError(503, 'Game search is not configured');
  }
  const response = await fetch('https://id.twitch.tv/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: env.twitchClientId,
      client_secret: env.twitchClientSecret,
      grant_type: 'client_credentials',
    }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new HttpError(502, 'Game metadata provider rejected the credentials');
  const body = (await response.json()) as { access_token?: string; expires_in?: number };
  if (!body.access_token) throw new HttpError(502, 'Game metadata provider returned no token');
  // 60s of slack keeps an in-flight request from using a token that just expired.
  token = { value: body.access_token, expiresAt: Date.now() + Math.max(60, (body.expires_in ?? 3600) - 60) * 1000 };
  return token.value;
}

async function accessToken(): Promise<string> {
  const env = getEnv();
  if (env.twitchUserToken) return env.twitchUserToken;
  if (token && token.expiresAt > Date.now()) return token.value;
  inFlight ??= fetchAppToken().finally(() => {
    inFlight = null;
  });
  return inFlight;
}

async function query(body: string): Promise<IgdbRow[]> {
  const env = getEnv();
  if (!env.twitchClientId) throw new HttpError(503, 'Game search is not configured');
  const response = await fetch('https://api.igdb.com/v4/games', {
    method: 'POST',
    headers: {
      'Client-ID': env.twitchClientId,
      Authorization: `Bearer ${await accessToken()}`,
      Accept: 'application/json',
      'Content-Type': 'text/plain',
    },
    body,
    signal: AbortSignal.timeout(10_000),
  });
  if (response.status === 401) {
    token = null;
    throw new HttpError(502, 'Game metadata provider rejected the request');
  }
  if (!response.ok) throw new HttpError(502, 'Game metadata provider is unavailable');
  return (await response.json()) as IgdbRow[];
}

const image = (id: string, size: string) => `https://images.igdb.com/igdb/image/upload/t_${size}/${id}.jpg`;

/** Wide key art for card backdrops: artworks first, screenshots as a fallback. */
function banner(row: IgdbRow): string | null {
  const id = row.artworks?.find(a => a.image_id)?.image_id ?? row.screenshots?.find(s => s.image_id)?.image_id;
  return id ? image(id, '1080p') : null;
}

function map(row: IgdbRow): IgdbGame {
  return {
    igdb_id: row.id,
    name: row.name,
    slug: row.slug ?? String(row.id),
    summary: row.summary ?? null,
    cover_url: row.cover?.image_id ? image(row.cover.image_id, 'cover_big') : null,
    banner_url: banner(row),
    release_date: row.first_release_date ? new Date(row.first_release_date * 1000).toISOString() : null,
    genres: (row.genres ?? []).map(g => g.name),
    platforms: (row.platforms ?? []).map(p => p.name),
    snapshot: row as unknown as Record<string, unknown>,
  };
}

/** IGDB uses its own query language, so quotes and backslashes must be escaped. */
function escape(value: string): string {
  // eslint-disable-next-line no-control-regex
  return value.replace(/[\u0000-\u001f\u007f]/g, '').replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

export async function searchGames(term: string, limit = 10): Promise<Omit<IgdbGame, 'snapshot'>[]> {
  const rows = await query(`search "${escape(term)}"; fields ${FIELDS}; limit ${Math.trunc(limit)};`);
  return rows.map(row => {
    const { snapshot: _snapshot, ...rest } = map(row);
    return rest;
  });
}

export async function gameDetails(igdbId: number): Promise<IgdbGame> {
  const rows = await query(`fields ${FIELDS}; where id = ${Math.trunc(igdbId)}; limit 1;`);
  if (rows.length === 0) throw new HttpError(404, 'That game was not found in IGDB');
  return map(rows[0]);
}

/** Test seam: clears the memoised Twitch token between cases. */
export function __resetIgdbToken(): void {
  token = null;
  inFlight = null;
}
