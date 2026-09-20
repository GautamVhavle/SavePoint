import type {
  ApiIGDBResult, ApiPublicProfile, GuideResponse, PeripheralInput, SavepointClient,
} from '../types';
import { mapPublicProfile } from './api-mapping';
import { demoClient } from './demo-backend';

export { mapPublicProfile };

const API_URL = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '');
export const isDemoMode = import.meta.env.VITE_DEMO_MODE === 'true' || !API_URL;

export { ApiError } from './api-error';
import { ApiError } from './api-error';

let tokenProvider: () => Promise<string | undefined> = async () => undefined;
/** Registered by the auth bridge so this module never imports Auth0 directly. */
export function configureAuthToken(provider: () => Promise<string | undefined>) { tokenProvider = provider; }

/** Hung connections must never spin the UI forever; caller aborts still win. */
const REQUEST_TIMEOUT_MS = 20_000;

async function request<T>(path: string, init: RequestInit = {}, token?: string): Promise<T> {
  if (!API_URL) throw new ApiError('API is not configured', 503);
  const timeout = AbortSignal.timeout(REQUEST_TIMEOUT_MS);
  const signal = init.signal ? AbortSignal.any([init.signal, timeout]) : timeout;
  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      ...init,
      signal,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...init.headers,
      },
    });
  } catch (error) {
    // A caller-initiated abort propagates so react-query can cancel quietly;
    // anything else (timeout included) normalizes into a transport failure.
    if (init.signal?.aborted) throw error;
    throw new ApiError('Could not reach the archive. Check your connection.', 0);
  }
  if (!response.ok) {
    const body = await response.json().catch(() => ({}) as { detail?: string });
    throw new ApiError(
      typeof body.detail === 'string' ? body.detail : 'The archive could not complete that request.',
      response.status,
      response.headers.get('x-request-id') ?? undefined,
    );
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

const auth = async () => {
  const token = await tokenProvider();
  if (!token) throw new ApiError('Sign in to continue', 401);
  return token;
};

const realClient: SavepointClient = {
  async publicProfile(handle, signal) {
    return mapPublicProfile(await request<ApiPublicProfile>(`/profiles/${encodeURIComponent(handle)}`, { signal }));
  },
  async createMe(input) {
    try {
      await request('/me/profile', { method: 'POST', body: JSON.stringify({ ...input, bio: input.bio ?? null }) }, await auth());
      return { created: true };
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) return { created: false };
      throw error;
    }
  },
  async me(signal) { return request<ApiPublicProfile>('/me/composite', { signal }, await auth()); },
  async patchMe(patch) { await request('/me/profile', { method: 'PATCH', body: JSON.stringify(patch) }, await auth()); },
  async deleteMe() { await request('/me/profile', { method: 'DELETE' }, await auth()); },
  async putRig(rig) { await request('/me/rig', { method: 'PUT', body: JSON.stringify(rig) }, await auth()); },
  async createPeripheral(input) { await request('/me/peripherals', { method: 'POST', body: JSON.stringify(input) }, await auth()); },
  async updatePeripheral(id, input) { await request(`/me/peripherals/${id}`, { method: 'PUT', body: JSON.stringify(input) }, await auth()); },
  async deletePeripheral(id) { await request(`/me/peripherals/${id}`, { method: 'DELETE' }, await auth()); },
  async searchIgdb(query, signal) {
    return request<ApiIGDBResult[]>(`/igdb/search?q=${encodeURIComponent(query)}`, { signal }, await auth());
  },
  async addGame(input) { await request('/me/games', { method: 'POST', body: JSON.stringify(input) }, await auth()); },
  async patchGame(id, patch) { await request(`/me/games/${id}`, { method: 'PATCH', body: JSON.stringify(patch) }, await auth()); },
  async deleteGame(id) { await request(`/me/games/${id}`, { method: 'DELETE' }, await auth()); },
  async createAward(input) { await request('/me/awards', { method: 'POST', body: JSON.stringify(input) }, await auth()); },
  async deleteAward(id) { await request(`/me/awards/${id}`, { method: 'DELETE' }, await auth()); },
  async uploadMedia(purpose, file) {
    const token = await auth();
    // The server derives the object path from the verified profile and issues a
    // short-lived, single-path token, so the browser never holds store-wide
    // credentials and cannot write outside its own prefix.
    const signed = await request<{ path: string; token: string }>('/me/uploads/sign', {
      method: 'POST',
      body: JSON.stringify({ filename: file.name, content_type: file.type, size: file.size, purpose }),
    }, token);

    try {
      const { put } = await import('@vercel/blob/client');
      const blob = await put(signed.path, file, {
        access: 'public',
        token: signed.token,
        contentType: file.type,
        // Media payloads are large; give them a generous but bounded window.
        abortSignal: AbortSignal.timeout(120_000),
      });
      return blob.url;
    } catch (error) {
      throw new ApiError(
        error instanceof Error && error.name === 'TimeoutError' ? 'Upload timed out' : 'Upload failed',
        0,
      );
    }
  },
  async guide(handle, question, signal) {
    return request<GuideResponse>(`/profiles/${encodeURIComponent(handle)}/guide`, {
      method: 'POST', body: JSON.stringify({ question }), signal,
    });
  },
};

export const api: SavepointClient = isDemoMode ? demoClient : realClient;
/** Direct handle on the network client so transport tests bypass demo mode. */
export const realApi = realClient;

export type { PeripheralInput };
