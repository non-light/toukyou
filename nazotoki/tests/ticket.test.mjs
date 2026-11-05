import test from 'node:test';
import assert from 'node:assert/strict';
import {EPISODE,SPOTS,CLUES,HINTS,initialProgress,sanitizeProgress,targetSpot,nearSpot,applyAction} from '../dist/game/ticket-state.js';

const at=id=>{const spot=SPOTS.find(item=>item.id===id);return {x:spot.x,z:spot.z,floor:spot.floor};};
const actions=[{type:'bell'},{type:'choice',answer:'postbox'},{type:'order',answer:['bell','pillars','postbox']},{type:'deliver'}];
const positions=[at('bell'),at('pillars'),at('postbox'),at('postbox')];

test('the first episode has reachable authored landmarks and guidance for each stage',()=>{
  assert.equal(EPISODE.id,'time-letter-v1');
  assert.deepEqual(SPOTS.map(item=>item.zoneId),['silver-bell','square-zero','station-postbox']);
  assert.equal(CLUES.length,4);assert.equal(HINTS.length,4);
  for(let stage=0;stage<=3;stage++){
    assert.ok(CLUES[stage].title&&CLUES[stage].text);
    assert.equal(HINTS[stage].length,3);
    assert.equal(targetSpot({stage}).id,SPOTS[Math.min(stage,2)].id);
  }
});

test('the complete episode progresses from revealing the bell to delivering the letter',()=>{
  let progress=initialProgress();
  for(let index=0;index<actions.length;index++){
    const before=structuredClone(progress),result=applyAction(progress,actions[index],positions[index]);
    assert.equal(result.correct,true);assert.deepEqual(progress,before,'Rules must not mutate caller state');
    progress=result.progress;
    assert.equal(progress.stage,Math.min(index+1,3));
    assert.equal(progress.delivered,index===3);
  }
  assert.deepEqual(progress,{version:1,stage:3,delivered:true});
});

test('puzzles cannot be skipped even when a later correct answer is known',()=>{
  for(let stage=0;stage<3;stage++)for(let index=stage+1;index<actions.length;index++){
    const progress={version:1,stage,delivered:false};
    const result=applyAction(progress,actions[index],positions[index]);
    assert.equal(result.correct,false);assert.deepEqual(result.progress,progress);
  }
});

test('each discovery needs the correct floor and proximity, including delivery',()=>{
  for(let stage=0;stage<=3;stage++){
    const progress={version:1,stage,delivered:false},position=positions[stage];
    for(const bad of [{...position,floor:position.floor==='1F'?'B1F':'1F'},{...position,x:position.x+10.01},null,{...position,x:NaN},{...position,z:Infinity},{...position,x:String(position.x)}]){
      const result=applyAction(progress,actions[stage],bad);
      assert.equal(result.correct,false);assert.deepEqual(result.progress,progress);
    }
    assert.equal(applyAction(progress,actions[stage],{...position,x:position.x+10}).correct,true);
  }
  assert.equal(nearSpot(at('bell'),SPOTS[0],-1),false);
});

test('wrong choices and order do not remove discoveries or create penalties',()=>{
  const choiceProgress={version:1,stage:1,delivered:false};
  const wrong=applyAction(choiceProgress,{type:'choice',answer:'train'},at('pillars'));
  assert.equal(wrong.correct,false);assert.deepEqual(wrong.progress,choiceProgress);
  const orderProgress={version:1,stage:2,delivered:false};
  for(const answer of [['postbox','pillars','bell'],['bell','bell','postbox'],['bell','pillars'],['bell','pillars','postbox','extra'],'bell,pillars,postbox']){
    const result=applyAction(orderProgress,{type:'order',answer},at('postbox'));
    assert.equal(result.correct,false);assert.deepEqual(result.progress,orderProgress);
  }
});

test('replayed discoveries and delivery are idempotent and never move shared progress backwards',()=>{
  const complete={version:1,stage:3,delivered:true};
  for(const action of actions){
    const result=applyAction(complete,action,null);
    assert.equal(result.correct,true);assert.equal(result.alreadyApplied,true);
    assert.deepEqual(result.progress,complete);
  }
  const partial={version:1,stage:2,delivered:false};
  assert.deepEqual(applyAction(partial,actions[0],null).progress,partial);
});

test('malformed, stale, or out-of-range saved progress cannot unlock an ending',()=>{
  for(const value of [null,undefined,[],3,'3',{}, {stage:-1,delivered:true},{stage:4,delivered:true},{stage:2.5},{stage:'3',delivered:true},{version:99,stage:3,delivered:true}]){
    assert.deepEqual(sanitizeProgress(value),initialProgress());
  }
  assert.deepEqual(sanitizeProgress({stage:1,delivered:true,untrusted:'ignored'}),{version:1,stage:1,delivered:false});
  assert.deepEqual(sanitizeProgress({version:1,stage:3,delivered:'true'}),{version:1,stage:3,delivered:false});
  assert.deepEqual(sanitizeProgress({stage:3,delivered:true}),{version:1,stage:3,delivered:true});
});

test('unknown and malformed actions fail safely without changing progress',()=>{
  const progress=initialProgress();
  for(const action of [null,undefined,[],{},'bell',{type:'__proto__'},{type:'constructor'},{type:'skip'}]){
    const result=applyAction(progress,action,at('bell'));
    assert.equal(result.correct,false);assert.deepEqual(result.progress,progress);
  }
});
