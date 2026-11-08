import test from 'node:test';
import assert from 'node:assert/strict';
import {LANDMARKS} from '../dist/landmarks.js';
import {FLOOR_ZONES,buildingRoute} from '../dist/floor-layout.js';
import {TRAIN_SERVICES} from '../dist/train-data.js';
import {EPISODE,SPOTS,PUZZLES,ENDING,initialProgress,sanitizeProgress,targetSpot,nearSpot,applyAction} from '../dist/game/farewell-state.js';

const at=index=>({x:SPOTS[index].x,z:SPOTS[index].z,floor:SPOTS[index].floor});
const saved=(stage,extra={})=>({...initialProgress(),stage,...extra});
const answers=['動輪の広場','ぽすと','しんかんせん','すくえあぜろ','ぎんのすず'];
const answer=(stage,text=answers[stage],position=stage===0?null:at(stage-1))=>applyAction(saved(stage),{type:'answer',answer:text},position);

test('the farewell episode uses existing landmark positions and keeps the promised ending verbatim',()=>{
  assert.equal(EPISODE.title,'さよならを言わない待ち合わせ');
  assert.equal(PUZZLES.length,5);
  assert.deepEqual(SPOTS.map(spot=>spot.id),['driving-wheels','station-postbox','platform-tokaido-1415','square-zero','silver-bell']);
  for(const spot of SPOTS){
    if(spot.id==='platform-tokaido-1415'){
      const zone=FLOOR_ZONES.find(item=>item.id===spot.zoneId),train=TRAIN_SERVICES.find(item=>item.zoneId===spot.zoneId);
      assert.equal(spot.title,zone.title);assert.equal(spot.floor,zone.floor);assert.equal(spot.x,train.viewX);assert.equal(spot.z,train.viewZ);
    }else{
      const landmark=LANDMARKS.find(item=>item.id===spot.zoneId);
      for(const key of ['title','floor','x','z','modelX','modelZ'])assert.equal(spot[key],landmark[key]);
    }
  }
  for(const puzzle of PUZZLES){
    for(const key of ['title','message','question','successText','tsumugi','haru'])assert.ok(puzzle[key]);
    assert.equal(puzzle.hints.length,3);
  }
  assert.ok(ENDING.some(line=>line.speaker==='紬'&&line.text==='寂しいよ。でも、帰ってきたら一番に連絡して'));
  assert.deepEqual(ENDING.slice(-2),[
    {speaker:'紬',text:'いつかまた、銀の鈴の下で。'},
    {speaker:'晴',text:'その言い方、おばあちゃんそっくり'},
  ]);
});

test('each supplied puzzle derives exactly one intended answer from its visible rule',()=>{
  const wheels=3;
  assert.equal(PUZZLES[1].lines.map(line=>[...line][wheels-1]).join(''),'ぽすと');
  assert.equal(PUZZLES[2].lines.map(line=>[...line].slice(-2).join('')).join(''),'しんかんせん');
  assert.equal(PUZZLES[3].lines.map(line=>[...line][0]).join(''),'すくえあぜろ');
  const letters=PUZZLES[4].grid.flat(),removed=[...'さよなら'];
  for(const letter of removed)assert.equal(letters.filter(value=>value===letter).length,1,'Each letter to delete must appear once');
  assert.equal(letters.filter(letter=>!removed.includes(letter)).join(''),'ぎんのすず');
  assert.equal(PUZZLES[0].options.filter(option=>answer(0,option.id).correct).length,1);
});

test('the entire route supports saving after every step, meeting and the final photograph',()=>{
  let progress=initialProgress();
  for(let stage=0;stage<PUZZLES.length;stage++){
    const before=structuredClone(progress),result=applyAction(progress,{type:'answer',answer:answers[stage]},stage===0?null:at(stage-1));
    assert.equal(result.correct,true);assert.deepEqual(progress,before,'Caller state must not be mutated');
    progress=sanitizeProgress(JSON.parse(JSON.stringify(result.progress)));
    assert.deepEqual(progress,saved(stage+1));
  }
  const result=applyAction(progress,{type:'meet'},at(4));
  assert.equal(result.correct,true);
  assert.deepEqual(progress,saved(5));
  assert.deepEqual(sanitizeProgress(JSON.parse(JSON.stringify(result.progress))),saved(5,{met:true}));
  const replay=applyAction(result.progress,{type:'meet'},null);
  assert.equal(replay.correct,true);assert.equal(replay.alreadyApplied,true);assert.deepEqual(replay.progress,result.progress);
  const photo=applyAction(result.progress,{type:'photograph'},at(4));
  assert.equal(photo.correct,true);
  assert.deepEqual(result.progress,saved(5,{met:true}),'Taking the portrait must not mutate caller progress');
  assert.deepEqual(sanitizeProgress(JSON.parse(JSON.stringify(photo.progress))),saved(5,{met:true,photographed:true}));
  const photoReplay=applyAction(photo.progress,{type:'photograph'},null);
  assert.equal(photoReplay.correct,true);assert.equal(photoReplay.alreadyApplied,true);assert.deepEqual(photoReplay.progress,photo.progress);
});

test('a photo answer is remote, but all later puzzles and the meeting require their own floor and proximity',()=>{
  assert.equal(answer(0,answers[0],null).correct,true);
  assert.equal(answer(0,answers[0],{x:1e6,z:1e6,floor:'2F'}).correct,true);
  for(let stage=1;stage<=PUZZLES.length;stage++){
    const position=at(stage-1),action=stage===PUZZLES.length?{type:'meet'}:{type:'answer',answer:answers[stage]};
    for(const bad of [null,{...position,floor:position.floor==='1F'?'B1F':'1F'},{...position,x:position.x+10.01},{...position,x:NaN},{...position,z:Infinity},{...position,x:String(position.x)}]){
      const result=applyAction(saved(stage),action,bad);
      assert.equal(result.correct,false);assert.deepEqual(result.progress,saved(stage));
    }
    const edge=SPOTS[stage-1].region?{...position,x:SPOTS[stage-1].region.maxX}:{...position,x:position.x+10};
    assert.equal(applyAction(saved(stage),action,edge).correct,true);
  }
  assert.equal(nearSpot(at(0),SPOTS[0],-1),false);
  assert.equal(nearSpot(at(0),SPOTS[0],NaN),false);
});

test('known later destinations and a premature meeting cannot skip puzzles',()=>{
  for(let stage=0;stage<PUZZLES.length;stage++){
    for(let later=stage+1;later<PUZZLES.length;later++){
      const result=answer(stage,answers[later]);
      assert.equal(result.correct,false);assert.deepEqual(result.progress,saved(stage));
    }
    assert.equal(applyAction(saved(stage),{type:'meet'},at(4)).correct,false);
  }
  assert.equal(applyAction(saved(5),{type:'answer',answer:'ぎんのすず'},at(3)).correct,false);
});

test('common Japanese, kana, full width and English answers work without accepting different destinations',()=>{
  const variants=[
    ['動輪','どうりんのひろば','ＤＲＩＶＩＮＧ　ＷＨＥＥＬＳ','driving-wheels'],
    ['ポスト','ぽすと','ﾎﾟｽﾄ','駅舎型ポスト','POSTBOX','station-postbox'],
    ['新幹線','シンカンセン','しんかんせん','SHINKANSEN','platform-tokaido-1415'],
    ['SQUARE ZERO','ＳＱＵＡＲＥ　ＺＥＲＯ','ｽｸｴｱｾﾞﾛ','すくえあぜろ','スクウェアゼロ','square-zero'],
    ['銀の鈴','ぎんのすず','ギンノスズ',' SILVER BELL ','silver-bell'],
  ];
  for(let stage=0;stage<PUZZLES.length;stage++)for(const value of variants[stage])assert.equal(answer(stage,value).correct,true,value);
  for(let stage=0;stage<PUZZLES.length;stage++)for(const value of ['',null,3,[],{},'wrong','寂しいよ']){
    const result=answer(stage,value);
    assert.equal(result.correct,false);assert.deepEqual(result.progress,saved(stage));
  }
});

test('old saves migrate past the inserted platform puzzle without losing a completed ending',()=>{
  const stages=[0,1,2,4,5];
  for(let old=0;old<=4;old++){
    assert.deepEqual(sanitizeProgress({version:1,stage:old,met:false}),saved(stages[old]));
    assert.deepEqual(sanitizeProgress({version:1,stage:old,met:true}),saved(stages[old],{met:old===4,photographed:old===4,endingLine:old===4?ENDING.length-1:0,endingRead:old===4}));
  }
  assert.deepEqual(sanitizeProgress({version:1,stage:4,met:true,untrusted:'ignored'}),saved(5,{met:true,photographed:true,endingLine:ENDING.length-1,endingRead:true}));
  for(let stage=0;stage<=PUZZLES.length;stage++){
    assert.equal(targetSpot(saved(stage)).id,SPOTS[Math.max(0,stage-1)].id);
    assert.deepEqual(sanitizeProgress({version:2,stage,met:false}),saved(stage));
    assert.deepEqual(sanitizeProgress({version:2,stage,met:true}),saved(stage,{met:stage===PUZZLES.length,photographed:stage===PUZZLES.length,endingLine:stage===PUZZLES.length?ENDING.length-1:0,endingRead:stage===PUZZLES.length}));
  }
});

test('malformed saved data cannot unlock a meeting or leak the first episode progress',()=>{
  for(const value of [null,undefined,[],3,{}, {stage:4,met:true},{version:3,stage:4,met:true},{version:1,stage:5,met:true},{version:2,stage:6,met:true},{version:1,stage:-1,met:false},{version:1,stage:2.5,met:false},{version:1,stage:'4',met:true},{version:1,stage:4,met:'true'},{version:1,stage:3,delivered:true}])assert.deepEqual(sanitizeProgress(value),initialProgress());
  for(let stage=0;stage<PUZZLES.length;stage++)assert.deepEqual(sanitizeProgress({version:2,stage,met:true}),saved(stage));
});

test('the platform accepts both the walking destination and photo spawn on its own floor',()=>{
  const platform=SPOTS[2],zone=FLOOR_ZONES.find(item=>item.id===platform.zoneId);
  assert.equal(nearSpot(platform,platform),true);
  assert.equal(nearSpot(zone,platform),true);
  assert.equal(nearSpot({...zone,z:40.6},platform),true);
  assert.equal(nearSpot({...zone,x:67},platform),false,'Adjacent Shinkansen platform is not this one');
  assert.equal(nearSpot({...zone,floor:'M2F'},platform),false);
  const route=buildingRoute(SPOTS[1],platform);
  assert.ok(route.length>0);
  assert.ok(route.some(step=>step.floor==='M2F'),'Walking to Shinkansen crosses the intermediate floor');
  assert.ok(route.some(step=>step.floor==='2F'));
  assert.equal(applyAction(saved(3),{type:'answer',answer:'SQUARE ZERO'},zone).correct,true);
});

test('malformed actions leave the episode unchanged',()=>{
  for(const action of [null,undefined,[],{},'answer',{type:'__proto__'},{type:'constructor'},{type:'skip'},{type:'answer'},Object.create({type:'meet'})]){
    const progress=saved(2),result=applyAction(progress,action,at(1));
    assert.equal(result.correct,false);assert.deepEqual(result.progress,progress);
  }
});


test('new portraits require the meeting and the silver bell, while meeting alone stays resumable',()=>{
  for(let stage=0;stage<=PUZZLES.length;stage++){
    const progress=saved(stage),result=applyAction(progress,{type:'photograph'},at(4));
    assert.equal(result.correct,false);assert.deepEqual(result.progress,progress);
  }
  const met=saved(5,{met:true});
  assert.deepEqual(sanitizeProgress(JSON.parse(JSON.stringify(met))),met,'Saving between meeting and photograph must retain the unfinished portrait');
  for(const position of [null,{...at(4),floor:'1F'},{...at(4),x:SPOTS[4].x+10.01},{...at(4),z:NaN}]){
    const result=applyAction(met,{type:'photograph'},position);
    assert.equal(result.correct,false);assert.deepEqual(result.progress,met);
  }
  assert.equal(applyAction(met,{type:'photograph'},{...at(4),x:SPOTS[4].x+10}).correct,true);
});

test('version three requires its photograph flag and normalizes impossible completion combinations',()=>{
  for(const value of [
    {version:3,stage:5,met:true},
    {version:3,stage:5,met:true,photographed:'true'},
    {version:3,stage:5,met:true,photographed:1},
    Object.assign(Object.create({photographed:true}),{version:3,stage:5,met:true}),
  ])assert.deepEqual(sanitizeProgress(value),initialProgress());
  for(let stage=0;stage<PUZZLES.length;stage++)assert.deepEqual(sanitizeProgress(saved(stage,{met:true,photographed:true})),saved(stage));
  assert.deepEqual(sanitizeProgress(saved(5,{photographed:true})),saved(5));
  assert.deepEqual(sanitizeProgress(saved(5,{met:true,photographed:false})),saved(5,{met:true}));
  assert.deepEqual(sanitizeProgress(saved(5,{met:true,photographed:true})),saved(5,{met:true,photographed:true}));
});

test('a new farewell conversation resumes its exact line after every saved step without resetting completion on replay',()=>{
  let progress=saved(5,{met:true});
  for(let line=1;line<ENDING.length;line++){
    const before=structuredClone(progress),result=applyAction(progress,{type:'read-ending',line},null);
    assert.equal(result.correct,true);assert.deepEqual(progress,before);
    progress=sanitizeProgress(JSON.parse(JSON.stringify(result.progress)));
    assert.equal(progress.endingLine,line);assert.equal(progress.endingRead,line===ENDING.length-1);
  }
  const photographed=applyAction(progress,{type:'photograph'},at(4)).progress;
  for(const line of [0,1,ENDING.length-1]){
    const replay=applyAction(photographed,{type:'read-ending',line},null);
    assert.equal(replay.correct,true);assert.equal(replay.alreadyApplied,true);assert.deepEqual(replay.progress,photographed);
  }
});

test('farewell dialogue cursors reject skipped and malformed positions while backwards reading remains resumable',()=>{
  const current=saved(5,{met:true,endingLine:2});
  const back=applyAction(current,{type:'read-ending',line:1});
  assert.equal(back.correct,true);assert.equal(sanitizeProgress(back.progress).endingLine,1);
  for(const line of [-1,ENDING.length,1.5,NaN,'3',5])assert.equal(applyAction(current,{type:'read-ending',line}).correct,false);
  assert.equal(applyAction(saved(5),{type:'read-ending',line:1}).correct,false);
  const inherited=Object.assign(Object.create({line:3}),{type:'read-ending'});
  assert.equal(applyAction(current,inherited).correct,false);
  for(const value of [{...current,endingLine:undefined},{...current,endingLine:ENDING.length},{...current,endingRead:'true'}])assert.deepEqual(sanitizeProgress(value),initialProgress());
  assert.deepEqual(sanitizeProgress(saved(3,{endingLine:2,endingRead:true})),saved(3));
});

test('previous completed farewell saves remain complete and unfinished conversations start at their first line',()=>{
  for(const version of [1,2,3]){
    const stage=version===1?4:5;
    const old={version,stage,met:true,...(version===3?{photographed:true}:{})};
    assert.deepEqual(sanitizeProgress(old),saved(5,{met:true,photographed:true,endingLine:ENDING.length-1,endingRead:true}));
  }
  assert.deepEqual(sanitizeProgress({version:3,stage:5,met:true,photographed:false}),saved(5,{met:true}));
});
