import test from 'node:test';
import assert from 'node:assert/strict';
import {LANDMARKS} from '../dist/landmarks.js';
import {FLOOR_ZONES,buildingRoute} from '../dist/floor-layout.js';
import {CLUES,farewellEnding} from './fixtures/series-canon.mjs';
import {EPISODE,SPOTS,PUZZLES,REVEAL,ENDING,initialProgress,sanitizeProgress,targetSpot,nearSpot,applyAction} from '../dist/game/promise-state.js';

const saved=(stage,extra={})=>({...initialProgress(),stage,...extra});
const legacy=(stage,extra={})=>({version:1,stage,invited:false,reunited:false,revealed:false,...extra});
const reading=(scene='reveal',sceneLine=0)=>saved(5,{invited:true,reunited:true,revealed:true,scene,sceneLine});
const finished=()=>saved(5,{invited:true,reunited:true,revealed:true,finished:true});
const at=index=>({x:SPOTS[index].x,z:SPOTS[index].z,floor:SPOTS[index].floor});
const solve=(stage,answer=PUZZLES[stage].answer,position=at(stage))=>applyAction(saved(stage),{type:'solve',answer},position);

test('the fourth story visits existing model landmarks without implying modern SQUARE ZERO existed in the old diary',()=>{
  assert.equal(EPISODE.title,'あの日の約束を、もう一度');
  assert.deepEqual(SPOTS.map(spot=>spot.id),['silver-bell','driving-wheels','station-postbox','square-zero','silver-bell','silver-bell']);
  assert.deepEqual(PUZZLES.map(puzzle=>puzzle.kind),['choice','order','text','choice','text']);
  for(const spot of SPOTS){
    const landmark=LANDMARKS.find(item=>item.id===spot.id),zone=FLOOR_ZONES.find(item=>item.id===spot.zoneId);
    for(const key of ['title','floor','x','z','modelX','modelZ'])assert.equal(spot[key],landmark[key]);
    assert.equal(spot.zoneId,zone.id);
  }
  for(let index=1;index<SPOTS.length-1;index++)assert.ok(buildingRoute(SPOTS[index-1],SPOTS[index]).length);
  assert.match(PUZZLES[3].message,/今日はここで一息/);
  assert.match(PUZZLES[3].message,/今日の休憩場所/);
  assert.ok(EPISODE.opening.some(line=>line.includes('写真を撮ってくれた人とは別')));
  assert.ok(EPISODE.opening.some(line=>line.includes('連絡先')));
  for(const puzzle of PUZZLES){
    for(const key of ['id','title','kind','message','question','successText','reflection','discovery'])assert.ok(puzzle[key]);
    assert.equal(puzzle.hints.length,3);
    assert.ok(puzzle.evidence.length>=2);
    assert.ok(Object.isFrozen(puzzle));assert.ok(Object.isFrozen(puzzle.evidence));
    for(const entry of puzzle.evidence)assert.ok(entry.label&&entry.text);
  }
});

test('visible records determine the interleaved reply, chronology and meeting time',()=>{
  assert.deepEqual(PUZZLES[1].answer,['guide-child','friend-waits','friend-searches','grandma-returns']);
  assert.match(PUZZLES[1].evidence[0].text,/14時40分/);
  assert.match(PUZZLES[1].evidence[0].text,/15時10分/);
  assert.match(PUZZLES[1].evidence[1].text,/15時00分/);
  assert.match(PUZZLES[1].evidence[1].text,/15時05分/);
  const grandma=[...PUZZLES[2].evidence[0].text.replace(/\s/gu,'')],friend=[...PUZZLES[2].evidence[1].text.replace(/\s/gu,'')];
  assert.equal(grandma.map((letter,index)=>letter+(friend[index]??'')).join(''),'またあおう');
  assert.equal(solve(2,'またあおう').correct,true);
  const timeText=PUZZLES[4].evidence[1].text;
  const [,hour,minute]=timeText.match(/(\d+)時(\d+)分/);
  const durations=[...timeText.matchAll(/(\d+)分(?:休憩|歩いて)/g)].map(match=>Number(match[1]));
  assert.equal(durations.length,2);
  assert.equal(Number(hour)*60+Number(minute)+durations.reduce((sum,value)=>sum+value,0),15*60);
  for(const index of [0,3]){
    const correct=PUZZLES[index].options.filter(option=>solve(index,option.id).correct);
    assert.equal(correct.length,1);assert.equal(correct[0].id,PUZZLES[index].answer);
  }
});

test('the whole story survives saving after each puzzle and each separate final event',()=>{
  let progress=initialProgress();
  for(let stage=0;stage<PUZZLES.length;stage++){
    assert.equal(targetSpot(progress),SPOTS[stage]);
    const before=structuredClone(progress),result=applyAction(progress,{type:'solve',answer:PUZZLES[stage].answer},at(stage));
    assert.equal(result.correct,true,result.message);assert.deepEqual(progress,before);
    progress=sanitizeProgress(JSON.parse(JSON.stringify(result.progress)));
    assert.deepEqual(progress,saved(stage+1));
  }
  const flags={};
  for(const [type,key] of [['invite','invited'],['reunite','reunited'],['reveal','revealed']]){
    const before=structuredClone(progress),result=applyAction(progress,{type},at(5));
    assert.equal(result.correct,true,result.message);assert.deepEqual(progress,before);
    flags[key]=true;if(type==='reveal')flags.scene='reveal';progress=sanitizeProgress(JSON.parse(JSON.stringify(result.progress)));
    assert.deepEqual(progress,saved(5,flags));
    const duplicate=applyAction(progress,{type},null);
    assert.equal(duplicate.correct,true);assert.equal(duplicate.alreadyApplied,true);assert.deepEqual(duplicate.progress,progress);
  }
});

test('every puzzle and new ending event requires its own actual floor and location',()=>{
  const cases=PUZZLES.map((puzzle,stage)=>({progress:saved(stage),action:{type:'solve',answer:puzzle.answer},stage}));
  cases.push({progress:saved(5),action:{type:'invite'},stage:5},{progress:saved(5,{invited:true}),action:{type:'reunite'},stage:5},{progress:saved(5,{invited:true,reunited:true}),action:{type:'reveal'},stage:5});
  for(const {progress,action,stage} of cases){
    const position=at(stage);
    for(const invalid of [null,{},[],{...position,floor:position.floor==='1F'?'B1F':'1F'},{...position,x:position.x+10.001},{...position,x:NaN},{...position,z:Infinity},{...position,x:String(position.x)}]){
      const result=applyAction(progress,action,invalid);
      assert.equal(result.correct,false);assert.deepEqual(result.progress,progress);
    }
    assert.equal(applyAction(progress,action,{...position,x:position.x+10}).correct,true);
  }
  for(const radius of [-1,NaN,Infinity,'10'])assert.equal(nearSpot(at(0),SPOTS[0],radius),false);
});

test('wrong choices, incomplete chronology and one-part meeting answers cannot advance',()=>{
  for(let stage=0;stage<PUZZLES.length;stage++)for(const answer of [null,undefined,{},17,'',[],['wrong'],'手紙','15時','銀の鈴']){
    const result=applyAction(saved(stage),{type:'solve',answer},at(stage));
    assert.equal(result.correct,false);assert.deepEqual(result.progress,saved(stage));
  }
  const order=PUZZLES[1].answer;
  for(const answer of [[...order].reverse(),order.slice(1),[...order,order[0]],[order[0],order[0],...order.slice(2)],new Array(4)])assert.equal(solve(1,answer).correct,false);
  for(const answer of ['銀の鈴で14時45分','銀の鈴で15時15分','銀の鈴で3時','動輪の広場で15時','SQUARE ZEROで15時','15時にポスト'])assert.equal(solve(4,answer).correct,false);
  for(const stage of [0,3])for(const option of PUZZLES[stage].options)assert.equal(solve(stage,option.id).correct,option.id===PUZZLES[stage].answer);
  assert.equal(applyAction(saved(5),{type:'solve',answer:'銀の鈴で15時'},at(5)).correct,false);
});

test('Japanese scripts, full width numerals and supported clock notation remain usable',()=>{
  for(const answer of ['また会おう','またあおう','マタアオウ','ﾏﾀｱｵｳ','また　会おう。'])assert.equal(solve(2,answer).correct,true,answer);
  for(const answer of ['銀の鈴で15時','ぎんのすずで15じ','ギンノスズデ１５ジ','銀の鈴 １５：００','銀の鈴、15時。','銀の鈴で午後3時','15時に銀の鈴','ぎんのすずでごご３じ'])assert.equal(solve(4,answer).correct,true,answer);
});

test('meeting answers accept equivalent Japanese place and clock spellings without changing their meaning',()=>{
  for(const answer of [
    '銀の鈴で午後三時','銀の鈴で十五時','ぎんのすずでごごさんじ','ぎんのすずでじゅうごじ',
    '銀のすずで15時','ぎんの鈴で午後3時','銀ノスズデ午後三時','銀の鈴で15時0分',
    '銀の鈴で十五時零分','ぎんのすずでごごさんじぜろふん','じゅうごじに銀のすず',
    '午後三時にぎんの鈴','銀の鈴で午後３：００','銀の鈴で１５：００。',
  ])assert.equal(solve(4,answer).correct,true,answer);
  for(const answer of [
    '銀の鈴で午後四時','銀の鈴で十三時','銀の鈴でじゅうよじ','ぎんのすずでごごさんじじゅうごふん',
    '銀の鈴で午前三時','銀の鈴で三時','銀の鈴で午後十五時','銀の鈴で15時15分',
    '銀の鈴で1.5時','銀の鈴で1,5時','銀の鈴で15:0','銀の鈴で15:000','銀の鈴で15時00分0分',
    '動輪の広場で十五時','午後三時にポスト','銀の鈴で15時か16時','15時に銀の鈴かポスト',
  ]){
    const result=solve(4,answer);assert.equal(result.correct,false,answer);assert.deepEqual(result.progress,saved(4));
  }
});

test('invitation, reunion and sender reveal cannot be skipped or merged',()=>{
  for(let stage=0;stage<5;stage++)for(const type of ['invite','reunite','reveal']){
    const result=applyAction(saved(stage),{type},at(5));
    assert.equal(result.correct,false);assert.deepEqual(result.progress,saved(stage));
  }
  for(const [progress,type] of [[saved(5),'reunite'],[saved(5),'reveal'],[saved(5,{invited:true}),'reveal']]){
    const result=applyAction(progress,{type},at(5));
    assert.equal(result.correct,false);assert.deepEqual(result.progress,progress);
  }
  const invitation=applyAction(saved(5),{type:'invite'},at(5));
  assert.match(invitation.message,/電話/);assert.match(invitation.message,/澄子の返事/);
  assert.equal(invitation.progress.reunited,false);assert.equal(invitation.progress.revealed,false);
  const reunion=applyAction(invitation.progress,{type:'reunite'},at(5));
  assert.match(reunion.message,/今度は、会えた/);assert.equal(reunion.progress.revealed,false);
  assert.equal(JSON.stringify({EPISODE,PUZZLES}).includes('未来の駅を歩く、あなたへ。'),false);
  assert.ok(REVEAL.some(line=>line.text===CLUES[3].text.split('\n')[0]));
  const letterOpeningIndex=REVEAL.findIndex(line=>line.text===CLUES[3].text.split('\n')[0]);
  assert.equal(REVEAL[letterOpeningIndex+1].speaker,'','The letter connection is narrated for the player, without assuming Tsumugi was the anonymous first-story recipient');
  assert.ok(REVEAL.some(line=>line.speaker==='祖母'&&line.text.includes('あの手紙を書いたのは、私')));
  assert.ok(REVEAL.some(line=>line.text.includes('見知らぬ人')));
  const inherited=farewellEnding.find(line=>line.speaker==='紬'&&line.text.includes('銀の鈴')).text;
  assert.ok(ENDING.some(line=>line.speaker==='紬'&&line.text===inherited));
});

test('malformed saves reset, extras are stripped and later flags cannot exist without prerequisites',()=>{
  for(const value of [null,undefined,[],4,{},Object.create(initialProgress()),{...initialProgress(),version:3},{...initialProgress(),stage:-1},{...initialProgress(),stage:6},{...initialProgress(),stage:1.5},{...initialProgress(),stage:'5'},{...initialProgress(),invited:'true'}])assert.deepEqual(sanitizeProgress(value),initialProgress());
  for(let stage=0;stage<5;stage++)assert.deepEqual(sanitizeProgress(saved(stage,{invited:true,reunited:true,revealed:true})),saved(stage));
  assert.deepEqual(sanitizeProgress(saved(5,{reunited:true,revealed:true})),saved(5));
  assert.deepEqual(sanitizeProgress(saved(5,{invited:true,revealed:true})),saved(5,{invited:true}));
  assert.deepEqual(sanitizeProgress({...reading('ending',2),extra:'discard'}),reading('ending',2));
});

test('malformed actions and inherited answer fields never change the current page',()=>{
  for(const action of [null,undefined,[],{},'solve',{type:'__proto__'},{type:'constructor'},{type:'skip'},{type:'solve'},Object.create({type:'invite'}),Object.assign(Object.create({answer:'driving-wheels'}),{type:'solve'})]){
    const result=applyAction(initialProgress(),action,at(0));
    assert.equal(result.correct,false);assert.deepEqual(result.progress,initialProgress());
  }
});

test('every saved reveal and ending line resumes exactly, and completion waits for the last acknowledgement',()=>{
  let progress=applyAction(saved(5,{invited:true,reunited:true}),{type:'reveal'},at(5)).progress;
  const read=(type)=>{
    const before=structuredClone(progress),result=applyAction(progress,{type},null);
    assert.equal(result.correct,true,result.message);assert.deepEqual(progress,before,'Reading must not mutate the caller save');
    progress=sanitizeProgress(JSON.parse(JSON.stringify(result.progress)));
    return result;
  };
  for(const [scene,lines] of [['reveal',REVEAL],['ending',ENDING]]){
    for(let line=0;line<lines.length;line++){
      assert.deepEqual(progress,reading(scene,line),`Reload resumes ${scene} line ${line}`);
      assert.equal(progress.finished,false);
      if(line>0){read('previous-scene');assert.deepEqual(progress,reading(scene,line-1));read('advance-scene');assert.deepEqual(progress,reading(scene,line));}
      else{const boundary=read('previous-scene');assert.equal(boundary.alreadyApplied,true);assert.deepEqual(progress,reading(scene,0));}
      read('advance-scene');
    }
  }
  assert.deepEqual(progress,finished());
  for(let duplicate=0;duplicate<3;duplicate++){
    const result=read('advance-scene');assert.equal(result.alreadyApplied,true);assert.deepEqual(progress,finished());
  }
});

test('reading can continue away from the landmark without unlocking it before the reunion',()=>{
  const beforeReveal=[...Array.from({length:5},(_,stage)=>saved(stage)),saved(5),saved(5,{invited:true}),saved(5,{invited:true,reunited:true})];
  for(const progress of beforeReveal)for(const type of ['advance-scene','previous-scene']){
    const result=applyAction(progress,{type},at(5));assert.equal(result.correct,false);assert.deepEqual(result.progress,progress);
  }
  for(const position of [null,{},at(2),{floor:'2F',x:1e6,z:-1e6}]){
    assert.deepEqual(applyAction(reading('reveal',1),{type:'advance-scene'},position).progress,reading('reveal',2));
    assert.deepEqual(applyAction(reading('ending',1),{type:'previous-scene'},position).progress,reading('ending',0));
  }
  const same=applyAction(reading('ending',0),{type:'previous-scene'},null);
  assert.equal(same.alreadyApplied,true);assert.deepEqual(same.progress,reading('ending',0));
});

test('a duplicate reveal action preserves an unfinished saved scene instead of restarting or finishing it',()=>{
  for(const progress of [reading('reveal',3),reading('ending',2),finished()]){
    const result=applyAction(progress,{type:'reveal'},null);
    assert.equal(result.correct,true);assert.equal(result.alreadyApplied,true);assert.deepEqual(result.progress,progress);
  }
});

test('legacy completed journals stay completed, and incomplete legacy puzzles and reunion flags survive',()=>{
  for(let stage=0;stage<5;stage++){
    assert.deepEqual(sanitizeProgress(legacy(stage)),saved(stage));
    assert.deepEqual(sanitizeProgress(legacy(stage,{invited:true,reunited:true,revealed:true})),saved(stage));
  }
  assert.deepEqual(sanitizeProgress(legacy(5)),saved(5));
  assert.deepEqual(sanitizeProgress(legacy(5,{invited:true})),saved(5,{invited:true}));
  assert.deepEqual(sanitizeProgress(legacy(5,{invited:true,reunited:true})),saved(5,{invited:true,reunited:true}));
  assert.deepEqual(sanitizeProgress(legacy(5,{invited:true,reunited:true,revealed:true})),finished());
  assert.deepEqual(sanitizeProgress(legacy(5,{revealed:true})),saved(5));
  assert.deepEqual(sanitizeProgress(legacy(5,{invited:true,revealed:true})),saved(5,{invited:true}));
  const migrated=sanitizeProgress(legacy(5,{invited:true,reunited:true,revealed:true}));
  assert.equal(applyAction(migrated,{type:'advance-scene'},null).alreadyApplied,true);
});

test('damaged or inherited reading fields recover the opening reveal rather than skipping unread dialogue',()=>{
  const base=reading(),invalid=[];
  for(const key of ['scene','sceneLine','finished']){const missing={...base};delete missing[key];invalid.push(missing);}
  for(const scene of [null,'','__proto__','constructor','other',0,{},[]])invalid.push({...base,scene});
  for(const scene of ['reveal','ending'])for(const sceneLine of [-1,NaN,Infinity,0.5,'2',null,{},REVEAL.length+ENDING.length])invalid.push({...base,scene,sceneLine});
  for(const value of [undefined,null,1,'true'])invalid.push({...base,finished:value});
  invalid.push({...base,finished:true},{...base,scene:'ending',sceneLine:2,finished:true},{...base,scene:null,sceneLine:1,finished:true});
  const inherited=Object.assign(Object.create({scene:'ending',sceneLine:4,finished:false}),{version:2,stage:5,invited:true,reunited:true,revealed:true});
  invalid.push(inherited);
  for(const value of invalid)assert.deepEqual(sanitizeProgress(value),reading());
  for(const [scene,lines] of [['reveal',REVEAL],['ending',ENDING]]){
    assert.deepEqual(sanitizeProgress(reading(scene,0)),reading(scene,0));
    assert.deepEqual(sanitizeProgress(reading(scene,lines.length-1)),reading(scene,lines.length-1));
    assert.deepEqual(sanitizeProgress(reading(scene,lines.length)),reading());
  }
  assert.deepEqual(sanitizeProgress(finished()),finished());
});

test('reading and completion fields cannot bypass puzzle, invitation or reunion prerequisites',()=>{
  for(let stage=0;stage<5;stage++)assert.deepEqual(sanitizeProgress(saved(stage,{invited:true,reunited:true,revealed:true,scene:'ending',sceneLine:3,finished:true})),saved(stage));
  assert.deepEqual(sanitizeProgress(saved(5,{revealed:true,scene:'ending',sceneLine:3,finished:true})),saved(5));
  assert.deepEqual(sanitizeProgress(saved(5,{invited:true,revealed:true,scene:'ending',sceneLine:3,finished:true})),saved(5,{invited:true}));
  const extraPayload={type:'advance-scene',scene:'ending',sceneLine:ENDING.length-1,finished:true};
  assert.deepEqual(applyAction(reading('reveal',0),extraPayload,null).progress,reading('reveal',1));
  const inheritedAction=Object.create({type:'advance-scene'});
  assert.equal(applyAction(reading(),inheritedAction,null).correct,false);
});

test('solved memories state each behavior reason and explain why old letters did not settle the missed meeting',()=>{
  assert.equal(new Set(PUZZLES.map(puzzle=>puzzle.discovery)).size,PUZZLES.length);
  assert.ok(PUZZLES.every(puzzle=>puzzle.discovery.includes('から')));
  assert.match(PUZZLES[2].message,/近況ばかり/);
  assert.match(PUZZLES[2].message,/会えなかった日のことには触れられなかった/);
  assert.match(PUZZLES[0].evidence[0].text,/円の内側/);
});
