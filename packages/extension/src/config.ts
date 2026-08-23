import { z } from 'zod';
import { featureFlagConfigSchema, loadFeatureFlagConfig } from './featureFlags/config';

const emptyToUndefined = (value: unknown): unknown =>
  typeof value === 'string' && value.trim() === '' ? undefined : value;

const environmentSchema = z.object({
  VITE_API_BASE_URL: z.preprocess(emptyToUndefined, z.string().url().optional()),
});

export const extensionConfigSchema = z.object({
  apiBaseUrl: z.string().url().optional(),
  featureFlags: featureFlagConfigSchema,
});

export type ExtensionConfig = z.infer<typeof extensionConfigSchema>;

/**
 * Parse an explicit extension configuration.
 *
 * @param input Configuration data supplied by an application or test.
 * @returns A normalized extension configuration.
 * @throws If the configuration does not have the expected shape.
 */
export function parseExtensionConfig(input: unknown): ExtensionConfig {
  return extensionConfigSchema.parse(input);
}

/**
 * Load browser-safe extension configuration from build-time environment values.
 *
 * @param input Environment-like values exposed by the bundler.
 * @returns A normalized extension configuration.
 * @throws If an environment value is invalid.
 */
export function loadExtensionConfig(input: unknown = import.meta.env): ExtensionConfig {
  const environment = environmentSchema.parse(input);

  return parseExtensionConfig({
    apiBaseUrl: environment.VITE_API_BASE_URL,
    featureFlags: loadFeatureFlagConfig(input),
  });
}
