import { describe, expect, it } from 'vitest';
import { createDefaultAiProviderRegistry } from './index';

describe('default AI provider registry', () => {
  it('registers the built-in OpenAI and Anthropic adapters', () => {
    expect(createDefaultAiProviderRegistry().providerIds()).toEqual(['openai', 'anthropic']);
  });
});
