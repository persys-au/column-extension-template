import { config as loadDotenv } from 'dotenv';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createApp } from './app.js';
import { loadServerConfig } from './config.js';

loadDotenv({ path: resolve(dirname(fileURLToPath(import.meta.url)), '../../../.env') });

const { port } = loadServerConfig();

createApp().listen(port, '0.0.0.0', () => {
  console.log(`Server listening on port ${port}`);
});
