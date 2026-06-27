/**
 * 一键打包：前端构建 → 后端 bundle → 封装成 Windows exe
 *
 * 产物（release/）：
 *   release/daybook.exe   ← 双击启动，访问 http://localhost:5000
 *   release/dist/         ← 前端静态文件
 *   release/.env          ← 运行配置（首次生成自 .env.example，请按需修改）
 *
 * 用法：pnpm build:exe
 */
import { build as esbuild } from 'esbuild';
import { execSync } from 'node:child_process';
import { existsSync, mkdirSync, rmSync, cpSync, copyFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const buildDir = path.join(root, 'build');
const releaseDir = path.join(root, 'release');
const serverBundle = path.join(buildDir, 'server.cjs');

const PKG_TARGET = 'node20-win-x64';
const EXE_NAME = 'daybook.exe';

function run(cmd) {
  console.log(`\n$ ${cmd}`);
  execSync(cmd, { cwd: root, stdio: 'inherit' });
}

async function main() {
  // 0. 清理旧产物
  rmSync(buildDir, { recursive: true, force: true });
  rmSync(releaseDir, { recursive: true, force: true });
  mkdirSync(buildDir, { recursive: true });
  mkdirSync(releaseDir, { recursive: true });

  // 1. 构建前端（产出 dist/）
  console.log('\n=== [1/4] 构建前端 (vite build) ===');
  run('pnpm vite build');

  // 2. bundle 后端为单个 CJS 文件（pkg 对 CJS 支持最佳）
  console.log('\n=== [2/4] 打包后端 (esbuild) ===');
  await esbuild({
    entryPoints: [path.join(root, 'server', 'index.ts')],
    bundle: true,
    platform: 'node',
    target: 'node20',
    format: 'cjs',
    outfile: serverBundle,
    // bcrypt 等纯 JS 依赖直接内联；若后续出现动态 require 报错，把对应包加到这里改为外置
    external: [],
    logLevel: 'info',
    banner: {
      // 兼容部分库对 import.meta.url 的引用
      js: "const importMetaUrl = require('url').pathToFileURL(__filename).href;",
    },
    define: {
      'import.meta.url': 'importMetaUrl',
    },
  });

  // 3. 用 @yao-pkg/pkg 封装为 exe
  console.log('\n=== [3/4] 封装 exe (@yao-pkg/pkg) ===');
  run(
    `pnpm exec pkg "${serverBundle}" --targets ${PKG_TARGET} --output "${path.join(
      releaseDir,
      EXE_NAME
    )}"`
  );

  // 4. 整理发布目录：复制 dist 和 .env
  console.log('\n=== [4/4] 整理发布目录 ===');
  cpSync(path.join(root, 'dist'), path.join(releaseDir, 'dist'), {
    recursive: true,
  });

  const releaseEnv = path.join(releaseDir, '.env');
  const srcEnv = existsSync(path.join(root, '.env'))
    ? path.join(root, '.env')
    : path.join(root, '.env.example');
  if (existsSync(srcEnv)) {
    copyFileSync(srcEnv, releaseEnv);
  }

  console.log(`\n✅ 打包完成 → ${releaseDir}`);
  console.log('   - 修改 release/.env 配置 MySQL/Redis 地址');
  console.log(`   - 双击 release/${EXE_NAME} 启动，浏览器访问 http://localhost:5000`);
}

main().catch((err) => {
  console.error('\n❌ 打包失败:', err);
  process.exit(1);
});
