import { describe, expect, it } from 'vitest';
import { mapPublicProfile } from './api-mapping';
import type { ApiPublicProfile } from '../types';

/** Sparse-archive guard: brand-new curators have no rig, art, or games yet. */
const bare: ApiPublicProfile = {
  profile: {
    id: 'p1', handle: 'newcomer', display_name: 'New Comer', bio: null,
    avatar_url: null, theme_preference: 'system', location: null,
    social_links: {}, is_public: true,
    created_at: '2026-01-15T12:00:00Z', updated_at: '2026-01-15T12:00:00Z',
  },
  rig: null,
  peripherals: [],
  games: [],
  awards: [],
};

describe('mapPublicProfile with a bare archive', () => {
  const view = mapPublicProfile(bare);

  it('falls back to empty strings and collections instead of crashing', () => {
    expect(view.handle).toBe('newcomer');
    expect(view.displayName).toBe('New Comer');
    expect(view.bio).toBe('');
    expect(view.avatar).toBe('');
    expect(view.banner).toBe('');
    expect(view.rig).toEqual([]);
    expect(view.games).toEqual([]);
    expect(view.awards).toEqual([]);
    expect(view.featuredOrder).toEqual([]);
    expect(view.links).toEqual([]);
  });

  it('keeps public links in the order they were stored', () => {
    const withLinks: ApiPublicProfile = {
      ...bare,
      profile: {
        ...bare.profile,
        social_links: { Twitch: 'https://twitch.tv/nova', Steam: 'https://store.steampowered.com' },
      },
    };
    expect(mapPublicProfile(withLinks).links).toEqual([
      { label: 'Twitch', url: 'https://twitch.tv/nova' },
      { label: 'Steam', url: 'https://store.steampowered.com' },
    ]);
  });

  it('derives "since" from the profile creation year', () => {
    expect(view.since).toBe(2026);
  });

  it('uses the first covered game as banner when the rig has no hero photo', () => {
    const withGame: ApiPublicProfile = {
      ...bare,
      games: [{
        id: 'e1', profile_id: 'p1',
        game: {
          igdb_id: 7, name: 'Solo Hit', slug: 'solo-hit', summary: null,
          cover_url: 'https://img.test/cover.jpg', banner_url: null,
          release_date: '2015-09-01T00:00:00Z', genres: [], platforms: ['PC'],
        },
        status: 'playing', rating: null, review: null, hours_played: null,
        started_on: null, completed_on: null, platform: null,
        featured: false, featured_order: null, featured_note: null,
      }],
    };
    const view = mapPublicProfile(withGame);
    expect(view.banner).toBe('https://img.test/cover.jpg');
    expect(view.games[0]?.platform).toBe('PC');
  });
});
