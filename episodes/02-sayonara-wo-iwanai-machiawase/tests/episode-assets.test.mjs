import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import vm from 'node:vm';

const root=new URL('../dist/',import.meta.url);
const origin='https://station.test/';
const source=path=>readFileSync(new URL(path,root),'utf8');
const resource=path=>new URL(path,origin).href;

test('the single story module and linked styles have matching offline cache entries',()=>{
  const sw=source('sw.js');
  const files=sw.match(/const FILES=\[([^\]]+)\]/)?.[1];
  assert.ok(files,'The station declares its offline resources');
  const cached=new Set([...files.matchAll(/'([^']+)'/g)].map(match=>resource(match[1])));
  const html=source('index.html');
  const scripts=[...html.matchAll(/<script[^>]+src="([^"]+)"/g)].map(match=>match[1]);
  const styles=[...html.matchAll(/<link[^>]+rel="stylesheet"[^>]+href="([^"]+)"/g)].map(match=>match[1]);
  for(const path of styles)assert.ok(cached.has(resource(path)),`${path} must work offline`);
  const pending=scripts.map(resource),visited=new Set();
  while(pending.length){
    const url=pending.pop();if(visited.has(url))continue;visited.add(url);
    assert.ok(cached.has(url),`${url} is imported but absent from the offline cache`);
    const path=new URL(url).pathname.slice(1),file=new URL(path,root);
    assert.ok(existsSync(file),`${path} exists in the authored game`);
    const code=readFileSync(file,'utf8');
    for(const match of code.matchAll(/\bfrom\s*['"]([^'"]+)['"]/g)){
      if(!match[1].startsWith('.'))continue;
      pending.push(new URL(match[1],url).href);
    }
  }
  for(const story of ["farewell"])assert.ok([...visited].some(url=>new URL(url).pathname===`/game/${story}.js`),`${story} is reachable from the game entry point`);
});

test('offline navigation opens the single story URL from the cached shell without caching room requests',async()=>{
  const listeners=new Map(),cached=new Map([[resource('index.html'),'<html>cached station</html>']]);
  const scope={
    URL,Response,Request,
    self:{location:new URL('sw.js',origin),addEventListener:(name,fn)=>listeners.set(name,fn)},
    fetch:async()=>{throw new Error('offline');},
    caches:{match:async request=>{const value=cached.get(typeof request==='string'?request:request.url??request.href);return value?new Response(value):undefined;}},
  };
  vm.runInNewContext(source('sw.js'),scope);
  const request=async(path,mode='navigate')=>{
    let response;
    listeners.get('fetch')({request:{url:resource(path),method:'GET',mode},respondWith:value=>{response=value;}});
    return response;
  };
  for(const episode of [2]){
    const response=await request(`play?episode=${episode}`);
    assert.equal(response.status,200);assert.equal(await response.text(),'<html>cached station</html>');
  }
  cached.set(resource('play?episode=3'),'exact saved document');
  assert.equal(await (await request('play?episode=3')).text(),'exact saved document');
  assert.equal((await request('missing.png','cors')).status,503,'A missing image must not receive HTML');
  assert.equal(await request('api/rooms/ABC234'),undefined,'Cooperative APIs stay network-only');
  assert.equal(await request('https://other.test/play'),undefined,'Other origins stay outside the cache handler');
});

test('activating this episode never deletes another episode cache',async()=>{
 const listeners=new Map(),deleted=[];
 const metadata=JSON.parse(readFileSync(new URL("../episode.json",import.meta.url),"utf8"));
 const ownPrefix="tokyo-station-episode-"+metadata.number+"-";
 const cacheNames=[ownPrefix+"old","tokyo-station-episode-"+(metadata.number===1?2:1)+"-keep","tokyo-station-game-live-keep"];
 const scope={URL,Response,Request,self:{location:new URL("sw.js",origin),addEventListener:(name,fn)=>listeners.set(name,fn),clients:{claim:async()=>{}}},caches:{keys:async()=>cacheNames,delete:async name=>{deleted.push(name);return true;}}};
 vm.runInNewContext(source("sw.js"),scope);let pending;listeners.get("activate")({waitUntil:value=>{pending=value;}});await pending;
 assert.deepEqual(deleted,[ownPrefix+"old"]);
});
