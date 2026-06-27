import { build } from 'esbuild';

await build({
  entryPoints: ['server/index.ts'],
  bundle: true,
  platform: 'node',
  target: 'node20',
  format: 'cjs',
  outfile: 'server.cjs',
  external: ['mysql2', 'ioredis'],
  logLevel: 'info',
});
console.log('Backend bundled to server.cjs');
