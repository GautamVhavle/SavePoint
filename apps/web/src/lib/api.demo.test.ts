import { beforeEach, describe, expect, it } from 'vitest';
import { ApiError, api } from './api';

/**
 * Demo-mode contract: these behaviors must mirror the live API client so
 * the visual showcase never lies about how production behaves.
 */

beforeEach(() => {
  localStorage.clear();
});

describe('demo client', () => {
  it('rejects duplicate game additions with a 409-shaped error', async () => {
    const existing = (await api.me()).games[0];
    await expect(api.addGame({
      igdb_id: existing.game.igdb_id, status: 'playing', rating: null, review: null,
      hours_played: null, started_on: null, completed_on: null, platform: null,
      featured: false, featured_order: null, featured_note: null,
    })).rejects.toMatchObject({ status: 409 });
  });

  it('cascades award deletion when a game entry is deleted', async () => {
    const doc = await api.me();
    const entryWithAward = doc.awards[0]?.profile_game_id;
    expect(entryWithAward).toBeTruthy();
    await api.deleteGame(entryWithAward!);
    const after = await api.me();
    expect(after.games.some(game => game.id === entryWithAward)).toBe(false);
    expect(after.awards.some(award => award.profile_game_id === entryWithAward)).toBe(false);
  });

  it('returns 404 for patches to unknown entries', async () => {
    await expect(api.patchGame('00000000-0000-4000-8000-000000000000', { review: 'x' }))
      .rejects.toMatchObject({ status: 404 });
  });

  it('searches by name without duplicates', async () => {
    const results = await api.searchIgdb('wild');
    expect(results.length).toBeGreaterThan(0);
    const ids = new Set(results.map(result => result.igdb_id));
    expect(ids.size).toBe(results.length);
    expect(results.every(result => result.name.toLowerCase().includes('wild'))).toBe(true);
  });

  it('maps missing handles to a 404 ApiError', async () => {
    await expect(api.publicProfile('missing')).rejects.toBeInstanceOf(ApiError);
  });
});
