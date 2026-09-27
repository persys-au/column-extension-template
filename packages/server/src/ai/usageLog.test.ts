import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { AiUsageDiagnostics } from './provider';
import { createAiUsageLogSink } from './usageLog';

const diagnostics: AiUsageDiagnostics = {
  requestId: 'request-1',
  providerId: 'openai',
  model: 'test-model',
  requestBytes: 1_234,
  inputTokens: 100,
  cachedInputTokens: 10,
  outputTokens: 20,
  reasoningTokens: 17,
  totalTokens: 120,
  durationMs: 350,
};

describe('AI usage log', () => {
  it('appends timestamped JSONL records', () => {
    const directory = mkdtempSync(join(tmpdir(), 'template-ai-usage-'));
    const filePath = join(directory, 'nested', 'ai-usage.jsonl');

    try {
      const sink = createAiUsageLogSink(filePath, {
        now: () => new Date('2026-09-01T12:00:00.000Z'),
      });
      sink(diagnostics);
      sink({ ...diagnostics, requestId: 'request-2' });

      const records = readFileSync(filePath, 'utf8')
        .trim()
        .split('\n')
        .map((line) => JSON.parse(line) as Record<string, unknown>);

      expect(records).toEqual([
        { event: 'ai_usage', loggedAt: '2026-09-01T12:00:00.000Z', ...diagnostics },
        {
          event: 'ai_usage',
          loggedAt: '2026-09-01T12:00:00.000Z',
          ...diagnostics,
          requestId: 'request-2',
        },
      ]);
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  it('does not throw when the destination cannot be written', () => {
    const directory = mkdtempSync(join(tmpdir(), 'template-ai-usage-'));
    const blockedDirectory = join(directory, 'blocked');
    writeFileSync(blockedDirectory, 'not a directory');

    try {
      const sink = createAiUsageLogSink(join(blockedDirectory, 'ai-usage.jsonl'));
      expect(() => sink(diagnostics)).not.toThrow();
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
});
