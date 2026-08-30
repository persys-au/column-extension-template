import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { AnalysisService } from '../application/analyze';
import { FakeAiProvider } from './fakeProvider';
import { AiProviderRegistry, createConfiguredAiProvider } from './registry';
import type { AiProviderFactory } from './provider';

type TestInput = { text: string };

const inputSchema = z.object({ text: z.string().min(1) });
const outputSchema = z.object({ summary: z.string().min(1) });

function createTestFactory(id: string): AiProviderFactory<TestInput> {
  return {
    id,
    create: (settings) =>
      new FakeAiProvider(() => ({ summary: `${id}:${settings.model}` }), {
        id,
        model: settings.model,
      }),
  };
}

describe('AI provider registry', () => {
  it('resolves different adapter implementations through the same application service', async () => {
    const registry = new AiProviderRegistry([
      createTestFactory('openai'),
      createTestFactory('anthropic'),
    ]);
    const settings = {
      model: 'test-model',
      credentials: { apiKey: 'not-used-by-test-adapter' },
    };
    const openAiProvider = registry.create(' OpenAI ', settings);
    const anthropicProvider = registry.create('anthropic', {
      ...settings,
      model: 'other-model',
    });

    const service = new AnalysisService({
      provider: openAiProvider,
      inputSchema,
      outputSchema,
    });

    await expect(
      service.analyze({ requestId: 'request-1', input: { text: 'content' } }),
    ).resolves.toEqual({
      requestId: 'request-1',
      output: { summary: 'openai:test-model' },
    });
    expect(anthropicProvider.id).toBe('anthropic');
    expect(anthropicProvider.model).toBe('other-model');
    expect(registry.providerIds()).toEqual(['openai', 'anthropic']);
  });

  it('creates the selected provider from generic runtime settings', () => {
    const registry = new AiProviderRegistry([createTestFactory('anthropic')]);
    const provider = createConfiguredAiProvider(registry, {
      providerId: 'anthropic',
      model: 'claude-test',
      credentialsByProvider: { anthropic: { apiKey: 'secret' } },
      baseUrl: 'https://api.example.test',
    });

    expect(provider).toMatchObject({ id: 'anthropic', model: 'claude-test' });
  });

  it('allows no provider selection and rejects invalid registrations or configurations', () => {
    const registry = new AiProviderRegistry([createTestFactory('openai')]);

    expect(createConfiguredAiProvider(registry, { credentialsByProvider: {} })).toBeUndefined();
    expect(() => registry.register(createTestFactory('OPENAI'))).toThrowError(
      expect.objectContaining({ code: 'duplicate_provider' }),
    );
    expect(() => registry.create('missing', { model: 'model', credentials: {} })).toThrowError(
      expect.objectContaining({ code: 'unknown_provider' }),
    );
    expect(() =>
      createConfiguredAiProvider(registry, {
        providerId: 'openai',
        credentialsByProvider: {},
      }),
    ).toThrowError(expect.objectContaining({ code: 'invalid_configuration' }));
  });

  it('rejects adapters that report an identity different from their registration', () => {
    const registry = new AiProviderRegistry<TestInput>([
      {
        id: 'openai',
        create: (settings) =>
          new FakeAiProvider({ summary: 'result' }, { id: 'other', model: settings.model }),
      },
    ]);

    expect(() => registry.create('openai', { model: 'model', credentials: {} })).toThrowError(
      expect.objectContaining({ code: 'invalid_provider' }),
    );
  });
});
