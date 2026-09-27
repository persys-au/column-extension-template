import { appendFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import type { AiUsageDiagnostics, AiUsageDiagnosticsSink } from './provider.js';

export interface AiUsageLogOptions {
  now?: () => Date;
}

/**
 * Create a best-effort append-only JSONL sink for content-free AI diagnostics.
 *
 * @param filePath Destination file for one JSON record per line.
 * @param options Optional clock override for deterministic tests.
 * @returns A diagnostics sink that does not fail the analysis request on filesystem errors.
 */
export function createAiUsageLogSink(
  filePath: string,
  options: AiUsageLogOptions = {},
): AiUsageDiagnosticsSink {
  const now = options.now ?? (() => new Date());

  return (diagnostics: AiUsageDiagnostics): void => {
    try {
      mkdirSync(dirname(filePath), { recursive: true });
      appendFileSync(
        filePath,
        `${JSON.stringify({ event: 'ai_usage', loggedAt: now().toISOString(), ...diagnostics })}\n`,
        { encoding: 'utf8' },
      );
    } catch {
      return;
    }
  };
}
