import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterEach, describe, expect, it } from 'vitest';
import { createApp } from './app';

let server: Server | undefined;

afterEach(async () => {
  if (!server) {
    return;
  }

  await new Promise<void>((resolve, reject) => {
    server?.close((error) => {
      server = undefined;
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });
});

describe('server app', () => {
  it('serves a healthy response', async () => {
    const testServer = createServer(createApp());
    server = testServer;

    await new Promise<void>((resolve, reject) => {
      testServer.once('error', reject);
      testServer.listen(0, '127.0.0.1', resolve);
    });

    const address = testServer.address();
    if (!address || typeof address === 'string') {
      throw new Error('Test server did not expose a TCP address');
    }

    const response = await fetch(`http://127.0.0.1:${(address as AddressInfo).port}/health`);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: 'ok' });
  });
});
