import * as THREE from './vendor/three.module.js';
import {LANDMARKS} from './landmarks.js?v=6';

// Original simplified exhibits: all solid furniture has a matching footprint.
export function addStationLandmarks(building){
 const landmarks=[],geometries=new Set(),materials=new Set(),textures=new Set();let disposed=false;
 const geometry=g=>(geometries.add(g),g),material=m=>(materials.add(m),m);
 const cube=geometry(new THREE.BoxGeometry(1,1,1)),planeGeo=geometry(new THREE.PlaneGeometry(1,1));
 const sphere=geometry(new THREE.SphereGeometry(1,32,20));
 const paint=(color,roughness=.6,metalness=.05)=>material(new THREE.MeshStandardMaterial({color,roughness,metalness}));
 const steel=paint('#a5b4b8',.32,.55),black=paint('#26302e',.6,.25),iron=paint('#303c3d',.36,.55),stone=paint('#b8b9af'),wood=paint('#8a7457'),cream=paint('#e7e0cc'),slate=paint('#485456',.5,.35);
 const silver=paint('#d7e2e3',.21,.58);silver.emissive.set('#829ca1');silver.emissiveIntensity=.13;
 const glow=material(new THREE.MeshBasicMaterial({color:'#fff4d8'}));
 const glass=material(new THREE.MeshStandardMaterial({color:'#c6e0e4',roughness:.15,metalness:.05,transparent:true,opacity:.065,depthWrite:false,side:THREE.DoubleSide}));
 function box(parent,w,h,d,x,y,z,m=stone,ry=0,name){const mesh=new THREE.Mesh(cube,m);mesh.scale.set(w,h,d);mesh.position.set(x,y,z);mesh.rotation.y=ry;mesh.receiveShadow=true;if(name)mesh.name=name;parent.add(mesh);return mesh;}
 function tex(draw,w=1024,h=256){const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;draw(canvas.getContext('2d'),w,h);const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=4;textures.add(texture);return texture;}
 function label(parent,title,subtitle,x,y,z,w=3,h=.65,ry=0){const texture=tex((ctx,cw,ch)=>{ctx.fillStyle='#253932';ctx.fillRect(0,0,cw,ch);ctx.fillStyle='#dccb97';ctx.fillRect(0,0,9,ch);ctx.textAlign='center';ctx.textBaseline='middle';let size=70;while(size>22){ctx.font=`500 ${size}px sans-serif`;if(ctx.measureText(title).width<cw-50)break;size-=2;}ctx.fillStyle='#fff8e8';ctx.fillText(title,cw/2,ch*.37);ctx.font='27px sans-serif';ctx.fillStyle='#d9dfcb';ctx.fillText(subtitle,cw/2,ch*.77);});const mat=material(new THREE.MeshBasicMaterial({map:texture}));box(parent,w+.08,h+.08,.06,x,y,z,black,ry);const p=new THREE.Mesh(planeGeo,mat);p.scale.set(w,h,1);p.position.set(x+Math.sin(ry)*.035,y,z+Math.cos(ry)*.035);p.rotation.y=ry;parent.add(p);return p;}
 function collider(place,x,z,w,d){const c=Math.cos(place.modelYaw),s=Math.sin(place.modelYaw),points=[[-w/2,-d/2],[w/2,-d/2],[w/2,d/2],[-w/2,d/2]].map(([px,pz])=>({x:place.modelX+c*(x+px)+s*(z+pz),z:place.modelZ-s*(x+px)+c*(z+pz)}));building.collidersByFloor[place.floor].push({minX:Math.min(...points.map(p=>p.x)),maxX:Math.max(...points.map(p=>p.x)),minZ:Math.min(...points.map(p=>p.z)),maxZ:Math.max(...points.map(p=>p.z)),landmarkId:place.id});}
 function bench(parent,place,x,z,ry=0,w=1.8){const g=new THREE.Group();g.position.set(x,0,z);g.rotation.y=ry;parent.add(g);box(g,w,.1,.65,0,.47,0,wood);box(g,w,.42,.09,0,.78,.28,wood);for(const xx of [-w*.37,w*.37]){box(g,.08,.43,.48,xx,.215,0,steel);}const width=Math.abs(Math.cos(ry))*w+Math.abs(Math.sin(ry))*.75,depth=Math.abs(Math.sin(ry))*w+Math.abs(Math.cos(ry))*.75;collider(place,x,z,width,depth);}
 function bell(parent,place){
  box(parent,3.45,.25,2.85,0,.125,0,stone);collider(place,0,0,3.45,2.85);
  const body=new THREE.Mesh(sphere,silver);body.name='silver-bell-body';body.scale.set(.98,.88,.98);body.position.y=1.62;parent.add(body);
  const loop=new THREE.Mesh(geometry(new THREE.TorusGeometry(.25,.055,10,28)),silver);loop.position.set(0,2.63,0);parent.add(loop);
  const seam=new THREE.Mesh(geometry(new THREE.TorusGeometry(.91,.025,6,48)),steel);seam.rotation.x=Math.PI/2;seam.position.y=1.55;parent.add(seam);
  for(const x of [-.43,.43]){const hole=new THREE.Mesh(sphere,black);hole.scale.set(.12,.12,.026);hole.position.set(x,1.45,-.887);parent.add(hole);}
  box(parent,.075,.55,.035,0,1.08,-.77,black);box(parent,1.1,.055,.03,0,1.3,-.88,black);
  // A transparent vitrine, with thin mullions rather than a tinted solid wall.
  const caseMesh=box(parent,3.22,2.75,2.6,0,1.68,0,glass);caseMesh.renderOrder=2;caseMesh.castShadow=false;
  for(const x of [-1.64,1.64])for(const z of [-1.34,1.34])box(parent,.045,2.85,.045,x,1.68,z,steel);
  for(const y of [.28,3.1]){box(parent,3.34,.055,.055,0,y,-1.34,steel);box(parent,3.34,.055,.055,0,y,1.34,steel);box(parent,.055,.055,2.72,-1.64,y,0,steel);box(parent,.055,.055,2.72,1.64,y,0,steel);}
  label(parent,'銀の鈴','SILVER BELL  /  グランスタ東京',0,.48,-1.48,2.6,.48,Math.PI);
  bench(parent,place,-3.2,0,Math.PI/2,2.1);bench(parent,place,3.2,0,-Math.PI/2,2.1);
 }
 function wheels(parent,place){
  box(parent,7.25,.24,1.45,0,.12,0,stone);collider(place,0,0,7.25,1.45);
  box(parent,7.5,2.8,.12,0,1.63,-.47,cream);
  const rimGeo=geometry(new THREE.TorusGeometry(.88,.075,9,44)),innerGeo=geometry(new THREE.TorusGeometry(.74,.035,7,40)),hubGeo=geometry(new THREE.CylinderGeometry(.2,.2,.42,20));
  for(let index=0;index<3;index++){
   const wheel=new THREE.Group();wheel.name=`wheel-${index+1}`;wheel.position.set((index-1)*2.22,1.24,.1);parent.add(wheel);
   wheel.add(new THREE.Mesh(rimGeo,iron));wheel.add(new THREE.Mesh(innerGeo,steel));
   const hub=new THREE.Mesh(hubGeo,iron);hub.rotation.x=Math.PI/2;wheel.add(hub);
   const spokes=new THREE.InstancedMesh(cube,iron,12),dummy=new THREE.Object3D();
   for(let i=0;i<12;i++){const a=i*Math.PI/6;dummy.position.set(Math.cos(a)*.41,Math.sin(a)*.41,0);dummy.scale.set(.7,.065,.11);dummy.rotation.z=a;dummy.updateMatrix();spokes.setMatrixAt(i,dummy.matrix);}spokes.computeBoundingSphere();wheel.add(spokes);
   box(wheel,.16,.4,.11,0,-.18,.29,steel);
   const crank=new THREE.Mesh(geometry(new THREE.CylinderGeometry(.12,.12,.13,14)),steel);crank.rotation.x=Math.PI/2;crank.position.set(0,-.36,.37);wheel.add(crank);
  }
  box(parent,4.65,.13,.12,0,.88,.47,steel);for(const x of [-2.22,0,2.22])box(parent,.17,.22,.14,x,.88,.5,black);
  label(parent,'動輪の広場','C62 15  /  DRIVING WHEELS',0,2.6,.56,4.7,.58);
 }
 function square(parent,place){
  box(parent,15,.018,15,0,.005,0,cream);
  for(const x of [-7.25,7.25])box(parent,.07,.025,14.5,x,.022,0,steel);for(const z of [-7.25,7.25])box(parent,14.5,.025,.07,0,.022,z,steel);
  const palettes=[['#123e42','#8cc9be','#e6d7aa'],['#293c5a','#a2cbd1','#f2e9cf'],['#435737','#b8c580','#f1e2b0']];
  for(let i=0;i<3;i++){
   const pillar=new THREE.Group();pillar.name=`monolith-${i+1}`;pillar.position.set((i-1)*3.7,0,-3);parent.add(pillar);
   box(pillar,1.08,5.25,.55,0,2.625,0,black);collider(place,(i-1)*3.7,-3,1.08,.55);
   const texture=tex((ctx,w,h)=>{const colors=palettes[i],g=ctx.createLinearGradient(0,0,w,h);g.addColorStop(0,colors[0]);g.addColorStop(.65,colors[1]);g.addColorStop(1,colors[2]);ctx.fillStyle=g;ctx.fillRect(0,0,w,h);for(let n=0;n<16;n++){ctx.strokeStyle=n%2?'#f6f3d64a':'#22433a55';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo((n*.171%1)*w,0);ctx.bezierCurveTo(w*.1,n*h/16,w*.9,(n+3)*h/18,(n*.267%1)*w,h);ctx.stroke();}ctx.textAlign='center';ctx.fillStyle='#fffbe8';ctx.font='500 44px sans-serif';ctx.fillText('SQUARE',w/2,h*.78);ctx.font='500 80px sans-serif';ctx.fillText('ZERO',w/2,h*.86);ctx.font='22px sans-serif';ctx.fillText('TOKYO STATION',w/2,h*.93);},512,1536);
   const screen=new THREE.Mesh(planeGeo,material(new THREE.MeshBasicMaterial({map:texture})));screen.scale.set(.93,5.02,1);screen.position.set(0,2.66,.284);pillar.add(screen);
   box(pillar,1.14,.08,.62,0,.04,0,steel);
  }
  bench(parent,place,-5.7,1.6,Math.PI/2,3.2);bench(parent,place,5.7,1.6,-Math.PI/2,3.2);
  label(parent,'SQUARE ZERO','グランスタ東京  /  MEETING SPACE',0,3.0,5.6,4.6,.6);
  // A floating light canopy stays above the three screens; no opaque side wall.
  for(let x=-6;x<=6;x+=2)box(parent,.09,.045,14,x,6.72,-.1,glow);
 }
 function post(parent,place){
  const g=new THREE.Group();g.name='postbox-building';parent.add(g);
  const brickTexture=tex((ctx,w,h)=>{ctx.fillStyle='#a34c38';ctx.fillRect(0,0,w,h);for(let row=0;row<10;row++)for(let col=-1;col<8;col++){const xx=col*150+(row%2?75:0),yy=row*34;ctx.fillStyle=(row+col)%3===0?'#ae5941':(row+col)%3===1?'#92472f':'#bc6349';ctx.fillRect(xx+2,yy+2,146,30);ctx.strokeStyle='#c69c7d';ctx.lineWidth=2;ctx.strokeRect(xx,yy,150,34);}},1024,340);
  const brick=material(new THREE.MeshStandardMaterial({map:brickTexture,roughness:.87}));
  box(g,2.28,.38,1.18,0,.19,0,stone);box(g,2.08,1.12,1.02,0,.94,0,brick);collider(place,0,0,2.28,1.18);
  box(g,2.22,.12,1.14,0,1.54,0,slate);box(g,.64,.32,1.0,0,1.75,0,brick);
  const domeGeo=geometry(new THREE.SphereGeometry(1,24,12,0,Math.PI*2,0,Math.PI/2));
  for(const [x,r,y] of [[-.76,.27,1.6],[.76,.27,1.6],[0,.4,1.91]]){const dome=new THREE.Mesh(domeGeo,slate);dome.scale.set(r,r*.85,r);dome.position.set(x,y,0);g.add(dome);}
  const red=paint('#c94e3d'),blue=paint('#4d86a8');
  for(const [x,m] of [[-.49,red],[.49,blue]]){box(g,.64,.29,.055,x,1.14,.54,m);box(g,.49,.055,.03,x,1.17,.579,black);}
  label(g,'〒 東京駅','丸の内中央口  /  POST',0,.68,.55,1.61,.36);
  const clock=new THREE.Mesh(geometry(new THREE.CircleGeometry(.115,22)),glow);clock.position.set(0,1.75,.514);g.add(clock);box(g,.017,.085,.015,0,1.78,.531,black);box(g,.075,.016,.015,.03,1.748,.531,black);
 }
 for(const place of LANDMARKS){const group=new THREE.Group();group.name=place.title;group.userData={landmark:true,landmarkId:place.id};group.position.set(place.modelX,0,place.modelZ);group.rotation.y=place.modelYaw;building.floorGroups[place.floor].add(group);({ 'silver-bell':bell,'driving-wheels':wheels,'square-zero':square,'station-postbox':post})[place.id](group,place);landmarks.push({id:place.id,floor:place.floor,group});}
 return {landmarks,dispose(){if(disposed)return;disposed=true;for(const item of landmarks)item.group.removeFromParent();textures.forEach(t=>t.dispose());materials.forEach(m=>m.dispose());geometries.forEach(g=>g.dispose());}};
}
