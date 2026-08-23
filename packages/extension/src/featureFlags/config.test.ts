import { describe, expect, it } from 'vitest';
import { loadFeatureFlagConfig, parseFeatureFlagConfig } from './config';

describe('feature flag configuration', () => {
  it('parses and trims an explicit environment key', () => {
    expect(parseFeatureFlagConfig({ environmentKey: '  environment-key  ' })).toEqual({
      environmentKey: 'environment-key',
    });
  });

  it('loads a public Flagsmith key from build-time environment values', () => {
    expect(loadFeatureFlagConfig({ VITE_FLAGSMITH_ENV_KEY: 'environment-key' })).toEqual({
      environmentKey: 'environment-key',
    });
  });

  it('uses an empty key when no environment key is configured', () => {
    expect(loadFeatureFlagConfig({ VITE_FLAGSMITH_ENV_KEY: '  ' })).toEqual({
      environmentKey: '',
    });
  });

  it('rejects non-string environment values', () => {
    expect(() => loadFeatureFlagConfig({ VITE_FLAGSMITH_ENV_KEY: true })).toThrow();
  });
});
