import test, {before, after} from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../dist/vendor/three.module.js';
import {LANDMARKS, landmarkAt} from '../dist/landmarks.js';
import {FLOORS, FLOOR_ZONES, insideFloor, buildingRoute} from '../dist/floor-layout.js';
import {resolveLocation} from '../dist/station-guide-data.js';

const expected=new Map([
 ['silver-bell',{floor:'B1F',paid:true,title:'銀の鈴'}],
 ['driving-wheels',{floor:'B1F',paid:false,title:'動輪の広場'}],
 ['square-zero',{floor:'B1F',paid:true,title:'SQUARE ZERO'}],
 ['station-postbox',{floor:'1F',paid:true,title:'赤レンガ駅舎型ポスト'}],
]);
const sceneOptions={skip:process.env.CHECK_BUILDING_SCENE==='1'?false:'Set CHECK_BUILDING_SCENE=1 for landmark geometry and routing checks'};
let building,previousDocument;
function makeCanvas(){
 const canvas={width:0,height:0,style:{}},gradient={addColorStop(){}};
 const context=new Proxy({canvas,measureText:text=>({width:String(text).length*16}),createLinearGradient:()=>gradient,createRadialGradient:()=>gradient,createPattern:()=>({}),getImageData:()=>({data:new Uint8ClampedArray(canvas.width*canvas.height*4)})},{get:(target,key)=>key in target?target[key]:()=>{}});
 canvas.getContext=()=>context;return canvas;
}
before(async()=>{
 if(process.env.CHECK_BUILDING_SCENE!=='1')return;
 previousDocument=globalThis.document;
 globalThis.document={createElement:tag=>{assert.equal(tag,'canvas');return makeCanvas();}};
 const {createBuildingScene}=await import('../dist/building-scene.js');
 building=createBuildingScene();building.scene.updateMatrixWorld(true);
});
after(()=>{
 building?.dispose?.();
 if(process.env.CHECK_BUILDING_SCENE!=='1')return;
 if(previousDocument===undefined)delete globalThis.document;else globalThis.document=previousDocument;
});
function allowed(x,z,floor){
 const radius=.27;
 return insideFloor(x,z,floor)&&!(building.collidersByFloor[floor]??[]).some(box=>x>box.minX-radius&&x<box.maxX+radius&&z>box.minZ-radius&&z<box.maxZ+radius);
}
function checkPhysicalRoute(from,to){
 const path=buildingRoute(from,to,allowed);assert.ok(path.length,`No physical route from ${from.id} to ${to.id}`);
 let previous=from;
 for(const point of path){
  if(point.kind!=='transfer'){
   assert.equal(point.floor,previous.floor);
   const count=Math.max(1,Math.ceil(Math.hypot(point.x-previous.x,point.z-previous.z)/.15));
   for(let i=0;i<=count;i++)assert.ok(allowed(previous.x+(point.x-previous.x)*i/count,previous.z+(point.z-previous.z)*i/count,point.floor),`Route to ${to.id} crosses geometry`);
  }else assert.ok(allowed(point.x,point.z,point.floor),`Blocked transfer to ${point.floor}`);
  previous=point;
 }
 assert.equal(path.at(-1).floor,to.floor);assert.equal(path.at(-1).x,to.x);assert.equal(path.at(-1).z,to.z);
}

test('all four meeting landmarks retain their names, floors, and paid-area identities',()=>{
 assert.deepEqual(new Set(LANDMARKS.map(place=>place.id)),new Set(expected.keys()));
 for(const place of LANDMARKS){
  const identity=expected.get(place.id),zone=FLOOR_ZONES.find(zone=>zone.id===place.id);
  assert.ok(zone,`${place.id} must be present in map and route destinations`);
  for(const field of ['title','floor','paid'])assert.equal(place[field],identity[field]);
  assert.equal(zone.kind,'landmark');assert.equal(zone.floor,place.floor);assert.equal(zone.x,place.x);assert.equal(zone.z,place.z);
  assert.ok(insideFloor(place.x,place.z,place.floor));assert.ok(insideFloor(place.modelX,place.modelZ,place.floor));
  assert.match(place.source,/^https:\/\//);
 }
 assert.match(LANDMARKS.find(place=>place.id==='driving-wheels').body,/C62-15/);
 assert.doesNotMatch(LANDMARKS.find(place=>place.id==='driving-wheels').body,/D51/);
});

test('nearby current locations identify each landmark without leaking to a different floor',()=>{
 for(const place of LANDMARKS){
  assert.equal(landmarkAt(place.x,place.z,place.floor)?.id,place.id);
  const current=resolveLocation({x:place.x,z:place.z,floor:place.floor});
  assert.equal(current.id,place.id);assert.equal(current.title,place.title);assert.equal(current.floor,place.floor);assert.equal(current.paid,place.paid);
  assert.equal(current.areaLabel,place.areaLabel);
  for(const floor of FLOORS.filter(floor=>floor.id!==place.floor)){
   assert.notEqual(landmarkAt(place.x,place.z,floor.id)?.id,place.id);
   assert.notEqual(resolveLocation({x:place.x,z:place.z,floor:floor.id}).id,place.id);
  }
 }
 assert.equal(landmarkAt(999,999,'B1F'),undefined);
 assert.notEqual(resolveLocation({x:32,z:157,floor:'B1F'}).id,'silver-bell','Keiyo passage is not the main-building silver-bell area');
});

test('each meeting landmark contains visible geometry on the intended floor',sceneOptions,()=>{
 assert.ok(Array.isArray(building.landmarks));
 assert.deepEqual(new Set(building.landmarks.map(item=>item.id)),new Set(expected.keys()));
 for(const place of LANDMARKS){
  const item=building.landmarks.find(item=>item.id===place.id),elevation=FLOORS.find(floor=>floor.id===place.floor).elevation;
  assert.equal(item.floor,place.floor);assert.ok(item.group?.isGroup);
  assert.equal(building.floorGroups[place.floor].getObjectById(item.group.id),item.group);
  const box=new THREE.Box3().setFromObject(item.group);assert.equal(box.isEmpty(),false);
  assert.ok(box.min.y>=elevation-.3,`${place.id} must be placed on its floor`);
  assert.ok(box.max.y<=elevation+(place.id==='square-zero'?8:4.5),`${place.id} exceeds its authored floor volume`);
  assert.ok(box.max.y>=elevation+1.5,`${place.id} needs a recognizable above-floor model`);
  building.setFloor(place.floor);
  for(let object=item.group;object;object=object.parent)assert.equal(object.visible,true);
  for(const floor of FLOORS)assert.equal(building.floorGroups[floor.id].visible,floor.id===place.floor);
 }
});

test('recognizable silver bell, three locomotive wheels, three monoliths, and station postbox are modeled',sceneOptions,()=>{
 const parts={
  'silver-bell':['silver-bell-body'],
  'driving-wheels':['wheel-1','wheel-2','wheel-3'],
  'square-zero':['monolith-1','monolith-2','monolith-3'],
  'station-postbox':['postbox-building'],
 };
 for(const [id,names] of Object.entries(parts)){
  const model=building.landmarks.find(item=>item.id===id)?.group;assert.ok(model);
  for(const name of names){const part=model.getObjectByName(name);assert.ok(part,`${id} is missing ${name}`);assert.equal(new THREE.Box3().setFromObject(part).isEmpty(),false,`${name} must contain geometry`);}
 }
 const zero=building.landmarks.find(item=>item.id==='square-zero').group;
 for(const name of parts['square-zero']){const box=new THREE.Box3().setFromObject(zero.getObjectByName(name));assert.ok(box.max.y-box.min.y>=4,'Monoliths must read as tall vertical signage');}
});

test('exhibits block passage through their solids while viewing points and approach routes stay clear',sceneOptions,()=>{
 const start=FLOOR_ZONES.find(zone=>zone.id==='dome');
 for(const place of LANDMARKS){
  assert.ok(allowed(place.x,place.z,place.floor),`${place.id} viewing point is obstructed`);
  if(place.id!=='square-zero')assert.equal(allowed(place.modelX,place.modelZ,place.floor),false,`${place.id} exhibit must block walking through it`);
  else assert.ok(allowed(place.modelX,place.modelZ,place.floor),'SQUARE ZERO waiting-space center must remain open');
  checkPhysicalRoute(start,place);checkPhysicalRoute(place,start);
 }
});

test('the chosen viewing directions face the solid landmark models',sceneOptions,()=>{
 for(const place of LANDMARKS.filter(place=>place.id!=='square-zero')){
  const model=building.landmarks.find(item=>item.id===place.id).group,elevation=FLOORS.find(floor=>floor.id===place.floor).elevation;
  const direction=new THREE.Vector3(-Math.sin(place.yaw)*Math.cos(place.pitch),Math.sin(place.pitch),-Math.cos(place.yaw)*Math.cos(place.pitch));
  const ray=new THREE.Raycaster(new THREE.Vector3(place.x,elevation+1.65,place.z),direction,.12,40);
  assert.ok(ray.intersectObject(model,true).length,`${place.id} should be in view when arriving at its approach point`);
 }
});
