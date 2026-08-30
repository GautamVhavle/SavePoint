import { Hono } from 'hono';
import { body, ownerProfile, pathUuid } from '../deps.js';
import { HttpError } from '../errors.js';
import { prisma } from '../prisma.js';
import { awardRead, toDateColumn } from '../serialize.js';
import { awardInputSchema, type AwardInput } from '../validation.js';

export const awardRoutes = new Hono();

/** An award may only decorate a game entry the same profile owns. */
async function assertOwnedGameEntry(profileId: string, profileGameId: string): Promise<void> {
  const entry = await prisma.profileGame.findFirst({ where: { id: profileGameId, profileId } });
  if (!entry) {
    throw new HttpError(422, 'profile_game_id must reference one of your games', {}, {
      errors: [
        { loc: ['body', 'profile_game_id'], msg: 'unknown game entry', type: 'value_error' },
      ],
    });
  }
}

const awardFields = (input: AwardInput) => ({
  profileGameId: input.profile_game_id,
  title: input.title,
  description: input.description ?? null,
  iconUrl: input.icon_url ?? null,
  awardedOn: toDateColumn(input.awarded_on),
  sortOrder: input.sort_order,
});

awardRoutes.post('/me/awards', async c => {
  const profile = await ownerProfile(c);
  const input = await body(c, awardInputSchema);
  await assertOwnedGameEntry(profile.id, input.profile_game_id);

  const award = await prisma.award.create({ data: { profileId: profile.id, ...awardFields(input) } });
  return c.json(awardRead(award), 201);
});

awardRoutes.put('/me/awards/:itemId', async c => {
  const profile = await ownerProfile(c);
  const itemId = pathUuid(c, 'itemId');
  const input = await body(c, awardInputSchema);
  await assertOwnedGameEntry(profile.id, input.profile_game_id);

  const { count } = await prisma.award.updateMany({
    where: { id: itemId, profileId: profile.id },
    data: awardFields(input),
  });
  if (count === 0) throw new HttpError(404, 'That award was not found');

  const award = await prisma.award.findUniqueOrThrow({ where: { id: itemId } });
  return c.json(awardRead(award));
});

awardRoutes.delete('/me/awards/:itemId', async c => {
  const profile = await ownerProfile(c);
  const { count } = await prisma.award.deleteMany({
    where: { id: pathUuid(c, 'itemId'), profileId: profile.id },
  });
  if (count === 0) throw new HttpError(404, 'That award was not found');
  return c.body(null, 204);
});
