import { z } from 'zod';

export const GAME_STATUSES = ['playing', 'completed', 'backlog', 'dropped'] as const;
export const THEME_PREFERENCES = ['system', 'light', 'dark'] as const;
export type GameStatus = (typeof GAME_STATUSES)[number];

const HANDLE_RE = /^[a-z0-9](?:[a-z0-9_-]{1,28}[a-z0-9])?$/;

/** Keep in sync with apps/web/src/lib/reserved-handles.ts */
const RESERVED_HANDLES = new Set([
  'about', 'admin', 'api', 'auth', 'contact', 'dashboard', 'explore', 'faq',
  'help', 'index', 'legal', 'login', 'logout', 'official', 'onboarding',
  'privacy', 'root', 'savepoint', 'security', 'settings', 'signup', 'staff',
  'static', 'status', 'studio', 'support', 'system', 'terms', 'www',
]);

const handle = z
  .string()
  .transform(value => value.trim().toLowerCase())
  .pipe(
    z
      .string()
      .min(3)
      .max(30)
      .regex(HANDLE_RE, 'handle must be 3-30 lowercase letters, numbers, _ or -')
      .refine(value => !RESERVED_HANDLES.has(value), 'that handle is reserved'),
  );

/**
 * Every stored URL is eventually rendered as an `href` or `src`, so the scheme
 * allow-list is the control that stops `javascript:` and `data:` payloads from
 * becoming stored XSS. `z.string().url()` alone accepts both.
 */
const url = (max = 2048) =>
  z
    .string()
    .max(max)
    .url()
    .refine(value => {
      try {
        return ['http:', 'https:'].includes(new URL(value).protocol);
      } catch {
        return false;
      }
    }, 'must be an http(s) URL');
const nullableUrl = (max = 2048) => url(max).nullish();
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'expected an ISO date (YYYY-MM-DD)');
const nullableIsoDate = isoDate.nullish();

const socialLinks = z
  .record(z.string().min(1).max(40), url())
  .refine(value => Object.keys(value).length <= 10, 'at most 10 social links are allowed');

export const profileCreateSchema = z.object({
  handle,
  display_name: z.string().min(1).max(80),
  bio: z.string().max(2000).nullish(),
  avatar_url: nullableUrl(),
  theme_preference: z.enum(THEME_PREFERENCES).default('system'),
  location: z.string().max(120).nullish(),
  social_links: socialLinks.default({}),
  is_public: z.boolean().default(true),
});

export const profileUpdateSchema = z
  .object({
    handle: handle.optional(),
    display_name: z.string().min(1).max(80).optional(),
    bio: z.string().max(2000).nullish(),
    avatar_url: nullableUrl(),
    theme_preference: z.enum(THEME_PREFERENCES).optional(),
    location: z.string().max(120).nullish(),
    social_links: socialLinks.optional(),
    is_public: z.boolean().optional(),
  })
  .strict();

export const monitorSchema = z.object({
  display_name: z.string().min(1).max(160),
  brand_model: z.string().max(200).nullish(),
  size_inches: z.number().gt(0).max(100).nullish(),
  resolution: z.string().max(40).nullish(),
  refresh_hz: z.number().int().gt(0).max(1000).nullish(),
  photo_url: nullableUrl(),
});

export const rigInputSchema = z.object({
  name: z.string().min(1).max(100).default('Main Rig'),
  hero_photo_url: nullableUrl(),
  monitors: z.array(monitorSchema).max(8).default([]),
  cpu: z.string().max(160).nullish(),
  gpu: z.string().max(160).nullish(),
  motherboard: z.string().max(160).nullish(),
  memory: z.string().max(160).nullish(),
  storage: z.string().max(250).nullish(),
  case: z.string().max(160).nullish(),
  psu: z.string().max(160).nullish(),
  cooling: z.string().max(160).nullish(),
  os: z.string().max(100).nullish(),
  notes: z.string().max(2000).nullish(),
});

export const peripheralInputSchema = z.object({
  type: z
    .string()
    .min(1)
    .max(60)
    .transform(value => value.trim().toLowerCase().split(/\s+/).join(' '))
    .pipe(z.string().min(1).max(60)),
  display_name: z.string().min(1).max(160),
  brand_model: z.string().max(200).nullish(),
  photo_url: nullableUrl(),
  notes: z.string().max(1000).nullish(),
  sort_order: z.number().int().min(0).max(10000).default(0),
});

const halfStar = z
  .number()
  .min(1)
  .max(5)
  .refine(value => Number.isInteger(value * 2), 'rating must be a half-star value');

export interface GameState {
  status?: GameStatus | null;
  started_on?: string | null;
  completed_on?: string | null;
  featured?: boolean | null;
  featured_order?: number | null;
  featured_note?: string | null;
}

/**
 * Cross-field rules that the database also enforces as CHECK constraints; doing
 * it here keeps the failure a 422 with a useful message instead of a bare 409.
 */
export function gameStateIssues(value: GameState): Array<{ message: string; path: string }> {
  const issues: Array<{ message: string; path: string }> = [];

  if (value.started_on && value.completed_on && value.completed_on < value.started_on) {
    issues.push({ message: 'completed_on cannot precede started_on', path: 'completed_on' });
  }
  if (value.completed_on && value.status !== 'completed') {
    issues.push({ message: 'completed_on is only valid for completed games', path: 'completed_on' });
  }
  if (value.featured && value.featured_order == null) {
    issues.push({ message: 'featured_order is required when featured is true', path: 'featured_order' });
  }
  if (!value.featured && (value.featured_order != null || value.featured_note != null)) {
    issues.push({ message: 'featured_order and featured_note require featured=true', path: 'featured_order' });
  }
  return issues;
}

function refineGameState(value: GameState, ctx: z.RefinementCtx): void {
  for (const issue of gameStateIssues(value)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: issue.message, path: [issue.path] });
  }
}

export const profileGameInputSchema = z
  .object({
    igdb_id: z.number().int().gt(0),
    status: z.enum(GAME_STATUSES),
    rating: halfStar.nullish(),
    review: z.string().max(10000).nullish(),
    hours_played: z.number().min(0).max(1_000_000).nullish(),
    started_on: nullableIsoDate,
    completed_on: nullableIsoDate,
    platform: z.string().max(100).nullish(),
    featured: z.boolean().default(false),
    featured_order: z.number().int().min(0).max(10000).nullish(),
    featured_note: z.string().max(1000).nullish(),
  })
  .superRefine((value, ctx) =>
    refineGameState({
      status: value.status,
      started_on: value.started_on ?? null,
      completed_on: value.completed_on ?? null,
      featured: value.featured,
      featured_order: value.featured_order ?? null,
      featured_note: value.featured_note ?? null,
    }, ctx),
  );

export const profileGameUpdateSchema = z
  .object({
    status: z.enum(GAME_STATUSES).optional(),
    rating: halfStar.nullish(),
    review: z.string().max(10000).nullish(),
    hours_played: z.number().min(0).max(1_000_000).nullish(),
    started_on: nullableIsoDate,
    completed_on: nullableIsoDate,
    platform: z.string().max(100).nullish(),
    featured: z.boolean().optional(),
    featured_order: z.number().int().min(0).max(10000).nullish(),
    featured_note: z.string().max(1000).nullish(),
  })
  .strict();

export const awardInputSchema = z.object({
  profile_game_id: z.string().uuid(),
  title: z.string().min(1).max(100),
  description: z.string().max(2000).nullish(),
  icon_url: nullableUrl(),
  awarded_on: nullableIsoDate,
  sort_order: z.number().int().min(0).max(10000).default(0),
});

export const uploadRequestSchema = z.object({
  filename: z.string().min(1).max(200),
  content_type: z.string().min(1).max(120),
  size: z.number().int().gt(0),
  purpose: z.enum(['avatar', 'rig', 'peripheral', 'game', 'award']),
});

export const guideRequestSchema = z.object({
  question: z.string().min(3).max(1000),
});

export const igdbSearchSchema = z.object({
  q: z.string().min(2).max(100),
  limit: z.coerce.number().int().min(1).max(20).default(10),
});

export type ProfileCreate = z.infer<typeof profileCreateSchema>;
export type ProfileUpdate = z.infer<typeof profileUpdateSchema>;
export type RigInput = z.infer<typeof rigInputSchema>;
export type PeripheralInput = z.infer<typeof peripheralInputSchema>;
export type ProfileGameInput = z.infer<typeof profileGameInputSchema>;
export type ProfileGameUpdate = z.infer<typeof profileGameUpdateSchema>;
export type AwardInput = z.infer<typeof awardInputSchema>;
export type UploadRequest = z.infer<typeof uploadRequestSchema>;
