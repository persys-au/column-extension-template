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
  getUtf8ByteLength,
  notifyUsageSink,
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
  usage: z
    .object({
      input_tokens: z.number().int().nonnegative(),
      output_tokens: z.number().int().nonnegative(),
      cache_read_input_tokens: z.number().int().nonnegative().nullable().optional(),
    })
    .optional(),
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

    const requestBody = JSON.stringify(payload);
    const startedAt = Date.now();
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
        body: requestBody,
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

    const usage = parsedResponse.data.usage;
    notifyUsageSink(context.onUsage, {
      requestId: context.requestId,
      providerId: this.id,
      model: this.model,
      requestBytes: getUtf8ByteLength(requestBody),
      ...(usage === undefined
        ? {}
        : {
            inputTokens: usage.input_tokens,
            cachedInputTokens: usage.cache_read_input_tokens ?? 0,
            outputTokens: usage.output_tokens,
            totalTokens: usage.input_tokens + usage.output_tokens,
          }),
      durationMs: Math.max(0, Date.now() - startedAt),
    });

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
