import { describe, expect, it } from 'vitest';
import {
  buildProviderUrl,
  parseProviderOutput,
  requireProviderCredential,
  requestProviderJson,
  serializeProviderInput,
} from './shared';

describe('provider adapter helpers', () => {
  it('serializes structured input and parses fenced JSON output', () => {
    expect(serializeProviderInput({ value: 'input' })).toBe('{"value":"input"}');
    expect(serializeProviderInput('plain input')).toBe('plain input');
    expect(parseProviderOutput('test-provider', '```json\n{"ok":true}\n```', undefined)).toEqual({
      ok: true,
    });
  });

  it('supports custom output parsers and provider URL paths', () => {
    expect(parseProviderOutput('test-provider', 'raw output', (content) => ({ content }))).toEqual({
      content: 'raw output',
    });
    expect(buildProviderUrl('https://api.example.test/v1', '/messages')).toBe(
      'https://api.example.test/v1/messages',
    );
  });

  it('rejects blank provider credentials', () => {
    expect(() =>
      requireProviderCredential(
        { model: 'test-model', credentials: { apiKey: '   ' } },
        'test-provider',
        'apiKey',
      ),
    ).toThrowError(
      expect.objectContaining({ code: 'missing_credential', providerId: 'test-provider' }),
    );
  });

  it('returns parsed provider JSON and maps transport failures', async () => {
    const fetcher = async () => new Response('{"ok":true}', { status: 200 });

    await expect(
      requestProviderJson(fetcher, 'test-provider', 'https://api.example.test', {}),
    ).resolves.toEqual({ ok: true });

    const failingFetcher = async () => new Response('{"error":"rate limited"}', { status: 429 });

    await expect(
      requestProviderJson(failingFetcher, 'test-provider', 'https://api.example.test', {}),
    ).rejects.toMatchObject({
      code: 'http_failure',
      providerId: 'test-provider',
      status: 429,
      responseBody: '{"error":"rate limited"}',
    });
  });
});
