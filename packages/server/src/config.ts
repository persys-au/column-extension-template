import { z } from 'zod';

const environmentSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
});

export const serverConfigSchema = z.object({
  nodeEnv: z.enum(['development', 'test', 'production']),
  port: z.number().int().positive(),
});

export type ServerConfig = z.infer<typeof serverConfigSchema>;

/**
 * Parse an explicit server configuration.
 *
 * @param input Configuration data supplied by an application or test.
 * @returns A normalized server configuration.
 * @throws If the configuration does not have the expected shape.
 */
export function parseServerConfig(input: unknown): ServerConfig {
  return serverConfigSchema.parse(input);
}

/**
 * Load server configuration from runtime environment values.
 *
 * @param input Environment-like values. Defaults to the process environment.
 * @returns A normalized server configuration.
 * @throws If an environment value is invalid.
 */
export function loadServerConfig(input: unknown = process.env): ServerConfig {
  const environment = environmentSchema.parse(input);

  return parseServerConfig({
    nodeEnv: environment.NODE_ENV,
    port: environment.PORT,
  });
}
