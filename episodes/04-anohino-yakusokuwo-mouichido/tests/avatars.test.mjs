import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as THREE from '../dist/vendor/three.module.js';
import {AVATARS} from '../dist/game/avatar-catalog.js';
import {parseAvatarBuffer,createAvatarFromTemplate} from '../dist/game/avatar-layer.js';

const templates=await Promise.all(AVATARS.map(async avatar=>{
  const bytes=readFileSync(new URL('../dist/game/avatars/'+avatar.file,import.meta.url));
  const buffer=bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength);
  return parseAvatarBuffer(buffer);
}));

test('all four downloaded avatars parse as colored, self-contained animated models at station scale',()=>{
  const colors=new Set();
  for(const [i,template] of templates.entries()){
    const avatar=AVATARS[i],actor=createAvatarFromTemplate(template,avatar.id);
    const bounds=new THREE.Box3().setFromObject(actor.object),size=bounds.getSize(new THREE.Vector3());
    assert.ok(Math.abs(bounds.min.y)<.0001,'Feet must stand on the station floor');
    assert.ok(Math.abs(size.y-1.814)<.005);
    assert.ok(size.x<.8&&size.z<.55,'A traveler must fit the existing passages');
    assert.deepEqual(template.animations.map(clip=>clip.name),['Idle','Walk','Run']);
    const torso=actor.object.getObjectByName('Torso');
    assert.ok(torso.isMesh&&torso.material.vertexColors);
    const color=torso.geometry.getAttribute('color');
    const hex='#'+new THREE.Color(color.getX(0),color.getY(0),color.getZ(0)).getHexString();
    assert.equal(hex,avatar.color);colors.add(hex);
    let meshes=0;
    actor.object.traverse(node=>{if(node.isMesh){meshes++;assert.equal(node.isSkinnedMesh,undefined);assert.equal(node.material.map,null);}});
    assert.ok(meshes>=6);assert.equal(actor.object.userData.avatarId,avatar.id);
    actor.dispose();
  }
  assert.equal(colors.size,4);
});

test('players animate independently without moving the shared template or their world position',()=>{
  const template=templates[0],first=createAvatarFromTemplate(template,'red'),second=createAvatarFromTemplate(template,'red');
  first.object.position.set(34,-6,10);second.object.position.set(2,-6,-3);
  const firstArm=first.object.getObjectByName('LeftArm'),secondArm=second.object.getObjectByName('LeftArm');
  const templateArm=template.scene.getObjectByName('LeftArm');
  const idleArm=secondArm.quaternion.clone(),templatePose=templateArm.quaternion.clone();
  first.setMotion('Walk',0);for(let i=0;i<4;i++)first.update(.1);
  assert.ok(!firstArm.quaternion.equals(idleArm),'Walking must move the limbs');
  assert.ok(secondArm.quaternion.equals(idleArm),'Another player must keep their pose');
  assert.ok(templateArm.quaternion.equals(templatePose),'Cached template must stay immutable');
  assert.deepEqual(first.object.position.toArray(),[34,-6,10]);
  assert.deepEqual(second.object.position.toArray(),[2,-6,-3]);
  first.setMotion('Run',0);first.update(.1);assert.equal(first.motion,'Run');
  first.setMotion('Idle',0);first.update(.1);assert.equal(first.motion,'Idle');
  first.dispose();second.dispose();
});

test('disposing one player preserves shared assets and the animations of another player',()=>{
  const first=createAvatarFromTemplate(templates[1],'blue'),second=createAvatarFromTemplate(templates[1],'blue');
  const a=first.object.getObjectByName('Torso'),b=second.object.getObjectByName('Torso');
  assert.equal(a.geometry,b.geometry);assert.equal(a.material,b.material);
  let disposedGeometry=0,disposedMaterial=0;
  a.geometry.addEventListener('dispose',()=>disposedGeometry++);a.material.addEventListener('dispose',()=>disposedMaterial++);
  const scene=new THREE.Scene();scene.add(first.object,second.object);
  first.dispose();first.dispose();
  assert.equal(first.object.parent,null);assert.equal(second.object.parent,scene);
  assert.equal(disposedGeometry,0);assert.equal(disposedMaterial,0);
  second.setMotion('Walk',0);for(let i=0;i<3;i++)second.update(.1);
  assert.equal(second.motion,'Walk');assert.ok(second.object.getObjectByName('LeftArm').rotation.x!==0);
  second.dispose();
});

test('invalid motion input and missing clips fall back safely while malformed models are rejected',()=>{
  const actor=createAvatarFromTemplate(templates[2],'green');
  actor.setMotion(null);assert.equal(actor.motion,'Idle');
  actor.setMotion('walk');assert.equal(actor.motion,'Walk');
  assert.doesNotThrow(()=>{actor.update(NaN);actor.update(-1);actor.update(Infinity);});
  actor.dispose();assert.doesNotThrow(()=>{actor.setMotion('Run');actor.update(.1);});
  const staticActor=createAvatarFromTemplate({...templates[3],animations:[]},'yellow');
  assert.doesNotThrow(()=>{staticActor.setMotion('Run');staticActor.update(.1);staticActor.dispose();});
  assert.throws(()=>createAvatarFromTemplate({},'red'),/人物の3Dデータ/);
});

test('camera-near opacity clones lazily and never fades another player or the template',()=>{
  const template=templates[0],near=createAvatarFromTemplate(template,'red'),other=createAvatarFromTemplate(template,'red');
  const source=template.scene.getObjectByName('Torso').material;
  near.setOpacity(1);
  assert.equal(near.object.getObjectByName('Torso').material,source,'Unfaded players must keep shared resources');
  near.setOpacity(.3);
  const faded=near.object.getObjectByName('Torso').material;
  assert.notEqual(faded,source);assert.equal(faded.opacity,.3);assert.equal(faded.transparent,true);assert.equal(faded.depthWrite,false);
  const copies=new Set();near.object.traverse(node=>{if(node.isMesh)copies.add(node.material);});
  assert.equal(copies.size,1,'All meshes using one source must reuse its private copy');
  assert.equal(other.object.getObjectByName('Torso').material,source);
  assert.equal(source.opacity,1);assert.equal(source.transparent,false);assert.equal(source.depthWrite,true);
  near.setOpacity(.6);assert.equal(near.object.getObjectByName('Torso').material,faded);
  near.setOpacity(1);assert.equal(faded.opacity,1);assert.equal(faded.transparent,false);assert.equal(faded.depthWrite,true);
  near.setOpacity(-2);assert.equal(faded.opacity,0);
  near.setOpacity(2);assert.equal(faded.opacity,1);
  near.setOpacity(NaN);assert.equal(near.opacity,1);assert.equal(faded.opacity,1);
  near.setOpacity(-Infinity);assert.equal(faded.opacity,0);
  near.setOpacity(Infinity);assert.equal(faded.opacity,1);
  let ownedDisposals=0,sharedDisposals=0;
  faded.addEventListener('dispose',()=>ownedDisposals++);source.addEventListener('dispose',()=>sharedDisposals++);
  near.dispose();near.dispose();
  assert.equal(ownedDisposals,1);assert.equal(sharedDisposals,0);
  other.setMotion('Walk');other.update(.1);assert.equal(other.motion,'Walk');
  assert.doesNotThrow(()=>near.setOpacity(.2));other.dispose();assert.equal(sharedDisposals,0);
});

test('opacity restores original transparent and depth-write settings for material arrays',()=>{
  const glass=new THREE.MeshStandardMaterial({transparent:true,opacity:.65,depthWrite:false});
  const solid=new THREE.MeshStandardMaterial({opacity:.9,transparent:false,depthWrite:true});
  const geometry=new THREE.BoxGeometry(.2,.2,.2),scene=new THREE.Group();
  const mesh=new THREE.Mesh(geometry,[glass,solid]);scene.add(mesh);
  const actor=createAvatarFromTemplate({scene,animations:[]},'blue');
  actor.setOpacity(.5);
  const [fadedGlass,fadedSolid]=actor.object.children[0].children[0].material;
  assert.equal(fadedGlass.opacity,.325);assert.equal(fadedSolid.opacity,.45);
  assert.equal(fadedGlass.transparent,true);assert.equal(fadedSolid.transparent,true);
  assert.equal(fadedGlass.depthWrite,false);assert.equal(fadedSolid.depthWrite,false);
  actor.setOpacity(1);
  assert.equal(fadedGlass.opacity,.65);assert.equal(fadedGlass.transparent,true);assert.equal(fadedGlass.depthWrite,false);
  assert.equal(fadedSolid.opacity,.9);assert.equal(fadedSolid.transparent,false);assert.equal(fadedSolid.depthWrite,true);
  assert.equal(glass.opacity,.65);assert.equal(solid.opacity,.9);
  actor.dispose();geometry.dispose();glass.dispose();solid.dispose();
});
