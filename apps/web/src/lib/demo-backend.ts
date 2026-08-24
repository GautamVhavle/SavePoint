import { demoGuideAnswer, demoProfile } from '../data/demo';
import { uid } from './utils';
import { ApiError } from './api-error';
import type {
  ApiAward, ApiIGDBResult, ApiProfileGame, ApiPublicProfile,
  Profile, SavepointClient,
} from '../types';

const DEMO_KEY = 'savepoint-demo-store-v1';
const pause = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
const wait = () => pause(180);

function demoDoc(): ApiPublicProfile {
  const raw = localStorage.getItem(DEMO_KEY);
  if (raw) { try { return JSON.parse(raw) as ApiPublicProfile; } catch { /* reseed below */ } }
  const seeded = seedFromView(demoProfile);
  localStorage.setItem(DEMO_KEY, JSON.stringify(seeded));
  return seeded;
}

function persist(doc: ApiPublicProfile) {
  try {
    localStorage.setItem(DEMO_KEY, JSON.stringify(doc));
  } catch (error) {
    // Quota or privacy-mode failures must not break the visual showcase;
    // edits simply stay in memory for this session.
    console.warn('Demo store could not persist', error);
  }
}

/** Inverse of mapPublicProfile: lets the visual demo seed a realistic editable document. */
function seedFromView(view: Profile): ApiPublicProfile {
  const created = `${view.since}-01-15T12:00:00Z`;
  const gameMetas = view.games.map(game => ({
    igdb_id: game.igdbId ?? 1, name: game.title, slug: game.slug, summary: game.summary ?? null,
    cover_url: game.cover, banner_url: game.banner ?? null, release_date: game.year ? `${game.year}-01-01T00:00:00Z` : null,
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
  { igdb_id: 1020, name: 'Outer Wilds', slug: 'outer-wilds',
    banner_url: demoProfile.games.find(g => g.slug === 'outer-wilds')?.banner ?? null,
    cover_url: demoProfile.games.find(g => g.slug === 'outer-wilds')!.cover,
    summary: 'A hand-built solar system trapped in a 22-minute time loop.',
    release_date: '2019-05-28T00:00:00Z', genres: ['Exploration'], platforms: ['PC'] },
  { igdb_id: 12659, name: 'Hades', slug: 'hades',
    banner_url: demoProfile.games.find(g => g.slug === 'hades')?.banner ?? null,
    cover_url: demoProfile.games.find(g => g.slug === 'hades')!.cover,
    summary: 'Defy the god of the dead in a rogue-like dungeon crawler where death is only the beginning.',
    release_date: '2020-09-17T00:00:00Z', genres: ['Roguelike'], platforms: ['PC'] },
  { igdb_id: 119171, name: "Baldur's Gate 3", slug: 'baldurs-gate-3',
    banner_url: demoProfile.games.find(g => g.slug === 'baldurs-gate-3')?.banner ?? null,
    cover_url: demoProfile.games.find(g => g.slug === 'baldurs-gate-3')!.cover,
    summary: 'Gather your party and return to the Forgotten Realms in a story of fellowship, betrayal, and untold power.',
    release_date: '2023-08-03T00:00:00Z', genres: ['RPG'], platforms: ['PC'] },
  { igdb_id: 637790, name: 'Disco Elysium', slug: 'disco-elysium',
    banner_url: 'https://images.igdb.com/igdb/image/upload/t_1080p/eqqVVh1o7BOt9yMmMOLkFA.jpg',
    cover_url: 'https://images.igdb.com/igdb/image/upload/t_cover_big/bibjufyvdmrmfgg5ehu0.jpg',
    summary: 'A groundbreaking open world role playing game with unmatched freedom of choice.',
    release_date: '2019-10-15T00:00:00Z', genres: ['RPG'], platforms: ['PC'] },
]

export const demoClient: SavepointClient = {
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
    const needle = query.toLowerCase();
    const all = [...demoDoc().games.map(entry => entry.game as ApiIGDBResult & { snapshot_at?: string }), ...demoCatalogExtra];
    const seen = new Set<number>();
    const matches: ApiIGDBResult[] = [];
    for (const meta of all) {
      if (!meta.name.toLowerCase().includes(needle) || seen.has(meta.igdb_id)) continue;
      seen.add(meta.igdb_id);
      matches.push(meta);
    }
    return matches;
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

