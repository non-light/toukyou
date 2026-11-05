import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const server = path.join(root, 'server-app');
function run(args, cwd, input) {
  const result = spawnSync(process.execPath, args, {cwd, stdio: input ? ['pipe', 'inherit', 'inherit'] : 'inherit', ...(input ? {input} : {})});
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status || 1);
}
run([path.join(root, 'scripts/build-game.mjs')], root);
run(['--import', './scripts/sites-env.mjs', './node_modules/wrangler/bin/wrangler.js',
  'd1', 'migrations', 'apply', 'DB', '--local', '--config', 'dist/server/wrangler.json', '--persist-to', '.wrangler/state'], server, 'y\n');
const args = process.argv.slice(2);
run(['--import', './scripts/sites-env.mjs', './node_modules/wrangler/bin/wrangler.js',
  'dev', '--config', 'dist/server/wrangler.json', '--local', '--persist-to', '.wrangler/state',
  '--ip', '127.0.0.1', '--inspector-port', '0', ...(args.length ? args : ['--port', '4175'])], server);
