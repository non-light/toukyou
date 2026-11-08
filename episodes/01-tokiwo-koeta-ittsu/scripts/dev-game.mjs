import * as fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
const PROJECT_ROOT=fileURLToPath(new URL("../",import.meta.url));
function serveCooperative(){
  function run(args,cwd,input){
    const result=spawnSync(process.execPath,args,{cwd,stdio:input?['pipe','inherit','inherit']:'inherit',...(input?{input}:{})});
    if(result.error)throw result.error;if(result.status!==0)process.exit(result.status||1);
  }
  run([path.join(PROJECT_ROOT,'scripts','build-game.mjs')],PROJECT_ROOT);
  const server=path.join(PROJECT_ROOT,'server-app');
  const wrangler=['--import','./scripts/local-env.mjs','./node_modules/wrangler/bin/wrangler.js'];
  run([...wrangler,'d1','migrations','apply','DB','--local','--config','dist/server/wrangler.json','--persist-to','.wrangler/state'],server,'y\n');
  const args=process.argv.slice(2);
  run([...wrangler,'dev','--config','dist/server/wrangler.json','--local','--persist-to','.wrangler/state','--ip','127.0.0.1','--inspector-port','0',...(args.length?args:['--port','4181'])],server);
}
serveCooperative();
