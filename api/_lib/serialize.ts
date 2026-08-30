import type { Award, Game, Peripheral, Profile, ProfileGame, Rig } from './generated/prisma/client.js';

type ProfileGameWithGame = ProfileGame & { game: Game };

const iso = (value: Date) => value.toISOString();
/** @db.Date columns come back as UTC midnight; keep only the calendar day. */
const day = (value: Date | null) => (value ? value.toISOString().slice(0, 10) : null);
const strings = (value: unknown): string[] => (Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : []);

export function profileSummary(profile: Profile) {
  return {
    id: profile.id,
    handle: profile.handle,
    display_name: profile.displayName,
    bio: profile.bio,
    avatar_url: profile.avatarUrl,
    theme_preference: profile.themePreference,
    location: profile.location,
    social_links: (profile.socialLinks ?? {}) as Record<string, string>,
    is_public: profile.isPublic,
    created_at: iso(profile.createdAt),
    updated_at: iso(profile.updatedAt),
  };
}

export function profileRead(profile: Profile) {
  return { ...profileSummary(profile), auth0_sub: profile.auth0Sub };
}

export function rigRead(rig: Rig | null) {
  if (!rig) return null;
  return {
    id: rig.id,
    profile_id: rig.profileId,
    name: rig.name,
    hero_photo_url: rig.heroPhotoUrl,
    monitors: (rig.monitors ?? []) as unknown[],
    cpu: rig.cpu,
    gpu: rig.gpu,
    motherboard: rig.motherboard,
    memory: rig.memory,
    storage: rig.storage,
    case: rig.case,
    psu: rig.psu,
    cooling: rig.cooling,
    os: rig.os,
    notes: rig.notes,
  };
}

export function peripheralRead(item: Peripheral) {
  return {
    id: item.id,
    profile_id: item.profileId,
    type: item.type,
    display_name: item.displayName,
    brand_model: item.brandModel,
    photo_url: item.photoUrl,
    notes: item.notes,
    sort_order: item.sortOrder,
  };
}

export function gameRead(game: Game) {
  return {
    id: game.id,
    igdb_id: game.igdbId,
    name: game.name,
    slug: game.slug,
    summary: game.summary,
    cover_url: game.coverUrl,
    banner_url: game.bannerUrl,
    release_date: game.releaseDate ? iso(game.releaseDate) : null,
    genres: strings(game.genres),
    platforms: strings(game.platforms),
    snapshot_at: iso(game.snapshotAt),
  };
}

export function profileGameRead(entry: ProfileGameWithGame) {
  return {
    id: entry.id,
    profile_id: entry.profileId,
    game: gameRead(entry.game),
    status: entry.status,
    rating: entry.rating,
    review: entry.review,
    hours_played: entry.hoursPlayed,
    started_on: day(entry.startedOn),
    completed_on: day(entry.completedOn),
    platform: entry.platform,
    featured: entry.featured,
    featured_order: entry.featuredOrder,
    featured_note: entry.featuredNote,
  };
}

export function awardRead(award: Award) {
  return {
    id: award.id,
    profile_id: award.profileId,
    profile_game_id: award.profileGameId,
    title: award.title,
    description: award.description,
    icon_url: award.iconUrl,
    awarded_on: day(award.awardedOn),
    sort_order: award.sortOrder,
  };
}

/** Featured entries lead, then their curated order, then alphabetical. */
export function sortGames(games: ProfileGameWithGame[]): ProfileGameWithGame[] {
  return [...games].sort((a, b) => {
    if (a.featured !== b.featured) return a.featured ? -1 : 1;
    const orderA = a.featuredOrder ?? Number.MAX_SAFE_INTEGER;
    const orderB = b.featuredOrder ?? Number.MAX_SAFE_INTEGER;
    if (orderA !== orderB) return orderA - orderB;
    return a.game.name.localeCompare(b.game.name);
  });
}

export interface CompositeSource {
  profile: Profile;
  rig: Rig | null;
  peripherals: Peripheral[];
  games: ProfileGameWithGame[];
  awards: Award[];
}

export function publicProfile(source: CompositeSource) {
  return {
    profile: profileSummary(source.profile),
    rig: rigRead(source.rig),
    peripherals: [...source.peripherals]
      .sort((a, b) => a.sortOrder - b.sortOrder || a.displayName.localeCompare(b.displayName))
      .map(peripheralRead),
    games: sortGames(source.games).map(profileGameRead),
    awards: [...source.awards]
      .sort((a, b) => a.sortOrder - b.sortOrder || a.title.localeCompare(b.title))
      .map(awardRead),
  };
}

/** Parses an API date string into the UTC-midnight Date a @db.Date column expects. */
export function toDateColumn(value: string | null | undefined): Date | null {
  return value ? new Date(`${value}T00:00:00.000Z`) : null;
}
