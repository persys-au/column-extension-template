import { createApp } from './app.js';
import { loadServerConfig } from './config.js';

const { port } = loadServerConfig();

createApp().listen(port, '0.0.0.0', () => {
  console.log(`Server listening on port ${port}`);
});
