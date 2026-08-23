import { FlagsmithClientProvider } from '@openfeature/flagsmith-client-provider';
import { InMemoryProvider, OpenFeature } from '@openfeature/web-sdk';
import { describe, expect, it } from 'vitest';
import { configureFeatureFlags, createFeatureFlagProvider } from './provider';

describe('feature flag provider', () => {
  it('uses an in-memory provider without a Flagsmith environment key', () => {
    expect(createFeatureFlagProvider({ environmentKey: '' })).toBeInstanceOf(InMemoryProvider);
  });

  it('uses Flagsmith when a public environment key is configured', () => {
    expect(createFeatureFlagProvider({ environmentKey: 'test-environment-key' })).toBeInstanceOf(
      FlagsmithClientProvider,
    );
  });

  it('configures the default OpenFeature client', () => {
    configureFeatureFlags({ environmentKey: '' });

    expect(OpenFeature.getProvider()).toBeInstanceOf(InMemoryProvider);
  });
});
