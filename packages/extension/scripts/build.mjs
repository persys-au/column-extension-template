import { build as buildWithEsbuild } from 'esbuild';
import { copyFile, mkdir, rm } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build as buildWithVite } from 'vite';

const scriptsDirectory = dirname(fileURLToPath(import.meta.url));
const packageRoot = resolve(scriptsDirectory, '..');
const distributionDirectory = resolve(packageRoot, 'dist');
const supportedTargets = ['chrome', 'firefox'];
const requestedTarget = globalThis.process.argv[2] ?? 'all';
const targets = requestedTarget === 'all' ? supportedTargets : [requestedTarget];

if (targets.some((target) => !supportedTargets.includes(target))) {
  throw new Error(`Unsupported extension target: ${requestedTarget}`);
}

await rm(distributionDirectory, { force: true, recursive: true });
await mkdir(distributionDirectory, { recursive: true });

for (const target of targets) {
  const targetDirectory = resolve(distributionDirectory, target);
  await mkdir(targetDirectory, { recursive: true });

  await buildWithVite({
    configFile: resolve(packageRoot, 'vite.config.ts'),
    root: packageRoot,
    build: {
      emptyOutDir: true,
      outDir: resolve(targetDirectory, 'sidebar'),
    },
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
        outfile: resolve(targetDirectory, outputFile),
        platform: 'browser',
        sourcemap: true,
        target: 'es2022',
      }),
    ),
  );

  await copyFile(
    resolve(packageRoot, target === 'firefox' ? 'manifest.firefox.json' : 'manifest.json'),
    resolve(targetDirectory, 'manifest.json'),
  );
}
