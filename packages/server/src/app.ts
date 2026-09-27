import express, { type ErrorRequestHandler, type Express } from 'express';

const defaultJsonBodyLimit = '1mb';

/** Runtime options for the HTTP application boundary. */
export interface AppOptions {
  jsonBodyLimit?: string | number;
}

const requestErrorHandler: ErrorRequestHandler = (error, _request, response, next) => {
  if (response.headersSent) {
    next(error);
    return;
  }

  if (error?.type === 'entity.too.large') {
    response.status(413).json({ error: 'Request body is too large.' });
    return;
  }

  if (error?.type === 'entity.parse.failed') {
    response.status(400).json({ error: 'Invalid JSON request body.' });
    return;
  }

  response.status(500).json({ error: 'Request failed.' });
};

/**
 * Create the server application used by local development and deployment.
 *
 * @returns An Express application with the baseline health endpoint.
 */
export function createApp({ jsonBodyLimit = defaultJsonBodyLimit }: AppOptions = {}): Express {
  const app = express();
  app.use(express.json({ limit: jsonBodyLimit, strict: true }));

  app.get('/health', (_request, response) => {
    response.status(200).json({ status: 'ok' });
  });

  app.use(requestErrorHandler);

  return app;
}
