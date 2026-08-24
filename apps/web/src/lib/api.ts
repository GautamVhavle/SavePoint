import { demoGuideAnswer, demoProfile } from '../data/demo';
import { uid } from './utils';
import type {
  ApiAward, ApiIGDBResult, ApiProfileGame, ApiPublicProfile,
  GuideResponse, PeripheralInput, Profile, RigItem, SavepointClient,
} from '../types';

const API_URL = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '');
export const isDemoMode = import.meta.env.VITE_DEMO_MODE === 'true' || !API_URL;

export class ApiError extends Error {
  constructor(message: string, public status: number, public requestId?: string) {
    super(message);
    this.name = 'ApiError';
  }
}

let tokenProvider: () => Promise<string | undefined> = async () => undefined;
/** Registered by the auth bridge so this module never imports Auth0 directly. */
export function configureAuthToken(provider: () => Promise<string | undefined>) { tokenProvider = provider; }

const pause = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function request<T>(path: string, init: RequestInit = {}, token?: string): Promise<T> {
  if (!API_URL) throw new ApiError('API is not configured', 503);
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init.headers,
    },
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}) as { detail?: string });
    throw new ApiError(
      typeof body.detail === 'string' ? body.detail : 'The archive could not complete that request.',
      response.status,
      response.headers.get('x-request-id') ?? undefined,
    );
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

/* ------------------------------ DTO → view mapping ------------------------------ */

const yearOf = (iso: string | null | undefined) => (iso ? new Date(iso).getUTCFullYear() : undefined);
const slugify = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'entry';

function mapGame(entry: ApiProfileGame, award?: ApiAward) {
  return {
    id: entry.id,
    igdbId: entry.game.igdb_id,
    slug: entry.game.slug || slugify(entry.game.name),
    title: entry.game.name,
    cover: entry.game.cover_url ?? '',
    banner: entry.game.banner_url ?? null,
    rating: entry.rating,
    platform: entry.platform ?? entry.game.platforms[0] ?? 'Unknown',
    status: entry.status,
    review: entry.review ?? '',
    startedAt: entry.started_on ?? undefined,
    completedAt: entry.completed_on ?? undefined,
    hours: entry.hours_played ?? 0,
    genres: entry.game.genres,
    platforms: entry.game.platforms,
    year: yearOf(entry.game.release_date),
    summary: entry.game.summary ?? undefined,
    award: award?.title,
    awardNote: award?.description ?? undefined,
    featured: entry.featured,
    featuredOrder: entry.featured_order,
    featuredNote: entry.featured_note,
  };
}

function mapRigItems(dto: ApiPublicProfile): RigItem[] {
  const items: RigItem[] = [];
  const rig = dto.rig;
  if (!rig) return items;
  const specs: Array<[string, string | null | undefined]> = [
    ['CPU', rig.cpu], ['GPU', rig.gpu], ['Memory', rig.memory], ['Motherboard', rig.motherboard],
    ['Storage', rig.storage], ['Case', rig.case], ['Power', rig.psu], ['Cooling', rig.cooling], ['OS', rig.os],
  ];
  specs.filter(([, detail]) => detail).forEach(([category, detail]) => {
    items.push({ id: `spec-${slugify(category!)}`, category: category!.toUpperCase(), name: rig.name, detail: detail! });
  });
  rig.monitors.forEach((monitor, index) => {
    const detail = [monitor.brand_model, monitor.resolution, monitor.refresh_hz ? `${monitor.refresh_hz} Hz` : null]
      .filter(Boolean).join(' · ');
    items.push({
      id: `monitor-${index}`, category: 'DISPLAY',
      name: monitor.size_inches ? `${monitor.size_inches}″ ${monitor.display_name}` : monitor.display_name,
      detail: detail || 'Custom display',
    });
  });
  dto.peripherals.forEach(peripheral => {
    items.push({
      id: peripheral.id, category: peripheral.type.toUpperCase(), name: peripheral.display_name,
      detail: [peripheral.brand_model, peripheral.notes].filter(Boolean).join(' · ') || 'Documented peripheral',
    });
  });
  return items;
}

export function mapPublicProfile(dto: ApiPublicProfile): Profile {
  const awardByGame = new Map(dto.awards.map(award => [award.profile_game_id, award]));
  const games = dto.games.map(entry => mapGame(entry, awardByGame.get(entry.id)));
  return {
    handle: dto.profile.handle,
    displayName: dto.profile.display_name,
    bio: dto.profile.bio ?? '',
    location: dto.profile.location ?? '',
    avatar: dto.profile.avatar_url ?? '',
    banner: dto.rig?.hero_photo_url ?? games.find(game => game.cover)?.cover ?? '',
    since: yearOf(dto.profile.created_at) ?? new Date().getUTCFullYear(),
    themePreference: dto.profile.theme_preference,
    isPublic: dto.profile.is_public,
    rig: mapRigItems(dto),
    rigHero: dto.rig?.hero_photo_url ?? undefined,
    games,
    awards: dto.awards.map(award => ({
      id: award.id, title: award.title, gameId: award.profile_game_id,
      note: award.description ?? '', year: yearOf(award.awarded_on),
    })),
    featuredOrder: [...dto.games].filter(game => game.featured)
      .sort((a, b) => (a.featured_order ?? 0) - (b.featured_order ?? 0)).map(game => game.id),
  };
}

/* --------------------------------- demo backend --------------------------------- */

const DEMO_KEY = 'savepoint-demo-store-v1';
const wait = () => pause(180);

function demoDoc(): ApiPublicProfile {
  const raw = localStorage.getItem(DEMO_KEY);
  if (raw) { try { return JSON.parse(raw) as ApiPublicProfile; } catch { /* reseed below */ } }
  const seeded = seedFromView(demoProfile);
  localStorage.setItem(DEMO_KEY, JSON.stringify(seeded));
  return seeded;
}

function persist(doc: ApiPublicProfile) { localStorage.setItem(DEMO_KEY, JSON.stringify(doc)); }

/** Inverse of mapPublicProfile: lets the visual demo seed a realistic editable document. */
export function seedFromView(view: Profile): ApiPublicProfile {
  const created = `${view.since}-01-15T12:00:00Z`;
  const gameMetas = view.games.map(game => ({
    igdb_id: game.igdbId ?? 1, name: game.title, slug: game.slug, summary: game.summary ?? null,
    cover_url: game.cover, release_date: game.year ? `${game.year}-01-01T00:00:00Z` : null,
    genres: game.genres, platforms: game.platforms.length ? game.platforms : [game.platform],
  }));
  const entries: ApiProfileGame[] = view.games.map((game, index) => ({
    id: game.id, profile_id: 'demo-profile', game: gameMetas[index], status: game.status,
    rating: game.rating, review: game.review, hours_played: game.hours,
    started_on: game.startedAt ?? null, completed_on: game.completedAt ?? null,
    platform: game.platform, featured: Boolean(game.featured), featured_order: game.featuredOrder ?? null,
    featured_note: game.featuredNote ?? null,
  }));
  const awards: ApiAward[] = view.awards.map(award => ({
    id: award.id, profile_id: 'demo-profile', profile_game_id: award.gameId, title: award.title,
    description: award.note, icon_url: null, awarded_on: award.year ? `${award.year}-06-01` : null, sort_order: 0,
  }));
  return {
    profile: {
      id: 'demo-profile', handle: view.handle, display_name: view.displayName, bio: view.bio,
      avatar_url: view.avatar, theme_preference: view.themePreference, location: view.location,
      social_links: {}, is_public: view.isPublic, created_at: created, updated_at: created,
    },
    rig: {
      id: 'demo-rig', profile_id: 'demo-profile', name: 'Obsidian SFF', hero_photo_url: view.rigHero ?? null,
      monitors: [], cpu: 'Ryzen 9 7900', gpu: 'RTX 4080 Super', motherboard: null, memory: '32 GB DDR5-6000',
      storage: '2 TB NVMe Gen4', case: null, psu: null, cooling: null, os: null, notes: null,
    },
    peripherals: view.rig
      .filter(item => !['SYSTEM', 'DISPLAY'].includes(item.category))
      .map((item, index) => ({
        id: item.id, profile_id: 'demo-profile', type: item.category.toLowerCase(),
        display_name: item.name, brand_model: item.detail, photo_url: null, notes: null, sort_order: index,
      })),
    games: entries, awards,
  };
}

const demoCatalogExtra: ApiIGDBResult[] = [
  { igdb_id: 1020, name: 'Outer Wilds', slug: 'outer-wilds', banner_url: demoProfile.games[0].banner ?? null, summary: 'A hand-built solar system trapped in a 22-minute time loop.', cover_url: demoProfile.games[0].cover, release_date: '2019-05-28T00:00:00Z', genres: ['Exploration'], platforms: ['PC'] },
  { igdb_id: 12659, name: 'Hades', slug: 'hades', banner_url: demoProfile.games[1].banner ?? null, summary: 'Defy the god of the dead in a rogue-like dungeon crawler where death is only the beginning.', cover_url: demoProfile.games[1].cover, release_date: '2020-09-17T00:00:00Z', genres: ['Roguelike'], platforms: ['PC'] },
  { igdb_id: 109428, name: 'Alan Wake II', slug: 'alan-wake-2', banner_url: demoProfile.games[2].banner ?? null, summary: 'Two independent heroes in two nightmarish towns, on two haunting journeys mirroring each other.', cover_url: demoProfile.games[2].cover, release_date: '2023-10-27T00:00:00Z', genres: ['Horror'], platforms: ['PS5'] },
  { igdb_id: 637790, name: 'Disco Elysium', slug: 'disco-elysium', banner_url: demoProfile.games[3].banner ?? null, summary: 'A groundbreaking open world role playing game with unmatched freedom of choice.', cover_url: demoProfile.games[3].cover, release_date: '2019-10-15T00:00:00Z', genres: ['RPG'], platforms: ['PC'] },
  { igdb_id: 119459, name: "Baldur's Gate 3", slug: 'baldurs-gate-3', banner_url: demoProfile.games[4].banner ?? null, summary: 'Gather your party and return to the Forgotten Realms in a story of fellowship, betrayal, and untold power.', cover_url: demoProfile.games[4].cover, release_date: '2023-08-03T00:00:00Z', genres: ['RPG'], platforms: ['PC'] },
  { igdb_id: 172282, name: 'Tunic', slug: 'tunic', banner_url: demoProfile.games[5].banner ?? null, summary: 'Explore a land of legends and monsters in an isometric adventure about a small fox on a big journey.', cover_url: demoProfile.games[5].cover, release_date: '2022-03-24T00:00:00Z', genres: ['Adventure'], platforms: ['PC'] },
];

const demoClient: SavepointClient = {
  async publicProfile(handle, signal) {
    signal?.throwIfAborted();
    await pause(220);
    if (handle === 'missing') throw new ApiError('Player not found', 404);
    return handle === demoProfile.handle ? demoProfile : demoProfile;
  },
  async createMe(input) {
    await wait();
    const doc = demoDoc();
    Object.assign(doc.profile, { handle: input.handle, display_name: input.display_name, bio: input.bio ?? doc.profile.bio });
    persist(doc);
    return { created: true };
  },
  async me() { await wait(); return demoDoc(); },
  async patchMe(patch) { await wait(); const doc = demoDoc(); Object.assign(doc.profile, patch); persist(doc); },
  async putRig(rig) { await wait(); const doc = demoDoc(); doc.rig = { ...(doc.rig ?? { id: uid(), profile_id: doc.profile.id, name: 'Main Rig', hero_photo_url: null, monitors: [] }), ...rig } as NonNullable<ApiPublicProfile['rig']>; persist(doc); },
  async createPeripheral(input) { await wait(); const doc = demoDoc(); doc.peripherals.push({ id: uid(), profile_id: doc.profile.id, ...input }); persist(doc); },
  async updatePeripheral(id, input) { await wait(); const doc = demoDoc(); const found = doc.peripherals.find(item => item.id === id); if (!found) throw new ApiError('Peripheral not found', 404); Object.assign(found, input); persist(doc); },
  async deletePeripheral(id) { await wait(); const doc = demoDoc(); doc.peripherals = doc.peripherals.filter(item => item.id !== id); persist(doc); },
  async searchIgdb(query) {
    await wait();
    const all = [...demoDoc().games.map(entry => entry.game as ApiIGDBResult & { snapshot_at?: string }), ...demoCatalogExtra];
    const seen = new Set<number>();
    return all.filter(meta => meta.name.toLowerCase().includes(query.toLowerCase()) && !seen.has(meta.igdb_id) && seen.add(meta.igdb_id));
  },
  async addGame(input) {
    await wait();
    const doc = demoDoc();
    if (doc.games.some(entry => entry.game.igdb_id === input.igdb_id)) throw new ApiError('Game already exists on this profile', 409);
    const meta = [...doc.games.map(entry => entry.game), ...demoCatalogExtra]
      .find(candidate => candidate.igdb_id === input.igdb_id);
    if (!meta) throw new ApiError('Game not found in IGDB', 404);
    doc.games.unshift({ id: uid(), profile_id: doc.profile.id, game: meta, ...input });
    persist(doc);
  },
  async patchGame(id, patch) { await wait(); const doc = demoDoc(); const found = doc.games.find(entry => entry.id === id); if (!found) throw new ApiError('Game entry not found', 404); Object.assign(found, patch); persist(doc); },
  async deleteGame(id) { await wait(); const doc = demoDoc(); doc.games = doc.games.filter(entry => entry.id !== id); doc.awards = doc.awards.filter(award => award.profile_game_id !== id); persist(doc); },
  async createAward(input) { await wait(); const doc = demoDoc(); doc.awards.push({ id: uid(), profile_id: doc.profile.id, icon_url: null, ...input }); persist(doc); },
  async deleteAward(id) { await wait(); const doc = demoDoc(); doc.awards = doc.awards.filter(award => award.id !== id); persist(doc); },
  async uploadMedia(_purpose, file) { await pause(420); return URL.createObjectURL(file); },
  async guide() { await pause(650); return { answer: demoGuideAnswer }; },
};

/* --------------------------------- live client ---------------------------------- */

const auth = async () => {
  const token = await tokenProvider();
  if (!token) throw new ApiError('Sign in to continue', 401);
  return token;
};

const realClient: SavepointClient = {
  async publicProfile(handle, signal) {
    return mapPublicProfile(await request<ApiPublicProfile>(`/profiles/${encodeURIComponent(handle)}`, { signal }));
  },
  async createMe(input) {
    try {
      await request('/me/profile', { method: 'POST', body: JSON.stringify({ ...input, bio: input.bio ?? null }) }, await auth());
      return { created: true };
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) return { created: false };
      throw error;
    }
  },
  async me(signal) { return request<ApiPublicProfile>('/me/composite', { signal }, await auth()); },
  async patchMe(patch) { await request('/me/profile', { method: 'PATCH', body: JSON.stringify(patch) }, await auth()); },
  async putRig(rig) { await request('/me/rig', { method: 'PUT', body: JSON.stringify(rig) }, await auth()); },
  async createPeripheral(input) { await request('/me/peripherals', { method: 'POST', body: JSON.stringify(input) }, await auth()); },
  async updatePeripheral(id, input) { await request(`/me/peripherals/${id}`, { method: 'PUT', body: JSON.stringify(input) }, await auth()); },
  async deletePeripheral(id) { await request(`/me/peripherals/${id}`, { method: 'DELETE' }, await auth()); },
  async searchIgdb(query, signal) {
    return request<ApiIGDBResult[]>(`/igdb/search?q=${encodeURIComponent(query)}`, { signal }, await auth());
  },
  async addGame(input) { await request('/me/games', { method: 'POST', body: JSON.stringify(input) }, await auth()); },
  async patchGame(id, patch) { await request(`/me/games/${id}`, { method: 'PATCH', body: JSON.stringify(patch) }, await auth()); },
  async deleteGame(id) { await request(`/me/games/${id}`, { method: 'DELETE' }, await auth()); },
  async createAward(input) { await request('/me/awards', { method: 'POST', body: JSON.stringify(input) }, await auth()); },
  async deleteAward(id) { await request(`/me/awards/${id}`, { method: 'DELETE' }, await auth()); },
  async uploadMedia(purpose, file) {
    const token = await auth();
    const signed = await request<{ path: string; token: string; upload_url: string }>('/me/uploads/sign', {
      method: 'POST',
      body: JSON.stringify({ filename: file.name, content_type: file.type, size: file.size, purpose }),
    }, token);
    const url = new URL(signed.upload_url);
    url.searchParams.set('token', signed.token);
    const uploaded = await fetch(url, { method: 'PUT', headers: { 'Content-Type': file.type }, body: file });
    if (!uploaded.ok) throw new ApiError('Upload failed', uploaded.status);
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.replace(/\/$/, '');
    const bucket = import.meta.env.VITE_SUPABASE_BUCKET ?? 'savepoint-media';
    if (!supabaseUrl) throw new ApiError('Public media base is not configured', 503);
    return `${supabaseUrl}/storage/v1/object/public/${bucket}/${signed.path}`;
  },
  async guide(handle, question, signal) {
    return request<GuideResponse>(`/profiles/${encodeURIComponent(handle)}/guide`, {
      method: 'POST', body: JSON.stringify({ question }), signal,
    });
  },
};

export const api: SavepointClient = isDemoMode ? demoClient : realClient;

export type { PeripheralInput };
