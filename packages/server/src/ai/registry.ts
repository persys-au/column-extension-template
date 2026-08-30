import type {
  AiProvider,
  AiProviderFactory,
  AiProviderSelection,
  AiProviderSettings,
} from './provider.js';

const providerIdPattern = /^[a-z0-9][a-z0-9._-]*$/;

export type AiProviderRegistryErrorCode =
  | 'invalid_provider_id'
  | 'duplicate_provider'
  | 'unknown_provider'
  | 'invalid_configuration'
  | 'invalid_provider';

/**
 * Typed failure raised while registering or resolving an AI provider adapter.
 */
export class AiProviderRegistryError extends Error {
  readonly code: AiProviderRegistryErrorCode;

  constructor(code: AiProviderRegistryErrorCode, message: string, cause?: unknown) {
    super(message, cause === undefined ? undefined : { cause });
    this.name = 'AiProviderRegistryError';
    this.code = code;
  }
}

function normalizeProviderId(providerId: string): string {
  const normalized = typeof providerId === 'string' ? providerId.trim().toLowerCase() : '';

  if (!providerIdPattern.test(normalized)) {
    throw new AiProviderRegistryError(
      'invalid_provider_id',
      'AI provider IDs must start with a letter or number and contain only letters, numbers, dots, underscores, or hyphens',
    );
  }

  return normalized;
}

/**
 * Registry for provider adapters owned by the server composition root.
 *
 * @typeParam TInput The product-owned input type.
 */
export class AiProviderRegistry<TInput> {
  private readonly factories = new Map<string, AiProviderFactory<TInput>>();

  constructor(factories: readonly AiProviderFactory<TInput>[] = []) {
    for (const factory of factories) {
      this.register(factory);
    }
  }

  /**
   * Register one provider factory.
   *
   * @param factory Provider adapter factory to register.
   * @returns This registry for composition.
   * @throws If the provider ID is invalid or already registered.
   */
  register(factory: AiProviderFactory<TInput>): this {
    const providerId = normalizeProviderId(factory.id);

    if (this.factories.has(providerId)) {
      throw new AiProviderRegistryError(
        'duplicate_provider',
        `AI provider "${providerId}" is already registered`,
      );
    }

    this.factories.set(providerId, factory);
    return this;
  }

  /**
   * Return the IDs of all registered providers.
   *
   * @returns Registered provider IDs in registration order.
   */
  providerIds(): readonly string[] {
    return [...this.factories.keys()];
  }

  /**
   * Create an adapter for a configured provider ID.
   *
   * @param providerId Provider ID selected by runtime configuration.
   * @param settings Provider-neutral adapter settings.
   * @returns A configured provider adapter.
   * @throws If the provider is unknown, settings are invalid, or the adapter reports an invalid identity.
   */
  create(providerId: string, settings: AiProviderSettings): AiProvider<TInput> {
    const normalizedProviderId = normalizeProviderId(providerId);
    const factory = this.factories.get(normalizedProviderId);

    if (!factory) {
      throw new AiProviderRegistryError(
        'unknown_provider',
        `AI provider "${normalizedProviderId}" is not registered`,
      );
    }

    if (settings.model.trim().length === 0) {
      throw new AiProviderRegistryError(
        'invalid_configuration',
        `AI provider "${normalizedProviderId}" requires a non-empty model`,
      );
    }

    const provider = factory.create(settings);

    if (
      normalizeProviderId(provider.id) !== normalizedProviderId ||
      provider.model.trim().length === 0
    ) {
      throw new AiProviderRegistryError(
        'invalid_provider',
        `AI provider "${normalizedProviderId}" returned an invalid adapter identity`,
      );
    }

    return provider;
  }
}

/**
 * Resolve the configured provider, or leave analysis unconfigured when no provider was selected.
 *
 * @typeParam TInput The product-owned input type.
 * @param registry Provider registry assembled by the server composition root.
 * @param selection Provider selection and credentials from validated runtime configuration.
 * @returns A configured provider, or `undefined` when no provider is selected.
 * @throws If a provider is selected without a model or cannot be resolved.
 */
export function createConfiguredAiProvider<TInput>(
  registry: AiProviderRegistry<TInput>,
  selection: AiProviderSelection,
): AiProvider<TInput> | undefined {
  if (selection.providerId === undefined) {
    return undefined;
  }

  const normalizedProviderId = normalizeProviderId(selection.providerId);

  if (selection.model === undefined) {
    throw new AiProviderRegistryError(
      'invalid_configuration',
      `AI provider "${normalizedProviderId}" requires AI_MODEL`,
    );
  }

  const settings: AiProviderSettings = {
    model: selection.model,
    credentials: selection.credentialsByProvider[normalizedProviderId] ?? {},
    ...(selection.baseUrl === undefined ? {} : { baseUrl: selection.baseUrl }),
    ...(selection.maxOutputTokens === undefined
      ? {}
      : { maxOutputTokens: selection.maxOutputTokens }),
  };

  return registry.create(normalizedProviderId, settings);
}
