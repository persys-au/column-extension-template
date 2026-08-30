import { describe, expect, it, vi } from 'vitest';
import { AnthropicProvider, createAnthropicProviderFactory } from './anthropic';

const context = { requestId: 'request-1', signal: new AbortController().signal };

describe('Anthropic provider adapter', () => {
  it('sends the provider-specific request and parses text content as JSON', async () => {
    const fetcher = vi.fn<typeof fetch>(
      async () =>
        new Response(
          JSON.stringify({ content: [{ type: 'text', text: '```json\n{"summary":"done"}\n```' }] }),
          { status: 200 },
        ),
    );
    const provider = new AnthropicProvider(
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
    expect(requestUrl).toBe('https://api.anthropic.com/v1/messages');
    expect(requestInit).toMatchObject({
      method: 'POST',
      signal: context.signal,
      headers: {
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
        'x-api-key': 'secret',
      },
    });
    expect(JSON.parse(String(requestInit?.body))).toEqual({
      model: 'test-model',
      max_tokens: 2048,
      system: 'Return JSON.',
      output_config: {
        format: {
          type: 'json_schema',
          schema: {
            type: 'object',
            properties: { summary: { type: 'string' } },
            required: ['summary'],
            additionalProperties: false,
          },
        },
      },
      messages: [{ role: 'user', content: '{"text":"article"}' }],
    });
  });

  it('supports a custom base URL and factory registration', () => {
    const factory = createAnthropicProviderFactory<{ text: string }>();
    const provider = factory.create({
      model: 'test-model',
      credentials: { apiKey: 'secret' },
      baseUrl: 'https://gateway.example.test/anthropic/v1',
    });

    expect(provider).toMatchObject({ id: 'anthropic', model: 'test-model' });
  });
});
