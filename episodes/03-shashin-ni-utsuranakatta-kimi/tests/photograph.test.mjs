import test from 'node:test';
import assert from 'node:assert/strict';
import {LANDMARKS} from '../dist/landmarks.js';
import {FLOOR_AREAS,FLOOR_ZONES,buildingRoute} from '../dist/floor-layout.js';
import {TRAIN_SERVICES} from '../dist/train-data.js';
import {EPISODE,SPOTS,PUZZLES,ENDING,initialProgress,sanitizeProgress,targetSpot,nearSpot,applyAction} from '../dist/game/photograph-state.js';

const LAST=5;
const at=index=>({x:SPOTS[index].x,z:SPOTS[index].z,floor:SPOTS[index].floor});
const saved=(stage,extra={})=>({...initialProgress(),stage,...extra});
const legacy=(stage,extra={})=>({version:1,stage,located:false,handed:false,photographed:false,sent:false,...extra});
const zones=new Map(FLOOR_ZONES.map(zone=>[zone.id,zone]));

test('five photo puzzles use existing model subjects and preserve the last photograph story',()=>{
  assert.equal(EPISODE.title,'写真に写らなかった君');
  assert.equal(EPISODE.duration,'30〜40分');
  assert.equal(PUZZLES.length,5);
  assert.deepEqual(SPOTS.map(spot=>spot.id),['keiyo-platform-12','station-postbox','driving-wheels','sobu-platform-12','square-zero','silver-bell']);
  for(const spot of SPOTS){
    const zone=zones.get(spot.zoneId);
    for(const key of ['title','floor','x','z'])assert.equal(spot[key],zone[key]);
    if(spot.kind==='platform'){
      const area=FLOOR_AREAS[spot.floor].find(region=>spot.x>=region.minX&&spot.x<=region.maxX&&spot.z>=region.minZ&&spot.z<=region.maxZ);
      assert.deepEqual(spot.region,area);
      assert.ok(TRAIN_SERVICES.some(service=>service.zoneId===spot.zoneId));
    }else{
      const landmark=LANDMARKS.find(item=>item.id===spot.zoneId);
      for(const key of ['modelX','modelZ'])assert.equal(spot[key],landmark[key]);
    }
  }
  assert.deepEqual(PUZZLES.map(puzzle=>puzzle.correctView),['left','center','left','right','right']);
  for(const [index,puzzle] of PUZZLES.entries()){
    assert.equal(puzzle.spotId,SPOTS[index].id);
    for(const key of ['id','title','message','question','photoDescription','successText','reflection'])assert.ok(puzzle[key]);
    assert.equal(puzzle.hints.length,3);
    assert.ok(Object.isFrozen(puzzle));assert.ok(Object.isFrozen(puzzle.hints));
  }
  assert.ok(ENDING.some(line=>line.text.includes('一緒に写ってる写真')));
  assert.ok(ENDING.some(line=>line.speaker==='便り'&&line.text.includes('今の俺')));
  assert.equal(JSON.stringify({EPISODE,PUZZLES,ENDING}).includes('年配'),false,'The background woman never becomes dialogue or a clue');
});

test('the expanded route reaches six floors through real connectors and walks the Keiyo passage once',()=>{
  const visitedFloors=new Set([SPOTS[0].floor]);let passageTransfers=0;
  for(let index=1;index<SPOTS.length;index++){
    const from=SPOTS[index-1],to=SPOTS[index];
    const route=buildingRoute(from,to);
    assert.ok(route.length,`${from.id} must connect to ${to.id}`);
    for(const step of route){visitedFloors.add(step.floor);if(step.connectorId==='keiyo-entrance')passageTransfers++;}
    if(index===1)assert.deepEqual([from.floor,...route.filter(step=>step.kind==='transfer').map(step=>step.floor)],['B4F','B3F','B2F','B1F','1F']);
    if(to.id==='sobu-platform-12'){
      assert.deepEqual([from.floor,...route.filter(step=>step.kind==='transfer').map(step=>step.floor)],['B1F','B4F','B5F']);
      assert.ok(!route.some(step=>step.floor==='B2F'||step.floor==='B3F'));
    }
  }
  assert.deepEqual([...visitedFloors].sort(),['1F','B1F','B2F','B3F','B4F','B5F']);
  assert.equal(passageTransfers,1,'The long Keiyo connector is not an out-and-back detour');
});

test('the whole expanded route survives saving after every action and does not mutate progress',()=>{
  let progress=initialProgress();
  const run=(action,position)=>{
    const before=structuredClone(progress),result=applyAction(progress,action,position);
    assert.equal(result.correct,true,result.message);
    assert.deepEqual(progress,before);
    progress=sanitizeProgress(JSON.parse(JSON.stringify(result.progress)));
  };
  for(let stage=0;stage<LAST;stage++){
    assert.equal(targetSpot(progress).id,SPOTS[stage].id);
    run({type:'locate',answer:SPOTS[stage].id},null);
    assert.deepEqual(progress,saved(stage,{located:true}));
    const service=TRAIN_SERVICES.find(service=>service.zoneId===SPOTS[stage].zoneId);
    const position=service?{floor:service.floor,x:service.viewX,z:service.viewZ}:at(stage);
    run({type:'frame',view:PUZZLES[stage].correctView},position);
    assert.deepEqual(progress,saved(stage+1));
  }
  run({type:'hand-camera'},at(LAST));
  assert.deepEqual(progress,saved(LAST,{handed:true}));
  run({type:'photograph'},at(LAST));
  assert.deepEqual(progress,saved(LAST,{handed:true,photographed:true}));
  run({type:'send'},at(LAST));
  assert.deepEqual(progress,saved(LAST,{handed:true,photographed:true,sent:true}));
  for(const type of ['hand-camera','photograph','send']){
    const replay=applyAction(progress,{type},null);
    assert.equal(replay.correct,true);assert.equal(replay.alreadyApplied,true);assert.deepEqual(replay.progress,progress);
  }
});

test('each location is remote-answerable, but exactly one place and one view solves each photo',()=>{
  for(let stage=0;stage<LAST;stage++){
    const progress=saved(stage);
    for(const candidate of SPOTS){
      const result=applyAction(progress,{type:'locate',answer:candidate.id},{floor:'2F',x:1e6,z:1e6});
      assert.equal(result.correct,candidate.id===PUZZLES[stage].spotId);
      assert.equal(result.progress.located,result.correct);
      assert.equal(result.progress.stage,stage);
    }
    const located=saved(stage,{located:true});
    for(const view of ['left','center','right','LEFT',null,3,{},'']){
      const result=applyAction(located,{type:'frame',view},at(stage));
      assert.equal(result.correct,view===PUZZLES[stage].correctView);
      assert.equal(result.progress.stage,result.correct?stage+1:stage);
    }
    const replay=applyAction(located,{type:'locate',answer:SPOTS[stage].id},null);
    assert.equal(replay.correct,true);assert.equal(replay.alreadyApplied,true);assert.deepEqual(replay.progress,located);
  }
});

test('platform centre, walking arrival and train-view spawn all work without accepting adjacent platforms',()=>{
  for(const index of [0,3]){
    const spot=SPOTS[index],service=TRAIN_SERVICES.find(service=>service.zoneId===spot.zoneId);
    assert.equal(nearSpot(at(index),spot),true);
    assert.equal(nearSpot({floor:spot.floor,x:service.viewX,z:service.viewZ},spot),true);
    for(const other of FLOOR_ZONES.filter(zone=>zone.kind==='platform'&&zone.id!==spot.zoneId)){
      assert.equal(nearSpot(other,spot),false,`${other.id} must not count as ${spot.id}`);
      const otherService=TRAIN_SERVICES.find(service=>service.zoneId===other.id);
      assert.equal(nearSpot({floor:other.floor,x:otherService.viewX,z:otherService.viewZ},spot),false);
    }
    const region=spot.region;
    for(const position of [{...at(index),x:region.minX-.01},{...at(index),x:region.maxX+.01},{...at(index),z:region.minZ-.01},{...at(index),z:region.maxZ+.01}])assert.equal(nearSpot(position,spot),false);
  }
});

test('view matching requires the right floor and place after identifying the photo',()=>{
  for(let stage=0;stage<LAST;stage++){
    const action={type:'frame',view:PUZZLES[stage].correctView};
    assert.equal(applyAction(saved(stage),action,at(stage)).correct,false);
    const progress=saved(stage,{located:true}),position=at(stage),spot=SPOTS[stage];
    const outside=spot.kind==='platform'?{...position,x:spot.region.maxX+.01}:{...position,x:position.x+10.01};
    for(const bad of [null,{...position,floor:position.floor==='1F'?'B1F':'1F'},outside,{...position,x:NaN},{...position,z:Infinity},{...position,x:String(position.x)}]){
      const result=applyAction(progress,action,bad);
      assert.equal(result.correct,false);assert.deepEqual(result.progress,progress);
    }
    if(spot.kind!=='platform')assert.equal(applyAction(progress,action,{...position,x:position.x+10}).correct,true);
  }
  assert.equal(nearSpot(at(0),SPOTS[0],-1),false);
  assert.equal(nearSpot(at(0),SPOTS[0],NaN),false);
});

test('camera handoff, photograph and sending still require their order at the silver bell',()=>{
  for(let stage=0;stage<LAST;stage++)for(const type of ['hand-camera','photograph','send']){
    const progress=saved(stage,{located:true}),result=applyAction(progress,{type},at(LAST));
    assert.equal(result.correct,false);assert.deepEqual(result.progress,progress);
  }
  assert.equal(applyAction(saved(LAST),{type:'photograph'},at(LAST)).correct,false);
  assert.equal(applyAction(saved(LAST),{type:'send'},at(LAST)).correct,false);
  assert.equal(applyAction(saved(LAST,{handed:true}),{type:'send'},at(LAST)).correct,false);
  for(const [type,progress] of [['hand-camera',saved(LAST)],['photograph',saved(LAST,{handed:true})],['send',saved(LAST,{handed:true,photographed:true})]]){
    for(const bad of [null,at(0),{...at(LAST),floor:'1F'},{...at(LAST),z:SPOTS[LAST].z+10.01}]){
      const result=applyAction(progress,{type},bad);
      assert.equal(result.correct,false);assert.deepEqual(result.progress,progress);
    }
    assert.equal(applyAction(progress,{type},{...at(LAST),z:SPOTS[LAST].z+10}).correct,true);
  }
  for(const action of [{type:'locate',answer:'silver-bell'},{type:'frame',view:'right'}])assert.equal(applyAction(saved(LAST),action,at(LAST)).correct,false);
});

test('complete old photographs migrate, while unfinished old routes restart without skipping new photos',()=>{
  assert.deepEqual(sanitizeProgress(legacy(3,{handed:true,photographed:true,sent:true})),saved(LAST,{handed:true,photographed:true,sent:true,endingLine:ENDING.length-1,endingRead:true}));
  for(let stage=0;stage<=3;stage++){
    assert.deepEqual(sanitizeProgress(legacy(stage)),initialProgress());
    assert.deepEqual(sanitizeProgress(legacy(stage,{located:true})),initialProgress());
  }
  for(const value of [legacy(2,{handed:true,photographed:true,sent:true}),legacy(3,{photographed:true,sent:true}),legacy(3,{handed:true,sent:true}),legacy(3,{handed:true,photographed:true}),legacy(5,{handed:true,photographed:true,sent:true})])assert.deepEqual(sanitizeProgress(value),initialProgress());
});

test('malformed saves cannot unlock new route stages or final steps without prerequisites',()=>{
  for(const value of [null,undefined,[],3,{}, {stage:3}, {...initialProgress(),version:4},{...initialProgress(),stage:6},{...initialProgress(),stage:-1},{...initialProgress(),stage:2.5},{...initialProgress(),stage:'3'},{...initialProgress(),sent:'true'},{version:1,stage:3,met:true},Object.create(initialProgress())])assert.deepEqual(sanitizeProgress(value),initialProgress());
  for(let stage=0;stage<LAST;stage++){
    assert.deepEqual(sanitizeProgress(saved(stage,{located:true,handed:true,photographed:true,sent:true})),saved(stage,{located:true}));
    assert.equal(targetSpot(saved(stage)).id,SPOTS[stage].id);
  }
  assert.deepEqual(sanitizeProgress(saved(LAST,{located:true,photographed:true,sent:true})),saved(LAST));
  assert.deepEqual(sanitizeProgress(saved(LAST,{handed:true,sent:true})),saved(LAST,{handed:true}));
  assert.deepEqual(sanitizeProgress(saved(LAST,{handed:true,photographed:true,sent:true,unknown:true})),saved(LAST,{handed:true,photographed:true,sent:true}));
  assert.equal(targetSpot(saved(LAST)).id,'silver-bell');
});

test('malformed actions and inherited answer fields cannot change the expanded route',()=>{
  for(const action of [null,undefined,[],{},'locate',{type:'__proto__'},{type:'constructor'},{type:'skip'},{type:'locate'},{type:'frame'},Object.create({type:'hand-camera'}),{type:'locate',answer:3}]){
    const progress=saved(1),result=applyAction(progress,action,at(1));
    assert.equal(result.correct,false);assert.deepEqual(result.progress,progress);
  }
  const inherited=Object.assign(Object.create({answer:'keiyo-platform-12'}),{type:'locate'});
  assert.equal(applyAction(initialProgress(),inherited,null).correct,false);
  const view=Object.assign(Object.create({view:'left'}),{type:'frame'});
  assert.equal(applyAction(saved(0,{located:true}),view,at(0)).correct,false);
});

test('sending a new photograph keeps the unread conversation resumable until its final line',()=>{
  const photographed=saved(LAST,{handed:true,photographed:true});
  let progress=applyAction(photographed,{type:'send'},at(LAST)).progress;
  assert.equal(progress.sent,true);assert.equal(progress.endingRead,false);assert.equal(progress.endingLine,0);
  for(let line=1;line<ENDING.length;line++){
    const before=structuredClone(progress),result=applyAction(progress,{type:'read-ending',line},null);
    assert.equal(result.correct,true);assert.deepEqual(progress,before);
    progress=sanitizeProgress(JSON.parse(JSON.stringify(result.progress)));
    assert.equal(progress.endingLine,line);assert.equal(progress.endingRead,line===ENDING.length-1);
  }
  for(const line of [0,1,ENDING.length-1]){
    const replay=applyAction(progress,{type:'read-ending',line});
    assert.equal(replay.correct,true);assert.equal(replay.alreadyApplied,true);assert.deepEqual(replay.progress,progress);
  }
});

test('photograph conversation cursors require sending and reject skipped or malformed lines',()=>{
  const current=saved(LAST,{handed:true,photographed:true,sent:true,endingLine:2});
  const back=applyAction(current,{type:'read-ending',line:1});
  assert.equal(back.correct,true);assert.equal(sanitizeProgress(back.progress).endingLine,1);
  for(const line of [-1,ENDING.length,1.5,NaN,'3',5])assert.equal(applyAction(current,{type:'read-ending',line}).correct,false);
  assert.equal(applyAction(saved(LAST,{handed:true,photographed:true}),{type:'read-ending',line:1}).correct,false);
  const inherited=Object.assign(Object.create({line:3}),{type:'read-ending'});
  assert.equal(applyAction(current,inherited).correct,false);
  for(const value of [{...current,endingLine:undefined},{...current,endingLine:ENDING.length},{...current,endingRead:'true'}])assert.deepEqual(sanitizeProgress(value),initialProgress());
  assert.deepEqual(sanitizeProgress(saved(3,{endingLine:2,endingRead:true})),saved(3));
});

test('previous sent photographs migrate as finished and unfinished version-two progress stays at the same stage',()=>{
  const flags={handed:true,photographed:true,sent:true};
  assert.deepEqual(sanitizeProgress({version:2,stage:LAST,located:false,...flags}),saved(LAST,{...flags,endingLine:ENDING.length-1,endingRead:true}));
  for(let stage=0;stage<LAST;stage++)assert.deepEqual(sanitizeProgress({version:2,stage,located:true,handed:false,photographed:false,sent:false}),saved(stage,{located:true}));
  assert.deepEqual(sanitizeProgress({version:2,stage:LAST,located:false,handed:true,photographed:true,sent:false}),saved(LAST,{handed:true,photographed:true}));
});
