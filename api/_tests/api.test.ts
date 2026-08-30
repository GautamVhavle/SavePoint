import type { Hono } from 'hono';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../_lib/app.js';
import { resetEnvCache } from '../_lib/env.js';
import { prisma } from '../_lib/prisma.js';

const OWNER = 'auth0|vitest-owner';
const INTRUDER = 'auth0|vitest-intruder';
const SUBJECTS = [OWNER, INTRUDER];

let app: Hono;

/** Every request runs through the real middleware stack, dev-auth included. */
function call(path: string, init: RequestInit & { sub?: string } = {}): Promise<Response> {
  const { sub, ...rest } = init;
  const headers = new Headers(rest.headers);
  if (sub) headers.set('x-dev-auth-sub', sub);
  if (rest.body !== undefined) headers.set('content-type', 'application/json');
  return Promise.resolve(app.request(`/api/v1${path}`, { ...rest, headers }));
}

const json = (value: unknown) => JSON.stringify(value);

async function purge(): Promise<void> {
  await prisma.profile.deleteMany({ where: { auth0Sub: { in: SUBJECTS } } });
}

beforeAll(async () => {
  resetEnvCache();
  app = createApp();
  await purge();
});

afterAll(async () => {
  await purge();
  await prisma.$disconnect();
});

describe('service endpoints', () => {
  it('reports liveness without touching the database', async () => {
    const res = await call('/health');
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ status: 'ok' });
  });

  it('reports readiness only when the database answers', async () => {
    const res = await call('/ready');
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ status: 'ready' });
  });

  it('returns an RFC 7807 problem for an unknown route', async () => {
    const res = await call('/does-not-exist');
    expect(res.status).toBe(404);
    expect(res.headers.get('content-type')).toContain('application/problem+json');
    await expect(res.json()).resolves.toMatchObject({ status: 404, title: 'Not Found' });
  });

  it('applies hardening headers to every response', async () => {
    const res = await call('/health');
    expect(res.headers.get('x-content-type-options')).toBe('nosniff');
    expect(res.headers.get('x-frame-options')).toBe('DENY');
    expect(res.headers.get('referrer-policy')).toBe('no-referrer');
    expect(res.headers.get('x-request-id')).toBeTruthy();
  });

  it('rejects a mutating request that is not JSON', async () => {
    const res = await app.request('/api/v1/me/profile', {
      method: 'POST',
      headers: { 'content-type': 'text/plain', 'x-dev-auth-sub': OWNER },
      body: 'handle=alex',
    });
    expect(res.status).toBe(415);
  });
});

describe('profile lifecycle', () => {
  let profileId: string;

  it('creates a profile for the authenticated subject', async () => {
    const res = await call('/me/profile', {
      method: 'POST',
      sub: OWNER,
      body: json({ handle: 'VitestOwner', display_name: 'Vitest Owner', bio: 'hello' }),
    });
    expect(res.status).toBe(201);
    const created = (await res.json()) as { id: string; handle: string; auth0_sub: string };
    expect(created.handle).toBe('vitestowner');
    expect(created.auth0_sub).toBe(OWNER);
    profileId = created.id;
  });

  it('refuses a second profile for the same subject', async () => {
    const res = await call('/me/profile', {
      method: 'POST',
      sub: OWNER,
      body: json({ handle: 'vitestowner2', display_name: 'Dupe' }),
    });
    expect(res.status).toBe(409);
  });

  it('refuses a handle that is already taken', async () => {
    const res = await call('/me/profile', {
      method: 'POST',
      sub: INTRUDER,
      body: json({ handle: 'vitestowner', display_name: 'Impostor' }),
    });
    expect(res.status).toBe(409);
  });

  it('never caches an authenticated response', async () => {
    const res = await call('/me/profile', { sub: OWNER });
    expect(res.status).toBe(200);
    expect(res.headers.get('cache-control')).toBe('private, no-store');
  });

  it('404s before a profile exists', async () => {
    const res = await call('/me/profile', { sub: INTRUDER });
    expect(res.status).toBe(404);
  });

  it('patches only the supplied fields', async () => {
    const res = await call('/me/profile', {
      method: 'PATCH',
      sub: OWNER,
      body: json({ location: 'Toronto, Canada' }),
    });
    expect(res.status).toBe(200);
    const updated = (await res.json()) as { location: string; bio: string; display_name: string };
    expect(updated.location).toBe('Toronto, Canada');
    expect(updated.bio).toBe('hello');
    expect(updated.display_name).toBe('Vitest Owner');
  });

  it('rejects a javascript: social link', async () => {
    const res = await call('/me/profile', {
      method: 'PATCH',
      sub: OWNER,
      body: json({ social_links: { site: 'javascript:alert(1)' } }),
    });
    expect(res.status).toBe(422);
    const problem = (await res.json()) as { errors: Array<{ loc: string[] }> };
    expect(problem.errors[0].loc[0]).toBe('body');
  });

  it('upserts the rig idempotently', async () => {
    const payload = json({ name: 'Vitest Rig', cpu: 'Ryzen 7 7800X3D', monitors: [] });
    const first = await call('/me/rig', { method: 'PUT', sub: OWNER, body: payload });
    const second = await call('/me/rig', { method: 'PUT', sub: OWNER, body: payload });
    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(await prisma.rig.count({ where: { profileId } })).toBe(1);
  });

  it('serves the public profile with a revalidatable ETag', async () => {
    const res = await call('/profiles/vitestowner');
    expect(res.status).toBe(200);
    expect(res.headers.get('cache-control')).toContain('max-age=60');

    const etag = res.headers.get('etag');
    expect(etag).toMatch(/^W\//);

    const revalidated = await call('/profiles/vitestowner', { headers: { 'if-none-match': etag! } });
    expect(revalidated.status).toBe(304);
  });

  it('hides a profile that has been made private', async () => {
    await call('/me/profile', { method: 'PATCH', sub: OWNER, body: json({ is_public: false }) });
    expect((await call('/profiles/vitestowner')).status).toBe(404);

    await call('/me/profile', { method: 'PATCH', sub: OWNER, body: json({ is_public: true }) });
    expect((await call('/profiles/vitestowner')).status).toBe(200);
  });
});

describe('ownership isolation', () => {
  let peripheralId: string;

  beforeAll(async () => {
    await call('/me/profile', {
      method: 'POST',
      sub: INTRUDER,
      body: json({ handle: 'vitestintruder', display_name: 'Intruder' }),
    });
    const res = await call('/me/peripherals', {
      method: 'POST',
      sub: OWNER,
      body: json({ type: 'Key Board', display_name: 'Keychron Q1 Pro' }),
    });
    peripheralId = ((await res.json()) as { id: string }).id;
  });

  it('normalises the peripheral type on write', async () => {
    const item = await prisma.peripheral.findUniqueOrThrow({ where: { id: peripheralId } });
    expect(item.type).toBe('key board');
  });

  it('does not let another account update the item', async () => {
    const res = await call(`/me/peripherals/${peripheralId}`, {
      method: 'PUT',
      sub: INTRUDER,
      body: json({ type: 'mouse', display_name: 'Hijacked' }),
    });
    expect(res.status).toBe(404);
    const item = await prisma.peripheral.findUniqueOrThrow({ where: { id: peripheralId } });
    expect(item.displayName).toBe('Keychron Q1 Pro');
  });

  it('does not let another account delete the item', async () => {
    const res = await call(`/me/peripherals/${peripheralId}`, { method: 'DELETE', sub: INTRUDER });
    expect(res.status).toBe(404);
    expect(await prisma.peripheral.count({ where: { id: peripheralId } })).toBe(1);
  });

  it('lets the owner delete its own item', async () => {
    const res = await call(`/me/peripherals/${peripheralId}`, { method: 'DELETE', sub: OWNER });
    expect(res.status).toBe(204);
    expect(await prisma.peripheral.count({ where: { id: peripheralId } })).toBe(0);
  });
});

describe('game entries and awards', () => {
  let entryId: string;

  beforeAll(async () => {
    const profile = await prisma.profile.findUniqueOrThrow({ where: { auth0Sub: OWNER } });
    const game = await prisma.game.upsert({
      where: { igdbId: 999_001 },
      create: { igdbId: 999_001, name: 'Vitest Quest', slug: 'vitest-quest' },
      update: {},
    });
    const entry = await prisma.profileGame.create({
      data: { profileId: profile.id, gameId: game.id, status: 'playing' },
    });
    entryId = entry.id;
  });

  it('rejects a completion date while the entry is still in progress', async () => {
    const res = await call(`/me/games/${entryId}`, {
      method: 'PATCH',
      sub: OWNER,
      body: json({ completed_on: '2024-03-30' }),
    });
    expect(res.status).toBe(422);
  });

  it('accepts a completion date once the status moves to completed', async () => {
    const res = await call(`/me/games/${entryId}`, {
      method: 'PATCH',
      sub: OWNER,
      body: json({ status: 'completed', completed_on: '2024-03-30', rating: 4.5 }),
    });
    expect(res.status).toBe(200);
    const entry = (await res.json()) as { completed_on: string; rating: number; game: { name: string } };
    expect(entry.completed_on).toBe('2024-03-30');
    expect(entry.rating).toBe(4.5);
    expect(entry.game.name).toBe('Vitest Quest');
  });

  it('clears the curated ordering when a game stops being featured', async () => {
    await call(`/me/games/${entryId}`, {
      method: 'PATCH',
      sub: OWNER,
      body: json({ featured: true, featured_order: 0, featured_note: 'pinned' }),
    });
    const res = await call(`/me/games/${entryId}`, {
      method: 'PATCH',
      sub: OWNER,
      body: json({ featured: false }),
    });
    expect(res.status).toBe(200);
    const entry = (await res.json()) as { featured_order: number | null; featured_note: string | null };
    expect(entry.featured_order).toBeNull();
    expect(entry.featured_note).toBeNull();
  });

  it('refuses an award that points at another account\u2019s game entry', async () => {
    const res = await call('/me/awards', {
      method: 'POST',
      sub: INTRUDER,
      body: json({ profile_game_id: entryId, title: 'Stolen Valor' }),
    });
    expect(res.status).toBe(422);
  });

  it('creates an award for the owner and cascades its deletion', async () => {
    const created = await call('/me/awards', {
      method: 'POST',
      sub: OWNER,
      body: json({ profile_game_id: entryId, title: 'Golden Save', awarded_on: '2024-03-30' }),
    });
    expect(created.status).toBe(201);
    const award = (await created.json()) as { id: string; awarded_on: string };
    expect(award.awarded_on).toBe('2024-03-30');

    expect((await call(`/me/games/${entryId}`, { method: 'DELETE', sub: OWNER })).status).toBe(204);
    expect(await prisma.award.count({ where: { id: award.id } })).toBe(0);
  });
});

// Signing calls Vercel Blob's token endpoint, so it needs real store credentials.
describe.skipIf(!process.env.BLOB_READ_WRITE_TOKEN)('upload signing', () => {
  it('derives the object path from the authenticated profile', async () => {
    const profile = await prisma.profile.findUniqueOrThrow({ where: { auth0Sub: OWNER } });
    const res = await call('/me/uploads/sign', {
      method: 'POST',
      sub: OWNER,
      body: json({ filename: '../../etc/passwd.png', content_type: 'image/png', size: 4096, purpose: 'avatar' }),
    });
    expect(res.status).toBe(200);

    const signed = (await res.json()) as { path: string; token: string };
    expect(signed.path).toBe(`users/${profile.id}/avatar/etc-passwd.png`);
    expect(signed.token).toBeTruthy();
  });

  it('refuses a content type that is not an allowed image', async () => {
    const res = await call('/me/uploads/sign', {
      method: 'POST',
      sub: OWNER,
      body: json({ filename: 'payload.svg', content_type: 'image/svg+xml', size: 128, purpose: 'avatar' }),
    });
    expect(res.status).toBe(415);
  });

  it('refuses a file larger than the configured ceiling', async () => {
    const res = await call('/me/uploads/sign', {
      method: 'POST',
      sub: OWNER,
      body: json({ filename: 'huge.png', content_type: 'image/png', size: 99 * 1024 * 1024, purpose: 'avatar' }),
    });
    expect(res.status).toBe(413);
  });
});
