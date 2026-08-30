import { describe, expect, it } from 'vitest';
import { loadServerConfig, parseServerConfig } from './config';

describe('server config', () => {
  it('uses local defaults when optional environment values are absent', () => {
    expect(loadServerConfig({})).toEqual({
      nodeEnv: 'development',
      port: 3000,
      ai: {
        providerId: undefined,
        model: undefined,
        credentialsByProvider: {},
        timeoutMs: 120_000,
        maxOutputTokens: 4_096,
      },
    });
  });

  it('normalizes runtime environment values', () => {
    expect(
      loadServerConfig({
        NODE_ENV: 'production',
        PORT: '8080',
        AI_PROVIDER: ' Anthropic ',
        AI_MODEL: ' claude-sonnet ',
        OPENAI_MODEL: ' gpt-4.1-mini ',
        ANTHROPIC_MODEL: ' claude-sonnet-4-20250514 ',
        AI_API_KEY: ' secret ',
        OPENAI_API_KEY: ' openai-secret ',
        ANTHROPIC_API_KEY: ' anthropic-secret ',
        AI_BASE_URL: 'https://api.example.test/v1',
        AI_REQUEST_TIMEOUT_MS: '60000',
        AI_MAX_OUTPUT_TOKENS: '8192',
      }),
    ).toEqual({
      nodeEnv: 'production',
      port: 8080,
      ai: {
        providerId: 'Anthropic',
        model: 'claude-sonnet-4-20250514',
        baseUrl: 'https://api.example.test/v1',
        credentialsByProvider: {
          openai: { apiKey: 'openai-secret' },
          anthropic: { apiKey: 'anthropic-secret' },
        },
        timeoutMs: 60000,
        maxOutputTokens: 8192,
      },
    });
  });

  it('rejects invalid environment values', () => {
    expect(() => loadServerConfig({ NODE_ENV: 'staging', PORT: '8080' })).toThrow();
    expect(() => loadServerConfig({ NODE_ENV: 'production', PORT: 'not-a-port' })).toThrow();
    expect(() => loadServerConfig({ AI_PROVIDER: 'anthropic' })).toThrow();
    expect(() => loadServerConfig({ AI_MODEL: 'claude-sonnet' })).toThrow();
    expect(() => loadServerConfig({ OPENAI_MODEL: 'gpt-4.1-mini' })).toThrow();
    expect(() => loadServerConfig({ AI_API_KEY: 'secret' })).toThrow();
    expect(() =>
      loadServerConfig({
        AI_PROVIDER: 'anthropic',
        AI_MODEL: 'claude',
        AI_BASE_URL: 'local',
      }),
    ).toThrow();
    expect(() =>
      loadServerConfig({
        AI_PROVIDER: 'anthropic',
        AI_MODEL: 'claude',
        AI_REQUEST_TIMEOUT_MS: '0',
      }),
    ).toThrow();
    expect(() =>
      loadServerConfig({
        AI_PROVIDER: 'anthropic',
        AI_MODEL: 'claude',
        AI_MAX_OUTPUT_TOKENS: '0',
      }),
    ).toThrow();
    expect(() => parseServerConfig({ nodeEnv: 'production', port: 0 })).toThrow();
  });

  it('uses AI_MODEL as a fallback when the selected provider has no specific model', () => {
    expect(
      loadServerConfig({
        AI_PROVIDER: 'openai',
        AI_MODEL: 'provider-neutral-model',
        OPENAI_API_KEY: 'secret',
      }).ai.model,
    ).toBe('provider-neutral-model');
  });
});
