import { del, list } from '@vercel/blob';
import { generateClientTokenFromReadWriteToken } from '@vercel/blob/client';
import { getEnv } from '../env.js';
import { HttpError } from '../errors.js';
import type { UploadRequest } from '../validation.js';

export const ALLOWED_CONTENT_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
export const UPLOAD_PURPOSES = ['avatar', 'rig', 'peripheral', 'game', 'award'] as const;
export type UploadPurpose = (typeof UPLOAD_PURPOSES)[number];

const EXTENSIONS: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
};

/** Client tokens are short-lived; the browser uploads immediately after signing. */
const TOKEN_TTL_MS = 5 * 60 * 1000;

/**
 * The pathname is derived server-side from the verified profile id, so a caller
 * can never place an object outside its own prefix regardless of what it sends.
 */
export function buildPathname(profileId: string, purpose: UploadPurpose, filename: string): string {
  const stem = filename
    .replace(/\.[^.]*$/, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
  return `users/${profileId}/${purpose}/${stem || purpose}`;
}

export interface SignedUpload {
  path: string;
  token: string;
  expires_at: string;
  max_bytes: number;
}

export async function signUpload(profileId: string, request: UploadRequest): Promise<SignedUpload> {
  const env = getEnv();
  if (!env.blobToken) throw new HttpError(503, 'Media storage is not configured');

  const contentType = request.content_type.split(';')[0].trim().toLowerCase();
  if (!ALLOWED_CONTENT_TYPES.includes(contentType)) {
    throw new HttpError(415, 'Only JPEG, PNG, WebP, and GIF images can be uploaded');
  }
  if (request.size > env.maxUploadBytes) {
    throw new HttpError(413, `Uploads are limited to ${Math.floor(env.maxUploadBytes / 1_048_576)} MB`);
  }

  const validUntil = Date.now() + TOKEN_TTL_MS;
  const path = `${buildPathname(profileId, request.purpose, request.filename)}.${EXTENSIONS[contentType]}`;
  const token = await generateClientTokenFromReadWriteToken({
    token: env.blobToken,
    pathname: path,
    validUntil,
    allowedContentTypes: [contentType],
    maximumSizeInBytes: env.maxUploadBytes,
    // A random suffix keeps every upload immutable, so cached CDN copies of a
    // previous avatar are never served for a newly uploaded one.
    addRandomSuffix: true,
  });

  return {
    path,
    token,
    expires_at: new Date(validUntil).toISOString(),
    max_bytes: env.maxUploadBytes,
  };
}

/** Best-effort wipe of a curator's Blob prefix. Account deletion still proceeds if this fails. */
export async function deleteProfileMedia(profileId: string): Promise<void> {
  const env = getEnv();
  if (!env.blobToken) return;
  try {
    const prefix = `users/${profileId}/`;
    let cursor: string | undefined;
    do {
      const page = await list({ prefix, token: env.blobToken, cursor });
      if (page.blobs.length) {
        await del(page.blobs.map(blob => blob.url), { token: env.blobToken });
      }
      cursor = page.hasMore ? page.cursor : undefined;
    } while (cursor);
  } catch (error) {
    console.error('blob_profile_cleanup_failed', error);
  }
}
