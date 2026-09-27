import type {
  AiOutputParser,
  AiProviderAdapterOptions,
  AiProviderSettings,
  AiUsageDiagnostics,
  AiUsageDiagnosticsSink,
} from '../provider.js';

export const defaultStructuredOutputInstruction = 'Return only a valid JSON object.';

export type AiProviderTransportErrorCode =
  | 'missing_credential'
  | 'invalid_configuration'
  | 'network_failure'
  | 'http_failure'
  | 'invalid_response'
  | 'model_refusal'
  | 'incomplete_response';

const maxProviderErrorBodyLength = 4_096;

export function getUtf8ByteLength(value: string): number {
  return new TextEncoder().encode(value).byteLength;
}

export function notifyUsageSink(
  sink: AiUsageDiagnosticsSink | undefined,
  diagnostics: AiUsageDiagnostics,
): void {
  try {
    sink?.(diagnostics);
  } catch {
    return;
  }
}

/**
 * Typed failure raised by a provider adapter while preparing or sending a request.
 */
export class AiProviderTransportError extends Error {
  readonly code: AiProviderTransportErrorCode;
  readonly providerId: string;
  readonly status: number | undefined;
  readonly responseBody: string | undefined;

  constructor(
    providerId: string,
    code: AiProviderTransportErrorCode,
    message: string,
    cause?: unknown,
    status?: number,
    responseBody?: string,
  ) {
    super(message, cause === undefined ? undefined : { cause });
    this.name = 'AiProviderTransportError';
    this.code = code;
    this.providerId = providerId;
    this.status = status;
    this.responseBody = responseBody;
  }
}

export function requireProviderCredential(
  settings: AiProviderSettings,
  providerId: string,
  credentialName: string,
): string {
  const credential = settings.credentials[credentialName];

  if (credential === undefined || credential.trim().length === 0) {
    throw new AiProviderTransportError(
      providerId,
      'missing_credential',
      `AI provider "${providerId}" requires credential "${credentialName}"`,
    );
  }

  return credential;
}

export function resolveMaxOutputTokens<TInput>(
  settings: AiProviderSettings,
  options: AiProviderAdapterOptions<TInput>,
  providerId: string,
  defaultValue: number,
): number {
  const maxOutputTokens = settings.maxOutputTokens ?? options.maxOutputTokens ?? defaultValue;

  if (!Number.isInteger(maxOutputTokens) || maxOutputTokens <= 0) {
    throw new AiProviderTransportError(
      providerId,
      'invalid_configuration',
      `AI provider "${providerId}" requires a positive integer max output token setting`,
    );
  }

  return maxOutputTokens;
}

export function serializeProviderInput<TInput>(
  input: TInput,
  serializer?: AiProviderAdapterOptions<TInput>['serializeInput'],
): string {
  const serialized = serializer
    ? serializer(input)
    : typeof input === 'string'
      ? input
      : JSON.stringify(input);

  if (serialized === undefined || serialized.trim().length === 0) {
    throw new Error('AI provider input serialization returned empty content');
  }

  return serialized;
}

export function parseProviderOutput(
  providerId: string,
  content: string,
  parser: AiOutputParser | undefined,
): unknown {
  if (parser) {
    return parser(content);
  }

  const trimmedContent = content.trim();
  const fencedContent = /^```(?:json)?\s*([\s\S]*?)\s*```$/i.exec(trimmedContent)?.[1]?.trim();
  const jsonContent = fencedContent ?? trimmedContent;

  try {
    return JSON.parse(jsonContent) as unknown;
  } catch (error) {
    throw new AiProviderTransportError(
      providerId,
      'invalid_response',
      `AI provider "${providerId}" returned content that is not valid JSON`,
      error,
    );
  }
}

export function buildProviderUrl(baseUrl: string, path: string): string {
  const normalizedBaseUrl = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
  return new URL(path.replace(/^\/+/, ''), normalizedBaseUrl).toString();
}

export async function requestProviderJson(
  fetcher: typeof fetch,
  providerId: string,
  url: string,
  request: RequestInit,
): Promise<unknown> {
  let response: Response;

  try {
    response = await fetcher(url, request);
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw error;
    }

    throw new AiProviderTransportError(
      providerId,
      'network_failure',
      `AI provider "${providerId}" request failed`,
      error,
    );
  }

  if (!response.ok) {
    const responseBody = (await response.text().catch(() => '')).slice(
      0,
      maxProviderErrorBodyLength,
    );

    throw new AiProviderTransportError(
      providerId,
      'http_failure',
      `AI provider "${providerId}" returned HTTP ${response.status}`,
      undefined,
      response.status,
      responseBody.length === 0 ? undefined : responseBody,
    );
  }

  let responseText: string;

  try {
    responseText = await response.text();
  } catch (error) {
    throw new AiProviderTransportError(
      providerId,
      'invalid_response',
      `AI provider "${providerId}" returned an unreadable response`,
      error,
    );
  }

  try {
    return JSON.parse(responseText) as unknown;
  } catch (error) {
    throw new AiProviderTransportError(
      providerId,
      'invalid_response',
      `AI provider "${providerId}" returned invalid JSON`,
      error,
    );
  }
}
