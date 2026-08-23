import { FlagsmithClientProvider } from '@openfeature/flagsmith-client-provider';
import { InMemoryProvider, OpenFeature } from '@openfeature/web-sdk';
import type { FeatureFlagConfig } from './config';
import { loadFeatureFlagConfig } from './config';

/**
 * Create the OpenFeature provider used by the extension.
 *
 * A configured public Flagsmith environment key enables remote flags. Without a key, the
 * deterministic in-memory provider keeps local development and tests independent of the network.
 *
 * @param config Optional explicit configuration for an application or test.
 * @returns A Flagsmith provider or an empty in-memory provider.
 */
export function createFeatureFlagProvider(
  config: FeatureFlagConfig = loadFeatureFlagConfig(import.meta.env),
) {
  if (config.environmentKey) {
    return new FlagsmithClientProvider({
      environmentID: config.environmentKey,
      cacheFlags: true,
    });
  }

  return new InMemoryProvider({});
}

/**
 * Configure the default OpenFeature client for an extension runtime.
 *
 * @param config Optional explicit configuration for an application or test.
 * @returns Nothing. The provider is registered with the default OpenFeature client.
 */
export function configureFeatureFlags(
  config: FeatureFlagConfig = loadFeatureFlagConfig(import.meta.env),
): void {
  OpenFeature.setProvider(createFeatureFlagProvider(config));
}
