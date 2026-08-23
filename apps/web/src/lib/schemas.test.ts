import { describe, expect, it } from 'vitest';
import { awardSchema, gameSchema, onboardingSchema, profileSchema } from './schemas';

const baseGame = {
  igdbId: 1020,
  status: 'playing',
  review: '',
  featured: false,
};

describe('editor schemas', () => {
  it('accepts a valid public identity', () => {
    expect(profileSchema.safeParse({
      displayName: 'Nova', handle: 'nova_7', bio: 'Archivist', location: 'Lisbon', themePreference: 'dark',
    }).success).toBe(true);
  });

  it('rejects unsafe handles', () => {
    expect(profileSchema.safeParse({
      displayName: 'Nova', handle: 'Nova<script>', bio: '', location: '', themePreference: 'system',
    }).success).toBe(false);
  });

  it('bounds ratings to half-star steps between 1 and 5', () => {
    expect(gameSchema.safeParse({ ...baseGame, rating: 12 }).success).toBe(false);
    expect(gameSchema.safeParse({ ...baseGame, rating: 4.3 }).success).toBe(false);
    expect(gameSchema.safeParse({ ...baseGame, rating: 4.5 }).success).toBe(true);
  });

  it('requires completed status for a finish date and order for featured games', () => {
    expect(gameSchema.safeParse({ ...baseGame, completedOn: '2024-05-01' }).success).toBe(false);
    expect(gameSchema.safeParse({ ...baseGame, status: 'completed', startedOn: '2024-01-01', completedOn: '2024-05-01' }).success).toBe(true);
    expect(gameSchema.safeParse({ ...baseGame, featured: true }).success).toBe(false);
    expect(gameSchema.safeParse({ ...baseGame, featured: true, featuredOrder: 0 }).success).toBe(true);
  });

  it('binds awards to a real game entry id', () => {
    expect(awardSchema.safeParse({ profileGameId: 'not-a-uuid', title: 'Best Loops', description: '' }).success).toBe(false);
    expect(awardSchema.safeParse({ profileGameId: crypto.randomUUID(), title: 'Best Loops', description: 'For the run that never got old.' }).success).toBe(true);
  });

  it('normalizes onboarding handles', () => {
    const parsed = onboardingSchema.parse({ displayName: 'Nova Reyes', handle: 'NOVA ', bio: '' });
    expect(parsed.handle).toBe('nova');
  });
});
