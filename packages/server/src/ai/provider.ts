/**
 * Runtime context supplied to an AI provider for one analysis request.
 */
export interface AiProviderContext {
  requestId: string;
  signal: AbortSignal;
}

/**
 * Provider-neutral settings supplied when an adapter is created.
 *
 * Provider-specific credentials can be represented by named entries in `credentials` without
 * making the application service depend on a particular authentication scheme.
 */
export interface AiProviderSettings {
  model: string;
  credentials: Readonly<Record<string, string>>;
  baseUrl?: string;
  maxOutputTokens?: number;
}

/**
 * Provider-neutral description of the JSON object a model must return.
 *
 * Provider adapters translate this descriptor into their native structured-output request shape.
 */
export interface AiStructuredOutput {
  name: string;
  schema: Readonly<Record<string, unknown>>;
}

export type AiInputSerializer<TInput> = (input: TInput) => string;
export type AiOutputParser = (content: string) => unknown;

/**
 * Optional product-facing hooks and transport dependencies for a provider adapter.
 *
 * @typeParam TInput The product-owned input type.
 */
export interface AiProviderAdapterOptions<TInput> {
  systemInstruction?: string;
  serializeInput?: AiInputSerializer<TInput>;
  parseOutput?: AiOutputParser;
  structuredOutput?: AiStructuredOutput;
  maxOutputTokens?: number;
  fetch?: typeof fetch;
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
  readonly id: string;
  readonly model: string;
  analyze(input: TInput, context: AiProviderContext): Promise<unknown>;
}

/**
 * Factory for one registered AI provider adapter.
 *
 * @typeParam TInput The product-owned input type.
 */
export interface AiProviderFactory<TInput> {
  readonly id: string;
  create(settings: AiProviderSettings): AiProvider<TInput>;
}

/**
 * Runtime selection values used by the provider composition root.
 */
export interface AiProviderSelection {
  providerId?: string;
  model?: string;
  credentialsByProvider: Readonly<Record<string, Readonly<Record<string, string>>>>;
  baseUrl?: string;
  maxOutputTokens?: number;
}
