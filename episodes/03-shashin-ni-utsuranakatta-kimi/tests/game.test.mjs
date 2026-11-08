import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as THREE from '../dist/vendor/three.module.js';
import {FLOORS, FLOOR_ZONES, insideFloor} from '../dist/floor-layout.js';
import {GAME_CONTENT} from '../dist/game/content.js';
import {validateContent, createGameState} from '../dist/game/state.js';
import {createCharacterLayer} from '../dist/game/characters.js';

const zones = FLOOR_ZONES;
const empty = () => ({schemaVersion:1,title:'QA project',characters:[],puzzles:[]});
const puzzle = (id, extra={}) => ({id,title:'QA puzzle',zoneId:'dome',question:'QA question',answers:['a b'],hint:'QA hint',successText:'QA success',requires:[],...extra});
const character = (id, extra={}) => ({id,name:'QA character',zoneId:'dome',dialogue:['QA dialogue'],color:'#456789',puzzleId:null,...extra});
const fixture = () => ({...empty(),characters:[character('c-one',{puzzleId:'p-two'})],puzzles:[puzzle('p-one'),puzzle('p-two',{requires:['p-one'],zoneId:'silver-bell'})]});
function storage() {
  const data=new Map();
  return {data,getItem:key=>data.get(key)??null,setItem:(key,value)=>data.set(key,String(value)),removeItem:key=>data.delete(key)};
}


// These are temporary QA fixtures, never shipped as story content.
test('the development copy starts with no invented characters or puzzles', () => {
  const content=validateContent(GAME_CONTENT,zones);
  assert.equal(content.schemaVersion,1);
  assert.deepEqual(content.characters,[]);
  assert.deepEqual(content.puzzles,[]);
  const state=createGameState({content:GAME_CONTENT,zones,storage:storage(),key:'qa-empty'});
  assert.deepEqual(state.progress.solved,[]);
});

test('content validation rejects unavailable places, duplicate IDs, invalid references, and cyclic puzzle chains', () => {
  assert.doesNotThrow(()=>validateContent(fixture(),zones));
  const cases=[];
  let value=fixture();value.characters[0].zoneId='not-a-station-place';cases.push(value);
  value=fixture();value.characters.push({...value.characters[0]});cases.push(value);
  value=fixture();value.characters[0].puzzleId='missing-puzzle';cases.push(value);
  value=fixture();value.puzzles[0].requires=['missing-puzzle'];cases.push(value);
  value=fixture();value.puzzles[0].requires=['p-one'];cases.push(value);
  value=fixture();value.puzzles[0].requires=['p-two'];cases.push(value);
  value=fixture();value.characters[0].color='not-a-color';cases.push(value);
  value=fixture();value.puzzles[0].answers=[];cases.push(value);
  for (const content of cases) assert.throws(()=>validateContent(content,zones));
});

test('import validation is atomic and exposed content cannot mutate the saved project', () => {
  const saved=storage(),state=createGameState({content:fixture(),zones,storage:saved,key:'qa-atomic'});
  state.replaceContent(fixture());
  const before=state.content, persisted=saved.getItem('qa-atomic');
  const invalid=fixture();invalid.puzzles[0].requires=['missing-puzzle'];
  assert.throws(()=>state.replaceContent(invalid));
  assert.deepEqual(state.content,before);
  assert.equal(saved.getItem('qa-atomic'),persisted);
  const exposed=state.content;exposed.characters[0].name='changed outside API';exposed.puzzles.length=0;
  assert.deepEqual(state.content,before);
});

test('puzzles stay locked until prerequisites are solved and answers accept full-width, case, and spacing variants', () => {
  const state=createGameState({content:fixture(),zones,storage:storage(),key:'qa-play'});
  assert.equal(state.canPlayPuzzle('p-two'),false);
  const locked=state.answerPuzzle('p-two','a b');
  assert.equal(locked.locked,true);
  assert.equal(locked.correct,false);
  assert.deepEqual(state.progress.solved,[]);
  const wrong=state.answerPuzzle('p-one','wrong');
  assert.equal(wrong.correct,false);
  assert.equal(wrong.locked,false);
  assert.equal(state.progress.attempts['p-one'],1);
  const correct=state.answerPuzzle('p-one','  Ａ　Ｂ  ');
  assert.equal(correct.correct,true);
  assert.equal(state.canPlayPuzzle('p-two'),true);
  assert.deepEqual(state.progress.solved,['p-one']);
  const again=state.answerPuzzle('p-one','wrong');
  assert.equal(again.alreadySolved,true);
  assert.deepEqual(state.progress.solved,['p-one']);
  assert.equal(state.answerPuzzle('p-two','AB').correct,true);
  assert.deepEqual(new Set(state.progress.solved),new Set(['p-one','p-two']));
});

test('project and progress survive reload independently and reset keeps authored content', () => {
  const saved=storage(),key='qa-reload';
  const first=createGameState({content:empty(),zones,storage:saved,key});
  first.replaceContent(fixture());first.answerPuzzle('p-one','ab');
  const second=createGameState({content:empty(),zones,storage:saved,key});
  assert.deepEqual(second.content,first.content);
  assert.deepEqual(second.progress.solved,['p-one']);
  const contentBefore=second.content;second.resetProgress();
  assert.deepEqual(second.content,contentBefore);
  assert.deepEqual(second.progress.solved,[]);
  assert.deepEqual(second.progress.attempts,{});
  const third=createGameState({content:empty(),zones,storage:saved,key});
  assert.deepEqual(third.content,contentBefore);
  assert.deepEqual(third.progress.solved,[]);
});

test('removing a puzzle clears dependent references and stale progress while keeping other content', () => {
  const state=createGameState({content:fixture(),zones,storage:storage(),key:'qa-delete'});
  state.answerPuzzle('p-one','ab');state.answerPuzzle('p-two','ab');
  state.removePuzzle('p-two');
  assert.equal(state.content.characters[0].puzzleId,null);
  assert.ok(!state.progress.solved.includes('p-two'));
  assert.ok(state.content.puzzles.some(item=>item.id==='p-one'));
  state.upsertPuzzle(puzzle('p-three',{requires:['p-one']}));
  state.removePuzzle('p-one');
  assert.deepEqual(state.content.puzzles[0].requires,[]);
  assert.deepEqual(state.progress.solved,[]);
  state.upsertCharacter(character('c-two'));
  state.removeCharacter('c-one');
  assert.deepEqual(state.content.characters.map(item=>item.id),['c-two']);
});

test('malformed or unavailable browser storage falls back without losing in-memory editing', () => {
  const saved=storage();saved.setItem('qa-corrupt','not JSON');saved.setItem('qa-corrupt:progress','not JSON');
  const state=createGameState({content:empty(),zones,storage:saved,key:'qa-corrupt'});
  assert.deepEqual(state.content.characters,[]);
  assert.deepEqual(state.progress.solved,[]);
  assert.ok(state.warning);
  const malformed=storage();malformed.setItem('qa-structure:progress','4');
  const fallback=createGameState({content:fixture(),zones,storage:malformed,key:'qa-structure'});
  assert.deepEqual(fallback.progress.solved,[]);assert.ok(fallback.warning);
  const missing=createGameState({content:empty(),zones,storage:null,key:'qa-no-storage'});
  assert.ok(missing.warning);
  const stale=storage();stale.setItem('qa-stale:progress',JSON.stringify({solved:['p-one','p-removed'],attempts:{'p-one':2,'p-removed':99}}));
  const cleaned=createGameState({content:fixture(),zones,storage:stale,key:'qa-stale'});
  assert.deepEqual(cleaned.progress.solved,['p-one']);assert.equal(cleaned.progress.attempts['p-removed'],undefined);
  const unavailable={getItem(){throw new Error('unavailable');},setItem(){throw new Error('full');}};
  const live=createGameState({content:empty(),zones,storage:unavailable,key:'qa-unavailable'});
  assert.doesNotThrow(()=>live.upsertCharacter(character('c-live')));
  assert.equal(live.content.characters[0].id,'c-live');
  assert.ok(live.warning);
});

test('content subscribers are notified and can unsubscribe', () => {
  const state=createGameState({content:empty(),zones,storage:storage(),key:'qa-events'});
  let updates=0;
  const unsubscribe=state.subscribe(()=>updates++);
  state.upsertPuzzle(puzzle('p-one'));
  assert.ok(updates>0);
  unsubscribe();const count=updates;
  state.answerPuzzle('p-one','ab');
  assert.equal(updates,count);
});

function makeCanvas() {
  const canvas={width:0,height:0,style:{}};
  const gradient={addColorStop(){}};
  const context=new Proxy({canvas,measureText:text=>({width:String(text).length*16}),createLinearGradient:()=>gradient,createRadialGradient:()=>gradient,createPattern:()=>({}),getImageData:()=>({data:new Uint8ClampedArray(canvas.width*canvas.height*4)})},{get:(target,key)=>key in target?target[key]:()=>{}});
  canvas.getContext=()=>context;return canvas;
}

test('character layers use the correct floors and clear positions without altering the original station or collision map', {
  skip:process.env.CHECK_BUILDING_SCENE!=='1'?'Set CHECK_BUILDING_SCENE=1 for character geometry checks':false,
},async()=>{
  const previousDocument=globalThis.document;
  globalThis.document={createElement:()=>makeCanvas()};
  let station,layer;
  try {
    const {createBuildingScene}=await import('../dist/building-scene.js');
    station=createBuildingScene();
    const beforeColliders=structuredClone(station.collidersByFloor),beforeZones=structuredClone(station.zones);
    const isAllowed=(x,z,floor)=>insideFloor(x,z,floor)&&!station.collidersByFloor[floor].some(box=>x>box.minX-.27&&x<box.maxX+.27&&z>box.minZ-.27&&z<box.maxZ+.27);
    layer=createCharacterLayer({station,zones,isAllowed,reducedMotion:true});
    assert.deepEqual(layer.items,[]);
    layer.setCharacters([character('c-ground'),character('c-ground-neighbor'),character('c-below',{zoneId:'silver-bell'})]);
    assert.equal(layer.items.length,3);
    const originalIds=layer.items.map(item=>item.id);
    assert.throws(()=>layer.setCharacters([character('c-invalid',{zoneId:'unknown-place'})]));
    assert.deepEqual(layer.items.map(item=>item.id),originalIds);
    const sameFloor=layer.items.filter(item=>item.floor==='1F');
    assert.ok(Math.hypot(sameFloor[0].x-sameFloor[1].x,sameFloor[0].z-sameFloor[1].z)>1.05, 'Characters placed at the same landmark must not overlap');
    station.scene.updateMatrixWorld(true);
    const prior=[];
    for (const item of layer.items) {
      const anchor=zones.find(zone=>zone.id===item.zoneId),level=FLOORS.find(floor=>floor.id===item.floor).elevation;
      assert.equal(item.floor,anchor.floor);
      assert.ok(isAllowed(item.x,item.z,item.floor));
      assert.equal(station.floorGroups[item.floor].getObjectById(item.object.id),item.object);
      const box=new THREE.Box3().setFromObject(item.object);
      assert.ok(!box.isEmpty());assert.ok(box.min.y>=level-.2&&box.max.y<=level+3.5);
      assert.ok(item.headY>=level+1&&item.headY<=level+3.5);
      station.setFloor(item.floor);
      for(let node=item.object;node;node=node.parent)assert.equal(node.visible,true);
      prior.push(item.object.id);
    }
    assert.deepEqual(station.collidersByFloor,beforeColliders);
    assert.deepEqual(station.zones,beforeZones);
    layer.update(1);
    layer.setCharacters([character('c-replaced',{zoneId:'square-zero'})]);
    assert.equal(layer.items.length,1);
    for(const id of prior)assert.equal(station.scene.getObjectById(id),undefined);
    const current=layer.items[0].object.id;
    layer.dispose();assert.equal(station.scene.getObjectById(current),undefined);
    assert.doesNotThrow(()=>layer.dispose());layer=null;
  } finally {
    layer?.dispose();station?.dispose?.();
    if(previousDocument===undefined)delete globalThis.document;else globalThis.document=previousDocument;
  }
});
