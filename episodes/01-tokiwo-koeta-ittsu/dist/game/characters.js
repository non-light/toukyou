import * as THREE from '../vendor/three.module.js';
import {insideFloor} from '../floor-layout.js?v=game1';

// NPCs belong to separate scene groups. They never change station geometry,
// route data or colliders, so removing the layer restores the copied walk scene.
export function createCharacterLayer({station,zones,isAllowed,reducedMotion=false}={}){
 if(!station?.floorGroups||!Array.isArray(zones))throw new Error('登場人物を置く駅のデータがありません。');
 const zoneMap=new Map(zones.map(zone=>[zone.id,zone])),geometries=new Set(),materials=new Set(),shirts=new Map();
 let items=[],disposed=false,elapsed=0;
 const ownGeometry=geometry=>(geometries.add(geometry),geometry);
 const material=(color,roughness=.76)=>{const value=new THREE.MeshStandardMaterial({color,roughness});materials.add(value);return value;};
 const box=ownGeometry(new THREE.BoxGeometry(1,1,1));
 const limb=ownGeometry(new THREE.CylinderGeometry(.074,.083,.58,8));
 const leg=ownGeometry(new THREE.CylinderGeometry(.079,.075,.65,8));
 const head=ownGeometry(new THREE.SphereGeometry(.235,14,10));
 const hand=ownGeometry(new THREE.SphereGeometry(.083,8,6));
 const eye=ownGeometry(new THREE.SphereGeometry(.022,6,5));
 const hair=ownGeometry(new THREE.SphereGeometry(.244,14,8,0,Math.PI*2,0,Math.PI*.52));
 const ring=ownGeometry(new THREE.RingGeometry(.31,.39,24));
 const skin=material('#c7a081'),hairMat=material('#403c35'),pants=material('#48525c'),shoes=material('#313a3f'),features=material('#242b29');
 const marker=new THREE.MeshBasicMaterial({color:'#e7cf7e',transparent:true,opacity:.35,side:THREE.DoubleSide,depthWrite:false});materials.add(marker);
 function mesh(parent,geometry,mat,x,y,z,sx=1,sy=1,sz=1){const value=new THREE.Mesh(geometry,mat);value.position.set(x,y,z);value.scale.set(sx,sy,sz);value.receiveShadow=true;parent.add(value);return value;}
 const clear=(x,z,floor)=>{
  const allowed=isAllowed??((px,pz,pf)=>insideFloor(px,pz,pf)&&!(station.collidersByFloor?.[pf]??[]).some(c=>px>c.minX-.27&&px<c.maxX+.27&&pz>c.minZ-.27&&pz<c.maxZ+.27));
  return [[0,0],[.32,.25],[.32,-.25],[-.32,.25],[-.32,-.25]].every(([dx,dz])=>insideFloor(x+dx,z+dz,floor)&&allowed(x+dx,z+dz,floor));
 };
 function choosePosition(zone,occupied){
  for(const radius of [1.8,2.5,3.3,4.2,5.2,6.4])for(let index=0;index<24;index++){
   const angle=index*Math.PI*2/24,x=zone.x+Math.cos(angle)*radius,z=zone.z+Math.sin(angle)*radius;
   if(clear(x,z,zone.floor)&&occupied.every(other=>other.floor!==zone.floor||Math.hypot(other.x-x,other.z-z)>1.05))return {x,z};
  }
  if(clear(zone.x,zone.z,zone.floor)&&occupied.every(other=>other.floor!==zone.floor||Math.hypot(other.x-zone.x,other.z-zone.z)>1.05))return {x:zone.x,z:zone.z};
  throw new Error(zone.title+'の近くに人物を置く場所がありません。別の場所を選んでください。');
 }
 function buildCharacter(character,zone,position,index){
  const group=new THREE.Group();group.name='登場人物 / '+character.name;group.userData={characterId:character.id,zoneId:zone.id,gameCharacter:true};group.position.set(position.x,0,position.z);group.rotation.y=Math.atan2(zone.x-position.x,zone.z-position.z);
  const color=character.color??'#789074';let shirt=shirts.get(color);if(!shirt){shirt=material(color);shirts.set(color,shirt);}
  const ground=mesh(group,ring,marker,0,.015,0);ground.rotation.x=-Math.PI/2;
  mesh(group,box,shirt,0,1.14,0,.43,.62,.26);
  mesh(group,box,pants,0,.785,0,.38,.13,.25);
  for(const side of [-1,1]){
   mesh(group,leg,pants,side*.115,.415,0);
   mesh(group,box,shoes,side*.115,.065,.055,.17,.12,.29);
   const arm=mesh(group,limb,shirt,side*.29,1.1,0);arm.rotation.z=side*.10;
   mesh(group,hand,skin,side*.32,.79,0);
  }
  mesh(group,box,skin,0,1.51,0,.135,.18,.13);
  mesh(group,head,skin,0,1.755,0);
  mesh(group,hair,hairMat,0,1.76,-.008);
  for(const side of [-1,1])mesh(group,eye,features,side*.077,1.79,.213);
  mesh(group,box,features,0,1.665,.225,.065,.012,.012);
  const floorGroup=station.floorGroups[zone.floor];
  return {id:character.id,name:character.name,zoneId:zone.id,floor:zone.floor,x:position.x,z:position.z,headY:floorGroup.position.y+2.42,object:group,phase:index*.77};
 }
 function setCharacters(characters){
  if(disposed)throw new Error('この登場人物レイヤーは終了しています。');
  if(!Array.isArray(characters)||characters.length>20)throw new Error('登場人物は20人以内にしてください。');
  const ids=new Set(),plans=[];
  for(const character of characters){
   if(!character||typeof character.id!=='string'||ids.has(character.id))throw new Error('登場人物のIDを確認してください。');
   ids.add(character.id);const zone=zoneMap.get(character.zoneId);if(!zone||!station.floorGroups[zone.floor])throw new Error('登場人物の場所が見つかりません。');
   plans.push({character,zone,...choosePosition(zone,plans.map(item=>({x:item.x,z:item.z,floor:item.zone.floor})))});
  }
  // Plan all positions first, so an invalid replacement leaves the old layer.
  const next=plans.map((plan,index)=>buildCharacter(plan.character,plan.zone,{x:plan.x,z:plan.z},index));
  for(const item of items)item.object.removeFromParent();
  items=next;
  for(const item of items)station.floorGroups[item.floor].add(item.object);
  const usedColors=new Set(characters.map(character=>character.color??'#789074'));
  for(const [color,mat] of shirts)if(!usedColors.has(color)){mat.dispose();materials.delete(mat);shirts.delete(color);}
  return items;
 }
 return {setCharacters,get items(){return items.map(item=>({...item}));},update(dt=0){if(disposed)return;elapsed+=Number.isFinite(dt)?Math.max(0,dt):0;for(const item of items)item.object.position.y=reducedMotion?0:Math.sin(elapsed*1.6+item.phase)*.009;},dispose(){if(disposed)return;disposed=true;for(const item of items)item.object.removeFromParent();items=[];materials.forEach(mat=>mat.dispose());geometries.forEach(geometry=>geometry.dispose());materials.clear();geometries.clear();shirts.clear();}};
}
