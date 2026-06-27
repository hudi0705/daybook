/**
 * Electron 打包脚本：前端构建 → 后端 bundle → Electron Builder 打包
 *
 * 产物（release/）：
 *   release/Daybook Setup *.exe  ← 安装程序
 *
 * 用法：pnpm electron:build
 */
import { build as esbuild } from 'esbuild';
import { execSync } from 'node:child_process';
import { existsSync, mkdirSync, rmSync, copyFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const serverBundle = path.join(root, 'server.cjs');

function run(cmd) {
  console.log(`\n$ ${cmd}`);
  execSync(cmd, { cwd: root, stdio: 'inherit' });
}

async function main() {
  // 1. 构建前端（产出 dist/）
  console.log('\n=== [1/3] 构建前端 (vite build) ===');
  run('pnpm vite build');

  // 2. bundle 后端为单个 CJS 文件
  console.log('\n=== [2/3] 打包后端 (esbuild) ===');
  await esbuild({
    entryPoints: [path.join(root, 'server', 'index.ts')],
    bundle: true,
    platform: 'node',
    target: 'node20',
    format: 'cjs',
    outfile: serverBundle,
    external: [
      // mysql2 有原生绑定，需要外置
      'mysql2',
      'ioredis',
    ],
    logLevel: 'info',
    banner: {
      js: "const importMetaUrl = require('url').pathToFileURL(__filename).href;",
    },
    define: {
      'import.meta.url': 'importMetaUrl',
    },
  });

  // 3. 复制 .env 到构建目录（electron-builder extraResources 需要）
  console.log('\n=== [3/3] Electron Builder 打包 ===');
  const envPath = existsSync(path.join(root, '.env'))
    ? path.join(root, '.env')
    : path.join(root, '.env.example');
  if (existsSync(envPath)) {
    copyFileSync(envPath, path.join(root, '.env'));
  }

  run('pnpm exec electron-builder --win');

  console.log('\n✅ Electron 打包完成 → release/');
  console.log('   - 安装后运行 Daybook 桌面应用');
  console.log('   - 确保 .env 中 MySQL 连接信息正确');
}

main().catch((err) => {
  console.error('\n❌ 打包失败:', err);
  process.exit(1);
});
