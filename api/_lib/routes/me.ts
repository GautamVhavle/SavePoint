import { Hono } from 'hono';
import { currentPrincipal } from '../auth.js';
import { body, loadComposite, ownerProfile, pathUuid } from '../deps.js';
import { HttpError } from '../errors.js';
import { deleteProfileMedia } from '../integrations/blob.js';
import { prisma } from '../prisma.js';
import { peripheralRead, profileRead, publicProfile, rigRead } from '../serialize.js';
import { peripheralInputSchema, profileCreateSchema, profileUpdateSchema, rigInputSchema } from '../validation.js';

export const meRoutes = new Hono();

meRoutes.post('/me/profile', async c => {
  const principal = await currentPrincipal(c);
  const input = await body(c, profileCreateSchema);

  const existing = await prisma.profile.findUnique({ where: { auth0Sub: principal.subject } });
  if (existing) throw new HttpError(409, 'A profile already exists for this account');

  const profile = await prisma.profile.create({
    data: {
      auth0Sub: principal.subject,
      handle: input.handle,
      displayName: input.display_name,
      bio: input.bio ?? null,
      avatarUrl: input.avatar_url ?? null,
      themePreference: input.theme_preference,
      location: input.location ?? null,
      socialLinks: input.social_links,
      isPublic: input.is_public,
    },
  });
  return c.json(profileRead(profile), 201);
});

meRoutes.get('/me/profile', async c => c.json(profileRead(await ownerProfile(c))));

meRoutes.get('/me/composite', async c => {
  const profile = await ownerProfile(c);
  return c.json(publicProfile(await loadComposite(profile)));
});

meRoutes.patch('/me/profile', async c => {
  const profile = await ownerProfile(c);
  const patch = await body(c, profileUpdateSchema);

  // `undefined` means the key was absent, so only supplied fields are written.
  const updated = await prisma.profile.update({
    where: { id: profile.id },
    data: {
      ...(patch.handle !== undefined && { handle: patch.handle }),
      ...(patch.display_name !== undefined && { displayName: patch.display_name }),
      ...(patch.bio !== undefined && { bio: patch.bio }),
      ...(patch.avatar_url !== undefined && { avatarUrl: patch.avatar_url }),
      ...(patch.theme_preference !== undefined && { themePreference: patch.theme_preference }),
      ...(patch.location !== undefined && { location: patch.location }),
      ...(patch.social_links !== undefined && { socialLinks: patch.social_links }),
      ...(patch.is_public !== undefined && { isPublic: patch.is_public }),
    },
  });
  return c.json(profileRead(updated));
});

meRoutes.delete('/me/profile', async c => {
  const profile = await ownerProfile(c);
  await deleteProfileMedia(profile.id);
  await prisma.profile.delete({ where: { id: profile.id } });
  return c.body(null, 204);
});

meRoutes.put('/me/rig', async c => {
  const profile = await ownerProfile(c);
  const input = await body(c, rigInputSchema);
  const fields = {
    name: input.name,
    heroPhotoUrl: input.hero_photo_url ?? null,
    monitors: input.monitors,
    cpu: input.cpu ?? null,
    gpu: input.gpu ?? null,
    motherboard: input.motherboard ?? null,
    memory: input.memory ?? null,
    storage: input.storage ?? null,
    case: input.case ?? null,
    psu: input.psu ?? null,
    cooling: input.cooling ?? null,
    os: input.os ?? null,
    notes: input.notes ?? null,
  };

  const rig = await prisma.rig.upsert({
    where: { profileId: profile.id },
    create: { profileId: profile.id, ...fields },
    update: fields,
  });
  return c.json(rigRead(rig));
});

const peripheralFields = (input: Awaited<ReturnType<typeof peripheralInputSchema.parseAsync>>) => ({
  type: input.type,
  displayName: input.display_name,
  brandModel: input.brand_model ?? null,
  photoUrl: input.photo_url ?? null,
  notes: input.notes ?? null,
  sortOrder: input.sort_order,
});

meRoutes.post('/me/peripherals', async c => {
  const profile = await ownerProfile(c);
  const input = await body(c, peripheralInputSchema);
  const item = await prisma.peripheral.create({
    data: { profileId: profile.id, ...peripheralFields(input) },
  });
  return c.json(peripheralRead(item), 201);
});

meRoutes.put('/me/peripherals/:itemId', async c => {
  const profile = await ownerProfile(c);
  const itemId = pathUuid(c, 'itemId');
  const input = await body(c, peripheralInputSchema);

  // Scoping the update by profile id makes cross-tenant writes impossible.
  const { count } = await prisma.peripheral.updateMany({
    where: { id: itemId, profileId: profile.id },
    data: peripheralFields(input),
  });
  if (count === 0) throw new HttpError(404, 'That peripheral was not found');

  const item = await prisma.peripheral.findUniqueOrThrow({ where: { id: itemId } });
  return c.json(peripheralRead(item));
});

meRoutes.delete('/me/peripherals/:itemId', async c => {
  const profile = await ownerProfile(c);
  const { count } = await prisma.peripheral.deleteMany({
    where: { id: pathUuid(c, 'itemId'), profileId: profile.id },
  });
  if (count === 0) throw new HttpError(404, 'That peripheral was not found');
  return c.body(null, 204);
});
