import {cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const server = path.join(root, 'server-app');
const authored = path.join(root, 'dist');
const publicDir = path.join(server, 'public');
const manifest = JSON.parse(readFileSync(path.join(root, '.openai/hosting.json'), 'utf8'));
if (manifest.project_id !== 'appgprj_6aec2c90b13c8191bb14c9c12644b58d' || manifest.static || manifest.d1 !== 'DB') {
  throw new Error('独立したゲーム制作版のDB付き公開設定を確認してください。');
}
mkdirSync(path.join(server, '.openai'), {recursive: true});
writeFileSync(path.join(server, '.openai/hosting.json'), JSON.stringify(manifest, null, 2) + '\n');
rmSync(publicDir, {recursive: true, force: true});
mkdirSync(publicDir, {recursive: true});
for (const entry of readdirSync(authored)) {
  if (['server', 'client', '.openai', '.DS_Store'].includes(entry)) continue;
  cpSync(path.join(authored, entry), path.join(publicDir, entry), {recursive: true});
}
cpSync(path.join(authored, 'index.html'), path.join(publicDir, 'play.html'));
const sitesBuildHelper = '/Users/noriko/.codex/plugins/cache/openai-curated-remote/sites/1.1.3/scripts/build-site.mjs';
// A clean GitHub clone can build with the scripts bundled in server-app.
const buildCommand = existsSync(sitesBuildHelper) ? [sitesBuildHelper] : [path.join(server, 'scripts/run-framework.mjs'), 'build'];
const build = spawnSync(process.execPath, buildCommand, {cwd: server, stdio: 'inherit'});
if (build.status !== 0) process.exit(build.status || 1);
const workerConfig = path.join(server, 'dist/server/wrangler.json');
const config = JSON.parse(readFileSync(workerConfig, 'utf8'));
for (const database of config.d1_databases ?? []) database.migrations_dir = '../../drizzle';
writeFileSync(workerConfig, JSON.stringify(config, null, 2) + '\n');
for (const directory of ['server', 'client', '.openai']) {
  rmSync(path.join(authored, directory), {recursive: true, force: true});
  cpSync(path.join(server, 'dist', directory), path.join(authored, directory), {recursive: true});
}
console.log('ゲームの表示と協力プレイAPIを、独立した制作版としてビルドしました。');
