import * as fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
const PROJECT_ROOT=fileURLToPath(new URL("../",import.meta.url));
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
standaloneCheck();
