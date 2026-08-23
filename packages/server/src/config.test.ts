import { describe, expect, it } from 'vitest';
import { loadServerConfig, parseServerConfig } from './config';

describe('server config', () => {
  it('uses local defaults when optional environment values are absent', () => {
    expect(loadServerConfig({})).toEqual({ nodeEnv: 'development', port: 3000 });
  });

  it('normalizes runtime environment values', () => {
    expect(loadServerConfig({ NODE_ENV: 'production', PORT: '8080' })).toEqual({
      nodeEnv: 'production',
      port: 8080,
    });
  });

  it('rejects invalid environment values', () => {
    expect(() => loadServerConfig({ NODE_ENV: 'staging', PORT: '8080' })).toThrow();
    expect(() => loadServerConfig({ NODE_ENV: 'production', PORT: 'not-a-port' })).toThrow();
    expect(() => parseServerConfig({ nodeEnv: 'production', port: 0 })).toThrow();
  });
});
