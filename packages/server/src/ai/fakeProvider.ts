import type { AiProvider, AiProviderContext } from './provider.js';

export type FakeAiResponseFactory<TInput> = (
  input: TInput,
  context: AiProviderContext,
) => unknown | Promise<unknown>;

/**
 * Deterministic provider for application tests and local experiments.
 *
 * @typeParam TInput The product-owned input type.
 */
export class FakeAiProvider<TInput> implements AiProvider<TInput> {
  private readonly response: unknown;

  constructor(response: FakeAiResponseFactory<TInput>);
  constructor(response: unknown);
  constructor(response: unknown) {
    this.response = response;
  }

  /**
   * Return the configured fake response without making a network call.
   *
   * @param input Product-specific analysis input.
   * @param context Request correlation and cancellation context.
   * @returns The configured response.
   */
  analyze(input: TInput, context: AiProviderContext): Promise<unknown> {
    if (typeof this.response === 'function') {
      return Promise.resolve((this.response as FakeAiResponseFactory<TInput>)(input, context));
    }

    return Promise.resolve(this.response);
  }
}
