import * as fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';

// Export copies only. The verified combined source and original station stay
// untouched. Each output can be downloaded independently from the repository.
const repository=fileURLToPath(new URL('../',import.meta.url));
const source=path.join(repository,'nazotoki');
const outputRoot=path.join(repository,'episodes');
const records=[
  {number:1,slug:'01-tokiwo-koeta-ittsu',kind:'ticket',factory:'createTicketEpisode',title:'時を超えた一通',description:'古い切符がうつす案内をたどり、次の旅人へ手紙を届ける。',port:4181,floors:['1F','B1F'],files:['ticket.js','ticket-state.js','ticket-session.js','ticket.css','mobile-hud.css'],tests:['ticket.test.mjs','ticket-session.test.mjs','ticket-audit.test.mjs','coop.test.mjs']},
  {number:2,slug:'02-sayonara-wo-iwanai-machiawase',kind:'farewell',factory:'createFarewellEpisode',title:'さよならを言わない待ち合わせ',description:'紬と一緒に、幼なじみの晴から届いた最後の宝探しをたどる。',port:4182,floors:['1F','2F','B1F','M2F'],files:['farewell.js','farewell-state.js','farewell.css','photograph-camera.js','photos'],tests:['farewell.test.mjs','arrival-regression.test.mjs','photograph-camera.test.mjs']},
  {number:3,slug:'03-shashin-ni-utsuranakatta-kimi',kind:'photograph',factory:'createPhotographEpisode',title:'写真に写らなかった君',description:'青年・律と、写真の向こうに残る景色と、今日の自分が写る一枚を探す。',port:4183,floors:['1F','B1F','B2F','B3F','B4F','B5F'],files:['photograph.js','photograph-state.js','photograph.css','photograph-camera.js'],tests:['photograph.test.mjs','photograph-camera.test.mjs']},
  {number:4,slug:'04-anohino-yakusokuwo-mouichido',kind:'promise',factory:'createPromiseEpisode',title:'あの日の約束を、もう一度',description:'紬と祖母の手帳を読み解き、長く会っていない友人との再会を手伝う。',port:4184,floors:['1F','B1F'],files:['promise.js','promise-state.js','promise.css','promise-evidence.js','promise-evidence.css','photograph-camera.js'],tests:['promise.test.mjs','promise-evidence.test.mjs','photograph-camera.test.mjs']},
];
const commonGame=['addon.js','avatar-catalog.js','avatar-layer.js','avatar.css','avatars','characters.js','content.js','state.js','shoulder-camera.js','studio.css','episodes.css'];
const commonTests=['avatars.test.mjs','floors.test.mjs','game.test.mjs','guide.test.mjs','landmarks.test.mjs','layout.test.mjs','shoulder-camera.test.mjs','trains.test.mjs'];
const excluded=new Set(['.git','.openai','.next','.vinext','.wrangler','.sites-runtime','node_modules','.DS_Store']);
const read=file=>fs.readFileSync(file,'utf8');
const json=file=>JSON.parse(read(file));
const write=(file,value)=>{fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,value);};
const writeJSON=(file,value)=>write(file,JSON.stringify(value,null,2)+'\n');

function copyTree(from,to){
  const stat=fs.lstatSync(from);
  if(stat.isSymbolicLink())throw new Error('Export sources must be real files, not symlinks: '+from);
  if(stat.isDirectory()){
    fs.mkdirSync(to,{recursive:true});
    for(const name of fs.readdirSync(from).sort())if(!excluded.has(name))copyTree(path.join(from,name),path.join(to,name));
  }else if(stat.isFile()){
    fs.mkdirSync(path.dirname(to),{recursive:true});
    fs.copyFileSync(from,to);
  }
}
function filesIn(root,prefix=''){
  const result=[];
  for(const entry of fs.readdirSync(path.join(root,prefix),{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name))){
    const relative=prefix?prefix+'/'+entry.name:entry.name;
    if(entry.isSymbolicLink())throw new Error('An export cannot contain a symlink: '+relative);
    if(entry.isDirectory())result.push(...filesIn(root,relative));else result.push(relative);
  }
  return result;
}
function html(value){return value.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');}
function generatedScript(imports,fn){
  return imports.join('\n')+'\nconst PROJECT_ROOT=fileURLToPath(new URL("../",import.meta.url));\n'+fn.toString()+'\n'+fn.name+'();\n';
}
const scriptImports=[
  "import * as fs from 'node:fs';",
  "import path from 'node:path';",
  "import {fileURLToPath} from 'node:url';",
];

function standaloneCheck(){
  const metadata=JSON.parse(fs.readFileSync(path.join(PROJECT_ROOT,'episode.json'),'utf8'));
  const protection=JSON.parse(fs.readFileSync(path.join(PROJECT_ROOT,'protected-map.json'),'utf8'));
  for(const [relative,expected] of Object.entries(protection.sha256)){
    const actual=createHash('sha256').update(fs.readFileSync(path.join(PROJECT_ROOT,relative))).digest('hex');
    if(actual!==expected)throw new Error('駅の形・地図が変更されています: '+relative);
  }
  function walk(directory){
    const result=[];
    for(const entry of fs.readdirSync(directory,{withFileTypes:true})){
      if(entry.isSymbolicLink())throw new Error('単独版に外部へのリンクは含められません: '+entry.name);
      if(entry.isDirectory())result.push(...walk(path.join(directory,entry.name)));
      else result.push(path.join(directory,entry.name));
    }
    return result;
  }
  for(const directory of ['dist','scripts']){
    for(const file of walk(path.join(PROJECT_ROOT,directory)).filter(file=>/\.(?:js|mjs)$/.test(file))){
      const checked=spawnSync(process.execPath,['--check',file],{stdio:'inherit'});
      if(checked.error)throw checked.error;if(checked.status!==0)process.exit(checked.status||1);
    }
  }
  if(fs.existsSync(path.join(PROJECT_ROOT,'.openai'))||fs.existsSync(path.join(PROJECT_ROOT,'server-app','.openai')))throw new Error('この単独版には公開先の登録情報を含めません。');
  for(const kind of ['ticket','farewell','photograph','promise']){
    if(kind!==metadata.kind&&fs.existsSync(path.join(PROJECT_ROOT,'dist','game',kind+'.js')))throw new Error('別の作品の画面が含まれています: '+kind);
  }
  console.log('第'+metadata.number+'作: 構文・駅の保護・単独構成を確認しました。');
}

function serveStatic(){
  const metadata=JSON.parse(fs.readFileSync(path.join(PROJECT_ROOT,'episode.json'),'utf8'));
  const args=process.argv.slice(2),portIndex=args.indexOf('--port');
  const port=Number(portIndex>=0?args[portIndex+1]:process.env.PORT||metadata.port);
  if(!Number.isInteger(port)||port<1||port>65535)throw new Error('ポートは1〜65535で指定してください。');
  const root=path.join(PROJECT_ROOT,'dist');
  const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.webmanifest':'application/manifest+json; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.glb':'model/gltf-binary','.txt':'text/plain; charset=utf-8','.md':'text/plain; charset=utf-8'};
  const server=createServer((request,response)=>{
    if(!['GET','HEAD'].includes(request.method)){response.writeHead(405,{'Allow':'GET, HEAD'});response.end();return;}
    let pathname;
    try{pathname=decodeURIComponent(new URL(request.url,'http://127.0.0.1').pathname);}catch{response.writeHead(400);response.end('Bad request');return;}
    if(['/', '/play', '/play.html'].includes(pathname))pathname='/index.html';
    const file=path.resolve(root,'.'+pathname);
    if(file!==root&&!file.startsWith(root+path.sep)){response.writeHead(403);response.end('Forbidden');return;}
    let stat;try{stat=fs.statSync(file);}catch{response.writeHead(404);response.end('Not found');return;}
    if(!stat.isFile()){response.writeHead(404);response.end('Not found');return;}
    response.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Content-Length':stat.size,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});
    if(request.method==='HEAD')response.end();else fs.createReadStream(file).on('error',()=>response.destroy()).pipe(response);
  });
  server.on('error',error=>{console.error(error.message);process.exitCode=1;});
  server.listen(port,'127.0.0.1',()=>console.log(metadata.title+'\nLocal: http://127.0.0.1:'+port+'/'));
  for(const signal of ['SIGINT','SIGTERM'])process.once(signal,()=>server.close(()=>process.exit(0)));
}

function buildStatic(){
  const output=path.join(PROJECT_ROOT,'build');
  fs.rmSync(output,{recursive:true,force:true});
  fs.cpSync(path.join(PROJECT_ROOT,'dist'),output,{recursive:true});
  console.log('単独公開用の静的ファイルを build/ に作成しました。');
}

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

function singleEpisodeAdapter(record){
  return [
    'import {'+record.factory+"} from './"+record.kind+".js?v=audit3';",
    'const EPISODE_NUMBER='+record.number+';',
    'const EPISODE_TITLE='+JSON.stringify(record.title)+';',
    'export function createStoryEpisodes(api){',
    '  const initialQuery=new URLSearchParams(location.search);',
    "  document.title=EPISODE_TITLE+'｜東京駅の謎解き';",
    "  function select(){const url=new URL(location.href);url.searchParams.set('episode',String(EPISODE_NUMBER));if(EPISODE_NUMBER!==1)url.searchParams.delete('room');history.replaceState(null,'',url.pathname+url.search+url.hash);return true;}",
    '  const episode='+record.factory+'({...api,onSelect:select});',
    record.number===1?
      "  const launch=document.getElementById('ticket-start');if(launch)launch.textContent='1作目 '+EPISODE_TITLE;":
      "  const launch=document.createElement('button');launch.type='button';launch.id='"+record.kind+"-start';launch.className='primary';launch.textContent=EPISODE_NUMBER+'作目 '+EPISODE_TITLE;launch.addEventListener('click',()=>episode.openIntro());document.querySelector('#welcome #start')?.before(launch);",
    "  const nav=document.createElement('button');nav.type='button';nav.id='story-select';nav.className='game-studio-nav';nav.textContent='物語';nav.setAttribute('aria-label',EPISODE_TITLE+'を開く');nav.addEventListener('click',()=>episode.openIntro());document.querySelector('.bottom-nav')?.append(nav);",
    "  if(initialQuery.has('episode')&&!(EPISODE_NUMBER===1&&initialQuery.has('room')))episode.openIntro();",
    '  return {update(dt){episode.update(dt);},close(){episode.close();},dispose(){episode.dispose();launch?.remove();nav.remove();},get shoulderView(){return episode.shoulderView;}};',
    '}','',
  ].join('\n');
}

function singleIndex(record){
  let index=read(path.join(source,'dist','index.html'));
  index=index.replace(/<title>[\s\S]*?<\/title>/,'<title>'+html(record.title)+'｜東京駅の謎解き</title>');
  index=index.replace(/<meta name="description" content="[^"]*">/,'<meta name="description" content="'+html(record.description)+'">');
  index=index.replace(/<link rel="stylesheet" href="\.\/game\/[^"]+">\s*/g,'');
  const styles=['studio.css','avatar.css','episodes.css',...record.files.filter(file=>file.endsWith('.css'))];
  index=index.replace('</head>',styles.map(file=>'<link rel="stylesheet" href="./game/'+file+'?v=audit3">').join('\n')+'\n</head>');
  index=index.replace(/(<section class="welcome glass" id="welcome">[\s\S]*?)<h1>[\s\S]*?<\/h1><p>[\s\S]*?<\/p>/,
    '$1<h1>'+html(record.title)+'</h1><p>第'+record.number+'作<br>'+html(record.description)+'</p>');
  index=index.replace('東京駅の謎解き · 四つの物語','東京駅の謎解き · 第'+record.number+'作');
  index=index.replace(/<div class="model-footer">[\s\S]*?<\/div>/,'<div class="model-footer">第'+record.number+'作 · '+html(record.title)+'</div>');
  return index;
}

function offlineFiles(dist){
  const files=new Set(['./','./index.html','./play.html']);
  const origin='https://export.test';
  for(const relative of filesIn(dist)){
    if(relative==='sw.js')continue;
    files.add('./'+relative);
    const code=/\.(?:js|html)$/.test(relative)?read(path.join(dist,relative)):'';
    const base=new URL(relative,origin);
    const add=value=>{if(value.startsWith('.')){const url=new URL(value,base);if(url.origin===origin)files.add('.'+url.pathname+url.search);}};
    if(relative.endsWith('.js'))for(const match of code.matchAll(/\bfrom\s*['"]([^'"]+)['"]/g))add(match[1]);
    if(relative.endsWith('.html'))for(const match of code.matchAll(/(?:src|href)="(\.[^"]+)"/g))add(match[1]);
  }
  return [...files].sort();
}

function serviceWorker(record,files,sourceCommit){
  const prefix='tokyo-station-episode-'+record.number+'-';
  return [
    'const CACHE_PREFIX='+JSON.stringify(prefix)+';',
    'const CACHE=CACHE_PREFIX+'+JSON.stringify(sourceCommit.slice(0,12))+';',
    'const FILES=['+files.map(file=>"'"+file.replaceAll("'","%27")+"'").join(',')+'];',
    "self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(FILES.map(path=>new Request(path,{cache:'reload'})))).then(()=>self.skipWaiting()));});",
    "self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith(CACHE_PREFIX)&&key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim()));});",
    "self.addEventListener('fetch',event=>{",
    " const url=new URL(event.request.url);if(url.pathname.startsWith('/api/')||event.request.method!=='GET'||url.origin!==self.location.origin)return;",
    " event.respondWith(fetch(event.request,{cache:'no-cache'}).then(response=>{if(response.ok){const copy=response.clone();caches.open(CACHE).then(cache=>cache.put(event.request,copy));}return response;}).catch(async()=>{",
    '  const exact=await caches.match(event.request);if(exact)return exact;',
    "  if(event.request.mode==='navigate'){const shell=await caches.match(new URL('./index.html',self.location.href).href);if(shell)return shell;}",
    "  return new Response('オフラインで利用するには、初回にオンラインで開いてください。',{status:503,headers:{'Content-Type':'text/plain; charset=utf-8'}});",
    ' }));','});','',
  ].join('\n');
}

function exportTests(record,destination){
  for(const file of [...commonTests,...record.tests])copyTree(path.join(source,'tests',file),path.join(destination,'tests',file));
  const gamePath=path.join(destination,'tests','game.test.mjs');
  write(gamePath,read(gamePath).replace("import {assertGameProject} from '../scripts/check-original.mjs';\n",'').replace(/test\('the publication guard accepts only[\s\S]*?\n\}\);\n/,''));
  let assets=read(path.join(source,'tests','episode-assets.test.mjs'));
  assets=assets.replace("['ticket','farewell','photograph','promise']",JSON.stringify([record.kind]));
  assets=assets.replace('for(let episode=1;episode<=4;episode++)','for(const episode of ['+record.number+'])');
  assets=assets.replace('all story modules and linked styles','the single story module and linked styles').replace('every story URL','the single story URL');
  assets+='\n'+[
    "test('activating this episode never deletes another episode cache',async()=>{",
    ' const listeners=new Map(),deleted=[];',
    ' const metadata=JSON.parse(readFileSync(new URL("../episode.json",import.meta.url),"utf8"));',
    ' const ownPrefix="tokyo-station-episode-"+metadata.number+"-";',
    ' const cacheNames=[ownPrefix+"old","tokyo-station-episode-"+(metadata.number===1?2:1)+"-keep","tokyo-station-game-live-keep"];',
    ' const scope={URL,Response,Request,self:{location:new URL("sw.js",origin),addEventListener:(name,fn)=>listeners.set(name,fn),clients:{claim:async()=>{}}},caches:{keys:async()=>cacheNames,delete:async name=>{deleted.push(name);return true;}}};',
    ' vm.runInNewContext(source("sw.js"),scope);let pending;listeners.get("activate")({waitUntil:value=>{pending=value;}});await pending;',
    ' assert.deepEqual(deleted,[ownPrefix+"old"]);',
    '});','',
  ].join('\n');
  write(path.join(destination,'tests','episode-assets.test.mjs'),assets);
  const routes=read(path.join(source,'tests','story-routes.test.mjs'));
  let routePrefix=routes.slice(0,routes.indexOf("test('story routes progressively"));
  routePrefix=routePrefix.replace(/^import \{SPOTS as \w+\} from '\.\.\/dist\/game\/[^']+';\n/gm,'');
  routePrefix=routePrefix.replace(/const stories=\[[\s\S]*?\];\n/,'');
  routePrefix=routePrefix.replace('const reports=[];\n','');
  routePrefix=routePrefix.replace("import {FLOORS,FLOOR_ZONES,CONNECTORS,insideFloor,buildingRoute}","import {FLOOR_ZONES,CONNECTORS,insideFloor,buildingRoute}");
  routePrefix="import {SPOTS} from '../dist/game/"+record.kind+"-state.js';\n"+routePrefix;
  write(path.join(destination,'tests','story-routes.test.mjs'),routePrefix+[
    "test('the complete standalone story route stays walkable on its intended floors',sceneOptions,()=>{",
    ' const visited=new Set([SPOTS[0].floor]);',
    ' for(let index=1;index<SPOTS.length;index++){',
    '  const from=SPOTS[index-1],to=SPOTS[index];if(samePoint(from,to))continue;',
    '  const checked=physicalRoute(from,to);for(const step of checked.route)visited.add(step.floor);',
    ' }',
    ' assert.deepEqual([...visited].sort(),'+JSON.stringify(record.floors)+');',
    '});','',
  ].join('\n'));
}

function backendConfig(){
  return [
    "import vinext from 'vinext';",
    "import {defineConfig} from 'vite';",
    "import {configureToolEnvironment} from './scripts/tool-environment.mjs';",
    'export default defineConfig(async()=>{',
    ' configureToolEnvironment(process.cwd());',
    " const {cloudflare}=await import('@cloudflare/vite-plugin');",
    ' return {server:{host:"127.0.0.1",...(process.env.CODEX_SANDBOX==="seatbelt"?{watch:{useFsEvents:false,usePolling:true}}:{})},plugins:[',
    '  vinext(),',
    '  cloudflare({viteEnvironment:{name:"rsc",childEnvironments:["ssr"]},inspectorPort:false,config:{',
    '   name:"tokyo-station-episode-01",main:"./worker/index.ts",compatibility_date:"2026-05-15",compatibility_flags:["nodejs_compat"],',
    '   d1_databases:[{binding:"DB",database_name:"tokyo-station-episode-01-local",database_id:"00000000-0000-4000-8000-000000000000",migrations_dir:"./drizzle"}]',
    '  }})',
    ' ]};','});','',
  ].join('\n');
}

function exportBackend(destination,record){
  const original=path.join(source,'server-app'),server=path.join(destination,'server-app');
  for(const directory of ['app','db','drizzle','lib','vendor','worker'])copyTree(path.join(original,directory),path.join(server,directory));
  for(const file of ['package.json','package-lock.json','.npmrc','.gitignore','tsconfig.json','next.config.ts','postcss.config.mjs','cloudflare-env.d.ts','drizzle.config.ts'])copyTree(path.join(original,file),path.join(server,file));
  for(const file of ['tool-environment.mjs','run-framework.mjs'])copyTree(path.join(original,'scripts',file),path.join(server,'scripts',file));
  write(path.join(server,'scripts','execution-profile.mjs'),"export function readExecutionProfile(){return 'portable';}\n");
  write(path.join(server,'scripts','local-env.mjs'),[
    "import {mkdirSync} from 'node:fs';",
    "import path from 'node:path';",
    "import {fileURLToPath} from 'node:url';",
    "import {configureToolEnvironment} from './tool-environment.mjs';",
    "const root=fileURLToPath(new URL('../',import.meta.url));configureToolEnvironment(root);process.chdir(root);",
    'for(const directory of [path.dirname(process.env.WRANGLER_LOG_PATH),process.env.WRANGLER_REGISTRY_PATH,process.env.MINIFLARE_REGISTRY_PATH])mkdirSync(directory,{recursive:true});','',
  ].join('\n'));
  write(path.join(server,'vite.config.ts'),backendConfig());
  write(path.join(server,'app','page.tsx'),[
    "import {redirect} from 'next/navigation';",
    'export default async function Home({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}){',
    ' const params=await searchParams;const query=new URLSearchParams();',
    ' if(typeof params.room==="string"&&params.room)query.set("room",params.room);',
    ' else if(params.episode)query.set("episode","1");',
    ' redirect("/play.html"+(query.size?"?"+query.toString():""));',
    '}','',
  ].join('\n'));
  const serverPackage=json(path.join(server,'package.json'));
  serverPackage.scripts={
    build:'node scripts/run-framework.mjs build',
    dev:'node scripts/run-framework.mjs dev',
    start:'node --import ./scripts/local-env.mjs ./node_modules/wrangler/bin/wrangler.js dev --config dist/server/wrangler.json --local --persist-to .wrangler/state --ip 127.0.0.1 --inspector-port 0 --port '+record.port,
    'db:generate':'drizzle-kit generate',
  };
  writeJSON(path.join(server,'package.json'),serverPackage);
  copyTree(path.join(source,'drizzle'),path.join(destination,'drizzle'));
  const imports=[...scriptImports,"import {spawnSync} from 'node:child_process';"];
  write(path.join(destination,'scripts','build-game.mjs'),generatedScript(imports,buildCooperative));
  write(path.join(destination,'scripts','dev-game.mjs'),generatedScript(imports,serveCooperative));
}

async function exportEpisode(record,sourceVersion,replace){
  const destination=path.join(outputRoot,record.slug);
  if(fs.existsSync(destination)){
    const metadata=path.join(destination,'episode.json');
    if(!replace||!fs.existsSync(metadata)||json(metadata).number!==record.number)throw new Error('出力先が既にあります。再生成するときは --replace を指定してください: '+destination);
  }
  const temporary=path.join(outputRoot,'.export-'+record.number+'-'+process.pid);
  if(fs.existsSync(temporary))throw new Error('一時出力が既にあります: '+temporary);
  fs.mkdirSync(temporary,{recursive:true});
  try{
    const dist=path.join(temporary,'dist');
    for(const name of fs.readdirSync(path.join(source,'dist')).sort()){
      if(['game','server','client','.openai','.DS_Store'].includes(name))continue;
      copyTree(path.join(source,'dist',name),path.join(dist,name));
    }
    for(const name of [...commonGame,...record.files])copyTree(path.join(source,'dist','game',name),path.join(dist,'game',name));
    write(path.join(dist,'game','episodes.js'),singleEpisodeAdapter(record));
    write(path.join(dist,'index.html'),singleIndex(record));
    write(path.join(dist,'play.html'),read(path.join(dist,'index.html')));
    const manifest=json(path.join(dist,'manifest.webmanifest'));
    Object.assign(manifest,{name:record.title,short_name:'東京駅 第'+record.number+'作',description:record.description,start_url:'./',scope:'./'});
    writeJSON(path.join(dist,'manifest.webmanifest'),manifest);
    writeJSON(path.join(temporary,'episode.json'),{
      number:record.number,title:record.title,kind:record.kind,description:record.description,
      port:record.port,source_commit:sourceVersion.source_commit,
      source_directory:'nazotoki',original_map_commit:sourceVersion.original_map_commit,
      backend:record.number===1?'local-d1-cooperative':'static',standalone:true,
    });
    copyTree(path.join(source,'protected-map.json'),path.join(temporary,'protected-map.json'));
    copyTree(path.join(source,'docs','STATION_BASE.md'),path.join(temporary,'docs','STATION_BASE.md'));
    write(path.join(temporary,'scripts','check.mjs'),generatedScript([...scriptImports,"import {createHash} from 'node:crypto';","import {spawnSync} from 'node:child_process';"],standaloneCheck));
    if(record.number===1)exportBackend(temporary,record);
    else{
      write(path.join(temporary,'scripts','serve.mjs'),generatedScript([...scriptImports,"import {createServer} from 'node:http';"],serveStatic));
      write(path.join(temporary,'scripts','build.mjs'),generatedScript(scriptImports,buildStatic));
    }
    exportTests(record,temporary);
    if(record.number===4){
      const [{CLUES},{ENDING}]=await Promise.all([
        import(pathToFileURL(path.join(source,'dist','game','ticket-state.js')).href),
        import(pathToFileURL(path.join(source,'dist','game','farewell-state.js')).href),
      ]);
      write(path.join(temporary,'tests','fixtures','series-canon.mjs'),'// Reference text for continuity checks; no other episode runtime is included.\nexport const CLUES='+JSON.stringify(CLUES,null,2)+';\nexport const farewellEnding='+JSON.stringify(ENDING,null,2)+';\n');
      const testPath=path.join(temporary,'tests','promise.test.mjs');
      write(testPath,read(testPath).replace("import {CLUES} from '../dist/game/ticket-state.js';\nimport {ENDING as farewellEnding} from '../dist/game/farewell-state.js';","import {CLUES,farewellEnding} from './fixtures/series-canon.mjs';"));
    }
    write(path.join(dist,'sw.js'),serviceWorker(record,offlineFiles(dist),sourceVersion.source_commit));
    const scripts={
      start:'node scripts/'+(record.number===1?'dev-game.mjs':'serve.mjs'),
      check:'node scripts/check.mjs',
      test:'CHECK_SCENE=1 CHECK_BUILDING_SCENE=1 node --test tests/*.test.mjs',
      build:'node scripts/check.mjs && node scripts/'+(record.number===1?'build-game.mjs':'build.mjs'),
    };
    if(record.number===1)scripts.setup='npm --prefix server-app ci';
    writeJSON(path.join(temporary,'package.json'),{name:'tokyo-station-episode-'+String(record.number).padStart(2,'0'),private:true,version:'1.0.0',type:'module',description:record.title,engines:{node:'>=22.13.0'},scripts});
    write(path.join(temporary,'.gitignore'),['.DS_Store','node_modules/','build/','server-app/public/','server-app/dist/','server-app/.next/','server-app/.vinext/','server-app/.wrangler/','server-app/.sites-runtime/','*.tsbuildinfo','*.log','.env*','.dev.vars*','*.zip',''].join('\n'));
    write(path.join(temporary,'AGENTS.md'),[
      '# Tokyo Station — standalone episode '+record.number,
      '',
      '- This folder is a self-contained export of episode '+record.number+'. Work on this episode here; the combined edition is in ../../nazotoki/.',
      '- Keep story data and behavior in dist/game/. Do not alter station geometry, floors, gates, trains, maps or meeting landmark assets.',
      '- Run npm run check and npm test after changes. protected-map.json contains the immutable station hashes.',
      '- This export has no live Site identity or deployment credentials. Local build/start commands do not publish anything.',
      '- Preserve the existing episode save key and migrate old progress when the schema changes.',
      '- Preserve original main and the original-station tag; repository updates belong on game-development.',
      '- Do not replace this standalone folder from a different episode or add another story entry point.',
      '',
    ].join('\n'));
    write(path.join(temporary,'README.md'),[
      '# 第'+record.number+'作『'+record.title+'』','',record.description,'',
      'このフォルダだけで遊び、制作できる単独版です。駅の3Dデータ・人物素材・テストを同梱しています。','',
      '## 起動','',
      'Node.js 22.13以降を使用します。','',
      '~~~sh','npm start','~~~','',
      'ブラウザで http://127.0.0.1:'+record.port+'/ を開いてください。別のポートは npm start -- --port 4190 で指定できます。','',
      record.number===1?'初回起動時に server-app の固定済み依存関係をインストールします。インターネット接続が必要です。先に npm run setup で準備することもできます。1〜4人の協力プレイは、同梱のローカルAPIとDBで動きます。':'追加パッケージのインストールは不要です。1人用の物語と進行保存はブラウザ内で動きます。',
      '',
      '## 確認と制作','',
      '~~~sh','npm run check','npm test','npm run build','~~~','',
      '物語は dist/game/'+record.kind+'-state.js、画面と操作は dist/game/'+record.kind+'.js と '+record.kind+'.css にあります。','',
      record.number===1?'ビルド先は server-app/dist/ です。ローカルのDBは server-app/.wrangler/state/ に保存します。':'npm run build は静的ファイルを build/ に作成します。静的ホスティングには build/ の中身を使用できます。',
      '',
      '駅の形・階・通路・地図・列車は protected-map.json で保護しています。自動保存のキーと、これまでのクリア記録は元の作品と共通です。','',
      '公開先は登録していません。既存の統合版と完成済みの駅を上書きする操作は含めていません。','',
      '元の統合版の識別情報は episode.json に記録しています。人物・3Dライブラリのライセンスは dist/game/avatars/ と dist/vendor/ に同梱しています。','',
    ].join('\n'));
    if(fs.existsSync(destination))fs.rmSync(destination,{recursive:true});
    fs.renameSync(temporary,destination);
    console.log('Exported episode '+record.number+': '+path.relative(repository,destination));
  }catch(error){fs.rmSync(temporary,{recursive:true,force:true});throw error;}
}

const args=process.argv.slice(2);
if(args.includes('--help')){
  console.log('node scripts/export-episodes.mjs [--episode 1|2|3|4] [--replace]\nNo --episode exports all four folders. Existing output is preserved unless --replace is explicit.');
}else{
  const allowed=new Set(['--episode','--replace']);
  let selected=null,replace=false;
  for(let index=0;index<args.length;index++){
    const argument=args[index];
    if(!allowed.has(argument))throw new Error('Unknown argument: '+argument);
    if(argument==='--replace')replace=true;
    else{selected=Number(args[++index]);if(!records.some(record=>record.number===selected))throw new Error('--episode must be 1, 2, 3 or 4.');}
  }
  const sourceVersion=json(path.join(source,'SOURCE_VERSION.json'));
  if(!/^[a-f0-9]{40}$/.test(sourceVersion.source_commit)||!/^[a-f0-9]{40}$/.test(sourceVersion.original_map_commit))throw new Error('The verified source commit metadata is missing.');
  const protection=json(path.join(source,'protected-map.json'));
  for(const [relative,expected] of Object.entries(protection.sha256)){
    const digest=createHash('sha256').update(fs.readFileSync(path.join(source,relative))).digest('hex');
    if(digest!==expected)throw new Error('The source station has changed: '+relative);
  }
  fs.mkdirSync(outputRoot,{recursive:true});
  for(const record of records.filter(record=>selected===null||record.number===selected))await exportEpisode(record,sourceVersion,replace);
}
