import type { Context } from 'hono';
import { z } from 'zod';
import { currentPrincipal } from './auth.js';
import { MAX_BODY_BYTES } from './env.js';
import { HttpError } from './errors.js';
import type { Profile } from './generated/prisma/client.js';
import { prisma } from './prisma.js';
import type { CompositeSource } from './serialize.js';

/** Resolves the profile owned by the authenticated caller, or 404s. */
export async function ownerProfile(c: Context): Promise<Profile> {
  const principal = await currentPrincipal(c);
  const profile = await prisma.profile.findUnique({ where: { auth0Sub: principal.subject } });
  if (!profile) throw new HttpError(404, 'Create a profile first');
  return profile;
}

/**
 * Parses and validates a JSON body, surfacing Zod issues as a 422 problem.
 *
 * The size ceiling is re-checked here against the decoded payload: the
 * `Content-Length` guard in the middleware is only a fast path, and a chunked
 * request would otherwise arrive with no declared length at all.
 */
export async function body<T extends z.ZodTypeAny>(c: Context, schema: T): Promise<z.infer<T>> {
  let raw: unknown;
  try {
    const text = await c.req.text();
    if (new TextEncoder().encode(text).byteLength > MAX_BODY_BYTES) {
      throw new HttpError(413, 'Request body is too large');
    }
    raw = JSON.parse(text);
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError(422, 'Request body must be valid JSON');
  }
  const result = schema.safeParse(raw);
  if (!result.success) throw result.error;
  return result.data;
}

export async function loadComposite(profile: Profile): Promise<CompositeSource> {
  const [rig, peripherals, games, awards] = await Promise.all([
    prisma.rig.findUnique({ where: { profileId: profile.id } }),
    prisma.peripheral.findMany({ where: { profileId: profile.id } }),
    prisma.profileGame.findMany({ where: { profileId: profile.id }, include: { game: true } }),
    prisma.award.findMany({ where: { profileId: profile.id } }),
  ]);
  return { profile, rig, peripherals, games, awards };
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function pathUuid(c: Context, name: string): string {
  const value = c.req.param(name) ?? '';
  if (!UUID_RE.test(value)) throw new HttpError(404, 'That item was not found');
  return value;
}
