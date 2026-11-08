import * as THREE from './vendor/three.module.js';
import {createStationScene} from './scene.js?v=game1';
import {FLOORS,FLOOR_AREAS,FLOOR_ZONES,CONNECTORS,LINE_GROUPS} from './floor-layout.js?v=game1';
import {GROUPS} from './station-layout.js?v=game1';
import {TRAIN_SERVICES} from './train-data.js?v=game1';
import {addStationTrains} from './train-scene.js?v=game1';
import {addStationLandmarks} from './landmark-scene.js?v=game1';

// Separate floor groups are cutaways: sharing a floor number never creates a
// passage between disconnected areas, especially the Keiyo and Sobu buildings.
export function createBuildingScene(){
  const base=createStationScene(),scene=base.scene,floorGroups={},collidersByFloor={},ownedTextures=[],belts=[];
  const groups={...GROUPS,...LINE_GROUPS},lights=[];
  for(const f of FLOORS){const g=new THREE.Group();g.name=`Tokyo Station ${f.id}`;g.position.y=f.elevation;g.userData.floor=f.id;floorGroups[f.id]=g;collidersByFloor[f.id]=f.id==='1F'?base.colliders:[];}
  for(const child of [...scene.children]){if(child.isLight){lights.push({light:child,y:child.position.y,color:child.color.clone()});}else floorGroups['1F'].add(child);}
  for(const g of Object.values(floorGroups))scene.add(g);
  scene.fog=new THREE.Fog('#cbd1cf',110,600);
  const boxGeo=new THREE.BoxGeometry(1,1,1),materials=[];
  function mat(color,roughness=.65,metalness=0){const m=new THREE.MeshStandardMaterial({color,roughness,metalness});materials.push(m);return m;}
  const plaster=mat('#d8ddd7'),cream=mat('#e6ddc8'),steel=mat('#a8b6ba',.3,.65),dark=mat('#29363c',.5,.2),black=mat('#171f25'),white=mat('#edf0e8',.55),wood=mat('#8c7155');
  const lamp=new THREE.MeshBasicMaterial({color:'#f3faf5'}),windowMat=new THREE.MeshBasicMaterial({color:'#c7e0e6'}),accents={};
  for(const [id,g] of Object.entries(groups)){accents[id]=mat(g.color,.45,.1);accents[id].emissive.set(g.color);accents[id].emissiveIntensity=.2;}
  function box(f,w,h,d,x,y,z,m=plaster,ry=0){const o=new THREE.Mesh(boxGeo,m);o.scale.set(w,h,d);o.position.set(x,y,z);o.rotation.y=ry;o.receiveShadow=true;floorGroups[f].add(o);return o;}
  function addCollider(f,x,z,w,d){collidersByFloor[f].push({minX:x-w/2,maxX:x+w/2,minZ:z-d/2,maxZ:z+d/2});}
  function texture(draw,w=1024,h=256){const c=document.createElement('canvas');c.width=w;c.height=h;draw(c.getContext('2d'),w,h);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=4;ownedTextures.push(t);return t;}
  const tileTex=texture((c,w,h)=>{c.fillStyle='#c5c9c1';c.fillRect(0,0,w,h);for(let x=0;x<w;x+=64)for(let y=0;y<h;y+=64){c.fillStyle=`rgb(${198+(x/64+y/64)%3*4},${203+(x/64+y/64)%3*4},${195+(x/64+y/64)%3*4})`;c.fillRect(x+1,y+1,62,62);}},512,512);tileTex.wrapS=tileTex.wrapT=THREE.RepeatWrapping;
  const floorMat=new THREE.MeshStandardMaterial({map:tileTex,roughness:.47,metalness:.04});
  const platformTex=texture((c,w,h)=>{c.fillStyle='#858e90';c.fillRect(0,0,w,h);c.strokeStyle='#707b7e';for(let i=0;i<8;i++){c.beginPath();c.moveTo(i*w/8,0);c.lineTo(i*w/8,h);c.moveTo(0,i*h/8);c.lineTo(w,i*h/8);c.stroke();}},512,512);platformTex.wrapS=platformTex.wrapT=THREE.RepeatWrapping;
  const platformMat=new THREE.MeshStandardMaterial({map:platformTex,roughness:.85});
  const tactile=mat('#d8bd59',.85),trackBed=mat('#424b4f',.9),rail=mat('#8c9698',.24,.85),beltMat=mat('#353f45',.8),rubber=mat('#303839',.85);
  function floor(f,a,platform=false){const x=(a.minX+a.maxX)/2,z=(a.minZ+a.maxZ)/2,w=a.maxX-a.minX,d=a.maxZ-a.minZ;const geo=new THREE.PlaneGeometry(w,d);const uv=geo.getAttribute('uv');for(let i=0;i<uv.count;i++)uv.setXY(i,uv.getX(i)*w/4,uv.getY(i)*d/4);const mesh=new THREE.Mesh(geo,platform?platformMat:floorMat);mesh.rotation.x=-Math.PI/2;mesh.position.set(x,-.015,z);mesh.receiveShadow=true;floorGroups[f].add(mesh);return {x,z,w,d};}
  function sign(f,w,h,x,y,z,lines,color='#d7e0dd',ry=0){
    const t=texture((c,cw,ch)=>{c.fillStyle='#23323a';c.fillRect(0,0,cw,ch);c.fillStyle=color;c.fillRect(0,0,13,ch);c.textAlign='center';c.textBaseline='middle';lines.forEach((line,i)=>{let size=lines.length>2?48:60;while(size>17){c.font=`${i===0?500:400} ${size}px sans-serif`;if(c.measureText(line).width<cw-70)break;size-=2;}c.fillStyle=i===0?color:'#f0f4ed';c.fillText(line,cw/2,(i+.5)*ch/lines.length);});},1024,lines.length>2?360:240);
    box(f,w+.08,h+.08,.09,x,y,z,dark,ry);const p=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({map:t}));p.position.set(x+Math.sin(ry)*.055,y,z+Math.cos(ry)*.055);p.rotation.y=ry;floorGroups[f].add(p);
  }
  function doubleSign(f,w,h,x,y,z,lines,color,ry=0){sign(f,w,h,x,y,z,lines,color,ry);sign(f,w,h,x-Math.sin(ry)*.12,y,z-Math.cos(ry)*.12,lines,color,ry+Math.PI);}
  function boundary(f,a,{platform=false,modern=false}={}){
    const {x,z,w,d}=floor(f,a,platform),height=platform?2.7:3.65;
    if(platform){
      // Platform edges remain open to the tracks. Low curbs mark the boundary
      // and collision keeps visitors off the rails without an opaque side wall.
      for(const xx of [a.minX,a.maxX]){box(f,.13,.16,d,xx,.07,z,dark);addCollider(f,xx,z,.13,d);}
      for(const zz of [a.minZ,a.maxZ]){box(f,w,.16,.13,x,.07,zz,dark);addCollider(f,x,zz,w,.13);}
      if(w<d){for(const xx of [a.minX+.4,a.maxX-.4])box(f,.36,.018,d-.6,xx,.006,z,tactile);for(const xx of [a.minX-2.1,a.maxX+2.1]){box(f,3.4,.12,d+7,xx,-.35,z,trackBed);for(const rr of [-.72,.72])box(f,.095,.15,d+7,xx+rr,-.2,z,rail);}}
      else{for(const zz of [a.minZ+.4,a.maxZ-.4])box(f,w-.6,.018,.36,x,.006,zz,tactile);for(const zz of [a.minZ-2.1,a.maxZ+2.1]){box(f,w+7,.12,3.4,x,-.35,zz,trackBed);for(const rr of [-.72,.72])box(f,w+7,.15,.095,x,-.2,zz+rr,rail);}}
      const canopyY=f==='2F'?4.5:3.8;box(f,w+.3,.16,d+.3,x,canopyY,z,modern?steel:plaster);
      if(w<d){for(let zz=a.minZ+8;zz<a.maxZ;zz+=15){box(f,.18,canopyY,.18,a.minX+1,canopyY/2,zz,steel);addCollider(f,a.minX+1,zz,.18,.18);box(f,.18,canopyY,.18,a.maxX-1,canopyY/2,zz,steel);addCollider(f,a.maxX-1,zz,.18,.18);box(f,w-1,.035,.1,x,canopyY-.14,zz,lamp);}}
      else for(let xx=a.minX+9;xx<a.maxX;xx+=16){box(f,.18,canopyY,.18,xx,canopyY/2,a.minZ+1,steel);addCollider(f,xx,a.minZ+1,.18,.18);box(f,.18,canopyY,.18,xx,canopyY/2,a.maxZ-1,steel);addCollider(f,xx,a.maxZ-1,.18,.18);box(f,.1,.035,d-1,xx,canopyY-.14,z,lamp);}
    }else{
      for(const xx of [a.minX,a.maxX]){box(f,.24,height,d,xx,height/2,z,modern?cream:plaster);box(f,.28,.75,d,xx,.37,z,steel);addCollider(f,xx,z,.24,d);}
      for(const zz of [a.minZ,a.maxZ]){box(f,w,height,.24,x,height/2,zz,modern?cream:plaster);box(f,w,.75,.28,x,.37,zz,steel);addCollider(f,x,zz,w,.24);}
      if(f==='B1F'&&a.minZ<40){
        // Open the underground ceiling above SQUARE ZERO's tall light court.
        const opening={minX:-7,maxX:11,minZ:-28,maxZ:-10};
        for(const panel of [
          {minX:a.minX,maxX:opening.minX,minZ:a.minZ,maxZ:a.maxZ},
          {minX:opening.maxX,maxX:a.maxX,minZ:a.minZ,maxZ:a.maxZ},
          {minX:opening.minX,maxX:opening.maxX,minZ:a.minZ,maxZ:opening.minZ},
          {minX:opening.minX,maxX:opening.maxX,minZ:opening.maxZ,maxZ:a.maxZ}
        ])box(f,panel.maxX-panel.minX,.2,panel.maxZ-panel.minZ,(panel.minX+panel.maxX)/2,height+.08,(panel.minZ+panel.maxZ)/2,white);
        box(f,18,.2,18,2,6.9,-19,white);
        for(const xx of [-7,11])box(f,.16,3.2,18,xx,5.25,-19,plaster);
        for(const zz of [-28,-10])box(f,18,3.2,.16,2,5.25,zz,plaster);
      }else box(f,w,.2,d,x,height+.08,z,white);
      if(d>w){for(let zz=a.minZ+5;zz<a.maxZ;zz+=9)box(f,w-2,.035,.1,x,height-.08,zz,lamp);}
      else for(let xx=a.minX+5;xx<a.maxX;xx+=11)box(f,.1,.035,d-2,xx,height-.08,z,lamp);
    }
    return {x,z,w,d};
  }
  // Construct only the authored islands, preserving the intentionally separated
  // B1F and B4F areas and all ten individual 2F platform islands.
  for(const f of FLOORS.filter(f=>f.id!=='1F'))for(const a of FLOOR_AREAS[f.id]){
    const platform=f.id==='2F'||f.id==='B5F'||f.id==='B4F'&&a.minZ>200;
    boundary(f.id,a,{platform,modern:f.id==='M2F'});
  }
  // Platform naming comes directly from FLOOR_ZONES, including Keiyo B4F and
  // Sobu/Yokosuka B5F rather than treating both underground systems as one.
  for(const zone of FLOOR_ZONES.filter(z=>z.kind==='platform')){
    const a=FLOOR_AREAS[zone.floor].find(a=>zone.x>=a.minX&&zone.x<=a.maxX&&zone.z>=a.minZ&&zone.z<=a.maxZ),ns=(a.maxZ-a.minZ)>(a.maxX-a.minX),color=groups[zone.group]?.color??GROUPS.general.color;
    doubleSign(zone.floor,3.1,.72,zone.x,2.85,zone.z, [zone.title,zone.floor==='2F'?'地上ホーム / PLATFORM':'地下ホーム / PLATFORM'],color,ns?0:Math.PI/2);
    // Additional numbered board at a distance helps visitors recognize direction.
    sign(zone.floor,3.2,.65,ns?zone.x:zone.x+18,2.75,ns?zone.z-18:zone.z,[zone.title,'TOKYO / 東京'],color,ns?Math.PI:Math.PI/2);
  }
  for(const zone of FLOOR_ZONES.filter(z=>z.floor==='M2F')){const color=groups[zone.group]?.color??'#d7c18d';doubleSign('M2F',3.9,.85,zone.x,2.8,zone.z,[zone.title,'連絡階 / INTERMEDIATE FLOOR'],color);}
  // The main B1 concourse is broad and tiled, with underground exit gates and
  // shop windows along the perimeter. It never joins the Keiyo passage on B1F.
  for(const [x,z,ry] of [[-58,-17,Math.PI/2],[60,-18,-Math.PI/2],[60,18,-Math.PI/2]]){
    box('B1F',.8,2.25,7,x,1.2,z,dark);sign('B1F',6,.5,x+(x<0?.5:-.5),2.75,z,['地下街 / SHOPS','TOKYO STATION'], '#e3ce98',ry);for(const zz of [z-2,z,z+2])box('B1F',1.15,.7,1.7,x,.35,zz,wood);
  }
  for(const [x,title] of [[-49,'丸の内地下中央口'],[54,'八重洲地下中央口']]){
    doubleSign('B1F',3.6,.7,x,2.65,0,[title,'地下改札 / UNDERGROUND GATE'],'#d8c089');
    for(const offset of [-3.8,-2,2,3.8]){box('B1F',2.1,.9,.38,x,.48,offset,steel);box('B1F',2.2,.1,.44,x,.97,offset,dark);addCollider('B1F',x,offset,2.2,.44);}
  }
  // Keiyo's long southern connector has two pairs of moving walkways. Ribs and
  // arrows animate in the exact lanes used by walkwayVelocity in floor-layout.
  const arrowTex=texture((c,w,h)=>{c.fillStyle='#343e45';c.fillRect(0,0,w,h);c.strokeStyle='#e7eeee';c.lineWidth=7;c.beginPath();c.moveTo(w*.27,h*.62);c.lineTo(w*.5,h*.34);c.lineTo(w*.73,h*.62);c.stroke();for(let i=0;i<18;i++){c.strokeStyle='#4f5b60';c.lineWidth=1;c.beginPath();c.moveTo(0,i*h/18);c.lineTo(w,i*h/18);c.stroke();}},256,256);arrowTex.wrapS=arrowTex.wrapT=THREE.RepeatWrapping;arrowTex.repeat.set(1,22);
  for(const [start,end] of [[76,142],[172,238]])for(const [x,direction] of [[28,1],[36,-1]]){
    const t=arrowTex.clone();t.needsUpdate=true;ownedTextures.push(t);const m=new THREE.MeshStandardMaterial({map:t,roughness:.8});const p=new THREE.Mesh(new THREE.PlaneGeometry(3.6,end-start),m);p.rotation.x=-Math.PI/2;if(direction>0)p.rotation.z=Math.PI;p.position.set(x,.035,(start+end)/2);floorGroups.B1F.add(p);belts.push({texture:t,direction});
    for(const xx of [x-1.9,x+1.9]){box('B1F',.12,.68,end-start,xx,.34,(start+end)/2,steel);box('B1F',.13,.06,end-start,xx,.72,(start+end)/2,rubber);}
  }
  for(const z of [58,104,157,212,260])doubleSign('B1F',3.8,.78,32,2.6,z,['京葉線・武蔵野線','KEIYO LINE  /  南側・地下ホーム'],LINE_GROUPS.keiyo.color);
  for(const z of [67,157,248])box('B1F',15,.08,.15,32,2.95,z,accents.keiyo);
  // Separate Keiyo B2F exit banks face their own concourse and share no geometry
  // with the Sobu underground concourse several floors and buildings away.
  for(const [x,title] of [[-12,'京葉地下丸の内口'],[48,'京葉地下八重洲口']]){
    doubleSign('B2F',3.6,.75,x,2.65,294,[title,'KEIYO UNDERGROUND GATE'],LINE_GROUPS.keiyo.color,Math.PI/2);
    for(const offset of [-4.5,-2.5,2.5,4.5]){box('B2F',2.1,.9,.4,x,.47,294+offset,steel);box('B2F',2.2,.1,.45,x,.97,294+offset,dark);box('B2F',.04,.15,.25,x+1.1,.6,294+offset,accents.keiyo);addCollider('B2F',x,294+offset,2.3,.5);}
  }
  doubleSign('B2F',4,.75,16,2.75,301,['京葉線 地下コンコース','B2F / KEIYO LINE'],LINE_GROUPS.keiyo.color);
  doubleSign('B3F',4,.75,16,2.75,302,['京葉線 中間コンコース','B3F / ホームはB4F'],LINE_GROUPS.keiyo.color);
  doubleSign('B4F',4,.75,-49,2.75,0,['総武快速線・横須賀線','B4F / ホームはB5F'],LINE_GROUPS.sobu.color);
  // Every connector endpoint gets a visible portal. Coincident endpoints are
  // combined on one frame with all target floor labels, keeping their centers free.
  const endpointGroups=new Map();
  for(const c of CONNECTORS)for(const [point,target] of [[c.a,c.b],[c.b,c.a]]){const key=`${point.floor}:${point.x}:${point.z}`;const item=endpointGroups.get(key)??{...point,links:[]};item.links.push({connector:c,target});endpointGroups.set(key,item);}
  for(const p of endpointGroups.values()){
    const f=p.floor,a=FLOOR_AREAS[f].find(a=>p.x>=a.minX&&p.x<=a.maxX&&p.z>=a.minZ&&p.z<=a.maxZ),wide=(a.maxX-a.minX)>(a.maxZ-a.minZ)*2,ry=wide?Math.PI/2:0,tx=Math.cos(ry),tz=-Math.sin(ry),color=p.z>200||p.floor==='B1F'&&p.z>40?LINE_GROUPS.keiyo.color:p.floor==='B5F'||p.floor==='B4F'&&p.z<100?LINE_GROUPS.sobu.color:'#c1d4df';
    const targets=[...new Set(p.links.map(l=>l.target.floor))].join(' / '),elevator=p.links.every(l=>l.connector.kind==='elevator');
    for(const side of [-1,1])box(f,.075,2.45,.075,p.x+tx*side*1.35,1.23,p.z+tz*side*1.35,steel);
    box(f,2.85,.08,.1,p.x,2.5,p.z,accents[p.z>200?'keiyo':f==='B5F'?'sobu':'general'],ry);
    doubleSign(f,2.8,.62,p.x,2.8,p.z,[`↕ ${targets}`,elevator?'エレベーター / ELEVATOR':'階段・エスカレーター'],color,ry);
    // A flat threshold and edge markers make the explicit-action transfer point
    // legible without putting steps or an elevator shaft in the walking lane.
    box(f,2.25,.014,1.3,p.x,.015,p.z,accents[p.z>200?'keiyo':f==='B5F'?'sobu':'general'],ry);
    const alongX=wide,side=alongX?(p.z+1.9<a.maxZ?1:-1):(p.x+1.9<a.maxX?1:-1),sx=p.x+(alongX?0:side*2.05),sz=p.z+(alongX?side*2.05:0);
    // Small side stair flight or lift cabinet: centerlines and endpoint spawns
    // remain flat; these side suggestions carry no navigation collision.
    if(elevator){box(f,.62,2.15,.85,sx,1.075,sz,steel);box(f,.035,1.8,.66,sx+(alongX?.34:0),.95,sz,windowMat);}
    else for(let step=0;step<5;step++)box(f,alongX?.3:.7,.14*(step+1),alongX?.7:.3,sx+(alongX?(step-2)*.28:0),.07*(step+1),sz+(alongX?0:(step-2)*.28),steel);
  }
  // Batch each floor separately: a selected floor never draws other levels.
  for(const [id,g] of Object.entries(floorGroups)){
    const batches=new Map();for(const o of [...g.children])if(o.isMesh&&!o.isInstancedMesh&&!o.material.transparent){const key=o.geometry.uuid+':'+o.material.uuid;if(!batches.has(key))batches.set(key,[]);batches.get(key).push(o);}
    for(const objects of batches.values())if(objects.length>1){const mesh=new THREE.InstancedMesh(objects[0].geometry,objects[0].material,objects.length);mesh.receiveShadow=true;objects.forEach((o,i)=>{o.updateMatrix();mesh.setMatrixAt(i,o.matrix);g.remove(o);});mesh.instanceMatrix.needsUpdate=true;mesh.computeBoundingSphere();g.add(mesh);}
  }
  let activeFloor='1F';
  function setFloor(id){if(!floorGroups[id])return;activeFloor=id;for(const [key,g] of Object.entries(floorGroups))g.visible=key===id;const elevation=FLOORS.find(f=>f.id===id).elevation;for(const entry of lights){entry.light.position.y=entry.y+elevation;if(entry.light.isHemisphereLight)entry.light.color.set(id==='1F'?'#eef4ff':id==='2F'?'#eef8ff':'#e4f0f3');}scene.background.set(id==='2F'?'#bfdae4':id==='1F'?'#cbd7d7':'#9faeb0');scene.fog.color.set(id==='1F'?'#d5d6ca':id==='2F'?'#cadde0':'#b6c3c3');}
  function setRouteGroup(id){base.setRouteGroup?.(id);for(const [key,m] of Object.entries(accents))m.emissiveIntensity=(!id||id==='all') ? .2 : key===id ? .9 : .04;}
  function update(time,dt){base.update?.(time,dt);if(activeFloor==='B1F')for(const b of belts)b.texture.offset.y=(-time*.28)%1;}
  const hotspots=FLOOR_ZONES.map(z=>{const floor=FLOORS.find(f=>f.id===z.floor);if(z.floor==='1F'){const h=base.hotspots.find(h=>h.id===z.id);return {...z,position:h?.position.clone()??new THREE.Vector3(z.x,floor.elevation+2.6,z.z)};}return {...z,position:new THREE.Vector3(z.x,floor.elevation+2.55,z.z)};});
  setFloor('1F');
  const building={scene,collidersByFloor,hotspots,zones:FLOOR_ZONES,floorGroups,setFloor,setRouteGroup,update,dispose(){base.dispose?.();ownedTextures.forEach(t=>t.dispose());materials.forEach(m=>m.dispose());for(const [id,g] of Object.entries(floorGroups))if(id!=='1F')g.traverse(o=>{o.geometry?.dispose();});}};
  const rollingStock=addStationTrains(building),disposeBuilding=building.dispose;
  building.trains=rollingStock.trains;building.trainServices=TRAIN_SERVICES;
  const meetingPlaces=addStationLandmarks(building);building.landmarks=meetingPlaces.landmarks;
  building.dispose=()=>{meetingPlaces.dispose();rollingStock.dispose();disposeBuilding();};
  return building;
}
