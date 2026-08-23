import { createAnalysisRequestSchema, type AnalysisRequest, type AnalysisResult } from 'core';
import { z } from 'zod';
import type { AiProvider } from '../ai/provider.js';

const defaultAnalysisTimeoutMs = 30_000;
const timeoutSchema = z.number().int().positive();

export type AnalysisErrorCode = 'invalid_input' | 'invalid_output' | 'provider_failure' | 'timeout';

/**
 * Typed failure raised by the analysis application boundary.
 */
export class AnalysisError extends Error {
  readonly code: AnalysisErrorCode;

  constructor(code: AnalysisErrorCode, message: string, cause?: unknown) {
    super(message, cause === undefined ? undefined : { cause });
    this.name = 'AnalysisError';
    this.code = code;
  }
}

export interface AnalysisServiceOptions<TInput, TOutput> {
  provider: AiProvider<TInput>;
  inputSchema: z.ZodType<TInput>;
  outputSchema: z.ZodType<TOutput>;
  timeoutMs?: number;
}

/**
 * Coordinates one product analysis while treating provider output as untrusted data.
 *
 * @typeParam TInput The product-owned input type.
 * @typeParam TOutput The product-owned output type.
 */
export class AnalysisService<TInput, TOutput> {
  private readonly requestSchema: z.ZodType<AnalysisRequest<TInput>>;
  private readonly outputSchema: z.ZodType<TOutput>;
  private readonly provider: AiProvider<TInput>;
  private readonly timeoutMs: number;

  constructor({
    provider,
    inputSchema,
    outputSchema,
    timeoutMs = defaultAnalysisTimeoutMs,
  }: AnalysisServiceOptions<TInput, TOutput>) {
    this.provider = provider;
    this.requestSchema = createAnalysisRequestSchema(inputSchema);
    this.outputSchema = outputSchema;
    this.timeoutMs = timeoutSchema.parse(timeoutMs);
  }

  /**
   * Validate, execute, and validate one analysis request.
   *
   * @param request Product-specific input with a caller-generated request ID.
   * @returns A validated product-specific result with the same request ID.
   * @throws AnalysisError when input, provider execution, timeout, or output validation fails.
   */
  async analyze(request: AnalysisRequest<TInput>): Promise<AnalysisResult<TOutput>> {
    const parsedRequest = this.requestSchema.safeParse(request);

    if (!parsedRequest.success) {
      throw new AnalysisError(
        'invalid_input',
        'Analysis request failed validation',
        parsedRequest.error,
      );
    }

    const controller = new AbortController();
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    try {
      const providerPromise = this.provider.analyze(parsedRequest.data.input, {
        requestId: parsedRequest.data.requestId,
        signal: controller.signal,
      });
      const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => {
          reject(new AnalysisError('timeout', 'Analysis provider timed out'));
          controller.abort();
        }, this.timeoutMs);
      });
      const rawOutput = await Promise.race([providerPromise, timeoutPromise]);
      const parsedOutput = this.outputSchema.safeParse(rawOutput);

      if (!parsedOutput.success) {
        throw new AnalysisError(
          'invalid_output',
          'Analysis provider returned invalid output',
          parsedOutput.error,
        );
      }

      return {
        requestId: parsedRequest.data.requestId,
        output: parsedOutput.data,
      };
    } catch (error) {
      if (error instanceof AnalysisError) {
        throw error;
      }

      throw new AnalysisError('provider_failure', 'Analysis provider failed', error);
    } finally {
      if (timeoutId !== undefined) {
        clearTimeout(timeoutId);
      }
    }
  }
}
