import * as fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
const PROJECT_ROOT=fileURLToPath(new URL("../",import.meta.url));
function buildCooperative(){
  const server=path.join(PROJECT_ROOT,'server-app'),dependencies=path.join(server,'node_modules');
  if(!fs.existsSync(path.join(dependencies,'vinext','package.json'))||!fs.existsSync(path.join(dependencies,'wrangler','package.json'))){
    const npm=process.platform==='win32'?'npm.cmd':'npm';
    const installed=spawnSync(npm,['ci'],{cwd:server,stdio:'inherit'});
    if(installed.error)throw installed.error;if(installed.status!==0)process.exit(installed.status||1);
  }
  const publicDir=path.join(server,'public');
  fs.rmSync(publicDir,{recursive:true,force:true});
  fs.cpSync(path.join(PROJECT_ROOT,'dist'),publicDir,{recursive:true});
  const built=spawnSync(process.execPath,[path.join(server,'scripts','run-framework.mjs'),'build'],{cwd:server,stdio:'inherit'});
  if(built.error)throw built.error;if(built.status!==0)process.exit(built.status||1);
  const configPath=path.join(server,'dist','server','wrangler.json');
  const config=JSON.parse(fs.readFileSync(configPath,'utf8'));
  for(const binding of config.d1_databases||[])binding.migrations_dir='../../drizzle';
  fs.writeFileSync(configPath,JSON.stringify(config,null,2)+'\n');
  console.log('第1作の画面と協力プレイAPIをローカル用にビルドしました。');
}
buildCooperative();
