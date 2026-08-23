import express, { type Express } from 'express';

/**
 * Create the server application used by local development and deployment.
 *
 * @returns An Express application with the baseline health endpoint.
 */
export function createApp(): Express {
  const app = express();

  app.get('/health', (_request, response) => {
    response.status(200).json({ status: 'ok' });
  });

  return app;
}
