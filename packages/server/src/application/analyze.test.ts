import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { AnalysisService } from './analyze';
import { FakeAiProvider } from '../ai/fakeProvider';

const inputSchema = z.object({ text: z.string().min(1) });
const outputSchema = z.object({ summary: z.string().min(1) });
const request = { requestId: 'request-1', input: { text: 'content' } };

describe('analysis service', () => {
  it('passes correlation context to the provider and validates its output', async () => {
    let receivedRequestId: string | undefined;
    let receivedSignal: AbortSignal | undefined;
    const provider = new FakeAiProvider<{ text: string }>((_input, context) => {
      receivedRequestId = context.requestId;
      receivedSignal = context.signal;
      return { summary: 'result' };
    });
    const service = new AnalysisService({ provider, inputSchema, outputSchema });

    await expect(service.analyze(request)).resolves.toEqual({
      requestId: 'request-1',
      output: { summary: 'result' },
    });
    expect(receivedRequestId).toBe('request-1');
    expect(receivedSignal).toBeInstanceOf(AbortSignal);
  });

  it('rejects invalid input and invalid provider output', async () => {
    const invalidOutputService = new AnalysisService({
      provider: new FakeAiProvider({ summary: '' }),
      inputSchema,
      outputSchema,
    });
    const invalidInputService = new AnalysisService({
      provider: new FakeAiProvider({ summary: 'result' }),
      inputSchema,
      outputSchema,
    });

    await expect(invalidOutputService.analyze(request)).rejects.toMatchObject({
      name: 'AnalysisError',
      code: 'invalid_output',
    });
    await expect(
      invalidInputService.analyze({ requestId: '', input: { text: '' } }),
    ).rejects.toMatchObject({
      name: 'AnalysisError',
      code: 'invalid_input',
    });
  });

  it('maps provider failures to a typed analysis error', async () => {
    const service = new AnalysisService({
      provider: new FakeAiProvider(() => {
        throw new Error('provider unavailable');
      }),
      inputSchema,
      outputSchema,
    });

    await expect(service.analyze(request)).rejects.toMatchObject({
      name: 'AnalysisError',
      code: 'provider_failure',
    });
  });

  it('aborts the provider and reports a timeout', async () => {
    let wasAborted = false;
    const provider = new FakeAiProvider<{ text: string }>((_input, context) => {
      return new Promise((resolve) => {
        context.signal.addEventListener('abort', () => {
          wasAborted = true;
          resolve({ summary: 'late result' });
        });
      });
    });
    const service = new AnalysisService({
      provider,
      inputSchema,
      outputSchema,
      timeoutMs: 5,
    });

    await expect(service.analyze(request)).rejects.toMatchObject({
      name: 'AnalysisError',
      code: 'timeout',
    });
    expect(wasAborted).toBe(true);
  });

  it('rejects invalid timeout configuration', () => {
    expect(
      () =>
        new AnalysisService({
          provider: new FakeAiProvider({ summary: 'result' }),
          inputSchema,
          outputSchema,
          timeoutMs: 0,
        }),
    ).toThrow();
  });
});
