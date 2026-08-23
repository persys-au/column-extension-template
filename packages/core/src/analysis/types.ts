/**
 * A product-specific analysis request with a correlation identifier.
 *
 * @typeParam TInput The product-owned input type.
 */
export interface AnalysisRequest<TInput> {
  requestId: string;
  input: TInput;
}

/**
 * A validated analysis result with the originating correlation identifier.
 *
 * @typeParam TOutput The product-owned output type.
 */
export interface AnalysisResult<TOutput> {
  requestId: string;
  output: TOutput;
}
