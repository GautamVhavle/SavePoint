import { Hono } from 'hono';
import { body, ownerProfile, pathUuid } from '../deps.js';
import { getEnv } from '../env.js';
import { HttpError } from '../errors.js';
import type { Prisma } from '../generated/prisma/client.js';
import { gameDetails, searchGames } from '../integrations/igdb.js';
import { prisma } from '../prisma.js';
import { enforceScopeLimit } from '../rate-limit.js';
import { profileGameRead, sortGames, toDateColumn } from '../serialize.js';
import { gameStateIssues, igdbSearchSchema, profileGameInputSchema, profileGameUpdateSchema } from '../validation.js';

export const gameRoutes = new Hono();

gameRoutes.get('/igdb/search', async c => {
  const profile = await ownerProfile(c);
  const parsed = igdbSearchSchema.safeParse({ q: c.req.query('q'), limit: c.req.query('limit') ?? undefined });
  if (!parsed.success) throw parsed.error;

  await enforceScopeLimit(c, 'igdb', profile.id, getEnv().igdbRateLimit);
  return c.json(await searchGames(parsed.data.q, parsed.data.limit));
});

gameRoutes.post('/me/games', async c => {
  const profile = await ownerProfile(c);
  const input = await body(c, profileGameInputSchema);

  const duplicate = await prisma.profileGame.findFirst({
    where: { profileId: profile.id, game: { igdbId: input.igdb_id } },
  });
  if (duplicate) throw new HttpError(409, 'That game is already in your archive');

  const meta = await gameDetails(input.igdb_id);
  const metaFields = {
    name: meta.name,
    slug: meta.slug,
    summary: meta.summary,
    coverUrl: meta.cover_url,
    bannerUrl: meta.banner_url,
    releaseDate: meta.release_date ? new Date(meta.release_date) : null,
    genres: meta.genres,
    platforms: meta.platforms,
    snapshot: meta.snapshot as Prisma.InputJsonObject,
    snapshotAt: new Date(),
  };
  const game = await prisma.game.upsert({
    where: { igdbId: meta.igdb_id },
    create: { igdbId: meta.igdb_id, ...metaFields },
    update: metaFields,
  });

  const entry = await prisma.profileGame.create({
    data: {
      profileId: profile.id,
      gameId: game.id,
      status: input.status,
      rating: input.rating ?? null,
      review: input.review ?? null,
      hoursPlayed: input.hours_played ?? null,
      startedOn: toDateColumn(input.started_on),
      completedOn: toDateColumn(input.completed_on),
      platform: input.platform ?? null,
      featured: input.featured,
      featuredOrder: input.featured_order ?? null,
      featuredNote: input.featured_note ?? null,
    },
    include: { game: true },
  });
  return c.json(profileGameRead(entry), 201);
});

gameRoutes.get('/me/games', async c => {
  const profile = await ownerProfile(c);
  const entries = await prisma.profileGame.findMany({
    where: { profileId: profile.id },
    include: { game: true },
  });
  return c.json(sortGames(entries).map(profileGameRead));
});

gameRoutes.patch('/me/games/:itemId', async c => {
  const profile = await ownerProfile(c);
  const itemId = pathUuid(c, 'itemId');
  const patch = await body(c, profileGameUpdateSchema);

  const current = await prisma.profileGame.findFirst({ where: { id: itemId, profileId: profile.id } });
  if (!current) throw new HttpError(404, 'That game entry was not found');

  const day = (value: Date | null) => (value ? value.toISOString().slice(0, 10) : null);
  const merged = {
    status: patch.status ?? current.status,
    started_on: patch.started_on !== undefined ? (patch.started_on ?? null) : day(current.startedOn),
    completed_on: patch.completed_on !== undefined ? (patch.completed_on ?? null) : day(current.completedOn),
    featured: patch.featured ?? current.featured,
    featured_order: patch.featured_order !== undefined ? (patch.featured_order ?? null) : current.featuredOrder,
    featured_note: patch.featured_note !== undefined ? (patch.featured_note ?? null) : current.featuredNote,
  };
  // Un-featuring always drops the curated order and note so the DB CHECK holds.
  if (!merged.featured) {
    merged.featured_order = null;
    merged.featured_note = null;
  }

  const issues = gameStateIssues(merged);
  if (issues.length > 0) {
    throw new HttpError(422, issues[0].message, {}, {
      errors: issues.map(issue => ({ loc: ['body', issue.path], msg: issue.message, type: 'value_error' })),
    });
  }

  const entry = await prisma.profileGame.update({
    where: { id: itemId },
    data: {
      status: merged.status,
      startedOn: toDateColumn(merged.started_on),
      completedOn: toDateColumn(merged.completed_on),
      featured: merged.featured,
      featuredOrder: merged.featured_order,
      featuredNote: merged.featured_note,
      ...(patch.rating !== undefined && { rating: patch.rating }),
      ...(patch.review !== undefined && { review: patch.review }),
      ...(patch.hours_played !== undefined && { hoursPlayed: patch.hours_played }),
      ...(patch.platform !== undefined && { platform: patch.platform }),
    },
    include: { game: true },
  });
  return c.json(profileGameRead(entry));
});

gameRoutes.delete('/me/games/:itemId', async c => {
  const profile = await ownerProfile(c);
  const { count } = await prisma.profileGame.deleteMany({
    where: { id: pathUuid(c, 'itemId'), profileId: profile.id },
  });
  if (count === 0) throw new HttpError(404, 'That game entry was not found');
  return c.body(null, 204);
});
