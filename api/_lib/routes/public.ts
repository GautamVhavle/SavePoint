import { createHash } from 'node:crypto';
import { Hono } from 'hono';
import { body, loadComposite } from '../deps.js';
import { HttpError } from '../errors.js';
import { answerGuideQuestion } from '../integrations/gemini.js';
import { prisma } from '../prisma.js';
import { enforceGuideLimit } from '../rate-limit.js';
import { publicProfile } from '../serialize.js';
import { guideRequestSchema } from '../validation.js';

export const publicRoutes = new Hono();

publicRoutes.get('/health', c => c.json({ status: 'ok' }));

publicRoutes.get('/ready', async c => {
  await prisma.$queryRaw`SELECT 1`;
  return c.json({ status: 'ready' });
});

async function requirePublicProfile(handle: string) {
  const normalized = handle.trim().toLowerCase();
  const profile = await prisma.profile.findUnique({ where: { handle: normalized } });
  if (!profile || !profile.isPublic) throw new HttpError(404, 'That profile is not available');
  return profile;
}

publicRoutes.get('/profiles/:handle', async c => {
  const profile = await requirePublicProfile(c.req.param('handle'));
  const composite = await loadComposite(profile);

  // Weak validator: content only changes when the profile row or one of the
  // owned collections changes, so counts plus updated_at are enough.
  const fingerprint = [
    profile.id,
    profile.updatedAt.toISOString(),
    composite.games.length,
    composite.awards.length,
    composite.peripherals.length,
    composite.rig ? composite.rig.updatedAt.toISOString() : 'no-rig',
  ].join(':');
  const etag = `W/"${createHash('sha256').update(fingerprint).digest('hex').slice(0, 32)}"`;
  const headers = {
    'Cache-Control': 'public, max-age=60, stale-while-revalidate=300',
    ETag: etag,
  };

  if (c.req.header('if-none-match') === etag) return new Response(null, { status: 304, headers });
  return c.json(publicProfile(composite), 200, headers);
});

publicRoutes.post('/profiles/:handle/guide', async c => {
  const profile = await requirePublicProfile(c.req.param('handle'));
  const { question } = await body(c, guideRequestSchema);
  await enforceGuideLimit(c, profile.id);

  const composite = publicProfile(await loadComposite(profile));
  // Timestamps are noise for the model and leak nothing useful to the answer.
  const { created_at: _created, updated_at: _updated, ...profileContext } = composite.profile;
  const answer = await answerGuideQuestion(question, { ...composite, profile: profileContext });
  return c.json({ answer });
});
