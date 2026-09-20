import type {
  ApiAward, ApiProfileGame, ApiPublicProfile,
  Profile, RigItem,
} from '../types';
import { linksFromRecord } from './links';

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
    // The part is the headline. There is no second line to give it: repeating
    // the build name here made every spec card read "Obsidian SFF".
    items.push({ id: `spec-${slugify(category!)}`, category: category!.toUpperCase(), name: detail!, detail: '' });
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
    links: linksFromRecord(dto.profile.social_links),
  };
}

