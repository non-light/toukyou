import {SPOTS} from '../dist/game/photograph-state.js';
import test, {before, after} from 'node:test';
import assert from 'node:assert/strict';
import {FLOOR_ZONES,CONNECTORS,insideFloor,buildingRoute} from '../dist/floor-layout.js';

const sceneOptions={skip:process.env.CHECK_BUILDING_SCENE==='1'?false:'Set CHECK_BUILDING_SCENE=1 for physical story-route checks'};
const connectorById=new Map(CONNECTORS.map(connector=>[connector.id,connector]));
const zones=new Map(FLOOR_ZONES.map(zone=>[zone.id,zone]));
let station,gateVisuals,previousDocument;
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

test('the complete standalone story route stays walkable on its intended floors',sceneOptions,()=>{
 const visited=new Set([SPOTS[0].floor]);
 for(let index=1;index<SPOTS.length;index++){
  const from=SPOTS[index-1],to=SPOTS[index];if(samePoint(from,to))continue;
  const checked=physicalRoute(from,to);for(const step of checked.route)visited.add(step.floor);
 }
 assert.deepEqual([...visited].sort(),["1F","B1F","B2F","B3F","B4F","B5F"]);
});
