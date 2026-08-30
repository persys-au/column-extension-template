import { z } from 'zod';
import type {
  AiProvider,
  AiProviderAdapterOptions,
  AiProviderContext,
  AiProviderFactory,
  AiProviderSettings,
} from '../provider.js';
import {
  AiProviderTransportError,
  buildProviderUrl,
  defaultStructuredOutputInstruction,
  parseProviderOutput,
  requestProviderJson,
  requireProviderCredential,
  resolveMaxOutputTokens,
  serializeProviderInput,
} from './shared.js';

const anthropicProviderId = 'anthropic';
const defaultAnthropicBaseUrl = 'https://api.anthropic.com/v1';
const defaultMaxOutputTokens = 4_096;
const anthropicResponseSchema = z.object({
  content: z
    .array(
      z.object({
        type: z.string(),
        text: z.string().optional(),
      }),
    )
    .min(1),
});

export type AnthropicProviderOptions<TInput> = AiProviderAdapterOptions<TInput>;

/**
 * Basic Anthropic Messages API adapter for structured JSON analysis.
 *
 * @typeParam TInput The product-owned input type.
 */
export class AnthropicProvider<TInput> implements AiProvider<TInput> {
  readonly id = anthropicProviderId;
  readonly model: string;

  private readonly settings: AiProviderSettings;
  private readonly options: AnthropicProviderOptions<TInput>;
  private readonly apiKey: string;
  private readonly maxOutputTokens: number;

  constructor(settings: AiProviderSettings, options: AnthropicProviderOptions<TInput> = {}) {
    this.settings = settings;
    this.options = options;
    this.model = settings.model;
    this.apiKey = requireProviderCredential(settings, this.id, 'apiKey');
    this.maxOutputTokens = resolveMaxOutputTokens(
      settings,
      options,
      this.id,
      defaultMaxOutputTokens,
    );
  }

  /**
   * Send one serialized analysis input to Anthropic and parse the text response as JSON.
   *
   * @param input Product-specific analysis input.
   * @param context Request correlation and cancellation context.
   * @returns Parsed model output for application-level schema validation.
   */
  async analyze(input: TInput, context: AiProviderContext): Promise<unknown> {
    const serializedInput = serializeProviderInput(input, this.options.serializeInput);
    const systemInstruction = this.options.systemInstruction ?? defaultStructuredOutputInstruction;
    const structuredOutput = this.options.structuredOutput;
    const payload: Record<string, unknown> = {
      model: this.model,
      max_tokens: this.maxOutputTokens,
      messages: [{ role: 'user', content: serializedInput }],
    };

    payload.system = systemInstruction;
    if (structuredOutput !== undefined) {
      payload.output_config = {
        format: {
          type: 'json_schema',
          schema: structuredOutput.schema,
        },
      };
    }

    const response = await requestProviderJson(
      this.options.fetch ?? fetch,
      this.id,
      buildProviderUrl(this.settings.baseUrl ?? defaultAnthropicBaseUrl, 'messages'),
      {
        method: 'POST',
        headers: {
          accept: 'application/json',
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
          'x-api-key': this.apiKey,
        },
        body: JSON.stringify(payload),
        signal: context.signal,
      },
    );
    const parsedResponse = anthropicResponseSchema.safeParse(response);

    if (!parsedResponse.success) {
      throw new AiProviderTransportError(
        this.id,
        'invalid_response',
        `AI provider "${this.id}" returned an unexpected response shape`,
        parsedResponse.error,
      );
    }

    const content = parsedResponse.data.content
      .flatMap((block) => (block.type === 'text' && block.text !== undefined ? [block.text] : []))
      .join('\n');

    if (content.length === 0) {
      throw new AiProviderTransportError(
        this.id,
        'invalid_response',
        `AI provider "${this.id}" returned no text content`,
      );
    }

    return parseProviderOutput(this.id, content, this.options.parseOutput);
  }
}

/**
 * Create a registry-compatible Anthropic adapter factory.
 *
 * @typeParam TInput The product-owned input type.
 * @param options Prompt, serialization, parsing, and transport hooks for the adapter.
 * @returns A factory registered under the `anthropic` provider ID.
 */
export function createAnthropicProviderFactory<TInput>(
  options: AnthropicProviderOptions<TInput> = {},
): AiProviderFactory<TInput> {
  return {
    id: anthropicProviderId,
    create: (settings) => new AnthropicProvider(settings, options),
  };
}
