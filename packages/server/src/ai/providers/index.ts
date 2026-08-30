import { AiProviderRegistry } from '../registry.js';
import type { AiProviderAdapterOptions } from '../provider.js';
import {
  AnthropicProvider,
  createAnthropicProviderFactory,
  type AnthropicProviderOptions,
} from './anthropic.js';
import {
  createOpenAiProviderFactory,
  OpenAiProvider,
  type OpenAiProviderOptions,
} from './openai.js';
export { AiProviderTransportError } from './shared.js';
export type { AiProviderTransportErrorCode } from './shared.js';

export {
  AnthropicProvider,
  createAnthropicProviderFactory,
  OpenAiProvider,
  createOpenAiProviderFactory,
};
export type { AnthropicProviderOptions, OpenAiProviderOptions };

export interface DefaultAiProviderOptions<TInput> {
  openai?: OpenAiProviderOptions<TInput>;
  anthropic?: AnthropicProviderOptions<TInput>;
}

/**
 * Create a registry containing the built-in OpenAI and Anthropic adapters.
 *
 * @typeParam TInput The product-owned input type.
 * @param options Optional adapter hooks for the registered providers.
 * @returns A registry containing the OpenAI and Anthropic adapters.
 */
export function createDefaultAiProviderRegistry<TInput>(
  options: DefaultAiProviderOptions<TInput> = {},
): AiProviderRegistry<TInput> {
  return new AiProviderRegistry([
    createOpenAiProviderFactory(options.openai),
    createAnthropicProviderFactory(options.anthropic),
  ]);
}

export type { AiProviderAdapterOptions };
