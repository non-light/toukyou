import test, {before, after} from 'node:test';
import assert from 'node:assert/strict';
import {FLOORS,FLOOR_ZONES,CONNECTORS,insideFloor,buildingRoute} from '../dist/floor-layout.js';
import {SPOTS as ticketSpots} from '../dist/game/ticket-state.js';
import {SPOTS as farewellSpots} from '../dist/game/farewell-state.js';
import {SPOTS as photographSpots} from '../dist/game/photograph-state.js';
import {SPOTS as promiseSpots} from '../dist/game/promise-state.js';

const sceneOptions={skip:process.env.CHECK_BUILDING_SCENE==='1'?false:'Set CHECK_BUILDING_SCENE=1 for physical story-route checks'};
const connectorById=new Map(CONNECTORS.map(connector=>[connector.id,connector]));
const zones=new Map(FLOOR_ZONES.map(zone=>[zone.id,zone]));
const stories=[
  {name:'第1作',spots:ticketSpots,floors:['1F','B1F']},
  {name:'第2作',spots:farewellSpots,floors:['1F','2F','B1F','M2F']},
  {name:'第3作',spots:photographSpots,floors:['1F','B1F','B2F','B3F','B4F','B5F']},
];
let station,gateVisuals,previousDocument;
const reports=[];
function makeCanvas(){
  const canvas={width:0,height:0,style:{}},gradient={addColorStop(){}};
  const context=new Proxy({canvas,measureText:text=>({width:String(text).length*16}),createLinearGradient:()=>gradient,createRadialGradient:()=>gradient,createPattern:()=>({}),getImageData:()=>({data:new Uint8ClampedArray(canvas.width*canvas.height*4)})},{get:(target,key)=>key in target?target[key]:()=>{}});
  canvas.getContext=()=>context;return canvas;
}
before(async()=>{
  if(process.env.CHECK_BUILDING_SCENE!=='1')return;
  previousDocument=globalThis.document;
  globalThis.document={createElement:tag=>{assert.equal(tag,'canvas');return makeCanvas();}};
  const [{createBuildingScene},{addGateVisuals}]=await Promise.all([import('../dist/building-scene.js'),import('../dist/gate-visuals.js')]);
  station=createBuildingScene();gateVisuals=addGateVisuals(station);
});
after(()=>{
  gateVisuals?.dispose();station?.dispose();
  if(process.env.CHECK_BUILDING_SCENE!=='1')return;
  if(previousDocument===undefined)delete globalThis.document;else globalThis.document=previousDocument;
});
function allowed(x,z,floor){
  const radius=.27;
  return insideFloor(x,z,floor)&&!(station.collidersByFloor[floor]??[]).some(box=>x>box.minX-radius&&x<box.maxX+radius&&z>box.minZ-radius&&z<box.maxZ+radius);
}
const samePoint=(a,b)=>a.floor===b.floor&&Math.abs(a.x-b.x)<1e-8&&Math.abs(a.z-b.z)<1e-8;
function physicalRoute(from,to){
  assert.ok(allowed(from.x,from.z,from.floor),`Blocked departure ${from.zoneId??from.id}`);
  assert.ok(allowed(to.x,to.z,to.floor),`Blocked destination ${to.zoneId??to.id}`);
  const route=buildingRoute(from,to,allowed);
  assert.ok(route.length,`No physical story route from ${from.zoneId??from.id} to ${to.zoneId??to.id}`);
  assert.ok(samePoint(route.at(-1),to),'A route must finish at its story destination');
  let previous=from,distance=0;
  for(const step of route){
    assert.ok(allowed(step.x,step.z,step.floor),'Each step stays clear of building, landmark and gate geometry');
    if(step.kind==='transfer'){
      const connector=connectorById.get(step.connectorId);
      assert.ok(connector,`Unknown transfer ${step.connectorId}`);
      assert.ok(samePoint(previous,connector.a)&&samePoint(step,connector.b)||samePoint(previous,connector.b)&&samePoint(step,connector.a),'Every floor change uses the two actual endpoints of its connector');
    }else{
      assert.equal(step.kind,'walk');
      assert.equal(previous.floor,step.floor,'Walking never silently changes floors');
      const length=Math.hypot(step.x-previous.x,step.z-previous.z),samples=Math.max(1,Math.ceil(length/.15));
      for(let sample=0;sample<=samples;sample++)assert.ok(allowed(previous.x+(step.x-previous.x)*sample/samples,previous.z+(step.z-previous.z)*sample/samples,step.floor),`Story route crosses geometry on ${step.floor}`);
      distance+=length;
    }
    previous=step;
  }
  return {route,distance};
}

test('story routes progressively explore two, four and six physical floors and together cover all eight',sceneOptions,t=>{
  const combined=new Set();
  for(const story of stories){
    const floors=new Set([story.spots[0].floor]);let distance=0,transfers=0;
    for(let index=1;index<story.spots.length;index++){
      const checked=physicalRoute(story.spots[index-1],story.spots[index]);distance+=checked.distance;
      for(const step of checked.route){floors.add(step.floor);if(step.kind==='transfer')transfers++;}
    }
    assert.deepEqual([...floors].sort(),story.floors,`${story.name} has its intended exploration range`);
    for(const floor of floors)combined.add(floor);
    const report={story:story.name,distance:Number(distance.toFixed(1)),transfers,walkSeconds:Number((distance/2.8).toFixed(1)),walkWithTransfersSeconds:Number((distance/2.8+transfers*1.25).toFixed(1))};
    reports.push(report);t.diagnostic(JSON.stringify(report));
  }
  assert.deepEqual([...combined].sort(),FLOORS.map(floor=>floor.id).sort());
  assert.ok(reports[0].distance<reports[1].distance&&reports[1].distance<reports[2].distance,'Later stories cover progressively longer model routes');
});

test('same-floor Keiyo and main-station islands require actual intervening floors',sceneOptions,()=>{
  for(const [firstId,secondId] of [['keiyo-passage','b1-concourse'],['keiyo-platform-12','sobu-concourse']]){
    const first=zones.get(firstId),second=zones.get(secondId);
    assert.equal(first.floor,second.floor);
    const sameFloorAllowed=(x,z,floor)=>floor===first.floor&&allowed(x,z,floor);
    assert.deepEqual(buildingRoute(first,second,sameFloorAllowed),[],`${firstId} must not connect directly to ${secondId}`);
    const {route}=physicalRoute(first,second);
    assert.ok(route.some(step=>step.kind==='transfer'),'A real route must leave the disconnected same-floor island');
    assert.ok(route.some(step=>step.floor==='1F'),'The separated underground areas connect through 1F');
  }
});

test('the fourth story can walk the whole reunion loop through actual gates and floor connectors',sceneOptions,()=>{
  const floors=new Set([promiseSpots[0].floor]);
  // The final puzzle and reunion share the bell, so no transfer is needed there.
  for(let index=1;index<promiseSpots.length;index++){
    const from=promiseSpots[index-1],to=promiseSpots[index];
    if(samePoint(from,to))continue;
    const {route}=physicalRoute(from,to);
    for(const step of route)floors.add(step.floor);
  }
  assert.deepEqual([...floors].sort(),['1F','B1F']);
  assert.ok(samePoint(promiseSpots[0],promiseSpots.at(-1)),'The reunion returns to the original waiting place');
});

test('the third story uses the long Keiyo passage once and the separate Sobu elevator branch',sceneOptions,()=>{
  let keiyoEntranceCrossings=0;
  for(let index=1;index<photographSpots.length;index++){
    const from=photographSpots[index-1],to=photographSpots[index],{route}=physicalRoute(from,to);
    for(const step of route)if(step.connectorId==='keiyo-entrance')keiyoEntranceCrossings++;
    if(from.zoneId==='keiyo-platform-12')assert.deepEqual([from.floor,...route.filter(step=>step.kind==='transfer').map(step=>step.floor)],['B4F','B3F','B2F','B1F','1F']);
    if(to.zoneId==='sobu-platform-12'){
      assert.ok(route.some(step=>step.connectorId==='sobu-deep'));
      assert.ok(!route.some(step=>step.floor==='B2F'||step.floor==='B3F'));
      assert.deepEqual([from.floor,...route.filter(step=>step.kind==='transfer').map(step=>step.floor)],['B1F','B4F','B5F']);
    }
  }
  assert.equal(keiyoEntranceCrossings,1,'The long passage is not an unnecessary out-and-back route');
});
