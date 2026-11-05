import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../dist/vendor/three.module.js';
import {createShoulderCamera} from '../dist/game/shoulder-camera.js';

const close=(actual,expected,epsilon=1e-7)=>assert.ok(Math.abs(actual-expected)<epsilon,`${actual} should equal ${expected}`);
const player=new THREE.Vector3(0,1.65,0);
function fixture(colliders=[]){
  const camera=new THREE.PerspectiveCamera(65,1,.12,650);
  const station={collidersByFloor:{'1F':colliders,'B1F':[]}};
  const controller=createShoulderCamera({camera,station});
  const step=(extra={})=>controller.update({player,yaw:0,pitch:0,floor:'1F',dt:1/60,...extra});
  return {camera,station,controller,step};
}

test('an unobstructed right shoulder camera places the traveller left of the aim',()=>{
  const {camera,controller,step}=fixture();step();
  close(camera.position.x,.5);close(camera.position.z,2.7);close(camera.position.y,1.9);
  close(controller.distance,Math.hypot(.5,2.7));
  camera.updateMatrixWorld(true);
  assert.ok(player.clone().project(camera).x<0,'The traveller should appear on the left side');
  const aim=new THREE.Vector3(0,1.65,-8).project(camera);
  close(aim.x,0);close(aim.y,0);
});

test('walls between the player and shoulder camera immediately shorten the offset',()=>{
  const wall=Object.freeze({minX:-5,maxX:5,minZ:1.4,maxZ:2});
  const {camera,step,station}=fixture([wall]);const original=JSON.stringify(station);
  const result=step();
  assert.ok(camera.position.z<=1.4-.18);
  assert.ok(result.distance<Math.hypot(.5,2.7));
  assert.equal(JSON.stringify(station),original,'Collision records are read-only');
  station.collidersByFloor['1F']=[];step({dt:.1});
  assert.ok(camera.position.z>1.22&&camera.position.z<2.7,'Moving away from a wall recovers smoothly');
  station.collidersByFloor['1F']=[{minX:-5,maxX:5,minZ:.7,maxZ:1}];step();
  assert.ok(camera.position.z<=.7-.18,'A newly close wall must be applied in the same frame');
});

test('collision uses the diagonal shoulder segment and ignores walls in front or on other floors',()=>{
  const {camera,station,step}=fixture([{minX:.4,maxX:.8,minZ:.2,maxZ:4}]);step();
  assert.ok(camera.position.x<=.4-.18);
  station.collidersByFloor['1F']=[{minX:-5,maxX:5,minZ:-3,maxZ:-1}];
  step({floor:'B1F'});close(camera.position.z,2.7);
  step();close(camera.position.z,2.7);
});

test('yaw and positive upward pitch match the walking camera conventions',()=>{
  const {camera,step}=fixture();step({yaw:Math.PI/2,pitch:.6});
  close(camera.position.x,2.7);close(camera.position.z,-.5);
  const direction=new THREE.Vector3();camera.getWorldDirection(direction);
  assert.ok(direction.x<0&&direction.y>0);
});

test('floor changes, teleports and reset snap safely without dragging the old camera pose',()=>{
  const {camera,step,controller}=fixture([{minX:-5,maxX:5,minZ:.6,maxZ:1}]);step();
  const lower=new THREE.Vector3(50,-10+1.65,30);step({player:lower,floor:'B1F',pitch:-1.2});
  close(camera.position.x,50.5);close(camera.position.z,32.7);
  assert.ok(camera.position.y>-10,'Camera never falls under the current floor');
  close(controller.distance,Math.hypot(.5,2.7));
  controller.reset();step({player:new THREE.Vector3(-50,1.65,0)});
  close(camera.position.x,-49.5);close(camera.position.z,2.7);
});

test('release smoothing is stable across frame rates and clamps a long paused frame',()=>{
  const a=fixture([{minX:-5,maxX:5,minZ:1.4,maxZ:2}]);
  const b=fixture([{minX:-5,maxX:5,minZ:1.4,maxZ:2}]);
  const c=fixture([{minX:-5,maxX:5,minZ:1.4,maxZ:2}]);
  for(const f of [a,b,c]){f.step();f.station.collidersByFloor['1F']=[];}
  a.step({dt:.1});b.step({dt:.05});b.step({dt:.05});c.step({dt:30});
  close(a.controller.distance,b.controller.distance);close(a.controller.distance,c.controller.distance);
  assert.ok(a.controller.distance<Math.hypot(.5,2.7));
});

test('inactive mode restores the first person pose and fades a too-close self avatar',()=>{
  const {camera,step,controller}=fixture([{minX:-5,maxX:5,minZ:.5,maxZ:1}]);
  const closeWall=step();assert.ok(closeWall.avatarOpacity<1);
  step({active:false,yaw:.7,pitch:.2});
  assert.deepEqual(camera.position.toArray(),player.toArray());
  close(camera.rotation.x,.2);close(camera.rotation.y,.7);close(controller.distance,0);
  const clear=step({floor:'B1F'});close(clear.avatarOpacity,1);
});
