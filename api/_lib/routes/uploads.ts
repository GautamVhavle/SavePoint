import { Hono } from 'hono';
import { body, ownerProfile } from '../deps.js';
import { getEnv } from '../env.js';
import { signUpload } from '../integrations/blob.js';
import { enforceScopeLimit } from '../rate-limit.js';
import { uploadRequestSchema } from '../validation.js';

export const uploadRoutes = new Hono();

uploadRoutes.post('/me/uploads/sign', async c => {
  const profile = await ownerProfile(c);
  const input = await body(c, uploadRequestSchema);
  await enforceScopeLimit(c, 'uploads', profile.id, getEnv().uploadRateLimit);
  return c.json(await signUpload(profile.id, input));
});
