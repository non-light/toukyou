import * as THREE from './vendor/three.module.js';
import {ZONES, WALK_AREAS, GROUPS, insideWalkArea} from './station-layout.js?v=game1';

// A walkable architectural interpretation, not a surveyed station model.
// x=east, z=south. All connections follow station-layout.js.
export function createStationScene(){
  const scene=new THREE.Scene();scene.background=new THREE.Color('#cbd7d7');scene.fog=new THREE.Fog('#d5d6ca',65,155);
  const colliders=[],textures=[],materials=[];
  const material=(color,roughness=.65,metalness=0)=>{const m=new THREE.MeshStandardMaterial({color,roughness,metalness});materials.push(m);return m;};
  const cream=material('#e4d8bf'),pale=material('#f2e8d2'),trim=material('#b6a17d',.5),darkStone=material('#77705f',.5),bronze=material('#514b3b',.34,.55),black=material('#28312e',.5);
  const steel=material('#bac7c7',.25,.7),steelTop=material('#324541',.3,.4),wood=material('#6c4c36',.6),sage=material('#8b9d8d'),modern=material('#e0e6e1',.4,.15);
  const luminous=new THREE.MeshBasicMaterial({color:'#fff1ce'}),daylight=new THREE.MeshBasicMaterial({color:'#d4e8eb'}),greenLed=new THREE.MeshBasicMaterial({color:'#91ffcf'});
  const accents={};for(const [id,g] of Object.entries(GROUPS)){accents[id]=material(g.color,.35,.15);accents[id].emissive.set(g.color);accents[id].emissiveIntensity=.35;}
  const boxGeometry=new THREE.BoxGeometry(1,1,1),cylinderGeometry=new THREE.CylinderGeometry(1,1,1,16);
  function box(w,h,d,x,y,z,m=cream,ry=0,shadow=false){const o=new THREE.Mesh(boxGeometry,m);o.scale.set(w,h,d);o.position.set(x,y,z);o.rotation.y=ry;o.receiveShadow=true;o.castShadow=shadow;scene.add(o);return o;}
  function cylinder(r,h,x,y,z,m=cream){const o=new THREE.Mesh(cylinderGeometry,m);o.scale.set(r,h,r);o.position.set(x,y,z);o.receiveShadow=true;scene.add(o);return o;}
  function collider(x,z,w,d){colliders.push({minX:x-w/2,maxX:x+w/2,minZ:z-d/2,maxZ:z+d/2});}
  function texture(draw,w=1024,h=w){const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;draw(canvas.getContext('2d'),w,h);const t=new THREE.CanvasTexture(canvas);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=4;textures.push(t);return t;}
  const floorTexture=texture((c,s)=>{
    c.fillStyle='#c3bcab';c.fillRect(0,0,s,s);const t=s/8;
    for(let y=0;y<8;y++)for(let x=0;x<8;x++){const v=195+(Math.sin(x*19+y*23)*.5+.5)*22;c.fillStyle=`rgb(${v+8},${v+3},${v-9})`;c.fillRect(x*t+1,y*t+1,t-2,t-2);for(let i=0;i<8;i++){c.strokeStyle='rgba(108,100,82,.035)';c.beginPath();c.moveTo(x*t,y*t+i*17);c.bezierCurveTo(x*t+40,y*t+i*12,x*t+80,y*t+i*19,x*t+t,y*t+i*17);c.stroke();}}
  });floorTexture.wrapS=floorTexture.wrapT=THREE.RepeatWrapping;
  const floorMat=new THREE.MeshStandardMaterial({map:floorTexture,roughness:.28,metalness:.09});
  // Tile the union of the rectangles once, avoiding overlapping floor surfaces.
  const xs=[...new Set(WALK_AREAS.flatMap(a=>[a.minX,a.maxX]))].sort((a,b)=>a-b),zs=[...new Set(WALK_AREAS.flatMap(a=>[a.minZ,a.maxZ]))].sort((a,b)=>a-b);
  const vertices=[],uvs=[],indices=[];let count=0;
  for(let i=0;i<xs.length-1;i++)for(let j=0;j<zs.length-1;j++)if(insideWalkArea((xs[i]+xs[i+1])/2,(zs[j]+zs[j+1])/2)){
    const [x1,x2,z1,z2]=[xs[i],xs[i+1],zs[j],zs[j+1]];vertices.push(x1,-.015,z1,x1,-.015,z2,x2,-.015,z2,x2,-.015,z1);uvs.push(x1/6,z1/6,x1/6,z2/6,x2/6,z2/6,x2/6,z1/6);indices.push(count,count+1,count+2,count,count+2,count+3);count+=4;
  }
  const fg=new THREE.BufferGeometry();fg.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));fg.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));fg.setIndex(indices);fg.computeVertexNormals();const floor=new THREE.Mesh(fg,floorMat);floor.receiveShadow=true;scene.add(floor);
  const brickTexture=texture((c,s)=>{c.fillStyle='#b4a18b';c.fillRect(0,0,s,s);for(let row=0;row<18;row++)for(let col=-1;col<9;col++){const n=Math.sin(row*39+col*12)*.5+.5;c.fillStyle=`rgb(${133+n*23},${67+n*12},${47+n*10})`;c.fillRect(col*s/8+(row%2)*s/16+2,row*s/18+2,s/8-4,s/18-4);}});brickTexture.wrapS=brickTexture.wrapT=THREE.RepeatWrapping;brickTexture.repeat.set(1,1);
  const brick=new THREE.MeshStandardMaterial({map:brickTexture,roughness:.85});
  const glass=new THREE.MeshPhysicalMaterial({color:'#b5d3d9',roughness:.12,metalness:.25,transparent:true,opacity:.4,side:THREE.DoubleSide});
  // Find and merge external boundaries of the walkable union. Interior junctions
  // remain completely open; their gate banks leave the graph centerlines clear.
  const raw=[];
  for(let i=0;i<xs.length-1;i++)for(let j=0;j<zs.length-1;j++){
    const xm=(xs[i]+xs[i+1])/2,zm=(zs[j]+zs[j+1])/2;if(!insideWalkArea(xm,zm))continue;
    if(!insideWalkArea(xs[i]-.01,zm))raw.push({axis:'z',p:xs[i],a:zs[j],b:zs[j+1]});
    if(!insideWalkArea(xs[i+1]+.01,zm))raw.push({axis:'z',p:xs[i+1],a:zs[j],b:zs[j+1]});
    if(!insideWalkArea(xm,zs[j]-.01))raw.push({axis:'x',p:zs[j],a:xs[i],b:xs[i+1]});
    if(!insideWalkArea(xm,zs[j+1]+.01))raw.push({axis:'x',p:zs[j+1],a:xs[i],b:xs[i+1]});
  }
  raw.sort((a,b)=>a.axis.localeCompare(b.axis)||a.p-b.p||a.a-b.a);const boundaries=[];
  for(const s of raw){const p=boundaries.at(-1);if(p&&p.axis===s.axis&&p.p===s.p&&Math.abs(p.b-s.a)<.01)p.b=s.b;else boundaries.push({...s});}
  for(const s of boundaries){const x=s.axis==='x'?(s.a+s.b)/2:s.p,z=s.axis==='z'?(s.a+s.b)/2:s.p,len=s.b-s.a;const west=x<-37,east=x>45,height=west?11.1:east?9.8:8.1;const w=s.axis==='x'?len:.36,d=s.axis==='z'?len:.36;
    box(w,height,d,x,height/2,z,west&&x<-59?brick:east?modern:cream);box(w+.06,1.05,d+.06,x,.52,z,darkStone);box(w+.09,.13,d+.09,x,1.12,z,trim);box(w+.1,.22,d+.1,x,height-.35,z,pale);collider(x,z,w,d);
    if(!west&&!east)box(w+.12,.055,d+.12,x,height-.62,z,luminous);
  }
  // Ceilings are separate volumes so both historic domes remain visible.
  function roof(x,z,w,d,y,m=pale){box(w,.35,d,x,y,z,m);}
  roof(-49,0,22,40,11.2);roof(-49,-41.5,22,3,11.2);roof(-49,41.5,22,3,11.2);roof(55,0,18,86,10.05,modern);
  for(const z of [-30,0,30]){roof(4,z,84,12,7.9);for(let x=-32;x<=42;x+=12){box(.35,.38,12,x,7.52,z,pale);box(.09,.035,10.4,x,7.3,z,luminous);}for(const zz of [z-3.8,z+3.8])box(83,.055,.1,4,7.63,zz,luminous);}
  roof(-8,-15,12,18,8);roof(-8,15,12,18,8);
  roof(15,-49,18,26,8.75);roof(15,49,18,26,8.75);roof(36,-14.5,16,21,8.5);roof(36,49,16,26,8.75);
  // Repeated stone piers live in the side bays, away from tour centerlines.
  function pier(x,z,modernStyle=false){box(.95,.25,.95,x,.125,z,darkStone);box(.72,6.1,.72,x,3.3,z,modernStyle?modern:cream,0,true);box(1,.2,1,x,6.4,z,pale);collider(x,z,1,1);}
  for(const z of [-39,-20,-10,10,20,39]){pier(-58.6,z);pier(-39.4,z);pier(47.4,z,true);pier(62.6,z,true);}
  for(const z of [-30,0,30])for(const x of [-31,1,43]){pier(x,z-4.8);pier(x,z+4.8);}
  // Warm tactile paving follows every main connection and the branching lobbies.
  const tactileTexture=texture((c,s)=>{c.fillStyle='#d8b64d';c.fillRect(0,0,s,s);for(let i=0;i<12;i++){c.fillStyle='#ebcc6a';c.fillRect(i*s/12+3,0,8,s);c.fillStyle='#b49336';c.fillRect(i*s/12+12,0,1,s);}},256);tactileTexture.wrapS=tactileTexture.wrapT=THREE.RepeatWrapping;tactileTexture.repeat.set(1,4);
  const tactileMat=new THREE.MeshStandardMaterial({map:tactileTexture,roughness:.85});
  for(const z of [-30,0,30])box(94,.018,.55,4.5,.002,z+1.55,tactileMat);
  for(const x of [-47.5,56.5,-6.5])box(.55,.018,x===-6.5?60:84,x,.004,0,tactileMat);
  for(const [x,z,d] of [[15,-48,24],[15,48,24],[36,-14,18],[36,48,24]])box(.55,.018,d,x+1.6,.006,z,tactileMat);

  function signTexture(lines,color='#e1c67e',light=false,compact=false){return texture((c,w,h)=>{c.fillStyle=light?'#f5ecda':'#22312d';c.fillRect(0,0,w,h);c.fillStyle=color;c.fillRect(0,0,13,h);c.textBaseline='middle';c.textAlign='left';const margin=42;lines.forEach((line,i)=>{let size=compact?62:i===0?(lines.length>3?52:65):lines.length>3?36:35;while(size>16){c.font=`${i===0?500:400} ${size}px sans-serif`;if(c.measureText(line).width<w-margin*2)break;size-=2;}c.fillStyle=i===0?color:light?'#3c433d':'#e8eee7';c.fillText(line,margin,(i+.5)*h/lines.length);});},1024,lines.length>3?360:240);}
  function sign(w,h,x,y,z,lines,{color='#e2c77f',light=false,ry=0,compact=false}={}){box(w+.12,h+.12,.14,x,y,z,bronze,ry);const p=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({map:signTexture(lines,color,light,compact)}));p.position.set(x+Math.sin(ry)*.081,y,z+Math.cos(ry)*.081);p.rotation.y=ry;scene.add(p);}
  function bothSigns(w,h,x,y,z,front,back,color,ry=0){sign(w,h,x,y,z,front,{color,ry});sign(w,h,x-Math.sin(ry)*.18,y,z-Math.cos(ry)*.18,back,{color,ry:ry+Math.PI});}
  // Three genuinely distinct east/west passageways and six separate exit banks.
  for(const [row,z] of [-30,0,30].entries()){
    const jp=['北通路','中央通路','南通路'][row],en=['NORTH PASSAGE','CENTRAL PASSAGE','SOUTH PASSAGE'][row];
    for(const x of [-23,28])bothSigns(7.4,1.2,x,5.7,z,[`↑ ${jp}・八重洲方面`,`${en} / YAESU`],[`↑ ${jp}・丸の内方面`,`${en} / MARUNOUCHI`],'#e2c77f',-Math.PI/2);
  }
  // All ticket arrays have an open middle lane at local x=0. The posts and
  // peripheral paddles are collidable; each tour edge passes through the middle.
  function gateBank(cx,cz,{ry=0,group='general',title,lines,en,width=10}={}){
    const nx=Math.sin(ry),nz=Math.cos(ry),tx=Math.cos(ry),tz=-Math.sin(ry),accent=accents[group];
    for(const offset of [-4.65,-3.15,-1.65,1.65,3.15,4.65]){
      const x=cx+tx*offset,z=cz+tz*offset;
      box(.42,.88,2.4,x,.5,z,steel,ry);box(.47,.12,2.48,x,1,z,steelTop,ry);box(.23,.027,.35,x+nx*.66,1.079,z+nz*.66,black,ry);box(.14,.028,.18,x+nx*.68,1.098,z+nz*.68,greenLed,ry);box(.23,.18,.034,x+nx*1.25,.64,z+nz*1.25,accent,ry);
      collider(x,z,Math.abs(tx)*.5+Math.abs(nx)*2.6,Math.abs(tz)*.5+Math.abs(nz)*2.6);
    }
    // Boundary pylons make each individual gate bank identifiable in space.
    for(const offset of [-5.45,5.45]){const x=cx+tx*offset,z=cz+tz*offset;box(.15,3.9,.15,x,1.95,z,bronze);collider(x,z,.2,.2);}
    box(width,.11,.09,cx,3.32,cz,accent,ry);
    const front=lines??[title,en];bothSigns(width,group==='general'?1.05:1.85,cx,4.32,cz,front,[title,en,group==='general'?'在来線改札 / LOCAL TRAINS':'在来線 ⇄ 新幹線 / TRANSFER'],GROUPS[group].color,ry);
    // Floor threshold glows slightly when this railway group is selected.
    box(width,.018,.16,cx,.017,cz,accent,ry);
  }
  for(const zone of ZONES.filter(z=>z.kind==='exit')){gateBank(zone.side==='west'?-40:48,zone.z,{ry:Math.PI/2,group:'general',title:zone.title,en:zone.en,width:10.8});}
  const transferGeometry=[
    {id:'jr-east-north',x:15,z:-48,ry:0,stairsZ:-57},
    {id:'jr-east-south',x:15,z:48,ry:Math.PI,stairsZ:57},
    {id:'tokaido-central',x:36,z:-17,ry:0,stairsZ:-22.5},
    {id:'tokaido-south',x:36,z:48,ry:Math.PI,stairsZ:57}
  ];
  for(const branch of transferGeometry){
    const zone=ZONES.find(z=>z.id===branch.id),g=GROUPS[zone.group],isEast=zone.group==='east';
    const lines=isEast?[zone.title,'東北・山形・秋田・北海道','上越・北陸新幹線　20〜23番線','JR EAST SHINKANSEN']: [zone.title,'東海道・山陽新幹線','14〜19番線　JR東海','TOKAIDO / SANYO SHINKANSEN'];
    gateBank(branch.x,branch.z,{ry:branch.ry,group:zone.group,title:zone.title,en:zone.en,lines,width:isEast?14.8:13.5});
    // A compact repeater above the open center lane stays readable in a phone's
    // narrow field of view; the full-width board retains the complete route list.
    const compactLines=isEast?['東北・上越・北陸ほか','新幹線 20〜23番線']:['東海道・山陽新幹線','14〜19番線'];
    const compactZ=branch.z+Math.cos(branch.ry)*.5,compactX=branch.x+Math.sin(branch.ry)*.5;
    sign(3.2,.65,compactX,2.8,compactZ,compactLines,{color:g.color,ry:branch.ry,compact:true});
    sign(3.2,.65,compactX-Math.sin(branch.ry)*.18,2.8,compactZ-Math.cos(branch.ry)*.18,compactLines,{color:g.color,ry:branch.ry+Math.PI,compact:true});
    // Beyond each bank is a separate railway lobby, with a protected suggestion
    // of stairs/escalator leading to the upper-level platforms.
    const stairsDepth=branch.id==='tokaido-central'?3.7:7.3,signZ=branch.stairsZ;
    for(let step=0;step<10;step++){const direction=branch.z<0?-1:1;box(3.5,.2*(step+1),stairsDepth/10,branch.x,.1*(step+1),signZ+direction*(step-4.5)*stairsDepth/10,modern);}
    collider(branch.x,signZ,4.2,stairsDepth+.4);
    for(const side of [-1,1]){box(.12,2.3,stairsDepth,branch.x+side*1.9,1.15,signZ,steel);box(.1,.07,stairsDepth,branch.x+side*2.3,1.0,signZ,accents[zone.group]);}
    sign(6.4,.85,branch.x,5.65,signZ,[`↑ ${g.platforms} ホーム`,'PLATFORMS / 2F'],{color:g.color,ry:branch.ry});
    for(const offset of [-6,6])box(.12,.055,16,branch.x+offset,8.38,(branch.z+branch.stairsZ)/2,luminous);
  }

  // The red-brick Marunouchi facade and the contemporary Yaesu glass hall
  // have different silhouettes and materials, rather than differing only in labels.
  const arch=new THREE.Shape();arch.moveTo(-1.4,0);arch.lineTo(1.4,0);arch.lineTo(1.4,3.7);arch.absarc(0,3.7,1.4,0,Math.PI,false);arch.lineTo(-1.4,0);const archGeometry=new THREE.ShapeGeometry(arch);
  for(let z=-38;z<=38;z+=9.5){const pane=new THREE.Mesh(archGeometry,daylight);pane.position.set(-59.79,2.2,z);pane.rotation.y=Math.PI/2;scene.add(pane);const points=[];for(let j=0;j<=20;j++){const a=j*Math.PI/20;points.push(new THREE.Vector3(Math.cos(a)*1.52,3.7+Math.sin(a)*1.52,0));}const frame=new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),20,.12,6,false),pale);frame.position.set(-59.68,2.2,z);frame.rotation.y=Math.PI/2;scene.add(frame);box(.12,5.1,.07,-59.63,4.75,z,bronze);box(.13,.07,2.8,-59.62,4.65,z,bronze);box(.6,.2,3.35,-59.65,2.15,z,pale);}
  // Bright, regular glazing modules along the east side.
  for(let z=-39;z<=39;z+=6){box(.065,8,5.8,63.77,5,z,glass);box(.16,9.2,.12,63.58,4.65,z+3,steel);box(.17,.12,5.8,63.55,4.65,z,steel);}
  for(let z=-36;z<=36;z+=12){box(18,.24,.45,55,9.55,z,steel);box(15,.025,.1,55,9.35,z,luminous);}
  bothSigns(8.5,1.3,55,6.7,0,['八重洲口','YAESU / EAST SIDE'],['八重洲口','YAESU / EAST SIDE'],'#b5d5e6',0);
  bothSigns(8.5,1.3,-49,7.5,0,['丸の内中央口','MARUNOUCHI CENTRAL'],['丸の内中央口','MARUNOUCHI CENTRAL'],'#e2c77f',0);
  // Historic domes over the north and south lobbies; lower levels remain open
  // for the continuous north/south route through the Marunouchi public hall.
  function ring(cx,cz,r,tube,y,m){const o=new THREE.Mesh(new THREE.TorusGeometry(r,tube,6,48),m);o.rotation.x=Math.PI/2;o.position.set(cx,y,cz);scene.add(o);}
  function dome(cx,cz,label){
    ring(cx,cz,8.5,.045,.015,darkStone);ring(cx,cz,8.75,.035,.016,trim);
    ring(cx,cz,9.75,.23,8.8,pale);ring(cx,cz,9.65,.1,9.13,trim);ring(cx,cz,9.8,.18,11.05,pale);
    for(let i=0;i<8;i++){
      const a=i*Math.PI/4,x=cx+Math.sin(a)*9.52,z=cz+Math.cos(a)*9.52;
      box(7.65,1.6,.4,x,10.05,z,pale,a);box(3.9,.85,.06,x-Math.sin(a)*.24,10.05,z-Math.cos(a)*.24,sage,a);
      const med=new THREE.Mesh(new THREE.CircleGeometry(.31,20),pale);med.position.set(x-Math.sin(a)*.29,10.05,z-Math.cos(a)*.29);med.rotation.y=a+Math.PI;scene.add(med);
      const points=[];for(let k=0;k<=22;k++){const theta=.18+(Math.PI/2-.18)*k/22;points.push(new THREE.Vector3(cx+Math.sin(theta)*9.67*Math.sin(a),11.1+Math.cos(theta)*7.1,cz+Math.sin(theta)*9.67*Math.cos(a)));}
      scene.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),24,.1,6,false),pale));
    }
    const shell=new THREE.Mesh(new THREE.SphereGeometry(9.8,48,20,0,Math.PI*2,.18,Math.PI/2-.18),new THREE.MeshStandardMaterial({color:'#e5dcbf',roughness:.8,side:THREE.BackSide}));shell.scale.y=.73;shell.position.set(cx,11.1,cz);scene.add(shell);
    const sky=new THREE.Mesh(new THREE.CircleGeometry(1.8,32),luminous);sky.rotation.x=Math.PI/2;sky.position.set(cx,18.17,cz);scene.add(sky);ring(cx,cz,1.8,.12,18.13,bronze);
    sign(7.5,.9,cx-10.05,7,cz,[label,'TOKYO STATION / MARUNOUCHI'],{color:'#584f3c',light:true,ry:Math.PI/2});
  }
  dome(-49,30,'丸の内南口ドーム');dome(-49,-30,'丸の内北口ドーム');
  // Period clock at the central Marunouchi wall.
  const clockMap=texture((c,s)=>{c.fillStyle='#efe3c8';c.beginPath();c.arc(s/2,s/2,s*.48,0,Math.PI*2);c.fill();c.strokeStyle='#464736';c.lineWidth=8;c.beginPath();c.arc(s/2,s/2,s*.46,0,Math.PI*2);c.stroke();c.textAlign='center';c.textBaseline='middle';c.font='55px Georgia';for(let i=1;i<=12;i++){const a=i*Math.PI/6;c.fillStyle='#424334';c.fillText(String(i),s/2+Math.sin(a)*s*.35,s/2-Math.cos(a)*s*.35);}c.strokeStyle='#343d30';c.lineWidth=15;c.beginPath();c.moveTo(s/2,s/2);c.lineTo(s*.35,s*.3);c.moveTo(s/2,s/2);c.lineTo(s*.76,s*.34);c.stroke();},512);
  const clock=new THREE.Mesh(new THREE.CircleGeometry(1,40),new THREE.MeshBasicMaterial({map:clockMap}));clock.position.set(-59.55,8.8,0);clock.rotation.y=Math.PI/2;scene.add(clock);
  // Shopfronts and seats in wide side bays never cross a graph edge.
  for(const [x,z,ry] of [[-58,-12,Math.PI/2],[-58,12,Math.PI/2],[62,-15,-Math.PI/2],[62,15,-Math.PI/2]]){
    box(.8,3.4,5.7,x,2.5,z,black);box(1.1,.7,5.5,x,.5,z,wood);box(1.15,.08,5.7,x,.9,z,pale);sign(5.5,.8,x+(x<0?.5:-.5),3.6,z,[x<0?'珈琲と旅':'東京みやげ',x<0?'COFFEE & JOURNEY':'TOKYO SOUVENIRS'],{color:'#d8c7a5',ry});collider(x,z,1.4,6);
    for(const zz of [z-1.6,z,z+1.6]){box(.75,.18,.55,x,.99,zz,trim);box(.85,.025,.08,x,2.9,zz,luminous);}
  }
  for(const [x,z] of [[-54,-15],[-54,15],[59,-18],[59,18],[-11,-16],[-11,16]]){box(1.1,.14,3.2,x,.48,z,wood,0,true);box(.12,.6,3.2,x-.48,.84,z,wood);for(const zz of [z-1.1,z+1.1])box(.65,.4,.12,x,.22,zz,bronze);collider(x,z,1.3,3.4);}
  // Light stays restrained and warm in Marunouchi, cool in the modern east hall.
  scene.add(new THREE.HemisphereLight('#eef4ff','#86795f',2.25));const sun=new THREE.DirectionalLight('#fff0cd',2.9);sun.position.set(-45,38,22);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);Object.assign(sun.shadow.camera,{left:-72,right:72,top:68,bottom:-68,near:1,far:155});sun.shadow.bias=-.001;scene.add(sun);
  for(const [x,y,z,color,power] of [[-49,12,0,'#ffe2ac',155],[54,8,0,'#dcf1ff',135],[0,6,0,'#fff1cc',90]]){const light=new THREE.PointLight(color,power,95,2);light.position.set(x,y,z);scene.add(light);}
  // Combine repeated architecture, including stone columns and decorative rings.
  const batches=new Map();for(const mesh of [...scene.children])if(mesh.isMesh&&!mesh.material.transparent){const key=mesh.geometry.uuid+':'+mesh.material.uuid+':'+mesh.castShadow;if(!batches.has(key))batches.set(key,[]);batches.get(key).push(mesh);}
  for(const meshes of batches.values())if(meshes.length>1){const b=new THREE.InstancedMesh(meshes[0].geometry,meshes[0].material,meshes.length);b.castShadow=meshes[0].castShadow;b.receiveShadow=true;meshes.forEach((m,i)=>{m.updateMatrix();b.setMatrixAt(i,m.matrix);scene.remove(m);});b.instanceMatrix.needsUpdate=true;b.computeBoundingSphere();scene.add(b);}
  const hotspots=ZONES.map(zone=>{let x=zone.x,z=zone.z,y=3.2;if(zone.kind==='exit')x=zone.side==='west'?-40:48;if(zone.kind==='transfer'){const b=transferGeometry.find(b=>b.id===zone.id);x=b.x;z=b.z+(b.z<0?2.4:-2.4);y=1.65;}if(zone.id==='concourse')z=-3.5;return {...zone,position:new THREE.Vector3(x,y,z)};});
  function setRouteGroup(group){const all=!group||group==='all';for(const [id,m] of Object.entries(accents))m.emissiveIntensity=all ? .35 : id===group ? 1.1 : .06;}
  return {scene,colliders,hotspots,zones:ZONES,update(){},setRouteGroup,dispose(){textures.forEach(t=>t.dispose());scene.traverse(o=>{if(o.geometry)o.geometry.dispose();});materials.forEach(m=>m.dispose());}};
}
