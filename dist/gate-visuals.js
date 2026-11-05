import * as THREE from './vendor/three.module.js';
import {GATES} from './station-guide-data.js?v=6';

// Automatic animated flaps decorate the model's existing center lanes. They
// deliberately add no collision: the original gate posts remain the physical
// boundary and the flaps are fully open before the player reaches them.
export function addGateVisuals(building){
  const layers=new Map(),doors=[],textures=[],materials=[],geometries=[];
  const unit=new THREE.BoxGeometry(1,1,1);geometries.push(unit);
  const metal=new THREE.MeshStandardMaterial({color:'#9cadad',roughness:.28,metalness:.7});materials.push(metal);
  const panelMat=new THREE.MeshStandardMaterial({color:'#273a3d',roughness:.5});materials.push(panelMat);
  function layer(floor){if(!layers.has(floor)){const g=new THREE.Group();g.name=`Animated ticket gates ${floor}`;building.floorGroups[floor].add(g);layers.set(floor,g);}return layers.get(floor);}
  function box(parent,w,h,d,x,y,z,material){const o=new THREE.Mesh(unit,material);o.scale.set(w,h,d);o.position.set(x,y,z);parent.add(o);return o;}
  function boardTexture(gate){
    const c=document.createElement('canvas');c.width=1024;c.height=240;const ctx=c.getContext('2d');ctx.fillStyle='#223438';ctx.fillRect(0,0,1024,240);ctx.fillStyle=gate.color;ctx.fillRect(0,0,16,240);ctx.textAlign='center';ctx.textBaseline='middle';
    const title=gate.kind==='transfer'?(gate.group==='east'?'JR東日本 新幹線':'東海道・山陽新幹線'):gate.title;
    const second=gate.kind==='transfer'?`${gate.title.replace(/^(JR東日本 新幹線|東海道・山陽新幹線)\s*/, '')} / ${gate.group==='east'?'20〜23番線':'14〜19番線'}`:`${gate.floor} / ${gate.group==='keiyo'?'KEIYO GATE':'LOCAL TRAIN GATE'}`;
    for(const [i,text] of [title,second].entries()){let size=i===0?62:48;while(size>18){ctx.font=`${i===0?500:400} ${size}px sans-serif`;if(ctx.measureText(text).width<940)break;size-=2;}ctx.fillStyle=i===0?gate.color:'#eff5ed';ctx.fillText(text,512,i===0?67:174);}
    const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;textures.push(t);return t;
  }
  for(const gate of GATES){
    if(!building.floorGroups[gate.floor])continue;
    const parent=layer(gate.floor),bank=new THREE.Group();bank.position.set(gate.x,0,gate.z);bank.rotation.y=gate.axis==='x'?Math.PI/2:0;bank.name=gate.id;parent.add(bank);
    const leafMat=new THREE.MeshStandardMaterial({color:gate.color,roughness:.24,metalness:.16,transparent:true,opacity:.8,emissive:gate.color,emissiveIntensity:.12});materials.push(leafMat);
    const pivots=[];
    for(const side of [-1,1]){
      const pivot=new THREE.Group();pivot.position.set(side*1.18,.57,0);bank.add(pivot);box(pivot,1.14,.66,.047,-side*.57,0,0,leafMat);pivots.push({pivot,side});box(bank,.12,.86,.18,side*1.18,.46,0,metal);
    }
    // Shinkansen and Keiyo B2 banks already have centered compact repeaters.
    // Reuse them instead of overlapping another board on the same sign plane.
    if(gate.kind!=='transfer'&&gate.floor!=='B2F'){
      const y=gate.floor==='B1F'?3.35:2.38,h=gate.floor==='B1F'?.5:.66;
      box(bank,2.86,h,.1,0,y,0,panelMat);
      const t=boardTexture(gate),m=new THREE.MeshBasicMaterial({map:t});materials.push(m);
      const geo=new THREE.PlaneGeometry(2.78,h-.08);geometries.push(geo);
      for(const side of [-1,1]){const face=new THREE.Mesh(geo,m);face.position.set(0,y,side*.057);if(side<0)face.rotation.y=Math.PI;bank.add(face);}
    }
    doors.push({gate,pivots,angle:0,opened:false});
  }
  function update(player,floor,dt=.016){
    const position=player?.position??player;if(!position)return;const step=Math.min(.1,Math.max(0,Number.isFinite(dt)?dt:.016));
    for(const door of doors){
      const {gate}=door;
      if(gate.floor!==floor){door.opened=false;door.angle=0;for(const {pivot}of door.pivots)pivot.rotation.y=0;continue;}
      const tangent=gate.axis==='x'?'z':'x',axial=Math.abs(position[gate.axis]-gate[gate.axis]),lateral=Math.abs(position[tangent]-gate[tangent]);
      if(axial<4.6&&lateral<2.6)door.opened=true;else if(axial>5.5||lateral>3.3)door.opened=false;
      const target=door.opened?Math.PI*.48:0;door.angle+=(target-door.angle)*(1-Math.exp(-step*16));
      for(const {pivot,side}of door.pivots)pivot.rotation.y=-side*door.angle;
    }
  }
  return {update,dispose(){for(const g of layers.values())g.removeFromParent();textures.forEach(t=>t.dispose());materials.forEach(m=>m.dispose());geometries.forEach(g=>g.dispose());}};
}
