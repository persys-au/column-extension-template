import { z } from 'zod';

const emptyToUndefined = (value: unknown): unknown =>
  typeof value === 'string' && value.trim() === '' ? undefined : value;

const environmentSchema = z.object({
  VITE_FLAGSMITH_ENV_KEY: z.preprocess(emptyToUndefined, z.string().trim().min(1).optional()),
});

export const featureFlagConfigSchema = z.object({
  environmentKey: z.string().trim(),
});

export type FeatureFlagConfig = z.infer<typeof featureFlagConfigSchema>;

/**
 * Parse an explicit feature-flag configuration.
 *
 * @param input Configuration data supplied by an application or test.
 * @returns A normalized feature-flag configuration.
 * @throws If the configuration does not have the expected shape.
 */
export function parseFeatureFlagConfig(input: unknown): FeatureFlagConfig {
  return featureFlagConfigSchema.parse(input);
}

/**
 * Load the browser-safe Flagsmith configuration from build-time environment values.
 *
 * @param input Environment-like values exposed by the bundler.
 * @returns A normalized feature-flag configuration.
 * @throws If the environment value has an invalid type.
 */
export function loadFeatureFlagConfig(input: unknown): FeatureFlagConfig {
  const environment = environmentSchema.parse(input);

  return parseFeatureFlagConfig({
    environmentKey: environment.VITE_FLAGSMITH_ENV_KEY ?? '',
  });
}
