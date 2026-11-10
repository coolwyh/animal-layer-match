/**
 * 零依赖核心算法自测：用 Node 动态转译式加载太重，
 * 这里直接用简易 ESM + 手动编译后的 JS，或通过 npx tsx。
 */
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const entry = path.join(root, 'assets/scripts/core/__tests__/pathfinding_level.test.ts');

const tryTsx = spawnSync('npx', ['--yes', 'tsx', entry], {
  cwd: root,
  encoding: 'utf8',
  stdio: 'pipe',
});

if (tryTsx.status === 0) {
  process.stdout.write(tryTsx.stdout);
  process.exit(0);
}

// fallback: tsc + node
const outDir = path.join(root, 'temp/core-test');
const tsc = spawnSync(
  'npx',
  [
    '--yes',
    'tsc',
    entry,
    '../Pathfinding.ts',
    '../LevelGenerator.ts',
    '../CardData.ts',
    '../GameConfig.ts',
    '--strict',
    '--module',
    'commonjs',
    '--target',
    'ES2019',
    '--esModuleInterop',
    '--skipLibCheck',
    '--outDir',
    outDir,
    '--rootDir',
    path.join(root, 'assets/scripts/core'),
  ],
  { cwd: root, encoding: 'utf8', stdio: 'pipe' },
);

if (tsc.status !== 0) {
  console.error(tryTsx.stderr || tryTsx.stdout);
  console.error(tsc.stderr || tsc.stdout);
  process.exit(1);
}

const run = spawnSync('node', [path.join(outDir, '__tests__/pathfinding_level.test.js')], {
  cwd: root,
  encoding: 'utf8',
  stdio: 'pipe',
});
process.stdout.write(run.stdout || '');
process.stderr.write(run.stderr || '');
process.exit(run.status ?? 1);
