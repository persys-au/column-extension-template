import { z } from 'zod';
import { describe, expect, it } from 'vitest';
import { createAnalysisRequestSchema, createAnalysisResultSchema } from './schemas';

describe('analysis schemas', () => {
  const inputSchema = z.object({ text: z.string().min(1) });
  const outputSchema = z.object({ summary: z.string().min(1) });

  it('validates product input inside a request envelope', () => {
    const schema = createAnalysisRequestSchema(inputSchema);

    expect(schema.parse({ requestId: 'request-1', input: { text: 'content' } })).toEqual({
      requestId: 'request-1',
      input: { text: 'content' },
    });
  });

  it('rejects blank request identifiers and invalid input', () => {
    const schema = createAnalysisRequestSchema(inputSchema);

    expect(() => schema.parse({ requestId: ' ', input: { text: 'content' } })).toThrow();
    expect(() => schema.parse({ requestId: 'request-1', input: { text: '' } })).toThrow();
  });

  it('validates product output inside a result envelope', () => {
    const schema = createAnalysisResultSchema(outputSchema);

    expect(schema.parse({ requestId: 'request-1', output: { summary: 'result' } })).toEqual({
      requestId: 'request-1',
      output: { summary: 'result' },
    });
    expect(() => schema.parse({ requestId: 'request-1', output: { summary: '' } })).toThrow();
  });
});
