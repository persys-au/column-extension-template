import { build as buildWithEsbuild } from 'esbuild';
import { copyFile, mkdir, rm } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build as buildWithVite } from 'vite';

const scriptsDirectory = dirname(fileURLToPath(import.meta.url));
const packageRoot = resolve(scriptsDirectory, '..');
const distributionDirectory = resolve(packageRoot, 'dist');

await rm(distributionDirectory, { force: true, recursive: true });
await mkdir(distributionDirectory, { recursive: true });

await buildWithVite({
  configFile: resolve(packageRoot, 'vite.config.ts'),
  root: packageRoot,
});

await Promise.all(
  [
    ['src/background/index.ts', 'background.js'],
    ['src/content/index.ts', 'content.js'],
  ].map(([entryPoint, outputFile]) =>
    buildWithEsbuild({
      bundle: true,
      entryPoints: [resolve(packageRoot, entryPoint)],
      format: 'iife',
      outfile: resolve(distributionDirectory, outputFile),
      platform: 'browser',
      sourcemap: true,
      target: 'es2022',
    }),
  ),
);

await copyFile(
  resolve(packageRoot, 'manifest.json'),
  resolve(distributionDirectory, 'manifest.json'),
);
