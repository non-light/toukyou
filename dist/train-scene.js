import * as THREE from './vendor/three.module.js';
import {FLOOR_AREAS,FLOOR_ZONES} from './floor-layout.js?v=6';
import {TRAIN_SERVICES} from './train-data.js?v=6';

// Stationary representative rolling stock for the schematic platform islands.
// Bodies, bogies, doors and windows share geometry and are instanced per train.
export function addStationTrains(building){
  const trains=[],geometries=new Set(),materials=new Set(),textures=new Set(),cache=new Map();let disposed=false;
  const ownGeo=g=>(geometries.add(g),g),ownMat=m=>(materials.add(m),m);
  const unit=ownGeo(new THREE.BoxGeometry(1,1,1)),wheelGeo=ownGeo(new THREE.CylinderGeometry(.24,.24,.15,12)),planeGeo=ownGeo(new THREE.PlaneGeometry(1,1));
  const paint=(color,roughness=.46,metalness=.15)=>ownMat(new THREE.MeshStandardMaterial({color,roughness,metalness}));
  const silver=paint('#c3cbcc',.32,.65),roof=paint('#a8b4b8',.5,.45),under=paint('#263138',.68,.45),wheelMat=paint('#3f4c52',.3,.72),doorSilver=paint('#c8d0d0',.38,.6);
  const glass=paint('#15323d',.17,.42);glass.side=THREE.DoubleSide;
  const headlight=ownMat(new THREE.MeshBasicMaterial({color:'#fff3c6'})),tailLight=ownMat(new THREE.MeshBasicMaterial({color:'#e65c52'}));
  function box(parent,w,h,d,x,y,z,m,ry=0){const o=new THREE.Mesh(unit,m);o.scale.set(w,h,d);o.position.set(x,y,z);o.rotation.y=ry;o.receiveShadow=true;parent.add(o);return o;}
  function plane(parent,w,h,x,y,z,m,ry=0){const o=new THREE.Mesh(planeGeo,m);o.scale.set(w,h,1);o.position.set(x,y,z);o.rotation.y=ry;parent.add(o);return o;}
  function ledMaterial(service){const c=document.createElement('canvas');c.width=512;c.height=96;const ctx=c.getContext('2d');ctx.fillStyle='#102321';ctx.fillRect(0,0,512,96);ctx.fillStyle='#e4f1c6';ctx.textBaseline='middle';ctx.textAlign='center';let size=40;while(size>15){ctx.font=`500 ${size}px sans-serif`;if(ctx.measureText(service.label).width<480)break;size-=2;}ctx.fillText(service.label,256,49);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;textures.add(t);return ownMat(new THREE.MeshBasicMaterial({map:t}));}
  // Rounded section with two horizontal paint-band edges. Face indices are
  // grouped by material so each carriage body uses at most three draw calls.
  function section(r){const {z,w,top,bottom=.46}=r,h=top-bottom,lo=bottom+h*.24,hi=bottom+h*.315,shoulder=bottom+h*.87;return [[-w,bottom,z],[w,bottom,z],[w,lo,z],[w,hi,z],[w,shoulder,z],[w*.88,top-.07,z],[w*.55,top,z],[-w*.55,top,z],[-w*.88,top-.07,z],[-w,shoulder,z],[-w,hi,z],[-w,lo,z]];}
  function bodyGeometry(style,head=false){
    const key=`${style}:${head}`;if(cache.has(key))return cache.get(key);
    let rings=[{z:-6.8,w:1.49,top:3.15},{z:6.8,w:1.49,top:3.15}];
    const fast=['n700','e5','e7'].includes(style);
    if(fast){rings=[{z:-6.8,w:1.55,top:3.25},{z:6.8,w:1.55,top:3.25}];
      if(head&&style==='n700')rings=[{z:-6.8,w:1.55,top:3.25},{z:-.7,w:1.55,top:3.25},{z:2.4,w:1.38,top:2.6},{z:5.2,w:.83,top:1.35},{z:6.8,w:.12,top:.83,bottom:.62}];
      if(head&&style==='e7')rings=[{z:-6.8,w:1.55,top:3.38},{z:-1.9,w:1.55,top:3.38},{z:1,w:1.38,top:3.0},{z:4.3,w:.83,top:1.95},{z:6.8,w:.09,top:.93,bottom:.62}];
      if(head&&style==='e5')rings=[{z:-6.8,w:1.55,top:3.25},{z:-3.7,w:1.55,top:3.25},{z:-.5,w:1.27,top:2.7},{z:3,w:.72,top:1.55},{z:6.8,w:.055,top:.76,bottom:.6}];
    }
    const vertices=rings.flatMap(r=>section(r).flat()),indices=[[],[],[]],n=12;
    for(let r=0;r<rings.length-1;r++)for(let j=0;j<n;j++){const a=r*n+j,b=r*n+(j+1)%n,c=(r+1)*n+(j+1)%n,d=(r+1)*n+j;let m=0;if(fast&&(j===2||j===10))m=2;else if(fast&&j>=3&&j<=9)m=1;indices[m].push(a,b,c,a,c,d);}
    const back=vertices.length/3;vertices.push(0,(rings[0].top+.46)/2,rings[0].z);const front=vertices.length/3;vertices.push(0,(rings.at(-1).top+(rings.at(-1).bottom??.46))/2,rings.at(-1).z);
    for(let j=0;j<n;j++){indices[0].push(back,(j+1)%n,j);const offset=(rings.length-1)*n;indices[0].push(front,offset+j,offset+(j+1)%n);}
    const g=ownGeo(new THREE.BufferGeometry());g.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));let offset=0,all=[];indices.forEach((list,i)=>{if(list.length){g.addGroup(offset,list.length,i);all.push(...list);offset+=list.length;}});g.setIndex(all);g.computeVertexNormals();cache.set(key,g);return g;
  }
  function windshieldGeometry(style){const key=`windshield-${style}`;if(cache.has(key))return cache.get(key);const rear=style==='e5'?-3.1:style==='e7'?-1.15:-.05,front=rear+1.25,yRear=style==='e7'?3.32:style==='e5'?3.19:3.16,yFront=style==='e7'?3.16:style==='e5'?2.98:2.91;const g=ownGeo(new THREE.BufferGeometry());g.setAttribute('position',new THREE.Float32BufferAttribute([-1.03,yRear,rear,1.03,yRear,rear,.86,yFront,front,-.86,yFront,front],3));g.setIndex([0,1,2,0,2,3]);g.computeVertexNormals();cache.set(key,g);return g;}
  function bogies(parent,fast){
    box(parent,2.47,.23,fast?11.8:12.4,0,.38,0,under);
    for(const z of [-4.45,4.45]){box(parent,1.9,.28,1.7,0,.13,z,under);for(const axle of [-.48,.48])for(const side of [-1,1]){const wheel=new THREE.Mesh(wheelGeo,wheelMat);wheel.rotation.z=Math.PI/2;wheel.position.set(side*1.23,.115,z+axle);parent.add(wheel);}}
  }
  function commuterCar(parent,service,{cab=false,front=false,band,accent,led}){
    parent.add(new THREE.Mesh(bodyGeometry('commuter'),[silver,silver,silver]));bogies(parent,false);
    for(const side of [-1,1]){
      box(parent,.024,.98,12.9,side*1.505,2.17,0,glass);
      for(let z=-6.1;z<=6.2;z+=1.35)box(parent,.028,1,.07,side*1.524,2.17,z,doorSilver);
      for(const z of [-5.1,-1.7,1.7,5.1]){box(parent,.033,2.28,1.14,side*1.53,1.66,z,service.style==='yamanote'?band:doorSilver);box(parent,.037,.8,.91,side*1.552,2.22,z,glass);box(parent,.04,2.2,.018,side*1.557,1.64,z,under);}
      if(service.style!=='yamanote'){box(parent,.04,.25,13.03,side*1.555,1.22,0,band);box(parent,.042,.15,13.03,side*1.558,.98,0,accent);}
      plane(parent,1.25,.24,side*1.585,2.92,2.4,led,side*Math.PI/2);
    }
    for(const z of [-3.8,3.8]){box(parent,1.8,.2,1.9,0,3.28,z,roof);for(let v=-.6;v<=.6;v+=.3)box(parent,1.6,.018,.045,0,3.39,z+v,under);}
    if(cab){
      box(parent,2.68,1.58,.045,0,2.29,6.826,glass);box(parent,2.78,.23,.052,0,1.34,6.835,band);plane(parent,1.65,.23,0,2.93,6.86,led);
      for(const x of [-.93,.93])box(parent,.35,.13,.06,x,.94,6.85,front?headlight:tailLight);
      box(parent,.12,.55,.04,.5,2.09,6.862,under);box(parent,1.42,.1,.25,0,.48,6.78,under);
    }
  }
  function fastCar(parent,service,{cab=false,front=false,bodyMats,band,accent,led}){
    parent.add(new THREE.Mesh(bodyGeometry(service.style,cab),bodyMats));bogies(parent,true);
    const end=cab?(service.style==='e5'?-4.2:service.style==='e7'?-2.5:-1.3):6.3;
    for(const side of [-1,1]){
      for(let z=-5.8;z<end;z+=1.45){box(parent,.025,.61,.83,side*1.557,2.22,z,glass);}
      for(const z of cab?[-5.95]:[-5.95,5.95]){box(parent,.026,2.2,.64,side*1.567,1.59,z,bodyMats[0]);box(parent,.029,.52,.43,side*1.585,2.23,z,glass);box(parent,.033,.02,.62,side*1.588,.52,z,roof);}
      if(service.style==='n700')box(parent,.027,.08,cab?5:12.7,side*1.571,.86,cab?-4:0,band);
      if(!cab)plane(parent,1.3,.22,side*1.589,2.85,3.9,led,side*Math.PI/2);
    }
    box(parent,1.6,.15,cab?3.8:10.8,0,3.29,cab?-4.6:0,roof);
    if(cab){
      parent.add(new THREE.Mesh(windshieldGeometry(service.style),glass));
      const z=service.style==='e5'?4.7:4.35,y=service.style==='e5'?1.25:service.style==='e7'?1.98:1.78,x=service.style==='e5'?.22:.6;
      for(const side of [-1,1])box(parent,service.style==='e5'?.22:.3,.1,.08,side*x,y,z,front?headlight:tailLight);
    }
  }
  function batch(train){
    train.updateWorldMatrix(true,true);const inverse=train.matrixWorld.clone().invert(),batches=new Map();train.traverse(o=>{if(!o.isMesh)return;const materialKey=Array.isArray(o.material)?o.material.map(m=>m.uuid).join(','):o.material.uuid,key=o.geometry.uuid+':'+materialKey;if(!batches.has(key))batches.set(key,[]);batches.get(key).push(o);});
    for(const meshes of batches.values())if(meshes.length>1){const instanced=new THREE.InstancedMesh(meshes[0].geometry,meshes[0].material,meshes.length);instanced.receiveShadow=true;meshes.forEach((o,i)=>{instanced.setMatrixAt(i,inverse.clone().multiply(o.matrixWorld));o.removeFromParent();});instanced.instanceMatrix.needsUpdate=true;instanced.computeBoundingSphere();train.add(instanced);}
  }
  for(const service of TRAIN_SERVICES){
    const zone=FLOOR_ZONES.find(z=>z.id===service.zoneId),area=FLOOR_AREAS[service.floor].find(a=>zone.x>=a.minX&&zone.x<=a.maxX&&zone.z>=a.minZ&&zone.z<=a.maxZ),ns=service.orientation==='ns';
    const train=new THREE.Group();train.name=`${service.label} ${service.model}`;train.userData={train:true,serviceId:service.id,zoneId:service.zoneId,model:service.model,cars:service.cars,stationary:true};
    train.position.set(ns?area.minX-2.1:(area.minX+area.maxX)/2,0,ns?(area.minZ+area.maxZ)/2:area.minZ-2.1);if(!ns)train.rotation.y=Math.PI/2;building.floorGroups[service.floor].add(train);
    const band=paint(service.color,.4,.25),accent=paint(service.accentColor,.4,.25),body=paint(service.bodyColor,.31,.22),upper=paint(service.style==='e5'||service.style==='e7'?service.color:service.bodyColor,.32,.2),led=ledMaterial(service),fast=['n700','e5','e7'].includes(service.style),bodyMats=[body,upper,accent];
    for(let car=0;car<service.cars;car++){
      const cg=new THREE.Group();cg.name=`${car+1}号車`;cg.userData.car=car+1;cg.position.z=(car-(service.cars-1)/2)*14.4;const cab=car===0||car===service.cars-1;if(car===0)cg.rotation.y=Math.PI;train.add(cg);
      if(fast)fastCar(cg,service,{cab,front:car===service.cars-1,bodyMats,band,accent,led});else commuterCar(cg,service,{cab,front:car===service.cars-1,band,accent,led});
      if(car<service.cars-1)box(train,1.8,1.8,.55,0,1.53,cg.position.z+7.2,under);
    }
    batch(train);train.updateWorldMatrix(true,true);const bounds3=new THREE.Box3().setFromObject(train),bounds={minX:bounds3.min.x,maxX:bounds3.max.x,minY:bounds3.min.y,maxY:bounds3.max.y,minZ:bounds3.min.z,maxZ:bounds3.max.z};
    trains.push({id:service.id,zoneId:service.zoneId,serviceId:service.id,floor:service.floor,model:service.model,label:service.label,platformLabel:service.platformLabel,cars:service.cars,orientation:service.orientation,bounds,group:train,stationary:true});
  }
  return {trains,services:TRAIN_SERVICES,dispose(){if(disposed)return;disposed=true;for(const t of trains)t.group.removeFromParent();textures.forEach(t=>t.dispose());materials.forEach(m=>m.dispose());geometries.forEach(g=>g.dispose());}};
}
