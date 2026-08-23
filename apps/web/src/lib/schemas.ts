import { z } from 'zod';
import type { GameStatus } from '../types';

export type ThemePreferenceValue = 'system' | 'light' | 'dark';

const optionalText = (max: number) => z.string().trim().max(max).optional().or(z.literal(''));
const optionalDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD').optional().or(z.literal(''));

export const profileSchema = z.object({
  displayName: z.string().trim().min(2, 'At least 2 characters').max(80),
  handle: z.string().trim().toLowerCase().regex(
    /^[a-z0-9](?:[a-z0-9_-]{1,28}[a-z0-9])?$/,
    '3 to 30 lowercase letters, numbers, _ or -',
  ),
  location: optionalText(120),
  bio: z.string().max(2000),
  themePreference: z.enum(['system', 'light', 'dark']),
});

export const rigSchema = z.object({
  name: z.string().trim().min(1, 'Name the build').max(100),
  cpu: optionalText(160), gpu: optionalText(160), memory: optionalText(160),
  motherboard: optionalText(160), storage: optionalText(250), caseField: optionalText(160),
  psu: optionalText(160), cooling: optionalText(160), os: optionalText(100),
  notes: z.string().max(2000),
});

export const peripheralSchema = z.object({
  type: z.string().trim().min(1, 'What is it?').max(60),
  displayName: z.string().trim().min(1, 'Required').max(160),
  brandModel: optionalText(200),
  notes: optionalText(1000),
});

const halfStar = z.preprocess(
  value => (value === '' || value === null || value === undefined ? undefined : Number(value)),
  z.number().min(1, 'Rate between 1 and 5').max(5, 'Rate between 1 and 5')
    .refine(value => Number.isInteger(value * 2), 'Half-star steps only').optional(),
);

export const gameSchema = z.object({
  igdbId: z.coerce.number().int().positive(),
  status: z.enum(['playing', 'completed', 'backlog', 'dropped']),
  rating: halfStar,
  hours: z.preprocess(
    value => (value === '' || value === null || value === undefined ? undefined : Number(value)),
    z.number().min(0).max(1_000_000).optional(),
  ),
  platform: optionalText(100),
  startedOn: optionalDate,
  completedOn: optionalDate,
  review: z.string().max(10_000),
  featured: z.boolean(),
  featuredOrder: z.preprocess(
    value => (value === '' || value === null || value === undefined ? undefined : Number(value)),
    z.number().int().min(0).max(10_000).optional(),
  ),
  featuredNote: optionalText(1000),
}).superRefine((value, ctx) => {
  if (value.completedOn && value.status !== 'completed') {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['completedOn'], message: 'Finish date needs Completed status' });
  }
  if (value.startedOn && value.completedOn && value.completedOn < value.startedOn) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['completedOn'], message: 'Finish cannot precede start' });
  }
  if (value.featured && value.featuredOrder === undefined) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['featuredOrder'], message: 'Featured games need an order' });
  }
});

export const awardSchema = z.object({
  profileGameId: z.string().uuid('Choose one of your games'),
  title: z.string().trim().min(2, 'Name the award').max(100),
  description: z.string().max(2000),
  awardedOn: optionalDate,
});

export const onboardingSchema = z.object({
  displayName: z.string().trim().min(2, 'At least 2 characters').max(80),
  handle: z.string().trim().toLowerCase().regex(
    /^[a-z0-9](?:[a-z0-9_-]{1,28}[a-z0-9])?$/,
    '3 to 30 lowercase letters, numbers, _ or -',
  ),
  bio: z.string().max(2000),
});

/* Explicit form value shapes keep react-hook-form generics stable across preprocessors. */
export interface ProfileForm { displayName: string; handle: string; location?: string; bio: string; themePreference: ThemePreferenceValue; }
export interface RigForm {
  name: string; cpu?: string; gpu?: string; memory?: string; motherboard?: string; storage?: string;
  caseField?: string; psu?: string; cooling?: string; os?: string; notes: string;
}
export interface PeripheralForm { type: string; displayName: string; brandModel?: string; notes?: string; }
export interface GameForm {
  igdbId: number; status: GameStatus; rating?: number; hours?: number; platform?: string;
  startedOn?: string; completedOn?: string; review: string; featured: boolean;
  featuredOrder?: number; featuredNote?: string;
}
export interface AwardForm { profileGameId: string; title: string; description: string; awardedOn?: string; }
export interface OnboardingForm { displayName: string; handle: string; bio: string; }
