import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fetchWithTimeout } from '../utils/fetchWithTimeout';

describe('fetchWithTimeout', () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('returns response when fetch resolves within timeout', async () => {
    const mockResponse = new Response('ok', { status: 200 });
    globalThis.fetch = vi.fn().mockResolvedValue(mockResponse);

    const result = await fetchWithTimeout('https://example.com', {}, 5000);
    expect(result.status).toBe(200);
    expect(globalThis.fetch).toHaveBeenCalledOnce();
  });

  it('aborts when fetch exceeds timeout', async () => {
    // Create a fetch that never resolves within timeout
    globalThis.fetch = vi.fn().mockImplementation((_url, opts) => {
      return new Promise((_resolve, reject) => {
        const signal = opts?.signal as AbortSignal;
        if (signal) {
          signal.addEventListener('abort', () => {
            reject(new DOMException('The operation was aborted.', 'AbortError'));
          });
        }
      });
    });

    await expect(fetchWithTimeout('https://example.com', {}, 50)).rejects.toThrow('aborted');
  });

  it('passes options through to fetch', async () => {
    const mockResponse = new Response('ok');
    globalThis.fetch = vi.fn().mockResolvedValue(mockResponse);

    await fetchWithTimeout(
      'https://example.com',
      { method: 'POST', headers: { 'Content-Type': 'application/json' } },
      5000,
    );

    const callArgs = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(callArgs[0]).toBe('https://example.com');
    expect(callArgs[1].method).toBe('POST');
    expect(callArgs[1].headers['Content-Type']).toBe('application/json');
    // Should have a signal attached
    expect(callArgs[1].signal).toBeInstanceOf(AbortSignal);
  });
});
