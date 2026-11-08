import {GAME_CONTENT} from './content.js?v=game1';

const clone=value=>JSON.parse(JSON.stringify(value));
const record=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
const own=(object,key)=>Object.prototype.hasOwnProperty.call(object,key);
const invalid=message=>{throw new Error(message);};
const RESERVED=new Set(['__proto__','prototype','constructor']);
function text(value,label,max=2000,{optional=false}={}){
 if(value===undefined&&optional)return '';
 if(typeof value!=='string')invalid(label+'は文字で入力してください。');
 const result=value.trim();
 if((!result&&!optional)||result.length>max)invalid(label+`は${optional?'0':'1'}〜${max}文字で入力してください。`);
 return result;
}
function id(value,label){const result=text(value,label,80);if(!/^[a-zA-Z0-9_-]+$/.test(result)||RESERVED.has(result))invalid(label+'には半角の英数字・ハイフン・下線を使ってください。');return result;}
function list(value,label,max){if(!Array.isArray(value)||value.length>max)invalid(label+`は${max}件以内にしてください。`);return value;}
export const normalizeAnswer=value=>String(value??'').normalize('NFKC').toLocaleLowerCase('ja').replace(/\s+/gu,'');

export function validateContent(raw,zones){
 if(!record(raw)||raw.schemaVersion!==1)invalid('対応していないゲームデータです。');
 if(!Array.isArray(zones))invalid('配置できる場所が読み込まれていません。');
 const knownZones=new Set(zones.map(zone=>zone.id));
 const used=new Set();
 const unique=(value,label)=>{const result=id(value,label);if(used.has(result))invalid('同じIDが重複しています。');used.add(result);return result;};
 const zoneId=(value,label)=>{const result=text(value,label,120);if(!knownZones.has(result))invalid(label+'を駅の地点一覧から選んでください。');return result;};
 const characters=list(raw.characters,'登場人物',20).map((value,index)=>{
  if(!record(value))invalid('登場人物のデータを確認してください。');
  const label=`登場人物${index+1}`;
  const color=value.color??'#789074';if(typeof color!=='string'||!/^#[0-9a-f]{6}$/i.test(color))invalid(label+'の色を選び直してください。');
  return {id:unique(value.id,label+'のID'),name:text(value.name,label+'の名前',80),zoneId:zoneId(value.zoneId,label+'の場所'),dialogue:list(value.dialogue??[],label+'の会話',30).map(line=>text(line,label+'の会話',2000)),color:color.toLowerCase(),puzzleId:value.puzzleId===undefined||value.puzzleId===null||value.puzzleId===''?null:id(value.puzzleId,label+'が案内する謎')};
 });
 const puzzles=list(raw.puzzles,'謎',30).map((value,index)=>{
  if(!record(value))invalid('謎のデータを確認してください。');
  const label=`謎${index+1}`,answers=list(value.answers,label+'の正解',20).map(answer=>text(answer,label+'の正解',2000));
  if(!answers.length||answers.some(answer=>!normalizeAnswer(answer)))invalid(label+'には正解を1つ以上入力してください。');
  const requires=list(value.requires??[],label+'の前提となる謎',30).map(required=>id(required,label+'の前提となる謎'));
  return {id:unique(value.id,label+'のID'),title:text(value.title,label+'のタイトル',120),zoneId:zoneId(value.zoneId,label+'の場所'),question:text(value.question,label+'の問題文',2000),answers:[...new Set(answers)],hint:text(value.hint,label+'のヒント',2000,{optional:true}),successText:text(value.successText,label+'の正解メッセージ',2000,{optional:true}),requires:[...new Set(requires)]};
 });
 const puzzleMap=new Map(puzzles.map(puzzle=>[puzzle.id,puzzle]));
 for(const character of characters)if(character.puzzleId&&!puzzleMap.has(character.puzzleId))invalid(character.name+'が案内する謎が見つかりません。');
 for(const puzzle of puzzles)for(const required of puzzle.requires){if(required===puzzle.id)invalid('謎を自分自身の前提にはできません。');if(!puzzleMap.has(required))invalid(puzzle.title+'の前提となる謎が見つかりません。');}
 const complete=new Set(),pending=new Set();
 function visit(puzzleId){if(complete.has(puzzleId))return;if(pending.has(puzzleId))invalid('謎の前提が循環しています。順番を見直してください。');pending.add(puzzleId);for(const required of puzzleMap.get(puzzleId).requires)visit(required);pending.delete(puzzleId);complete.add(puzzleId);}
 for(const puzzle of puzzles)visit(puzzle.id);
 return {schemaVersion:1,title:text(raw.title,'ゲームのタイトル',120),characters,puzzles};
}

function sanitizeProgress(raw,content){
 const puzzles=new Map(content.puzzles.map(puzzle=>[puzzle.id,puzzle]));
 const solved=new Set(Array.isArray(raw?.solved)?raw.solved.filter(value=>typeof value==='string'&&puzzles.has(value)):[]);
 // Dependent solves never survive a missing prerequisite, even after import.
 let changed=true;while(changed){changed=false;for(const value of [...solved])if(puzzles.get(value).requires.some(required=>!solved.has(required))){solved.delete(value);changed=true;}}
 const attempts={};if(record(raw?.attempts))for(const puzzle of content.puzzles){const value=own(raw.attempts,puzzle.id)?raw.attempts[puzzle.id]:0;if(Number.isSafeInteger(value)&&value>=0)attempts[puzzle.id]=Math.min(value,1000000);}
 return {solved:[...solved],attempts};
}
const puzzleSignature=puzzle=>JSON.stringify([puzzle.question,puzzle.answers.map(normalizeAnswer).sort(),[...puzzle.requires].sort()]);

export function createGameState({content=GAME_CONTENT,zones,storage,key='tswg:content:v1'}={}){
 let current=validateContent(content,zones),progress={solved:[],attempts:{}},warning='',store=storage;
 const subscribers=new Set();
 if(store===undefined){try{store=globalThis.localStorage??null;}catch{store=null;warning='この環境では端末への保存が使えません。書き出しで保存してください。';}}
 const warn=message=>{warning=warning?warning+' '+message:message;};
 if(!store&&!warning)warn('この環境では端末への保存が使えません。書き出しで保存してください。');
 try{const saved=store?.getItem(key);if(saved!==null&&saved!==undefined)current=validateContent(JSON.parse(saved),zones);}catch{warn('保存された制作データを読み込めなかったため、初期状態で開きました。');}
 try{const saved=store?.getItem(key+':progress');if(saved!==null&&saved!==undefined){const parsed=JSON.parse(saved);if(!record(parsed)||!Array.isArray(parsed.solved)||!record(parsed.attempts))throw new Error('Invalid progress');progress=sanitizeProgress(parsed,current);}}catch{warn('保存された進行状況を読み込めなかったため、進行を初期状態にしました。');}
 function emit(){const snapshot={content:clone(current),progress:clone(progress),warning};for(const fn of [...subscribers])fn(snapshot);}
 function persist(includeContent=false){
  if(!store){if(!warning.includes('保存が使えません'))warn('この環境では端末への保存が使えません。書き出しで保存してください。');return;}
  try{if(includeContent)store.setItem(key,JSON.stringify(current));store.setItem(key+':progress',JSON.stringify(progress));}
  catch{if(!warning.includes('保存できませんでした'))warn('端末に保存できませんでした。書き出しで制作データを保存してください。');}
 }
 function replaceContent(raw){
  const next=validateContent(raw,zones),old=new Map(current.puzzles.map(puzzle=>[puzzle.id,puzzle]));
  const retained=new Set(next.puzzles.filter(puzzle=>old.has(puzzle.id)&&puzzleSignature(old.get(puzzle.id))===puzzleSignature(puzzle)).map(puzzle=>puzzle.id));
  const kept={solved:progress.solved.filter(value=>retained.has(value)),attempts:Object.fromEntries(Object.entries(progress.attempts).filter(([value])=>retained.has(value)))};
  current=next;progress=sanitizeProgress(kept,current);persist(true);emit();return clone(current);
 }
 function upsert(kind,value){const draft=clone(current),index=draft[kind].findIndex(item=>item.id===value?.id);if(index<0)draft[kind].push(value);else draft[kind][index]=value;replaceContent(draft);return clone(current[kind].find(item=>item.id===value.id));}
 function removeCharacter(characterId){if(!current.characters.some(character=>character.id===characterId))return false;const draft=clone(current);draft.characters=draft.characters.filter(character=>character.id!==characterId);replaceContent(draft);return true;}
 function removePuzzle(puzzleId){if(!current.puzzles.some(puzzle=>puzzle.id===puzzleId))return false;const draft=clone(current);draft.puzzles=draft.puzzles.filter(puzzle=>puzzle.id!==puzzleId).map(puzzle=>({...puzzle,requires:puzzle.requires.filter(value=>value!==puzzleId)}));draft.characters=draft.characters.map(character=>character.puzzleId===puzzleId?{...character,puzzleId:null}:character);replaceContent(draft);return true;}
 function canPlayPuzzle(puzzleId){const puzzle=current.puzzles.find(value=>value.id===puzzleId);return !!puzzle&&puzzle.requires.every(required=>progress.solved.includes(required));}
 function answerPuzzle(puzzleId,input){
  const puzzle=current.puzzles.find(value=>value.id===puzzleId);
  if(!puzzle)return {correct:false,locked:true,alreadySolved:false,message:'この謎が見つかりません。'};
  if(progress.solved.includes(puzzleId))return {correct:true,locked:false,alreadySolved:true,message:puzzle.successText||'この謎は解決済みです。'};
  if(!canPlayPuzzle(puzzleId))return {correct:false,locked:true,alreadySolved:false,message:'先に必要な謎を解いてください。'};
  const answer=normalizeAnswer(input),correct=!!answer&&puzzle.answers.some(value=>normalizeAnswer(value)===answer);
  progress.attempts[puzzleId]=(progress.attempts[puzzleId]??0)+1;
  if(correct)progress.solved.push(puzzleId);persist();emit();
  return {correct,locked:false,alreadySolved:false,message:correct?(puzzle.successText||'正解です。'): 'まだ正解ではありません。もう一度考えてみましょう。'};
 }
 return {get content(){return clone(current);},get progress(){return clone(progress);},get warning(){return warning;},replaceContent,upsertCharacter:value=>upsert('characters',value),removeCharacter,upsertPuzzle:value=>upsert('puzzles',value),removePuzzle,canPlayPuzzle,answerPuzzle,resetProgress(){progress={solved:[],attempts:{}};persist();emit();},subscribe(fn){if(typeof fn!=='function')throw new TypeError('変更の通知先が必要です。');subscribers.add(fn);return ()=>subscribers.delete(fn);}};
}
