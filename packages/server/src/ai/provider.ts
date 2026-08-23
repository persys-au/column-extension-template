/**
 * Runtime context supplied to an AI provider for one analysis request.
 */
export interface AiProviderContext {
  requestId: string;
  signal: AbortSignal;
}

/**
 * Vendor-neutral boundary for product-specific AI analysis.
 *
 * Providers return unknown data because model output is not trusted until the application service
 * validates it with the product's output schema.
 *
 * @typeParam TInput The product-owned input type.
 */
export interface AiProvider<TInput> {
  analyze(input: TInput, context: AiProviderContext): Promise<unknown>;
}
