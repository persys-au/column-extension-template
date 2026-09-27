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
    let receivedUsageSink: ((...args: never[]) => void) | undefined;
    const usageSink = () => undefined;
    const provider = new FakeAiProvider<{ text: string }>((_input, context) => {
      receivedRequestId = context.requestId;
      receivedSignal = context.signal;
      receivedUsageSink = context.onUsage;
      return { summary: 'result' };
    });
    const service = new AnalysisService({ provider, inputSchema, outputSchema, usageSink });

    await expect(service.analyze(request)).resolves.toEqual({
      requestId: 'request-1',
      output: { summary: 'result' },
    });
    expect(receivedRequestId).toBe('request-1');
    expect(receivedSignal).toBeInstanceOf(AbortSignal);
    expect(receivedUsageSink).toBe(usageSink);
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

  it('propagates caller cancellation to the provider', async () => {
    let wasAborted = false;
    const provider = new FakeAiProvider<{ text: string }>((_input, context) => {
      return new Promise((resolve) => {
        context.signal.addEventListener('abort', () => {
          wasAborted = true;
          resolve({ summary: 'late result' });
        });
      });
    });
    const service = new AnalysisService({ provider, inputSchema, outputSchema });
    const controller = new AbortController();

    const analysis = service.analyze(request, { signal: controller.signal });
    controller.abort();

    await expect(analysis).rejects.toMatchObject({
      name: 'AnalysisError',
      code: 'cancelled',
    });
    expect(wasAborted).toBe(true);
  });

  it('rejects an already-cancelled request before provider work starts', async () => {
    let wasCalled = false;
    const service = new AnalysisService({
      provider: new FakeAiProvider(() => {
        wasCalled = true;
        return { summary: 'result' };
      }),
      inputSchema,
      outputSchema,
    });
    const controller = new AbortController();
    controller.abort();

    await expect(service.analyze(request, { signal: controller.signal })).rejects.toMatchObject({
      name: 'AnalysisError',
      code: 'cancelled',
    });
    expect(wasCalled).toBe(false);
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
