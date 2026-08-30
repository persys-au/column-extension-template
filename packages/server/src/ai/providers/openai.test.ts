import { describe, expect, it, vi } from 'vitest';
import { OpenAiProvider, createOpenAiProviderFactory } from './openai';

const context = { requestId: 'request-1', signal: new AbortController().signal };

describe('OpenAI provider adapter', () => {
  it('sends the provider-specific request and parses structured output', async () => {
    const fetcher = vi.fn<typeof fetch>(
      async () =>
        new Response(
          JSON.stringify({ choices: [{ message: { content: '{"summary":"done"}' } }] }),
          {
            status: 200,
          },
        ),
    );
    const provider = new OpenAiProvider(
      {
        model: 'test-model',
        credentials: { apiKey: 'secret' },
        maxOutputTokens: 2048,
      },
      {
        fetch: fetcher,
        systemInstruction: 'Return JSON.',
        structuredOutput: {
          name: 'analysis_v1',
          schema: {
            type: 'object',
            properties: { summary: { type: 'string' } },
            required: ['summary'],
            additionalProperties: false,
          },
        },
      },
    );

    await expect(provider.analyze({ text: 'article' }, context)).resolves.toEqual({
      summary: 'done',
    });

    const [requestUrl, requestInit] = fetcher.mock.calls[0] ?? [];
    expect(requestUrl).toBe('https://api.openai.com/v1/chat/completions');
    expect(requestInit).toMatchObject({
      method: 'POST',
      signal: context.signal,
      headers: {
        authorization: 'Bearer secret',
        'content-type': 'application/json',
      },
    });
    expect(JSON.parse(String(requestInit?.body))).toEqual({
      model: 'test-model',
      messages: [
        { role: 'system', content: 'Return JSON.' },
        { role: 'user', content: '{"text":"article"}' },
      ],
      max_completion_tokens: 2048,
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'analysis_v1',
          schema: {
            type: 'object',
            properties: { summary: { type: 'string' } },
            required: ['summary'],
            additionalProperties: false,
          },
          strict: true,
        },
      },
    });
  });

  it('reports missing credentials during construction', () => {
    expect(() => new OpenAiProvider({ model: 'test-model', credentials: {} })).toThrowError(
      expect.objectContaining({
        code: 'missing_credential',
        providerId: 'openai',
      }),
    );
  });

  it('reports refusals before parsing content', async () => {
    const fetcher = vi.fn<typeof fetch>(
      async () =>
        new Response(
          JSON.stringify({
            choices: [
              {
                finish_reason: 'stop',
                message: { content: null, refusal: 'The request cannot be completed.' },
              },
            ],
          }),
          { status: 200 },
        ),
    );
    const provider = new OpenAiProvider(
      { model: 'test-model', credentials: { apiKey: 'secret' } },
      { fetch: fetcher },
    );

    await expect(provider.analyze({ text: 'article' }, context)).rejects.toMatchObject({
      code: 'model_refusal',
      providerId: 'openai',
    });
  });

  it('can be registered through the common provider factory contract', () => {
    const factory = createOpenAiProviderFactory<{ text: string }>();
    const provider = factory.create({ model: 'test-model', credentials: { apiKey: 'secret' } });

    expect(provider).toMatchObject({ id: 'openai', model: 'test-model' });
  });
});
