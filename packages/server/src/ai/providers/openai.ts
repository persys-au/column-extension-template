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

const openAiProviderId = 'openai';
const defaultOpenAiBaseUrl = 'https://api.openai.com/v1';
const defaultMaxOutputTokens = 4_096;
const openAiResponseSchema = z.object({
  choices: z
    .array(
      z.object({
        finish_reason: z.string().nullable().optional(),
        message: z.object({
          content: z.string().nullable().optional(),
          refusal: z.string().nullable().optional(),
        }),
      }),
    )
    .min(1),
  usage: z
    .object({
      prompt_tokens: z.number().int().nonnegative(),
      completion_tokens: z.number().int().nonnegative(),
      total_tokens: z.number().int().nonnegative(),
      prompt_tokens_details: z
        .object({ cached_tokens: z.number().int().nonnegative().nullable().optional() })
        .nullable()
        .optional(),
      completion_tokens_details: z
        .object({ reasoning_tokens: z.number().int().nonnegative().nullable().optional() })
        .nullable()
        .optional(),
    })
    .optional(),
});

export type OpenAiProviderOptions<TInput> = AiProviderAdapterOptions<TInput>;

/**
 * Basic OpenAI Chat Completions adapter for structured JSON analysis.
 *
 * @typeParam TInput The product-owned input type.
 */
export class OpenAiProvider<TInput> implements AiProvider<TInput> {
  readonly id = openAiProviderId;
  readonly model: string;

  private readonly settings: AiProviderSettings;
  private readonly options: OpenAiProviderOptions<TInput>;
  private readonly apiKey: string;
  private readonly maxOutputTokens: number;

  constructor(settings: AiProviderSettings, options: OpenAiProviderOptions<TInput> = {}) {
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
   * Send one serialized analysis input to OpenAI and parse the JSON content response.
   *
   * @param input Product-specific analysis input.
   * @param context Request correlation and cancellation context.
   * @returns Parsed model output for application-level schema validation.
   */
  async analyze(input: TInput, context: AiProviderContext): Promise<unknown> {
    const serializedInput = serializeProviderInput(input, this.options.serializeInput);
    const systemInstruction = this.options.systemInstruction ?? defaultStructuredOutputInstruction;
    const structuredOutput = this.options.structuredOutput;
    const messages = [
      { role: 'system' as const, content: systemInstruction },
      { role: 'user' as const, content: serializedInput },
    ];
    const payload = {
      model: this.model,
      messages,
      max_completion_tokens: this.maxOutputTokens,
      response_format:
        structuredOutput === undefined
          ? { type: 'json_object' as const }
          : {
              type: 'json_schema' as const,
              json_schema: {
                name: structuredOutput.name,
                schema: structuredOutput.schema,
                strict: true,
              },
            },
    };
    const requestBody = JSON.stringify(payload);
    const startedAt = Date.now();
    const response = await requestProviderJson(
      this.options.fetch ?? fetch,
      this.id,
      buildProviderUrl(this.settings.baseUrl ?? defaultOpenAiBaseUrl, 'chat/completions'),
      {
        method: 'POST',
        headers: {
          accept: 'application/json',
          authorization: `Bearer ${this.apiKey}`,
          'content-type': 'application/json',
        },
        body: requestBody,
        signal: context.signal,
      },
    );
    const parsedResponse = openAiResponseSchema.safeParse(response);

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
            inputTokens: usage.prompt_tokens,
            cachedInputTokens: usage.prompt_tokens_details?.cached_tokens ?? 0,
            outputTokens: usage.completion_tokens,
            ...(usage.completion_tokens_details?.reasoning_tokens == null
              ? {}
              : { reasoningTokens: usage.completion_tokens_details.reasoning_tokens }),
            totalTokens: usage.total_tokens,
          }),
      durationMs: Math.max(0, Date.now() - startedAt),
    });

    const choice = parsedResponse.data.choices[0];

    if (choice === undefined) {
      throw new AiProviderTransportError(
        this.id,
        'invalid_response',
        `AI provider "${this.id}" returned no choices`,
      );
    }

    if (choice.message.refusal !== undefined && choice.message.refusal !== null) {
      throw new AiProviderTransportError(
        this.id,
        'model_refusal',
        `AI provider "${this.id}" refused the analysis request`,
      );
    }

    if (choice.finish_reason === 'length' || choice.finish_reason === 'content_filter') {
      throw new AiProviderTransportError(
        this.id,
        'incomplete_response',
        `AI provider "${this.id}" returned an incomplete response (${choice.finish_reason})`,
      );
    }

    const content = choice.message.content;

    if (content === undefined || content === null || content.trim().length === 0) {
      throw new AiProviderTransportError(
        this.id,
        'invalid_response',
        `AI provider "${this.id}" returned no message content`,
      );
    }

    return parseProviderOutput(this.id, content, this.options.parseOutput);
  }
}

/**
 * Create a registry-compatible OpenAI adapter factory.
 *
 * @typeParam TInput The product-owned input type.
 * @param options Prompt, serialization, parsing, and transport hooks for the adapter.
 * @returns A factory registered under the `openai` provider ID.
 */
export function createOpenAiProviderFactory<TInput>(
  options: OpenAiProviderOptions<TInput> = {},
): AiProviderFactory<TInput> {
  return {
    id: openAiProviderId,
    create: (settings) => new OpenAiProvider(settings, options),
  };
}
