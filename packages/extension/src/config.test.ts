import { describe, expect, it } from 'vitest';
import { loadExtensionConfig, parseExtensionConfig } from './config';

describe('extension config', () => {
  it('uses empty optional values by default', () => {
    expect(loadExtensionConfig({})).toEqual({
      apiBaseUrl: undefined,
      featureFlags: { environmentKey: '' },
    });
  });

  it('normalizes build-time environment values', () => {
    expect(
      loadExtensionConfig({
        VITE_API_BASE_URL: 'https://api.example.test',
        VITE_FLAGSMITH_ENV_KEY: 'public-environment-key',
      }),
    ).toEqual({
      apiBaseUrl: 'https://api.example.test',
      featureFlags: { environmentKey: 'public-environment-key' },
    });
  });

  it('rejects malformed API configuration', () => {
    expect(() => loadExtensionConfig({ VITE_API_BASE_URL: 'not-a-url' })).toThrow();
    expect(() =>
      parseExtensionConfig({
        apiBaseUrl: 'not-a-url',
        featureFlags: { environmentKey: '' },
      }),
    ).toThrow();
  });
});
