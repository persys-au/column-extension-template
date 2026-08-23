import { z } from 'zod';
import type { AnalysisRequest, AnalysisResult } from './types.js';

export const analysisRequestIdSchema = z.string().trim().min(1);

/**
 * Create a runtime schema for a product-specific analysis request.
 *
 * @param inputSchema The product-owned schema for analysis input.
 * @returns A schema for a request envelope and its validated input.
 */
export function createAnalysisRequestSchema<TInput>(inputSchema: z.ZodType<TInput>) {
  return z.object({
    requestId: analysisRequestIdSchema,
    input: inputSchema,
  }) satisfies z.ZodType<AnalysisRequest<TInput>>;
}

/**
 * Create a runtime schema for a product-specific analysis result.
 *
 * @param outputSchema The product-owned schema for analysis output.
 * @returns A schema for a result envelope and its validated output.
 */
export function createAnalysisResultSchema<TOutput>(outputSchema: z.ZodType<TOutput>) {
  return z.object({
    requestId: analysisRequestIdSchema,
    output: outputSchema,
  }) satisfies z.ZodType<AnalysisResult<TOutput>>;
}
