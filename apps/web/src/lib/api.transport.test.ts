import { afterEach, describe, expect, it, vi } from 'vitest';

/**
 * Transport hardening guards: hung connections normalize into a friendly
 * ApiError while caller-initiated aborts propagate untouched so react-query
 * can cancel quietly.
 */
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.resetModules();
});

async function loadRealClient() {
  vi.resetModules();
  vi.stubEnv('VITE_API_URL', 'https://api.test');
  return import('./api');
}

describe('network transport', () => {
  it('normalizes timeouts and transport failures into a status-0 ApiError', async () => {
    const { realApi, ApiError } = await loadRealClient();
    vi.stubGlobal('fetch', vi.fn(async () => {
      throw new DOMException('The operation timed out.', 'TimeoutError');
    }));
    const error = await realApi.guide('nova', 'hello').catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect((error as InstanceType<typeof ApiError>).status).toBe(0);
    expect((error as InstanceType<typeof ApiError>).message).toContain('Could not reach the archive');
  });

  it('propagates caller aborts untouched', async () => {
    const { realApi } = await loadRealClient();
    const controller = new AbortController();
    controller.abort();
    vi.stubGlobal('fetch', vi.fn(async (_url: string | URL, init?: RequestInit) => {
      if (init?.signal?.aborted) throw new DOMException('The user aborted a request.', 'AbortError');
      return new Response(JSON.stringify({ answer: 'ok' }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }));
    await expect(realApi.guide('nova', 'hello', controller.signal))
      .rejects.toMatchObject({ name: 'AbortError' });
  });
});
