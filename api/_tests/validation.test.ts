import { describe, expect, it } from 'vitest';
import {
  awardInputSchema,
  gameStateIssues,
  peripheralInputSchema,
  profileCreateSchema,
  profileGameInputSchema,
  profileUpdateSchema,
  uploadRequestSchema,
} from '../_lib/validation.js';

const baseProfile = { handle: 'alex', display_name: 'Alex' };

describe('profile validation', () => {
  it('normalises handles to lowercase and trims surrounding space', () => {
    const parsed = profileCreateSchema.parse({ ...baseProfile, handle: '  AlexTheGamer  ' });
    expect(parsed.handle).toBe('alexthegamer');
  });

  it.each(['ab', 'a'.repeat(31), '-alex', 'alex-', 'alex!', 'Alex Gamer'])(
    'rejects the invalid handle %s',
    handle => {
      expect(profileCreateSchema.safeParse({ ...baseProfile, handle }).success).toBe(false);
    },
  );

  it('defaults optional presentation fields', () => {
    const parsed = profileCreateSchema.parse(baseProfile);
    expect(parsed.theme_preference).toBe('system');
    expect(parsed.is_public).toBe(true);
    expect(parsed.social_links).toEqual({});
  });

  it('rejects non-http social links', () => {
    const result = profileCreateSchema.safeParse({
      ...baseProfile,
      social_links: { site: 'javascript:alert(1)' },
    });
    expect(result.success).toBe(false);
  });

  it('rejects unknown keys on patch so typos cannot silently no-op', () => {
    expect(profileUpdateSchema.safeParse({ dispaly_name: 'typo' }).success).toBe(false);
  });

  it('treats an absent key and an explicit null differently', () => {
    expect(profileUpdateSchema.parse({}).bio).toBeUndefined();
    expect(profileUpdateSchema.parse({ bio: null }).bio).toBeNull();
  });
});

describe('peripheral validation', () => {
  it('normalises the type to a lowercase single-spaced token', () => {
    const parsed = peripheralInputSchema.parse({ type: '  Head   Set ', display_name: 'HD 599' });
    expect(parsed.type).toBe('head set');
  });

  it('rejects a negative sort order', () => {
    const result = peripheralInputSchema.safeParse({
      type: 'mouse',
      display_name: 'G Pro',
      sort_order: -1,
    });
    expect(result.success).toBe(false);
  });
});

describe('game entry validation', () => {
  const baseGame = { igdb_id: 119133, status: 'backlog' as const };

  it.each([0.5, 1.2, 4.7, 5.5, 6])('rejects the off-scale rating %s', rating => {
    expect(profileGameInputSchema.safeParse({ ...baseGame, rating }).success).toBe(false);
  });

  it.each([1, 1.5, 3, 4.5, 5])('accepts the half-star rating %s', rating => {
    expect(profileGameInputSchema.safeParse({ ...baseGame, rating }).success).toBe(true);
  });

  it('rejects a completion date on a game that is not completed', () => {
    const result = profileGameInputSchema.safeParse({ ...baseGame, completed_on: '2024-03-30' });
    expect(result.success).toBe(false);
  });

  it('rejects a completion date that precedes the start date', () => {
    const result = profileGameInputSchema.safeParse({
      ...baseGame,
      status: 'completed',
      started_on: '2024-03-30',
      completed_on: '2024-01-12',
    });
    expect(result.success).toBe(false);
  });

  it('requires featured_order when a game is featured', () => {
    expect(profileGameInputSchema.safeParse({ ...baseGame, featured: true }).success).toBe(false);
  });

  it('rejects featured metadata on a game that is not featured', () => {
    const result = profileGameInputSchema.safeParse({ ...baseGame, featured_note: 'nope' });
    expect(result.success).toBe(false);
  });

  it('rejects negative hours', () => {
    expect(profileGameInputSchema.safeParse({ ...baseGame, hours_played: -1 }).success).toBe(false);
  });

  it('surfaces the same rules through gameStateIssues for PATCH merges', () => {
    expect(gameStateIssues({ status: 'backlog', completed_on: '2024-01-01' })).toHaveLength(1);
    expect(gameStateIssues({ status: 'completed', completed_on: '2024-01-01' })).toHaveLength(0);
    expect(gameStateIssues({ featured: true, featured_order: 0 })).toHaveLength(0);
  });
});

describe('award and upload validation', () => {
  it('requires a uuid game reference', () => {
    const result = awardInputSchema.safeParse({ profile_game_id: 'not-a-uuid', title: 'Golden Save' });
    expect(result.success).toBe(false);
  });

  it('accepts a well-formed upload request', () => {
    const parsed = uploadRequestSchema.parse({
      filename: 'rig.png',
      content_type: 'image/png',
      size: 2048,
      purpose: 'rig',
    });
    expect(parsed.purpose).toBe('rig');
  });

  it.each([0, -5])('rejects the non-positive upload size %s', size => {
    const result = uploadRequestSchema.safeParse({
      filename: 'rig.png',
      content_type: 'image/png',
      size,
      purpose: 'rig',
    });
    expect(result.success).toBe(false);
  });

  it('rejects an unknown upload purpose', () => {
    const result = uploadRequestSchema.safeParse({
      filename: 'x.png',
      content_type: 'image/png',
      size: 10,
      purpose: 'executable',
    });
    expect(result.success).toBe(false);
  });
});
