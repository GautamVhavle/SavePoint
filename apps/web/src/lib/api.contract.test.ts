import { describe, expect, it } from 'vitest';
import { mapPublicProfile } from './api';
import fixtureRaw from './__fixtures__/public-profile.json';
import type { ApiPublicProfile } from '../types';

/**
 * Contract guard: the fixture is captured from a live FastAPI response
 * (GET /api/v1/profiles/alex) and must keep mapping into the page view model.
 */
const fixture = fixtureRaw as ApiPublicProfile;

describe('FastAPI public profile contract', () => {
  const view = mapPublicProfile(fixture);

  it('maps identity fields', () => {
    expect(view.handle).toBe('alex');
    expect(view.displayName).toBe('Alex SavePoint');
    expect(view.location).toBe('Toronto, ON');
    expect(view.themePreference).toBe('system');
  });

  it('renders rig specs, monitors, and peripherals as display items', () => {
    const categories = view.rig.map(item => item.category);
    expect(categories).toContain('CPU');
    expect(categories).toContain('DISPLAY');
    expect(categories).toContain('KEYBOARD');
    const display = view.rig.find(item => item.category === 'DISPLAY');
    expect(display?.detail).toContain('165 Hz');
  });

  it('fuses the IGDB snapshot with the player’s own voice', () => {
    const game = view.games.find(entry => entry.title === 'Elden Ring');
    expect(game).toBeDefined();
    expect(game?.rating).toBe(4.5);
    expect(game?.status).toBe('completed');
    expect(game?.platform).toBe('PC');
    expect(game?.featured).toBe(true);
    expect(view.featuredOrder).toContain(game!.id);
  });

  it('attaches awards to their game entries', () => {
    const game = view.games.find(entry => entry.award === 'Golden Save');
    expect(game?.title).toBe('Elden Ring');
    expect(view.awards[0]?.note).toContain('Favorite world');
  });
});
