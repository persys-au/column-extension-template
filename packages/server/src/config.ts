import { z } from 'zod';

const emptyToUndefined = (value: unknown): unknown =>
  typeof value === 'string' && value.trim() === '' ? undefined : value;

const providerIdSchema = z
  .string()
  .trim()
  .min(1)
  .regex(/^[a-z0-9][a-z0-9._-]*$/i);
const optionalEnvironmentString = z.preprocess(
  emptyToUndefined,
  z.string().trim().min(1).optional(),
);

const environmentSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().positive().default(3000),
    AI_PROVIDER: z.preprocess(emptyToUndefined, providerIdSchema.optional()),
    AI_MODEL: optionalEnvironmentString,
    OPENAI_MODEL: optionalEnvironmentString,
    ANTHROPIC_MODEL: optionalEnvironmentString,
    AI_API_KEY: optionalEnvironmentString,
    OPENAI_API_KEY: optionalEnvironmentString,
    ANTHROPIC_API_KEY: optionalEnvironmentString,
    AI_BASE_URL: z.preprocess(emptyToUndefined, z.string().trim().url().optional()),
    AI_REQUEST_TIMEOUT_MS: z.preprocess(
      emptyToUndefined,
      z.coerce.number().int().positive().max(300_000).default(120_000),
    ),
    AI_MAX_OUTPUT_TOKENS: z.preprocess(
      emptyToUndefined,
      z.coerce.number().int().positive().max(200_000).default(4_096),
    ),
  })
  .superRefine((environment, context) => {
    const selectedProviderId = environment.AI_PROVIDER?.toLowerCase();
    const selectedProviderModel =
      selectedProviderId === 'openai'
        ? environment.OPENAI_MODEL
        : selectedProviderId === 'anthropic'
          ? environment.ANTHROPIC_MODEL
          : undefined;
    const hasAnyModel =
      environment.AI_MODEL !== undefined ||
      environment.OPENAI_MODEL !== undefined ||
      environment.ANTHROPIC_MODEL !== undefined;

    if (
      environment.AI_PROVIDER !== undefined &&
      selectedProviderModel === undefined &&
      environment.AI_MODEL === undefined
    ) {
      context.addIssue({
        code: 'custom',
        path: [
          selectedProviderId === 'openai'
            ? 'OPENAI_MODEL'
            : selectedProviderId === 'anthropic'
              ? 'ANTHROPIC_MODEL'
              : 'AI_MODEL',
        ],
        message:
          'A provider-specific model or AI_MODEL fallback is required when AI_PROVIDER is configured',
      });
    }

    if (environment.AI_PROVIDER === undefined && hasAnyModel) {
      context.addIssue({
        code: 'custom',
        path: ['AI_PROVIDER'],
        message: 'AI_PROVIDER is required when an AI model is configured',
      });
    }

    if (environment.AI_API_KEY !== undefined && environment.AI_PROVIDER === undefined) {
      context.addIssue({
        code: 'custom',
        path: ['AI_PROVIDER'],
        message: 'AI_PROVIDER is required when the fallback AI_API_KEY is configured',
      });
    }
  });

const aiRuntimeConfigSchema = z.object({
  providerId: providerIdSchema.optional(),
  model: z.string().trim().min(1).optional(),
  baseUrl: z.string().trim().url().optional(),
  credentialsByProvider: z.record(z.string(), z.record(z.string(), z.string())),
  timeoutMs: z.number().int().positive().max(300_000),
  maxOutputTokens: z.number().int().positive().max(200_000),
});

export const serverConfigSchema = z.object({
  nodeEnv: z.enum(['development', 'test', 'production']),
  port: z.number().int().positive(),
  ai: aiRuntimeConfigSchema,
});

export type ServerConfig = z.infer<typeof serverConfigSchema>;
export type AiRuntimeConfig = z.infer<typeof aiRuntimeConfigSchema>;

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
  const selectedProviderId = environment.AI_PROVIDER?.toLowerCase();
  const modelByProvider: Readonly<Record<string, string>> = {
    ...(environment.OPENAI_MODEL === undefined ? {} : { openai: environment.OPENAI_MODEL }),
    ...(environment.ANTHROPIC_MODEL === undefined
      ? {}
      : { anthropic: environment.ANTHROPIC_MODEL }),
  };
  const model =
    selectedProviderId === undefined
      ? environment.AI_MODEL
      : (modelByProvider[selectedProviderId] ?? environment.AI_MODEL);
  const credentialsByProvider = {
    ...(selectedProviderId !== undefined && environment.AI_API_KEY !== undefined
      ? { [selectedProviderId]: { apiKey: environment.AI_API_KEY } }
      : {}),
    ...(environment.OPENAI_API_KEY === undefined
      ? {}
      : { openai: { apiKey: environment.OPENAI_API_KEY } }),
    ...(environment.ANTHROPIC_API_KEY === undefined
      ? {}
      : { anthropic: { apiKey: environment.ANTHROPIC_API_KEY } }),
  };

  return parseServerConfig({
    nodeEnv: environment.NODE_ENV,
    port: environment.PORT,
    ai: {
      providerId: environment.AI_PROVIDER,
      model,
      ...(environment.AI_BASE_URL === undefined ? {} : { baseUrl: environment.AI_BASE_URL }),
      credentialsByProvider,
      timeoutMs: environment.AI_REQUEST_TIMEOUT_MS,
      maxOutputTokens: environment.AI_MAX_OUTPUT_TOKENS,
    },
  });
}
